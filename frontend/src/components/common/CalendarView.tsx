import { useState } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, isPast,
  format
} from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Lesson } from '../../types';

interface Props {
  lessons: Lesson[];
  onLessonPress: (lesson: Lesson) => void;
}

const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export default function CalendarView({ lessons, onLessonPress }: Props) {
  const [current, setCurrent] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  // Неделя начинается с воскресенья
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // Строим сетку дней
  const weeks: Date[][] = [];
  let day = gridStart;
  while (day <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  // Уроки сгруппированные по дате
  const lessonsByDay = new Map<string, Lesson[]>();
  for (const l of lessons) {
    const key = format(new Date(l.datetime), 'yyyy-MM-dd');
    if (!lessonsByDay.has(key)) lessonsByDay.set(key, []);
    lessonsByDay.get(key)!.push(l);
  }

  const selectedKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedLessons = selectedKey ? (lessonsByDay.get(selectedKey) ?? []) : [];

  return (
    <div className="flex flex-col gap-3">
      {/* Шапка — месяц и навигация */}
      <div className="flex items-center justify-between px-1">
        <button onClick={() => setCurrent(subMonths(current, 1))} className="w-8 h-8 flex items-center justify-center text-dark/40 text-lg">‹</button>
        <p className="font-heading uppercase tracking-wide text-dark text-base">
          {format(current, 'LLLL yyyy', { locale: ru })}
        </p>
        <button onClick={() => setCurrent(addMonths(current, 1))} className="w-8 h-8 flex items-center justify-center text-dark/40 text-lg">›</button>
      </div>

      {/* Дни недели */}
      <div className="grid grid-cols-7 text-center mb-1">
        {DAY_LABELS.map((d) => (
          <p key={d} className="font-body text-[10px] text-dark/40 uppercase">{d}</p>
        ))}
      </div>

      {/* Сетка */}
      <div className="flex flex-col gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((d) => {
              const key = format(d, 'yyyy-MM-dd');
              const dayLessons = lessonsByDay.get(key) ?? [];
              const inMonth = isSameMonth(d, current);
              const selected = selectedDay ? isSameDay(d, selectedDay) : false;
              const today = isToday(d);
              const hasPast = dayLessons.some((l) => isPast(new Date(l.datetime)));
              const hasFuture = dayLessons.some((l) => !isPast(new Date(l.datetime)));

              return (
                <button
                  key={key}
                  onClick={() => { setSelectedDay(d); }}
                  className={`
                    relative flex flex-col items-center py-1.5 rounded-xl transition-colors
                    ${selected ? 'bg-primary text-white' : today ? 'bg-primary/10' : 'bg-transparent'}
                    ${!inMonth ? 'opacity-30' : ''}
                  `}
                >
                  <span className={`font-body text-sm ${selected ? 'text-white font-medium' : today ? 'text-primary font-medium' : 'text-dark'}`}>
                    {format(d, 'd')}
                  </span>
                  {/* Точки уроков */}
                  {dayLessons.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasPast && <span className={`w-1 h-1 rounded-full ${selected ? 'bg-white/70' : 'bg-primary'}`} />}
                      {hasFuture && <span className={`w-1 h-1 rounded-full ${selected ? 'bg-white/50' : 'bg-primary/40'}`} />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Уроки выбранного дня */}
      {selectedDay && (
        <div className="mt-1">
          <p className="font-body text-xs text-dark/50 uppercase tracking-wider mb-2 px-1">
            {format(selectedDay, 'EEEE, d MMMM', { locale: ru })}
          </p>

          {selectedLessons.length === 0 ? (
            <div className="bg-card rounded-2xl px-4 py-6 text-center">
              <p className="font-body text-sm text-dark/40">Уроков нет</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedLessons
                .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
                .map((l) => (
                  <LessonCard key={l.id} lesson={l} onPress={() => onLessonPress(l)} />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LessonCard({ lesson, onPress }: { lesson: Lesson; onPress: () => void }) {
  const past = isPast(new Date(lesson.datetime));
  return (
    <button onClick={onPress} className="bg-card rounded-2xl px-4 py-3 text-left flex items-center justify-between">
      <div>
        <p className="font-heading uppercase tracking-wide text-dark">{lesson.subject}</p>
        <p className="font-body text-xs text-dark/50 mt-0.5">{format(new Date(lesson.datetime), 'HH:mm')}</p>
      </div>
      <div className="flex items-center gap-2">
        {lesson.isCancelled && <span className="text-[10px] font-body text-dark/40 bg-bg px-2 py-0.5 rounded-full">Отменён</span>}
        {lesson.isExtra && !lesson.isCancelled && <span className="text-[10px] font-body text-primary bg-primary/10 px-2 py-0.5 rounded-full">Доп.</span>}
        {past && !lesson.isCancelled && (
          <span className={`text-[10px] font-body px-2 py-0.5 rounded-full ${
            (lesson as any).isMarked ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {(lesson as any).isMarked ? 'Отмечено' : 'Не отмечено'}
          </span>
        )}
        {!past && !lesson.isCancelled && (
          <span className="text-[10px] font-body text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full">Предстоит</span>
        )}
      </div>
    </button>
  );
}
