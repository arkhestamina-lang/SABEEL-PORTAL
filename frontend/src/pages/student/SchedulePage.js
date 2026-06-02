import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { studentApi } from '../../api';
import { useToastStore } from '../../store/toastStore';
import PageError from '../../components/common/PageError';
import { format, isPast, isWithinInterval, subMinutes, addMinutes } from 'date-fns';
import { ru } from 'date-fns/locale';
import CalendarView from '../../components/common/CalendarView';
import { Video, Camera, ArrowLeft, Mic, Paperclip } from 'lucide-react';
const STATUS_LABEL = { PENDING: 'На рассмотрении', EXCUSED: 'Уважительный', COUNTED: 'Засчитан' };
const STATUS_COLOR = { PENDING: 'text-yellow-600', EXCUSED: 'text-green-600', COUNTED: 'text-red-500' };
export default function SchedulePage() {
    const location = useLocation();
    const toast = useToastStore();
    const [lessons, setLessons] = useState([]);
    const [loadError, setLoadError] = useState(false);
    const [selected, setSelected] = useState(null);
    const [absenceModal, setAbsenceModal] = useState(false);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [photos, setPhotos] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    // Форма запроса долга по ДЗ
    const [debtFormOpen, setDebtFormOpen] = useState(false);
    const [debtReason, setDebtReason] = useState('');
    const [debtHwFiles, setDebtHwFiles] = useState([]);
    const [debtEvidFiles, setDebtEvidFiles] = useState([]);
    const [debtSubmitting, setDebtSubmitting] = useState(false);
    const debtHwRef = useRef(null);
    const debtEvidRef = useRef(null);
    function load() {
        setLoadError(false);
        studentApi.schedule().then((ls) => {
            setLessons(ls);
            const openId = location.state?.openLessonId;
            if (openId) {
                const lesson = ls.find((l) => l.id === openId);
                if (lesson)
                    setSelected(lesson);
            }
        }).catch(() => setLoadError(true));
    }
    useEffect(() => { load(); }, []);
    useEffect(() => {
        if (selected && isPast(new Date(selected.datetime))) {
            studentApi.getHwPhotos(selected.id).then(setPhotos);
        }
        else {
            setPhotos([]);
        }
    }, [selected?.id]);
    async function submitDebt() {
        if (!selected || !debtReason.trim())
            return;
        setDebtSubmitting(true);
        try {
            const result = await studentApi.submitDebt(selected.id, debtReason);
            if (debtHwFiles.length > 0)
                await studentApi.uploadHwPhotos(selected.id, debtHwFiles);
            if (debtEvidFiles.length > 0)
                await studentApi.uploadDebtEvidence(result.id, debtEvidFiles);
            setSelected((s) => s ? { ...s, debtStatus: 'PENDING' } : s);
            setLessons((ls) => ls.map((l) => l.id === selected.id ? { ...l, debtStatus: 'PENDING' } : l));
            setDebtFormOpen(false);
            setDebtReason('');
            setDebtHwFiles([]);
            setDebtEvidFiles([]);
            toast.show('Запрос отправлен', 'success');
        }
        catch {
            toast.show('Не удалось отправить запрос. Попробуй ещё раз.');
        }
        setDebtSubmitting(false);
    }
    async function submitAbsence() {
        if (!selected || !reason.trim())
            return;
        setSubmitting(true);
        try {
            await studentApi.submitAbsence(selected.id, reason);
            setLessons((ls) => ls.map((l) => l.id === selected.id ? { ...l, absenceStatus: 'PENDING' } : l));
            setSelected((s) => s ? { ...s, absenceStatus: 'PENDING' } : s);
            setAbsenceModal(false);
            setReason('');
        }
        catch {
            toast.show('Не удалось отправить заявку. Попробуй ещё раз.');
        }
        setSubmitting(false);
    }
    async function withdrawAbsence(lessonId) {
        await studentApi.withdrawAbsence(lessonId);
        setLessons((ls) => ls.map((l) => l.id === lessonId ? { ...l, absenceStatus: null } : l));
        setSelected((s) => s ? { ...s, absenceStatus: null } : s);
    }
    async function handlePhotoUpload(e) {
        if (!selected || !e.target.files?.length)
            return;
        setUploading(true);
        const files = Array.from(e.target.files);
        let newPhotos;
        try {
            newPhotos = await studentApi.uploadHwPhotos(selected.id, files);
        }
        catch {
            toast.show('Не удалось загрузить фото. Попробуй ещё раз.');
            setUploading(false);
            e.target.value = '';
            return;
        }
        setPhotos((ps) => [...ps, ...newPhotos]);
        // Автоматически отмечаем ДЗ как сданное
        if (!selected.hwSubmitted) {
            await studentApi.submitHomework(selected.id);
            const updated = { ...selected, hwSubmitted: true };
            setSelected(updated);
            setLessons((ls) => ls.map((l) => l.id === selected.id ? updated : l));
            toast.show('Да приумножит Аллах твои знания!', 'success');
        }
        setUploading(false);
        e.target.value = '';
    }
    async function deletePhoto(id) {
        await studentApi.deleteHwPhoto(id);
        setPhotos((ps) => ps.filter((p) => p.id !== id));
    }
    if (loadError)
        return _jsx(PageError, { onRetry: load });
    // Детальный экран урока
    if (selected) {
        const lessonDate = new Date(selected.datetime);
        const past = isPast(lessonDate);
        const isActive = isWithinInterval(new Date(), {
            start: subMinutes(lessonDate, 15),
            end: addMinutes(lessonDate, 90),
        });
        return (_jsxs("div", { className: "px-4 pt-8 pb-4 flex flex-col gap-4", children: [_jsxs("button", { onClick: () => setSelected(null), className: "flex items-center gap-1.5 text-muted hover:text-dark text-sm font-body", children: [_jsx(ArrowLeft, { size: 16 }), " \u0420\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435"] }), _jsxs("div", { children: [_jsx("p", { className: "font-body text-xs text-dark/40", children: format(new Date(selected.datetime), 'EEEE, d MMMM · HH:mm', { locale: ru }) }), _jsx("h1", { className: "font-heading text-2xl uppercase tracking-wide text-dark mt-0.5", children: selected.subject }), selected.isCancelled && _jsxs("p", { className: "font-body text-sm text-red-400 mt-1", children: ["\u0423\u0440\u043E\u043A \u043E\u0442\u043C\u0435\u043D\u0451\u043D", selected.note ? ` · ${selected.note}` : ''] }), !selected.isCancelled && selected.note && _jsx("p", { className: "font-body text-sm text-dark/40 mt-1", children: selected.note }), selected.meetingUrl && !selected.isCancelled && (_jsxs("a", { href: selected.meetingUrl, target: "_blank", rel: "noreferrer", className: `mt-3 flex items-center justify-center gap-2 py-3 rounded-2xl font-heading uppercase tracking-wide text-sm transition-all ${isActive
                                ? 'bg-primary text-white shadow-blue'
                                : 'bg-primary/10 text-primary'}`, children: [_jsx(Video, { size: 16 }), isActive ? 'Войти на урок' : 'Ссылка на урок'] }))] }), !selected.isCancelled && (_jsxs("div", { className: "bg-card rounded-2xl p-4 flex flex-col gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "font-body text-[10px] text-dark/40 uppercase tracking-wider mb-1", children: "\u041F\u043E\u0441\u0435\u0449\u0430\u0435\u043C\u043E\u0441\u0442\u044C" }), !past
                                    ? _jsx("p", { className: "font-body text-sm text-dark/50", children: "\u0423\u0440\u043E\u043A \u0435\u0449\u0451 \u043D\u0435 \u043F\u0440\u043E\u0448\u0451\u043B" })
                                    : selected.attended === null
                                        ? _jsx("p", { className: "font-body text-sm text-dark/40", children: "\u041D\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043E \u043A\u0443\u0440\u0430\u0442\u043E\u0440\u043E\u043C" })
                                        : selected.attended
                                            ? _jsx("p", { className: "font-body text-sm text-green-600", children: "\u041F\u0440\u0438\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u043B \u2713" })
                                            : (_jsxs("div", { children: [_jsx("p", { className: "font-body text-sm text-red-500 mb-2", children: "\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u043B" }), selected.absenceStatus ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("p", { className: `text-xs font-body ${STATUS_COLOR[selected.absenceStatus]}`, children: ["\u0417\u0430\u044F\u0432\u043A\u0430: ", STATUS_LABEL[selected.absenceStatus]] }), selected.absenceStatus === 'PENDING' && (_jsx("button", { onClick: () => withdrawAbsence(selected.id), className: "text-[10px] font-body text-dark/30 underline", children: "\u041E\u0442\u043E\u0437\u0432\u0430\u0442\u044C" }))] })) : selected.canSubmitAbsence ? (_jsx("button", { onClick: () => setAbsenceModal(true), className: "bg-primary/10 text-primary font-body text-xs px-3 py-1.5 rounded-xl", children: "\u041F\u043E\u0434\u0430\u0442\u044C \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430" })) : (_jsx("p", { className: "font-body text-xs text-red-400", children: "\u041F\u0440\u043E\u043F\u0443\u0441\u043A \u0437\u0430\u0441\u0447\u0438\u0442\u0430\u043D (\u0441\u0440\u043E\u043A \u0438\u0441\u0442\u0451\u043A)" }))] }))] }), past && (_jsxs("div", { className: "border-t border-black/5 pt-3 flex flex-col gap-3", children: [_jsx("p", { className: "font-body text-[10px] text-dark/40 uppercase tracking-wider", children: "\u0414\u043E\u043C\u0430\u0448\u043D\u0435\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u0435" }), selected.hwSubmitted && (_jsx(_Fragment, { children: photos.length === 0 ? (_jsxs("div", { className: "flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2.5", children: [_jsx(Mic, { size: 14, className: "text-green-600" }), _jsx("p", { className: "font-body text-sm text-green-700", children: "\u0423\u0441\u0442\u043D\u0430\u044F \u0440\u0430\u0431\u043E\u0442\u0430 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u0430" })] })) : (_jsx("div", { className: "grid grid-cols-3 gap-2", children: photos.map((p) => (_jsxs("div", { className: "relative aspect-square", children: [_jsx("img", { src: p.url, alt: "\u0414\u0417", className: "w-full h-full object-cover rounded-xl" }), _jsx("button", { onClick: () => deletePhoto(p.id), className: "absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full text-xs flex items-center justify-center", children: "\u00D7" })] }, p.id))) })) })), !selected.hwSubmitted && (selected.hwDeadlinePassed ? (
                                /* Дедлайн прошёл — форма запроса долга */
                                !selected.debtStatus ? (debtFormOpen ? (_jsxs("div", { className: "bg-orange-50 rounded-xl p-3 flex flex-col gap-2.5", children: [_jsx("p", { className: "font-body text-[10px] text-orange-700 uppercase tracking-wider", children: "\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0430 \u0437\u0430\u0447\u0451\u0442 \u0414\u0417" }), _jsx("textarea", { value: debtReason, onChange: (e) => setDebtReason(e.target.value), rows: 3, placeholder: "\u041E\u0431\u044A\u044F\u0441\u043D\u0438 \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u0437\u0430\u0434\u0435\u0440\u0436\u043A\u0438...", className: "w-full bg-white/70 border border-orange-200 rounded-xl p-2.5 font-body text-sm focus:outline-none focus:border-orange-400 resize-none" }), _jsx("input", { ref: debtHwRef, type: "file", accept: "image/*", multiple: true, className: "hidden", onChange: (e) => setDebtHwFiles(Array.from(e.target.files ?? [])) }), _jsx("input", { ref: debtEvidRef, type: "file", accept: "image/*,application/pdf", multiple: true, className: "hidden", onChange: (e) => setDebtEvidFiles(Array.from(e.target.files ?? [])) }), _jsxs("button", { onClick: () => debtHwRef.current?.click(), className: "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-body bg-white/70 text-dark/60 border border-orange-200 w-full hover:border-orange-400 hover:text-orange-700 active:scale-[0.98] transition-colors", children: [_jsx(Camera, { size: 14 }), debtHwFiles.length > 0 ? `ДЗ: ${debtHwFiles.length} фото` : 'Прикрепить фото ДЗ'] }), _jsxs("button", { onClick: () => debtEvidRef.current?.click(), className: "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-body bg-white/70 text-dark/60 border border-orange-200 w-full hover:border-orange-400 hover:text-orange-700 active:scale-[0.98] transition-colors", children: [_jsx(Paperclip, { size: 14 }), debtEvidFiles.length > 0 ? `Справка: ${debtEvidFiles.length} файла` : 'Прикрепить справку (необязательно)'] }), _jsxs("div", { className: "flex gap-2 mt-1", children: [_jsx("button", { onClick: () => { setDebtFormOpen(false); setDebtReason(''); setDebtHwFiles([]); setDebtEvidFiles([]); }, className: "flex-1 py-2.5 rounded-xl font-body text-xs text-dark/50 border border-black/10 bg-white/60", children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { onClick: submitDebt, disabled: debtSubmitting || !debtReason.trim(), className: "flex-1 py-2.5 rounded-xl font-heading uppercase tracking-wider text-xs bg-orange-500 text-white disabled:opacity-50", children: debtSubmitting ? 'Отправляем...' : 'Отправить' })] })] })) : (_jsxs("div", { className: "bg-orange-50 rounded-xl px-3 py-2.5 flex flex-col gap-2", children: [_jsx("p", { className: "font-body text-xs text-orange-700", children: "\u0421\u0440\u043E\u043A \u0441\u0434\u0430\u0447\u0438 \u0438\u0441\u0442\u0451\u043A. \u041C\u043E\u0436\u0435\u0448\u044C \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441 \u043D\u0430 \u0437\u0430\u0447\u0451\u0442." }), _jsx("button", { onClick: () => setDebtFormOpen(true), className: "flex items-center gap-1.5 text-xs font-body text-orange-600 underline underline-offset-2 self-start", children: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441" })] }))) : null) : (
                                /* Дедлайн не прошёл — кнопки загрузки */
                                _jsxs(_Fragment, { children: [_jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", multiple: true, className: "hidden", onChange: handlePhotoUpload }), _jsxs("button", { onClick: () => fileInputRef.current?.click(), disabled: uploading, className: "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body bg-bg text-dark/60 border border-black/10 w-full disabled:opacity-60 hover:border-primary hover:text-primary active:scale-[0.98]", children: [_jsx(Camera, { size: 16 }), uploading ? 'Загружаем...' : photos.length > 0 ? 'Добавить ещё фото' : 'Прикрепить фото работы'] }), _jsxs("button", { onClick: async () => {
                                                await studentApi.submitHomework(selected.id);
                                                const updated = { ...selected, hwSubmitted: true };
                                                setSelected(updated);
                                                setLessons((ls) => ls.map((l) => l.id === selected.id ? updated : l));
                                                toast.show('Да приумножит Аллах твои знания!', 'success');
                                            }, className: "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body bg-bg text-dark/60 border border-black/10 w-full hover:border-green-400 hover:text-green-600 active:scale-[0.98] transition-colors", children: [_jsx(Mic, { size: 16 }), "\u0423\u0441\u0442\u043D\u0430\u044F \u0440\u0430\u0431\u043E\u0442\u0430"] })] }))), selected.debtStatus && (_jsxs("div", { className: `rounded-xl px-3 py-2 font-body text-xs ${selected.debtStatus === 'ACCEPTED' ? 'bg-green-50 text-green-700' :
                                        selected.debtStatus === 'REJECTED' ? 'bg-red-50 text-red-600' :
                                            'bg-yellow-50 text-yellow-700'}`, children: ["\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0430 \u0437\u0430\u0447\u0451\u0442: ", selected.debtStatus === 'ACCEPTED' ? 'Принят ✓' :
                                            selected.debtStatus === 'REJECTED' ? 'Отклонён' :
                                                'На рассмотрении...'] }))] }))] }))] }));
    }
    return (_jsxs("div", { className: "px-4 pt-8 pb-4", children: [_jsx("h1", { className: "font-heading text-2xl uppercase tracking-wide text-dark mb-5", children: "\u0420\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx(CalendarView, { lessons: lessons, onLessonPress: setSelected }), absenceModal && selected != null && (() => {
                const l = selected;
                return (_jsx("div", { className: "fixed inset-0 bg-black/40 flex items-end z-50", onClick: () => setAbsenceModal(false), children: _jsxs("div", { className: "bg-card w-full max-w-[480px] mx-auto rounded-t-3xl p-6", onClick: (e) => e.stopPropagation(), children: [_jsx("h2", { className: "font-heading uppercase tracking-wide text-dark text-lg mb-1", children: "\u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430" }), _jsxs("p", { className: "font-body text-xs text-dark/50 mb-4", children: [l.subject, " \u00B7 ", format(new Date(l.datetime), 'd MMMM', { locale: ru })] }), _jsx("textarea", { value: reason, onChange: (e) => setReason(e.target.value), className: "w-full bg-bg border border-black/10 rounded-xl p-3 font-body text-sm focus:outline-none focus:border-primary resize-none", rows: 3, placeholder: "\u041E\u043F\u0438\u0448\u0438 \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430..." }), _jsx("button", { onClick: submitAbsence, disabled: submitting || !reason.trim(), className: "mt-3 w-full bg-primary text-white font-heading uppercase tracking-wider py-3.5 rounded-xl text-sm disabled:opacity-60", children: submitting ? 'Отправляем...' : 'Отправить' })] }) }));
            })()] }));
}
