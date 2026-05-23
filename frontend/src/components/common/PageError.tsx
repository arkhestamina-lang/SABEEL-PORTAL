export default function PageError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-4 px-6">
      <p className="font-heading text-lg uppercase tracking-wide text-dark/40">Ошибка загрузки</p>
      <p className="font-body text-sm text-dark/40 text-center">Не удалось получить данные. Проверь соединение.</p>
      <button onClick={onRetry} className="bg-primary text-white font-heading uppercase text-xs px-6 py-3 rounded-xl tracking-wider">
        Попробовать снова
      </button>
    </div>
  );
}
