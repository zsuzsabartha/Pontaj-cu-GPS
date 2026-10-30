
import React, { useState } from 'react';
import { Office, Company, Department, User, Role } from '../types';
import { Building, MapPin, Trash2, Plus, Navigation, FolderTree, Mail, BellOff, RefreshCw, Edit2, User as UserIcon, Briefcase } from 'lucide-react';
import { getCurrentLocation } from '../services/geoService';
import { SQLService } from '../services/sqlService';
import { showToast } from '../utils/toast';

interface OfficeManagementProps {
    offices: Office[];
    companies: Company[];
    departments: Department[];
    users: User[]; // Validation
    onAddOffice: (office: Office) => void;
    onUpdateOffice: (office: Office) => void;
    onDeleteOffice: (id: string) => void;
    onUpdateDepartments: (deps: Department[]) => void;
    onUpdateCompany: (company: Company) => void;
    filterCompanyId?: string | null;
    onNavigateToAddUser?: (companyId: string, departmentId: string) => void;
}

const OfficeManagement: React.FC<OfficeManagementProps> = ({ 
    offices, companies, departments, users, 
    onAddOffice, onUpdateOffice, onDeleteOffice, onUpdateDepartments,
    filterCompanyId, onNavigateToAddUser
}) => {
    const [activeTab, setActiveTab] = useState<'offices' | 'departments'>('departments');
    const [isAdding, setIsAdding] = useState(false);
    const [isAddingDept, setIsAddingDept] = useState(false);

    // Office Editing State
    const [editingOfficeId, setEditingOfficeId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        latitude: '',
        longitude: '',
        radiusMeters: '100'
    });

    // Dept Editing State
    const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
    const [deptFormData, setDeptFormData] = useState({
        name: '',
        companyId: companies[0]?.id || '',
        managerId: ''
    });

    const [locLoading, setLocLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const syncToSQL = async (endpoint: 'offices' | 'departments', data: any[]) => {
        setIsSyncing(true);
        try {
            await SQLService.saveConfigList(endpoint, data);
        } catch (e) {
            console.error("Sync failed", e);
            showToast("Eroare la salvarea în baza de date.", 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    // --- OFFICE LOGIC ---

    const handleGetLocation = async () => {
        setLocLoading(true);
        try {
            const coords = await getCurrentLocation();
            setFormData(prev => ({
                ...prev,
                latitude: coords.latitude.toString(),
                longitude: coords.longitude.toString()
            }));
        } catch (e) {
            if (confirm("Nu am putut prelua locația GPS. Doriți să completați cu o locație simulată (Test Mode)?")) {
                setFormData(prev => ({
                    ...prev,
                    latitude: "44.4268",
                    longitude: "26.1025"
                }));
            } else {
                showToast("Vă rugăm să introduceți manual coordonatele sau să activați GPS-ul.", 'warning');
            }
        } finally {
            setLocLoading(false);
        }
    };

    const handleOfficeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const officeData: Office = {
            id: editingOfficeId || `off-${Date.now()}`,
            name: formData.name,
            coordinates: {
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude)
            },
            radiusMeters: parseInt(formData.radiusMeters)
        };

        if (editingOfficeId) {
            onUpdateOffice(officeData);
            syncToSQL('offices', offices.map(o => o.id === editingOfficeId ? officeData : o));
            setEditingOfficeId(null);
        } else {
            onAddOffice(officeData);
            syncToSQL('offices', [...offices, officeData]);
            setIsAdding(false);
        }

        setFormData({ ...formData, name: '', latitude: '', longitude: '' });
    };

    const startEditOffice = (office: Office) => {
        setEditingOfficeId(office.id);
        setFormData({
            name: office.name,
            latitude: office.coordinates.latitude.toString(),
            longitude: office.coordinates.longitude.toString(),
            radiusMeters: office.radiusMeters.toString()
        });
        setIsAdding(true); // Open form
    };

    const handleDeleteOfficeSafe = (id: string) => {
        const hasUsers = users.some(u => u.assignedOfficeId === id);
        if (hasUsers) {
            alert("Nu se poate șterge acest sediu deoarece există angajați alocați. Vă rugăm mutați angajații întâi.");
            return;
        }
        if (confirm('Ștergeți acest sediu?')) {
            const updated = offices.filter(o => o.id !== id);
            onDeleteOffice(id);
            syncToSQL('offices', updated);
        }
    }

    // --- DEPARTMENT LOGIC ---

    const handleDeptSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const deptData: Department = {
            id: editingDeptId || `d-${Date.now()}`,
            name: deptFormData.name,
            companyId: deptFormData.companyId,
            managerId: deptFormData.managerId || undefined,
            emailNotifications: true // default
        };

        if (editingDeptId) {
            const updated = departments.map(d => d.id === editingDeptId ? { ...d, ...deptData } : d);
            onUpdateDepartments(updated);
            syncToSQL('departments', updated);
            setEditingDeptId(null);
        } else {
            const updated = [...departments, deptData];
            onUpdateDepartments(updated);
            syncToSQL('departments', updated);
            setIsAddingDept(false);
        }
        setDeptFormData({ name: '', companyId: companies[0]?.id || '', managerId: '' });
    };

    const startEditDept = (dept: Department) => {
        setEditingDeptId(dept.id);
        setDeptFormData({
            name: dept.name,
            companyId: dept.companyId,
            managerId: dept.managerId || ''
        });
        setIsAddingDept(true);
    };

    const handleDeleteDept = (id: string) => {
        const hasUsers = users.some(u => u.departmentId === id);
        if (hasUsers) {
            alert("Nu se poate șterge acest departament deoarece există angajați asociați.");
            return;
        }
        if (confirm("Ștergeți acest departament?")) {
            const updated = departments.filter(d => d.id !== id);
            onUpdateDepartments(updated);
            syncToSQL('departments', updated);
        }
    };

    const toggleDeptEmail = (deptId: string) => {
        const updated = departments.map(d => {
            if (d.id === deptId) {
                return { ...d, emailNotifications: !d.emailNotifications };
            }
            return d;
        });
        onUpdateDepartments(updated);
        syncToSQL('departments', updated);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center transition-colors">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Building className="text-emerald-600 dark:text-emerald-400" />
                    Structură Organizațională
                </h2>
                {isSyncing && <span className="text-xs text-emerald-500 dark:text-emerald-400 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Syncing SQL...</span>}
            </div>

            <div className="flex border-b border-gray-200 dark:border-gray-800 transition-colors">
                <button
                    onClick={() => setActiveTab('offices')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'offices' ? 'border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Sedii (Shared HQ)
                </button>
                <button
                    onClick={() => setActiveTab('departments')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'departments' ? 'border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Departamente
                </button>
            </div>

            {activeTab === 'offices' && (
                <>
                    <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800 mb-4 transition-colors">
                        <span className="text-xs text-emerald-800 dark:text-emerald-300">Sediile definite aici sunt vizibile și utilizabile de către toate companiile din grup.</span>
                        <button
                            onClick={() => {
                                setIsAdding(!isAdding);
                                setEditingOfficeId(null);
                                setFormData({ name: '', latitude: '', longitude: '', radiusMeters: '100' });
                            }}
                            className="bg-emerald-600 dark:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-sm"
                        >
                            {isAdding ? 'Anulează' : <><Plus size={16} /> Adaugă Sediu</>}
                        </button>
                    </div>

                    {isAdding && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-emerald-100 dark:border-emerald-900/30 animate-in fade-in slide-in-from-top-4 transition-colors">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">{editingOfficeId ? 'Editare Sediu' : 'Detalii Sediu Nou'}</h3>
                            <form onSubmit={handleOfficeSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Nume Sediu</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        placeholder="Ex: Depozit Vest"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Latitudine</label>
                                        <input
                                            required
                                            type="number"
                                            step="any"
                                            value={formData.latitude}
                                            onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                                            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Longitudine</label>
                                        <input
                                            required
                                            type="number"
                                            step="any"
                                            value={formData.longitude}
                                            onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                                            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGetLocation}
                                        disabled={locLoading}
                                        className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 p-2 rounded-lg transition-all flex items-center justify-center gap-2 h-[42px] border border-transparent dark:border-gray-600"
                                    >
                                        <Navigation size={16} className={locLoading ? "animate-spin" : ""} />
                                        {locLoading ? '...' : 'Locația Mea'}
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Rază Permisă (metri)</label>
                                    <input
                                        required
                                        type="number"
                                        value={formData.radiusMeters}
                                        onChange={e => setFormData({ ...formData, radiusMeters: e.target.value })}
                                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
                                </div>

                                <button type="submit" className="w-full bg-emerald-600 dark:bg-emerald-700 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 dark:shadow-none">
                                    {editingOfficeId ? 'Actualizează Sediu' : 'Salvează Sediu'}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-800">
                                <tr>
                                    <th className="p-3 w-16 text-center">Icon</th>
                                    <th className="p-3">Nume Sediu</th>
                                    <th className="p-3">Coordonate</th>
                                    <th className="p-3">Rază (m)</th>
                                    <th className="p-3 text-right">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {offices.map(office => (
                                    <tr key={office.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="p-3 text-center">
                                            <div className="bg-emerald-50 dark:bg-emerald-900/30 w-8 h-8 rounded flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                                                <MapPin size={16} />
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className="font-bold text-gray-800 dark:text-gray-100">{office.name}</span>
                                            <div className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold uppercase mt-0.5">Sediu / Locație</div>
                                        </td>
                                        <td className="p-3 text-xs text-gray-500 dark:text-gray-400 font-mono">
                                            <div>Lat: {office.coordinates.latitude.toFixed(4)}</div>
                                            <div>Long: {office.coordinates.longitude.toFixed(4)}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                                                {office.radiusMeters}m
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => startEditOffice(office)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-colors"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDeleteOfficeSafe(office.id)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === 'departments' && (
                <div className="space-y-8">

                    {/* Top Actions & Info */}
                    <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                        <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xl">
                            Gestionați departamentele grupate pe companii. Activarea notificărilor trimite email-uri la evenimente (ex: cereri concediu).
                        </div>
                        <button
                            onClick={() => {
                                setIsAddingDept(!isAddingDept);
                                setEditingDeptId(null);
                                setDeptFormData({ name: '', companyId: companies[0]?.id || '', managerId: '' });
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${isAddingDept ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' : 'bg-emerald-600 dark:bg-emerald-700 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 shadow-sm'}`}
                        >
                            {isAddingDept ? 'Închide Formular' : <><Plus size={16} /> Departament Nou</>}
                        </button>
                    </div>

                    {/* Add/Edit Form - Contextually Aware */}
                    {isAddingDept && (
                        <div id="dept-form" className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-2 border-emerald-100 dark:border-emerald-900/30 animate-in fade-in slide-in-from-top-4 relative transition-colors">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 dark:bg-emerald-600 rounded-l-xl"></div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                                {editingDeptId ? <Edit2 size={20} className="text-emerald-600 dark:text-emerald-400" /> : <Plus size={20} className="text-green-600 dark:text-green-400" />}
                                {editingDeptId ? 'Editare Departament' : 'Adăugare Departament Nou'}
                            </h3>

                            <form onSubmit={handleDeptSubmit} className="space-y-6">
                                {/* Company Selection - Highlighted for Clarity */}
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-1">
                                        <Briefcase size={14} /> Companie asignată
                                    </label>
                                    <select
                                        value={deptFormData.companyId}
                                        onChange={e => setDeptFormData({ ...deptFormData, companyId: e.target.value, managerId: '' })}
                                        className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-gray-900 font-medium text-slate-800 dark:text-slate-200 transition-colors"
                                    >
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Acest departament va aparține exclusiv companiei selectate mai sus.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nume Departament</label>
                                        <input
                                            required
                                            type="text"
                                            value={deptFormData.name}
                                            onChange={e => setDeptFormData({ ...deptFormData, name: e.target.value })}
                                            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                            placeholder="Ex: Vânzări"
                                        />
                                    </div>

                                    {/* Manager Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manager (Aprobator)</label>
                                        <select
                                            value={deptFormData.managerId}
                                            onChange={e => setDeptFormData({ ...deptFormData, managerId: e.target.value })}
                                            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                                        >
                                            <option value="">-- Fără Manager Alocat --</option>
                                            {users
                                                .filter(u => u.companyId === deptFormData.companyId && u.roles.includes(Role.MANAGER))
                                                .map(u => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                        </select>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Lista afișează doar utilizatorii cu rol MANAGER din compania selectată.</p>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingDept(false)}
                                        className="px-6 py-2.5 rounded-lg font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                                    >
                                        Anulează
                                    </button>
                                    <button type="submit" className="bg-emerald-600 dark:bg-emerald-700 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 dark:shadow-none">
                                        {editingDeptId ? 'Salvează Modificările' : 'Creează Departament'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Grouped List by Company */}
                    <div className="space-y-6">
                        {(filterCompanyId ? companies.filter(c => c.id === filterCompanyId) : companies).map(company => {
                            const compDepts = departments.filter(d => d.companyId === company.id);

                            return (
                                <div key={company.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-colors">
                                    <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center transition-colors">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-white dark:bg-gray-800 p-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 transition-colors">
                                                <Briefcase size={16} />
                                            </div>
                                            <span className="font-bold text-gray-800 dark:text-gray-100">{company.name}</span>
                                            <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full transition-colors">{compDepts.length}</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setDeptFormData({ name: '', companyId: company.id, managerId: '' });
                                                setIsAddingDept(true);
                                                setEditingDeptId(null);
                                                document.getElementById('dept-form')?.scrollIntoView({ behavior: 'smooth' });
                                            }}
                                            className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 border border-transparent hover:border-emerald-100 dark:hover:border-emerald-800"
                                        >
                                            <Plus size={14} /> Adaugă Departament Aici
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        {compDepts.length === 0 ? (
                                            <div className="p-6 text-center text-sm text-gray-400 dark:text-gray-500 italic">
                                                Niciun departament configurat pentru {company.name}.
                                            </div>
                                        ) : (
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-y border-gray-200 dark:border-gray-700">
                                                    <tr>
                                                        <th className="p-3 w-16 text-center">Icon</th>
                                                        <th className="p-3">Nume Departament</th>
                                                        <th className="p-3">Manager (Aprobator)</th>
                                                        <th className="p-3 text-right">Acțiuni</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                    {compDepts.map(dept => {
                                                        const manager = users.find(u => u.id === dept.managerId);
                                                        const isEditing = editingDeptId === dept.id;

                                                        return (
                                                            <tr key={dept.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all ${isEditing ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                                                                <td className="p-3 text-center">
                                                                    <div className={`w-8 h-8 rounded mx-auto flex items-center justify-center transition-colors ${isEditing ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
                                                                        <FolderTree size={16} />
                                                                    </div>
                                                                </td>
                                                                <td className="p-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <h4 className="font-bold text-gray-800 dark:text-gray-100">{dept.name}</h4>
                                                                        {dept.source === 'ERP' && <span title="Sincronizat din ERP" className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold shrink-0">📦 ERP</span>}
                                                                        {isEditing && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 px-1.5 rounded">Editing</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="p-3">
                                                                    {manager ? (
                                                                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                                                                            <UserIcon size={14} className="text-indigo-400 dark:text-indigo-500" />
                                                                            <span className="font-medium">{manager.name}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-xs text-orange-400 dark:text-orange-500 italic">Fără Manager</div>
                                                                    )}
                                                                </td>
                                                                <td className="p-3 text-right">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <button
                                                                            onClick={() => toggleDeptEmail(dept.id)}
                                                                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${dept.emailNotifications
                                                                                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40'
                                                                                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                                                }`}
                                                                            title={dept.emailNotifications ? 'Dezactivează notificări email' : 'Activează notificări email'}
                                                                        >
                                                                            {dept.emailNotifications ? <Mail size={14} /> : <BellOff size={14} />}
                                                                        </button>

                                                                        {onNavigateToAddUser && (
                                                                            <button
                                                                                onClick={() => onNavigateToAddUser(company.id, dept.id)}
                                                                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all ml-1"
                                                                                title="Adaugă angajat în acest departament"
                                                                            >
                                                                                <Plus size={14} /> Angajat
                                                                            </button>
                                                                        )}

                                                                        {dept.source !== 'ERP' && (
                                                                            <>
                                                                                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                                                                                <button
                                                                                    onClick={() => {
                                                                                        startEditDept(dept);
                                                                                        document.getElementById('dept-form')?.scrollIntoView({ behavior: 'smooth' });
                                                                                    }}
                                                                                    className="text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                                                                                    title="Editează"
                                                                                >
                                                                                    <Edit2 size={16} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteDept(dept.id)}
                                                                                    className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                                                                                    title="Șterge"
                                                                                >
                                                                                    <Trash2 size={16} />
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfficeManagement;
