import api from './client';
import type { AbsenceStatus } from '../types';

// Auth
export const authApi = {
  register: (data: object) => api.post('/auth/register', data).then((r) => r.data),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  deleteAccount: () => api.delete('/auth/me').then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),
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
  saveHabits: (date: string, reading: boolean, listening: boolean, revision?: boolean) => api.post('/student/habits', { date, reading, listening, revision }).then((r) => r.data),
  submitDebt: (lessonId: number, reason: string) => api.post('/student/homework-debt', { lessonId, reason }).then((r) => r.data),
  uploadAbsenceEvidence: (absenceRequestId: number, files: File[]) => {
    const fd = new FormData();
    fd.append('absenceRequestId', String(absenceRequestId));
    files.forEach((f) => fd.append('photos', f));
    return api.post('/student/absence-evidence', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  uploadDebtEvidence: (debtRequestId: number, files: File[]) => {
    const fd = new FormData();
    fd.append('debtRequestId', String(debtRequestId));
    files.forEach((f) => fd.append('photos', f));
    return api.post('/student/debt-evidence', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  exams: () => api.get('/student/exams').then((r) => r.data),
};

// Starosta
export const starostaApi = {
  me: () => api.get('/starosta/me').then((r) => r.data),
  lessons: () => api.get('/starosta/lessons').then((r) => r.data),
  lessonStudents: (id: number) => api.get(`/starosta/lessons/${id}/students`).then((r) => r.data),
  saveAttendance: (lessonId: number, marks: { studentId: number; present: boolean }[]) =>
    api.post(`/starosta/lessons/${lessonId}/attendance`, { marks }).then((r) => r.data),
};

// Curator
export const curatorApi = {
  groups: () => api.get('/curator/groups').then((r) => r.data),
  createGroup: (name: string, course: number) => api.post('/curator/groups', { name, course }).then((r) => r.data),
  deleteGroup: (id: number) => api.delete(`/curator/groups/${id}`).then((r) => r.data),
  createStudent: (data: object) => api.post('/curator/students', data).then((r) => r.data),
  students: (groupId?: number) => api.get('/curator/students', { params: groupId ? { groupId } : {} }).then((r) => r.data),
  student: (id: number) => api.get(`/curator/students/${id}`).then((r) => r.data),
  deleteStudent: (id: number) => api.delete(`/curator/students/${id}`).then((r) => r.data),
  excludeStudent: (id: number) => api.patch(`/curator/students/${id}/exclude`).then((r) => r.data),
  transferStudent: (id: number, groupId: number) => api.patch(`/curator/students/${id}/group`, { groupId }).then((r) => r.data),
  studentPhotos: (studentId: number) => api.get(`/curator/students/${studentId}/homework-photos`).then((r) => r.data),
  hwSubmissions: (lessonId: number) => api.get(`/curator/homework-submissions/${lessonId}`).then((r) => r.data),
  hwPhotos: (lessonId: number) => api.get(`/curator/homework-photos/${lessonId}`).then((r) => r.data),
  absences: () => api.get('/curator/absences').then((r) => r.data),
  resolveAbsence: (id: number, status: AbsenceStatus) => api.patch(`/curator/absences/${id}`, { status }).then((r) => r.data),
  exams: (groupId?: number) => api.get('/curator/exams', { params: groupId ? { groupId } : {} }).then((r) => r.data),
  createExam: (title: string, date: string, groupId: number, formUrl?: string, startHour?: number, startMinute?: number, durationMinutes?: number) =>
    api.post('/curator/exams', { title, date, groupId, formUrl, startHour, startMinute, durationMinutes }).then((r) => r.data),
  updateExam: (id: number, data: object) => api.patch(`/curator/exams/${id}`, data).then((r) => r.data),
  deleteExam: (id: number) => api.delete(`/curator/exams/${id}`).then((r) => r.data),
  saveExamScore: (studentId: number, examId: number, score: number, maxScore?: number) =>
    api.post('/curator/exam-scores', { studentId, examId, score, maxScore }).then((r) => r.data),
  semesters: (groupId?: number) => api.get('/curator/semesters', { params: groupId ? { groupId } : {} }).then((r) => r.data),
  createSemester: (name: string, startDate: string, endDate: string, groupId: number) =>
    api.post('/curator/semesters', { name, startDate, endDate, groupId }).then((r) => r.data),
  addTemplate: (semesterId: number, data: object) => api.post(`/curator/semesters/${semesterId}/templates`, data).then((r) => r.data),
  deleteTemplate: (templateId: number) => api.delete(`/curator/semesters/templates/${templateId}`).then((r) => r.data),
  addHoliday: (semesterId: number, name: string, startDate: string, endDate: string) =>
    api.post(`/curator/semesters/${semesterId}/holidays`, { name, startDate, endDate }).then((r) => r.data),
  deleteHoliday: (id: number) => api.delete(`/curator/semesters/holidays/${id}`).then((r) => r.data),
  generateLessons: (semesterId: number) => api.post(`/curator/semesters/${semesterId}/generate`).then((r) => r.data),
  updateLesson: (id: number, data: object) => api.patch(`/curator/lessons/${id}`, data).then((r) => r.data),
  deleteLesson: (id: number) => api.delete(`/curator/lessons/${id}`).then((r) => r.data),
  addLesson: (data: object) => api.post('/curator/lessons', data).then((r) => r.data),
  teachers: () => api.get('/curator/teachers').then((r) => r.data),
  createTeacher: (firstName: string, lastName: string) => api.post('/curator/teachers', { firstName, lastName }).then((r) => r.data),
  deleteTeacher: (id: number) => api.delete(`/curator/teachers/${id}`).then((r) => r.data),
  exportExcel: () => api.get('/curator/export', { responseType: 'blob' }).then((r) => r.data),
  debtRequests: () => api.get('/curator/debt-requests').then((r) => r.data),
  resolveDebt: (id: number, status: 'ACCEPTED' | 'REJECTED') => api.patch(`/curator/debt-requests/${id}`, { status }).then((r) => r.data),
  setStarosta: (groupId: number, studentId: number | null) =>
    api.patch(`/curator/groups/${groupId}/starosta`, { studentId }).then((r) => r.data),
  lessons: (groupId?: number) => api.get('/curator/lessons', { params: groupId ? { groupId } : {} }).then((r) => r.data),
  groupSchedule: (groupId: number) => api.get(`/curator/schedule/${groupId}`).then((r) => r.data),
  lessonStudents: (id: number) => api.get(`/curator/lessons/${id}/students`).then((r) => r.data),
  saveAttendance: (lessonId: number, marks: { studentId: number; present: boolean }[]) =>
    api.post(`/curator/lessons/${lessonId}/attendance`, { marks }).then((r) => r.data),
};
