import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { Home, Calendar, BarChart2, User, Users, ClipboardList, BookOpen, Settings } from 'lucide-react';
const ICON_MAP = {
    home: Home,
    calendar: Calendar,
    chart: BarChart2,
    user: User,
    users: Users,
    list: ClipboardList,
    book: BookOpen,
    settings: Settings,
};
export default function BottomNav({ tabs }) {
    return (_jsx("nav", { className: "fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-card border-t border-border safe-pb z-40", children: _jsx("div", { className: "flex", children: tabs.map((tab) => {
                const Icon = ICON_MAP[tab.icon] ?? Home;
                return (_jsx(NavLink, { to: tab.to, className: ({ isActive }) => `flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${isActive ? 'text-primary' : 'text-muted'}`, children: ({ isActive }) => (_jsxs(_Fragment, { children: [_jsxs("div", { className: "relative", children: [_jsx(Icon, { size: 20, strokeWidth: isActive ? 2.5 : 1.8 }), tab.badge != null && tab.badge > 0 && (_jsx("span", { className: "absolute -top-1 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[8px] font-heading rounded-full flex items-center justify-center px-0.5", children: tab.badge > 9 ? '9+' : tab.badge }))] }), _jsx("span", { className: `text-[9px] font-body tracking-wide ${isActive ? 'font-semibold' : ''}`, children: tab.label })] })) }, tab.to));
            }) }) }));
}
