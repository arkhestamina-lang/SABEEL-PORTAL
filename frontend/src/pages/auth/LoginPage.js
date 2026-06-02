import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { setAuth } = useAuthStore();
    const navigate = useNavigate();
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { token, user } = await authApi.login(email, password);
            setAuth(token, user);
            navigate('/');
        }
        catch (err) {
            setError(err.response?.data?.error || 'Неверный email или пароль');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("div", { className: "flex flex-col min-h-dvh bg-bg px-6", children: [_jsxs("div", { className: "pt-16 pb-12", children: [_jsx("p", { className: "font-body text-[10px] tracking-[0.2em] uppercase text-muted mb-2", children: "\u041E\u043D\u043B\u0430\u0439\u043D-\u0443\u043D\u0438\u0432\u0435\u0440\u0441\u0438\u0442\u0435\u0442" }), _jsx("h1", { className: "font-heading text-[32px] uppercase tracking-wide text-dark leading-none", children: "Sabeel" }), _jsx("div", { className: "w-8 h-0.5 bg-primary mt-3" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-4 fade-up", children: [_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "font-body text-[11px] uppercase tracking-widest text-muted", children: "\u041B\u043E\u0433\u0438\u043D" }), _jsx("input", { type: "text", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "ahmed.aliev123", required: true, autoCapitalize: "none", className: "w-full bg-card rounded-2xl px-4 py-3.5 font-body text-sm text-dark placeholder:text-muted/50 border border-border focus:outline-none focus:border-primary" })] }), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "font-body text-[11px] uppercase tracking-widest text-muted", children: "\u041F\u0430\u0440\u043E\u043B\u044C" }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showPw ? 'text' : 'password', value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", required: true, className: "w-full bg-card rounded-2xl px-4 py-3.5 font-body text-sm text-dark placeholder:text-muted/50 border border-border focus:outline-none focus:border-primary pr-12" }), _jsx("button", { type: "button", onClick: () => setShowPw(!showPw), className: "absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-dark", children: showPw ? _jsx(EyeOff, { size: 16 }) : _jsx(Eye, { size: 16 }) })] })] }), error && (_jsx("p", { className: "font-body text-[12px] text-red-500 bg-red-50 px-4 py-2.5 rounded-xl", children: error })), _jsx("button", { type: "submit", disabled: loading, className: "mt-2 w-full bg-primary text-white rounded-2xl py-4 font-heading uppercase tracking-widest text-sm shadow-blue flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-primary/90 active:scale-[0.98]", children: loading ? 'Входим...' : (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u0412\u043E\u0439\u0442\u0438" }), _jsx(ArrowRight, { size: 16 })] })) }), _jsx("button", { type: "button", onClick: () => navigate('/register'), className: "mt-4 w-full bg-white border-2 border-primary text-primary rounded-2xl py-4 font-heading uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:bg-primary/5 active:scale-[0.98]", children: "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u043A\u0443\u0440\u0430\u0442\u043E\u0440\u0430" })] })] }));
}
