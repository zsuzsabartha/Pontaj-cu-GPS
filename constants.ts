
import { Company, Office, User, Role, Timesheet, ShiftStatus, LeaveRequest, LeaveStatus, Department, CorrectionRequest, BreakConfig, LeaveConfig, WorkSchedule, AppConfig, DailySchedule, Notification, Holiday, Break, BreakStatus } from './types';

// --- CONFIGURARE APLICATIE (Hardcodata) ---
export const APP_CONFIG: AppConfig = {
    maxCorrectionDays: 5, // Angajatii pot cere corectie doar pentru ultimele 5 zile
    monthCutoffDay: 5, // Luna anterioara se inchide pe data de 5 a lunii curente
    autoClockOutAlertHours: 2, // Daca trec 2 ore peste program si userul e inca WORKING -> Alerta
    startWorkHourThreshold: 10, // Daca e ora 10:00 si nu s-a pontat -> Alerta Manager
};

// --- HELPER FUNC: DATE LOCKING (CLOSED MONTH) ---
export const getDefaultLockedDate = (): string => {
    const today = new Date();
    const currentDay = today.getDate();
    const cutoffDay = APP_CONFIG.monthCutoffDay;
    
    let lockDateObj = new Date(today.getFullYear(), today.getMonth(), 0); 
    
    if (currentDay <= cutoffDay) {
        lockDateObj = new Date(today.getFullYear(), today.getMonth() - 1, 0);
    }
    
    const offset = lockDateObj.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(lockDateObj.getTime() - offset)).toISOString().slice(0, 10);
    return localISOTime;
};

export const isDateInLockedPeriod = (dateStr: string, lockedDate: string): boolean => {
    if (!dateStr || !lockedDate) return false;
    return dateStr <= lockedDate;
};

// --- API CONNECTION CONFIG ---
export const API_CONFIG = {
    BASE_URL: 'http://localhost:3001/api/v1',
    TIMEOUT: 10000
};

// --- NOMENCLATOARE INITIALE ---

export const INITIAL_BREAK_CONFIGS: BreakConfig[] = [
  { id: 'bc1', name: 'Pauză Personală', isPaid: false, icon: 'coffee' }, // Se scade
  { id: 'bc2', name: 'Interes Serviciu', isPaid: true, icon: 'briefcase' }, // Nu se scade
  { id: 'bc3', name: 'Pauză de Masă', isPaid: false, icon: 'utensils' }
];

export const INITIAL_LEAVE_CONFIGS: LeaveConfig[] = [
  { id: 'lc1', name: 'Concediu Odihnă', code: 'CO', requiresApproval: true },
  { id: 'lc2', name: 'Concediu Medical', code: 'CM', requiresApproval: true },
  { id: 'lc3', name: 'Delegație (Cu Tichet)', code: 'DEL-T', requiresApproval: true },
  { id: 'lc4', name: 'Delegație (Fără Tichet)', code: 'DEL-F', requiresApproval: true },
  { id: 'lc5', name: 'Eveniment Special', code: 'EV', requiresApproval: true },
  { id: 'lc6', name: 'Fără Plată', code: 'CFP', requiresApproval: true }
];

// Renamed from MOCK_SCHEDULES to INITIAL... as this will now be editable state
export const INITIAL_WORK_SCHEDULES: WorkSchedule[] = [
  { id: 'sch1', name: 'Standard (09:00 - 17:00)', startTime: '09:00', endTime: '17:00', crossesMidnight: false },
  { id: 'sch2', name: 'Schimbul 2 (14:00 - 22:00)', startTime: '14:00', endTime: '22:00', crossesMidnight: false },
  { id: 'sch3', name: 'Schimb Noapte (22:00 - 06:00)', startTime: '22:00', endTime: '06:00', crossesMidnight: true }
];

// KEEPING MOCK_SCHEDULES for backward compatibility during refactor if needed by other files, 
// but pointing to the new constant
export const MOCK_SCHEDULES = INITIAL_WORK_SCHEDULES;

// --- INITIAL SCHEDULE PLANS (Calendar) ---
export const INITIAL_SCHEDULE_PLANS: DailySchedule[] = [];

export const INITIAL_NOTIFICATIONS: Notification[] = [];

// ------------------------------

export const MOCK_COMPANIES: Company[] = [
  { id: 'c1', name: 'TechGroup Solutions' },
  { id: 'c2', name: 'Logistics Prime' }
];

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'd1', name: 'Dezvoltare Software', companyId: 'c1', managerId: 'u1', emailNotifications: true },
  { id: 'd2', name: 'Resurse Umane', companyId: 'c1', managerId: 'u4', emailNotifications: true },
  { id: 'd3', name: 'Logistică & Transport', companyId: 'c2', managerId: 'u5', emailNotifications: false },
  { id: 'd4', name: 'Vânzări & Marketing', companyId: 'c1', managerId: 'u1', emailNotifications: true }
];

export const MOCK_OFFICES: Office[] = [
  {
    id: 'off1',
    name: 'HQ - București Nord',
    coordinates: { latitude: 44.482, longitude: 26.105 },
    radiusMeters: 150
  },
  {
    id: 'off2',
    name: 'Depozit - Ilfov',
    coordinates: { latitude: 44.435, longitude: 26.012 },
    radiusMeters: 300
  },
  {
    id: 'off3',
    name: 'Hub Cluj-Napoca',
    coordinates: { latitude: 46.7712, longitude: 23.6236 },
    radiusMeters: 200
  }
];

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    erpId: 'EMP-001',
    name: 'Alexandru Popescu',
    roles: [Role.MANAGER], 
    companyId: 'c1',
    departmentId: 'd1',
    email: 'alex.popescu@techgroup.ro',
    avatarUrl: 'https://ui-avatars.com/api/?name=Alexandru+Popescu&background=random',
    authType: 'PIN', 
    pin: '1111',
    isValidated: true,
    requiresGPS: true,
    mainScheduleId: 'sch1',
    alternativeScheduleIds: [],
    birthDate: '1985-05-20',
    shareBirthday: true,
    contractHours: 8,
    assignedOfficeId: 'off1',
    lastLoginDate: new Date().toISOString(),
    employmentStatus: 'ACTIVE'
  },
  {
    id: 'u2',
    erpId: 'EMP-002',
    name: 'Elena Ionescu',
    roles: [Role.EMPLOYEE],
    companyId: 'c1',
    departmentId: 'd1',
    email: 'elena.ionescu@techgroup.ro',
    avatarUrl: 'https://ui-avatars.com/api/?name=Elena+Ionescu&background=random',
    authType: 'PIN',
    pin: '1234',
    isValidated: true,
    requiresGPS: true,
    mainScheduleId: 'sch1',
    alternativeScheduleIds: ['sch2'],
    birthDate: '1990-10-15',
    shareBirthday: true,
    contractHours: 8,
    assignedOfficeId: 'off1',
    lastLoginDate: new Date().toISOString(),
    employmentStatus: 'ACTIVE'
  },
  {
    id: 'u3',
    erpId: 'LOG-104',
    name: 'Mihai Radu',
    roles: [Role.EMPLOYEE],
    companyId: 'c2',
    departmentId: 'd3',
    email: 'mihai.radu@logistics.ro',
    avatarUrl: 'https://ui-avatars.com/api/?name=Mihai+Radu&background=random',
    authType: 'PIN',
    pin: '0000',
    isValidated: true,
    requiresGPS: false,
    mainScheduleId: 'sch1',
    alternativeScheduleIds: ['sch3'], // Can work Night Shift
    birthDate: new Date().toISOString().split('T')[0], // Simulate birthday today for demo
    shareBirthday: true,
    contractHours: 8,
    assignedOfficeId: 'off2',
    lastLoginDate: undefined, // Never logged in
    employmentStatus: 'ACTIVE' 
  },
  {
    id: 'u4',
    erpId: 'HR-001',
    name: 'Ioana HR',
    roles: [Role.HR, Role.EMPLOYEE],
    companyId: 'c1',
    departmentId: 'd2',
    email: 'ioana.hr@techgroup.ro',
    avatarUrl: 'https://ui-avatars.com/api/?name=Ioana+HR&background=random',
    authType: 'PIN', 
    pin: '4444',
    isValidated: true,
    requiresGPS: true,
    mainScheduleId: 'sch1',
    alternativeScheduleIds: [],
    birthDate: '1988-03-12',
    shareBirthday: false, 
    contractHours: 4, 
    assignedOfficeId: 'off1',
    lastLoginDate: new Date().toISOString(),
    employmentStatus: 'ACTIVE'
  },
  {
    id: 'u5',
    erpId: 'ADM-999',
    name: 'Admin General',
    roles: [Role.ADMIN, Role.MANAGER],
    companyId: 'c1',
    email: 'admin@techgroup.ro',
    avatarUrl: 'https://ui-avatars.com/api/?name=Admin+General&background=random',
    authType: 'PIN', 
    pin: '9999',
    isValidated: true,
    requiresGPS: false,
    mainScheduleId: 'sch1',
    alternativeScheduleIds: ['sch2', 'sch3'],
    birthDate: '1980-01-01',
    shareBirthday: true,
    contractHours: 8,
    lastLoginDate: new Date().toISOString(),
    employmentStatus: 'ACTIVE'
  },
  {
    id: 'u6',
    erpId: 'LOG-202',
    name: 'Andrei Vasile',
    roles: [Role.MANAGER],
    companyId: 'c2',
    departmentId: 'd3',
    email: 'andrei.vasile@logistics.ro',
    avatarUrl: 'https://ui-avatars.com/api/?name=Andrei+Vasile&background=random',
    authType: 'PIN',
    pin: '5555',
    isValidated: true,
    requiresGPS: true,
    mainScheduleId: 'sch1',
    alternativeScheduleIds: ['sch3'],
    birthDate: '1982-08-08',
    shareBirthday: true,
    contractHours: 8,
    assignedOfficeId: 'off2',
    employmentStatus: 'ACTIVE'
  }
];

// Helper to create mock timesheets
const createMockTimesheet = (id: string, userId: string, dateStr: string, startH: number, endH: number, status: ShiftStatus): Timesheet => {
    const start = new Date(dateStr); start.setHours(startH, 0, 0);
    const end = new Date(dateStr); end.setHours(endH, 0, 0);
    
    // Random fake location (near Bucharest)
    const lat = 44.482 + (Math.random() * 0.01 - 0.005);
    const long = 26.105 + (Math.random() * 0.01 - 0.005);

    return {
        id,
        userId,
        date: dateStr,
        startTime: start.toISOString(),
        endTime: status === ShiftStatus.COMPLETED ? end.toISOString() : undefined,
        status: status,
        startLocation: { latitude: lat, longitude: long },
        endLocation: status === ShiftStatus.COMPLETED ? { latitude: lat, longitude: long } : undefined,
        matchedOfficeId: 'off1',
        distanceToOffice: 50,
        detectedScheduleId: 'sch1',
        syncStatus: 'SYNCED',
        breaks: [
            {
                id: `br-${id}`,
                typeId: 'bc3', // Lunch
                typeName: 'Pauză de Masă',
                status: BreakStatus.APPROVED,
                startTime: new Date(new Date(dateStr).setHours(12, 0, 0)).toISOString(),
                endTime: new Date(new Date(dateStr).setHours(12, 30, 0)).toISOString()
            }
        ]
    };
};

// Generate some recent timesheets
const generateRecentTimesheets = () => {
    const ts: Timesheet[] = [];
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const todayStr = today.toISOString().split('T')[0];
    const yStr = yesterday.toISOString().split('T')[0];
    const twoStr = twoDaysAgo.toISOString().split('T')[0];

    // Elena (Employee) - Working today
    ts.push({
        id: 'ts-u2-today',
        userId: 'u2',
        date: todayStr,
        startTime: new Date(today.setHours(8, 55, 0)).toISOString(),
        status: ShiftStatus.WORKING,
        startLocation: { latitude: 44.482, longitude: 26.105 },
        matchedOfficeId: 'off1',
        distanceToOffice: 20,
        detectedScheduleId: 'sch1',
        syncStatus: 'SYNCED',
        breaks: []
    });

    // Mihai (Logistics) - Late today
    ts.push({
        id: 'ts-u3-today',
        userId: 'u3',
        date: todayStr,
        startTime: new Date(today.setHours(10, 15, 0)).toISOString(),
        status: ShiftStatus.WORKING,
        startLocation: { latitude: 44.435, longitude: 26.012 },
        matchedOfficeId: 'off2',
        distanceToOffice: 400, // bit far
        detectedScheduleId: 'sch1',
        syncStatus: 'SYNCED',
        breaks: []
    });

    // History for everyone
    [yStr, twoStr].forEach((d, idx) => {
        ts.push(createMockTimesheet(`ts-u1-${idx}`, 'u1', d, 9, 17, ShiftStatus.COMPLETED));
        ts.push(createMockTimesheet(`ts-u2-${idx}`, 'u2', d, 9, 17, ShiftStatus.COMPLETED));
        ts.push(createMockTimesheet(`ts-u3-${idx}`, 'u3', d, 8, 16, ShiftStatus.COMPLETED));
        ts.push(createMockTimesheet(`ts-u6-${idx}`, 'u6', d, 10, 19, ShiftStatus.COMPLETED));
    });

    return ts;
};

export const INITIAL_TIMESHEETS: Timesheet[] = generateRecentTimesheets();

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
    {
        id: 'lr-1',
        userId: 'u2',
        typeId: 'lc1',
        typeName: 'Concediu Odihnă',
        startDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0], // In 5 days
        endDate: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString().split('T')[0],
        reason: 'Vacanta de vara planificata.',
        status: LeaveStatus.PENDING,
        createdAt: new Date().toISOString()
    },
    {
        id: 'lr-2',
        userId: 'u3',
        typeId: 'lc2',
        typeName: 'Concediu Medical',
        startDate: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString().split('T')[0],
        endDate: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString().split('T')[0],
        reason: 'Raceala.',
        status: LeaveStatus.APPROVED,
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString()
    }
];

export const INITIAL_CORRECTION_REQUESTS: CorrectionRequest[] = [
    {
        id: 'cr-1',
        userId: 'u2',
        requestedDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0],
        requestedStartTime: new Date(new Date().setHours(9, 0, 0)).toISOString(),
        requestedEndTime: new Date(new Date().setHours(18, 0, 0)).toISOString(), // 1h OT
        reason: 'Am stat peste program pentru proiectul Alpha.',
        status: 'PENDING'
    }
];

// Helper to generate holidays for multiple years
const generateHolidays = (years: number[]): Holiday[] => {
    const holidays: Holiday[] = [];
    years.forEach(year => {
        // Fixed Date Holidays
        holidays.push(
            { id: `hny-${year}`, date: `${year}-01-01`, name: 'Anul Nou' },
            { id: `hny2-${year}`, date: `${year}-01-02`, name: 'Anul Nou (Ziua 2)' },
            { id: `hup-${year}`, date: `${year}-01-24`, name: 'Unirea Principatelor Române' },
            { id: `hlm-${year}`, date: `${year}-05-01`, name: 'Ziua Muncii' },
            { id: `hzc-${year}`, date: `${year}-06-01`, name: 'Ziua Copilului' },
            { id: `hsm-${year}`, date: `${year}-08-15`, name: 'Adormirea Maicii Domnului' },
            { id: `hsa-${year}`, date: `${year}-11-30`, name: 'Sfântul Andrei' },
            { id: `hzn-${year}`, date: `${year}-12-01`, name: 'Ziua Națională a României' },
            { id: `hc1-${year}`, date: `${year}-12-25`, name: 'Prima zi de Crăciun' },
            { id: `hc2-${year}`, date: `${year}-12-26`, name: 'A doua zi de Crăciun' }
        );

        // Variable Holidays (Easter, Rusalii) - Simplified Hardcoded Logic for relevant years
        if (year === 2024) {
            holidays.push(
                { id: `hvm-${year}`, date: '2024-05-03', name: 'Vinerea Mare' },
                { id: `hp1-${year}`, date: '2024-05-05', name: 'Paște Ortodox' },
                { id: `hp2-${year}`, date: '2024-05-06', name: 'A doua zi de Paște' },
                { id: `hr1-${year}`, date: '2024-06-23', name: 'Rusalii' },
                { id: `hr2-${year}`, date: '2024-06-24', name: 'A doua zi de Rusalii' }
            );
        } else if (year === 2025) {
            holidays.push(
                { id: `hvm-${year}`, date: '2025-04-18', name: 'Vinerea Mare' },
                { id: `hp1-${year}`, date: '2025-04-20', name: 'Paște Ortodox' },
                { id: `hp2-${year}`, date: '2025-04-21', name: 'A doua zi de Paște' },
                { id: `hr1-${year}`, date: '2025-06-08', name: 'Rusalii' },
                { id: `hr2-${year}`, date: '2025-06-09', name: 'A doua zi de Rusalii' }
            );
        } else if (year === 2026) {
             holidays.push(
                { id: `hvm-${year}`, date: '2026-04-10', name: 'Vinerea Mare' },
                { id: `hp1-${year}`, date: '2026-04-12', name: 'Paște Ortodox' },
                { id: `hp2-${year}`, date: '2026-04-13', name: 'A doua zi de Paște' },
                { id: `hr1-${year}`, date: '2026-05-31', name: 'Rusalii' },
                { id: `hr2-${year}`, date: '2026-06-01', name: 'A doua zi de Rusalii' }
            );
        }
    });
    return holidays;
};

// Updated for 2023-2026 coverage
export const HOLIDAYS_RO: Holiday[] = generateHolidays([2023, 2024, 2025, 2026]);
