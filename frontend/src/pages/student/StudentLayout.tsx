import { Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from '../../components/common/BottomNav';
import DashboardPage from './DashboardPage';
import SchedulePage from './SchedulePage';
import ProgressPage from './ProgressPage';
import ProfilePage from './ProfilePage';

const TABS = [
  { to: '/dashboard', label: 'Главная', icon: '🏠' },
  { to: '/schedule', label: 'Расписание', icon: '📅' },
  { to: '/progress', label: 'Прогресс', icon: '📊' },
  { to: '/profile', label: 'Профиль', icon: '👤' },
];

export default function StudentLayout() {
  return (
    <div className="flex flex-col min-h-dvh pb-16">
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
      <BottomNav tabs={TABS} />
    </div>
  );
}
