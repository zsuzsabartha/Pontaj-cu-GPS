
export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  HR = 'HR',
  ADMIN = 'ADMIN'
}

// Deprecated Enums - kept for backward compatibility if needed, but UI uses Config objects now
export enum ShiftStatus {
  NOT_STARTED = 'NOT_STARTED',
  WORKING = 'WORKING',
  ON_BREAK = 'ON_BREAK',
  COMPLETED = 'COMPLETED'
}

export enum BreakStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected'
}

export enum LeaveStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  CANCELLED = 'Cancelled'
}

// --- NEW DYNAMIC CONFIGURATIONS ---

export interface AppConfig {
  maxCorrectionDays: number; // How many days back can an employee request correction
  monthCutoffDay: number; // Day of the month (e.g., 5th) when previous month is locked
  autoClockOutAlertHours: number; // "X" hours after shift end to alert user
  startWorkHourThreshold: number; // Hour (0-23) after which an employee is considered "absent" if not clocked in
}

export interface BreakConfig {
  id: string;
  name: string; // e.g., "Pauza de Masa", "Personal"
  isPaid: boolean; // true = counts as work time, false = deducted from work time
  icon?: string; // Icon identifier for UI
}

export interface LeaveConfig {
  id: string;
  name: string; // e.g., "Concediu Odihna", "Delegatie"
  code: string; // e.g., "CO", "DEL-T"
  requiresApproval: boolean;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
}

export interface WorkSchedule {
  id: string;
  name: string; // e.g. "Program Standard", "Tura Noapte"
  startTime: string; // "09:00"
  endTime: string; // "17:00" or "06:00" (if next day)
  crossesMidnight: boolean; // True for night shifts
}

export interface DailySchedule {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  scheduleId: string; // Links to WorkSchedule
}

export interface Notification {
  id: string;
  userId: string; // Target user
  title: string;
  message: string;
  type: 'ALERT' | 'INFO' | 'SUCCESS';
  isRead: boolean;
  date: string;
}

// ----------------------------------

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Company {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  name: string;
  companyId: string;
  managerId?: string; // ID of the manager responsible for this department
  emailNotifications: boolean; // NEW: Toggle for email alerts
}

export interface Office {
  id: string;
  name: string;
  // Shared headquarters do not belong to a single company anymore
  coordinates: Coordinates;
  radiusMeters: number;
}

export interface Break {
  id: string;
  typeId: string; // Links to BreakConfig.id
  typeName: string; // Snapshot of name in case config changes
  status: BreakStatus;
  startTime: string; // ISO String
  endTime?: string; // ISO String
  startLocation?: Coordinates;
  endLocation?: Coordinates;
  startDistanceToOffice?: number;
  endDistanceToOffice?: number;
  managerNote?: string; // Reason for rejection
}

export interface TimesheetLog {
  id: string;
  changedByUserId: string;
  changeDate: string; // ISO String
  details: string; // e.g. "Changed end time from 17:00 to 18:00"
}

export interface Timesheet {
  id: string;
  userId: string;
  startTime: string; // ISO String
  endTime?: string; // ISO String
  breaks: Break[];
  date: string; // YYYY-MM-DD for grouping
  startLocation?: Coordinates;
  endLocation?: Coordinates;
  distanceToOffice?: number; // meters
  matchedOfficeId?: string;
  isHoliday?: boolean;
  status: ShiftStatus;
  notes?: string;
  logs?: TimesheetLog[]; // History of changes
  syncStatus?: 'SYNCED' | 'PENDING_SYNC'; // For offline capability
  detectedScheduleId?: string; // ID of the automatically detected WorkSchedule
  detectedScheduleName?: string; // Snapshot name
  isSystemAutoCheckout?: boolean; // NEW: Flag for auto-checkout
}

export interface CorrectionRequest {
  id: string;
  timesheetId?: string; // Optional if creating a new timesheet
  requestedDate?: string; // Required if timesheetId is missing
  userId: string;
  requestedStartTime: string;
  requestedEndTime?: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  managerNote?: string; // Reason for rejection
}

export interface LeaveRequest {
  id: string;
  userId: string;
  typeId: string; // Links to LeaveConfig.id
  typeName: string; // Snapshot
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  managerComment?: string;
  cancellationReason?: string; // Reason why user cancelled an approved leave
  createdAt?: string; // ISO String - When requested
  approvedAt?: string; // ISO String - When approved
}

export interface User {
  id: string;
  erpId?: string; // ID from external ERP system
  name: string;
  roles: Role[]; // Changed from single role to array
  companyId: string;
  departmentId?: string;
  email: string;
  avatarUrl: string;
  authType: 'MICROSOFT' | 'PIN';
  pin?: string; // Only for PIN auth users
  isValidated: boolean; // Access control
  requiresGPS: boolean; // If true, clock-in is blocked without valid location
  
  // SCHEDULE MANAGEMENT
  mainScheduleId?: string; // The primary default schedule
  alternativeScheduleIds: string[]; // Other allowed schedules
  
  birthDate?: string; // YYYY-MM-DD
  shareBirthday: boolean; // If true, show notification to colleagues
  contractHours?: number; // e.g. 8 for full-time
  assignedOfficeId?: string; // If user works at a specific office
  lastLoginDate?: string; // ISO String
  employmentStatus?: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED'; // New field for HR status sync
}

// Offline Action Queue Types
export type OfflineActionType = 'CLOCK_IN' | 'CLOCK_OUT' | 'START_BREAK' | 'END_BREAK';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  payload: any;
  timestamp: number;
  userId: string;
}
