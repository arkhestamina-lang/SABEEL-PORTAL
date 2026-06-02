import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    { to: '/dashboard', label: 'Главная', icon: 'home' },
    { to: '/schedule', label: 'Расписание', icon: 'calendar' },
    { to: '/progress', label: 'Прогресс', icon: 'chart' },
    { to: '/profile', label: 'Профиль', icon: 'user' },
];
const STAROSTA_TAB = { to: '/starosta', label: 'Класс', icon: 'users' };
export default function StudentLayout() {
    const [isStarosta, setIsStarosta] = useState(false);
    useEffect(() => {
        starostaApi.me().then((r) => setIsStarosta(r.isStarosta)).catch(() => { });
    }, []);
    const tabs = isStarosta
        ? [BASE_TABS[0], BASE_TABS[1], STAROSTA_TAB, BASE_TABS[2], BASE_TABS[3]]
        : BASE_TABS;
    return (_jsxs("div", { className: "flex flex-col min-h-dvh pb-16", children: [_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/dashboard" }) }), _jsx(Route, { path: "/dashboard", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/schedule", element: _jsx(SchedulePage, {}) }), _jsx(Route, { path: "/progress", element: _jsx(ProgressPage, {}) }), _jsx(Route, { path: "/profile", element: _jsx(ProfilePage, {}) }), _jsx(Route, { path: "/starosta", element: _jsx(StarostaPage, {}) })] }), _jsx(BottomNav, { tabs: tabs })] }));
}
