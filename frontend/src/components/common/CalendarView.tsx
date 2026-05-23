import { useState } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, isPast, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import type { Lesson } from '../../types';

interface Props {
  lessons: Lesson[];
  onLessonPress: (lesson: Lesson) => void;
  onCancelLesson?: (lesson: Lesson) => void;
  onRescheduleLesson?: (lesson: Lesson) => void;
}
const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export default function CalendarView({ lessons, onLessonPress, onCancelLesson, onRescheduleLesson }: Props) {
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

  // Режим студента — если в уроках есть поле attended
  const isStudentMode = lessons.some((l) => 'attended' in l);

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

              // Проблемные дни (только в режиме студента)
              const hasAbsence = isStudentMode && dayLessons.some((l) =>
                l.attended === false && !l.isCancelled
              );
              const hasMissingHw = isStudentMode && dayLessons.some((l) =>
                l.isPast && l.hwSubmitted === false && !l.isCancelled
              );
              const hasIssue = hasAbsence || hasMissingHw;

              return (
                <button key={key} onClick={() => setSelectedDay(d)}
                  className={`flex flex-col items-center py-1.5 rounded-xl transition-all active:scale-95
                    ${selected ? (hasIssue ? 'bg-red-500' : 'bg-primary') : today ? 'bg-primary/8' : ''}
                    ${!inMonth ? 'opacity-25' : ''}
                  `}
                >
                  <span className={`font-body text-sm leading-none ${
                    selected ? 'text-white font-semibold'
                    : today ? 'text-primary font-semibold'
                    : hasIssue ? 'text-red-500 font-semibold'
                    : 'text-dark'
                  }`}>
                    {format(d, 'd')}
                  </span>
                  {dayLessons.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {hasPast && (
                        <span className={`w-1 h-1 rounded-full ${
                          selected ? 'bg-white/80'
                          : hasIssue ? 'bg-red-400'
                          : 'bg-primary'
                        }`} />
                      )}
                      {hasFuture && (
                        <span className={`w-1 h-1 rounded-full ${selected ? 'bg-white/50' : 'bg-primary/30'}`} />
                      )}
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
              {selectedLessons.map((l) => (
                <LessonCard
                  key={l.id}
                  lesson={l}
                  isStudentMode={isStudentMode}
                  onPress={() => onLessonPress(l)}
                  onCancel={onCancelLesson && !l.isCancelled ? () => onCancelLesson(l) : undefined}
                  onReschedule={onRescheduleLesson && !l.isCancelled ? () => onRescheduleLesson(l) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LessonCard({ lesson, isStudentMode, onPress, onCancel, onReschedule }: {
  lesson: Lesson; isStudentMode: boolean; onPress: () => void;
  onCancel?: () => void; onReschedule?: () => void;
}) {
  const past = isPast(new Date(lesson.datetime));
  const marked = (lesson as any).isMarked;

  // Левая полоска: цвет по статусу
  let barColor = 'bg-primary/30'; // будущий
  if (past && !lesson.isCancelled) {
    if (isStudentMode) {
      const hasAbsence = lesson.attended === false;
      const hasMissingHw = lesson.hwSubmitted === false;
      if (hasAbsence || hasMissingHw) barColor = 'bg-red-400';
      else if (lesson.attended === null) barColor = 'bg-yellow-400';
      else barColor = 'bg-green-400';
    } else {
      barColor = marked ? 'bg-green-400' : 'bg-yellow-400';
    }
  }

  return (
    <div className="bg-card rounded-2xl shadow-card overflow-hidden">
      <button onClick={onPress} className="w-full px-4 py-3 text-left flex items-center gap-3 hover:shadow-float active:scale-[0.98]">
        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${barColor}`} />
        <div className="flex-1 min-w-0">
          <p className={`font-heading uppercase tracking-wide text-sm ${lesson.isCancelled ? 'line-through text-dark/30' : 'text-dark'}`}>{lesson.subject}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock size={10} className="text-muted" />
            <p className="font-body text-[11px] text-muted">{format(new Date(lesson.datetime), 'HH:mm')}</p>
          </div>

          {/* Статусы для студента */}
          {isStudentMode && past && !lesson.isCancelled && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {lesson.attended === true && <StatusBadge label="Присутствовал" color="green" />}
              {lesson.attended === false && (
                <StatusBadge
                  label={lesson.absenceStatus === 'EXCUSED' ? 'Пропуск уважит.' : lesson.absenceStatus === 'COUNTED' ? 'Пропуск засчитан' : 'Отсутствовал'}
                  color={lesson.absenceStatus === 'EXCUSED' ? 'green' : 'red'}
                />
              )}
              {lesson.attended === null && <StatusBadge label="Посещ. не отмечена" color="yellow" />}
              {lesson.hwSubmitted === true && <StatusBadge label="ДЗ сдано" color="green" />}
              {lesson.hwSubmitted === false && <StatusBadge label="ДЗ не сдано" color="red" />}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {lesson.isCancelled && <Tag label="Отменён" color="gray" />}
          {lesson.isExtra && !lesson.isCancelled && <Tag label="Доп." color="blue" />}
          {!isStudentMode && !lesson.isCancelled && past && (
            <Tag label={marked ? 'Отмечено' : 'Не отмечено'} color={marked ? 'green' : 'yellow'} />
          )}
          {!lesson.isCancelled && !past && <Tag label="Предстоит" color="blue" />}
        </div>
      </button>

      {/* Кнопки куратора */}
      {(onCancel || onReschedule) && (
        <div className="flex border-t border-black/5">
          {onReschedule && (
            <button onClick={onReschedule}
              className="flex-1 py-2 font-body text-xs text-primary hover:bg-primary/5 transition-colors">
              Перенести
            </button>
          )}
          {onCancel && (
            <button onClick={() => { if (confirm('Отменить этот урок?')) onCancel(); }}
              className={`flex-1 py-2 font-body text-xs text-red-500 hover:bg-red-50 transition-colors ${onReschedule ? 'border-l border-black/5' : ''}`}>
              Отменить
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  const c: Record<string, string> = {
    green:  'text-green-600',
    red:    'text-red-500',
    yellow: 'text-yellow-600',
  };
  return (
    <span className={`font-body text-[10px] ${c[color]}`}>{label}</span>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  const c: Record<string, string> = {
    gray:   'bg-bg text-muted',
    blue:   'bg-primary/10 text-primary',
    green:  'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red:    'bg-red-50 text-red-500',
  };
  return <span className={`font-body text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-lg ${c[color]}`}>{label}</span>;
}
