import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { starostaApi } from '../../api';
import { format, isPast } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CheckCircle2, Circle, Star } from 'lucide-react';
export default function StarostaPage() {
    const [lessons, setLessons] = useState([]);
    const [activeLesson, setActiveLesson] = useState(null);
    const [students, setStudents] = useState([]);
    const [saving, setSaving] = useState(false);
    useEffect(() => { starostaApi.lessons().then(setLessons); }, []);
    async function openLesson(lesson) {
        setActiveLesson(lesson);
        const s = await starostaApi.lessonStudents(lesson.id);
        setStudents(s);
    }
    function toggle(studentId) {
        setStudents((ss) => ss.map((s) => s.id === studentId ? { ...s, present: !s.present } : s));
    }
    async function save() {
        if (!activeLesson)
            return;
        setSaving(true);
        await starostaApi.saveAttendance(activeLesson.id, students.map((s) => ({ studentId: s.id, present: s.present })));
        setLessons((ls) => ls.map((l) => l.id === activeLesson.id ? { ...l, isMarked: true } : l));
        setActiveLesson(null);
        setSaving(false);
    }
    // Экран отметки
    if (activeLesson) {
        const absentCount = students.filter((s) => !s.present).length;
        return (_jsxs("div", { className: "px-4 pt-8 pb-6 flex flex-col min-h-dvh", children: [_jsx("button", { onClick: () => setActiveLesson(null), className: "text-primary text-sm font-body mb-6", children: "\u2190 \u041D\u0430\u0437\u0430\u0434" }), _jsxs("div", { className: "mb-4", children: [_jsx("h1", { className: "font-heading text-xl uppercase tracking-wide text-dark", children: activeLesson.subject }), _jsx("p", { className: "font-body text-xs text-muted mt-0.5", children: format(new Date(activeLesson.datetime), 'd MMMM · HH:mm', { locale: ru }) }), _jsxs("p", { className: "font-body text-xs text-muted mt-1", children: ["\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442: ", absentCount, " \u0438\u0437 ", students.length] })] }), _jsx("div", { className: "flex flex-col gap-2 flex-1", children: students.map((s) => (_jsxs("button", { onClick: () => toggle(s.id), className: `flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all shadow-card active:scale-[0.98] ${s.present ? 'bg-card' : 'bg-red-50 border border-red-100'}`, children: [s.present
                                ? _jsx(CheckCircle2, { size: 18, className: "text-green-500 flex-shrink-0" })
                                : _jsx(Circle, { size: 18, className: "text-red-400 flex-shrink-0" }), _jsxs("span", { className: "font-body text-sm text-dark", children: [s.lastName, " ", s.firstName] }), _jsx("span", { className: `ml-auto font-body text-[11px] ${s.present ? 'text-green-500' : 'text-red-400'}`, children: s.present ? 'Присутствует' : 'Отсутствует' })] }, s.id))) }), _jsx("button", { onClick: save, disabled: saving, className: "mt-4 w-full bg-primary text-white font-heading uppercase tracking-wider py-4 rounded-2xl shadow-blue disabled:opacity-60 active:scale-[0.98]", children: saving ? 'Сохраняем...' : 'Сохранить посещаемость' })] }));
    }
    // Список уроков
    const unmarked = lessons.filter((l) => !l.isMarked && isPast(new Date(l.datetime)));
    const marked = lessons.filter((l) => l.isMarked);
    const upcoming = lessons.filter((l) => !isPast(new Date(l.datetime)));
    return (_jsxs("div", { className: "px-4 pt-8 pb-4 flex flex-col gap-5", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Star, { size: 16, className: "fill-yellow-400 text-yellow-400" }), _jsx("p", { className: "font-body text-[10px] tracking-[0.2em] uppercase text-muted", children: "\u041F\u0440\u0430\u0432\u0430 \u0441\u0442\u0430\u0440\u043E\u0441\u0442\u044B" })] }), _jsx("h1", { className: "font-heading text-2xl uppercase tracking-wide text-dark mt-1", children: "\u041F\u043E\u0441\u0435\u0449\u0430\u0435\u043C\u043E\u0441\u0442\u044C" }), _jsx("div", { className: "w-8 h-0.5 bg-primary mt-2" })] }), unmarked.length > 0 && (_jsxs("div", { children: [_jsxs("p", { className: "font-body text-[11px] uppercase tracking-widest text-muted mb-2", children: ["\u041D\u0443\u0436\u043D\u043E \u043E\u0442\u043C\u0435\u0442\u0438\u0442\u044C (", unmarked.length, ")"] }), _jsx("div", { className: "flex flex-col gap-2", children: unmarked.map((l) => _jsx(LessonCard, { lesson: l, onPress: () => openLesson(l), pending: true }, l.id)) })] })), upcoming.length > 0 && (_jsxs("div", { children: [_jsx("p", { className: "font-body text-[11px] uppercase tracking-widest text-muted mb-2", children: "\u041F\u0440\u0435\u0434\u0441\u0442\u043E\u044F\u0449\u0438\u0435" }), _jsx("div", { className: "flex flex-col gap-2", children: upcoming.slice(0, 5).map((l) => _jsx(LessonCard, { lesson: l, onPress: () => { } }, l.id)) })] })), marked.length > 0 && (_jsxs("div", { children: [_jsx("p", { className: "font-body text-[11px] uppercase tracking-widest text-muted mb-2", children: "\u041E\u0442\u043C\u0435\u0447\u0435\u043D\u043E" }), _jsx("div", { className: "flex flex-col gap-2", children: marked.slice(0, 10).map((l) => _jsx(LessonCard, { lesson: l, onPress: () => openLesson(l), done: true }, l.id)) })] })), lessons.length === 0 && (_jsx("div", { className: "flex-1 flex items-center justify-center", children: _jsx("p", { className: "font-body text-sm text-muted", children: "\u041D\u0435\u0442 \u0443\u0440\u043E\u043A\u043E\u0432" }) }))] }));
}
function LessonCard({ lesson, onPress, done, pending }) {
    return (_jsxs("button", { onClick: onPress, className: `bg-card rounded-2xl px-4 py-3.5 text-left flex items-center gap-3 shadow-card active:scale-[0.98] ${done ? 'opacity-60' : ''}`, children: [_jsx("div", { className: `w-1 self-stretch rounded-full flex-shrink-0 ${pending ? 'bg-yellow-400' : done ? 'bg-green-400' : 'bg-primary/30'}` }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-heading uppercase tracking-wide text-dark text-sm", children: lesson.subject }), _jsx("p", { className: "font-body text-[11px] text-muted mt-0.5", children: format(new Date(lesson.datetime), 'd MMMM · HH:mm', { locale: ru }) })] }), pending && _jsx("span", { className: "text-[10px] font-body bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-lg", children: "\u041E\u0442\u043C\u0435\u0442\u0438\u0442\u044C" }), done && _jsx(CheckCircle2, { size: 16, className: "text-green-500 flex-shrink-0" })] }));
}
