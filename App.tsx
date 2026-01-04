import React, { useState, useEffect, useMemo } from 'react';
import { 
  MOCK_USERS, 
  INITIAL_TIMESHEETS, 
  INITIAL_LEAVE_REQUESTS, 
  INITIAL_CORRECTION_REQUESTS,
  INITIAL_BREAK_CONFIGS, 
  INITIAL_LEAVE_CONFIGS,
  MOCK_SCHEDULES,
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
import { Users, FileText, Settings, LogOut, CheckCircle, XCircle, BarChart3, CloudLightning, Building, Clock, UserCog, Lock, AlertOctagon, Wifi, WifiOff, Database, AlertCircle, Server, CalendarRange, Bell, PlusCircle, ShieldCheck, Filter, Briefcase, Calendar, ChevronRight, RefreshCw, Clock4 } from 'lucide-react';
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
  const [holidays, setHolidays] = usePersistedState<Holiday[]>('pontaj_holidays_2025', HOLIDAYS_RO); 
  
  // --- Locked Date State (Persisted) ---
  const [lockedDate, setLockedDate] = usePersistedState<string>('pontaj_locked_date', getDefaultLockedDate());

  // Office & Department Management State (Persisted)
  const [companies, setCompanies] = usePersistedState<Company[]>('pontaj_companies', MOCK_COMPANIES);
  const [departments, setDepartments] = usePersistedState<Department[]>('pontaj_departments', MOCK_DEPARTMENTS);
  const [offices, setOffices] = usePersistedState<Office[]>('pontaj_offices', MOCK_OFFICES);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'leaves' | 'offices' | 'users' | 'nomenclator' | 'backend' | 'calendar' | 'notifications' | 'companies'>('dashboard');
  const [isLeaveModalOpen, setLeaveModalOpen] = useState(false);
  
  // Team View Filter State
  const [selectedTeamCompany, setSelectedTeamCompany] = useState<string>('ALL');
  
  // Edit Timesheet State
  const [editModalData, setEditModalData] = useState<{isOpen: boolean, timesheet: Timesheet | null}>({isOpen: false, timesheet: null});
  
  // Rejection Modal State
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    type: 'LEAVE' | 'CORRECTION' | 'BREAK' | null;
    itemId: string | null;
    parentId?: string; // For breaks (timesheetId)
  }>({ isOpen: false, type: null, itemId: null });

  // --- Derived State for Active Shift (Replaces useState/useEffect to prevent race conditions) ---
  const currentShift = useMemo(() => {
      if (!currentUser) return null;
      // Sort by start time desc to ensure we get the latest if multiple exist (unlikely but safe)
      // Filter for WORKING or ON_BREAK
      return timesheets
        .filter(t => t.userId === currentUser.id && t.status !== ShiftStatus.COMPLETED)
        .sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0] || null;
  }, [currentUser, timesheets]);

  // --- Derived Shift Statistics (Accumulated Breaks, Active Break Start) ---
  const shiftStats = useMemo(() => {
      if (!currentShift) return { accumulatedPauseMs: 0, activeBreakStart: undefined };
      
      let accumulatedPauseMs = 0;
      let activeBreakStart: string | undefined = undefined;

      currentShift.breaks.forEach(b => {
          if (b.endTime) {
              const start = new Date(b.startTime).getTime();
              const end = new Date(b.endTime).getTime();
              accumulatedPauseMs += (end - start);
          } else {
              // Active break
              activeBreakStart = b.startTime;
          }
      });

      return { accumulatedPauseMs, activeBreakStart };
  }, [currentShift]);

  // Sync to ERP Mock State
  const [isErpSyncing, setIsErpSyncing] = useState(false);

  // Summary State (Now hardcoded, no AI)
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // --- Network Listeners & Sync Logic ---
  useEffect(() => {
    const handleOnline = () => {
        setIsOnline(true);
        processOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial SQL Sync Attempt
    fetchBackendConfig();
    fetchTransactionalData(); // Fetch leaves/timesheets from SQL

    const backendCheckInterval = setInterval(() => {
        setIsBackendOnline(navigator.onLine); 
    }, 5000);

    // Run Background Jobs
    runBackgroundChecks();
    runEmploymentStatusSync();

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(backendCheckInterval);
    };
  }, []); 

  const fetchBackendConfig = async () => {
      try {
          // Attempt to load latest config from Bridge
          const [cRes, dRes, oRes, uRes, hRes] = await Promise.allSettled([
              fetch(`${API_CONFIG.BASE_URL}/config/companies`),
              fetch(`${API_CONFIG.BASE_URL}/config/departments`),
              fetch(`${API_CONFIG.BASE_URL}/config/offices`),
              fetch(`${API_CONFIG.BASE_URL}/config/users`),
              fetch(`${API_CONFIG.BASE_URL}/config/holidays`)
          ]);

          // Only update if fetch successful, otherwise keep localStorage/Mock
          if (cRes.status === 'fulfilled' && cRes.value.ok) {
             const data = await cRes.value.json();
             if (Array.isArray(data) && data.length > 0) setCompanies(data);
          }
          if (dRes.status === 'fulfilled' && dRes.value.ok) {
             const data = await dRes.value.json();
             if (Array.isArray(data) && data.length > 0) setDepartments(data);
          }
          if (oRes.status === 'fulfilled' && oRes.value.ok) {
             const data = await oRes.value.json();
             if (Array.isArray(data) && data.length > 0) setOffices(data);
          }
           if (uRes.status === 'fulfilled' && uRes.value.ok) {
             const data = await uRes.value.json();
             if (Array.isArray(data) && data.length > 0) setUsers(data);
          }
          if (hRes.status === 'fulfilled' && hRes.value.ok) {
             const data = await hRes.value.json();
             if (Array.isArray(data) && data.length > 0) setHolidays(data);
          }

      } catch (err) {
          console.log("Backend offline or unreachable, using local data.");
      }
  };
  
  const fetchTransactionalData = async () => {
      try {
          // Fetch Leaves
          const lRes = await fetch(`${API_CONFIG.BASE_URL}/leaves`);
          if (lRes.ok) {
              const dbLeaves = await lRes.json();
              if (Array.isArray(dbLeaves) && dbLeaves.length > 0) {
                  setLeaves(dbLeaves);
              }
          }
          
          // Fetch Timesheets
          const tRes = await fetch(`${API_CONFIG.BASE_URL}/timesheets`);
          if (tRes.ok) {
              const dbTimesheets = await tRes.json();
              if (Array.isArray(dbTimesheets) && dbTimesheets.length > 0) {
                  setTimesheets(dbTimesheets);
              }
          }
      } catch (err) {
          console.log("Failed to fetch transactional data from SQL.");
      }
  };

  // --- BACKGROUND LOGIC (Simulates Backend Jobs) ---
  const runBackgroundChecks = () => {
     // ... logic remains same
  };

  const runEmploymentStatusSync = () => {
     // ... logic remains same
  };

  const addNotification = (userId: string, title: string, message: string, type: 'ALERT' | 'INFO' | 'SUCCESS') => {
      const newNotif: Notification = {
          id: `n-${Date.now()}-${Math.random()}`,
          userId,
          title,
          message,
          type,
          isRead: false,
          date: new Date().toISOString()
      };
      setNotifications(prev => [newNotif, ...prev]);

      // Simulate Email
      const targetUser = users.find(u => u.id === userId);
      if (targetUser && targetUser.departmentId) {
          const dept = departments.find(d => d.id === targetUser.departmentId);
          if (dept && dept.emailNotifications) {
              console.log(`%c[EMAIL SYSTEM] Email -> ${targetUser.email}: ${title}`, 'color: #10b981;');
          }
      }
  };

  const processOfflineQueue = async () => {
      const pendingActions = getOfflineActions();
      if (pendingActions.length === 0) return;

      setIsSyncingData(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setTimesheets(prev => prev.map(ts => {
          if (ts.syncStatus === 'PENDING_SYNC') {
              return { ...ts, syncStatus: 'SYNCED' };
          }
          return ts;
      }));

      clearOfflineActions();
      setIsSyncingData(false);
  };

  // --- Effects ---
  useEffect(() => {
    // Auto-sync on login to ensure user exists
    if(currentUser && isOnline) {
        ensureBackendConsistency().catch(err => console.warn("Background sync warning:", err));
    }
  }, [currentUser, isOnline]); 

  // --- Handlers ---

  const ensureBackendConsistency = async () => {
      if (!isOnline || !currentUser) return;
      
      // Helper to push and CHECK response
      const push = async (endpoint: string, data: any[]) => {
          try {
              const res = await fetch(`${API_CONFIG.BASE_URL}/config/${endpoint}`, {
                  method: 'POST', headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(data)
              });
              if (!res.ok) {
                  const errText = await res.text();
                  throw new Error(`Server error on ${endpoint}: ${errText}`);
              }
          } catch(e) {
              throw e; // Rethrow to stop the chain
          }
      };

      // Send Comp, Office, Dept, User in order to satisfy FKs
      console.log("Starting DB Consistency Check...");
      await push('companies', companies);
      await push('offices', offices);
      await push('departments', departments);
      await push('users', users);
      console.log("DB Consistency Check Passed.");
  };

  const handleLogin = (user: User, isNewUser?: boolean) => {
      const freshUser = users.find(u => u.id === user.id) || user;
      
      if (freshUser.employmentStatus === 'SUSPENDED' || freshUser.employmentStatus === 'TERMINATED') {
          alert("Contul dumneavoastră este suspendat sau inactiv. Vă rugăm contactați HR.");
          return;
      }
      
      const loggedUser = { ...freshUser, lastLoginDate: new Date().toISOString() };
      
      if (isNewUser) {
          setUsers(prev => [...prev, loggedUser]);
      } else {
          setUsers(prev => prev.map(u => u.id === loggedUser.id ? loggedUser : u));
      }
      
      setCurrentUser(loggedUser);
      setActiveTab('dashboard');
      setAiSummary(null);
  };

  const handleLogout = () => {
      setCurrentUser(null);
      // Removed setCurrentShift(null) - automatically handled by useMemo
  };

  const initiateRejection = (type: 'LEAVE' | 'CORRECTION' | 'BREAK', itemId: string, parentId?: string) => {
      setRejectionModal({ isOpen: true, type, itemId, parentId });
  };

  const handleConfirmRejection = async (reason: string) => {
      const { type, itemId, parentId } = rejectionModal;
      if (type === 'LEAVE' && itemId) {
          setLeaves(prev => prev.map(l => l.id === itemId ? { ...l, status: LeaveStatus.REJECTED, managerComment: reason } : l));
          
          if (isBackendOnline) {
             try {
                await fetch(`${API_CONFIG.BASE_URL}/leaves/${itemId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: LeaveStatus.REJECTED, managerComment: reason })
                });
             } catch(e) { console.error("Failed to sync rejection", e); }
          }
      } 
      else if (type === 'CORRECTION' && itemId) {
          setCorrectionRequests(prev => prev.map(r => r.id === itemId ? { ...r, status: 'REJECTED', managerNote: reason } : r));
      }
      else if (type === 'BREAK' && itemId && parentId) {
          setTimesheets(prev => prev.map(ts => {
              if (ts.id !== parentId) return ts;
              return {
                  ...ts,
                  breaks: ts.breaks.map(br => br.id === itemId ? { ...br, status: BreakStatus.REJECTED, managerNote: reason } : br)
              }
          }));
      }
      setRejectionModal({ isOpen: false, type: null, itemId: null });
  };

  const handleValidateUser = (userId: string) => {
      const newPin = Math.floor(1000 + Math.random() * 9000).toString();
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isValidated: true, pin: newPin, employmentStatus: 'ACTIVE' } : u));
      if (currentUser && currentUser.id === userId) {
          setCurrentUser(prev => prev ? ({ ...prev, isValidated: true, pin: newPin, employmentStatus: 'ACTIVE' }) : null);
      }
      alert(`Utilizator validat! PIN generat: ${newPin}`);
  };

  const handleCreateUser = (newUser: User) => {
      const userWithStatus = { ...newUser, employmentStatus: 'ACTIVE' as const };
      setUsers(prev => [...prev, userWithStatus]);
  };

  const handleUpdateUser = (updatedUser: User) => {
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      if (currentUser && currentUser.id === updatedUser.id) {
          setCurrentUser(updatedUser);
      }
  };

  const openTimesheetModal = (ts: Timesheet | null) => {
      setEditModalData({ isOpen: true, timesheet: ts });
  };

  const handleTimesheetSave = async (data: { tsId?: string, date: string, start: string, end: string, reason: string, scheduleId?: string }) => {
      if (!currentUser) return;
      
      // Global Lock Check
      if (isDateInLockedPeriod(data.date, lockedDate)) {
          alert("Eroare: Nu se pot efectua modificări pentru o lună închisă din punct de vedere contabil.");
          return;
      }

      const hasRole = (role: Role) => currentUser.roles.includes(role);
      const isManagerOrAdmin = hasRole(Role.MANAGER) || hasRole(Role.ADMIN);
      
      const targetTs = data.tsId ? timesheets.find(t => t.id === data.tsId) : null;
      let scheduleName = targetTs?.detectedScheduleName;
      if (data.scheduleId) {
          const sch = MOCK_SCHEDULES.find(s => s.id === data.scheduleId);
          if(sch) scheduleName = sch.name;
      }

      if (isManagerOrAdmin) {
          if (targetTs) {
              const logEntry: TimesheetLog = {
                  id: `log-${Date.now()}`,
                  changedByUserId: currentUser.id,
                  changeDate: new Date().toISOString(),
                  details: `Manager Edit: ${data.reason}`
              };
              setTimesheets(prev => prev.map(t => t.id === data.tsId ? {
                  ...t,
                  startTime: data.start,
                  endTime: data.end || undefined,
                  logs: t.logs ? [...t.logs, logEntry] : [logEntry],
                  syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC',
                  detectedScheduleId: data.scheduleId || t.detectedScheduleId,
                  detectedScheduleName: scheduleName
              } : t));
          } else {
              const newTs: Timesheet = {
                  id: `ts-${Date.now()}`,
                  userId: currentUser.id,
                  date: data.date,
                  startTime: data.start,
                  endTime: data.end || undefined,
                  status: ShiftStatus.COMPLETED,
                  breaks: [],
                  logs: [{ id: `log-${Date.now()}`, changedByUserId: currentUser.id, changeDate: new Date().toISOString(), details: `Creat manual: ${data.reason}` }],
                  detectedScheduleId: data.scheduleId,
                  detectedScheduleName: scheduleName,
                  syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
              };
              setTimesheets(prev => [newTs, ...prev]);
          }
          alert("Salvat cu succes!");
      } else {
          const reqId = `cr-${Date.now()}`;
          const newRequest: CorrectionRequest = targetTs ? {
              id: reqId,
              timesheetId: targetTs.id,
              userId: currentUser.id,
              requestedStartTime: data.start,
              requestedEndTime: data.end,
              reason: data.reason,
              status: 'PENDING'
          } : {
              id: reqId,
              requestedDate: data.date,
              userId: currentUser.id,
              requestedStartTime: data.start,
              requestedEndTime: data.end,
              reason: data.reason,
              status: 'PENDING'
          };
          
          setCorrectionRequests(prev => [...prev, newRequest]);
          
          if (isOnline && isBackendOnline) {
              try {
                  await fetch(`${API_CONFIG.BASE_URL}/corrections`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ...newRequest, tsId: newRequest.timesheetId }) // flatten for simplified API payload logic
                  });
              } catch (e) {
                  console.error("Failed to sync correction request", e);
              }
          }
          alert("Solicitare trimisă!");
      }
  };

  const handleApproveCorrection = (reqId: string) => {
      const request = correctionRequests.find(r => r.id === reqId);
      if (!request) return;

      if (request.timesheetId) {
          setTimesheets(prev => prev.map(t => {
              if (t.id === request.timesheetId) {
                  const logEntry: TimesheetLog = {
                      id: `log-${Date.now()}`,
                      changedByUserId: currentUser?.id || 'system',
                      changeDate: new Date().toISOString(),
                      details: `Aprobat corecție: ${request.reason}`
                  };
                  return {
                      ...t,
                      startTime: request.requestedStartTime,
                      endTime: request.requestedEndTime || undefined,
                      logs: t.logs ? [...t.logs, logEntry] : [logEntry],
                      syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
                  };
              }
              return t;
          }));
      } else if (request.requestedDate) {
          const newTs: Timesheet = {
              id: `ts-${Date.now()}`,
              userId: request.userId,
              date: request.requestedDate,
              startTime: request.requestedStartTime,
              endTime: request.requestedEndTime || undefined,
              status: ShiftStatus.COMPLETED,
              breaks: [],
              logs: [{ id: `log-${Date.now()}`, changedByUserId: currentUser?.id || 'system', changeDate: new Date().toISOString(), details: `Aprobat cerere creare: ${request.reason}` }],
              syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
          };
          setTimesheets(prev => [newTs, ...prev]);
      }
      setCorrectionRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'APPROVED' } : r));
  };

  const handleSyncERP = () => { setIsErpSyncing(true); setTimeout(() => setIsErpSyncing(false), 1000); };
  
  const handleAssignSchedule = (userId: string, date: string, scheduleId: string) => { 
      // Global Lock Check
      if (isDateInLockedPeriod(date, lockedDate)) {
          alert("Eroare: Nu se poate modifica orarul pentru o lună închisă.");
          return;
      }

      const exists = schedulePlans.findIndex(s => s.userId === userId && s.date === date);
      if (exists !== -1) {
          // If scheduleId is empty string, remove it
          if (!scheduleId) {
              setSchedulePlans(prev => prev.filter((_, idx) => idx !== exists));
          } else {
              setSchedulePlans(prev => prev.map((s, idx) => idx === exists ? { ...s, scheduleId } : s));
          }
      } else {
          if (scheduleId) {
              setSchedulePlans(prev => [...prev, { id: `ds-${Date.now()}`, userId, date, scheduleId }]); 
          }
      }
  };

  const handleAddOffice = (office: Office) => setOffices(prev => [...prev, office]);
  const handleUpdateOffice = (office: Office) => setOffices(prev => prev.map(o => o.id === office.id ? office : o));
  const handleDeleteOffice = (id: string) => setOffices(prev => prev.filter(o => o.id !== id));
  const handleUpdateDepartments = (updatedDepartments: Department[]) => setDepartments(updatedDepartments);
  const handleAddCompany = (company: Company) => { setCompanies(prev => [...prev, company]); };
  const handleUpdateCompany = (company: Company) => { setCompanies(prev => prev.map(c => c.id === company.id ? company : c)); };
  const handleDeleteCompany = (id: string) => { setCompanies(prev => prev.filter(c => c.id !== id)); };

  // --- MISSING HANDLERS ADDED ---
  const handleClockIn = async (location: Coordinates, office: Office | null, dist: number) => {
      if (!currentUser) return;
      
      // Determine schedule
      const today = new Date().toISOString().split('T')[0];
      const dailySchedule = schedulePlans.find(s => s.userId === currentUser.id && s.date === today);
      let detectedScheduleId = dailySchedule?.scheduleId;
      let detectedScheduleName = dailySchedule ? MOCK_SCHEDULES.find(s => s.id === dailySchedule.scheduleId)?.name : undefined;

      if (!detectedScheduleId && currentUser.allowedScheduleIds.length > 0) {
          detectedScheduleId = currentUser.allowedScheduleIds[0];
          detectedScheduleName = MOCK_SCHEDULES.find(s => s.id === detectedScheduleId)?.name;
      }

      const newTimesheet: Timesheet = {
          id: `ts-${Date.now()}`,
          userId: currentUser.id,
          startTime: new Date().toISOString(),
          date: today,
          status: ShiftStatus.WORKING,
          breaks: [],
          startLocation: location,
          matchedOfficeId: office?.id,
          distanceToOffice: dist,
          detectedScheduleId,
          detectedScheduleName,
          syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC',
          logs: [{
              id: `log-${Date.now()}`,
              changedByUserId: currentUser.id,
              changeDate: new Date().toISOString(),
              details: `Clock In at ${office ? office.name : 'Unknown Location'}`
          }]
      };

      // UPDATED: Simply update timesheets, useMemo handles currentShift
      setTimesheets(prev => [newTimesheet, ...prev]);

      if (isOnline) {
          try {
              await fetch(`${API_CONFIG.BASE_URL}/clock-in`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      id: newTimesheet.id,
                      userId: currentUser.id,
                      location,
                      officeId: office?.id
                  })
              });
          } catch (e) {
              console.error("Clock In Sync failed", e);
              saveOfflineAction('CLOCK_IN', { id: newTimesheet.id, location, officeId: office?.id }, currentUser.id);
          }
      } else {
          saveOfflineAction('CLOCK_IN', { id: newTimesheet.id, location, officeId: office?.id }, currentUser.id);
      }
  };

  const handleClockOut = async (location: Coordinates) => {
      if (!currentUser || !currentShift) return;
      
      const updatedTs: Timesheet = {
          ...currentShift,
          endTime: new Date().toISOString(),
          status: ShiftStatus.COMPLETED,
          endLocation: location,
          syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
      };

      setTimesheets(prev => prev.map(t => t.id === currentShift.id ? updatedTs : t));
      // Removed setCurrentShift(null);

      if (isOnline) {
          try {
              await fetch(`${API_CONFIG.BASE_URL}/clock-out`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      timesheetId: currentShift.id,
                      location
                  })
              });
          } catch (e) {
              saveOfflineAction('CLOCK_OUT', { timesheetId: currentShift.id, location }, currentUser.id);
          }
      } else {
          saveOfflineAction('CLOCK_OUT', { timesheetId: currentShift.id, location }, currentUser.id);
      }
  };

  const handleToggleBreak = async (breakConfig?: BreakConfig, location?: Coordinates, dist?: number) => {
      if (!currentUser || !currentShift) return;

      if (currentShift.status === ShiftStatus.ON_BREAK) {
          // End Break
          const activeBreakIndex = currentShift.breaks.findIndex(b => !b.endTime);
          if (activeBreakIndex === -1) return;

          const activeBreak = currentShift.breaks[activeBreakIndex];
          const updatedBreak: Break = {
              ...activeBreak,
              endTime: new Date().toISOString(),
              endLocation: location,
              endDistanceToOffice: dist,
              status: BreakStatus.PENDING
          };

          const updatedBreaks = [...currentShift.breaks];
          updatedBreaks[activeBreakIndex] = updatedBreak;

          const updatedTs: Timesheet = {
              ...currentShift,
              status: ShiftStatus.WORKING,
              breaks: updatedBreaks,
              syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
          };
          
          setTimesheets(prev => prev.map(t => t.id === currentShift.id ? updatedTs : t));
          // Removed setCurrentShift(updatedTs);

          if (isOnline) {
               try {
                  await fetch(`${API_CONFIG.BASE_URL}/breaks/end`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: activeBreak.id })
                  });
              } catch (e) {
                  saveOfflineAction('END_BREAK', { id: activeBreak.id }, currentUser.id);
              }
          } else {
              saveOfflineAction('END_BREAK', { id: activeBreak.id }, currentUser.id);
          }

      } else {
          // Start Break
          if (!breakConfig) return;

          const newBreak: Break = {
              id: `br-${Date.now()}`,
              typeId: breakConfig.id,
              typeName: breakConfig.name,
              startTime: new Date().toISOString(),
              status: BreakStatus.PENDING,
              startLocation: location,
              startDistanceToOffice: dist
          };

          const updatedTs: Timesheet = {
              ...currentShift,
              status: ShiftStatus.ON_BREAK,
              breaks: [...currentShift.breaks, newBreak],
              syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
          };

          setTimesheets(prev => prev.map(t => t.id === currentShift.id ? updatedTs : t));
          // Removed setCurrentShift(updatedTs);

          if (isOnline) {
              try {
                  await fetch(`${API_CONFIG.BASE_URL}/breaks/start`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          id: newBreak.id,
                          timesheetId: currentShift.id,
                          typeId: breakConfig.id,
                          location
                      })
                  });
              } catch (e) {
                  saveOfflineAction('START_BREAK', { id: newBreak.id, timesheetId: currentShift.id, typeId: breakConfig.id, location }, currentUser.id);
              }
          } else {
              saveOfflineAction('START_BREAK', { id: newBreak.id, timesheetId: currentShift.id, typeId: breakConfig.id, location }, currentUser.id);
          }
      }
  };

  const handleApproveLeave = async (reqId: string) => {
      // Add approval timestamp
      setLeaves(prev => prev.map(l => l.id === reqId ? { ...l, status: LeaveStatus.APPROVED, approvedAt: new Date().toISOString() } : l));
      if (isOnline) {
          try {
              await fetch(`${API_CONFIG.BASE_URL}/leaves/${reqId}/status`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: LeaveStatus.APPROVED })
              });
          } catch (e) { console.error("Sync failed", e); }
      }
  };

  const handleApproveBreak = async (timesheetId: string, breakId: string, status: BreakStatus) => {
      setTimesheets(prev => prev.map(ts => {
          if (ts.id !== timesheetId) return ts;
          return {
              ...ts,
              breaks: ts.breaks.map(br => br.id === breakId ? { ...br, status } : br)
          };
      }));
  };

  const handleLeaveSubmit = async (req: Omit<LeaveRequest, 'id' | 'status' | 'userId'>) => {
      if (!currentUser) return;
      
      // Global Lock Check
      if (isDateInLockedPeriod(req.startDate, lockedDate)) {
          alert("Eroare: Nu se pot adăuga cereri de concediu pentru o lună închisă.");
          return;
      }

      const newLeave: LeaveRequest = {
          id: `lr-${Date.now()}`,
          userId: currentUser.id,
          status: LeaveStatus.PENDING,
          createdAt: new Date().toISOString(), // TIMESTAMP ADDED
          ...req
      };
      setLeaves(prev => [newLeave, ...prev]);

      if (isOnline) {
          try {
              await fetch(`${API_CONFIG.BASE_URL}/leaves`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(newLeave)
              });
          } catch (e) { console.error("Leave Sync failed", e); }
      }
  };

  // --- Render ---

  if (!currentUser) return <LoginScreen users={users} companies={companies} onLogin={handleLogin} />;
  
  if (!currentUser.isValidated) {
      // Pending Validation Screen (Code omitted for brevity, same as previous)
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
                  <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <Clock size={40} />
                  </div>
                  <div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-2">Cont în Așteptare</h2>
                      <p className="text-gray-500">Contul <strong>{currentUser.name}</strong> a fost creat cu succes, dar necesită validarea unui administrator.</p>
                  </div>
                  <div className="pt-2 flex flex-col gap-3">
                      <button onClick={handleLogout} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2">
                          <LogOut size={18}/> Înapoi la Login
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- Role Helpers (Moved Up to fix ReferenceError) ---
  const hasRole = (role: Role) => currentUser.roles.includes(role);
  const canViewTeam = hasRole(Role.MANAGER) || hasRole(Role.HR) || hasRole(Role.ADMIN);
  const canManageUsers = hasRole(Role.ADMIN) || hasRole(Role.HR);
  const canManageOffices = hasRole(Role.ADMIN) || hasRole(Role.MANAGER);
  const isAdmin = hasRole(Role.ADMIN);

  // Derived State for Leaves View
  const myLeaves = leaves.filter(l => l.userId === currentUser.id).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  
  // Pending leaves for managers (Team Only) or Admins (All)
  const teamPendingLeaves = leaves.filter(l => {
      if (l.status !== LeaveStatus.PENDING) return false;
      const requester = users.find(u => u.id === l.userId);
      if (!requester || requester.id === currentUser.id) return false; // Don't show self in approval list
      
      if (isAdmin) return true;
      if (hasRole(Role.MANAGER)) return requester.companyId === currentUser.companyId; // Simplified manager logic (Company level)
      return false;
  });

  const myTimesheets = timesheets.filter(t => t.userId === currentUser.id);
  const pendingCorrections = correctionRequests.filter(r => r.status === 'PENDING');
  const myNotifications = notifications.filter(n => n.userId === currentUser.id && !n.isRead);

  const todayStr = new Date().toISOString().split('T')[0];
  const activeLeaveRequest = leaves.find(l => l.userId === currentUser.id && l.startDate <= todayStr && l.endDate >= todayStr);

  const getTabClass = (tabName: string) => {
    return activeTab === tabName 
      ? "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 bg-blue-50 text-blue-700"
      : "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-600";
  }
  
  const userOffices = offices;
  const userCompany = companies.find(c => c.id === currentUser.companyId);

  const teamTimesheets = timesheets.filter(t => {
      if (t.userId === currentUser.id) return false;
      const user = users.find(u => u.id === t.userId);
      if (!user) return false;
      if (isAdmin && selectedTeamCompany !== 'ALL' && user.companyId !== selectedTeamCompany) return false;
      if (!isAdmin && hasRole(Role.MANAGER)) {
          return user.companyId === currentUser.companyId;
      }
      return true;
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-gray-800">
      
      {!isOnline && (
          <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-white text-center text-sm py-2 z-50 flex justify-center items-center gap-2">
              <WifiOff size={16} /> Offline Mode
          </div>
      )}

      {/* --- Sidebar --- */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col sticky top-0 md:h-screen z-10">
         <div className="p-6 border-b border-gray-100 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
            <span className="font-bold text-xl tracking-tight text-gray-900">PontajGroup</span>
         </div>
         <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button onClick={() => setActiveTab('notifications')} className={getTabClass('notifications')}>
              <Bell size={18}/> Notificări {myNotifications.length > 0 && <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2">{myNotifications.length}</span>}
            </button>
            <button onClick={() => setActiveTab('dashboard')} className={getTabClass('dashboard')}><Clock size={18}/> Pontaj</button>
            <button onClick={() => setActiveTab('calendar')} className={getTabClass('calendar')}><CalendarRange size={18}/> Program</button>
            <button onClick={() => setActiveTab('leaves')} className={getTabClass('leaves')}><Settings size={18}/> Concedii</button>
            <div className="pt-2 pb-1 border-t border-gray-100 my-1">
               <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Management</p>
            </div>
            {canViewTeam && <button onClick={() => setActiveTab('team')} className={getTabClass('team')}><Users size={18}/> Echipa</button>}
            {canManageUsers && <button onClick={() => setActiveTab('users')} className={getTabClass('users')}><UserCog size={18}/> Useri</button>}
            {isAdmin && <button onClick={() => setActiveTab('companies')} className={getTabClass('companies')}><Briefcase size={18}/> Companii</button>}
            {canManageOffices && <button onClick={() => setActiveTab('offices')} className={getTabClass('offices')}><Building size={18}/> Sedii</button>}
            {isAdmin && <button onClick={() => setActiveTab('nomenclator')} className={getTabClass('nomenclator')}><Database size={18}/> Nomenclator</button>}
            {isAdmin && <button onClick={() => setActiveTab('backend')} className={getTabClass('backend')}><Server size={18}/> Backend</button>}
         </nav>
         
         <div className="p-4 border-t border-gray-200 bg-gray-50/50">
            <BirthdayWidget users={users} currentUser={currentUser} />
            <div className="flex items-center gap-3 mb-4">
                <img src={currentUser.avatarUrl} alt="" className="w-10 h-10 rounded-full bg-white border border-gray-200 object-cover"/>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold text-gray-900 truncate" title={currentUser.name}>{currentUser.name}</p>
                    <p className="text-xs text-gray-500 truncate" title={currentUser.email}>{currentUser.email}</p>
                </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                <LogOut size={16} /> Deconectare
            </button>
         </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {activeTab === 'dashboard' && (
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Pontaj</h1>
                    {(hasRole(Role.MANAGER) || hasRole(Role.ADMIN)) && (
                         <div className="flex gap-2">
                             {/* Manual sync button fallback */}
                             <button onClick={ensureBackendConsistency} className="bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 transition" title="Sincronizează datele structurale cu serverul">
                                 <RefreshCw size={16} className={isSyncingData ? "animate-spin" : ""}/>
                             </button>
                             <button onClick={handleSyncERP} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-slate-900 transition">
                                 <CloudLightning size={16}/> Sync ERP
                             </button>
                         </div>
                    )}
                </header>
                <ClockWidget 
                    user={currentUser}
                    companyName={userCompany?.name}
                    offices={userOffices}
                    breakConfigs={breakConfigs}
                    holidays={holidays}
                    activeLeaveRequest={activeLeaveRequest}
                    shiftStartTime={currentShift?.startTime}
                    accumulatedBreakTime={shiftStats.accumulatedPauseMs} // Pass accumulated break time
                    activeBreakStartTime={shiftStats.activeBreakStart} // Pass active break start
                    currentStatus={currentShift?.status || ShiftStatus.NOT_STARTED}
                    onClockIn={handleClockIn}
                    onClockOut={handleClockOut}
                    onToggleBreak={handleToggleBreak}
                />
                <div className="flex justify-between items-end">
                     <h2 className="text-lg font-bold text-gray-800">Istoric & Acțiuni</h2>
                     <button onClick={() => openTimesheetModal(null)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-md">
                        <PlusCircle size={16}/> {hasRole(Role.MANAGER) ? "Adaugă Pontaj Manual" : "Solicită Pontaj Lipsă"}
                     </button>
                </div>
                <TimesheetList timesheets={myTimesheets} onEditTimesheet={openTimesheetModal} isManagerView={false} />
            </div>
        )}

        {activeTab === 'calendar' && <ScheduleCalendar currentUser={currentUser} users={users} schedules={schedulePlans} holidays={holidays} lockedDate={lockedDate} onAssignSchedule={handleAssignSchedule}/>}
        
        {activeTab === 'leaves' && (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Concedii</h1>
                    <button onClick={() => setLeaveModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                        <PlusCircle size={18}/> Cerere Nouă
                    </button>
                </div>

                {/* Manager: Pending Requests */}
                {canViewTeam && teamPendingLeaves.length > 0 && (
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 shadow-sm animate-in slide-in-from-top-2">
                        <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2"><AlertCircle size={18}/> Cereri de Aprobat ({teamPendingLeaves.length})</h3>
                        <div className="space-y-3">
                            {teamPendingLeaves.map(req => {
                                const requester = users.find(u => u.id === req.userId);
                                return (
                                    <div key={req.id} className="bg-white p-3 rounded-lg border border-orange-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <img src={requester?.avatarUrl} className="w-5 h-5 rounded-full bg-gray-100"/>
                                                <span className="font-bold text-gray-800 text-sm">{requester?.name}</span>
                                            </div>
                                            <div className="text-sm text-gray-600 flex items-center gap-2">
                                                <span className="font-medium bg-gray-100 px-2 rounded text-xs">{req.typeName}</span>
                                                <span className="text-gray-400">|</span>
                                                <Calendar size={14} className="text-gray-400"/>
                                                <span>{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</span>
                                            </div>
                                            {req.createdAt && (
                                                <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                                    <Clock4 size={10}/> Solicitat: {new Date(req.createdAt).toLocaleString('ro-RO')}
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-500 italic mt-1">{req.reason}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleApproveLeave(req.id)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-bold transition">Aprobă</button>
                                            <button onClick={() => initiateRejection('LEAVE', req.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold transition">Respinge</button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* My Leaves History */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2"><FileText size={18}/> Istoric Cererile Mele</h3>
                    </div>
                    {myLeaves.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm italic">
                            Nu ai trimis nicio cerere de concediu.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {myLeaves.map(leave => (
                                <div key={leave.id} className="p-4 hover:bg-gray-50 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-bold text-gray-800">{leave.typeName}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                                leave.status === LeaveStatus.APPROVED ? 'bg-green-50 text-green-600 border-green-100' :
                                                leave.status === LeaveStatus.REJECTED ? 'bg-red-50 text-red-600 border-red-100' :
                                                'bg-yellow-50 text-yellow-600 border-yellow-100'
                                            }`}>
                                                {leave.status === LeaveStatus.PENDING ? 'ÎN AȘTEPTARE' : leave.status === LeaveStatus.APPROVED ? 'APROBAT' : 'RESPINS'}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            <Calendar size={14} className="text-blue-400"/>
                                            <span>{new Date(leave.startDate).toLocaleDateString('ro-RO')}</span>
                                            <ChevronRight size={12} className="text-gray-300"/>
                                            <span>{new Date(leave.endDate).toLocaleDateString('ro-RO')}</span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-1 space-y-0.5">
                                            {leave.createdAt && <div>Solicitat: {new Date(leave.createdAt).toLocaleString('ro-RO')}</div>}
                                            {leave.approvedAt && <div className="text-green-600">Aprobat: {new Date(leave.approvedAt).toLocaleString('ro-RO')}</div>}
                                        </div>
                                        {leave.reason && (
                                            <p className="text-xs text-gray-400 mt-1 max-w-md truncate">"{leave.reason}"</p>
                                        )}
                                        {leave.status === LeaveStatus.REJECTED && leave.managerComment && (
                                            <p className="text-xs text-red-500 mt-1 font-medium bg-red-50 p-1 rounded inline-block">Motiv refuz: {leave.managerComment}</p>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-300 font-mono">
                                        ID: {leave.id.slice(-6)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'team' && canViewTeam && (
             <div className="max-w-4xl mx-auto space-y-8">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                     <h1 className="text-2xl font-bold text-gray-800">Management Echipă</h1>
                     {isAdmin && (
                         <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                             <Filter size={16} className="text-gray-400"/>
                             <span className="text-xs font-bold text-gray-600">Companie:</span>
                             <select value={selectedTeamCompany} onChange={(e) => setSelectedTeamCompany(e.target.value)} className="text-sm bg-transparent outline-none font-medium text-blue-600">
                                 <option value="ALL">Toate Companiile</option>
                                 {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                             </select>
                         </div>
                     )}
                 </div>
                 {pendingCorrections.length > 0 && (
                     <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2"><AlertOctagon className="text-orange-500" size={20}/> Cereri Corecție / Pontaj Lipsă</h3>
                        <div className="grid gap-4">
                            {pendingCorrections.map(req => {
                                const requester = users.find(u => u.id === req.userId);
                                if (isAdmin && selectedTeamCompany !== 'ALL' && requester?.companyId !== selectedTeamCompany) return null;
                                if (!isAdmin && hasRole(Role.MANAGER) && requester?.companyId !== currentUser.companyId) return null;
                                const ts = req.timesheetId ? timesheets.find(t => t.id === req.timesheetId) : null;
                                const dateDisplay = ts ? ts.date : req.requestedDate;
                                return (
                                    <div key={req.id} className="bg-orange-50 border border-orange-200 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                 <img src={requester?.avatarUrl} className="w-6 h-6 rounded-full"/>
                                                 <span className="font-bold text-gray-900">{requester?.name}</span>
                                            </div>
                                            <p className="text-sm text-gray-800 font-medium">Data: {dateDisplay} {req.timesheetId ? '(Modificare)' : '(Pontaj Nou)'}</p>
                                            <p className="text-xs text-gray-600">
                                                {req.timesheetId ? (
                                                    <span className="line-through text-gray-400">{new Date(ts?.startTime || '').toLocaleTimeString()} - {ts?.endTime ? new Date(ts.endTime).toLocaleTimeString() : '...'}</span>
                                                ) : <span className="text-blue-600 font-semibold">Creează:</span>}
                                                {' '} {'->'} <span className="font-bold">{new Date(req.requestedStartTime).toLocaleTimeString()} - {req.requestedEndTime ? new Date(req.requestedEndTime).toLocaleTimeString() : '...'}</span>
                                            </p>
                                            <p className="text-xs text-gray-500 italic mt-1">Motiv: "{req.reason}"</p>
                                        </div>
                                        <div className="flex gap-2">
                                             <button onClick={() => handleApproveCorrection(req.id)} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold">Aprobă</button>
                                             <button onClick={() => initiateRejection('CORRECTION', req.id)} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold">Respinge</button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                     </div>
                 )}
                 <TimesheetList timesheets={teamTimesheets} isManagerView={true} onApproveBreak={handleApproveBreak} onEditTimesheet={openTimesheetModal}/>
             </div>
        )}
        {activeTab === 'users' && (
            <AdminUserManagement 
                users={users} 
                companies={companies} 
                departments={departments} 
                offices={offices} 
                onValidateUser={handleValidateUser} 
                onCreateUser={handleCreateUser}
                onUpdateUser={handleUpdateUser} // Pass the handler
            />
        )}
        {activeTab === 'companies' && (
             <CompanyManagement 
                companies={companies}
                users={users}
                departments={departments}
                offices={offices}
                onAddCompany={handleAddCompany}
                onUpdateCompany={handleUpdateCompany}
                onDeleteCompany={handleDeleteCompany}
             />
        )}
        {activeTab === 'offices' && <OfficeManagement users={users} offices={offices} departments={departments} companies={companies} onAddOffice={handleAddOffice} onUpdateOffice={handleUpdateOffice} onDeleteOffice={handleDeleteOffice} onUpdateDepartments={handleUpdateDepartments} onUpdateCompany={handleUpdateCompany}/>}
        {activeTab === 'nomenclator' && (
            <NomenclatorManagement 
                breakConfigs={breakConfigs} 
                leaveConfigs={leaveConfigs} 
                holidays={holidays}
                currentLockedDate={lockedDate}
                onUpdateBreaks={setBreakConfigs} 
                onUpdateLeaves={setLeaveConfigs}
                onUpdateHolidays={setHolidays}
                onUpdateLockedDate={setLockedDate}
            />
        )}
        {activeTab === 'backend' && <BackendControlPanel />}

      </main>

      <LeaveModal isOpen={isLeaveModalOpen} onClose={() => setLeaveModalOpen(false)} leaveConfigs={leaveConfigs} lockedDate={lockedDate} onSubmit={handleLeaveSubmit} />
      <TimesheetEditModal isOpen={editModalData.isOpen} onClose={() => setEditModalData({isOpen: false, timesheet: null})} timesheet={editModalData.timesheet} isManager={hasRole(Role.MANAGER) || hasRole(Role.ADMIN)} lockedDate={lockedDate} onSave={handleTimesheetSave} />
      <RejectionModal isOpen={rejectionModal.isOpen} onClose={() => setRejectionModal({ ...rejectionModal, isOpen: false })} onSubmit={handleConfirmRejection} />
    </div>
  );
}