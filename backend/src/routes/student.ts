import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { calcRating } from '../services/ratingService';

export const studentRouter = Router();
studentRouter.use(requireAuth, requireRole('STUDENT'));

// Главный экран
studentRouter.get('/dashboard', async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.id;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [user, rating] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId }, select: { firstName: true, course: true, groupId: true } }),
    calcRating(studentId, year, month),
  ]);

  // Streak — дней подряд без засчитанных пропусков
  const streak = await calcStreak(studentId);

  // Привычки текущей недели
  const weekStart = getWeekStart(now);
  const habits = await prisma.habitEntry.findMany({
    where: { studentId, date: { gte: weekStart } },
    orderBy: { date: 'asc' },
  });

  // Коран текущей недели
  const quranEntry = await prisma.quranEntry.findUnique({
    where: { studentId_weekStart: { studentId, weekStart } },
  });

  res.json({ user, rating, streak, habits, quranEntry });
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

  const now = new Date();
  const result = lessons.map((l) => ({
    id: l.id,
    subject: l.subject,
    datetime: l.datetime,
    isExtra: l.isExtra,
    isPast: l.datetime <= now,
    attended: l.attendance[0]?.present ?? null,
    absenceStatus: absenceMap[l.id] ?? null,
    canSubmitAbsence: canSubmitAbsence(l),
    hwSubmitted: hwSubmittedSet.has(l.id),
  }));

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

  // Место в группе (анонимно)
  let rank: { position: number; total: number } | null = null;
  if (user?.groupId) {
    const groupStudents = await prisma.user.findMany({
      where: { groupId: user.groupId, role: 'STUDENT' },
      select: { id: true },
    });
    const ratings = await Promise.all(groupStudents.map((s) => calcRating(s.id, year, month)));
    const sorted = ratings.sort((a, b) => b.total - a.total);
    rank = { position: sorted.findIndex((r) => r === rating) + 1, total: groupStudents.length };
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
    include: { scores: { where: { studentId } } },
    orderBy: { date: 'desc' },
  });

  res.json({ rating, rank, history, attendanceMap, exams });
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
  const { date, reading, listening } = req.body;

  const entry = await prisma.habitEntry.upsert({
    where: { studentId_date: { studentId, date: new Date(date) } },
    create: { studentId, date: new Date(date), reading, listening },
    update: { reading, listening },
  });
  res.json(entry);
});

// Экзамены
studentRouter.get('/exams', async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.id;
  const user = await prisma.user.findUnique({ where: { id: studentId }, select: { groupId: true } });

  const exams = await prisma.exam.findMany({
    where: { groupId: user?.groupId ?? 0 },
    include: { scores: { where: { studentId } } },
    orderBy: { date: 'desc' },
  });
  res.json(exams);
});

// Утилиты
function canSubmitAbsence(lesson: { datetime: Date }) {
  return Date.now() - lesson.datetime.getTime() < 24 * 60 * 60 * 1000;
}

function getWeekStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // воскресенье
  return d;
}

async function calcStreak(studentId: number): Promise<number> {
  const marks = await prisma.attendanceMark.findMany({
    where: { studentId },
    include: { lesson: { select: { datetime: true } } },
    orderBy: { lesson: { datetime: 'desc' } },
  });

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lessonsByDay = new Map<string, boolean[]>();
  for (const m of marks) {
    const key = m.lesson.datetime.toISOString().slice(0, 10);
    if (!lessonsByDay.has(key)) lessonsByDay.set(key, []);
    lessonsByDay.get(key)!.push(m.present);
  }

  let cursor = new Date(today);
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    const dayMarks = lessonsByDay.get(key);
    if (!dayMarks) break;
    const hadAbsence = dayMarks.some((p) => !p);
    if (hadAbsence) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
