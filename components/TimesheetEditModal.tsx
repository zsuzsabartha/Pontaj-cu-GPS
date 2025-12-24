
import React, { useState, useEffect } from 'react';
import { Timesheet, CorrectionRequest } from '../types';
import { MOCK_SCHEDULES } from '../constants';
import { X, Clock, FileText, AlertCircle, CalendarClock } from 'lucide-react';

interface TimesheetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  timesheet: Timesheet | null;
  isManager: boolean;
  onSave: (tsId: string, start: string, end: string, reason: string, scheduleId?: string) => void;
}

const TimesheetEditModal: React.FC<TimesheetEditModalProps> = ({ isOpen, onClose, timesheet, isManager, onSave }) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [scheduleId, setScheduleId] = useState('');

  useEffect(() => {
    if (timesheet) {
      // Extract time part for input type="time"
      const s = new Date(timesheet.startTime);
      setStartTime(s.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }));
      
      if (timesheet.endTime) {
        const e = new Date(timesheet.endTime);
        setEndTime(e.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }));
      } else {
        setEndTime('');
      }
      setReason('');
      setScheduleId(timesheet.detectedScheduleId || '');
    }
  }, [timesheet]);

  if (!isOpen || !timesheet) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManager && !reason) {
        alert("Motivul este obligatoriu pentru solicitările de corecție.");
        return;
    }
    
    // Convert back to ISO strings preserving the date
    const dateStr = timesheet.date; // YYYY-MM-DD
    const newStartISO = `${dateStr}T${startTime}:00`;
    const newEndISO = endTime ? `${dateStr}T${endTime}:00` : '';
    
    onSave(timesheet.id, newStartISO, newEndISO, reason, scheduleId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className={`${isManager ? 'bg-blue-600' : 'bg-orange-500'} p-4 flex justify-between items-center text-white`}>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Clock size={20}/>
            {isManager ? 'Modificare Pontaj (Manager)' : 'Solicitare Corecție'}
          </h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded"><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm mb-4">
              <span className="font-semibold text-gray-700">Data:</span> {timesheet.date}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ora Start</label>
              <input 
                type="time" 
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ora Sfârșit</label>
              <input 
                type="time" 
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          
          {/* Admin Schedule Correction */}
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
                {isManager ? 'Motiv Modificare (pentru istoric)' : 'Motiv Solicitare (Obligatoriu)'}
            </label>
            <textarea 
              required={!isManager}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder={isManager ? "Ex: Eroare sistem..." : "Ex: Am uitat să scanez la plecare..."}
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
              {isManager ? 'Salvează Modificările' : 'Trimite Solicitarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimesheetEditModal;
