import { useEffect, useState } from 'react';
import { curatorApi } from '../../api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Semester } from '../../types';

const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

interface Group { id: number; name: string; course: number }

export default function ScheduleManagerPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [teachers, setTeachers] = useState<{ id: number; firstName: string; lastName: string }[]>([]);
  const [selectedSem, setSelectedSem] = useState<Semester | null>(null);

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', course: 1 });

  const [showNewSem, setShowNewSem] = useState(false);
  const [newSem, setNewSem] = useState({ name: '', startDate: '', endDate: '' });

  const [newTpl, setNewTpl] = useState({ dayOfWeek: 1, timeHour: 10, timeMinute: 0, subject: '', teacherId: '' });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    curatorApi.groups().then(setGroups);
    curatorApi.teachers().then(setTeachers);
  }, []);

  async function createGroup() {
    const g = await curatorApi.createGroup(newGroup.name, newGroup.course);
    setGroups((gs) => [...gs, g].sort((a, b) => a.course - b.course));
    setNewGroup({ name: '', course: 1 });
    setShowNewGroup(false);
  }

  async function selectGroup(group: Group) {
    setSelectedGroup(group);
    setSelectedSem(null);
    const s = await curatorApi.semesters(group.id);
    setSemesters(s);
  }

  async function createSemester() {
    if (!selectedGroup) return;
    const s = await curatorApi.createSemester(newSem.name, newSem.startDate, newSem.endDate, selectedGroup.id);
    setSemesters((ss) => [{ ...s, templates: [] }, ...ss]);
    setNewSem({ name: '', startDate: '', endDate: '' });
    setShowNewSem(false);
    setSelectedSem({ ...s, templates: [] });
  }

  async function deleteTemplate(templateId: number) {
    await curatorApi.deleteTemplate(templateId);
    const updated = { ...selectedSem!, templates: selectedSem!.templates.filter((t) => t.id !== templateId) };
    setSelectedSem(updated);
    setSemesters((ss) => ss.map((s) => s.id === selectedSem!.id ? updated : s));
  }

  async function addTemplate() {
    if (!selectedSem || !newTpl.subject) return;
    const t = await curatorApi.addTemplate(selectedSem.id, {
      ...newTpl,
      teacherId: newTpl.teacherId ? parseInt(newTpl.teacherId) : undefined,
    });
    const updated = { ...selectedSem, templates: [...selectedSem.templates, t] };
    setSelectedSem(updated);
    setSemesters((ss) => ss.map((s) => s.id === selectedSem.id ? updated : s));
    setNewTpl({ dayOfWeek: 1, timeHour: 10, timeMinute: 0, subject: '', teacherId: '' });
  }

  async function generate() {
    if (!selectedSem) return;
    setGenerating(true);
    const { created } = await curatorApi.generateLessons(selectedSem.id);
    setGenerating(false);
    alert(`Создано ${created} уроков для группы «${selectedGroup?.name}»`);
  }

  // Экран шаблона семестра
  if (selectedSem) {
    return (
      <div className="px-4 pt-8 pb-4 flex flex-col gap-4">
        <button onClick={() => setSelectedSem(null)} className="text-primary text-sm font-body">← Назад к семестрам</button>
        <div>
          <p className="font-body text-xs text-primary font-medium">{selectedGroup?.name}</p>
          <h1 className="font-heading text-xl uppercase tracking-wide text-dark">{selectedSem.name}</h1>
          <p className="font-body text-xs text-dark/50">
            {format(new Date(selectedSem.startDate), 'd MMM yyyy', { locale: ru })} — {format(new Date(selectedSem.endDate), 'd MMM yyyy', { locale: ru })}
          </p>
        </div>

        {/* Шаблон */}
        <div className="bg-card rounded-2xl p-4">
          <p className="font-heading uppercase tracking-wide text-sm text-dark/60 mb-3">Шаблон расписания</p>
          {selectedSem.templates.length === 0 && <p className="font-body text-xs text-dark/40 mb-2">Добавь уроки ниже</p>}
          {selectedSem.templates.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-2 border-b border-black/5 last:border-0">
              <span className="font-body text-xs text-primary font-medium w-6">{DAYS[t.dayOfWeek]}</span>
              <span className="font-body text-xs text-dark/50">{String(t.timeHour).padStart(2, '0')}:{String(t.timeMinute).padStart(2, '0')}</span>
              <span className="font-heading text-sm text-dark flex-1">{t.subject}</span>
              <button onClick={() => deleteTemplate(t.id)} className="text-dark/25 hover:text-red-400 text-lg leading-none px-1 transition-colors">×</button>
            </div>
          ))}
        </div>

        {/* Форма нового урока */}
        <div className="bg-card rounded-2xl p-4 flex flex-col gap-3">
          <p className="font-heading uppercase tracking-wide text-sm text-dark/60">Добавить урок</p>
          <div className="flex gap-2 items-center">
            <select value={newTpl.dayOfWeek} onChange={(e) => setNewTpl((t) => ({ ...t, dayOfWeek: +e.target.value }))}
              className="flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary">
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
            <input type="number" min={0} max={23} value={newTpl.timeHour}
              onChange={(e) => setNewTpl((t) => ({ ...t, timeHour: +e.target.value }))}
              className="w-14 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm text-center focus:outline-none focus:border-primary" />
            <span className="text-dark/40 font-body">:</span>
            <input type="number" min={0} max={59} step={5} value={newTpl.timeMinute}
              onChange={(e) => setNewTpl((t) => ({ ...t, timeMinute: +e.target.value }))}
              className="w-14 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm text-center focus:outline-none focus:border-primary" />
          </div>
          <input type="text" placeholder="Предмет (напр. Грамматика)" value={newTpl.subject}
            onChange={(e) => setNewTpl((t) => ({ ...t, subject: e.target.value }))}
            className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
          <select value={newTpl.teacherId} onChange={(e) => setNewTpl((t) => ({ ...t, teacherId: e.target.value }))}
            className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary">
            <option value="">Учитель (необязательно)</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>)}
          </select>
          <button onClick={addTemplate} disabled={!newTpl.subject}
            className="w-full bg-primary text-white font-heading uppercase text-xs py-3 rounded-xl disabled:opacity-60">
            Добавить в шаблон
          </button>
        </div>

        {selectedSem.templates.length > 0 && (
          <button onClick={generate} disabled={generating}
            className="w-full bg-dark text-white font-heading uppercase tracking-wider py-3.5 rounded-xl text-sm disabled:opacity-60">
            {generating ? 'Генерируем...' : `Сгенерировать уроки на весь семестр`}
          </button>
        )}
      </div>
    );
  }

  // Экран семестров выбранной группы
  if (selectedGroup) {
    return (
      <div className="px-4 pt-8 pb-4 flex flex-col gap-4">
        <button onClick={() => setSelectedGroup(null)} className="text-primary text-sm font-body">← Все группы</button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl uppercase tracking-wide text-dark">{selectedGroup.name}</h1>
            <p className="font-body text-xs text-dark/50">{selectedGroup.course} курс</p>
          </div>
          <button onClick={() => setShowNewSem(!showNewSem)} className="text-primary text-sm font-body">+ Семестр</button>
        </div>

        {showNewSem && (
          <div className="bg-card rounded-2xl p-4 flex flex-col gap-3">
            <p className="font-heading uppercase tracking-wide text-sm text-dark/60">Новый семестр</p>
            <input type="text" placeholder="Название (напр. Семестр 1, 2025)" value={newSem.name}
              onChange={(e) => setNewSem((s) => ({ ...s, name: e.target.value }))}
              className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-dark/40 font-body">Начало</label>
                <input type="date" value={newSem.startDate} onChange={(e) => setNewSem((s) => ({ ...s, startDate: e.target.value }))}
                  className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-dark/40 font-body">Конец</label>
                <input type="date" value={newSem.endDate} onChange={(e) => setNewSem((s) => ({ ...s, endDate: e.target.value }))}
                  className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowNewSem(false)} className="flex-1 bg-bg text-dark/60 font-heading uppercase text-xs py-3 rounded-xl">Отмена</button>
              <button onClick={createSemester} disabled={!newSem.name || !newSem.startDate || !newSem.endDate}
                className="flex-1 bg-primary text-white font-heading uppercase text-xs py-3 rounded-xl disabled:opacity-60">Создать</button>
            </div>
          </div>
        )}

        {semesters.length === 0 && !showNewSem && (
          <div className="flex items-center justify-center h-40">
            <p className="text-dark/40 font-body text-sm">Нет семестров. Создай первый.</p>
          </div>
        )}

        {semesters.map((s) => (
          <button key={s.id} onClick={() => setSelectedSem(s)} className="bg-card rounded-2xl p-4 text-left">
            <p className="font-heading uppercase tracking-wide text-dark">{s.name}</p>
            <p className="font-body text-xs text-dark/50 mt-1">
              {format(new Date(s.startDate), 'd MMM yyyy', { locale: ru })} — {format(new Date(s.endDate), 'd MMM yyyy', { locale: ru })}
            </p>
            <p className="font-body text-xs text-primary mt-1">{s.templates.length} предметов в шаблоне</p>
          </button>
        ))}
      </div>
    );
  }

  // Главный экран — список всех групп
  return (
    <div className="px-4 pt-8 pb-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl uppercase tracking-wide text-dark">Расписание</h1>
        <button onClick={() => setShowNewGroup(!showNewGroup)} className="text-primary text-sm font-body">+ Группа</button>
      </div>

      {showNewGroup && (
        <div className="bg-card rounded-2xl p-4 flex flex-col gap-3">
          <p className="font-heading uppercase tracking-wide text-sm text-dark/60">Новая группа</p>
          <input type="text" placeholder="Название (напр. Группа 2-Б)" value={newGroup.name}
            onChange={(e) => setNewGroup((g) => ({ ...g, name: e.target.value }))}
            className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
          <select value={newGroup.course} onChange={(e) => setNewGroup((g) => ({ ...g, course: +e.target.value }))}
            className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary">
            {[1, 2, 3, 4].map((c) => <option key={c} value={c}>{c} курс</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={() => setShowNewGroup(false)} className="flex-1 bg-bg text-dark/60 font-heading uppercase text-xs py-3 rounded-xl">Отмена</button>
            <button onClick={createGroup} disabled={!newGroup.name}
              className="flex-1 bg-primary text-white font-heading uppercase text-xs py-3 rounded-xl disabled:opacity-60">Создать</button>
          </div>
        </div>
      )}

      {groups.length === 0 && !showNewGroup && (
        <div className="flex items-center justify-center h-48">
          <p className="text-dark/40 font-body text-sm text-center">Нет групп. Создай первую группу.</p>
        </div>
      )}

      {groups.map((g) => (
        <button key={g.id} onClick={() => selectGroup(g)} className="bg-card rounded-2xl p-4 text-left flex items-center justify-between">
          <div>
            <p className="font-heading uppercase tracking-wide text-dark">{g.name}</p>
            <p className="font-body text-xs text-dark/50 mt-0.5">{g.course} курс</p>
          </div>
          <span className="text-dark/30 text-lg">›</span>
        </button>
      ))}
    </div>
  );
}
