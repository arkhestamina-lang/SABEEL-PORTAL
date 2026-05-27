import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { authRouter } from './routes/auth';
import { studentRouter } from './routes/student';
import { curatorRouter } from './routes/curator';
import { photosRouter } from './routes/photos';
import { starostaRouter } from './routes/starosta';
import { startCronJobs } from './services/cronService';
import prisma from './utils/prisma';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

async function seedIfEmpty() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const passwordHash = await bcrypt.hash('student123', 10);
      const curatorHash = await bcrypt.hash('curator123', 10);

      // Куратор
      await prisma.user.create({
        data: { firstName: 'Айша', lastName: 'Муминова', email: 'curator@sabil.com', passwordHash: curatorHash, role: 'CURATOR' },
      });

      // Студент
      await prisma.user.create({
        data: { firstName: 'Марьям', lastName: 'Алиева', email: 'student@sabil.com', passwordHash, role: 'STUDENT', course: 1 },
      });

      console.log('✓ Test accounts created');
    }
  } catch (err: any) {
    if (err.code === 'P2021') {
      console.log('⚠ Tables not created yet, skipping seed');
      return;
    }
    throw err;
  }
}

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use('/api/auth', authRouter);
app.use('/api/student', studentRouter);
app.use('/api/curator', curatorRouter);
app.use('/api', photosRouter);
app.use('/api/starosta', starostaRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Глобальный обработчик ошибок — ловит Prisma и прочие необработанные исключения
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.code === 'P2025') { res.status(404).json({ error: 'Запись не найдена' }); return; }
  if (err?.code === 'P2002') { res.status(409).json({ error: 'Такая запись уже существует' }); return; }
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

startCronJobs();

seedIfEmpty().then(() => {
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}).catch((err) => {
  console.error('Seed error:', err);
  // Don't exit, migrations might not have run yet
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
});
