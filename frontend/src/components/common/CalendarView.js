import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, isPast, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
export default function CalendarView({ lessons, onLessonPress, onCancelLesson, onRescheduleLesson }) {
    const [current, setCurrent] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(new Date());
    const monthStart = startOfMonth(current);
    const monthEnd = endOfMonth(current);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const weeks = [];
    let day = gridStart;
    while (day <= gridEnd) {
        const week = [];
        for (let i = 0; i < 7; i++) {
            week.push(day);
            day = addDays(day, 1);
        }
        weeks.push(week);
    }
    const lessonsByDay = new Map();
    for (const l of lessons) {
        const key = format(new Date(l.datetime), 'yyyy-MM-dd');
        if (!lessonsByDay.has(key))
            lessonsByDay.set(key, []);
        lessonsByDay.get(key).push(l);
    }
    const selectedKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
    const selectedLessons = (selectedKey ? (lessonsByDay.get(selectedKey) ?? []) : [])
        .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
    // Режим студента — если в уроках есть поле attended
    const isStudentMode = lessons.some((l) => 'attended' in l);
    return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("button", { onClick: () => setCurrent(subMonths(current, 1)), className: "w-8 h-8 rounded-xl bg-card flex items-center justify-center shadow-card hover:shadow-float active:scale-95", children: _jsx(ChevronLeft, { size: 16, className: "text-muted" }) }), _jsx("p", { className: "font-heading uppercase tracking-wide text-dark text-sm", children: format(current, 'LLLL yyyy', { locale: ru }) }), _jsx("button", { onClick: () => setCurrent(addMonths(current, 1)), className: "w-8 h-8 rounded-xl bg-card flex items-center justify-center shadow-card hover:shadow-float active:scale-95", children: _jsx(ChevronRight, { size: 16, className: "text-muted" }) })] }), _jsx("div", { className: "grid grid-cols-7 text-center", children: DAY_LABELS.map((d) => (_jsx("p", { className: "font-body text-[9px] uppercase tracking-widest text-muted", children: d }, d))) }), _jsx("div", { className: "flex flex-col gap-1", children: weeks.map((week, wi) => (_jsx("div", { className: "grid grid-cols-7 gap-1", children: week.map((d) => {
                        const key = format(d, 'yyyy-MM-dd');
                        const dayLessons = lessonsByDay.get(key) ?? [];
                        const inMonth = isSameMonth(d, current);
                        const selected = selectedDay ? isSameDay(d, selectedDay) : false;
                        const today = isToday(d);
                        const hasPast = dayLessons.some((l) => isPast(new Date(l.datetime)));
                        const hasFuture = dayLessons.some((l) => !isPast(new Date(l.datetime)));
                        // Проблемные дни (только в режиме студента)
                        const hasAbsence = isStudentMode && dayLessons.some((l) => l.attended === false && !l.isCancelled);
                        const hasMissingHw = isStudentMode && dayLessons.some((l) => l.isPast && l.hwSubmitted === false && !l.isCancelled);
                        const hasIssue = hasAbsence || hasMissingHw;
                        return (_jsxs("button", { onClick: () => setSelectedDay(d), className: `flex flex-col items-center py-1.5 rounded-xl transition-all active:scale-95
                    ${selected ? (hasIssue ? 'bg-red-500' : 'bg-primary') : today ? 'bg-primary/8' : ''}
                    ${!inMonth ? 'opacity-25' : ''}
                  `, children: [_jsx("span", { className: `font-body text-sm leading-none ${selected ? 'text-white font-semibold'
                                        : today ? 'text-primary font-semibold'
                                            : hasIssue ? 'text-red-500 font-semibold'
                                                : 'text-dark'}`, children: format(d, 'd') }), dayLessons.length > 0 && (_jsxs("div", { className: "flex gap-0.5 mt-1", children: [hasPast && (_jsx("span", { className: `w-1 h-1 rounded-full ${selected ? 'bg-white/80'
                                                : hasIssue ? 'bg-red-400'
                                                    : 'bg-primary'}` })), hasFuture && (_jsx("span", { className: `w-1 h-1 rounded-full ${selected ? 'bg-white/50' : 'bg-primary/30'}` }))] }))] }, key));
                    }) }, wi))) }), selectedDay && (_jsxs("div", { children: [_jsx("p", { className: "font-body text-[11px] uppercase tracking-widest text-muted mb-2.5", children: format(selectedDay, 'EEEE, d MMMM', { locale: ru }) }), selectedLessons.length === 0 ? (_jsx("div", { className: "bg-card rounded-2xl px-4 py-6 text-center shadow-card", children: _jsx("p", { className: "font-body text-sm text-muted", children: "\u0423\u0440\u043E\u043A\u043E\u0432 \u043D\u0435\u0442" }) })) : (_jsx("div", { className: "flex flex-col gap-2", children: selectedLessons.map((l) => (_jsx(LessonCard, { lesson: l, isStudentMode: isStudentMode, onPress: () => onLessonPress(l), onCancel: onCancelLesson && !l.isCancelled ? () => onCancelLesson(l) : undefined, onReschedule: onRescheduleLesson && !l.isCancelled ? () => onRescheduleLesson(l) : undefined }, l.id))) }))] }))] }));
}
function LessonCard({ lesson, isStudentMode, onPress, onCancel, onReschedule }) {
    const past = isPast(new Date(lesson.datetime));
    const marked = lesson.isMarked;
    // Левая полоска: цвет по статусу
    let barColor = 'bg-primary/30'; // будущий
    if (past && !lesson.isCancelled) {
        if (isStudentMode) {
            const hasAbsence = lesson.attended === false;
            const hasMissingHw = lesson.hwSubmitted === false;
            if (hasAbsence || hasMissingHw)
                barColor = 'bg-red-400';
            else if (lesson.attended === null)
                barColor = 'bg-yellow-400';
            else
                barColor = 'bg-green-400';
        }
        else {
            barColor = marked ? 'bg-green-400' : 'bg-yellow-400';
        }
    }
    return (_jsxs("div", { className: "bg-card rounded-2xl shadow-card overflow-hidden", children: [_jsxs("button", { onClick: onPress, className: "w-full px-4 py-3 text-left flex items-center gap-3 hover:shadow-float active:scale-[0.98]", children: [_jsx("div", { className: `w-1 self-stretch rounded-full flex-shrink-0 ${barColor}` }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: `font-heading uppercase tracking-wide text-sm ${lesson.isCancelled ? 'line-through text-dark/30' : 'text-dark'}`, children: lesson.subject }), _jsxs("div", { className: "flex items-center gap-1 mt-0.5", children: [_jsx(Clock, { size: 10, className: "text-muted" }), _jsx("p", { className: "font-body text-[11px] text-muted", children: format(new Date(lesson.datetime), 'HH:mm') })] }), isStudentMode && past && !lesson.isCancelled && (_jsxs("div", { className: "flex flex-wrap gap-1.5 mt-1.5", children: [lesson.attended === true && _jsx(StatusBadge, { label: "\u041F\u0440\u0438\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u043B", color: "green" }), lesson.attended === false && (_jsx(StatusBadge, { label: lesson.absenceStatus === 'EXCUSED' ? 'Пропуск уважит.' : lesson.absenceStatus === 'COUNTED' ? 'Пропуск засчитан' : 'Отсутствовал', color: lesson.absenceStatus === 'EXCUSED' ? 'green' : 'red' })), lesson.attended === null && _jsx(StatusBadge, { label: "\u041F\u043E\u0441\u0435\u0449. \u043D\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u0430", color: "yellow" }), lesson.hwSubmitted === true && _jsx(StatusBadge, { label: "\u0414\u0417 \u0441\u0434\u0430\u043D\u043E", color: "green" }), lesson.hwSubmitted === false && _jsx(StatusBadge, { label: "\u0414\u0417 \u043D\u0435 \u0441\u0434\u0430\u043D\u043E", color: "red" })] }))] }), _jsxs("div", { className: "flex flex-col items-end gap-1 shrink-0", children: [lesson.isCancelled && _jsx(Tag, { label: "\u041E\u0442\u043C\u0435\u043D\u0451\u043D", color: "gray" }), lesson.isExtra && !lesson.isCancelled && _jsx(Tag, { label: "\u0414\u043E\u043F.", color: "blue" }), !isStudentMode && !lesson.isCancelled && past && (_jsx(Tag, { label: marked ? 'Отмечено' : 'Не отмечено', color: marked ? 'green' : 'yellow' })), !lesson.isCancelled && !past && _jsx(Tag, { label: "\u041F\u0440\u0435\u0434\u0441\u0442\u043E\u0438\u0442", color: "blue" })] })] }), (onCancel || onReschedule) && (_jsxs("div", { className: "flex border-t border-black/5", children: [onReschedule && (_jsx("button", { onClick: onReschedule, className: "flex-1 py-2 font-body text-xs text-primary hover:bg-primary/5 transition-colors", children: "\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438" })), onCancel && (_jsx("button", { onClick: () => { if (confirm('Отменить этот урок?'))
                            onCancel(); }, className: `flex-1 py-2 font-body text-xs text-red-500 hover:bg-red-50 transition-colors ${onReschedule ? 'border-l border-black/5' : ''}`, children: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C" }))] }))] }));
}
function StatusBadge({ label, color }) {
    const c = {
        green: 'text-green-600',
        red: 'text-red-500',
        yellow: 'text-yellow-600',
    };
    return (_jsx("span", { className: `font-body text-[10px] ${c[color]}`, children: label }));
}
function Tag({ label, color }) {
    const c = {
        gray: 'bg-bg text-muted',
        blue: 'bg-primary/10 text-primary',
        green: 'bg-green-50 text-green-600',
        yellow: 'bg-yellow-50 text-yellow-600',
        red: 'bg-red-50 text-red-500',
    };
    return _jsx("span", { className: `font-body text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-lg ${c[color]}`, children: label });
}
