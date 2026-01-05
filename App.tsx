
import React, { useState, useEffect, useMemo } from 'react';
import { 
  INITIAL_BREAK_CONFIGS, 
  INITIAL_LEAVE_CONFIGS, 
  INITIAL_WORK_SCHEDULES,
  HOLIDAYS_RO,
  getDefaultLockedDate,
  MOCK_USERS,
  MOCK_COMPANIES,
  MOCK_DEPARTMENTS,
  MOCK_OFFICES
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
import { Users, Settings, LogOut, CheckCircle, XCircle, Building, Clock, UserCog, Database, Server, CalendarRange, Bell, PlusCircle, Briefcase, LayoutList, Palmtree, Slash, Menu, X, Wifi, WifiOff, Mail, ShieldAlert, RefreshCw } from 'lucide-react';
import { findNearestOffice } from './services/geoService';
import { SQLService } from './services/sqlService';

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
  const [timesheets, setTimesheets] = usePersistedState<Timesheet[]>('pontaj_timesheets', []);
  const [leaves, setLeaves] = usePersistedState<LeaveRequest[]>('pontaj_leaves', []);
  const [correctionRequests, setCorrectionRequests] = usePersistedState<CorrectionRequest[]>('pontaj_corrections', []);
  const [schedulePlans, setSchedulePlans] = usePersistedState<DailySchedule[]>('pontaj_schedules', []);
  const [notifications, setNotifications] = usePersistedState<Notification[]>('pontaj_notifications', []);
  
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
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Edit Timesheet State
  const [editModalData, setEditModalData] = useState<{isOpen: boolean, timesheet: Timesheet | null}>({isOpen: false, timesheet: null});
  
  // Rejection/Cancellation Modal State
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    type: 'LEAVE' | 'CORRECTION' | 'BREAK' | 'LEAVE_CANCEL' | null; 
    itemId: string | null;
    parentId?: string;
  }>({ isOpen: false, type: null, itemId: null });

  // --- HELPER FOR REAL-TIME SYNC ---
  const syncItem = async (type: 'TIMESHEET' | 'LEAVE' | 'CORRECTION', item: any) => {
      if (!isOnline) return;
      try {
          if (type === 'TIMESHEET') await SQLService.upsertTimesheet(item);
          if (type === 'LEAVE') await SQLService.upsertLeave(item);
          if (type === 'CORRECTION') await SQLService.upsertCorrection(item);
          console.log(`[Real-Time] Synced ${type} ${item.id}`);
      } catch (e) {
          console.warn(`[Real-Time] Failed to sync ${type}`, e);
          // In a full app, we would queue this in a dedicated Retry Queue
      }
  };

  // --- SQL DATA SYNC FUNCTION ---
  const syncData = async () => {
      setIsSyncing(true);
      try {
          await SQLService.checkHealth();
          setIsOnline(true);
          console.log("SQL Bridge Connected. Fetching data...");

          const [
              dbUsers, dbCompanies, dbDepts, dbOffices, dbBreaks, dbLeaves, dbHolidays, dbTimesheets, dbLeaveReqs, dbCorrections
          ] = await Promise.all([
              SQLService.getUsers(),
              SQLService.getCompanies(),
              SQLService.getDepartments(),
              SQLService.getOffices(),
              SQLService.getBreaks(),
              SQLService.getLeaves(),
              SQLService.getHolidays(),
              SQLService.getTimesheets(),
              SQLService.getLeaveRequests(),
              SQLService.getCorrectionRequests()
          ]);

          if (dbUsers && dbUsers.length > 0) setUsers(dbUsers);
          if (dbCompanies && dbCompanies.length > 0) setCompanies(dbCompanies);
          if (dbDepts && dbDepts.length > 0) setDepartments(dbDepts);
          if (dbOffices && dbOffices.length > 0) setOffices(dbOffices);

          if (Array.isArray(dbBreaks) && dbBreaks.length > 0) setBreakConfigs(dbBreaks);
          if (Array.isArray(dbLeaves) && dbLeaves.length > 0) setLeaveConfigs(dbLeaves);
          if (Array.isArray(dbHolidays) && dbHolidays.length > 0) setHolidays(dbHolidays);
          
          if (Array.isArray(dbTimesheets) && dbTimesheets.length > 0) setTimesheets(dbTimesheets);
          if (Array.isArray(dbLeaveReqs) && dbLeaveReqs.length > 0) setLeaves(dbLeaveReqs);
          if (Array.isArray(dbCorrections) && dbCorrections.length > 0) setCorrectionRequests(dbCorrections);

      } catch (e) {
          console.warn("Working Offline: Could not connect to SQL Bridge.", e);
          setIsOnline(false);
      } finally {
          setIsSyncing(false);
      }
  };

  // Initial Sync
  useEffect(() => {
      syncData();
  }, []);

  // --- Auto-Reconnect Polling ---
  useEffect(() => {
    if (isOnline) return;
    const intervalId = setInterval(async () => {
        try {
            await SQLService.checkHealth();
            console.log("Auto-reconnect success!");
            setIsOnline(true);
            syncData();
        } catch (e) {}
    }, 5000);
    return () => clearInterval(intervalId);
  }, [isOnline]);

  // --- Derived State for Active Shift ---
  const currentShift = useMemo(() => {
      if (!currentUser) return null;
      const active = timesheets.find(t => 
          t.userId === currentUser.id && 
          (t.status === ShiftStatus.WORKING || t.status === ShiftStatus.ON_BREAK)
      );
      return active || null;
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

  const markAsRead = (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const initiateRejection = (type: 'LEAVE' | 'CORRECTION' | 'BREAK' | 'LEAVE_CANCEL', itemId: string, parentId?: string) => { 
      setRejectionModal({ isOpen: true, type, itemId, parentId }); 
  };
  
  const handleConfirmRejection = async (reason: string) => {
      let updatedItem: any = null;
      let syncType: 'LEAVE' | 'CORRECTION' | 'TIMESHEET' | null = null;

      if (rejectionModal.type === 'LEAVE_CANCEL' && rejectionModal.itemId) {
          setLeaves(prev => {
              const updated = prev.map(l => l.id === rejectionModal.itemId ? { ...l, status: LeaveStatus.CANCELLED, cancellationReason: reason } : l);
              updatedItem = updated.find(l => l.id === rejectionModal.itemId);
              return updated;
          });
          syncType = 'LEAVE';
      } else if (rejectionModal.type === 'LEAVE' && rejectionModal.itemId) {
          setLeaves(prev => {
              const updated = prev.map(l => l.id === rejectionModal.itemId ? { ...l, status: LeaveStatus.REJECTED, managerComment: reason } : l);
              updatedItem = updated.find(l => l.id === rejectionModal.itemId);
              return updated;
          });
          syncType = 'LEAVE';
      } else if (rejectionModal.type === 'CORRECTION' && rejectionModal.itemId) {
          setCorrectionRequests(prev => {
              const updated = prev.map(c => c.id === rejectionModal.itemId ? { ...c, status: 'REJECTED', managerNote: reason } : c);
              updatedItem = updated.find(c => c.id === rejectionModal.itemId);
              return updated as CorrectionRequest[];
          });
          syncType = 'CORRECTION';
      } else if (rejectionModal.type === 'BREAK' && rejectionModal.itemId && rejectionModal.parentId) {
          setTimesheets(prev => {
              const updated = prev.map(ts => ts.id !== rejectionModal.parentId ? ts : { 
                  ...ts, breaks: ts.breaks.map(b => b.id === rejectionModal.itemId ? { ...b, status: BreakStatus.REJECTED, managerNote: reason } : b) 
              });
              updatedItem = updated.find(ts => ts.id === rejectionModal.parentId);
              return updated;
          });
          syncType = 'TIMESHEET';
      }
      
      setRejectionModal({ isOpen: false, type: null, itemId: null });
      if (updatedItem && syncType) syncItem(syncType, updatedItem);
  };

  const handleCreateUser = (newUser: User) => { setUsers(prev => [...prev, { ...newUser, employmentStatus: 'ACTIVE' }]); };
  const handleUpdateUser = (updatedUser: User) => { setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u)); };
  const openTimesheetModal = (ts: Timesheet | null) => setEditModalData({ isOpen: true, timesheet: ts });
  
  const handleTimesheetDelete = (id: string) => {
      if(confirm("Sigur doriți să ștergeți acest pontaj? Acțiunea este ireversibilă.")) {
          setTimesheets(prev => prev.filter(t => t.id !== id));
          setEditModalData({isOpen: false, timesheet: null});
          // Note: Full delete sync not implemented in simple Upsert logic, would need delete endpoint
      }
  };

  const handleTimesheetSave = async (data: any) => { 
      let newItem: any = null;
      let syncType: 'TIMESHEET' | 'LEAVE' | null = null;

      if (data.type === 'WORK') {
          if(data.tsId) {
             setTimesheets(prev => {
                 const updated = prev.map(ts => ts.id === data.tsId ? { ...ts, date: data.date, startTime: data.start, endTime: data.end, detectedScheduleId: data.scheduleId } : ts);
                 newItem = updated.find(ts => ts.id === data.tsId);
                 return updated;
             });
          } else {
             const newTs: Timesheet = {
                 id: `ts-${Date.now()}`, userId: currentUser!.id, date: data.date, startTime: data.start, endTime: data.end, status: ShiftStatus.COMPLETED, breaks: []
             };
             setTimesheets(prev => [...prev, newTs]);
             newItem = newTs;
          }
          syncType = 'TIMESHEET';
      } else {
          // It's a Leave
          const newLeave: LeaveRequest = {
              id: `lr-${Date.now()}`, userId: currentUser!.id, 
              typeId: data.leaveTypeId,
              typeName: leaveConfigs.find(lc => lc.id === data.leaveTypeId)?.name || 'Manual',
              startDate: data.date,
              endDate: data.date,
              reason: data.reason,
              status: hasRole(Role.MANAGER) || hasRole(Role.ADMIN) ? LeaveStatus.APPROVED : LeaveStatus.PENDING,
              createdAt: new Date().toISOString()
          };
          setLeaves(prev => [newLeave, ...prev]);
          newItem = newLeave;
          syncType = 'LEAVE';

          if (data.tsId) {
              setTimesheets(prev => prev.filter(t => t.id !== data.tsId));
          }
      }
      setEditModalData({isOpen: false, timesheet: null});
      if(newItem && syncType) syncItem(syncType, newItem);
  };

  const handleApproveCorrection = (reqId: string) => { 
      let updatedItem: any = null;
      setCorrectionRequests(prev => {
          const updated = prev.map(c => c.id === reqId ? {...c, status: 'APPROVED'} : c);
          updatedItem = updated.find(c => c.id === reqId);
          return updated as CorrectionRequest[];
      });
      if(updatedItem) syncItem('CORRECTION', updatedItem);
  };
  
  const handleAssignSchedule = (userId: string, date: string, scheduleId: string) => { 
      const existing = schedulePlans.find(s => s.userId === userId && s.date === date);
      if (existing) {
          if (scheduleId === "") setSchedulePlans(prev => prev.filter(s => s.id !== existing.id));
          else setSchedulePlans(prev => prev.map(s => s.id === existing.id ? { ...s, scheduleId } : s));
      } else if (scheduleId !== "") {
          setSchedulePlans(prev => [...prev, { id: `ds-${Date.now()}`, userId, date, scheduleId }]);
      }
  };

  const handleBulkDataImport = (newTimesheets: Timesheet[], newLeaves: LeaveRequest[], newCorrections: CorrectionRequest[]) => {
      setTimesheets(prev => [...prev, ...newTimesheets]);
      setLeaves(prev => [...prev, ...newLeaves]);
      setCorrectionRequests(prev => [...prev, ...newCorrections]);
  };

  const handleClockIn = async (loc: Coordinates, off: Office | null, dist: number) => {
      if (!currentUser) return;
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const detectedId = schedulePlans.find(s => s.userId === currentUser.id && s.date === today)?.scheduleId || currentUser.mainScheduleId;
      const schedName = workSchedules.find(s => s.id === detectedId)?.name;
      
      const newTs: Timesheet = {
          id: `ts-${Date.now()}`, 
          userId: currentUser.id, 
          startTime: now.toISOString(), 
          date: today, 
          status: ShiftStatus.WORKING, 
          breaks: [],
          startLocation: loc, 
          matchedOfficeId: off?.id, 
          distanceToOffice: dist, 
          detectedScheduleId: detectedId, 
          detectedScheduleName: schedName, 
          syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
      };
      
      setTimesheets(prev => [newTs, ...prev]);
      syncItem('TIMESHEET', newTs);
  };

  const handleClockOut = async (loc: Coordinates) => {
      if (!currentUser || !currentShift) return;
      const { distance: endDist } = findNearestOffice(loc, offices);
      const updatedTs: Timesheet = { 
          ...currentShift, endTime: new Date().toISOString(), status: ShiftStatus.COMPLETED, endLocation: loc, endDistanceToOffice: endDist, syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC' 
      };
      setTimesheets(prev => prev.map(t => t.id === currentShift.id ? updatedTs : t));
      syncItem('TIMESHEET', updatedTs);
  };

  const handleToggleBreak = async (config?: BreakConfig, loc?: Coordinates) => {
      if (!currentUser || !currentShift) return;
      let updatedTs: Timesheet | null = null;

      if (currentShift.status === ShiftStatus.ON_BREAK) {
          const idx = currentShift.breaks.findIndex(b => !b.endTime);
          if (idx === -1) return;
          const updatedBreak = { ...currentShift.breaks[idx], endTime: new Date().toISOString(), endLocation: loc, status: BreakStatus.PENDING };
          const updatedBreaks = [...currentShift.breaks]; updatedBreaks[idx] = updatedBreak;
          updatedTs = { ...currentShift, status: ShiftStatus.WORKING, breaks: updatedBreaks };
      } else {
          if (!config) return;
          const newBreak: Break = { 
              id: `br-${Date.now()}`, typeId: config.id, typeName: config.name, startTime: new Date().toISOString(), status: BreakStatus.PENDING, startLocation: loc 
          };
          updatedTs = { ...currentShift, status: ShiftStatus.ON_BREAK, breaks: [...currentShift.breaks, newBreak] };
      }

      if (updatedTs) {
          setTimesheets(prev => prev.map(t => t.id === currentShift.id ? updatedTs! : t));
          syncItem('TIMESHEET', updatedTs);
      }
  };

  const handleApproveBreak = (tsId: string, brId: string, status: BreakStatus) => {
      let updatedTs: Timesheet | null = null;
      setTimesheets(prev => {
          const updated = prev.map(ts => ts.id !== tsId ? ts : { ...ts, breaks: ts.breaks.map(b => b.id === brId ? { ...b, status } : b) });
          updatedTs = updated.find(t => t.id === tsId) || null;
          return updated;
      });
      if(updatedTs) syncItem('TIMESHEET', updatedTs);
  };

  const handleApproveLeave = (reqId: string) => {
      let updatedLeave: any = null;
      setLeaves(prev => {
          const updated = prev.map(l => l.id === reqId ? { ...l, status: LeaveStatus.APPROVED } : l);
          updatedLeave = updated.find(l => l.id === reqId);
          return updated;
      });
      if(updatedLeave) syncItem('LEAVE', updatedLeave);
  };

  const handleLeaveSubmit = (req: Omit<LeaveRequest, 'id' | 'status' | 'userId'> & { status?: LeaveStatus }) => {
      if (!currentUser) return;
      const newLeave: LeaveRequest = {
          id: `lr-${Date.now()}`, userId: currentUser.id, status: req.status || LeaveStatus.PENDING, createdAt: new Date().toISOString(), ...req
      };
      setLeaves(prev => [newLeave, ...prev]);
      syncItem('LEAVE', newLeave);
  };

  if (!currentUser) return <LoginScreen users={users} companies={companies} onLogin={handleLogin} />;
  
  const hasRole = (r: Role) => currentUser.roles.includes(r);
  const canViewTeam = hasRole(Role.MANAGER) || hasRole(Role.HR) || hasRole(Role.ADMIN);
  const canManageUsers = hasRole(Role.ADMIN) || hasRole(Role.HR);
  const isAdmin = hasRole(Role.ADMIN);

  const myLeaves = leaves.filter(l => l.userId === currentUser.id).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  const myTimesheets = timesheets.filter(t => t.userId === currentUser.id);
  const activeLeaveRequest = leaves.find(l => l.userId === currentUser.id && l.startDate <= new Date().toISOString().split('T')[0] && l.endDate >= new Date().toISOString().split('T')[0] && l.status === LeaveStatus.APPROVED);
  const unreadCount = notifications.filter(n => n.userId === currentUser.id && !n.isRead).length;
  const myNotifications = notifications.filter(n => n.userId === currentUser.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getTabClass = (tabName: string) => {
    return activeTab === tabName 
      ? "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 bg-blue-50 text-blue-700"
      : "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-600";
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-gray-800 font-sans">
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
            <button onClick={() => setActiveTab('notifications')} className={getTabClass('notifications')}>
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3"><Bell size={18}/> Notificări</div>
                    {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>}
                </div>
            </button>
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
            <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                <span className="flex items-center gap-1">
                    {isOnline ? <Wifi size={10} className="text-green-500"/> : <WifiOff size={10} className="text-red-500"/>}
                    {isOnline ? 'Connected' : 'Offline Mode'}
                </span>
                <button onClick={syncData} disabled={isSyncing} className="hover:text-blue-500 transition" title="Reîncearcă conexiunea">
                    <RefreshCw size={12} className={isSyncing ? "animate-spin text-blue-500" : ""}/>
                </button>
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

        {activeTab === 'notifications' && (
            <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Bell className="text-blue-600"/> Notificări</h2>
                {myNotifications.length === 0 ? (
                    <div className="text-center text-gray-400 py-10 flex flex-col items-center">
                        <div className="bg-gray-100 p-4 rounded-full mb-3"><Bell size={32} className="text-gray-300"/></div>
                        <p>Nu aveți notificări recente.</p>
                    </div>
                ) : (
                    myNotifications.map(n => (
                        <div key={n.id} className={`p-4 rounded-xl border shadow-sm transition flex gap-3 ${n.isRead ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-100'}`}>
                            <div className={`mt-1 p-2 rounded-full ${n.type === 'ALERT' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                {n.type === 'ALERT' ? <ShieldAlert size={16}/> : <Mail size={16}/>}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className={`font-bold text-sm ${n.isRead ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</h4>
                                    <span className="text-[10px] text-gray-400">{new Date(n.date).toLocaleDateString()} {new Date(n.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                                {!n.isRead && (
                                    <button onClick={() => markAsRead(n.id)} className="text-xs text-blue-600 hover:underline mt-2 font-medium">Marchează citit</button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
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
      <TimesheetEditModal isOpen={editModalData.isOpen} onClose={() => setEditModalData({isOpen: false, timesheet: null})} timesheet={editModalData.timesheet} isManager={hasRole(Role.MANAGER) || hasRole(Role.ADMIN)} lockedDate={lockedDate} leaveConfigs={leaveConfigs} onSave={handleTimesheetSave} onDelete={handleTimesheetDelete} />
      <RejectionModal isOpen={rejectionModal.isOpen} onClose={() => setRejectionModal({ ...rejectionModal, isOpen: false })} onSubmit={handleConfirmRejection} title={rejectionModal.type === 'LEAVE_CANCEL' ? 'Motiv Anulare' : 'Motiv Respingere'} />
    </div>
  );
}
