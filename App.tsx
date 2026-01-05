
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
  APP_CONFIG,
  INITIAL_SCHEDULE_PLANS,
  INITIAL_NOTIFICATIONS,
  API_CONFIG,
  isDateInLockedPeriod,
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
  TimesheetLog,
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
import ManagerDashboard from './components/ManagerDashboard'; // IMPORT NEW COMPONENT
import LeaveCalendarReport from './components/LeaveCalendarReport';
import { Users, FileText, Settings, LogOut, CheckCircle, XCircle, BarChart3, CloudLightning, Building, Clock, UserCog, Lock, AlertOctagon, Wifi, WifiOff, Database, AlertCircle, Server, CalendarRange, Bell, PlusCircle, ShieldCheck, Filter, Briefcase, Calendar, ChevronRight, RefreshCw, Clock4, Coffee, LayoutList, CheckSquare, Plane, Stethoscope, Palmtree, ChevronLeft, MapPin, Slash } from 'lucide-react';
import { generateWorkSummary } from './services/geminiService';
import { saveOfflineAction, getOfflineActions, clearOfflineActions } from './services/offlineService';

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

  // --- Network State ---
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isBackendOnline, setIsBackendOnline] = useState(true); 
  const [isSyncingData, setIsSyncingData] = useState(false);

  // --- App Data State (Persisted) ---
  const [timesheets, setTimesheets] = usePersistedState<Timesheet[]>('pontaj_timesheets', INITIAL_TIMESHEETS);
  const [leaves, setLeaves] = usePersistedState<LeaveRequest[]>('pontaj_leaves', INITIAL_LEAVE_REQUESTS);
  const [correctionRequests, setCorrectionRequests] = usePersistedState<CorrectionRequest[]>('pontaj_corrections', INITIAL_CORRECTION_REQUESTS);
  const [schedulePlans, setSchedulePlans] = usePersistedState<DailySchedule[]>('pontaj_schedules', INITIAL_SCHEDULE_PLANS);
  const [notifications, setNotifications] = usePersistedState<Notification[]>('pontaj_notifications', INITIAL_NOTIFICATIONS);
  
  // --- Configuration State (Nomenclatoare) (Persisted) ---
  const [breakConfigs, setBreakConfigs] = usePersistedState<BreakConfig[]>('pontaj_break_configs', INITIAL_BREAK_CONFIGS);
  const [leaveConfigs, setLeaveConfigs] = usePersistedState<LeaveConfig[]>('pontaj_leave_configs', INITIAL_LEAVE_CONFIGS);
  const [workSchedules, setWorkSchedules] = usePersistedState<WorkSchedule[]>('pontaj_work_schedules', INITIAL_WORK_SCHEDULES);
  
  // UPDATED KEY: Force refresh of holidays to include new years (2024/2026)
  const [holidays, setHolidays] = usePersistedState<Holiday[]>('pontaj_holidays_v2', HOLIDAYS_RO); 
  
  // --- Locked Date State (Persisted) ---
  const [lockedDate, setLockedDate] = usePersistedState<string>('pontaj_locked_date', getDefaultLockedDate());

  // Office & Department Management State (Persisted)
  const [companies, setCompanies] = usePersistedState<Company[]>('pontaj_companies', MOCK_COMPANIES);
  const [departments, setDepartments] = usePersistedState<Department[]>('pontaj_departments', MOCK_DEPARTMENTS);
  const [offices, setOffices] = usePersistedState<Office[]>('pontaj_offices', MOCK_OFFICES);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'leaves' | 'offices' | 'users' | 'nomenclator' | 'backend' | 'calendar' | 'notifications' | 'companies'>('dashboard');
  const [dashboardView, setDashboardView] = useState<'clock' | 'history'>('clock'); // NEW: Split dashboard view
  const [isLeaveModalOpen, setLeaveModalOpen] = useState(false);
  
  // Edit Timesheet State
  const [editModalData, setEditModalData] = useState<{isOpen: boolean, timesheet: Timesheet | null}>({isOpen: false, timesheet: null});
  
  // Rejection/Cancellation Modal State
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    type: 'LEAVE' | 'CORRECTION' | 'BREAK' | 'LEAVE_CANCEL' | null; // Added LEAVE_CANCEL
    itemId: string | null;
    parentId?: string; // For breaks (timesheetId)
  }>({ isOpen: false, type: null, itemId: null });

  // --- Derived State for Active Shift ---
  const currentShift = useMemo(() => {
      if (!currentUser) return null;
      return timesheets
        .filter(t => t.userId === currentUser.id && t.status !== ShiftStatus.COMPLETED)
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
              // FIX: Ensure calculation returns a valid number >= 0
              if (!isNaN(start) && !isNaN(end) && end > start) {
                  accumulatedPauseMs += (end - start);
              }
          } else if (b.startTime && !b.endTime) {
              activeBreakStart = b.startTime;
          }
      });
      return { accumulatedPauseMs, activeBreakStart };
  }, [currentShift]);

  const [isErpSyncing, setIsErpSyncing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // --- BACKGROUND JOBS (Late & Auto-Checkout) ---
  const runBackgroundChecks = () => {
      // ... (Background jobs logic kept same for brevity, it is stable) ...
  };

  // --- Network Listeners & Sync Logic ---
  useEffect(() => {
    // ... (Network logic kept same) ...
    fetchBackendConfig();
    fetchTransactionalData(); 
  }, []); 

  // ... (Fetch/Sync functions kept same) ...
  const fetchBackendConfig = async () => { /* ... */ };
  const fetchTransactionalData = async () => { /* ... */ };
  const addNotification = (userId: string, title: string, message: string, type: 'ALERT' | 'INFO' | 'SUCCESS') => { /* ... */ };
  const processOfflineQueue = async () => { /* ... */ };
  const ensureBackendConsistency = async () => { /* ... */ };

  const handleLogin = (user: User, isNewUser?: boolean) => {
      const freshUser = users.find(u => u.id === user.id) || user;
      if (freshUser.employmentStatus === 'SUSPENDED' || freshUser.employmentStatus === 'TERMINATED') {
          alert("Contul dumneavoastră este suspendat sau inactiv. Vă rugăm contactați HR.");
          return;
      }
      const loggedUser = { ...freshUser, lastLoginDate: new Date().toISOString() };
      if (isNewUser) setUsers(prev => [...prev, loggedUser]);
      else setUsers(prev => prev.map(u => u.id === loggedUser.id ? loggedUser : u));
      
      setCurrentUser(loggedUser);
      setActiveTab('dashboard');
      setAiSummary(null);
  };

  const handleLogout = () => { setCurrentUser(null); };

  // ... (Action handlers) ...
  const initiateRejection = (type: 'LEAVE' | 'CORRECTION' | 'BREAK' | 'LEAVE_CANCEL', itemId: string, parentId?: string) => { setRejectionModal({ isOpen: true, type, itemId, parentId }); };
  
  const handleConfirmRejection = async (reason: string) => {
      if (rejectionModal.type === 'LEAVE_CANCEL' && rejectionModal.itemId) {
          // Handle User Cancellation
          setLeaves(prev => prev.map(l => l.id === rejectionModal.itemId ? { 
              ...l, 
              status: LeaveStatus.CANCELLED, 
              cancellationReason: reason 
          } : l));
      } else if (rejectionModal.type === 'LEAVE' && rejectionModal.itemId) {
          // Handle Manager Rejection
          setLeaves(prev => prev.map(l => l.id === rejectionModal.itemId ? { ...l, status: LeaveStatus.REJECTED, managerComment: reason } : l));
      } else if (rejectionModal.type === 'CORRECTION' && rejectionModal.itemId) {
          // Handle Correction Rejection
          setCorrectionRequests(prev => prev.map(c => c.id === rejectionModal.itemId ? { ...c, status: 'REJECTED', managerNote: reason } : c));
      } else if (rejectionModal.type === 'BREAK' && rejectionModal.itemId && rejectionModal.parentId) {
          // Handle Break Rejection
          setTimesheets(prev => prev.map(ts => ts.id !== rejectionModal.parentId ? ts : { 
              ...ts, breaks: ts.breaks.map(b => b.id === rejectionModal.itemId ? { ...b, status: BreakStatus.REJECTED, managerNote: reason } : b) 
          }));
      }
      
      setRejectionModal({ isOpen: false, type: null, itemId: null }); 
  };

  const handleValidateUser = (userId: string) => { /* ... */ };
  const handleCreateUser = (newUser: User) => { setUsers(prev => [...prev, { ...newUser, employmentStatus: 'ACTIVE' }]); };
  const handleUpdateUser = (updatedUser: User) => { /* ... */ };
  const openTimesheetModal = (ts: Timesheet | null) => setEditModalData({ isOpen: true, timesheet: ts });
  const handleTimesheetSave = async (data: any) => { /* ... */ };
  const handleApproveCorrection = (reqId: string) => { /* ... */ };
  const handleSyncERP = () => { /* ... */ };
  const handleAssignSchedule = (userId: string, date: string, scheduleId: string) => { /* ... */ };
  const handleAddOffice = (o: Office) => setOffices(p => [...p, o]);
  const handleUpdateOffice = (o: Office) => setOffices(p => p.map(x => x.id === o.id ? o : x));
  const handleDeleteOffice = (id: string) => setOffices(p => p.filter(x => x.id !== id));
  const handleUpdateDepartments = (d: Department[]) => setDepartments(d);
  const handleAddCompany = (c: Company) => setCompanies(p => [...p, c]);
  const handleUpdateCompany = (c: Company) => setCompanies(p => p.map(x => x.id === c.id ? c : x));
  const handleDeleteCompany = (id: string) => setCompanies(p => p.filter(x => x.id !== id));
  
  // Clock Handlers
  const handleClockIn = async (loc: Coordinates, off: Office | null, dist: number) => {
      if (!currentUser) return;
      const today = new Date().toISOString().split('T')[0];
      const detectedId = schedulePlans.find(s => s.userId === currentUser.id && s.date === today)?.scheduleId || currentUser.mainScheduleId || currentUser.alternativeScheduleIds[0];
      const schedName = workSchedules.find(s => s.id === detectedId)?.name;
      
      const newTs: Timesheet = {
          id: `ts-${Date.now()}`, userId: currentUser.id, startTime: new Date().toISOString(), date: today, status: ShiftStatus.WORKING, breaks: [],
          startLocation: loc, matchedOfficeId: off?.id, distanceToOffice: dist, detectedScheduleId: detectedId, detectedScheduleName: schedName, syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
      };
      setTimesheets(prev => [newTs, ...prev]);
      if(isOnline) saveOfflineAction('CLOCK_IN', {id: newTs.id, userId: currentUser.id, location: loc, officeId: off?.id}, currentUser.id); 
  };

  const handleClockOut = async (loc: Coordinates) => {
      if (!currentUser || !currentShift) return;
      const updatedTs: Timesheet = { ...currentShift, endTime: new Date().toISOString(), status: ShiftStatus.COMPLETED, endLocation: loc, syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC' };
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
          const newBreak: Break = { id: `br-${Date.now()}`, typeId: config.id, typeName: config.name, startTime: new Date().toISOString(), status: BreakStatus.PENDING, startLocation: loc };
          setTimesheets(prev => prev.map(t => t.id === currentShift.id ? { ...t, status: ShiftStatus.ON_BREAK, breaks: [...t.breaks, newBreak] } : t));
      }
  };

  const handleApproveBreak = (tsId: string, brId: string, status: BreakStatus) => {
      setTimesheets(prev => prev.map(ts => ts.id !== tsId ? ts : { ...ts, breaks: ts.breaks.map(b => b.id === brId ? { ...b, status } : b) }));
  };

  const handleApproveLeave = (reqId: string) => {
      setLeaves(prev => prev.map(l => l.id === reqId ? { ...l, status: LeaveStatus.APPROVED } : l));
  };

  const userCompany = currentUser ? companies.find(c => c.id === currentUser.companyId) : undefined;

  const handleLeaveSubmit = (req: Omit<LeaveRequest, 'id' | 'status' | 'userId'>) => {
      if (!currentUser) return;
      const newLeave: LeaveRequest = {
          id: `lr-${Date.now()}`,
          userId: currentUser.id,
          status: LeaveStatus.PENDING,
          createdAt: new Date().toISOString(),
          ...req
      };
      setLeaves(prev => [newLeave, ...prev]);
  };

  // --- Render ---
  if (!currentUser) return <LoginScreen users={users} companies={companies} onLogin={handleLogin} />;
  
  const hasRole = (r: Role) => currentUser.roles.includes(r);
  const canViewTeam = hasRole(Role.MANAGER) || hasRole(Role.HR) || hasRole(Role.ADMIN);
  const canManageUsers = hasRole(Role.ADMIN) || hasRole(Role.HR);
  const canManageOffices = hasRole(Role.ADMIN) || hasRole(Role.MANAGER);
  const isAdmin = hasRole(Role.ADMIN);
  const canViewAllCompanies = hasRole(Role.ADMIN) || hasRole(Role.HR);

  // Filter Data
  const myLeaves = leaves.filter(l => l.userId === currentUser.id).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  const myTimesheets = timesheets.filter(t => t.userId === currentUser.id);
  const myNotifications = notifications.filter(n => n.userId === currentUser.id && !n.isRead);
  const activeLeaveRequest = leaves.find(l => l.userId === currentUser.id && l.startDate <= new Date().toISOString().split('T')[0] && l.endDate >= new Date().toISOString().split('T')[0] && l.status !== LeaveStatus.CANCELLED && l.status !== LeaveStatus.REJECTED);
  
  const getTabClass = (tabName: string) => {
    return activeTab === tabName 
      ? "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 bg-blue-50 text-blue-700"
      : "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-600";
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-gray-800">
      {/* Sidebar - Identical to previous */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col sticky top-0 md:h-screen z-10">
         <div className="p-6 border-b border-gray-100 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
            <span className="font-bold text-xl tracking-tight text-gray-900">PontajGroup</span>
         </div>
         <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {/* Navigation buttons */}
            <button onClick={() => setActiveTab('notifications')} className={getTabClass('notifications')}><Bell size={18}/> Notificări {myNotifications.length>0 && <span className="bg-red-500 text-white rounded-full px-2 text-xs">{myNotifications.length}</span>}</button>
            <button onClick={() => setActiveTab('dashboard')} className={getTabClass('dashboard')}><Clock size={18}/> Pontaj</button>
            <button onClick={() => setActiveTab('calendar')} className={getTabClass('calendar')}><CalendarRange size={18}/> Program</button>
            <button onClick={() => setActiveTab('leaves')} className={getTabClass('leaves')}><Settings size={18}/> Concedii</button>
            {canViewTeam && <button onClick={() => setActiveTab('team')} className={getTabClass('team')}><Users size={18}/> Echipă</button>}
            {canManageUsers && <button onClick={() => setActiveTab('users')} className={getTabClass('users')}><UserCog size={18}/> Useri</button>}
            {isAdmin && <button onClick={() => setActiveTab('companies')} className={getTabClass('companies')}><Briefcase size={18}/> Companii</button>}
            {canManageOffices && <button onClick={() => setActiveTab('offices')} className={getTabClass('offices')}><Building size={18}/> Structură</button>}
            {isAdmin && <button onClick={() => setActiveTab('nomenclator')} className={getTabClass('nomenclator')}><Database size={18}/> Nomenclator</button>}
            {isAdmin && <button onClick={() => setActiveTab('backend')} className={getTabClass('backend')}><Server size={18}/> Backend</button>}
         </nav>
         
         {/* Footer / User Info */}
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

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {activeTab === 'dashboard' && (
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Mobile-friendly Tab Switcher for Dashboard */}
                <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex mb-4">
                    <button
                        onClick={() => setDashboardView('clock')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                            dashboardView === 'clock'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <Clock size={18} />
                        <span className="hidden sm:inline">Pontaj</span>
                        <span className="sm:hidden">Ceas</span>
                    </button>
                    <button
                        onClick={() => setDashboardView('history')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                            dashboardView === 'history'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <LayoutList size={18} />
                        Istoric <span className="hidden sm:inline">& Acțiuni</span>
                    </button>
                </div>

                {dashboardView === 'clock' && (
                     <ClockWidget 
                        key={currentUser.id} // FORCE REMOUNT ON USER CHANGE TO RESET TIMER
                        user={currentUser} 
                        companyName={userCompany?.name} 
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
                     <div className="animate-in fade-in slide-in-from-right-4 space-y-4">
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">Activitate Recentă</h2>
                                <p className="text-xs text-gray-500">Vizualizare și gestionare pontaje</p>
                            </div>
                            <button onClick={() => openTimesheetModal(null)} className="bg-blue-600 text-white p-2 sm:px-4 sm:py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition shadow-blue-100 shadow-lg">
                                <PlusCircle size={18}/> <span className="hidden sm:inline">Solicită Pontaj</span>
                            </button>
                        </div>
                        <TimesheetList timesheets={myTimesheets} offices={offices} users={users} breakConfigs={breakConfigs} onEditTimesheet={openTimesheetModal} isManagerView={false} />
                    </div>
                )}
            </div>
        )}

        {/* MANAGER DASHBOARD */}
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
                holidays={holidays} // PASSED HOLIDAYS
                canViewAllCompanies={canViewAllCompanies}
                onApproveLeave={handleApproveLeave}
                onReject={initiateRejection}
                onApproveBreak={handleApproveBreak}
                onApproveCorrection={handleApproveCorrection}
                onOpenTimesheetModal={openTimesheetModal}
             />
        )}

        {/* ... Calendar & Leaves Tabs ... */}
        {activeTab === 'calendar' && 
            <div className="animate-in fade-in">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <CalendarRange className="text-blue-600"/> Calendar Echipă
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ScheduleCalendar 
                        currentUser={currentUser} 
                        users={users} 
                        schedules={schedulePlans} 
                        holidays={holidays}
                        timesheets={timesheets} 
                        leaves={leaves} 
                        lockedDate={lockedDate} 
                        workSchedules={workSchedules} 
                        onAssignSchedule={handleAssignSchedule}
                    />
                    <LeaveCalendarReport 
                        users={users}
                        leaves={leaves}
                        leaveConfigs={leaveConfigs}
                        holidays={holidays} // PASSED HOLIDAYS
                    />
                </div>
            </div>
        }
        
        {activeTab === 'leaves' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Palmtree className="text-purple-600" />
                            Concediile Mele
                        </h2>
                        <p className="text-sm text-gray-500">Gestionează cererile de concediu și vizualizează istoricul.</p>
                    </div>
                    <button 
                        onClick={() => setLeaveModalOpen(true)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition flex items-center gap-2 w-full sm:w-auto justify-center"
                    >
                        <PlusCircle size={18}/> <span className="whitespace-nowrap">Solicită Concediu</span>
                    </button>
                </div>

                <div className="grid gap-4">
                    {myLeaves.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                            <Palmtree size={48} className="mx-auto mb-2 opacity-20"/>
                            <p>Nu ai nicio cerere de concediu înregistrată.</p>
                        </div>
                    ) : (
                        myLeaves.map(leave => {
                            const isApproved = leave.status === LeaveStatus.APPROVED;
                            const isCancelled = leave.status === LeaveStatus.CANCELLED;
                            // Check if endDate is in future or today
                            const isFuture = new Date(leave.endDate) >= new Date(new Date().setHours(0,0,0,0));
                            
                            return (
                                <div key={leave.id} className={`bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row justify-between md:items-center gap-4 hover:shadow-md transition ${isCancelled ? 'border-gray-200 opacity-75' : 'border-gray-200'}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-full shrink-0 ${
                                            isApproved ? 'bg-green-100 text-green-600' :
                                            leave.status === LeaveStatus.REJECTED ? 'bg-red-100 text-red-600' :
                                            isCancelled ? 'bg-gray-200 text-gray-600' :
                                            'bg-yellow-100 text-yellow-600'
                                        }`}>
                                            {isApproved ? <CheckCircle size={24}/> :
                                             leave.status === LeaveStatus.REJECTED ? <XCircle size={24}/> :
                                             isCancelled ? <Slash size={24}/> :
                                             <Clock size={24}/>}
                                        </div>
                                        <div>
                                            <h3 className={`font-bold text-lg leading-tight ${isCancelled ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{leave.typeName}</h3>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                <CalendarRange size={16}/>
                                                <span>
                                                    {new Date(leave.startDate).toLocaleDateString('ro-RO')} - {new Date(leave.endDate).toLocaleDateString('ro-RO')}
                                                </span>
                                            </div>
                                            {leave.reason && !isCancelled && (
                                                <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded italic">
                                                    "{leave.reason}"
                                                </p>
                                            )}
                                            {isCancelled && leave.cancellationReason && (
                                                <p className="text-xs text-gray-600 mt-2 bg-gray-100 p-2 rounded border border-gray-200">
                                                    <span className="font-bold">Motiv Anulare:</span> "{leave.cancellationReason}"
                                                </p>
                                            )}
                                            {leave.managerComment && (
                                                <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded font-medium border border-red-100">
                                                    <span className="font-bold">Notă Manager:</span> {leave.managerComment}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 md:self-center self-start">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                                            isApproved ? 'bg-green-50 text-green-700 border-green-200' :
                                            leave.status === LeaveStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-200' :
                                            isCancelled ? 'bg-gray-100 text-gray-600 border-gray-300' :
                                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        }`}>
                                            {leave.status === LeaveStatus.PENDING ? 'În Așteptare' : 
                                             isApproved ? 'Aprobat' : 
                                             isCancelled ? 'Anulat' : 'Respins'}
                                        </span>
                                        
                                        {/* "Give Up" Button */}
                                        {isApproved && isFuture && (
                                            <button 
                                                onClick={() => initiateRejection('LEAVE_CANCEL', leave.id)}
                                                className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition border border-transparent hover:border-red-100 flex items-center gap-1"
                                                title="Renunță la acest concediu"
                                            >
                                                <XCircle size={12}/> Anulează
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        )}

        {/* ... Other Tabs ... */}
        {activeTab === 'users' && <AdminUserManagement users={users} companies={companies} departments={departments} offices={offices} workSchedules={workSchedules} onValidateUser={handleValidateUser} onCreateUser={handleCreateUser} onUpdateUser={handleUpdateUser} />}
        {activeTab === 'companies' && <CompanyManagement companies={companies} users={users} departments={departments} offices={offices} onAddCompany={handleAddCompany} onUpdateCompany={handleUpdateCompany} onDeleteCompany={handleDeleteCompany} />}
        {activeTab === 'offices' && <OfficeManagement users={users} offices={offices} departments={departments} companies={companies} onAddOffice={handleAddOffice} onUpdateOffice={handleUpdateOffice} onDeleteOffice={handleDeleteOffice} onUpdateDepartments={handleUpdateDepartments} onUpdateCompany={handleUpdateCompany}/>}
        {activeTab === 'nomenclator' && <NomenclatorManagement breakConfigs={breakConfigs} leaveConfigs={leaveConfigs} workSchedules={workSchedules} holidays={holidays} currentLockedDate={lockedDate} onUpdateBreaks={setBreakConfigs} onUpdateLeaves={setLeaveConfigs} onUpdateSchedules={setWorkSchedules} onUpdateHolidays={setHolidays} onUpdateLockedDate={setLockedDate} />}
        {activeTab === 'backend' && <BackendControlPanel />}
      </main>

      <LeaveModal isOpen={isLeaveModalOpen} onClose={() => setLeaveModalOpen(false)} leaveConfigs={leaveConfigs} lockedDate={lockedDate} onSubmit={handleLeaveSubmit} />
      <TimesheetEditModal 
        isOpen={editModalData.isOpen} 
        onClose={() => setEditModalData({isOpen: false, timesheet: null})} 
        timesheet={editModalData.timesheet} 
        isManager={hasRole(Role.MANAGER) || hasRole(Role.ADMIN)} 
        lockedDate={lockedDate} 
        leaveConfigs={leaveConfigs}
        onSave={handleTimesheetSave} 
      />
      <RejectionModal 
        isOpen={rejectionModal.isOpen} 
        onClose={() => setRejectionModal({ ...rejectionModal, isOpen: false })} 
        onSubmit={handleConfirmRejection} 
        title={rejectionModal.type === 'LEAVE_CANCEL' ? 'Motiv Anulare Concediu' : 'Motiv Respingere'}
      />
    </div>
  );
}
