import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { calcRating } from '../services/ratingService';

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
    select: { id: true, firstName: true, lastName: true, course: true, groupId: true, group: { select: { name: true } } },
  });
  if (!student) {
    res.status(404).json({ error: 'Студент не найден' }); return;
  }

  const now = new Date();
  const [rating, absences, hwMisses, exams] = await Promise.all([
    calcRating(studentId, now.getFullYear(), now.getMonth() + 1),
    prisma.absenceRequest.findMany({
      where: { studentId },
      include: { lesson: { select: { subject: true, datetime: true } } },
      orderBy: { submittedAt: 'desc' },
      take: 20,
    }),
    prisma.homeworkMiss.findMany({
      where: { studentId },
      include: { lesson: { select: { subject: true, datetime: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.exam.findMany({
      where: { groupId: student.groupId! },
      include: { scores: { where: { studentId } } },
      orderBy: { date: 'desc' },
    }),
  ]);

  res.json({ student, rating, absences, hwMisses, exams });
});

// Внести несдачу ДЗ
curatorRouter.post('/homework-miss', async (req: AuthRequest, res: Response) => {
  const curatorId = req.user!.id;
  const { studentId, lessonId } = req.body;

  const miss = await prisma.homeworkMiss.upsert({
    where: { studentId_lessonId: { studentId, lessonId } },
    create: { studentId, lessonId, curatorId },
    update: { curatorId },
  });
  res.json(miss);
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
  const { title, date, groupId, formUrl } = req.body;
  if (!groupId) { res.status(400).json({ error: 'Укажи группу' }); return; }
  const exam = await prisma.exam.create({ data: { title, date: new Date(date), groupId, formUrl: formUrl || null } });
  res.status(201).json(exam);
});

// Удалить экзамен
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

// Удалить несдачу ДЗ
curatorRouter.delete('/homework-miss/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  await prisma.homeworkMiss.delete({ where: { id } });
  res.json({ ok: true });
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
    include: { templates: true, group: { select: { name: true } } },
    orderBy: [{ groupId: 'asc' }, { startDate: 'desc' }],
  });
  res.json(semesters);
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
    include: { templates: true },
  });
  if (!semester) { res.status(404).json({ error: 'Семестр не найден' }); return; }

  // Удаляем ранее сгенерированные уроки для этого семестра (не extra и не отменённые вручную)
  await prisma.lesson.deleteMany({ where: { templateId: { in: semester.templates.map((t) => t.id) } } });

  const lessons: { templateId: number; teacherId: number | null; subject: string; datetime: Date; groupId: number; meetingUrl: string | null }[] = [];

  for (const template of semester.templates) {
    const cursor = new Date(semester.startDate);
    // Сдвигаем до нужного дня недели
    while (cursor.getDay() !== template.dayOfWeek) cursor.setDate(cursor.getDate() + 1);

    while (cursor <= semester.endDate) {
      const datetime = new Date(cursor);
      datetime.setHours(template.timeHour, template.timeMinute, 0, 0);
      lessons.push({
        templateId: template.id,
        teacherId: template.teacherId ?? null,
        subject: template.subject,
        datetime,
        groupId: semester.groupId,
        meetingUrl: template.meetingUrl ?? null,
      });
      cursor.setDate(cursor.getDate() + 7);
    }
  }

  await prisma.lesson.createMany({ data: lessons });
  res.json({ created: lessons.length });
});

// Изменить конкретный урок (перенос, отмена, заметка)
curatorRouter.patch('/lessons/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { datetime, isCancelled, note, teacherId } = req.body;

  const lesson = await prisma.lesson.update({
    where: { id },
    data: {
      ...(datetime && { datetime: new Date(datetime) }),
      ...(isCancelled !== undefined && { isCancelled }),
      ...(note !== undefined && { note }),
      ...(teacherId !== undefined && { teacherId }),
    },
  });
  res.json(lesson);
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

// Список учителей (для выбора при создании шаблона)
curatorRouter.get('/teachers', async (_req: AuthRequest, res: Response) => {
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER' },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { lastName: 'asc' },
  });
  res.json(teachers);
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
