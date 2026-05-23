import { useEffect, useState } from 'react';
import { curatorApi } from '../../api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { AbsenceRequest } from '../../types';
import { useToastStore } from '../../store/toastStore';
import PageError from '../../components/common/PageError';

interface Evidence { id: number; fileName: string }

type Tab = 'absences' | 'debts';

interface DebtRequest {
  id: number;
  reason: string;
  submittedAt: string;
  status: string;
  student: { firstName: string; lastName: string };
  lesson: { subject: string; datetime: string };
  evidence: Evidence[];
}

export default function AbsencesPage() {
  const [tab, setTab] = useState<Tab>('absences');
  const [absences, setAbsences] = useState<(AbsenceRequest & { evidence: Evidence[] })[]>([]);
  const [debts, setDebts] = useState<DebtRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [photoViewer, setPhotoViewer] = useState<string | null>(null);
  const toast = useToastStore();

  function load() {
    setLoadError(false); setLoading(true);
    Promise.all([curatorApi.absences(), curatorApi.debtRequests()])
      .then(([a, d]) => { setAbsences(a); setDebts(d); setLoading(false); })
      .catch(() => { setLoadError(true); setLoading(false); });
  }
  useEffect(() => { load(); }, []);

  async function resolveAbsence(id: number, status: 'EXCUSED' | 'COUNTED') {
    try {
      await curatorApi.resolveAbsence(id, status);
      setAbsences((rs) => rs.filter((r) => r.id !== id));
    } catch { toast.show('Не удалось обработать заявку.'); }
  }

  async function resolveDebt(id: number, status: 'ACCEPTED' | 'REJECTED') {
    try {
      await curatorApi.resolveDebt(id, status);
      setDebts((ds) => ds.filter((d) => d.id !== id));
    } catch { toast.show('Не удалось обработать запрос.'); }
  }

  if (loadError) return <PageError onRetry={load} />;
  if (loading) return <div className="flex items-center justify-center min-h-dvh"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const total = absences.length + debts.length;

  return (
    <div className="px-4 pt-8 pb-4">
      <h1 className="font-heading text-2xl uppercase tracking-wide text-dark mb-1">Заявки</h1>
      <p className="font-body text-xs text-dark/50 mb-4">Ожидают решения: {total}</p>

      {/* Вкладки */}
      <div className="flex gap-2 mb-5">
        <TabBtn label="Пропуски" count={absences.length} active={tab === 'absences'} onClick={() => setTab('absences')} />
        <TabBtn label="Долги по ДЗ" count={debts.length} active={tab === 'debts'} onClick={() => setTab('debts')} />
      </div>

      {/* Пропуски */}
      {tab === 'absences' && (
        absences.length === 0 ? (
          <Empty text="Новых заявок о пропусках нет" />
        ) : (
          <div className="flex flex-col gap-3">
            {absences.map((r) => (
              <div key={r.id} className="bg-card rounded-2xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-heading uppercase tracking-wide text-dark text-sm">{r.student?.firstName} {r.student?.lastName}</p>
                    <p className="font-body text-xs text-dark/50">{r.lesson?.subject} · {r.lesson && format(new Date(r.lesson.datetime), 'd MMMM', { locale: ru })}</p>
                  </div>
                  <p className="font-body text-[10px] text-dark/30 shrink-0">{format(new Date(r.submittedAt), 'd MMM HH:mm', { locale: ru })}</p>
                </div>
                <div className="bg-bg rounded-xl px-3 py-2 mb-2">
                  <p className="font-body text-sm text-dark">{r.reason}</p>
                </div>
                {r.evidence?.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {r.evidence.map((e) => (
                      <button key={e.id} onClick={() => setPhotoViewer(`/uploads/${e.fileName}`)}
                        className="w-14 h-14 rounded-xl overflow-hidden border border-black/10 hover:border-primary shrink-0">
                        <img src={`/uploads/${e.fileName}`} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                {(!r.evidence || r.evidence.length === 0) && (
                  <p className="font-body text-[10px] text-dark/30 mb-3">Без доказательств</p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => resolveAbsence(r.id, 'EXCUSED')} className="flex-1 bg-green-100 text-green-700 font-heading uppercase text-xs py-2.5 rounded-xl">Уважительный</button>
                  <button onClick={() => resolveAbsence(r.id, 'COUNTED')} className="flex-1 bg-red-50 text-red-500 font-heading uppercase text-xs py-2.5 rounded-xl">Засчитать</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Долги по ДЗ */}
      {tab === 'debts' && (
        debts.length === 0 ? (
          <Empty text="Запросов на возмещение долга нет" />
        ) : (
          <div className="flex flex-col gap-3">
            {debts.map((d) => (
              <div key={d.id} className="bg-card rounded-2xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-heading uppercase tracking-wide text-dark text-sm">{d.student.firstName} {d.student.lastName}</p>
                    <p className="font-body text-xs text-dark/50">{d.lesson.subject} · {format(new Date(d.lesson.datetime), 'd MMMM', { locale: ru })}</p>
                  </div>
                  <p className="font-body text-[10px] text-dark/30 shrink-0">{format(new Date(d.submittedAt), 'd MMM HH:mm', { locale: ru })}</p>
                </div>
                <div className="bg-bg rounded-xl px-3 py-2 mb-2">
                  <p className="font-body text-sm text-dark">{d.reason}</p>
                </div>
                {d.evidence?.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {d.evidence.map((e) => (
                      <button key={e.id} onClick={() => setPhotoViewer(`/uploads/${e.fileName}`)}
                        className="w-14 h-14 rounded-xl overflow-hidden border border-black/10 hover:border-primary shrink-0">
                        <img src={`/uploads/${e.fileName}`} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                {(!d.evidence || d.evidence.length === 0) && (
                  <p className="font-body text-[10px] text-dark/30 mb-3">Без доказательств</p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => resolveDebt(d.id, 'ACCEPTED')} className="flex-1 bg-green-100 text-green-700 font-heading uppercase text-xs py-2.5 rounded-xl">Принять</button>
                  <button onClick={() => resolveDebt(d.id, 'REJECTED')} className="flex-1 bg-red-50 text-red-500 font-heading uppercase text-xs py-2.5 rounded-xl">Отклонить</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Просмотр доказательства */}
      {photoViewer && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPhotoViewer(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img src={photoViewer} alt="" className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain" />
            <button onClick={() => setPhotoViewer(null)} className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center text-lg">×</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-body text-sm transition-colors ${active ? 'bg-dark text-white' : 'bg-card text-dark/60'}`}
    >
      {label}
      {count > 0 && (
        <span className={`text-[10px] font-heading px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-48">
      <p className="text-dark/40 font-body text-sm">{text}</p>
    </div>
  );
}
