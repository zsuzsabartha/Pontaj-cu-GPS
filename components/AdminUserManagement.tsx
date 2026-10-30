
import React, { useState } from 'react';
import { User, Role, Company, Department, Office, WorkSchedule, Timesheet, LeaveRequest, CorrectionRequest, ShiftStatus, LeaveStatus } from '../types';
import { UserPlus, ShieldAlert, Database, RefreshCw, Mail, Eye, AlertTriangle, BellRing, Upload, Edit2, X, Save, Wand2, Users, FileText, Download, Briefcase, Building, Clock, MapPin, CalendarClock, DownloadCloud, UploadCloud, Layers, Smartphone, KeyRound, RotateCcw, QrCode } from 'lucide-react';
import MobileInstallQRModal from './MobileInstallQRModal';
import UserValidationModal from './UserValidationModal';
import { API_CONFIG, HOLIDAYS_RO, INITIAL_LEAVE_CONFIGS } from '../constants';
import SmartTable, { Column } from './SmartTable';
import { SQLService } from '../services/sqlService';
import { showToast } from '../utils/toast';

interface AdminUserManagementProps {
    users: User[];
    companies: Company[];
    departments: Department[];
    offices: Office[];
    workSchedules: WorkSchedule[];
    onValidateUser: (userId: string) => void;
    onCreateUser: (user: User) => void;
    onUpdateUser: (user: User) => void;
    onBulkImport?: (timesheets: Timesheet[], leaves: LeaveRequest[], corrections: CorrectionRequest[]) => void;
    defaultCompanyId?: string | null;
    defaultDepartmentId?: string | null;
    onRefreshData?: () => Promise<void>;
}

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ 
    users, companies, departments, offices, workSchedules, 
    onValidateUser, onCreateUser, onUpdateUser, onBulkImport,
    defaultCompanyId, defaultDepartmentId, onRefreshData
}) => {
    const [activeSubTab, setActiveSubTab] = useState<'pending' | 'create' | 'import' | 'inactive' | 'generator'>(
        defaultCompanyId ? 'create' : 'pending'
    );
    const [isDbSyncing, setIsDbSyncing] = useState(false);
    const [dbStatus, setDbStatus] = useState<'connected' | 'error'>('connected');
    const [isGenerating, setIsGenerating] = useState(false);
    const [validationUser, setValidationUser] = useState<User | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [activeDeviceCode, setActiveDeviceCode] = useState<{ userName: string; email: string; code: string } | null>(null);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);

    const handleGenerateDeviceCode = async (user: User) => {
        try {
            const res = await SQLService.generateDeviceCode(user.id);
            if (res.success && res.code) {
                setActiveDeviceCode({ userName: user.name, email: user.email, code: res.code });
                showToast(`Cod 2FA generat pentru ${user.name}: ${res.code} (valabil 10 min)`, 'success');
            }
        } catch (e: any) {
            showToast(e.message || 'Eroare la generarea codului 2FA.', 'error');
        }
    };

    const handleResetDevice = async (user: User) => {
        if (!confirm(`Resetați telefonul asociat pentru ${user.name}?\nAngajatul va putea înrola un telefon nou la următoarea autentificare cu PIN.`)) return;
        try {
            await SQLService.resetUserDevice(user.id);
            showToast(`Dispozitivul pentru ${user.name} a fost resetat.`, 'success');
            if (onRefreshData) await onRefreshData();
        } catch (e: any) {
            showToast(e.message || 'Eroare la resetarea dispozitivului.', 'error');
        }
    };
    const [importText, setImportText] = useState('');

    // State to hold generated data for download
    const [generatedData, setGeneratedData] = useState<{ timesheets: Timesheet[], leaves: LeaveRequest[], corrections: CorrectionRequest[] } | null>(null);

    const [newUser, setNewUser] = useState({
        name: '', email: '', erpId: '', 
        companyId: defaultCompanyId || companies[0]?.id || '', 
        departmentId: defaultDepartmentId || '', 
        assignedOfficeId: '',
        contractHours: 8, roles: [Role.EMPLOYEE] as Role[], requiresGPS: true, birthDate: '', shareBirthday: false,
        mainScheduleId: '', alternativeScheduleIds: [] as string[]
    });

    const pendingUsers = users.filter(u => !u.isValidated);
    const inactiveUsers = users.filter(u => u.isValidated && !u.lastLoginDate && u.employmentStatus === 'ACTIVE');
    const activeListUsers = users.filter(u => u.isValidated);
    const pontators = users.filter(u => u.roles.includes(Role.PONTATOR));

    const getStatusLabel = (status?: string) => {
        switch (status) {
            case 'ACTIVE': return <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200 dark:border-green-800 transition-colors">ACTIV</span>;
            case 'SUSPENDED': return <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 px-2 py-0.5 rounded text-[10px] font-bold border border-red-200 dark:border-red-800 transition-colors">SUSPENDAT</span>;
            case 'TERMINATED': return <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200 dark:border-gray-700 transition-colors">ÎNCETAT</span>;
            default: return <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200 dark:border-green-800 transition-colors">ACTIV</span>;
        }
    };

    const handleManualDBSync = async () => {
        setIsDbSyncing(true);
        try {
            await fetch(`${API_CONFIG.BASE_URL}/config/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(users) });
            setDbStatus('connected');
            showToast("Sincronizare completă cu baza de date SQL efectuată.", 'success');
        } catch (e) {
            setDbStatus('error');
            showToast("Eroare la sincronizare.", 'error');
        } finally { setIsDbSyncing(false); }
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const user: User = {
            id: `u-${Date.now()}`,
            erpId: newUser.erpId, name: newUser.name, email: newUser.email, companyId: newUser.companyId, departmentId: newUser.departmentId,
            assignedOfficeId: newUser.assignedOfficeId || undefined, contractHours: newUser.contractHours, roles: newUser.roles,
            authType: 'PIN', pin: Math.floor(1000 + Math.random() * 9000).toString(), isValidated: true, requiresGPS: newUser.requiresGPS,
            avatarUrl: `https://ui-avatars.com/api/?name=${newUser.name}&background=random`, mainScheduleId: newUser.mainScheduleId || (workSchedules[0]?.id || ''),
            alternativeScheduleIds: newUser.alternativeScheduleIds, birthDate: newUser.birthDate || undefined, shareBirthday: newUser.shareBirthday, employmentStatus: 'ACTIVE', timekeeperId: (newUser as any).timekeeperId
        };
        onCreateUser(user);
        alert(`User creat! PIN: ${user.pin}`);
        
        // Reset form
        setNewUser({
            name: '', email: '', erpId: '', companyId: companies[0]?.id || '', departmentId: '', assignedOfficeId: '',
            contractHours: 8, roles: [Role.EMPLOYEE] as Role[], requiresGPS: true, birthDate: '', shareBirthday: false,
            mainScheduleId: '', alternativeScheduleIds: [] as string[]
        });
        setActiveSubTab('inactive'); // Since they are immediately validated, they go to active/inactive list, not pending. We can just send them to 'inactive' or 'pending' view
    };

    // Toggle helper for edit modal
    const toggleAltSchedule = (scheduleId: string) => {
        if (!editingUser) return;
        const currentAlts = editingUser.alternativeScheduleIds || [];
        const exists = currentAlts.includes(scheduleId);
        const newAlts = exists
            ? currentAlts.filter(id => id !== scheduleId)
            : [...currentAlts, scheduleId];
        setEditingUser({ ...editingUser, alternativeScheduleIds: newAlts });
    };

    const generateSQL2025 = () => {
        if (!generatedData) return;
        const { timesheets, leaves } = generatedData;

        let sql = `-- SCRIPT GENERAT AUTOMAT PENTRU PONTAJ 2025\n`;
        sql += `-- Conține: Nomenclator Ture, Sărbători Legale 2025, Alocare Ture Utilizatori, Pontaje 2025, Concedii 2025\n\n`;
        sql += `USE PontajSmart;\nGO\n\n`;

        // 1. Nomenclature (Work Schedules)
        sql += `-- 1. NOMENCLATOR PROGRAME DE LUCRU (SHIFTS)\n`;
        workSchedules.forEach(ws => {
            sql += `IF NOT EXISTS (SELECT * FROM work_schedules WHERE id='${ws.id}') \n`;
            sql += `  INSERT INTO work_schedules (id, name, start_time, end_time, crosses_midnight) VALUES ('${ws.id}', N'${ws.name}', '${ws.startTime}', '${ws.endTime}', ${ws.crossesMidnight ? 1 : 0});\n`;
        });
        sql += `GO\n\n`;

        // 2. Holidays 2025
        sql += `-- 2. SĂRBĂTORI LEGALE 2025\n`;
        const holidays2025 = HOLIDAYS_RO.filter(h => h.date.startsWith('2025'));
        holidays2025.forEach(h => {
            sql += `IF NOT EXISTS (SELECT * FROM holidays WHERE date = '${h.date}') \n`;
            sql += `  INSERT INTO holidays (id, date, name) VALUES ('${h.id}', '${h.date}', N'${h.name}');\n`;
        });
        sql += `GO\n\n`;

        // 3. User Assignments
        sql += `-- 3. ALOCARE PROGRAME UTILIZATORI\n`;
        users.forEach(u => {
            if (u.mainScheduleId) {
                sql += `UPDATE users SET main_schedule_id = '${u.mainScheduleId}' WHERE id = '${u.id}';\n`;
            }
        });
        sql += `GO\n\n`;

        // 4. Leaves
        sql += `-- 4. CONCEDII 2025 (${leaves.length} înregistrări)\n`;
        // Use chunks or batching if really large, but for demo simpler is fine
        leaves.forEach(l => {
            const reasonClean = l.reason.replace(/'/g, "''");
            sql += `INSERT INTO leave_requests (id, user_id, type_id, start_date, end_date, reason, status) VALUES ('${l.id}', '${l.userId}', '${l.typeId}', '${l.startDate}', '${l.endDate}', N'${reasonClean}', '${l.status}');\n`;
        });
        sql += `GO\n\n`;

        // 5. Timesheets
        sql += `-- 5. PONTAJE 2025 (${timesheets.length} înregistrări)\n`;
        timesheets.forEach(t => {
            // SQL Server prefers YYYY-MM-DD HH:MM:SS for strings implicitly cast to datetime2
            const start = t.startTime.replace('T', ' ').substring(0, 19);
            const end = t.endTime ? `'${t.endTime.replace('T', ' ').substring(0, 19)}'` : 'NULL';
            const schedId = t.detectedScheduleId ? `'${t.detectedScheduleId}'` : 'NULL';
            const officeId = t.matchedOfficeId ? `'${t.matchedOfficeId}'` : 'NULL';

            sql += `INSERT INTO timesheets (id, user_id, start_time, end_time, date, status, matched_office_id, detected_schedule_id) VALUES ('${t.id}', '${t.userId}', '${start}', ${end}, '${t.date}', '${t.status}', ${officeId}, ${schedId});\n`;
        });
        sql += `GO\n`;

        // Download Trigger
        const blob = new Blob([sql], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pontaj_data_2025_${new Date().getTime()}.sql`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const generateMockData2025 = async () => {
        if (!onBulkImport) return;
        if (!confirm("Generare date 2025? (Sistemul va genera pontaje doar pentru zilele lucrătoare, excluzând Weekend-urile și Sărbătorile Legale)")) return;

        setIsGenerating(true);

        // Wait a moment to allow UI to update to "Loading" state
        await new Promise(resolve => setTimeout(resolve, 100));

        const generatedTimesheets: Timesheet[] = [];
        const generatedLeaves: LeaveRequest[] = [];
        const generatedCorrections: CorrectionRequest[] = [];

        const year = 2025;
        const coConfig = INITIAL_LEAVE_CONFIGS.find(lc => lc.code === 'CO');
        const cmConfig = INITIAL_LEAVE_CONFIGS.find(lc => lc.code === 'CM');
        const delConfig = INITIAL_LEAVE_CONFIGS.find(lc => lc.code === 'DEL-T');

        const userLeavePlans: Record<string, string[]> = {};

        // 1. Pre-calculate Leave Plans (Summer/Winter), strictly avoiding Holidays
        users.forEach(user => {
            userLeavePlans[user.id] = [];
            let daysAllocated = 0;

            // Summer Block
            const summerMonth = Math.random() > 0.5 ? 6 : 7;
            const summerStartDay = Math.floor(Math.random() * 15) + 1;
            for (let i = 0; i < 10; i++) {
                const d = new Date(year, summerMonth, summerStartDay + i);
                const safeDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isHoliday = HOLIDAYS_RO.some(h => h.date === safeDate);

                if (!isWeekend && !isHoliday) {
                    userLeavePlans[user.id].push(safeDate);
                    daysAllocated++;
                }
            }

            // Winter Block
            const winterStartDay = 15;
            for (let i = 0; i < 7; i++) {
                const d = new Date(year, 11, winterStartDay + i);
                const safeDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isHoliday = HOLIDAYS_RO.some(h => h.date === safeDate);

                if (!isWeekend && !isHoliday && daysAllocated < 21) {
                    userLeavePlans[user.id].push(safeDate);
                }
            }
        });

        // Loop through months instead of one giant loop to prevent UI blocking
        for (let m = 0; m < 12; m++) {
            // Yield to event loop to prevent "Violation: Handler took Xms"
            await new Promise(resolve => setTimeout(resolve, 0));

            const daysInMonth = new Date(year, m + 1, 0).getDate();

            for (let day = 1; day <= daysInMonth; day++) {
                const d = new Date(year, m, day);
                // CRITICAL FIX: Use manual string construction to avoid UTC timezone shifts
                const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                const dayOfWeek = d.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isHoliday = HOLIDAYS_RO.some(h => h.date === dateStr);

                users.forEach(user => {
                    if (!user.isValidated) return;

                    // 2. Generate Planned Leaves (Already filtered for holidays above)
                    if (userLeavePlans[user.id].includes(dateStr)) {
                        if (coConfig) {
                            generatedLeaves.push({
                                id: `gen-lr-${user.id}-${dateStr}`,
                                userId: user.id, typeId: coConfig.id, typeName: coConfig.name,
                                startDate: dateStr, endDate: dateStr, reason: "Concediu de odihnă planificat 2025",
                                status: LeaveStatus.APPROVED, createdAt: new Date(year, 0, 15).toISOString()
                            });
                        }
                        return;
                    }

                    // 3. Generate Work Days (Skip Weekend AND Holidays)
                    if (!isWeekend && !isHoliday) {
                        const rand = Math.random();
                        if (rand < 0.001 && cmConfig) {
                            generatedLeaves.push({
                                id: `gen-cm-${user.id}-${dateStr}`, userId: user.id, typeId: cmConfig.id, typeName: cmConfig.name,
                                startDate: dateStr, endDate: dateStr, reason: "Problemă medicală", status: LeaveStatus.APPROVED
                            });
                            return;
                        }

                        const isDelegation = Math.random() < 0.02;
                        if (isDelegation && delConfig) {
                            generatedLeaves.push({
                                id: `gen-del-${user.id}-${dateStr}`, userId: user.id, typeId: delConfig.id, typeName: delConfig.name,
                                startDate: dateStr, endDate: dateStr, reason: "Delegație client", status: LeaveStatus.APPROVED
                            });
                        }

                        // Determine shift based on mainScheduleId
                        const schedule = workSchedules.find(s => s.id === user.mainScheduleId) || workSchedules[0];
                        const [sh, sm] = schedule.startTime.split(':').map(Number);
                        const [eh, em] = schedule.endTime.split(':').map(Number);

                        const startHour = sh;
                        const startMin = sm + Math.floor(Math.random() * 15) - 5; // +/- 5 mins variation
                        const startTime = new Date(d);
                        startTime.setHours(startHour, startMin, 0);

                        const endHour = eh;
                        const endMin = em + Math.floor(Math.random() * 15);
                        const endTime = new Date(d);
                        if (schedule.crossesMidnight) endTime.setDate(endTime.getDate() + 1);
                        endTime.setHours(endHour, endMin, 0);

                        let location = { latitude: 44.4268, longitude: 26.1025 };
                        let officeId = user.assignedOfficeId;
                        let dist = 50;

                        if (isDelegation) { officeId = undefined; dist = 5000; location = { latitude: 45.0, longitude: 25.0 }; }

                        generatedTimesheets.push({
                            id: `gen-ts-${user.id}-${dateStr}`,
                            userId: user.id,
                            date: dateStr,
                            startTime: startTime.toISOString(),
                            endTime: endTime.toISOString(),
                            status: ShiftStatus.COMPLETED,
                            startLocation: location,
                            endLocation: location,
                            matchedOfficeId: officeId,
                            distanceToOffice: dist,
                            breaks: [],
                            detectedScheduleId: schedule.id, // Assign the schedule
                            detectedScheduleName: schedule.name
                        });
                    }
                });
            }
        }

        // 1. Update Local State
        onBulkImport(generatedTimesheets, generatedLeaves, generatedCorrections);
        setGeneratedData({ timesheets: generatedTimesheets, leaves: generatedLeaves, corrections: generatedCorrections });

        alert(`Generare Completă!\n\nTimesheets: ${generatedTimesheets.length}\nConcedii: ${generatedLeaves.length}\n\nDatele exclud automat Sărbătorile Legale 2025.`);
        setIsGenerating(false);
    };

    const userColumns: Column<User>[] = [
        { header: 'Angajat', accessor: 'name', sortable: true, filterable: true, render: (u) => <div className="flex items-center gap-3"><img src={u.avatarUrl} className="w-8 h-8 rounded-full border border-gray-100 dark:border-gray-800" /><div className="transition-colors"><p className="font-bold text-sm text-gray-800 dark:text-gray-200">{u.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p></div></div> },
        { header: 'ID ERP', accessor: 'erpId', render: (u) => <span className="font-mono text-xs bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded transition-colors">{u.erpId || '-'}</span> },
        { header: 'Companie', accessor: (u) => <span className="text-gray-700 dark:text-gray-300 transition-colors">{companies.find(c => c.id === u.companyId)?.name || '-'}</span> },
        { header: 'Status', accessor: 'employmentStatus', render: (u) => getStatusLabel(u.employmentStatus) },
        {
            header: 'Dispozitiv (2FA)',
            accessor: 'hasTrustedDevice',
            render: (u) => (
                <div className="flex items-center gap-2 flex-wrap">
                    {u.hasTrustedDevice ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded text-[11px] font-medium" title={u.trustedDeviceLabel}>
                            <Smartphone size={12} /> {u.trustedDeviceLabel || 'Telefon înrolat'}
                        </span>
                    ) : (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">Neînrolat</span>
                    )}
                    <button
                        type="button"
                        onClick={() => handleGenerateDeviceCode(u)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                        title="Generează cod 2FA (6 cifre) valabil 10 minute pentru înrolarea telefonului"
                    >
                        <KeyRound size={11} /> Cod 2FA
                    </button>
                    {u.hasTrustedDevice && (
                        <button
                            type="button"
                            onClick={() => handleResetDevice(u)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors"
                            title="Deblochează contul de pe vechiul telefon pentru a permite înrolarea unui telefon nou"
                        >
                            <RotateCcw size={11} /> Reset Telefon
                        </button>
                    )}
                </div>
            )
        },
        { header: 'Acțiuni', accessor: 'id', render: (u) => <button onClick={() => setEditingUser(u)} className="text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 p-2 transition-colors"><Edit2 size={16} /></button> }
    ];

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 dark:bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-lg transition-colors">
                <div className="flex items-center gap-3"><Database size={24} /><div><h3 className="font-bold text-sm">SQL Bridge</h3><p className="text-xs text-slate-300 dark:text-slate-400">{dbStatus}</p></div></div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsQrModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors"><QrCode size={14} /> Cod QR Aplicație Mobilă</button>
                    <button onClick={handleManualDBSync} disabled={isDbSyncing} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 dark:bg-slate-800 hover:bg-slate-600 dark:hover:bg-slate-700 rounded text-xs transition-colors"><RefreshCw size={14} className={isDbSyncing ? "animate-spin" : ""} /> Sync</button>
                </div>
            </div>

            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto transition-colors">
                <button onClick={() => setActiveSubTab('pending')} className={`pb-2 px-1 text-sm font-medium transition-colors ${activeSubTab === 'pending' ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Listă Utilizatori</button>
                <button onClick={() => setActiveSubTab('create')} className={`pb-2 px-1 text-sm font-medium transition-colors ${activeSubTab === 'create' ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Sincronizare BioeelAuth</button>
                <button onClick={() => setActiveSubTab('generator')} className={`pb-2 px-1 text-sm font-medium flex items-center gap-1 transition-colors ${activeSubTab === 'generator' ? 'border-b-2 border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}><Wand2 size={14} /> Generator 2025</button>
            </div>

            {activeSubTab === 'generator' && (
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 animate-in fade-in transition-colors">
                    <div className="flex items-start gap-4">
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl text-purple-600 dark:text-purple-400 transition-colors"><Wand2 size={32} /></div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Generator Date 2025</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Simulează un an complet de activitate. Sistemul detectează și exclude automat <strong>Sărbătorile Legale 2025</strong> din generarea pontajelor.</p>

                            <div className="flex gap-4 mt-4">
                                <button onClick={generateMockData2025} disabled={isGenerating} className="bg-purple-600 dark:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 dark:hover:bg-purple-800 shadow-md flex items-center gap-2 transition-colors">
                                    {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <Wand2 size={18} />} Generare Date
                                </button>

                                {generatedData && (
                                    <button onClick={generateSQL2025} className="bg-slate-700 dark:bg-slate-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800 dark:hover:bg-slate-700 shadow-md flex items-center gap-2 transition-colors">
                                        <Download size={18} /> Download .SQL
                                    </button>
                                )}
                            </div>

                            {generatedData && (
                                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs rounded border border-green-200 dark:border-green-800 transition-colors">
                                    Date generate gata de export! Include {generatedData.timesheets.length} pontaje și {generatedData.leaves.length} concedii.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeSubTab === 'pending' && (
                <div className="space-y-4">
                    {activeDeviceCode && (
                        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <KeyRound size={22} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                                        Cod 2FA Înrolare Telefon pentru {activeDeviceCode.userName} ({activeDeviceCode.email})
                                    </p>
                                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                                        Comunicați acest cod angajatului (valabil 10 minute): <span className="font-mono font-black text-base tracking-widest bg-white dark:bg-gray-900 px-2.5 py-0.5 rounded border border-blue-300 dark:border-blue-700 ml-1">{activeDeviceCode.code}</span>
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setActiveDeviceCode(null)} className="text-blue-500 hover:text-blue-700 p-1"><X size={16} /></button>
                        </div>
                    )}
                    <SmartTable data={activeListUsers} columns={userColumns} pageSize={10} />
                    {pendingUsers.length > 0 && (
                        <div className="grid gap-4 mt-4 transition-colors">
                            <h4 className="text-sm font-semibold text-orange-500 flex items-center gap-2"><ShieldAlert size={16} /> Necesită Validare ({pendingUsers.length})</h4>
                            {pendingUsers.map(user => (
                                <div key={user.id} className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg flex justify-between items-center border border-orange-100 dark:border-orange-800/50 transition-colors">
                                    <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">{user.name} <span className="text-gray-500 dark:text-gray-400 font-normal">({user.email})</span></p>
                                    <button onClick={() => setValidationUser(user)} className="bg-orange-600 dark:bg-orange-700 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 hover:bg-orange-700 dark:hover:bg-orange-800 transition-colors"><Eye size={14} /> Validează</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeSubTab === 'create' && (
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 max-w-2xl transition-colors">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                        <RefreshCw size={20} className="text-emerald-600 dark:text-emerald-400" /> Sincronizare Director Angajați (BioeelAuth)
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Gestiunea utilizatorilor este acum centralizată. Aplicația de Pontaj se sincronizează automat cu baza de date <strong>BioeelAuth</strong> (REST API). Nu mai este necesară crearea manuală a angajaților în Pontaj.
                    </p>
                    
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 p-4 rounded-lg mb-6">
                        <h4 className="font-bold text-emerald-800 dark:text-emerald-400 text-sm mb-2 flex items-center gap-1">
                            <Layers size={16} /> Ce date se importă/actualizează?
                        </h4>
                        <ul className="list-disc list-inside text-xs text-emerald-700 dark:text-emerald-500 space-y-1">
                            <li>Datele personale de bază: Nume, Email, ID ERP (Marca).</li>
                            <li>Afilierile de companie și departamentele angajaților.</li>
                            <li>Statusul contului (angajații marcați inactivi în BioeelAuth sunt suspendați instantaneu).</li>
                            <li>Setările specifice de pontaj (Roluri, Reguli GPS, Programe) rămân configurabile local.</li>
                        </ul>
                    </div>

                    <button
                        onClick={async () => {
                            setIsDbSyncing(true);
                            try {
                                const res = await SQLService.syncUsers();
                                if (res.success) {
                                    showToast(`Sincronizare finalizată cu succes! S-au actualizat ${res.count} utilizatori.`, 'success');
                                    if (onRefreshData) {
                                        await onRefreshData();
                                    }
                                } else {
                                    showToast("Eroare la sincronizare: " + res.error, 'error');
                                }
                            } catch (e: any) {
                                showToast("Eroare de rețea la sincronizare: " + e.message, 'error');
                            } finally {
                                setIsDbSyncing(false);
                            }
                        }}
                        disabled={isDbSyncing}
                        className="w-full bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={isDbSyncing ? "animate-spin" : ""} />
                        {isDbSyncing ? 'Sincronizare în curs...' : 'Sincronizează Acum cu BioeelAuth'}
                    </button>
                </div>
            )}

            {/* FULL USER EDIT MODAL */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
                    <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800 transition-colors">
                        <div className="bg-emerald-600 dark:bg-emerald-700 p-4 flex justify-between items-center text-white shrink-0">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Edit2 size={20} /> Editare Utilizator
                                {editingUser.source === 'ERP' && <span className="text-xs bg-white text-emerald-700 px-2 py-0.5 rounded font-bold ml-2 shadow-sm shrink-0">📦 Sincronizat ERP</span>}
                            </h3>
                            <button onClick={() => setEditingUser(null)} className="hover:bg-white/20 p-1 rounded transition-colors"><X size={20} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 transition-colors">

                            {/* Identity Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nume Complet</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-900"
                                        value={editingUser.name}
                                        disabled={editingUser.source === 'ERP'}
                                        onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Email</label>
                                    <input
                                        type="email"
                                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-900"
                                        value={editingUser.email}
                                        disabled={editingUser.source === 'ERP'}
                                        onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">ID ERP</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-mono transition-all disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-900"
                                        value={editingUser.erpId || ''}
                                        disabled={editingUser.source === 'ERP'}
                                        onChange={e => setEditingUser({ ...editingUser, erpId: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Status Angajare</label>
                                    <select
                                        value={editingUser.employmentStatus || 'ACTIVE'}
                                        onChange={e => setEditingUser({ ...editingUser, employmentStatus: e.target.value as any })}
                                        className={`w-full p-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-bold transition-all ${editingUser.employmentStatus === 'TERMINATED' ? 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 border-red-200' :
                                            editingUser.employmentStatus === 'SUSPENDED' ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200' : 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 border-green-200'
                                            }`}
                                    >
                                        <option value="ACTIVE">Activ</option>
                                        <option value="SUSPENDED">Suspendat (CIC etc.)</option>
                                        <option value="TERMINATED">Încetat (Ex-angajat)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Organization Section */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2"><Briefcase size={16} /> Organizație</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Companie</label>
                                        <select
                                            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-900"
                                            value={editingUser.companyId}
                                            disabled={editingUser.source === 'ERP'}
                                            onChange={e => setEditingUser({ ...editingUser, companyId: e.target.value, departmentId: '' })}
                                        >
                                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Departament</label>
                                        <select
                                            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-900"
                                            value={editingUser.departmentId || ''}
                                            disabled={editingUser.source === 'ERP'}
                                            onChange={e => setEditingUser({ ...editingUser, departmentId: e.target.value })}
                                        >
                                            <option value="">Fără departament</option>
                                            {departments.filter(d => d.companyId === editingUser.companyId).map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sediu Alocat</label>
                                        <select
                                            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors"
                                            value={editingUser.assignedOfficeId || ''}
                                            onChange={e => setEditingUser({ ...editingUser, assignedOfficeId: e.target.value })}
                                        >
                                            <option value="">Niciunul (Remote/Mobil)</option>
                                            {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Pontator Alocat</label>
                                        <select
                                            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors"
                                            value={editingUser.timekeeperId || ''}
                                            onChange={e => setEditingUser({ ...editingUser, timekeeperId: e.target.value })}
                                        >
                                            <option value="">Fără pontator (Management direct)</option>
                                            {pontators.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Schedule & Rules */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2"><Clock size={16} /> Program & Reguli</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Normă (Ore)</label>
                                        <input
                                            type="number"
                                            min={1} max={12}
                                            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors"
                                            value={editingUser.contractHours || 8}
                                            onChange={e => setEditingUser({ ...editingUser, contractHours: parseInt(e.target.value) || 8 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Program Principal</label>
                                        <select
                                            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors"
                                            value={editingUser.mainScheduleId || ''}
                                            onChange={e => setEditingUser({ ...editingUser, mainScheduleId: e.target.value })}
                                        >
                                            {workSchedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={editingUser.requiresGPS}
                                            onChange={e => setEditingUser({ ...editingUser, requiresGPS: e.target.checked })}
                                            className="w-4 h-4 text-emerald-600 dark:text-emerald-500 rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Necesită GPS la pontaj</span>
                                    </div>
                                </div>

                                {/* Alternative Schedules */}
                                <div className="col-span-full mt-4 border-t border-gray-200 dark:border-gray-700 pt-3 transition-colors">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-1"><CalendarClock size={12} /> Programe Alternative / Secundare</label>
                                    <div className="flex flex-wrap gap-2">
                                        {workSchedules.map(sch => {
                                            const isMain = editingUser.mainScheduleId === sch.id;
                                            const isSelected = (editingUser.alternativeScheduleIds || []).includes(sch.id);
                                            return (
                                                <button
                                                    key={sch.id}
                                                    type="button"
                                                    disabled={isMain}
                                                    onClick={() => toggleAltSchedule(sch.id)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isMain ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed' :
                                                        isSelected ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900/50' :
                                                            'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                        }`}
                                                >
                                                    {sch.name} {isMain && '(Principal)'}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 italic">Selectați turele suplimentare pe care acest angajat le poate efectua (ex: Tura de Noapte, Weekend).</p>
                                </div>
                            </div>

                            {/* Roles */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Roluri & Permisiuni</label>
                                <div className="flex gap-4 flex-wrap bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800 transition-colors">
                                    {Object.values(Role).map(role => (
                                        <label key={role} className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={editingUser.roles.includes(role)}
                                                onChange={() => {
                                                    const newRoles = editingUser.roles.includes(role)
                                                        ? editingUser.roles.filter(r => r !== role)
                                                        : [...editingUser.roles, role];
                                                    setEditingUser({ ...editingUser, roles: newRoles });
                                                }}
                                                className="w-4 h-4 text-emerald-600 dark:text-emerald-500 rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{role}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                        </div>

                        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/80 transition-colors">
                            <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 rounded border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all">Anulează</button>
                            <button onClick={() => { onUpdateUser(editingUser); setEditingUser(null); }} className="px-6 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded font-bold hover:bg-emerald-700 dark:hover:bg-emerald-600 shadow-md transition-all">Salvează Modificările</button>
                        </div>
                    </div>
                </div>
            )}

            {validationUser && <UserValidationModal isOpen={!!validationUser} onClose={() => setValidationUser(null)} user={validationUser} companies={companies} departments={departments} offices={offices} workSchedules={workSchedules} onValidate={(u) => { onValidateUser(u.id); onUpdateUser(u); }} />}
            <MobileInstallQRModal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} />
        </div>
    );
};

export default AdminUserManagement;
