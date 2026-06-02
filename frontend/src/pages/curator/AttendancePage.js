import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { curatorApi } from '../../api';
import { format, isPast } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import CalendarView from '../../components/common/CalendarView';
import { Settings2 } from 'lucide-react';
export default function AttendancePage() {
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [students, setStudents] = useState([]);
    const [hwStudents, setHwStudents] = useState([]);
    const [hwPhotos, setHwPhotos] = useState([]);
    const [tab, setTab] = useState('attendance');
    const [lightbox, setLightbox] = useState(null);
    const [saving, setSaving] = useState(false);
    const [rescheduleLesson, setRescheduleLesson] = useState(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleHour, setRescheduleHour] = useState(10);
    const [rescheduleMinute, setRescheduleMinute] = useState(0);
    const navigate = useNavigate();
    useEffect(() => {
        curatorApi.groups().then((gs) => {
            setGroups(gs);
            if (gs.length > 0)
                loadGroup(gs[0]);
        });
    }, []);
    async function loadGroup(group) {
        setSelectedGroup(group);
        setSelectedLesson(null);
        const all = await curatorApi.groupSchedule(group.id);
        setLessons(all);
    }
    async function openLesson(lesson) {
        setSelectedLesson(lesson);
        setTab('attendance');
        const [s, hw, photos] = await Promise.all([
            curatorApi.lessonStudents(lesson.id),
            curatorApi.hwSubmissions(lesson.id),
            curatorApi.hwPhotos(lesson.id),
        ]);
        setStudents(s);
        setHwStudents(hw);
        setHwPhotos(photos);
    }
    function toggle(studentId) {
        setStudents((ss) => ss.map((s) => s.id === studentId ? { ...s, present: !s.present } : s));
    }
    async function saveAttendance() {
        if (!selectedLesson)
            return;
        setSaving(true);
        await curatorApi.saveAttendance(selectedLesson.id, students.map((s) => ({ studentId: s.id, present: s.present })));
        setLessons((ls) => ls.map((l) => l.id === selectedLesson.id ? { ...l, isMarked: true } : l));
        setSelectedLesson(null);
        setSaving(false);
    }
    // Экран отметки урока
    if (selectedLesson) {
        const past = isPast(new Date(selectedLesson.datetime));
        const absentCount = students.filter((s) => !s.present).length;
        return (_jsxs("div", { className: "flex flex-col min-h-dvh px-4 pt-8 pb-6", children: [_jsx("button", { onClick: () => setSelectedLesson(null), className: "text-primary text-sm font-body mb-4", children: "\u2190 \u0420\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsxs("div", { className: "mb-4", children: [_jsx("p", { className: "font-body text-xs text-primary font-medium", children: selectedGroup?.name }), _jsx("h1", { className: "font-heading text-xl uppercase tracking-wide text-dark", children: selectedLesson.subject }), _jsx("p", { className: "font-body text-xs text-dark/50", children: format(new Date(selectedLesson.datetime), 'd MMMM · HH:mm', { locale: ru }) })] }), !past ? (_jsxs("div", { className: "bg-card rounded-2xl p-5 text-center", children: [_jsx("p", { className: "font-body text-sm text-dark/50", children: "\u0423\u0440\u043E\u043A \u0435\u0449\u0451 \u043D\u0435 \u043F\u0440\u043E\u0448\u0451\u043B" }), _jsx("p", { className: "font-body text-xs text-dark/30 mt-1", children: "\u041F\u043E\u0441\u0435\u0449\u0430\u0435\u043C\u043E\u0441\u0442\u044C \u043C\u043E\u0436\u043D\u043E \u043E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u043F\u043E\u0441\u043B\u0435 \u0443\u0440\u043E\u043A\u0430" })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex gap-2 mb-4", children: [_jsx("button", { onClick: () => setTab('attendance'), className: `flex-1 py-2 rounded-xl text-xs font-heading uppercase tracking-wide transition-colors ${tab === 'attendance' ? 'bg-primary text-white' : 'bg-card text-dark/50'}`, children: "\u041F\u043E\u0441\u0435\u0449\u0430\u0435\u043C\u043E\u0441\u0442\u044C" }), _jsxs("button", { onClick: () => setTab('homework'), className: `flex-1 py-2 rounded-xl text-xs font-heading uppercase tracking-wide transition-colors ${tab === 'homework' ? 'bg-primary text-white' : 'bg-card text-dark/50'}`, children: ["\u0414\u0417 (", hwStudents.filter(s => s.submitted).length, "/", hwStudents.length, ")"] })] }), tab === 'attendance' && (_jsxs(_Fragment, { children: [_jsxs("p", { className: "font-body text-xs text-dark/50 uppercase tracking-wider mb-2", children: ["\u0412\u0441\u0435\u0433\u043E: ", students.length, " \u00B7 \u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442: ", absentCount] }), _jsx("div", { className: "flex flex-col gap-2 flex-1", children: students.map((s) => (_jsxs("button", { onClick: () => toggle(s.id), className: `flex items-center justify-between px-4 py-3 rounded-2xl transition-colors ${s.present ? 'bg-card' : 'bg-red-50 border border-red-200'}`, children: [_jsxs("span", { className: "font-body text-sm text-dark", children: [s.lastName, " ", s.firstName] }), _jsx("span", { className: `font-heading text-xs uppercase ${s.present ? 'text-green-500' : 'text-red-500'}`, children: s.present ? 'Присутствует' : 'Отсутствует' })] }, s.id))) }), _jsx("button", { onClick: saveAttendance, disabled: saving, className: "mt-4 w-full bg-primary text-white font-heading uppercase tracking-wider py-3.5 rounded-xl text-sm disabled:opacity-60", children: saving ? 'Сохраняем...' : 'Сохранить' })] })), tab === 'homework' && (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("p", { className: "font-body text-xs text-dark/50 uppercase tracking-wider", children: ["\u041E\u0442\u043C\u0435\u0442\u0438\u043B\u0438: ", hwStudents.filter(s => s.submitted).length, "/", hwStudents.length] }), hwStudents.map((s) => (_jsxs("div", { className: `flex items-center justify-between px-4 py-3 rounded-2xl ${s.submitted ? 'bg-card' : 'bg-red-50 border border-red-200'}`, children: [_jsxs("span", { className: "font-body text-sm text-dark", children: [s.lastName, " ", s.firstName] }), _jsx("span", { className: `font-heading text-xs uppercase ${s.submitted ? 'text-green-500' : 'text-red-400'}`, children: s.submitted ? 'Сдал ✓' : 'Не отметил' })] }, s.id))), hwPhotos.length > 0 && (_jsxs("div", { className: "mt-1", children: [_jsxs("p", { className: "font-body text-[10px] text-dark/40 uppercase tracking-wider mb-2", children: ["\u0424\u043E\u0442\u043E \u0440\u0430\u0431\u043E\u0442 (", hwPhotos.length, ")"] }), _jsx("div", { className: "grid grid-cols-3 gap-2", children: hwPhotos.map((p) => (_jsxs("button", { onClick: () => setLightbox(p.url), className: "relative aspect-square", children: [_jsx("img", { src: p.url, alt: p.studentName, className: "w-full h-full object-cover rounded-xl" }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 bg-black/40 rounded-b-xl px-1 py-0.5", children: _jsx("p", { className: "text-white text-[8px] font-body truncate", children: p.studentName.split(' ')[0] }) })] }, p.id))) })] })), hwPhotos.length === 0 && (_jsx("p", { className: "font-body text-[10px] text-dark/30 text-center", children: "\u0424\u043E\u0442\u043E \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B" }))] })), lightbox && (_jsx("div", { className: "fixed inset-0 bg-black/90 flex items-center justify-center z-50", onClick: () => setLightbox(null), children: _jsx("img", { src: lightbox, alt: "\u0444\u043E\u0442\u043E \u0414\u0417", className: "max-w-full max-h-full object-contain rounded-xl" }) }))] }))] }));
    }
    // Главный экран — выбор группы + календарь
    return (_jsxs("div", { className: "px-4 pt-8 pb-4 flex flex-col gap-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "font-heading text-2xl uppercase tracking-wide text-dark", children: "\u0420\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsxs("button", { onClick: () => navigate('/schedule-manager'), className: "flex items-center gap-1.5 text-xs font-body text-muted bg-card px-3 py-2 rounded-xl shadow-card hover:shadow-float active:scale-95", children: [_jsx(Settings2, { size: 14 }), "\u041D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C"] })] }), groups.length > 0 && (_jsx("div", { className: "flex gap-2 overflow-x-auto pb-1 no-scrollbar", children: groups.map((g) => (_jsx("button", { onClick: () => loadGroup(g), className: `flex-shrink-0 text-xs font-body px-3 py-1.5 rounded-full transition-colors ${selectedGroup?.id === g.id ? 'bg-dark text-white' : 'bg-card text-dark/60'}`, children: g.name }, g.id))) })), groups.length === 0 && (_jsxs("div", { className: "bg-card rounded-2xl p-5 text-center", children: [_jsx("p", { className: "font-body text-sm text-dark/50", children: "\u041D\u0435\u0442 \u0433\u0440\u0443\u043F\u043F." }), _jsx("p", { className: "font-body text-xs text-dark/30 mt-1", children: "\u0421\u043E\u0437\u0434\u0430\u0439 \u0433\u0440\u0443\u043F\u043F\u0443 \u0432 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \u00AB\u0413\u0440\u0430\u0444\u0438\u043A\u00BB \u0438 \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0439 \u0443\u0440\u043E\u043A\u0438." })] })), selectedGroup && lessons.length === 0 && (_jsxs("div", { className: "bg-card rounded-2xl p-5 text-center", children: [_jsxs("p", { className: "font-body text-sm text-dark/50", children: ["\u041D\u0435\u0442 \u0443\u0440\u043E\u043A\u043E\u0432 \u0434\u043B\u044F \u0433\u0440\u0443\u043F\u043F\u044B \u00AB", selectedGroup.name, "\u00BB."] }), _jsx("p", { className: "font-body text-xs text-dark/30 mt-1", children: "\u0421\u043E\u0437\u0434\u0430\u0439 \u0441\u0435\u043C\u0435\u0441\u0442\u0440 \u0438 \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0439 \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0432 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \u00AB\u0413\u0440\u0430\u0444\u0438\u043A\u00BB." })] })), selectedGroup && lessons.length > 0 && (_jsx(CalendarView, { lessons: lessons, onLessonPress: openLesson, onCancelLesson: async (lesson) => {
                    await curatorApi.updateLesson(lesson.id, { isCancelled: true });
                    setLessons((ls) => ls.map((l) => l.id === lesson.id ? { ...l, isCancelled: true } : l));
                }, onRescheduleLesson: (lesson) => {
                    setRescheduleLesson(lesson);
                    setRescheduleDate(format(new Date(lesson.datetime), 'yyyy-MM-dd'));
                    setRescheduleHour(new Date(lesson.datetime).getHours());
                    setRescheduleMinute(new Date(lesson.datetime).getMinutes());
                } })), rescheduleLesson && (_jsx("div", { className: "fixed inset-0 bg-black/40 flex items-end z-50", onClick: () => setRescheduleLesson(null), children: _jsxs("div", { className: "bg-card w-full max-w-[480px] mx-auto rounded-t-3xl p-6", onClick: (e) => e.stopPropagation(), children: [_jsx("h2", { className: "font-heading uppercase tracking-wide text-dark text-lg mb-1", children: "\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438 \u0443\u0440\u043E\u043A" }), _jsx("p", { className: "font-body text-xs text-dark/50 mb-4", children: rescheduleLesson.subject }), _jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "font-body text-[10px] text-dark/40 uppercase tracking-wider", children: "\u041D\u043E\u0432\u0430\u044F \u0434\u0430\u0442\u0430" }), _jsx("input", { type: "date", value: rescheduleDate, onChange: (e) => setRescheduleDate(e.target.value), className: "w-full mt-1 bg-bg border border-black/10 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-primary" })] }), _jsxs("div", { children: [_jsx("label", { className: "font-body text-[10px] text-dark/40 uppercase tracking-wider", children: "\u0412\u0440\u0435\u043C\u044F" }), _jsxs("div", { className: "flex gap-2 mt-1 items-center", children: [_jsx("input", { type: "number", min: 0, max: 23, value: rescheduleHour, onChange: (e) => setRescheduleHour(+e.target.value), className: "w-16 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm text-center focus:outline-none focus:border-primary" }), _jsx("span", { className: "text-dark/40", children: ":" }), _jsx("input", { type: "number", min: 0, max: 59, step: 5, value: rescheduleMinute, onChange: (e) => setRescheduleMinute(+e.target.value), className: "w-16 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm text-center focus:outline-none focus:border-primary" })] })] })] }), _jsxs("div", { className: "flex gap-2 mt-4", children: [_jsx("button", { onClick: () => setRescheduleLesson(null), className: "flex-1 bg-bg text-dark/60 font-heading uppercase text-xs py-3 rounded-xl", children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { disabled: !rescheduleDate, onClick: async () => {
                                        const dt = new Date(rescheduleDate);
                                        dt.setHours(rescheduleHour, rescheduleMinute, 0, 0);
                                        const updated = await curatorApi.updateLesson(rescheduleLesson.id, { datetime: dt.toISOString() });
                                        setLessons((ls) => ls.map((l) => l.id === rescheduleLesson.id ? { ...l, datetime: updated.datetime } : l));
                                        setRescheduleLesson(null);
                                    }, className: "flex-1 bg-primary text-white font-heading uppercase text-xs py-3 rounded-xl disabled:opacity-60", children: "\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438" })] })] }) }))] }));
}
