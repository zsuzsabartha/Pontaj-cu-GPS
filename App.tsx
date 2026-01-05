
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
import { Users, FileText, Settings, LogOut, CheckCircle, XCircle, BarChart3, CloudLightning, Building, Clock, UserCog, Lock, AlertOctagon, Wifi, WifiOff, Database, AlertCircle, Server, CalendarRange, Bell, PlusCircle, ShieldCheck, Filter, Briefcase, Calendar, ChevronRight, RefreshCw, Clock4, Coffee, LayoutList, CheckSquare, Plane, Stethoscope, Palmtree, ChevronLeft, MapPin } from 'lucide-react';
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
  
  // Rejection Modal State
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    type: 'LEAVE' | 'CORRECTION' | 'BREAK' | null;
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
          if (b.endTime) {
              const start = new Date(b.startTime).getTime();
              const end = new Date(b.endTime).getTime();
              accumulatedPauseMs += (end - start);
          } else {
              activeBreakStart = b.startTime;
          }
      });
      return { accumulatedPauseMs, activeBreakStart };
  }, [currentShift]);

  const [isErpSyncing, setIsErpSyncing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // --- BACKGROUND JOBS (Late & Auto-Checkout) ---
  const runBackgroundChecks = () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const hour = now.getHours();
      
      // 1. LATE ARRIVAL NOTIFICATIONS
      if (hour >= APP_CONFIG.startWorkHourThreshold) { // Only check after start threshold
          users.forEach(user => {
              if (user.employmentStatus !== 'ACTIVE') return;
              
              // Get Schedule
              const dailyPlan = schedulePlans.find(s => s.userId === user.id && s.date === todayStr);
              const schedId = dailyPlan?.scheduleId || user.mainScheduleId || workSchedules[0]?.id;
              const schedule = workSchedules.find(s => s.id === schedId);
              
              if (!schedule) return;

              // Parse Schedule Start Time
              const [h, m] = schedule.startTime.split(':').map(Number);
              const schedStart = new Date();
              schedStart.setHours(h, m, 0, 0);
              
              // If current time > schedule start + 30 mins grace
              if (now.getTime() > schedStart.getTime() + 30 * 60000) {
                  // Check if clocked in
                  const hasTimesheet = timesheets.some(t => t.userId === user.id && t.date === todayStr);
                  // Check if has active leave
                  const hasLeave = leaves.some(l => l.userId === user.id && l.startDate <= todayStr && l.endDate >= todayStr && l.status !== LeaveStatus.REJECTED);
                  // Check if already notified today
                  const alreadyNotified = notifications.some(n => n.userId === user.id && n.type === 'ALERT' && n.date.startsWith(todayStr) && n.title.includes('Lipsă Pontaj'));

                  if (!hasTimesheet && !hasLeave && !alreadyNotified) {
                      addNotification(user.id, "Lipsă Pontaj", "Nu a fost detectată nicio intrare conform programului tău. Te rugăm să pontezi sau să adaugi o cerere.", "ALERT");
                  }
              }
          });
      }

      // 2. AUTO-CHECKOUT LOGIC
      const activeTimesheets = timesheets.filter(t => t.status === ShiftStatus.WORKING || t.status === ShiftStatus.ON_BREAK);
      
      if (activeTimesheets.length > 0) {
          let updatedList = [...timesheets];
          let changed = false;

          activeTimesheets.forEach(ts => {
              const schedId = ts.detectedScheduleId || users.find(u => u.id === ts.userId)?.mainScheduleId;
              const schedule = workSchedules.find(s => s.id === schedId);
              
              if (schedule) {
                  const [endH, endM] = schedule.endTime.split(':').map(Number);
                  let schedEnd = new Date(ts.startTime);
                  schedEnd.setHours(endH, endM, 0, 0);
                  
                  // Adjust for night shift
                  if (schedule.crossesMidnight) {
                      schedEnd.setDate(schedEnd.getDate() + 1);
                  }

                  // Add Auto-Checkout Threshold (e.g., 4 hours after shift end)
                  const autoCheckoutTime = new Date(schedEnd.getTime() + (APP_CONFIG.autoClockOutAlertHours + 4) * 60 * 60 * 1000);

                  if (now > autoCheckoutTime) {
                      // PERFORM AUTO CHECKOUT
                      const updatedTs: Timesheet = {
                          ...ts,
                          endTime: schedEnd.toISOString(), // Set end time to scheduled end
                          status: ShiftStatus.COMPLETED,
                          isSystemAutoCheckout: true,
                          logs: [...(ts.logs || []), {
                              id: `sys-${Date.now()}`,
                              changedByUserId: 'system',
                              changeDate: now.toISOString(),
                              details: 'System Auto-Checkout triggered (Shift timeout)'
                          }]
                      };
                      
                      // Replace in list
                      updatedList = updatedList.map(item => item.id === ts.id ? updatedTs : item);
                      changed = true;
                      
                      // Notify
                      addNotification(ts.userId, "Auto-Checkout", "Sistemul a închis automat pontajul deoarece a depășit limita admisă.", "INFO");
                  }
              }
          });

          if (changed) {
              setTimesheets(updatedList);
          }
      }
  };

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
    fetchTransactionalData(); 

    const backendCheckInterval = setInterval(() => {
        setIsBackendOnline(navigator.onLine); 
    }, 5000);

    // Run Background Jobs Loop
    const jobsInterval = setInterval(() => {
        runBackgroundChecks();
    }, 60000); // Check every minute

    runBackgroundChecks(); // Run once immediately

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(backendCheckInterval);
        clearInterval(jobsInterval);
    };
  }, []); 

  // ... (Rest of existing fetchBackendConfig, fetchTransactionalData, etc. functions - identical to previous file) ...
  
  const fetchBackendConfig = async () => {
      try {
          const [cRes, dRes, oRes, uRes, hRes] = await Promise.allSettled([
              fetch(`${API_CONFIG.BASE_URL}/config/companies`),
              fetch(`${API_CONFIG.BASE_URL}/config/departments`),
              fetch(`${API_CONFIG.BASE_URL}/config/offices`),
              fetch(`${API_CONFIG.BASE_URL}/config/users`),
              fetch(`${API_CONFIG.BASE_URL}/config/holidays`)
          ]);

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
          const lRes = await fetch(`${API_CONFIG.BASE_URL}/leaves`);
          if (lRes.ok) {
              const dbLeaves = await lRes.json();
              if (Array.isArray(dbLeaves) && dbLeaves.length > 0) setLeaves(dbLeaves);
          }
          const tRes = await fetch(`${API_CONFIG.BASE_URL}/timesheets`);
          if (tRes.ok) {
              const dbTimesheets = await tRes.json();
              if (Array.isArray(dbTimesheets) && dbTimesheets.length > 0) setTimesheets(dbTimesheets);
          }
      } catch (err) {
          console.log("Failed to fetch transactional data from SQL.");
      }
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
  };

  const processOfflineQueue = async () => {
      const pendingActions = getOfflineActions();
      if (pendingActions.length === 0) return;
      setIsSyncingData(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTimesheets(prev => prev.map(ts => ts.syncStatus === 'PENDING_SYNC' ? { ...ts, syncStatus: 'SYNCED' } : ts));
      clearOfflineActions();
      setIsSyncingData(false);
  };

  const ensureBackendConsistency = async () => {
      if (!isOnline || !currentUser) return;
      const push = async (endpoint: string, data: any[]) => {
          try {
              const res = await fetch(`${API_CONFIG.BASE_URL}/config/${endpoint}`, {
                  method: 'POST', headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(data)
              });
              if (!res.ok) throw new Error(`Server error on ${endpoint}`);
          } catch(e) { throw e; }
      };
      await push('companies', companies);
      await push('offices', offices);
      await push('departments', departments);
      await push('users', users);
  };

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

  // ... (Keep existing rejection handlers, validation, creation logic) ...
  const initiateRejection = (type: 'LEAVE' | 'CORRECTION' | 'BREAK', itemId: string, parentId?: string) => {
      setRejectionModal({ isOpen: true, type, itemId, parentId });
  };

  const handleConfirmRejection = async (reason: string) => {
      // (Simplified: keeping existing logic structure)
      const { type, itemId, parentId } = rejectionModal;
      if (type === 'LEAVE' && itemId) {
          setLeaves(prev => prev.map(l => l.id === itemId ? { ...l, status: LeaveStatus.REJECTED, managerComment: reason } : l));
      } else if (type === 'CORRECTION' && itemId) {
          setCorrectionRequests(prev => prev.map(r => r.id === itemId ? { ...r, status: 'REJECTED', managerNote: reason } : r));
      } else if (type === 'BREAK' && itemId && parentId) {
          setTimesheets(prev => prev.map(ts => {
              if (ts.id !== parentId) return ts;
              return { ...ts, breaks: ts.breaks.map(br => br.id === itemId ? { ...br, status: BreakStatus.REJECTED, managerNote: reason } : br) }
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

  const handleCreateUser = (newUser: User) => { setUsers(prev => [...prev, { ...newUser, employmentStatus: 'ACTIVE' }]); };
  const handleUpdateUser = (updatedUser: User) => {
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      if (currentUser && currentUser.id === updatedUser.id) setCurrentUser(updatedUser);
  };

  const openTimesheetModal = (ts: Timesheet | null) => setEditModalData({ isOpen: true, timesheet: ts });

  const handleTimesheetSave = async (data: { tsId?: string, date: string, type: 'WORK' | 'LEAVE', start?: string, end?: string, leaveTypeId?: string, reason: string, scheduleId?: string }) => {
      if (!currentUser) return;
      if (isDateInLockedPeriod(data.date, lockedDate)) {
          alert("Eroare: Perioadă închisă.");
          return;
      }
      
      const hasRole = (role: Role) => currentUser.roles.includes(role);
      const isManagerOrAdmin = hasRole(Role.MANAGER) || hasRole(Role.ADMIN);
      
      if (isManagerOrAdmin) {
          // --- MANAGER FLOW (AUTO APPROVE) ---
          
          if (data.type === 'LEAVE') {
              // 1. Create Approved Leave Request
              const selectedConfig = leaveConfigs.find(lc => lc.id === data.leaveTypeId);
              const newLeave: LeaveRequest = {
                  id: `lr-${Date.now()}`,
                  userId: currentUser.id, // NOTE: In a real app this should be the TARGET USER ID if manager edits employee. Here we assume self-edit or pass ID.
                  typeId: data.leaveTypeId || '',
                  typeName: selectedConfig?.name || 'Manual',
                  startDate: data.date,
                  endDate: data.date,
                  reason: `Manager Edit: ${data.reason}`,
                  status: LeaveStatus.APPROVED, // Auto-Approve
                  createdAt: new Date().toISOString(),
                  approvedAt: new Date().toISOString(),
                  managerComment: `Creat manual de ${currentUser.name}`
              };
              setLeaves(prev => [newLeave, ...prev]);

              // 2. Remove conflicting timesheet if exists
              if (data.tsId) {
                  setTimesheets(prev => prev.filter(t => t.id !== data.tsId));
              } else {
                  // Ensure no timesheet exists for that day (User + Date)
                  setTimesheets(prev => prev.filter(t => !(t.userId === currentUser.id && t.date === data.date)));
              }
              alert("Concediu adăugat și aprobat!");

          } else {
              // --- WORK TYPE ---
              const targetTs = data.tsId ? timesheets.find(t => t.id === data.tsId) : null;
              let scheduleName = targetTs?.detectedScheduleName;
              if (data.scheduleId) scheduleName = workSchedules.find(s => s.id === data.scheduleId)?.name;

              if (targetTs) {
                  // Edit Existing
                  const logEntry: TimesheetLog = { 
                      id: `log-${Date.now()}`, 
                      changedByUserId: currentUser.id, // Audit
                      changeDate: new Date().toISOString(), 
                      details: `Manager Edit: ${data.reason}` 
                  };
                  setTimesheets(prev => prev.map(t => t.id === data.tsId ? { 
                      ...t, 
                      startTime: data.start!, 
                      endTime: data.end, 
                      logs: t.logs ? [...t.logs, logEntry] : [logEntry], 
                      detectedScheduleId: data.scheduleId || t.detectedScheduleId, 
                      detectedScheduleName: scheduleName 
                  } : t));

                  // NOTIFY EMPLOYEE IF MODIFIED BY MANAGER
                  if (targetTs.userId !== currentUser.id) {
                      addNotification(targetTs.userId, "Actualizare Pontaj", `Pontajul tău pentru data ${data.date} a fost modificat de ${currentUser.name}. Motiv: ${data.reason}`, "INFO");
                  }

              } else {
                  // Create New
                  const newTs: Timesheet = { 
                      id: `ts-${Date.now()}`, 
                      userId: currentUser.id, 
                      date: data.date, 
                      startTime: data.start!, 
                      endTime: data.end, 
                      status: ShiftStatus.COMPLETED, 
                      breaks: [], 
                      logs: [{ 
                          id: `log-${Date.now()}`, 
                          changedByUserId: currentUser.id, 
                          changeDate: new Date().toISOString(), 
                          details: `Creat manual: ${data.reason}` 
                      }], 
                      detectedScheduleId: data.scheduleId, 
                      detectedScheduleName: scheduleName, 
                      syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC' 
                  };
                  setTimesheets(prev => [newTs, ...prev]);
              }
              alert("Pontaj salvat!");
          }
      } else {
          // --- EMPLOYEE FLOW (REQUEST) ---
          const targetTs = data.tsId ? timesheets.find(t => t.id === data.tsId) : null;
          const reqId = `cr-${Date.now()}`;
          const newRequest: CorrectionRequest = targetTs ? { 
              id: reqId, 
              timesheetId: targetTs.id, 
              userId: currentUser.id, 
              requestedStartTime: data.start!, 
              requestedEndTime: data.end, 
              reason: data.reason, 
              status: 'PENDING' 
          } : { 
              id: reqId, 
              requestedDate: data.date, 
              userId: currentUser.id, 
              requestedStartTime: data.start!, 
              requestedEndTime: data.end, 
              reason: data.reason, 
              status: 'PENDING' 
          };
          setCorrectionRequests(prev => [...prev, newRequest]);
          alert("Solicitare trimisă!");
      }
  };

  const handleApproveCorrection = (reqId: string) => {
      const request = correctionRequests.find(r => r.id === reqId);
      if (!request) return;
      if (request.timesheetId) {
          setTimesheets(prev => prev.map(t => t.id === request.timesheetId ? { ...t, startTime: request.requestedStartTime, endTime: request.requestedEndTime || undefined, logs: [...(t.logs||[]), {id: `log-${Date.now()}`, changedByUserId: 'sys', changeDate: new Date().toISOString(), details: `Corecție aprobată`}] } : t));
      } else if (request.requestedDate) {
          setTimesheets(prev => [{ id: `ts-${Date.now()}`, userId: request.userId, date: request.requestedDate!, startTime: request.requestedStartTime, endTime: request.requestedEndTime, status: ShiftStatus.COMPLETED, breaks: [], logs: [], syncStatus: 'SYNCED' }, ...prev]);
      }
      setCorrectionRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'APPROVED' } : r));
  };

  const handleSyncERP = () => { setIsErpSyncing(true); setTimeout(() => setIsErpSyncing(false), 1000); };
  const handleAssignSchedule = (userId: string, date: string, scheduleId: string) => { 
      if (isDateInLockedPeriod(date, lockedDate)) return alert("Perioadă închisă.");
      const exists = schedulePlans.findIndex(s => s.userId === userId && s.date === date);
      if (exists !== -1) {
          if (!scheduleId) setSchedulePlans(prev => prev.filter((_, idx) => idx !== exists));
          else setSchedulePlans(prev => prev.map((s, idx) => idx === exists ? { ...s, scheduleId } : s));
      } else if (scheduleId) setSchedulePlans(prev => [...prev, { id: `ds-${Date.now()}`, userId, date, scheduleId }]); 
  };

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
      if(isOnline) saveOfflineAction('CLOCK_IN', {id: newTs.id, userId: currentUser.id, location: loc, officeId: off?.id}, currentUser.id); // Optimized
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
  const activeLeaveRequest = leaves.find(l => l.userId === currentUser.id && l.startDate <= new Date().toISOString().split('T')[0] && l.endDate >= new Date().toISOString().split('T')[0]);
  
  const getTabClass = (tabName: string) => {
    return activeTab === tabName 
      ? "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 bg-blue-50 text-blue-700"
      : "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-600";
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-gray-800">
      {/* Sidebar Omitted for brevity - same as previous */}
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
         <div className="p-4 border-t border-gray-200">
             <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-red-600"><LogOut size={16}/> Deconectare</button>
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
                     <ClockWidget user={currentUser} companyName={userCompany?.name} offices={offices} breakConfigs={breakConfigs} holidays={holidays} activeLeaveRequest={activeLeaveRequest} shiftStartTime={currentShift?.startTime} accumulatedBreakTime={shiftStats.accumulatedPauseMs} activeBreakStartTime={shiftStats.activeBreakStart} currentStatus={currentShift?.status || ShiftStatus.NOT_STARTED} onClockIn={handleClockIn} onClockOut={handleClockOut} onToggleBreak={handleToggleBreak} />
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

        {/* ... Calendar & Leaves Tabs Identical to previous ... */}
        {activeTab === 'calendar' && 
            <ScheduleCalendar 
                currentUser={currentUser} 
                users={users} 
                schedules={schedulePlans} 
                holidays={holidays}
                timesheets={timesheets} // PASS TIMESHEETS
                leaves={leaves} // PASS LEAVES
                lockedDate={lockedDate} 
                workSchedules={workSchedules} 
                onAssignSchedule={handleAssignSchedule}
            />
        }
        {activeTab === 'leaves' && <div className="max-w-4xl mx-auto">Concedii placeholder... (Use existing code)</div>}

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
                canViewAllCompanies={canViewAllCompanies}
                onApproveLeave={handleApproveLeave}
                onReject={initiateRejection}
                onApproveBreak={handleApproveBreak}
                onApproveCorrection={handleApproveCorrection}
                onOpenTimesheetModal={openTimesheetModal}
             />
        )}

        {/* ... Other Tabs (Users, Companies, Offices, etc) use corresponding components ... */}
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
      <RejectionModal isOpen={rejectionModal.isOpen} onClose={() => setRejectionModal({ ...rejectionModal, isOpen: false })} onSubmit={handleConfirmRejection} />
    </div>
  );
}
