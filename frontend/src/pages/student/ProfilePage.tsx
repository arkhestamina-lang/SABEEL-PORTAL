import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { LogOut, Trash2, ChevronRight } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleLogout() { logout(); navigate('/login'); }

  async function handleDelete() {
    await authApi.deleteAccount();
    logout();
    navigate('/login');
  }

  return (
    <div className="px-4 pt-8 pb-4 flex flex-col gap-4">
      <div className="fade-up">
        <p className="font-body text-[10px] tracking-[0.2em] uppercase text-muted">Профиль</p>
        <h1 className="font-heading text-2xl uppercase tracking-wide text-dark mt-1">Личный кабинет</h1>
        <div className="w-8 h-0.5 bg-primary mt-2" />
      </div>

      {/* Аватар + имя */}
      <div className="bg-card rounded-2xl p-5 shadow-card flex items-center gap-4 fade-up">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="font-heading text-2xl text-primary">{user?.firstName?.[0]}</span>
        </div>
        <div>
          <p className="font-heading text-lg uppercase tracking-wide text-dark">{user?.firstName} {user?.lastName}</p>
          <p className="font-body text-xs text-muted">{user?.email}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {user?.course && <Chip label={`${user.course} курс`} />}
            {user?.group?.name && <Chip label={user.group.name} />}
            <Chip label="Студент" />
          </div>
        </div>
      </div>

      {/* Действия */}
      <div className="flex flex-col gap-2 mt-2 fade-up">
        <button
          onClick={handleLogout}
          className="w-full bg-card rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-card hover:shadow-float active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <LogOut size={16} className="text-muted" />
            <span className="font-body text-sm text-dark">Выйти из аккаунта</span>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </button>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full bg-card rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-card hover:shadow-float active:scale-[0.98]"
          >
            <Trash2 size={16} className="text-red-400" />
            <span className="font-body text-sm text-red-400">Удалить аккаунт</span>
          </button>
        ) : (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
            <p className="font-body text-sm text-dark text-center mb-3">Удалить аккаунт навсегда?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 bg-card text-muted font-heading uppercase text-xs py-2.5 rounded-xl">Отмена</button>
              <button onClick={handleDelete} className="flex-1 bg-red-500 text-white font-heading uppercase text-xs py-2.5 rounded-xl">Удалить</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return <span className="bg-bg font-body text-[10px] text-muted px-2.5 py-1 rounded-lg">{label}</span>;
}
