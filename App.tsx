
import React, { useState, useEffect, useMemo } from 'react';
import { 
  MOCK_USERS, 
  INITIAL_TIMESHEETS, 
  INITIAL_LEAVE_REQUESTS, 
  INITIAL_CORRECTION_REQUESTS,
  INITIAL_BREAK_CONFIGS, 
  INITIAL_LEAVE_CONFIGS,
  INITIAL_WORK_SCHEDULES,
  HOLIDAYS_RO,
  MOCK_OFFICES,
  MOCK_COMPANIES,
  MOCK_DEPARTMENTS,
  INITIAL_SCHEDULE_PLANS,
  INITIAL_NOTIFICATIONS,
  getDefaultLockedDate
} from './constants';
import { 
  User, 
  Timesheet, 
  ShiftStatus, 
  Role, 
  Coordinates, 
  Office, 
  LeaveRequest, 
  LeaveStatus, 
  Department,
  BreakStatus,
  CorrectionRequest,
  BreakConfig,
  LeaveConfig,
  WorkSchedule,
  DailySchedule,
  Notification,
  Company,
  Holiday,
  Break
} from './types';
import ClockWidget from './components/ClockWidget';
import TimesheetList from './components/TimesheetList';
import LeaveModal from './components/LeaveModal';
import OfficeManagement from './components/OfficeManagement';
import AdminUserManagement from './components/AdminUserManagement';
import NomenclatorManagement from './components/NomenclatorManagement';
import BackendControlPanel from './components/BackendControlPanel';
import LoginScreen from './components/LoginScreen';
import TimesheetEditModal from './components/TimesheetEditModal';
import RejectionModal from './components/RejectionModal';
import BirthdayWidget from './components/BirthdayWidget';
import ScheduleCalendar from './components/ScheduleCalendar';
import CompanyManagement from './components/CompanyManagement';
import ManagerDashboard from './components/ManagerDashboard';
import LeaveCalendarReport from './components/LeaveCalendarReport';
import { Users, Settings, LogOut, CheckCircle, XCircle, Building, Clock, UserCog, Database, Server, CalendarRange, Bell, PlusCircle, Briefcase, LayoutList, Palmtree, Slash, Menu, X } from 'lucide-react';
import { findNearestOffice } from './services/geoService';

// --- CUSTOM HOOK FOR PERSISTENCE ---
function usePersistedState<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error saving localStorage key "${key}":`, error);
    }
  }, [key, state]);

  return [state, setState] as const;
}

export default function App() {
  // --- Auth State ---
  const [users, setUsers] = usePersistedState<User[]>('pontaj_users', MOCK_USERS); 
  const [currentUser, setCurrentUser] = useState<User | null>(null); 

  // --- App Data State (Persisted) ---
  const [timesheets, setTimesheets] = usePersistedState<Timesheet[]>('pontaj_timesheets', INITIAL_TIMESHEETS);
  const [leaves, setLeaves] = usePersistedState<LeaveRequest[]>('pontaj_leaves', INITIAL_LEAVE_REQUESTS);
  const [correctionRequests, setCorrectionRequests] = usePersistedState<CorrectionRequest[]>('pontaj_corrections', INITIAL_CORRECTION_REQUESTS);
  const [schedulePlans, setSchedulePlans] = usePersistedState<DailySchedule[]>('pontaj_schedules', INITIAL_SCHEDULE_PLANS);
  const [notifications, setNotifications] = usePersistedState<Notification[]>('pontaj_notifications', INITIAL_NOTIFICATIONS);
  
  // --- Configuration State (Persisted) ---
  const [breakConfigs, setBreakConfigs] = usePersistedState<BreakConfig[]>('pontaj_break_configs', INITIAL_BREAK_CONFIGS);
  const [leaveConfigs, setLeaveConfigs] = usePersistedState<LeaveConfig[]>('pontaj_leave_configs', INITIAL_LEAVE_CONFIGS);
  const [workSchedules, setWorkSchedules] = usePersistedState<WorkSchedule[]>('pontaj_work_schedules', INITIAL_WORK_SCHEDULES);
  const [holidays, setHolidays] = usePersistedState<Holiday[]>('pontaj_holidays_v2', HOLIDAYS_RO); 
  
  // --- Locked Date State (Persisted) ---
  const [lockedDate, setLockedDate] = usePersistedState<string>('pontaj_locked_date', getDefaultLockedDate());

  // Office & Department Management State (Persisted)
  const [companies, setCompanies] = usePersistedState<Company[]>('pontaj_companies', MOCK_COMPANIES);
  const [departments, setDepartments] = usePersistedState<Department[]>('pontaj_departments', MOCK_DEPARTMENTS);
  const [offices, setOffices] = usePersistedState<Office[]>('pontaj_offices', MOCK_OFFICES);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'leaves' | 'offices' | 'users' | 'nomenclator' | 'backend' | 'calendar' | 'notifications' | 'companies'>('dashboard');
  const [dashboardView, setDashboardView] = useState<'clock' | 'history'>('clock');
  const [isLeaveModalOpen, setLeaveModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Edit Timesheet State
  const [editModalData, setEditModalData] = useState<{isOpen: boolean, timesheet: Timesheet | null}>({isOpen: false, timesheet: null});
  
  // Rejection/Cancellation Modal State
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    type: 'LEAVE' | 'CORRECTION' | 'BREAK' | 'LEAVE_CANCEL' | null; 
    itemId: string | null;
    parentId?: string;
  }>({ isOpen: false, type: null, itemId: null });

  // --- Derived State for Active Shift ---
  const currentShift = useMemo(() => {
      if (!currentUser) return null;
      const now = new Date().toISOString();
      return timesheets
        .filter(t => 
            t.userId === currentUser.id && 
            t.status !== ShiftStatus.COMPLETED &&
            t.startTime <= now // Fix: Ignore future shifts from generator
        )
        .sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0] || null;
  }, [currentUser, timesheets]);

  // --- Derived Shift Statistics ---
  const shiftStats = useMemo(() => {
      if (!currentShift) return { accumulatedPauseMs: 0, activeBreakStart: undefined };
      let accumulatedPauseMs = 0;
      let activeBreakStart: string | undefined = undefined;
      
      currentShift.breaks.forEach(b => {
          if (b.endTime && b.startTime) {
              const start = new Date(b.startTime).getTime();
              const end = new Date(b.endTime).getTime();
              if (!isNaN(start) && !isNaN(end) && end > start) {
                  accumulatedPauseMs += (end - start);
              }
          } else if (b.startTime && !b.endTime) {
              activeBreakStart = b.startTime;
          }
      });
      return { accumulatedPauseMs, activeBreakStart };
  }, [currentShift]);

  // --- HANDLERS ---

  const handleLogin = (user: User, isNewUser?: boolean) => {
      const freshUser = users.find(u => u.id === user.id) || user;
      if (freshUser.employmentStatus === 'SUSPENDED' || freshUser.employmentStatus === 'TERMINATED') {
          alert("Contul dumneavoastră este suspendat sau inactiv.");
          return;
      }
      const loggedUser = { ...freshUser, lastLoginDate: new Date().toISOString() };
      if (isNewUser) setUsers(prev => [...prev, loggedUser]);
      else setUsers(prev => prev.map(u => u.id === loggedUser.id ? loggedUser : u));
      
      setCurrentUser(loggedUser);
      setActiveTab('dashboard');
  };

  const handleLogout = () => { setCurrentUser(null); setIsSidebarOpen(false); };

  const initiateRejection = (type: 'LEAVE' | 'CORRECTION' | 'BREAK' | 'LEAVE_CANCEL', itemId: string, parentId?: string) => { 
      setRejectionModal({ isOpen: true, type, itemId, parentId }); 
  };
  
  const handleConfirmRejection = async (reason: string) => {
      if (rejectionModal.type === 'LEAVE_CANCEL' && rejectionModal.itemId) {
          // --- NOTIFICATION LOGIC FOR MANAGER ---
          const targetLeave = leaves.find(l => l.id === rejectionModal.itemId);
          if (currentUser && targetLeave) {
              const userDept = departments.find(d => d.id === currentUser.departmentId);
              if (userDept?.managerId && userDept.managerId !== currentUser.id) {
                  const newNotif: Notification = {
                      id: `notif-${Date.now()}`,
                      userId: userDept.managerId,
                      title: 'Anulare Concediu Aprobat',
                      message: `Angajatul ${currentUser.name} a anulat concediul de ${targetLeave.typeName} (${targetLeave.startDate} - ${targetLeave.endDate}). Motiv: ${reason}`,
                      type: 'ALERT',
                      isRead: false,
                      date: new Date().toISOString()
                  };
                  setNotifications(prev => [newNotif, ...prev]);
              }
          }

          setLeaves(prev => prev.map(l => l.id === rejectionModal.itemId ? { 
              ...l, 
              status: LeaveStatus.CANCELLED, 
              cancellationReason: reason 
          } : l));
      } else if (rejectionModal.type === 'LEAVE' && rejectionModal.itemId) {
          setLeaves(prev => prev.map(l => l.id === rejectionModal.itemId ? { ...l, status: LeaveStatus.REJECTED, managerComment: reason } : l));
      } else if (rejectionModal.type === 'CORRECTION' && rejectionModal.itemId) {
          setCorrectionRequests(prev => prev.map(c => c.id === rejectionModal.itemId ? { ...c, status: 'REJECTED', managerNote: reason } : c));
      } else if (rejectionModal.type === 'BREAK' && rejectionModal.itemId && rejectionModal.parentId) {
          setTimesheets(prev => prev.map(ts => ts.id !== rejectionModal.parentId ? ts : { 
              ...ts, breaks: ts.breaks.map(b => b.id === rejectionModal.itemId ? { ...b, status: BreakStatus.REJECTED, managerNote: reason } : b) 
          }));
      }
      
      setRejectionModal({ isOpen: false, type: null, itemId: null }); 
  };

  const handleCreateUser = (newUser: User) => { setUsers(prev => [...prev, { ...newUser, employmentStatus: 'ACTIVE' }]); };
  const handleUpdateUser = (updatedUser: User) => { setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u)); };
  const openTimesheetModal = (ts: Timesheet | null) => setEditModalData({ isOpen: true, timesheet: ts });
  
  const handleTimesheetSave = async (data: any) => { 
      if (data.type === 'WORK') {
          // Logic for editing work timesheet (Manager) or creating correction (User)
          if(data.tsId) {
             setTimesheets(prev => prev.map(ts => ts.id === data.tsId ? { ...ts, date: data.date, startTime: data.start, endTime: data.end, detectedScheduleId: data.scheduleId } : ts));
          } else {
             // New
             const newTs: Timesheet = {
                 id: `ts-${Date.now()}`, userId: currentUser!.id, date: data.date, startTime: data.start, endTime: data.end, status: ShiftStatus.COMPLETED, breaks: []
             };
             setTimesheets(prev => [...prev, newTs]);
          }
      } else {
          // Leave creation logic
          handleLeaveSubmit({
              typeId: data.leaveTypeId,
              typeName: leaveConfigs.find(lc => lc.id === data.leaveTypeId)?.name || 'Manual',
              startDate: data.date,
              endDate: data.date,
              reason: data.reason
          });
      }
      setEditModalData({isOpen: false, timesheet: null});
  };

  const handleApproveCorrection = (reqId: string) => { setCorrectionRequests(prev => prev.map(c => c.id === reqId ? {...c, status: 'APPROVED'} : c)); };
  
  const handleAssignSchedule = (userId: string, date: string, scheduleId: string) => { 
      const existing = schedulePlans.find(s => s.userId === userId && s.date === date);
      if (existing) {
          if (scheduleId === "") setSchedulePlans(prev => prev.filter(s => s.id !== existing.id));
          else setSchedulePlans(prev => prev.map(s => s.id === existing.id ? { ...s, scheduleId } : s));
      } else if (scheduleId !== "") {
          setSchedulePlans(prev => [...prev, { id: `ds-${Date.now()}`, userId, date, scheduleId }]);
      }
  };

  // --- BULK IMPORT HANDLER (For Generator) ---
  const handleBulkDataImport = (newTimesheets: Timesheet[], newLeaves: LeaveRequest[], newCorrections: CorrectionRequest[]) => {
      setTimesheets(prev => [...prev, ...newTimesheets]);
      setLeaves(prev => [...prev, ...newLeaves]);
      setCorrectionRequests(prev => [...prev, ...newCorrections]);
  };

  // --- CLOCK HANDLERS ---
  const handleClockIn = async (loc: Coordinates, off: Office | null, dist: number) => {
      if (!currentUser) return;
      const today = new Date().toISOString().split('T')[0];
      const detectedId = schedulePlans.find(s => s.userId === currentUser.id && s.date === today)?.scheduleId || currentUser.mainScheduleId;
      const schedName = workSchedules.find(s => s.id === detectedId)?.name;
      
      const newTs: Timesheet = {
          id: `ts-${Date.now()}`, userId: currentUser.id, startTime: new Date().toISOString(), date: today, status: ShiftStatus.WORKING, breaks: [],
          startLocation: loc, matchedOfficeId: off?.id, distanceToOffice: dist, detectedScheduleId: detectedId, detectedScheduleName: schedName, syncStatus: 'SYNCED'
      };
      setTimesheets(prev => [newTs, ...prev]);
  };

  const handleClockOut = async (loc: Coordinates) => {
      if (!currentUser || !currentShift) return;
      const { distance: endDist } = findNearestOffice(loc, offices);
      const updatedTs: Timesheet = { 
          ...currentShift, endTime: new Date().toISOString(), status: ShiftStatus.COMPLETED, endLocation: loc, endDistanceToOffice: endDist, syncStatus: 'SYNCED' 
      };
      setTimesheets(prev => prev.map(t => t.id === currentShift.id ? updatedTs : t));
  };

  const handleToggleBreak = async (config?: BreakConfig, loc?: Coordinates) => {
      if (!currentUser || !currentShift) return;
      if (currentShift.status === ShiftStatus.ON_BREAK) {
          const idx = currentShift.breaks.findIndex(b => !b.endTime);
          if (idx === -1) return;
          const updatedBreak = { ...currentShift.breaks[idx], endTime: new Date().toISOString(), endLocation: loc, status: BreakStatus.PENDING };
          const updatedBreaks = [...currentShift.breaks]; updatedBreaks[idx] = updatedBreak;
          setTimesheets(prev => prev.map(t => t.id === currentShift.id ? { ...t, status: ShiftStatus.WORKING, breaks: updatedBreaks } : t));
      } else {
          if (!config) return;
          const newBreak: Break = { 
              id: `br-${Date.now()}`, typeId: config.id, typeName: config.name, startTime: new Date().toISOString(), status: BreakStatus.PENDING, startLocation: loc 
          };
          setTimesheets(prev => prev.map(t => t.id === currentShift.id ? { ...t, status: ShiftStatus.ON_BREAK, breaks: [...t.breaks, newBreak] } : t));
      }
  };

  const handleApproveBreak = (tsId: string, brId: string, status: BreakStatus) => {
      setTimesheets(prev => prev.map(ts => ts.id !== tsId ? ts : { ...ts, breaks: ts.breaks.map(b => b.id === brId ? { ...b, status } : b) }));
  };

  const handleApproveLeave = (reqId: string) => {
      setLeaves(prev => prev.map(l => l.id === reqId ? { ...l, status: LeaveStatus.APPROVED } : l));
  };

  const handleLeaveSubmit = (req: Omit<LeaveRequest, 'id' | 'status' | 'userId'>) => {
      if (!currentUser) return;
      const newLeave: LeaveRequest = {
          id: `lr-${Date.now()}`, userId: currentUser.id, status: LeaveStatus.PENDING, createdAt: new Date().toISOString(), ...req
      };
      setLeaves(prev => [newLeave, ...prev]);
  };

  // --- RENDER ---
  if (!currentUser) return <LoginScreen users={users} companies={companies} onLogin={handleLogin} />;
  
  const hasRole = (r: Role) => currentUser.roles.includes(r);
  const canViewTeam = hasRole(Role.MANAGER) || hasRole(Role.HR) || hasRole(Role.ADMIN);
  const canManageUsers = hasRole(Role.ADMIN) || hasRole(Role.HR);
  const isAdmin = hasRole(Role.ADMIN);

  const myLeaves = leaves.filter(l => l.userId === currentUser.id).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  const myTimesheets = timesheets.filter(t => t.userId === currentUser.id);
  const activeLeaveRequest = leaves.find(l => l.userId === currentUser.id && l.startDate <= new Date().toISOString().split('T')[0] && l.endDate >= new Date().toISOString().split('T')[0] && l.status === LeaveStatus.APPROVED);
  
  const getTabClass = (tabName: string) => {
    return activeTab === tabName 
      ? "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 bg-blue-50 text-blue-700"
      : "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-600";
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-gray-800 font-sans">
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 bg-white border-r border-gray-200 z-30 transform transition-transform md:translate-x-0 w-64 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <Clock size={20} className="animate-pulse-slow" />
                </div>
                <span className="font-bold text-xl tracking-tight text-gray-900">PontajGroup</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500"><X size={20}/></button>
         </div>
         <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button onClick={() => setActiveTab('dashboard')} className={getTabClass('dashboard')}><Clock size={18}/> Pontaj</button>
            <button onClick={() => setActiveTab('calendar')} className={getTabClass('calendar')}><CalendarRange size={18}/> Program</button>
            <button onClick={() => setActiveTab('leaves')} className={getTabClass('leaves')}><Settings size={18}/> Concedii</button>
            {canViewTeam && <button onClick={() => setActiveTab('team')} className={getTabClass('team')}><Users size={18}/> Echipă</button>}
            {canManageUsers && <button onClick={() => setActiveTab('users')} className={getTabClass('users')}><UserCog size={18}/> Useri</button>}
            {isAdmin && <button onClick={() => setActiveTab('companies')} className={getTabClass('companies')}><Briefcase size={18}/> Companii</button>}
            {isAdmin && <button onClick={() => setActiveTab('offices')} className={getTabClass('offices')}><Building size={18}/> Structură</button>}
            {isAdmin && <button onClick={() => setActiveTab('nomenclator')} className={getTabClass('nomenclator')}><Database size={18}/> Nomenclator</button>}
            {isAdmin && <button onClick={() => setActiveTab('backend')} className={getTabClass('backend')}><Server size={18}/> Backend</button>}
         </nav>
         
         <div className="p-4 border-t border-gray-200 bg-gray-50/50">
            <div className="flex items-center gap-3 mb-3">
                <img src={currentUser.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border border-white shadow-sm" />
                <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{currentUser.name}</p>
                    <p className="text-xs text-gray-500 truncate capitalize">{currentUser.roles.map(r => r.toLowerCase()).join(', ')}</p>
                </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 py-2 rounded-lg transition">
                <LogOut size={16}/> Deconectare
            </button>
         </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto md:ml-64">
        <div className="md:hidden flex items-center justify-between mb-6">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
                <span className="font-bold text-xl">PontajApp</span>
             </div>
             <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white rounded shadow text-gray-600"><Menu/></button>
        </div>

        {activeTab === 'dashboard' && (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex mb-4">
                    <button onClick={() => setDashboardView('clock')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${dashboardView === 'clock' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <Clock size={18} /> <span className="hidden sm:inline">Pontaj</span>
                    </button>
                    <button onClick={() => setDashboardView('history')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${dashboardView === 'history' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <LayoutList size={18} /> Istoric
                    </button>
                </div>

                {dashboardView === 'clock' && (
                     <ClockWidget 
                        key={currentUser.id} 
                        user={currentUser} 
                        companyName={companies.find(c=>c.id===currentUser.companyId)?.name} 
                        offices={offices} 
                        breakConfigs={breakConfigs} 
                        holidays={holidays} 
                        activeLeaveRequest={activeLeaveRequest} 
                        shiftStartTime={currentShift?.startTime} 
                        accumulatedBreakTime={shiftStats.accumulatedPauseMs} 
                        activeBreakStartTime={shiftStats.activeBreakStart} 
                        currentStatus={currentShift?.status || ShiftStatus.NOT_STARTED} 
                        onClockIn={handleClockIn} 
                        onClockOut={handleClockOut} 
                        onToggleBreak={handleToggleBreak} 
                     />
                )}

                {dashboardView === 'history' && (
                     <div className="animate-in fade-in space-y-4">
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-800">Activitate Recentă</h2>
                            <button onClick={() => openTimesheetModal(null)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition">
                                <PlusCircle size={18}/> Solicită Corecție
                            </button>
                        </div>
                        <TimesheetList timesheets={myTimesheets} offices={offices} users={users} breakConfigs={breakConfigs} onEditTimesheet={openTimesheetModal} isManagerView={false} />
                    </div>
                )}
            </div>
        )}

        {activeTab === 'team' && canViewTeam && (
             <ManagerDashboard
                users={users}
                currentUser={currentUser}
                timesheets={timesheets}
                leaves={leaves}
                correctionRequests={correctionRequests}
                companies={companies}
                offices={offices}
                leaveConfigs={leaveConfigs}
                breakConfigs={breakConfigs}
                holidays={holidays}
                canViewAllCompanies={isAdmin}
                onApproveLeave={handleApproveLeave}
                onReject={initiateRejection}
                onApproveBreak={handleApproveBreak}
                onApproveCorrection={handleApproveCorrection}
                onOpenTimesheetModal={openTimesheetModal}
             />
        )}

        {activeTab === 'calendar' && 
            <div className="animate-in fade-in grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ScheduleCalendar 
                    currentUser={currentUser} users={users} schedules={schedulePlans} holidays={holidays} timesheets={timesheets} leaves={leaves} lockedDate={lockedDate} workSchedules={workSchedules} onAssignSchedule={handleAssignSchedule}
                />
                <LeaveCalendarReport users={users} leaves={leaves} leaveConfigs={leaveConfigs} holidays={holidays} />
            </div>
        }
        
        {activeTab === 'leaves' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Palmtree className="text-purple-600" /> Concediile Mele</h2>
                    <button onClick={() => setLeaveModalOpen(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition flex items-center gap-2"><PlusCircle size={18}/> Solicită</button>
                </div>
                <div className="grid gap-4">
                    {myLeaves.map(leave => {
                        const isApproved = leave.status === LeaveStatus.APPROVED;
                        const isCancelled = leave.status === LeaveStatus.CANCELLED;
                        // RESTORED: Rule for cancellation (only if not started/consumed)
                        const notConsumed = new Date(leave.startDate) >= new Date(new Date().setHours(0,0,0,0));
                        
                        return (
                            <div key={leave.id} className={`bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center ${isCancelled ? 'opacity-75' : ''}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${isApproved ? 'bg-green-100 text-green-600' : isCancelled ? 'bg-gray-200 text-gray-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                        {isApproved ? <CheckCircle size={24}/> : isCancelled ? <Slash size={24}/> : <Clock size={24}/>}
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-lg ${isCancelled ? 'line-through text-gray-500' : ''}`}>{leave.typeName}</h3>
                                        <div className="text-sm text-gray-500">{new Date(leave.startDate).toLocaleDateString('ro-RO')} - {new Date(leave.endDate).toLocaleDateString('ro-RO')}</div>
                                        {leave.cancellationReason && <p className="text-xs text-red-500 mt-1">Anulat: {leave.cancellationReason}</p>}
                                    </div>
                                </div>
                                {isApproved && notConsumed && (
                                    <button onClick={() => initiateRejection('LEAVE_CANCEL', leave.id)} className="text-xs text-red-500 hover:bg-red-50 px-3 py-1 rounded border border-red-200">Anulează</button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {activeTab === 'users' && <AdminUserManagement users={users} companies={companies} departments={departments} offices={offices} workSchedules={workSchedules} onValidateUser={(id) => setUsers(prev => prev.map(u => u.id === id ? { ...u, isValidated: true } : u))} onCreateUser={handleCreateUser} onUpdateUser={handleUpdateUser} onBulkImport={handleBulkDataImport} />}
        {activeTab === 'companies' && <CompanyManagement companies={companies} users={users} departments={departments} offices={offices} onAddCompany={(c) => setCompanies(p => [...p, c])} onUpdateCompany={(c) => setCompanies(p => p.map(x => x.id === c.id ? c : x))} onDeleteCompany={(id) => setCompanies(p => p.filter(x => x.id !== id))} />}
        {activeTab === 'offices' && <OfficeManagement users={users} offices={offices} departments={departments} companies={companies} onAddOffice={(o) => setOffices(p => [...p, o])} onUpdateOffice={(o) => setOffices(p => p.map(x => x.id === o.id ? o : x))} onDeleteOffice={(id) => setOffices(p => p.filter(x => x.id !== id))} onUpdateDepartments={setDepartments} onUpdateCompany={() => {}}/>}
        {activeTab === 'nomenclator' && <NomenclatorManagement breakConfigs={breakConfigs} leaveConfigs={leaveConfigs} workSchedules={workSchedules} holidays={holidays} currentLockedDate={lockedDate} onUpdateBreaks={setBreakConfigs} onUpdateLeaves={setLeaveConfigs} onUpdateSchedules={setWorkSchedules} onUpdateHolidays={setHolidays} onUpdateLockedDate={setLockedDate} />}
        {activeTab === 'backend' && <BackendControlPanel />}
      </main>

      <LeaveModal isOpen={isLeaveModalOpen} onClose={() => setLeaveModalOpen(false)} leaveConfigs={leaveConfigs} lockedDate={lockedDate} onSubmit={handleLeaveSubmit} />
      <TimesheetEditModal isOpen={editModalData.isOpen} onClose={() => setEditModalData({isOpen: false, timesheet: null})} timesheet={editModalData.timesheet} isManager={hasRole(Role.MANAGER) || hasRole(Role.ADMIN)} lockedDate={lockedDate} leaveConfigs={leaveConfigs} onSave={handleTimesheetSave} />
      <RejectionModal isOpen={rejectionModal.isOpen} onClose={() => setRejectionModal({ ...rejectionModal, isOpen: false })} onSubmit={handleConfirmRejection} title={rejectionModal.type === 'LEAVE_CANCEL' ? 'Motiv Anulare' : 'Motiv Respingere'} />
    </div>
  );
}
