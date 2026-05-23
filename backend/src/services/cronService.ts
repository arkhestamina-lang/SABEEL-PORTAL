import cron from 'node-cron';
import prisma from '../utils/prisma';

export function startCronJobs() {
  // Каждый час: AttendanceMark(present:false) старше 24ч без причины → COUNTED
  cron.schedule('0 * * * *', async () => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const unmarkedAbsences = await prisma.attendanceMark.findMany({
      where: { present: false, lesson: { datetime: { lt: cutoff } } },
      select: { lessonId: true, studentId: true },
    });

    for (const { lessonId, studentId } of unmarkedAbsences) {
      const existing = await prisma.absenceRequest.findUnique({
        where: { studentId_lessonId: { studentId, lessonId } },
      });
      if (!existing) {
        await prisma.absenceRequest.create({
          data: {
            studentId,
            lessonId,
            reason: 'Автоматически засчитан (нет заявки в течение 24ч)',
            status: 'COUNTED',
          },
        });
      }
    }
  });
}
