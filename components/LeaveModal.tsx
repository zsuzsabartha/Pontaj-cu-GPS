
import React, { useState } from 'react';
import { LeaveRequest, LeaveConfig, Holiday } from '../types';
import { X, CheckSquare, Lock } from 'lucide-react';
import { checkComplianceAI } from '../services/geminiService';
import { isDateInLockedPeriod } from '../constants';
import { countWorkingDays } from '../utils/date';

interface LeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveConfigs: LeaveConfig[];
  holidays?: Holiday[];
  lockedDate: string; // Dynamic locked date
  onSubmit: (req: Omit<LeaveRequest, 'id' | 'status' | 'userId'>) => void;
}

const LeaveModal: React.FC<LeaveModalProps> = ({ isOpen, onClose, leaveConfigs, holidays = [], lockedDate, onSubmit }) => {
  const [typeId, setTypeId] = useState<string>(leaveConfigs[0]?.id || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isDateInLockedPeriod(startDate, lockedDate)) {
      setValidationMsg("Data de început se află într-o lună închisă. Nu se pot adăuga concedii retroactiv.");
      return;
    }

    const selectedConfig = leaveConfigs.find(lc => lc.id === typeId);
    if (!selectedConfig) return;

    onSubmit({
      typeId,
      typeName: selectedConfig.name,
      startDate,
      endDate,
      reason
    });
    onClose();
  };

  const handleValidate = async () => {
    const result = await checkComplianceAI(reason);
    setValidationMsg(result.feedback);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 transition-all duration-300">
        <div className="bg-emerald-600 dark:bg-emerald-700 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg">Cerere Concediu Nouă</h3>
          <button onClick={onClose} className="hover:bg-emerald-700 p-1 rounded"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tip Concediu</label>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            >
              {leaveConfigs.map((cfg) => (
                <option key={cfg.id} value={cfg.id}>{cfg.name} ({cfg.code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">De la</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (isDateInLockedPeriod(e.target.value, lockedDate)) {
                    setValidationMsg("Data este într-o perioadă închisă!");
                  } else {
                    setValidationMsg(null);
                  }
                }}
                className={`w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${isDateInLockedPeriod(startDate, lockedDate) ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-400' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Până la</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          {startDate && endDate && (
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg border border-emerald-100 dark:border-emerald-800">
              Durată calculată: <span className="font-bold">{countWorkingDays(startDate, endDate, holidays)} zile lucrătoare</span> (fără weekend și sărbători legale)
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motiv / Comentarii</label>
            <div className="relative">
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none transition-all"
                placeholder="Ex: Plecare în vacanță cu familia..."
              ></textarea>
              <button
                type="button"
                onClick={handleValidate}
                className="absolute bottom-2 right-2 text-gray-400 dark:text-gray-600 hover:text-emerald-600 dark:hover:text-emerald-400 p-1 rounded transition-colors"
                title="Verifică validitate"
              >
                <CheckSquare size={16} />
              </button>
            </div>
            {validationMsg && (
              <p className={`text-xs mt-1 p-2 rounded flex items-center gap-1 ${validationMsg.includes('închisă') || validationMsg.includes('invalid') ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 italic'}`}>
                {validationMsg.includes('închisă') && <Lock size={12} />}
                Info: {validationMsg}
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isDateInLockedPeriod(startDate, lockedDate)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 disabled:opacity-50 disabled:grayscale"
            >
              Trimite Cererea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveModal;