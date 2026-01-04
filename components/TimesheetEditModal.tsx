
import React, { useState, useEffect } from 'react';
import { Timesheet, CorrectionRequest } from '../types';
import { MOCK_SCHEDULES, isDateInLockedPeriod } from '../constants';
import { X, Clock, FileText, AlertCircle, CalendarClock, PlusCircle, Lock } from 'lucide-react';

interface TimesheetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  timesheet: Timesheet | null; // If null, it's creation mode
  isManager: boolean;
  lockedDate: string; // Dynamic locked date
  onSave: (data: { tsId?: string, date: string, start: string, end: string, reason: string, scheduleId?: string }) => void;
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

const TimesheetEditModal: React.FC<TimesheetEditModalProps> = ({ isOpen, onClose, timesheet, isManager, lockedDate, onSave }) => {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [scheduleId, setScheduleId] = useState('');
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
          targetDate = new Date().toISOString().split('T')[0];
          setDate(targetDate);
          setStartTime('09:00');
          setEndTime('17:00');
          setScheduleId('');
        }
        setReason('');
        setIsLocked(isDateInLockedPeriod(targetDate, lockedDate));
    }
  }, [isOpen, timesheet, lockedDate]);

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
        alert("Motivul este obligatoriu pentru solicitările de corecție.");
        return;
    }
    
    // Construct ISO strings
    const startISO = `${date}T${startTime}:00`;
    const endISO = endTime ? `${date}T${endTime}:00` : '';
    
    onSave({
        tsId: timesheet?.id,
        date: date,
        start: startISO,
        end: endISO,
        reason,
        scheduleId
    });
    onClose();
  };

  const isCreation = !timesheet;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className={`${isManager ? (isLocked ? 'bg-gray-500' : 'bg-blue-600') : (isLocked ? 'bg-gray-500' : 'bg-orange-500')} p-4 flex justify-between items-center text-white`}>
          <h3 className="font-bold text-lg flex items-center gap-2">
            {isLocked ? <Lock size={20}/> : (isCreation ? <PlusCircle size={20}/> : <Clock size={20}/>)}
            {isCreation 
                ? (isManager ? 'Adăugare Pontaj Manual' : 'Solicitare Pontaj Lipsă') 
                : (isManager ? 'Modificare Pontaj' : 'Solicitare Corecție')
            }
          </h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded"><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {isLocked && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-2 rounded-r flex items-start gap-3">
                  <Lock className="text-red-500 shrink-0 mt-0.5" size={18}/>
                  <div>
                      <p className="text-sm font-bold text-red-800">Lună Închisă</p>
                      <p className="text-xs text-red-700">Această dată aparține unei luni fiscale închise. Nu se mai pot efectua modificări.</p>
                  </div>
              </div>
          )}

          {/* Date Selection */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              {isCreation ? (
                  <input 
                    type="date"
                    required
                    value={date}
                    max={new Date().toISOString().split('T')[0]} // Cannot be in future
                    onChange={(e) => handleDateChange(e.target.value)}
                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${isLocked ? 'bg-gray-100 text-gray-500' : ''}`}
                  />
              ) : (
                  <div className="font-semibold text-gray-800">{date}</div>
              )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ora Start</label>
              <select 
                required
                disabled={isLocked}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-mono disabled:bg-gray-100 disabled:text-gray-400"
              >
                  {TIME_OPTIONS.map(t => (
                      <option key={`start-${t}`} value={t}>{t}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ora Sfârșit</label>
              <select 
                disabled={isLocked}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-mono disabled:bg-gray-100 disabled:text-gray-400"
              >
                  <option value="">-- În lucru --</option>
                  {TIME_OPTIONS.map(t => (
                      <option key={`end-${t}`} value={t}>{t}</option>
                  ))}
              </select>
            </div>
          </div>
          
          <div className="text-[11px] text-gray-400 italic text-center">
              * Programul poate fi setat doar la oră fixă sau jumătate de oră.
          </div>
          
          {/* Admin Schedule Override */}
          {isManager && (
            <div className={`p-3 rounded-lg border border-blue-100 ${isLocked ? 'bg-gray-50 opacity-50' : 'bg-blue-50'}`}>
                <label className={`block text-sm font-medium mb-1 flex items-center gap-1 ${isLocked ? 'text-gray-500' : 'text-blue-800'}`}>
                    <CalendarClock size={14}/> Tip Program (Override)
                </label>
                <select 
                    disabled={isLocked}
                    value={scheduleId}
                    onChange={(e) => setScheduleId(e.target.value)}
                    className="w-full p-2 border rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                >
                    <option value="">-- Auto Detectat --</option>
                    {MOCK_SCHEDULES.map(sch => (
                        <option key={sch.id} value={sch.id}>{sch.name}</option>
                    ))}
                </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {isManager ? 'Motiv (pentru istoric)' : 'Motiv Solicitare (Obligatoriu)'}
            </label>
            <textarea 
              disabled={isLocked}
              required={!isManager}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:bg-gray-100"
              placeholder={isManager ? "Ex: Adăugare manuală..." : "Ex: Am uitat să scanez la plecare..."}
            ></textarea>
          </div>
          
          {!isManager && !isLocked && (
             <div className="flex items-start gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                <AlertCircle size={14} className="mt-0.5"/>
                <p>Această modificare necesită aprobarea managerului de departament.</p>
             </div>
          )}

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isLocked}
              className={`w-full text-white font-semibold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:grayscale ${isManager ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'}`}
            >
              {isLocked ? 'Perioadă Închisă' : (isManager ? 'Salvează' : 'Trimite Solicitarea')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimesheetEditModal;
