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

        // Removed check for offices as they are shared/global now
        if (hasUsers || hasDepts) {
            alert(`Nu se poate șterge compania! \n\nAsocieri existente:\n- Angajați: ${hasUsers ? 'Da' : 'Nu'}\n- Departamente: ${hasDepts ? 'Da' : 'Nu'}\n\nVă rugăm să ștergeți sau să mutați asocierile înainte de a șterge compania.`);
            return;
        }

        if (confirm('Sunteți sigur că doriți să ștergeți această companie?')) {
            onDeleteCompany(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center transition-colors">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Briefcase className="text-blue-600 dark:text-blue-400" />
                    Management Companii
                </h2>
                <div className="flex gap-2">
                    {isSyncing && <span className="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Syncing SQL...</span>}
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center gap-2 transition-colors shadow-sm"
                    >
                        {isAdding ? 'Anulează' : <><Plus size={16} /> Adaugă Companie</>}
                    </button>
                </div>
            </div>

            {isAdding && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-blue-100 dark:border-blue-900/30 animate-in fade-in slide-in-from-top-2 transition-colors">
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
                                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Ex: Global Tech Industries"
                            />
                        </div>
                        <button type="submit" className="bg-green-600 dark:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 dark:hover:bg-green-600 transition-all shadow-sm">
                            Salvează
                        </button>
                    </form>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {companies.map(comp => {
                    const employeeCount = users.filter(u => u.companyId === comp.id).length;
                    const deptCount = departments.filter(d => d.companyId === comp.id).length;
                    const isEditing = editingId === comp.id;

                    return (
                        <div key={comp.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md dark:hover:border-gray-600 transition-all relative group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-blue-600 dark:text-blue-400 transition-colors">
                                    <Briefcase size={24} />
                                </div>
                                <div className="flex gap-1">
                                    {isEditing ? (
                                        <>
                                            <button onClick={() => saveEdit(comp.id)} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"><Save size={16} /></button>
                                            <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"><X size={16} /></button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => startEdit(comp)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(comp.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"><Trash2 size={16} /></button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editData.name}
                                    onChange={e => setEditData({ name: e.target.value })}
                                    className="w-full p-1 border border-gray-200 dark:border-gray-700 rounded text-lg font-bold text-gray-800 dark:text-gray-100 mb-1 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            ) : (
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1 transition-colors">{comp.name}</h3>
                            )}

                            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mb-4">ID: {comp.id}</p>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-2 rounded transition-colors">
                                    <span className="flex items-center gap-2"><Users size={14} className="text-blue-400 dark:text-blue-500" /> Angajați</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200">{employeeCount}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-2 rounded transition-colors">
                                    <span className="flex items-center gap-2"><FolderTree size={14} className="text-orange-400 dark:text-orange-500" /> Departamente</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200">{deptCount}</span>
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