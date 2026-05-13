import api from './client';
import type { AbsenceStatus } from '../types';

// Auth
export const authApi = {
  register: (data: object) => api.post('/auth/register', data).then((r) => r.data),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  groups: () => api.get('/auth/groups').then((r) => r.data),
  deleteAccount: () => api.delete('/auth/me').then((r) => r.data),
};

// Student
export const studentApi = {
  dashboard: () => api.get('/student/dashboard').then((r) => r.data),
  schedule: () => api.get('/student/schedule').then((r) => r.data),
  submitAbsence: (lessonId: number, reason: string) => api.post('/student/absence', { lessonId, reason }).then((r) => r.data),
  withdrawAbsence: (lessonId: number) => api.delete(`/student/absence/${lessonId}`).then((r) => r.data),
  submitHomework: (lessonId: number) => api.post('/student/homework-submit', { lessonId }).then((r) => r.data),
  unsubmitHomework: (lessonId: number) => api.delete(`/student/homework-submit/${lessonId}`).then((r) => r.data),
  getHwPhotos: (lessonId: number) => api.get(`/student/homework-photos/${lessonId}`).then((r) => r.data),
  uploadHwPhotos: (lessonId: number, files: File[]) => {
    const fd = new FormData();
    fd.append('lessonId', String(lessonId));
    files.forEach((f) => fd.append('photos', f));
    return api.post('/student/homework-photos', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  deleteHwPhoto: (id: number) => api.delete(`/student/homework-photos/${id}`).then((r) => r.data),
  progress: () => api.get('/student/progress').then((r) => r.data),
  saveQuran: (weekStart: string, pagesCompleted: number) => api.post('/student/quran', { weekStart, pagesCompleted }).then((r) => r.data),
  saveHabits: (date: string, reading: boolean, listening: boolean) => api.post('/student/habits', { date, reading, listening }).then((r) => r.data),
  exams: () => api.get('/student/exams').then((r) => r.data),
};

// Teacher
export const teacherApi = {
  lessons: () => api.get('/teacher/lessons').then((r) => r.data),
  lessonStudents: (id: number) => api.get(`/teacher/lessons/${id}/students`).then((r) => r.data),
  saveAttendance: (lessonId: number, marks: { studentId: number; present: boolean }[]) =>
    api.post('/teacher/attendance', { lessonId, marks }).then((r) => r.data),
};

// Curator
export const curatorApi = {
  groups: () => api.get('/curator/groups').then((r) => r.data),
  createGroup: (name: string, course: number) => api.post('/curator/groups', { name, course }).then((r) => r.data),
  students: (groupId?: number) => api.get('/curator/students', { params: groupId ? { groupId } : {} }).then((r) => r.data),
  student: (id: number) => api.get(`/curator/students/${id}`).then((r) => r.data),
  addHwMiss: (studentId: number, lessonId: number) => api.post('/curator/homework-miss', { studentId, lessonId }).then((r) => r.data),
  deleteHwMiss: (id: number) => api.delete(`/curator/homework-miss/${id}`).then((r) => r.data),
  hwSubmissions: (lessonId: number) => api.get(`/curator/homework-submissions/${lessonId}`).then((r) => r.data),
  hwPhotos: (lessonId: number) => api.get(`/curator/homework-photos/${lessonId}`).then((r) => r.data),
  absences: () => api.get('/curator/absences').then((r) => r.data),
  resolveAbsence: (id: number, status: AbsenceStatus) => api.patch(`/curator/absences/${id}`, { status }).then((r) => r.data),
  exams: (groupId?: number) => api.get('/curator/exams', { params: groupId ? { groupId } : {} }).then((r) => r.data),
  createExam: (title: string, date: string, groupId: number, formUrl?: string) =>
    api.post('/curator/exams', { title, date, groupId, formUrl }).then((r) => r.data),
  deleteExam: (id: number) => api.delete(`/curator/exams/${id}`).then((r) => r.data),
  saveExamScore: (studentId: number, examId: number, score: number, maxScore?: number) =>
    api.post('/curator/exam-scores', { studentId, examId, score, maxScore }).then((r) => r.data),
  semesters: (groupId?: number) => api.get('/curator/semesters', { params: groupId ? { groupId } : {} }).then((r) => r.data),
  createSemester: (name: string, startDate: string, endDate: string, groupId: number) =>
    api.post('/curator/semesters', { name, startDate, endDate, groupId }).then((r) => r.data),
  addTemplate: (semesterId: number, data: object) => api.post(`/curator/semesters/${semesterId}/templates`, data).then((r) => r.data),
  deleteTemplate: (templateId: number) => api.delete(`/curator/semesters/templates/${templateId}`).then((r) => r.data),
  generateLessons: (semesterId: number) => api.post(`/curator/semesters/${semesterId}/generate`).then((r) => r.data),
  updateLesson: (id: number, data: object) => api.patch(`/curator/lessons/${id}`, data).then((r) => r.data),
  addLesson: (data: object) => api.post('/curator/lessons', data).then((r) => r.data),
  teachers: () => api.get('/curator/teachers').then((r) => r.data),
  lessons: (groupId?: number) => api.get('/curator/lessons', { params: groupId ? { groupId } : {} }).then((r) => r.data),
  groupSchedule: (groupId: number) => api.get(`/curator/schedule/${groupId}`).then((r) => r.data),
  lessonStudents: (id: number) => api.get(`/curator/lessons/${id}/students`).then((r) => r.data),
  saveAttendance: (lessonId: number, marks: { studentId: number; present: boolean }[]) =>
    api.post(`/curator/lessons/${lessonId}/attendance`, { marks }).then((r) => r.data),
};
