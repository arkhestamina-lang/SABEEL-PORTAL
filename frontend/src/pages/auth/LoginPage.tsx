import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setError(err.response?.data?.error || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-dvh bg-bg px-6 pt-16 pb-8">
      <div className="mb-10">
        <h1 className="font-heading text-2xl uppercase tracking-wide text-dark">Sabeel University</h1>
        <p className="text-dark/50 text-sm mt-1 font-body tracking-widest uppercase text-xs">Portal</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-body font-medium text-dark/60 uppercase tracking-wider">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full bg-card border border-black/10 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-primary"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="text-xs font-body font-medium text-dark/60 uppercase tracking-wider">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full bg-card border border-black/10 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-primary"
            placeholder="••••••"
            required
          />
        </div>

        {error && <p className="text-red-500 text-sm font-body">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full bg-primary text-white font-heading uppercase tracking-wider py-3.5 rounded-xl text-sm disabled:opacity-60"
        >
          {loading ? 'Входим...' : 'Войти'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm font-body text-dark/50">
        Нет аккаунта?{' '}
        <Link to="/register" className="text-primary font-medium">Зарегистрироваться</Link>
      </p>
    </div>
  );
}
