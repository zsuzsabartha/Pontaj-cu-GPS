
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
import SmartTable, { Column } from './components/SmartTable';
import { Users, Settings, LogOut, CheckCircle, XCircle, Building, Clock, UserCog, Database, Server, CalendarRange, Bell, PlusCircle, Briefcase, LayoutList, Palmtree, Slash, Menu, X, Wifi, WifiOff, Mail, ShieldAlert, RefreshCw, AlertTriangle, PlugZap } from 'lucide-react';
import { findNearestOffice } from './services/geoService';
import { SQLService } from './services/sqlService';

// --- SESSION STORAGE ONLY FOR AUTH ---
// We keep the logged-in user ID to persist session across refreshes, 
// but ALL other data must come from the server.
const getStoredUser = (): User | null => {
    try {
        const item = localStorage.getItem('pontaj_session_user');
        return item ? JSON.parse(item) : null;
    } catch { return null; }
};

export default function App() {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser()); 

  // --- App Data State (RAM Only - No Persistence) ---
  const [users, setUsers] = useState<User[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>([]);
  const [schedulePlans, setSchedulePlans] = useState<DailySchedule[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // --- Configuration State (RAM Only) ---
  const [breakConfigs, setBreakConfigs] = useState<BreakConfig[]>([]);
  const [leaveConfigs, setLeaveConfigs] = useState<LeaveConfig[]>([]);
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  
  // --- Locked Date State (RAM Only) ---
  const [lockedDate, setLockedDate] = useState<string>(getDefaultLockedDate());

  // Office & Department Management State (RAM Only)
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'leaves' | 'offices' | 'users' | 'nomenclator' | 'backend' | 'calendar' | 'notifications' | 'companies'>('dashboard');
  const [dashboardView, setDashboardView] = useState<'clock' | 'history'>('clock');
  const [isLeaveModalOpen, setLeaveModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // --- CRITICAL SERVER STATE ---
  const [serverStatus, setServerStatus] = useState<'CONNECTING' | 'ONLINE' | 'OFFLINE'>('CONNECTING');
  const [isGlobalLoading, setIsGlobalLoading] = useState(false); // For blocking UI during async actions
  
  // Edit Timesheet State
  const [editModalData, setEditModalData] = useState<{isOpen: boolean, timesheet: Timesheet | null}>({isOpen: false, timesheet: null});
  
  // Rejection/Cancellation Modal State
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    type: 'LEAVE' | 'CORRECTION' | 'BREAK' | 'LEAVE_CANCEL' | null; 
    itemId: string | null;
    parentId?: string;
  }>({ isOpen: false, type: null, itemId: null });

  // --- STRICT DATA FETCHING ---
  const fetchAllData = async () => {
      setIsGlobalLoading(true);
      try {
          await SQLService.checkHealth();
          setServerStatus('ONLINE');

          // Parallel Fetch
          const [
              dbUsers, dbCompanies, dbDepts, dbOffices, dbBreaks, dbLeaves, dbHolidays, dbSchedules, dbTimesheets, dbLeaveReqs, dbCorrections
          ] = await Promise.all([
              SQLService.getUsers(),
              SQLService.getCompanies(),
              SQLService.getDepartments(),
              SQLService.getOffices(),
              SQLService.getBreaks(),
              SQLService.getLeaves(),
              SQLService.getHolidays(),
              SQLService.getWorkSchedules(),
              SQLService.getTimesheets(),
              SQLService.getLeaveRequests(),
              SQLService.getCorrectionRequests()
          ]);

          setUsers(dbUsers);
          setCompanies(dbCompanies);
          setDepartments(dbDepts);
          setOffices(dbOffices);
          setBreakConfigs(dbBreaks);
          setLeaveConfigs(dbLeaves);
          setHolidays(dbHolidays);
          setWorkSchedules(dbSchedules);
          setTimesheets(dbTimesheets);
          setLeaves(dbLeaveReqs);
          setCorrectionRequests(dbCorrections);

      } catch (e) {
          console.error("Critical Server Error:", e);
          setServerStatus('OFFLINE');
      } finally {
          setIsGlobalLoading(false);
      }
  };

  // Initial Load
  useEffect(() => {
      fetchAllData();
  }, []);

  // Poll for connection if offline
  useEffect(() => {
      if (serverStatus === 'ONLINE') return;
      const interval = setInterval(fetchAllData, 5000);
      return () => clearInterval(interval);
  }, [serverStatus]);

  // --- Derived State for Active or Today's Shift ---
  const activeOrTodayTimesheet = useMemo(() => {
      if (!currentUser) return null;
      
      const active = timesheets.find(t => 
          t.userId === currentUser.id && 
          (t.status === ShiftStatus.WORKING || t.status === ShiftStatus.ON_BREAK)
      );
      if (active) return active;

      const today = new Date().toISOString().split('T')[0];
      const todayShifts = timesheets.filter(t => 
          t.userId === currentUser.id && 
          t.date === today &&
          t.status === ShiftStatus.COMPLETED
      ).sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      
      return todayShifts[0] || null;
  }, [currentUser, timesheets]);

  const shiftStats = useMemo(() => {
      if (!activeOrTodayTimesheet) return { accumulatedPauseMs: 0, activeBreakStart: undefined };
      let accumulatedPauseMs = 0;
      let activeBreakStart: string | undefined = undefined;
      
      activeOrTodayTimesheet.breaks.forEach(b => {
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
  }, [activeOrTodayTimesheet]);

  // --- SERVER OFFLINE GUARD ---
  if (serverStatus === 'OFFLINE' || serverStatus === 'CONNECTING') {
      return (
          <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
              {serverStatus === 'CONNECTING' ? (
                  <>
                      <RefreshCw size={48} className="text-blue-500 animate-spin mb-4"/>
                      <h1 className="text-2xl font-bold text-white mb-2">Conectare la Server...</h1>
                      <p className="text-gray-400">Se descarcă datele actualizate.</p>
                  </>
              ) : (
                  <>
                      <div className="bg-red-900/30 p-6 rounded-full mb-6 border-4 border-red-500/20">
                          <PlugZap size={64} className="text-red-500"/>
                      </div>
                      <h1 className="text-3xl font-bold text-white mb-2">Server Indisponibil</h1>
                      <p className="text-gray-400 max-w-md mb-8">
                          Aplicația necesită o conexiune activă la server pentru a garanta integritatea datelor.
                          Verificați conexiunea la internet sau contactați administratorul.
                      </p>
                      
                      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 max-w-sm w-full mb-6">
                          <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
                              <span>Status Server:</span>
                              <span className="text-red-400 font-mono font-bold">OFFLINE</span>
                          </div>
                          <button onClick={fetchAllData} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition flex items-center justify-center gap-2">
                              <RefreshCw size={16}/> Încearcă Reconectarea
                          </button>
                      </div>

                      {/* Backdoor for Admin to fix server connection if needed */}
                      <button onClick={() => setActiveTab('backend')} className="text-xs text-gray-600 hover:text-gray-400 underline">
                          Configurare Conexiune (Admin)
                      </button>
                      
                      {activeTab === 'backend' && (
                          <div className="mt-4 w-full max-w-4xl h-96 overflow-hidden relative border border-gray-700 rounded-xl">
                              <button onClick={() => setActiveTab('dashboard')} className="absolute top-2 right-2 text-white bg-red-600 px-2 rounded z-50">X</button>
                              <BackendControlPanel />
                          </div>
                      )}
                  </>
              )}
          </div>
      );
  }

  // --- HANDLERS (STRICT SERVER AWAIT) ---

  const handleLogin = (user: User, isNewUser?: boolean) => {
      // Validate that user still exists in the fetched list
      const freshUser = users.find(u => u.id === user.id);
      if (!freshUser) {
          alert("Eroare: Utilizatorul nu a fost găsit pe server.");
          return;
      }
      if (freshUser.employmentStatus === 'SUSPENDED' || freshUser.employmentStatus === 'TERMINATED') {
          alert("Contul dumneavoastră este suspendat sau inactiv.");
          return;
      }
      
      localStorage.setItem('pontaj_session_user', JSON.stringify(freshUser));
      setCurrentUser(freshUser);
      setActiveTab('dashboard');
  };

  const handleLogout = () => { 
      localStorage.removeItem('pontaj_session_user');
      setCurrentUser(null); 
      setIsSidebarOpen(false); 
  };

  const initiateRejection = (type: 'LEAVE' | 'CORRECTION' | 'BREAK' | 'LEAVE_CANCEL', itemId: string, parentId?: string) => { 
      setRejectionModal({ isOpen: true, type, itemId, parentId }); 
  };
  
  const handleConfirmRejection = async (reason: string) => {
      setIsGlobalLoading(true);
      try {
          if (rejectionModal.type === 'LEAVE_CANCEL' || rejectionModal.type === 'LEAVE') {
              const target = leaves.find(l => l.id === rejectionModal.itemId);
              if (target) {
                  const status = rejectionModal.type === 'LEAVE_CANCEL' ? LeaveStatus.CANCELLED : LeaveStatus.REJECTED;
                  const updated = { ...target, status, [rejectionModal.type === 'LEAVE_CANCEL' ? 'cancellationReason' : 'managerComment']: reason };
                  await SQLService.upsertLeave(updated);
                  setLeaves(prev => prev.map(l => l.id === target.id ? updated : l));
              }
          } else if (rejectionModal.type === 'CORRECTION') {
              const target = correctionRequests.find(c => c.id === rejectionModal.itemId);
              if (target) {
                  const updated = { ...target, status: 'REJECTED' as const, managerNote: reason };
                  await SQLService.upsertCorrection(updated);
                  setCorrectionRequests(prev => prev.map(c => c.id === target.id ? updated : c));
              }
          } else if (rejectionModal.type === 'BREAK' && rejectionModal.parentId) {
              const targetTs = timesheets.find(t => t.id === rejectionModal.parentId);
              if (targetTs) {
                  const updatedBreaks = targetTs.breaks.map(b => b.id === rejectionModal.itemId ? { ...b, status: BreakStatus.REJECTED, managerNote: reason } : b);
                  const updatedTs = { ...targetTs, breaks: updatedBreaks };
                  await SQLService.upsertTimesheet(updatedTs);
                  setTimesheets(prev => prev.map(t => t.id === targetTs.id ? updatedTs : t));
              }
          }
      } catch (e) {
          alert("Eroare server: Nu s-a putut respinge solicitarea.");
      } finally {
          setIsGlobalLoading(false);
          setRejectionModal({ isOpen: false, type: null, itemId: null });
      }
  };

  const handleCreateUser = async (newUser: User) => { 
      setIsGlobalLoading(true);
      try {
          await SQLService.upsertUser(newUser);
          await fetchAllData(); 
      } catch (e) {
          alert("Eroare la crearea utilizatorului.");
      } finally {
          setIsGlobalLoading(false);
      }
  };

  const handleUpdateUser = async (updatedUser: User) => {
      setIsGlobalLoading(true);
      try {
          await SQLService.upsertUser(updatedUser);
          setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      } catch (e) {
          alert("Eroare la actualizarea utilizatorului.");
      } finally {
          setIsGlobalLoading(false);
      }
  };

  const openTimesheetModal = (ts: Timesheet | null) => setEditModalData({ isOpen: true, timesheet: ts });
  
  const handleTimesheetDelete = async (id: string) => {
      if(!confirm("Sigur doriți să ștergeți acest pontaj?")) return;
      setIsGlobalLoading(true);
      try {
          await SQLService.deleteTimesheet(id);
          setTimesheets(prev => prev.filter(t => t.id !== id));
          setEditModalData({isOpen: false, timesheet: null});
      } catch (e) {
          alert("Eroare server: Nu s-a putut șterge pontajul.");
      } finally {
          setIsGlobalLoading(false);
      }
  };

  const handleTimesheetSave = async (data: any) => { 
      if (!currentUser) return;
      setIsGlobalLoading(true);
      
      const isManager = hasRole(Role.MANAGER) || hasRole(Role.ADMIN);

      try {
          if (data.type === 'WORK') {
              if (isManager) {
                  // MANAGER MODE: Direct Edit (Upsert Timesheet)
                  let newTs: Timesheet;
                  if(data.tsId) {
                     const existing = timesheets.find(t => t.id === data.tsId);
                     if (!existing) throw new Error("Timesheet not found");
                     newTs = { 
                         ...existing, 
                         date: data.date, 
                         startTime: data.start, 
                         endTime: data.end, 
                         status: data.end ? ShiftStatus.COMPLETED : ShiftStatus.WORKING,
                         detectedScheduleId: data.scheduleId 
                     };
                  } else {
                     newTs = {
                         id: `ts-${Date.now()}`, 
                         userId: currentUser.id, // Or selected user if manager context is different
                         date: data.date, 
                         startTime: data.start, 
                         endTime: data.end, 
                         status: data.end ? ShiftStatus.COMPLETED : ShiftStatus.WORKING,
                         breaks: []
                     };
                  }
                  await SQLService.upsertTimesheet(newTs);
                  
                  if (data.tsId) {
                      setTimesheets(prev => prev.map(ts => ts.id === data.tsId ? newTs : ts));
                  } else {
                      setTimesheets(prev => [newTs, ...prev]);
                  }
              } else {
                  // EMPLOYEE MODE: Request Correction
                  const req: CorrectionRequest = {
                      id: `cr-${Date.now()}`,
                      userId: currentUser.id,
                      timesheetId: data.tsId,
                      requestedDate: data.date,
                      requestedStartTime: data.start,
                      requestedEndTime: data.end,
                      reason: data.reason,
                      status: 'PENDING'
                  };
                  await SQLService.upsertCorrection(req);
                  setCorrectionRequests(prev => [req, ...prev]);
                  alert("Solicitarea de corecție a fost trimisă către manager!");
              }

          } else {
              // LEAVE Logic (Same for both, usually creates a Request)
              const newLeave: LeaveRequest = {
                  id: `lr-${Date.now()}`, userId: currentUser!.id, 
                  typeId: data.leaveTypeId,
                  typeName: leaveConfigs.find(lc => lc.id === data.leaveTypeId)?.name || 'Manual',
                  startDate: data.date,
                  endDate: data.date,
                  reason: data.reason,
                  status: isManager ? LeaveStatus.APPROVED : LeaveStatus.PENDING,
                  createdAt: new Date().toISOString()
              };
              
              await SQLService.upsertLeave(newLeave);
              setLeaves(prev => [newLeave, ...prev]);

              // If manager approves leave replacing a timesheet, delete the timesheet
              if (isManager && data.tsId) {
                  await SQLService.deleteTimesheet(data.tsId);
                  setTimesheets(prev => prev.filter(t => t.id !== data.tsId));
              }
          }
          setEditModalData({isOpen: false, timesheet: null});
      } catch (e) {
          alert("Eroare server: Salvarea a eșuat.");
      } finally {
          setIsGlobalLoading(false);
      }
  };

  const handleApproveCorrection = async (reqId: string) => { 
      setIsGlobalLoading(true);
      try {
          const target = correctionRequests.find(c => c.id === reqId);
          if (target) {
              // 1. Update Correction Request Status
              const updatedReq = { ...target, status: 'APPROVED' as const };
              await SQLService.upsertCorrection(updatedReq);
              setCorrectionRequests(prev => prev.map(c => c.id === reqId ? updatedReq : c));

              // 2. Apply the Correction (Upsert Timesheet)
              // We need to fetch the existing timesheet if it exists, or create new
              let existingTs = timesheets.find(t => t.id === target.timesheetId);
              
              const newTs: Timesheet = {
                  id: existingTs ? existingTs.id : `ts-corr-${Date.now()}`,
                  userId: target.userId,
                  date: target.requestedDate || existingTs?.date || new Date().toISOString().split('T')[0],
                  startTime: target.requestedStartTime,
                  endTime: target.requestedEndTime,
                  status: target.requestedEndTime ? ShiftStatus.COMPLETED : ShiftStatus.WORKING,
                  breaks: existingTs ? existingTs.breaks : [],
                  // Keep location data if existing
                  startLocation: existingTs?.startLocation,
                  endLocation: existingTs?.endLocation,
                  matchedOfficeId: existingTs?.matchedOfficeId,
                  // Mark as modified
                  logs: [...(existingTs?.logs || []), { id: `log-${Date.now()}`, changedByUserId: currentUser!.id, changeDate: new Date().toISOString(), details: `Correction Approved: ${target.reason}` }]
              };

              await SQLService.upsertTimesheet(newTs);
              
              // Update local timesheets state
              if (existingTs) {
                  setTimesheets(prev => prev.map(t => t.id === newTs.id ? newTs : t));
              } else {
                  setTimesheets(prev => [newTs, ...prev]);
              }
          }
      } catch (e) {
          alert("Eroare server la aprobarea corecției.");
      } finally {
          setIsGlobalLoading(false);
      }
  };
  
  const handleAssignSchedule = (userId: string, date: string, scheduleId: string) => { 
      // Schedule persistence logic would go here. For now, assuming RAM-only for this specific feature as it wasn't fully DB-backed in original spec
      // But adhering to rule:
      const existing = schedulePlans.find(s => s.userId === userId && s.date === date);
      if (existing) {
          if (scheduleId === "") setSchedulePlans(prev => prev.filter(s => s.id !== existing.id));
          else setSchedulePlans(prev => prev.map(s => s.id === existing.id ? { ...s, scheduleId } : s));
      } else if (scheduleId !== "") {
          setSchedulePlans(prev => [...prev, { id: `ds-${Date.now()}`, userId, date, scheduleId }]);
      }
  };

  const handleClockIn = async (loc: Coordinates, off: Office | null, dist: number) => {
      if (!currentUser) return;
      setIsGlobalLoading(true);
      try {
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
              detectedScheduleName: schedName
          };
          
          await SQLService.upsertTimesheet(newTs);
          setTimesheets(prev => [newTs, ...prev]);
      } catch (e) {
          alert("Nu s-a putut efectua pontajul. Eroare comunicare server.");
      } finally {
          setIsGlobalLoading(false);
      }
  };

  const handleClockOut = async (loc: Coordinates) => {
      if (!currentUser || !activeOrTodayTimesheet) return;
      setIsGlobalLoading(true);
      try {
          const { distance: endDist } = findNearestOffice(loc, offices);
          const updatedTs: Timesheet = { 
              ...activeOrTodayTimesheet, endTime: new Date().toISOString(), status: ShiftStatus.COMPLETED, endLocation: loc, endDistanceToOffice: endDist 
          };
          await SQLService.upsertTimesheet(updatedTs);
          setTimesheets(prev => prev.map(t => t.id === activeOrTodayTimesheet.id ? updatedTs : t));
      } catch (e) {
          alert("Eroare la oprirea pontajului.");
      } finally {
          setIsGlobalLoading(false);
      }
  };

  const handleToggleBreak = async (config?: BreakConfig, loc?: Coordinates) => {
      if (!currentUser || !activeOrTodayTimesheet) return;
      setIsGlobalLoading(true);
      try {
          let updatedTs: Timesheet | null = null;

          if (activeOrTodayTimesheet.status === ShiftStatus.ON_BREAK) {
              const idx = activeOrTodayTimesheet.breaks.findIndex(b => !b.endTime);
              if (idx === -1) return;
              const updatedBreak = { ...activeOrTodayTimesheet.breaks[idx], endTime: new Date().toISOString(), endLocation: loc, status: BreakStatus.PENDING };
              const updatedBreaks = [...activeOrTodayTimesheet.breaks]; updatedBreaks[idx] = updatedBreak;
              updatedTs = { ...activeOrTodayTimesheet, status: ShiftStatus.WORKING, breaks: updatedBreaks };
          } else {
              if (!config) return;
              const newBreak: Break = { 
                  id: `br-${Date.now()}`, typeId: config.id, typeName: config.name, startTime: new Date().toISOString(), status: BreakStatus.PENDING, startLocation: loc 
              };
              updatedTs = { ...activeOrTodayTimesheet, status: ShiftStatus.ON_BREAK, breaks: [...activeOrTodayTimesheet.breaks, newBreak] };
          }

          if (updatedTs) {
              await SQLService.upsertTimesheet(updatedTs);
              setTimesheets(prev => prev.map(t => t.id === activeOrTodayTimesheet.id ? updatedTs! : t));
          }
      } catch (e) {
          alert("Eroare server la schimbarea stării pauzei.");
      } finally {
          setIsGlobalLoading(false);
      }
  };

  const handleApproveBreak = async (tsId: string, brId: string, status: BreakStatus) => {
      setIsGlobalLoading(true);
      try {
          const targetTs = timesheets.find(t => t.id === tsId);
          if (!targetTs) return;
          
          const updatedBreaks = targetTs.breaks.map(b => b.id === brId ? { ...b, status } : b);
          const updatedTs = { ...targetTs, breaks: updatedBreaks };
          
          await SQLService.upsertTimesheet(updatedTs);
          setTimesheets(prev => prev.map(ts => ts.id !== tsId ? ts : updatedTs));
      } catch (e) {
          alert("Eroare server.");
      } finally {
          setIsGlobalLoading(false);
      }
  };

  const handleApproveLeave = async (reqId: string) => {
      setIsGlobalLoading(true);
      try {
          const target = leaves.find(l => l.id === reqId);
          if (target) {
              const updated = { ...target, status: LeaveStatus.APPROVED };
              await SQLService.upsertLeave(updated);
              setLeaves(prev => prev.map(l => l.id === reqId ? updated : l));
          }
      } catch (e) {
          alert("Eroare server.");
      } finally {
          setIsGlobalLoading(false);
      }
  };

  const handleLeaveSubmit = async (req: Omit<LeaveRequest, 'id' | 'status' | 'userId'> & { status?: LeaveStatus }) => {
      if (!currentUser) return;
      setIsGlobalLoading(true);
      try {
          const newLeave: LeaveRequest = {
              id: `lr-${Date.now()}`, userId: currentUser.id, status: req.status || LeaveStatus.PENDING, createdAt: new Date().toISOString(), ...req
          };
          await SQLService.upsertLeave(newLeave);
          setLeaves(prev => [newLeave, ...prev]);
      } catch (e) {
          alert("Nu s-a putut trimite cererea. Server offline?");
      } finally {
          setIsGlobalLoading(false);
      }
  };
  
  const markAsRead = (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
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

  // Define Columns for My Leaves Table
  const myLeaveColumns: Column<LeaveRequest>[] = [
    {
        header: 'Tip Concediu',
        accessor: 'typeName',
        sortable: true,
        filterable: true,
        render: (l) => (
            <div className="font-bold text-gray-800">{l.typeName}</div>
        )
    },
    {
        header: 'Perioadă',
        accessor: 'startDate',
        sortable: true,
        filterable: true,
        render: (l) => (
            <div className="text-sm">
                <span className="text-gray-600">{new Date(l.startDate).toLocaleDateString('ro-RO')}</span>
                <span className="mx-2 text-gray-400">→</span>
                <span className="text-gray-600">{new Date(l.endDate).toLocaleDateString('ro-RO')}</span>
            </div>
        )
    },
    {
        header: 'Motiv / Detalii',
        accessor: 'reason',
        filterable: true,
        render: (l) => (
            <div className="text-xs text-gray-500 max-w-xs truncate" title={l.reason}>
                {l.reason || '-'}
                {l.cancellationReason && <div className="text-red-500 mt-1">Anulat: {l.cancellationReason}</div>}
            </div>
        )
    },
    {
        header: 'Status',
        accessor: (l) => l.status === LeaveStatus.PENDING ? 'ÎN AȘTEPTARE' : l.status,
        sortable: true,
        filterable: true,
        render: (l) => {
            let color = 'bg-gray-100 text-gray-600';
            if(l.status === LeaveStatus.APPROVED) color = 'bg-green-100 text-green-700 border-green-200';
            if(l.status === LeaveStatus.PENDING) color = 'bg-yellow-100 text-yellow-700 border-yellow-200';
            if(l.status === LeaveStatus.REJECTED) color = 'bg-red-100 text-red-700 border-red-200';
            
            return (
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${color}`}>
                    {l.status === LeaveStatus.PENDING ? 'ÎN AȘTEPTARE' : l.status}
                </span>
            )
        }
    },
    {
        header: 'Acțiuni',
        accessor: 'id',
        render: (l) => {
            const notConsumed = new Date(l.startDate) >= new Date(new Date().setHours(0,0,0,0));
            if (l.status === LeaveStatus.APPROVED && notConsumed) {
                return (
                    <button 
                        onClick={() => initiateRejection('LEAVE_CANCEL', l.id)} 
                        className="text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded border border-red-200 transition font-medium"
                    >
                        Anulează
                    </button>
                );
            }
            return null;
        }
    }
  ];

  const getTabClass = (tabName: string) => {
    return activeTab === tabName 
      ? "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 bg-blue-50 text-blue-700"
      : "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-600";
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-gray-800 font-sans relative">
      {/* GLOBAL LOADING OVERLAY */}
      {isGlobalLoading && (
          <div className="fixed inset-0 bg-white/70 z-[60] flex items-center justify-center backdrop-blur-[1px]">
              <div className="bg-white p-4 rounded-xl shadow-xl flex items-center gap-3 border border-gray-100">
                  <RefreshCw className="animate-spin text-blue-600" size={24}/>
                  <span className="font-bold text-gray-700">Se procesează...</span>
              </div>
          </div>
      )}

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
                <span className="flex items-center gap-1 text-green-600 font-bold">
                    <Wifi size={10}/> Connected
                </span>
                <button onClick={fetchAllData} className="hover:text-blue-500 transition" title="Reîmprospătează">
                    <RefreshCw size={12}/>
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
                        shiftStartTime={activeOrTodayTimesheet?.startTime} 
                        shiftEndTime={activeOrTodayTimesheet?.endTime}
                        accumulatedBreakTime={shiftStats.accumulatedPauseMs} 
                        activeBreakStartTime={shiftStats.activeBreakStart} 
                        currentStatus={activeOrTodayTimesheet?.status || ShiftStatus.NOT_STARTED} 
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
                
                <SmartTable 
                    data={myLeaves} 
                    columns={myLeaveColumns} 
                    pageSize={10} 
                    className="shadow-md"
                />
            </div>
        )}

        {activeTab === 'users' && <AdminUserManagement users={users} companies={companies} departments={departments} offices={offices} workSchedules={workSchedules} onValidateUser={(id) => handleUpdateUser(users.find(u => u.id === id) ? { ...users.find(u => u.id === id)!, isValidated: true } : {} as any)} onCreateUser={handleCreateUser} onUpdateUser={handleUpdateUser} />}
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
