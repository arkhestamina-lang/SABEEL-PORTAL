import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { studentApi } from '../../api';
import { useToastStore } from '../../store/toastStore';
import PageError from '../../components/common/PageError';

import { format, isPast, isWithinInterval, subMinutes, addMinutes } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Lesson } from '../../types';
import CalendarView from '../../components/common/CalendarView';
import { Video, Camera, ArrowLeft, Mic, Paperclip } from 'lucide-react';

interface HwPhoto { id: number; url: string; createdAt: string }

const STATUS_LABEL: Record<string, string> = { PENDING: 'На рассмотрении', EXCUSED: 'Уважительный', COUNTED: 'Засчитан' };
const STATUS_COLOR: Record<string, string> = { PENDING: 'text-yellow-600', EXCUSED: 'text-green-600', COUNTED: 'text-red-500' };

export default function SchedulePage() {
  const location = useLocation();
  const toast = useToastStore();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<Lesson | null>(null);
  const [absenceModal, setAbsenceModal] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<HwPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Форма запроса долга по ДЗ
  const [debtFormOpen, setDebtFormOpen] = useState(false);
  const [debtReason, setDebtReason] = useState('');
  const [debtHwFiles, setDebtHwFiles] = useState<File[]>([]);
  const [debtEvidFiles, setDebtEvidFiles] = useState<File[]>([]);
  const [debtSubmitting, setDebtSubmitting] = useState(false);
  const debtHwRef = useRef<HTMLInputElement>(null);
  const debtEvidRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoadError(false);
    studentApi.schedule().then((ls) => {
      setLessons(ls);
      const openId = (location.state as any)?.openLessonId;
      if (openId) {
        const lesson = ls.find((l: Lesson) => l.id === openId);
        if (lesson) setSelected(lesson);
      }
    }).catch(() => setLoadError(true));
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (selected && isPast(new Date(selected.datetime))) {
      studentApi.getHwPhotos(selected.id).then(setPhotos);
    } else {
      setPhotos([]);
    }
  }, [selected?.id]);

  async function submitDebt() {
    if (!selected || !debtReason.trim()) return;
    setDebtSubmitting(true);
    try {
      const result = await studentApi.submitDebt(selected.id, debtReason);
      if (debtHwFiles.length > 0) await studentApi.uploadHwPhotos(selected.id, debtHwFiles);
      if (debtEvidFiles.length > 0) await studentApi.uploadDebtEvidence(result.id, debtEvidFiles);
      setSelected((s) => s ? { ...s, debtStatus: 'PENDING' } : s);
      setLessons((ls) => ls.map((l) => l.id === selected.id ? { ...l, debtStatus: 'PENDING' } : l));
      setDebtFormOpen(false);
      setDebtReason(''); setDebtHwFiles([]); setDebtEvidFiles([]);
      toast.show('Запрос отправлен', 'success');
    } catch { toast.show('Не удалось отправить запрос. Попробуй ещё раз.'); }
    setDebtSubmitting(false);
  }

  async function submitAbsence() {
    if (!selected || !reason.trim()) return;
    setSubmitting(true);
    try {
    await studentApi.submitAbsence(selected.id, reason);
    setLessons((ls) => ls.map((l) => l.id === selected.id ? { ...l, absenceStatus: 'PENDING' } : l));
    setSelected((s) => s ? { ...s, absenceStatus: 'PENDING' } : s);
    setAbsenceModal(false);
    setReason('');
    } catch { toast.show('Не удалось отправить заявку. Попробуй ещё раз.'); }
    setSubmitting(false);
  }

  async function withdrawAbsence(lessonId: number) {
    await studentApi.withdrawAbsence(lessonId);
    setLessons((ls) => ls.map((l) => l.id === lessonId ? { ...l, absenceStatus: null } : l));
    setSelected((s) => s ? { ...s, absenceStatus: null } : s);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selected || !e.target.files?.length) return;
    setUploading(true);
    const files = Array.from(e.target.files);
    let newPhotos;
    try {
    newPhotos = await studentApi.uploadHwPhotos(selected.id, files);
    } catch { toast.show('Не удалось загрузить фото. Попробуй ещё раз.'); setUploading(false); e.target.value = ''; return; }
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

  async function deletePhoto(id: number) {
    await studentApi.deleteHwPhoto(id);
    setPhotos((ps) => ps.filter((p) => p.id !== id));
  }

  if (loadError) return <PageError onRetry={load} />;

  // Детальный экран урока
  if (selected) {
    const lessonDate = new Date(selected.datetime);
    const past = isPast(lessonDate);
    const isActive = isWithinInterval(new Date(), {
      start: subMinutes(lessonDate, 15),
      end: addMinutes(lessonDate, 90),
    });

    return (
      <div className="px-4 pt-8 pb-4 flex flex-col gap-4">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-muted hover:text-dark text-sm font-body">
          <ArrowLeft size={16} /> Расписание
        </button>

        <div>
          <p className="font-body text-xs text-dark/40">{format(new Date(selected.datetime), 'EEEE, d MMMM · HH:mm', { locale: ru })}</p>
          <h1 className="font-heading text-2xl uppercase tracking-wide text-dark mt-0.5">{selected.subject}</h1>
          {selected.isCancelled && <p className="font-body text-sm text-red-400 mt-1">Урок отменён{selected.note ? ` · ${selected.note}` : ''}</p>}
          {!selected.isCancelled && selected.note && <p className="font-body text-sm text-dark/40 mt-1">{selected.note}</p>}

          {/* Кнопка входа на урок */}
          {selected.meetingUrl && !selected.isCancelled && (
            <a
              href={selected.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className={`mt-3 flex items-center justify-center gap-2 py-3 rounded-2xl font-heading uppercase tracking-wide text-sm transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-blue'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              <Video size={16} />
              {isActive ? 'Войти на урок' : 'Ссылка на урок'}
            </a>
          )}
        </div>

        {!selected.isCancelled && (
          <div className="bg-card rounded-2xl p-4 flex flex-col gap-3">
            {/* Посещаемость */}
            <div>
              <p className="font-body text-[10px] text-dark/40 uppercase tracking-wider mb-1">Посещаемость</p>
              {!past
                ? <p className="font-body text-sm text-dark/50">Урок ещё не прошёл</p>
                : selected.attended === null
                ? <p className="font-body text-sm text-dark/40">Не отмечено куратором</p>
                : selected.attended
                ? <p className="font-body text-sm text-green-600">Присутствовал ✓</p>
                : (
                  <div>
                    <p className="font-body text-sm text-red-500 mb-2">Отсутствовал</p>
                    {selected.absenceStatus ? (
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-body ${STATUS_COLOR[selected.absenceStatus]}`}>
                          Заявка: {STATUS_LABEL[selected.absenceStatus]}
                        </p>
                        {selected.absenceStatus === 'PENDING' && (
                          <button onClick={() => withdrawAbsence(selected.id)} className="text-[10px] font-body text-dark/30 underline">Отозвать</button>
                        )}
                      </div>
                    ) : selected.canSubmitAbsence ? (
                      <button onClick={() => setAbsenceModal(true)} className="bg-primary/10 text-primary font-body text-xs px-3 py-1.5 rounded-xl">
                        Подать причину пропуска
                      </button>
                    ) : (
                      <p className="font-body text-xs text-red-400">Пропуск засчитан (срок истёк)</p>
                    )}
                  </div>
                )
              }
            </div>

            {/* Домашнее задание */}
            {past && (
              <div className="border-t border-black/5 pt-3 flex flex-col gap-3">
                <p className="font-body text-[10px] text-dark/40 uppercase tracking-wider">Домашнее задание</p>

                {/* Уже сдано — показываем что есть */}
                {selected.hwSubmitted && (
                  <>
                    {photos.length === 0 ? (
                      <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2.5">
                        <Mic size={14} className="text-green-600" />
                        <p className="font-body text-sm text-green-700">Устная работа отмечена</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {photos.map((p) => (
                          <div key={p.id} className="relative aspect-square">
                            <img src={p.url} alt="ДЗ" className="w-full h-full object-cover rounded-xl" />
                            <button onClick={() => deletePhoto(p.id)}
                              className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full text-xs flex items-center justify-center">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Не сдано */}
                {!selected.hwSubmitted && (
                  selected.hwDeadlinePassed ? (
                    /* Дедлайн прошёл — форма запроса долга */
                    !selected.debtStatus ? (
                      debtFormOpen ? (
                        <div className="bg-orange-50 rounded-xl p-3 flex flex-col gap-2.5">
                          <p className="font-body text-[10px] text-orange-700 uppercase tracking-wider">Запрос на зачёт ДЗ</p>
                          <textarea
                            value={debtReason}
                            onChange={(e) => setDebtReason(e.target.value)}
                            rows={3}
                            placeholder="Объясни причину задержки..."
                            className="w-full bg-white/70 border border-orange-200 rounded-xl p-2.5 font-body text-sm focus:outline-none focus:border-orange-400 resize-none"
                          />
                          {/* Скрытые инпуты для файлов */}
                          <input ref={debtHwRef} type="file" accept="image/*" multiple className="hidden"
                            onChange={(e) => setDebtHwFiles(Array.from(e.target.files ?? []))} />
                          <input ref={debtEvidRef} type="file" accept="image/*,application/pdf" multiple className="hidden"
                            onChange={(e) => setDebtEvidFiles(Array.from(e.target.files ?? []))} />
                          <button onClick={() => debtHwRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-body bg-white/70 text-dark/60 border border-orange-200 w-full hover:border-orange-400 hover:text-orange-700 active:scale-[0.98] transition-colors">
                            <Camera size={14} />
                            {debtHwFiles.length > 0 ? `ДЗ: ${debtHwFiles.length} фото` : 'Прикрепить фото ДЗ'}
                          </button>
                          <button onClick={() => debtEvidRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-body bg-white/70 text-dark/60 border border-orange-200 w-full hover:border-orange-400 hover:text-orange-700 active:scale-[0.98] transition-colors">
                            <Paperclip size={14} />
                            {debtEvidFiles.length > 0 ? `Справка: ${debtEvidFiles.length} файла` : 'Прикрепить справку (необязательно)'}
                          </button>
                          <div className="flex gap-2 mt-1">
                            <button onClick={() => { setDebtFormOpen(false); setDebtReason(''); setDebtHwFiles([]); setDebtEvidFiles([]); }}
                              className="flex-1 py-2.5 rounded-xl font-body text-xs text-dark/50 border border-black/10 bg-white/60">
                              Отмена
                            </button>
                            <button onClick={submitDebt} disabled={debtSubmitting || !debtReason.trim()}
                              className="flex-1 py-2.5 rounded-xl font-heading uppercase tracking-wider text-xs bg-orange-500 text-white disabled:opacity-50">
                              {debtSubmitting ? 'Отправляем...' : 'Отправить'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-orange-50 rounded-xl px-3 py-2.5 flex flex-col gap-2">
                          <p className="font-body text-xs text-orange-700">Срок сдачи истёк. Можешь отправить запрос на зачёт.</p>
                          <button onClick={() => setDebtFormOpen(true)}
                            className="flex items-center gap-1.5 text-xs font-body text-orange-600 underline underline-offset-2 self-start">
                            Отправить запрос
                          </button>
                        </div>
                      )
                    ) : null
                  ) : (
                    /* Дедлайн не прошёл — кнопки загрузки */
                    <>
                      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                      <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body bg-bg text-dark/60 border border-black/10 w-full disabled:opacity-60 hover:border-primary hover:text-primary active:scale-[0.98]">
                        <Camera size={16} />
                        {uploading ? 'Загружаем...' : photos.length > 0 ? 'Добавить ещё фото' : 'Прикрепить фото работы'}
                      </button>
                      <button
                        onClick={async () => {
                          await studentApi.submitHomework(selected.id);
                          const updated = { ...selected, hwSubmitted: true };
                          setSelected(updated);
                          setLessons((ls) => ls.map((l) => l.id === selected.id ? updated : l));
                          toast.show('Да приумножит Аллах твои знания!', 'success');
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body bg-bg text-dark/60 border border-black/10 w-full hover:border-green-400 hover:text-green-600 active:scale-[0.98] transition-colors">
                        <Mic size={16} />
                        Устная работа
                      </button>
                    </>
                  )
                )}

                {/* Статус запроса на зачёт долга */}
                {selected.debtStatus && (
                  <div className={`rounded-xl px-3 py-2 font-body text-xs ${
                    selected.debtStatus === 'ACCEPTED' ? 'bg-green-50 text-green-700' :
                    selected.debtStatus === 'REJECTED' ? 'bg-red-50 text-red-600' :
                    'bg-yellow-50 text-yellow-700'
                  }`}>
                    Запрос на зачёт: {
                      selected.debtStatus === 'ACCEPTED' ? 'Принят ✓' :
                      selected.debtStatus === 'REJECTED' ? 'Отклонён' :
                      'На рассмотрении...'
                    }
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 pt-8 pb-4">
      <h1 className="font-heading text-2xl uppercase tracking-wide text-dark mb-5">Расписание</h1>
      <CalendarView lessons={lessons} onLessonPress={setSelected} />

      {/* Модалка причины пропуска */}
      {absenceModal && selected != null && (() => {
        const l = selected as Lesson;
        return (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setAbsenceModal(false)}>
          <div className="bg-card w-full max-w-[480px] mx-auto rounded-t-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-heading uppercase tracking-wide text-dark text-lg mb-1">Причина пропуска</h2>
            <p className="font-body text-xs text-dark/50 mb-4">
              {l.subject} · {format(new Date(l.datetime), 'd MMMM', { locale: ru })}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-bg border border-black/10 rounded-xl p-3 font-body text-sm focus:outline-none focus:border-primary resize-none"
              rows={3}
              placeholder="Опиши причину пропуска..."
            />
            <button
              onClick={submitAbsence}
              disabled={submitting || !reason.trim()}
              className="mt-3 w-full bg-primary text-white font-heading uppercase tracking-wider py-3.5 rounded-xl text-sm disabled:opacity-60"
            >
              {submitting ? 'Отправляем...' : 'Отправить'}
            </button>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
