import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { authApi, curatorApi } from '../../api';
import { Lock, Download } from 'lucide-react';

export default function CuratorProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '' });
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleDelete() {
    await authApi.deleteAccount();
    logout();
    navigate('/login');
  }


  return (
    <div className="px-4 pt-8 pb-4 flex flex-col gap-4">
      <h1 className="font-heading text-2xl uppercase tracking-wide text-dark">Профиль</h1>

      {/* Инфо */}
      <div className="bg-card rounded-2xl p-5 flex flex-col gap-3">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="font-heading text-2xl text-primary">{user?.firstName?.[0]}</span>
        </div>
        <div>
          <p className="font-heading text-xl uppercase text-dark">{user?.firstName} {user?.lastName}</p>
          <p className="font-body text-sm text-dark/50">{user?.email}</p>
          <p className="font-body text-xs text-dark/40 mt-1">Куратор</p>
        </div>
      </div>


      {/* Экспорт в Excel */}
      <button
        onClick={async () => {
          setExporting(true);
          try {
            const blob = await curatorApi.exportExcel();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sabeel_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
          } finally { setExporting(false); }
        }}
        disabled={exporting}
        className="w-full bg-card rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-black/10 hover:shadow-float active:scale-[0.98] disabled:opacity-60"
      >
        <Download size={16} className="text-primary" />
        <span className="font-body text-sm text-dark">{exporting ? 'Генерируем файл...' : 'Экспорт данных в Excel'}</span>
      </button>

      {/* Смена пароля */}
      {!showPwForm ? (
        <button onClick={() => setShowPwForm(true)} className="w-full bg-card rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-black/10 hover:shadow-float active:scale-[0.98]">
          <Lock size={16} className="text-muted" />
          <span className="font-body text-sm text-dark">Сменить пароль</span>
        </button>
      ) : (
        <div className="bg-card rounded-2xl p-4 flex flex-col gap-3">
          <p className="font-heading uppercase tracking-wide text-sm text-dark">Смена пароля</p>
          <input type="password" placeholder="Текущий пароль" value={pwForm.current}
            onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
            className="w-full bg-bg border border-black/10 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-primary" />
          <input type="password" placeholder="Новый пароль (минимум 6 символов)" value={pwForm.next}
            onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
            className="w-full bg-bg border border-black/10 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-primary" />
          {pwError && <p className="font-body text-xs text-red-500">{pwError}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setShowPwForm(false); setPwForm({ current: '', next: '' }); setPwError(''); }}
              className="flex-1 bg-bg text-dark/50 font-heading uppercase text-xs py-3 rounded-xl">Отмена</button>
            <button disabled={pwSaving || !pwForm.current || !pwForm.next} onClick={async () => {
              setPwError(''); setPwSaving(true);
              try {
                await authApi.changePassword(pwForm.current, pwForm.next);
                setShowPwForm(false); setPwForm({ current: '', next: '' });
              } catch (e: any) { setPwError(e.response?.data?.error || 'Ошибка'); }
              setPwSaving(false);
            }} className="flex-1 bg-primary text-white font-heading uppercase text-xs py-3 rounded-xl disabled:opacity-50">
              {pwSaving ? '...' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => { logout(); navigate('/login'); }}
        className="w-full bg-card border border-black/10 text-dark/60 font-heading uppercase tracking-wider py-3.5 rounded-xl text-sm"
      >
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
