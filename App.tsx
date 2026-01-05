
import React, { useState, useEffect } from 'react';
import { 
  User, Role, Timesheet, ShiftStatus, LeaveRequest, CorrectionRequest, 
  Company, Department, Office, BreakConfig, LeaveConfig, WorkSchedule, 
  Holiday, AppConfig, LeaveStatus, BreakStatus, Break, DailySchedule, 
  Coordinates
} from './types';
import { 
  MOCK_USERS, MOCK_COMPANIES, MOCK_DEPARTMENTS, MOCK_OFFICES, 
  INITIAL_TIMESHEETS, INITIAL_LEAVE_REQUESTS, INITIAL_CORRECTION_REQUESTS,
  INITIAL_BREAK_CONFIGS, INITIAL_LEAVE_CONFIGS, INITIAL_WORK_SCHEDULES,
  HOLIDAYS_RO, getDefaultLockedDate, INITIAL_SCHEDULE_PLANS
} from './constants';

import LoginScreen from './components/LoginScreen';
import ClockWidget from './components/ClockWidget';
import TimesheetList from './components/TimesheetList';
import LeaveModal from './components/LeaveModal';
import TimesheetEditModal from './components/TimesheetEditModal';
import RejectionModal from './components/RejectionModal';
import BirthdayWidget from './components/BirthdayWidget';
import ManagerDashboard from './components/ManagerDashboard';
import AdminUserManagement from './components/AdminUserManagement';
import CompanyManagement from './components/CompanyManagement';
import OfficeManagement from './components/OfficeManagement';
import NomenclatorManagement from './components/NomenclatorManagement';
import ScheduleCalendar from './components/ScheduleCalendar';

import { 
  LogOut, LayoutDashboard, UserCog, Settings, Calendar, 
  Palmtree, CheckCircle, XCircle, Slash, Clock, CalendarRange, 
  Menu, X, Building, Users as UsersIcon, FileText
} from 'lucide-react';

const App: React.FC = () => {
  // --- STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'DASHBOARD' | 'MANAGER' | 'ADMIN' | 'CALENDAR'>('DASHBOARD');
  
  // Data State
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [departments, setDepartments] = useState<Department[]>(MOCK_DEPARTMENTS);
  const [offices, setOffices] = useState<Office[]>(MOCK_OFFICES);
  
  const [timesheets, setTimesheets] = useState<Timesheet[]>(INITIAL_TIMESHEETS);
  const [leaves, setLeaves] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>(INITIAL_CORRECTION_REQUESTS);
  
  const [breakConfigs, setBreakConfigs] = useState<BreakConfig[]>(INITIAL_BREAK_CONFIGS);
  const [leaveConfigs, setLeaveConfigs] = useState<LeaveConfig[]>(INITIAL_LEAVE_CONFIGS);
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>(INITIAL_WORK_SCHEDULES);
  const [holidays, setHolidays] = useState<Holiday[]>(HOLIDAYS_RO);
  const [schedules, setSchedules] = useState<DailySchedule[]>(INITIAL_SCHEDULE_PLANS);
  
  const [lockedDate, setLockedDate] = useState<string>(getDefaultLockedDate());

  // Modals
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [activeCorrectionSheet, setActiveCorrectionSheet] = useState<Timesheet | null>(null);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  
  const [rejectionModalData, setRejectionModalData] = useState<{type: 'LEAVE' | 'CORRECTION' | 'BREAK' | 'LEAVE_CANCEL', id: string, parentId?: string} | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- DERIVED STATE ---
  const myTimesheets = currentUser ? timesheets.filter(ts => ts.userId === currentUser.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];
  const myLeaves = currentUser ? leaves.filter(l => l.userId === currentUser.id).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()) : [];
  
  const todayStr = new Date().toISOString().split('T')[0];
  const currentTimesheet = myTimesheets.find(ts => ts.date === todayStr);
  const currentShiftStatus = currentTimesheet ? currentTimesheet.status : ShiftStatus.NOT_STARTED;

  // --- HANDLERS ---

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Default view based on role
    if (user.roles.includes(Role.ADMIN)) setView('ADMIN');
    else if (user.roles.includes(Role.MANAGER)) setView('MANAGER');
    else setView('DASHBOARD');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('DASHBOARD');
  };

  const handleClockIn = (location: Coordinates, office: Office | null, dist: number) => {
      if (!currentUser) return;
      
      const newTs: Timesheet = {
          id: `ts-${Date.now()}`,
          userId: currentUser.id,
          date: todayStr,
          startTime: new Date().toISOString(),
          status: ShiftStatus.WORKING,
          matchedOfficeId: office?.id,
          distanceToOffice: dist,
          startLocation: location,
          breaks: []
      };
      setTimesheets([newTs, ...timesheets]);
  };

  const handleClockOut = (location: Coordinates) => {
      if (!currentTimesheet) return;
      const updatedTs: Timesheet = {
          ...currentTimesheet,
          endTime: new Date().toISOString(),
          status: ShiftStatus.COMPLETED,
          endLocation: location
      };
      setTimesheets(timesheets.map(t => t.id === updatedTs.id ? updatedTs : t));
  };

  const handleToggleBreak = (config?: BreakConfig, location?: Coordinates, dist?: number) => {
      if (!currentTimesheet) return;

      if (currentTimesheet.status === ShiftStatus.ON_BREAK) {
          // End Break
          const updatedBreaks = [...currentTimesheet.breaks];
          const activeBreakIndex = updatedBreaks.findIndex(b => !b.endTime);
          if (activeBreakIndex !== -1) {
              updatedBreaks[activeBreakIndex] = {
                  ...updatedBreaks[activeBreakIndex],
                  endTime: new Date().toISOString(),
                  endLocation: location,
                  endDistanceToOffice: dist
              };
          }
          const updatedTs = { ...currentTimesheet, status: ShiftStatus.WORKING, breaks: updatedBreaks };
          setTimesheets(timesheets.map(t => t.id === updatedTs.id ? updatedTs : t));

      } else {
          // Start Break
          if (!config) return;
          const newBreak: Break = {
              id: `br-${Date.now()}`,
              typeId: config.id,
              typeName: config.name,
              status: BreakStatus.PENDING,
              startTime: new Date().toISOString(),
              startLocation: location,
              startDistanceToOffice: dist
          };
          const updatedTs = { 
              ...currentTimesheet, 
              status: ShiftStatus.ON_BREAK, 
              breaks: [...currentTimesheet.breaks, newBreak] 
          };
          setTimesheets(timesheets.map(t => t.id === updatedTs.id ? updatedTs : t));
      }
  };

  const handleLeaveSubmit = (req: Omit<LeaveRequest, 'id' | 'status' | 'userId'>) => {
      if (!currentUser) return;
      const newLeave: LeaveRequest = {
          id: `lr-${Date.now()}`,
          userId: currentUser.id,
          status: LeaveStatus.PENDING,
          createdAt: new Date().toISOString(),
          ...req
      };
      setLeaves([newLeave, ...leaves]);
  };

  const handleCorrectionSubmit = (data: any) => {
      // In real app, this maps data to CorrectionRequest or updates Timesheet if Manager
      if (!currentUser) return;
      
      if (view === 'MANAGER' || currentUser.roles.includes(Role.ADMIN)) {
          // Direct Update
          if (data.type === 'WORK') {
             // Upsert Timesheet logic
             // ... simplified for demo
             alert("Pontaj actualizat (Manager Override).");
          }
      } else {
          // Request
          const newReq: CorrectionRequest = {
              id: `cr-${Date.now()}`,
              userId: currentUser.id,
              status: 'PENDING',
              requestedStartTime: data.start,
              requestedEndTime: data.end,
              reason: data.reason,
              timesheetId: data.tsId
          };
          setCorrectionRequests([...correctionRequests, newReq]);
          alert("Solicitare de corecție trimisă.");
      }
  };

  const initiateRejection = (type: 'LEAVE' | 'CORRECTION' | 'BREAK' | 'LEAVE_CANCEL', id: string, parentId?: string) => {
      setRejectionModalData({ type, id, parentId });
  };

  const handleRejectionConfirm = (reason: string) => {
      if (!rejectionModalData) return;
      const { type, id, parentId } = rejectionModalData;

      if (type === 'LEAVE') {
          setLeaves(leaves.map(l => l.id === id ? { ...l, status: LeaveStatus.REJECTED, managerComment: reason } : l));
      } else if (type === 'LEAVE_CANCEL') {
          setLeaves(leaves.map(l => l.id === id ? { ...l, status: LeaveStatus.CANCELLED, cancellationReason: reason } : l));
      } else if (type === 'CORRECTION') {
          setCorrectionRequests(correctionRequests.map(r => r.id === id ? { ...r, status: 'REJECTED', managerNote: reason } : r));
      } else if (type === 'BREAK') {
          if (parentId) {
              setTimesheets(timesheets.map(ts => {
                  if (ts.id === parentId) {
                      return {
                          ...ts,
                          breaks: ts.breaks.map(b => b.id === id ? { ...b, status: BreakStatus.REJECTED, managerNote: reason } : b)
                      }
                  }
                  return ts;
              }));
          }
      }
      setRejectionModalData(null);
  };

  const handleApproveLeave = (id: string) => {
      setLeaves(leaves.map(l => l.id === id ? { ...l, status: LeaveStatus.APPROVED } : l));
  };

  const handleApproveBreak = (tsId: string, brId: string, status: BreakStatus) => {
      setTimesheets(timesheets.map(ts => {
          if (ts.id === tsId) {
              return {
                  ...ts,
                  breaks: ts.breaks.map(b => b.id === brId ? { ...b, status: status } : b)
              }
          }
          return ts;
      }));
  };

  const handleApproveCorrection = (id: string) => {
      setCorrectionRequests(correctionRequests.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r));
      // In real app, apply changes to timesheet here
  };
  
  const handleAssignSchedule = (userId: string, date: string, scheduleId: string) => {
      const existing = schedules.find(s => s.userId === userId && s.date === date);
      if (existing) {
          if (scheduleId === "") {
              // Delete
              setSchedules(schedules.filter(s => s.id !== existing.id));
          } else {
              // Update
              setSchedules(schedules.map(s => s.id === existing.id ? { ...s, scheduleId } : s));
          }
      } else if (scheduleId !== "") {
          // Create
          setSchedules([...schedules, { id: `ds-${Date.now()}`, userId, date, scheduleId }]);
      }
  };

  // --- BULK DATA IMPORT (For Generator) ---
  const handleBulkDataImport = (newTimesheets: Timesheet[], newLeaves: LeaveRequest[], newCorrections: CorrectionRequest[]) => {
      setTimesheets([...timesheets, ...newTimesheets]);
      setLeaves([...leaves, ...newLeaves]);
      setCorrectionRequests([...correctionRequests, ...newCorrections]);
  };

  // --- RENDER ---

  if (!currentUser) {
      return (
          <LoginScreen 
            users={users} 
            companies={companies}
            onLogin={handleLogin}
          />
      );
  }

  const isManager = currentUser.roles.includes(Role.MANAGER) || currentUser.roles.includes(Role.ADMIN);
  const isAdmin = currentUser.roles.includes(Role.ADMIN);

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-800">
      {/* SIDEBAR (Mobile & Desktop) */}
      <div className={`fixed inset-y-0 left-0 bg-slate-900 text-white w-64 transform transition-transform z-30 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                  <h1 className="text-xl font-bold tracking-tight">PontajApp</h1>
                  <p className="text-xs text-slate-400">Enterprise Edition</p>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400"><X/></button>
          </div>
          
          <div className="p-4 space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">Meniu Principal</div>
              
              <button onClick={() => setView('DASHBOARD')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${view === 'DASHBOARD' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-300 hover:bg-slate-800'}`}>
                  <LayoutDashboard size={18}/> Panou Personal
              </button>
              
              <button onClick={() => setView('CALENDAR')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${view === 'CALENDAR' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-300 hover:bg-slate-800'}`}>
                  <CalendarRange size={18}/> Calendar
              </button>

              {(isManager || isAdmin) && (
                  <>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-6 mb-2 px-2">Management</div>
                    <button onClick={() => setView('MANAGER')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${view === 'MANAGER' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-300 hover:bg-slate-800'}`}>
                        <UsersIcon size={18}/> Echipa Mea
                    </button>
                  </>
              )}

              {isAdmin && (
                  <>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-6 mb-2 px-2">Administrare</div>
                    <button onClick={() => setView('ADMIN')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${view === 'ADMIN' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-300 hover:bg-slate-800'}`}>
                        <Settings size={18}/> Setări Globale
                    </button>
                  </>
              )}
          </div>

          <div className="absolute bottom-0 w-full p-4 border-t border-slate-800 bg-slate-900">
              <div className="flex items-center gap-3 mb-4">
                  <img src={currentUser.avatarUrl} className="w-10 h-10 rounded-full border border-slate-600"/>
                  <div className="overflow-hidden">
                      <p className="text-sm font-bold truncate">{currentUser.name}</p>
                      <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                  </div>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-lg text-sm font-medium transition">
                  <LogOut size={16}/> Deconectare
              </button>
          </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
          <div className="md:hidden flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold text-gray-800">PontajApp</h1>
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white rounded shadow text-gray-600"><Menu/></button>
          </div>

          {view === 'DASHBOARD' && (
              <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
                  <BirthdayWidget users={users} currentUser={currentUser} />
                  
                  <div className="grid md:grid-cols-2 gap-6">
                      <ClockWidget 
                        user={currentUser}
                        companyName={companies.find(c => c.id === currentUser.companyId)?.name}
                        offices={offices}
                        currentStatus={currentShiftStatus}
                        breakConfigs={breakConfigs}
                        holidays={holidays}
                        activeLeaveRequest={myLeaves.find(l => l.startDate <= todayStr && l.endDate >= todayStr)}
                        shiftStartTime={currentTimesheet?.startTime}
                        activeBreakStartTime={currentTimesheet?.breaks.find(b => !b.endTime)?.startTime}
                        onClockIn={handleClockIn}
                        onClockOut={handleClockOut}
                        onToggleBreak={handleToggleBreak}
                      />
                      
                      <div className="space-y-6">
                           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                               <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                   <Palmtree size={20} className="text-purple-500"/> Concediile Mele
                               </h3>
                               
                               <div className="grid gap-4">
                                   {myLeaves.length === 0 ? (
                                       <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                                           <Palmtree size={48} className="mx-auto mb-2 opacity-20"/>
                                           <p>Nu ai nicio cerere de concediu înregistrată.</p>
                                       </div>
                                   ) : (
                                       myLeaves.slice(0, 3).map(leave => {
                                           const isApproved = leave.status === LeaveStatus.APPROVED;
                                           const isCancelled = leave.status === LeaveStatus.CANCELLED;
                                           const notConsumed = new Date(leave.startDate) >= new Date(new Date().setHours(0,0,0,0));
                                           
                                           return (
                                               <div key={leave.id} className={`bg-gray-50 p-3 rounded-lg border flex justify-between items-center ${isCancelled ? 'opacity-60' : ''}`}>
                                                   <div>
                                                       <div className="flex items-center gap-2">
                                                           <span className={`font-bold text-sm ${isCancelled ? 'line-through text-gray-500' : 'text-gray-800'}`}>{leave.typeName}</span>
                                                           <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                                                               isApproved ? 'bg-green-100 text-green-700' :
                                                               leave.status === LeaveStatus.REJECTED ? 'bg-red-100 text-red-700' :
                                                               isCancelled ? 'bg-gray-200 text-gray-600' : 'bg-yellow-100 text-yellow-700'
                                                           }`}>
                                                               {isCancelled ? 'Anulat' : leave.status}
                                                           </span>
                                                       </div>
                                                       <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                           <CalendarRange size={12}/>
                                                           {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                                                       </div>
                                                   </div>
                                                   
                                                   {isApproved && notConsumed && !isCancelled && (
                                                       <button 
                                                           onClick={() => initiateRejection('LEAVE_CANCEL', leave.id)}
                                                           className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition flex items-center gap-1"
                                                           title="Anulează Concediu"
                                                       >
                                                           <XCircle size={14}/>
                                                       </button>
                                                   )}
                                               </div>
                                           );
                                       })
                                   )}
                                   <button 
                                       onClick={() => setIsLeaveModalOpen(true)}
                                       className="w-full py-2 bg-purple-50 text-purple-700 font-bold rounded-lg text-sm hover:bg-purple-100 transition flex items-center justify-center gap-2"
                                   >
                                       <Calendar size={16}/> Cerere Nouă
                                   </button>
                               </div>
                           </div>

                           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                               <div className="flex justify-between items-center mb-4">
                                   <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                       <Clock size={20} className="text-blue-500"/> Istoric Recent
                                   </h3>
                               </div>
                               <TimesheetList 
                                   timesheets={myTimesheets.slice(0, 5)} 
                                   offices={offices}
                                   users={users}
                                   breakConfigs={breakConfigs}
                                   onEditTimesheet={(ts) => {
                                       setActiveCorrectionSheet(ts);
                                       setIsCorrectionModalOpen(true);
                                   }}
                               />
                           </div>
                      </div>
                  </div>
              </div>
          )}

          {view === 'MANAGER' && (
              <ManagerDashboard 
                 users={users}
                 currentUser={currentUser}
                 timesheets={timesheets}
                 leaves={leaves}
                 correctionRequests={correctionRequests}
                 companies={companies}
                 offices={offices}
                 breakConfigs={breakConfigs}
                 leaveConfigs={leaveConfigs}
                 holidays={holidays}
                 canViewAllCompanies={isAdmin}
                 onApproveLeave={handleApproveLeave}
                 onReject={initiateRejection}
                 onApproveBreak={handleApproveBreak}
                 onApproveCorrection={handleApproveCorrection}
                 onOpenTimesheetModal={(ts) => {
                     setActiveCorrectionSheet(ts);
                     setIsCorrectionModalOpen(true);
                 }}
              />
          )}

          {view === 'ADMIN' && (
              <div className="space-y-8 animate-in fade-in">
                  <h1 className="text-2xl font-bold text-gray-800 mb-6">Administrare Sistem</h1>
                  
                  <section className="space-y-4">
                      <CompanyManagement 
                        companies={companies} 
                        users={users} 
                        departments={departments}
                        offices={offices}
                        onAddCompany={(c) => setCompanies([...companies, c])}
                        onUpdateCompany={(c) => setCompanies(companies.map(x => x.id === c.id ? c : x))}
                        onDeleteCompany={(id) => setCompanies(companies.filter(c => c.id !== id))}
                      />
                  </section>

                  <section className="space-y-4">
                      <OfficeManagement 
                         offices={offices}
                         companies={companies}
                         departments={departments}
                         users={users}
                         onAddOffice={(o) => setOffices([...offices, o])}
                         onUpdateOffice={(o) => setOffices(offices.map(x => x.id === o.id ? o : x))}
                         onDeleteOffice={(id) => setOffices(offices.filter(o => o.id !== id))}
                         onUpdateDepartments={setDepartments}
                         onUpdateCompany={() => {}} // Placeholder
                      />
                  </section>

                  <section className="space-y-4">
                      <AdminUserManagement 
                         users={users}
                         companies={companies}
                         departments={departments}
                         offices={offices}
                         workSchedules={workSchedules}
                         onValidateUser={(id) => setUsers(users.map(u => u.id === id ? { ...u, isValidated: true } : u))}
                         onCreateUser={(u) => setUsers([...users, u])}
                         onUpdateUser={(u) => setUsers(users.map(x => x.id === u.id ? u : x))}
                         onBulkImport={handleBulkDataImport} // NEW PROP
                      />
                  </section>

                  <section className="space-y-4">
                      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileText className="text-blue-600"/> Nomenclatoare & Configurare</h2>
                      <NomenclatorManagement 
                         breakConfigs={breakConfigs}
                         leaveConfigs={leaveConfigs}
                         workSchedules={workSchedules}
                         holidays={holidays}
                         currentLockedDate={lockedDate}
                         onUpdateBreaks={setBreakConfigs}
                         onUpdateLeaves={setLeaveConfigs}
                         onUpdateSchedules={setWorkSchedules}
                         onUpdateHolidays={setHolidays}
                         onUpdateLockedDate={setLockedDate}
                      />
                  </section>
              </div>
          )}

          {view === 'CALENDAR' && (
              <ScheduleCalendar 
                 currentUser={currentUser}
                 users={users}
                 schedules={schedules}
                 holidays={holidays}
                 timesheets={timesheets}
                 leaves={leaves}
                 lockedDate={lockedDate}
                 workSchedules={workSchedules}
                 onAssignSchedule={handleAssignSchedule}
              />
          )}
      </div>

      {/* MODALS */}
      <LeaveModal 
         isOpen={isLeaveModalOpen} 
         onClose={() => setIsLeaveModalOpen(false)}
         leaveConfigs={leaveConfigs}
         lockedDate={lockedDate}
         onSubmit={handleLeaveSubmit}
      />
      
      <TimesheetEditModal 
         isOpen={isCorrectionModalOpen}
         onClose={() => { setIsCorrectionModalOpen(false); setActiveCorrectionSheet(null); }}
         timesheet={activeCorrectionSheet}
         isManager={isManager}
         lockedDate={lockedDate}
         leaveConfigs={leaveConfigs}
         onSave={handleCorrectionSubmit}
      />

      <RejectionModal 
         isOpen={!!rejectionModalData}
         onClose={() => setRejectionModalData(null)}
         onSubmit={handleRejectionConfirm}
         title={rejectionModalData?.type === 'LEAVE_CANCEL' ? 'Motiv Anulare' : 'Motiv Respingere'}
      />
    </div>
  );
};

export default App;
