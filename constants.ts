
import { Company, Office, User, Role, Timesheet, ShiftStatus, LeaveRequest, LeaveStatus, Department, CorrectionRequest, BreakConfig, LeaveConfig, WorkSchedule, AppConfig, DailySchedule, Notification, Holiday } from './types';

// --- CONFIGURARE APLICATIE (Hardcodata) ---
export const APP_CONFIG: AppConfig = {
    maxCorrectionDays: 5, // Angajatii pot cere corectie doar pentru ultimele 5 zile
    monthCutoffDay: 5, // Luna anterioara se inchide pe data de 5 a lunii curente
    autoClockOutAlertHours: 2, // Daca trec 2 ore peste program si userul e inca WORKING -> Alerta
    startWorkHourThreshold: 10, // Daca e ora 10:00 si nu s-a pontat -> Alerta Manager
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

export const MOCK_SCHEDULES: WorkSchedule[] = [
  { id: 'sch1', name: 'Standard (09:00 - 17:00)', startTime: '09:00', endTime: '17:00', crossesMidnight: false },
  { id: 'sch2', name: 'Schimbul 2 (14:00 - 22:00)', startTime: '14:00', endTime: '22:00', crossesMidnight: false },
  { id: 'sch3', name: 'Schimb Noapte (22:00 - 06:00)', startTime: '22:00', endTime: '06:00', crossesMidnight: true }
];

// --- INITIAL SCHEDULE PLANS (Calendar) ---
export const INITIAL_SCHEDULE_PLANS: DailySchedule[] = [
    // Assign Night Shift to 'u3' for tomorrow
    { 
        id: 'ds1', 
        userId: 'u3', 
        date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0], 
        scheduleId: 'sch3' 
    }
];

export const INITIAL_NOTIFICATIONS: Notification[] = [];

// ------------------------------

export const MOCK_COMPANIES: Company[] = [
  { id: 'c1', name: 'TechGroup Solutions' },
  { id: 'c2', name: 'Logistics Prime' }
];

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'd1', name: 'Dezvoltare Software', companyId: 'c1', managerId: 'u1', emailNotifications: true },
  { id: 'd2', name: 'Resurse Umane', companyId: 'c1', managerId: 'u4', emailNotifications: true },
  { id: 'd3', name: 'Logistică & Transport', companyId: 'c2', managerId: 'u5', emailNotifications: false }
];

export const MOCK_OFFICES: Office[] = [
  {
    id: 'off1',
    name: 'HQ - București Nord',
    companyId: 'c1',
    coordinates: { latitude: 44.482, longitude: 26.105 },
    radiusMeters: 150
  },
  {
    id: 'off2',
    name: 'Depozit - Ilfov',
    companyId: 'c2',
    coordinates: { latitude: 44.435, longitude: 26.012 },
    radiusMeters: 300
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
    avatarUrl: 'https://picsum.photos/100/100',
    authType: 'MICROSOFT',
    isValidated: true,
    requiresGPS: true,
    allowedScheduleIds: ['sch1'],
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
    avatarUrl: 'https://picsum.photos/101/101',
    authType: 'PIN',
    pin: '1234',
    isValidated: true,
    requiresGPS: true,
    allowedScheduleIds: ['sch1', 'sch2'],
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
    avatarUrl: 'https://picsum.photos/102/102',
    authType: 'PIN',
    pin: '0000',
    isValidated: true,
    requiresGPS: false,
    allowedScheduleIds: ['sch1', 'sch3'], // Can work Night Shift
    birthDate: new Date().toISOString().split('T')[0], // Simulate birthday today for demo
    shareBirthday: true,
    contractHours: 8,
    assignedOfficeId: 'off2',
    lastLoginDate: undefined, // Never logged in
    employmentStatus: 'ACTIVE' // Will likely be suspended by the automated job
  },
  {
    id: 'u4',
    erpId: 'HR-001',
    name: 'Ioana HR',
    roles: [Role.HR, Role.EMPLOYEE],
    companyId: 'c1',
    departmentId: 'd2',
    email: 'ioana.hr@techgroup.ro',
    avatarUrl: 'https://picsum.photos/103/103',
    authType: 'MICROSOFT',
    isValidated: true,
    requiresGPS: true,
    allowedScheduleIds: ['sch1'],
    birthDate: '1988-03-12',
    shareBirthday: false, // Hides birthday
    contractHours: 4, // Part time
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
    avatarUrl: 'https://picsum.photos/104/104',
    authType: 'MICROSOFT',
    isValidated: true,
    requiresGPS: false,
    allowedScheduleIds: ['sch1', 'sch2', 'sch3'],
    birthDate: '1980-01-01',
    shareBirthday: true,
    contractHours: 8,
    lastLoginDate: new Date().toISOString(),
    employmentStatus: 'ACTIVE'
  }
];

// Initial State Mock
export const INITIAL_TIMESHEETS: Timesheet[] = [
  {
    id: 'ts1',
    userId: 'u2',
    startTime: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // Yesterday
    endTime: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    breaks: [],
    date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0],
    status: ShiftStatus.COMPLETED,
    matchedOfficeId: 'off1',
    distanceToOffice: 20,
    detectedScheduleId: 'sch1',
    detectedScheduleName: 'Standard (09:00 - 17:00)',
    logs: [
      {
        id: 'log1',
        changedByUserId: 'u2',
        changeDate: new Date().toISOString(),
        details: 'Pontaj inițial creat automat.'
      }
    ]
  }
];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'lr1',
    userId: 'u2',
    typeId: 'lc1',
    typeName: 'Concediu Odihnă',
    startDate: '2024-06-10',
    endDate: '2024-06-15',
    reason: 'Concediu de vară planificat.',
    status: LeaveStatus.PENDING
  }
];

export const INITIAL_CORRECTION_REQUESTS: CorrectionRequest[] = [];

export const HOLIDAYS_RO: Holiday[] = [
  { id: 'h1', date: '2024-01-01', name: 'Anul Nou' },
  { id: 'h2', date: '2024-01-02', name: 'Anul Nou (Ziua 2)' },
  { id: 'h3', date: '2024-01-24', name: 'Unirea Principatelor Române' },
  { id: 'h4', date: '2024-05-01', name: 'Ziua Muncii' },
  { id: 'h5', date: '2024-05-03', name: 'Vinerea Mare' },
  { id: 'h6', date: '2024-05-06', name: 'Paște Ortodox' },
  { id: 'h7', date: '2024-06-01', name: 'Ziua Copilului' },
  { id: 'h8', date: '2024-06-23', name: 'Rusalii' },
  { id: 'h9', date: '2024-06-24', name: 'A doua zi de Rusalii' },
  { id: 'h10', date: '2024-08-15', name: 'Adormirea Maicii Domnului' },
  { id: 'h11', date: '2024-11-30', name: 'Sfântul Andrei' },
  { id: 'h12', date: '2024-12-01', name: 'Ziua Națională a României' },
  { id: 'h13', date: '2024-12-25', name: 'Prima zi de Crăciun' },
  { id: 'h14', date: '2024-12-26', name: 'A doua zi de Crăciun' }
];
