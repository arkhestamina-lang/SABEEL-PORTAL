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
// import { testRouter } from './routes/test';

dotenv.config();

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

startCronJobs();
initializeDatabase().catch(console.error);

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
// v1780004893
