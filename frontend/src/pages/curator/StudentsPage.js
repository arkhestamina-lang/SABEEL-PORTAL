import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { curatorApi } from '../../api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Star, Mic } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import PageError from '../../components/common/PageError';
const TRANSLIT = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'j',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};
function translit(s) {
    return s.toLowerCase().split('').map((c) => TRANSLIT[c] ?? c).join('').replace(/[^a-z0-9]/g, '');
}
export default function StudentsPage() {
    const toast = useToastStore();
    const [loadError, setLoadError] = useState(false);
    const [students, setStudents] = useState([]);
    const [groups, setGroups] = useState([]);
    const [groupFilter, setGroupFilter] = useState(undefined);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [detail, setDetail] = useState(null);
    const [photosByLesson, setPhotosByLesson] = useState([]);
    const [photoViewer, setPhotoViewer] = useState(null);
    const [examModal, setExamModal] = useState(null);
    const [examId, setExamId] = useState('');
    const [examScore, setExamScore] = useState('');
    const [transferGroupId, setTransferGroupId] = useState('');
    const [showAddStudent, setShowAddStudent] = useState(false);
    const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '', login: '', course: '1', groupId: '' });
    const [createdCredentials, setCreatedCredentials] = useState(null);
    const [openSections, setOpenSections] = useState(new Set());
    const [attendance, setAttendance] = useState([]);
    function toggleSection(key) {
        setOpenSections((prev) => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
    }
    function load() {
        setLoadError(false);
        Promise.all([curatorApi.groups(), curatorApi.students()])
            .then(([g, s]) => { setGroups(g); setStudents(s); })
            .catch(() => setLoadError(true));
    }
    useEffect(() => { load(); }, []);
    async function changeGroup(id) {
        setGroupFilter(id);
        const s = await curatorApi.students(id);
        setStudents(s);
    }
    async function openDetail(id) {
        try {
            const [d, p] = await Promise.all([curatorApi.student(id), curatorApi.studentPhotos(id)]);
            setDetail(d);
            setPhotosByLesson(p);
            setOpenSections(new Set());
            setAttendance(d.attendanceThisMonth ?? []);
        }
        catch {
            toast.show('Не удалось загрузить карточку студента.');
        }
    }
    async function submitExamScore() {
        if (!examModal || !examId || !examScore)
            return;
        await curatorApi.saveExamScore(examModal.studentId, parseInt(examId), parseFloat(examScore));
        setExamModal(null);
        setExamId('');
        setExamScore('');
        if (detail)
            openDetail(detail.student.id);
    }
    const filtered = students.filter((s) => {
        if (filter === 'risk')
            return s.rating.countedAbsences >= 4 || s.rating.hwMisses >= 4;
        if (filter === 'close')
            return s.rating.countedAbsences === 3 || s.rating.hwMisses === 3;
        if (filter === 'best')
            return s.rating.total >= 85;
        return true;
    }).filter((s) => {
        if (!search.trim())
            return true;
        const q = search.toLowerCase();
        return `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
            `${s.lastName} ${s.firstName}`.toLowerCase().includes(q);
    }).sort((a, b) => b.rating.total - a.rating.total);
    if (loadError)
        return _jsx(PageError, { onRetry: load });
    // Детальная карточка
    if (detail) {
        const { student, rating, absences, hwMisses: hws, exams, semesterHistory = [] } = detail;
        return (_jsxs("div", { className: "px-4 pt-8 pb-4 flex flex-col gap-4", children: [_jsx("button", { onClick: () => { setDetail(null); setPhotosByLesson([]); }, className: "text-primary text-sm font-body", children: "\u2190 \u041D\u0430\u0437\u0430\u0434" }), _jsxs("div", { children: [_jsxs("h1", { className: "font-heading text-xl uppercase tracking-wide text-dark", children: [student.firstName, " ", student.lastName] }), _jsxs("p", { className: "font-body text-xs text-dark/50", children: [student.course, " \u043A\u0443\u0440\u0441"] })] }), _jsxs("div", { className: "bg-card rounded-2xl p-4 grid grid-cols-2 gap-3", children: [_jsx(Stat, { label: "\u0418\u0442\u043E\u0433\u043E (\u043C\u0435\u0441\u044F\u0446)", value: `${rating.total}/100` }), _jsx(Stat, { label: "\u041F\u043E\u0441\u0435\u0449\u0430\u0435\u043C\u043E\u0441\u0442\u044C", value: `${rating.attendanceScore}/40` }), _jsx(Stat, { label: "\u0414\u0417", value: `${rating.homeworkScore}/30` }), _jsx(Stat, { label: "\u041A\u043E\u0440\u0430\u043D", value: `${rating.quranScore}/20` }), _jsx(Stat, { label: "\u041F\u0440\u0438\u0432\u044B\u0447\u043A\u0438", value: `${rating.habitsScore}/10` }), _jsx(Stat, { label: "\u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0438", value: `${rating.countedAbsences}`, warn: rating.countedAbsences >= 4 })] }), semesterHistory.length > 0 && (_jsxs("div", { className: "bg-card rounded-2xl p-4 flex flex-col gap-2", children: [_jsx("p", { className: "font-heading uppercase tracking-wide text-sm text-dark/60 mb-1", children: "\u041F\u043E \u0441\u0435\u043C\u0435\u0441\u0442\u0440\u0430\u043C" }), semesterHistory.map((s) => (_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "font-body text-xs text-dark/60", children: s.name }), _jsxs("span", { className: "font-heading text-sm text-dark", children: [s.total, _jsxs("span", { className: "text-dark/30 text-xs", children: ["/", s.maxTotal] })] })] }, s.id)))] })), exams.length > 0 && (_jsx("button", { onClick: () => setExamModal({ studentId: student.id, exams }), className: "w-full bg-card border border-primary text-primary font-heading uppercase text-xs py-3 rounded-xl", children: "\u0411\u0430\u043B\u043B \u0437\u0430 \u044D\u043A\u0437\u0430\u043C\u0435\u043D" })), student.groupId && (() => {
                    const isStarosta = student.group?.starostaId === student.id;
                    return (_jsxs("button", { onClick: async () => {
                            await curatorApi.setStarosta(student.groupId, isStarosta ? null : student.id);
                            setDetail((d) => d ? {
                                ...d,
                                student: { ...d.student, group: { ...d.student.group, starostaId: isStarosta ? null : student.id } }
                            } : d);
                        }, className: `w-full flex items-center justify-center gap-2 py-3 rounded-xl font-heading uppercase text-xs transition-all ${isStarosta
                            ? 'bg-yellow-50 border border-yellow-200 text-yellow-600'
                            : 'bg-card border border-black/10 text-muted'}`, children: [_jsx(Star, { size: 14, className: isStarosta ? 'fill-yellow-400 text-yellow-400' : '' }), isStarosta ? 'Снять с должности старосты' : 'Назначить старостой'] }));
                })(), attendance.length > 0 && (_jsxs("div", { className: "bg-card rounded-2xl overflow-hidden", children: [_jsxs("button", { onClick: () => toggleSection('attendance'), className: "w-full flex items-center justify-between px-4 py-3.5", children: [_jsx("span", { className: "font-heading uppercase tracking-wide text-sm text-dark/60", children: "\u041F\u043E\u0441\u0435\u0449\u0430\u0435\u043C\u043E\u0441\u0442\u044C (\u043C\u0435\u0441\u044F\u0446)" }), _jsxs("span", { className: "font-body text-xs text-dark/40", children: [attendance.length, " \u0443\u0440\u043E\u043A\u043E\u0432 \u00B7 ", openSections.has('attendance') ? '▲' : '▼'] })] }), openSections.has('attendance') && (_jsxs("div", { className: "border-t border-black/5 px-4 pb-3", children: [_jsx("p", { className: "font-body text-[10px] text-dark/40 pt-2 pb-1", children: "\u041D\u0430\u0436\u043C\u0438 \u043D\u0430 \u0441\u0442\u0430\u0442\u0443\u0441 \u0447\u0442\u043E\u0431\u044B \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C" }), attendance.map((a) => (_jsxs("div", { className: "flex items-center justify-between py-2 border-b border-black/5 last:border-0", children: [_jsxs("div", { children: [_jsx("p", { className: "font-body text-xs text-dark", children: a.subject }), _jsx("p", { className: "font-body text-[10px] text-dark/40", children: format(new Date(a.datetime), 'd MMM · HH:mm', { locale: ru }) })] }), _jsx("button", { onClick: async () => {
                                                if (a.present === null)
                                                    return; // ещё не отмечено старостой
                                                const newPresent = !a.present;
                                                await curatorApi.saveAttendance(a.lessonId, [{ studentId: student.id, present: newPresent }]);
                                                setAttendance((prev) => prev.map((m) => m.lessonId === a.lessonId ? { ...m, present: newPresent } : m));
                                                // Обновляем рейтинг
                                                const refreshed = await curatorApi.student(student.id);
                                                setDetail((d) => d ? { ...d, rating: refreshed.rating } : d);
                                                toast.show(newPresent ? 'Отмечен присутствующим' : 'Отмечен отсутствующим', 'success');
                                            }, className: `text-[10px] font-body px-2.5 py-1 rounded-full transition-colors ${a.present === null
                                                ? 'bg-dark/5 text-dark/30 cursor-default'
                                                : a.present
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    : 'bg-red-100 text-red-600 hover:bg-red-200'}`, children: a.present === null ? 'не отмечен' : a.present ? 'Присутствовал' : 'Отсутствовал' })] }, a.lessonId)))] }))] })), absences.length > 0 && (_jsxs("div", { className: "bg-card rounded-2xl overflow-hidden", children: [_jsxs("button", { onClick: () => toggleSection('absences'), className: "w-full flex items-center justify-between px-4 py-3.5", children: [_jsx("span", { className: "font-heading uppercase tracking-wide text-sm text-dark/60", children: "\u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0438" }), _jsxs("span", { className: "font-body text-xs text-dark/40", children: [absences.length, " \u00B7 ", openSections.has('absences') ? '▲' : '▼'] })] }), openSections.has('absences') && (_jsx("div", { className: "border-t border-black/5 px-4 pb-3", children: absences.map((a) => (_jsxs("div", { className: "flex items-center justify-between py-2 border-b border-black/5 last:border-0", children: [_jsxs("div", { children: [_jsx("p", { className: "font-body text-xs text-dark", children: a.lesson.subject }), _jsx("p", { className: "font-body text-[10px] text-dark/40", children: format(new Date(a.lesson.datetime), 'd MMM', { locale: ru }) })] }), _jsx("span", { className: `text-[10px] font-body px-2 py-0.5 rounded-full ${a.status === 'EXCUSED' ? 'bg-green-100 text-green-700' : a.status === 'COUNTED' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`, children: a.status === 'EXCUSED' ? 'Уважит.' : a.status === 'COUNTED' ? 'Засчитан' : 'Ожидает' })] }, a.id))) }))] })), _jsxs("div", { className: "bg-card rounded-2xl overflow-hidden", children: [_jsxs("button", { onClick: () => toggleSection('hws'), className: "w-full flex items-center justify-between px-4 py-3.5", children: [_jsx("span", { className: "font-heading uppercase tracking-wide text-sm text-dark/60", children: "\u041D\u0435\u0441\u0434\u0430\u0447\u0438 \u0414\u0417" }), _jsx("span", { className: "font-body text-xs text-dark/40", children: hws.length === 0 ? '✓ все сданы' : `${hws.length} · ${openSections.has('hws') ? '▲' : '▼'}` })] }), openSections.has('hws') && hws.length > 0 && (_jsx("div", { className: "border-t border-black/5 px-4 pb-3", children: hws.map((h) => (_jsxs("div", { className: "py-2 border-b border-black/5 last:border-0", children: [_jsx("p", { className: "font-body text-xs text-dark", children: h.lesson.subject }), _jsx("p", { className: "font-body text-[10px] text-dark/40", children: format(new Date(h.lesson.datetime), 'd MMM', { locale: ru }) })] }, h.id))) }))] }), photosByLesson.length > 0 && (_jsxs("div", { className: "bg-card rounded-2xl overflow-hidden", children: [_jsxs("button", { onClick: () => toggleSection('works'), className: "w-full flex items-center justify-between px-4 py-3.5", children: [_jsx("span", { className: "font-heading uppercase tracking-wide text-sm text-dark/60", children: "\u0421\u0434\u0430\u043D\u043D\u044B\u0435 \u0440\u0430\u0431\u043E\u0442\u044B" }), _jsxs("span", { className: "font-body text-xs text-dark/40", children: [photosByLesson.length, " \u00B7 ", openSections.has('works') ? '▲' : '▼'] })] }), openSections.has('works') && (_jsx("div", { className: "border-t border-black/5 px-4 pb-3 flex flex-col gap-3 pt-3", children: photosByLesson.map((group) => (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-1.5", children: [_jsx("p", { className: "font-body text-xs text-dark", children: group.subject }), _jsx("p", { className: "font-body text-[10px] text-dark/40", children: format(new Date(group.datetime), 'd MMM', { locale: ru }) })] }), group.isOral ? (_jsxs("div", { className: "flex items-center gap-1.5 bg-green-50 rounded-xl px-3 py-2 w-fit", children: [_jsx(Mic, { size: 12, className: "text-green-600" }), _jsx("p", { className: "font-body text-xs text-green-700", children: "\u0423\u0441\u0442\u043D\u043E (\u0441\u0430\u043C\u043E\u043E\u0442\u0447\u0451\u0442)" })] })) : (_jsx("div", { className: "flex gap-2 flex-wrap", children: group.photos.map((photo) => (_jsx("button", { onClick: () => setPhotoViewer(`/uploads/${photo.fileName}`), className: "w-16 h-16 rounded-xl overflow-hidden border border-black/10 hover:border-primary transition-colors shrink-0", children: _jsx("img", { src: `/uploads/${photo.fileName}`, alt: "", className: "w-full h-full object-cover" }) }, photo.id))) }))] }, group.lessonId))) }))] })), exams.length > 0 && (_jsxs("div", { className: "bg-card rounded-2xl p-4", children: [_jsx("p", { className: "font-heading uppercase tracking-wide text-sm text-dark/60 mb-2", children: "\u042D\u043A\u0437\u0430\u043C\u0435\u043D\u044B" }), exams.map((e) => (_jsxs("div", { className: "flex items-center justify-between py-2 border-b border-black/5 last:border-0", children: [_jsx("p", { className: "font-body text-xs text-dark", children: e.title }), e.scores[0]
                                    ? _jsxs("p", { className: "font-heading text-sm text-primary", children: [e.scores[0].score, "/", e.scores[0].maxScore] })
                                    : _jsx("p", { className: "font-body text-[10px] text-dark/30", children: "\u2014" })] }, e.id)))] })), photoViewer && (_jsx("div", { className: "fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4", onClick: () => setPhotoViewer(null), children: _jsxs("div", { className: "relative max-w-full max-h-full", onClick: (e) => e.stopPropagation(), children: [_jsx("img", { src: photoViewer, alt: "", className: "max-w-[90vw] max-h-[85vh] rounded-2xl object-contain" }), _jsx("button", { onClick: () => setPhotoViewer(null), className: "absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center text-lg leading-none", children: "\u00D7" })] }) })), _jsxs("div", { className: "bg-card rounded-2xl p-4 flex flex-col gap-2", children: [_jsx("p", { className: "font-heading uppercase tracking-wide text-xs text-dark/50", children: "\u041F\u0435\u0440\u0435\u0432\u0435\u0441\u0442\u0438 \u0432 \u0433\u0440\u0443\u043F\u043F\u0443" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("select", { value: transferGroupId, onChange: (e) => setTransferGroupId(e.target.value), className: "flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary", children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0435\u0440\u0438 \u0433\u0440\u0443\u043F\u043F\u0443..." }), groups.filter((g) => g.id !== student.groupId).map((g) => (_jsxs("option", { value: g.id, children: [g.name, " (", g.course, " \u043A\u0443\u0440\u0441)"] }, g.id)))] }), _jsx("button", { disabled: !transferGroupId, onClick: async () => {
                                        await curatorApi.transferStudent(student.id, parseInt(transferGroupId));
                                        const newGroup = groups.find((g) => g.id === parseInt(transferGroupId));
                                        setStudents((ss) => ss.map((s) => s.id === student.id ? { ...s, groupId: parseInt(transferGroupId) } : s));
                                        setDetail((d) => d ? {
                                            ...d,
                                            student: { ...d.student, groupId: parseInt(transferGroupId), group: { ...d.student.group, id: parseInt(transferGroupId), name: newGroup?.name ?? '' } }
                                        } : d);
                                        setTransferGroupId('');
                                        toast.show(`Переведён в ${newGroup?.name}`, 'success');
                                    }, className: "bg-primary text-white font-heading uppercase text-xs px-4 py-2 rounded-xl disabled:opacity-50", children: "\u041F\u0435\u0440\u0435\u0432\u0435\u0441\u0442\u0438" })] })] }), student.groupId && (_jsx("button", { onClick: async () => {
                        if (!confirm(`Исключить ${student.firstName} ${student.lastName} из группы? Аккаунт сохранится.`))
                            return;
                        await curatorApi.excludeStudent(student.id);
                        setStudents((ss) => ss.filter((s) => s.id !== student.id));
                        setDetail(null);
                    }, className: "w-full bg-red-50 border border-red-200 text-red-500 font-heading uppercase text-xs py-3 rounded-xl hover:bg-red-100 transition-colors", children: "\u0418\u0441\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0438\u0437 \u0433\u0440\u0443\u043F\u043F\u044B" })), _jsx("button", { onClick: async () => {
                        if (!confirm(`Удалить аккаунт ${student.firstName} ${student.lastName}? Это действие нельзя отменить.`))
                            return;
                        try {
                            await curatorApi.deleteStudent(student.id);
                            setStudents((ss) => ss.filter((s) => s.id !== student.id));
                            setDetail(null);
                            toast.show('Аккаунт удалён', 'success');
                        }
                        catch {
                            toast.show('Не удалось удалить аккаунт');
                        }
                    }, className: "w-full bg-red-500 text-white font-heading uppercase text-xs py-3 rounded-xl hover:bg-red-600 transition-colors", children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442" }), examModal && (_jsx("div", { className: "fixed inset-0 bg-black/40 flex items-end z-50", onClick: () => setExamModal(null), children: _jsxs("div", { className: "bg-card w-full max-w-[480px] mx-auto rounded-t-3xl p-6", onClick: (e) => e.stopPropagation(), children: [_jsx("h2", { className: "font-heading uppercase tracking-wide text-dark text-lg mb-4", children: "\u0411\u0430\u043B\u043B \u0437\u0430 \u044D\u043A\u0437\u0430\u043C\u0435\u043D" }), _jsxs("select", { value: examId, onChange: (e) => setExamId(e.target.value), className: "w-full bg-bg border border-black/10 rounded-xl px-4 py-3 font-body text-sm mb-3 focus:outline-none focus:border-primary", children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0435\u0440\u0438 \u044D\u043A\u0437\u0430\u043C\u0435\u043D..." }), examModal.exams.map((e) => _jsx("option", { value: e.id, children: e.title }, e.id))] }), _jsx("input", { type: "number", value: examScore, onChange: (e) => setExamScore(e.target.value), placeholder: "\u0411\u0430\u043B\u043B (\u043D\u0430\u043F\u0440. 85)", className: "w-full bg-bg border border-black/10 rounded-xl px-4 py-3 font-body text-sm mb-3 focus:outline-none focus:border-primary" }), _jsx("button", { onClick: submitExamScore, disabled: !examId || !examScore, className: "w-full bg-primary text-white font-heading uppercase tracking-wider py-3.5 rounded-xl text-sm disabled:opacity-60", children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] }) }))] }));
    }
    return (_jsxs("div", { className: "px-4 pt-8 pb-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h1", { className: "font-heading text-2xl uppercase tracking-wide text-dark", children: "\u0421\u0442\u0443\u0434\u0435\u043D\u0442\u044B" }), _jsx("button", { onClick: () => { setShowAddStudent(!showAddStudent); setCreatedCredentials(null); }, className: "text-primary text-sm font-body", children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C" })] }), showAddStudent && !createdCredentials && (_jsxs("div", { className: "bg-card rounded-2xl p-4 flex flex-col gap-3 mb-4", children: [_jsx("p", { className: "font-heading uppercase tracking-wide text-sm text-dark/60", children: "\u041D\u043E\u0432\u044B\u0439 \u0441\u0442\u0443\u0434\u0435\u043D\u0442" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", placeholder: "\u0418\u043C\u044F", value: newStudent.firstName, onChange: (e) => setNewStudent((s) => ({ ...s, firstName: e.target.value })), className: "flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" }), _jsx("input", { type: "text", placeholder: "\u0424\u0430\u043C\u0438\u043B\u0438\u044F", value: newStudent.lastName, onChange: (e) => setNewStudent((s) => ({ ...s, lastName: e.target.value })), className: "flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" })] }), _jsxs("div", { className: "flex gap-2 items-center", children: [_jsx("input", { type: "text", placeholder: "\u041B\u043E\u0433\u0438\u043D (\u043D\u0430\u043F\u0440. ahmed.aliev)", value: newStudent.login, onChange: (e) => setNewStudent((s) => ({ ...s, login: e.target.value })), className: "flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" }), _jsx("button", { type: "button", onClick: () => {
                                    if (!newStudent.firstName && !newStudent.lastName)
                                        return;
                                    const base = `${translit(newStudent.firstName)}.${translit(newStudent.lastName)}`;
                                    const rand = Math.floor(100 + Math.random() * 900);
                                    setNewStudent((s) => ({ ...s, login: `${base}${rand}` }));
                                }, className: "shrink-0 text-xs font-body text-primary bg-primary/10 px-3 py-2 rounded-xl hover:bg-primary/20 transition-colors", children: "\u0410\u0432\u0442\u043E" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("select", { value: newStudent.course, onChange: (e) => setNewStudent((s) => ({ ...s, course: e.target.value })), className: "flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary", children: [1, 2, 3, 4].map((c) => _jsxs("option", { value: c, children: [c, " \u043A\u0443\u0440\u0441"] }, c)) }), _jsxs("select", { value: newStudent.groupId, onChange: (e) => setNewStudent((s) => ({ ...s, groupId: e.target.value })), className: "flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary", children: [_jsx("option", { value: "", children: "\u0413\u0440\u0443\u043F\u043F\u0430..." }), groups.map((g) => _jsx("option", { value: g.id, children: g.name }, g.id))] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setShowAddStudent(false), className: "flex-1 bg-bg text-dark/60 font-heading uppercase text-xs py-3 rounded-xl", children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { disabled: !newStudent.firstName || !newStudent.lastName || !newStudent.login || !newStudent.groupId, onClick: async () => {
                                    try {
                                        const result = await curatorApi.createStudent({
                                            firstName: newStudent.firstName, lastName: newStudent.lastName,
                                            login: newStudent.login, course: parseInt(newStudent.course), groupId: parseInt(newStudent.groupId),
                                        });
                                        setCreatedCredentials({ login: result.login, tempPassword: result.tempPassword });
                                        setStudents((ss) => [...ss, { ...result.user, rating: { total: 40, countedAbsences: 0, hwMisses: 0 } }]);
                                        setNewStudent({ firstName: '', lastName: '', login: '', course: '1', groupId: '' });
                                    }
                                    catch (e) {
                                        toast.show(e.response?.data?.error || 'Ошибка создания');
                                    }
                                }, className: "flex-1 bg-primary text-white font-heading uppercase text-xs py-3 rounded-xl disabled:opacity-50", children: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C" })] })] })), createdCredentials && (_jsxs("div", { className: "bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 flex flex-col gap-2", children: [_jsx("p", { className: "font-heading uppercase tracking-wide text-sm text-green-700", children: "\u0410\u043A\u043A\u0430\u0443\u043D\u0442 \u0441\u043E\u0437\u0434\u0430\u043D" }), _jsx("p", { className: "font-body text-xs text-dark/60", children: "\u041F\u0435\u0440\u0435\u0434\u0430\u0439 \u0441\u0442\u0443\u0434\u0435\u043D\u0442\u0443 \u044D\u0442\u0438 \u0434\u0430\u043D\u043D\u044B\u0435 \u0434\u043B\u044F \u0432\u0445\u043E\u0434\u0430:" }), _jsxs("div", { className: "bg-white rounded-xl p-3 flex flex-col gap-1", children: [_jsxs("p", { className: "font-body text-sm text-dark", children: [_jsx("span", { className: "text-dark/40", children: "\u041B\u043E\u0433\u0438\u043D: " }), _jsx("span", { className: "font-heading tracking-wide", children: createdCredentials.login })] }), _jsxs("p", { className: "font-body text-sm text-dark", children: [_jsx("span", { className: "text-dark/40", children: "\u041F\u0430\u0440\u043E\u043B\u044C: " }), _jsx("span", { className: "font-heading tracking-widest", children: createdCredentials.tempPassword })] })] }), _jsx("p", { className: "font-body text-[10px] text-dark/40", children: "\u041F\u0430\u0440\u043E\u043B\u044C \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043E\u0434\u0438\u043D \u0440\u0430\u0437. \u0421\u0442\u0443\u0434\u0435\u043D\u0442 \u043C\u043E\u0436\u0435\u0442 \u0441\u043C\u0435\u043D\u0438\u0442\u044C \u0435\u0433\u043E \u0432 \u043F\u0440\u043E\u0444\u0438\u043B\u0435." }), _jsx("button", { onClick: () => { setShowAddStudent(false); setCreatedCredentials(null); }, className: "w-full bg-green-600 text-white font-heading uppercase text-xs py-2.5 rounded-xl mt-1", children: "\u041F\u043E\u043D\u044F\u0442\u043D\u043E" })] })), _jsx("input", { type: "text", placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u0438\u043C\u0435\u043D\u0438...", value: search, onChange: (e) => setSearch(e.target.value), className: "w-full bg-card rounded-2xl px-4 py-3 font-body text-sm border border-border focus:outline-none focus:border-primary mb-2" }), groups.length > 0 && (_jsxs("div", { className: "flex gap-2 overflow-x-auto pb-2 no-scrollbar", children: [_jsx("button", { onClick: () => changeGroup(undefined), className: `flex-shrink-0 text-xs font-body px-3 py-1.5 rounded-full transition-colors ${groupFilter === undefined ? 'bg-dark text-white' : 'bg-card text-dark/60'}`, children: "\u0412\u0441\u0435 \u0433\u0440\u0443\u043F\u043F\u044B" }), groups.map((g) => (_jsx("button", { onClick: () => changeGroup(g.id), className: `flex-shrink-0 text-xs font-body px-3 py-1.5 rounded-full transition-colors ${groupFilter === g.id ? 'bg-dark text-white' : 'bg-card text-dark/60'}`, children: g.name }, g.id)))] })), _jsx("div", { className: "flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar", children: [['all', 'Все'], ['risk', 'Под угрозой'], ['close', 'Близко к лимиту'], ['best', 'Лучшие']].map(([f, l]) => (_jsx("button", { onClick: () => setFilter(f), className: `flex-shrink-0 text-xs font-body px-3 py-1.5 rounded-full transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-card text-dark/60'}`, children: l }, f))) }), _jsx("div", { className: "flex flex-col gap-2", children: filtered.map((s, i) => (_jsxs("button", { onClick: () => openDetail(s.id), className: "bg-card rounded-2xl px-4 py-3 flex items-center justify-between text-left", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "font-heading text-sm text-dark/40 w-5", children: i + 1 }), _jsxs("div", { children: [_jsxs("p", { className: "font-body text-sm text-dark", children: [s.lastName, " ", s.firstName] }), _jsxs("p", { className: "font-body text-[10px] text-dark/40", children: [s.course, " \u043A\u0443\u0440\u0441 \u00B7 ", s.rating.countedAbsences, " \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430 \u00B7 ", s.rating.hwMisses, " \u043D\u0435\u0441\u0434\u0430\u0447\u0438"] })] })] }), _jsx("span", { className: `font-heading text-lg ${s.rating.total >= 70 ? 'text-primary' : s.rating.total >= 50 ? 'text-yellow-500' : 'text-red-500'}`, children: s.rating.total })] }, s.id))) })] }));
}
function Stat({ label, value, warn }) {
    return (_jsxs("div", { children: [_jsx("p", { className: "font-body text-[10px] text-dark/50", children: label }), _jsx("p", { className: `font-heading text-base ${warn ? 'text-red-500' : 'text-dark'}`, children: value })] }));
}
