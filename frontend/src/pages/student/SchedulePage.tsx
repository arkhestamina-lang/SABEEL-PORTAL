import { useEffect, useState, useRef } from 'react';
import { studentApi } from '../../api';
import { format, isPast } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Lesson } from '../../types';
import CalendarView from '../../components/common/CalendarView';

interface HwPhoto { id: number; url: string; createdAt: string }

const STATUS_LABEL: Record<string, string> = { PENDING: 'На рассмотрении', EXCUSED: 'Уважительный', COUNTED: 'Засчитан' };
const STATUS_COLOR: Record<string, string> = { PENDING: 'text-yellow-600', EXCUSED: 'text-green-600', COUNTED: 'text-red-500' };

export default function SchedulePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selected, setSelected] = useState<Lesson | null>(null);
  const [absenceModal, setAbsenceModal] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<HwPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { studentApi.schedule().then(setLessons); }, []);

  useEffect(() => {
    if (selected && isPast(new Date(selected.datetime))) {
      studentApi.getHwPhotos(selected.id).then(setPhotos);
    } else {
      setPhotos([]);
    }
  }, [selected?.id]);

  async function submitAbsence() {
    if (!selected || !reason.trim()) return;
    setSubmitting(true);
    await studentApi.submitAbsence(selected.id, reason);
    setLessons((ls) => ls.map((l) => l.id === selected.id ? { ...l, absenceStatus: 'PENDING' } : l));
    setSelected((s) => s ? { ...s, absenceStatus: 'PENDING' } : s);
    setAbsenceModal(false);
    setReason('');
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
    const newPhotos = await studentApi.uploadHwPhotos(selected.id, files);
    setPhotos((ps) => [...ps, ...newPhotos]);

    // Автоматически отмечаем ДЗ как сданное
    if (!selected.hwSubmitted) {
      await studentApi.submitHomework(selected.id);
      const updated = { ...selected, hwSubmitted: true };
      setSelected(updated);
      setLessons((ls) => ls.map((l) => l.id === selected.id ? updated : l));
    }

    setUploading(false);
    e.target.value = '';
  }

  async function deletePhoto(id: number) {
    await studentApi.deleteHwPhoto(id);
    setPhotos((ps) => ps.filter((p) => p.id !== id));
  }

  async function toggleHomework(lesson: Lesson) {
    if (lesson.hwSubmitted) {
      await studentApi.unsubmitHomework(lesson.id);
    } else {
      await studentApi.submitHomework(lesson.id);
    }
    const updated = { ...lesson, hwSubmitted: !lesson.hwSubmitted };
    setLessons((ls) => ls.map((l) => l.id === lesson.id ? updated : l));
    setSelected(updated);
  }

  // Детальный экран урока
  if (selected) {
    const past = isPast(new Date(selected.datetime));

    return (
      <div className="px-4 pt-8 pb-4 flex flex-col gap-4">
        <button onClick={() => setSelected(null)} className="text-primary text-sm font-body">← Расписание</button>

        <div>
          <p className="font-body text-xs text-dark/40">{format(new Date(selected.datetime), 'EEEE, d MMMM · HH:mm', { locale: ru })}</p>
          <h1 className="font-heading text-2xl uppercase tracking-wide text-dark mt-0.5">{selected.subject}</h1>
          {selected.isCancelled && <p className="font-body text-sm text-dark/40 mt-1">Урок отменён {selected.note ? `· ${selected.note}` : ''}</p>}
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

                {/* Отметка сдачи */}
                <button
                  onClick={() => toggleHomework(selected)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body transition-colors w-full ${
                    selected.hwSubmitted ? 'bg-green-100 text-green-700' : 'bg-bg text-dark/60 border border-black/10'
                  }`}
                >
                  <span className="text-base">{selected.hwSubmitted ? '✓' : '○'}</span>
                  {selected.hwSubmitted ? 'ДЗ отправлено в чат' : 'Отметить что отправил в чат'}
                </button>

                {/* Фото */}
                <div>
                  <p className="font-body text-[10px] text-dark/40 uppercase tracking-wider mb-2">Фото работы</p>

                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {photos.map((p) => (
                        <div key={p.id} className="relative aspect-square">
                          <img src={p.url} alt="ДЗ" className="w-full h-full object-cover rounded-xl" />
                          <button
                            onClick={() => deletePhoto(p.id)}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full text-xs flex items-center justify-center"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body bg-bg text-dark/60 border border-black/10 w-full disabled:opacity-60"
                  >
                    <span className="text-base">📷</span>
                    {uploading ? 'Загружаем...' : photos.length > 0 ? 'Добавить ещё фото' : 'Прикрепить фото'}
                  </button>
                </div>
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
