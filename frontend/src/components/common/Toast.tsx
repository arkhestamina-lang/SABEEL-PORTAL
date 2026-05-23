import { useToastStore } from '../../store/toastStore';

export default function Toast() {
  const { message, type, hide } = useToastStore();
  if (!message) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[200] max-w-[480px] mx-auto animate-fade-in">
      <div className={`rounded-2xl px-4 py-3 flex items-center justify-between shadow-float ${
        type === 'error' ? 'bg-dark text-white' : 'bg-green-600 text-white'
      }`}>
        <p className="font-body text-sm">{message}</p>
        <button onClick={hide} className="text-white/60 hover:text-white ml-3 text-xl leading-none">×</button>
      </div>
    </div>
  );
}
