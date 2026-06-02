import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { authApi } from './api';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import StudentLayout from './pages/student/StudentLayout';
import CuratorLayout from './pages/curator/CuratorLayout';
import Toast from './components/common/Toast';
export default function App() {
    const { token, user, setAuth, logout } = useAuthStore();
    useEffect(() => {
        if (token && !user) {
            authApi.me().then((u) => setAuth(token, u)).catch(logout);
        }
    }, [token]);
    if (token && !user) {
        return _jsx("div", { className: "flex items-center justify-center min-h-dvh bg-bg", children: _jsx("div", { className: "w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" }) });
    }
    return (_jsxs(BrowserRouter, { children: [_jsx(Toast, {}), _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: !token ? _jsx(LoginPage, {}) : _jsx(Navigate, { to: "/" }) }), _jsx(Route, { path: "/register", element: !token ? _jsx(RegisterPage, {}) : _jsx(Navigate, { to: "/" }) }), _jsx(Route, { path: "/*", element: !token ? _jsx(Navigate, { to: "/login" }) :
                            user?.role === 'STUDENT' ? _jsx(StudentLayout, {}) :
                                _jsx(CuratorLayout, {}) })] })] }));
}
