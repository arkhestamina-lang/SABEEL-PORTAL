import { create } from 'zustand';

interface ToastState {
  message: string | null;
  type: 'error' | 'success';
  show: (message: string, type?: 'error' | 'success') => void;
  hide: () => void;
}

let timer: ReturnType<typeof setTimeout>;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: 'error',
  show: (message, type = 'error') => {
    clearTimeout(timer);
    set({ message, type });
    timer = setTimeout(() => set({ message: null }), 3500);
  },
  hide: () => { clearTimeout(timer); set({ message: null }); },
}));
