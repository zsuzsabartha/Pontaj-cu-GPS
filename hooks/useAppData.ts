
import { useState, useEffect, useCallback, useRef } from 'react';
import { SQLService, ApiError } from '../services/sqlService';
import { getDefaultLockedDate } from '../constants';
import { toLocalDateISO } from '../utils/date';
import {
    User, Company, Department, Office, BreakConfig, LeaveConfig,
    WorkSchedule, Holiday, Timesheet, LeaveRequest, CorrectionRequest,
    DailySchedule, Notification
} from '../types';

/**
 * Loads application data from the server.
 * `isAuthenticated`: business data is requested only after login (the API requires a session);
 * before login only the public health check runs.
 */
export const useAppData = (isAuthenticated: boolean) => {
    // --- App Data State ---
    const [users, setUsers] = useState<User[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [offices, setOffices] = useState<Office[]>([]);
    const [breakConfigs, setBreakConfigs] = useState<BreakConfig[]>([]);
    const [leaveConfigs, setLeaveConfigs] = useState<LeaveConfig[]>([]);
    const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>([]);
    const [schedulePlans, setSchedulePlans] = useState<DailySchedule[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [lockedDate, setLockedDate] = useState<string>(getDefaultLockedDate());

    // --- Server Status State ---
    const [serverStatus, setServerStatus] = useState<'CONNECTING' | 'ONLINE' | 'OFFLINE'>('CONNECTING');
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);

    const authRef = useRef(isAuthenticated);
    authRef.current = isAuthenticated;

    const clearData = useCallback(() => {
        setUsers([]); setCompanies([]); setDepartments([]); setOffices([]);
        setBreakConfigs([]); setLeaveConfigs([]); setWorkSchedules([]); setHolidays([]);
        setTimesheets([]); setLeaves([]); setCorrectionRequests([]);
        setSchedulePlans([]); setNotifications([]);
    }, []);

    const fetchAllData = useCallback(async () => {
        setIsGlobalLoading(true);
        try {
            await SQLService.checkHealth();
            setServerStatus('ONLINE');
        } catch (e) {
            console.error("Critical Server Error:", e);
            setServerStatus('OFFLINE');
            setIsGlobalLoading(false);
            return;
        }

        if (!authRef.current) {
            setIsGlobalLoading(false);
            return;
        }

        try {
            const defaultFrom = toLocalDateISO(new Date(Date.now() - 90 * 86400_000));
            const [
                dbUsers, dbCompanies, dbDepts, dbOffices, dbBreaks, dbLeaves, dbHolidays, dbSchedules,
                dbTimesheets, dbLeaveReqs, dbCorrections, dbSchedulePlans, dbSettings, dbNotifications
            ] = await Promise.all([
                SQLService.getUsers(),
                SQLService.getCompanies(),
                SQLService.getDepartments(),
                SQLService.getOffices(),
                SQLService.getBreaks(),
                SQLService.getLeaves(),
                SQLService.getHolidays(),
                SQLService.getWorkSchedules(),
                SQLService.getTimesheets({ from: defaultFrom }),
                SQLService.getLeaveRequests(),
                SQLService.getCorrectionRequests(),
                SQLService.getSchedulePlans(),
                SQLService.getSettings(),
                SQLService.getNotifications()
            ]);

            setUsers(dbUsers);
            setCompanies(dbCompanies);
            setDepartments(dbDepts);
            setOffices(dbOffices);
            setBreakConfigs(dbBreaks);
            setLeaveConfigs(dbLeaves);
            setHolidays(dbHolidays);
            setWorkSchedules(dbSchedules);
            setTimesheets(dbTimesheets);
            setLeaves(dbLeaveReqs);
            setCorrectionRequests(dbCorrections);
            setSchedulePlans(dbSchedulePlans);
            setNotifications(dbNotifications || []);
            if (dbSettings?.lockedDate) {
                setLockedDate(dbSettings.lockedDate);
            }

        } catch (e) {
            console.error("Data load error:", e);
            // 401/403 are handled by the auth layer (back to login); anything else means the server is unusable.
            if (!(e instanceof ApiError && (e.status === 401 || e.status === 403))) {
                setServerStatus('OFFLINE');
            }
        } finally {
            setIsGlobalLoading(false);
        }
    }, []);

    // Load on start and whenever the user logs in; drop all data from memory on logout.
    useEffect(() => {
        if (!isAuthenticated) clearData();
        fetchAllData();
    }, [isAuthenticated, fetchAllData, clearData]);

    // Polling if offline
    useEffect(() => {
        if (serverStatus === 'ONLINE') return;
        const interval = setInterval(fetchAllData, 5000);
        return () => clearInterval(interval);
    }, [serverStatus, fetchAllData]);

    return {
        users, setUsers,
        companies, setCompanies,
        departments, setDepartments,
        offices, setOffices,
        breakConfigs, setBreakConfigs,
        leaveConfigs, setLeaveConfigs,
        workSchedules, setWorkSchedules,
        holidays, setHolidays,
        timesheets, setTimesheets,
        leaves, setLeaves,
        correctionRequests, setCorrectionRequests,
        schedulePlans, setSchedulePlans,
        notifications, setNotifications,
        lockedDate, setLockedDate,
        serverStatus,
        isGlobalLoading, setIsGlobalLoading,
        fetchAllData
    };
};
