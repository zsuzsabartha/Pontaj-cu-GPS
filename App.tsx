
import { useState, useEffect, useMemo } from 'react';
import ToastContainer from './components/ToastContainer';
import MobileClockScreen from './components/MobileClockScreen';
import { showToast } from './utils/toast';
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
// (BirthdayWidget unused in App.tsx)
import ScheduleCalendar from './components/ScheduleCalendar';
import CompanyManagement from './components/CompanyManagement';
import ManagerDashboard from './components/ManagerDashboard';
import LeaveCalendarReport from './components/LeaveCalendarReport';
import SmartTable, { Column } from './components/SmartTable';
import { Users, LogOut, Building, Clock, UserCog, Database, Server, CalendarRange, Bell, PlusCircle, Briefcase, LayoutList, Palmtree, Menu, X, Mail, ShieldAlert, RefreshCw, PlugZap, Sun, Moon, Smartphone } from 'lucide-react';
import { useMsal } from "@azure/msal-react";
// (findNearestOffice unused in App.tsx)
import { SQLService } from './services/sqlService';
import { toLocalDateISO, countWorkingDays, formatDateRO } from './utils/date';

import { useAuth } from './hooks/useAuth';
import { useAppData } from './hooks/useAppData';
import { useTimesheetManager } from './hooks/useTimesheetManager';
import { useTheme } from './hooks/useTheme';

export default function App() {
    // --- Auth State (server-side session; must resolve before business data is requested) ---
    const { currentUser, authChecked, handleLogin, handleLogout, hasRole, isAdmin, canViewTeam, canManageUsers } = useAuth();

    // --- Data State ---
    const {
        users, setUsers, companies, setCompanies, departments, setDepartments,
        offices, setOffices, breakConfigs, setBreakConfigs, leaveConfigs, setLeaveConfigs,
        workSchedules, setWorkSchedules, holidays, setHolidays, timesheets, setTimesheets,
        leaves, setLeaves, correctionRequests, setCorrectionRequests, schedulePlans, setSchedulePlans,
        notifications, setNotifications, lockedDate, setLockedDate, serverStatus, isGlobalLoading, setIsGlobalLoading, fetchAllData
    } = useAppData(!!currentUser);

    // --- Microsoft (MSAL) ---
    const { instance } = useMsal();

    const handleFullLogout = () => {
        handleLogout();
        if (currentUser?.authType === 'MICROSOFT') {
            const activeAccount = instance.getActiveAccount() || instance.getAllAccounts()[0];
            instance.logoutRedirect({ account: activeAccount }).catch(console.error);
        }
    };


    // --- Theme State ---
    const { theme, toggleTheme } = useTheme();

    // --- UI State ---
    const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'leaves' | 'offices' | 'users' | 'nomenclator' | 'backend' | 'calendar' | 'notifications' | 'companies'>('dashboard');
    const [dashboardView, setDashboardView] = useState<'clock' | 'history'>('clock');
    const [isLeaveModalOpen, setLeaveModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobileClockMode, setIsMobileClockMode] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'mobile') return true;
        if (params.get('mode') === 'full') return false;
        if (window.matchMedia('(display-mode: standalone)').matches) return true;
        return window.innerWidth < 768;
    });

    // Navigation filters for drill-down (Company -> Dept -> User)
    const [navFilterCompanyId, setNavFilterCompanyId] = useState<string | null>(null);
    const [navFilterDepartmentId, setNavFilterDepartmentId] = useState<string | null>(null);

    const handleNavigateToDepartments = (companyId: string) => {
        setNavFilterCompanyId(companyId);
        setActiveTab('offices');
    };

    const handleNavigateToAddUser = (companyId: string, departmentId: string) => {
        setNavFilterCompanyId(companyId);
        setNavFilterDepartmentId(departmentId);
        setActiveTab('users');
    };

    // Edit Timesheet State
    const [editModalData, setEditModalData] = useState<{
        isOpen: boolean,
        timesheet: Timesheet | null,
        targetUserId: string | null
    }>({ isOpen: false, timesheet: null, targetUserId: null });

    // Rejection/Cancellation Modal State
    const [rejectionModal, setRejectionModal] = useState<{
        isOpen: boolean;
        type: 'LEAVE' | 'CORRECTION' | 'BREAK' | 'LEAVE_CANCEL' | null;
        itemId: string | null;
        parentId?: string;
    }>({ isOpen: false, type: null, itemId: null });

    // --- Workflows & Actions ---
    const {
        handleConfirmRejection, handleClockIn, handleClockOut, handleToggleBreak,
        handleApproveCorrection, handleLeaveSubmit, handleCreateUser, handleUpdateUser,
        handleTimesheetDelete, handleTimesheetSave, handleApproveBreak, handleApproveLeave, handleAssignSchedule
    } = useTimesheetManager({
        currentUser, users, setUsers, timesheets, setTimesheets, leaves, setLeaves,
        correctionRequests, setCorrectionRequests, offices, departments, leaveConfigs, workSchedules, schedulePlans, setSchedulePlans,
        setIsGlobalLoading, fetchAllData
    });

    // --- URL Action Interceptor (for Email Links) ---
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const id = urlParams.get('id');
        if (action && id) {
            sessionStorage.setItem('pontaj_pending_action', JSON.stringify({ action, id }));
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    useEffect(() => {
        if (currentUser && leaves.length > 0) {
            const pending = sessionStorage.getItem('pontaj_pending_action');
            if (pending) {
                try {
                    const { action, id } = JSON.parse(pending);
                    const targetLeave = leaves.find(l => l.id === id);
                    
                    if (targetLeave && targetLeave.status === LeaveStatus.PENDING) {
                        const canApprove = currentUser.roles.includes(Role.ADMIN) || 
                            (currentUser.roles.includes(Role.MANAGER) && departments.some(d => d.id === users.find(u=>u.id === targetLeave.userId)?.departmentId && d.managerId === currentUser.id));
                        
                        if (canApprove) {
                            if (action === 'approveLeave') {
                                handleApproveLeave(id);
                                setTimeout(() => showToast("Cererea a fost aprobată din link!", 'success'), 500);
                            } else if (action === 'rejectLeave') {
                                // Defer to let render finish before opening modal
                                setTimeout(() => setRejectionModal({ isOpen: true, type: 'LEAVE', itemId: id }), 500);
                            }
                        } else {
                            showToast("Nu aveți permisiunea de a aproba/respinge această cerere.", 'error');
                        }
                    }
                    sessionStorage.removeItem('pontaj_pending_action');
                } catch (e) { }
            }
        }
    }, [currentUser, leaves, handleApproveLeave, departments, users]);

    // --- Derived State for Active or Today's Shift ---
    const activeOrTodayTimesheet = useMemo(() => {
        if (!currentUser) return null;

        const MAX_OPEN_SHIFT_MS = 20 * 60 * 60 * 1000;
        const active = timesheets.find((t: Timesheet) => t.userId === currentUser.id && (t.status === ShiftStatus.WORKING || t.status === ShiftStatus.ON_BREAK) && (t.date === toLocalDateISO() || (Date.now() - new Date(t.startTime).getTime()) < MAX_OPEN_SHIFT_MS));
        if (active) return active;
        const today = toLocalDateISO();


        const todayShifts = timesheets.filter((t: Timesheet) => t.userId === currentUser.id && t.date === today && t.status === ShiftStatus.COMPLETED).sort((a: Timesheet, b: Timesheet) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        return todayShifts[0] || null;
    }, [currentUser, timesheets]);

    const shiftStats = useMemo(() => {
        if (!activeOrTodayTimesheet) return { accumulatedPauseMs: 0, activeBreakStart: undefined };
        let accumulatedPauseMs = 0;
        let activeBreakStart: string | undefined = undefined;
        activeOrTodayTimesheet.breaks.forEach((b: Break) => {
            if (b.endTime && b.startTime) {
                const start = new Date(b.startTime).getTime();
                const end = new Date(b.endTime).getTime();
                if (!isNaN(start) && !isNaN(end) && end > start) accumulatedPauseMs += (end - start);
            } else if (b.startTime && !b.endTime) activeBreakStart = b.startTime;
        });
        return { accumulatedPauseMs, activeBreakStart };
    }, [activeOrTodayTimesheet]);

    // --- SERVER OFFLINE GUARD ---
    if (serverStatus === 'OFFLINE' || serverStatus === 'CONNECTING') {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
                {serverStatus === 'CONNECTING' ? (
                    <>
                        <RefreshCw size={48} className="text-emerald-500 animate-spin mb-4" />
                        <h1 className="text-2xl font-bold text-white mb-2">Conectare la Server...</h1>
                        <p className="text-gray-400">Se descarcă datele actualizate.</p>
                    </>
                ) : (
                    <>
                        <div className="bg-red-900/30 p-6 rounded-full mb-6 border-4 border-red-500/20">
                            <PlugZap size={64} className="text-red-500" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Server Indisponibil</h1>
                        <p className="text-gray-400 max-w-md mb-8">Aplicația necesită o conexiune activă la server pentru a garanta integritatea datelor.</p>

                        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 max-w-sm w-full mb-6">
                            <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
                                <span>Status Server:</span>
                                <span className="text-red-400 font-mono font-bold">OFFLINE</span>
                            </div>
                            <button onClick={fetchAllData} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded transition flex items-center justify-center gap-2">
                                <RefreshCw size={16} /> Încearcă Reconectarea
                            </button>
                        </div>

                        <button onClick={() => setActiveTab('backend')} className="text-xs text-gray-600 hover:text-gray-400 underline">Configurare Conexiune (Admin)</button>

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

    const initiateRejection = (type: 'LEAVE' | 'CORRECTION' | 'BREAK' | 'LEAVE_CANCEL', itemId: string, parentId?: string) => {
        setRejectionModal({ isOpen: true, type, itemId, parentId });
    };

    const openTimesheetModal = (ts: Timesheet | null, targetUserId?: string) => {
        setEditModalData({
            isOpen: true,
            timesheet: ts,
            targetUserId: ts ? ts.userId : (targetUserId || currentUser?.id || null)
        });
    };

    const markAsRead = (id: string) => {
        setNotifications((prev: Notification[]) => prev.map((n: Notification) => n.id === id ? { ...n, isRead: true } : n));
        SQLService.markNotificationRead(id).catch(err => console.error('Failed to mark notification read:', err));
    };

    if (!authChecked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <RefreshCw size={32} className="text-emerald-600 animate-spin" />
            </div>
        );
    }

    if (!currentUser) return <LoginScreen users={users} companies={companies} onLogin={handleLogin} />;

    const myLeaves = leaves.filter((l: LeaveRequest) => l.userId === currentUser.id).sort((a: LeaveRequest, b: LeaveRequest) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    const myTimesheets = timesheets.filter((t: Timesheet) => t.userId === currentUser.id);
    const todayLocal = toLocalDateISO();
    const activeLeaveRequest = leaves.find((l: LeaveRequest) => l.userId === currentUser.id && l.startDate <= todayLocal && l.endDate >= todayLocal && l.status === LeaveStatus.APPROVED);
    const unreadCount = notifications.filter((n: Notification) => n.userId === currentUser.id && !n.isRead).length;
    const myNotifications = notifications.filter((n: Notification) => n.userId === currentUser.id).sort((a: Notification, b: Notification) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const isPhoneScreen = typeof window !== 'undefined' && (window.innerWidth < 768 || window.matchMedia('(display-mode: standalone)').matches);
    if (isMobileClockMode || (!canViewTeam && !isAdmin && isPhoneScreen)) {
        return (
            <>
                <MobileClockScreen
                    user={currentUser}
                    companyName={companies.find(c => c.id === currentUser.companyId)?.name}
                    offices={offices}
                    breakConfigs={breakConfigs}
                    holidays={holidays}
                    activeLeaveRequest={activeLeaveRequest}
                    shiftStartTime={activeOrTodayTimesheet?.startTime}
                    shiftEndTime={activeOrTodayTimesheet?.endTime}
                    accumulatedBreakTime={shiftStats.accumulatedPauseMs}
                    activeBreakStartTime={shiftStats.activeBreakStart}
                    currentStatus={activeOrTodayTimesheet?.status || ShiftStatus.NOT_STARTED}
                    theme={theme}
                    isGlobalLoading={isGlobalLoading}
                    onClockIn={handleClockIn}
                    onClockOut={(loc, note) => handleClockOut(loc, activeOrTodayTimesheet, note)}
                    onToggleBreak={(cfg, loc) => handleToggleBreak(activeOrTodayTimesheet, cfg, loc)}
                    onRefresh={fetchAllData}
                    onToggleTheme={toggleTheme}
                    onLogout={handleFullLogout}
                    onSwitchToFullApp={() => setIsMobileClockMode(false)}
                    canSwitchToFullApp={canViewTeam || isAdmin}
                />
                <ToastContainer />
            </>
        );
    }

    // Define Columns for My Leaves Table with SmartGrid features
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
                <div className="flex flex-col">
                    <div className="text-sm font-medium text-gray-700">
                        {formatDateRO(l.startDate)} - {formatDateRO(l.endDate)}
                    </div>
                </div>
            )
        },
        {
            header: 'Zile',
            accessor: 'id',
            render: (l) => {
                const days = countWorkingDays(l.startDate, l.endDate, holidays);
                return <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{days} zile lucrătoare</span>
            }
        },
        {
            header: 'Motiv / Detalii',
            accessor: 'reason',
            filterable: true,
            render: (l) => (
                <div className="text-xs text-gray-500 max-w-xs truncate" title={l.reason}>
                    {l.reason || '-'}
                    {l.cancellationReason && <div className="text-red-500 mt-1 font-bold">Motiv Anulare: {l.cancellationReason}</div>}
                    {l.managerComment && <div className="text-emerald-500 mt-1">Notă Manager: {l.managerComment}</div>}
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
                if (l.status === LeaveStatus.APPROVED) color = 'bg-green-100 text-green-700 border-green-200';
                if (l.status === LeaveStatus.PENDING) color = 'bg-yellow-100 text-yellow-700 border-yellow-200';
                if (l.status === LeaveStatus.REJECTED) color = 'bg-red-100 text-red-700 border-red-200';
                if (l.status === LeaveStatus.CANCELLED) color = 'bg-gray-200 text-gray-500 border-gray-300 decoration-slice line-through';

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
            width: 'w-24',
            render: (l) => {
                const notConsumed = new Date(l.startDate) >= new Date(new Date().setHours(0, 0, 0, 0));
                // Allow cancellation if approved AND in future, OR if pending
                if ((l.status === LeaveStatus.APPROVED && notConsumed) || l.status === LeaveStatus.PENDING) {
                    return (
                        <button
                            onClick={() => initiateRejection('LEAVE_CANCEL', l.id)}
                            className="text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded border border-red-200 transition font-medium w-full"
                        >
                            Anulează
                        </button>
                    );
                }
                return <span className="text-gray-300 text-xs">-</span>;
            }
        }
    ];

    const getTabClass = (tabName: string) => {
        return activeTab === tabName
            ? "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 bg-emerald-50 text-emerald-700"
            : "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-600";
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 font-sans relative transition-colors duration-300">
            {/* GLOBAL LOADING OVERLAY */}
            {isGlobalLoading && (
                <div className="fixed inset-0 bg-white/70 dark:bg-black/70 z-[60] flex items-center justify-center backdrop-blur-[1px]">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl flex items-center gap-3 border border-gray-100 dark:border-gray-700">
                        <RefreshCw className="animate-spin text-emerald-600 dark:text-emerald-400" size={24} />
                        <span className="font-bold text-gray-700 dark:text-gray-300">Se procesează...</span>
                    </div>
                </div>
            )}

            <aside className={`fixed inset-y-0 left-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-30 transform transition-transform md:translate-x-0 w-64 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src="https://bioeel.ro/wp-content/themes/bioeel/images/logo.png" alt="Bioeel" className="h-6 object-contain" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                        <span className="hidden font-black text-xl tracking-tight text-emerald-600 dark:text-emerald-500">Bioeel</span>
                        <span className="font-bold text-sm tracking-tight text-emerald-600 dark:text-emerald-500 -mb-0.5">grup</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500 dark:text-gray-400"><X size={20} /></button>
                </div>
                <nav className="flex-1 p-4 overflow-y-auto">
                    <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Personal</div>
                    <div className="space-y-1 mb-6">
                        <button onClick={() => setActiveTab('dashboard')} className={getTabClass('dashboard')}><Clock size={18} /> Pontaj</button>
                        <button onClick={() => setIsMobileClockMode(true)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/20 transition-colors"><Smartphone size={16} /> Mod Mobil (Doar Pontare)</button>
                        <button onClick={() => setActiveTab('calendar')} className={getTabClass('calendar')}><CalendarRange size={18} /> Program</button>
                        <button onClick={() => setActiveTab('leaves')} className={getTabClass('leaves')}><Palmtree size={18} /> Concedii</button>
                        <button onClick={() => setActiveTab('notifications')} className={getTabClass('notifications')}>
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3"><Bell size={18} /> Notificări</div>
                                {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>}
                            </div>
                        </button>
                    </div>

                    {(canViewTeam || canManageUsers) && (
                        <>
                            <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Echipă & HR</div>
                            <div className="space-y-1 mb-6">
                                {canViewTeam && <button onClick={() => setActiveTab('team')} className={getTabClass('team')}><Users size={18} /> Echipă</button>}
                                {canManageUsers && <button onClick={() => setActiveTab('users')} className={getTabClass('users')}><UserCog size={18} /> Utilizatori</button>}
                            </div>
                        </>
                    )}

                    {isAdmin && (
                        <>
                            <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Administrare</div>
                            <div className="space-y-1">
                                <button onClick={() => setActiveTab('companies')} className={getTabClass('companies')}><Briefcase size={18} /> Companii</button>
                                <button onClick={() => setActiveTab('offices')} className={getTabClass('offices')}><Building size={18} /> Structură & Echipe</button>
                                <button onClick={() => setActiveTab('nomenclator')} className={getTabClass('nomenclator')}><Database size={18} /> Nomenclatoare</button>
                                <button onClick={() => setActiveTab('backend')} className={getTabClass('backend')}><Server size={18} /> Sistem</button>
                            </div>
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-xs flex-shrink-0">
                            {currentUser.name.charAt(0)}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase truncate">{currentUser.name}</span>
                            <span className="text-[8px] font-bold text-slate-500 uppercase truncate">
                                {currentUser.roles.map((r: string) => r.toLowerCase()).join(', ')}
                            </span>
                        </div>
                        <div className="ml-auto flex items-center gap-1.5">
                            <button onClick={fetchAllData} className="p-1 text-slate-500 hover:text-emerald-500 transition-colors" title="Reîmprospătează">
                                <RefreshCw size={12} />
                            </button>
                            <button onClick={toggleTheme} className="p-1 text-slate-500 hover:text-yellow-500 dark:hover:text-indigo-400 transition-colors" title="Schimbă tema">
                                {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
                            </button>
                            <button onClick={handleFullLogout} className="p-1 text-slate-500 hover:text-rose-500 transition-colors" title="Deconectare">
                                <LogOut size={12} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="flex-1 p-4 md:p-8 overflow-y-auto md:ml-64 bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
                <div className="md:hidden flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
                        <span className="font-bold text-xl">Bioeel Pontaj</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white rounded shadow text-gray-600"><Menu /></button>
                </div>

                {activeTab === 'dashboard' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="bg-white dark:bg-gray-900 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 flex mb-4">
                            <button onClick={() => setDashboardView('clock')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${dashboardView === 'clock' ? 'bg-emerald-600 dark:bg-emerald-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                <Clock size={18} /> <span className="hidden sm:inline">Pontaj</span>
                            </button>
                            <button onClick={() => setDashboardView('history')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${dashboardView === 'history' ? 'bg-emerald-600 dark:bg-emerald-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                <LayoutList size={18} /> Istoric
                            </button>
                        </div>

                        {dashboardView === 'clock' && (
                            <ClockWidget
                                key={currentUser.id}
                                user={currentUser}
                                companyName={companies.find(c => c.id === currentUser.companyId)?.name}
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
                                onClockOut={(loc) => handleClockOut(loc, activeOrTodayTimesheet)}
                                onToggleBreak={(cfg, loc) => handleToggleBreak(activeOrTodayTimesheet, cfg, loc)}
                            />
                        )}

                        {dashboardView === 'history' && (
                            <div className="animate-in fade-in space-y-4">
                                <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Activitate Recentă</h2>
                                    <button onClick={() => openTimesheetModal(null)} className="bg-emerald-600 dark:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-emerald-700 dark:hover:bg-emerald-500 transition shadow-sm">
                                        <PlusCircle size={18} /> Solicită Corecție
                                    </button>
                                </div>
                                <TimesheetList
                                    timesheets={myTimesheets}
                                    offices={offices}
                                    users={users}
                                    breakConfigs={breakConfigs}
                                    correctionRequests={correctionRequests} // ADDED THIS PROP
                                    onEditTimesheet={openTimesheetModal}
                                    isManagerView={false}
                                />
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
                        departments={departments}
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
                        onRefreshData={fetchAllData}
                    />
                )}

                {activeTab === 'notifications' && (
                    <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Bell className="text-emerald-600 dark:text-emerald-400" /> Notificări</h2>
                        {myNotifications.length === 0 ? (
                            <div className="text-center text-gray-400 dark:text-gray-600 py-10 flex flex-col items-center">
                                <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-full mb-3 shadow-inner"><Bell size={32} className="text-gray-300 dark:text-gray-700" /></div>
                                <p>Nu aveți notificări recente.</p>
                            </div>
                        ) : (
                            myNotifications.map(n => (
                                <div key={n.id} className={`p-4 rounded-xl border shadow-sm transition flex gap-3 ${n.isRead ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'}`}>
                                    <div className={`mt-1 p-2 rounded-full ${n.type === 'ALERT' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                                        {n.type === 'ALERT' ? <ShieldAlert size={16} /> : <Mail size={16} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className={`font-bold text-sm ${n.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>{n.title}</h4>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatDateRO(n.date)} {new Date(n.date).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{n.message}</p>
                                        {!n.isRead && (
                                            <button onClick={() => markAsRead(n.id)} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline mt-2 font-medium">Marchează citit</button>
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
                        <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Palmtree className="text-purple-600 dark:text-purple-400" /> Concediile Mele</h2>
                            <button onClick={() => setLeaveModalOpen(true)} className="bg-purple-600 dark:bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 dark:hover:bg-purple-500 transition flex items-center gap-2 shadow-sm"><PlusCircle size={18} /> Solicită</button>
                        </div>

                        <SmartTable
                            data={myLeaves}
                            columns={myLeaveColumns}
                            pageSize={10}
                            className="shadow-md"
                        />
                    </div>
                )}

                {activeTab === 'users' && <AdminUserManagement users={users} companies={companies} departments={departments} offices={offices} workSchedules={workSchedules} defaultCompanyId={navFilterCompanyId} defaultDepartmentId={navFilterDepartmentId} onValidateUser={(id) => handleUpdateUser(users.find(u => u.id === id) ? { ...users.find(u => u.id === id)!, isValidated: true } : {} as any)} onCreateUser={handleCreateUser} onUpdateUser={handleUpdateUser} onRefreshData={fetchAllData} />}
                {activeTab === 'companies' && <CompanyManagement companies={companies} users={users} departments={departments} offices={offices} onAddCompany={(c) => setCompanies(p => [...p, c])} onUpdateCompany={(c) => setCompanies(p => p.map(x => x.id === c.id ? c : x))} onDeleteCompany={(id) => setCompanies(p => p.filter(x => x.id !== id))} onNavigateToDepartments={handleNavigateToDepartments} />}
                {activeTab === 'offices' && <OfficeManagement users={users} offices={offices} departments={departments} companies={companies} filterCompanyId={navFilterCompanyId} onAddOffice={(o) => setOffices(p => [...p, o])} onUpdateOffice={(o) => setOffices(p => p.map(x => x.id === o.id ? o : x))} onDeleteOffice={(id) => setOffices(p => p.filter(x => x.id !== id))} onUpdateDepartments={setDepartments} onUpdateCompany={() => { }} onNavigateToAddUser={handleNavigateToAddUser} />}
                {activeTab === 'nomenclator' && <NomenclatorManagement breakConfigs={breakConfigs} leaveConfigs={leaveConfigs} workSchedules={workSchedules} holidays={holidays} currentLockedDate={lockedDate} onUpdateBreaks={setBreakConfigs} onUpdateLeaves={setLeaveConfigs} onUpdateSchedules={setWorkSchedules} onUpdateHolidays={setHolidays} onUpdateLockedDate={setLockedDate} />}
                {activeTab === 'backend' && <BackendControlPanel />}
            </main>

            <LeaveModal isOpen={isLeaveModalOpen} onClose={() => setLeaveModalOpen(false)} leaveConfigs={leaveConfigs} holidays={holidays} lockedDate={lockedDate} onSubmit={handleLeaveSubmit} />
            <TimesheetEditModal isOpen={editModalData.isOpen} onClose={() => setEditModalData({ isOpen: false, timesheet: null, targetUserId: null })} timesheet={editModalData.timesheet} isManager={hasRole(Role.MANAGER) || hasRole(Role.ADMIN)} lockedDate={lockedDate} leaveConfigs={leaveConfigs} workSchedules={workSchedules} onSave={(data) => handleTimesheetSave(data, editModalData.targetUserId)} onDelete={handleTimesheetDelete} />

            <RejectionModal isOpen={rejectionModal.isOpen} onClose={() => setRejectionModal({ ...rejectionModal, isOpen: false })} onSubmit={(reason) => handleConfirmRejection(rejectionModal, reason)} title={rejectionModal.type === 'LEAVE_CANCEL' ? 'Motiv Anulare' : 'Motiv Respingere'} />
            <ToastContainer />

        </div>
    );
}
