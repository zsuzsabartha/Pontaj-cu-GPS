
import React, { useState, useEffect } from 'react';
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
  INITIAL_NOTIFICATIONS
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
  Notification
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
import { Users, FileText, Settings, LogOut, CheckCircle, XCircle, BarChart3, CloudLightning, Building, Clock, UserCog, Lock, AlertOctagon, Wifi, WifiOff, Database, AlertCircle, Server, CalendarRange, Bell } from 'lucide-react';
import { generateWorkSummary } from './services/geminiService';
import { saveOfflineAction, getOfflineActions, clearOfflineActions } from './services/offlineService';

export default function App() {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- Network State ---
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isBackendOnline, setIsBackendOnline] = useState(true); // Simulated Backend Status
  const [isSyncingData, setIsSyncingData] = useState(false);

  // --- App Data State ---
  const [users, setUsers] = useState<User[]>(MOCK_USERS); 
  const [timesheets, setTimesheets] = useState<Timesheet[]>(INITIAL_TIMESHEETS);
  const [leaves, setLeaves] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>(INITIAL_CORRECTION_REQUESTS);
  const [schedulePlans, setSchedulePlans] = useState<DailySchedule[]>(INITIAL_SCHEDULE_PLANS);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  
  // --- Configuration State (Nomenclatoare) ---
  const [breakConfigs, setBreakConfigs] = useState<BreakConfig[]>(INITIAL_BREAK_CONFIGS);
  const [leaveConfigs, setLeaveConfigs] = useState<LeaveConfig[]>(INITIAL_LEAVE_CONFIGS);

  // Office Management State
  const [offices, setOffices] = useState<Office[]>(MOCK_OFFICES);
  const [departments, setDepartments] = useState<Department[]>(MOCK_DEPARTMENTS);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'leaves' | 'offices' | 'users' | 'nomenclator' | 'backend' | 'calendar' | 'notifications'>('dashboard');
  const [isLeaveModalOpen, setLeaveModalOpen] = useState(false);
  
  // Edit Timesheet State
  const [editingTimesheet, setEditingTimesheet] = useState<Timesheet | null>(null);
  
  // Rejection Modal State
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    type: 'LEAVE' | 'CORRECTION' | 'BREAK' | null;
    itemId: string | null;
    parentId?: string; // For breaks (timesheetId)
  }>({ isOpen: false, type: null, itemId: null });

  // Current active timesheet for the user
  const [currentShift, setCurrentShift] = useState<Timesheet | null>(null);

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

    // Simulate Backend Health Check
    const backendCheckInterval = setInterval(() => {
        setIsBackendOnline(navigator.onLine); 
    }, 5000);

    // Run Logic Checks (Absenteeism, Clock Out Warnings)
    runBackgroundChecks();
    // Run Automatic Status Sync (New Feature)
    runEmploymentStatusSync();

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(backendCheckInterval);
    };
  }, []); // Run once on mount

  // --- BACKGROUND LOGIC (Simulates Backend Jobs) ---
  const runBackgroundChecks = () => {
     console.log("Running background checks...");
     const now = new Date();
     const todayStr = now.toISOString().split('T')[0];
     const currentHour = now.getHours();

     // Identify HR users for notifications
     const hrUsers = users.filter(u => u.roles.includes(Role.HR));

     // 1. Check for Absenteeism (Managers + HR)
     // Rule: If workday, not holiday, no leave, no clock-in by Threshold Hour -> Alert Manager & HR
     if (currentHour >= APP_CONFIG.startWorkHourThreshold) {
         users.forEach(u => {
             // Only check Active employees
             if (u.roles.includes(Role.EMPLOYEE) && u.employmentStatus === 'ACTIVE') {
                 const hasClockIn = timesheets.some(t => t.userId === u.id && t.date === todayStr);
                 const hasLeave = leaves.some(l => l.userId === u.id && l.status === LeaveStatus.APPROVED && l.startDate <= todayStr && l.endDate >= todayStr);
                 const isHoliday = HOLIDAYS_RO.includes(todayStr);

                 if (!hasClockIn && !hasLeave && !isHoliday) {
                     // Check if notification already exists to avoid dupes
                     const alertExists = notifications.some(n => n.type === 'ALERT' && n.title === 'Absență Detectată' && n.message.includes(u.name));
                     
                     if (!alertExists) {
                         const dept = departments.find(d => d.id === u.departmentId);
                         
                         // Notify Direct Manager
                         if (dept && dept.managerId) {
                             addNotification(dept.managerId, 'Absență Detectată', `Angajatul ${u.name} nu s-a pontat azi și nu are cerere de concediu.`, 'ALERT');
                         }

                         // Notify HR (Requirement)
                         hrUsers.forEach(hr => {
                             addNotification(hr.id, 'Absență Detectată', `Angajatul ${u.name} (Dep: ${dept?.name || 'N/A'}) nu s-a pontat astăzi.`, 'ALERT');
                         });
                     }
                 }
             }
         });
     }

     // 2. Check for Forgotten Clock Out (User Only)
     // Rule: If status is WORKING and (CurrentTime > ShiftStart + ScheduleDuration + X hours)
     timesheets.filter(t => t.status === ShiftStatus.WORKING).forEach(t => {
         const startTime = new Date(t.startTime);
         // Assume 8 hours shift + alert buffer
         const alertThreshold = new Date(startTime.getTime() + (8 + APP_CONFIG.autoClockOutAlertHours) * 60 * 60 * 1000);
         
         if (now > alertThreshold) {
             const alertExists = notifications.some(n => n.userId === t.userId && n.title === 'Ai uitat să te pontezi?');
             if(!alertExists) {
                 addNotification(t.userId, 'Ai uitat să te pontezi?', `Au trecut peste ${APP_CONFIG.autoClockOutAlertHours} ore de la terminarea programului estimat. Te rugăm să faci Clock Out.`, 'ALERT');
             }
         }
     });
  };

  // --- AUTOMATED STATUS SYNC (Simulated ERP Job) ---
  const runEmploymentStatusSync = () => {
      console.log("[Auto-Job] Running Employment Status Synchronization...");
      const hrUsers = users.filter(u => u.roles.includes(Role.HR));
      let updatedCount = 0;

      // Mock Rule: specific dummy users or logic to auto-suspend
      // E.g., if a user is validated but has never logged in (and is not new)
      
      setUsers(prevUsers => prevUsers.map(u => {
          // Skip if already not active
          if (u.employmentStatus !== 'ACTIVE') return u;

          // Logic: If user is Validated, but has NO lastLoginDate, and wasn't created "just now" (mock logic: check ID length or specific ID)
          // For demo purposes, we will target 'u3' (Mihai Radu) who has undefined lastLoginDate in constants.
          if (u.isValidated && !u.lastLoginDate && u.id === 'u3') {
              console.log(`[Auto-Job] Flagging user ${u.name} as SUSPENDED due to inactivity.`);
              updatedCount++;
              
              // Notify HR about the automated status change
              hrUsers.forEach(hr => {
                  addNotification(
                      hr.id, 
                      'Status Actualizat Automat', 
                      `Angajatul ${u.name} a fost marcat ca SUSPENDAT de procesul automat (Inactivitate > 30 zile).`, 
                      'INFO'
                  );
              });

              return { ...u, employmentStatus: 'SUSPENDED' };
          }
          return u;
      }));

      if (updatedCount > 0) {
          console.log(`[Auto-Job] Suspended ${updatedCount} inactive users.`);
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
    if (!currentUser) return;
    const active = timesheets.find(t => t.userId === currentUser.id && t.status !== ShiftStatus.COMPLETED);
    if (active) setCurrentShift(active);
    else setCurrentShift(null);
  }, [currentUser, timesheets]);

  // --- Helper: Schedule Detection Logic ---
  const detectBestSchedule = (userId: string, startTime: string, endTime: string): WorkSchedule | undefined => {
      const user = users.find(u => u.id === userId);
      if(!user || !user.allowedScheduleIds) return undefined;

      // Check if there is a specific planned schedule for today
      const startDateStr = new Date(startTime).toISOString().split('T')[0];
      const dailyPlan = schedulePlans.find(p => p.userId === userId && p.date === startDateStr);
      
      if (dailyPlan) {
          return MOCK_SCHEDULES.find(s => s.id === dailyPlan.scheduleId);
      }

      // Fallback to auto-detection logic
      const userSchedules = MOCK_SCHEDULES.filter(s => user.allowedScheduleIds.includes(s.id));
      if(userSchedules.length === 0) return undefined;

      const getMinutes = (isoString: string) => {
          const d = new Date(isoString);
          return d.getHours() * 60 + d.getMinutes();
      };
      
      const actualStartMins = getMinutes(startTime);
      const actualEndMins = getMinutes(endTime);

      const parseSchedTime = (timeStr: string) => {
          const [h, m] = timeStr.split(':').map(Number);
          return h * 60 + m;
      };

      let bestMatch: WorkSchedule | undefined = undefined;
      let minDiff = Infinity;

      for (const schedule of userSchedules) {
          const schedStartMins = parseSchedTime(schedule.startTime);
          let schedEndMins = parseSchedTime(schedule.endTime);

          if (schedule.crossesMidnight) {
              schedEndMins += 24 * 60; 
          }

          let effectiveActualEnd = actualEndMins;
          if (effectiveActualEnd < actualStartMins) {
              effectiveActualEnd += 24 * 60; 
          }

          const startDiff = Math.abs(actualStartMins - schedStartMins);
          const endDiff = Math.abs(effectiveActualEnd - schedEndMins);
          const totalDiff = startDiff + endDiff;

          if (totalDiff < minDiff) {
              minDiff = totalDiff;
              bestMatch = schedule;
          }
      }

      return bestMatch;
  };

  // --- Handlers ---

  const handleLogin = (user: User, isNewUser?: boolean) => {
      // Check if suspended
      if (user.employmentStatus === 'SUSPENDED' || user.employmentStatus === 'TERMINATED') {
          alert("Contul dumneavoastră este suspendat sau inactiv. Vă rugăm contactați HR.");
          return;
      }

      // Update last login date
      const loggedUser = { ...user, lastLoginDate: new Date().toISOString() };
      
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
      setCurrentShift(null);
  };

  const handlePinResetRequest = (email: string) => {
      const targetUser = users.find(u => u.email === email);
      if (targetUser) {
          const dept = departments.find(d => d.id === targetUser.departmentId);
          if (dept && dept.managerId) {
               addNotification(dept.managerId, 'Resetare PIN Solicitată', `Angajatul ${targetUser.name} (${email}) a solicitat resetarea PIN-ului.`, 'INFO');
          } else {
              // Fallback to admin
              const admin = users.find(u => u.roles.includes(Role.ADMIN));
              if(admin) addNotification(admin.id, 'Resetare PIN Solicitată', `Angajatul ${targetUser.name} a solicitat resetare PIN.`, 'INFO');
          }
      }
  };

  // --- Rejection Logic ---
  
  const initiateRejection = (type: 'LEAVE' | 'CORRECTION' | 'BREAK', itemId: string, parentId?: string) => {
      setRejectionModal({ isOpen: true, type, itemId, parentId });
  };

  const handleConfirmRejection = (reason: string) => {
      const { type, itemId, parentId } = rejectionModal;
      
      if (type === 'LEAVE' && itemId) {
          setLeaves(prev => prev.map(l => l.id === itemId ? { ...l, status: LeaveStatus.REJECTED, managerComment: reason } : l));
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


  // --- User Management Handlers ---

  const handleValidateUser = (userId: string) => {
      const newPin = Math.floor(1000 + Math.random() * 9000).toString();
      setUsers(prev => prev.map(u => {
          if (u.id === userId) {
              const updated = { 
                  ...u, 
                  isValidated: true, 
                  pin: newPin,
                  employmentStatus: 'ACTIVE' // Explicitly set active on validation
              };
              alert(`Utilizator ${u.name} validat!\nEmail trimis către ${u.email} cu PIN-ul: ${newPin}`);
              return updated as User;
          }
          return u;
      }));
  };

  const handleCreateUser = (newUser: User) => {
      // Ensure status is set
      const userWithStatus = { ...newUser, employmentStatus: 'ACTIVE' as const };
      setUsers(prev => [...prev, userWithStatus]);
  };

  // --- Timesheet Correction & Edit Logic ---

  const handleEditTimesheetRequest = (ts: Timesheet) => {
      setEditingTimesheet(ts);
  };

  const saveTimesheetEdit = (tsId: string, newStart: string, newEnd: string, reason: string, scheduleId?: string) => {
      if (!currentUser) return;
      const targetTs = timesheets.find(t => t.id === tsId);
      if(!targetTs) return;

      const hasRole = (role: Role) => currentUser.roles.includes(role);
      const isManagerOrAdmin = hasRole(Role.MANAGER) || hasRole(Role.ADMIN);
      const isDirectEdit = isManagerOrAdmin;

      // --- CONFIGURATION VALIDATION (Correction Limits) ---
      if (!isDirectEdit) {
          const tsDate = new Date(targetTs.date);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - tsDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Rule 1: Max correction days
          if (diffDays > APP_CONFIG.maxCorrectionDays) {
              alert(`Eroare: Nu puteți solicita corecții pentru pontaje mai vechi de ${APP_CONFIG.maxCorrectionDays} zile.`);
              return;
          }

          // Rule 2: Month Cutoff
          // If the ts is from a previous month, check if current date is after cutoff
          const isPreviousMonth = tsDate.getMonth() < now.getMonth() || tsDate.getFullYear() < now.getFullYear();
          if (isPreviousMonth && now.getDate() > APP_CONFIG.monthCutoffDay) {
              alert(`Eroare: Perioada de pontaj pentru luna anterioară a fost închisă (Limită: ziua ${APP_CONFIG.monthCutoffDay}).`);
              return;
          }
      }

      // Find schedule name if ID is provided (Admin override)
      let scheduleName = targetTs.detectedScheduleName;
      if (scheduleId) {
          const sch = MOCK_SCHEDULES.find(s => s.id === scheduleId);
          if(sch) scheduleName = sch.name;
      }

      if (isDirectEdit) {
          const oldStart = new Date(targetTs.startTime).toLocaleTimeString();
          const oldEnd = targetTs.endTime ? new Date(targetTs.endTime).toLocaleTimeString() : 'N/A';
          const nStart = new Date(newStart).toLocaleTimeString();
          const nEnd = newEnd ? new Date(newEnd).toLocaleTimeString() : 'N/A';

          const logEntry: TimesheetLog = {
              id: `log-${Date.now()}`,
              changedByUserId: currentUser.id,
              changeDate: new Date().toISOString(),
              details: `Modificat interval: ${oldStart}-${oldEnd} -> ${nStart}-${nEnd}. Motiv: ${reason}`
          };

          setTimesheets(prev => prev.map(t => {
              if (t.id === tsId) {
                  return {
                      ...t,
                      startTime: newStart,
                      endTime: newEnd ? newEnd : undefined,
                      logs: t.logs ? [...t.logs, logEntry] : [logEntry],
                      syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC',
                      detectedScheduleId: scheduleId || t.detectedScheduleId,
                      detectedScheduleName: scheduleName
                  };
              }
              return t;
          }));
          alert("Modificare salvată cu succes!");
      } else {
          const newRequest: CorrectionRequest = {
              id: `cr-${Date.now()}`,
              timesheetId: tsId,
              userId: currentUser.id,
              requestedStartTime: newStart,
              requestedEndTime: newEnd,
              reason: reason,
              status: 'PENDING'
          };
          setCorrectionRequests(prev => [...prev, newRequest]);
          alert("Solicitare trimisă către manager!");
      }
  };

  const handleApproveCorrection = (reqId: string) => {
      const request = correctionRequests.find(r => r.id === reqId);
      if (!request) return;

      setTimesheets(prev => prev.map(t => {
          if (t.id === request.timesheetId) {
              const logEntry: TimesheetLog = {
                  id: `log-${Date.now()}`,
                  changedByUserId: currentUser?.id || 'system',
                  changeDate: new Date().toISOString(),
                  details: `Aprobat corecție (User: ${request.reason})`
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

      setCorrectionRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'APPROVED' } : r));
  };


  // --- Clock/Leaves Handlers ---

  const handleClockIn = (location: Coordinates, office: Office | null, dist: number) => {
    if (!currentUser) return;
    const now = new Date();
    const isHoliday = HOLIDAYS_RO.includes(now.toISOString().split('T')[0]);

    const newShift: Timesheet = {
      id: `ts-${Date.now()}`,
      userId: currentUser.id,
      startTime: now.toISOString(),
      date: now.toISOString().split('T')[0],
      breaks: [],
      startLocation: location,
      matchedOfficeId: office?.id,
      distanceToOffice: dist,
      status: ShiftStatus.WORKING,
      isHoliday,
      logs: [],
      syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
    };

    if (!isOnline) {
        saveOfflineAction('CLOCK_IN', newShift, currentUser.id);
    }

    setTimesheets(prev => [newShift, ...prev]);
  };

  const handleClockOut = (location: Coordinates) => {
    if (!currentShift || !currentUser) return;
    
    const endTime = new Date().toISOString();
    
    // Detect schedule based on Clock In and Clock Out (with Planning Override)
    const detectedSchedule = detectBestSchedule(currentUser.id, currentShift.startTime, endTime);

    const updatedShift: Timesheet = {
      ...currentShift,
      endTime: endTime,
      endLocation: location,
      status: ShiftStatus.COMPLETED,
      syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC',
      detectedScheduleId: detectedSchedule?.id,
      detectedScheduleName: detectedSchedule?.name
    };

    if (!isOnline) {
        saveOfflineAction('CLOCK_OUT', { 
            timesheetId: currentShift.id, 
            endTime: updatedShift.endTime, 
            endLocation: location 
        }, currentUser.id);
    }

    setTimesheets(prev => prev.map(t => t.id === currentShift.id ? updatedShift : t));
  };

  const handleToggleBreak = (config?: BreakConfig, location?: Coordinates, dist?: number) => {
    if (!currentShift) return;
    let updatedShift = { ...currentShift, syncStatus: isOnline ? 'SYNCED' as const : 'PENDING_SYNC' as const };
    const now = new Date().toISOString();

    if (currentShift.status === ShiftStatus.WORKING && config && location) {
      const newBreak = { 
        id: `br-${Date.now()}`,
        typeId: config.id,
        typeName: config.name,
        startTime: now,
        status: BreakStatus.PENDING,
        startLocation: location,
        startDistanceToOffice: dist
      };
      
      updatedShift.status = ShiftStatus.ON_BREAK;
      updatedShift.breaks = [...updatedShift.breaks, newBreak];

      if(!isOnline && currentUser) {
          saveOfflineAction('START_BREAK', { timesheetId: currentShift.id, break: newBreak }, currentUser.id);
      }

    } else if (currentShift.status === ShiftStatus.ON_BREAK) {
      updatedShift.status = ShiftStatus.WORKING;
      const lastBreakIndex = updatedShift.breaks.length - 1;
      if (lastBreakIndex >= 0) {
        updatedShift.breaks[lastBreakIndex].endTime = now;
        if(location) updatedShift.breaks[lastBreakIndex].endLocation = location;
        if(dist !== undefined) updatedShift.breaks[lastBreakIndex].endDistanceToOffice = dist;

        if(!isOnline && currentUser) {
            saveOfflineAction('END_BREAK', { 
                timesheetId: currentShift.id, 
                breakId: updatedShift.breaks[lastBreakIndex].id, 
                endTime: now,
                endLocation: location
            }, currentUser.id);
        }
      }
    }
    
    setTimesheets(prev => prev.map(t => t.id === currentShift.id ? updatedShift : t));
  };

  const handleApproveBreak = (timesheetId: string, breakId: string, status: BreakStatus) => {
      setTimesheets(prev => prev.map(ts => {
          if (ts.id !== timesheetId) return ts;
          return {
              ...ts,
              breaks: ts.breaks.map(br => br.id === breakId ? { ...br, status } : br)
          }
      }));
  }

  const handleLeaveSubmit = (req: Omit<LeaveRequest, 'id' | 'status' | 'userId'>) => {
    if (!currentUser) return;
    const newReq: LeaveRequest = {
        ...req,
        id: `lr-${Date.now()}`,
        userId: currentUser.id,
        status: LeaveStatus.PENDING
    };
    setLeaves(prev => [newReq, ...prev]);
  };

  const handleApproveLeave = (id: string) => {
      setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: LeaveStatus.APPROVED } : l));
  };

  const handleSyncERP = () => {
      setIsErpSyncing(true);
      setTimeout(() => {
          setIsErpSyncing(false);
          alert("Datele au fost transmise cu succes către ERP-ul companiei.");
      }, 1500);
  };

  const handleGenerateAISummary = async () => {
      if (!currentUser) return;
      setAiSummary("Se calculează...");
      const userSheets = timesheets.filter(t => t.userId === currentUser.id);
      // Now uses hardcoded deterministic service
      const summary = await generateWorkSummary(userSheets, currentUser);
      setAiSummary(summary);
  }

  const handleAssignSchedule = (userId: string, date: string, scheduleId: string) => {
      setSchedulePlans(prev => {
          // Remove existing plan for that day if any
          const filtered = prev.filter(p => !(p.userId === userId && p.date === date));
          // Add new plan
          return [...filtered, { id: `ds-${Date.now()}`, userId, date, scheduleId }];
      });
  };
  
  const handleAddOffice = (office: Office) => {
      setOffices(prev => [...prev, office]);
  };

  const handleDeleteOffice = (id: string) => {
      if (confirm('Sigur doriți să ștergeți acest sediu?')) {
          setOffices(prev => prev.filter(o => o.id !== id));
      }
  };

  // --- Render Helpers ---

  if (!currentUser) {
      return <LoginScreen users={users} onLogin={handleLogin} onRequestPinReset={handlePinResetRequest} />;
  }

  if (!currentUser.isValidated) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center">
                      <Lock size={32} />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-800">Cont în Așteptare</h1>
                  <p className="text-gray-600">
                      Bună, {currentUser.name}! Contul tău Microsoft a fost creat, dar necesită validarea unui administrator pentru a putea ponta.
                  </p>
                  <button onClick={handleLogout} className="mt-4 text-blue-600 font-medium hover:underline flex items-center justify-center gap-2 w-full">
                     <LogOut size={16}/> Deconectare
                  </button>
              </div>
          </div>
      )
  }

  const myLeaves = leaves.filter(l => l.userId === currentUser.id);
  const myTimesheets = timesheets.filter(t => t.userId === currentUser.id);
  const pendingLeaves = leaves.filter(l => l.status === LeaveStatus.PENDING);
  const pendingCorrections = correctionRequests.filter(r => r.status === 'PENDING');
  const myNotifications = notifications.filter(n => n.userId === currentUser.id && !n.isRead);

  const hasRole = (role: Role) => currentUser.roles.includes(role);
  const canViewTeam = hasRole(Role.MANAGER) || hasRole(Role.HR) || hasRole(Role.ADMIN);
  const canManageUsers = hasRole(Role.ADMIN) || hasRole(Role.HR);
  const canManageOffices = hasRole(Role.ADMIN) || hasRole(Role.MANAGER);
  const isAdmin = hasRole(Role.ADMIN);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-gray-800">
      
      {!isOnline && (
          <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-white text-center text-sm py-2 z-50 flex justify-center items-center gap-2">
              <WifiOff size={16} /> Mod Offline activ. Datele se vor salva local și se vor sincroniza la revenirea conexiunii.
          </div>
      )}
      {isSyncingData && (
          <div className="fixed bottom-0 left-0 right-0 bg-green-600 text-white text-center text-sm py-2 z-50 flex justify-center items-center gap-2 animate-pulse">
              <Database size={16} /> Se sincronizează datele cu baza de date SQL...
          </div>
      )}

      {/* --- Sidebar --- */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col sticky top-0 md:h-screen z-10">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
           <span className="font-bold text-xl tracking-tight text-gray-900">PontajGroup</span>
        </div>
        
        {/* Connectivity LEDs */}
        <div className="px-6 py-3 border-b border-gray-100 flex gap-4 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            <div className="flex items-center gap-1.5" title="Conexiune Internet">
                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></div>
                NET
            </div>
            <div className="flex items-center gap-1.5" title="Conexiune Backend API">
                <div className={`w-2.5 h-2.5 rounded-full ${isBackendOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></div>
                API
            </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
           
           {/* Birthday Widget integrated here for visibility */}
           <BirthdayWidget users={users} currentUser={currentUser} />

           <button onClick={() => setActiveTab('notifications')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors relative ${activeTab === 'notifications' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
             <Bell size={18} /> Notificări
             {myNotifications.length > 0 && (
                 <span className="absolute right-4 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                     {myNotifications.length}
                 </span>
             )}
           </button>

           <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
             <Clock size={18} /> Pontaj
           </button>
           <button onClick={() => setActiveTab('calendar')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'calendar' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
             <CalendarRange size={18} /> Program Lucru
           </button>
           <button onClick={() => setActiveTab('leaves')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'leaves' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
             <Settings size={18} /> Cereri Concediu
           </button>
           {canViewTeam && (
                <button onClick={() => setActiveTab('team')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'team' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Users size={18} /> Echipa Mea
                </button>
           )}
            {canManageUsers && (
                <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <UserCog size={18} /> Administrare Useri
                </button>
            )}
            {canManageOffices && (
                <button onClick={() => setActiveTab('offices')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'offices' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Building size={18} /> Sedii & Locații
                </button>
            )}
            {isAdmin && (
                <>
                  <button onClick={() => setActiveTab('nomenclator')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'nomenclator' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <FileText size={18} /> Nomenclatoare
                  </button>
                  <button onClick={() => setActiveTab('backend')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'backend' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <Server size={18} /> Backend Panel
                  </button>
                </>
            )}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-gray-100">
           <div className="flex items-center gap-3">
               <img src={currentUser.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full border border-gray-200" />
               <div className="flex-1 min-w-0">
                   <p className="text-sm font-medium text-gray-900 truncate">{currentUser.name}</p>
                   <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span className="truncate">{currentUser.roles.join(', ')}</span>
                        {isOnline ? <Wifi size={10} className="text-green-500"/> : <WifiOff size={10} className="text-yellow-500"/>}
                   </div>
               </div>
               <button onClick={handleLogout} title="Deconectare">
                 <LogOut size={16} className="text-gray-400 cursor-pointer hover:text-red-500"/>
               </button>
           </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        
        {/* --- DASHBOARD / PONTAJ --- */}
        {activeTab === 'dashboard' && (
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Pontaj</h1>
                    {(hasRole(Role.MANAGER) || hasRole(Role.ADMIN)) && (
                         <button 
                            onClick={handleSyncERP}
                            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-slate-900 transition"
                         >
                             <CloudLightning size={16} className={isErpSyncing ? "animate-spin" : ""}/> 
                             {isErpSyncing ? 'Se trimite...' : 'Sync ERP'}
                         </button>
                    )}
                </header>

                <ClockWidget 
                    user={currentUser}
                    offices={offices}
                    breakConfigs={breakConfigs}
                    currentStatus={currentShift?.status || ShiftStatus.NOT_STARTED}
                    onClockIn={handleClockIn}
                    onClockOut={handleClockOut}
                    onToggleBreak={handleToggleBreak}
                />

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold">Sumar Activitate (Auto)</h2>
                        <button onClick={handleGenerateAISummary} className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                            <BarChart3 size={16} /> Generează
                        </button>
                    </div>
                    {aiSummary ? (
                        <div className="bg-indigo-50 p-4 rounded-lg text-sm text-indigo-900 italic border-l-4 border-indigo-400">
                            {aiSummary}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">Apasă pe "Generează" pentru a primi un rezumat statistic al activității.</p>
                    )}
                </div>

                <TimesheetList 
                    timesheets={myTimesheets} 
                    onEditTimesheet={handleEditTimesheetRequest}
                    isManagerView={false}
                />
            </div>
        )}

        {/* --- CALENDAR TAB --- */}
        {activeTab === 'calendar' && (
             <div className="max-w-4xl mx-auto space-y-6">
                <h1 className="text-2xl font-bold text-gray-800">Planificare Program</h1>
                <ScheduleCalendar 
                   currentUser={currentUser}
                   users={users}
                   schedules={schedulePlans}
                   onAssignSchedule={handleAssignSchedule}
                />
             </div>
        )}

        {/* --- NOTIFICATIONS TAB --- */}
        {activeTab === 'notifications' && (
             <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Notificări</h1>
                    <button 
                        onClick={() => setNotifications(prev => prev.map(n => ({...n, isRead: true})))}
                        className="text-sm text-blue-600 hover:underline"
                    >
                        Marchează tot ca citit
                    </button>
                </div>
                
                <div className="space-y-4">
                    {myNotifications.length === 0 && notifications.filter(n => n.userId === currentUser.id).length === 0 ? (
                        <div className="text-center p-8 text-gray-400 italic">Nu ai notificări.</div>
                    ) : (
                        notifications.filter(n => n.userId === currentUser.id).map(notif => (
                            <div key={notif.id} className={`p-4 rounded-xl shadow-sm border ${notif.isRead ? 'bg-white border-gray-100 opacity-75' : 'bg-blue-50 border-blue-200'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`mt-1 ${notif.type === 'ALERT' ? 'text-red-500' : 'text-blue-500'}`}>
                                        <Bell size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{notif.title}</h3>
                                        <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                                        <p className="text-xs text-gray-400 mt-2">{new Date(notif.date).toLocaleString('ro-RO')}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
             </div>
        )}

        {/* --- LEAVES TAB --- */}
        {activeTab === 'leaves' && (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                     <h1 className="text-2xl font-bold text-gray-800">Concedii</h1>
                     <button onClick={() => setLeaveModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-200">
                        + Cerere Nouă
                     </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                            <tr>
                                <th className="p-4 font-medium">Tip</th>
                                <th className="p-4 font-medium">Perioada</th>
                                <th className="p-4 font-medium">Motiv</th>
                                <th className="p-4 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myLeaves.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-400 italic">Nicio cerere înregistrată.</td></tr>
                            ) : (
                                myLeaves.map(leave => (
                                    <tr key={leave.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="p-4 font-medium text-gray-800">{leave.typeName}</td>
                                        <td className="p-4 text-gray-600">{leave.startDate} -> {leave.endDate}</td>
                                        <td className="p-4 text-gray-500 truncate max-w-xs">{leave.reason}</td>
                                        <td className="p-4">
                                            {leave.status === LeaveStatus.REJECTED && leave.managerComment && (
                                                <div className="text-[10px] text-red-600 mb-1 flex items-center gap-1">
                                                    <AlertCircle size={10}/> {leave.managerComment}
                                                </div>
                                            )}
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                leave.status === LeaveStatus.APPROVED ? 'bg-green-100 text-green-700' :
                                                leave.status === LeaveStatus.REJECTED ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {leave.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- ADMIN: USERS MANAGEMENT TAB --- */}
        {activeTab === 'users' && canManageUsers && (
            <div className="max-w-4xl mx-auto">
                 <h1 className="text-2xl font-bold text-gray-800 mb-6">Administrare Utilizatori</h1>
                 <AdminUserManagement 
                    users={users}
                    companies={MOCK_COMPANIES}
                    departments={departments}
                    offices={offices} // Pass offices
                    onValidateUser={handleValidateUser}
                    onCreateUser={handleCreateUser}
                 />
            </div>
        )}

        {/* --- OFFICE MANAGEMENT TAB (MANAGER/ADMIN) --- */}
        {activeTab === 'offices' && canManageOffices && (
            <div className="max-w-4xl mx-auto">
                <OfficeManagement 
                  offices={offices} 
                  companies={MOCK_COMPANIES}
                  onAdd={handleAddOffice}
                  onDelete={handleDeleteOffice}
                />
            </div>
        )}

        {/* --- NOMENCLATOR MANAGEMENT TAB (ADMIN) --- */}
        {activeTab === 'nomenclator' && isAdmin && (
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Configurare Nomenclatoare</h1>
                <NomenclatorManagement 
                    breakConfigs={breakConfigs}
                    leaveConfigs={leaveConfigs}
                    onUpdateBreaks={setBreakConfigs}
                    onUpdateLeaves={setLeaveConfigs}
                />
            </div>
        )}

        {/* --- BACKEND PANEL TAB (ADMIN) --- */}
        {activeTab === 'backend' && isAdmin && (
            <div className="max-w-5xl mx-auto">
                <BackendControlPanel />
                {/* Manual Trigger for Testing Alerts */}
                <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                    <h3 className="text-white font-bold mb-2">Executare Manuală Joburi (Test)</h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={runBackgroundChecks}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                        >
                            Verificare Absențe
                        </button>
                        <button 
                            onClick={runEmploymentStatusSync}
                            className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700"
                        >
                            Sincronizare Status (Activ/Suspendat)
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- TEAM TAB (MANAGER/HR/ADMIN) --- */}
        {activeTab === 'team' && canViewTeam && (
             <div className="max-w-4xl mx-auto space-y-8">
                 <h1 className="text-2xl font-bold text-gray-800">Management Echipă</h1>
                 
                 {/* CORRECTION REQUESTS SECTION */}
                 {pendingCorrections.length > 0 && (
                     <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2"><AlertOctagon className="text-orange-500" size={20}/> Cereri Corecție Pontaj</h3>
                        <div className="grid gap-4">
                            {pendingCorrections.map(req => {
                                const requester = users.find(u => u.id === req.userId);
                                const ts = timesheets.find(t => t.id === req.timesheetId);
                                return (
                                    <div key={req.id} className="bg-orange-50 border border-orange-200 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                 <img src={requester?.avatarUrl} className="w-6 h-6 rounded-full"/>
                                                 <span className="font-bold text-gray-900">{requester?.name}</span>
                                            </div>
                                            <p className="text-sm text-gray-800 font-medium">Data: {ts?.date}</p>
                                            <p className="text-xs text-gray-600">
                                                Dorește schimbare: <span className="line-through text-gray-400">{new Date(ts?.startTime || '').toLocaleTimeString()} - {ts?.endTime ? new Date(ts.endTime).toLocaleTimeString() : '...'}</span> 
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

                 {/* LEAVE APPROVALS */}
                 <div className="space-y-4">
                     <h3 className="text-lg font-semibold text-gray-700">Cereri Concediu în Așteptare</h3>
                     {pendingLeaves.length === 0 ? (
                         <div className="bg-white p-6 rounded-xl border border-dashed border-gray-300 text-center text-gray-400">
                             Nicio cerere de concediu.
                         </div>
                     ) : (
                         <div className="grid gap-4">
                             {pendingLeaves.map(leave => {
                                 const requester = users.find(u => u.id === leave.userId);
                                 return (
                                     <div key={leave.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                         <div>
                                             <div className="flex items-center gap-2 mb-1">
                                                 <img src={requester?.avatarUrl} className="w-6 h-6 rounded-full"/>
                                                 <span className="font-bold text-gray-900">{requester?.name}</span>
                                                 <span className="text-xs text-gray-500">vrea {leave.typeName}</span>
                                             </div>
                                             <p className="text-sm text-gray-600">{leave.startDate} - {leave.endDate}</p>
                                             <p className="text-xs text-gray-400 italic mt-1">"{leave.reason}"</p>
                                         </div>
                                         <div className="flex gap-2">
                                             <button onClick={() => handleApproveLeave(leave.id)} className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition"><CheckCircle size={20} /></button>
                                             <button onClick={() => initiateRejection('LEAVE', leave.id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"><XCircle size={20} /></button>
                                         </div>
                                     </div>
                                 )
                             })}
                         </div>
                     )}
                 </div>

                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700">Pontaje Echipă (Recente)</h3>
                    <TimesheetList 
                        timesheets={timesheets.filter(t => t.userId !== currentUser.id)} 
                        isManagerView={true} 
                        onApproveBreak={handleApproveBreak}
                        onEditTimesheet={handleEditTimesheetRequest}
                    />
                 </div>
             </div>
        )}

      </main>

      <LeaveModal 
        isOpen={isLeaveModalOpen} 
        onClose={() => setLeaveModalOpen(false)} 
        leaveConfigs={leaveConfigs}
        onSubmit={handleLeaveSubmit} 
      />
      <TimesheetEditModal isOpen={!!editingTimesheet} onClose={() => setEditingTimesheet(null)} timesheet={editingTimesheet} isManager={hasRole(Role.MANAGER) || hasRole(Role.ADMIN)} onSave={saveTimesheetEdit} />
      <RejectionModal isOpen={rejectionModal.isOpen} onClose={() => setRejectionModal({ ...rejectionModal, isOpen: false })} onSubmit={handleConfirmRejection} />
    </div>
  );
}
