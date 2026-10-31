
import { useCallback } from 'react';
import { SQLService } from '../services/sqlService';
import { findNearestOffice } from '../services/geoService';
import {
    User, Timesheet, LeaveRequest, CorrectionRequest,
    ShiftStatus, LeaveStatus, BreakStatus, Role,
    Coordinates, Office, Break, BreakConfig, LeaveConfig,
    WorkSchedule, DailySchedule, Department
} from '../types';
import { sendLeaveEmailViaGraph } from '../services/graphService';
import { toLocalDateISO } from '../utils/date';
import { showToast } from '../utils/toast';

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
    departments: Department[];
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
    offices, departments, leaveConfigs, workSchedules, schedulePlans, setSchedulePlans,
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
                    setLeaves(prev => prev.map(l => l.id === target.id ? updated : l));
                    // Optimistic update applied above
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
            showToast("Eroare server: Nu s-a putut respinge solicitarea.", 'error');
        } finally {
            setIsGlobalLoading(false);
        }
    }, [leaves, correctionRequests, timesheets, setLeaves, setCorrectionRequests, setTimesheets, setIsGlobalLoading]);

    const handleClockIn = useCallback(async (loc: Coordinates, off: Office | null, dist: number) => {
        if (!currentUser) return;
        setIsGlobalLoading(true);
        try {
            const now = new Date();
            const today = toLocalDateISO(now);
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

            setTimesheets(prev => [newTs, ...prev]);
            const res = await SQLService.upsertTimesheet({ ...newTs, clockAction: 'CLOCK_IN' });
            const savedTs = res.timesheets?.[0] || newTs;
            setTimesheets(prev => prev.map(t => t.id === newTs.id ? savedTs : t));
            showToast("Pontaj început cu succes!", 'success');
        } catch (e) {
            setTimesheets(prev => prev.filter(t => !t.id.startsWith('ts-') || t.userId !== currentUser.id || t.status !== ShiftStatus.WORKING || (Date.now() - Number(t.id.slice(3))) > 15000));
            showToast((e as any)?.message || "Nu s-a putut efectua pontajul. Eroare comunicare server.", 'error');
        } finally {
            setIsGlobalLoading(false);
        }
    }, [currentUser, schedulePlans, workSchedules, setTimesheets, setIsGlobalLoading]);

    const handleClockOut = useCallback(async (loc: Coordinates, activeTs: Timesheet | null, note?: string) => {
        if (!currentUser || !activeTs) return;
        setIsGlobalLoading(true);
        try {
            const { distance: endDist } = findNearestOffice(loc, offices);
            const updatedTs: Timesheet = {
                ...activeTs, endTime: new Date().toISOString(), status: ShiftStatus.COMPLETED, endLocation: loc, endDistanceToOffice: endDist, notes: note || activeTs.notes
            };
            setTimesheets(prev => prev.map(t => t.id === activeTs.id ? updatedTs : t));
            const res = await SQLService.upsertTimesheet({ ...updatedTs, clockAction: 'CLOCK_OUT' });
            showToast("Pontaj încheiat cu succes!", 'success');
            const savedTs = res.timesheets?.[0] || updatedTs;
            setTimesheets(prev => prev.map(t => t.id === activeTs.id ? savedTs : t));
            // State updated above
        } catch (e) {
            setTimesheets(prev => prev.map(t => t.id === activeTs.id ? activeTs : t));
            showToast("Eroare la oprirea pontajului.", 'error');
        } finally {
            setIsGlobalLoading(false);
        }
    }, [currentUser, offices, setTimesheets, setIsGlobalLoading]);

    const handleToggleBreak = useCallback(async (activeTs: Timesheet | null, config?: BreakConfig, loc?: Coordinates) => {
        if (!currentUser || !activeTs) return;
        setIsGlobalLoading(true);
        try {
            let updatedTs: Timesheet | null = null;
            let clockAction: 'BREAK_START' | 'BREAK_END' = 'BREAK_START';
            const dist = loc ? findNearestOffice(loc, offices).distance : undefined;
            if (activeTs.status === ShiftStatus.ON_BREAK) {
                clockAction = 'BREAK_END';
                const idx = activeTs.breaks.findIndex(b => !b.endTime);
                if (idx === -1) return;
                const updatedBreak = { ...activeTs.breaks[idx], endTime: new Date().toISOString(), endLocation: loc, endDistanceToOffice: dist, status: BreakStatus.PENDING };
                const updatedBreaks = [...activeTs.breaks]; updatedBreaks[idx] = updatedBreak;
                updatedTs = { ...activeTs, status: ShiftStatus.WORKING, breaks: updatedBreaks };
            } else {
                if (!config) return;
                const newBreak: Break = {
                    id: `br-${Date.now()}`, typeId: config.id, typeName: config.name, startTime: new Date().toISOString(), status: BreakStatus.PENDING, startLocation: loc, startDistanceToOffice: dist
                };
                updatedTs = { ...activeTs, status: ShiftStatus.ON_BREAK, breaks: [...activeTs.breaks, newBreak] };
            }
            if (updatedTs) {
                setTimesheets(prev => prev.map(t => t.id === activeTs.id ? updatedTs! : t));
                const res = await SQLService.upsertTimesheet({ ...updatedTs, clockAction });
                showToast(clockAction === 'BREAK_START' ? "Pauză începută!" : "Pauză încheiată!", 'info');
                const savedTs = res.timesheets?.[0] || updatedTs;
                setTimesheets(prev => prev.map(t => t.id === activeTs.id ? savedTs : t));
            // State updated above
            }
        } catch (e) {
            setTimesheets(prev => prev.map(t => t.id === activeTs.id ? activeTs : t));
            showToast("Eroare server la schimbarea stării pauzei.", 'error');
        } finally {
            setIsGlobalLoading(false);
        }
    }, [currentUser, offices, setTimesheets, setIsGlobalLoading]);

    const handleApproveCorrection = useCallback(async (reqId: string) => {
        setIsGlobalLoading(true);
        try {
            const target = correctionRequests.find(c => c.id === reqId);
            if (target) {
                const updatedReq = { ...target, status: 'APPROVED' as const };
                await SQLService.upsertCorrection(updatedReq);
                let existingTs = timesheets.find(t => t.id === target.timesheetId || (t.userId === target.userId && t.date === target.requestedDate));
                const newTs: Timesheet = {
                    id: existingTs ? existingTs.id : `ts-corr-${Date.now()}`,
                    userId: target.userId,
                    date: target.requestedDate || existingTs?.date || toLocalDateISO(),
                    startTime: target.requestedStartTime,
                    endTime: target.requestedEndTime,
                    status: target.requestedEndTime ? ShiftStatus.COMPLETED : ShiftStatus.WORKING,
                    breaks: existingTs ? existingTs.breaks : [],
                    logs: [...(existingTs?.logs || []), { id: `log-${Date.now()}`, changedByUserId: currentUser!.id, changeDate: new Date().toISOString(), details: `Correction Approved: ${target.reason}` }]
                };
                await SQLService.upsertTimesheet(newTs);
                setCorrectionRequests(prev => prev.map(c => c.id === reqId ? updatedReq : c));
                setTimesheets(prev => existingTs ? prev.map(t => t.id === existingTs.id ? newTs : t) : [newTs, ...prev]);
            }
        } catch (e) {
            showToast("Eroare server la aprobarea corecției.", 'error');
        } finally {
            setIsGlobalLoading(false);
        }
    }, [correctionRequests, timesheets, currentUser, setCorrectionRequests, setTimesheets, setIsGlobalLoading]);

    const handleLeaveSubmit = useCallback(async (req: any) => {
        if (!currentUser) return;
        setIsGlobalLoading(true);
        try {
            const newLeave: LeaveRequest = {
                id: `lr-${Date.now()}`, userId: currentUser.id, status: req.status || LeaveStatus.PENDING, createdAt: new Date().toISOString(), ...req
            };
            setLeaves(prev => [newLeave, ...prev.filter(x => x.id !== newLeave.id)]);
            await SQLService.upsertLeave(newLeave);
            setLeaves(prev => [newLeave, ...prev.filter(x => x.id !== newLeave.id)]);
            showToast("Cererea a fost înregistrată și managerul a fost notificat pe email!", 'success');

            // Try sending email to manager
            try {
                const dept = departments.find(d => d.id === currentUser.departmentId);
                let targetEmail = '';
                if (dept && dept.managerId) {
                    const manager = users.find(u => u.id === dept.managerId);
                    if (manager && manager.email) targetEmail = manager.email;
                }
                
                // Server-side POST /api/v1/seed/leaves already dispatches Microsoft Graph email to manager
                void sendLeaveEmailViaGraph;
                void targetEmail;
                if (!targetEmail) {
                    // Server-side fallback notifies company/department manager automatically
                } else {
                    console.warn("Niciun manager setat pentru departament, emailul nu a fost trimis.");
                }
            } catch (emailErr) {
                console.error("Eroare la trimiterea mail-ului MSAL", emailErr);
            }

        } catch (e) {
            showToast("Nu s-a putut trimite cererea. Server offline?", 'error');
        } finally {
            setIsGlobalLoading(false);
        }
    }, [currentUser, setLeaves, setIsGlobalLoading, departments, users]);


    const handleCreateUser = useCallback(async (newUser: User) => {
        setIsGlobalLoading(true);
        try {
            await SQLService.upsertUser(newUser);
            setUsers(prev => [...prev, newUser]);
            // Local state updated above; no full reload needed.
        } catch (e) {
            showToast("Eroare la crearea utilizatorului.", 'error');
        } finally {
            setIsGlobalLoading(false);
        }
    }, [setUsers, setIsGlobalLoading]);

    const handleUpdateUser = useCallback(async (updatedUser: User) => {
        setIsGlobalLoading(true);
        try {
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
            await SQLService.upsertUser(updatedUser);
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        } catch (e) {
            showToast("Eroare la actualizarea utilizatorului.", 'error');
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
            showToast("Eroare server: Nu s-a putut șterge pontajul.", 'error');
        } finally {
            setIsGlobalLoading(false);
        }
    }, [setTimesheets, setIsGlobalLoading]);

    const handleTimesheetSave = useCallback(async (data: any, targetUserId: string | null) => {
        if (!currentUser) return;
        setIsGlobalLoading(true);

        const isManager = currentUser.roles.includes(Role.MANAGER) || currentUser.roles.includes(Role.ADMIN) || currentUser.roles.includes(Role.HR) || currentUser.roles.includes(Role.PONTATOR);
        const ownerId = targetUserId;

        if (!ownerId) {
            showToast("Eroare internă: Nu s-a putut identifica utilizatorul țintă.", 'error');
            setIsGlobalLoading(false);
            return;
        }

        try {
            if (data.type === 'WORK') {
                if (isManager) {
                    let newTs: Timesheet;
                    if (!data.tsId) {
                        const sameDay = timesheets.find(t => t.userId === ownerId && t.date === data.date);
                        if (sameDay) data.tsId = sameDay.id;
                    }
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
                    showToast("Solicitarea de corecție a fost trimisă către manager!", 'success');
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

                setLeaves(prev => [newLeave, ...prev.filter(x => x.id !== newLeave.id)]);
            await SQLService.upsertLeave(newLeave);
                setLeaves(prev => [newLeave, ...prev.filter(x => x.id !== newLeave.id)]);
            showToast("Cererea a fost înregistrată și managerul a fost notificat pe email!", 'success');

                if (isManager && data.tsId) {
                    await SQLService.deleteTimesheet(data.tsId);
                    setTimesheets(prev => prev.filter(t => t.id !== data.tsId));
                }
            }
        } catch (e) {
            showToast("Eroare server: Salvarea a eșuat.", 'error');
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
            showToast("Eroare server.", 'error');
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
                setLeaves(prev => prev.map(l => l.id === reqId ? updated : l));
                await SQLService.upsertLeave(updated);
                setLeaves(prev => prev.map(l => l.id === reqId ? updated : l));
            }
        } catch (e) {
            showToast("Eroare server.", 'error');
        } finally {
            setIsGlobalLoading(false);
        }
    }, [leaves, setLeaves, setIsGlobalLoading]);

    const handleAssignSchedule = useCallback(async (userId: string, date: string, scheduleId: string) => {
        const newId = `ds-${userId}-${date}`;
        setSchedulePlans(prev => {
            const existing = prev.find(s => s.userId === userId && s.date === date);
            if (existing) {
                if (scheduleId === "") return prev.filter(s => s.id !== existing.id);
                else return prev.map(s => s.id === existing.id ? { ...s, scheduleId } : s);
            } else if (scheduleId !== "") {
                return [...prev, { id: newId, userId, date, scheduleId }];
            }
            return prev;
        });
        try {
            await SQLService.upsertSchedulePlan({ id: newId, userId, date, scheduleId });
        } catch (e) {
            showToast("Eroare la salvarea planificării în baza de date.", 'error');
            await fetchAllData();
            // Local state updated above; no full reload needed.
        }
    }, [setSchedulePlans, fetchAllData]);

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
