import React, { useState } from 'react';
import { Company, User, Department, Office } from '../types';
import { Briefcase, Plus, Edit2, Trash2, Users, Building, FolderTree, Save, X, RefreshCw } from 'lucide-react';
import { SQLService } from '../services/sqlService';

interface CompanyManagementProps {
    companies: Company[];
    users: User[];
    departments: Department[];
    offices: Office[];
    onAddCompany: (company: Company) => void;
    onUpdateCompany: (company: Company) => void;
    onDeleteCompany: (id: string) => void;
    onNavigateToDepartments?: (companyId: string) => void;
}

const CompanyManagement: React.FC<CompanyManagementProps> = ({
    companies, users, departments, offices,
    onAddCompany, onUpdateCompany, onDeleteCompany, onNavigateToDepartments
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '' });
    const [editData, setEditData] = useState({ name: '' });
    const [isSyncing, setIsSyncing] = useState(false);

    const syncToSQL = async (updatedList: Company[]) => {
        setIsSyncing(true);
        try {
            await SQLService.saveConfigList('companies', updatedList);
        } catch (e) {
            console.error("Sync failed", e);
            alert("Eroare la salvarea companiilor în baza de date.");
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

        // Removed check for offices as they are shared/global now
        if (hasUsers || hasDepts) {
            alert(`Nu se poate șterge compania! \n\nAsocieri existente:\n- Angajați: ${hasUsers ? 'Da' : 'Nu'}\n- Departamente: ${hasDepts ? 'Da' : 'Nu'}\n\nVă rugăm să ștergeți sau să mutați asocierile înainte de a șterge compania.`);
            return;
        }

        if (confirm('Sunteți sigur că doriți să ștergeți această companie?')) {
            const updatedList = companies.filter(c => c.id !== id);
            onDeleteCompany(id);
            syncToSQL(updatedList);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center transition-colors">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Briefcase className="text-emerald-600 dark:text-emerald-400" />
                    Management Companii
                </h2>
                <div className="flex gap-2">
                    {isSyncing && <span className="text-xs text-emerald-500 dark:text-emerald-400 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Syncing SQL...</span>}
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="bg-emerald-600 dark:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 flex items-center gap-2 transition-colors shadow-sm"
                    >
                        {isAdding ? 'Anulează' : <><Plus size={16} /> Adaugă Companie</>}
                    </button>
                </div>
            </div>

            {isAdding && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-emerald-100 dark:border-emerald-900/30 animate-in fade-in slide-in-from-top-2 transition-colors">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Companie Nouă</h3>
                    <form onSubmit={handleAddSubmit} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Nume Companie</label>
                            <input
                                autoFocus
                                required
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ name: e.target.value })}
                                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                placeholder="Ex: Global Tech Industries"
                            />
                        </div>
                        <button type="submit" className="bg-green-600 dark:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 dark:hover:bg-green-600 transition-all shadow-sm">
                            Salvează
                        </button>
                    </form>
                </div>
            )}

            <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-800">
                        <tr>
                            <th className="p-3 w-16 text-center">Icon</th>
                            <th className="p-3">Nume Companie</th>
                            <th className="p-3">ID ERP</th>
                            <th className="p-3 text-center">Angajați</th>
                            <th className="p-3 text-center">Departamente</th>
                            <th className="p-3 text-right">Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {companies.map(comp => {
                            const employeeCount = users.filter(u => u.companyId === comp.id).length;
                            const deptCount = departments.filter(d => d.companyId === comp.id).length;
                            const isEditing = editingId === comp.id;

                            return (
                                <tr key={comp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="p-3 text-center">
                                        <div className="bg-emerald-50 dark:bg-emerald-900/30 w-8 h-8 rounded flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                                            <Briefcase size={16} />
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editData.name}
                                                onChange={e => setEditData({ name: e.target.value })}
                                                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded text-sm font-bold text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                            />
                                        ) : (
                                            <span className="font-bold text-gray-800 dark:text-gray-100">{comp.name}</span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <span className="text-xs text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{comp.id}</span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className="inline-flex items-center gap-1 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                                            <Users size={14} className="text-emerald-500" /> {employeeCount}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className="inline-flex items-center gap-1 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                                            <FolderTree size={14} className="text-orange-500" /> {deptCount}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            {onNavigateToDepartments && (
                                                <button
                                                    onClick={() => onNavigateToDepartments(comp.id)}
                                                    className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-colors"
                                                    title="Vezi Departamente"
                                                >
                                                    <FolderTree size={16} />
                                                </button>
                                            )}
                                            {isEditing ? (
                                                <>
                                                    <button onClick={() => saveEdit(comp.id)} className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"><Save size={16} /></button>
                                                    <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"><X size={16} /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEdit(comp)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-colors"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDelete(comp.id)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"><Trash2 size={16} /></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CompanyManagement;