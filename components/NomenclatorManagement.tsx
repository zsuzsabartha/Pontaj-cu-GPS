import React, { useState } from 'react';
import { BreakConfig, LeaveConfig, Holiday } from '../types';
import { Plus, Trash2, Save, Coffee, FileText, Check, X, CalendarDays, PartyPopper, RefreshCw, Settings, Lock } from 'lucide-react';
import { API_CONFIG } from '../constants';

interface NomenclatorManagementProps {
  breakConfigs: BreakConfig[];
  leaveConfigs: LeaveConfig[];
  holidays: Holiday[];
  currentLockedDate: string;
  onUpdateBreaks: (configs: BreakConfig[]) => void;
  onUpdateLeaves: (configs: LeaveConfig[]) => void;
  onUpdateHolidays: (configs: Holiday[]) => void;
  onUpdateLockedDate: (date: string) => void;
}

const NomenclatorManagement: React.FC<NomenclatorManagementProps> = ({ 
  breakConfigs, leaveConfigs, holidays, currentLockedDate,
  onUpdateBreaks, onUpdateLeaves, onUpdateHolidays, onUpdateLockedDate 
}) => {
  const [activeTab, setActiveTab] = useState<'breaks' | 'leaves' | 'holidays' | 'settings'>('breaks');
  const [isSaving, setIsSaving] = useState(false);
  
  // Local state for editing to avoid constant prop updates
  const [localBreaks, setLocalBreaks] = useState(breakConfigs);
  const [localLeaves, setLocalLeaves] = useState(leaveConfigs);
  const [localHolidays, setLocalHolidays] = useState(holidays);
  const [localLockedDate, setLocalLockedDate] = useState(currentLockedDate);

  // Helper to save to backend
  const saveToSQL = async (endpoint: string, data: any[]) => {
      setIsSaving(true);
      try {
          // Attempt to save to backend (if running)
          const response = await fetch(`${API_CONFIG.BASE_URL}/config/${endpoint}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
          }).catch(() => null); // Catch network errors silently to fallback

          if (response && response.ok) {
              const res = await response.json();
              console.log("SQL Sync Success:", res);
              return true;
          } else {
              console.warn("SQL Bridge not connected or error. Saving locally only.");
              return false;
          }
      } catch (e) {
          console.error("Save error:", e);
          return false;
      } finally {
          setIsSaving(false);
      }
  };

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

  const saveBreaks = async () => {
    // 1. Update App State (Immediate UI Feedback)
    onUpdateBreaks(localBreaks);
    
    // 2. Try Sync to SQL
    const synced = await saveToSQL('breaks', localBreaks);
    
    alert(`Nomenclator Pauze actualizat! ${synced ? '(Sincronizat cu SQL Server)' : '(Doar Local - Bridge Offline)'}`);
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

  const saveLeaves = async () => {
    onUpdateLeaves(localLeaves);
    const synced = await saveToSQL('leaves', localLeaves);
    alert(`Nomenclator Concedii actualizat! ${synced ? '(Sincronizat cu SQL Server)' : '(Doar Local - Bridge Offline)'}`);
  };

  // --- Holiday Handlers ---
  const addHoliday = () => {
    const newHoliday: Holiday = {
        id: `h-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        name: 'Sărbătoare Nouă'
    };
    setLocalHolidays([...localHolidays, newHoliday]);
  };

  const updateHoliday = (id: string, field: keyof Holiday, value: any) => {
      setLocalHolidays(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const deleteHoliday = (id: string) => {
      setLocalHolidays(prev => prev.filter(h => h.id !== id));
  };

  const saveHolidays = async () => {
      onUpdateHolidays(localHolidays);
      const synced = await saveToSQL('holidays', localHolidays);
      alert(`Lista Zilelor Libere a fost actualizată! ${synced ? '(Sincronizat cu SQL Server)' : '(Doar Local - Bridge Offline)'}`);
  };
  
  // --- General Settings Handlers ---
  const saveGeneralSettings = () => {
      onUpdateLockedDate(localLockedDate);
      alert(`Setări Generale Actualizate! Luna este închisă până la: ${localLockedDate}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex border-b border-gray-200 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('breaks')}
          className={`flex-1 py-4 px-2 whitespace-nowrap text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'breaks' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Coffee size={18} /> Tipuri Pauze
        </button>
        <button 
          onClick={() => setActiveTab('leaves')}
          className={`flex-1 py-4 px-2 whitespace-nowrap text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'leaves' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <FileText size={18} /> Tipuri Concedii
        </button>
        <button 
          onClick={() => setActiveTab('holidays')}
          className={`flex-1 py-4 px-2 whitespace-nowrap text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'holidays' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <CalendarDays size={18} /> Zile Libere
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-4 px-2 whitespace-nowrap text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'settings' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Settings size={18} /> Configurări Generale
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
              <button 
                onClick={saveBreaks} 
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md disabled:opacity-70"
              >
                 {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>} Salvează Modificări
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
              <button 
                onClick={saveLeaves} 
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md disabled:opacity-70"
              >
                 {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>} Salvează Modificări
              </button>
            </div>
          </div>
        )}

        {activeTab === 'holidays' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-sm text-purple-800 flex items-center gap-2 mb-4">
                    <PartyPopper size={20}/>
                    <span>
                        Zilele definite aici vor fi marcate automat ca "Sărbătoare Legală" în pontajele angajaților. 
                        Dacă un angajat lucrează într-o astfel de zi, poate beneficia de sporuri (configurabile în ERP).
                    </span>
                </div>

                <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
                    <div className="col-span-4">Dată Calendaristică</div>
                    <div className="col-span-6">Denumire Sărbătoare</div>
                    <div className="col-span-2 text-right pr-4">Acțiuni</div>
                </div>

                {localHolidays.sort((a,b) => a.date.localeCompare(b.date)).map(hol => (
                    <div key={hol.id} className="grid grid-cols-12 gap-4 items-center bg-white p-3 rounded-lg border border-gray-200 hover:border-purple-200 hover:shadow-sm transition">
                        <div className="col-span-4">
                            <input 
                                type="date"
                                value={hol.date}
                                onChange={(e) => updateHoliday(hol.id, 'date', e.target.value)}
                                className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50"
                            />
                        </div>
                        <div className="col-span-6">
                            <input 
                                type="text"
                                placeholder="Ex: Crăciun"
                                value={hol.name}
                                onChange={(e) => updateHoliday(hol.id, 'name', e.target.value)}
                                className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                        <div className="col-span-2 flex justify-end">
                            <button 
                                onClick={() => deleteHoliday(hol.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                title="Șterge Sărbătoare"
                            >
                                <Trash2 size={18}/>
                            </button>
                        </div>
                    </div>
                ))}

                <div className="flex justify-between pt-4 border-t border-gray-100">
                    <button onClick={addHoliday} className="flex items-center gap-2 text-purple-600 text-sm font-medium hover:bg-purple-50 px-3 py-2 rounded transition">
                        <Plus size={16}/> Adaugă Sărbătoare
                    </button>
                    <button 
                        onClick={saveHolidays} 
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-purple-600 text-white text-sm font-medium px-6 py-2 rounded-lg hover:bg-purple-700 shadow-md shadow-purple-200 transition disabled:opacity-70"
                    >
                        {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>} Salvează Calendar
                    </button>
                </div>
            </div>
        )}

        {activeTab === 'settings' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                 <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 text-sm text-orange-800 flex items-start gap-3">
                    <Lock size={20} className="shrink-0 mt-0.5"/>
                    <div>
                        <span className="font-bold block mb-1">Control Închidere Lună (Lock Date)</span>
                        Data specificată mai jos blochează orice modificare asupra pontajelor, cererilor de concediu sau programărilor anterioare acestei date.
                        Această dată este folosită pentru a proteja perioadele fiscale închise.
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm max-w-md">
                     <label className="block text-sm font-bold text-gray-700 mb-2">Dată Blocare Sistem (Closed Month)</label>
                     <div className="flex gap-4 items-center">
                         <input 
                            type="date"
                            value={localLockedDate}
                            onChange={(e) => setLocalLockedDate(e.target.value)}
                            className="flex-1 p-3 border rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                         />
                         <button 
                            onClick={saveGeneralSettings}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-md"
                         >
                             Aplică
                         </button>
                     </div>
                     <p className="text-xs text-gray-400 mt-2 italic">Ex: Dacă setați 30-04-2024, nimeni nu mai poate modifica date din Aprilie sau mai vechi.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default NomenclatorManagement;