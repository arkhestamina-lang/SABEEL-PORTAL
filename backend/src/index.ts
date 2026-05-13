import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { authRouter } from './routes/auth';
import { studentRouter } from './routes/student';
import { teacherRouter } from './routes/teacher';
import { curatorRouter } from './routes/curator';
import { photosRouter } from './routes/photos';
import { startCronJobs } from './services/cronService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use('/api/auth', authRouter);
app.use('/api/student', studentRouter);
app.use('/api/teacher', teacherRouter);
app.use('/api/curator', curatorRouter);
app.use('/api', photosRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

startCronJobs();

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
