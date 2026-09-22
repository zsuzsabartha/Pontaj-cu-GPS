
import { useState, useEffect, useCallback } from 'react';
import { SQLService } from '../services/sqlService';
import { getDefaultLockedDate } from '../constants';
import {
    User, Company, Department, Office, BreakConfig, LeaveConfig,
    WorkSchedule, Holiday, Timesheet, LeaveRequest, CorrectionRequest,
    DailySchedule, Notification
} from '../types';

export const useAppData = () => {
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

    const fetchAllData = useCallback(async () => {
        setIsGlobalLoading(true);
        try {
            await SQLService.checkHealth();
            setServerStatus('ONLINE');

            const [
                dbUsers, dbCompanies, dbDepts, dbOffices, dbBreaks, dbLeaves, dbHolidays, dbSchedules, dbTimesheets, dbLeaveReqs, dbCorrections
            ] = await Promise.all([
                SQLService.getUsers(),
                SQLService.getCompanies(),
                SQLService.getDepartments(),
                SQLService.getOffices(),
                SQLService.getBreaks(),
                SQLService.getLeaves(),
                SQLService.getHolidays(),
                SQLService.getWorkSchedules(),
                SQLService.getTimesheets(),
                SQLService.getLeaveRequests(),
                SQLService.getCorrectionRequests()
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

        } catch (e) {
            console.error("Critical Server Error:", e);
            setServerStatus('OFFLINE');
        } finally {
            setIsGlobalLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

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
