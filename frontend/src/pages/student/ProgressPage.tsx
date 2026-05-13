import { useEffect, useState } from 'react';
import { studentApi } from '../../api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

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
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => { studentApi.progress().then(setData); }, []);

  if (!data) return <div className="flex items-center justify-center min-h-dvh"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const { rating, rank, history, exams } = data;

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

      {/* График по месяцам */}
      <div className="bg-card rounded-2xl p-4">
        <p className="font-heading uppercase tracking-wide text-sm text-dark/60 mb-3">Динамика</p>
        <div className="flex items-end gap-2 h-20">
          {history.map((h: any, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-primary rounded-t-md transition-all"
                style={{ height: `${(h.total / 100) * 72}px`, opacity: i === history.length - 1 ? 1 : 0.5 }}
              />
              <span className="text-[9px] font-body text-dark/40">
                {format(new Date(h.year, h.month - 1), 'MMM', { locale: ru })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Экзамены */}
      {exams.length > 0 && (
        <div className="bg-card rounded-2xl p-4">
          <p className="font-heading uppercase tracking-wide text-sm text-dark/60 mb-3">Экзамены</p>
          <div className="flex flex-col gap-2">
            {exams.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
                <div>
                  <p className="font-body text-sm text-dark">{e.title}</p>
                  <p className="font-body text-xs text-dark/40">{format(new Date(e.date), 'd MMMM yyyy', { locale: ru })}</p>
                </div>
                {e.scores[0] ? (
                  <p className="font-heading text-lg text-primary">{e.scores[0].score}<span className="text-xs text-dark/40">/{e.scores[0].maxScore}</span></p>
                ) : (
                  <p className="font-body text-xs text-dark/30">Нет оценки</p>
                )}
              </div>
            ))}
          </div>
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
