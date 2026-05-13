import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

export const starostaRouter = Router();
starostaRouter.use(requireAuth);

// Проверка — является ли текущий студент старостой
starostaRouter.get('/me', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const group = await prisma.group.findFirst({
    where: { starostaId: userId },
    select: { id: true, name: true, course: true },
  });

  res.json({ isStarosta: !!group, group });
});

// Уроки группы для старосты (прошедшие + предстоящие)
starostaRouter.get('/lessons', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const group = await prisma.group.findFirst({ where: { starostaId: userId } });
  if (!group) { res.status(403).json({ error: 'Нет прав старосты' }); return; }

  const lessons = await prisma.lesson.findMany({
    where: { groupId: group.id, isCancelled: false },
    include: {
      attendance: { select: { id: true } },
    },
    orderBy: { datetime: 'desc' },
    take: 60,
  });

  res.json(lessons.map((l) => ({
    id: l.id,
    subject: l.subject,
    datetime: l.datetime,
    isExtra: l.isExtra,
    isMarked: l.attendance.length > 0,
    groupId: l.groupId,
  })));
});

// Студенты группы для урока
starostaRouter.get('/lessons/:id/students', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const lessonId = parseInt(req.params.id);

  const group = await prisma.group.findFirst({ where: { starostaId: userId } });
  if (!group) { res.status(403).json({ error: 'Нет прав старосты' }); return; }

  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, groupId: group.id } });
  if (!lesson) { res.status(404).json({ error: 'Урок не найден' }); return; }

  const students = await prisma.user.findMany({
    where: { groupId: group.id, role: 'STUDENT' },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { lastName: 'asc' },
  });

  const existing = await prisma.attendanceMark.findMany({ where: { lessonId } });
  const markMap = Object.fromEntries(existing.map((m) => [m.studentId, m.present]));

  res.json(students.map((s) => ({ ...s, present: markMap[s.id] ?? true })));
});

// Отметить посещаемость
starostaRouter.post('/lessons/:id/attendance', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const lessonId = parseInt(req.params.id);
  const marks: { studentId: number; present: boolean }[] = req.body.marks;

  const group = await prisma.group.findFirst({ where: { starostaId: userId } });
  if (!group) { res.status(403).json({ error: 'Нет прав старосты' }); return; }

  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, groupId: group.id } });
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
