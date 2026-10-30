import React, { useEffect, useState } from 'react';
import { LogOut, RefreshCw, Sun, Moon, Download, Monitor, Smartphone } from 'lucide-react';
import ClockWidget from './ClockWidget';
import { User, Office, BreakConfig, Holiday, LeaveRequest, ShiftStatus, Coordinates } from '../types';

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
}

const MobileClockScreen: React.FC<MobileClockScreenProps> = ({
    user,
    companyName,
    offices,
    breakConfigs,
    holidays,
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
    canSwitchToFullApp = false
}) => {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isStandalone, setIsStandalone] = useState(false);
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
        if (!installPrompt) return;
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === 'accepted') {
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
            {!isStandalone && installPrompt && (
                <div className="mx-4 mt-4 p-3.5 rounded-xl bg-emerald-600 text-white shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <Download size={20} className="shrink-0" />
                        <div className="text-xs leading-snug">
                            <p className="font-bold">Instalează aplicația pe Android</p>
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

            {/* Main Clocking Area (Strictly ClockWidget) */}
            <main className="flex-1 flex flex-col justify-center p-4 max-w-md w-full mx-auto">
                <ClockWidget
                    key={user.id}
                    user={user}
                    companyName={companyName}
                    offices={offices}
                    breakConfigs={breakConfigs}
                    holidays={holidays}
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
            </main>
        </div>
    );
};

export default MobileClockScreen;
