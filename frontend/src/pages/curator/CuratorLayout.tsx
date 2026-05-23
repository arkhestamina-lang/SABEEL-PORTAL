import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from '../../components/common/BottomNav';
import StudentsPage from './StudentsPage';
import AbsencesPage from './AbsencesPage';
import AttendancePage from './AttendancePage';
import ScheduleManagerPage from './ScheduleManagerPage';
import ExamsPage from './ExamsPage';
import CuratorProfilePage from './CuratorProfilePage';
import { curatorApi } from '../../api';

export default function CuratorLayout() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    async function fetchPending() {
      try {
        const [absences, debts] = await Promise.all([curatorApi.absences(), curatorApi.debtRequests()]);
        setPendingCount(absences.length + debts.length);
      } catch {}
    }
    fetchPending();
    const interval = setInterval(fetchPending, 60_000);
    return () => clearInterval(interval);
  }, []);

  const TABS = [
    { to: '/students',        label: 'Студенты', icon: 'users' },
    { to: '/absences',        label: 'Заявки',   icon: 'list',     badge: pendingCount },
    { to: '/attendance',      label: 'Расписание', icon: 'calendar' },
    { to: '/exams',           label: 'Экзамены', icon: 'book' },
    { to: '/curator-profile', label: 'Профиль',  icon: 'user' },
  ];

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
