import React, { useEffect, useState } from 'react';
import { LogOut, RefreshCw, Sun, Moon, Download, Monitor, Smartphone, Palmtree, PlusCircle, Bell, ShieldAlert, Mail, X } from 'lucide-react';
import ClockWidget from './ClockWidget';
import { User, Office, BreakConfig, Holiday, LeaveRequest, LeaveStatus, ShiftStatus, Coordinates, Notification, DailySchedule, WorkSchedule } from '../types';
import { formatDateRO, countWorkingDays, toLocalDateISO } from '../utils/date';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface MobileClockScreenProps {
    user: User;
    companyName?: string;
    offices: Office[];
    breakConfigs: BreakConfig[];
    holidays: Holiday[];
    schedulePlans?: DailySchedule[];
    workSchedules?: WorkSchedule[];
    activeLeaveRequest?: LeaveRequest;
    shiftStartTime?: string;
    shiftEndTime?: string;
    accumulatedBreakTime: number;
    activeBreakStartTime?: string;
    currentStatus: ShiftStatus;
    theme: 'light' | 'dark';
    isGlobalLoading: boolean;
    onClockIn: (loc: Coordinates, off: Office | null, dist: number) => void;
    onClockOut: (loc: Coordinates, note?: string) => void;
    onToggleBreak: (cfg?: BreakConfig, loc?: Coordinates) => void;
    onRefresh: () => void;
    onToggleTheme: () => void;
    onLogout: () => void;
    onSwitchToFullApp: () => void;
    canSwitchToFullApp?: boolean;
    myLeaves?: LeaveRequest[];
    onOpenLeaveModal?: () => void;
    onCancelLeave?: (leaveId: string) => void;
    notifications?: Notification[];
    unreadCount?: number;
    onMarkNotificationRead?: (id: string) => void;
}

const MobileClockScreen: React.FC<MobileClockScreenProps> = ({
    user,
    companyName,
    offices,
    breakConfigs,
    holidays,
    schedulePlans = [],
    workSchedules = [],
    activeLeaveRequest,
    shiftStartTime,
    shiftEndTime,
    accumulatedBreakTime,
    activeBreakStartTime,
    currentStatus,
    theme,
    isGlobalLoading,
    onClockIn,
    onClockOut,
    onToggleBreak,
    onRefresh,
    onToggleTheme,
    onLogout,
    onSwitchToFullApp,
    canSwitchToFullApp = false,
    myLeaves = [],
    onOpenLeaveModal,
    onCancelLeave,
    notifications = [],
    unreadCount = 0,
    onMarkNotificationRead
}) => {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(() => (typeof window !== 'undefined' ? (window as any).__deferredInstallPrompt || null : null));
    const [isStandalone, setIsStandalone] = useState(false);
    const [showInstallHelp, setShowInstallHelp] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showIosBanner, setShowIosBanner] = useState<boolean>(() => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent));

    useEffect(() => {
        const standalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;
        setIsStandalone(standalone);

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
        };

        const handleAppInstalled = () => {
            setInstallPrompt(null);
            setIsStandalone(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        const promptEvent = installPrompt || (typeof window !== 'undefined' ? (window as any).__deferredInstallPrompt : null);
        if (!promptEvent) {
            setShowInstallHelp(true);
            return;
        }
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
            (window as any).__deferredInstallPrompt = null;
            setInstallPrompt(null);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 font-sans select-none transition-colors duration-300">
            {isGlobalLoading && (
                <div className="fixed inset-0 bg-white/70 dark:bg-black/70 z-[60] flex items-center justify-center backdrop-blur-[1px]">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl flex items-center gap-3 border border-gray-100 dark:border-gray-700">
                        <RefreshCw className="animate-spin text-emerald-600 dark:text-emerald-400" size={24} />
                        <span className="font-bold text-gray-700 dark:text-gray-300">Se procesează...</span>
                    </div>
                </div>
            )}

            {/* Compact Android App Top Bar */}
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between shadow-xs sticky top-0 z-30">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs">
                        <Smartphone size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm tracking-tight text-slate-800 dark:text-white truncate">
                                Bioeel Pontaj
                            </span>
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                                Mobil
                            </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                            {user.name}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowNotifications(v => !v)}
                        className="relative p-2 rounded-lg text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-emerald-600 transition-colors"
                        title="Notificări"
                    >
                        <Bell size={18} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={onRefresh}
                        className="p-2 rounded-lg text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-emerald-600 transition-colors"
                        title="Reîmprospătează"
                    >
                        <RefreshCw size={18} />
                    </button>
                    <button
                        onClick={onToggleTheme}
                        className="p-2 rounded-lg text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-amber-500 transition-colors"
                        title="Schimbă tema"
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    {canSwitchToFullApp && (
                        <button
                            onClick={onSwitchToFullApp}
                            className="p-2 rounded-lg text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-emerald-600 transition-colors"
                            title="Deschide aplicația completă"
                        >
                            <Monitor size={18} />
                        </button>
                    )}
                    <button
                        onClick={onLogout}
                        className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        title="Deconectare"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* Android PWA One-Tap Install Banner */}
            {!isStandalone && (
                <div className="mx-4 mt-4 p-3.5 rounded-xl bg-emerald-600 text-white shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <Download size={20} className="shrink-0" />
                        <div className="text-xs leading-snug">
                            <p className="font-bold">Adaugă Iconița pe Ecranul Telefonului</p>
                            <p className="opacity-90">Acces rapid de pe ecranul telefonului</p>
                        </div>
                    </div>
                    <button
                        onClick={handleInstallClick}
                        className="px-3.5 py-2 bg-white text-emerald-700 font-bold text-xs rounded-lg shadow-xs shrink-0 active:scale-95 transition-transform"
                    >
                        Instalează
                    </button>
                </div>
            )}

            {!isStandalone && !installPrompt && showIosBanner && (
                <div className="mx-4 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between gap-2">
                    <span>📱 <strong>iPhone:</strong> în Safari apăsați <strong>Share (Partajează)</strong> → <strong>Adaugă la ecranul principal</strong>.</span>
                    <button onClick={() => setShowIosBanner(false)} className="text-emerald-600 dark:text-emerald-400 font-bold px-1.5">✕</button>
                </div>
            )}

            {showInstallHelp && (
                <div className="mx-4 mt-2 p-3.5 rounded-xl bg-white dark:bg-gray-900 border-2 border-emerald-500 shadow-lg text-xs space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">Cum adaugi iconița pe ecran (10 secunde):</span>
                        <button onClick={() => setShowInstallHelp(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">• <strong>Android (Chrome):</strong> apasă meniul <strong>⋮</strong> (dreapta-sus) → <strong>„Adaugă pe ecranul de pornire” / „Instalează aplicația”</strong>.</p>
                    <p className="text-gray-700 dark:text-gray-300">• <strong>iPhone (Safari):</strong> apasă butonul <strong>Share (Partajează)</strong> (jos) → <strong>„Adaugă la ecranul principal”</strong>.</p>
                </div>
            )}

            {showNotifications && (
                <div className="mx-4 mt-3 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl space-y-2.5 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                            <Bell size={14} /> Notificări ({notifications.length})
                        </h3>
                        <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                    </div>
                    {notifications.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">Nu aveți notificări recente.</p>
                    ) : (
                        notifications.slice(0, 15).map(n => (
                            <div key={n.id} className={`p-2.5 rounded-xl border text-xs flex gap-2.5 ${n.isRead ? 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800' : 'bg-emerald-50/70 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'}`}>
                                <div className={`mt-0.5 p-1.5 rounded-full shrink-0 h-fit ${n.type === 'ALERT' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                    {n.type === 'ALERT' ? <ShieldAlert size={13} /> : <Mail size={13} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <span className={`font-bold ${n.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>{n.title}</span>
                                        <span className="text-[10px] text-gray-400 shrink-0">{formatDateRO(n.date)}</span>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 mt-0.5 leading-snug">{n.message}</p>
                                    {!n.isRead && onMarkNotificationRead && (
                                        <button onClick={() => onMarkNotificationRead(n.id)} className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline mt-1">
                                            Marchează citit
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Main Clocking Area (Strictly ClockWidget) */}
            <main className="flex-1 flex flex-col justify-center p-4 max-w-md w-full mx-auto">
                <ClockWidget
                    key={user.id}
                    user={user}
                    companyName={companyName}
                    offices={offices}
                    breakConfigs={breakConfigs}
                    holidays={holidays}
                    schedulePlans={schedulePlans}
                    workSchedules={workSchedules}
                    activeLeaveRequest={activeLeaveRequest}
                    shiftStartTime={shiftStartTime}
                    shiftEndTime={shiftEndTime}
                    accumulatedBreakTime={accumulatedBreakTime}
                    activeBreakStartTime={activeBreakStartTime}
                    currentStatus={currentStatus}
                    onClockIn={onClockIn}
                    onClockOut={onClockOut}
                    onToggleBreak={onToggleBreak}
                />

                {onOpenLeaveModal && (
                    <div className="mt-4 space-y-3">
                        <button
                            type="button"
                            onClick={onOpenLeaveModal}
                            className="w-full py-3.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <Palmtree size={18} />
                            <PlusCircle size={16} />
                            <span>Solicită Concediu / Învoire</span>
                        </button>

                        {myLeaves.length > 0 && (
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-100 dark:border-gray-800 p-4 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                        <Palmtree size={14} className="text-purple-600 dark:text-purple-400" />
                                        Concediile Mele Recente
                                    </h3>
                                    <span className="text-[11px] font-mono text-gray-400">{myLeaves.length} cereri</span>
                                </div>
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                    {myLeaves.slice(0, 6).map((l) => {
                                        const days = countWorkingDays(l.startDate, l.endDate, holidays);
                                        const todayISO = toLocalDateISO();
                                        const canCancel = onCancelLeave && ((l.status === LeaveStatus.APPROVED && l.startDate >= todayISO) || l.status === LeaveStatus.PENDING);
                                        const badgeColor =
                                            l.status === LeaveStatus.APPROVED
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : l.status === LeaveStatus.PENDING
                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                : l.status === LeaveStatus.REJECTED
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 line-through';
                                        const statusLabel =
                                            l.status === LeaveStatus.PENDING
                                                ? 'În așteptare'
                                                : l.status === LeaveStatus.APPROVED
                                                ? 'Aprobat'
                                                : l.status === LeaveStatus.REJECTED
                                                ? 'Respins'
                                                : 'Anulat';
                                        return (
                                            <div key={l.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-xs">
                                                <div className="min-w-0">
                                                    <div className="font-bold text-gray-800 dark:text-gray-200 truncate">{l.typeName}</div>
                                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                                                        {formatDateRO(l.startDate)} – {formatDateRO(l.endDate)} ({days}z)
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badgeColor}`}>
                                                        {statusLabel}
                                                    </span>
                                                    {canCancel && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onCancelLeave(l.id)}
                                                            className="px-2 py-0.5 rounded border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-[10px] font-bold hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        >
                                                            Anulează
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default MobileClockScreen;
