
import React, { useState, useEffect } from 'react';
import { Timesheet, CorrectionRequest } from '../types';
import { MOCK_SCHEDULES } from '../constants';
import { X, Clock, FileText, AlertCircle, CalendarClock, PlusCircle } from 'lucide-react';

interface TimesheetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  timesheet: Timesheet | null; // If null, it's creation mode
  isManager: boolean;
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

const TimesheetEditModal: React.FC<TimesheetEditModalProps> = ({ isOpen, onClose, timesheet, isManager, onSave }) => {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [scheduleId, setScheduleId] = useState('');

  useEffect(() => {
    if (isOpen) {
        if (timesheet) {
          // Editing existing
          setDate(timesheet.date);
          setStartTime(snapToNearestSlot(timesheet.startTime));
          setEndTime(timesheet.endTime ? snapToNearestSlot(timesheet.endTime) : '');
          setScheduleId(timesheet.detectedScheduleId || '');
        } else {
          // Creating new
          const today = new Date().toISOString().split('T')[0];
          setDate(today);
          setStartTime('09:00');
          setEndTime('17:00');
          setScheduleId('');
        }
        setReason('');
    }
  }, [isOpen, timesheet]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
        <div className={`${isManager ? 'bg-blue-600' : 'bg-orange-500'} p-4 flex justify-between items-center text-white`}>
          <h3 className="font-bold text-lg flex items-center gap-2">
            {isCreation ? <PlusCircle size={20}/> : <Clock size={20}/>}
            {isCreation 
                ? (isManager ? 'Adăugare Pontaj Manual' : 'Solicitare Pontaj Lipsă') 
                : (isManager ? 'Modificare Pontaj' : 'Solicitare Corecție')
            }
          </h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded"><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Date Selection */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              {isCreation ? (
                  <input 
                    type="date"
                    required
                    value={date}
                    max={new Date().toISOString().split('T')[0]} // Cannot be in future
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-mono"
              >
                  {TIME_OPTIONS.map(t => (
                      <option key={`start-${t}`} value={t}>{t}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ora Sfârșit</label>
              <select 
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-mono"
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
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <label className="block text-sm font-medium text-blue-800 mb-1 flex items-center gap-1">
                    <CalendarClock size={14}/> Tip Program (Override)
                </label>
                <select 
                    value={scheduleId}
                    onChange={(e) => setScheduleId(e.target.value)}
                    className="w-full p-2 border rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="">-- Auto Detectat --</option>
                    {MOCK_SCHEDULES.map(sch => (
                        <option key={sch.id} value={sch.id}>{sch.name}</option>
                    ))}
                </select>
                <p className="text-[10px] text-blue-600 mt-1">Selectați manual dacă detectarea automată a fost incorectă.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {isManager ? 'Motiv (pentru istoric)' : 'Motiv Solicitare (Obligatoriu)'}
            </label>
            <textarea 
              required={!isManager}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder={isManager ? "Ex: Adăugare manuală..." : "Ex: Am uitat să scanez la plecare..."}
            ></textarea>
          </div>
          
          {!isManager && (
             <div className="flex items-start gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                <AlertCircle size={14} className="mt-0.5"/>
                <p>Această modificare necesită aprobarea managerului de departament.</p>
             </div>
          )}

          <div className="pt-2">
            <button 
              type="submit" 
              className={`w-full text-white font-semibold py-3 rounded-xl transition-all shadow-lg ${isManager ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'}`}
            >
              {isManager ? 'Salvează' : 'Trimite Solicitarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimesheetEditModal;
