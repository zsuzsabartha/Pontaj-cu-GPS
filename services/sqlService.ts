
import { API_CONFIG } from '../constants';
import { Timesheet, LeaveRequest, CorrectionRequest, User } from '../types';

const get = async (endpoint: string) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); 
        
        const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        throw error;
    }
};

const post = async (endpoint: string, body: any) => {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error(`[SQL Error] POST ${endpoint}:`, errData);
            throw new Error(`HTTP ${response.status}: ${errData.error || JSON.stringify(errData)}`);
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
};

const remove = async (endpoint: string) => {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
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
};
