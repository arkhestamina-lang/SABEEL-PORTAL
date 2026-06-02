import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { curatorApi } from '../../api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToastStore } from '../../store/toastStore';
const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
export default function ScheduleManagerPage() {
    const toast = useToastStore();
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [semesters, setSemesters] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [selectedSem, setSelectedSem] = useState(null);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [newGroup, setNewGroup] = useState({ name: '', course: 1 });
    const [showTeachers, setShowTeachers] = useState(false);
    const [newTeacher, setNewTeacher] = useState({ firstName: '', lastName: '' });
    const [showNewSem, setShowNewSem] = useState(false);
    const [newSem, setNewSem] = useState({ name: '', startDate: '', endDate: '' });
    const [newTpl, setNewTpl] = useState({ days: [], timeHour: 10, timeMinute: 0, subject: '', teacherId: '', meetingUrl: '' });
    const [newHoliday, setNewHoliday] = useState({ name: '', startDate: '', endDate: '' });
    const [showHolidayForm, setShowHolidayForm] = useState(false);
    function toggleDay(day) {
        setNewTpl((t) => ({
            ...t,
            days: t.days.includes(day) ? t.days.filter((d) => d !== day) : [...t.days, day],
        }));
    }
    const [generating, setGenerating] = useState(false);
    const [showExtraForm, setShowExtraForm] = useState(false);
    const [extraLesson, setExtraLesson] = useState({ subject: '', date: '', timeHour: 10, timeMinute: 0, teacherId: '', meetingUrl: '', note: '' });
    const [extraLessons, setExtraLessons] = useState([]);
    const [editUrlId, setEditUrlId] = useState(null);
    const [editUrlValue, setEditUrlValue] = useState('');
    const [editNoteId, setEditNoteId] = useState(null);
    const [editNoteValue, setEditNoteValue] = useState('');
    useEffect(() => {
        curatorApi.groups().then(setGroups);
        curatorApi.teachers().then(setTeachers);
    }, []);
    useEffect(() => {
        if (selectedGroup && selectedSem)
            loadExtraLessons(selectedGroup.id, selectedSem);
        else
            setExtraLessons([]);
    }, [selectedSem?.id]);
    async function addTeacher() {
        if (!newTeacher.firstName || !newTeacher.lastName)
            return;
        const t = await curatorApi.createTeacher(newTeacher.firstName, newTeacher.lastName);
        setTeachers((ts) => [...ts, t].sort((a, b) => a.lastName.localeCompare(b.lastName)));
        setNewTeacher({ firstName: '', lastName: '' });
    }
    async function removeTeacher(id) {
        await curatorApi.deleteTeacher(id);
        setTeachers((ts) => ts.filter((t) => t.id !== id));
    }
    async function createGroup() {
        try {
            const g = await curatorApi.createGroup(newGroup.name, newGroup.course);
            setGroups((gs) => [...gs, g].sort((a, b) => a.course - b.course));
            setNewGroup({ name: '', course: 1 });
            setShowNewGroup(false);
            toast.show('Группа создана', 'success');
        }
        catch (err) {
            toast.show(err.response?.data?.error || 'Ошибка создания группы');
        }
    }
    async function selectGroup(group) {
        setSelectedGroup(group);
        setSelectedSem(null);
        const s = await curatorApi.semesters(group.id);
        setSemesters(s);
    }
    async function createSemester() {
        if (!selectedGroup)
            return;
        const s = await curatorApi.createSemester(newSem.name, newSem.startDate, newSem.endDate, selectedGroup.id);
        setSemesters((ss) => [{ ...s, templates: [] }, ...ss]);
        setNewSem({ name: '', startDate: '', endDate: '' });
        setShowNewSem(false);
        setSelectedSem({ ...s, templates: [] });
    }
    async function addHoliday() {
        if (!selectedSem || !newHoliday.name || !newHoliday.startDate || !newHoliday.endDate)
            return;
        const result = await curatorApi.addHoliday(selectedSem.id, newHoliday.name, newHoliday.startDate, newHoliday.endDate);
        const updated = { ...selectedSem, holidays: [...(selectedSem.holidays ?? []), result] };
        setSelectedSem(updated);
        setSemesters((ss) => ss.map((s) => s.id === selectedSem.id ? updated : s));
        setNewHoliday({ name: '', startDate: '', endDate: '' });
        setShowHolidayForm(false);
        if (result.deletedLessons > 0) {
            alert(`Каникулы добавлены. Автоматически удалено ${result.deletedLessons} предстоящих уроков.`);
        }
    }
    async function deleteHoliday(id) {
        await curatorApi.deleteHoliday(id);
        const updated = { ...selectedSem, holidays: selectedSem.holidays.filter((h) => h.id !== id) };
        setSelectedSem(updated);
        setSemesters((ss) => ss.map((s) => s.id === selectedSem.id ? updated : s));
    }
    async function deleteTemplate(templateId) {
        await curatorApi.deleteTemplate(templateId);
        const updated = { ...selectedSem, templates: selectedSem.templates.filter((t) => t.id !== templateId) };
        setSelectedSem(updated);
        setSemesters((ss) => ss.map((s) => s.id === selectedSem.id ? updated : s));
    }
    async function addTemplate() {
        if (!selectedSem || !newTpl.subject || newTpl.days.length === 0)
            return;
        const newTemplates = await Promise.all(newTpl.days.sort().map((day) => curatorApi.addTemplate(selectedSem.id, {
            dayOfWeek: day,
            timeHour: newTpl.timeHour,
            timeMinute: newTpl.timeMinute,
            subject: newTpl.subject,
            teacherId: newTpl.teacherId ? parseInt(newTpl.teacherId) : undefined,
            meetingUrl: newTpl.meetingUrl || undefined,
        })));
        const updated = { ...selectedSem, templates: [...selectedSem.templates, ...newTemplates] };
        setSelectedSem(updated);
        setSemesters((ss) => ss.map((s) => s.id === selectedSem.id ? updated : s));
        setNewTpl({ days: [], timeHour: 10, timeMinute: 0, subject: '', teacherId: '', meetingUrl: '' });
    }
    async function generate() {
        if (!selectedSem)
            return;
        setGenerating(true);
        try {
            const { created } = await curatorApi.generateLessons(selectedSem.id);
            alert(`Создано ${created} уроков для группы «${selectedGroup?.name}»`);
        }
        catch (e) {
            alert(e.response?.data?.error || 'Ошибка генерации');
        }
        finally {
            setGenerating(false);
        }
    }
    async function loadExtraLessons(groupId, sem) {
        if (!sem)
            return;
        const all = await curatorApi.lessons(groupId);
        const start = new Date(sem.startDate).getTime();
        const end = new Date(sem.endDate).getTime();
        const inSem = all.filter((l) => new Date(l.datetime).getTime() >= start && new Date(l.datetime).getTime() <= end);
        setExtraLessons(inSem.filter((l) => l.isExtra));
    }
    async function addExtraLesson() {
        if (!selectedGroup || !extraLesson.subject || !extraLesson.date)
            return;
        const datetime = new Date(extraLesson.date);
        datetime.setHours(extraLesson.timeHour, extraLesson.timeMinute, 0, 0);
        const lesson = await curatorApi.addLesson({
            subject: extraLesson.subject,
            datetime: datetime.toISOString(),
            groupId: selectedGroup.id,
            teacherId: extraLesson.teacherId ? parseInt(extraLesson.teacherId) : undefined,
            meetingUrl: extraLesson.meetingUrl.trim() || undefined,
            note: extraLesson.note || undefined,
        });
        setExtraLessons((ls) => [...ls, lesson].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()));
        setExtraLesson({ subject: '', date: '', timeHour: 10, timeMinute: 0, teacherId: '', meetingUrl: '', note: '' });
        setShowExtraForm(false);
    }
    async function deleteExtraLesson(id) {
        await curatorApi.deleteLesson(id);
        setExtraLessons((ls) => ls.filter((l) => l.id !== id));
    }
    async function saveExtraUrl(id) {
        const updated = await curatorApi.updateLesson(id, { meetingUrl: editUrlValue.trim() || null });
        setExtraLessons((ls) => ls.map((l) => l.id === id ? { ...l, meetingUrl: updated.meetingUrl } : l));
        setEditUrlId(null);
        setEditUrlValue('');
    }
    async function saveExtraNote(id) {
        const updated = await curatorApi.updateLesson(id, { note: editNoteValue.trim() || null });
        setExtraLessons((ls) => ls.map((l) => l.id === id ? { ...l, note: updated.note } : l));
        setEditNoteId(null);
        setEditNoteValue('');
    }
    // Экран шаблона семестра
    if (selectedSem) {
        return (_jsxs("div", { className: "px-4 pt-8 pb-4 flex flex-col gap-4", children: [_jsx("button", { onClick: () => setSelectedSem(null), className: "text-primary text-sm font-body", children: "\u2190 \u041D\u0430\u0437\u0430\u0434 \u043A \u0441\u0435\u043C\u0435\u0441\u0442\u0440\u0430\u043C" }), _jsxs("div", { children: [_jsx("p", { className: "font-body text-xs text-primary font-medium", children: selectedGroup?.name }), _jsx("h1", { className: "font-heading text-xl uppercase tracking-wide text-dark", children: selectedSem.name }), _jsxs("p", { className: "font-body text-xs text-dark/50", children: [format(new Date(selectedSem.startDate), 'd MMM yyyy', { locale: ru }), " \u2014 ", format(new Date(selectedSem.endDate), 'd MMM yyyy', { locale: ru })] })] }), _jsxs("div", { className: "bg-card rounded-2xl p-4", children: [_jsx("p", { className: "font-heading uppercase tracking-wide text-sm text-dark/60 mb-3", children: "\u0428\u0430\u0431\u043B\u043E\u043D \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F" }), selectedSem.templates.length === 0
                            ? _jsx("p", { className: "font-body text-xs text-dark/40", children: "\u0414\u043E\u0431\u0430\u0432\u044C \u0443\u0440\u043E\u043A\u0438 \u043D\u0438\u0436\u0435" })
                            : (() => {
                                const byDay = {};
                                for (let i = 0; i < 7; i++)
                                    byDay[i] = [];
                                for (const t of selectedSem.templates)
                                    byDay[t.dayOfWeek].push(t);
                                for (const d of Object.values(byDay))
                                    d.sort((a, b) => a.timeHour * 60 + a.timeMinute - (b.timeHour * 60 + b.timeMinute));
                                return (_jsx("div", { className: "flex flex-col gap-0", children: DAYS.map((dayName, i) => (_jsxs("div", { className: "flex items-start gap-2 py-2 border-b border-black/5 last:border-0", children: [_jsx("span", { className: `font-body text-[10px] font-semibold w-5 pt-1 shrink-0 ${byDay[i].length > 0 ? 'text-primary' : 'text-dark/20'}`, children: dayName }), _jsx("div", { className: "flex flex-wrap gap-1.5 flex-1", children: byDay[i].length === 0
                                                    ? _jsx("span", { className: "font-body text-[10px] text-dark/20", children: "\u2014" })
                                                    : byDay[i].map((t) => (_jsxs("div", { className: "flex items-center gap-1.5 bg-bg rounded-xl px-2.5 py-1.5", children: [_jsxs("div", { children: [_jsx("p", { className: "font-heading text-[10px] uppercase tracking-wide text-dark leading-tight", children: t.subject }), _jsxs("p", { className: "font-body text-[9px] text-muted", children: [String(t.timeHour).padStart(2, '0'), ":", String(t.timeMinute).padStart(2, '0')] })] }), _jsx("button", { onClick: () => deleteTemplate(t.id), className: "text-dark/20 hover:text-red-400 transition-colors text-base leading-none ml-0.5", children: "\u00D7" })] }, t.id))) })] }, i))) }));
                            })()] }), _jsxs("div", { className: "bg-card rounded-2xl p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("p", { className: "font-heading uppercase tracking-wide text-sm text-dark/60", children: "\u041A\u0430\u043D\u0438\u043A\u0443\u043B\u044B" }), _jsx("button", { onClick: () => setShowHolidayForm((v) => !v), className: "text-primary text-sm font-body", children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C" })] }), _jsx("p", { className: "font-body text-[10px] text-dark/40 mb-2", children: "\u041C\u043E\u0436\u043D\u043E \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u043B\u044E\u0431\u043E\u0439 \u043C\u043E\u043C\u0435\u043D\u0442 \u2014 \u0443\u0440\u043E\u043A\u0438 \u0432 \u044D\u0442\u043E\u0442 \u043F\u0435\u0440\u0438\u043E\u0434 \u0443\u0434\u0430\u043B\u044F\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438" }), (selectedSem.holidays ?? []).length === 0 && !showHolidayForm && (_jsx("p", { className: "font-body text-xs text-dark/40", children: "\u041A\u0430\u043D\u0438\u043A\u0443\u043B\u044B \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u044B" })), (selectedSem.holidays ?? []).map((h) => (_jsxs("div", { className: "flex items-center justify-between py-2 border-b border-black/5 last:border-0", children: [_jsxs("div", { children: [_jsx("p", { className: "font-body text-xs text-dark", children: h.name }), _jsxs("p", { className: "font-body text-[10px] text-dark/40", children: [format(new Date(h.startDate), 'd MMM', { locale: ru }), " \u2014 ", format(new Date(h.endDate), 'd MMM yyyy', { locale: ru })] })] }), _jsx("button", { onClick: () => deleteHoliday(h.id), className: "text-dark/25 hover:text-red-400 text-lg leading-none px-1 transition-colors", children: "\u00D7" })] }, h.id))), showHolidayForm && (_jsxs("div", { className: "flex flex-col gap-2 mt-3 pt-3 border-t border-black/5", children: [_jsx("input", { type: "text", placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 (\u043D\u0430\u043F\u0440. \u0417\u0438\u043C\u043D\u0438\u0435 \u043A\u0430\u043D\u0438\u043A\u0443\u043B\u044B)", value: newHoliday.name, onChange: (e) => setNewHoliday((h) => ({ ...h, name: e.target.value })), className: "w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-[10px] text-dark/40 font-body", children: "\u041D\u0430\u0447\u0430\u043B\u043E" }), _jsx("input", { type: "date", value: newHoliday.startDate, onChange: (e) => setNewHoliday((h) => ({ ...h, startDate: e.target.value })), className: "w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" })] }), _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-[10px] text-dark/40 font-body", children: "\u041A\u043E\u043D\u0435\u0446" }), _jsx("input", { type: "date", value: newHoliday.endDate, onChange: (e) => setNewHoliday((h) => ({ ...h, endDate: e.target.value })), className: "w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => { setShowHolidayForm(false); setNewHoliday({ name: '', startDate: '', endDate: '' }); }, className: "flex-1 bg-bg text-dark/60 font-heading uppercase text-xs py-2.5 rounded-xl", children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { onClick: addHoliday, disabled: !newHoliday.name || !newHoliday.startDate || !newHoliday.endDate, className: "flex-1 bg-primary text-white font-heading uppercase text-xs py-2.5 rounded-xl disabled:opacity-60", children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] })] }))] }), extraLessons.length > 0 && (_jsxs("div", { className: "bg-card rounded-2xl p-4", children: [_jsxs("p", { className: "font-heading uppercase tracking-wide text-sm text-dark/60 mb-3", children: ["\u0420\u0430\u0437\u043E\u0432\u044B\u0435 \u0443\u0440\u043E\u043A\u0438 (", extraLessons.length, ")"] }), extraLessons.map((l) => (_jsx("div", { className: `py-2.5 border-b border-black/5 last:border-0 ${l.isCancelled ? 'opacity-50' : ''}`, children: _jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: `font-heading text-sm uppercase ${l.isCancelled ? 'line-through text-dark/40' : 'text-dark'}`, children: l.subject }), l.isCancelled && _jsx("span", { className: "text-[9px] font-body bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full", children: "\u041E\u0442\u043C\u0435\u043D\u0451\u043D" })] }), _jsx("p", { className: "font-body text-[10px] text-dark/40", children: format(new Date(l.datetime), 'd MMM yyyy · HH:mm', { locale: ru }) }), editUrlId === l.id ? (_jsxs("div", { className: "flex gap-1.5 mt-1.5", children: [_jsx("input", { type: "text", value: editUrlValue, onChange: (e) => setEditUrlValue(e.target.value), placeholder: "https://...", autoFocus: true, className: "flex-1 bg-bg border border-primary/40 rounded-lg px-2 py-1 font-body text-xs focus:outline-none focus:border-primary" }), _jsx("button", { onClick: () => saveExtraUrl(l.id), className: "text-primary text-xs font-body px-2 py-1 bg-primary/10 rounded-lg", children: "\u0421\u043E\u0445\u0440." }), _jsx("button", { onClick: () => setEditUrlId(null), className: "text-dark/40 text-xs font-body px-1.5 py-1", children: "\u2715" })] })) : (_jsx("button", { onClick: () => { setEditUrlId(l.id); setEditUrlValue(l.meetingUrl ?? ''); }, className: "mt-1 font-body text-[10px] text-primary underline", children: l.meetingUrl ? '🔗 ' + l.meetingUrl.slice(0, 35) + (l.meetingUrl.length > 35 ? '...' : '') : '+ ссылка' })), editNoteId === l.id ? (_jsxs("div", { className: "flex gap-1.5 mt-1.5", children: [_jsx("input", { type: "text", value: editNoteValue, onChange: (e) => setEditNoteValue(e.target.value), placeholder: "\u0417\u0430\u043C\u0435\u0442\u043A\u0430...", autoFocus: true, className: "flex-1 bg-bg border border-primary/40 rounded-lg px-2 py-1 font-body text-xs focus:outline-none focus:border-primary" }), _jsx("button", { onClick: () => saveExtraNote(l.id), className: "text-primary text-xs font-body px-2 py-1 bg-primary/10 rounded-lg", children: "\u0421\u043E\u0445\u0440." }), _jsx("button", { onClick: () => setEditNoteId(null), className: "text-dark/40 text-xs font-body px-1.5 py-1", children: "\u2715" })] })) : (_jsx("button", { onClick: () => { setEditNoteId(l.id); setEditNoteValue(l.note ?? ''); }, className: "mt-0.5 font-body text-[10px] text-dark/40 underline", children: l.note ? `📝 ${l.note}` : '+ заметка' }))] }), _jsx("button", { onClick: () => deleteExtraLesson(l.id), className: "text-dark/20 hover:text-red-400 text-lg leading-none px-1 transition-colors shrink-0", children: "\u00D7" })] }) }, l.id)))] })), _jsxs("div", { className: "bg-card rounded-2xl overflow-hidden", children: [_jsxs("button", { onClick: () => setShowExtraForm((v) => !v), className: "w-full flex items-center justify-between px-4 py-3.5", children: [_jsx("span", { className: "font-heading uppercase tracking-wide text-sm text-dark", children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0440\u0430\u0437\u043E\u0432\u044B\u0439 \u0443\u0440\u043E\u043A" }), _jsx("span", { className: "text-primary text-sm font-body", children: showExtraForm ? '▲' : '+' })] }), showExtraForm && (_jsxs("div", { className: "border-t border-black/5 px-4 pb-4 pt-3 flex flex-col gap-3", children: [_jsx("p", { className: "font-body text-[10px] text-dark/40", children: "\u0420\u0430\u0437\u043E\u0432\u044B\u0439 \u0443\u0440\u043E\u043A \u0432\u043D\u0435 \u0448\u0430\u0431\u043B\u043E\u043D\u0430 \u2014 \u043D\u0435 \u0432\u043B\u0438\u044F\u0435\u0442 \u043D\u0430 \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx("input", { type: "text", placeholder: "\u041F\u0440\u0435\u0434\u043C\u0435\u0442", value: extraLesson.subject, onChange: (e) => setExtraLesson((l) => ({ ...l, subject: e.target.value })), className: "w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" }), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-dark/40 font-body", children: "\u0414\u0430\u0442\u0430" }), _jsx("input", { type: "date", value: extraLesson.date, onChange: (e) => setExtraLesson((l) => ({ ...l, date: e.target.value })), className: "w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" })] }), _jsxs("div", { className: "flex gap-2 items-center", children: [_jsx("input", { type: "number", min: 0, max: 23, value: extraLesson.timeHour, onChange: (e) => setExtraLesson((l) => ({ ...l, timeHour: +e.target.value })), className: "w-14 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm text-center focus:outline-none focus:border-primary" }), _jsx("span", { className: "text-dark/40 font-body", children: ":" }), _jsx("input", { type: "number", min: 0, max: 59, step: 5, value: extraLesson.timeMinute, onChange: (e) => setExtraLesson((l) => ({ ...l, timeMinute: +e.target.value })), className: "w-14 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm text-center focus:outline-none focus:border-primary" })] }), _jsxs("select", { value: extraLesson.teacherId, onChange: (e) => setExtraLesson((l) => ({ ...l, teacherId: e.target.value })), className: "w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary", children: [_jsx("option", { value: "", children: "\u0423\u0447\u0438\u0442\u0435\u043B\u044C (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)" }), teachers.map((t) => _jsxs("option", { value: t.id, children: [t.lastName, " ", t.firstName] }, t.id))] }), _jsx("input", { type: "text", placeholder: "\u0421\u0441\u044B\u043B\u043A\u0430 Zoom / Meet (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)", value: extraLesson.meetingUrl, onChange: (e) => setExtraLesson((l) => ({ ...l, meetingUrl: e.target.value })), className: "w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" }), _jsx("input", { type: "text", placeholder: "\u0417\u0430\u043C\u0435\u0442\u043A\u0430 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)", value: extraLesson.note, onChange: (e) => setExtraLesson((l) => ({ ...l, note: e.target.value })), className: "w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setShowExtraForm(false), className: "flex-1 bg-bg text-dark/60 font-heading uppercase text-xs py-2.5 rounded-xl", children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { onClick: addExtraLesson, disabled: !extraLesson.subject || !extraLesson.date, className: "flex-1 bg-primary text-white font-heading uppercase text-xs py-2.5 rounded-xl disabled:opacity-60", children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C" })] })] }))] }), _jsxs("div", { className: "bg-card rounded-2xl p-4 flex flex-col gap-3", children: [_jsx("p", { className: "font-heading uppercase tracking-wide text-sm text-dark/60", children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0448\u0430\u0431\u043B\u043E\u043D \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F" }), _jsxs("div", { children: [_jsxs("p", { className: "font-body text-[10px] text-muted uppercase tracking-widest mb-2", children: ["\u0414\u043D\u0438 \u043D\u0435\u0434\u0435\u043B\u0438 ", newTpl.days.length > 0 && _jsxs("span", { className: "text-primary", children: ["\u00B7 \u0432\u044B\u0431\u0440\u0430\u043D\u043E ", newTpl.days.length] })] }), _jsx("div", { className: "flex gap-1.5", children: DAYS.map((d, i) => (_jsx("button", { type: "button", onClick: () => toggleDay(i), className: `flex-1 py-2 rounded-xl font-body text-xs font-medium transition-all active:scale-95 ${newTpl.days.includes(i)
                                            ? 'bg-primary text-white'
                                            : 'bg-bg text-muted hover:bg-primary/10'}`, children: d }, i))) })] }), _jsxs("div", { className: "flex gap-2 items-center", children: [_jsx("input", { type: "number", min: 0, max: 23, value: newTpl.timeHour, onChange: (e) => setNewTpl((t) => ({ ...t, timeHour: +e.target.value })), className: "w-14 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm text-center focus:outline-none focus:border-primary" }), _jsx("span", { className: "text-dark/40 font-body", children: ":" }), _jsx("input", { type: "number", min: 0, max: 59, step: 5, value: newTpl.timeMinute, onChange: (e) => setNewTpl((t) => ({ ...t, timeMinute: +e.target.value })), className: "w-14 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm text-center focus:outline-none focus:border-primary" })] }), _jsx("input", { type: "text", placeholder: "\u041F\u0440\u0435\u0434\u043C\u0435\u0442 (\u043D\u0430\u043F\u0440. \u0413\u0440\u0430\u043C\u043C\u0430\u0442\u0438\u043A\u0430)", value: newTpl.subject, onChange: (e) => setNewTpl((t) => ({ ...t, subject: e.target.value })), className: "w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" }), _jsxs("select", { value: newTpl.teacherId, onChange: (e) => setNewTpl((t) => ({ ...t, teacherId: e.target.value })), className: "w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary", children: [_jsx("option", { value: "", children: "\u0423\u0447\u0438\u0442\u0435\u043B\u044C (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)" }), teachers.map((t) => _jsxs("option", { value: t.id, children: [t.lastName, " ", t.firstName] }, t.id))] }), _jsx("input", { type: "text", placeholder: "\u0421\u0441\u044B\u043B\u043A\u0430 Zoom / Meet (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)", value: newTpl.meetingUrl, onChange: (e) => setNewTpl((t) => ({ ...t, meetingUrl: e.target.value })), className: "w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" }), _jsx("button", { onClick: addTemplate, disabled: !newTpl.subject || newTpl.days.length === 0, className: "w-full bg-primary text-white font-heading uppercase text-xs py-3 rounded-xl disabled:opacity-60 active:scale-[0.98]", children: newTpl.days.length > 1
                                ? `Добавить ${newTpl.days.length} урока в шаблон`
                                : 'Добавить в шаблон' })] }), selectedSem.templates.length > 0 && (_jsx("button", { onClick: generate, disabled: generating, className: "w-full bg-dark text-white font-heading uppercase tracking-wider py-3.5 rounded-xl text-sm disabled:opacity-60", children: generating ? 'Генерируем...' : `Сгенерировать уроки на весь семестр` }))] }));
    }
    // Экран семестров выбранной группы
    if (selectedGroup) {
        return (_jsxs("div", { className: "px-4 pt-8 pb-4 flex flex-col gap-4", children: [_jsx("button", { onClick: () => setSelectedGroup(null), className: "text-primary text-sm font-body", children: "\u2190 \u0412\u0441\u0435 \u0433\u0440\u0443\u043F\u043F\u044B" }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "font-heading text-xl uppercase tracking-wide text-dark", children: selectedGroup.name }), _jsxs("p", { className: "font-body text-xs text-dark/50", children: [selectedGroup.course, " \u043A\u0443\u0440\u0441"] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: () => setShowNewSem(!showNewSem), className: "text-primary text-sm font-body", children: "+ \u0421\u0435\u043C\u0435\u0441\u0442\u0440" }), _jsx("button", { onClick: async () => {
                                        if (!confirm(`Удалить группу «${selectedGroup.name}»? Все уроки, семестры и экзамены группы будут удалены. Студенты останутся, но будут откреплены от группы.`))
                                            return;
                                        await curatorApi.deleteGroup(selectedGroup.id);
                                        setGroups((gs) => gs.filter((g) => g.id !== selectedGroup.id));
                                        setSelectedGroup(null);
                                    }, className: "text-red-400 text-sm font-body hover:text-red-600 transition-colors", children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" })] })] }), showNewSem && (_jsxs("div", { className: "bg-card rounded-2xl p-4 flex flex-col gap-3", children: [_jsx("p", { className: "font-heading uppercase tracking-wide text-sm text-dark/60", children: "\u041D\u043E\u0432\u044B\u0439 \u0441\u0435\u043C\u0435\u0441\u0442\u0440" }), _jsx("input", { type: "text", placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 (\u043D\u0430\u043F\u0440. \u0421\u0435\u043C\u0435\u0441\u0442\u0440 1, 2025)", value: newSem.name, onChange: (e) => setNewSem((s) => ({ ...s, name: e.target.value })), className: "w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-[10px] text-dark/40 font-body", children: "\u041D\u0430\u0447\u0430\u043B\u043E" }), _jsx("input", { type: "date", value: newSem.startDate, onChange: (e) => setNewSem((s) => ({ ...s, startDate: e.target.value })), className: "w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" })] }), _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-[10px] text-dark/40 font-body", children: "\u041A\u043E\u043D\u0435\u0446" }), _jsx("input", { type: "date", value: newSem.endDate, onChange: (e) => setNewSem((s) => ({ ...s, endDate: e.target.value })), className: "w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setShowNewSem(false), className: "flex-1 bg-bg text-dark/60 font-heading uppercase text-xs py-3 rounded-xl", children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { onClick: createSemester, disabled: !newSem.name || !newSem.startDate || !newSem.endDate, className: "flex-1 bg-primary text-white font-heading uppercase text-xs py-3 rounded-xl disabled:opacity-60", children: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C" })] })] })), semesters.length === 0 && !showNewSem && (_jsx("div", { className: "flex items-center justify-center h-40", children: _jsx("p", { className: "text-dark/40 font-body text-sm", children: "\u041D\u0435\u0442 \u0441\u0435\u043C\u0435\u0441\u0442\u0440\u043E\u0432. \u0421\u043E\u0437\u0434\u0430\u0439 \u043F\u0435\u0440\u0432\u044B\u0439." }) })), semesters.map((s) => (_jsxs("button", { onClick: () => setSelectedSem(s), className: "bg-card rounded-2xl p-4 text-left", children: [_jsx("p", { className: "font-heading uppercase tracking-wide text-dark", children: s.name }), _jsxs("p", { className: "font-body text-xs text-dark/50 mt-1", children: [format(new Date(s.startDate), 'd MMM yyyy', { locale: ru }), " \u2014 ", format(new Date(s.endDate), 'd MMM yyyy', { locale: ru })] }), _jsxs("p", { className: "font-body text-xs text-primary mt-1", children: [s.templates.length, " \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u043E\u0432 \u0432 \u0448\u0430\u0431\u043B\u043E\u043D\u0435"] })] }, s.id)))] }));
    }
    // Главный экран — список всех групп
    return (_jsxs("div", { className: "px-4 pt-8 pb-4 flex flex-col gap-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "font-heading text-2xl uppercase tracking-wide text-dark", children: "\u0420\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx("button", { onClick: () => setShowNewGroup(!showNewGroup), className: "text-primary text-sm font-body", children: "+ \u0413\u0440\u0443\u043F\u043F\u0430" })] }), showNewGroup && (_jsxs("div", { className: "bg-card rounded-2xl p-4 flex flex-col gap-3", children: [_jsx("p", { className: "font-heading uppercase tracking-wide text-sm text-dark/60", children: "\u041D\u043E\u0432\u0430\u044F \u0433\u0440\u0443\u043F\u043F\u0430" }), _jsx("input", { type: "text", placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 (\u043D\u0430\u043F\u0440. \u0413\u0440\u0443\u043F\u043F\u0430 2-\u0411)", value: newGroup.name, onChange: (e) => setNewGroup((g) => ({ ...g, name: e.target.value })), className: "w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" }), _jsx("select", { value: newGroup.course, onChange: (e) => setNewGroup((g) => ({ ...g, course: +e.target.value })), className: "w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary", children: [1, 2, 3, 4].map((c) => _jsxs("option", { value: c, children: [c, " \u043A\u0443\u0440\u0441"] }, c)) }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setShowNewGroup(false), className: "flex-1 bg-bg text-dark/60 font-heading uppercase text-xs py-3 rounded-xl", children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { onClick: createGroup, disabled: !newGroup.name, className: "flex-1 bg-primary text-white font-heading uppercase text-xs py-3 rounded-xl disabled:opacity-60", children: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C" })] })] })), _jsxs("div", { className: "bg-card rounded-2xl overflow-hidden", children: [_jsxs("button", { onClick: () => setShowTeachers((v) => !v), className: "w-full flex items-center justify-between px-4 py-3", children: [_jsx("span", { className: "font-heading uppercase tracking-wide text-sm text-dark", children: "\u0423\u0447\u0438\u0442\u0435\u043B\u044F" }), _jsx("span", { className: "text-dark/40 font-body text-sm", children: showTeachers ? '▲' : `${teachers.length} чел. ▼` })] }), showTeachers && (_jsxs("div", { className: "border-t border-black/5 px-4 pb-4 flex flex-col gap-2", children: [teachers.length === 0 && (_jsx("p", { className: "font-body text-xs text-dark/40 pt-3", children: "\u0421\u043F\u0438\u0441\u043E\u043A \u043F\u0443\u0441\u0442. \u0414\u043E\u0431\u0430\u0432\u044C \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u0443\u0447\u0438\u0442\u0435\u043B\u044F." })), teachers.map((t) => (_jsxs("div", { className: "flex items-center justify-between py-1.5 border-b border-black/5 last:border-0", children: [_jsxs("span", { className: "font-body text-sm text-dark", children: [t.lastName, " ", t.firstName] }), _jsx("button", { onClick: () => removeTeacher(t.id), className: "text-dark/25 hover:text-red-400 text-lg leading-none px-1 transition-colors", children: "\u00D7" })] }, t.id))), _jsxs("div", { className: "flex gap-2 pt-1", children: [_jsx("input", { type: "text", placeholder: "\u0424\u0430\u043C\u0438\u043B\u0438\u044F", value: newTeacher.lastName, onChange: (e) => setNewTeacher((v) => ({ ...v, lastName: e.target.value })), className: "flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" }), _jsx("input", { type: "text", placeholder: "\u0418\u043C\u044F", value: newTeacher.firstName, onChange: (e) => setNewTeacher((v) => ({ ...v, firstName: e.target.value })), className: "flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" }), _jsx("button", { onClick: addTeacher, disabled: !newTeacher.firstName || !newTeacher.lastName, className: "bg-primary text-white font-heading uppercase text-xs px-4 py-2 rounded-xl disabled:opacity-50 shrink-0", children: "+" })] })] }))] }), groups.length === 0 && !showNewGroup && (_jsx("div", { className: "flex items-center justify-center h-48", children: _jsx("p", { className: "text-dark/40 font-body text-sm text-center", children: "\u041D\u0435\u0442 \u0433\u0440\u0443\u043F\u043F. \u0421\u043E\u0437\u0434\u0430\u0439 \u043F\u0435\u0440\u0432\u0443\u044E \u0433\u0440\u0443\u043F\u043F\u0443." }) })), groups.map((g) => (_jsxs("button", { onClick: () => selectGroup(g), className: "bg-card rounded-2xl p-4 text-left flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-heading uppercase tracking-wide text-dark", children: g.name }), _jsxs("p", { className: "font-body text-xs text-dark/50 mt-0.5", children: [g.course, " \u043A\u0443\u0440\u0441"] })] }), _jsx("span", { className: "text-dark/30 text-lg", children: "\u203A" })] }, g.id)))] }));
}
