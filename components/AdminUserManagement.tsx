
import React, { useState } from 'react';
import { User, Role, Company, Department, Office } from '../types';
import { UserPlus, CheckCircle, XCircle, Mail, ShieldAlert, MapPinOff, Building, Database, RefreshCw, Server, Cake, Fingerprint, Clock, Briefcase, FileInput, Upload, Users, BellRing, Eye, AlertTriangle, UserMinus } from 'lucide-react';
import UserValidationModal from './UserValidationModal';

interface AdminUserManagementProps {
  users: User[];
  companies: Company[];
  departments: Department[];
  offices: Office[]; // Added offices to props
  onValidateUser: (userId: string) => void;
  onCreateUser: (user: User) => void;
}

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ users, companies, departments, offices, onValidateUser, onCreateUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'create' | 'import' | 'inactive'>('pending');
  const [isDbSyncing, setIsDbSyncing] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error'>('connected');
  
  // Validation Modal State
  const [validationUser, setValidationUser] = useState<User | null>(null);

  // Import State
  const [importText, setImportText] = useState('');
  
  // Create User Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    erpId: '', 
    companyId: companies[0]?.id || '',
    departmentId: '',
    assignedOfficeId: '', // New field
    contractHours: 8, // New field
    roles: [Role.EMPLOYEE] as Role[],
    requiresGPS: true,
    birthDate: '',
    shareBirthday: false
  });

  const pendingUsers = users.filter(u => !u.isValidated);
  const inactiveUsers = users.filter(u => u.isValidated && !u.lastLoginDate && u.employmentStatus === 'ACTIVE');
  
  const availableDepartments = departments.filter(d => d.companyId === newUser.companyId);
  // Filter offices based on selected company
  const availableOffices = offices.filter(o => o.companyId === newUser.companyId);

  // Helper to translate status
  const getStatusLabel = (status?: string) => {
      switch(status) {
          case 'ACTIVE': return 'ACTIV';
          case 'SUSPENDED': return 'SUSPENDAT';
          case 'TERMINATED': return 'ÎNCETAT';
          default: return 'ACTIV';
      }
  };

  const toggleRole = (role: Role) => {
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
      allowedScheduleIds: ['sch1'], // Default to standard schedule
      birthDate: newUser.birthDate || undefined,
      shareBirthday: newUser.shareBirthday,
      employmentStatus: 'ACTIVE'
    };

    onCreateUser(user);
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

  const handleManualDBSync = () => {
      setIsDbSyncing(true);
      setTimeout(() => {
          setIsDbSyncing(false);
          alert("Sincronizare completă cu baza de date SQL efectuată.");
      }, 1500);
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
                companyId: companies[0].id, // Default to first company
                roles: [Role.EMPLOYEE],
                authType: 'PIN',
                pin: Math.floor(1000 + Math.random() * 9000).toString(),
                isValidated: false, // Imported users are pending validation
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
          setActiveSubTab('pending');
      } catch (e: any) {
          alert("Eroare la import: " + e.message);
      }
  };

  const handleValidateFromModal = (updatedUser: User) => {
     alert("Funcționalitate 'Salvare Date Corectate' necesită backend real. Se va proceda doar la validare.");
     onValidateUser(updatedUser.id);
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
                      {dbStatus === 'connected' ? 'Conexiune Activă (mssql_prod_01)' : 'Eroare Conexiune'}
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

      <div className="flex gap-4 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('pending')}
          className={`whitespace-nowrap pb-2 px-1 text-sm font-medium transition-colors ${activeSubTab === 'pending' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Validare Utilizatori ({pendingUsers.length})
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
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <ShieldAlert className="text-orange-500"/> Cereri de Acces / Listă Useri
          </h3>
          
          <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Utilizatori Activi / Suspendati</h4>
              <div className="grid gap-4">
                {users.filter(u => u.isValidated).map(user => {
                    const dept = departments.find(d => d.id === user.departmentId)?.name || 'N/A';
                    const statusLabel = getStatusLabel(user.employmentStatus);
                    
                    return (
                        <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <img src={user.avatarUrl} className="w-10 h-10 rounded-full bg-gray-100" />
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-bold text-gray-800">{user.name}</p>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${
                                            user.employmentStatus === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200' :
                                            user.employmentStatus === 'SUSPENDED' ? 'bg-red-100 text-red-700 border-red-200' :
                                            'bg-gray-100 text-gray-700 border-gray-200'
                                        }`}>
                                            {statusLabel}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">{user.email} • {dept}</p>
                                </div>
                            </div>
                            <div className="text-xs text-gray-400 font-mono self-start md:self-center">
                                {user.authType}
                            </div>
                        </div>
                    )
                })}
              </div>
          </div>

          <div className="border-t border-gray-200 my-4"></div>

          {pendingUsers.length === 0 ? (
            <div className="bg-white p-4 rounded-xl border border-dashed text-center text-gray-400 text-sm">
              Nu există utilizatori noi care așteaptă validarea.
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingUsers.map(user => (
                <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <img src={user.avatarUrl} className="w-10 h-10 rounded-full bg-gray-100" />
                      <div>
                        <p className="font-bold text-gray-800">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-100">Necesită Validare HR</span>
                      </div>
                   </div>
                   <button 
                     onClick={() => setValidationUser(user)}
                     className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 transition shadow-lg shadow-blue-100"
                   >
                     <Eye size={16}/> Verifică & Validează
                   </button>
                </div>
              ))}
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
                 {inactiveUsers.map(user => (
                     <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <img src={user.avatarUrl} className="w-10 h-10 rounded-full bg-gray-100 grayscale opacity-70" />
                                <div className="absolute bottom-0 right-0 bg-red-500 w-3 h-3 rounded-full border-2 border-white"></div>
                            </div>
                            <div>
                                <p className="font-bold text-gray-700">{user.name}</p>
                                <p className="text-xs text-gray-400">Validat, dar inactiv (Logare lipsă)</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleSendReminder(user)}
                            className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
                        >
                            <BellRing size={16}/> Trimite Reminder
                        </button>
                     </div>
                 ))}
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
                    disabled={availableDepartments.length === 0}
                  >
                    <option value="">Selectează...</option>
                    {availableDepartments.map(d => (
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
                   {availableOffices.map(o => (
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
                                    onChange={() => toggleRole(role)}
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
