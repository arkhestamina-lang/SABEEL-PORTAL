import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { authApi, curatorApi } from '../../api';
import { Lock, Download } from 'lucide-react';
export default function CuratorProfilePage() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [showPwForm, setShowPwForm] = useState(false);
    const [pwForm, setPwForm] = useState({ current: '', next: '' });
    const [pwError, setPwError] = useState('');
    const [pwSaving, setPwSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    async function handleDelete() {
        await authApi.deleteAccount();
        logout();
        navigate('/login');
    }
    return (_jsxs("div", { className: "px-4 pt-8 pb-4 flex flex-col gap-4", children: [_jsx("h1", { className: "font-heading text-2xl uppercase tracking-wide text-dark", children: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C" }), _jsxs("div", { className: "bg-card rounded-2xl p-5 flex flex-col gap-3", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center", children: _jsx("span", { className: "font-heading text-2xl text-primary", children: user?.firstName?.[0] }) }), _jsxs("div", { children: [_jsxs("p", { className: "font-heading text-xl uppercase text-dark", children: [user?.firstName, " ", user?.lastName] }), _jsx("p", { className: "font-body text-sm text-dark/50", children: user?.email }), _jsx("p", { className: "font-body text-xs text-dark/40 mt-1", children: "\u041A\u0443\u0440\u0430\u0442\u043E\u0440" })] })] }), _jsxs("button", { onClick: async () => {
                    setExporting(true);
                    try {
                        const blob = await curatorApi.exportExcel();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `sabeel_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }
                    finally {
                        setExporting(false);
                    }
                }, disabled: exporting, className: "w-full bg-card rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-black/10 hover:shadow-float active:scale-[0.98] disabled:opacity-60", children: [_jsx(Download, { size: 16, className: "text-primary" }), _jsx("span", { className: "font-body text-sm text-dark", children: exporting ? 'Генерируем файл...' : 'Экспорт данных в Excel' })] }), !showPwForm ? (_jsxs("button", { onClick: () => setShowPwForm(true), className: "w-full bg-card rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-black/10 hover:shadow-float active:scale-[0.98]", children: [_jsx(Lock, { size: 16, className: "text-muted" }), _jsx("span", { className: "font-body text-sm text-dark", children: "\u0421\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u0430\u0440\u043E\u043B\u044C" })] })) : (_jsxs("div", { className: "bg-card rounded-2xl p-4 flex flex-col gap-3", children: [_jsx("p", { className: "font-heading uppercase tracking-wide text-sm text-dark", children: "\u0421\u043C\u0435\u043D\u0430 \u043F\u0430\u0440\u043E\u043B\u044F" }), _jsx("input", { type: "password", placeholder: "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u043F\u0430\u0440\u043E\u043B\u044C", value: pwForm.current, onChange: (e) => setPwForm((f) => ({ ...f, current: e.target.value })), className: "w-full bg-bg border border-black/10 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-primary" }), _jsx("input", { type: "password", placeholder: "\u041D\u043E\u0432\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C (\u043C\u0438\u043D\u0438\u043C\u0443\u043C 6 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432)", value: pwForm.next, onChange: (e) => setPwForm((f) => ({ ...f, next: e.target.value })), className: "w-full bg-bg border border-black/10 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-primary" }), pwError && _jsx("p", { className: "font-body text-xs text-red-500", children: pwError }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => { setShowPwForm(false); setPwForm({ current: '', next: '' }); setPwError(''); }, className: "flex-1 bg-bg text-dark/50 font-heading uppercase text-xs py-3 rounded-xl", children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { disabled: pwSaving || !pwForm.current || !pwForm.next, onClick: async () => {
                                    setPwError('');
                                    setPwSaving(true);
                                    try {
                                        await authApi.changePassword(pwForm.current, pwForm.next);
                                        setShowPwForm(false);
                                        setPwForm({ current: '', next: '' });
                                    }
                                    catch (e) {
                                        setPwError(e.response?.data?.error || 'Ошибка');
                                    }
                                    setPwSaving(false);
                                }, className: "flex-1 bg-primary text-white font-heading uppercase text-xs py-3 rounded-xl disabled:opacity-50", children: pwSaving ? '...' : 'Сохранить' })] })] })), _jsx("button", { onClick: () => { logout(); navigate('/login'); }, className: "w-full bg-card border border-black/10 text-dark/60 font-heading uppercase tracking-wider py-3.5 rounded-xl text-sm", children: "\u0412\u044B\u0439\u0442\u0438" }), !confirmDelete ? (_jsx("button", { onClick: () => setConfirmDelete(true), className: "w-full text-red-400 font-body text-sm py-2", children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442" })) : (_jsxs("div", { className: "bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-2", children: [_jsx("p", { className: "font-body text-sm text-dark text-center", children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u043D\u0430\u0432\u0441\u0435\u0433\u0434\u0430?" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setConfirmDelete(false), className: "flex-1 bg-bg text-dark/60 font-heading uppercase text-xs py-3 rounded-xl", children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { onClick: handleDelete, className: "flex-1 bg-red-500 text-white font-heading uppercase text-xs py-3 rounded-xl", children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" })] })] }))] }));
}
