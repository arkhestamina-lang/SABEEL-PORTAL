import { useEffect, useState } from 'react';
import { curatorApi } from '../../api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Star } from 'lucide-react';

type Filter = 'all' | 'risk' | 'close' | 'best';

interface StudentRow {
  id: number; firstName: string; lastName: string; course: number; groupId?: number;
  rating: { total: number; countedAbsences: number; hwMisses: number };
}

interface StudentDetail {
  student: any; rating: any; absences: any[]; hwMisses: any[]; exams: any[];
}

interface Group { id: number; name: string; course: number }

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupFilter, setGroupFilter] = useState<number | undefined>(undefined);
  const [filter, setFilter] = useState<Filter>('all');
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [hwModal, setHwModal] = useState<{ studentId: number; studentName: string } | null>(null);
  const [_lessons, setLessons] = useState<any[]>([]);
  const [selectedLesson, setSelectedLesson] = useState('');
  const [examModal, setExamModal] = useState<{ studentId: number; exams: any[] } | null>(null);
  const [examId, setExamId] = useState('');
  const [examScore, setExamScore] = useState('');

  useEffect(() => {
    curatorApi.groups().then(setGroups);
    curatorApi.students().then(setStudents);
  }, []);

  async function changeGroup(id: number | undefined) {
    setGroupFilter(id);
    const s = await curatorApi.students(id);
    setStudents(s);
  }

  async function openDetail(id: number) {
    const d = await curatorApi.student(id);
    setDetail(d);
    setLessons(d.absences.map((a: any) => a.lesson));
  }

  async function submitHwMiss() {
    if (!hwModal || !selectedLesson) return;
    await curatorApi.addHwMiss(hwModal.studentId, parseInt(selectedLesson));
    setHwModal(null);
    setSelectedLesson('');
    if (detail) openDetail(detail.student.id);
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
  }).sort((a, b) => b.rating.total - a.rating.total);

  // Детальная карточка
  if (detail) {
    const { student, rating, absences, hwMisses: hws, exams } = detail;
    return (
      <div className="px-4 pt-8 pb-4 flex flex-col gap-4">
        <button onClick={() => setDetail(null)} className="text-primary text-sm font-body">← Назад</button>
        <div>
          <h1 className="font-heading text-xl uppercase tracking-wide text-dark">{student.firstName} {student.lastName}</h1>
          <p className="font-body text-xs text-dark/50">{student.course} курс</p>
        </div>

        {/* Баллы */}
        <div className="bg-card rounded-2xl p-4 grid grid-cols-2 gap-3">
          <Stat label="Итого" value={`${rating.total}/100`} />
          <Stat label="Посещаемость" value={`${rating.attendanceScore}/40`} />
          <Stat label="ДЗ" value={`${rating.homeworkScore}/30`} />
          <Stat label="Коран" value={`${rating.quranScore}/20`} />
          <Stat label="Привычки" value={`${rating.habitsScore}/10`} />
          <Stat label="Пропуски" value={`${rating.countedAbsences}`} warn={rating.countedAbsences >= 4} />
        </div>

        {/* Действия */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setHwModal({ studentId: student.id, studentName: `${student.firstName} ${student.lastName}` })}
            className="flex-1 bg-primary text-white font-heading uppercase text-xs py-3 rounded-xl"
          >Несдача ДЗ</button>
          {exams.length > 0 && (
            <button
              onClick={() => setExamModal({ studentId: student.id, exams })}
              className="flex-1 bg-card border border-primary text-primary font-heading uppercase text-xs py-3 rounded-xl"
            >Балл за экзамен</button>
          )}
        </div>

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

        {/* Пропуски */}
        {absences.length > 0 && (
          <div className="bg-card rounded-2xl p-4">
            <p className="font-heading uppercase tracking-wide text-sm text-dark/60 mb-2">Пропуски</p>
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

        {/* Несдачи ДЗ */}
        {hws.length > 0 && (
          <div className="bg-card rounded-2xl p-4">
            <p className="font-heading uppercase tracking-wide text-sm text-dark/60 mb-2">Несдачи ДЗ</p>
            {hws.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
                <div>
                  <p className="font-body text-xs text-dark">{h.lesson.subject}</p>
                  <p className="font-body text-[10px] text-dark/40">{format(new Date(h.lesson.datetime), 'd MMM', { locale: ru })}</p>
                </div>
                <button
                  onClick={async () => {
                    await curatorApi.deleteHwMiss(h.id);
                    setDetail((d: any) => d ? { ...d, hwMisses: d.hwMisses.filter((x: any) => x.id !== h.id) } : d);
                  }}
                  className="text-dark/25 hover:text-red-400 text-lg leading-none px-1 transition-colors"
                >×</button>
              </div>
            ))}
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

        {/* Модалка несдача ДЗ */}
        {hwModal && (
          <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setHwModal(null)}>
            <div className="bg-card w-full max-w-[480px] mx-auto rounded-t-3xl p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="font-heading uppercase tracking-wide text-dark text-lg mb-4">Несдача ДЗ — {hwModal.studentName}</h2>
              <select
                value={selectedLesson}
                onChange={(e) => setSelectedLesson(e.target.value)}
                className="w-full bg-bg border border-black/10 rounded-xl px-4 py-3 font-body text-sm mb-3 focus:outline-none focus:border-primary"
              >
                <option value="">Выбери урок...</option>
                {absences.map((a: any) => (
                  <option key={a.lesson.id} value={a.lesson.id}>{a.lesson.subject} — {format(new Date(a.lesson.datetime), 'd MMM', { locale: ru })}</option>
                ))}
              </select>
              <button onClick={submitHwMiss} disabled={!selectedLesson} className="w-full bg-primary text-white font-heading uppercase tracking-wider py-3.5 rounded-xl text-sm disabled:opacity-60">Внести</button>
            </div>
          </div>
        )}

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
      <h1 className="font-heading text-2xl uppercase tracking-wide text-dark mb-4">Студенты</h1>

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
