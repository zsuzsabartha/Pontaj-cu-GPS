
import { API_CONFIG } from '../constants';
import { Timesheet, LeaveRequest, CorrectionRequest, User, DailySchedule, Notification } from '../types';

export type ClockAction = 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END';

// Fired when the server rejects a request because the session is missing or expired.
export const UNAUTHORIZED_EVENT = 'pontaj:unauthorized';

export class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

// Login endpoints legitimately answer 401/403 (wrong PIN, unknown account): they must not trigger a global logout.
const isAuthEndpoint = (endpoint: string) => endpoint.startsWith('/auth/login') || endpoint === '/auth/verify-2fa' || endpoint === '/auth/me';

const handleErrorResponse = async (endpoint: string, response: Response): Promise<never> => {
    const errData = await response.json().catch(() => ({}));
    if (response.status === 401 && !isAuthEndpoint(endpoint)) {
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(response.status, errData.error || `HTTP ${response.status}`);
};

// The API is served from the same origin (Nginx in production, Vite proxy in dev),
// so the httpOnly session cookie is sent automatically.
const get = async (endpoint: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
            signal: controller.signal,
            credentials: 'same-origin'
        });
        if (!response.ok) return handleErrorResponse(endpoint, response);
        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
};

const post = async (endpoint: string, body: any) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        console.error(`[API Error] POST ${endpoint}: HTTP ${response.status}`);
        return handleErrorResponse(endpoint, response);
    }
    return await response.json();
};

const remove = async (endpoint: string) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'DELETE',
        credentials: 'same-origin'
    });
    if (!response.ok) return handleErrorResponse(endpoint, response);
    return await response.json();
};

export const SQLService = {
    BASE_URL: API_CONFIG.BASE_URL,
    checkHealth: () => get('/health'),
    getUsers: () => get('/config/users'),
    getCompanies: () => get('/config/companies'),
    getDepartments: () => get('/config/departments'),
    getOffices: () => get('/config/offices'),
    getBreaks: () => get('/config/breaks'),
    getLeaves: () => get('/config/leaves'),
    getHolidays: () => get('/config/holidays'),
    getWorkSchedules: () => get('/config/schedules'),
    getSettings: (): Promise<{ lockedDate?: string; mobileAppUrl?: string }> => get('/config/settings'),
    saveSettings: (settings: { lockedDate?: string; mobileAppUrl?: string }) => post('/config/settings', settings),
    saveConfigList: (endpoint: 'companies' | 'departments' | 'offices' | 'breaks' | 'leaves' | 'schedules' | 'holidays', data: any[]) =>
        post(`/config/${endpoint}?replace=1`, data),
    getSchedulePlans: (): Promise<DailySchedule[]> => get('/schedule-plans'),
    upsertSchedulePlan: (plan: { id?: string; userId: string; date: string; scheduleId: string }) =>
        post('/schedule-plans', plan),
    getTimesheets: (params?: { from?: string; to?: string; userId?: string }) => {
        const qs = new URLSearchParams();
        if (params?.from) qs.set('from', params.from);
        if (params?.to) qs.set('to', params.to);
        if (params?.userId) qs.set('userId', params.userId);
        const query = qs.toString();
        return get(`/seed/timesheets${query ? `?${query}` : ''}`);
    },
    getLeaveRequests: () => get('/seed/leaves'),
    getCorrectionRequests: () => get('/seed/corrections'),
    getNotifications: (): Promise<Notification[]> => get('/notifications'),
    markNotificationRead: (id?: string, all?: boolean) =>
        post('/notifications/read', all ? { all: true } : { id }),

    // --- REAL TIME TRANSACTION METHODS ---
    
    upsertTimesheet: (ts: Timesheet & { clockAction?: ClockAction }): Promise<{ success: boolean; timesheets?: Timesheet[] }> =>
        post('/seed/timesheets', [ts]),
    deleteTimesheet: (id: string) => remove(`/timesheets/${id}`),
    
    upsertLeave: (leave: LeaveRequest) => post('/seed/leaves', [leave]),
    deleteLeave: (id: string) => remove(`/leaves/${id}`),
    sendLeaveEmail: (payload: { leaveId: string; managerEmail: string; employeeName: string; typeName: string; startDate: string; endDate: string; reason?: string }) =>
        post('/email/leave-request', payload),
    
    upsertCorrection: (req: CorrectionRequest) => post('/seed/corrections', [req]),
    deleteCorrection: (id: string) => remove(`/corrections/${id}`),

    // User management
    upsertUser: (user: User) => post('/config/users', [user]),
    syncUsers: () => post('/auth/sync-users', {}),

    // --- SESSION (server-side, httpOnly cookie) ---
    loginPin: (email: string, pin: string) => post('/auth/login-pin', { email, pin }),
    verify2FA: (challengeToken: string, code: string) => post('/auth/verify-2fa', { challengeToken, code }),
    generateDeviceCode: (userId: string): Promise<{ success: boolean; code: string; expiresInMinutes: number }> => post('/auth/device-code', { userId }),
    resetUserDevice: (userId: string): Promise<{ success: boolean }> => post('/auth/device-reset', { userId }),
    loginMicrosoft: (idToken: string) => post('/auth/login-microsoft', { idToken }),
    startMicrosoftDeviceFlow: (): Promise<{ success: boolean; deviceCode: string; userCode: string; verificationUri: string; expiresIn: number; interval: number }> =>
        post('/auth/microsoft-device/start', {}),
    pollMicrosoftDeviceFlow: (deviceCode: string): Promise<{ success: boolean; pending?: boolean; user?: User }> =>
        post('/auth/microsoft-device/poll', { deviceCode }),
    me: (): Promise<{ success: boolean; user: User }> => get('/auth/me'),
    logout: () => post('/auth/logout', {}),
};
