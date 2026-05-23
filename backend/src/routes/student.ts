import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { calcRating, calcRatingForSemester } from '../services/ratingService';

export const studentRouter = Router();
studentRouter.use(requireAuth, requireRole('STUDENT'));

// Главный экран
studentRouter.get('/dashboard', async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.id;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [user, rating, streak] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId }, select: { firstName: true, course: true, groupId: true } }),
    calcRating(studentId, year, month),
    calcStreak(studentId),
  ]);

  const groupId = user?.groupId;

  // Привычки текущей недели
  const weekStart = getWeekStart(now);
  const [habits, quranEntry] = await Promise.all([
    prisma.habitEntry.findMany({ where: { studentId, date: { gte: weekStart } }, orderBy: { date: 'asc' } }),
    prisma.quranEntry.findUnique({ where: { studentId_weekStart: { studentId, weekStart } } }),
  ]);

  // Детали пропусков — уроки где отсутствовал
  const [absenceMarks, absenceRequests] = await Promise.all([
    prisma.attendanceMark.findMany({
      where: { studentId, present: false },
      include: { lesson: { select: { id: true, subject: true, datetime: true } } },
      orderBy: { lesson: { datetime: 'desc' } },
      take: 30,
    }),
    prisma.absenceRequest.findMany({ where: { studentId }, select: { lessonId: true, status: true, reason: true } }),
  ]);
  const absReqMap = Object.fromEntries(absenceRequests.map((r) => [r.lessonId, r]));
  const absencesDetail = absenceMarks.map((a) => {
    const req = absReqMap[a.lessonId] ?? null;
    const msAgo = now.getTime() - new Date(a.lesson.datetime).getTime();
    const hoursLeft = Math.max(0, 24 - msAgo / 3_600_000);
    return {
      lessonId: a.lessonId,
      subject: a.lesson.subject,
      datetime: a.lesson.datetime,
      canSubmit: hoursLeft > 0 && !req,
      hoursLeft,
      absenceRequest: req,
    };
  });

  // Детали несдач ДЗ с дедлайном (следующий урок того же предмета)
  let hwMissesDetail: any[] = [];
  if (groupId) {
    const [allGroupLessons, submissions, debtRequests] = await Promise.all([
      prisma.lesson.findMany({
        where: { groupId, isCancelled: false },
        select: { id: true, subject: true, datetime: true },
        orderBy: { datetime: 'asc' },
      }),
      prisma.homeworkSubmission.findMany({ where: { studentId }, select: { lessonId: true } }),
      prisma.homeworkDebtRequest.findMany({ where: { studentId }, select: { lessonId: true, status: true } }),
    ]);

    const submittedSet = new Set(submissions.map((s) => s.lessonId));
    const pastLessons = allGroupLessons.filter((l) => new Date(l.datetime) <= now);
    const missedLessons = pastLessons.filter((l) => !submittedSet.has(l.id));
    const debtMap = Object.fromEntries(debtRequests.map((r) => [r.lessonId, r]));

    hwMissesDetail = missedLessons.map((l) => {
      // Следующий урок того же предмета ПОСЛЕ этого конкретного урока (прошедший или будущий)
      const nextLesson = allGroupLessons.find(
        (fl) => fl.subject === l.subject && new Date(fl.datetime) > new Date(l.datetime)
      );
      const nextDatetime = nextLesson?.datetime ?? null;
      const deadlinePassed = nextDatetime ? now > new Date(nextDatetime) : false;
      return {
        lessonId: l.id,
        subject: l.subject,
        datetime: l.datetime,
        nextLessonDatetime: nextDatetime,
        deadlinePassed,
        debtRequest: debtMap[l.id] ?? null,
      };
    }).sort((a, b) => {
      if (a.deadlinePassed !== b.deadlinePassed) return a.deadlinePassed ? 1 : -1;
      return new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
    });
  }

  res.json({ user, rating, streak, habits, quranEntry, absencesDetail, hwMissesDetail });
});

// Запрос на возмещение долга по ДЗ
studentRouter.post('/homework-debt', async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.id;
  const { lessonId, reason } = req.body;
  if (!lessonId || !reason?.trim()) { res.status(400).json({ error: 'Укажи урок и причину' }); return; }

  const existing = await prisma.homeworkDebtRequest.findUnique({
    where: { studentId_lessonId: { studentId, lessonId } },
  });

  if (existing?.status === 'PENDING') { res.json(existing); return; }
  if (existing?.status === 'ACCEPTED') { res.status(400).json({ error: 'Долг уже принят куратором' }); return; }

  // REJECTED или новая запись — создаём / обновляем
  const entry = await prisma.homeworkDebtRequest.upsert({
    where: { studentId_lessonId: { studentId, lessonId } },
    create: { studentId, lessonId, reason: reason.trim(), status: 'PENDING' },
    update: { reason: reason.trim(), status: 'PENDING', submittedAt: new Date(), resolvedAt: null },
  });
  res.json(entry);
});

// Расписание
studentRouter.get('/schedule', async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.id;
  const user = await prisma.user.findUnique({ where: { id: studentId }, select: { groupId: true } });
  if (!user?.groupId) { res.json([]); return; }

  const lessons = await prisma.lesson.findMany({
    where: { groupId: user.groupId, isCancelled: false },
    orderBy: { datetime: 'asc' },
    include: { attendance: { where: { studentId } } },
  });

  const absenceRequests = await prisma.absenceRequest.findMany({
    where: { studentId },
    select: { lessonId: true, status: true },
  });
  const absenceMap = Object.fromEntries(absenceRequests.map((r) => [r.lessonId, r.status]));

  const hwSubmissions = await prisma.homeworkSubmission.findMany({
    where: { studentId },
    select: { lessonId: true },
  });
  const hwSubmittedSet = new Set(hwSubmissions.map((h) => h.lessonId));

  const debtRequests = await prisma.homeworkDebtRequest.findMany({
    where: { studentId },
    select: { lessonId: true, status: true },
  });
  const debtMap = Object.fromEntries(debtRequests.map((d) => [d.lessonId, d.status]));

  const now = new Date();

  // Дедлайн ДЗ = следующий урок того же предмета.
  // Если следующий урок уже прошёл — дедлайн истёк.
  // Если следующего урока нет (последний в расписании) — дедлайн ещё не истёк.
  const bySubject: Record<string, number[]> = {};
  for (let i = 0; i < lessons.length; i++) {
    const subj = lessons[i].subject;
    if (!bySubject[subj]) bySubject[subj] = [];
    bySubject[subj].push(i);
  }

  const result = lessons.map((l, i) => {
    const indices = bySubject[l.subject];
    const pos = indices.indexOf(i);
    const nextIdx = pos >= 0 && pos + 1 < indices.length ? indices[pos + 1] : -1;
    const nextLesson = nextIdx >= 0 ? lessons[nextIdx] : null;
    const hwDeadlinePassed = l.datetime <= now && nextLesson !== null && nextLesson.datetime <= now;

    return {
      id: l.id,
      subject: l.subject,
      datetime: l.datetime,
      isExtra: l.isExtra,
      isCancelled: l.isCancelled,
      note: l.note,
      meetingUrl: l.meetingUrl,
      isPast: l.datetime <= now,
      attended: l.attendance[0]?.present ?? null,
      absenceStatus: absenceMap[l.id] ?? null,
      canSubmitAbsence: canSubmitAbsence(l),
      hwSubmitted: hwSubmittedSet.has(l.id),
      debtStatus: debtMap[l.id] ?? null,
      hwDeadlinePassed,
    };
  });

  res.json(result);
});

// Подать заявку о пропуске
studentRouter.post('/absence', async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.id;
  const { lessonId, reason } = req.body;

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) { res.status(404).json({ error: 'Урок не найден' }); return; }
  if (!canSubmitAbsence(lesson)) { res.status(400).json({ error: 'Срок подачи заявки истёк (24 часа)' }); return; }

  const mark = await prisma.attendanceMark.findUnique({
    where: { lessonId_studentId: { lessonId, studentId } },
  });
  if (!mark || mark.present) { res.status(400).json({ error: 'Пропуск не зафиксирован учителем' }); return; }

  const request = await prisma.absenceRequest.upsert({
    where: { studentId_lessonId: { studentId, lessonId } },
    create: { studentId, lessonId, reason, status: 'PENDING' },
    update: { reason, status: 'PENDING' },
  });

  res.json(request);
});

// Отметить сдачу ДЗ
studentRouter.post('/homework-submit', async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.id;
  const { lessonId } = req.body;

  const entry = await prisma.homeworkSubmission.upsert({
    where: { studentId_lessonId: { studentId, lessonId } },
    create: { studentId, lessonId },
    update: { submittedAt: new Date() },
  });
  res.json(entry);
});

// Снять отметку сдачи ДЗ
studentRouter.delete('/homework-submit/:lessonId', async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.id;
  const lessonId = parseInt(req.params.lessonId);

  await prisma.homeworkSubmission.deleteMany({ where: { studentId, lessonId } });
  res.json({ ok: true });
});

// Отозвать заявку о пропуске (только PENDING)
studentRouter.delete('/absence/:lessonId', async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.id;
  const lessonId = parseInt(req.params.lessonId);

  const request = await prisma.absenceRequest.findUnique({
    where: { studentId_lessonId: { studentId, lessonId } },
  });
  if (!request) { res.status(404).json({ error: 'Заявка не найдена' }); return; }
  if (request.status !== 'PENDING') { res.status(400).json({ error: 'Нельзя отозвать — уже рассмотрена' }); return; }

  await prisma.absenceRequest.delete({ where: { studentId_lessonId: { studentId, lessonId } } });
  res.json({ ok: true });
});

// Прогресс
studentRouter.get('/progress', async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.id;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [user, rating] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId }, select: { groupId: true, course: true } }),
    calcRating(studentId, year, month),
  ]);

  // Место в группе (анонимно) — исправлено сравнение по ID
  let rank: { position: number; total: number } | null = null;
  if (user?.groupId) {
    const groupStudents = await prisma.user.findMany({
      where: { groupId: user.groupId, role: 'STUDENT' },
      select: { id: true },
    });
    const ratingsWithIds = await Promise.all(
      groupStudents.map(async (s) => ({ id: s.id, total: (await calcRating(s.id, year, month)).total }))
    );
    const sorted = ratingsWithIds.sort((a, b) => b.total - a.total);
    const position = sorted.findIndex((r) => r.id === studentId) + 1;
    rank = { position: position > 0 ? position : groupStudents.length, total: groupStudents.length };
  }

  // История по месяцам (последние 6)
  const history: { year: number; month: number; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const r = await calcRating(studentId, d.getFullYear(), d.getMonth() + 1);
    history.push({ year: d.getFullYear(), month: d.getMonth() + 1, total: r.total });
  }

  // Карта посещаемости — последние 60 дней
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const attendanceMap = await prisma.attendanceMark.findMany({
    where: { studentId, lesson: { datetime: { gte: since } } },
    include: { lesson: { select: { datetime: true } } },
  });

  // Экзамены
  const exams = await prisma.exam.findMany({
    where: { groupId: user?.groupId ?? 0 },
    select: {
      id: true, title: true, date: true, formUrl: true,
      startHour: true, startMinute: true, durationMinutes: true,
      scores: { where: { studentId } },
    },
    orderBy: { date: 'desc' },
  });

  // Рейтинги по семестрам группы
  const semesters = user?.groupId
    ? await prisma.semester.findMany({
        where: { groupId: user.groupId },
        orderBy: { startDate: 'asc' },
        select: { id: true, name: true, startDate: true, endDate: true },
      })
    : [];
  const semesterHistory = await Promise.all(
    semesters.map(async (s) => {
      const r = await calcRatingForSemester(studentId, new Date(s.startDate), new Date(s.endDate));
      return { id: s.id, name: s.name, startDate: s.startDate, endDate: s.endDate, ...r };
    })
  );

  res.json({ rating, rank, history, attendanceMap, exams, semesterHistory });
});

// Внести страницы Корана
studentRouter.post('/quran', async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.id;
  const { weekStart, pagesCompleted } = req.body;

  const entry = await prisma.quranEntry.upsert({
    where: { studentId_weekStart: { studentId, weekStart: new Date(weekStart) } },
    create: { studentId, weekStart: new Date(weekStart), pagesCompleted },
    update: { pagesCompleted },
  });
  res.json(entry);
});

// Отметить привычки за день
studentRouter.post('/habits', async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.id;
  const { date, reading, listening, revision } = req.body;

  const entry = await prisma.habitEntry.upsert({
    where: { studentId_date: { studentId, date: new Date(date) } },
    create: { studentId, date: new Date(date), reading: reading ?? false, listening: listening ?? false, revision: revision ?? false },
    update: { ...(reading !== undefined && { reading }), ...(listening !== undefined && { listening }), ...(revision !== undefined && { revision }) },
  });
  res.json(entry);
});

// Контакт куратора
studentRouter.get('/curator-contact', async (_req: AuthRequest, res: Response) => {
  const curator = await prisma.user.findFirst({
    where: { role: 'CURATOR' },
    select: { firstName: true, lastName: true, telegramUsername: true },
  });
  res.json(curator ?? null);
});

// Экзамены
studentRouter.get('/exams', async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.id;
  const user = await prisma.user.findUnique({ where: { id: studentId }, select: { groupId: true } });

  const exams = await prisma.exam.findMany({
    where: { groupId: user?.groupId ?? 0 },
    select: {
      id: true, title: true, date: true, formUrl: true,
      startHour: true, startMinute: true, durationMinutes: true,
      scores: { where: { studentId } },
    },
    orderBy: { date: 'desc' },
  });
  res.json(exams);
});

// Утилиты
function canSubmitAbsence(lesson: { datetime: Date }) {
  const diff = Date.now() - lesson.datetime.getTime();
  return diff >= 0 && diff < 24 * 60 * 60 * 1000;
}

function getWeekStart(date: Date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // воскресенье UTC
  return d;
}

async function calcStreak(studentId: number): Promise<number> {
  const habits = await prisma.habitEntry.findMany({
    where: { studentId },
    select: { date: true, reading: true, listening: true, revision: true },
    orderBy: { date: 'desc' },
  });

  const activeDays = new Set(
    habits
      .filter((h) => h.reading || h.listening || h.revision)
      .map((h) => h.date.toISOString().slice(0, 10))
  );

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today);

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!activeDays.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
