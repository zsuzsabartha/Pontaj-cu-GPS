
import { API_CONFIG } from '../constants';
import { Timesheet, LeaveRequest, CorrectionRequest, User } from '../types';

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
const isAuthEndpoint = (endpoint: string) => endpoint.startsWith('/auth/login') || endpoint === '/auth/me';

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
    const timeoutId = setTimeout(() => controller.abort(), 5000);
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
    getTimesheets: () => get('/seed/timesheets'), 
    getLeaveRequests: () => get('/seed/leaves'),
    getCorrectionRequests: () => get('/seed/corrections'),

    // --- REAL TIME TRANSACTION METHODS ---
    
    upsertTimesheet: (ts: Timesheet) => post('/seed/timesheets', [ts]),
    deleteTimesheet: (id: string) => remove(`/timesheets/${id}`),
    
    upsertLeave: (leave: LeaveRequest) => post('/seed/leaves', [leave]),
    deleteLeave: (id: string) => remove(`/leaves/${id}`),
    
    upsertCorrection: (req: CorrectionRequest) => post('/seed/corrections', [req]),
    deleteCorrection: (id: string) => remove(`/corrections/${id}`),

    // User management
    upsertUser: (user: User) => post('/config/users', [user]),
    syncUsers: () => post('/auth/sync-users', {}),

    // --- SESSION (server-side, httpOnly cookie) ---
    loginPin: (email: string, pin: string) => post('/auth/login-pin', { email, pin }),
    loginMicrosoft: (idToken: string) => post('/auth/login-microsoft', { idToken }),
    me: (): Promise<{ success: boolean; user: User }> => get('/auth/me'),
    logout: () => post('/auth/logout', {}),
};
