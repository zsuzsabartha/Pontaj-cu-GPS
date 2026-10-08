
import React, { useState, useMemo, useEffect } from 'react';
import { User, Timesheet, LeaveRequest, CorrectionRequest, BreakStatus, LeaveStatus, ShiftStatus, Company, Office, BreakConfig, LeaveConfig, Holiday, Role } from '../types';
import { FileText, Coffee, Users, AlertOctagon, LayoutList, Calendar, CheckCircle, Clock4, Stethoscope, Palmtree, CheckSquare, AlertCircle, MapPin, PlusCircle, Filter, ChevronLeft, ChevronRight, Slash, LogIn, LogOut, PartyPopper, Moon, Sun, XCircle, History, Download, BarChart3, Search } from 'lucide-react';
import TimesheetList from './TimesheetList';
import LeaveCalendarReport from './LeaveCalendarReport';

interface ManagerDashboardProps {
    users: User[];
    currentUser: User;
    timesheets: Timesheet[];
    leaves: LeaveRequest[];
    correctionRequests: CorrectionRequest[];
    companies: Company[];
    departments: import('../types').Department[];
    offices: Office[];
    breakConfigs?: BreakConfig[];
    leaveConfigs: LeaveConfig[];
    holidays: Holiday[]; // Added Prop
    canViewAllCompanies: boolean;
    onApproveLeave: (id: string) => void;
    onReject: (type: 'LEAVE' | 'CORRECTION' | 'BREAK', id: string, parentId?: string) => void;
    onApproveBreak: (tsId: string, brId: string, status: BreakStatus) => void;
    onApproveCorrection: (id: string) => void;
    onOpenTimesheetModal: (ts: Timesheet | null, userId?: string) => void; // UPDATED SIGNATURE
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
    users, currentUser, timesheets, leaves, correctionRequests, companies, departments, offices, breakConfigs = [], leaveConfigs, holidays,
    canViewAllCompanies, onApproveLeave, onReject, onApproveBreak, onApproveCorrection, onOpenTimesheetModal
}) => {
    // Added 'corrections' and 'reports' to activeTab state
    const [activeTab, setActiveTab] = useState<'status' | 'history' | 'leaves' | 'breaks' | 'corrections' | 'calendar' | 'reports'>('status');
    const [selectedTeamCompany, setSelectedTeamCompany] = useState<string>('ALL');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [dashboardDate, setDashboardDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Reporting State
    const [reportMonth, setReportMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

    // Filters for sub-tabs
    const [leaveFilter, setLeaveFilter] = useState<'PENDING' | 'HISTORY'>('PENDING');
    const [breakFilter, setBreakFilter] = useState<'PENDING' | 'HISTORY'>('PENDING');
    const [correctionFilter, setCorrectionFilter] = useState<'PENDING' | 'HISTORY'>('PENDING');

    // Live Timer for Break Calculation
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const changeDashboardDate = (offset: number) => {
        const current = new Date(dashboardDate);
        current.setDate(current.getDate() + offset);
        setDashboardDate(current.toISOString().split('T')[0]);
    }

    const isOnlyPontator = currentUser.roles.includes(Role.PONTATOR) && !currentUser.roles.includes(Role.MANAGER) && !currentUser.roles.includes(Role.ADMIN) && !currentUser.roles.includes(Role.HR);

    // --- FILTER DATA ---
    const teamUsers = users.filter(u => {
        if (isOnlyPontator) {
            return u.timekeeperId === currentUser.id;
        }

        if (canViewAllCompanies) {
            if (selectedTeamCompany !== 'ALL' && u.companyId !== selectedTeamCompany) return false;
        } else {
            if (u.companyId !== currentUser.companyId) return false;
        }

        if (selectedDepartment !== 'ALL' && u.departmentId !== selectedDepartment) return false;
        if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

        return true;
    });

    // 1. LEAVES LOGIC
    const teamAllLeaves = leaves.filter(l => teamUsers.some(u => u.id === l.userId));
    const teamPendingLeaves = teamAllLeaves.filter(l => l.status === LeaveStatus.PENDING);

    const displayedLeaves = useMemo(() => {
        if (leaveFilter === 'PENDING') return teamPendingLeaves;
        // History: Approved, Rejected, Cancelled
        return teamAllLeaves.filter(l => l.status !== LeaveStatus.PENDING).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }, [teamAllLeaves, leaveFilter]);

    // 2. BREAKS LOGIC
    const teamTimesheets = timesheets.filter(t => teamUsers.some(u => u.id === t.userId));

    // Extract all breaks from team timesheets
    const teamAllBreaks = useMemo(() => {
        const allBreaks: { breakData: any, user: User | undefined, tsId: string }[] = [];
        teamTimesheets.forEach(ts => {
            const u = users.find(user => user.id === ts.userId);
            ts.breaks.forEach(b => {
                allBreaks.push({ breakData: b, user: u, tsId: ts.id });
            });
        });
        return allBreaks.sort((a, b) => new Date(b.breakData.startTime).getTime() - new Date(a.breakData.startTime).getTime());
    }, [teamTimesheets, users]);

    const teamPendingBreaks = teamAllBreaks.filter(b => b.breakData.status === BreakStatus.PENDING);
    const pendingBreaksCount = teamPendingBreaks.length;

    const displayedBreaks = useMemo(() => {
        if (breakFilter === 'PENDING') return teamPendingBreaks;
        return teamAllBreaks.filter(b => b.breakData.status !== BreakStatus.PENDING);
    }, [teamAllBreaks, breakFilter, teamPendingBreaks]);


    // 3. CORRECTIONS LOGIC
    const teamAllCorrections = correctionRequests.filter(r => teamUsers.some(u => u.id === r.userId));
    const teamPendingCorrections = teamAllCorrections.filter(r => r.status === 'PENDING');

    const displayedCorrections = useMemo(() => {
        if (correctionFilter === 'PENDING') return teamPendingCorrections;
        return teamAllCorrections.filter(r => r.status !== 'PENDING').sort((a, b) => (b.requestedDate || '').localeCompare(a.requestedDate || ''));
    }, [teamAllCorrections, correctionFilter, teamPendingCorrections]);


    // Helper to format location text based on available data
    const formatLocation = (matchedOfficeId?: string, distance?: number): { text: string, color: string } => {
        if (matchedOfficeId) {
            const officeName = offices.find(o => o.id === matchedOfficeId)?.name || 'Sediu';
            return { text: `${officeName}`, color: 'text-emerald-600' };
        }
        if (distance !== undefined) {
            const color = distance > 500 ? 'text-orange-600' : 'text-gray-500';
            return { text: `Extern (${distance}m)`, color };
        }
        return { text: '-', color: 'text-gray-400' };
    };

    // --- REPORT GENERATION LOGIC ---
    const generateMonthlyReport = () => {
        const [yearStr, monthStr] = reportMonth.split('-');
        const year = parseInt(yearStr);
        const monthIndex = parseInt(monthStr) - 1; // 0-based
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

        // Headers
        let csvContent = "\uFEFF"; // BOM for Excel UTF-8
        const headerRow = ["Nume Angajat", "Companie", "ID ERP"];
        for (let d = 1; d <= daysInMonth; d++) {
            headerRow.push(String(d));
        }
        headerRow.push("Total Ore Lucrate");
        headerRow.push("Zile Concediu");
        csvContent += headerRow.join(",") + "\n";

        // Rows
        teamUsers.forEach(user => {
            const companyName = companies.find(c => c.id === user.companyId)?.name || '-';
            const rowData = [`"${user.name}"`, `"${companyName}"`, user.erpId || '-'];

            let totalMonthlyHours = 0;
            let totalLeaveDays = 0;

            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

                // 1. Check Approved Leaves
                const leave = leaves.find(l =>
                    l.userId === user.id &&
                    l.status === LeaveStatus.APPROVED &&
                    dateStr >= l.startDate && dateStr <= l.endDate
                );

                // 2. Check Timesheets
                const timesheet = timesheets.find(t => t.userId === user.id && t.date === dateStr);

                // 3. Check Holiday / Weekend
                const isHoliday = holidays.some(h => h.date === dateStr);
                const dayOfWeek = new Date(dateStr).getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                let cellValue = "";

                if (leave) {
                    // Use Config Code if available (e.g., CO, CM), else Type Name
                    const config = leaveConfigs.find(c => c.id === leave.typeId);
                    cellValue = config?.code || "C";
                    // Only count leave days if it's not a weekend/holiday (standard rule, though simplified here)
                    if (!isWeekend && !isHoliday) totalLeaveDays++;
                } else if (timesheet && timesheet.endTime) {
                    // Calculate Net Hours
                    const start = new Date(timesheet.startTime).getTime();
                    const end = new Date(timesheet.endTime).getTime();
                    let durationMs = end - start;

                    // Subtract Unpaid Breaks
                    const unpaidBreaksMs = timesheet.breaks.reduce((acc, b) => {
                        const bConfig = breakConfigs.find(bc => bc.id === b.typeId);
                        if (bConfig && !bConfig.isPaid && b.endTime && b.startTime) {
                            return acc + (new Date(b.endTime).getTime() - new Date(b.startTime).getTime());
                        }
                        return acc;
                    }, 0);

                    const netHours = Math.max(0, (durationMs - unpaidBreaksMs) / 3600000);
                    cellValue = netHours.toFixed(1); // e.g. "8.5"
                    totalMonthlyHours += netHours;
                } else if (isHoliday) {
                    cellValue = "L"; // Libera Legala
                } else if (isWeekend) {
                    cellValue = "W"; // Weekend
                }

                rowData.push(cellValue);
            }

            rowData.push(totalMonthlyHours.toFixed(1));
            rowData.push(String(totalLeaveDays));
            csvContent += rowData.join(",") + "\n";
        });

        // Trigger Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Raport_Pontaj_${reportMonth}_${selectedTeamCompany}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Live Status Logic
    const teamMemberStatuses = teamUsers.map(user => {
        const activeLeave = leaves.find(l => l.userId === user.id && l.startDate <= dashboardDate && l.endDate >= dashboardDate && l.status === LeaveStatus.APPROVED);
        const dailyTs = timesheets.find(t => t.userId === user.id && t.date === dashboardDate);

        // Determine Status
        let status = 'ABSENT';
        let statusColor = 'bg-red-50 text-red-600 border-red-100';
        let breakDurationLabel = '';

        // Check context for absent status (Weekend/Holiday)
        const dateObj = new Date(dashboardDate);
        const dayOfWeek = dateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const holiday = holidays.find(h => h.date === dashboardDate);

        let events: { icon: React.ReactNode, label: string, time: string, loc: string, locColor: string }[] = [];

        if (activeLeave) {
            status = 'LEAVE';
            statusColor = 'bg-purple-100 text-purple-700 border-purple-200';
            events.push({
                icon: <Palmtree size={12} />,
                label: 'Concediu',
                time: '-',
                loc: activeLeave.typeName,
                locColor: 'text-purple-600'
            });
        } else if (dailyTs) {

            // --- Break Time Calculation ---
            const totalBreakMs = dailyTs.breaks.reduce((acc, b) => {
                if (b.endTime) return acc + (new Date(b.endTime).getTime() - new Date(b.startTime).getTime());
                if (!b.endTime && dailyTs.status === ShiftStatus.ON_BREAK) {
                    return acc + (now - new Date(b.startTime).getTime());
                }
                return acc;
            }, 0);

            if (totalBreakMs > 0) {
                const mins = Math.floor(totalBreakMs / 60000);
                const hrs = Math.floor(mins / 60);
                breakDurationLabel = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
            }
            // -----------------------------

            if (dailyTs.status === ShiftStatus.WORKING) {
                status = 'WORKING';
                statusColor = 'bg-green-100 text-green-700 border-green-200';
            } else if (dailyTs.status === ShiftStatus.ON_BREAK) {
                status = 'BREAK';
                statusColor = 'bg-orange-100 text-orange-700 border-orange-200';
            } else {
                status = 'COMPLETED';
                statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
            }

            // 1. Clock In Event
            const startLoc = formatLocation(dailyTs.matchedOfficeId, dailyTs.distanceToOffice);
            events.push({
                icon: <LogIn size={12} />,
                label: 'Start',
                time: new Date(dailyTs.startTime).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
                loc: startLoc.text,
                locColor: startLoc.color
            });

            // 2. Breaks Events (Chronological)
            dailyTs.breaks.forEach(br => {
                // Break Start
                const brStartLoc = formatLocation(undefined, br.startDistanceToOffice);
                events.push({
                    icon: <Coffee size={12} />,
                    label: `Pauză (${br.typeName})`,
                    time: new Date(br.startTime).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
                    loc: brStartLoc.text,
                    locColor: brStartLoc.color
                });

                // Break End (if exists)
                if (br.endTime) {
                    const brEndLoc = formatLocation(undefined, br.endDistanceToOffice);
                    events.push({
                        icon: <Clock4 size={12} />,
                        label: 'Revenire',
                        time: new Date(br.endTime).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
                        loc: brEndLoc.text,
                        locColor: brEndLoc.color
                    });
                }
            });

            // 3. Clock Out Event (if exists)
            if (dailyTs.endTime) {
                const endLoc = formatLocation(undefined, dailyTs.endDistanceToOffice);
                events.push({
                    icon: <LogOut size={12} />,
                    label: 'Stop',
                    time: new Date(dailyTs.endTime).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
                    loc: endLoc.text,
                    locColor: endLoc.color
                });
            }
        } else {
            // Logic to not show 'ABSENT' on non-working days
            if (holiday) {
                status = 'HOLIDAY';
                statusColor = 'bg-indigo-50 text-indigo-600 border-indigo-100';
            } else if (isWeekend) {
                status = 'WEEKEND';
                statusColor = 'bg-gray-100 text-gray-500 border-gray-200';
            }
        }

        return { user, status, statusColor, events, holiday, breakDurationLabel };
    }).sort((a, b) => (a.status === 'WORKING' ? 0 : 1) - (b.status === 'WORKING' ? 0 : 1));

    const activeTeamMembersCount = teamMemberStatuses.filter(s => s.status === 'WORKING').length;

    return (
        <div className="space-y-6 animate-in fade-in">

            {/* HEADER & FILTERS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Panou Manager</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Supervizare, aprobări și rapoarte echipă</p>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    {/* Sub-Tabs Navigation */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-1 flex gap-1 shadow-sm overflow-x-auto transition-colors">
                        <button onClick={() => setActiveTab('status')} className={`px-3 py-1.5 rounded text-xs font-bold transition whitespace-nowrap ${activeTab === 'status' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Status Echipă</button>
                        <button onClick={() => setActiveTab('history')} className={`px-3 py-1.5 rounded text-xs font-bold transition whitespace-nowrap ${activeTab === 'history' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Istoric</button>
                        <button onClick={() => setActiveTab('leaves')} className={`px-3 py-1.5 rounded text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${activeTab === 'leaves' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                            Concedii {teamPendingLeaves.length > 0 && <span className="bg-purple-500 dark:bg-purple-600 text-white rounded-full px-1.5 text-[9px]">{teamPendingLeaves.length}</span>}
                        </button>
                        <button onClick={() => setActiveTab('breaks')} className={`px-3 py-1.5 rounded text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${activeTab === 'breaks' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                            Pauze {pendingBreaksCount > 0 && <span className="bg-indigo-500 dark:bg-indigo-600 text-white rounded-full px-1.5 text-[9px]">{pendingBreaksCount}</span>}
                        </button>
                        <button onClick={() => setActiveTab('corrections')} className={`px-3 py-1.5 rounded text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${activeTab === 'corrections' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                            Corecții {teamPendingCorrections.length > 0 && <span className="bg-orange-500 dark:bg-orange-600 text-white rounded-full px-1.5 text-[9px]">{teamPendingCorrections.length}</span>}
                        </button>
                        <button onClick={() => setActiveTab('reports')} className={`px-3 py-1.5 rounded text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${activeTab === 'reports' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                            <BarChart3 size={12} /> Rapoarte
                        </button>
                        <button onClick={() => setActiveTab('calendar')} className={`px-3 py-1.5 rounded text-xs font-bold transition whitespace-nowrap ${activeTab === 'calendar' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Calendar</button>
                    </div>

                    {/* Filters (Search, Department, Company) */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input 
                                type="text" 
                                placeholder="Caută angajat..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-3 py-2 w-48 text-sm border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                            />
                        </div>
                        
                        <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="text-sm border border-gray-200 dark:border-gray-800 rounded-lg p-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-colors">
                            <option value="ALL">Toate Departamentele</option>
                            {departments.filter(d => selectedTeamCompany === 'ALL' || d.companyId === selectedTeamCompany).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>

                        {canViewAllCompanies && (
                            <select value={selectedTeamCompany} onChange={(e) => { setSelectedTeamCompany(e.target.value); setSelectedDepartment('ALL'); }} className="text-sm border border-gray-200 dark:border-gray-800 rounded-lg p-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-colors">
                                <option value="ALL">Toate Companiile</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        )}
                    </div>
                </div>
            </div>

            {/* --- TAB: STATUS (Live Board & Widgets) --- */}
            {activeTab === 'status' && (
                <div className="space-y-6">
                    {/* Widgets */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between h-24 transition-colors">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Prezență Azi</span>
                            <div className="flex items-end justify-between">
                                <span className="text-2xl font-bold text-green-600 dark:text-green-400">{activeTeamMembersCount} / {teamUsers.length}</span>
                                <Users size={20} className="text-green-200 dark:text-green-900/40" />
                            </div>
                        </div>
                        <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between h-24 transition-colors ${teamPendingLeaves.length > 0 ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Cereri Concediu</span>
                            <div className="flex items-end justify-between">
                                <span className={`text-2xl font-bold ${teamPendingLeaves.length > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-600'}`}>{teamPendingLeaves.length}</span>
                                <FileText size={20} className={teamPendingLeaves.length > 0 ? 'text-purple-200 dark:text-purple-900/40' : 'text-gray-200 dark:text-gray-800'} />
                            </div>
                        </div>
                        <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between h-24 transition-colors ${pendingBreaksCount > 0 ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Pauze Neconfirmate</span>
                            <div className="flex items-end justify-between">
                                <span className={`text-2xl font-bold ${pendingBreaksCount > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-600'}`}>{pendingBreaksCount}</span>
                                <Coffee size={20} className={pendingBreaksCount > 0 ? 'text-indigo-200 dark:text-indigo-900/40' : 'text-gray-200 dark:text-gray-800'} />
                            </div>
                        </div>
                        <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between h-24 transition-colors ${teamPendingCorrections.length > 0 ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Solicitări Corecție</span>
                            <div className="flex items-end justify-between">
                                <span className={`text-2xl font-bold ${teamPendingCorrections.length > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-600'}`}>{teamPendingCorrections.length}</span>
                                <AlertOctagon size={20} className={teamPendingCorrections.length > 0 ? 'text-orange-200 dark:text-orange-900/40' : 'text-gray-200 dark:text-gray-800'} />
                            </div>
                        </div>
                    </div>

                    {/* Live Board Table */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
                        <div className="bg-slate-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-gray-200 text-sm flex items-center gap-2">
                                <Users size={16} className="text-emerald-500 dark:text-emerald-400" /> Status Echipă - {new Date(dashboardDate).toLocaleDateString('ro-RO')}
                            </h3>
                            {/* Date Controls for Live View Context */}
                            <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5">
                                <button onClick={() => changeDashboardDate(-1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500 dark:text-gray-400 transition-colors"><ChevronLeft size={14} /></button>
                                <input type="date" value={dashboardDate} onChange={(e) => setDashboardDate(e.target.value)} className="text-xs font-bold text-gray-700 dark:text-gray-300 outline-none bg-transparent px-2 w-24 text-center cursor-pointer" />
                                <button onClick={() => changeDashboardDate(1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500 dark:text-gray-400 transition-colors"><ChevronRight size={14} /></button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 uppercase font-bold border-b border-gray-100 dark:border-gray-800">
                                        <th className="px-4 py-3 w-1/4">Angajat</th>
                                        <th className="px-4 py-3 w-32">Status</th>
                                        <th className="px-4 py-3">Pontaje & Locație</th>
                                        <th className="px-4 py-3 text-right">Acțiuni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {teamMemberStatuses.map(({ user, status, statusColor, events, holiday, breakDurationLabel }) => (
                                        <tr key={user.id} className="hover:bg-slate-50 transition">
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <img src={user.avatarUrl} className="w-9 h-9 rounded-full bg-gray-200 object-cover" />
                                                        {status === 'WORKING' && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 text-sm">{user.name}</p>
                                                        <p className="text-[10px] text-gray-400">{user.roles.includes(Role.MANAGER) ? 'Manager' : 'Angajat'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold border flex items-center justify-center gap-1 ${statusColor}`}>
                                                    {status === 'WORKING' ? 'ACTIV' :
                                                        status === 'HOLIDAY' ? 'SĂRBĂTOARE' :
                                                            status === 'WEEKEND' ? 'WEEKEND' :
                                                                status === 'BREAK' ? 'PAUZĂ' :
                                                                    status === 'COMPLETED' ? 'FINALIZAT' : status}

                                                    {/* Show Duration only for Active Break */}
                                                    {status === 'BREAK' && breakDurationLabel && <span className="font-mono text-[9px] opacity-80">({breakDurationLabel})</span>}
                                                </span>
                                                {/* Show Total Break Duration for Completed Shift */}
                                                {status === 'COMPLETED' && breakDurationLabel && (
                                                    <div className="text-[9px] text-orange-600 text-center mt-1 font-bold">
                                                        Pauză: {breakDurationLabel}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {/* Render Event Stream */}
                                                <div className="space-y-1">
                                                    {status === 'HOLIDAY' && holiday && (
                                                        <div className="flex items-center gap-2 text-xs text-indigo-600 font-bold">
                                                            <PartyPopper size={12} /> {holiday.name}
                                                        </div>
                                                    )}
                                                    {status === 'WEEKEND' && (
                                                        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                                            <Moon size={12} /> Zi liberă (Weekend)
                                                        </div>
                                                    )}
                                                    {events.length === 0 && status === 'ABSENT' && <span className="text-xs text-red-400 italic">Nepontat (Absență nemotivată?)</span>}
                                                    {events.map((evt, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                                            <span className="text-gray-400 w-4 flex justify-center">{evt.icon}</span>
                                                            <span className="font-mono font-bold text-gray-700 w-10">{evt.time}</span>
                                                            <span className="text-gray-500 font-medium">{evt.label}</span>
                                                            <span className="text-gray-300">|</span>
                                                            <span className={`font-medium ${evt.locColor}`}>{evt.loc}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right align-top">
                                                <button onClick={() => onOpenTimesheetModal(null, user.id)} className="text-gray-400 hover:text-emerald-600 p-1.5 rounded hover:bg-emerald-50 transition"><PlusCircle size={18} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: HISTORY (Grid) --- */}
            {activeTab === 'history' && (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in transition-colors">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2"><LayoutList size={20} /> Istoric Complet Echipă</h3>
                    </div>
                    <div className="p-4">
                        <TimesheetList
                            timesheets={teamTimesheets}
                            offices={offices}
                            users={users}
                            companies={companies}
                            breakConfigs={breakConfigs}
                            correctionRequests={correctionRequests} // ADDED THIS PROP
                            isManagerView={true}
                            onEditTimesheet={(ts) => onOpenTimesheetModal(ts)}
                        />
                    </div>
                </div>
            )}

            {/* --- TAB: LEAVES (Requests) --- */}
            {activeTab === 'leaves' && (
                <div className="space-y-6 animate-in fade-in">

                    {/* Stats & Filter Toggle */}
                    <div className="flex flex-col md:flex-row gap-4 items-stretch">
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800 flex justify-between items-center flex-1 transition-colors">
                            <div>
                                <h3 className="font-bold text-purple-900 dark:text-purple-100">Cereri Concediu</h3>
                                <p className="text-xs text-purple-700 dark:text-purple-300">Gestionați cererile echipei.</p>
                            </div>
                            <span className="text-2xl font-bold text-purple-700 dark:text-purple-400">{teamPendingLeaves.length} <span className="text-xs font-normal">noi</span></span>
                        </div>

                        <div className="bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center transition-colors">
                            <button
                                onClick={() => setLeaveFilter('PENDING')}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${leaveFilter === 'PENDING' ? 'bg-purple-600 dark:bg-purple-700 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <AlertCircle size={16} /> În Așteptare
                            </button>
                            <button
                                onClick={() => setLeaveFilter('HISTORY')}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${leaveFilter === 'HISTORY' ? 'bg-purple-600 dark:bg-purple-700 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <History size={16} /> Istoric / Aprobate
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {displayedLeaves.length === 0 && <p className="col-span-full text-center text-gray-400 dark:text-gray-500 italic py-8">Nu există date conform filtrului selectat.</p>}
                        {displayedLeaves.map(req => {
                            const requester = users.find(u => u.id === req.userId);
                            return (
                                <div key={req.id} className={`bg-white dark:bg-gray-900 p-4 rounded-xl border shadow-sm flex flex-col justify-between gap-4 transition-all ${req.status === LeaveStatus.APPROVED ? 'border-green-200 dark:border-green-800' : req.status === LeaveStatus.REJECTED ? 'border-red-200 dark:border-red-800' : 'border-gray-200 dark:border-gray-800'}`}>
                                    <div>
                                        <div className="flex items-center gap-3 mb-3">
                                            <img src={requester?.avatarUrl} className="w-8 h-8 rounded-full" />
                                            <div>
                                                <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{requester?.name}</p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400">{requester?.email}</p>
                                            </div>
                                            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded font-bold uppercase ${req.status === LeaveStatus.APPROVED ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                                                req.status === LeaveStatus.REJECTED ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                                                    req.status === LeaveStatus.CANCELLED ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' :
                                                        'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                                                }`}>
                                                {req.status}
                                            </span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800/80 p-3 rounded-lg text-xs space-y-2 transition-colors">
                                            <div className="font-bold text-gray-800 dark:text-gray-200">{req.typeName}</div>
                                            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400"><Calendar size={12} /> {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</div>
                                            {req.reason && <div className="italic text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2 mt-2 transition-colors">"{req.reason}"</div>}
                                        </div>
                                    </div>

                                    {req.status === LeaveStatus.PENDING && (
                                        <div className="flex gap-2 transition-colors">
                                            <button onClick={() => onApproveLeave(req.id)} className="flex-1 bg-green-600 dark:bg-green-700 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700 dark:hover:bg-green-800 transition shadow-sm">Aprobă</button>
                                            <button onClick={() => onReject('LEAVE', req.id)} className="flex-1 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 py-2 rounded-lg text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition shadow-sm">Respinge</button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* --- TAB: BREAKS --- */}
            {activeTab === 'breaks' && (
                <div className="space-y-8 animate-in fade-in">
                    {/* 1. Breaks */}
                    <div className="space-y-4">

                        {/* Stats & Toggle */}
                        <div className="flex flex-col md:flex-row gap-4 items-stretch">
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 flex justify-between items-center flex-1 transition-colors">
                                <div>
                                    <h3 className="font-bold text-indigo-900 dark:text-indigo-100">Monitorizare Pauze</h3>
                                    <p className="text-xs text-indigo-700 dark:text-indigo-300">Confirmare timp nelucrat.</p>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{pendingBreaksCount}</span>
                                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">Neconfirmate</span>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center transition-colors">
                                <button
                                    onClick={() => setBreakFilter('PENDING')}
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${breakFilter === 'PENDING' ? 'bg-indigo-600 dark:bg-indigo-700 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                >
                                    <AlertCircle size={16} /> Neconfirmate
                                </button>
                                <button
                                    onClick={() => setBreakFilter('HISTORY')}
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${breakFilter === 'HISTORY' ? 'bg-indigo-600 dark:bg-indigo-700 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                >
                                    <History size={16} /> Toate (Istoric)
                                </button>
                            </div>
                        </div>

                        {/* Pending Callout - Always visible if there are pending items */}
                        {pendingBreaksCount > 0 && breakFilter !== 'PENDING' && (
                            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-3 rounded-lg flex items-center justify-between animate-pulse transition-colors">
                                <span className="text-sm font-bold text-orange-800 dark:text-orange-300 flex items-center gap-2"><AlertCircle size={16} /> Aveți {pendingBreaksCount} pauze care necesită confirmare!</span>
                                <button onClick={() => setBreakFilter('PENDING')} className="text-xs bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-800 px-3 py-1 rounded text-orange-700 dark:text-orange-400 font-bold hover:bg-orange-50 dark:hover:bg-orange-900/40 transition-colors">Vezi Acum</button>
                            </div>
                        )}

                        {/* Breaks List - Custom Rendering instead of TimesheetList to show individual breaks better */}
                        {displayedBreaks.length === 0 ? (
                            <p className="text-center text-gray-400 italic py-4">Nu există pauze conform filtrului.</p>
                        ) : (
                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
                                        <tr>
                                            <th className="px-4 py-3">Angajat</th>
                                            <th className="px-4 py-3">Tip Pauză</th>
                                            <th className="px-4 py-3">Interval</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Acțiuni</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {displayedBreaks.map(({ breakData, user, tsId }, idx) => (
                                            <tr key={`${tsId}-${breakData.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{user?.name}</td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{breakData.typeName}</td>
                                                <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">
                                                    {new Date(breakData.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                    {breakData.endTime ? new Date(breakData.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${breakData.status === BreakStatus.PENDING ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' :
                                                        breakData.status === BreakStatus.APPROVED ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' :
                                                            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900'
                                                        }`}>
                                                        {breakData.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {breakData.status === BreakStatus.PENDING && (
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => onApproveBreak(tsId, breakData.id, BreakStatus.APPROVED)} className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"><CheckCircle size={16} /></button>
                                                            <button onClick={() => onReject('BREAK', breakData.id, tsId)} className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"><XCircle size={16} /></button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- TAB: CORRECTIONS --- */}
            {activeTab === 'corrections' && (
                <div className="space-y-6 animate-in fade-in transition-colors">

                    {/* Header Stats */}
                    <div className="flex flex-col md:flex-row gap-4 items-stretch">
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800 flex justify-between items-center flex-1 transition-colors">
                            <div>
                                <h3 className="font-bold text-orange-900 dark:text-orange-100">Solicitări Corecție</h3>
                                <p className="text-xs text-orange-700 dark:text-orange-300">Cereri de modificare pontaj sau pontaj lipsă.</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-2xl font-bold text-orange-700 dark:text-orange-400">{teamPendingCorrections.length}</span>
                                <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase">De Aprobat</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center transition-colors">
                            <button
                                onClick={() => setCorrectionFilter('PENDING')}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${correctionFilter === 'PENDING' ? 'bg-orange-500 dark:bg-orange-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <AlertOctagon size={16} /> În Așteptare
                            </button>
                            <button
                                onClick={() => setCorrectionFilter('HISTORY')}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${correctionFilter === 'HISTORY' ? 'bg-orange-500 dark:bg-orange-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <History size={16} /> Istoric
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {displayedCorrections.length === 0 && <p className="col-span-full text-center text-gray-400 italic py-8">Nu există solicitări de corecție conform filtrului.</p>}

                        {displayedCorrections.map(req => {
                            const requester = users.find(u => u.id === req.userId);
                            const reqCompany = companies.find(c => c.id === requester?.companyId);
                            const isPending = req.status === 'PENDING';

                            return (
                                <div key={req.id} className={`bg-white dark:bg-gray-900 p-4 rounded-xl border shadow-sm flex flex-col gap-3 transition-all ${isPending ? 'border-orange-200 dark:border-orange-800' : 'border-gray-200 dark:border-gray-800 opacity-80'}`}>
                                    <div className="flex items-center gap-2">
                                        <img src={requester?.avatarUrl} className="w-8 h-8 rounded-full" />
                                        <div>
                                            <span className="font-bold text-sm text-gray-800 dark:text-gray-200 block">{requester?.name}</span>
                                            {reqCompany && <span className="text-[10px] text-gray-500 dark:text-gray-400">{reqCompany.name}</span>}
                                        </div>
                                        {!isPending && (
                                            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${req.status === 'APPROVED' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                                                }`}>
                                                {req.status === 'APPROVED' ? 'APROBAT' : 'RESPINS'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg transition-colors">
                                        <p className="flex justify-between"><span className="font-semibold text-gray-700 dark:text-gray-200">Data Solicitată:</span> <span>{req.requestedDate || 'N/A'}</span></p>
                                        <p className="mt-1 flex justify-between"><span className="font-semibold text-gray-700 dark:text-gray-200">Interval:</span> <span className="text-gray-600 dark:text-gray-400">{new Date(req.requestedStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {req.requestedEndTime ? new Date(req.requestedEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}</span></p>
                                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 transition-colors">
                                            <span className="font-semibold text-gray-700 dark:text-gray-200 block mb-1">Motiv:</span>
                                            <p className="italic text-gray-500 dark:text-gray-400">"{req.reason}"</p>
                                        </div>
                                    </div>

                                    {isPending && (
                                        <div className="flex gap-2 mt-auto transition-colors">
                                            <button onClick={() => onApproveCorrection(req.id)} className="flex-1 bg-green-600 dark:bg-green-700 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700 dark:hover:bg-green-800 shadow-sm transition">Aprobă Solicitarea</button>
                                            <button onClick={() => onReject('CORRECTION', req.id)} className="flex-1 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 py-2 rounded-lg text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition shadow-sm">Respinge</button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* --- TAB: REPORTS (Monthly Excel) --- */}
            {activeTab === 'reports' && (
                <div className="space-y-6 animate-in fade-in transition-colors">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 transition-colors">
                        <div className="flex items-start gap-4">
                            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-xl text-green-700 dark:text-green-400 transition-colors">
                                <FileText size={32} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Raport Lunar Pontaj</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                                    Generați un raport detaliat în format CSV (compatibil Excel) care include orele lucrate și zilele de concediu pentru toți angajații selectați.
                                </p>

                                <div className="flex flex-wrap gap-4 items-end bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700 transition-colors">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Luna de Raportare</label>
                                        <input
                                            type="month"
                                            value={reportMonth}
                                            onChange={(e) => setReportMonth(e.target.value)}
                                            className="border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors"
                                        />
                                    </div>

                                    <button
                                        onClick={generateMonthlyReport}
                                        className="bg-green-600 dark:bg-green-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 dark:hover:bg-green-800 shadow-md flex items-center gap-2 transition"
                                    >
                                        <Download size={18} /> Export Excel / CSV
                                    </button>
                                </div>

                                <div className="mt-4 text-xs text-gray-400 dark:text-gray-500 italic transition-colors">
                                    * Raportul include orele nete (pauzele neplătite sunt scăzute) și codurile de concediu aprobate.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: CALENDAR REPORT --- */}
            {activeTab === 'calendar' && (
                <div className="animate-in fade-in">
                    <LeaveCalendarReport
                        users={teamUsers}
                        leaves={leaves}
                        leaveConfigs={leaveConfigs}
                        holidays={holidays}
                    />
                </div>
            )}

        </div>
    );
};

export default ManagerDashboard;
