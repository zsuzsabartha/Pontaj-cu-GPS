
import React, { useState, useEffect } from 'react';
import { User, Company, Department, Office, Role } from '../types';
import { X, CheckCircle, Save, Building, Clock, Fingerprint, Briefcase } from 'lucide-react';

interface UserValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  companies: Company[];
  departments: Department[];
  offices: Office[];
  onValidate: (updatedUser: User) => void;
}

const UserValidationModal: React.FC<UserValidationModalProps> = ({ isOpen, onClose, user, companies, departments, offices, onValidate }) => {
  const [formData, setFormData] = useState<Partial<User>>({});
  
  // Available selections based on current company selection
  const availableDepartments = departments.filter(d => d.companyId === formData.companyId);
  // Offices are shared (global), so no filtering by companyId
  const availableOffices = offices;

  useEffect(() => {
    if (user) {
      setFormData({ ...user });
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
        onValidate(formData as User);
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
             <img src={user.avatarUrl} className="w-10 h-10 rounded-full border-2 border-white/30" />
             <div>
                 <h3 className="font-bold text-lg leading-tight">Validare Angajat</h3>
                 <p className="text-xs text-blue-100 opacity-80">{user.email}</p>
             </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition"><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
           <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-sm text-blue-800">
              Vă rugăm să verificați și să corectați datele de mai jos înainte de activarea contului.
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nume Complet</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Fingerprint size={12}/> ID ERP</label>
                  <input 
                    type="text" 
                    value={formData.erpId || ''}
                    onChange={(e) => setFormData({...formData, erpId: e.target.value})}
                    placeholder="Ex: EMP-001"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
               </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Companie</label>
                  <select 
                    value={formData.companyId || ''}
                    onChange={(e) => setFormData({...formData, companyId: e.target.value, departmentId: '', assignedOfficeId: ''})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                     {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Departament</label>
                  <select 
                    value={formData.departmentId || ''}
                    onChange={(e) => setFormData({...formData, departmentId: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                     <option value="">Selectează...</option>
                     {availableDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
               </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Clock size={12}/> Normă (Ore/Zi)</label>
                   <input 
                      type="number"
                      min={1}
                      max={12}
                      value={formData.contractHours || 8}
                      onChange={(e) => setFormData({...formData, contractHours: parseInt(e.target.value) || 8})}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                   />
               </div>
               <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Building size={12}/> Sediu Alocat</label>
                   <select 
                    value={formData.assignedOfficeId || ''}
                    onChange={(e) => setFormData({...formData, assignedOfficeId: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                     <option value="">-- Fără Sediu (Remote/Mobil) --</option>
                     {availableOffices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
               </div>
           </div>
           
           <div className="grid grid-cols-1 gap-4">
              <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Permisiuni / Roluri</label>
                 <div className="flex gap-4 p-3 border rounded-lg bg-gray-50">
                    {Object.values(Role).map(role => (
                       <label key={role} className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={formData.roles?.includes(role)}
                            onChange={() => {
                                const currentRoles = formData.roles || [];
                                const newRoles = currentRoles.includes(role) 
                                   ? currentRoles.filter(r => r !== role)
                                   : [...currentRoles, role];
                                setFormData({...formData, roles: newRoles});
                            }}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm font-medium">{role}</span>
                       </label>
                    ))}
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-4 pt-4 border-t border-gray-100 mt-2">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="w-full py-3 rounded-xl border border-gray-300 font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Anulează
                </button>
                <button 
                  type="submit" 
                  className="w-full py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                >
                   <CheckCircle size={20} /> Confirmă Validarea
                </button>
           </div>
        </form>
      </div>
    </div>
  );
};

export default UserValidationModal;
