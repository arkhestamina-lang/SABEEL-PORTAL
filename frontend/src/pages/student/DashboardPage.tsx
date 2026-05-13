import { useEffect, useState } from 'react';
import { studentApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { format, startOfWeek, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Flame, BookOpen, Headphones } from 'lucide-react';

const QURAN_NORM: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3 };
const QUOTES = [
  { text: 'Поистине, после трудности — облегчение.', source: 'Коран, 94:5' },
  { text: 'Лучший из вас тот, кто изучает Коран и обучает ему других.', source: 'Бухари' },
  { text: 'Знание — свет, а невежество — тьма.', source: 'Хадис' },
  { text: 'Тому, кто встал на путь знания, Аллах облегчает путь в Рай.', source: 'Муслим' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [quranInput, setQuranInput] = useState('');
  const [saving, setSaving] = useState(false);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const quote = QUOTES[new Date().getDay() % QUOTES.length];
  const norm = QURAN_NORM[user?.course ?? 1];
  const quranPages = data?.quranEntry?.pagesCompleted ?? 0;

  useEffect(() => { studentApi.dashboard().then(setData); }, []);

  async function saveHabit(date: string, field: 'reading' | 'listening', value: boolean) {
    const existing = data?.habits?.find((h: any) => h.date.slice(0, 10) === date) ?? {};
    const updated = { ...existing, [field]: value };
    await studentApi.saveHabits(date, updated.reading ?? false, updated.listening ?? false);
    setData((d: any) => ({
      ...d,
      habits: d.habits.some((h: any) => h.date.slice(0, 10) === date)
        ? d.habits.map((h: any) => h.date.slice(0, 10) === date ? { ...h, [field]: value } : h)
        : [...(d.habits ?? []), { date, reading: false, listening: false, [field]: value }],
    }));
  }

  async function saveQuran() {
    const pages = parseInt(quranInput);
    if (isNaN(pages)) return;
    setSaving(true);
    const ws = format(weekStart, 'yyyy-MM-dd');
    await studentApi.saveQuran(ws, pages);
    setData((d: any) => ({ ...d, quranEntry: { weekStart: ws, pagesCompleted: pages } }));
    setQuranInput('');
    setSaving(false);
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { rating, streak } = data;

  return (
    <div className="px-4 pt-8 pb-4 flex flex-col gap-5">
      {/* Приветствие */}
      <div className="fade-up">
        <p className="font-body text-[10px] tracking-[0.2em] uppercase text-muted">Sabeel University Portal</p>
        <h1 className="font-heading text-3xl uppercase tracking-wide text-dark mt-1">
          {user?.firstName}
        </h1>
      </div>

      {/* Streak + счётчики */}
      <div className="grid grid-cols-3 gap-2.5 fade-up">
        <StatCard
          label="Streak"
          value={streak}
          suffix="дней"
          icon={<Flame size={16} className="text-orange-400" />}
        />
        <StatCard
          label="Пропуски"
          value={rating.countedAbsences}
          suffix="/ 5"
          warn={rating.countedAbsences >= 4}
        />
        <StatCard
          label="Несдачи"
          value={rating.hwMisses}
          suffix="/ 5"
          warn={rating.hwMisses >= 4}
        />
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

      {/* Коран */}
      {norm > 0 && (
        <div className="bg-card rounded-2xl p-4 shadow-card fade-up">
          <div className="flex items-center justify-between mb-2">
            <p className="font-body text-[11px] uppercase tracking-widest text-muted">Коран — неделя</p>
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
              placeholder="Страниц за эту неделю"
              className="flex-1 bg-bg border border-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-primary"
            />
            <button
              onClick={saveQuran} disabled={saving || !quranInput}
              className="bg-primary text-white font-heading uppercase text-xs px-4 rounded-xl disabled:opacity-50 hover:bg-primary/90"
            >
              {saving ? '...' : 'OK'}
            </button>
          </div>
        </div>
      )}

      {/* Привычки */}
      <div className="bg-card rounded-2xl p-4 shadow-card fade-up">
        <p className="font-body text-[11px] uppercase tracking-widest text-muted mb-4">Привычки недели</p>
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
                <button
                  disabled={isFuture}
                  onClick={() => !isFuture && saveHabit(key, 'reading', !entry?.reading)}
                  title="Чтение"
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${entry?.reading ? 'bg-primary text-white' : 'bg-bg text-muted'} disabled:opacity-30`}
                >
                  <BookOpen size={13} />
                </button>
                <button
                  disabled={isFuture}
                  onClick={() => !isFuture && saveHabit(key, 'listening', !entry?.listening)}
                  title="Аудирование"
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${entry?.listening ? 'bg-primary text-white' : 'bg-bg text-muted'} disabled:opacity-30`}
                >
                  <Headphones size={13} />
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 justify-center">
          <span className="flex items-center gap-1 font-body text-[10px] text-muted"><BookOpen size={11} /> Чтение</span>
          <span className="flex items-center gap-1 font-body text-[10px] text-muted"><Headphones size={11} /> Аудирование</span>
        </div>
      </div>

      {/* Цитата */}
      <div className="border border-border rounded-2xl p-4 fade-up">
        <p className="font-quote italic text-dark text-sm leading-relaxed">«{quote.text}»</p>
        <p className="font-body text-[11px] text-muted mt-2">{quote.source}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, suffix, icon, warn }: {
  label: string; value: any; suffix?: string; icon?: React.ReactNode; warn?: boolean;
}) {
  return (
    <div className={`bg-card rounded-2xl p-3.5 shadow-card ${warn ? 'ring-1 ring-red-200' : ''}`}>
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <p className="font-body text-[9px] uppercase tracking-widest text-muted">{label}</p>
      </div>
      <p className={`font-heading text-2xl leading-none ${warn ? 'text-red-500' : 'text-dark'}`}>{value}</p>
      {suffix && <p className="font-body text-[10px] text-muted mt-0.5">{suffix}</p>}
    </div>
  );
}
