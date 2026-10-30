
import React, { useState, useEffect } from 'react';
import { Timesheet, LeaveConfig, WorkSchedule } from '../types';
import { showToast } from '../utils/toast';
import { MOCK_SCHEDULES, isDateInLockedPeriod } from '../constants';
import { toLocalDateISO, formatDateRO } from '../utils/date';
import { X, Clock, AlertCircle, CalendarClock, PlusCircle, Lock, Briefcase, Palmtree, Trash2 } from 'lucide-react';

interface TimesheetEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    timesheet: Timesheet | null; // If null, it's creation mode
    isManager: boolean;
    lockedDate: string; // Dynamic locked date
    leaveConfigs?: LeaveConfig[]; // Needed for manager leave injection
    workSchedules?: WorkSchedule[];
    onSave: (data: {
        tsId?: string,
        date: string,
        type: 'WORK' | 'LEAVE',
        start?: string,
        end?: string,
        leaveTypeId?: string,
        reason: string,
        scheduleId?: string
    }) => void;
    onDelete?: (id: string) => void; // NEW: Delete callback
}

// Generate 30-minute intervals (00:00, 00:30, ... 23:30)
const TIME_OPTIONS = Array.from({ length: 48 }).map((_, i) => {
    const h = Math.floor(i / 2).toString().padStart(2, '0');
    const m = i % 2 === 0 ? '00' : '30';
    return `${h}:${m}`;
});

// Helper to snap a specific time to the nearest 30-minute slot
const snapToNearestSlot = (isoString?: string): string => {
    if (!isoString) return '09:00'; // Default start
    const d = new Date(isoString);
    const m = d.getMinutes();
    let h = d.getHours();

    // Round to 00 or 30
    let roundedM = '00';
    if (m >= 15 && m < 45) {
        roundedM = '30';
    } else if (m >= 45) {
        roundedM = '00';
        h = (h + 1) % 24;
    }

    return `${h.toString().padStart(2, '0')}:${roundedM}`;
};

const TimesheetEditModal: React.FC<TimesheetEditModalProps> = ({ isOpen, onClose, timesheet, isManager, lockedDate, leaveConfigs = [], workSchedules, onSave, onDelete }) => {
    const [activeTab, setActiveTab] = useState<'WORK' | 'LEAVE'>('WORK');
    const [date, setDate] = useState('');

    // Work State
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [scheduleId, setScheduleId] = useState('');

    // Leave State
    const [leaveTypeId, setLeaveTypeId] = useState('');

    const [reason, setReason] = useState('');
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        if (isOpen) {
            let targetDate = '';
            if (timesheet) {
                // Editing existing
                targetDate = timesheet.date;
                setDate(timesheet.date);
                setStartTime(snapToNearestSlot(timesheet.startTime));
                setEndTime(timesheet.endTime ? snapToNearestSlot(timesheet.endTime) : '');
                setScheduleId(timesheet.detectedScheduleId || '');
            } else {
                // Creating new
                targetDate = toLocalDateISO();
                setDate(targetDate);
                setStartTime('09:00');
                setEndTime('17:00');
                setScheduleId('');
            }
            setReason('');
            setActiveTab('WORK');
            setLeaveTypeId(leaveConfigs[0]?.id || '');
            setIsLocked(isDateInLockedPeriod(targetDate, lockedDate));
        }
    }, [isOpen, timesheet, lockedDate, leaveConfigs]);

    // Handler for date change in creation mode
    const handleDateChange = (newDate: string) => {
        setDate(newDate);
        setIsLocked(isDateInLockedPeriod(newDate, lockedDate));
    };

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLocked) return;

        if (!isManager && !reason) {
            showToast("Motivul este obligatoriu pentru solicitările de corecție.", 'warning');
            return;
        }

        // Construct Payload
        if (activeTab === 'WORK') {
            const startDateObj = new Date(`${date}T${startTime}:00`);
            const startISO = startDateObj.toISOString();
            let endISO: string | undefined = undefined;
            if (endTime) {
                const endDateObj = new Date(`${date}T${endTime}:00`);
                if (endDateObj.getTime() <= startDateObj.getTime()) {
                    endDateObj.setDate(endDateObj.getDate() + 1);
                }
                endISO = endDateObj.toISOString();
            }

            onSave({
                tsId: timesheet?.id,
                date: date,
                type: 'WORK',
                start: startISO,
                end: endISO,
                reason,
                scheduleId
            });
        } else {
            // Leave Payload
            onSave({
                tsId: timesheet?.id, // If modifying a timesheet, we pass this so parent can delete it
                date: date,
                type: 'LEAVE',
                leaveTypeId,
                reason
            });
        }

        onClose();
    };

    const handleDelete = () => {
        if (timesheet && onDelete) {
            onDelete(timesheet.id);
        }
    };

    const isCreation = !timesheet;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100 dark:border-gray-800 transition-all">
                <div className={`${isManager ? (isLocked ? 'bg-gray-500' : 'bg-emerald-600') : (isLocked ? 'bg-gray-500' : 'bg-orange-500')} p-4 flex justify-between items-center text-white`}>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        {isLocked ? <Lock size={20} /> : (isCreation ? <PlusCircle size={20} /> : <Clock size={20} />)}
                        {isCreation
                            ? (isManager ? 'Gestionare Pontaj / Concediu' : 'Solicitare Pontaj Lipsă')
                            : (isManager ? 'Modificare Pontaj' : 'Solicitare Corecție')
                        }
                    </h3>
                    <button onClick={onClose} className="hover:bg-white/20 p-1 rounded"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {isLocked && (
                        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3 mb-2 rounded-r flex items-start gap-3 transition-colors">
                            <Lock className="text-red-500 dark:text-red-400 shrink-0 mt-0.5" size={18} />
                            <div>
                                <p className="text-sm font-bold text-red-800 dark:text-red-300">Lună Închisă</p>
                                <p className="text-xs text-red-700 dark:text-red-400">Această dată aparține unei luni fiscale închise. Nu se mai pot efectua modificări.</p>
                            </div>
                        </div>
                    )}

                    {/* Activity Type Switcher (Manager Only) */}
                    {isManager && !isLocked && (
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-4 transition-colors">
                            <button
                                type="button"
                                onClick={() => setActiveTab('WORK')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'WORK' ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                <Briefcase size={16} /> Pontaj (Lucru)
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('LEAVE')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'LEAVE' ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                <Palmtree size={16} /> Concediu
                            </button>
                        </div>
                    )}

                    {/* Date Selection */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800 mb-2 transition-colors">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                        {isCreation ? (
                            <input
                                type="date"
                                required
                                value={date}
                                max={toLocalDateISO()} // Cannot be in future
                                onChange={(e) => handleDateChange(e.target.value)}
                                className={`w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${isLocked ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-600' : ''}`}
                            />
                        ) : (
                            <div className="font-semibold text-gray-800 dark:text-gray-100">{formatDateRO(date)}</div>
                        )}
                    </div>

                    {/* --- WORK FORM --- */}
                    {activeTab === 'WORK' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ora Start</label>
                                    <select
                                        required
                                        disabled={isLocked}
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-mono disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:text-gray-400 dark:disabled:text-gray-600 transition-all"
                                    >
                                        {TIME_OPTIONS.map(t => (
                                            <option key={`start-${t}`} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ora Sfârșit</label>
                                    <select
                                        disabled={isLocked}
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-mono disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:text-gray-400 dark:disabled:text-gray-600 transition-all"
                                    >
                                        <option value="">-- În lucru --</option>
                                        {TIME_OPTIONS.map(t => (
                                            <option key={`end-${t}`} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="text-[11px] text-gray-400 dark:text-gray-500 italic text-center">
                                * Programul poate fi setat doar la oră fixă sau jumătate de oră.
                            </div>

                            {/* Schedule Override */}
                            {isManager && (
                                <div className={`p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/30 transition-colors ${isLocked ? 'bg-gray-50 dark:bg-gray-800 opacity-50' : 'bg-emerald-50 dark:bg-emerald-900/10'}`}>
                                    <label className={`block text-sm font-medium mb-1 flex items-center gap-1 ${isLocked ? 'text-gray-500' : 'text-emerald-800 dark:text-emerald-300'}`}>
                                        <CalendarClock size={14} /> Tip Program (Override)
                                    </label>
                                    <select
                                        disabled={isLocked}
                                        value={scheduleId}
                                        onChange={(e) => setScheduleId(e.target.value)}
                                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100 dark:disabled:bg-gray-800/50 transition-all"
                                    >
                                        <option value="">-- Auto Detectat --</option>
                                        {(workSchedules && workSchedules.length > 0 ? workSchedules : MOCK_SCHEDULES).map(sch => (
                                            <option key={sch.id} value={sch.id}>{sch.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </>
                    )}

                    {/* --- LEAVE FORM --- */}
                    {activeTab === 'LEAVE' && (
                        <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-lg border border-purple-100 dark:border-purple-900/30 transition-colors">
                            <label className="block text-sm font-medium text-purple-900 dark:text-purple-300 mb-2">Tip Concediu</label>
                            <select
                                value={leaveTypeId}
                                onChange={e => setLeaveTypeId(e.target.value)}
                                className="w-full p-2 border border-purple-200 dark:border-purple-800 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 transition-all"
                            >
                                {leaveConfigs.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                ))}
                            </select>
                            <p className="text-xs text-purple-700 dark:text-purple-400 mt-2 italic">
                                Acest concediu va fi aprobat automat și va înlocui orice pontaj existent pentru data de <strong>{formatDateRO(date)}</strong>.
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {isManager ? 'Motiv (Audit Log)' : 'Motiv Solicitare (Obligatoriu)'}
                        </label>
                        <textarea
                            disabled={isLocked}
                            required={!isManager}
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none disabled:bg-gray-100 dark:disabled:bg-gray-800/50 transition-all"
                            placeholder={isManager ? "Ex: Adăugare manuală / Rectificare..." : "Ex: Am uitat să scanez la plecare..."}
                        ></textarea>
                    </div>

                    {!isManager && !isLocked && (
                        <div className="flex items-start gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-2 rounded transition-colors">
                            <AlertCircle size={14} className="mt-0.5" />
                            <p>Această modificare necesită aprobarea managerului de departament.</p>
                        </div>
                    )}

                    <div className="pt-2 flex gap-3">
                        {isManager && timesheet && !isLocked && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold transition-colors shadow-sm"
                                title="Șterge Pontaj"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isLocked}
                            className={`flex-1 text-white font-semibold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:grayscale ${isManager ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'}`}
                        >
                            {isLocked ? 'Perioadă Închisă' : (isManager ? 'Salvează Modificări' : 'Trimite Solicitarea')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TimesheetEditModal;
