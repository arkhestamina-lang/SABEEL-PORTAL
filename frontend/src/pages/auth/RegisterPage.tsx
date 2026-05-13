import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import type { Role } from '../../types';

interface Group { id: number; name: string; course: number }

export default function RegisterPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', course: 1, groupId: '', secretCode: '' });
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    authApi.groups().then(setGroups).catch(() => {});
  }, []);

  function update(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setError('');
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { role, firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password };
      if (role === 'STUDENT') { payload.course = form.course; payload.groupId = parseInt(form.groupId); }
      else payload.secretCode = form.secretCode;

      const { token, user } = await authApi.register(payload);
      setAuth(token, user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  }

  if (!role) {
    return (
      <div className="flex flex-col min-h-dvh bg-bg px-6 pt-16 pb-8">
        <div className="mb-10">
          <h1 className="font-heading text-2xl uppercase tracking-wide text-dark">Sabeel University</h1>
          <p className="text-dark/50 text-sm mt-1 font-body">Выбери свою роль</p>
        </div>
        <div className="flex flex-col gap-3">
          {(['STUDENT', 'CURATOR'] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className="bg-card border border-black/10 rounded-xl px-5 py-4 text-left"
            >
              <p className="font-heading uppercase tracking-wide text-dark text-base">
                {r === 'STUDENT' ? 'Студент' : r === 'TEACHER' ? 'Учитель' : 'Куратор'}
              </p>
              <p className="font-body text-xs text-dark/50 mt-0.5">
                {r === 'STUDENT' ? 'Слежу за своей успеваемостью' : 'Управляю группой и расписанием'}
              </p>
            </button>
          ))}
        </div>
        <p className="mt-auto text-center text-sm font-body text-dark/50">
          Уже есть аккаунт? <Link to="/login" className="text-primary font-medium">Войти</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-bg px-6 pt-12 pb-8 overflow-y-auto">
      <button onClick={() => setRole(null)} className="text-primary text-sm font-body mb-6">← Назад</button>
      <h1 className="font-heading text-2xl uppercase tracking-wide text-dark mb-6">
        {role === 'STUDENT' ? 'Студент' : role === 'TEACHER' ? 'Учитель' : 'Куратор'}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Имя" value={form.firstName} onChange={(v) => update('firstName', v)} />
        <Field label="Фамилия" value={form.lastName} onChange={(v) => update('lastName', v)} />
        <Field label="Email" type="email" value={form.email} onChange={(v) => update('email', v)} />
        <Field label="Пароль" type="password" value={form.password} onChange={(v) => update('password', v)} placeholder="Минимум 6 символов" />

        {role === 'STUDENT' && (
          <>
            <div>
              <label className="text-xs font-body font-medium text-dark/60 uppercase tracking-wider">Группа</label>
              {groups.length === 0 ? (
                <p className="mt-2 text-xs font-body text-dark/40 bg-bg rounded-xl px-4 py-3">
                  Группы ещё не созданы. Обратись к куратору.
                </p>
              ) : (
                <select
                  value={form.groupId}
                  onChange={(e) => {
                    const g = groups.find((g) => g.id === parseInt(e.target.value));
                    update('groupId', e.target.value);
                    if (g) update('course', g.course);
                  }}
                  className="mt-1 w-full bg-card border border-black/10 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-primary"
                  required
                >
                  <option value="">Выбери группу...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({g.course} курс)</option>
                  ))}
                </select>
              )}
            </div>
          </>
        )}

        {(role === 'CURATOR' || role === 'TEACHER') && (
          <Field label="Секретный код" type="password" value={form.secretCode} onChange={(v) => update('secretCode', v)} placeholder="Выдаётся администратором" />
        )}

        {error && <p className="text-red-500 text-sm font-body">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full bg-primary text-white font-heading uppercase tracking-wider py-3.5 rounded-xl text-sm disabled:opacity-60"
        >
          {loading ? 'Регистрируем...' : 'Зарегистрироваться'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-body font-medium text-dark/60 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full bg-card border border-black/10 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-primary"
        required
      />
    </div>
  );
}
