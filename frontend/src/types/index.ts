export type Role = 'STUDENT' | 'TEACHER' | 'CURATOR';
export type AbsenceStatus = 'PENDING' | 'EXCUSED' | 'COUNTED';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  course?: number;
  groupId?: number;
  group?: { name: string };
}

export interface Rating {
  total: number;
  attendanceScore: number;
  homeworkScore: number;
  quranScore: number;
  habitsScore: number;
  countedAbsences: number;
  hwMisses: number;
}

export interface Lesson {
  id: number;
  subject: string;
  datetime: string;
  isExtra: boolean;
  isCancelled: boolean;
  note?: string;
  groupName?: string;
  isMarked?: boolean;
  attended?: boolean | null;
  absenceStatus?: AbsenceStatus | null;
  canSubmitAbsence?: boolean;
  isPast?: boolean;
  hwSubmitted?: boolean;
  meetingUrl?: string | null;
  debtStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | null;
  hwDeadlinePassed?: boolean;
}

export interface ScheduleTemplate {
  id: number;
  dayOfWeek: number;
  timeHour: number;
  timeMinute: number;
  subject: string;
  teacherId?: number;
  meetingUrl?: string | null;
}

export interface AbsenceRequest {
  id: number;
  studentId: number;
  lessonId: number;
  reason: string;
  status: AbsenceStatus;
  submittedAt: string;
  student?: { firstName: string; lastName: string };
  lesson?: { subject: string; datetime: string };
}

export interface HabitEntry {
  date: string;
  reading: boolean;
  listening: boolean;
}

export interface QuranEntry {
  weekStart: string;
  pagesCompleted: number;
}

export interface ExamScore {
  score: number;
  maxScore: number;
}

export interface Exam {
  id: number;
  title: string;
  date: string;
  scores: ExamScore[];
}

export interface HolidayPeriod {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
}

export interface Semester {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  templates: ScheduleTemplate[];
  holidays: HolidayPeriod[];
}


