
import React, { useState } from 'react';
import { User, Role, Company, Department, Office, WorkSchedule, Timesheet, LeaveRequest, CorrectionRequest, ShiftStatus, LeaveStatus } from '../types';
import { UserPlus, ShieldAlert, Database, RefreshCw, Mail, Eye, AlertTriangle, BellRing, Upload, Edit2, X, Save, Wand2, Users, FileText, Download } from 'lucide-react';
import UserValidationModal from './UserValidationModal';
import { API_CONFIG, HOLIDAYS_RO, INITIAL_LEAVE_CONFIGS } from '../constants';
import SmartTable, { Column } from './SmartTable';

interface AdminUserManagementProps {
  users: User[];
  companies: Company[];
  departments: Department[];
  offices: Office[];
  workSchedules: WorkSchedule[]; 
  onValidateUser: (userId: string) => void;
  onCreateUser: (user: User) => void;
  onUpdateUser: (user: User) => void; 
  onBulkImport?: (timesheets: Timesheet[], leaves: LeaveRequest[], corrections: CorrectionRequest[]) => void;
}

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ users, companies, departments, offices, workSchedules, onValidateUser, onCreateUser, onUpdateUser, onBulkImport }) => {
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'create' | 'import' | 'inactive' | 'generator'>('pending');
  const [isDbSyncing, setIsDbSyncing] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error'>('connected');
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationUser, setValidationUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [importText, setImportText] = useState('');
  
  // State to hold generated data for download
  const [generatedData, setGeneratedData] = useState<{timesheets: Timesheet[], leaves: LeaveRequest[], corrections: CorrectionRequest[]} | null>(null);
  
  const [newUser, setNewUser] = useState({
    name: '', email: '', erpId: '', companyId: companies[0]?.id || '', departmentId: '', assignedOfficeId: '',
    contractHours: 8, roles: [Role.EMPLOYEE] as Role[], requiresGPS: true, birthDate: '', shareBirthday: false,
    mainScheduleId: '', alternativeScheduleIds: [] as string[]
  });

  const pendingUsers = users.filter(u => !u.isValidated);
  const inactiveUsers = users.filter(u => u.isValidated && !u.lastLoginDate && u.employmentStatus === 'ACTIVE');
  const activeListUsers = users.filter(u => u.isValidated);

  const getStatusLabel = (status?: string) => {
      switch(status) {
          case 'ACTIVE': return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200">ACTIV</span>;
          case 'SUSPENDED': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold border border-red-200">SUSPENDAT</span>;
          case 'TERMINATED': return <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200">ÎNCETAT</span>;
          default: return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200">ACTIV</span>;
      }
  };

  const handleManualDBSync = async () => {
      setIsDbSyncing(true);
      try {
          await fetch(`${API_CONFIG.BASE_URL}/config/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(users) });
          setDbStatus('connected');
          alert("Sincronizare completă cu baza de date SQL efectuată.");
      } catch (e) {
          setDbStatus('error');
          alert("Eroare la sincronizare.");
      } finally { setIsDbSyncing(false); }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user: User = {
      id: `u-${Date.now()}`,
      erpId: newUser.erpId, name: newUser.name, email: newUser.email, companyId: newUser.companyId, departmentId: newUser.departmentId,
      assignedOfficeId: newUser.assignedOfficeId || undefined, contractHours: newUser.contractHours, roles: newUser.roles,
      authType: 'PIN', pin: Math.floor(1000 + Math.random() * 9000).toString(), isValidated: true, requiresGPS: newUser.requiresGPS,
      avatarUrl: `https://ui-avatars.com/api/?name=${newUser.name}&background=random`, mainScheduleId: newUser.mainScheduleId || (workSchedules[0]?.id || ''),
      alternativeScheduleIds: newUser.alternativeScheduleIds, birthDate: newUser.birthDate || undefined, shareBirthday: newUser.shareBirthday, employmentStatus: 'ACTIVE'
    };
    onCreateUser(user);
    alert(`User creat! PIN: ${user.pin}`);
  };

  const generateSQL2025 = () => {
      if (!generatedData) return;
      const { timesheets, leaves } = generatedData;

      let sql = `-- SCRIPT GENERAT AUTOMAT PENTRU PONTAJ 2025\n`;
      sql += `-- Conține: Nomenclator Ture, Alocare Ture Utilizatori, Pontaje 2025, Concedii 2025\n\n`;
      sql += `USE PontajSmart;\nGO\n\n`;

      // 1. Nomenclature (Work Schedules)
      sql += `-- 1. NOMENCLATOR PROGRAME DE LUCRU (SHIFTS)\n`;
      workSchedules.forEach(ws => {
          sql += `IF NOT EXISTS (SELECT * FROM work_schedules WHERE id='${ws.id}') \n`;
          sql += `  INSERT INTO work_schedules (id, name, start_time, end_time, crosses_midnight) VALUES ('${ws.id}', N'${ws.name}', '${ws.startTime}', '${ws.endTime}', ${ws.crossesMidnight ? 1 : 0});\n`;
      });
      sql += `GO\n\n`;

      // 2. User Assignments
      sql += `-- 2. ALOCARE PROGRAME UTILIZATORI\n`;
      users.forEach(u => {
          if (u.mainScheduleId) {
              sql += `UPDATE users SET main_schedule_id = '${u.mainScheduleId}' WHERE id = '${u.id}';\n`;
          }
      });
      sql += `GO\n\n`;

      // 3. Leaves
      sql += `-- 3. CONCEDII 2025 (${leaves.length} înregistrări)\n`;
      // Use chunks or batching if really large, but for demo simpler is fine
      leaves.forEach(l => {
          const reasonClean = l.reason.replace(/'/g, "''");
          sql += `INSERT INTO leave_requests (id, user_id, type_id, start_date, end_date, reason, status) VALUES ('${l.id}', '${l.userId}', '${l.typeId}', '${l.startDate}', '${l.endDate}', N'${reasonClean}', '${l.status}');\n`;
      });
      sql += `GO\n\n`;

      // 4. Timesheets
      sql += `-- 4. PONTAJE 2025 (${timesheets.length} înregistrări)\n`;
      timesheets.forEach(t => {
          // SQL Server prefers YYYY-MM-DD HH:MM:SS for strings implicitly cast to datetime2
          const start = t.startTime.replace('T', ' ').substring(0, 19);
          const end = t.endTime ? `'${t.endTime.replace('T', ' ').substring(0, 19)}'` : 'NULL';
          const schedId = t.detectedScheduleId ? `'${t.detectedScheduleId}'` : 'NULL';
          const officeId = t.matchedOfficeId ? `'${t.matchedOfficeId}'` : 'NULL';
          
          sql += `INSERT INTO timesheets (id, user_id, start_time, end_time, date, status, matched_office_id, detected_schedule_id) VALUES ('${t.id}', '${t.userId}', '${start}', ${end}, '${t.date}', '${t.status}', ${officeId}, ${schedId});\n`;
      });
      sql += `GO\n`;

      // Download Trigger
      const blob = new Blob([sql], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pontaj_data_2025_${new Date().getTime()}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const generateMockData2025 = async () => {
      if (!onBulkImport) return;
      if (!confirm("Generare date 2025? (Această acțiune va popula interfața și va pregăti scriptul SQL)")) return;

      setIsGenerating(true);
      
      // Wait a moment to allow UI to update to "Loading" state
      await new Promise(resolve => setTimeout(resolve, 100));

      const generatedTimesheets: Timesheet[] = [];
      const generatedLeaves: LeaveRequest[] = [];
      const generatedCorrections: CorrectionRequest[] = [];

      const year = 2025;
      const coConfig = INITIAL_LEAVE_CONFIGS.find(lc => lc.code === 'CO');
      const cmConfig = INITIAL_LEAVE_CONFIGS.find(lc => lc.code === 'CM');
      const delConfig = INITIAL_LEAVE_CONFIGS.find(lc => lc.code === 'DEL-T');

      const userLeavePlans: Record<string, string[]> = {}; 

      users.forEach(user => {
          userLeavePlans[user.id] = [];
          let daysAllocated = 0;
          // 1. Summer Block
          const summerMonth = Math.random() > 0.5 ? 6 : 7; 
          const summerStartDay = Math.floor(Math.random() * 15) + 1;
          for (let i = 0; i < 10; i++) {
              const d = new Date(year, summerMonth, summerStartDay + i);
              // Safe date string construction
              const safeDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              if (d.getDay() !== 0 && d.getDay() !== 6) { 
                  userLeavePlans[user.id].push(safeDate);
                  daysAllocated++;
              }
          }
          // 2. Winter Block
          const winterStartDay = 20; 
          for (let i = 0; i < 7; i++) { 
              const d = new Date(year, 11, winterStartDay + i);
              const safeDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              if (d.getDay() !== 0 && d.getDay() !== 6 && daysAllocated < 21) {
                  userLeavePlans[user.id].push(safeDate);
              }
          }
      });

      // Loop through months instead of one giant loop to prevent UI blocking
      for (let m = 0; m < 12; m++) {
          // Yield to event loop to prevent "Violation: Handler took Xms"
          await new Promise(resolve => setTimeout(resolve, 0));

          const daysInMonth = new Date(year, m + 1, 0).getDate();
          
          for (let day = 1; day <= daysInMonth; day++) {
              const d = new Date(year, m, day);
              // CRITICAL FIX: Use manual string construction to avoid UTC timezone shifts
              const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              
              const dayOfWeek = d.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const isHoliday = HOLIDAYS_RO.some(h => h.date === dateStr);

              users.forEach(user => {
                  if (!user.isValidated) return;

                  if (userLeavePlans[user.id].includes(dateStr)) {
                      if (coConfig) {
                          generatedLeaves.push({
                              id: `gen-lr-${user.id}-${dateStr}`,
                              userId: user.id, typeId: coConfig.id, typeName: coConfig.name,
                              startDate: dateStr, endDate: dateStr, reason: "Concediu de odihnă planificat 2025",
                              status: LeaveStatus.APPROVED, createdAt: new Date(year, 0, 15).toISOString()
                          });
                      }
                      return;
                  }

                  if (!isWeekend && !isHoliday) {
                      const rand = Math.random();
                      if (rand < 0.001 && cmConfig) {
                          generatedLeaves.push({
                              id: `gen-cm-${user.id}-${dateStr}`, userId: user.id, typeId: cmConfig.id, typeName: cmConfig.name,
                              startDate: dateStr, endDate: dateStr, reason: "Problemă medicală", status: LeaveStatus.APPROVED
                          });
                          return;
                      }
                      
                      const isDelegation = Math.random() < 0.02;
                      if (isDelegation && delConfig) {
                           generatedLeaves.push({
                              id: `gen-del-${user.id}-${dateStr}`, userId: user.id, typeId: delConfig.id, typeName: delConfig.name,
                              startDate: dateStr, endDate: dateStr, reason: "Delegație client", status: LeaveStatus.APPROVED
                          });
                      }

                      // Determine shift based on mainScheduleId
                      const schedule = workSchedules.find(s => s.id === user.mainScheduleId) || workSchedules[0];
                      const [sh, sm] = schedule.startTime.split(':').map(Number);
                      const [eh, em] = schedule.endTime.split(':').map(Number);

                      const startHour = sh;
                      const startMin = sm + Math.floor(Math.random() * 15) - 5; // +/- 5 mins variation
                      const startTime = new Date(d);
                      startTime.setHours(startHour, startMin, 0);

                      const endHour = eh;
                      const endMin = em + Math.floor(Math.random() * 15);
                      const endTime = new Date(d);
                      if (schedule.crossesMidnight) endTime.setDate(endTime.getDate() + 1);
                      endTime.setHours(endHour, endMin, 0);

                      let location = { latitude: 44.4268, longitude: 26.1025 }; 
                      let officeId = user.assignedOfficeId;
                      let dist = 50;

                      if (isDelegation) { officeId = undefined; dist = 5000; location = { latitude: 45.0, longitude: 25.0 }; }

                      generatedTimesheets.push({
                          id: `gen-ts-${user.id}-${dateStr}`, 
                          userId: user.id, 
                          date: dateStr, 
                          startTime: startTime.toISOString(),
                          endTime: endTime.toISOString(), 
                          status: ShiftStatus.COMPLETED, 
                          startLocation: location, 
                          endLocation: location,
                          matchedOfficeId: officeId, 
                          distanceToOffice: dist, 
                          breaks: [],
                          detectedScheduleId: schedule.id, // Assign the schedule
                          detectedScheduleName: schedule.name
                      });
                  }
              });
          }
      }

      // 1. Update Local State
      onBulkImport(generatedTimesheets, generatedLeaves, generatedCorrections);
      setGeneratedData({ timesheets: generatedTimesheets, leaves: generatedLeaves, corrections: generatedCorrections });

      alert(`Generare Completă!\n\nTimesheets: ${generatedTimesheets.length}\nConcedii: ${generatedLeaves.length}\n\nAcum puteți descărca scriptul SQL.`);
      setIsGenerating(false);
  };

  const userColumns: Column<User>[] = [
      { header: 'Angajat', accessor: 'name', sortable: true, filterable: true, render: (u) => <div className="flex items-center gap-3"><img src={u.avatarUrl} className="w-8 h-8 rounded-full"/><div><p className="font-bold text-sm">{u.name}</p><p className="text-xs text-gray-500">{u.email}</p></div></div> },
      { header: 'ID ERP', accessor: 'erpId', render: (u) => <span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded">{u.erpId || '-'}</span> },
      { header: 'Companie', accessor: (u) => companies.find(c => c.id === u.companyId)?.name || '-' },
      { header: 'Status', accessor: 'employmentStatus', render: (u) => getStatusLabel(u.employmentStatus) },
      { header: 'Acțiuni', accessor: 'id', render: (u) => <button onClick={() => setEditingUser(u)} className="text-gray-400 hover:text-blue-600 p-2"><Edit2 size={16}/></button> }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 text-white p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3"><Database size={24} /><div><h3 className="font-bold text-sm">SQL Bridge</h3><p className="text-xs text-slate-300">{dbStatus}</p></div></div>
          <button onClick={handleManualDBSync} disabled={isDbSyncing} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs"><RefreshCw size={14} className={isDbSyncing?"animate-spin":""}/> Sync</button>
      </div>
      
      <div className="flex gap-4 border-b border-gray-200 pb-2 overflow-x-auto">
        <button onClick={() => setActiveSubTab('pending')} className={`pb-2 px-1 text-sm font-medium ${activeSubTab==='pending'?'border-b-2 border-blue-600 text-blue-600':'text-gray-500'}`}>Listă Utilizatori</button>
        <button onClick={() => setActiveSubTab('create')} className={`pb-2 px-1 text-sm font-medium ${activeSubTab==='create'?'border-b-2 border-blue-600 text-blue-600':'text-gray-500'}`}>Creare User</button>
        <button onClick={() => setActiveSubTab('generator')} className={`pb-2 px-1 text-sm font-medium flex items-center gap-1 ${activeSubTab==='generator'?'border-b-2 border-purple-600 text-purple-600':'text-gray-500'}`}><Wand2 size={14}/> Generator 2025</button>
      </div>

      {activeSubTab === 'generator' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in">
              <div className="flex items-start gap-4">
                  <div className="bg-purple-100 p-3 rounded-xl text-purple-600"><Wand2 size={32} /></div>
                  <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">Generator Date 2025</h3>
                      <p className="text-sm text-gray-500 mt-1">Simulează un an complet de activitate: Pontaje, Concedii (21 zile), Delegații și Ture alocate.</p>
                      
                      <div className="flex gap-4 mt-4">
                          <button onClick={generateMockData2025} disabled={isGenerating} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 shadow-md flex items-center gap-2">
                              {isGenerating ? <RefreshCw className="animate-spin" size={18}/> : <Wand2 size={18}/>} Generare Date
                          </button>
                          
                          {generatedData && (
                              <button onClick={generateSQL2025} className="bg-slate-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800 shadow-md flex items-center gap-2">
                                  <Download size={18}/> Download .SQL
                              </button>
                          )}
                      </div>
                      
                      {generatedData && (
                          <div className="mt-4 p-3 bg-green-50 text-green-800 text-xs rounded border border-green-200">
                              Date generate gata de export! Include {generatedData.timesheets.length} pontaje și {generatedData.leaves.length} concedii.
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {activeSubTab === 'pending' && (
        <div className="space-y-4">
          <SmartTable data={activeListUsers} columns={userColumns} pageSize={10}/>
          {pendingUsers.length > 0 && (
            <div className="grid gap-4 mt-4">
              <h4 className="text-sm font-semibold text-orange-500 flex items-center gap-2"><ShieldAlert size={16}/> Necesită Validare ({pendingUsers.length})</h4>
              {pendingUsers.map(user => (
                <div key={user.id} className="bg-orange-50 p-3 rounded-lg flex justify-between items-center">
                    <p className="font-bold text-gray-800 text-sm">{user.name} <span className="text-gray-500 font-normal">({user.email})</span></p>
                    <button onClick={() => setValidationUser(user)} className="bg-orange-600 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2"><Eye size={14}/> Validează</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'create' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><UserPlus size={20} className="text-blue-600"/> Adaugă Angajat Nou</h3>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nume</label><input required type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full p-2 border rounded outline-none"/></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label><input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full p-2 border rounded outline-none"/></div>
             </div>
             <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700">Creează Cont</button>
          </form>
        </div>
      )}

      {editingUser && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl p-6">
                  <h3 className="font-bold text-lg mb-4">Editare: {editingUser.name}</h3>
                  <input type="text" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full p-2 border rounded mb-4"/>
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingUser(null)} className="px-4 py-2 border rounded text-sm">Anulează</button>
                      <button onClick={() => { onUpdateUser(editingUser); setEditingUser(null); }} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Salvează</button>
                  </div>
              </div>
          </div>
      )}

      {validationUser && <UserValidationModal isOpen={!!validationUser} onClose={() => setValidationUser(null)} user={validationUser} companies={companies} departments={departments} offices={offices} workSchedules={workSchedules} onValidate={(u) => { onValidateUser(u.id); onUpdateUser(u); }} />}
    </div>
  );
};

export default AdminUserManagement;
