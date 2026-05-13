import { useEffect, useState } from 'react';
import { starostaApi } from '../../api';
import { format, isPast } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CheckCircle2, Circle, Star } from 'lucide-react';

interface Lesson { id: number; subject: string; datetime: string; isExtra: boolean; isMarked: boolean }
interface Student { id: number; firstName: string; lastName: string; present: boolean }

export default function StarostaPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { starostaApi.lessons().then(setLessons); }, []);

  async function openLesson(lesson: Lesson) {
    setActiveLesson(lesson);
    const s = await starostaApi.lessonStudents(lesson.id);
    setStudents(s);
  }

  function toggle(studentId: number) {
    setStudents((ss) => ss.map((s) => s.id === studentId ? { ...s, present: !s.present } : s));
  }

  async function save() {
    if (!activeLesson) return;
    setSaving(true);
    await starostaApi.saveAttendance(activeLesson.id, students.map((s) => ({ studentId: s.id, present: s.present })));
    setLessons((ls) => ls.map((l) => l.id === activeLesson.id ? { ...l, isMarked: true } : l));
    setActiveLesson(null);
    setSaving(false);
  }

  // Экран отметки
  if (activeLesson) {
    const absentCount = students.filter((s) => !s.present).length;
    return (
      <div className="px-4 pt-8 pb-6 flex flex-col min-h-dvh">
        <button onClick={() => setActiveLesson(null)} className="text-primary text-sm font-body mb-6">← Назад</button>
        <div className="mb-4">
          <h1 className="font-heading text-xl uppercase tracking-wide text-dark">{activeLesson.subject}</h1>
          <p className="font-body text-xs text-muted mt-0.5">
            {format(new Date(activeLesson.datetime), 'd MMMM · HH:mm', { locale: ru })}
          </p>
          <p className="font-body text-xs text-muted mt-1">Отсутствует: {absentCount} из {students.length}</p>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all shadow-card active:scale-[0.98] ${
                s.present ? 'bg-card' : 'bg-red-50 border border-red-100'
              }`}
            >
              {s.present
                ? <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                : <Circle size={18} className="text-red-400 flex-shrink-0" />
              }
              <span className="font-body text-sm text-dark">{s.lastName} {s.firstName}</span>
              <span className={`ml-auto font-body text-[11px] ${s.present ? 'text-green-500' : 'text-red-400'}`}>
                {s.present ? 'Присутствует' : 'Отсутствует'}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-4 w-full bg-primary text-white font-heading uppercase tracking-wider py-4 rounded-2xl shadow-blue disabled:opacity-60 active:scale-[0.98]"
        >
          {saving ? 'Сохраняем...' : 'Сохранить посещаемость'}
        </button>
      </div>
    );
  }

  // Список уроков
  const unmarked = lessons.filter((l) => !l.isMarked && isPast(new Date(l.datetime)));
  const marked = lessons.filter((l) => l.isMarked);
  const upcoming = lessons.filter((l) => !isPast(new Date(l.datetime)));

  return (
    <div className="px-4 pt-8 pb-4 flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2">
          <Star size={16} className="fill-yellow-400 text-yellow-400" />
          <p className="font-body text-[10px] tracking-[0.2em] uppercase text-muted">Права старосты</p>
        </div>
        <h1 className="font-heading text-2xl uppercase tracking-wide text-dark mt-1">Посещаемость</h1>
        <div className="w-8 h-0.5 bg-primary mt-2" />
      </div>

      {unmarked.length > 0 && (
        <div>
          <p className="font-body text-[11px] uppercase tracking-widest text-muted mb-2">
            Нужно отметить ({unmarked.length})
          </p>
          <div className="flex flex-col gap-2">
            {unmarked.map((l) => <LessonCard key={l.id} lesson={l} onPress={() => openLesson(l)} pending />)}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <p className="font-body text-[11px] uppercase tracking-widest text-muted mb-2">Предстоящие</p>
          <div className="flex flex-col gap-2">
            {upcoming.slice(0, 5).map((l) => <LessonCard key={l.id} lesson={l} onPress={() => {}} />)}
          </div>
        </div>
      )}

      {marked.length > 0 && (
        <div>
          <p className="font-body text-[11px] uppercase tracking-widest text-muted mb-2">Отмечено</p>
          <div className="flex flex-col gap-2">
            {marked.slice(0, 10).map((l) => <LessonCard key={l.id} lesson={l} onPress={() => openLesson(l)} done />)}
          </div>
        </div>
      )}

      {lessons.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="font-body text-sm text-muted">Нет уроков</p>
        </div>
      )}
    </div>
  );
}

function LessonCard({ lesson, onPress, done, pending }: {
  lesson: Lesson; onPress: () => void; done?: boolean; pending?: boolean;
}) {
  return (
    <button
      onClick={onPress}
      className={`bg-card rounded-2xl px-4 py-3.5 text-left flex items-center gap-3 shadow-card active:scale-[0.98] ${done ? 'opacity-60' : ''}`}
    >
      <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${pending ? 'bg-yellow-400' : done ? 'bg-green-400' : 'bg-primary/30'}`} />
      <div className="flex-1 min-w-0">
        <p className="font-heading uppercase tracking-wide text-dark text-sm">{lesson.subject}</p>
        <p className="font-body text-[11px] text-muted mt-0.5">
          {format(new Date(lesson.datetime), 'd MMMM · HH:mm', { locale: ru })}
        </p>
      </div>
      {pending && <span className="text-[10px] font-body bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-lg">Отметить</span>}
      {done && <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />}
    </button>
  );
}
