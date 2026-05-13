import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

export const photosRouter = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '../../../uploads');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Только изображения'));
  },
});

// Студент загружает фото ДЗ
photosRouter.post(
  '/student/homework-photos',
  requireAuth,
  requireRole('STUDENT'),
  upload.array('photos', 5),
  async (req: AuthRequest, res: Response) => {
    const studentId = req.user!.id;
    const lessonId = parseInt(req.body.lessonId);
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) { res.status(400).json({ error: 'Нет файлов' }); return; }

    const created = await Promise.all(
      files.map((f) => prisma.homeworkPhoto.create({
        data: { studentId, lessonId, fileName: f.filename },
      }))
    );

    res.json(created.map((p) => ({ id: p.id, url: `/uploads/${p.fileName}` })));
  }
);

// Студент получает свои фото по уроку
photosRouter.get('/student/homework-photos/:lessonId', requireAuth, requireRole('STUDENT'), async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.id;
  const lessonId = parseInt(req.params.lessonId);

  const photos = await prisma.homeworkPhoto.findMany({
    where: { studentId, lessonId },
    orderBy: { createdAt: 'asc' },
  });

  res.json(photos.map((p) => ({ id: p.id, url: `/uploads/${p.fileName}`, createdAt: p.createdAt })));
});

// Студент удаляет своё фото
photosRouter.delete('/student/homework-photos/:id', requireAuth, requireRole('STUDENT'), async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.id;
  const id = parseInt(req.params.id);

  const photo = await prisma.homeworkPhoto.findFirst({ where: { id, studentId } });
  if (!photo) { res.status(404).json({ error: 'Фото не найдено' }); return; }

  // Удаляем файл
  const filePath = path.join(__dirname, '../../../uploads', photo.fileName);
  fs.unlink(filePath, () => {});

  await prisma.homeworkPhoto.delete({ where: { id } });
  res.json({ ok: true });
});

// Куратор видит все фото по уроку
photosRouter.get('/curator/homework-photos/:lessonId', requireAuth, requireRole('CURATOR'), async (req: AuthRequest, res: Response) => {
  const lessonId = parseInt(req.params.lessonId);

  const photos = await prisma.homeworkPhoto.findMany({
    where: { lessonId },
    include: { student: { select: { firstName: true, lastName: true } } },
    orderBy: [{ studentId: 'asc' }, { createdAt: 'asc' }],
  });

  res.json(photos.map((p) => ({
    id: p.id,
    url: `/uploads/${p.fileName}`,
    studentName: `${p.student.firstName} ${p.student.lastName}`,
    createdAt: p.createdAt,
  })));
});
