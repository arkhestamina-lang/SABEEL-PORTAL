import { useEffect, useState } from 'react';
import { curatorApi } from '../../api';
import { format, isPast } from 'date-fns';
import { ru } from 'date-fns/locale';
import CalendarView from '../../components/common/CalendarView';
import type { Lesson } from '../../types';

interface Group { id: number; name: string; course: number }
interface Student { id: number; firstName: string; lastName: string; present: boolean }
interface HwStudent { id: number; firstName: string; lastName: string; submitted: boolean }
interface HwPhoto { id: number; url: string; studentName: string; createdAt: string }

export default function AttendancePage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [hwStudents, setHwStudents] = useState<HwStudent[]>([]);
  const [hwPhotos, setHwPhotos] = useState<HwPhoto[]>([]);
  const [tab, setTab] = useState<'attendance' | 'homework'>('attendance');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    curatorApi.groups().then((gs: Group[]) => {
      setGroups(gs);
      if (gs.length > 0) loadGroup(gs[0]);
    });
  }, []);

  async function loadGroup(group: Group) {
    setSelectedGroup(group);
    setSelectedLesson(null);
    const all = await curatorApi.groupSchedule(group.id);
    setLessons(all);
  }

  async function openLesson(lesson: Lesson) {
    setSelectedLesson(lesson);
    setTab('attendance');
    const [s, hw, photos] = await Promise.all([
      curatorApi.lessonStudents(lesson.id),
      curatorApi.hwSubmissions(lesson.id),
      curatorApi.hwPhotos(lesson.id),
    ]);
    setStudents(s);
    setHwStudents(hw);
    setHwPhotos(photos);
  }

  function toggle(studentId: number) {
    setStudents((ss) => ss.map((s) => s.id === studentId ? { ...s, present: !s.present } : s));
  }

  async function saveAttendance() {
    if (!selectedLesson) return;
    setSaving(true);
    await curatorApi.saveAttendance(selectedLesson.id, students.map((s) => ({ studentId: s.id, present: s.present })));
    setLessons((ls) => ls.map((l) => l.id === selectedLesson.id ? { ...l, isMarked: true } : l));
    setSelectedLesson(null);
    setSaving(false);
  }

  // Экран отметки урока
  if (selectedLesson) {
    const past = isPast(new Date(selectedLesson.datetime));
    const absentCount = students.filter((s) => !s.present).length;

    return (
      <div className="flex flex-col min-h-dvh px-4 pt-8 pb-6">
        <button onClick={() => setSelectedLesson(null)} className="text-primary text-sm font-body mb-4">← Расписание</button>

        <div className="mb-4">
          <p className="font-body text-xs text-primary font-medium">{selectedGroup?.name}</p>
          <h1 className="font-heading text-xl uppercase tracking-wide text-dark">{selectedLesson.subject}</h1>
          <p className="font-body text-xs text-dark/50">{format(new Date(selectedLesson.datetime), 'd MMMM · HH:mm', { locale: ru })}</p>
        </div>

        {!past ? (
          <div className="bg-card rounded-2xl p-5 text-center">
            <p className="font-body text-sm text-dark/50">Урок ещё не прошёл</p>
            <p className="font-body text-xs text-dark/30 mt-1">Посещаемость можно отметить после урока</p>
          </div>
        ) : (
          <>
            {/* Вкладки */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setTab('attendance')}
                className={`flex-1 py-2 rounded-xl text-xs font-heading uppercase tracking-wide transition-colors ${tab === 'attendance' ? 'bg-primary text-white' : 'bg-card text-dark/50'}`}>
                Посещаемость
              </button>
              <button onClick={() => setTab('homework')}
                className={`flex-1 py-2 rounded-xl text-xs font-heading uppercase tracking-wide transition-colors ${tab === 'homework' ? 'bg-primary text-white' : 'bg-card text-dark/50'}`}>
                ДЗ ({hwStudents.filter(s => s.submitted).length}/{hwStudents.length})
              </button>
            </div>

            {tab === 'attendance' && (
              <>
                <p className="font-body text-xs text-dark/50 uppercase tracking-wider mb-2">
                  Всего: {students.length} · Отсутствует: {absentCount}
                </p>
                <div className="flex flex-col gap-2 flex-1">
                  {students.map((s) => (
                    <button key={s.id} onClick={() => toggle(s.id)}
                      className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-colors ${s.present ? 'bg-card' : 'bg-red-50 border border-red-200'}`}>
                      <span className="font-body text-sm text-dark">{s.lastName} {s.firstName}</span>
                      <span className={`font-heading text-xs uppercase ${s.present ? 'text-green-500' : 'text-red-500'}`}>
                        {s.present ? 'Присутствует' : 'Отсутствует'}
                      </span>
                    </button>
                  ))}
                </div>
                <button onClick={saveAttendance} disabled={saving}
                  className="mt-4 w-full bg-primary text-white font-heading uppercase tracking-wider py-3.5 rounded-xl text-sm disabled:opacity-60">
                  {saving ? 'Сохраняем...' : 'Сохранить'}
                </button>
              </>
            )}

            {tab === 'homework' && (
              <div className="flex flex-col gap-3">
                {/* Статусы */}
                <p className="font-body text-xs text-dark/50 uppercase tracking-wider">
                  Отметили: {hwStudents.filter(s => s.submitted).length}/{hwStudents.length}
                </p>
                {hwStudents.map((s) => (
                  <div key={s.id} className={`flex items-center justify-between px-4 py-3 rounded-2xl ${s.submitted ? 'bg-card' : 'bg-red-50 border border-red-200'}`}>
                    <span className="font-body text-sm text-dark">{s.lastName} {s.firstName}</span>
                    <span className={`font-heading text-xs uppercase ${s.submitted ? 'text-green-500' : 'text-red-400'}`}>
                      {s.submitted ? 'Сдал ✓' : 'Не отметил'}
                    </span>
                  </div>
                ))}

                {/* Фото */}
                {hwPhotos.length > 0 && (
                  <div className="mt-1">
                    <p className="font-body text-[10px] text-dark/40 uppercase tracking-wider mb-2">
                      Фото работ ({hwPhotos.length})
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {hwPhotos.map((p) => (
                        <button key={p.id} onClick={() => setLightbox(p.url)} className="relative aspect-square">
                          <img src={p.url} alt={p.studentName} className="w-full h-full object-cover rounded-xl" />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/40 rounded-b-xl px-1 py-0.5">
                            <p className="text-white text-[8px] font-body truncate">{p.studentName.split(' ')[0]}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {hwPhotos.length === 0 && (
                  <p className="font-body text-[10px] text-dark/30 text-center">Фото не загружены</p>
                )}
              </div>
            )}

            {/* Лайтбокс */}
            {lightbox && (
              <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50" onClick={() => setLightbox(null)}>
                <img src={lightbox} alt="фото ДЗ" className="max-w-full max-h-full object-contain rounded-xl" />
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Главный экран — выбор группы + календарь
  return (
    <div className="px-4 pt-8 pb-4 flex flex-col gap-4">
      <h1 className="font-heading text-2xl uppercase tracking-wide text-dark">Расписание</h1>

      {/* Выбор группы — показываем всегда */}
      {groups.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {groups.map((g) => (
            <button key={g.id} onClick={() => loadGroup(g)}
              className={`flex-shrink-0 text-xs font-body px-3 py-1.5 rounded-full transition-colors ${selectedGroup?.id === g.id ? 'bg-dark text-white' : 'bg-card text-dark/60'}`}>
              {g.name}
            </button>
          ))}
        </div>
      )}

      {groups.length === 0 && (
        <div className="bg-card rounded-2xl p-5 text-center">
          <p className="font-body text-sm text-dark/50">Нет групп.</p>
          <p className="font-body text-xs text-dark/30 mt-1">Создай группу в разделе «График» и сгенерируй уроки.</p>
        </div>
      )}

      {selectedGroup && lessons.length === 0 && (
        <div className="bg-card rounded-2xl p-5 text-center">
          <p className="font-body text-sm text-dark/50">Нет уроков для группы «{selectedGroup.name}».</p>
          <p className="font-body text-xs text-dark/30 mt-1">Создай семестр и сгенерируй расписание в разделе «График».</p>
        </div>
      )}

      {selectedGroup && lessons.length > 0 && (
        <CalendarView lessons={lessons} onLessonPress={openLesson} />
      )}
    </div>
  );
}
