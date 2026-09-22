
import React, { useState } from 'react';
import { Office, Company, Department, User, Role } from '../types';
import { Building, MapPin, Trash2, Plus, Navigation, FolderTree, Mail, BellOff, RefreshCw, Edit2, User as UserIcon, Briefcase } from 'lucide-react';
import { getCurrentLocation } from '../services/geoService';
import { API_CONFIG } from '../constants';

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
}

const OfficeManagement: React.FC<OfficeManagementProps> = ({ offices, companies, departments, users, onAddOffice, onUpdateOffice, onDeleteOffice, onUpdateDepartments }) => {
    const [activeTab, setActiveTab] = useState<'offices' | 'departments'>('offices');
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
            await fetch(`${API_CONFIG.BASE_URL}/config/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) {
            console.error("Sync failed", e);
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
                alert("Vă rugăm să introduceți manual coordonatele sau să activați GPS-ul.");
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
            onDeleteOffice(id);
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
                    <Building className="text-blue-600 dark:text-blue-400" />
                    Structură Organizațională
                </h2>
                {isSyncing && <span className="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Syncing SQL...</span>}
            </div>

            <div className="flex border-b border-gray-200 dark:border-gray-800 transition-colors">
                <button
                    onClick={() => setActiveTab('offices')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'offices' ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Sedii (Shared HQ)
                </button>
                <button
                    onClick={() => setActiveTab('departments')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'departments' ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Departamente
                </button>
            </div>

            {activeTab === 'offices' && (
                <>
                    <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 mb-4 transition-colors">
                        <span className="text-xs text-blue-800 dark:text-blue-300">Sediile definite aici sunt vizibile și utilizabile de către toate companiile din grup.</span>
                        <button
                            onClick={() => {
                                setIsAdding(!isAdding);
                                setEditingOfficeId(null);
                                setFormData({ name: '', latitude: '', longitude: '', radiusMeters: '100' });
                            }}
                            className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm"
                        >
                            {isAdding ? 'Anulează' : <><Plus size={16} /> Adaugă Sediu</>}
                        </button>
                    </div>

                    {isAdding && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-blue-100 dark:border-blue-900/30 animate-in fade-in slide-in-from-top-4 transition-colors">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">{editingOfficeId ? 'Editare Sediu' : 'Detalii Sediu Nou'}</h3>
                            <form onSubmit={handleOfficeSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Nume Sediu</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                                            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                                            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>

                                <button type="submit" className="w-full bg-blue-600 dark:bg-blue-700 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 dark:shadow-none">
                                    {editingOfficeId ? 'Actualizează Sediu' : 'Salvează Sediu'}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        {offices.map(office => (
                            <div key={office.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md dark:hover:border-gray-600 transition-all relative group">
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={() => startEditOffice(office)} className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDeleteOfficeSafe(office.id)} className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"><Trash2 size={16} /></button>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-blue-600 dark:text-blue-400 transition-colors">
                                        <MapPin size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 dark:text-gray-100 transition-colors">{office.name}</h3>
                                        <p className="text-xs text-blue-500 dark:text-blue-400 font-medium">Shared Headquarters</p>
                                        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 font-mono space-y-1 transition-colors">
                                            <p>Lat: {office.coordinates.latitude.toFixed(4)}</p>
                                            <p>Long: {office.coordinates.longitude.toFixed(4)}</p>
                                            <p className="text-blue-400 dark:text-blue-500">Rază: {office.radiusMeters}m</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
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
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${isAddingDept ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600 shadow-sm'}`}
                        >
                            {isAddingDept ? 'Închide Formular' : <><Plus size={16} /> Departament Nou</>}
                        </button>
                    </div>

                    {/* Add/Edit Form - Contextually Aware */}
                    {isAddingDept && (
                        <div id="dept-form" className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-2 border-blue-100 dark:border-blue-900/30 animate-in fade-in slide-in-from-top-4 relative transition-colors">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 dark:bg-blue-600 rounded-l-xl"></div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                                {editingDeptId ? <Edit2 size={20} className="text-blue-600 dark:text-blue-400" /> : <Plus size={20} className="text-green-600 dark:text-green-400" />}
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
                                        className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-900 font-medium text-slate-800 dark:text-slate-200 transition-colors"
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
                                            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Ex: Vânzări"
                                        />
                                    </div>

                                    {/* Manager Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manager (Aprobator)</label>
                                        <select
                                            value={deptFormData.managerId}
                                            onChange={e => setDeptFormData({ ...deptFormData, managerId: e.target.value })}
                                            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
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
                                    <button type="submit" className="bg-blue-600 dark:bg-blue-700 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 dark:shadow-none">
                                        {editingDeptId ? 'Salvează Modificările' : 'Creează Departament'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Grouped List by Company */}
                    <div className="space-y-6">
                        {companies.map(company => {
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
                                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 border border-transparent hover:border-blue-100 dark:hover:border-blue-800"
                                        >
                                            <Plus size={14} /> Adaugă Departament Aici
                                        </button>
                                    </div>

                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {compDepts.length === 0 ? (
                                            <div className="p-6 text-center text-sm text-gray-400 dark:text-gray-500 italic">
                                                Niciun departament configurat pentru {company.name}.
                                            </div>
                                        ) : (
                                            compDepts.map(dept => {
                                                const manager = users.find(u => u.id === dept.managerId);
                                                const isEditing = editingDeptId === dept.id;

                                                return (
                                                    <div key={dept.id} className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all ${isEditing ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
                                                                <FolderTree size={20} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm">{dept.name}</h4>
                                                                    {isEditing && <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/40 px-1.5 rounded">Editing</span>}
                                                                </div>

                                                                {manager ? (
                                                                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                                        <UserIcon size={12} className="text-indigo-400 dark:text-indigo-500" />
                                                                        <span>Manager: <span className="font-medium text-gray-700 dark:text-gray-200">{manager.name}</span></span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-[10px] text-orange-400 dark:text-orange-500 mt-0.5 italic">Fără Manager</div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 self-end md:self-auto">
                                                            <button
                                                                onClick={() => toggleDeptEmail(dept.id)}
                                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${dept.emailNotifications
                                                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40'
                                                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                                    }`}
                                                            >
                                                                {dept.emailNotifications ? <Mail size={12} /> : <BellOff size={12} />}
                                                                {dept.emailNotifications ? 'Notificări Active' : 'Fără Notificări'}
                                                            </button>

                                                            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                                                            <button
                                                                onClick={() => {
                                                                    startEditDept(dept);
                                                                    document.getElementById('dept-form')?.scrollIntoView({ behavior: 'smooth' });
                                                                }}
                                                                className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all"
                                                                title="Editează"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteDept(dept.id)}
                                                                className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all"
                                                                title="Șterge"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })
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
