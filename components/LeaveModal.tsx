import React, { useState } from 'react';
import { LeaveType, LeaveRequest, LeaveStatus } from '../types';
import { X, Wand2 } from 'lucide-react';
import { checkComplianceAI } from '../services/geminiService';

interface LeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (req: Omit<LeaveRequest, 'id' | 'status' | 'userId'>) => void;
}

const LeaveModal: React.FC<LeaveModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [type, setType] = useState<LeaveType>(LeaveType.ODIHNA);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ type, startDate, endDate, reason });
    onClose();
  };

  const handleAICheck = async () => {
      if(!reason) return;
      setAnalyzing(true);
      const result = await checkComplianceAI(reason);
      setAiFeedback(result.feedback);
      setAnalyzing(false);
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
              value={type} 
              onChange={(e) => setType(e.target.value as LeaveType)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {Object.values(LeaveType).map((t) => (
                <option key={t} value={t}>{t}</option>
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
                    onClick={handleAICheck}
                    disabled={analyzing || !reason}
                    className="absolute bottom-2 right-2 text-purple-600 hover:bg-purple-50 p-1 rounded transition-colors"
                    title="Verifică cu AI"
                >
                    <Wand2 size={16} className={analyzing ? 'animate-spin' : ''}/>
                </button>
            </div>
            {aiFeedback && (
                <p className="text-xs text-purple-600 mt-1 bg-purple-50 p-2 rounded italic">
                    AI Feedback: {aiFeedback}
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