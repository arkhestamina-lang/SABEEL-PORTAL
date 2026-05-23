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

  const [showTeachers, setShowTeachers] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ firstName: '', lastName: '' });

  const [showNewSem, setShowNewSem] = useState(false);
  const [newSem, setNewSem] = useState({ name: '', startDate: '', endDate: '' });

  const [newTpl, setNewTpl] = useState({ days: [] as number[], timeHour: 10, timeMinute: 0, subject: '', teacherId: '', meetingUrl: '' });
  const [newHoliday, setNewHoliday] = useState({ name: '', startDate: '', endDate: '' });
  const [showHolidayForm, setShowHolidayForm] = useState(false);

  function toggleDay(day: number) {
    setNewTpl((t) => ({
      ...t,
      days: t.days.includes(day) ? t.days.filter((d) => d !== day) : [...t.days, day],
    }));
  }
  const [generating, setGenerating] = useState(false);
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [extraLesson, setExtraLesson] = useState({ subject: '', date: '', timeHour: 10, timeMinute: 0, teacherId: '', meetingUrl: '', note: '' });
  const [extraLessons, setExtraLessons] = useState<{ id: number; subject: string; datetime: string; meetingUrl: string | null; note: string | null; isCancelled: boolean }[]>([]);
  const [editUrlId, setEditUrlId] = useState<number | null>(null);
  const [editUrlValue, setEditUrlValue] = useState('');
  const [editNoteId, setEditNoteId] = useState<number | null>(null);
  const [editNoteValue, setEditNoteValue] = useState('');

  useEffect(() => {
    curatorApi.groups().then(setGroups);
    curatorApi.teachers().then(setTeachers);
  }, []);

  useEffect(() => {
    if (selectedGroup && selectedSem) loadExtraLessons(selectedGroup.id, selectedSem);
    else setExtraLessons([]);
  }, [selectedSem?.id]);

  async function addTeacher() {
    if (!newTeacher.firstName || !newTeacher.lastName) return;
    const t = await curatorApi.createTeacher(newTeacher.firstName, newTeacher.lastName);
    setTeachers((ts) => [...ts, t].sort((a, b) => a.lastName.localeCompare(b.lastName)));
    setNewTeacher({ firstName: '', lastName: '' });
  }

  async function removeTeacher(id: number) {
    await curatorApi.deleteTeacher(id);
    setTeachers((ts) => ts.filter((t) => t.id !== id));
  }

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

  async function addHoliday() {
    if (!selectedSem || !newHoliday.name || !newHoliday.startDate || !newHoliday.endDate) return;
    const result = await curatorApi.addHoliday(selectedSem.id, newHoliday.name, newHoliday.startDate, newHoliday.endDate);
    const updated = { ...selectedSem, holidays: [...(selectedSem.holidays ?? []), result] };
    setSelectedSem(updated);
    setSemesters((ss) => ss.map((s) => s.id === selectedSem.id ? updated : s));
    setNewHoliday({ name: '', startDate: '', endDate: '' });
    setShowHolidayForm(false);
    if (result.deletedLessons > 0) {
      alert(`Каникулы добавлены. Автоматически удалено ${result.deletedLessons} предстоящих уроков.`);
    }
  }

  async function deleteHoliday(id: number) {
    await curatorApi.deleteHoliday(id);
    const updated = { ...selectedSem!, holidays: selectedSem!.holidays.filter((h) => h.id !== id) };
    setSelectedSem(updated);
    setSemesters((ss) => ss.map((s) => s.id === selectedSem!.id ? updated : s));
  }

  async function deleteTemplate(templateId: number) {
    await curatorApi.deleteTemplate(templateId);
    const updated = { ...selectedSem!, templates: selectedSem!.templates.filter((t) => t.id !== templateId) };
    setSelectedSem(updated);
    setSemesters((ss) => ss.map((s) => s.id === selectedSem!.id ? updated : s));
  }

  async function addTemplate() {
    if (!selectedSem || !newTpl.subject || newTpl.days.length === 0) return;

    const newTemplates = await Promise.all(
      newTpl.days.sort().map((day) =>
        curatorApi.addTemplate(selectedSem.id, {
          dayOfWeek: day,
          timeHour: newTpl.timeHour,
          timeMinute: newTpl.timeMinute,
          subject: newTpl.subject,
          teacherId: newTpl.teacherId ? parseInt(newTpl.teacherId) : undefined,
          meetingUrl: newTpl.meetingUrl || undefined,
        })
      )
    );

    const updated = { ...selectedSem, templates: [...selectedSem.templates, ...newTemplates] };
    setSelectedSem(updated);
    setSemesters((ss) => ss.map((s) => s.id === selectedSem.id ? updated : s));
    setNewTpl({ days: [], timeHour: 10, timeMinute: 0, subject: '', teacherId: '', meetingUrl: '' });
  }

  async function generate() {
    if (!selectedSem) return;
    setGenerating(true);
    try {
      const { created } = await curatorApi.generateLessons(selectedSem.id);
      alert(`Создано ${created} уроков для группы «${selectedGroup?.name}»`);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Ошибка генерации');
    } finally {
      setGenerating(false);
    }
  }

  async function loadExtraLessons(groupId: number, sem: typeof selectedSem) {
    if (!sem) return;
    const all = await curatorApi.lessons(groupId);
    const start = new Date(sem.startDate).getTime();
    const end = new Date(sem.endDate).getTime();
    const inSem = all.filter((l: any) => new Date(l.datetime).getTime() >= start && new Date(l.datetime).getTime() <= end);
    setExtraLessons(inSem.filter((l: any) => l.isExtra));
  }

  async function addExtraLesson() {
    if (!selectedGroup || !extraLesson.subject || !extraLesson.date) return;
    const datetime = new Date(extraLesson.date);
    datetime.setHours(extraLesson.timeHour, extraLesson.timeMinute, 0, 0);
    const lesson = await curatorApi.addLesson({
      subject: extraLesson.subject,
      datetime: datetime.toISOString(),
      groupId: selectedGroup.id,
      teacherId: extraLesson.teacherId ? parseInt(extraLesson.teacherId) : undefined,
      meetingUrl: extraLesson.meetingUrl.trim() || undefined,
      note: extraLesson.note || undefined,
    });
    setExtraLessons((ls) => [...ls, lesson].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()));
    setExtraLesson({ subject: '', date: '', timeHour: 10, timeMinute: 0, teacherId: '', meetingUrl: '', note: '' });
    setShowExtraForm(false);
  }

  async function deleteExtraLesson(id: number) {
    await curatorApi.deleteLesson(id);
    setExtraLessons((ls) => ls.filter((l) => l.id !== id));
  }

  async function saveExtraUrl(id: number) {
    const updated = await curatorApi.updateLesson(id, { meetingUrl: editUrlValue.trim() || null });
    setExtraLessons((ls) => ls.map((l) => l.id === id ? { ...l, meetingUrl: updated.meetingUrl } : l));
    setEditUrlId(null);
    setEditUrlValue('');
  }

  async function saveExtraNote(id: number) {
    const updated = await curatorApi.updateLesson(id, { note: editNoteValue.trim() || null });
    setExtraLessons((ls) => ls.map((l) => l.id === id ? { ...l, note: updated.note } : l));
    setEditNoteId(null);
    setEditNoteValue('');
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

        {/* Шаблон — недельный вид */}
        <div className="bg-card rounded-2xl p-4">
          <p className="font-heading uppercase tracking-wide text-sm text-dark/60 mb-3">Шаблон расписания</p>
          {selectedSem.templates.length === 0
            ? <p className="font-body text-xs text-dark/40">Добавь уроки ниже</p>
            : (() => {
                const byDay: Record<number, typeof selectedSem.templates> = {};
                for (let i = 0; i < 7; i++) byDay[i] = [];
                for (const t of selectedSem.templates) byDay[t.dayOfWeek].push(t);
                for (const d of Object.values(byDay)) d.sort((a, b) => a.timeHour * 60 + a.timeMinute - (b.timeHour * 60 + b.timeMinute));

                return (
                  <div className="flex flex-col gap-0">
                    {DAYS.map((dayName, i) => (
                      <div key={i} className="flex items-start gap-2 py-2 border-b border-black/5 last:border-0">
                        <span className={`font-body text-[10px] font-semibold w-5 pt-1 shrink-0 ${byDay[i].length > 0 ? 'text-primary' : 'text-dark/20'}`}>
                          {dayName}
                        </span>
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {byDay[i].length === 0
                            ? <span className="font-body text-[10px] text-dark/20">—</span>
                            : byDay[i].map((t) => (
                              <div key={t.id} className="flex items-center gap-1.5 bg-bg rounded-xl px-2.5 py-1.5">
                                <div>
                                  <p className="font-heading text-[10px] uppercase tracking-wide text-dark leading-tight">{t.subject}</p>
                                  <p className="font-body text-[9px] text-muted">{String(t.timeHour).padStart(2,'0')}:{String(t.timeMinute).padStart(2,'0')}</p>
                                </div>
                                <button onClick={() => deleteTemplate(t.id)} className="text-dark/20 hover:text-red-400 transition-colors text-base leading-none ml-0.5">×</button>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
          }
        </div>

        {/* Каникулы */}
        <div className="bg-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-heading uppercase tracking-wide text-sm text-dark/60">Каникулы</p>
            <button onClick={() => setShowHolidayForm((v) => !v)} className="text-primary text-sm font-body">+ Добавить</button>
          </div>

          <p className="font-body text-[10px] text-dark/40 mb-2">Можно добавить в любой момент — уроки в этот период удалятся автоматически</p>

          {(selectedSem.holidays ?? []).length === 0 && !showHolidayForm && (
            <p className="font-body text-xs text-dark/40">Каникулы не заданы</p>
          )}

          {(selectedSem.holidays ?? []).map((h) => (
            <div key={h.id} className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
              <div>
                <p className="font-body text-xs text-dark">{h.name}</p>
                <p className="font-body text-[10px] text-dark/40">
                  {format(new Date(h.startDate), 'd MMM', { locale: ru })} — {format(new Date(h.endDate), 'd MMM yyyy', { locale: ru })}
                </p>
              </div>
              <button onClick={() => deleteHoliday(h.id)} className="text-dark/25 hover:text-red-400 text-lg leading-none px-1 transition-colors">×</button>
            </div>
          ))}

          {showHolidayForm && (
            <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-black/5">
              <input type="text" placeholder="Название (напр. Зимние каникулы)" value={newHoliday.name}
                onChange={(e) => setNewHoliday((h) => ({ ...h, name: e.target.value }))}
                className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-dark/40 font-body">Начало</label>
                  <input type="date" value={newHoliday.startDate}
                    onChange={(e) => setNewHoliday((h) => ({ ...h, startDate: e.target.value }))}
                    className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-dark/40 font-body">Конец</label>
                  <input type="date" value={newHoliday.endDate}
                    onChange={(e) => setNewHoliday((h) => ({ ...h, endDate: e.target.value }))}
                    className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowHolidayForm(false); setNewHoliday({ name: '', startDate: '', endDate: '' }); }}
                  className="flex-1 bg-bg text-dark/60 font-heading uppercase text-xs py-2.5 rounded-xl">Отмена</button>
                <button onClick={addHoliday} disabled={!newHoliday.name || !newHoliday.startDate || !newHoliday.endDate}
                  className="flex-1 bg-primary text-white font-heading uppercase text-xs py-2.5 rounded-xl disabled:opacity-60">Сохранить</button>
              </div>
            </div>
          )}
        </div>

        {/* Список разовых уроков */}
        {extraLessons.length > 0 && (
          <div className="bg-card rounded-2xl p-4">
            <p className="font-heading uppercase tracking-wide text-sm text-dark/60 mb-3">Разовые уроки ({extraLessons.length})</p>
            {extraLessons.map((l) => (
              <div key={l.id} className={`py-2.5 border-b border-black/5 last:border-0 ${l.isCancelled ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-heading text-sm uppercase ${l.isCancelled ? 'line-through text-dark/40' : 'text-dark'}`}>{l.subject}</p>
                      {l.isCancelled && <span className="text-[9px] font-body bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">Отменён</span>}
                    </div>
                    <p className="font-body text-[10px] text-dark/40">
                      {format(new Date(l.datetime), 'd MMM yyyy · HH:mm', { locale: ru })}
                    </p>

                    {/* Ссылка */}
                    {editUrlId === l.id ? (
                      <div className="flex gap-1.5 mt-1.5">
                        <input type="text" value={editUrlValue} onChange={(e) => setEditUrlValue(e.target.value)}
                          placeholder="https://..." autoFocus
                          className="flex-1 bg-bg border border-primary/40 rounded-lg px-2 py-1 font-body text-xs focus:outline-none focus:border-primary" />
                        <button onClick={() => saveExtraUrl(l.id)} className="text-primary text-xs font-body px-2 py-1 bg-primary/10 rounded-lg">Сохр.</button>
                        <button onClick={() => setEditUrlId(null)} className="text-dark/40 text-xs font-body px-1.5 py-1">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditUrlId(l.id); setEditUrlValue(l.meetingUrl ?? ''); }}
                        className="mt-1 font-body text-[10px] text-primary underline">
                        {l.meetingUrl ? '🔗 ' + l.meetingUrl.slice(0, 35) + (l.meetingUrl.length > 35 ? '...' : '') : '+ ссылка'}
                      </button>
                    )}

                    {/* Заметка */}
                    {editNoteId === l.id ? (
                      <div className="flex gap-1.5 mt-1.5">
                        <input type="text" value={editNoteValue} onChange={(e) => setEditNoteValue(e.target.value)}
                          placeholder="Заметка..." autoFocus
                          className="flex-1 bg-bg border border-primary/40 rounded-lg px-2 py-1 font-body text-xs focus:outline-none focus:border-primary" />
                        <button onClick={() => saveExtraNote(l.id)} className="text-primary text-xs font-body px-2 py-1 bg-primary/10 rounded-lg">Сохр.</button>
                        <button onClick={() => setEditNoteId(null)} className="text-dark/40 text-xs font-body px-1.5 py-1">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditNoteId(l.id); setEditNoteValue(l.note ?? ''); }}
                        className="mt-0.5 font-body text-[10px] text-dark/40 underline">
                        {l.note ? `📝 ${l.note}` : '+ заметка'}
                      </button>
                    )}
                  </div>

                  <button onClick={() => deleteExtraLesson(l.id)} className="text-dark/20 hover:text-red-400 text-lg leading-none px-1 transition-colors shrink-0">×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Разовый дополнительный урок */}
        <div className="bg-card rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowExtraForm((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5"
          >
            <span className="font-heading uppercase tracking-wide text-sm text-dark">Добавить разовый урок</span>
            <span className="text-primary text-sm font-body">{showExtraForm ? '▲' : '+'}</span>
          </button>
          {showExtraForm && (
            <div className="border-t border-black/5 px-4 pb-4 pt-3 flex flex-col gap-3">
              <p className="font-body text-[10px] text-dark/40">Разовый урок вне шаблона — не влияет на расписание</p>
              <input type="text" placeholder="Предмет" value={extraLesson.subject}
                onChange={(e) => setExtraLesson((l) => ({ ...l, subject: e.target.value }))}
                className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
              <div>
                <label className="text-[10px] text-dark/40 font-body">Дата</label>
                <input type="date" value={extraLesson.date}
                  onChange={(e) => setExtraLesson((l) => ({ ...l, date: e.target.value }))}
                  className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="flex gap-2 items-center">
                <input type="number" min={0} max={23} value={extraLesson.timeHour}
                  onChange={(e) => setExtraLesson((l) => ({ ...l, timeHour: +e.target.value }))}
                  className="w-14 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm text-center focus:outline-none focus:border-primary" />
                <span className="text-dark/40 font-body">:</span>
                <input type="number" min={0} max={59} step={5} value={extraLesson.timeMinute}
                  onChange={(e) => setExtraLesson((l) => ({ ...l, timeMinute: +e.target.value }))}
                  className="w-14 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm text-center focus:outline-none focus:border-primary" />
              </div>
              <select value={extraLesson.teacherId} onChange={(e) => setExtraLesson((l) => ({ ...l, teacherId: e.target.value }))}
                className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary">
                <option value="">Учитель (необязательно)</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>)}
              </select>
              <input type="text" placeholder="Ссылка Zoom / Meet (необязательно)" value={extraLesson.meetingUrl}
                onChange={(e) => setExtraLesson((l) => ({ ...l, meetingUrl: e.target.value }))}
                className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
              <input type="text" placeholder="Заметка (необязательно)" value={extraLesson.note}
                onChange={(e) => setExtraLesson((l) => ({ ...l, note: e.target.value }))}
                className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
              <div className="flex gap-2">
                <button onClick={() => setShowExtraForm(false)} className="flex-1 bg-bg text-dark/60 font-heading uppercase text-xs py-2.5 rounded-xl">Отмена</button>
                <button onClick={addExtraLesson} disabled={!extraLesson.subject || !extraLesson.date}
                  className="flex-1 bg-primary text-white font-heading uppercase text-xs py-2.5 rounded-xl disabled:opacity-60">Добавить</button>
              </div>
            </div>
          )}
        </div>

        {/* Шаблон расписания — форма */}
        <div className="bg-card rounded-2xl p-4 flex flex-col gap-3">
          <p className="font-heading uppercase tracking-wide text-sm text-dark/60">Добавить в шаблон расписания</p>

          {/* Выбор дней недели */}
          <div>
            <p className="font-body text-[10px] text-muted uppercase tracking-widest mb-2">
              Дни недели {newTpl.days.length > 0 && <span className="text-primary">· выбрано {newTpl.days.length}</span>}
            </p>
            <div className="flex gap-1.5">
              {DAYS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`flex-1 py-2 rounded-xl font-body text-xs font-medium transition-all active:scale-95 ${
                    newTpl.days.includes(i)
                      ? 'bg-primary text-white'
                      : 'bg-bg text-muted hover:bg-primary/10'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 items-center">
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
          <input type="text" placeholder="Ссылка Zoom / Meet (необязательно)" value={newTpl.meetingUrl}
            onChange={(e) => setNewTpl((t) => ({ ...t, meetingUrl: e.target.value }))}
            className="w-full bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary" />
          <button
            onClick={addTemplate}
            disabled={!newTpl.subject || newTpl.days.length === 0}
            className="w-full bg-primary text-white font-heading uppercase text-xs py-3 rounded-xl disabled:opacity-60 active:scale-[0.98]"
          >
            {newTpl.days.length > 1
              ? `Добавить ${newTpl.days.length} урока в шаблон`
              : 'Добавить в шаблон'}
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
          <div className="flex items-center gap-3">
            <button onClick={() => setShowNewSem(!showNewSem)} className="text-primary text-sm font-body">+ Семестр</button>
            <button
              onClick={async () => {
                if (!confirm(`Удалить группу «${selectedGroup.name}»? Все уроки, семестры и экзамены группы будут удалены. Студенты останутся, но будут откреплены от группы.`)) return;
                await curatorApi.deleteGroup(selectedGroup.id);
                setGroups((gs) => gs.filter((g) => g.id !== selectedGroup.id));
                setSelectedGroup(null);
              }}
              className="text-red-400 text-sm font-body hover:text-red-600 transition-colors"
            >Удалить</button>
          </div>
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

      {/* Учителя */}
      <div className="bg-card rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowTeachers((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <span className="font-heading uppercase tracking-wide text-sm text-dark">Учителя</span>
          <span className="text-dark/40 font-body text-sm">{showTeachers ? '▲' : `${teachers.length} чел. ▼`}</span>
        </button>

        {showTeachers && (
          <div className="border-t border-black/5 px-4 pb-4 flex flex-col gap-2">
            {teachers.length === 0 && (
              <p className="font-body text-xs text-dark/40 pt-3">Список пуст. Добавь первого учителя.</p>
            )}
            {teachers.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-black/5 last:border-0">
                <span className="font-body text-sm text-dark">{t.lastName} {t.firstName}</span>
                <button onClick={() => removeTeacher(t.id)} className="text-dark/25 hover:text-red-400 text-lg leading-none px-1 transition-colors">×</button>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Фамилия"
                value={newTeacher.lastName}
                onChange={(e) => setNewTeacher((v) => ({ ...v, lastName: e.target.value }))}
                className="flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                placeholder="Имя"
                value={newTeacher.firstName}
                onChange={(e) => setNewTeacher((v) => ({ ...v, firstName: e.target.value }))}
                className="flex-1 bg-bg border border-black/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-primary"
              />
              <button
                onClick={addTeacher}
                disabled={!newTeacher.firstName || !newTeacher.lastName}
                className="bg-primary text-white font-heading uppercase text-xs px-4 py-2 rounded-xl disabled:opacity-50 shrink-0"
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>

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
