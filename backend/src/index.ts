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
import { initializeDatabase } from './utils/initDb';
import prisma from './utils/prisma';
// import { testRouter } from './routes/test';

dotenv.config();
console.log('[startup] Initializing...');
console.log('[startup] DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'NOT SET');
console.log('[startup] NODE_ENV:', process.env.NODE_ENV || 'development');

const app = express();
const PORT = process.env.PORT || 3001;
const publicDir = path.join(path.dirname(__dirname), 'public');

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
app.use(express.static(publicDir));

app.use('/api/auth', authRouter);
app.use('/api/student', studentRouter);
app.use('/api/curator', curatorRouter);
app.use('/api', photosRouter);
app.use('/api/starosta', starostaRouter);
// app.use('/api/test', testRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('*', (_req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) res.status(500).json({ error: 'Не удалось загрузить фронтенд', path: indexPath });
  });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.code === 'P2025') { res.status(404).json({ error: 'Запись не найдена' }); return; }
  if (err?.code === 'P2002') { res.status(409).json({ error: 'Такая запись уже существует' }); return; }
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

async function main() {
  try {
    // Test DB connection
    console.log('[startup] Testing database connection...');
    const userCount = await prisma.user.count();
    console.log(`[startup] Database connected! Users: ${userCount}`);

    startCronJobs();
    console.log('[startup] Cron jobs started');

    await initializeDatabase();
    console.log('[startup] Database initialization completed');

    app.listen(PORT, () => {
      console.log(`[startup] Backend running on port ${PORT}`);
    });
  } catch (err: any) {
    console.error('[startup] FATAL ERROR');
    console.error('[startup] Message:', err.message || err);
    console.error('[startup] Code:', err.code);
    console.error('[startup] Full error:', JSON.stringify(err, null, 2));
    console.error('[startup] Stack:', err.stack);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[startup] Uncaught error in main:', err);
  process.exit(1);
});
// v1780004893
