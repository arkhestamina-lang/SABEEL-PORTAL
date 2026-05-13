import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { signToken } from '../utils/jwt';
import { requireAuth, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

const registerSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('STUDENT'),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    course: z.number().int().min(1).max(4),
    groupId: z.number().int(),
  }),
  z.object({
    role: z.literal('CURATOR'),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    secretCode: z.string(),
  }),
  z.object({
    role: z.literal('TEACHER'),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    secretCode: z.string(),
  }),
]);

authRouter.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  if (data.role === 'CURATOR' && data.secretCode !== process.env.CURATOR_SECRET_CODE) {
    res.status(403).json({ error: 'Неверный код куратора' });
    return;
  }
  if (data.role === 'TEACHER' && data.secretCode !== process.env.TEACHER_SECRET_CODE) {
    res.status(403).json({ error: 'Неверный код учителя' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    res.status(409).json({ error: 'Email уже зарегистрирован' });
    return;
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash,
      role: data.role,
      course: data.role === 'STUDENT' ? data.course : null,
      groupId: data.role === 'STUDENT' ? data.groupId : null,
    },
  });

  const token = signToken({ id: user.id, role: user.role });
  res.status(201).json({ token, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role } });
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email и пароль обязательны' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Неверный email или пароль' });
    return;
  }

  const token = signToken({ id: user.id, role: user.role });
  res.json({ token, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role, course: user.course, groupId: user.groupId } });
});

// Публичный список групп — для регистрации студента
authRouter.get('/groups', async (_req: Request, res: Response) => {
  const groups = await prisma.group.findMany({
    select: { id: true, name: true, course: true },
    orderBy: [{ course: 'asc' }, { name: 'asc' }],
  });
  res.json(groups);
});

authRouter.delete('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = req.user!.id;
  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, course: true, groupId: true, group: { select: { name: true } } },
  });
  res.json(user);
});
