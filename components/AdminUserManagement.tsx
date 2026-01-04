
import React, { useState, useEffect } from 'react';
import { User, Role, Company, Department, Office } from '../types';
import { UserPlus, CheckCircle, XCircle, Mail, ShieldAlert, MapPinOff, Building, Database, RefreshCw, Server, Cake, Fingerprint, Clock, Briefcase, FileInput, Upload, Users, BellRing, Eye, AlertTriangle, UserMinus, Filter, Edit2, X, Save, Search, MoreHorizontal } from 'lucide-react';
import UserValidationModal from './UserValidationModal';
import { API_CONFIG } from '../constants';

interface AdminUserManagementProps {
  users: User[];
  companies: Company[];
  departments: Department[];
  offices: Office[];
  onValidateUser: (userId: string) => void;
  onCreateUser: (user: User) => void;
  onUpdateUser: (user: User) => void; // New Prop
}

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ users, companies, departments, offices, onValidateUser, onCreateUser, onUpdateUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'create' | 'import' | 'inactive'>('pending');
  const [isDbSyncing, setIsDbSyncing] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error'>('connected');
  
  // Filtering & Search State
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Validation Modal State
  const [validationUser, setValidationUser] = useState<User | null>(null);
  
  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Import State
  const [importText, setImportText] = useState('');
  
  // Create User Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    erpId: '', 
    companyId: companies[0]?.id || '',
    departmentId: '',
    assignedOfficeId: '',
    contractHours: 8,
    roles: [Role.EMPLOYEE] as Role[],
    requiresGPS: true,
    birthDate: '',
    shareBirthday: false
  });

  // Filter Logic
  const filteredUsers = users.filter(u => {
      // 1. Company Filter
      if (selectedCompanyFilter !== 'ALL' && u.companyId !== selectedCompanyFilter) return false;
      
      // 2. Search Filter
      if (searchTerm) {
          const lowerTerm = searchTerm.toLowerCase();
          const matchesName = u.name.toLowerCase().includes(lowerTerm);
          const matchesEmail = u.email.toLowerCase().includes(lowerTerm);
          const matchesErp = u.erpId?.toLowerCase().includes(lowerTerm);
          return matchesName || matchesEmail || matchesErp;
      }
      
      return true;
  });

  const pendingUsers = filteredUsers.filter(u => !u.isValidated);
  const inactiveUsers = filteredUsers.filter(u => u.isValidated && !u.lastLoginDate && u.employmentStatus === 'ACTIVE');
  const activeListUsers = filteredUsers.filter(u => u.isValidated);
  
  // Dynamic Dropdown Options based on NewUser selection
  const availableDepartmentsNew = departments.filter(d => d.companyId === newUser.companyId);
  
  // Dynamic Dropdown Options based on EditingUser selection
  const availableDepartmentsEdit = editingUser ? departments.filter(d => d.companyId === editingUser.companyId) : [];

  // Helper to translate status
  const getStatusLabel = (status?: string) => {
      switch(status) {
          case 'ACTIVE': return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200">ACTIV</span>;
          case 'SUSPENDED': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold border border-red-200">SUSPENDAT</span>;
          case 'TERMINATED': return <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200">ÎNCETAT</span>;
          default: return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200">ACTIV</span>;
      }
  };

  const toggleRoleNew = (role: Role) => {
      setNewUser(prev => {
          const exists = prev.roles.includes(role);
          if (exists) {
              if (prev.roles.length === 1) return prev;
              return { ...prev, roles: prev.roles.filter(r => r !== role) };
          } else {
              return { ...prev, roles: [...prev.roles, role] };
          }
      });
  };

  const toggleRoleEdit = (role: Role) => {
      if (!editingUser) return;
      setEditingUser(prev => {
          if (!prev) return null;
          const exists = prev.roles.includes(role);
          const newRoles = exists 
             ? prev.roles.filter(r => r !== role)
             : [...prev.roles, role];
          // Ensure at least one role
          if (newRoles.length === 0) return prev;
          return { ...prev, roles: newRoles };
      });
  };

  const handleManualDBSync = async () => {
      setIsDbSyncing(true);
      try {
          await fetch(`${API_CONFIG.BASE_URL}/config/users`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(users)
          });
          setDbStatus('connected');
          alert("Sincronizare completă cu baza de date SQL efectuată.");
      } catch (e) {
          setDbStatus('error');
          alert("Eroare la sincronizare. Verificați conexiunea Bridge.");
      } finally {
          setIsDbSyncing(false);
      }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
    
    const user: User = {
      id: `u-${Date.now()}`,
      erpId: newUser.erpId,
      name: newUser.name,
      email: newUser.email,
      companyId: newUser.companyId,
      departmentId: newUser.departmentId,
      assignedOfficeId: newUser.assignedOfficeId || undefined,
      contractHours: newUser.contractHours,
      roles: newUser.roles,
      authType: 'PIN',
      pin: generatedPin,
      isValidated: true,
      requiresGPS: newUser.requiresGPS,
      avatarUrl: `https://ui-avatars.com/api/?name=${newUser.name}&background=random`,
      allowedScheduleIds: ['sch1'], 
      birthDate: newUser.birthDate || undefined,
      shareBirthday: newUser.shareBirthday,
      employmentStatus: 'ACTIVE'
    };

    onCreateUser(user);
    setTimeout(() => handleManualDBSync(), 500); 

    alert(`Succes! \n\nS-a trimis un email către ${user.email} conținând PIN-ul de acces: ${generatedPin}`);
    
    setNewUser({
       name: '',
       email: '',
       erpId: '',
       companyId: companies[0]?.id || '',
       departmentId: '',
       assignedOfficeId: '',
       contractHours: 8,
       roles: [Role.EMPLOYEE],
       requiresGPS: true,
       birthDate: '',
       shareBirthday: false
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;
      onUpdateUser(editingUser);
      setEditingUser(null);
      setTimeout(() => handleManualDBSync(), 500);
  };

  const handleImport = () => {
      try {
          const parsed = JSON.parse(importText);
          if (!Array.isArray(parsed)) throw new Error("Formatul trebuie să fie un Array JSON.");
          
          let count = 0;
          parsed.forEach((item: any) => {
             const user: User = {
                id: `imp-${Date.now()}-${Math.random()}`,
                name: item.name || 'Unknown',
                email: item.email || `temp-${Math.random()}@company.com`,
                erpId: item.erpId || '',
                companyId: companies[0].id, 
                roles: [Role.EMPLOYEE],
                authType: 'PIN',
                pin: Math.floor(1000 + Math.random() * 9000).toString(),
                isValidated: false, 
                requiresGPS: true,
                avatarUrl: `https://ui-avatars.com/api/?name=${item.name || 'U'}&background=random`,
                allowedScheduleIds: ['sch1'],
                shareBirthday: false,
                employmentStatus: 'ACTIVE'
             };
             onCreateUser(user);
             count++;
          });
          setImportText('');
          alert(`Import realizat cu succes! ${count} utilizatori adăugați în lista de așteptare.`);
          setTimeout(() => handleManualDBSync(), 1000);
          setActiveSubTab('pending');
      } catch (e: any) {
          alert("Eroare la import: " + e.message);
      }
  };

  const handleValidateFromModal = (updatedUser: User) => {
     onValidateUser(updatedUser.id);
     setTimeout(() => handleManualDBSync(), 500);
  };

  const handleSendReminder = (user: User) => {
     alert(`Notificare trimisă către ${user.email} (Reminder: Nu te-ai logat niciodată!)`);
  };

  return (
    <div className="space-y-6">
      
      {/* SQL Bridge Status Section */}
      <div className="bg-slate-800 text-white p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${dbStatus === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  <Database size={24} />
              </div>
              <div>
                  <h3 className="font-bold text-sm">SQL Database Bridge</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                      <span className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'}`}></span>
                      {dbStatus === 'connected' ? 'Conexiune Activă (Users Table)' : 'Eroare Conexiune'}
                  </div>
              </div>
          </div>
          <button 
            onClick={handleManualDBSync}
            disabled={isDbSyncing}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium transition"
          >
              <RefreshCw size={14} className={isDbSyncing ? "animate-spin" : ""}/>
              {isDbSyncing ? 'Sync...' : 'Forțare Sincronizare'}
          </button>
      </div>
      
      {/* Filters & Search Row */}
      <div className="flex flex-col md:flex-row gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3 shadow-sm flex-1">
              <Filter size={20} className="text-gray-400" />
              <span className="text-sm font-bold text-gray-700 whitespace-nowrap">Filtru Companie:</span>
              <select 
                value={selectedCompanyFilter}
                onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full"
              >
                  <option value="ALL">Toate Companiile</option>
                  {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3 shadow-sm flex-1">
              <Search size={20} className="text-gray-400" />
              <input 
                type="text"
                placeholder="Caută după nume, email sau ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
              />
          </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('pending')}
          className={`whitespace-nowrap pb-2 px-1 text-sm font-medium transition-colors ${activeSubTab === 'pending' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Listă Utilizatori / Validare
        </button>
        <button
          onClick={() => setActiveSubTab('create')}
          className={`whitespace-nowrap pb-2 px-1 text-sm font-medium transition-colors ${activeSubTab === 'create' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Creare Utilizator
        </button>
        <button
          onClick={() => setActiveSubTab('import')}
          className={`whitespace-nowrap pb-2 px-1 text-sm font-medium transition-colors ${activeSubTab === 'import' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Import Date
        </button>
        <button
          onClick={() => setActiveSubTab('inactive')}
          className={`whitespace-nowrap pb-2 px-1 text-sm font-medium transition-colors ${activeSubTab === 'inactive' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Monitorizare Activitate <span className="bg-gray-100 text-gray-600 px-1 rounded text-xs ml-1">{inactiveUsers.length}</span>
        </button>
      </div>

      {activeSubTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Users className="text-blue-500" size={20}/> Gestiune Personal
              </h3>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-100 font-medium">
                  {activeListUsers.length} înregistrări găsite
              </span>
          </div>
          
          <div className="mt-4 overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
              {activeListUsers.length === 0 ? (
                  <p className="text-gray-400 italic text-sm p-8 text-center">Nu există angajați activi pentru criteriile selectate.</p>
              ) : (
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="bg-gray-50 text-xs text-gray-500 uppercase font-bold border-b border-gray-200">
                              <th className="p-4">Angajat</th>
                              <th className="p-4">ID ERP</th>
                              <th className="p-4">Structură (Comp/Dept)</th>
                              <th className="p-4">Roluri</th>
                              <th className="p-4">Status</th>
                              <th className="p-4 text-right">Acțiuni</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {activeListUsers.map(user => {
                              const dept = departments.find(d => d.id === user.departmentId)?.name || 'N/A';
                              const companyName = companies.find(c => c.id === user.companyId)?.name || 'N/A';
                              
                              return (
                                  <tr key={user.id} className="hover:bg-blue-50/50 transition">
                                      <td className="p-4">
                                          <div className="flex items-center gap-3">
                                              <img src={user.avatarUrl} className="w-9 h-9 rounded-full bg-gray-100 object-cover border border-gray-200" />
                                              <div>
                                                  <p className="font-bold text-sm text-gray-800">{user.name}</p>
                                                  <p className="text-xs text-gray-500">{user.email}</p>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="p-4">
                                          <span className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">{user.erpId || '-'}</span>
                                      </td>
                                      <td className="p-4">
                                          <div className="flex flex-col">
                                              <span className="text-xs font-bold text-gray-700">{companyName}</span>
                                              <span className="text-xs text-gray-500">{dept}</span>
                                          </div>
                                      </td>
                                      <td className="p-4">
                                          <div className="flex flex-wrap gap-1">
                                              {user.roles.map(r => (
                                                  <span key={r} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                                                      {r}
                                                  </span>
                                              ))}
                                          </div>
                                      </td>
                                      <td className="p-4">
                                          {getStatusLabel(user.employmentStatus)}
                                      </td>
                                      <td className="p-4 text-right">
                                          <button 
                                              onClick={() => setEditingUser(user)}
                                              className="text-gray-400 hover:text-blue-600 p-2 hover:bg-white rounded-lg transition border border-transparent hover:border-gray-200"
                                              title="Editează Utilizator"
                                          >
                                              <Edit2 size={16}/>
                                          </button>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              )}
          </div>

          <div className="border-t border-gray-200 my-4"></div>

          {pendingUsers.length > 0 && (
            <div className="grid gap-4">
              <h4 className="text-sm font-semibold text-orange-500 uppercase flex items-center gap-2">
                  <ShieldAlert size={16}/> Necesită Validare ({pendingUsers.length})
              </h4>
              {pendingUsers.map(user => {
                  const companyName = companies.find(c => c.id === user.companyId)?.name || 'N/A';
                  return (
                    <div key={user.id} className="bg-orange-50 p-4 rounded-xl shadow-sm border border-orange-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src={user.avatarUrl} className="w-10 h-10 rounded-full bg-white" />
                            <div>
                                <p className="font-bold text-gray-800">{user.name}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                                <p className="text-xs text-blue-500 font-medium">{companyName}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setValidationUser(user)}
                            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 flex items-center gap-2 transition shadow-md"
                        >
                            <Eye size={16}/> Validează Accesul
                        </button>
                    </div>
                  );
              })}
            </div>
          )}
        </div>
      )}
      
      {activeSubTab === 'inactive' && (
        <div className="space-y-4">
             <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm text-yellow-800 flex gap-2">
                 <AlertTriangle className="shrink-0" size={20}/>
                 <div>
                     <strong>Atenție!</strong> Următorii utilizatori au conturi validate, dar nu s-au logat niciodată în aplicație.
                 </div>
             </div>

             <div className="grid gap-4">
                 {inactiveUsers.map(user => {
                     const companyName = companies.find(c => c.id === user.companyId)?.name || 'N/A';
                     return (
                        <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <img src={user.avatarUrl} className="w-10 h-10 rounded-full bg-gray-100 grayscale opacity-70" />
                                    <div className="absolute bottom-0 right-0 bg-red-500 w-3 h-3 rounded-full border-2 border-white"></div>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-700">{user.name}</p>
                                    <p className="text-xs text-gray-400">Validat, dar inactiv (Logare lipsă)</p>
                                    <p className="text-xs text-blue-400">{companyName}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleSendReminder(user)}
                                className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
                            >
                                <BellRing size={16}/> Trimite Reminder
                            </button>
                        </div>
                     )
                 })}
                 {inactiveUsers.length === 0 && (
                     <p className="text-center text-gray-400 italic py-8">Toți utilizatorii validați sunt activi.</p>
                 )}
             </div>
        </div>
      )}

      {activeSubTab === 'import' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Upload size={20} className="text-blue-600"/> Import Angajați (Bulk)
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                  Introduceți un array JSON cu datele angajaților. Aceștia vor fi adăugați în lista de așteptare pentru validare.
              </p>
              
              <textarea 
                 value={importText}
                 onChange={e => setImportText(e.target.value)}
                 className="w-full h-48 p-4 border rounded-lg font-mono text-xs bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                 placeholder={`[\n  {"name": "Ion Popescu", "email": "ion@test.com", "erpId": "101"},\n  {"name": "Maria Dan", "email": "maria@test.com", "erpId": "102"}\n]`}
              />
              
              <div className="flex justify-end mt-4">
                  <button 
                    onClick={handleImport}
                    disabled={!importText}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                  >
                      Procesează Import
                  </button>
              </div>
          </div>
      )}

      {activeSubTab === 'create' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <UserPlus size={20} className="text-blue-600"/> Adaugă Angajat Nou
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Utilizați acest formular pentru angajații care nu au adresă de email corporativă Microsoft. 
            Li se va genera un PIN automat ce va fi trimis pe email.
          </p>
          
          <form onSubmit={handleCreateSubmit} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nume Complet</label>
                    <input 
                    required
                    type="text"
                    value={newUser.name}
                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: Ion Popescu"
                    />
                </div>
                
                <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Personal</label>
                    <input 
                    required
                    type="email"
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="ion.popescu@yahoo.com"
                    />
                </div>
             </div>
             
             {/* ERP ID & Contract Hours */}
             <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Fingerprint size={14}/> ID ERP
                    </label>
                    <input 
                      type="text"
                      value={newUser.erpId}
                      onChange={e => setNewUser({...newUser, erpId: e.target.value})}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                      placeholder="Ex: EMP-1024"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Clock size={14}/> Ore Contract/Zi
                    </label>
                    <input 
                      type="number"
                      min={1}
                      max={12}
                      value={newUser.contractHours}
                      onChange={e => setNewUser({...newUser, contractHours: parseInt(e.target.value) || 8})}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                 </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Companie</label>
                  <select 
                    value={newUser.companyId}
                    onChange={e => setNewUser({...newUser, companyId: e.target.value, departmentId: '', assignedOfficeId: ''})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departament</label>
                  <select 
                    value={newUser.departmentId}
                    onChange={e => setNewUser({...newUser, departmentId: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    disabled={availableDepartmentsNew.length === 0}
                  >
                    <option value="">Selectează...</option>
                    {availableDepartmentsNew.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
               </div>
             </div>

             {/* Assigned Office */}
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Building size={14}/> Sediu Alocat (Opțional)
                </label>
                <select 
                  value={newUser.assignedOfficeId}
                  onChange={e => setNewUser({...newUser, assignedOfficeId: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                   <option value="">-- Fără Sediu Fix / Remote --</option>
                   {offices.map(o => (
                       <option key={o.id} value={o.id}>{o.name} ({o.radiusMeters}m)</option>
                   ))}
                </select>
             </div>
             
             {/* Birthday Section */}
             <div className="grid grid-cols-2 gap-4 items-center">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Nașterii</label>
                    <input 
                      type="date"
                      value={newUser.birthDate}
                      onChange={e => setNewUser({...newUser, birthDate: e.target.value})}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                 </div>
                 <div className="flex items-center pt-6">
                    <label className="flex items-center cursor-pointer gap-2 p-2 border rounded-lg w-full bg-pink-50 hover:bg-pink-100 transition border-pink-100">
                        <input 
                            type="checkbox"
                            checked={newUser.shareBirthday}
                            onChange={e => setNewUser({...newUser, shareBirthday: e.target.checked})}
                            className="w-4 h-4 text-pink-500 rounded focus:ring-pink-500"
                        />
                        <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <Cake size={14} className="text-pink-500"/> Anunță colegii
                        </span>
                    </label>
                 </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Roluri</label>
                    <div className="space-y-2">
                        {Object.values(Role).map(role => (
                            <label key={role} className="flex items-center cursor-pointer gap-2">
                                <input 
                                    type="checkbox"
                                    checked={newUser.roles.includes(role)}
                                    onChange={() => toggleRoleNew(role)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">{role}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="flex items-center">
                    <label className="flex items-center cursor-pointer gap-2 p-2 border rounded-lg w-full bg-gray-50 hover:bg-gray-100 transition">
                        <input 
                            type="checkbox"
                            checked={newUser.requiresGPS}
                            onChange={e => setNewUser({...newUser, requiresGPS: e.target.checked})}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Pontare cu GPS Obligatorie</span>
                    </label>
                </div>
             </div>

             <div className="pt-2">
               <button 
                 type="submit"
                 className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
               >
                 <Mail size={18}/> Creare Cont & Trimitere Email
               </button>
             </div>
          </form>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                  <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                          <Edit2 size={20}/> Editare Utilizator: {editingUser.name}
                      </h3>
                      <button onClick={() => setEditingUser(null)} className="hover:bg-white/20 p-1 rounded transition"><X size={20}/></button>
                  </div>
                  
                  <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nume Complet</label>
                              <input 
                                type="text"
                                required 
                                value={editingUser.name}
                                onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                              <input 
                                type="email"
                                required
                                value={editingUser.email}
                                onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Companie</label>
                              <select 
                                value={editingUser.companyId}
                                onChange={e => setEditingUser({...editingUser, companyId: e.target.value, departmentId: undefined})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                              >
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Departament</label>
                              <select 
                                value={editingUser.departmentId || ''}
                                onChange={e => setEditingUser({...editingUser, departmentId: e.target.value})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                              >
                                <option value="">Selectează...</option>
                                {availableDepartmentsEdit.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                              </select>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Fingerprint size={12}/> ID ERP</label>
                              <input 
                                type="text"
                                value={editingUser.erpId || ''}
                                onChange={e => setEditingUser({...editingUser, erpId: e.target.value})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Building size={12}/> Sediu Alocat</label>
                              <select 
                                value={editingUser.assignedOfficeId || ''}
                                onChange={e => setEditingUser({...editingUser, assignedOfficeId: e.target.value})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                              >
                                <option value="">-- Fără Sediu (Remote) --</option>
                                {offices.map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                              </select>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status Angajat</label>
                              <select 
                                value={editingUser.employmentStatus || 'ACTIVE'}
                                onChange={e => setEditingUser({...editingUser, employmentStatus: e.target.value as any})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                              >
                                <option value="ACTIVE">Activ</option>
                                <option value="SUSPENDED">Suspendat</option>
                                <option value="TERMINATED">Încetat</option>
                              </select>
                          </div>
                          <div className="flex items-center pt-5">
                              <label className="flex items-center cursor-pointer gap-2 p-2 border rounded-lg w-full bg-gray-50 hover:bg-gray-100 transition">
                                  <input 
                                      type="checkbox"
                                      checked={editingUser.requiresGPS}
                                      onChange={e => setEditingUser({...editingUser, requiresGPS: e.target.checked})}
                                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm font-medium text-gray-700">GPS Obligatoriu</span>
                              </label>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Roluri</label>
                          <div className="flex flex-wrap gap-4 p-3 border rounded-lg bg-gray-50">
                              {Object.values(Role).map(role => (
                                  <label key={role} className="flex items-center cursor-pointer gap-2">
                                      <input 
                                          type="checkbox"
                                          checked={editingUser.roles.includes(role)}
                                          onChange={() => toggleRoleEdit(role)}
                                          className="w-4 h-4 text-blue-600 rounded"
                                      />
                                      <span className="text-sm text-gray-700">{role}</span>
                                  </label>
                              ))}
                          </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                          <button 
                            type="button" 
                            onClick={() => setEditingUser(null)} 
                            className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 font-medium text-sm"
                          >
                              Anulează
                          </button>
                          <button 
                            type="submit" 
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 shadow-lg shadow-blue-100"
                          >
                              <Save size={16}/> Salvează Modificări
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {validationUser && (
          <UserValidationModal 
             isOpen={!!validationUser}
             onClose={() => setValidationUser(null)}
             user={validationUser}
             companies={companies}
             departments={departments}
             offices={offices}
             onValidate={handleValidateFromModal}
          />
      )}
    </div>
  );
};

export default AdminUserManagement;
