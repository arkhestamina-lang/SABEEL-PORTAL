import { create } from 'zustand';
let timer;
export const useToastStore = create((set) => ({
    message: null,
    type: 'error',
    show: (message, type = 'error') => {
        clearTimeout(timer);
        set({ message, type });
        timer = setTimeout(() => set({ message: null }), 3500);
    },
    hide: () => { clearTimeout(timer); set({ message: null }); },
}));
