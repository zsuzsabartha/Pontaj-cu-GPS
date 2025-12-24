
import React, { useState } from 'react';
import { BreakConfig, LeaveConfig } from '../types';
import { Plus, Trash2, Save, Coffee, FileText, Check, X } from 'lucide-react';

interface NomenclatorManagementProps {
  breakConfigs: BreakConfig[];
  leaveConfigs: LeaveConfig[];
  onUpdateBreaks: (configs: BreakConfig[]) => void;
  onUpdateLeaves: (configs: LeaveConfig[]) => void;
}

const NomenclatorManagement: React.FC<NomenclatorManagementProps> = ({ breakConfigs, leaveConfigs, onUpdateBreaks, onUpdateLeaves }) => {
  const [activeTab, setActiveTab] = useState<'breaks' | 'leaves'>('breaks');
  
  // Local state for editing to avoid constant prop updates
  const [localBreaks, setLocalBreaks] = useState(breakConfigs);
  const [localLeaves, setLocalLeaves] = useState(leaveConfigs);

  // --- Break Handlers ---
  const addBreak = () => {
    const newBreak: BreakConfig = {
      id: `bc-${Date.now()}`,
      name: 'Pauză Nouă',
      isPaid: false,
      icon: 'coffee'
    };
    setLocalBreaks([...localBreaks, newBreak]);
  };

  const updateBreak = (id: string, field: keyof BreakConfig, value: any) => {
    setLocalBreaks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const deleteBreak = (id: string) => {
    setLocalBreaks(prev => prev.filter(b => b.id !== id));
  };

  const saveBreaks = () => {
    onUpdateBreaks(localBreaks);
    alert('Nomenclator Pauze actualizat!');
  };

  // --- Leave Handlers ---
  const addLeave = () => {
    const newLeave: LeaveConfig = {
      id: `lc-${Date.now()}`,
      name: 'Tip Concediu Nou',
      code: 'NEW',
      requiresApproval: true
    };
    setLocalLeaves([...localLeaves, newLeave]);
  };

  const updateLeave = (id: string, field: keyof LeaveConfig, value: any) => {
    setLocalLeaves(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const deleteLeave = (id: string) => {
    setLocalLeaves(prev => prev.filter(l => l.id !== id));
  };

  const saveLeaves = () => {
    onUpdateLeaves(localLeaves);
    alert('Nomenclator Concedii actualizat!');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('breaks')}
          className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'breaks' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Coffee size={18} /> Tipuri Pauze
        </button>
        <button 
          onClick={() => setActiveTab('leaves')}
          className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'leaves' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <FileText size={18} /> Tipuri Concedii
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'breaks' && (
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
               <div className="col-span-5">Denumire</div>
               <div className="col-span-2 text-center">Plătită? (Se scade?)</div>
               <div className="col-span-3">Icon</div>
               <div className="col-span-2">Acțiuni</div>
            </div>
            
            {localBreaks.map(br => (
              <div key={br.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="col-span-5">
                  <input 
                    type="text" 
                    value={br.name}
                    onChange={(e) => updateBreak(br.id, 'name', e.target.value)}
                    className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-2 flex justify-center">
                   <button 
                     onClick={() => updateBreak(br.id, 'isPaid', !br.isPaid)}
                     className={`px-3 py-1 rounded text-xs font-bold ${br.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                   >
                     {br.isPaid ? 'PLĂTITĂ' : 'NEPLĂTITĂ'}
                   </button>
                </div>
                <div className="col-span-3">
                   <select 
                     value={br.icon || 'coffee'}
                     onChange={(e) => updateBreak(br.id, 'icon', e.target.value)}
                     className="w-full p-2 border rounded text-sm bg-white"
                   >
                     <option value="coffee">Cafea</option>
                     <option value="briefcase">Serviciu</option>
                     <option value="utensils">Mancare</option>
                     <option value="cigarette">Tigara</option>
                   </select>
                </div>
                <div className="col-span-2 flex justify-end">
                   <button onClick={() => deleteBreak(br.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}

            <div className="flex justify-between pt-4 border-t border-gray-100">
              <button onClick={addBreak} className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:bg-blue-50 px-3 py-2 rounded">
                 <Plus size={16}/> Adaugă Tip
              </button>
              <button onClick={saveBreaks} className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md">
                 <Save size={16}/> Salvează Modificări
              </button>
            </div>
          </div>
        )}

        {activeTab === 'leaves' && (
          <div className="space-y-4">
             <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
               <div className="col-span-5">Denumire</div>
               <div className="col-span-2">Cod (ERP)</div>
               <div className="col-span-3 text-center">Necesită Aprobare?</div>
               <div className="col-span-2">Acțiuni</div>
            </div>

            {localLeaves.map(lv => (
               <div key={lv.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="col-span-5">
                    <input 
                      type="text" 
                      value={lv.name}
                      onChange={(e) => updateLeave(lv.id, 'name', e.target.value)}
                      className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input 
                      type="text" 
                      value={lv.code}
                      onChange={(e) => updateLeave(lv.id, 'code', e.target.value)}
                      className="w-full p-2 border rounded text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <button 
                       onClick={() => updateLeave(lv.id, 'requiresApproval', !lv.requiresApproval)}
                       className={`p-1 rounded ${lv.requiresApproval ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'}`}
                    >
                       {lv.requiresApproval ? <Check size={16} /> : <X size={16} />}
                    </button>
                  </div>
                  <div className="col-span-2 flex justify-end">
                     <button onClick={() => deleteLeave(lv.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                  </div>
               </div>
            ))}

            <div className="flex justify-between pt-4 border-t border-gray-100">
              <button onClick={addLeave} className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:bg-blue-50 px-3 py-2 rounded">
                 <Plus size={16}/> Adaugă Tip
              </button>
              <button onClick={saveLeaves} className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md">
                 <Save size={16}/> Salvează Modificări
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NomenclatorManagement;
