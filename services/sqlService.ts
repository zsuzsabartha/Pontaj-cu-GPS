
import { API_CONFIG } from '../constants';

const get = async (endpoint: string) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // Fast fail for offline mode
        
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

export const SQLService = {
    checkHealth: () => get('/health'),
    getUsers: () => get('/config/users'),
    getCompanies: () => get('/config/companies'),
    getDepartments: () => get('/config/departments'),
    getOffices: () => get('/config/offices'),
    getBreaks: () => get('/config/breaks'),
    getLeaves: () => get('/config/leaves'),
    getHolidays: () => get('/config/holidays'),
    getTimesheets: () => get('/seed/timesheets'), // Endpoint mapped in bridge
    getLeaveRequests: () => get('/seed/leaves'), // Endpoint mapped in bridge
    getCorrectionRequests: () => get('/seed/corrections') // New endpoint
};
