import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from '../../components/common/BottomNav';
import DashboardPage from './DashboardPage';
import SchedulePage from './SchedulePage';
import ProgressPage from './ProgressPage';
import ProfilePage from './ProfilePage';
import StarostaPage from './StarostaPage';
import { starostaApi } from '../../api';

const BASE_TABS = [
  { to: '/dashboard',  label: 'Главная',    icon: 'home'     },
  { to: '/schedule',   label: 'Расписание', icon: 'calendar' },
  { to: '/progress',   label: 'Прогресс',   icon: 'chart'    },
  { to: '/profile',    label: 'Профиль',    icon: 'user'     },
];

const STAROSTA_TAB = { to: '/starosta', label: 'Класс', icon: 'users' };

export default function StudentLayout() {
  const [isStarosta, setIsStarosta] = useState(false);

  useEffect(() => {
    starostaApi.me().then((r) => setIsStarosta(r.isStarosta)).catch(() => {});
  }, []);

  const tabs = isStarosta
    ? [BASE_TABS[0], BASE_TABS[1], STAROSTA_TAB, BASE_TABS[2], BASE_TABS[3]]
    : BASE_TABS;

  return (
    <div className="flex flex-col min-h-dvh pb-16">
      <Routes>
        <Route path="/"          element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/schedule"  element={<SchedulePage />} />
        <Route path="/progress"  element={<ProgressPage />} />
        <Route path="/profile"   element={<ProfilePage />} />
        <Route path="/starosta"  element={<StarostaPage />} />
      </Routes>
      <BottomNav tabs={tabs} />
    </div>
  );
}
