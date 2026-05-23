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

const QURAN_NORM:     Record<number, number> = { 1: 7,  2: 1,  3: 2,  4: 3  };
const READING_NORM:   Record<number, number> = { 1: 1,  2: 2,  3: 3,  4: 4  };
const LISTENING_NORM: Record<number, number> = { 1: 10, 2: 15, 3: 20, 4: 30 };
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

type Sheet = 'absences' | 'hw' | null;

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loadError, setLoadError] = useState(false);
  const [quranInput, setQuranInput] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToastStore();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [exams, setExams] = useState<any[]>([]);

  // Absence reason form
  const [absenceReason, setAbsenceReason] = useState('');
  const [absenceFiles, setAbsenceFiles] = useState<File[]>([]);
  const [activeAbsenceLessonId, setActiveAbsenceLessonId] = useState<number | null>(null);
  const absenceFileRef = useRef<HTMLInputElement>(null);
  // Debt request form
  const [debtReason, setDebtReason] = useState('');
  const [debtFiles, setDebtFiles] = useState<File[]>([]);       // доказательства (справки)
  const [debtHwFiles, setDebtHwFiles] = useState<File[]>([]);   // само домашнее задание
  const [activeDebtLessonId, setActiveDebtLessonId] = useState<number | null>(null);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const quote = QUOTES[new Date().getDay() % QUOTES.length];
  const norm          = QURAN_NORM[user?.course ?? 1];
  const readingNorm   = READING_NORM[user?.course ?? 1];
  const listeningNorm = LISTENING_NORM[user?.course ?? 1];
  const quranPages = data?.quranEntry?.pagesCompleted ?? 0;

  function load() {
    setLoadError(false);
    studentApi.dashboard().then(setData).catch(() => setLoadError(true));
  }
  useEffect(() => { load(); studentApi.exams().then(setExams).catch(() => {}); }, []);

  async function saveHabit(date: string, field: 'reading' | 'listening' | 'revision', value: boolean) {
    const existing = data?.habits?.find((h: any) => h.date.slice(0, 10) === date) ?? {};
    const updated = { ...existing, [field]: value };
    await studentApi.saveHabits(date, updated.reading ?? false, updated.listening ?? false, updated.revision ?? false);
    if (value) toast.show('Да приумножит Аллах твои знания!', 'success');
    const fresh = await studentApi.dashboard();
    setData(fresh);
  }

  async function saveQuran() {
    const pages = parseInt(quranInput);
    if (isNaN(pages)) return;
    setSaving(true);
    const ws = format(weekStart, 'yyyy-MM-dd');
    await studentApi.saveQuran(ws, pages);
    setQuranInput('');
    // Перезагружаем дашборд чтобы рейтинг обновился
    const fresh = await studentApi.dashboard();
    setData(fresh);
    setSaving(false);
  }

  async function submitAbsenceReason(lessonId: number) {
    if (!absenceReason.trim()) return;
    try {
    const result = await studentApi.submitAbsence(lessonId, absenceReason);
    if (absenceFiles.length > 0) {
      await studentApi.uploadAbsenceEvidence(result.id, absenceFiles);
      setAbsenceFiles([]);
    }
    setData((d: any) => ({
      ...d,
      absencesDetail: d.absencesDetail.map((a: any) =>
        a.lessonId === lessonId
          ? { ...a, canSubmit: false, absenceRequest: { status: 'PENDING', reason: absenceReason } }
          : a
      ),
    }));
    setAbsenceReason('');
    setActiveAbsenceLessonId(null);
    } catch { toast.show('Не удалось отправить заявку. Попробуй ещё раз.'); }
  }

  async function submitDebt(lessonId: number) {
    if (!debtReason.trim()) return;
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
    setData((d: any) => ({
      ...d,
      hwMissesDetail: d.hwMissesDetail.map((h: any) =>
        h.lessonId === lessonId
          ? { ...h, debtRequest: { status: 'PENDING' } }
          : h
      ),
    }));
    setDebtReason('');
    setDebtHwFiles([]);
    setActiveDebtLessonId(null);
    } catch { toast.show('Не удалось отправить запрос. Попробуй ещё раз.'); }
  }

  if (loadError) return <PageError onRetry={load} />;
  if (!data) return <div className="flex items-center justify-center min-h-dvh"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const { rating, streak, absencesDetail = [], hwMissesDetail = [] } = data;

  return (
    <div className="px-4 pt-8 pb-4 flex flex-col gap-5">
      {/* Скрытые файловые инпуты — вне модалок, иначе iOS не открывает пикер */}
      <input ref={absenceFileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => setAbsenceFiles(Array.from(e.target.files ?? []))} />

      {/* Приветствие */}
      <div className="fade-up">
        <p className="font-body text-[10px] tracking-[0.2em] uppercase text-muted">Sabeel University Portal</p>
        <h1 className="font-heading text-3xl uppercase tracking-wide text-dark mt-1">{user?.firstName}</h1>
      </div>

      {/* Предупреждение об угрозе отчисления */}
      {(rating.countedAbsences >= 3 || rating.hwMisses >= 3) && (() => {
        const critical = rating.countedAbsences >= 4 || rating.hwMisses >= 4;
        const parts: string[] = [];
        if (rating.countedAbsences >= 3) parts.push(`${rating.countedAbsences} пропуска из 5`);
        if (rating.hwMisses >= 3) parts.push(`${rating.hwMisses} несданных ДЗ из 5`);
        return (
          <div className={`rounded-2xl p-4 fade-up ${critical ? 'bg-red-500' : 'bg-yellow-400'}`}>
            <p className={`font-heading uppercase tracking-wide text-sm mb-1 flex items-center gap-1.5 ${critical ? 'text-white' : 'text-dark'}`}>
              <AlertTriangle size={14} className="shrink-0" />
              {critical ? 'Угроза отчисления' : 'Предупреждение'}
            </p>
            <p className={`font-body text-sm leading-relaxed ${critical ? 'text-white/90' : 'text-dark/80'}`}>
              У тебя {parts.join(' и ')}. При достижении лимита в 5 единиц университет будет вынужден тебя отчислить. Исправь ситуацию как можно скорее.
            </p>
          </div>
        );
      })()}

      {/* Streak + счётчики */}
      <div className="grid grid-cols-3 gap-2.5 fade-up">
        <StatCard label="Streak" value={streak} suffix="дней" icon={<Flame size={16} className="text-orange-400" />} />
        <button onClick={() => setSheet('absences')} className="text-left">
          <StatCard
            label="Пропуски"
            value={rating.countedAbsences}
            suffix="лимит 5 ›"
            warn={rating.countedAbsences >= 4}
            clickable
          />
        </button>
        <button onClick={() => setSheet('hw')} className="text-left">
          <StatCard
            label="Несдачи"
            value={rating.hwMisses}
            suffix="лимит 5 ›"
            warn={rating.hwMisses >= 4}
            clickable
          />
        </button>
      </div>

      {/* Рейтинг */}
      <div className="bg-card rounded-2xl p-4 shadow-card fade-up">
        <div className="flex items-center justify-between mb-3">
          <p className="font-body text-[11px] uppercase tracking-widest text-muted">Рейтинг месяца</p>
          <p className="font-heading text-2xl text-dark">{rating.total}<span className="text-sm text-muted font-body">/100</span></p>
        </div>
        <div className="h-1.5 bg-bg rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${rating.total}%`,
              background: rating.total >= 70 ? '#4A89C8' : rating.total >= 50 ? '#f59e0b' : '#ef4444'
            }}
          />
        </div>
      </div>

      {/* Экзамены */}
      {exams.filter((e: any) => !e.scores?.[0]).length > 0 && (
        <div className="bg-card rounded-2xl p-4 shadow-card fade-up flex flex-col gap-2">
          <p className="font-body text-[11px] uppercase tracking-widest text-muted mb-1">Предстоящие экзамены</p>
          {exams.filter((e: any) => !e.scores?.[0]).map((e: any) => {
            const examDate = new Date(e.date);
            const start = e.startHour != null ? new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate(), e.startHour, e.startMinute ?? 0) : null;
            const end = start && e.durationMinutes ? addMinutes(start, e.durationMinutes) : null;
            const isActive = start && end ? isWithinInterval(new Date(), { start, end }) : false;
            const timeStr = e.startHour != null
              ? `${String(e.startHour).padStart(2,'0')}:${String(e.startMinute ?? 0).padStart(2,'0')}`
              : '';
            return (
              <div key={e.id} className="flex items-center justify-between gap-3 py-2 border-b border-black/5 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-dark">{e.title}</p>
                  <p className="font-body text-[10px] text-muted">{format(examDate, 'd MMMM', { locale: ru })}{timeStr ? ` · ${timeStr}` : ''}</p>
                </div>
                {isActive ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-heading text-[10px] uppercase text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Идёт</span>
                    {e.formUrl && (
                      <a href={e.formUrl} target="_blank" rel="noreferrer"
                        className="bg-primary text-white font-heading uppercase text-[10px] px-3 py-1.5 rounded-xl">
                        Войти
                      </a>
                    )}
                  </div>
                ) : (
                  <span className="font-body text-[10px] text-muted shrink-0">{format(examDate, 'd MMM', { locale: ru })}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Коран */}
      {norm > 0 && (
        <div className="bg-card rounded-2xl p-4 shadow-card fade-up">
          <div className="flex items-center justify-between mb-2">
            <p className="font-body text-[11px] uppercase tracking-widest text-muted">
              {user?.course === 1 ? 'Чтение Корана — неделя' : 'Заучивание Корана — неделя'}
            </p>
            <p className="font-heading text-lg text-dark">
              {quranPages}<span className="text-sm text-muted font-body"> / {norm} стр.</span>
            </p>
          </div>
          <div className="h-1.5 bg-bg rounded-full overflow-hidden mb-3">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.min((quranPages / norm) * 100, 100)}%` }} />
          </div>
          <div className="flex gap-2">
            <input
              type="number" min={0} value={quranInput}
              onChange={(e) => setQuranInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveQuran()}
              placeholder={user?.course === 1 ? 'Страниц прочитано' : 'Страниц выучено'}
              className="flex-1 bg-bg border border-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-primary"
            />
            <button onClick={saveQuran} disabled={saving || !quranInput} className="bg-primary text-white font-heading uppercase text-xs px-4 rounded-xl disabled:opacity-50">
              {saving ? '...' : 'OK'}
            </button>
          </div>
          {user?.course === 1 && (
            <p className="font-body text-[10px] text-muted mt-2">Норма: 1 стр. в день · 7 стр. в неделю</p>
          )}
        </div>
      )}

      {/* Привычки */}
      <div className="bg-card rounded-2xl p-4 shadow-card fade-up">
        <div className="flex items-start justify-between mb-4">
          <p className="font-body text-[11px] uppercase tracking-widest text-muted">Привычки недели</p>
          <div className="text-right">
            {(() => {
              const readingDone  = weekDays.filter(d => data.habits?.find((h: any) => h.date.slice(0,10) === format(d,'yyyy-MM-dd'))?.reading).length;
              const listenDone   = weekDays.filter(d => data.habits?.find((h: any) => h.date.slice(0,10) === format(d,'yyyy-MM-dd'))?.listening).length;
              const revisionDone = weekDays.filter(d => data.habits?.find((h: any) => h.date.slice(0,10) === format(d,'yyyy-MM-dd'))?.revision).length;
              return (
                <>
                  <p className="font-body text-[10px] text-muted"><BookOpen size={9} className="inline mr-0.5" />{readingNorm * readingDone}/{readingNorm * 7} стр.</p>
                  <p className="font-body text-[10px] text-muted"><Headphones size={9} className="inline mr-0.5" />{listeningNorm * listenDone}/{listeningNorm * 7} мин.</p>
                  <p className="font-body text-[10px] text-muted"><RotateCcw size={9} className="inline mr-0.5" /> {revisionDone}/7 дней</p>
                </>
              );
            })()}
          </div>
        </div>
        <div className="flex justify-between gap-1">
          {weekDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const entry = data.habits?.find((h: any) => h.date.slice(0, 10) === key);
            const isToday = key === format(new Date(), 'yyyy-MM-dd');
            const isFuture = day > new Date();
            return (
              <div key={key} className="flex flex-col items-center gap-1.5">
                <span className={`font-body text-[9px] uppercase tracking-wider ${isToday ? 'text-primary font-semibold' : 'text-muted'}`}>
                  {format(day, 'EE', { locale: ru }).slice(0, 2)}
                </span>
                <button disabled={isFuture} onClick={() => !isFuture && saveHabit(key, 'reading', !entry?.reading)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${entry?.reading ? 'bg-primary text-white' : 'bg-bg text-muted border border-black/10'} disabled:opacity-30`}>
                  <BookOpen size={13} />
                </button>
                <button disabled={isFuture} onClick={() => !isFuture && saveHabit(key, 'listening', !entry?.listening)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${entry?.listening ? 'bg-primary text-white' : 'bg-bg text-muted border border-black/10'} disabled:opacity-30`}>
                  <Headphones size={13} />
                </button>
                <button disabled={isFuture} onClick={() => !isFuture && saveHabit(key, 'revision', !entry?.revision)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${entry?.revision ? 'bg-primary text-white' : 'bg-bg text-muted border border-black/10'} disabled:opacity-30`}>
                  <RotateCcw size={13} />
                </button>
              </div>
            );
          })}
        </div>
        {(() => {
          const todayKey = format(new Date(), 'yyyy-MM-dd');
          const todayEntry = data.habits?.find((h: any) => h.date.slice(0, 10) === todayKey);
          const hasAny = todayEntry?.reading || todayEntry?.listening || todayEntry?.revision;
          return !hasAny ? (
            <p className="font-body text-[11px] text-primary/80 mt-2 text-center">не забудь отметить привычку сегодня</p>
          ) : null;
        })()}
        <div className="mt-3 pt-3 border-t border-border flex flex-col gap-1">
          <div className="flex justify-between">
            <span className="flex items-center gap-1 font-body text-[10px] text-muted"><BookOpen size={10} /> Чтение · {readingNorm} стр/день</span>
            <span className="flex items-center gap-1 font-body text-[10px] text-muted"><Headphones size={10} /> Аудирование · {listeningNorm} мин/день</span>
          </div>
          <span className="flex items-center gap-1 font-body text-[10px] text-muted"><RotateCcw size={10} /> Повторение — ежедневно</span>
        </div>
      </div>

      {/* Цитата */}
      <div className="border border-border rounded-2xl p-4 fade-up">
        <p className="font-quote italic text-dark text-sm leading-relaxed">«{quote.text}»</p>
        <p className="font-body text-[11px] text-muted mt-2">{quote.source}</p>
      </div>

      {/* Нижний лист — Пропуски */}
      {sheet === 'absences' && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setSheet(null)}>
          <div className="bg-card w-full max-w-[480px] mx-auto rounded-t-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 border-b border-black/5 flex items-center justify-between shrink-0">
              <h2 className="font-heading uppercase tracking-wide text-dark text-lg">Пропуски</h2>
              <button onClick={() => setSheet(null)} className="text-muted text-2xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-3 flex flex-col gap-3">
              {absencesDetail.length === 0 && (
                <p className="font-body text-sm text-dark/40 text-center py-6">Пропусков нет ✓</p>
              )}
              {absencesDetail.map((a: any) => (
                <div key={a.lessonId} className="bg-bg rounded-2xl p-3.5 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-body text-sm text-dark font-medium">{a.subject}</p>
                      <p className="font-body text-[11px] text-muted">{format(new Date(a.datetime), 'd MMMM · HH:mm', { locale: ru })}</p>
                    </div>
                    {a.absenceRequest && (
                      <span className={`shrink-0 text-[10px] font-body px-2 py-0.5 rounded-full ${
                        a.absenceRequest.status === 'EXCUSED' ? 'bg-green-100 text-green-700' :
                        a.absenceRequest.status === 'COUNTED' ? 'bg-red-100 text-red-600' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {a.absenceRequest.status === 'EXCUSED' ? 'Уважит.' : a.absenceRequest.status === 'COUNTED' ? 'Засчитан' : 'Ожидает'}
                      </span>
                    )}
                    {!a.absenceRequest && !a.canSubmit && (
                      <span className="shrink-0 text-[10px] font-body px-2 py-0.5 rounded-full bg-red-100 text-red-600">Срок истёк</span>
                    )}
                  </div>

                  {a.canSubmit && activeAbsenceLessonId !== a.lessonId && (
                    <button
                      onClick={() => setActiveAbsenceLessonId(a.lessonId)}
                      className="text-xs font-body text-primary bg-primary/10 rounded-xl px-3 py-2 text-left"
                    >
                      Подать причину · осталось {Math.floor(a.hoursLeft)}ч {Math.round((a.hoursLeft % 1) * 60)}мин
                    </button>
                  )}

                  {activeAbsenceLessonId === a.lessonId && (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={absenceReason}
                        onChange={(e) => setAbsenceReason(e.target.value)}
                        placeholder="Опиши причину пропуска..."
                        rows={2}
                        className="w-full bg-white border border-black/10 rounded-xl p-2.5 font-body text-sm focus:outline-none focus:border-primary resize-none"
                      />
                      <button type="button" onClick={() => absenceFileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-black/10 bg-white w-full hover:border-primary transition-colors active:scale-[0.98]">
                        <Paperclip size={13} className={`shrink-0 ${absenceFiles.length > 0 ? 'text-primary' : 'text-muted'}`} />
                        <span className={`font-body text-xs ${absenceFiles.length > 0 ? 'text-primary' : 'text-dark/60'}`}>
                          {absenceFiles.length > 0 ? `${absenceFiles.length} файл(а) прикреплено` : 'Прикрепить доказательства (необязательно)'}
                        </span>
                      </button>
                      <div className="flex gap-2">
                        <button onClick={() => { setActiveAbsenceLessonId(null); setAbsenceFiles([]); }} className="flex-1 bg-bg text-dark/50 font-heading uppercase text-xs py-2 rounded-xl">Отмена</button>
                        <button onClick={() => submitAbsenceReason(a.lessonId)} disabled={!absenceReason.trim()} className="flex-1 bg-primary text-white font-heading uppercase text-xs py-2 rounded-xl disabled:opacity-50">Отправить</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Нижний лист — Несдачи ДЗ */}
      {sheet === 'hw' && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setSheet(null)}>
          <div className="bg-card w-full max-w-[480px] mx-auto rounded-t-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 border-b border-black/5 flex items-center justify-between shrink-0">
              <h2 className="font-heading uppercase tracking-wide text-dark text-lg">Несдачи ДЗ</h2>
              <button onClick={() => setSheet(null)} className="text-muted text-2xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-3 flex flex-col gap-3">
              {hwMissesDetail.length === 0 && (
                <p className="font-body text-sm text-dark/40 text-center py-6">Все домашние задания сданы ✓</p>
              )}
              {hwMissesDetail.map((h: any) => (
                <div key={h.lessonId} className="bg-bg rounded-2xl p-3.5 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-body text-sm text-dark font-medium">{h.subject}</p>
                      <p className="font-body text-[11px] text-muted">{format(new Date(h.datetime), 'd MMMM', { locale: ru })}</p>
                    </div>
                    {h.deadlinePassed
                      ? <span className="shrink-0 text-[10px] font-body px-2 py-0.5 rounded-full bg-red-100 text-red-600">Срок истёк</span>
                      : <span className="shrink-0 text-[10px] font-body px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                          До {format(new Date(h.nextLessonDatetime), 'd MMM', { locale: ru })}
                        </span>
                    }
                  </div>

                  {/* До дедлайна — кнопка сдать */}
                  {!h.deadlinePassed && (
                    <button
                      onClick={() => { setSheet(null); navigate('/schedule', { state: { openLessonId: h.lessonId } }); }}
                      className="flex items-center justify-between text-xs font-body text-primary bg-primary/10 rounded-xl px-3 py-2"
                    >
                      <span>Сдать домашнее задание</span>
                      <ChevronRight size={14} />
                    </button>
                  )}

                  {/* После дедлайна — запрос долга */}
                  {h.deadlinePassed && !h.debtRequest && activeDebtLessonId !== h.lessonId && (
                    <button
                      onClick={() => setActiveDebtLessonId(h.lessonId)}
                      className="text-xs font-body text-dark/60 bg-white border border-black/10 rounded-xl px-3 py-2 text-left"
                    >
                      Отправить запрос на возмещение долга
                    </button>
                  )}

                  {h.deadlinePassed && activeDebtLessonId === h.lessonId && (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={debtReason}
                        onChange={(e) => setDebtReason(e.target.value)}
                        placeholder="Укажи причину несдачи и обстоятельства..."
                        rows={2}
                        className="w-full bg-white border border-black/10 rounded-xl p-2.5 font-body text-sm focus:outline-none focus:border-primary resize-none"
                      />
                      <label className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-full cursor-pointer transition-colors active:scale-[0.98] ${debtHwFiles.length > 0 ? 'border-primary bg-primary/5' : 'border-black/10 bg-white'}`}>
                        <Paperclip size={13} className={`shrink-0 ${debtHwFiles.length > 0 ? 'text-primary' : 'text-muted'}`} />
                        <span className={`font-body text-xs ${debtHwFiles.length > 0 ? 'text-primary font-medium' : 'text-dark/60'}`}>
                          {debtHwFiles.length > 0 ? `ДЗ: ${debtHwFiles.length} фото прикреплено` : 'Прикрепить домашнее задание'}
                        </span>
                        <input type="file" accept="image/*" multiple className="hidden"
                          onChange={(e) => setDebtHwFiles(Array.from(e.target.files ?? []))} />
                      </label>
                      <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-black/10 bg-white w-full cursor-pointer transition-colors active:scale-[0.98]">
                        <Paperclip size={13} className={`shrink-0 ${debtFiles.length > 0 ? 'text-primary' : 'text-muted'}`} />
                        <span className={`font-body text-xs ${debtFiles.length > 0 ? 'text-primary' : 'text-dark/60'}`}>
                          {debtFiles.length > 0 ? `Справка: ${debtFiles.length} файл(а)` : 'Прикрепить справку (необязательно)'}
                        </span>
                        <input type="file" accept="image/*,application/pdf" multiple className="hidden"
                          onChange={(e) => setDebtFiles(Array.from(e.target.files ?? []))} />
                      </label>
                      <div className="flex gap-2">
                        <button onClick={() => { setActiveDebtLessonId(null); setDebtFiles([]); setDebtHwFiles([]); }} className="flex-1 bg-bg text-dark/50 font-heading uppercase text-xs py-2 rounded-xl">Отмена</button>
                        <button onClick={() => submitDebt(h.lessonId)} disabled={!debtReason.trim()} className="flex-1 bg-primary text-white font-heading uppercase text-xs py-2 rounded-xl disabled:opacity-50">Отправить</button>
                      </div>
                    </div>
                  )}

                  {h.deadlinePassed && h.debtRequest?.status === 'PENDING' && (
                    <p className="text-xs font-body text-yellow-600 bg-yellow-50 rounded-xl px-3 py-2">Запрос отправлен · ожидает решения куратора</p>
                  )}
                  {h.deadlinePassed && h.debtRequest?.status === 'REJECTED' && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-body text-red-500 bg-red-50 rounded-xl px-3 py-2">Запрос отклонён</p>
                      <button onClick={() => setActiveDebtLessonId(h.lessonId)} className="text-xs font-body text-dark/50 underline text-left">Подать снова</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, suffix, icon, warn, clickable }: {
  label: string; value: any; suffix?: string; icon?: React.ReactNode; warn?: boolean; clickable?: boolean;
}) {
  return (
    <div className={`bg-card rounded-2xl p-3.5 shadow-card h-full ${warn ? 'ring-1 ring-red-200' : ''} ${clickable ? 'active:scale-95 transition-transform' : ''}`}>
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <p className="font-body text-[9px] uppercase tracking-widest text-muted">{label}</p>
      </div>
      <p className={`font-heading text-2xl leading-none ${warn ? 'text-red-500' : 'text-dark'}`}>{value}</p>
      {suffix && <p className="font-body text-[10px] text-muted mt-0.5">{suffix}</p>}
    </div>
  );
}
