import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
            }
            catch { }
        }
        fetchPending();
        const interval = setInterval(fetchPending, 60000);
        return () => clearInterval(interval);
    }, []);
    const TABS = [
        { to: '/students', label: 'Студенты', icon: 'users' },
        { to: '/absences', label: 'Заявки', icon: 'list', badge: pendingCount },
        { to: '/attendance', label: 'Расписание', icon: 'calendar' },
        { to: '/exams', label: 'Экзамены', icon: 'book' },
        { to: '/curator-profile', label: 'Профиль', icon: 'user' },
    ];
    return (_jsxs("div", { className: "flex flex-col min-h-dvh pb-16", children: [_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/students" }) }), _jsx(Route, { path: "/students", element: _jsx(StudentsPage, {}) }), _jsx(Route, { path: "/absences", element: _jsx(AbsencesPage, {}) }), _jsx(Route, { path: "/attendance", element: _jsx(AttendancePage, {}) }), _jsx(Route, { path: "/exams", element: _jsx(ExamsPage, {}) }), _jsx(Route, { path: "/schedule-manager", element: _jsx(ScheduleManagerPage, {}) }), _jsx(Route, { path: "/curator-profile", element: _jsx(CuratorProfilePage, {}) })] }), _jsx(BottomNav, { tabs: TABS })] }));
}
