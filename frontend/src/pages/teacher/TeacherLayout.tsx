import { useState, useEffect } from 'react';
import { teacherApi, authApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Lesson } from '../../types';

interface Student { id: number; firstName: string; lastName: string; present: boolean }

export default function TeacherLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { teacherApi.lessons().then(setLessons); }, []);

  async function openLesson(lesson: Lesson) {
    setActiveLesson(lesson);
    const s = await teacherApi.lessonStudents(lesson.id);
    setStudents(s);
  }

  function toggle(studentId: number) {
    setStudents((ss) => ss.map((s) => s.id === studentId ? { ...s, present: !s.present } : s));
  }

  async function saveAttendance() {
    if (!activeLesson) return;
    setSaving(true);
    await teacherApi.saveAttendance(activeLesson.id, students.map((s) => ({ studentId: s.id, present: s.present })));
    setLessons((ls) => ls.map((l) => l.id === activeLesson.id ? { ...l, isMarked: true } : l));
    setActiveLesson(null);
    setSaving(false);
  }

  // Экран отметки посещаемости
  if (activeLesson) {
    const absent = students.filter((s) => !s.present);
    return (
      <div className="flex flex-col min-h-dvh px-4 pt-8 pb-6">
        <button onClick={() => setActiveLesson(null)} className="text-primary text-sm font-body mb-6">← Назад</button>
        <h1 className="font-heading text-xl uppercase tracking-wide text-dark">{activeLesson.subject}</h1>
        <p className="font-body text-xs text-dark/50 mb-6">{format(new Date(activeLesson.datetime), 'd MMMM · HH:mm', { locale: ru })}</p>

        <p className="font-body text-xs text-dark/50 uppercase tracking-wider mb-2">
          Студенты ({students.length}) · Отсутствует: {absent.length}
        </p>
        <div className="flex flex-col gap-2 flex-1">
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-colors ${s.present ? 'bg-card' : 'bg-red-50 border border-red-200'}`}
            >
              <span className="font-body text-sm text-dark">{s.lastName} {s.firstName}</span>
              <span className={`font-heading text-xs uppercase ${s.present ? 'text-green-500' : 'text-red-500'}`}>
                {s.present ? 'Присутствует' : 'Отсутствует'}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={saveAttendance}
          disabled={saving}
          className="mt-4 w-full bg-primary text-white font-heading uppercase tracking-wider py-3.5 rounded-xl text-sm disabled:opacity-60"
        >
          {saving ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </div>
    );
  }

  // Список уроков
  const unmarked = lessons.filter((l) => !l.isMarked);
  const marked = lessons.filter((l) => l.isMarked);

  return (
    <div className="flex flex-col min-h-dvh px-4 pt-8 pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl uppercase tracking-wide text-dark">Привет, {user?.firstName}</h1>
          <p className="font-body text-xs text-dark/50">Уроки для отметки</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={() => { logout(); navigate('/login'); }} className="text-dark/40 text-xs font-body">Выйти</button>
          {!confirmDelete
            ? <button onClick={() => setConfirmDelete(true)} className="text-red-400 text-[10px] font-body">Удалить аккаунт</button>
            : <div className="flex gap-1">
                <button onClick={() => setConfirmDelete(false)} className="text-dark/40 text-[10px] font-body">Отмена</button>
                <button onClick={async () => { await authApi.deleteAccount(); logout(); navigate('/login'); }} className="text-red-500 text-[10px] font-body font-medium">Удалить</button>
              </div>
          }
        </div>
      </div>

      {unmarked.length > 0 && (
        <div className="mb-6">
          <p className="font-body text-xs font-medium text-dark/50 uppercase tracking-wider mb-2">Нужно отметить ({unmarked.length})</p>
          <div className="flex flex-col gap-2">
            {unmarked.map((l) => (
              <LessonCard key={l.id} lesson={l} onPress={() => openLesson(l)} />
            ))}
          </div>
        </div>
      )}

      {marked.length > 0 && (
        <div>
          <p className="font-body text-xs font-medium text-dark/50 uppercase tracking-wider mb-2">Отмечено</p>
          <div className="flex flex-col gap-2">
            {marked.map((l) => (
              <LessonCard key={l.id} lesson={l} onPress={() => openLesson(l)} done />
            ))}
          </div>
        </div>
      )}

      {lessons.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-dark/40 font-body text-sm">Нет уроков для отметки</p>
        </div>
      )}
    </div>
  );
}

function LessonCard({ lesson, onPress, done }: { lesson: Lesson; onPress: () => void; done?: boolean }) {
  return (
    <button onClick={onPress} className={`bg-card rounded-2xl p-4 text-left flex items-center justify-between ${done ? 'opacity-60' : ''}`}>
      <div>
        <p className="font-heading uppercase tracking-wide text-dark">{lesson.subject}</p>
        <p className="font-body text-xs text-dark/50 mt-0.5">
          {format(new Date(lesson.datetime), 'd MMMM · HH:mm', { locale: ru })} · {lesson.groupName}
        </p>
      </div>
      {done ? (
        <span className="text-green-500 text-lg">✓</span>
      ) : (
        <span className="bg-primary text-white text-[10px] font-body px-2 py-0.5 rounded-full">Отметить</span>
      )}
    </button>
  );
}
