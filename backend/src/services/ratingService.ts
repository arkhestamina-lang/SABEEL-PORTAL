import prisma from '../utils/prisma';

const QURAN_WEEKLY_NORM: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3 };

function monthBounds(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

export async function calcRating(studentId: number, year: number, month: number) {
  const { start, end } = monthBounds(year, month);

  const user = await prisma.user.findUnique({ where: { id: studentId }, select: { course: true } });
  const course = user?.course ?? 1;

  // Посещаемость — считаем только COUNTED пропуски
  const absences = await prisma.attendanceMark.count({
    where: {
      studentId,
      present: false,
      lesson: { datetime: { gte: start, lt: end } },
      // отсутствие записи AbsenceRequest со статусом EXCUSED
    },
  });

  // Уточняем: уважительные не считаются
  const excusedLessonIds = await prisma.absenceRequest.findMany({
    where: { studentId, status: 'EXCUSED', lesson: { datetime: { gte: start, lt: end } } },
    select: { lessonId: true },
  });
  const excusedIds = new Set(excusedLessonIds.map((r) => r.lessonId));

  const countedAbsenceMarks = await prisma.attendanceMark.findMany({
    where: { studentId, present: false, lesson: { datetime: { gte: start, lt: end } } },
    select: { lessonId: true },
  });
  const countedAbsences = countedAbsenceMarks.filter((m) => !excusedIds.has(m.lessonId)).length;

  // ДЗ
  const hwMisses = await prisma.homeworkMiss.count({
    where: { studentId, lesson: { datetime: { gte: start, lt: end } } },
  });

  // Коран
  let quranScore = 0;
  if (course > 1) {
    const weeklyNorm = QURAN_WEEKLY_NORM[course] ?? 0;
    const weeksInMonth = 4;
    const monthlyNorm = weeklyNorm * weeksInMonth;

    const quranEntries = await prisma.quranEntry.findMany({
      where: { studentId, weekStart: { gte: start, lt: end } },
    });
    const totalPages = quranEntries.reduce((sum, e) => sum + e.pagesCompleted, 0);
    const pct = monthlyNorm > 0 ? Math.min(totalPages / monthlyNorm, 1) : 0;
    quranScore = Math.round(pct * 20);
  }

  // Привычки
  const habitEntries = await prisma.habitEntry.findMany({
    where: { studentId, date: { gte: start, lt: end } },
  });
  const daysInMonth = new Date(year, month, 0).getDate();
  const readingDays = habitEntries.filter((e) => e.reading).length;
  const listeningDays = habitEntries.filter((e) => e.listening).length;
  const habitsPct = ((readingDays + listeningDays) / 2 / daysInMonth);
  const habitsScore = Math.round(habitsPct * 10);

  const attendanceScore = Math.max(0, 40 - countedAbsences * 8);
  const homeworkScore = Math.max(0, 30 - hwMisses * 6);
  const total = attendanceScore + homeworkScore + quranScore + habitsScore;

  return { total, attendanceScore, homeworkScore, quranScore, habitsScore, countedAbsences, hwMisses };
}
