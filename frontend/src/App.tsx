import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { authApi } from './api';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import StudentLayout from './pages/student/StudentLayout';
import TeacherLayout from './pages/teacher/TeacherLayout';
import CuratorLayout from './pages/curator/CuratorLayout';

export default function App() {
  const { token, user, setAuth, logout } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      authApi.me().then((u) => setAuth(token, u)).catch(logout);
    }
  }, [token]);

  if (token && !user) {
    return <div className="flex items-center justify-center min-h-dvh bg-bg"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/register" element={!token ? <RegisterPage /> : <Navigate to="/" />} />
        <Route
          path="/*"
          element={
            !token ? <Navigate to="/login" /> :
            user?.role === 'STUDENT' ? <StudentLayout /> :
            user?.role === 'TEACHER' ? <TeacherLayout /> :
            <CuratorLayout />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
