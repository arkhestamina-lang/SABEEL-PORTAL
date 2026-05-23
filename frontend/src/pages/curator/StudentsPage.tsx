import { useEffect, useState } from 'react';
import { curatorApi } from '../../api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Star, Mic } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import PageError from '../../components/common/PageError';

type Filter = 'all' | 'risk' | 'close' | 'best';

const TRANSLIT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'j',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
};
function translit(s: string) {
  return s.toLowerCase().split('').map((c) => TRANSLIT[c] ?? c).join('').replace(/[^a-z0-9]/g, '');
}

interface StudentRow {
  id: number; firstName: string; lastName: string; course: number; groupId?: number;
  rating: { total: number; countedAbsences: number; hwMisses: number };
}

interface StudentDetail {
  student: any; rating: any; absences: any[]; hwMisses: any[]; exams: any[];
  semesterHistory: { id: number; name: string; total: number; maxTotal: number }[];
}

interface Group { id: number; name: string; course: number }

export default function StudentsPage() {
  const toast = useToastStore();
  const [loadError, setLoadError] = useState(false);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupFilter, setGroupFilter] = useState<number | undefined>(undefined);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [photosByLesson, setPhotosByLesson] = useState<any[]>([]);
  const [photoViewer, setPhotoViewer] = useState<string | null>(null);
  const [examModal, setExamModal] = useState<{ studentId: number; exams: any[] } | null>(null);
  const [examId, setExamId] = useState('');
  const [examScore, setExamScore] = useState('');
  const [transferGroupId, setTransferGroupId] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '', login: '', course: '1', groupId: '' });
  const [createdCredentials, setCreatedCredentials] = useState<{ login: string; tempPassword: string } | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [attendance, setAttendance] = useState<{ lessonId: number; subject: string; datetime: string; present: boolean }[]>([]);
  function toggleSection(key: string) {
    setOpenSections((prev) => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
  }

  function load() {
    setLoadError(false);
    Promise.all([curatorApi.groups(), curatorApi.students()])
      .then(([g, s]) => { setGroups(g); setStudents(s); })
      .catch(() => setLoadError(true));
  }
  useEffect(() => { load(); }, []);

  async function changeGroup(id: number | undefined) {
    setGroupFilter(id);
    const s = await curatorApi.students(id);
    setStudents(s);
  }

  async function openDetail(id: number) {
    try {
      const [d, p] = await Promise.all([curatorApi.student(id), curatorApi.studentPhotos(id)]);
      setDetail(d);
      setPhotosByLesson(p);
      setOpenSections(new Set());
      setAttendance(d.attendanceThisMonth ?? []);
    } catch { toast.show('Не удалось загрузить карточку студента.'); }
  }

  async function submitExamScore() {
    if (!examModal || !examId || !examScore) return;
    await curatorApi.saveExamScore(examModal.studentId, parseInt(examId), parseFloat(examScore));
    setExamModal(null);
    setExamId(''); setExamScore('');
    if (detail) openDetail(detail.student.id);
  }

  const filtered = students.filter((s) => {
    if (filter === 'risk') return s.rating.countedAbsences >= 4 || s.rating.hwMisses >= 4;
    if (filter === 'close') return s.rating.countedAbsences === 3 || s.rating.hwMisses === 3;
    if (filter === 'best') return s.rating.total >= 85;
    return true;
  }).filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
           `${s.lastName} ${s.firstName}`.toLowerCase().includes(q);
  }).sort((a, b) => b.rating.total - a.rating.total);

  if (loadError) return <PageError onRetry={load} />;

  // Детальная карточка
  if (detail) {
    const { student, rating, absences, hwMisses: hws, exams, semesterHistory = [] } = detail;
    return (
      <div className="px-4 pt-8 pb-4 flex flex-col gap-4">
        <button onClick={() => { setDetail(null); setPhotosByLesson([]); }} className="text-primary text-sm font-body">← Назад</button>
        <div>
          <h1 className="font-heading text-xl uppercase tracking-wide text-dark">{student.firstName} {student.lastName}</h1>
          <p className="font-body text-xs text-dark/50">{student.course} курс</p>
        </div>

        {/* Баллы текущего месяца */}
        <div className="bg-card rounded-2xl p-4 grid grid-cols-2 gap-3">
          <Stat label="Итого (месяц)" value={`${rating.total}/100`} />
          <Stat label="Посещаемость" value={`${rating.attendanceScore}/40`} />
          <Stat label="ДЗ" value={`${rating.homeworkScore}/30`} />
          <Stat label="Коран" value={`${rating.quranScore}/20`} />
          <Stat label="Привычки" value={`${rating.habitsScore}/10`} />
          <Stat label="Пропуски" value={`${rating.countedAbsences}`} warn={rating.countedAbsences >= 4} />
        </div>

        {/* Рейтинг по семестрам */}
        {semesterHistory.length > 0 && (
          <div className="bg-card rounded-2xl p-4 flex flex-col gap-2">
            <p className="font-heading uppercase tracking-wide text-sm text-dark/60 mb-1">По семестрам</p>
            {semesterHistory.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <span className="font-body text-xs text-dark/60">{s.name}</span>
                <span className="font-heading text-sm text-dark">{s.total}<span className="text-dark/30 text-xs">/{s.maxTotal}</span></span>
              </div>
            ))}
          </div>
        )}

        {/* Действия */}
        {exams.length > 0 && (
          <button
            onClick={() => setExamModal({ studentId: student.id, exams })}
            className="w-full bg-card border border-primary text-primary font-heading uppercase text-xs py-3 rounded-xl"
          >Балл за экзамен</button>
        )}

        {/* Назначить / снять старосту */}
        {student.groupId && (() => {
          const isStarosta = student.group?.starostaId === student.id;
          return (
            <button
              onClick={async () => {
                await curatorApi.setStarosta(student.groupId!, isStarosta ? null : student.id);
                setDetail((d: any) => d ? {
                  ...d,
                  student: { ...d.student, group: { ...d.student.group, starostaId: isStarosta ? null : student.id } }
                } : d);
              }}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-heading uppercase text-xs transition-all ${
                isStarosta
                  ? 'bg-yellow-50 border border-yellow-200 text-yellow-600'
                  : 'bg-card border border-black/10 text-muted'
              }`}
            >
              <Star size={14} className={isStarosta ? 'fill-yellow-400 text-yellow-400' : ''} />
              {isStarosta ? 'Снять с должности старосты' : 'Назначить старостой'}
            </button>
          );
        })()}

        {/* Посещаемость текущего месяца — сворачиваемая */}
        {attendance.length > 0 && (
          <div className="bg-card rounded-2xl overflow-hidden">
            <button onClick={() => toggleSection('attendance')} className="w-full flex items-center justify-between px-4 py-3.5">
              <span className="font-heading uppercase tracking-wide text-sm text-dark/60">Посещаемость (месяц)</span>
              <span className="font-body text-xs text-dark/40">{attendance.length} уроков · {openSections.has('attendance') ? '▲' : '▼'}</span>
            </button>
            {openSections.has('attendance') && (
              <div className="border-t border-black/5 px-4 pb-3">
                <p className="font-body text-[10px] text-dark/40 pt-2 pb-1">Нажми на статус чтобы изменить</p>
                {attendance.map((a) => (
                  <div key={a.lessonId} className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
                    <div>
                      <p className="font-body text-xs text-dark">{a.subject}</p>
                      <p className="font-body text-[10px] text-dark/40">{format(new Date(a.datetime), 'd MMM · HH:mm', { locale: ru })}</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (a.present === null) return; // ещё не отмечено старостой
                        const newPresent = !a.present;
                        await curatorApi.saveAttendance(a.lessonId, [{ studentId: student.id, present: newPresent }]);
                        setAttendance((prev) => prev.map((m) => m.lessonId === a.lessonId ? { ...m, present: newPresent } : m));
                        // Обновляем рейтинг
                        const refreshed = await curatorApi.student(student.id);
                        setDetail((d: any) => d ? { ...d, rating: refreshed.rating } : d);
                        toast.show(newPresent ? 'Отмечен присутствующим' : 'Отмечен отсутствующим', 'success');
                      }}
                      className={`text-[10px] font-body px-2.5 py-1 rounded-full transition-colors ${
                        a.present === null
                          ? 'bg-dark/5 text-dark/30 cursor-default'
                          : a.present
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-600 hover:bg-red-200'
                      }`}
                    >
                      {a.present === null ? 'не отмечен' : a.present ? 'Присутствовал' : 'Отсутствовал'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Пропуски — сворачиваемая */}
        {absences.length > 0 && (
          <div className="bg-card rounded-2xl overflow-hidden">
            <button onClick={() => toggleSection('absences')} className="w-full flex items-center justify-between px-4 py-3.5">
              <span className="font-heading uppercase tracking-wide text-sm text-dark/60">Пропуски</span>
              <span className="font-body text-xs text-dark/40">{absences.length} · {openSections.has('absences') ? '▲' : '▼'}</span>
            </button>
            {openSections.has('absences') && (
              <div className="border-t border-black/5 px-4 pb-3">
                {absences.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
                    <div>
                      <p className="font-body text-xs text-dark">{a.lesson.subject}</p>
                      <p className="font-body text-[10px] text-dark/40">{format(new Date(a.lesson.datetime), 'd MMM', { locale: ru })}</p>
                    </div>
                    <span className={`text-[10px] font-body px-2 py-0.5 rounded-full ${a.status === 'EXCUSED' ? 'bg-green-100 text-green-700' : a.status === 'COUNTED' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                      {a.status === 'EXCUSED' ? 'Уважит.' : a.status === 'COUNTED' ? 'Засчитан' : 'Ожидает'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Несдачи ДЗ — сворачиваемая */}
        <div className="bg-card rounded-2xl overflow-hidden">
          <button onClick={() => toggleSection('hws')} className="w-full flex items-center justify-between px-4 py-3.5">
            <span className="font-heading uppercase tracking-wide text-sm text-dark/60">Несдачи ДЗ</span>
            <span className="font-body text-xs text-dark/40">
              {hws.length === 0 ? '✓ все сданы' : `${hws.length} · ${openSections.has('hws') ? '▲' : '▼'}`}
            </span>
          </button>
          {openSections.has('hws') && hws.length > 0 && (
            <div className="border-t border-black/5 px-4 pb-3">
              {hws.map((h: any) => (
                <div key={h.id} className="py-2 border-b border-black/5 last:border-0">
                  <p className="font-body text-xs text-dark">{h.lesson.subject}</p>
                  <p className="font-body text-[10px] text-dark/40">{format(new Date(h.lesson.datetime), 'd MMM', { locale: ru })}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Сданные работы — сворачиваемая */}
        {photosByLesson.length > 0 && (
          <div className="bg-card rounded-2xl overflow-hidden">
            <button onClick={() => toggleSection('works')} className="w-full flex items-center justify-between px-4 py-3.5">
              <span className="font-heading uppercase tracking-wide text-sm text-dark/60">Сданные работы</span>
              <span className="font-body text-xs text-dark/40">{photosByLesson.length} · {openSections.has('works') ? '▲' : '▼'}</span>
            </button>
            {openSections.has('works') && (
              <div className="border-t border-black/5 px-4 pb-3 flex flex-col gap-3 pt-3">
                {photosByLesson.map((group: any) => (
                  <div key={group.lessonId}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="font-body text-xs text-dark">{group.subject}</p>
                      <p className="font-body text-[10px] text-dark/40">{format(new Date(group.datetime), 'd MMM', { locale: ru })}</p>
                    </div>
                    {group.isOral ? (
                      <div className="flex items-center gap-1.5 bg-green-50 rounded-xl px-3 py-2 w-fit">
                        <Mic size={12} className="text-green-600" />
                        <p className="font-body text-xs text-green-700">Устно (самоотчёт)</p>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        {group.photos.map((photo: any) => (
                          <button key={photo.id} onClick={() => setPhotoViewer(`/uploads/${photo.fileName}`)}
                            className="w-16 h-16 rounded-xl overflow-hidden border border-black/10 hover:border-primary transition-colors shrink-0">
                            <img src={`/uploads/${photo.fileName}`} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Экзамены */}
        {exams.length > 0 && (
          <div className="bg-card rounded-2xl p-4">
            <p className="font-heading uppercase tracking-wide text-sm text-dark/60 mb-2">Экзамены</p>
            {exams.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
                <p className="font-body text-xs text-dark">{e.title}</p>
                {e.scores[0]
                  ? <p className="font-heading text-sm text-primary">{e.scores[0].score}/{e.scores[0].maxScore}</p>
                  : <p className="font-body text-[10px] text-dark/30">—</p>
                }
              </div>
            ))}
          </div>
        )}

        {/* Просмотр фото */}
        {photoViewer && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPhotoViewer(null)}>
            <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
              <img src={photoViewer} alt="" className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain" />
              <button
                onClick={() => setPhotoViewer(null)}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center text-lg leading-none"
              >×</button>
            </div>
          </div>
        )}

        {/* Перевести в другую группу */}
        <div className="bg-card rounded-2xl p-4 flex flex-col gap-2">
          <p className="font-heading uppercase tracking-wide text-xs text-dark/50">Перевести в группу</p>
          <div className="flex gap-2">
            <select
              value={transferGroupId}
              onChange={(e) => setTransferGroupId(e.target.value)}
              className="flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary"
            >
              <option value="">Выбери группу...</option>
              {groups.filter((g) => g.id !== student.groupId).map((g) => (
                <option key={g.id} value={g.id}>{g.name} ({g.course} курс)</option>
              ))}
            </select>
            <button
              disabled={!transferGroupId}
              onClick={async () => {
                await curatorApi.transferStudent(student.id, parseInt(transferGroupId));
                const newGroup = groups.find((g) => g.id === parseInt(transferGroupId));
                setStudents((ss) => ss.map((s) => s.id === student.id ? { ...s, groupId: parseInt(transferGroupId) } : s));
                setDetail((d: any) => d ? {
                  ...d,
                  student: { ...d.student, groupId: parseInt(transferGroupId), group: { ...d.student.group, id: parseInt(transferGroupId), name: newGroup?.name ?? '' } }
                } : d);
                setTransferGroupId('');
                toast.show(`Переведён в ${newGroup?.name}`, 'success');
              }}
              className="bg-primary text-white font-heading uppercase text-xs px-4 py-2 rounded-xl disabled:opacity-50"
            >
              Перевести
            </button>
          </div>
        </div>

        {/* Исключить из группы (только если есть группа) */}
        {student.groupId && (
          <button
            onClick={async () => {
              if (!confirm(`Исключить ${student.firstName} ${student.lastName} из группы? Аккаунт сохранится.`)) return;
              await curatorApi.excludeStudent(student.id);
              setStudents((ss) => ss.filter((s) => s.id !== student.id));
              setDetail(null);
            }}
            className="w-full bg-red-50 border border-red-200 text-red-500 font-heading uppercase text-xs py-3 rounded-xl hover:bg-red-100 transition-colors"
          >
            Исключить из группы
          </button>
        )}

        {/* Удалить аккаунт полностью */}
        <button
          onClick={async () => {
            if (!confirm(`Удалить аккаунт ${student.firstName} ${student.lastName}? Это действие нельзя отменить.`)) return;
            try {
              await curatorApi.deleteStudent(student.id);
              setStudents((ss) => ss.filter((s) => s.id !== student.id));
              setDetail(null);
              toast.show('Аккаунт удалён', 'success');
            } catch { toast.show('Не удалось удалить аккаунт'); }
          }}
          className="w-full bg-red-500 text-white font-heading uppercase text-xs py-3 rounded-xl hover:bg-red-600 transition-colors"
        >
          Удалить аккаунт
        </button>


        {/* Модалка балл за экзамен */}
        {examModal && (
          <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setExamModal(null)}>
            <div className="bg-card w-full max-w-[480px] mx-auto rounded-t-3xl p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="font-heading uppercase tracking-wide text-dark text-lg mb-4">Балл за экзамен</h2>
              <select value={examId} onChange={(e) => setExamId(e.target.value)} className="w-full bg-bg border border-black/10 rounded-xl px-4 py-3 font-body text-sm mb-3 focus:outline-none focus:border-primary">
                <option value="">Выбери экзамен...</option>
                {examModal.exams.map((e: any) => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
              <input type="number" value={examScore} onChange={(e) => setExamScore(e.target.value)} placeholder="Балл (напр. 85)" className="w-full bg-bg border border-black/10 rounded-xl px-4 py-3 font-body text-sm mb-3 focus:outline-none focus:border-primary" />
              <button onClick={submitExamScore} disabled={!examId || !examScore} className="w-full bg-primary text-white font-heading uppercase tracking-wider py-3.5 rounded-xl text-sm disabled:opacity-60">Сохранить</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 pt-8 pb-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading text-2xl uppercase tracking-wide text-dark">Студенты</h1>
        <button onClick={() => { setShowAddStudent(!showAddStudent); setCreatedCredentials(null); }}
          className="text-primary text-sm font-body">+ Добавить</button>
      </div>

      {/* Форма добавления студента */}
      {showAddStudent && !createdCredentials && (
        <div className="bg-card rounded-2xl p-4 flex flex-col gap-3 mb-4">
          <p className="font-heading uppercase tracking-wide text-sm text-dark/60">Новый студент</p>
          <div className="flex gap-2">
            <input type="text" placeholder="Имя" value={newStudent.firstName}
              onChange={(e) => setNewStudent((s) => ({ ...s, firstName: e.target.value }))}
              className="flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
            <input type="text" placeholder="Фамилия" value={newStudent.lastName}
              onChange={(e) => setNewStudent((s) => ({ ...s, lastName: e.target.value }))}
              className="flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
          </div>
          <div className="flex gap-2 items-center">
            <input type="text" placeholder="Логин (напр. ahmed.aliev)" value={newStudent.login}
              onChange={(e) => setNewStudent((s) => ({ ...s, login: e.target.value }))}
              className="flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
            <button type="button"
              onClick={() => {
                if (!newStudent.firstName && !newStudent.lastName) return;
                const base = `${translit(newStudent.firstName)}.${translit(newStudent.lastName)}`;
                const rand = Math.floor(100 + Math.random() * 900);
                setNewStudent((s) => ({ ...s, login: `${base}${rand}` }));
              }}
              className="shrink-0 text-xs font-body text-primary bg-primary/10 px-3 py-2 rounded-xl hover:bg-primary/20 transition-colors"
            >Авто</button>
          </div>
          <div className="flex gap-2">
            <select value={newStudent.course} onChange={(e) => setNewStudent((s) => ({ ...s, course: e.target.value }))}
              className="flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary">
              {[1,2,3,4].map((c) => <option key={c} value={c}>{c} курс</option>)}
            </select>
            <select value={newStudent.groupId} onChange={(e) => setNewStudent((s) => ({ ...s, groupId: e.target.value }))}
              className="flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary">
              <option value="">Группа...</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddStudent(false)}
              className="flex-1 bg-bg text-dark/60 font-heading uppercase text-xs py-3 rounded-xl">Отмена</button>
            <button
              disabled={!newStudent.firstName || !newStudent.lastName || !newStudent.login || !newStudent.groupId}
              onClick={async () => {
                try {
                  const result = await curatorApi.createStudent({
                    firstName: newStudent.firstName, lastName: newStudent.lastName,
                    login: newStudent.login, course: parseInt(newStudent.course), groupId: parseInt(newStudent.groupId),
                  });
                  setCreatedCredentials({ login: result.login, tempPassword: result.tempPassword });
                  setStudents((ss) => [...ss, { ...result.user, rating: { total: 40, countedAbsences: 0, hwMisses: 0 } }]);
                  setNewStudent({ firstName: '', lastName: '', login: '', course: '1', groupId: '' });
                } catch (e: any) {
                  toast.show(e.response?.data?.error || 'Ошибка создания');
                }
              }}
              className="flex-1 bg-primary text-white font-heading uppercase text-xs py-3 rounded-xl disabled:opacity-50"
            >Создать</button>
          </div>
        </div>
      )}

      {/* Данные для входа — показываем один раз */}
      {createdCredentials && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 flex flex-col gap-2">
          <p className="font-heading uppercase tracking-wide text-sm text-green-700">Аккаунт создан</p>
          <p className="font-body text-xs text-dark/60">Передай студенту эти данные для входа:</p>
          <div className="bg-white rounded-xl p-3 flex flex-col gap-1">
            <p className="font-body text-sm text-dark"><span className="text-dark/40">Логин: </span><span className="font-heading tracking-wide">{createdCredentials.login}</span></p>
            <p className="font-body text-sm text-dark"><span className="text-dark/40">Пароль: </span><span className="font-heading tracking-widest">{createdCredentials.tempPassword}</span></p>
          </div>
          <p className="font-body text-[10px] text-dark/40">Пароль показывается только один раз. Студент может сменить его в профиле.</p>
          <button onClick={() => { setShowAddStudent(false); setCreatedCredentials(null); }}
            className="w-full bg-green-600 text-white font-heading uppercase text-xs py-2.5 rounded-xl mt-1">Понятно</button>
        </div>
      )}

      {/* Поиск */}
      <input
        type="text"
        placeholder="Поиск по имени..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-card rounded-2xl px-4 py-3 font-body text-sm border border-border focus:outline-none focus:border-primary mb-2"
      />

      {/* Фильтр по группам */}
      {groups.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button onClick={() => changeGroup(undefined)} className={`flex-shrink-0 text-xs font-body px-3 py-1.5 rounded-full transition-colors ${groupFilter === undefined ? 'bg-dark text-white' : 'bg-card text-dark/60'}`}>Все группы</button>
          {groups.map((g) => (
            <button key={g.id} onClick={() => changeGroup(g.id)} className={`flex-shrink-0 text-xs font-body px-3 py-1.5 rounded-full transition-colors ${groupFilter === g.id ? 'bg-dark text-white' : 'bg-card text-dark/60'}`}>{g.name}</button>
          ))}
        </div>
      )}

      {/* Фильтры */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {([['all','Все'],['risk','Под угрозой'],['close','Близко к лимиту'],['best','Лучшие']] as [Filter,string][]).map(([f, l]) => (
          <button key={f} onClick={() => setFilter(f)} className={`flex-shrink-0 text-xs font-body px-3 py-1.5 rounded-full transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-card text-dark/60'}`}>{l}</button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((s, i) => (
          <button key={s.id} onClick={() => openDetail(s.id)} className="bg-card rounded-2xl px-4 py-3 flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <span className="font-heading text-sm text-dark/40 w-5">{i + 1}</span>
              <div>
                <p className="font-body text-sm text-dark">{s.lastName} {s.firstName}</p>
                <p className="font-body text-[10px] text-dark/40">{s.course} курс · {s.rating.countedAbsences} пропуска · {s.rating.hwMisses} несдачи</p>
              </div>
            </div>
            <span className={`font-heading text-lg ${s.rating.total >= 70 ? 'text-primary' : s.rating.total >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{s.rating.total}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className="font-body text-[10px] text-dark/50">{label}</p>
      <p className={`font-heading text-base ${warn ? 'text-red-500' : 'text-dark'}`}>{value}</p>
    </div>
  );
}
