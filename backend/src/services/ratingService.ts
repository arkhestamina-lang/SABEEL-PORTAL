import prisma from '../utils/prisma';

const QURAN_WEEKLY_NORM: Record<number, number> = { 1: 7, 2: 1, 3: 2, 4: 3 };

function monthBounds(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

// Суммарный рейтинг за произвольный период (семестр)
export async function calcRatingForSemester(studentId: number, startDate: Date, endDate: Date) {
  let total = 0;
  let months = 0;
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  while (cursor <= endMonth) {
    const r = await calcRating(studentId, cursor.getFullYear(), cursor.getMonth() + 1);
    total += r.total;
    months++;
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return { total, maxTotal: months * 100, months };
}

export async function calcRating(studentId: number, year: number, month: number) {
  const { start, end } = monthBounds(year, month);

  const user = await prisma.user.findUnique({ where: { id: studentId }, select: { course: true, groupId: true } });
  const course = user?.course ?? 1;
  const groupId = user?.groupId;

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

  // ДЗ — все прошедшие уроки группы за месяц без submission
  const now = new Date();
  const pastLessons = groupId
    ? await prisma.lesson.findMany({
        where: { groupId, isCancelled: false, datetime: { gte: start, lt: end, lte: now } },
        select: { id: true },
      })
    : [];
  const submissions = await prisma.homeworkSubmission.findMany({
    where: { studentId, lessonId: { in: pastLessons.map((l) => l.id) } },
    select: { lessonId: true },
  });
  const submittedSet = new Set(submissions.map((s) => s.lessonId));
  const hwMisses = pastLessons.filter((l) => !submittedSet.has(l.id)).length;

  // Коран
  let quranScore = 0;
  {
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
  const revisionDays = habitEntries.filter((e) => (e as any).revision).length;
  const habitsPct = ((readingDays + listeningDays + revisionDays) / 3 / daysInMonth);
  const habitsScore = Math.round(habitsPct * 10);

  const attendanceScore = Math.max(0, 40 - countedAbsences * 8);
  const homeworkScore = Math.max(0, 30 - hwMisses * 6);
  const total = attendanceScore + homeworkScore + quranScore + habitsScore;

  return { total, attendanceScore, homeworkScore, quranScore, habitsScore, countedAbsences, hwMisses };
}
