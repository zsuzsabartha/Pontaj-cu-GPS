import React, { useState } from 'react';
import { Office, Company, Department, User } from '../types';
import { Building, MapPin, Trash2, Plus, Navigation, FolderTree, Mail, BellOff, RefreshCw, Edit2 } from 'lucide-react';
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
      companyId: companies[0]?.id || ''
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
      if(confirm("Nu am putut prelua locația GPS. Doriți să completați cu o locație simulată (Test Mode)?")) {
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
      if(confirm('Ștergeți acest sediu?')) {
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
      setDeptFormData({ name: '', companyId: companies[0]?.id || '' });
  };

  const startEditDept = (dept: Department) => {
      setEditingDeptId(dept.id);
      setDeptFormData({
          name: dept.name,
          companyId: dept.companyId
      });
      setIsAddingDept(true);
  };

  const handleDeleteDept = (id: string) => {
      const hasUsers = users.some(u => u.departmentId === id);
      if (hasUsers) {
          alert("Nu se poate șterge acest departament deoarece există angajați asociați.");
          return;
      }
      if(confirm("Ștergeți acest departament?")) {
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Building className="text-blue-600" />
          Structură Organizațională
        </h2>
        {isSyncing && <span className="text-xs text-blue-500 flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> Syncing SQL...</span>}
      </div>

      <div className="flex border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('offices')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'offices' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Sedii (Shared HQ)
        </button>
        <button 
          onClick={() => setActiveTab('departments')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'departments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Departamente
        </button>
      </div>

      {activeTab === 'offices' && (
        <>
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                <span className="text-xs text-blue-800">Sediile definite aici sunt vizibile și utilizabile de către toate companiile din grup.</span>
                <button 
                    onClick={() => {
                        setIsAdding(!isAdding);
                        setEditingOfficeId(null);
                        setFormData({ name: '', latitude: '', longitude: '', radiusMeters: '100' });
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
                >
                    {isAdding ? 'Anulează' : <><Plus size={16}/> Adaugă Sediu</>}
                </button>
            </div>

            {isAdding && (
                <div className="bg-white p-6 rounded-xl shadow-md border border-blue-100 animate-in fade-in slide-in-from-top-4">
                <h3 className="font-semibold text-gray-700 mb-4">{editingOfficeId ? 'Editare Sediu' : 'Detalii Sediu Nou'}</h3>
                <form onSubmit={handleOfficeSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Nume Sediu</label>
                        <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Ex: Depozit Vest"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Latitudine</label>
                        <input 
                        required
                        type="number" 
                        step="any"
                        value={formData.latitude}
                        onChange={e => setFormData({...formData, latitude: e.target.value})}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Longitudine</label>
                        <input 
                        required
                        type="number" 
                        step="any"
                        value={formData.longitude}
                        onChange={e => setFormData({...formData, longitude: e.target.value})}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <button 
                        type="button"
                        onClick={handleGetLocation}
                        disabled={locLoading}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition flex items-center justify-center gap-2 h-[42px]"
                    >
                        <Navigation size={16} className={locLoading ? "animate-spin" : ""} />
                        {locLoading ? '...' : 'Locația Mea'}
                    </button>
                    </div>

                    <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Rază Permisă (metri)</label>
                    <input 
                        required
                        type="number" 
                        value={formData.radiusMeters}
                        onChange={e => setFormData({...formData, radiusMeters: e.target.value})}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-200">
                        {editingOfficeId ? 'Actualizează Sediu' : 'Salvează Sediu'}
                    </button>
                </form>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                {offices.map(office => (
                    <div key={office.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition relative group">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => startEditOffice(office)} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50"><Edit2 size={16}/></button>
                            <button onClick={() => handleDeleteOfficeSafe(office.id)} className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50"><Trash2 size={16}/></button>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                                <MapPin size={24} />
                            </div>
                            <div>
                            <h3 className="font-bold text-gray-800">{office.name}</h3>
                            <p className="text-xs text-blue-500 font-medium">Shared Headquarters</p>
                            <div className="mt-2 text-xs text-gray-400 font-mono space-y-1">
                                <p>Lat: {office.coordinates.latitude.toFixed(4)}</p>
                                <p>Long: {office.coordinates.longitude.toFixed(4)}</p>
                                <p className="text-blue-400">Rază: {office.radiusMeters}m</p>
                            </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
      )}

      {activeTab === 'departments' && (
          <div className="space-y-6">
              <div className="flex justify-between items-center">
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-xs text-yellow-800 max-w-xl">
                      <span className="font-bold">Notă:</span> Activarea notificărilor pe email va trimite alerte către angajați la evenimente critice.
                  </div>
                  <button 
                    onClick={() => {
                        setIsAddingDept(!isAddingDept);
                        setEditingDeptId(null);
                        setDeptFormData({ name: '', companyId: companies[0]?.id || '' });
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
                  >
                      {isAddingDept ? 'Anulează' : <><Plus size={16}/> Adaugă Departament</>}
                  </button>
              </div>

              {isAddingDept && (
                  <div className="bg-white p-6 rounded-xl shadow-md border border-blue-100 animate-in fade-in slide-in-from-top-4">
                      <h3 className="font-semibold text-gray-700 mb-4">{editingDeptId ? 'Editare Departament' : 'Departament Nou'}</h3>
                      <form onSubmit={handleDeptSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                          <div className="flex-1 w-full">
                              <label className="block text-sm font-medium text-gray-600 mb-1">Nume Departament</label>
                              <input 
                                required
                                type="text" 
                                value={deptFormData.name}
                                onChange={e => setDeptFormData({...deptFormData, name: e.target.value})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ex: Vânzări"
                              />
                          </div>
                          <div className="flex-1 w-full">
                              <label className="block text-sm font-medium text-gray-600 mb-1">Companie</label>
                              <select 
                                value={deptFormData.companyId}
                                onChange={e => setDeptFormData({...deptFormData, companyId: e.target.value})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                              >
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                          </div>
                          <button type="submit" className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 transition">
                              {editingDeptId ? 'Salvează' : 'Adaugă'}
                          </button>
                      </form>
                  </div>
              )}
              
              <div className="grid gap-4">
                  {departments.map(dept => {
                      const companyName = companies.find(c => c.id === dept.companyId)?.name || 'Companie Necunoscută';
                      return (
                          <div key={dept.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition">
                              <div className="flex items-center gap-4">
                                  <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
                                      <FolderTree size={24} />
                                  </div>
                                  <div>
                                      <h3 className="font-bold text-gray-800">{dept.name}</h3>
                                      <p className="text-xs text-gray-500">{companyName}</p>
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 mr-4 opacity-0 group-hover:opacity-100 transition">
                                      <button onClick={() => startEditDept(dept)} className="text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50"><Edit2 size={16}/></button>
                                      <button onClick={() => handleDeleteDept(dept.id)} className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50"><Trash2 size={16}/></button>
                                  </div>

                                  <span className={`text-xs font-medium hidden sm:block ${dept.emailNotifications ? 'text-green-600' : 'text-gray-400'}`}>
                                      {dept.emailNotifications ? 'Email Activ' : 'Email Oprit'}
                                  </span>
                                  <button 
                                      onClick={() => toggleDeptEmail(dept.id)}
                                      className={`p-2 rounded-lg transition-colors ${dept.emailNotifications ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                      title="Toggle Email Notifications"
                                  >
                                      {dept.emailNotifications ? <Mail size={20} /> : <BellOff size={20} />}
                                  </button>
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
