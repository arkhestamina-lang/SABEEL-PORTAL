import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import type { Role } from '../../types';

interface Group { id: number; name: string; course: number }

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: 'STUDENT',  label: 'Студент',  desc: 'Слежу за своей успеваемостью' },
  { value: 'CURATOR',  label: 'Куратор',  desc: 'Управляю группой и расписанием' },
];

export default function RegisterPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', groupId: '', secretCode: '' });
  const [showPw, setShowPw] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => { authApi.groups().then(setGroups).catch(() => {}); }, []);

  function update(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setError(''); setLoading(true);
    try {
      const payload: Record<string, unknown> = { role, firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password };
      if (role === 'STUDENT') {
        const g = groups.find((g) => g.id === parseInt(form.groupId));
        payload.groupId = parseInt(form.groupId);
        payload.course = g?.course ?? 1;
      } else {
        payload.secretCode = form.secretCode;
      }
      const { token, user } = await authApi.register(payload);
      setAuth(token, user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  }

  /* --- Выбор роли --- */
  if (!role) {
    return (
      <div className="flex flex-col min-h-dvh bg-bg px-6">
        <div className="pt-16 pb-10">
          <p className="font-body text-[10px] tracking-[0.2em] uppercase text-muted mb-2">Регистрация</p>
          <h1 className="font-heading text-[28px] uppercase tracking-wide text-dark leading-none">Кто вы?</h1>
          <div className="w-8 h-0.5 bg-primary mt-3" />
        </div>

        <div className="flex flex-col gap-3 fade-up">
          {ROLES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRole(r.value)}
              className="bg-card rounded-2xl px-5 py-4 text-left flex items-center justify-between shadow-card hover:shadow-float active:scale-[0.98]"
            >
              <div>
                <p className="font-heading uppercase tracking-wide text-dark text-base">{r.label}</p>
                <p className="font-body text-xs text-muted mt-0.5">{r.desc}</p>
              </div>
              <ArrowRight size={16} className="text-muted" />
            </button>
          ))}
        </div>

        <p className="mt-auto pb-8 text-center font-body text-sm text-muted">
          Уже есть аккаунт? <Link to="/login" className="text-primary font-semibold">Войти</Link>
        </p>
      </div>
    );
  }

  /* --- Форма --- */
  return (
    <div className="flex flex-col min-h-dvh bg-bg px-6 overflow-y-auto">
      <div className="pt-12 pb-8">
        <button onClick={() => setRole(null)} className="flex items-center gap-1.5 text-muted hover:text-dark mb-6">
          <ArrowLeft size={16} />
          <span className="font-body text-sm">Назад</span>
        </button>
        <p className="font-body text-[10px] tracking-[0.2em] uppercase text-muted mb-1">
          {role === 'STUDENT' ? 'Студент' : 'Куратор'}
        </p>
        <h1 className="font-heading text-[28px] uppercase tracking-wide text-dark">Регистрация</h1>
        <div className="w-8 h-0.5 bg-primary mt-3" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 pb-8 fade-up">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Имя" value={form.firstName} onChange={(v) => update('firstName', v)} />
          <Field label="Фамилия" value={form.lastName} onChange={(v) => update('lastName', v)} />
        </div>
        <Field label="Email" type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="you@example.com" />

        {/* Password with toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[11px] uppercase tracking-widest text-muted">Пароль</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="Минимум 6 символов"
              required
              className="w-full bg-card rounded-2xl px-4 py-3.5 font-body text-sm border border-border focus:outline-none focus:border-primary pr-12"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {role === 'STUDENT' && (
          <div className="flex flex-col gap-1.5">
            <label className="font-body text-[11px] uppercase tracking-widest text-muted">Группа</label>
            {groups.length === 0 ? (
              <p className="font-body text-xs text-muted bg-card rounded-2xl px-4 py-3.5 border border-border">
                Группы не созданы — обратись к куратору
              </p>
            ) : (
              <select
                value={form.groupId}
                onChange={(e) => update('groupId', e.target.value)}
                required
                className="w-full bg-card rounded-2xl px-4 py-3.5 font-body text-sm border border-border focus:outline-none focus:border-primary"
              >
                <option value="">Выбери группу...</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name} · {g.course} курс</option>
                ))}
              </select>
            )}
          </div>
        )}

        {role === 'CURATOR' && (
          <Field label="Секретный код" type="password" value={form.secretCode} onChange={(v) => update('secretCode', v)} placeholder="Выдаётся администратором" />
        )}

        {error && (
          <p className="font-body text-[12px] text-red-500 bg-red-50 px-4 py-2.5 rounded-xl">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full bg-primary text-white rounded-2xl py-4 font-heading uppercase tracking-widest text-sm shadow-blue flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-primary/90 active:scale-[0.98]"
        >
          {loading ? 'Создаём аккаунт...' : (
            <><span>Зарегистрироваться</span><ArrowRight size={16} /></>
          )}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-body text-[11px] uppercase tracking-widest text-muted">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full bg-card rounded-2xl px-4 py-3.5 font-body text-sm border border-border focus:outline-none focus:border-primary"
      />
    </div>
  );
}
