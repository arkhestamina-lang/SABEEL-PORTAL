import { useEffect, useState } from 'react';
import { studentApi } from '../../api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import PageError from '../../components/common/PageError';

const QUOTES = [
  { text: 'Кто пришёл на собрание знания без пера и бумаги — подобен тому, кто пришёл на мельницу без зерна.', source: 'Имам аш-Шафии' },
  { text: 'Знание — не обилие того, что ты выучил. Истинное знание — это богобоязненность.', source: 'Абдуллах ибн Масуд' },
  { text: 'Тот, кто считает, что изучение знания с рассвета до заката — не джихад, тот лишён разума.', source: 'Абу ад-Дарда' },
  { text: 'Богобоязненности достаточно для мудрости, а гордость знанием — признак невежества.', source: 'Масрук' },
  { text: 'Невозможно приобрести знание без усталости тела.', source: 'Яхья ибн Аби Касир' },
  { text: 'Тот, кто получил знание, которое не заставило его плакать — не получил от него никакой пользы.', source: 'Абд аль-Аля ат-Тайми' },
  { text: 'Ценность юноши — в его знании и богобоязненности. Без них — нет ему чести.', source: 'Имам аш-Шафии' },
  { text: 'Двое никогда не насытятся: ищущий знания и ищущий мирского.', source: 'Ибн Аббас' },
  { text: 'Тот, кто изучает знание ради Аллаха и ради вечной жизни — Аллах даст ему всё знание, в котором он нуждается.', source: 'Ибрахим ан-Нахаи' },
  { text: 'Верующий не берётся ни за какое дело, не узнав прежде, как правильно его совершить.', source: 'Ибн аль-Мубарак' },
  { text: 'Моя самая большая боязнь — что Аллах спросит меня о том, что я сделал со своим знанием.', source: 'Абу ад-Дарда' },
  { text: 'Знание существует для того, чтобы совершать благие дела.', source: 'Суфьян ас-Саури' },
];

export default function ProgressPage() {
  const [data, setData] = useState<any>(null);
  const [loadError, setLoadError] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);

  const [now, setNow] = useState(new Date());
  const [examsOpen, setExamsOpen] = useState(false);
  function load() { setLoadError(false); studentApi.progress().then(setData).catch(() => setLoadError(true)); }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  if (loadError) return <PageError onRetry={load} />;
  if (!data) return <div className="flex items-center justify-center min-h-dvh"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const { rating, rank, exams, semesterHistory = [] } = data;

  return (
    <div className="px-4 pt-8 pb-4 flex flex-col gap-5">
      <h1 className="font-heading text-2xl uppercase tracking-wide text-dark">Прогресс</h1>

      {/* Общий балл */}
      <div className="bg-card rounded-2xl p-5 flex items-center gap-5">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#EEEBE5" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none" stroke="#4A89C8" strokeWidth="3"
              strokeDasharray={`${rating.total} ${100 - rating.total}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-heading text-2xl text-dark">{rating.total}</span>
          </div>
        </div>
        <div>
          <p className="font-heading text-xl uppercase text-dark">Итоговый балл</p>
          {rank && <p className="font-body text-sm text-dark/50 mt-1">Место в группе: {rank.position} из {rank.total}</p>}
        </div>
      </div>

      {/* Разбивка */}
      <div className="bg-card rounded-2xl p-4 flex flex-col gap-3">
        <p className="font-heading uppercase tracking-wide text-sm text-dark/60">Разбивка баллов</p>
        <ScoreBar label="Посещаемость" score={rating.attendanceScore} max={40} />
        <ScoreBar label="Домашние задания" score={rating.homeworkScore} max={30} />
        <ScoreBar label="Коран" score={rating.quranScore} max={20} />
        <ScoreBar label="Привычки" score={rating.habitsScore} max={10} />
      </div>

      {/* Рейтинг по семестрам */}
      {semesterHistory.length > 0 && (
        <div className="bg-card rounded-2xl p-4 flex flex-col gap-3">
          <p className="font-heading uppercase tracking-wide text-sm text-dark/60">Рейтинг по семестрам</p>
          {semesterHistory.map((s: any) => (
            <div key={s.id}>
              <div className="flex justify-between mb-1">
                <span className="font-body text-xs text-dark/60">{s.name}</span>
                <span className="font-heading text-sm text-dark">
                  {s.total}<span className="text-dark/30 text-xs">/{s.maxTotal}</span>
                </span>
              </div>
              <div className="bg-bg rounded-full h-2 overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min((s.total / s.maxTotal) * 100, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Экзамены */}
      {exams.length > 0 && (
        <div className="bg-card rounded-2xl overflow-hidden">
          <button onClick={() => setExamsOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3.5">
            <span className="font-heading uppercase tracking-wide text-sm text-dark/60">Экзамены</span>
            <span className="font-body text-xs text-dark/40">{exams.length} · {examsOpen ? '▲' : '▼'}</span>
          </button>
          {examsOpen && (
            <div className="border-t border-black/5 px-4 pb-3 pt-1 flex flex-col gap-2">
              {exams.map((e: any) => {
                const examDate = new Date(e.date);
                let examOpen = false;
                let examPassed = false;
                if (e.startHour != null && e.durationMinutes != null) {
                  const start = new Date(examDate);
                  start.setHours(e.startHour, e.startMinute ?? 0, 0, 0);
                  const end = new Date(start.getTime() + e.durationMinutes * 60000);
                  examOpen = now >= start && now <= end;
                  examPassed = now > end;
                } else {
                  examPassed = now > examDate;
                }
                return (
                  <div key={e.id} className="py-2 border-b border-black/5 last:border-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-body text-sm text-dark">{e.title}</p>
                        <p className="font-body text-xs text-dark/40">
                          {format(examDate, 'd MMMM yyyy', { locale: ru })}
                          {e.startHour != null && ` · ${String(e.startHour).padStart(2,'0')}:${String(e.startMinute ?? 0).padStart(2,'0')}`}
                          {e.durationMinutes != null && ` · ${e.durationMinutes} мин`}
                        </p>
                      </div>
                      {e.scores[0] ? (
                        <p className="font-heading text-lg text-primary">{e.scores[0].score}<span className="text-xs text-dark/40">/{e.scores[0].maxScore}</span></p>
                      ) : examPassed ? (
                        <p className="font-body text-xs text-dark/30">Нет оценки</p>
                      ) : examOpen ? (
                        <span className="font-heading text-[10px] uppercase text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Идёт</span>
                      ) : (
                        <span className="font-body text-xs text-dark/30">Скоро</span>
                      )}
                    </div>
                    {e.formUrl && examOpen && (
                      <a href={e.formUrl} target="_blank" rel="noreferrer"
                        className="mt-2 flex items-center justify-center gap-2 bg-primary text-white font-heading uppercase text-xs py-2.5 rounded-xl">
                        Перейти к экзамену →
                      </a>
                    )}
                    {e.formUrl && !examOpen && !examPassed && e.startHour != null && (
                      <p className="font-body text-[10px] text-dark/40 mt-1">
                        Ссылка откроется в {String(e.startHour).padStart(2,'0')}:{String(e.startMinute ?? 0).padStart(2,'0')}
                      </p>
                    )}
                    {e.formUrl && examPassed && (
                      <p className="font-body text-[10px] text-dark/40 mt-1">Экзамен завершён</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Карусель цитат */}
      <div className="bg-primary/10 rounded-2xl p-4 cursor-pointer" onClick={() => setQuoteIdx((i) => (i + 1) % QUOTES.length)}>
        <p className="font-quote italic text-dark text-sm leading-relaxed">«{QUOTES[quoteIdx].text}»</p>
        <p className="font-body text-xs text-dark/50 mt-2">{QUOTES[quoteIdx].source}</p>
        <p className="font-body text-[10px] text-dark/30 mt-2">Нажми для следующей цитаты</p>
      </div>
    </div>
  );
}

function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="font-body text-xs text-dark/60">{label}</span>
        <span className="font-heading text-sm text-dark">{score}<span className="text-dark/30 text-xs">/{max}</span></span>
      </div>
      <div className="bg-bg rounded-full h-2 overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(score / max) * 100}%` }} />
      </div>
    </div>
  );
}
