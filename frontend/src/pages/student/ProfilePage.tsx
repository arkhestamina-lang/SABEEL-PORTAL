import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  async function handleDelete() {
    await authApi.deleteAccount();
    logout();
    navigate('/login');
  }

  return (
    <div className="px-4 pt-8 pb-4 flex flex-col gap-4">
      <h1 className="font-heading text-2xl uppercase tracking-wide text-dark">Профиль</h1>

      <div className="bg-card rounded-2xl p-5 flex flex-col gap-3">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="font-heading text-2xl text-primary">{user?.firstName?.[0]}</span>
        </div>
        <div>
          <p className="font-heading text-xl uppercase text-dark">{user?.firstName} {user?.lastName}</p>
          <p className="font-body text-sm text-dark/50">{user?.email}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {user?.course && <Badge label={`${user.course} курс`} />}
          {user?.group && <Badge label={user.group.name} />}
        </div>
      </div>

      <button onClick={handleLogout} className="w-full bg-card border border-black/10 text-dark/60 font-heading uppercase tracking-wider py-3.5 rounded-xl text-sm">
        Выйти
      </button>

      {!confirmDelete ? (
        <button onClick={() => setConfirmDelete(true)} className="w-full text-red-400 font-body text-sm py-2">
          Удалить аккаунт
        </button>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-2">
          <p className="font-body text-sm text-dark text-center">Удалить аккаунт навсегда?</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="flex-1 bg-bg text-dark/60 font-heading uppercase text-xs py-3 rounded-xl">Отмена</button>
            <button onClick={handleDelete} className="flex-1 bg-red-500 text-white font-heading uppercase text-xs py-3 rounded-xl">Удалить</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return <span className="bg-bg font-body text-xs text-dark/60 px-3 py-1 rounded-full">{label}</span>;
}
