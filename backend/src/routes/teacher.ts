import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

export const teacherRouter = Router();
teacherRouter.use(requireAuth, requireRole('TEACHER'));

// Уроки учителя — сегодня и прошедшие без отметки
teacherRouter.get('/lessons', async (req: AuthRequest, res: Response) => {
  const teacherId = req.user!.id;
  const now = new Date();

  const lessons = await prisma.lesson.findMany({
    where: { teacherId, isCancelled: false, datetime: { lte: now } },
    orderBy: { datetime: 'desc' },
    include: {
      group: { select: { name: true } },
      attendance: { select: { id: true } },
    },
  });

  const result = lessons.map((l) => ({
    id: l.id,
    subject: l.subject,
    datetime: l.datetime,
    groupName: l.group.name,
    isMarked: l.attendance.length > 0,
  }));

  res.json(result);
});

// Список студентов группы для урока
teacherRouter.get('/lessons/:id/students', async (req: AuthRequest, res: Response) => {
  const teacherId = req.user!.id;
  const lessonId = parseInt(req.params.id);

  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, teacherId } });
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

// Сохранить отметку посещаемости
teacherRouter.post('/attendance', async (req: AuthRequest, res: Response) => {
  const teacherId = req.user!.id;
  const { lessonId, marks } = req.body as { lessonId: number; marks: { studentId: number; present: boolean }[] };

  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, teacherId } });
  if (!lesson) { res.status(403).json({ error: 'Нет доступа к этому уроку' }); return; }

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
