import { useEffect, useState } from 'react';
import { curatorApi } from '../../api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Group { id: number; name: string; course: number }
interface ExamScore { id: number; score: number; maxScore: number; student: { firstName: string; lastName: string } }
interface Exam { id: number; title: string; date: string; formUrl?: string; group: { name: string }; groupId: number; scores: ExamScore[] }

export default function ExamsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState<number | undefined>(undefined);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newExam, setNewExam] = useState({ title: '', date: '', formUrl: '', groupId: '' });
  const [scoreModal, setScoreModal] = useState<{ studentId: number; name: string } | null>(null);
  const [scoreInput, setScoreInput] = useState('');
  const [maxScoreInput, setMaxScoreInput] = useState('100');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    curatorApi.groups().then((gs) => { setGroups(gs); if (gs.length > 0) setGroupId(gs[0].id); });
  }, []);

  useEffect(() => {
    if (groupId !== undefined) curatorApi.exams(groupId).then(setExams);
  }, [groupId]);

  async function createExam() {
    if (!newExam.title || !newExam.date || !newExam.groupId) return;
    const exam = await curatorApi.createExam(newExam.title, newExam.date, parseInt(newExam.groupId), newExam.formUrl || undefined);
    setExams((es) => [{ ...exam, scores: [], group: groups.find((g) => g.id === exam.groupId) ?? { name: '' } }, ...es]);
    setNewExam({ title: '', date: '', formUrl: '', groupId: '' });
    setShowForm(false);
  }

  async function deleteExam(id: number) {
    await curatorApi.deleteExam(id);
    setExams((es) => es.filter((e) => e.id !== id));
    setSelectedExam(null);
    setConfirmDelete(null);
  }

  async function saveScore() {
    if (!selectedExam || !scoreModal) return;
    const score = parseFloat(scoreInput);
    const maxScore = parseFloat(maxScoreInput);
    if (isNaN(score)) return;
    await curatorApi.saveExamScore(scoreModal.studentId, selectedExam.id, score, maxScore);
    // Обновляем локально
    const updatedExam = await curatorApi.exams(groupId).then((es: Exam[]) => es.find((e) => e.id === selectedExam.id));
    if (updatedExam) {
      setSelectedExam(updatedExam);
      setExams((es) => es.map((e) => e.id === updatedExam.id ? updatedExam : e));
    }
    setScoreModal(null);
    setScoreInput('');
    setMaxScoreInput('100');
  }

  // Экран конкретного экзамена — ввод баллов
  if (selectedExam) {
    const students = selectedExam.scores;

    return (
      <div className="px-4 pt-8 pb-4 flex flex-col gap-4">
        <button onClick={() => setSelectedExam(null)} className="text-primary text-sm font-body">← Назад</button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading text-xl uppercase tracking-wide text-dark">{selectedExam.title}</h1>
            <p className="font-body text-xs text-dark/50 mt-0.5">
              {format(new Date(selectedExam.date), 'd MMMM yyyy', { locale: ru })} · {selectedExam.group.name}
            </p>
            {selectedExam.formUrl && (
              <a href={selectedExam.formUrl} target="_blank" rel="noreferrer"
                className="font-body text-xs text-primary underline mt-1 block">
                Открыть Google Форму
              </a>
            )}
          </div>
          {confirmDelete === selectedExam.id ? (
            <div className="flex gap-2 items-center">
              <button onClick={() => setConfirmDelete(null)} className="text-dark/40 text-xs font-body">Отмена</button>
              <button onClick={() => deleteExam(selectedExam.id)} className="text-red-500 text-xs font-body font-medium">Удалить</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(selectedExam.id)} className="text-dark/25 text-xs font-body">Удалить</button>
          )}
        </div>

        {/* Список студентов с баллами */}
        <div className="bg-card rounded-2xl p-4">
          <p className="font-heading uppercase tracking-wide text-sm text-dark/60 mb-3">
            Баллы студентов ({students.length} введено)
          </p>
          {students.length === 0 && (
            <p className="font-body text-xs text-dark/40 mb-3">Нет введённых баллов. Нажми на студента ниже.</p>
          )}
          {students.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
              <p className="font-body text-sm text-dark">{s.student.lastName} {s.student.firstName}</p>
              <div className="flex items-center gap-3">
                <p className="font-heading text-base text-primary">{s.score}<span className="text-xs text-dark/40">/{s.maxScore}</span></p>
                <button
                  onClick={() => { setScoreModal({ studentId: s.id, name: `${s.student.firstName} ${s.student.lastName}` }); setScoreInput(String(s.score)); setMaxScoreInput(String(s.maxScore)); }}
                  className="text-xs font-body text-dark/40 underline"
                >изм.</button>
              </div>
            </div>
          ))}
        </div>

        {/* Ввести балл вручную */}
        <div className="bg-card rounded-2xl p-4 flex flex-col gap-3">
          <p className="font-heading uppercase tracking-wide text-sm text-dark/60">Ввести балл вручную</p>
          <p className="font-body text-xs text-dark/40">Введи ID студента или добавь через карточку студента</p>
          <div className="flex gap-2">
            <input type="number" placeholder="ID студента" value={scoreModal?.studentId ?? ''}
              onChange={(e) => setScoreModal((m) => m ? { ...m, studentId: parseInt(e.target.value) } : { studentId: parseInt(e.target.value), name: '' })}
              className="flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
            <input type="number" placeholder="Балл" value={scoreInput} onChange={(e) => setScoreInput(e.target.value)}
              className="w-20 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm text-center focus:outline-none focus:border-primary" />
            <span className="self-center text-dark/40 font-body text-sm">/</span>
            <input type="number" placeholder="Max" value={maxScoreInput} onChange={(e) => setMaxScoreInput(e.target.value)}
              className="w-16 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm text-center focus:outline-none focus:border-primary" />
          </div>
          <button onClick={saveScore} disabled={!scoreInput || !scoreModal?.studentId}
            className="w-full bg-primary text-white font-heading uppercase text-xs py-3 rounded-xl disabled:opacity-60">
            Сохранить балл
          </button>
        </div>

        {/* Модалка редактирования балла */}
        {scoreModal && (
          <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setScoreModal(null)}>
            <div className="bg-card w-full max-w-[480px] mx-auto rounded-t-3xl p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="font-heading uppercase tracking-wide text-dark text-lg mb-1">Изменить балл</h2>
              <p className="font-body text-xs text-dark/50 mb-4">{scoreModal.name}</p>
              <div className="flex gap-2 mb-3">
                <input type="number" placeholder="Балл" value={scoreInput} onChange={(e) => setScoreInput(e.target.value)}
                  className="flex-1 bg-bg border border-black/10 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-primary" />
                <span className="self-center text-dark/40 font-body">/</span>
                <input type="number" placeholder="Макс" value={maxScoreInput} onChange={(e) => setMaxScoreInput(e.target.value)}
                  className="w-24 bg-bg border border-black/10 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-primary" />
              </div>
              <button onClick={saveScore} disabled={!scoreInput}
                className="w-full bg-primary text-white font-heading uppercase tracking-wider py-3.5 rounded-xl text-sm disabled:opacity-60">
                Сохранить
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Список экзаменов
  return (
    <div className="px-4 pt-8 pb-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl uppercase tracking-wide text-dark">Экзамены</h1>
        <button onClick={() => setShowForm(!showForm)} className="text-primary text-sm font-body">+ Экзамен</button>
      </div>

      {/* Фильтр по группам */}
      {groups.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button onClick={() => setGroupId(undefined)} className={`flex-shrink-0 text-xs font-body px-3 py-1.5 rounded-full ${groupId === undefined ? 'bg-dark text-white' : 'bg-card text-dark/60'}`}>Все</button>
          {groups.map((g) => (
            <button key={g.id} onClick={() => setGroupId(g.id)} className={`flex-shrink-0 text-xs font-body px-3 py-1.5 rounded-full ${groupId === g.id ? 'bg-dark text-white' : 'bg-card text-dark/60'}`}>{g.name}</button>
          ))}
        </div>
      )}

      {/* Форма нового экзамена */}
      {showForm && (
        <div className="bg-card rounded-2xl p-4 flex flex-col gap-3">
          <p className="font-heading uppercase tracking-wide text-sm text-dark/60">Новый экзамен</p>
          <input type="text" placeholder="Название (напр. Экзамен по грамматике)" value={newExam.title}
            onChange={(e) => setNewExam((n) => ({ ...n, title: e.target.value }))}
            className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
          <select value={newExam.groupId} onChange={(e) => setNewExam((n) => ({ ...n, groupId: e.target.value }))}
            className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary">
            <option value="">Выбери группу...</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <div>
            <label className="text-[10px] text-dark/40 font-body">Дата экзамена</label>
            <input type="date" value={newExam.date} onChange={(e) => setNewExam((n) => ({ ...n, date: e.target.value }))}
              className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
          </div>
          <input type="url" placeholder="Ссылка на Google Форму (необязательно)" value={newExam.formUrl}
            onChange={(e) => setNewExam((n) => ({ ...n, formUrl: e.target.value }))}
            className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 bg-bg text-dark/60 font-heading uppercase text-xs py-3 rounded-xl">Отмена</button>
            <button onClick={createExam} disabled={!newExam.title || !newExam.date || !newExam.groupId}
              className="flex-1 bg-primary text-white font-heading uppercase text-xs py-3 rounded-xl disabled:opacity-60">Создать</button>
          </div>
        </div>
      )}

      {exams.length === 0 && !showForm && (
        <div className="flex items-center justify-center h-48">
          <p className="text-dark/40 font-body text-sm">Нет экзаменов. Создай первый.</p>
        </div>
      )}

      {exams.map((e) => (
        <button key={e.id} onClick={() => setSelectedExam(e)} className="bg-card rounded-2xl p-4 text-left flex items-center justify-between">
          <div>
            <p className="font-heading uppercase tracking-wide text-dark">{e.title}</p>
            <p className="font-body text-xs text-dark/50 mt-0.5">
              {format(new Date(e.date), 'd MMMM yyyy', { locale: ru })} · {e.group.name}
            </p>
            <p className="font-body text-xs text-primary mt-0.5">{e.scores.length} баллов введено</p>
          </div>
          <span className="text-dark/30 text-lg">›</span>
        </button>
      ))}
    </div>
  );
}
