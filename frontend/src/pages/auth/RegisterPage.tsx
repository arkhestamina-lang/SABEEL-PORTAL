import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', secretCode: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { token, user } = await authApi.register({
        role: 'CURATOR', firstName: form.firstName, lastName: form.lastName,
        email: form.email, password: form.password, secretCode: form.secretCode,
      });
      setAuth(token, user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-dvh bg-bg px-6 overflow-y-auto">
      <div className="pt-12 pb-8">
        <p className="font-body text-[10px] tracking-[0.2em] uppercase text-muted mb-1">Регистрация куратора</p>
        <h1 className="font-heading text-[28px] uppercase tracking-wide text-dark">Sabeel Portal</h1>
        <div className="w-8 h-0.5 bg-primary mt-3" />
        <p className="font-body text-xs text-muted mt-3">Студенты получают доступ от куратора — самостоятельная регистрация закрыта.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 pb-8 fade-up">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Имя" value={form.firstName} onChange={(v) => update('firstName', v)} />
          <Field label="Фамилия" value={form.lastName} onChange={(v) => update('lastName', v)} />
        </div>
        <Field label="Логин" type="text" value={form.email} onChange={(v) => update('email', v)} placeholder="curator.name" />
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[11px] uppercase tracking-widest text-muted">Пароль</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="Минимум 6 символов" required
              className="w-full bg-card rounded-2xl px-4 py-3.5 font-body text-sm border border-border focus:outline-none focus:border-primary pr-12" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <Field label="Секретный код" type="password" value={form.secretCode}
          onChange={(v) => update('secretCode', v)} placeholder="Выдаётся администратором" />

        {error && <p className="font-body text-[12px] text-red-500 bg-red-50 px-4 py-2.5 rounded-xl">{error}</p>}

        <button type="submit" disabled={loading}
          className="mt-2 w-full bg-primary text-white rounded-2xl py-4 font-heading uppercase tracking-widest text-sm shadow-blue flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-primary/90 active:scale-[0.98]">
          {loading ? 'Создаём аккаунт...' : <><span>Зарегистрироваться</span><ArrowRight size={16} /></>}
        </button>
      </form>

      <p className="mt-auto pb-8 text-center font-body text-sm text-muted">
        Уже есть аккаунт? <Link to="/login" className="text-primary font-semibold">Войти</Link>
      </p>
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
