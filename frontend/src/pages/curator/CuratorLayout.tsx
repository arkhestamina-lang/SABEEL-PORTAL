import { Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from '../../components/common/BottomNav';
import StudentsPage from './StudentsPage';
import AbsencesPage from './AbsencesPage';
import AttendancePage from './AttendancePage';
import ScheduleManagerPage from './ScheduleManagerPage';
import ExamsPage from './ExamsPage';
import CuratorProfilePage from './CuratorProfilePage';

const TABS = [
  { to: '/students', label: 'Студенты', icon: 'users' },
  { to: '/absences', label: 'Заявки', icon: 'list' },
  { to: '/attendance', label: 'Расписание', icon: 'calendar' },
  { to: '/exams', label: 'Экзамены', icon: 'book' },
  { to: '/curator-profile', label: 'Профиль', icon: 'user' },
];

export default function CuratorLayout() {
  return (
    <div className="flex flex-col min-h-dvh pb-16">
      <Routes>
        <Route path="/" element={<Navigate to="/students" />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/absences" element={<AbsencesPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/schedule-manager" element={<ScheduleManagerPage />} />
        <Route path="/curator-profile" element={<CuratorProfilePage />} />
      </Routes>
      <BottomNav tabs={TABS} />
    </div>
  );
}
