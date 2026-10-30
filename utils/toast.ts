export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

export const TOAST_EVENT = 'pontaj:toast';

export const showToast = (message: string, type: ToastType = 'info') => {
    if (typeof window === 'undefined') return;
    const item: ToastItem = {
        id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        message,
        type,
    };
    window.dispatchEvent(new CustomEvent<ToastItem>(TOAST_EVENT, { detail: item }));
};
