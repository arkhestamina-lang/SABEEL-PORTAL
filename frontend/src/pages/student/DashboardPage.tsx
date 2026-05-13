import { useEffect, useState } from 'react';
import { studentApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { format, startOfWeek, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';

const QURAN_NORM: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3 };
const QUOTES = [
  { text: 'Поистине, после трудности — облегчение.', source: 'Коран, 94:5' },
  { text: 'Лучший из вас тот, кто изучает Коран и обучает ему других.', source: 'Бухари' },
  { text: 'Знание — свет, а невежество — тьма.', source: 'Хадис' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [quranInput, setQuranInput] = useState('');
  const [saving, setSaving] = useState(false);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  useEffect(() => {
    studentApi.dashboard().then(setData);
  }, []);

  const norm = QURAN_NORM[user?.course ?? 1];
  const quranPages = data?.quranEntry?.pagesCompleted ?? 0;

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

  if (!data) return <div className="flex items-center justify-center min-h-dvh"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const { rating, streak } = data;

  return (
    <div className="px-4 pt-8 pb-4 flex flex-col gap-4">
      {/* Приветствие */}
      <div>
        <p className="font-body text-[10px] text-dark/40 uppercase tracking-widest">Sabeel University Portal</p>
      <p className="font-body text-sm text-dark/50 mt-2">Ассаляму алейкум,</p>
        <h1 className="font-heading text-2xl uppercase tracking-wide text-dark">{user?.firstName}</h1>
      </div>

      {/* Streak + счётчики */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Streak" value={`${streak}🔥`} sub="дней подряд" />
        <StatCard label="Пропуски" value={rating.countedAbsences} sub="из 5 в месяц" warn={rating.countedAbsences >= 4} />
        <StatCard label="Несдачи ДЗ" value={rating.hwMisses} sub="из 5 в месяц" warn={rating.hwMisses >= 4} />
      </div>

      {/* Коран */}
      {norm > 0 && (
        <div className="bg-card rounded-2xl p-4">
          <p className="font-heading uppercase tracking-wide text-sm text-dark/60">Коран на этой неделе</p>
          <p className="font-heading text-2xl mt-1">{quranPages} <span className="text-base text-dark/40">/ {norm} стр.</span></p>
          <div className="mt-2 bg-bg rounded-full h-2 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min((quranPages / norm) * 100, 100)}%` }} />
          </div>
          <div className="flex gap-2 mt-3">
            <input
              type="number"
              min={0}
              value={quranInput}
              onChange={(e) => setQuranInput(e.target.value)}
              placeholder="Страниц..."
              className="flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 text-sm font-body focus:outline-none focus:border-primary"
            />
            <button onClick={saveQuran} disabled={saving} className="bg-primary text-white font-heading uppercase text-xs px-4 py-2 rounded-xl disabled:opacity-60">
              {saving ? '...' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}

      {/* Привычки */}
      <div className="bg-card rounded-2xl p-4">
        <p className="font-heading uppercase tracking-wide text-sm text-dark/60 mb-3">Привычки этой недели</p>
        <div className="flex justify-between">
          {weekDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const entry = data.habits?.find((h: any) => h.date.slice(0, 10) === key);
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const isFuture = day > new Date();
            return (
              <div key={key} className="flex flex-col items-center gap-1">
                <span className={`text-[10px] font-body ${isToday ? 'text-primary font-medium' : 'text-dark/40'}`}>
                  {format(day, 'EE', { locale: ru }).slice(0, 2)}
                </span>
                <button
                  disabled={isFuture}
                  onClick={() => !isFuture && saveHabit(key, 'reading', !(entry?.reading))}
                  className={`w-7 h-7 rounded-full text-xs transition-colors ${entry?.reading ? 'bg-primary text-white' : 'bg-bg text-dark/30'} disabled:cursor-not-allowed`}
                  title="Чтение"
                >Ч</button>
                <button
                  disabled={isFuture}
                  onClick={() => !isFuture && saveHabit(key, 'listening', !(entry?.listening))}
                  className={`w-7 h-7 rounded-full text-xs transition-colors ${entry?.listening ? 'bg-primary text-white' : 'bg-bg text-dark/30'} disabled:cursor-not-allowed`}
                  title="Аудирование"
                >А</button>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] font-body text-dark/40 mt-2">Ч — чтение &nbsp;·&nbsp; А — аудирование</p>
      </div>

      {/* Цитата */}
      <div className="bg-primary/10 rounded-2xl p-4 mt-1">
        <p className="font-quote italic text-dark text-sm leading-relaxed">«{quote.text}»</p>
        <p className="font-body text-xs text-dark/50 mt-2">{quote.source}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, warn }: { label: string; value: any; sub: string; warn?: boolean }) {
  return (
    <div className={`bg-card rounded-2xl p-3 ${warn ? 'border border-red-300' : ''}`}>
      <p className="font-body text-[10px] text-dark/50 uppercase tracking-wider">{label}</p>
      <p className={`font-heading text-xl mt-0.5 ${warn ? 'text-red-500' : 'text-dark'}`}>{value}</p>
      <p className="font-body text-[10px] text-dark/40">{sub}</p>
    </div>
  );
}
