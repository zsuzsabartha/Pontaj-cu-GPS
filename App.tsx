
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
import { Users, Settings, LogOut, CheckCircle, XCircle, Building, Clock, UserCog, Database, Server, CalendarRange, Bell, PlusCircle, Briefcase, LayoutList, Palmtree, Slash, Menu, X, Wifi, WifiOff, Mail, ShieldAlert, RefreshCw, AlertTriangle, PlugZap, Sun, Moon } from 'lucide-react';
import { findNearestOffice } from './services/geoService';
import { SQLService } from './services/sqlService';

import { useAuth } from './hooks/useAuth';
import { useAppData } from './hooks/useAppData';
import { useTimesheetManager } from './hooks/useTimesheetManager';
import { useTheme } from './hooks/useTheme';

export default function App() {
    // --- Data State ---
    const {
        users, setUsers, companies, setCompanies, departments, setDepartments,
        offices, setOffices, breakConfigs, setBreakConfigs, leaveConfigs, setLeaveConfigs,
        workSchedules, setWorkSchedules, holidays, setHolidays, timesheets, setTimesheets,
        leaves, setLeaves, correctionRequests, setCorrectionRequests, schedulePlans, setSchedulePlans,
        notifications, setNotifications, lockedDate, setLockedDate, serverStatus, isGlobalLoading, setIsGlobalLoading, fetchAllData
    } = useAppData();

    // --- Auth State ---
    const { currentUser, handleLogin, handleLogout, hasRole, isAdmin, canViewTeam, canManageUsers } = useAuth(users);

    // --- Theme State ---
    const { theme, toggleTheme } = useTheme();

    // --- UI State ---
    const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'leaves' | 'offices' | 'users' | 'nomenclator' | 'backend' | 'calendar' | 'notifications' | 'companies'>('dashboard');
    const [dashboardView, setDashboardView] = useState<'clock' | 'history'>('clock');
    const [isLeaveModalOpen, setLeaveModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        correctionRequests, setCorrectionRequests, offices, leaveConfigs, workSchedules, schedulePlans, setSchedulePlans,
        setIsGlobalLoading, fetchAllData
    });

    // --- Derived State for Active or Today's Shift ---
    const activeOrTodayTimesheet = useMemo(() => {
        if (!currentUser) return null;
        const active = timesheets.find((t: Timesheet) => t.userId === currentUser.id && (t.status === ShiftStatus.WORKING || t.status === ShiftStatus.ON_BREAK));
        if (active) return active;
        const today = new Date().toISOString().split('T')[0];
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
                        <RefreshCw size={48} className="text-blue-500 animate-spin mb-4" />
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
                            <button onClick={fetchAllData} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition flex items-center justify-center gap-2">
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
    };

    if (!currentUser) return <LoginScreen users={users} companies={companies} onLogin={handleLogin} />;

    const myLeaves = leaves.filter((l: LeaveRequest) => l.userId === currentUser.id).sort((a: LeaveRequest, b: LeaveRequest) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    const myTimesheets = timesheets.filter((t: Timesheet) => t.userId === currentUser.id);
    const activeLeaveRequest = leaves.find((l: LeaveRequest) => l.userId === currentUser.id && l.startDate <= new Date().toISOString().split('T')[0] && l.endDate >= new Date().toISOString().split('T')[0] && l.status === LeaveStatus.APPROVED);
    const unreadCount = notifications.filter((n: Notification) => n.userId === currentUser.id && !n.isRead).length;
    const myNotifications = notifications.filter((n: Notification) => n.userId === currentUser.id).sort((a: Notification, b: Notification) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
                        {new Date(l.startDate).toLocaleDateString('ro-RO')} - {new Date(l.endDate).toLocaleDateString('ro-RO')}
                    </div>
                </div>
            )
        },
        {
            header: 'Zile',
            accessor: 'id',
            render: (l) => {
                const start = new Date(l.startDate);
                const end = new Date(l.endDate);
                // Rough calculation including weekends for display
                const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                return <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{days} zile</span>
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
                    {l.managerComment && <div className="text-blue-500 mt-1">Notă Manager: {l.managerComment}</div>}
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
            ? "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 bg-blue-50 text-blue-700"
            : "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-600";
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 font-sans relative transition-colors duration-300">
            {/* GLOBAL LOADING OVERLAY */}
            {isGlobalLoading && (
                <div className="fixed inset-0 bg-white/70 dark:bg-black/70 z-[60] flex items-center justify-center backdrop-blur-[1px]">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl flex items-center gap-3 border border-gray-100 dark:border-gray-700">
                        <RefreshCw className="animate-spin text-blue-600 dark:text-blue-400" size={24} />
                        <span className="font-bold text-gray-700 dark:text-gray-300">Se procesează...</span>
                    </div>
                </div>
            )}

            <aside className={`fixed inset-y-0 left-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-30 transform transition-transform md:translate-x-0 w-64 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20">
                            <Clock size={20} className="animate-pulse-slow" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">PontajGroup</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500 dark:text-gray-400"><X size={20} /></button>
                </div>

                <div className="px-4 py-2 mt-2">
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-800"
                    >
                        {theme === 'dark' ? (
                            <><Sun size={18} className="text-yellow-500" /> Mod Luminos</>
                        ) : (
                            <><Moon size={18} className="text-indigo-400" /> Mod Întunecat</>
                        )}
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <button onClick={() => setActiveTab('dashboard')} className={getTabClass('dashboard')}><Clock size={18} /> Pontaj</button>
                    <button onClick={() => setActiveTab('calendar')} className={getTabClass('calendar')}><CalendarRange size={18} /> Program</button>
                    <button onClick={() => setActiveTab('leaves')} className={getTabClass('leaves')}><Settings size={18} /> Concedii</button>
                    <button onClick={() => setActiveTab('notifications')} className={getTabClass('notifications')}>
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3"><Bell size={18} /> Notificări</div>
                            {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>}
                        </div>
                    </button>
                    {canViewTeam && <button onClick={() => setActiveTab('team')} className={getTabClass('team')}><Users size={18} /> Echipă</button>}
                    {canManageUsers && <button onClick={() => setActiveTab('users')} className={getTabClass('users')}><UserCog size={18} /> Useri</button>}
                    {isAdmin && <button onClick={() => setActiveTab('companies')} className={getTabClass('companies')}><Briefcase size={18} /> Companii</button>}
                    {isAdmin && <button onClick={() => setActiveTab('offices')} className={getTabClass('offices')}><Building size={18} /> Structură</button>}
                    {isAdmin && <button onClick={() => setActiveTab('nomenclator')} className={getTabClass('nomenclator')}><Database size={18} /> Nomenclator</button>}
                    {isAdmin && <button onClick={() => setActiveTab('backend')} className={getTabClass('backend')}><Server size={18} /> Backend</button>}
                </nav>

                <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3 mb-3">
                        <img src={currentUser.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border border-white dark:border-gray-700 shadow-sm" />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{currentUser.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">{currentUser.roles.map((r: string) => r.toLowerCase()).join(', ')}</p>
                        </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-400 dark:text-gray-500 mb-2">
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-500 font-bold">
                            <Wifi size={10} /> Connected
                        </span>
                        <button onClick={fetchAllData} className="hover:text-blue-500 dark:hover:text-blue-400 transition" title="Reîmprospătează">
                            <RefreshCw size={12} />
                        </button>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 py-2 rounded-lg transition">
                        <LogOut size={16} /> Deconectare
                    </button>
                </div>
            </aside>

            <main className="flex-1 p-4 md:p-8 overflow-y-auto md:ml-64 bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
                <div className="md:hidden flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
                        <span className="font-bold text-xl">PontajApp</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white rounded shadow text-gray-600"><Menu /></button>
                </div>

                {activeTab === 'dashboard' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="bg-white dark:bg-gray-900 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 flex mb-4">
                            <button onClick={() => setDashboardView('clock')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${dashboardView === 'clock' ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                <Clock size={18} /> <span className="hidden sm:inline">Pontaj</span>
                            </button>
                            <button onClick={() => setDashboardView('history')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${dashboardView === 'history' ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
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
                                    <button onClick={() => openTimesheetModal(null)} className="bg-blue-600 dark:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 dark:hover:bg-blue-500 transition shadow-sm">
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
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Bell className="text-blue-600 dark:text-blue-400" /> Notificări</h2>
                        {myNotifications.length === 0 ? (
                            <div className="text-center text-gray-400 dark:text-gray-600 py-10 flex flex-col items-center">
                                <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-full mb-3 shadow-inner"><Bell size={32} className="text-gray-300 dark:text-gray-700" /></div>
                                <p>Nu aveți notificări recente.</p>
                            </div>
                        ) : (
                            myNotifications.map(n => (
                                <div key={n.id} className={`p-4 rounded-xl border shadow-sm transition flex gap-3 ${n.isRead ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'}`}>
                                    <div className={`mt-1 p-2 rounded-full ${n.type === 'ALERT' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                                        {n.type === 'ALERT' ? <ShieldAlert size={16} /> : <Mail size={16} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className={`font-bold text-sm ${n.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>{n.title}</h4>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(n.date).toLocaleDateString()} {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{n.message}</p>
                                        {!n.isRead && (
                                            <button onClick={() => markAsRead(n.id)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 font-medium">Marchează citit</button>
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

                {activeTab === 'users' && <AdminUserManagement users={users} companies={companies} departments={departments} offices={offices} workSchedules={workSchedules} onValidateUser={(id) => handleUpdateUser(users.find(u => u.id === id) ? { ...users.find(u => u.id === id)!, isValidated: true } : {} as any)} onCreateUser={handleCreateUser} onUpdateUser={handleUpdateUser} />}
                {activeTab === 'companies' && <CompanyManagement companies={companies} users={users} departments={departments} offices={offices} onAddCompany={(c) => setCompanies(p => [...p, c])} onUpdateCompany={(c) => setCompanies(p => p.map(x => x.id === c.id ? c : x))} onDeleteCompany={(id) => setCompanies(p => p.filter(x => x.id !== id))} />}
                {activeTab === 'offices' && <OfficeManagement users={users} offices={offices} departments={departments} companies={companies} onAddOffice={(o) => setOffices(p => [...p, o])} onUpdateOffice={(o) => setOffices(p => p.map(x => x.id === o.id ? o : x))} onDeleteOffice={(id) => setOffices(p => p.filter(x => x.id !== id))} onUpdateDepartments={setDepartments} onUpdateCompany={() => { }} />}
                {activeTab === 'nomenclator' && <NomenclatorManagement breakConfigs={breakConfigs} leaveConfigs={leaveConfigs} workSchedules={workSchedules} holidays={holidays} currentLockedDate={lockedDate} onUpdateBreaks={setBreakConfigs} onUpdateLeaves={setLeaveConfigs} onUpdateSchedules={setWorkSchedules} onUpdateHolidays={setHolidays} onUpdateLockedDate={setLockedDate} />}
                {activeTab === 'backend' && <BackendControlPanel />}
            </main>

            <LeaveModal isOpen={isLeaveModalOpen} onClose={() => setLeaveModalOpen(false)} leaveConfigs={leaveConfigs} lockedDate={lockedDate} onSubmit={handleLeaveSubmit} />
            <TimesheetEditModal isOpen={editModalData.isOpen} onClose={() => setEditModalData({ isOpen: false, timesheet: null, targetUserId: null })} timesheet={editModalData.timesheet} isManager={hasRole(Role.MANAGER) || hasRole(Role.ADMIN)} lockedDate={lockedDate} leaveConfigs={leaveConfigs} onSave={(data) => handleTimesheetSave(data, editModalData.targetUserId)} onDelete={handleTimesheetDelete} />
            <RejectionModal isOpen={rejectionModal.isOpen} onClose={() => setRejectionModal({ ...rejectionModal, isOpen: false })} onSubmit={(reason) => handleConfirmRejection(rejectionModal, reason)} title={rejectionModal.type === 'LEAVE_CANCEL' ? 'Motiv Anulare' : 'Motiv Respingere'} />
        </div>
    );
}
