
import { API_CONFIG } from '../constants';
import { Timesheet, LeaveRequest, CorrectionRequest } from '../types';

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

const put = async (endpoint: string, body: any) => {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error(`[SQL Error] PUT ${endpoint}:`, errData);
            throw new Error(`HTTP ${response.status}: ${errData.error || JSON.stringify(errData)}`);
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
};

export const SQLService = {
    checkHealth: () => get('/health'),
    getUsers: () => get('/config/users'),
    getCompanies: () => get('/config/companies'),
    getDepartments: () => get('/config/departments'),
    getOffices: () => get('/config/offices'),
    getBreaks: () => get('/config/breaks'),
    getLeaves: () => get('/config/leaves'),
    getHolidays: () => get('/config/holidays'),
    getTimesheets: () => get('/seed/timesheets'), 
    getLeaveRequests: () => get('/seed/leaves'),
    getCorrectionRequests: () => get('/seed/corrections'),

    // --- REAL TIME TRANSACTION METHODS ---
    
    // Timesheets - Uses the dedicated endpoints from your server code
    addTimesheet: (ts: Timesheet) => post('/timesheets', {
        ...ts,
        // Ensure format matches server expectation if needed, or send full object if server parses it
        userId: ts.userId === 'u1' ? 1 : (parseInt(ts.userId.replace(/\D/g,'')) || 0) // Basic fallback for ID mapping if string
    }),
    
    // NOTE: For this specific prototype, we are using the /seed/ endpoints 
    // for single-item upserts as well, because the server implementation for 
    // /api/v1/timesheets/ is strict Zod validation that might conflict with our mock string IDs.
    // The /seed endpoints use "DELETE then INSERT" which acts as a perfect Upsert for us.

    upsertTimesheet: (ts: Timesheet) => post('/seed/timesheets', [ts]), // Send as array of 1
    
    upsertLeave: (leave: LeaveRequest) => post('/seed/leaves', [leave]), // Send as array of 1
    
    upsertCorrection: (req: CorrectionRequest) => post('/seed/corrections', [req]), // Send as array of 1
};
