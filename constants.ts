import { Company, Office, User, Role, Timesheet, ShiftStatus, LeaveRequest, LeaveType, LeaveStatus } from './types';

export const MOCK_COMPANIES: Company[] = [
  { id: 'c1', name: 'TechGroup Solutions' },
  { id: 'c2', name: 'Logistics Prime' }
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
    name: 'Alexandru Popescu',
    role: Role.MANAGER,
    companyId: 'c1',
    email: 'alex.popescu@techgroup.ro',
    avatarUrl: 'https://picsum.photos/100/100'
  },
  {
    id: 'u2',
    name: 'Elena Ionescu',
    role: Role.EMPLOYEE,
    companyId: 'c1',
    email: 'elena.ionescu@techgroup.ro',
    avatarUrl: 'https://picsum.photos/101/101'
  },
  {
    id: 'u3',
    name: 'Mihai Radu',
    role: Role.EMPLOYEE,
    companyId: 'c2',
    email: 'mihai.radu@logistics.ro',
    avatarUrl: 'https://picsum.photos/102/102'
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
    distanceToOffice: 20
  }
];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'lr1',
    userId: 'u2',
    type: LeaveType.ODIHNA,
    startDate: '2024-06-10',
    endDate: '2024-06-15',
    reason: 'Concediu de vară planificat.',
    status: LeaveStatus.PENDING
  }
];

export const HOLIDAYS_RO = [
  '2024-01-01', '2024-01-02', '2024-01-24', '2024-05-01', '2024-05-03', '2024-05-06',
  '2024-06-01', '2024-06-23', '2024-06-24', '2024-08-15', '2024-11-30', '2024-12-01',
  '2024-12-25', '2024-12-26'
];