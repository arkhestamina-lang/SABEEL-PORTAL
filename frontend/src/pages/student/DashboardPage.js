import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { studentApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addDays, isWithinInterval, addMinutes } from 'date-fns';
import { useToastStore } from '../../store/toastStore';
import PageError from '../../components/common/PageError';
import { ru } from 'date-fns/locale';
import { useRef } from 'react';
import { Flame, BookOpen, Headphones, ChevronRight, Paperclip, RotateCcw, AlertTriangle } from 'lucide-react';
const QURAN_NORM = { 1: 7, 2: 1, 3: 2, 4: 3 };
const READING_NORM = { 1: 1, 2: 2, 3: 3, 4: 4 };
const LISTENING_NORM = { 1: 10, 2: 15, 3: 20, 4: 30 };
const QUOTES = [
    { text: 'Кто пришёл на собрание знания без пера и бумаги — подобен тому, кто пришёл на мельницу без зерна.', source: 'Имам аш-Шафии' },
    { text: 'Знание — не обилие того, что ты выучил. Истинное знание — это богобоязненность.', source: 'Абдуллах ибн Масуд' },
    { text: 'Тот, кто считает, что изучение знания с рассвета до заката — не джихад, тот лишён разума.', source: 'Абу ад-Дарда' },
    { text: 'Богобоязненности достаточно для мудрости, а гордость знанием — признак невежества.', source: 'Масрук' },
    { text: 'Невозможно приобрести знание без усталости тела.', source: 'Яхья ибн Аби Касир' },
    { text: 'Тот, кто получил знание, которое не заставило его плакать — не получил от него никакой пользы.', source: 'Абд аль-Аля ат-Тайми' },
    { text: 'Ценность юноши — в его знании и богобоязненности. Без них — нет ему чести.', source: 'Имам аш-Шафии' },
    { text: 'Двое никогда не насытятся: ищущий знания и ищущий мирского.', source: 'Ибн Аббас' },
    { text: 'Верующий не берётся ни за какое дело, не узнав прежде, как правильно его совершить.', source: 'Ибн аль-Мубарак' },
    { text: 'Моя самая большая боязнь — что Аллах спросит меня о том, что я сделал со своим знанием.', source: 'Абу ад-Дарда' },
    { text: 'Знание существует для того, чтобы совершать благие дела.', source: 'Суфьян ас-Саури' },
    { text: 'Тот, кто изучает знание ради Аллаха и ради вечной жизни — Аллах даст ему всё знание, в котором он нуждается.', source: 'Ибрахим ан-Нахаи' },
];
export default function DashboardPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loadError, setLoadError] = useState(false);
    const [quranInput, setQuranInput] = useState('');
    const [saving, setSaving] = useState(false);
    const toast = useToastStore();
    const [sheet, setSheet] = useState(null);
    const [exams, setExams] = useState([]);
    // Absence reason form
    const [absenceReason, setAbsenceReason] = useState('');
    const [absenceFiles, setAbsenceFiles] = useState([]);
    const [activeAbsenceLessonId, setActiveAbsenceLessonId] = useState(null);
    const absenceFileRef = useRef(null);
    // Debt request form
    const [debtReason, setDebtReason] = useState('');
    const [debtFiles, setDebtFiles] = useState([]); // доказательства (справки)
    const [debtHwFiles, setDebtHwFiles] = useState([]); // само домашнее задание
    const [activeDebtLessonId, setActiveDebtLessonId] = useState(null);
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const quote = QUOTES[new Date().getDay() % QUOTES.length];
    const norm = QURAN_NORM[user?.course ?? 1];
    const readingNorm = READING_NORM[user?.course ?? 1];
    const listeningNorm = LISTENING_NORM[user?.course ?? 1];
    const quranPages = data?.quranEntry?.pagesCompleted ?? 0;
    function load() {
        setLoadError(false);
        studentApi.dashboard().then(setData).catch(() => setLoadError(true));
    }
    useEffect(() => { load(); studentApi.exams().then(setExams).catch(() => { }); }, []);
    async function saveHabit(date, field, value) {
        const existing = data?.habits?.find((h) => h.date.slice(0, 10) === date) ?? {};
        const updated = { ...existing, [field]: value };
        await studentApi.saveHabits(date, updated.reading ?? false, updated.listening ?? false, updated.revision ?? false);
        if (value)
            toast.show('Да приумножит Аллах твои знания!', 'success');
        const fresh = await studentApi.dashboard();
        setData(fresh);
    }
    async function saveQuran() {
        const pages = parseInt(quranInput);
        if (isNaN(pages))
            return;
        setSaving(true);
        const ws = format(weekStart, 'yyyy-MM-dd');
        await studentApi.saveQuran(ws, pages);
        setQuranInput('');
        // Перезагружаем дашборд чтобы рейтинг обновился
        const fresh = await studentApi.dashboard();
        setData(fresh);
        setSaving(false);
    }
    async function submitAbsenceReason(lessonId) {
        if (!absenceReason.trim())
            return;
        try {
            const result = await studentApi.submitAbsence(lessonId, absenceReason);
            if (absenceFiles.length > 0) {
                await studentApi.uploadAbsenceEvidence(result.id, absenceFiles);
                setAbsenceFiles([]);
            }
            setData((d) => ({
                ...d,
                absencesDetail: d.absencesDetail.map((a) => a.lessonId === lessonId
                    ? { ...a, canSubmit: false, absenceRequest: { status: 'PENDING', reason: absenceReason } }
                    : a),
            }));
            setAbsenceReason('');
            setActiveAbsenceLessonId(null);
        }
        catch {
            toast.show('Не удалось отправить заявку. Попробуй ещё раз.');
        }
    }
    async function submitDebt(lessonId) {
        if (!debtReason.trim())
            return;
        try {
            const result = await studentApi.submitDebt(lessonId, debtReason);
            // Загружаем само ДЗ (фото работы)
            if (debtHwFiles.length > 0) {
                await studentApi.uploadHwPhotos(lessonId, debtHwFiles);
                setDebtHwFiles([]);
            }
            // Загружаем доказательства (справки, необязательно)
            if (debtFiles.length > 0) {
                await studentApi.uploadDebtEvidence(result.id, debtFiles);
                setDebtFiles([]);
            }
            setData((d) => ({
                ...d,
                hwMissesDetail: d.hwMissesDetail.map((h) => h.lessonId === lessonId
                    ? { ...h, debtRequest: { status: 'PENDING' } }
                    : h),
            }));
            setDebtReason('');
            setDebtHwFiles([]);
            setActiveDebtLessonId(null);
        }
        catch {
            toast.show('Не удалось отправить запрос. Попробуй ещё раз.');
        }
    }
    if (loadError)
        return _jsx(PageError, { onRetry: load });
    if (!data)
        return _jsx("div", { className: "flex items-center justify-center min-h-dvh", children: _jsx("div", { className: "w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" }) });
    const { rating, streak, absencesDetail = [], hwMissesDetail = [] } = data;
    return (_jsxs("div", { className: "px-4 pt-8 pb-4 flex flex-col gap-5", children: [_jsx("input", { ref: absenceFileRef, type: "file", accept: "image/*", multiple: true, className: "hidden", onChange: (e) => setAbsenceFiles(Array.from(e.target.files ?? [])) }), _jsxs("div", { className: "fade-up", children: [_jsx("p", { className: "font-body text-[10px] tracking-[0.2em] uppercase text-muted", children: "Sabeel University Portal" }), _jsx("h1", { className: "font-heading text-3xl uppercase tracking-wide text-dark mt-1", children: user?.firstName })] }), (rating.countedAbsences >= 3 || rating.hwMisses >= 3) && (() => {
                const critical = rating.countedAbsences >= 4 || rating.hwMisses >= 4;
                const parts = [];
                if (rating.countedAbsences >= 3)
                    parts.push(`${rating.countedAbsences} пропуска из 5`);
                if (rating.hwMisses >= 3)
                    parts.push(`${rating.hwMisses} несданных ДЗ из 5`);
                return (_jsxs("div", { className: `rounded-2xl p-4 fade-up ${critical ? 'bg-red-500' : 'bg-yellow-400'}`, children: [_jsxs("p", { className: `font-heading uppercase tracking-wide text-sm mb-1 flex items-center gap-1.5 ${critical ? 'text-white' : 'text-dark'}`, children: [_jsx(AlertTriangle, { size: 14, className: "shrink-0" }), critical ? 'Угроза отчисления' : 'Предупреждение'] }), _jsxs("p", { className: `font-body text-sm leading-relaxed ${critical ? 'text-white/90' : 'text-dark/80'}`, children: ["\u0423 \u0442\u0435\u0431\u044F ", parts.join(' и '), ". \u041F\u0440\u0438 \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0438 \u043B\u0438\u043C\u0438\u0442\u0430 \u0432 5 \u0435\u0434\u0438\u043D\u0438\u0446 \u0443\u043D\u0438\u0432\u0435\u0440\u0441\u0438\u0442\u0435\u0442 \u0431\u0443\u0434\u0435\u0442 \u0432\u044B\u043D\u0443\u0436\u0434\u0435\u043D \u0442\u0435\u0431\u044F \u043E\u0442\u0447\u0438\u0441\u043B\u0438\u0442\u044C. \u0418\u0441\u043F\u0440\u0430\u0432\u044C \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u044E \u043A\u0430\u043A \u043C\u043E\u0436\u043D\u043E \u0441\u043A\u043E\u0440\u0435\u0435."] })] }));
            })(), _jsxs("div", { className: "grid grid-cols-3 gap-2.5 fade-up", children: [_jsx(StatCard, { label: "Streak", value: streak, suffix: "\u0434\u043D\u0435\u0439", icon: _jsx(Flame, { size: 16, className: "text-orange-400" }) }), _jsx("button", { onClick: () => setSheet('absences'), className: "text-left", children: _jsx(StatCard, { label: "\u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0438", value: rating.countedAbsences, suffix: "\u043B\u0438\u043C\u0438\u0442 5 \u203A", warn: rating.countedAbsences >= 4, clickable: true }) }), _jsx("button", { onClick: () => setSheet('hw'), className: "text-left", children: _jsx(StatCard, { label: "\u041D\u0435\u0441\u0434\u0430\u0447\u0438", value: rating.hwMisses, suffix: "\u043B\u0438\u043C\u0438\u0442 5 \u203A", warn: rating.hwMisses >= 4, clickable: true }) })] }), _jsxs("div", { className: "bg-card rounded-2xl p-4 shadow-card fade-up", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("p", { className: "font-body text-[11px] uppercase tracking-widest text-muted", children: "\u0420\u0435\u0439\u0442\u0438\u043D\u0433 \u043C\u0435\u0441\u044F\u0446\u0430" }), _jsxs("p", { className: "font-heading text-2xl text-dark", children: [rating.total, _jsx("span", { className: "text-sm text-muted font-body", children: "/100" })] })] }), _jsx("div", { className: "h-1.5 bg-bg rounded-full overflow-hidden", children: _jsx("div", { className: "h-full rounded-full transition-all duration-500", style: {
                                width: `${rating.total}%`,
                                background: rating.total >= 70 ? '#4A89C8' : rating.total >= 50 ? '#f59e0b' : '#ef4444'
                            } }) })] }), exams.filter((e) => !e.scores?.[0]).length > 0 && (_jsxs("div", { className: "bg-card rounded-2xl p-4 shadow-card fade-up flex flex-col gap-2", children: [_jsx("p", { className: "font-body text-[11px] uppercase tracking-widest text-muted mb-1", children: "\u041F\u0440\u0435\u0434\u0441\u0442\u043E\u044F\u0449\u0438\u0435 \u044D\u043A\u0437\u0430\u043C\u0435\u043D\u044B" }), exams.filter((e) => !e.scores?.[0]).map((e) => {
                        const examDate = new Date(e.date);
                        const start = e.startHour != null ? new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate(), e.startHour, e.startMinute ?? 0) : null;
                        const end = start && e.durationMinutes ? addMinutes(start, e.durationMinutes) : null;
                        const isActive = start && end ? isWithinInterval(new Date(), { start, end }) : false;
                        const timeStr = e.startHour != null
                            ? `${String(e.startHour).padStart(2, '0')}:${String(e.startMinute ?? 0).padStart(2, '0')}`
                            : '';
                        return (_jsxs("div", { className: "flex items-center justify-between gap-3 py-2 border-b border-black/5 last:border-0", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-body text-sm text-dark", children: e.title }), _jsxs("p", { className: "font-body text-[10px] text-muted", children: [format(examDate, 'd MMMM', { locale: ru }), timeStr ? ` · ${timeStr}` : ''] })] }), isActive ? (_jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [_jsx("span", { className: "font-heading text-[10px] uppercase text-green-600 bg-green-100 px-2 py-0.5 rounded-full", children: "\u0418\u0434\u0451\u0442" }), e.formUrl && (_jsx("a", { href: e.formUrl, target: "_blank", rel: "noreferrer", className: "bg-primary text-white font-heading uppercase text-[10px] px-3 py-1.5 rounded-xl", children: "\u0412\u043E\u0439\u0442\u0438" }))] })) : (_jsx("span", { className: "font-body text-[10px] text-muted shrink-0", children: format(examDate, 'd MMM', { locale: ru }) }))] }, e.id));
                    })] })), norm > 0 && (_jsxs("div", { className: "bg-card rounded-2xl p-4 shadow-card fade-up", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("p", { className: "font-body text-[11px] uppercase tracking-widest text-muted", children: user?.course === 1 ? 'Чтение Корана — неделя' : 'Заучивание Корана — неделя' }), _jsxs("p", { className: "font-heading text-lg text-dark", children: [quranPages, _jsxs("span", { className: "text-sm text-muted font-body", children: [" / ", norm, " \u0441\u0442\u0440."] })] })] }), _jsx("div", { className: "h-1.5 bg-bg rounded-full overflow-hidden mb-3", children: _jsx("div", { className: "h-full bg-primary rounded-full transition-all duration-500", style: { width: `${Math.min((quranPages / norm) * 100, 100)}%` } }) }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "number", min: 0, value: quranInput, onChange: (e) => setQuranInput(e.target.value), onKeyDown: (e) => e.key === 'Enter' && saveQuran(), placeholder: user?.course === 1 ? 'Страниц прочитано' : 'Страниц выучено', className: "flex-1 bg-bg border border-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-primary" }), _jsx("button", { onClick: saveQuran, disabled: saving || !quranInput, className: "bg-primary text-white font-heading uppercase text-xs px-4 rounded-xl disabled:opacity-50", children: saving ? '...' : 'OK' })] }), user?.course === 1 && (_jsx("p", { className: "font-body text-[10px] text-muted mt-2", children: "\u041D\u043E\u0440\u043C\u0430: 1 \u0441\u0442\u0440. \u0432 \u0434\u0435\u043D\u044C \u00B7 7 \u0441\u0442\u0440. \u0432 \u043D\u0435\u0434\u0435\u043B\u044E" }))] })), _jsxs("div", { className: "bg-card rounded-2xl p-4 shadow-card fade-up", children: [_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsx("p", { className: "font-body text-[11px] uppercase tracking-widest text-muted", children: "\u041F\u0440\u0438\u0432\u044B\u0447\u043A\u0438 \u043D\u0435\u0434\u0435\u043B\u0438" }), _jsx("div", { className: "text-right", children: (() => {
                                    const readingDone = weekDays.filter(d => data.habits?.find((h) => h.date.slice(0, 10) === format(d, 'yyyy-MM-dd'))?.reading).length;
                                    const listenDone = weekDays.filter(d => data.habits?.find((h) => h.date.slice(0, 10) === format(d, 'yyyy-MM-dd'))?.listening).length;
                                    const revisionDone = weekDays.filter(d => data.habits?.find((h) => h.date.slice(0, 10) === format(d, 'yyyy-MM-dd'))?.revision).length;
                                    return (_jsxs(_Fragment, { children: [_jsxs("p", { className: "font-body text-[10px] text-muted", children: [_jsx(BookOpen, { size: 9, className: "inline mr-0.5" }), readingNorm * readingDone, "/", readingNorm * 7, " \u0441\u0442\u0440."] }), _jsxs("p", { className: "font-body text-[10px] text-muted", children: [_jsx(Headphones, { size: 9, className: "inline mr-0.5" }), listeningNorm * listenDone, "/", listeningNorm * 7, " \u043C\u0438\u043D."] }), _jsxs("p", { className: "font-body text-[10px] text-muted", children: [_jsx(RotateCcw, { size: 9, className: "inline mr-0.5" }), " ", revisionDone, "/7 \u0434\u043D\u0435\u0439"] })] }));
                                })() })] }), _jsx("div", { className: "flex justify-between gap-1", children: weekDays.map((day) => {
                            const key = format(day, 'yyyy-MM-dd');
                            const entry = data.habits?.find((h) => h.date.slice(0, 10) === key);
                            const isToday = key === format(new Date(), 'yyyy-MM-dd');
                            const isFuture = day > new Date();
                            return (_jsxs("div", { className: "flex flex-col items-center gap-1.5", children: [_jsx("span", { className: `font-body text-[9px] uppercase tracking-wider ${isToday ? 'text-primary font-semibold' : 'text-muted'}`, children: format(day, 'EE', { locale: ru }).slice(0, 2) }), _jsx("button", { disabled: isFuture, onClick: () => !isFuture && saveHabit(key, 'reading', !entry?.reading), className: `w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${entry?.reading ? 'bg-primary text-white' : 'bg-bg text-muted border border-black/10'} disabled:opacity-30`, children: _jsx(BookOpen, { size: 13 }) }), _jsx("button", { disabled: isFuture, onClick: () => !isFuture && saveHabit(key, 'listening', !entry?.listening), className: `w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${entry?.listening ? 'bg-primary text-white' : 'bg-bg text-muted border border-black/10'} disabled:opacity-30`, children: _jsx(Headphones, { size: 13 }) }), _jsx("button", { disabled: isFuture, onClick: () => !isFuture && saveHabit(key, 'revision', !entry?.revision), className: `w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${entry?.revision ? 'bg-primary text-white' : 'bg-bg text-muted border border-black/10'} disabled:opacity-30`, children: _jsx(RotateCcw, { size: 13 }) })] }, key));
                        }) }), (() => {
                        const todayKey = format(new Date(), 'yyyy-MM-dd');
                        const todayEntry = data.habits?.find((h) => h.date.slice(0, 10) === todayKey);
                        const hasAny = todayEntry?.reading || todayEntry?.listening || todayEntry?.revision;
                        return !hasAny ? (_jsx("p", { className: "font-body text-[11px] text-primary/80 mt-2 text-center", children: "\u043D\u0435 \u0437\u0430\u0431\u0443\u0434\u044C \u043E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u043F\u0440\u0438\u0432\u044B\u0447\u043A\u0443 \u0441\u0435\u0433\u043E\u0434\u043D\u044F" })) : null;
                    })(), _jsxs("div", { className: "mt-3 pt-3 border-t border-border flex flex-col gap-1", children: [_jsxs("div", { className: "flex justify-between", children: [_jsxs("span", { className: "flex items-center gap-1 font-body text-[10px] text-muted", children: [_jsx(BookOpen, { size: 10 }), " \u0427\u0442\u0435\u043D\u0438\u0435 \u00B7 ", readingNorm, " \u0441\u0442\u0440/\u0434\u0435\u043D\u044C"] }), _jsxs("span", { className: "flex items-center gap-1 font-body text-[10px] text-muted", children: [_jsx(Headphones, { size: 10 }), " \u0410\u0443\u0434\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u00B7 ", listeningNorm, " \u043C\u0438\u043D/\u0434\u0435\u043D\u044C"] })] }), _jsxs("span", { className: "flex items-center gap-1 font-body text-[10px] text-muted", children: [_jsx(RotateCcw, { size: 10 }), " \u041F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0435 \u2014 \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E"] })] })] }), _jsxs("div", { className: "border border-border rounded-2xl p-4 fade-up", children: [_jsxs("p", { className: "font-quote italic text-dark text-sm leading-relaxed", children: ["\u00AB", quote.text, "\u00BB"] }), _jsx("p", { className: "font-body text-[11px] text-muted mt-2", children: quote.source })] }), sheet === 'absences' && (_jsx("div", { className: "fixed inset-0 bg-black/40 flex items-end z-50", onClick: () => setSheet(null), children: _jsxs("div", { className: "bg-card w-full max-w-[480px] mx-auto rounded-t-3xl max-h-[85vh] flex flex-col", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "px-5 pt-5 pb-3 border-b border-black/5 flex items-center justify-between shrink-0", children: [_jsx("h2", { className: "font-heading uppercase tracking-wide text-dark text-lg", children: "\u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0438" }), _jsx("button", { onClick: () => setSheet(null), className: "text-muted text-2xl leading-none", children: "\u00D7" })] }), _jsxs("div", { className: "overflow-y-auto flex-1 px-5 py-3 flex flex-col gap-3", children: [absencesDetail.length === 0 && (_jsx("p", { className: "font-body text-sm text-dark/40 text-center py-6", children: "\u041F\u0440\u043E\u043F\u0443\u0441\u043A\u043E\u0432 \u043D\u0435\u0442 \u2713" })), absencesDetail.map((a) => (_jsxs("div", { className: "bg-bg rounded-2xl p-3.5 flex flex-col gap-2", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "font-body text-sm text-dark font-medium", children: a.subject }), _jsx("p", { className: "font-body text-[11px] text-muted", children: format(new Date(a.datetime), 'd MMMM · HH:mm', { locale: ru }) })] }), a.absenceRequest && (_jsx("span", { className: `shrink-0 text-[10px] font-body px-2 py-0.5 rounded-full ${a.absenceRequest.status === 'EXCUSED' ? 'bg-green-100 text-green-700' :
                                                        a.absenceRequest.status === 'COUNTED' ? 'bg-red-100 text-red-600' :
                                                            'bg-yellow-100 text-yellow-700'}`, children: a.absenceRequest.status === 'EXCUSED' ? 'Уважит.' : a.absenceRequest.status === 'COUNTED' ? 'Засчитан' : 'Ожидает' })), !a.absenceRequest && !a.canSubmit && (_jsx("span", { className: "shrink-0 text-[10px] font-body px-2 py-0.5 rounded-full bg-red-100 text-red-600", children: "\u0421\u0440\u043E\u043A \u0438\u0441\u0442\u0451\u043A" }))] }), a.canSubmit && activeAbsenceLessonId !== a.lessonId && (_jsxs("button", { onClick: () => setActiveAbsenceLessonId(a.lessonId), className: "text-xs font-body text-primary bg-primary/10 rounded-xl px-3 py-2 text-left", children: ["\u041F\u043E\u0434\u0430\u0442\u044C \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u00B7 \u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C ", Math.floor(a.hoursLeft), "\u0447 ", Math.round((a.hoursLeft % 1) * 60), "\u043C\u0438\u043D"] })), activeAbsenceLessonId === a.lessonId && (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("textarea", { value: absenceReason, onChange: (e) => setAbsenceReason(e.target.value), placeholder: "\u041E\u043F\u0438\u0448\u0438 \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430...", rows: 2, className: "w-full bg-white border border-black/10 rounded-xl p-2.5 font-body text-sm focus:outline-none focus:border-primary resize-none" }), _jsxs("button", { type: "button", onClick: () => absenceFileRef.current?.click(), className: "flex items-center gap-2 px-3 py-2 rounded-xl border border-black/10 bg-white w-full hover:border-primary transition-colors active:scale-[0.98]", children: [_jsx(Paperclip, { size: 13, className: `shrink-0 ${absenceFiles.length > 0 ? 'text-primary' : 'text-muted'}` }), _jsx("span", { className: `font-body text-xs ${absenceFiles.length > 0 ? 'text-primary' : 'text-dark/60'}`, children: absenceFiles.length > 0 ? `${absenceFiles.length} файл(а) прикреплено` : 'Прикрепить доказательства (необязательно)' })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => { setActiveAbsenceLessonId(null); setAbsenceFiles([]); }, className: "flex-1 bg-bg text-dark/50 font-heading uppercase text-xs py-2 rounded-xl", children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { onClick: () => submitAbsenceReason(a.lessonId), disabled: !absenceReason.trim(), className: "flex-1 bg-primary text-white font-heading uppercase text-xs py-2 rounded-xl disabled:opacity-50", children: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C" })] })] }))] }, a.lessonId)))] })] }) })), sheet === 'hw' && (_jsx("div", { className: "fixed inset-0 bg-black/40 flex items-end z-50", onClick: () => setSheet(null), children: _jsxs("div", { className: "bg-card w-full max-w-[480px] mx-auto rounded-t-3xl max-h-[85vh] flex flex-col", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "px-5 pt-5 pb-3 border-b border-black/5 flex items-center justify-between shrink-0", children: [_jsx("h2", { className: "font-heading uppercase tracking-wide text-dark text-lg", children: "\u041D\u0435\u0441\u0434\u0430\u0447\u0438 \u0414\u0417" }), _jsx("button", { onClick: () => setSheet(null), className: "text-muted text-2xl leading-none", children: "\u00D7" })] }), _jsxs("div", { className: "overflow-y-auto flex-1 px-5 py-3 flex flex-col gap-3", children: [hwMissesDetail.length === 0 && (_jsx("p", { className: "font-body text-sm text-dark/40 text-center py-6", children: "\u0412\u0441\u0435 \u0434\u043E\u043C\u0430\u0448\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u044F \u0441\u0434\u0430\u043D\u044B \u2713" })), hwMissesDetail.map((h) => (_jsxs("div", { className: "bg-bg rounded-2xl p-3.5 flex flex-col gap-2", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "font-body text-sm text-dark font-medium", children: h.subject }), _jsx("p", { className: "font-body text-[11px] text-muted", children: format(new Date(h.datetime), 'd MMMM', { locale: ru }) })] }), h.deadlinePassed
                                                    ? _jsx("span", { className: "shrink-0 text-[10px] font-body px-2 py-0.5 rounded-full bg-red-100 text-red-600", children: "\u0421\u0440\u043E\u043A \u0438\u0441\u0442\u0451\u043A" })
                                                    : _jsxs("span", { className: "shrink-0 text-[10px] font-body px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700", children: ["\u0414\u043E ", format(new Date(h.nextLessonDatetime), 'd MMM', { locale: ru })] })] }), !h.deadlinePassed && (_jsxs("button", { onClick: () => { setSheet(null); navigate('/schedule', { state: { openLessonId: h.lessonId } }); }, className: "flex items-center justify-between text-xs font-body text-primary bg-primary/10 rounded-xl px-3 py-2", children: [_jsx("span", { children: "\u0421\u0434\u0430\u0442\u044C \u0434\u043E\u043C\u0430\u0448\u043D\u0435\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u0435" }), _jsx(ChevronRight, { size: 14 })] })), h.deadlinePassed && !h.debtRequest && activeDebtLessonId !== h.lessonId && (_jsx("button", { onClick: () => setActiveDebtLessonId(h.lessonId), className: "text-xs font-body text-dark/60 bg-white border border-black/10 rounded-xl px-3 py-2 text-left", children: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441 \u043D\u0430 \u0432\u043E\u0437\u043C\u0435\u0449\u0435\u043D\u0438\u0435 \u0434\u043E\u043B\u0433\u0430" })), h.deadlinePassed && activeDebtLessonId === h.lessonId && (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("textarea", { value: debtReason, onChange: (e) => setDebtReason(e.target.value), placeholder: "\u0423\u043A\u0430\u0436\u0438 \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u043D\u0435\u0441\u0434\u0430\u0447\u0438 \u0438 \u043E\u0431\u0441\u0442\u043E\u044F\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430...", rows: 2, className: "w-full bg-white border border-black/10 rounded-xl p-2.5 font-body text-sm focus:outline-none focus:border-primary resize-none" }), _jsxs("label", { className: `flex items-center gap-2 px-3 py-2 rounded-xl border w-full cursor-pointer transition-colors active:scale-[0.98] ${debtHwFiles.length > 0 ? 'border-primary bg-primary/5' : 'border-black/10 bg-white'}`, children: [_jsx(Paperclip, { size: 13, className: `shrink-0 ${debtHwFiles.length > 0 ? 'text-primary' : 'text-muted'}` }), _jsx("span", { className: `font-body text-xs ${debtHwFiles.length > 0 ? 'text-primary font-medium' : 'text-dark/60'}`, children: debtHwFiles.length > 0 ? `ДЗ: ${debtHwFiles.length} фото прикреплено` : 'Прикрепить домашнее задание' }), _jsx("input", { type: "file", accept: "image/*", multiple: true, className: "hidden", onChange: (e) => setDebtHwFiles(Array.from(e.target.files ?? [])) })] }), _jsxs("label", { className: "flex items-center gap-2 px-3 py-2 rounded-xl border border-black/10 bg-white w-full cursor-pointer transition-colors active:scale-[0.98]", children: [_jsx(Paperclip, { size: 13, className: `shrink-0 ${debtFiles.length > 0 ? 'text-primary' : 'text-muted'}` }), _jsx("span", { className: `font-body text-xs ${debtFiles.length > 0 ? 'text-primary' : 'text-dark/60'}`, children: debtFiles.length > 0 ? `Справка: ${debtFiles.length} файл(а)` : 'Прикрепить справку (необязательно)' }), _jsx("input", { type: "file", accept: "image/*,application/pdf", multiple: true, className: "hidden", onChange: (e) => setDebtFiles(Array.from(e.target.files ?? [])) })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => { setActiveDebtLessonId(null); setDebtFiles([]); setDebtHwFiles([]); }, className: "flex-1 bg-bg text-dark/50 font-heading uppercase text-xs py-2 rounded-xl", children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { onClick: () => submitDebt(h.lessonId), disabled: !debtReason.trim(), className: "flex-1 bg-primary text-white font-heading uppercase text-xs py-2 rounded-xl disabled:opacity-50", children: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C" })] })] })), h.deadlinePassed && h.debtRequest?.status === 'PENDING' && (_jsx("p", { className: "text-xs font-body text-yellow-600 bg-yellow-50 rounded-xl px-3 py-2", children: "\u0417\u0430\u043F\u0440\u043E\u0441 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u00B7 \u043E\u0436\u0438\u0434\u0430\u0435\u0442 \u0440\u0435\u0448\u0435\u043D\u0438\u044F \u043A\u0443\u0440\u0430\u0442\u043E\u0440\u0430" })), h.deadlinePassed && h.debtRequest?.status === 'REJECTED' && (_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("p", { className: "text-xs font-body text-red-500 bg-red-50 rounded-xl px-3 py-2", children: "\u0417\u0430\u043F\u0440\u043E\u0441 \u043E\u0442\u043A\u043B\u043E\u043D\u0451\u043D" }), _jsx("button", { onClick: () => setActiveDebtLessonId(h.lessonId), className: "text-xs font-body text-dark/50 underline text-left", children: "\u041F\u043E\u0434\u0430\u0442\u044C \u0441\u043D\u043E\u0432\u0430" })] }))] }, h.lessonId)))] })] }) }))] }));
}
function StatCard({ label, value, suffix, icon, warn, clickable }) {
    return (_jsxs("div", { className: `bg-card rounded-2xl p-3.5 shadow-card h-full ${warn ? 'ring-1 ring-red-200' : ''} ${clickable ? 'active:scale-95 transition-transform' : ''}`, children: [_jsxs("div", { className: "flex items-center gap-1 mb-1", children: [icon, _jsx("p", { className: "font-body text-[9px] uppercase tracking-widest text-muted", children: label })] }), _jsx("p", { className: `font-heading text-2xl leading-none ${warn ? 'text-red-500' : 'text-dark'}`, children: value }), suffix && _jsx("p", { className: "font-body text-[10px] text-muted mt-0.5", children: suffix })] }));
}
