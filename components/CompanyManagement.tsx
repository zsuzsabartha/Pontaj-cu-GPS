import React, { useState } from 'react';
import { Company, User, Department, Office } from '../types';
import { Briefcase, Plus, Edit2, Trash2, Users, Building, FolderTree, Save, X, RefreshCw } from 'lucide-react';
import { API_CONFIG } from '../constants';

interface CompanyManagementProps {
  companies: Company[];
  users: User[];
  departments: Department[];
  offices: Office[];
  onAddCompany: (company: Company) => void;
  onUpdateCompany: (company: Company) => void;
  onDeleteCompany: (id: string) => void;
}

const CompanyManagement: React.FC<CompanyManagementProps> = ({ 
  companies, users, departments, offices, 
  onAddCompany, onUpdateCompany, onDeleteCompany 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [editData, setEditData] = useState({ name: '' });
  const [isSyncing, setIsSyncing] = useState(false);

  const syncToSQL = async (updatedList: Company[]) => {
      setIsSyncing(true);
      try {
          await fetch(`${API_CONFIG.BASE_URL}/config/companies`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedList)
          });
      } catch (e) {
          console.error("Sync failed", e);
      } finally {
          setIsSyncing(false);
      }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    const newComp: Company = {
      id: `c-${Date.now()}`,
      name: formData.name
    };
    onAddCompany(newComp);
    syncToSQL([...companies, newComp]);
    
    setFormData({ name: '' });
    setIsAdding(false);
  };

  const startEdit = (comp: Company) => {
      setEditingId(comp.id);
      setEditData({ name: comp.name });
  };

  const saveEdit = (id: string) => {
      if (!editData.name.trim()) return;
      const updatedComp = { id, name: editData.name };
      onUpdateCompany(updatedComp);
      
      const updatedList = companies.map(c => c.id === id ? updatedComp : c);
      syncToSQL(updatedList);
      
      setEditingId(null);
  };

  const handleDelete = (id: string) => {
      const hasUsers = users.some(u => u.companyId === id);
      const hasDepts = departments.some(d => d.companyId === id);
      const hasOffices = offices.some(o => o.companyId === id);

      if (hasUsers || hasDepts || hasOffices) {
          alert(`Nu se poate șterge compania! \n\nAsocieri existente:\n- Angajați: ${hasUsers ? 'Da' : 'Nu'}\n- Departamente: ${hasDepts ? 'Da' : 'Nu'}\n- Sedii: ${hasOffices ? 'Da' : 'Nu'}\n\nVă rugăm să ștergeți sau să mutați asocierile înainte de a șterge compania.`);
          return;
      }

      if (confirm('Sunteți sigur că doriți să ștergeți această companie?')) {
          onDeleteCompany(id);
          // Note: Backend assumes upsert, deleting here won't delete from SQL unless we implement a specific delete endpoint, 
          // but for consistency we sync the remaining list.
      }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Briefcase className="text-blue-600" />
                Management Companii
            </h2>
            <div className="flex gap-2">
                {isSyncing && <span className="text-xs text-blue-500 flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> Syncing SQL...</span>}
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                    {isAdding ? 'Anulează' : <><Plus size={16}/> Adaugă Companie</>}
                </button>
            </div>
       </div>

       {isAdding && (
           <div className="bg-white p-6 rounded-xl shadow-md border border-blue-100 animate-in fade-in slide-in-from-top-2">
               <h3 className="font-semibold text-gray-700 mb-4">Companie Nouă</h3>
               <form onSubmit={handleAddSubmit} className="flex gap-4 items-end">
                   <div className="flex-1">
                       <label className="block text-sm font-medium text-gray-600 mb-1">Nume Companie</label>
                       <input 
                         autoFocus
                         required
                         type="text"
                         value={formData.name}
                         onChange={e => setFormData({name: e.target.value})}
                         className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                         placeholder="Ex: Global Tech Industries"
                       />
                   </div>
                   <button type="submit" className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 transition">
                       Salvează
                   </button>
               </form>
           </div>
       )}

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
           {companies.map(comp => {
               const employeeCount = users.filter(u => u.companyId === comp.id).length;
               const deptCount = departments.filter(d => d.companyId === comp.id).length;
               const officeCount = offices.filter(o => o.companyId === comp.id).length;
               const isEditing = editingId === comp.id;

               return (
                   <div key={comp.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition relative group">
                       <div className="flex justify-between items-start mb-4">
                           <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                               <Briefcase size={24} />
                           </div>
                           <div className="flex gap-1">
                               {isEditing ? (
                                   <>
                                     <button onClick={() => saveEdit(comp.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Save size={16}/></button>
                                     <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"><X size={16}/></button>
                                   </>
                               ) : (
                                   <>
                                     <button onClick={() => startEdit(comp)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                                     <button onClick={() => handleDelete(comp.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                   </>
                               )}
                           </div>
                       </div>
                       
                       {isEditing ? (
                           <input 
                             type="text"
                             value={editData.name}
                             onChange={e => setEditData({name: e.target.value})}
                             className="w-full p-1 border rounded text-lg font-bold text-gray-800 mb-1 focus:ring-2 focus:ring-blue-500 outline-none"
                           />
                       ) : (
                           <h3 className="text-lg font-bold text-gray-800 mb-1">{comp.name}</h3>
                       )}
                       
                       <p className="text-xs text-gray-400 font-mono mb-4">ID: {comp.id}</p>
                       
                       <div className="space-y-2">
                           <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded">
                               <span className="flex items-center gap-2"><Users size={14} className="text-blue-400"/> Angajați</span>
                               <span className="font-bold">{employeeCount}</span>
                           </div>
                           <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded">
                               <span className="flex items-center gap-2"><FolderTree size={14} className="text-orange-400"/> Departamente</span>
                               <span className="font-bold">{deptCount}</span>
                           </div>
                           <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded">
                               <span className="flex items-center gap-2"><Building size={14} className="text-purple-400"/> Sedii</span>
                               <span className="font-bold">{officeCount}</span>
                           </div>
                       </div>
                   </div>
               )
           })}
       </div>
    </div>
  );
};

export default CompanyManagement;