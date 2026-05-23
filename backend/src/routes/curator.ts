import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { calcRating, calcRatingForSemester } from '../services/ratingService';
import ExcelJS from 'exceljs';
import bcrypt from 'bcryptjs';

export const curatorRouter = Router();
curatorRouter.use(requireAuth, requireRole('CURATOR'));

// Список всех групп
curatorRouter.get('/groups', async (_req: AuthRequest, res: Response) => {
  const groups = await prisma.group.findMany({ orderBy: [{ course: 'asc' }, { name: 'asc' }] });
  res.json(groups);
});

// Создать группу
curatorRouter.post('/groups', async (req: AuthRequest, res: Response) => {
  const { name, course } = req.body;
  const group = await prisma.group.create({ data: { name, course } });
  res.status(201).json(group);
});

// Удалить группу (каскадно: уроки, семестры, экзамены; студентов только отвязывает)
curatorRouter.delete('/groups/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);

  const lessons = await prisma.lesson.findMany({ where: { groupId: id }, select: { id: true } });
  const lessonIds = lessons.map((l) => l.id);
  if (lessonIds.length > 0) {
    // Сначала удаляем доказательства (вложенные в запросы)
    const absenceReqs = await prisma.absenceRequest.findMany({ where: { lessonId: { in: lessonIds } }, select: { id: true } });
    await prisma.absenceEvidence.deleteMany({ where: { absenceRequestId: { in: absenceReqs.map(r => r.id) } } });
    const debtReqs = await prisma.homeworkDebtRequest.findMany({ where: { lessonId: { in: lessonIds } }, select: { id: true } });
    await prisma.debtEvidence.deleteMany({ where: { debtRequestId: { in: debtReqs.map(r => r.id) } } });
    // Затем сами запросы и данные урока
    await prisma.homeworkDebtRequest.deleteMany({ where: { lessonId: { in: lessonIds } } });
    await prisma.absenceRequest.deleteMany({ where: { lessonId: { in: lessonIds } } });
    await prisma.homeworkPhoto.deleteMany({ where: { lessonId: { in: lessonIds } } });
    await prisma.homeworkSubmission.deleteMany({ where: { lessonId: { in: lessonIds } } });
    await prisma.attendanceMark.deleteMany({ where: { lessonId: { in: lessonIds } } });
    await prisma.homeworkMiss.deleteMany({ where: { lessonId: { in: lessonIds } } });
    await prisma.lesson.deleteMany({ where: { id: { in: lessonIds } } });
  }

  const exams = await prisma.exam.findMany({ where: { groupId: id }, select: { id: true } });
  const examIds = exams.map((e) => e.id);
  if (examIds.length > 0) {
    await prisma.examScore.deleteMany({ where: { examId: { in: examIds } } });
    await prisma.exam.deleteMany({ where: { id: { in: examIds } } });
  }

  const semesters = await prisma.semester.findMany({ where: { groupId: id }, select: { id: true } });
  const semesterIds = semesters.map((s) => s.id);
  if (semesterIds.length > 0) {
    await prisma.scheduleTemplate.deleteMany({ where: { semesterId: { in: semesterIds } } });
    await prisma.semester.deleteMany({ where: { id: { in: semesterIds } } });
  }

  // Отвязываем студентов от группы (не удаляем их)
  await prisma.user.updateMany({ where: { groupId: id }, data: { groupId: null } });
  // Снимаем старосту, потом удаляем группу
  await prisma.group.update({ where: { id }, data: { starostaId: null } });
  await prisma.group.delete({ where: { id } });
  res.json({ ok: true });
});

// Список студентов — все группы или конкретная
curatorRouter.get('/students', async (req: AuthRequest, res: Response) => {
  const groupId = req.query.groupId ? parseInt(req.query.groupId as string) : undefined;

  const students = await prisma.user.findMany({
    where: { role: 'STUDENT', ...(groupId ? { groupId } : {}) },
    select: { id: true, firstName: true, lastName: true, course: true, groupId: true, group: { select: { name: true } } },
    orderBy: [{ groupId: 'asc' }, { lastName: 'asc' }],
  });

  const now = new Date();
  const ratings = await Promise.all(
    students.map(async (s) => ({ ...s, rating: await calcRating(s.id, now.getFullYear(), now.getMonth() + 1) }))
  );

  res.json(ratings);
});

// Карточка студента (куратор видит любого студента)
curatorRouter.get('/students/:id', async (req: AuthRequest, res: Response) => {
  const studentId = parseInt(req.params.id);

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, firstName: true, lastName: true, course: true, groupId: true, group: { select: { id: true, name: true, starostaId: true } } },
  });
  if (!student) {
    res.status(404).json({ error: 'Студент не найден' }); return;
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const gid = student.groupId;
  const [rating, absences, exams, monthLessons, submissions, monthAttendance] = await Promise.all([
    calcRating(studentId, now.getFullYear(), now.getMonth() + 1),
    prisma.absenceRequest.findMany({
      where: { studentId },
      include: { lesson: { select: { subject: true, datetime: true } } },
      orderBy: { submittedAt: 'desc' },
      take: 20,
    }),
    gid ? prisma.exam.findMany({
      where: { groupId: gid },
      include: { scores: { where: { studentId } } },
      orderBy: { date: 'desc' },
    }) : Promise.resolve([]),
    gid ? prisma.lesson.findMany({
      where: { groupId: gid, isCancelled: false, datetime: { gte: monthStart, lt: monthEnd, lte: now } },
      select: { id: true, subject: true, datetime: true },
      orderBy: { datetime: 'desc' },
    }) : Promise.resolve([]),
    prisma.homeworkSubmission.findMany({
      where: { studentId, lesson: { datetime: { gte: monthStart, lt: monthEnd } } },
      select: { lessonId: true },
    }),
    gid ? prisma.lesson.findMany({
      where: { groupId: gid, isCancelled: false, datetime: { gte: monthStart, lt: monthEnd, lte: now } },
      select: { id: true, subject: true, datetime: true, attendance: { where: { studentId }, select: { present: true } } },
      orderBy: { datetime: 'desc' },
    }) : Promise.resolve([]),
  ]);

  const submittedSet = new Set(submissions.map((s) => s.lessonId));
  const hwMisses = monthLessons
    .filter((l) => !submittedSet.has(l.id))
    .map((l) => ({ id: l.id, lesson: { subject: l.subject, datetime: l.datetime } }));

  // Рейтинги по семестрам группы
  const semesters = student.groupId
    ? await prisma.semester.findMany({
        where: { groupId: student.groupId },
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

  const attendanceThisMonth = monthAttendance.map((l) => ({
    lessonId: l.id,
    subject: l.subject,
    datetime: l.datetime,
    present: l.attendance[0]?.present ?? null,
  }));

  res.json({ student, rating, absences, hwMisses, exams, semesterHistory, attendanceThisMonth });
});

// Удалить студента (каскадно удаляет все его данные)
curatorRouter.delete('/students/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);

  // Снимаем старосту если это он
  await prisma.group.updateMany({ where: { starostaId: id }, data: { starostaId: null } });

  // Сначала вложенные доказательства
  const absReqs = await prisma.absenceRequest.findMany({ where: { studentId: id }, select: { id: true } });
  await prisma.absenceEvidence.deleteMany({ where: { absenceRequestId: { in: absReqs.map(r => r.id) } } });
  const dbtReqs = await prisma.homeworkDebtRequest.findMany({ where: { studentId: id }, select: { id: true } });
  await prisma.debtEvidence.deleteMany({ where: { debtRequestId: { in: dbtReqs.map(r => r.id) } } });

  await prisma.homeworkDebtRequest.deleteMany({ where: { studentId: id } });
  await prisma.absenceRequest.deleteMany({ where: { studentId: id } });
  await prisma.homeworkPhoto.deleteMany({ where: { studentId: id } });
  await prisma.homeworkSubmission.deleteMany({ where: { studentId: id } });
  await prisma.habitEntry.deleteMany({ where: { studentId: id } });
  await prisma.quranEntry.deleteMany({ where: { studentId: id } });
  await prisma.examScore.deleteMany({ where: { studentId: id } });
  await prisma.attendanceMark.deleteMany({ where: { studentId: id } });
  await prisma.homeworkMiss.deleteMany({ where: { studentId: id } });

  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
});

// Создать аккаунт студента (только куратор)
curatorRouter.post('/students', async (req: AuthRequest, res: Response) => {
  const { firstName, lastName, login, course, groupId } = req.body;
  if (!firstName || !lastName || !login?.trim() || !course || !groupId) {
    res.status(400).json({ error: 'Заполни все поля' }); return;
  }
  const normalizedLogin = login.trim().toLowerCase().replace(/\s+/g, '.');
  const existing = await prisma.user.findUnique({ where: { email: normalizedLogin } });
  if (existing) { res.status(409).json({ error: 'Такой логин уже занят' }); return; }

  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const tempPassword = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const user = await prisma.user.create({
    data: { firstName, lastName, email: normalizedLogin, passwordHash, role: 'STUDENT', course, groupId },
    select: { id: true, firstName: true, lastName: true, email: true, course: true, groupId: true },
  });
  res.status(201).json({ user, login: normalizedLogin, tempPassword });
});

// Исключить студента из группы (аккаунт остаётся, groupId → null)
curatorRouter.patch('/students/:id/exclude', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  await prisma.group.updateMany({ where: { starostaId: id }, data: { starostaId: null } });
  await prisma.user.update({ where: { id }, data: { groupId: null } });
  res.json({ ok: true });
});

// Перевести студента в другую группу
curatorRouter.patch('/students/:id/group', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { groupId } = req.body;
  if (!groupId) { res.status(400).json({ error: 'Укажи группу' }); return; }
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { course: true } });
  if (!group) { res.status(404).json({ error: 'Группа не найдена' }); return; }
  // Снимаем старосту если переводят старосту
  await prisma.group.updateMany({ where: { starostaId: id }, data: { starostaId: null } });
  await prisma.user.update({ where: { id }, data: { groupId, course: group.course } });
  res.json({ ok: true });
});


// Очередь заявок о пропусках
curatorRouter.get('/absences', async (req: AuthRequest, res: Response) => {
  const curatorId = req.user!.id;
  const curator = await prisma.user.findUnique({ where: { id: curatorId }, select: { groupId: true } });

  const requests = await prisma.absenceRequest.findMany({
    where: {
      status: 'PENDING',
      student: { groupId: curator?.groupId ?? 0 },
    },
    include: {
      student: { select: { firstName: true, lastName: true } },
      lesson: { select: { subject: true, datetime: true } },
      evidence: { select: { id: true, fileName: true } },
    },
    orderBy: { submittedAt: 'asc' },
  });

  res.json(requests);
});

// Решение по заявке
curatorRouter.patch('/absences/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;

  if (!['EXCUSED', 'COUNTED'].includes(status)) {
    res.status(400).json({ error: 'Неверный статус' }); return;
  }

  const updated = await prisma.absenceRequest.update({
    where: { id },
    data: { status, resolvedAt: new Date() },
  });
  res.json(updated);
});

// Список экзаменов группы
curatorRouter.get('/exams', async (req: AuthRequest, res: Response) => {
  const groupId = req.query.groupId ? parseInt(req.query.groupId as string) : undefined;
  const exams = await prisma.exam.findMany({
    where: groupId ? { groupId } : {},
    include: { scores: { include: { student: { select: { firstName: true, lastName: true } } } }, group: { select: { name: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(exams);
});

// Создать экзамен
curatorRouter.post('/exams', async (req: AuthRequest, res: Response) => {
  const { title, date, groupId, formUrl, startHour, startMinute, durationMinutes } = req.body;
  if (!groupId) { res.status(400).json({ error: 'Укажи группу' }); return; }
  const exam = await prisma.exam.create({
    data: {
      title, date: new Date(date), groupId, formUrl: formUrl || null,
      startHour: startHour ?? null, startMinute: startMinute ?? null,
      durationMinutes: durationMinutes ?? null,
    },
  });
  res.status(201).json(exam);
});

// Удалить экзамен
curatorRouter.patch('/exams/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { title, date, formUrl, startHour, startMinute, durationMinutes } = req.body;
  const exam = await prisma.exam.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(date && { date: new Date(date) }),
      ...(formUrl !== undefined && { formUrl: formUrl || null }),
      ...(startHour !== undefined && { startHour: startHour ?? null }),
      ...(startMinute !== undefined && { startMinute: startMinute ?? null }),
      ...(durationMinutes !== undefined && { durationMinutes: durationMinutes ?? null }),
    },
    include: { scores: { include: { student: { select: { firstName: true, lastName: true } } } }, group: { select: { name: true } } },
  });
  res.json(exam);
});

curatorRouter.delete('/exams/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  await prisma.examScore.deleteMany({ where: { examId: id } });
  await prisma.exam.delete({ where: { id } });
  res.json({ ok: true });
});

// Кто сдал ДЗ по уроку
curatorRouter.get('/homework-submissions/:lessonId', async (req: AuthRequest, res: Response) => {
  const lessonId = parseInt(req.params.lessonId);

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { groupId: true } });
  if (!lesson) { res.status(404).json({ error: 'Урок не найден' }); return; }

  const allStudents = await prisma.user.findMany({
    where: { groupId: lesson.groupId, role: 'STUDENT' },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { lastName: 'asc' },
  });

  const submissions = await prisma.homeworkSubmission.findMany({
    where: { lessonId },
    select: { studentId: true, submittedAt: true },
  });
  const submittedSet = new Set(submissions.map((s) => s.studentId));

  res.json(allStudents.map((s) => ({ ...s, submitted: submittedSet.has(s.id) })));
});


// Внести/обновить балл за экзамен
curatorRouter.post('/exam-scores', async (req: AuthRequest, res: Response) => {
  const { studentId, examId, score, maxScore } = req.body;
  const entry = await prisma.examScore.upsert({
    where: { studentId_examId: { studentId, examId } },
    create: { studentId, examId, score, maxScore: maxScore ?? 100 },
    update: { score, maxScore: maxScore ?? 100 },
  });
  res.json(entry);
});

// Создать семестр (groupId передаётся в теле запроса)
curatorRouter.post('/semesters', async (req: AuthRequest, res: Response) => {
  const { name, startDate, endDate, groupId } = req.body;
  if (!groupId) { res.status(400).json({ error: 'Укажи группу' }); return; }

  const semester = await prisma.semester.create({
    data: { name, startDate: new Date(startDate), endDate: new Date(endDate), groupId },
  });
  res.status(201).json(semester);
});

// Добавить шаблон урока в семестр
curatorRouter.post('/semesters/:id/templates', async (req: AuthRequest, res: Response) => {
  const semesterId = parseInt(req.params.id);
  const { dayOfWeek, timeHour, timeMinute, subject, teacherId, meetingUrl } = req.body;

  const template = await prisma.scheduleTemplate.create({
    data: { semesterId, dayOfWeek, timeHour, timeMinute, subject, teacherId, meetingUrl: meetingUrl || null },
  });
  res.status(201).json(template);
});

// Получить семестры — все или для конкретной группы
curatorRouter.get('/semesters', async (req: AuthRequest, res: Response) => {
  const groupId = req.query.groupId ? parseInt(req.query.groupId as string) : undefined;

  const semesters = await prisma.semester.findMany({
    where: groupId ? { groupId } : {},
    include: { templates: true, holidays: true, group: { select: { name: true } } },
    orderBy: [{ groupId: 'asc' }, { startDate: 'desc' }],
  });
  res.json(semesters);
});

// Добавить каникулярный период — сразу удаляет будущие уроки в этот период
curatorRouter.post('/semesters/:id/holidays', async (req: AuthRequest, res: Response) => {
  const semesterId = parseInt(req.params.id);
  const { name, startDate, endDate } = req.body;
  if (!name || !startDate || !endDate) { res.status(400).json({ error: 'Укажи название и даты' }); return; }

  const semester = await prisma.semester.findUnique({ where: { id: semesterId }, select: { groupId: true } });
  if (!semester) { res.status(404).json({ error: 'Семестр не найден' }); return; }

  const start = new Date(startDate);
  const end = new Date(endDate);
  // Ставим конец дня чтобы захватить все уроки этого дня
  end.setHours(23, 59, 59, 999);
  const now = new Date();

  // Находим будущие уроки в этом периоде (прошедшие не трогаем — у них может быть посещаемость)
  const lessonsToDelete = await prisma.lesson.findMany({
    where: {
      groupId: semester.groupId,
      datetime: { gte: start > now ? start : now, lte: end },
      isCancelled: false,
    },
    select: { id: true },
  });
  const lessonIds = lessonsToDelete.map((l) => l.id);

  if (lessonIds.length > 0) {
    await prisma.homeworkSubmission.deleteMany({ where: { lessonId: { in: lessonIds } } });
    await prisma.homeworkPhoto.deleteMany({ where: { lessonId: { in: lessonIds } } });
    await prisma.lesson.deleteMany({ where: { id: { in: lessonIds } } });
  }

  const holiday = await prisma.holidayPeriod.create({
    data: { semesterId, name, startDate: start, endDate: end },
  });

  res.status(201).json({ ...holiday, deletedLessons: lessonIds.length });
});

// Удалить каникулярный период
curatorRouter.delete('/semesters/holidays/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  await prisma.holidayPeriod.delete({ where: { id } });
  res.json({ ok: true });
});

// Удалить урок из шаблона
curatorRouter.delete('/semesters/templates/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  await prisma.scheduleTemplate.delete({ where: { id } });
  res.json({ ok: true });
});

// Авто-генерация уроков из шаблона
curatorRouter.post('/semesters/:id/generate', async (req: AuthRequest, res: Response) => {
  const semesterId = parseInt(req.params.id);

  const semester = await prisma.semester.findUnique({
    where: { id: semesterId },
    include: { templates: true, holidays: true },
  });
  if (!semester) { res.status(404).json({ error: 'Семестр не найден' }); return; }

  const templateIds = semester.templates.map((t) => t.id);

  // Находим уже существующие уроки этого семестра
  const existingLessons = await prisma.lesson.findMany({
    where: { templateId: { in: templateIds } },
    include: {
      _count: {
        select: { attendance: true, absences: true, hwSubmissions: true, hwPhotos: true, homework: true, debtRequests: true },
      },
    },
  });

  // Удаляем только уроки без каких-либо данных (без посещаемости, пропусков, ДЗ)
  const deletableIds = existingLessons
    .filter((l) => l._count.attendance === 0 && l._count.absences === 0 && l._count.hwSubmissions === 0 && l._count.hwPhotos === 0 && l._count.homework === 0 && l._count.debtRequests === 0)
    .map((l) => l.id);

  if (deletableIds.length > 0) {
    await prisma.lesson.deleteMany({ where: { id: { in: deletableIds } } });
  }

  // Даты уроков с данными — не создаём повторно
  const keptKeys = new Set(
    existingLessons
      .filter((l) => !deletableIds.includes(l.id))
      .map((l) => `${l.templateId}_${l.datetime.getTime()}`)
  );

  const lessons: { templateId: number; teacherId: number | null; subject: string; datetime: Date; groupId: number; meetingUrl: string | null }[] = [];

  function isHoliday(date: Date): boolean {
    return semester!.holidays.some(
      (h) => date >= new Date(h.startDate) && date <= new Date(h.endDate)
    );
  }

  for (const template of semester.templates) {
    const cursor = new Date(semester.startDate);
    while (cursor.getDay() !== template.dayOfWeek) cursor.setDate(cursor.getDate() + 1);

    while (cursor <= semester.endDate) {
      if (!isHoliday(cursor)) {
        const datetime = new Date(cursor);
        datetime.setHours(template.timeHour, template.timeMinute, 0, 0);
        if (!keptKeys.has(`${template.id}_${datetime.getTime()}`)) {
          lessons.push({
            templateId: template.id,
            teacherId: template.teacherId ?? null,
            subject: template.subject,
            datetime,
            groupId: semester.groupId,
            meetingUrl: template.meetingUrl ?? null,
          });
        }
      }
      cursor.setDate(cursor.getDate() + 7);
    }
  }

  await prisma.lesson.createMany({ data: lessons });
  res.json({ created: lessons.length });
});

// Изменить конкретный урок (перенос, отмена, заметка, ссылка)
curatorRouter.patch('/lessons/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { datetime, isCancelled, note, teacherId, meetingUrl } = req.body;

  const lesson = await prisma.lesson.update({
    where: { id },
    data: {
      ...(datetime && { datetime: new Date(datetime) }),
      ...(isCancelled !== undefined && { isCancelled }),
      ...(note !== undefined && { note }),
      ...(teacherId !== undefined && { teacherId }),
      ...(meetingUrl !== undefined && { meetingUrl: meetingUrl || null }),
    },
  });
  res.json(lesson);
});

// Удалить разовый урок (только isExtra без данных)
curatorRouter.delete('/lessons/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) { res.status(404).json({ error: 'Урок не найден' }); return; }

  await prisma.homeworkMiss.deleteMany({ where: { lessonId: id } });
  await prisma.homeworkSubmission.deleteMany({ where: { lessonId: id } });
  await prisma.homeworkPhoto.deleteMany({ where: { lessonId: id } });
  await prisma.attendanceMark.deleteMany({ where: { lessonId: id } });
  await prisma.absenceRequest.deleteMany({ where: { lessonId: id } });
  await prisma.lesson.delete({ where: { id } });
  res.json({ ok: true });
});

// Добавить разовый урок (groupId передаётся в теле)
curatorRouter.post('/lessons', async (req: AuthRequest, res: Response) => {
  const { subject, datetime, teacherId, note, groupId, meetingUrl } = req.body;
  if (!groupId) { res.status(400).json({ error: 'Укажи группу' }); return; }

  const lesson = await prisma.lesson.create({
    data: { subject, datetime: new Date(datetime), groupId, teacherId, note, meetingUrl: meetingUrl || null, isExtra: true },
  });
  res.status(201).json(lesson);
});

// Назначить или снять старосту группы
curatorRouter.patch('/groups/:id/starosta', async (req: AuthRequest, res: Response) => {
  const groupId = parseInt(req.params.id);
  const { studentId } = req.body; // null = снять старосту

  // Снимаем предыдущего старосту этой группы
  await prisma.group.update({ where: { id: groupId }, data: { starostaId: studentId ?? null } });

  res.json({ ok: true, starostaId: studentId ?? null });
});

// Запросы на возмещение долга по ДЗ
curatorRouter.get('/debt-requests', async (_req: AuthRequest, res: Response) => {
  const requests = await prisma.homeworkDebtRequest.findMany({
    where: { status: 'PENDING' },
    include: {
      student: { select: { firstName: true, lastName: true } },
      lesson: { select: { subject: true, datetime: true } },
      evidence: { select: { id: true, fileName: true } },
    },
    orderBy: { submittedAt: 'asc' },
  });
  res.json(requests);
});

curatorRouter.patch('/debt-requests/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  if (!['ACCEPTED', 'REJECTED'].includes(status)) { res.status(400).json({ error: 'Неверный статус' }); return; }

  const debtReq = await prisma.homeworkDebtRequest.update({
    where: { id },
    data: { status, resolvedAt: new Date() },
  });

  // Принято → зачитываем ДЗ как сданное
  if (status === 'ACCEPTED') {
    await prisma.homeworkSubmission.upsert({
      where: { studentId_lessonId: { studentId: debtReq.studentId, lessonId: debtReq.lessonId } },
      create: { studentId: debtReq.studentId, lessonId: debtReq.lessonId },
      update: { submittedAt: new Date() },
    });
  }

  res.json(debtReq);
});

// Экспорт всех данных в Excel
curatorRouter.get('/export', async (_req: AuthRequest, res: Response) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const dateStr = now.toLocaleDateString('ru', { day: '2-digit', month: 'long', year: 'numeric' });

  const BLUE  = '4A89C8';
  const LIGHT = 'EEF4FB';
  const WHITE = 'FFFFFF';
  const DARK  = '1A1A1A';

  function headerStyle(): Partial<ExcelJS.Style> {
    return {
      font: { bold: true, color: { argb: WHITE }, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: {
        top: { style: 'thin', color: { argb: BLUE } },
        bottom: { style: 'thin', color: { argb: BLUE } },
        left: { style: 'thin', color: { argb: BLUE } },
        right: { style: 'thin', color: { argb: BLUE } },
      },
    };
  }

  function rowStyle(even: boolean): Partial<ExcelJS.Style> {
    return {
      font: { color: { argb: DARK }, size: 10 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: even ? LIGHT : WHITE } },
      alignment: { vertical: 'middle', wrapText: false },
      border: {
        top: { style: 'hair', color: { argb: 'D0D0D0' } },
        bottom: { style: 'hair', color: { argb: 'D0D0D0' } },
        left: { style: 'hair', color: { argb: 'D0D0D0' } },
        right: { style: 'hair', color: { argb: 'D0D0D0' } },
      },
    };
  }

  function addTitleRow(ws: ExcelJS.Worksheet, title: string, colCount: number) {
    ws.mergeCells(1, 1, 1, colCount);
    const titleCell = ws.getCell('A1');
    titleCell.value = `SABEEL UNIVERSITY PORTAL — ${title}`;
    titleCell.style = {
      font: { bold: true, size: 13, color: { argb: BLUE } },
      alignment: { horizontal: 'center', vertical: 'middle' },
    };
    ws.getRow(1).height = 28;

    ws.mergeCells(2, 1, 2, colCount);
    const dateCell = ws.getCell('A2');
    dateCell.value = `Экспорт от ${dateStr}`;
    dateCell.style = {
      font: { size: 10, italic: true, color: { argb: '888888' } },
      alignment: { horizontal: 'center' },
    };
    ws.getRow(2).height = 18;
  }

  function applyHeaders(ws: ExcelJS.Worksheet, headers: string[], rowNum: number) {
    const row = ws.getRow(rowNum);
    headers.forEach((h, i) => {
      const cell = row.getCell(i + 1);
      cell.value = h;
      cell.style = headerStyle();
    });
    row.height = 22;
    row.commit();
  }

  function addRows(ws: ExcelJS.Worksheet, data: (string | number)[][], startRow: number) {
    data.forEach((rowData, ri) => {
      const row = ws.getRow(startRow + ri);
      const baseStyle = rowStyle(ri % 2 === 0);
      rowData.forEach((val, ci) => {
        const cell = row.getCell(ci + 1);
        cell.value = val;
        const cellStyle: Partial<ExcelJS.Style> = { ...baseStyle };
        if (typeof val === 'number' && cellStyle.alignment) {
          cellStyle.alignment = { ...cellStyle.alignment, horizontal: 'center', vertical: 'middle' };
        }
        cell.style = cellStyle;
      });
      row.height = 20;
      row.commit();
    });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sabeel University Portal';
  wb.created = now;

  // ── Лист 0: Справка ───────────────────────────────
  const wsRef = wb.addWorksheet('Справка');
  wsRef.columns = [{ width: 32 }, { width: 60 }];

  const refTitle = wsRef.getCell('A1');
  wsRef.mergeCells('A1:B1');
  refTitle.value = 'SABEEL UNIVERSITY PORTAL — Система оценивания';
  refTitle.style = { font: { bold: true, size: 14, color: { argb: BLUE } }, alignment: { horizontal: 'center', vertical: 'middle' } };
  wsRef.getRow(1).height = 30;

  wsRef.mergeCells('A2:B2');
  wsRef.getCell('A2').value = `Экспорт от ${dateStr}`;
  wsRef.getCell('A2').style = { font: { size: 10, italic: true, color: { argb: '888888' } }, alignment: { horizontal: 'center' } };
  wsRef.getRow(2).height = 18;

  const refRows: [string, string, boolean][] = [
    ['', '', false],
    ['ЕЖЕМЕСЯЧНЫЙ РЕЙТИНГ (максимум 100 баллов)', '', true],
    ['Посещаемость', 'Максимум 40 баллов. Начисляется 40, затем −8 за каждый засчитанный пропуск. При 5 пропусках = 0 баллов.', false],
    ['Домашние задания', 'Максимум 30 баллов. Начисляется 30, затем −6 за каждую несданную работу. При 5 несдачах = 0 баллов.', false],
    ['Коран', 'Максимум 20 баллов. 1 курс: чтение 7 стр/нед. 2 курс: заучивание 1 стр/нед. 3 курс: 2 стр/нед. 4 курс: 3 стр/нед.', false],
    ['Привычки', 'Максимум 10 баллов. Рассчитывается по доле дней в месяце с отмеченным чтением и аудированием.', false],
    ['', '', false],
    ['СЕМЕСТРОВЫЙ РЕЙТИНГ', 'Сумма рейтингов за все месяцы семестра. Если семестр = 3 месяца, максимум = 300 баллов.', true],
    ['', '', false],
    ['СТАТУСЫ ПРОПУСКОВ', '', true],
    ['Ожидает', 'Студент подал причину пропуска, куратор ещё не рассмотрел.', false],
    ['Уважительный', 'Куратор принял причину. Пропуск не влияет на рейтинг.', false],
    ['Засчитан', 'Пропуск засчитан (нет причины или причина не принята). −8 к баллу посещаемости.', false],
    ['', '', false],
    ['УГРОЗА ОТЧИСЛЕНИЯ', 'Студент получает предупреждение при 3+ пропусках или несдачах. При 5 — критическое предупреждение.', true],
    ['', '', false],
    ['ОБОЗНАЧЕНИЯ В ТАБЛИЦЕ ПОСЕЩАЕМОСТИ', '', true],
    ['✓ Присутствовал', 'Студент был на уроке.', false],
    ['✗ Отсутствовал', 'Студент отсутствовал на уроке.', false],
  ];

  refRows.forEach(([key, val, isSection], i) => {
    const row = wsRef.getRow(i + 3);
    row.height = isSection ? 22 : 18;
    const cellA = row.getCell(1);
    const cellB = row.getCell(2);
    if (isSection) {
      wsRef.mergeCells(i + 3, 1, i + 3, 2);
      cellA.value = key || val;
      cellA.style = { font: { bold: true, size: 11, color: { argb: WHITE } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } }, alignment: { vertical: 'middle' } };
    } else if (key) {
      cellA.value = key;
      cellA.style = { font: { bold: true, size: 10, color: { argb: DARK } }, alignment: { vertical: 'middle', wrapText: true } };
      cellB.value = val;
      cellB.style = { font: { size: 10, color: { argb: DARK } }, alignment: { vertical: 'middle', wrapText: true } };
    }
    row.commit();
  });

  // Загружаем студентов и рейтинги
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: { group: { select: { id: true, name: true } } },
    orderBy: [{ groupId: 'asc' }, { lastName: 'asc' }],
  });
  const studentsWithRatings = await Promise.all(students.map(async (s, i) => {
    const r = await calcRating(s.id, year, month);
    return { ...s, rating: r, isCritical: r.countedAbsences >= 3 || r.hwMisses >= 3, isWarning: r.countedAbsences >= 2 || r.hwMisses >= 2 };
  }));

  // ── Лист 0: Сводка ──────────────────────────────
  const wsSummary = wb.addWorksheet('Сводка');
  wsSummary.columns = [{ width: 40 }, { width: 20 }];
  const summaryTitle = wsSummary.getCell('A1');
  wsSummary.mergeCells('A1:B1');
  summaryTitle.value = 'SABEEL UNIVERSITY PORTAL — Сводка';
  summaryTitle.style = { font: { bold: true, size: 14, color: { argb: BLUE } }, alignment: { horizontal: 'center', vertical: 'middle' } };
  wsSummary.getRow(1).height = 30;

  const summaryStats = [
    ['', ''],
    ['📊 КЛЮЧЕВЫЕ ПОКАЗАТЕЛИ', '', true],
    ['Всего студентов', studentsWithRatings.length],
    ['Средний рейтинг', Math.round(studentsWithRatings.reduce((a, s) => a + s.rating.total, 0) / studentsWithRatings.length)],
    ['Средняя посещаемость', Math.round(studentsWithRatings.reduce((a, s) => a + s.rating.attendanceScore, 0) / studentsWithRatings.length)],
    ['', ''],
    ['🚨 КРИТИЧНЫЕ ПРОБЛЕМЫ', '', true],
    ['На грани отчисления (3+ пропусков/несдач)', studentsWithRatings.filter(s => s.isCritical).length],
    ['', ''],
    ['⚠️ ЗОНА РИСКА', '', true],
    ['В зоне риска (2+ проблемы)', studentsWithRatings.filter(s => s.isWarning && !s.isCritical).length],
    ['', ''],
    ['👥 ПО КУРСАМ', '', true],
  ];

  const courseGroups = new Map<number, number>();
  studentsWithRatings.forEach(s => {
    if (s.course) courseGroups.set(s.course, (courseGroups.get(s.course) ?? 0) + 1);
  });
  Array.from(courseGroups.entries()).sort((a, b) => a[0] - b[0]).forEach(([course, count]) => {
    summaryStats.push([`${course} курс`, count]);
  });

  summaryStats.forEach(([key, val], i) => {
    const row = wsSummary.getRow(i + 2);
    row.height = 18;
    const cellA = row.getCell(1);
    const cellB = row.getCell(2);
    if (Array.isArray(val) && val[2]) {
      wsSummary.mergeCells(i + 2, 1, i + 2, 2);
      cellA.value = key;
      cellA.style = { font: { bold: true, size: 11, color: { argb: WHITE } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } }, alignment: { vertical: 'middle' } };
    } else if (key) {
      cellA.value = key;
      cellA.style = { font: { size: 10 }, alignment: { vertical: 'middle' } };
      cellB.value = val;
      cellB.style = { font: { bold: true, size: 11, color: { argb: BLUE } }, alignment: { horizontal: 'center', vertical: 'middle' } };
    }
    row.commit();
  });

  // ── Лист 1: Критичные проблемы ──────────────────────────────
  const criticalStudents = studentsWithRatings.filter(s => s.isCritical);
  const wsCritical = wb.addWorksheet('🚨 Критичные');
  wsCritical.columns = [
    { width: 18 }, { width: 16 }, { width: 12 }, { width: 12 },
    { width: 14 }, { width: 12 }, { width: 12 },
  ];
  addTitleRow(wsCritical, 'Студенты на грани отчисления', 7);
  applyHeaders(wsCritical, [
    'Фамилия','Имя','Группа','Рейтинг',
    'Пропусков','Несдач ДЗ','Статус',
  ], 3);
  addRows(wsCritical, criticalStudents.map(s => [
    s.lastName, s.firstName, s.group?.name ?? '', s.rating.total,
    s.rating.countedAbsences, s.rating.hwMisses,
    s.rating.countedAbsences >= 5 || s.rating.hwMisses >= 5 ? '❌ ОТЧИСЛЕНИЕ' : '⚠️ КРИТИЧНО'
  ]), 4);
  criticalStudents.forEach((_, i) => {
    const row = wsCritical.getRow(i + 4);
    row.eachCell((cell) => {
      cell.style = { ...cell.style, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB3B3' } } };
    });
  });
  wsCritical.views = [{ state: 'frozen', ySplit: 3 }];

  // ── Лист 2: По группам ──────────────────────────────
  const wsGroups = wb.addWorksheet('👥 По группам');
  wsGroups.columns = [
    { width: 18 }, { width: 16 }, { width: 12 }, { width: 12 },
    { width: 14 }, { width: 12 }, { width: 12 },
  ];
  addTitleRow(wsGroups, 'Студенты по группам', 7);

  let rowNum = 3;
  const groupedStudents = new Map<string, typeof studentsWithRatings>();
  studentsWithRatings.forEach(s => {
    const groupName = s.group?.name ?? 'Без группы';
    if (!groupedStudents.has(groupName)) groupedStudents.set(groupName, []);
    groupedStudents.get(groupName)!.push(s);
  });

  Array.from(groupedStudents.entries()).forEach(([groupName, students]) => {
    const row = wsGroups.getRow(rowNum);
    wsGroups.mergeCells(rowNum, 1, rowNum, 7);
    const cell = row.getCell(1);
    cell.value = `📚 ${groupName}`;
    cell.style = { font: { bold: true, size: 11, color: { argb: WHITE } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } }, alignment: { vertical: 'middle' } };
    row.height = 22;
    row.commit();
    rowNum++;

    applyHeaders(wsGroups, ['Фамилия','Имя','Рейтинг','Курс','Пропусков','Несдач ДЗ','Статус'], rowNum);
    rowNum++;

    students.sort((a, b) => b.rating.total - a.rating.total).forEach((s) => {
      const studentRow = wsGroups.getRow(rowNum);
      const data = [s.lastName, s.firstName, s.rating.total, s.course ?? '', s.rating.countedAbsences, s.rating.hwMisses, s.isCritical ? '⚠️' : s.isWarning ? '⚡' : '✓'];
      data.forEach((val, ci) => {
        const cell = studentRow.getCell(ci + 1);
        cell.value = val;
        const baseStyle = rowStyle(false);
        if (s.isCritical) cell.style = { ...baseStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB3B3' } } };
        else if (s.isWarning) cell.style = { ...baseStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5B3' } } };
        else cell.style = baseStyle;
      });
      studentRow.height = 18;
      studentRow.commit();
      rowNum++;
    });
    rowNum++;
  });
  wsGroups.views = [{ state: 'frozen', ySplit: 3 }];

  // ── Лист 3: Предупреждения ──────────────────────────────
  const warningStudents = studentsWithRatings.filter(s => s.isWarning && !s.isCritical);
  const wsWarnings = wb.addWorksheet('⚠️ Предупреждения');
  wsWarnings.columns = [
    { width: 18 }, { width: 16 }, { width: 12 }, { width: 12 },
    { width: 14 }, { width: 12 }, { width: 12 },
  ];
  addTitleRow(wsWarnings, 'Студенты в зоне риска', 7);
  applyHeaders(wsWarnings, [
    'Фамилия','Имя','Группа','Рейтинг',
    'Пропусков','Несдач ДЗ','Рекомендация',
  ], 3);
  addRows(wsWarnings, warningStudents.map(s => [
    s.lastName, s.firstName, s.group?.name ?? '', s.rating.total,
    s.rating.countedAbsences, s.rating.hwMisses,
    'Требуется внимание'
  ]), 4);
  warningStudents.forEach((_, i) => {
    const row = wsWarnings.getRow(i + 4);
    row.eachCell((cell) => {
      cell.style = { ...cell.style, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5B3' } } };
    });
  });
  wsWarnings.views = [{ state: 'frozen', ySplit: 3 }];

  // ── Лист 4: Полный рейтинг ──────────────────────────────
  const wsRating = wb.addWorksheet('📈 Рейтинг');
  wsRating.columns = [
    { width: 18 }, { width: 16 }, { width: 16 }, { width: 8 },
    { width: 12 }, { width: 14 }, { width: 14 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 10 }, { width: 12 },
  ];
  addTitleRow(wsRating, 'Полный рейтинг студентов', 12);
  applyHeaders(wsRating, [
    'Фамилия','Имя','Email','Курс','Группа',
    'Рейтинг (макс.100)','Посещаемость (макс.40)','Домашние задания (макс.30)',
    'Коран (макс.20)','Привычки (макс.10)',
    'Пропусков засчитано (лимит 5)','Несдач ДЗ (лимит 5)',
  ], 3);
  addRows(wsRating, studentsWithRatings.sort((a, b) => b.rating.total - a.rating.total).map((s) => {
    const r = s.rating;
    return [s.lastName, s.firstName, s.email, s.course ?? '', s.group?.name ?? '',
      r.total, r.attendanceScore, r.homeworkScore, r.quranScore, r.habitsScore, r.countedAbsences, r.hwMisses];
  }), 4);
  wsRating.views = [{ state: 'frozen', ySplit: 3 }];

  // ── Лист 2: Пропуски ──────────────────────────────
  const absences = await prisma.absenceRequest.findMany({
    include: {
      student: { select: { firstName: true, lastName: true } },
      lesson: { select: { subject: true, datetime: true } },
    },
    orderBy: { submittedAt: 'desc' },
  });
  const wsAbsences = wb.addWorksheet('Пропуски');
  wsAbsences.columns = [{ width: 22 }, { width: 20 }, { width: 14 }, { width: 40 }, { width: 14 }, { width: 14 }];
  addTitleRow(wsAbsences, 'Пропуски', 6);
  applyHeaders(wsAbsences, ['Студент','Предмет','Дата урока','Причина','Статус','Дата подачи'], 3);
  addRows(wsAbsences, absences.map((a) => [
    `${a.student.lastName} ${a.student.firstName}`, a.lesson.subject,
    new Date(a.lesson.datetime).toLocaleDateString('ru'), a.reason,
    a.status === 'EXCUSED' ? 'Уважительный' : a.status === 'COUNTED' ? 'Засчитан' : 'Ожидает',
    new Date(a.submittedAt).toLocaleDateString('ru'),
  ]), 4);
  wsAbsences.views = [{ state: 'frozen', ySplit: 3 }];

  // ── Лист 3: Посещаемость ──────────────────────────
  const attendance = await prisma.attendanceMark.findMany({
    include: {
      student: { select: { firstName: true, lastName: true } },
      lesson: { select: { subject: true, datetime: true } },
    },
    orderBy: { lesson: { datetime: 'desc' } },
  });
  const wsAtt = wb.addWorksheet('Посещаемость');
  wsAtt.columns = [{ width: 22 }, { width: 20 }, { width: 16 }, { width: 16 }];
  addTitleRow(wsAtt, 'Посещаемость', 4);
  applyHeaders(wsAtt, ['Студент','Предмет','Дата','Статус'], 3);
  addRows(wsAtt, attendance.map((a) => [
    `${a.student.lastName} ${a.student.firstName}`, a.lesson.subject,
    new Date(a.lesson.datetime).toLocaleDateString('ru'),
    a.present ? '✓ Присутствовал' : '✗ Отсутствовал',
  ]), 4);
  wsAtt.views = [{ state: 'frozen', ySplit: 3 }];

  // ── Лист 4: Экзамены ──────────────────────────────
  const examScores = await prisma.examScore.findMany({
    include: {
      student: { select: { firstName: true, lastName: true } },
      exam: { select: { title: true, date: true } },
    },
    orderBy: { exam: { date: 'desc' } },
  });
  const wsExams = wb.addWorksheet('Экзамены');
  wsExams.columns = [{ width: 22 }, { width: 28 }, { width: 14 }, { width: 10 }, { width: 10 }, { width: 12 }];
  addTitleRow(wsExams, 'Экзамены', 6);
  applyHeaders(wsExams, ['Студент','Экзамен','Дата','Балл','Максимум','Процент'], 3);
  addRows(wsExams, examScores.map((e) => [
    `${e.student.lastName} ${e.student.firstName}`, e.exam.title,
    new Date(e.exam.date).toLocaleDateString('ru'), e.score, e.maxScore,
    Math.round((e.score / e.maxScore) * 100) + '%',
  ]), 4);
  wsExams.views = [{ state: 'frozen', ySplit: 3 }];

  const buf = await wb.xlsx.writeBuffer();
  const filename = `sabeel_${now.toISOString().slice(0, 10)}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// Список учителей
curatorRouter.get('/teachers', async (_req: AuthRequest, res: Response) => {
  const teachers = await prisma.teacher.findMany({
    orderBy: { lastName: 'asc' },
  });
  res.json(teachers);
});

// Добавить учителя
curatorRouter.post('/teachers', async (req: AuthRequest, res: Response) => {
  const { firstName, lastName } = req.body;
  if (!firstName || !lastName) { res.status(400).json({ error: 'Укажи имя и фамилию' }); return; }
  const teacher = await prisma.teacher.create({ data: { firstName, lastName } });
  res.status(201).json(teacher);
});

// Удалить учителя
curatorRouter.delete('/teachers/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  // Отвязываем от уроков и шаблонов
  await prisma.lesson.updateMany({ where: { teacherId: id }, data: { teacherId: null } });
  await prisma.scheduleTemplate.updateMany({ where: { teacherId: id }, data: { teacherId: null } });
  await prisma.teacher.delete({ where: { id } });
  res.json({ ok: true });
});

// Все сданные работы студента: фото + устные самоотчёты (для куратора)
curatorRouter.get('/students/:id/homework-photos', async (req: AuthRequest, res: Response) => {
  const studentId = parseInt(req.params.id);

  const [photos, submissions] = await Promise.all([
    prisma.homeworkPhoto.findMany({
      where: { studentId },
      include: { lesson: { select: { id: true, subject: true, datetime: true } } },
      orderBy: { lesson: { datetime: 'desc' } },
    }),
    prisma.homeworkSubmission.findMany({
      where: { studentId },
      include: { lesson: { select: { id: true, subject: true, datetime: true } } },
    }),
  ]);

  const byLesson = new Map<number, any>();

  for (const photo of photos) {
    if (!byLesson.has(photo.lessonId)) {
      byLesson.set(photo.lessonId, {
        lessonId: photo.lessonId,
        subject: photo.lesson.subject,
        datetime: photo.lesson.datetime,
        isOral: false,
        photos: [],
      });
    }
    byLesson.get(photo.lessonId).photos.push({ id: photo.id, fileName: photo.fileName });
  }

  // Устные самоотчёты — submission без фото
  const photoLessonIds = new Set(photos.map((p) => p.lessonId));
  for (const sub of submissions) {
    if (!photoLessonIds.has(sub.lessonId) && !byLesson.has(sub.lessonId)) {
      byLesson.set(sub.lessonId, {
        lessonId: sub.lessonId,
        subject: sub.lesson.subject,
        datetime: sub.lesson.datetime,
        isOral: true,
        photos: [],
      });
    }
  }

  res.json(
    Array.from(byLesson.values()).sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
  );
});


// Полное расписание группы (все уроки — прошедшие и будущие)
curatorRouter.get('/schedule/:groupId', async (req: AuthRequest, res: Response) => {
  const groupId = parseInt(req.params.groupId);

  const lessons = await prisma.lesson.findMany({
    where: { groupId, isCancelled: false },
    include: {
      group: { select: { name: true } },
      attendance: { select: { id: true } },
    },
    orderBy: { datetime: 'asc' },
  });

  res.json(lessons.map((l) => ({
    id: l.id,
    subject: l.subject,
    datetime: l.datetime,
    groupName: l.group.name,
    groupId: l.groupId,
    isMarked: l.attendance.length > 0,
    isCancelled: l.isCancelled,
    isExtra: l.isExtra,
    note: l.note,
    meetingUrl: l.meetingUrl,
  })));
});

// Уроки для отметки посещаемости — все прошедшие уроки группы
curatorRouter.get('/lessons', async (req: AuthRequest, res: Response) => {
  const groupId = req.query.groupId ? parseInt(req.query.groupId as string) : undefined;
  const now = new Date();

  const lessons = await prisma.lesson.findMany({
    where: {
      isCancelled: false,
      datetime: { lte: now },
      ...(groupId ? { groupId } : {}),
    },
    include: {
      group: { select: { name: true } },
      attendance: { select: { id: true } },
    },
    orderBy: { datetime: 'desc' },
    take: 100,
  });

  res.json(lessons.map((l) => ({
    id: l.id,
    subject: l.subject,
    datetime: l.datetime,
    groupName: l.group.name,
    groupId: l.groupId,
    isMarked: l.attendance.length > 0,
  })));
});

// Студенты группы для урока (чтобы куратор мог отметить)
curatorRouter.get('/lessons/:id/students', async (req: AuthRequest, res: Response) => {
  const lessonId = parseInt(req.params.id);

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) { res.status(404).json({ error: 'Урок не найден' }); return; }

  const students = await prisma.user.findMany({
    where: { groupId: lesson.groupId, role: 'STUDENT' },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { lastName: 'asc' },
  });

  const existing = await prisma.attendanceMark.findMany({ where: { lessonId } });
  const markMap = Object.fromEntries(existing.map((m) => [m.studentId, m.present]));

  res.json(students.map((s) => ({ ...s, present: markMap[s.id] ?? true })));
});

// Куратор отмечает посещаемость
curatorRouter.post('/lessons/:id/attendance', async (req: AuthRequest, res: Response) => {
  const lessonId = parseInt(req.params.id);
  const marks: { studentId: number; present: boolean }[] = req.body.marks;

  await Promise.all(
    marks.map((m) =>
      prisma.attendanceMark.upsert({
        where: { lessonId_studentId: { lessonId, studentId: m.studentId } },
        create: { lessonId, studentId: m.studentId, present: m.present },
        update: { present: m.present },
      })
    )
  );

  res.json({ ok: true });
});
