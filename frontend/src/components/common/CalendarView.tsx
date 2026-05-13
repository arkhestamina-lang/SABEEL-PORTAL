import { useState } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, isPast, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import type { Lesson } from '../../types';

interface Props { lessons: Lesson[]; onLessonPress: (lesson: Lesson) => void }
const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export default function CalendarView({ lessons, onLessonPress }: Props) {
  const [current, setCurrent] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const weeks: Date[][] = [];
  let day = gridStart;
  while (day <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) { week.push(day); day = addDays(day, 1); }
    weeks.push(week);
  }

  const lessonsByDay = new Map<string, Lesson[]>();
  for (const l of lessons) {
    const key = format(new Date(l.datetime), 'yyyy-MM-dd');
    if (!lessonsByDay.has(key)) lessonsByDay.set(key, []);
    lessonsByDay.get(key)!.push(l);
  }

  const selectedKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedLessons = (selectedKey ? (lessonsByDay.get(selectedKey) ?? []) : [])
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  return (
    <div className="flex flex-col gap-4">
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrent(subMonths(current, 1))} className="w-8 h-8 rounded-xl bg-card flex items-center justify-center shadow-card hover:shadow-float active:scale-95">
          <ChevronLeft size={16} className="text-muted" />
        </button>
        <p className="font-heading uppercase tracking-wide text-dark text-sm">
          {format(current, 'LLLL yyyy', { locale: ru })}
        </p>
        <button onClick={() => setCurrent(addMonths(current, 1))} className="w-8 h-8 rounded-xl bg-card flex items-center justify-center shadow-card hover:shadow-float active:scale-95">
          <ChevronRight size={16} className="text-muted" />
        </button>
      </div>

      {/* Дни недели */}
      <div className="grid grid-cols-7 text-center">
        {DAY_LABELS.map((d) => (
          <p key={d} className="font-body text-[9px] uppercase tracking-widest text-muted">{d}</p>
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
                <button key={key} onClick={() => setSelectedDay(d)}
                  className={`flex flex-col items-center py-1.5 rounded-xl transition-all active:scale-95
                    ${selected ? 'bg-primary' : today ? 'bg-primary/8' : ''}
                    ${!inMonth ? 'opacity-25' : ''}
                  `}
                >
                  <span className={`font-body text-sm leading-none ${selected ? 'text-white font-semibold' : today ? 'text-primary font-semibold' : 'text-dark'}`}>
                    {format(d, 'd')}
                  </span>
                  {dayLessons.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {hasPast && <span className={`w-1 h-1 rounded-full ${selected ? 'bg-white/80' : 'bg-primary'}`} />}
                      {hasFuture && <span className={`w-1 h-1 rounded-full ${selected ? 'bg-white/50' : 'bg-primary/30'}`} />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Уроки дня */}
      {selectedDay && (
        <div>
          <p className="font-body text-[11px] uppercase tracking-widest text-muted mb-2.5">
            {format(selectedDay, 'EEEE, d MMMM', { locale: ru })}
          </p>
          {selectedLessons.length === 0 ? (
            <div className="bg-card rounded-2xl px-4 py-6 text-center shadow-card">
              <p className="font-body text-sm text-muted">Уроков нет</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedLessons.map((l) => <LessonCard key={l.id} lesson={l} onPress={() => onLessonPress(l)} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LessonCard({ lesson, onPress }: { lesson: Lesson; onPress: () => void }) {
  const past = isPast(new Date(lesson.datetime));
  const marked = (lesson as any).isMarked;
  return (
    <button onClick={onPress} className="bg-card rounded-2xl px-4 py-3.5 text-left flex items-center gap-3 shadow-card hover:shadow-float active:scale-[0.98]">
      <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${past ? (marked ? 'bg-green-400' : 'bg-yellow-400') : 'bg-primary/30'}`} />
      <div className="flex-1 min-w-0">
        <p className="font-heading uppercase tracking-wide text-dark text-sm">{lesson.subject}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Clock size={10} className="text-muted" />
          <p className="font-body text-[11px] text-muted">{format(new Date(lesson.datetime), 'HH:mm')}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {lesson.isCancelled && <Tag label="Отменён" color="gray" />}
        {lesson.isExtra && !lesson.isCancelled && <Tag label="Доп." color="blue" />}
        {!lesson.isCancelled && past && <Tag label={marked ? 'Отмечено' : 'Не отмечено'} color={marked ? 'green' : 'yellow'} />}
        {!lesson.isCancelled && !past && <Tag label="Предстоит" color="blue" />}
      </div>
    </button>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  const c: Record<string, string> = {
    gray:   'bg-bg text-muted',
    blue:   'bg-primary/10 text-primary',
    green:  'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };
  return <span className={`font-body text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-lg ${c[color]}`}>{label}</span>;
}
