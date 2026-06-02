import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { studentApi } from '../../api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import PageError from '../../components/common/PageError';
const QUOTES = [
    { text: 'Кто пришёл на собрание знания без пера и бумаги — подобен тому, кто пришёл на мельницу без зерна.', source: 'Имам аш-Шафии' },
    { text: 'Знание — не обилие того, что ты выучил. Истинное знание — это богобоязненность.', source: 'Абдуллах ибн Масуд' },
    { text: 'Тот, кто считает, что изучение знания с рассвета до заката — не джихад, тот лишён разума.', source: 'Абу ад-Дарда' },
    { text: 'Богобоязненности достаточно для мудрости, а гордость знанием — признак невежества.', source: 'Масрук' },
    { text: 'Невозможно приобрести знание без усталости тела.', source: 'Яхья ибн Аби Касир' },
    { text: 'Тот, кто получил знание, которое не заставило его плакать — не получил от него никакой пользы.', source: 'Абд аль-Аля ат-Тайми' },
    { text: 'Ценность юноши — в его знании и богобоязненности. Без них — нет ему чести.', source: 'Имам аш-Шафии' },
    { text: 'Двое никогда не насытятся: ищущий знания и ищущий мирского.', source: 'Ибн Аббас' },
    { text: 'Тот, кто изучает знание ради Аллаха и ради вечной жизни — Аллах даст ему всё знание, в котором он нуждается.', source: 'Ибрахим ан-Нахаи' },
    { text: 'Верующий не берётся ни за какое дело, не узнав прежде, как правильно его совершить.', source: 'Ибн аль-Мубарак' },
    { text: 'Моя самая большая боязнь — что Аллах спросит меня о том, что я сделал со своим знанием.', source: 'Абу ад-Дарда' },
    { text: 'Знание существует для того, чтобы совершать благие дела.', source: 'Суфьян ас-Саури' },
];
export default function ProgressPage() {
    const [data, setData] = useState(null);
    const [loadError, setLoadError] = useState(false);
    const [quoteIdx, setQuoteIdx] = useState(0);
    const [now, setNow] = useState(new Date());
    const [examsOpen, setExamsOpen] = useState(false);
    function load() { setLoadError(false); studentApi.progress().then(setData).catch(() => setLoadError(true)); }
    useEffect(() => { load(); }, []);
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(t);
    }, []);
    if (loadError)
        return _jsx(PageError, { onRetry: load });
    if (!data)
        return _jsx("div", { className: "flex items-center justify-center min-h-dvh", children: _jsx("div", { className: "w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" }) });
    const { rating, rank, exams, semesterHistory = [] } = data;
    return (_jsxs("div", { className: "px-4 pt-8 pb-4 flex flex-col gap-5", children: [_jsx("h1", { className: "font-heading text-2xl uppercase tracking-wide text-dark", children: "\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441" }), _jsxs("div", { className: "bg-card rounded-2xl p-5 flex items-center gap-5", children: [_jsxs("div", { className: "relative w-24 h-24 flex-shrink-0", children: [_jsxs("svg", { viewBox: "0 0 36 36", className: "w-full h-full -rotate-90", children: [_jsx("circle", { cx: "18", cy: "18", r: "15.9", fill: "none", stroke: "#EEEBE5", strokeWidth: "3" }), _jsx("circle", { cx: "18", cy: "18", r: "15.9", fill: "none", stroke: "#4A89C8", strokeWidth: "3", strokeDasharray: `${rating.total} ${100 - rating.total}`, strokeLinecap: "round" })] }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: _jsx("span", { className: "font-heading text-2xl text-dark", children: rating.total }) })] }), _jsxs("div", { children: [_jsx("p", { className: "font-heading text-xl uppercase text-dark", children: "\u0418\u0442\u043E\u0433\u043E\u0432\u044B\u0439 \u0431\u0430\u043B\u043B" }), rank && _jsxs("p", { className: "font-body text-sm text-dark/50 mt-1", children: ["\u041C\u0435\u0441\u0442\u043E \u0432 \u0433\u0440\u0443\u043F\u043F\u0435: ", rank.position, " \u0438\u0437 ", rank.total] })] })] }), _jsxs("div", { className: "bg-card rounded-2xl p-4 flex flex-col gap-3", children: [_jsx("p", { className: "font-heading uppercase tracking-wide text-sm text-dark/60", children: "\u0420\u0430\u0437\u0431\u0438\u0432\u043A\u0430 \u0431\u0430\u043B\u043B\u043E\u0432" }), _jsx(ScoreBar, { label: "\u041F\u043E\u0441\u0435\u0449\u0430\u0435\u043C\u043E\u0441\u0442\u044C", score: rating.attendanceScore, max: 40 }), _jsx(ScoreBar, { label: "\u0414\u043E\u043C\u0430\u0448\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u044F", score: rating.homeworkScore, max: 30 }), _jsx(ScoreBar, { label: "\u041A\u043E\u0440\u0430\u043D", score: rating.quranScore, max: 20 }), _jsx(ScoreBar, { label: "\u041F\u0440\u0438\u0432\u044B\u0447\u043A\u0438", score: rating.habitsScore, max: 10 })] }), semesterHistory.length > 0 && (_jsxs("div", { className: "bg-card rounded-2xl p-4 flex flex-col gap-3", children: [_jsx("p", { className: "font-heading uppercase tracking-wide text-sm text-dark/60", children: "\u0420\u0435\u0439\u0442\u0438\u043D\u0433 \u043F\u043E \u0441\u0435\u043C\u0435\u0441\u0442\u0440\u0430\u043C" }), semesterHistory.map((s) => (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between mb-1", children: [_jsx("span", { className: "font-body text-xs text-dark/60", children: s.name }), _jsxs("span", { className: "font-heading text-sm text-dark", children: [s.total, _jsxs("span", { className: "text-dark/30 text-xs", children: ["/", s.maxTotal] })] })] }), _jsx("div", { className: "bg-bg rounded-full h-2 overflow-hidden", children: _jsx("div", { className: "h-full bg-primary rounded-full transition-all", style: { width: `${Math.min((s.total / s.maxTotal) * 100, 100)}%` } }) })] }, s.id)))] })), exams.length > 0 && (_jsxs("div", { className: "bg-card rounded-2xl overflow-hidden", children: [_jsxs("button", { onClick: () => setExamsOpen((v) => !v), className: "w-full flex items-center justify-between px-4 py-3.5", children: [_jsx("span", { className: "font-heading uppercase tracking-wide text-sm text-dark/60", children: "\u042D\u043A\u0437\u0430\u043C\u0435\u043D\u044B" }), _jsxs("span", { className: "font-body text-xs text-dark/40", children: [exams.length, " \u00B7 ", examsOpen ? '▲' : '▼'] })] }), examsOpen && (_jsx("div", { className: "border-t border-black/5 px-4 pb-3 pt-1 flex flex-col gap-2", children: exams.map((e) => {
                            const examDate = new Date(e.date);
                            let examOpen = false;
                            let examPassed = false;
                            if (e.startHour != null && e.durationMinutes != null) {
                                const start = new Date(examDate);
                                start.setHours(e.startHour, e.startMinute ?? 0, 0, 0);
                                const end = new Date(start.getTime() + e.durationMinutes * 60000);
                                examOpen = now >= start && now <= end;
                                examPassed = now > end;
                            }
                            else {
                                examPassed = now > examDate;
                            }
                            return (_jsxs("div", { className: "py-2 border-b border-black/5 last:border-0", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-body text-sm text-dark", children: e.title }), _jsxs("p", { className: "font-body text-xs text-dark/40", children: [format(examDate, 'd MMMM yyyy', { locale: ru }), e.startHour != null && ` · ${String(e.startHour).padStart(2, '0')}:${String(e.startMinute ?? 0).padStart(2, '0')}`, e.durationMinutes != null && ` · ${e.durationMinutes} мин`] })] }), e.scores[0] ? (_jsxs("p", { className: "font-heading text-lg text-primary", children: [e.scores[0].score, _jsxs("span", { className: "text-xs text-dark/40", children: ["/", e.scores[0].maxScore] })] })) : examPassed ? (_jsx("p", { className: "font-body text-xs text-dark/30", children: "\u041D\u0435\u0442 \u043E\u0446\u0435\u043D\u043A\u0438" })) : examOpen ? (_jsx("span", { className: "font-heading text-[10px] uppercase text-green-600 bg-green-100 px-2 py-0.5 rounded-full", children: "\u0418\u0434\u0451\u0442" })) : (_jsx("span", { className: "font-body text-xs text-dark/30", children: "\u0421\u043A\u043E\u0440\u043E" }))] }), e.formUrl && examOpen && (_jsx("a", { href: e.formUrl, target: "_blank", rel: "noreferrer", className: "mt-2 flex items-center justify-center gap-2 bg-primary text-white font-heading uppercase text-xs py-2.5 rounded-xl", children: "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u044D\u043A\u0437\u0430\u043C\u0435\u043D\u0443 \u2192" })), e.formUrl && !examOpen && !examPassed && e.startHour != null && (_jsxs("p", { className: "font-body text-[10px] text-dark/40 mt-1", children: ["\u0421\u0441\u044B\u043B\u043A\u0430 \u043E\u0442\u043A\u0440\u043E\u0435\u0442\u0441\u044F \u0432 ", String(e.startHour).padStart(2, '0'), ":", String(e.startMinute ?? 0).padStart(2, '0')] })), e.formUrl && examPassed && (_jsx("p", { className: "font-body text-[10px] text-dark/40 mt-1", children: "\u042D\u043A\u0437\u0430\u043C\u0435\u043D \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D" }))] }, e.id));
                        }) }))] })), _jsxs("div", { className: "bg-primary/10 rounded-2xl p-4 cursor-pointer", onClick: () => setQuoteIdx((i) => (i + 1) % QUOTES.length), children: [_jsxs("p", { className: "font-quote italic text-dark text-sm leading-relaxed", children: ["\u00AB", QUOTES[quoteIdx].text, "\u00BB"] }), _jsx("p", { className: "font-body text-xs text-dark/50 mt-2", children: QUOTES[quoteIdx].source }), _jsx("p", { className: "font-body text-[10px] text-dark/30 mt-2", children: "\u041D\u0430\u0436\u043C\u0438 \u0434\u043B\u044F \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0439 \u0446\u0438\u0442\u0430\u0442\u044B" })] })] }));
}
function ScoreBar({ label, score, max }) {
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between mb-1", children: [_jsx("span", { className: "font-body text-xs text-dark/60", children: label }), _jsxs("span", { className: "font-heading text-sm text-dark", children: [score, _jsxs("span", { className: "text-dark/30 text-xs", children: ["/", max] })] })] }), _jsx("div", { className: "bg-bg rounded-full h-2 overflow-hidden", children: _jsx("div", { className: "h-full bg-primary rounded-full transition-all", style: { width: `${(score / max) * 100}%` } }) })] }));
}
