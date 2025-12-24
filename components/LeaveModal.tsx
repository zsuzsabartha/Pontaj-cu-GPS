
import React, { useState } from 'react';
import { LeaveRequest, LeaveConfig } from '../types';
import { X, CheckSquare } from 'lucide-react';
import { checkComplianceAI } from '../services/geminiService';

interface LeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveConfigs: LeaveConfig[];
  onSubmit: (req: Omit<LeaveRequest, 'id' | 'status' | 'userId'>) => void;
}

const LeaveModal: React.FC<LeaveModalProps> = ({ isOpen, onClose, leaveConfigs, onSubmit }) => {
  const [typeId, setTypeId] = useState<string>(leaveConfigs[0]?.id || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg">Cerere Concediu Nouă</h3>
          <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded"><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tip Concediu</label>
            <select 
              value={typeId} 
              onChange={(e) => setTypeId(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {leaveConfigs.map((cfg) => (
                <option key={cfg.id} value={cfg.id}>{cfg.name} ({cfg.code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">De la</label>
              <input 
                type="date" 
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Până la</label>
              <input 
                type="date" 
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motiv / Comentarii</label>
            <div className="relative">
                <textarea 
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Ex: Plecare în vacanță cu familia..."
                ></textarea>
                <button 
                    type="button"
                    onClick={handleValidate}
                    className="absolute bottom-2 right-2 text-gray-400 hover:text-blue-600 p-1 rounded transition-colors"
                    title="Verifică validitate"
                >
                    <CheckSquare size={16}/>
                </button>
            </div>
            {validationMsg && (
                <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded italic">
                    Info: {validationMsg}
                </p>
            )}
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-200"
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
