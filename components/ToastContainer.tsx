import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { TOAST_EVENT, ToastItem } from '../utils/toast';

const ToastContainer: React.FC = () => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    useEffect(() => {
        const handleToast = (e: Event) => {
            const custom = e as CustomEvent<ToastItem>;
            if (!custom.detail) return;
            const item = custom.detail;
            setToasts(prev => [...prev.slice(-4), item]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== item.id));
            }, 4000);
        };
        window.addEventListener(TOAST_EVENT, handleToast);
        return () => window.removeEventListener(TOAST_EVENT, handleToast);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[80] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
            {toasts.map(t => {
                const styles =
                    t.type === 'success'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : t.type === 'error'
                        ? 'bg-rose-600 text-white border-rose-500'
                        : t.type === 'warning'
                        ? 'bg-amber-500 text-white border-amber-400'
                        : 'bg-slate-800 text-white border-slate-700';

                const Icon =
                    t.type === 'success'
                        ? CheckCircle2
                        : t.type === 'error'
                        ? AlertCircle
                        : t.type === 'warning'
                        ? AlertTriangle
                        : Info;

                return (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border ${styles} animate-in fade-in slide-in-from-bottom-2 duration-200`}
                    >
                        <Icon size={18} className="shrink-0 mt-0.5" />
                        <span className="text-sm font-semibold leading-snug flex-1">{t.message}</span>
                        <button
                            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                            className="opacity-75 hover:opacity-100 transition-opacity p-0.5"
                            aria-label="Închide notificarea"
                        >
                            <X size={16} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default ToastContainer;
