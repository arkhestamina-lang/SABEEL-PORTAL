import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
export default function RegisterPage() {
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', secretCode: '' });
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { setAuth } = useAuthStore();
    const navigate = useNavigate();
    function update(field, value) {
        setForm((f) => ({ ...f, [field]: value }));
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { token, user } = await authApi.register({
                role: 'CURATOR', firstName: form.firstName, lastName: form.lastName,
                email: form.email, password: form.password, secretCode: form.secretCode,
            });
            setAuth(token, user);
            navigate('/');
        }
        catch (err) {
            const errorMsg = err.response?.data?.error || err.message || 'Ошибка регистрации';
            console.error('Registration error:', err.response?.data || err);
            setError(errorMsg);
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("div", { className: "flex flex-col min-h-dvh bg-bg px-6 overflow-y-auto", children: [_jsxs("div", { className: "pt-12 pb-8", children: [_jsx("p", { className: "font-body text-[10px] tracking-[0.2em] uppercase text-muted mb-1", children: "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u043A\u0443\u0440\u0430\u0442\u043E\u0440\u0430" }), _jsx("h1", { className: "font-heading text-[28px] uppercase tracking-wide text-dark", children: "Sabeel Portal" }), _jsx("div", { className: "w-8 h-0.5 bg-primary mt-3" }), _jsx("p", { className: "font-body text-xs text-muted mt-3", children: "\u0421\u0442\u0443\u0434\u0435\u043D\u0442\u044B \u043F\u043E\u043B\u0443\u0447\u0430\u044E\u0442 \u0434\u043E\u0441\u0442\u0443\u043F \u043E\u0442 \u043A\u0443\u0440\u0430\u0442\u043E\u0440\u0430 \u2014 \u0441\u0430\u043C\u043E\u0441\u0442\u043E\u044F\u0442\u0435\u043B\u044C\u043D\u0430\u044F \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u0437\u0430\u043A\u0440\u044B\u0442\u0430." })] }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-3.5 pb-8 fade-up", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Field, { label: "\u0418\u043C\u044F", value: form.firstName, onChange: (v) => update('firstName', v) }), _jsx(Field, { label: "\u0424\u0430\u043C\u0438\u043B\u0438\u044F", value: form.lastName, onChange: (v) => update('lastName', v) })] }), _jsx(Field, { label: "\u041B\u043E\u0433\u0438\u043D", type: "text", value: form.email, onChange: (v) => update('email', v), placeholder: "curator.name" }), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "font-body text-[11px] uppercase tracking-widest text-muted", children: "\u041F\u0430\u0440\u043E\u043B\u044C" }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showPw ? 'text' : 'password', value: form.password, onChange: (e) => update('password', e.target.value), placeholder: "\u041C\u0438\u043D\u0438\u043C\u0443\u043C 6 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432", required: true, className: "w-full bg-card rounded-2xl px-4 py-3.5 font-body text-sm border border-border focus:outline-none focus:border-primary pr-12" }), _jsx("button", { type: "button", onClick: () => setShowPw(!showPw), className: "absolute right-4 top-1/2 -translate-y-1/2 text-muted", children: showPw ? _jsx(EyeOff, { size: 16 }) : _jsx(Eye, { size: 16 }) })] })] }), _jsx(Field, { label: "\u0421\u0435\u043A\u0440\u0435\u0442\u043D\u044B\u0439 \u043A\u043E\u0434", type: "password", value: form.secretCode, onChange: (v) => update('secretCode', v), placeholder: "\u0412\u044B\u0434\u0430\u0451\u0442\u0441\u044F \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u043E\u043C" }), error && _jsx("p", { className: "font-body text-[12px] text-red-500 bg-red-50 px-4 py-2.5 rounded-xl", children: error }), _jsx("button", { type: "submit", disabled: loading, className: "mt-2 w-full bg-primary text-white rounded-2xl py-4 font-heading uppercase tracking-widest text-sm shadow-blue flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-primary/90 active:scale-[0.98]", children: loading ? 'Создаём аккаунт...' : _jsxs(_Fragment, { children: [_jsx("span", { children: "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F" }), _jsx(ArrowRight, { size: 16 })] }) })] }), _jsxs("p", { className: "mt-auto pb-8 text-center font-body text-sm text-muted", children: ["\u0423\u0436\u0435 \u0435\u0441\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442? ", _jsx(Link, { to: "/login", className: "text-primary font-semibold", children: "\u0412\u043E\u0439\u0442\u0438" })] })] }));
}
function Field({ label, value, onChange, type = 'text', placeholder }) {
    return (_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "font-body text-[11px] uppercase tracking-widest text-muted", children: label }), _jsx("input", { type: type, value: value, onChange: (e) => onChange(e.target.value), placeholder: placeholder, required: true, className: "w-full bg-card rounded-2xl px-4 py-3.5 font-body text-sm border border-border focus:outline-none focus:border-primary" })] }));
}
