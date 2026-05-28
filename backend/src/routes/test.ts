import { Router, Request, Response } from 'express';

export const testRouter = Router();

testRouter.post('/login-test', async (req: Request, res: Response) => {
  res.json({ ok: true, message: 'Test endpoint works' });
});

testRouter.get('/db-test', async (req: Request, res: Response) => {
  try {
    const prisma = (await import('../utils/prisma')).default;
    const count = await prisma.user.count();
    res.json({ userCount: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
