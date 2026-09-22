
import { useCallback } from 'react';
import { SQLService } from '../services/sqlService';
import { findNearestOffice } from '../services/geoService';
import {
    User, Timesheet, LeaveRequest, CorrectionRequest,
    ShiftStatus, LeaveStatus, BreakStatus, Role,
    Coordinates, Office, Break, BreakConfig, LeaveConfig,
    WorkSchedule, DailySchedule
} from '../types';

interface TimesheetManagerProps {
    currentUser: User | null;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    timesheets: Timesheet[];
    setTimesheets: React.Dispatch<React.SetStateAction<Timesheet[]>>;
    leaves: LeaveRequest[];
    setLeaves: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
    correctionRequests: CorrectionRequest[];
    setCorrectionRequests: React.Dispatch<React.SetStateAction<CorrectionRequest[]>>;
    offices: Office[];
    leaveConfigs: LeaveConfig[];
    workSchedules: WorkSchedule[];
    schedulePlans: DailySchedule[];
    setSchedulePlans: React.Dispatch<React.SetStateAction<DailySchedule[]>>;
    setIsGlobalLoading: (loading: boolean) => void;
    fetchAllData: () => Promise<void>;
}

export const useTimesheetManager = ({
    currentUser, users, setUsers, timesheets, setTimesheets,
    leaves, setLeaves,
    correctionRequests, setCorrectionRequests,
    offices, leaveConfigs, workSchedules, schedulePlans, setSchedulePlans,
    setIsGlobalLoading, fetchAllData
}: TimesheetManagerProps) => {

    const handleConfirmRejection = useCallback(async (rejectionModal: any, reason: string) => {
        setIsGlobalLoading(true);
        try {
            if (rejectionModal.type === 'LEAVE_CANCEL' || rejectionModal.type === 'LEAVE') {
                const target = leaves.find(l => l.id === rejectionModal.itemId);
                if (target) {
                    const status = rejectionModal.type === 'LEAVE_CANCEL' ? LeaveStatus.CANCELLED : LeaveStatus.REJECTED;
                    const updated = { ...target, status, [rejectionModal.type === 'LEAVE_CANCEL' ? 'cancellationReason' : 'managerComment']: reason };
                    await SQLService.upsertLeave(updated);
                    setLeaves(prev => prev.map(l => l.id === target.id ? updated : l));
                }
            } else if (rejectionModal.type === 'CORRECTION') {
                const target = correctionRequests.find(c => c.id === rejectionModal.itemId);
                if (target) {
                    const updated = { ...target, status: 'REJECTED' as const, managerNote: reason };
                    await SQLService.upsertCorrection(updated);
                    setCorrectionRequests(prev => prev.map(c => c.id === target.id ? updated : c));
                }
            } else if (rejectionModal.type === 'BREAK' && rejectionModal.parentId) {
                const targetTs = timesheets.find(t => t.id === rejectionModal.parentId);
                if (targetTs) {
                    const updatedBreaks = targetTs.breaks.map(b => b.id === rejectionModal.itemId ? { ...b, status: BreakStatus.REJECTED, managerNote: reason } : b);
                    const updatedTs = { ...targetTs, breaks: updatedBreaks };
                    await SQLService.upsertTimesheet(updatedTs);
                    setTimesheets(prev => prev.map(t => t.id === targetTs.id ? updatedTs : t));
                }
            }
        } catch (e) {
            alert("Eroare server: Nu s-a putut respinge solicitarea.");
        } finally {
            setIsGlobalLoading(false);
        }
    }, [leaves, correctionRequests, timesheets, setLeaves, setCorrectionRequests, setTimesheets, setIsGlobalLoading]);

    const handleClockIn = useCallback(async (loc: Coordinates, off: Office | null, dist: number) => {
        if (!currentUser) return;
        setIsGlobalLoading(true);
        try {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const detectedId = schedulePlans.find(s => s.userId === currentUser.id && s.date === today)?.scheduleId || currentUser.mainScheduleId;
            const schedName = workSchedules.find(s => s.id === detectedId)?.name;

            const newTs: Timesheet = {
                id: `ts-${Date.now()}`,
                userId: currentUser.id,
                startTime: now.toISOString(),
                date: today,
                status: ShiftStatus.WORKING,
                breaks: [],
                startLocation: loc,
                matchedOfficeId: off?.id,
                distanceToOffice: dist,
                detectedScheduleId: detectedId,
                detectedScheduleName: schedName
            };

            await SQLService.upsertTimesheet(newTs);
            setTimesheets(prev => [newTs, ...prev]);
        } catch (e) {
            alert("Nu s-a putut efectua pontajul. Eroare comunicare server.");
        } finally {
            setIsGlobalLoading(false);
        }
    }, [currentUser, schedulePlans, workSchedules, setTimesheets, setIsGlobalLoading]);

    const handleClockOut = useCallback(async (loc: Coordinates, activeTs: Timesheet | null) => {
        if (!currentUser || !activeTs) return;
        setIsGlobalLoading(true);
        try {
            const { distance: endDist } = findNearestOffice(loc, offices);
            const updatedTs: Timesheet = {
                ...activeTs, endTime: new Date().toISOString(), status: ShiftStatus.COMPLETED, endLocation: loc, endDistanceToOffice: endDist
            };
            await SQLService.upsertTimesheet(updatedTs);
            setTimesheets(prev => prev.map(t => t.id === activeTs.id ? updatedTs : t));
        } catch (e) {
            alert("Eroare la oprirea pontajului.");
        } finally {
            setIsGlobalLoading(false);
        }
    }, [currentUser, offices, setTimesheets, setIsGlobalLoading]);

    const handleToggleBreak = useCallback(async (activeTs: Timesheet | null, config?: BreakConfig, loc?: Coordinates) => {
        if (!currentUser || !activeTs) return;
        setIsGlobalLoading(true);
        try {
            let updatedTs: Timesheet | null = null;
            if (activeTs.status === ShiftStatus.ON_BREAK) {
                const idx = activeTs.breaks.findIndex(b => !b.endTime);
                if (idx === -1) return;
                const updatedBreak = { ...activeTs.breaks[idx], endTime: new Date().toISOString(), endLocation: loc, status: BreakStatus.PENDING };
                const updatedBreaks = [...activeTs.breaks]; updatedBreaks[idx] = updatedBreak;
                updatedTs = { ...activeTs, status: ShiftStatus.WORKING, breaks: updatedBreaks };
            } else {
                if (!config) return;
                const newBreak: Break = {
                    id: `br-${Date.now()}`, typeId: config.id, typeName: config.name, startTime: new Date().toISOString(), status: BreakStatus.PENDING, startLocation: loc
                };
                updatedTs = { ...activeTs, status: ShiftStatus.ON_BREAK, breaks: [...activeTs.breaks, newBreak] };
            }
            if (updatedTs) {
                await SQLService.upsertTimesheet(updatedTs);
                setTimesheets(prev => prev.map(t => t.id === activeTs.id ? updatedTs! : t));
            }
        } catch (e) {
            alert("Eroare server la schimbarea stării pauzei.");
        } finally {
            setIsGlobalLoading(false);
        }
    }, [currentUser, setTimesheets, setIsGlobalLoading]);

    const handleApproveCorrection = useCallback(async (reqId: string) => {
        setIsGlobalLoading(true);
        try {
            const target = correctionRequests.find(c => c.id === reqId);
            if (target) {
                const updatedReq = { ...target, status: 'APPROVED' as const };
                await SQLService.upsertCorrection(updatedReq);
                let existingTs = timesheets.find(t => t.id === target.timesheetId);
                const newTs: Timesheet = {
                    id: existingTs ? existingTs.id : `ts-corr-${Date.now()}`,
                    userId: target.userId,
                    date: target.requestedDate || existingTs?.date || new Date().toISOString().split('T')[0],
                    startTime: target.requestedStartTime,
                    endTime: target.requestedEndTime,
                    status: target.requestedEndTime ? ShiftStatus.COMPLETED : ShiftStatus.WORKING,
                    breaks: existingTs ? existingTs.breaks : [],
                    logs: [...(existingTs?.logs || []), { id: `log-${Date.now()}`, changedByUserId: currentUser!.id, changeDate: new Date().toISOString(), details: `Correction Approved: ${target.reason}` }]
                };
                await SQLService.upsertTimesheet(newTs);
                await fetchAllData();
            }
        } catch (e) {
            alert("Eroare server la aprobarea corecției.");
        } finally {
            setIsGlobalLoading(false);
        }
    }, [correctionRequests, timesheets, currentUser, fetchAllData, setIsGlobalLoading]);

    const handleLeaveSubmit = useCallback(async (req: any) => {
        if (!currentUser) return;
        setIsGlobalLoading(true);
        try {
            const newLeave: LeaveRequest = {
                id: `lr-${Date.now()}`, userId: currentUser.id, status: req.status || LeaveStatus.PENDING, createdAt: new Date().toISOString(), ...req
            };
            await SQLService.upsertLeave(newLeave);
            setLeaves(prev => [newLeave, ...prev]);
        } catch (e) {
            alert("Nu s-a putut trimite cererea. Server offline?");
        } finally {
            setIsGlobalLoading(false);
        }
    }, [currentUser, setLeaves, setIsGlobalLoading]);


    const handleCreateUser = useCallback(async (newUser: User) => {
        setIsGlobalLoading(true);
        try {
            await SQLService.upsertUser(newUser);
            await fetchAllData();
        } catch (e) {
            alert("Eroare la crearea utilizatorului.");
        } finally {
            setIsGlobalLoading(false);
        }
    }, [fetchAllData, setIsGlobalLoading]);

    const handleUpdateUser = useCallback(async (updatedUser: User) => {
        setIsGlobalLoading(true);
        try {
            await SQLService.upsertUser(updatedUser);
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        } catch (e) {
            alert("Eroare la actualizarea utilizatorului.");
        } finally {
            setIsGlobalLoading(false);
        }
    }, [setUsers, setIsGlobalLoading]);

    const handleTimesheetDelete = useCallback(async (id: string) => {
        if (!confirm("Sigur doriți să ștergeți acest pontaj?")) return;
        setIsGlobalLoading(true);
        try {
            await SQLService.deleteTimesheet(id);
            setTimesheets(prev => prev.filter(t => t.id !== id));
        } catch (e) {
            alert("Eroare server: Nu s-a putut șterge pontajul.");
        } finally {
            setIsGlobalLoading(false);
        }
    }, [setTimesheets, setIsGlobalLoading]);

    const handleTimesheetSave = useCallback(async (data: any, targetUserId: string | null) => {
        if (!currentUser) return;
        setIsGlobalLoading(true);

        const isManager = currentUser.roles.includes(Role.MANAGER) || currentUser.roles.includes(Role.ADMIN);
        const ownerId = targetUserId;

        if (!ownerId) {
            alert("Eroare internă: Nu s-a putut identifica utilizatorul țintă.");
            setIsGlobalLoading(false);
            return;
        }

        try {
            if (data.type === 'WORK') {
                if (isManager) {
                    let newTs: Timesheet;
                    if (data.tsId) {
                        const existing = timesheets.find(t => t.id === data.tsId);
                        if (!existing) throw new Error("Timesheet not found");
                        newTs = {
                            ...existing,
                            date: data.date,
                            startTime: data.start,
                            endTime: data.end,
                            status: data.end ? ShiftStatus.COMPLETED : ShiftStatus.WORKING,
                            detectedScheduleId: data.scheduleId,
                            logs: [...(existing.logs || []), { id: `log-${Date.now()}`, changedByUserId: currentUser.id, changeDate: new Date().toISOString(), details: 'Manager Edit' }]
                        };
                    } else {
                        newTs = {
                            id: `ts-${Date.now()}`,
                            userId: ownerId,
                            date: data.date,
                            startTime: data.start,
                            endTime: data.end,
                            status: data.end ? ShiftStatus.COMPLETED : ShiftStatus.WORKING,
                            breaks: [],
                            logs: [{ id: `log-${Date.now()}`, changedByUserId: currentUser.id, changeDate: new Date().toISOString(), details: 'Manager Created' }]
                        };
                    }
                    await SQLService.upsertTimesheet(newTs);

                    if (data.tsId) {
                        setTimesheets(prev => prev.map(ts => ts.id === data.tsId ? newTs : ts));
                    } else {
                        setTimesheets(prev => [newTs, ...prev]);
                    }
                } else {
                    const req: CorrectionRequest = {
                        id: `cr-${Date.now()}`,
                        userId: currentUser.id,
                        timesheetId: data.tsId,
                        requestedDate: data.date,
                        requestedStartTime: data.start,
                        requestedEndTime: data.end,
                        reason: data.reason,
                        status: 'PENDING'
                    };
                    await SQLService.upsertCorrection(req);
                    setCorrectionRequests(prev => [req, ...prev]);
                    alert("Solicitarea de corecție a fost trimisă către manager!");
                }
            } else {
                const newLeave: LeaveRequest = {
                    id: `lr-${Date.now()}`,
                    userId: ownerId,
                    typeId: data.leaveTypeId,
                    typeName: leaveConfigs.find(lc => lc.id === data.leaveTypeId)?.name || 'Manual',
                    startDate: data.date,
                    endDate: data.date,
                    reason: data.reason,
                    status: isManager ? LeaveStatus.APPROVED : LeaveStatus.PENDING,
                    createdAt: new Date().toISOString()
                };

                await SQLService.upsertLeave(newLeave);
                setLeaves(prev => [newLeave, ...prev]);

                if (isManager && data.tsId) {
                    await SQLService.deleteTimesheet(data.tsId);
                    setTimesheets(prev => prev.filter(t => t.id !== data.tsId));
                }
            }
        } catch (e) {
            alert("Eroare server: Salvarea a eșuat.");
        } finally {
            setIsGlobalLoading(false);
        }
    }, [currentUser, timesheets, leaveConfigs, setTimesheets, setLeaves, setCorrectionRequests, setIsGlobalLoading]);

    const handleApproveBreak = useCallback(async (tsId: string, brId: string, status: BreakStatus) => {
        setIsGlobalLoading(true);
        try {
            const targetTs = timesheets.find(t => t.id === tsId);
            if (!targetTs) return;

            const updatedBreaks = targetTs.breaks.map(b => b.id === brId ? { ...b, status } : b);
            const updatedTs = { ...targetTs, breaks: updatedBreaks };

            await SQLService.upsertTimesheet(updatedTs);
            setTimesheets(prev => prev.map(ts => ts.id !== tsId ? ts : updatedTs));
        } catch (e) {
            alert("Eroare server.");
        } finally {
            setIsGlobalLoading(false);
        }
    }, [timesheets, setTimesheets, setIsGlobalLoading]);

    const handleApproveLeave = useCallback(async (reqId: string) => {
        setIsGlobalLoading(true);
        try {
            const target = leaves.find(l => l.id === reqId);
            if (target) {
                const updated = { ...target, status: LeaveStatus.APPROVED };
                await SQLService.upsertLeave(updated);
                setLeaves(prev => prev.map(l => l.id === reqId ? updated : l));
            }
        } catch (e) {
            alert("Eroare server.");
        } finally {
            setIsGlobalLoading(false);
        }
    }, [leaves, setLeaves, setIsGlobalLoading]);

    const handleAssignSchedule = useCallback((userId: string, date: string, scheduleId: string) => {
        setSchedulePlans(prev => {
            const existing = prev.find(s => s.userId === userId && s.date === date);
            if (existing) {
                if (scheduleId === "") return prev.filter(s => s.id !== existing.id);
                else return prev.map(s => s.id === existing.id ? { ...s, scheduleId } : s);
            } else if (scheduleId !== "") {
                return [...prev, { id: `ds-${Date.now()}`, userId, date, scheduleId }];
            }
            return prev;
        });
    }, [setSchedulePlans]);

    return {
        handleConfirmRejection,
        handleClockIn,
        handleClockOut,
        handleToggleBreak,
        handleApproveCorrection,
        handleLeaveSubmit,
        handleCreateUser,
        handleUpdateUser,
        handleTimesheetDelete,
        handleTimesheetSave,
        handleApproveBreak,
        handleApproveLeave,
        handleAssignSchedule
    };
};
