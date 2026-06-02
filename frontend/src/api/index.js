import api from './client';
// Auth
export const authApi = {
    register: (data) => api.post('/auth/register', data).then((r) => r.data),
    login: (email, password) => api.post('/auth/login', { email, password }).then((r) => r.data),
    me: () => api.get('/auth/me').then((r) => r.data),
    deleteAccount: () => api.delete('/auth/me').then((r) => r.data),
    changePassword: (currentPassword, newPassword) => api.patch('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),
};
// Student
export const studentApi = {
    dashboard: () => api.get('/student/dashboard').then((r) => r.data),
    schedule: () => api.get('/student/schedule').then((r) => r.data),
    submitAbsence: (lessonId, reason) => api.post('/student/absence', { lessonId, reason }).then((r) => r.data),
    withdrawAbsence: (lessonId) => api.delete(`/student/absence/${lessonId}`).then((r) => r.data),
    submitHomework: (lessonId) => api.post('/student/homework-submit', { lessonId }).then((r) => r.data),
    unsubmitHomework: (lessonId) => api.delete(`/student/homework-submit/${lessonId}`).then((r) => r.data),
    getHwPhotos: (lessonId) => api.get(`/student/homework-photos/${lessonId}`).then((r) => r.data),
    uploadHwPhotos: (lessonId, files) => {
        const fd = new FormData();
        fd.append('lessonId', String(lessonId));
        files.forEach((f) => fd.append('photos', f));
        return api.post('/student/homework-photos', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
    },
    deleteHwPhoto: (id) => api.delete(`/student/homework-photos/${id}`).then((r) => r.data),
    progress: () => api.get('/student/progress').then((r) => r.data),
    saveQuran: (weekStart, pagesCompleted) => api.post('/student/quran', { weekStart, pagesCompleted }).then((r) => r.data),
    saveHabits: (date, reading, listening, revision) => api.post('/student/habits', { date, reading, listening, revision }).then((r) => r.data),
    submitDebt: (lessonId, reason) => api.post('/student/homework-debt', { lessonId, reason }).then((r) => r.data),
    uploadAbsenceEvidence: (absenceRequestId, files) => {
        const fd = new FormData();
        fd.append('absenceRequestId', String(absenceRequestId));
        files.forEach((f) => fd.append('photos', f));
        return api.post('/student/absence-evidence', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
    },
    uploadDebtEvidence: (debtRequestId, files) => {
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
    lessonStudents: (id) => api.get(`/starosta/lessons/${id}/students`).then((r) => r.data),
    saveAttendance: (lessonId, marks) => api.post(`/starosta/lessons/${lessonId}/attendance`, { marks }).then((r) => r.data),
};
// Curator
export const curatorApi = {
    groups: () => api.get('/curator/groups').then((r) => r.data),
    createGroup: (name, course) => api.post('/curator/groups', { name, course }).then((r) => r.data),
    deleteGroup: (id) => api.delete(`/curator/groups/${id}`).then((r) => r.data),
    createStudent: (data) => api.post('/curator/students', data).then((r) => r.data),
    students: (groupId) => api.get('/curator/students', { params: groupId ? { groupId } : {} }).then((r) => r.data),
    student: (id) => api.get(`/curator/students/${id}`).then((r) => r.data),
    deleteStudent: (id) => api.delete(`/curator/students/${id}`).then((r) => r.data),
    excludeStudent: (id) => api.patch(`/curator/students/${id}/exclude`).then((r) => r.data),
    transferStudent: (id, groupId) => api.patch(`/curator/students/${id}/group`, { groupId }).then((r) => r.data),
    studentPhotos: (studentId) => api.get(`/curator/students/${studentId}/homework-photos`).then((r) => r.data),
    hwSubmissions: (lessonId) => api.get(`/curator/homework-submissions/${lessonId}`).then((r) => r.data),
    hwPhotos: (lessonId) => api.get(`/curator/homework-photos/${lessonId}`).then((r) => r.data),
    absences: () => api.get('/curator/absences').then((r) => r.data),
    resolveAbsence: (id, status) => api.patch(`/curator/absences/${id}`, { status }).then((r) => r.data),
    exams: (groupId) => api.get('/curator/exams', { params: groupId ? { groupId } : {} }).then((r) => r.data),
    createExam: (title, date, groupId, formUrl, startHour, startMinute, durationMinutes) => api.post('/curator/exams', { title, date, groupId, formUrl, startHour, startMinute, durationMinutes }).then((r) => r.data),
    updateExam: (id, data) => api.patch(`/curator/exams/${id}`, data).then((r) => r.data),
    deleteExam: (id) => api.delete(`/curator/exams/${id}`).then((r) => r.data),
    saveExamScore: (studentId, examId, score, maxScore) => api.post('/curator/exam-scores', { studentId, examId, score, maxScore }).then((r) => r.data),
    semesters: (groupId) => api.get('/curator/semesters', { params: groupId ? { groupId } : {} }).then((r) => r.data),
    createSemester: (name, startDate, endDate, groupId) => api.post('/curator/semesters', { name, startDate, endDate, groupId }).then((r) => r.data),
    addTemplate: (semesterId, data) => api.post(`/curator/semesters/${semesterId}/templates`, data).then((r) => r.data),
    deleteTemplate: (templateId) => api.delete(`/curator/semesters/templates/${templateId}`).then((r) => r.data),
    addHoliday: (semesterId, name, startDate, endDate) => api.post(`/curator/semesters/${semesterId}/holidays`, { name, startDate, endDate }).then((r) => r.data),
    deleteHoliday: (id) => api.delete(`/curator/semesters/holidays/${id}`).then((r) => r.data),
    generateLessons: (semesterId) => api.post(`/curator/semesters/${semesterId}/generate`).then((r) => r.data),
    updateLesson: (id, data) => api.patch(`/curator/lessons/${id}`, data).then((r) => r.data),
    deleteLesson: (id) => api.delete(`/curator/lessons/${id}`).then((r) => r.data),
    addLesson: (data) => api.post('/curator/lessons', data).then((r) => r.data),
    teachers: () => api.get('/curator/teachers').then((r) => r.data),
    createTeacher: (firstName, lastName) => api.post('/curator/teachers', { firstName, lastName }).then((r) => r.data),
    deleteTeacher: (id) => api.delete(`/curator/teachers/${id}`).then((r) => r.data),
    exportExcel: () => api.get('/curator/export', { responseType: 'blob' }).then((r) => r.data),
    debtRequests: () => api.get('/curator/debt-requests').then((r) => r.data),
    resolveDebt: (id, status) => api.patch(`/curator/debt-requests/${id}`, { status }).then((r) => r.data),
    setStarosta: (groupId, studentId) => api.patch(`/curator/groups/${groupId}/starosta`, { studentId }).then((r) => r.data),
    lessons: (groupId) => api.get('/curator/lessons', { params: groupId ? { groupId } : {} }).then((r) => r.data),
    groupSchedule: (groupId) => api.get(`/curator/schedule/${groupId}`).then((r) => r.data),
    lessonStudents: (id) => api.get(`/curator/lessons/${id}/students`).then((r) => r.data),
    saveAttendance: (lessonId, marks) => api.post(`/curator/lessons/${lessonId}/attendance`, { marks }).then((r) => r.data),
};
