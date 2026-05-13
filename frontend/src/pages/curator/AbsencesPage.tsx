import { useEffect, useState } from 'react';
import { curatorApi } from '../../api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { AbsenceRequest } from '../../types';

export default function AbsencesPage() {
  const [requests, setRequests] = useState<AbsenceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    curatorApi.absences().then((r) => { setRequests(r); setLoading(false); });
  }, []);

  async function resolve(id: number, status: 'EXCUSED' | 'COUNTED') {
    await curatorApi.resolveAbsence(id, status);
    setRequests((rs) => rs.filter((r) => r.id !== id));
  }

  if (loading) return <div className="flex items-center justify-center min-h-dvh"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 pt-8 pb-4">
      <h1 className="font-heading text-2xl uppercase tracking-wide text-dark mb-2">Заявки</h1>
      <p className="font-body text-xs text-dark/50 mb-5">Ожидают решения: {requests.length}</p>

      {requests.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-dark/40 font-body text-sm">Новых заявок нет</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <div key={r.id} className="bg-card rounded-2xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-heading uppercase tracking-wide text-dark text-sm">{r.student?.firstName} {r.student?.lastName}</p>
                  <p className="font-body text-xs text-dark/50">{r.lesson?.subject} · {r.lesson && format(new Date(r.lesson.datetime), 'd MMMM', { locale: ru })}</p>
                </div>
                <p className="font-body text-[10px] text-dark/30">{format(new Date(r.submittedAt), 'd MMM HH:mm', { locale: ru })}</p>
              </div>

              <div className="bg-bg rounded-xl px-3 py-2 mb-3">
                <p className="font-body text-sm text-dark">{r.reason}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => resolve(r.id, 'EXCUSED')}
                  className="flex-1 bg-green-100 text-green-700 font-heading uppercase text-xs py-2.5 rounded-xl"
                >Уважительный</button>
                <button
                  onClick={() => resolve(r.id, 'COUNTED')}
                  className="flex-1 bg-red-50 text-red-500 font-heading uppercase text-xs py-2.5 rounded-xl"
                >Засчитать</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
