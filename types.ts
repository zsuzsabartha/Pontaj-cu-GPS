export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN'
}

export enum LeaveType {
  ODIHNA = 'Concediu Odihnă',
  MEDICAL = 'Concediu Medical',
  FARA_PLATA = 'Fără Plată',
  EVENIMENT_SPECIAL = 'Eveniment Special'
}

export enum LeaveStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected'
}

export enum ShiftStatus {
  NOT_STARTED = 'NOT_STARTED',
  WORKING = 'WORKING',
  ON_BREAK = 'ON_BREAK',
  COMPLETED = 'COMPLETED'
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Company {
  id: string;
  name: string;
}

export interface Office {
  id: string;
  name: string;
  companyId: string;
  coordinates: Coordinates;
  radiusMeters: number;
}

export interface Break {
  startTime: string; // ISO String
  endTime?: string; // ISO String
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
}

export interface LeaveRequest {
  id: string;
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  managerComment?: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  companyId: string;
  email: string;
  avatarUrl: string;
}