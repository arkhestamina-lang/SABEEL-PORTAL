import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await authApi.login(email, password);
      setAuth(token, user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-dvh bg-bg px-6">
      {/* Header */}
      <div className="pt-16 pb-12">
        <p className="font-body text-[10px] tracking-[0.2em] uppercase text-muted mb-2">Онлайн-университет</p>
        <h1 className="font-heading text-[32px] uppercase tracking-wide text-dark leading-none">Sabeel</h1>
        <div className="w-8 h-0.5 bg-primary mt-3" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 fade-up">
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[11px] uppercase tracking-widest text-muted">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full bg-card rounded-2xl px-4 py-3.5 font-body text-sm text-dark placeholder:text-muted/50 border border-border focus:outline-none focus:border-primary"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[11px] uppercase tracking-widest text-muted">Пароль</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-card rounded-2xl px-4 py-3.5 font-body text-sm text-dark placeholder:text-muted/50 border border-border focus:outline-none focus:border-primary pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-dark"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <p className="font-body text-[12px] text-red-500 bg-red-50 px-4 py-2.5 rounded-xl">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full bg-primary text-white rounded-2xl py-4 font-heading uppercase tracking-widest text-sm shadow-blue flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-primary/90 active:scale-[0.98]"
        >
          {loading ? 'Входим...' : (
            <><span>Войти</span><ArrowRight size={16} /></>
          )}
        </button>
      </form>

      <p className="mt-8 text-center font-body text-sm text-muted">
        Нет аккаунта?{' '}
        <Link to="/register" className="text-primary font-semibold">Зарегистрироваться</Link>
      </p>
    </div>
  );
}
