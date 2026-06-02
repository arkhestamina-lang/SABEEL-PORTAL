import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { curatorApi } from '../../api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToastStore } from '../../store/toastStore';
import PageError from '../../components/common/PageError';
export default function AbsencesPage() {
    const [tab, setTab] = useState('absences');
    const [absences, setAbsences] = useState([]);
    const [debts, setDebts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [photoViewer, setPhotoViewer] = useState(null);
    const toast = useToastStore();
    function load() {
        setLoadError(false);
        setLoading(true);
        Promise.all([curatorApi.absences(), curatorApi.debtRequests()])
            .then(([a, d]) => { setAbsences(a); setDebts(d); setLoading(false); })
            .catch(() => { setLoadError(true); setLoading(false); });
    }
    useEffect(() => { load(); }, []);
    async function resolveAbsence(id, status) {
        try {
            await curatorApi.resolveAbsence(id, status);
            setAbsences((rs) => rs.filter((r) => r.id !== id));
        }
        catch {
            toast.show('Не удалось обработать заявку.');
        }
    }
    async function resolveDebt(id, status) {
        try {
            await curatorApi.resolveDebt(id, status);
            setDebts((ds) => ds.filter((d) => d.id !== id));
        }
        catch {
            toast.show('Не удалось обработать запрос.');
        }
    }
    if (loadError)
        return _jsx(PageError, { onRetry: load });
    if (loading)
        return _jsx("div", { className: "flex items-center justify-center min-h-dvh", children: _jsx("div", { className: "w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" }) });
    const total = absences.length + debts.length;
    return (_jsxs("div", { className: "px-4 pt-8 pb-4", children: [_jsx("h1", { className: "font-heading text-2xl uppercase tracking-wide text-dark mb-1", children: "\u0417\u0430\u044F\u0432\u043A\u0438" }), _jsxs("p", { className: "font-body text-xs text-dark/50 mb-4", children: ["\u041E\u0436\u0438\u0434\u0430\u044E\u0442 \u0440\u0435\u0448\u0435\u043D\u0438\u044F: ", total] }), _jsxs("div", { className: "flex gap-2 mb-5", children: [_jsx(TabBtn, { label: "\u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0438", count: absences.length, active: tab === 'absences', onClick: () => setTab('absences') }), _jsx(TabBtn, { label: "\u0414\u043E\u043B\u0433\u0438 \u043F\u043E \u0414\u0417", count: debts.length, active: tab === 'debts', onClick: () => setTab('debts') })] }), tab === 'absences' && (absences.length === 0 ? (_jsx(Empty, { text: "\u041D\u043E\u0432\u044B\u0445 \u0437\u0430\u044F\u0432\u043E\u043A \u043E \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0445 \u043D\u0435\u0442" })) : (_jsx("div", { className: "flex flex-col gap-3", children: absences.map((r) => (_jsxs("div", { className: "bg-card rounded-2xl p-4", children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsxs("div", { children: [_jsxs("p", { className: "font-heading uppercase tracking-wide text-dark text-sm", children: [r.student?.firstName, " ", r.student?.lastName] }), _jsxs("p", { className: "font-body text-xs text-dark/50", children: [r.lesson?.subject, " \u00B7 ", r.lesson && format(new Date(r.lesson.datetime), 'd MMMM', { locale: ru })] })] }), _jsx("p", { className: "font-body text-[10px] text-dark/30 shrink-0", children: format(new Date(r.submittedAt), 'd MMM HH:mm', { locale: ru }) })] }), _jsx("div", { className: "bg-bg rounded-xl px-3 py-2 mb-2", children: _jsx("p", { className: "font-body text-sm text-dark", children: r.reason }) }), r.evidence?.length > 0 && (_jsx("div", { className: "flex gap-2 mb-3 flex-wrap", children: r.evidence.map((e) => (_jsx("button", { onClick: () => setPhotoViewer(`/uploads/${e.fileName}`), className: "w-14 h-14 rounded-xl overflow-hidden border border-black/10 hover:border-primary shrink-0", children: _jsx("img", { src: `/uploads/${e.fileName}`, alt: "", className: "w-full h-full object-cover" }) }, e.id))) })), (!r.evidence || r.evidence.length === 0) && (_jsx("p", { className: "font-body text-[10px] text-dark/30 mb-3", children: "\u0411\u0435\u0437 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432" })), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => resolveAbsence(r.id, 'EXCUSED'), className: "flex-1 bg-green-100 text-green-700 font-heading uppercase text-xs py-2.5 rounded-xl", children: "\u0423\u0432\u0430\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439" }), _jsx("button", { onClick: () => resolveAbsence(r.id, 'COUNTED'), className: "flex-1 bg-red-50 text-red-500 font-heading uppercase text-xs py-2.5 rounded-xl", children: "\u0417\u0430\u0441\u0447\u0438\u0442\u0430\u0442\u044C" })] })] }, r.id))) }))), tab === 'debts' && (debts.length === 0 ? (_jsx(Empty, { text: "\u0417\u0430\u043F\u0440\u043E\u0441\u043E\u0432 \u043D\u0430 \u0432\u043E\u0437\u043C\u0435\u0449\u0435\u043D\u0438\u0435 \u0434\u043E\u043B\u0433\u0430 \u043D\u0435\u0442" })) : (_jsx("div", { className: "flex flex-col gap-3", children: debts.map((d) => (_jsxs("div", { className: "bg-card rounded-2xl p-4", children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsxs("div", { children: [_jsxs("p", { className: "font-heading uppercase tracking-wide text-dark text-sm", children: [d.student.firstName, " ", d.student.lastName] }), _jsxs("p", { className: "font-body text-xs text-dark/50", children: [d.lesson.subject, " \u00B7 ", format(new Date(d.lesson.datetime), 'd MMMM', { locale: ru })] })] }), _jsx("p", { className: "font-body text-[10px] text-dark/30 shrink-0", children: format(new Date(d.submittedAt), 'd MMM HH:mm', { locale: ru }) })] }), _jsx("div", { className: "bg-bg rounded-xl px-3 py-2 mb-2", children: _jsx("p", { className: "font-body text-sm text-dark", children: d.reason }) }), d.evidence?.length > 0 && (_jsx("div", { className: "flex gap-2 mb-3 flex-wrap", children: d.evidence.map((e) => (_jsx("button", { onClick: () => setPhotoViewer(`/uploads/${e.fileName}`), className: "w-14 h-14 rounded-xl overflow-hidden border border-black/10 hover:border-primary shrink-0", children: _jsx("img", { src: `/uploads/${e.fileName}`, alt: "", className: "w-full h-full object-cover" }) }, e.id))) })), (!d.evidence || d.evidence.length === 0) && (_jsx("p", { className: "font-body text-[10px] text-dark/30 mb-3", children: "\u0411\u0435\u0437 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432" })), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => resolveDebt(d.id, 'ACCEPTED'), className: "flex-1 bg-green-100 text-green-700 font-heading uppercase text-xs py-2.5 rounded-xl", children: "\u041F\u0440\u0438\u043D\u044F\u0442\u044C" }), _jsx("button", { onClick: () => resolveDebt(d.id, 'REJECTED'), className: "flex-1 bg-red-50 text-red-500 font-heading uppercase text-xs py-2.5 rounded-xl", children: "\u041E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C" })] })] }, d.id))) }))), photoViewer && (_jsx("div", { className: "fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4", onClick: () => setPhotoViewer(null), children: _jsxs("div", { className: "relative", onClick: (e) => e.stopPropagation(), children: [_jsx("img", { src: photoViewer, alt: "", className: "max-w-[90vw] max-h-[85vh] rounded-2xl object-contain" }), _jsx("button", { onClick: () => setPhotoViewer(null), className: "absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center text-lg", children: "\u00D7" })] }) }))] }));
}
function TabBtn({ label, count, active, onClick }) {
    return (_jsxs("button", { onClick: onClick, className: `flex items-center gap-1.5 px-4 py-2 rounded-xl font-body text-sm transition-colors ${active ? 'bg-dark text-white' : 'bg-card text-dark/60'}`, children: [label, count > 0 && (_jsx("span", { className: `text-[10px] font-heading px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`, children: count }))] }));
}
function Empty({ text }) {
    return (_jsx("div", { className: "flex items-center justify-center h-48", children: _jsx("p", { className: "text-dark/40 font-body text-sm", children: text }) }));
}
