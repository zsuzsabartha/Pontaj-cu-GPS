import React, { useState } from 'react';
import { X, MessageSquareWarning } from 'lucide-react';
import { showToast } from '../utils/toast';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  title?: string;
}

const RejectionModal: React.FC<RejectionModalProps> = ({ isOpen, onClose, onSubmit, title = "Motiv Respingere" }) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return showToast("Te rog să introduci un motiv pentru a continua.", 'warning');
    onSubmit(reason);
    setReason(''); // Reset
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100 dark:border-gray-800 transition-all">
        <div className="bg-red-500 dark:bg-red-600 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold flex items-center gap-2 text-lg">
            <MessageSquareWarning size={22} /> {title}
          </h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-medium">Explicați motivul refuzului (obligatoriu):</p>
          <textarea
            required
            autoFocus
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:bg-white dark:focus:bg-gray-800 transition-all"
            rows={4}
            placeholder="Ex: Nu există acoperire suficientă în acea perioadă..."
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-3 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium shadow-md shadow-red-100 dark:shadow-red-900/20 transition-all"
            >
              Confirmă Respingerea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RejectionModal;