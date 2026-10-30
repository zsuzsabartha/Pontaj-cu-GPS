// Pure authorization rules for PontajSmart (no DB / Express dependencies, unit-tested in policy.test.js).
//
// Visibility scope (mirrors what the UI shows today):
//   EMPLOYEE         -> own data only
//   PONTATOR         -> own data + users whose timekeeperId is the actor
//   MANAGER / HR     -> own data + users in the same company
//   ADMIN            -> everything

export const ROLE = Object.freeze({
    EMPLOYEE: 'EMPLOYEE',
    MANAGER: 'MANAGER',
    HR: 'HR',
    ADMIN: 'ADMIN',
    PONTATOR: 'PONTATOR',
});

// Status values as stored by the frontend enums (types.ts).
export const STATUS = Object.freeze({
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
});

// Correction requests use upper-case literals in the frontend.
export const CORRECTION_STATUS = Object.freeze({
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
});

export const hasRole = (actor, ...roles) =>
    !!actor && Array.isArray(actor.roles) && roles.some(r => actor.roles.includes(r));

/** Can the actor see this user's data (timesheets, leaves, corrections)? */
export const canSeeUser = (actor, target) => {
    if (!actor || !target) return false;
    if (actor.id === target.id) return true;
    if (hasRole(actor, ROLE.ADMIN)) return true;
    if (hasRole(actor, ROLE.MANAGER, ROLE.HR) && actor.companyId && target.companyId === actor.companyId) return true;
    if (hasRole(actor, ROLE.PONTATOR) && target.timekeeperId === actor.id) return true;
    return false;
};

/** Can the actor create/edit/delete timesheets and decide corrections for this user? */
export const canManageTimesheetsOf = (actor, target) =>
    hasRole(actor, ROLE.ADMIN, ROLE.HR, ROLE.MANAGER, ROLE.PONTATOR) && canSeeUser(actor, target);

/** Can the actor assign or clear daily work schedules in the calendar for this user? */
export const canAssignSchedule = (actor, target) => canManageTimesheetsOf(actor, target);

/** Can the actor approve/reject/delete leave requests for this user? */
export const canDecideLeavesOf = (actor, target) =>
    hasRole(actor, ROLE.ADMIN, ROLE.HR, ROLE.MANAGER) && canSeeUser(actor, target);

export const canManageUsers = (actor) => hasRole(actor, ROLE.ADMIN, ROLE.HR);
export const canEditConfig = (actor) => hasRole(actor, ROLE.ADMIN);
export const canRunIntegrations = (actor) => hasRole(actor, ROLE.ADMIN, ROLE.HR);

/** HR may manage users but may not grant or remove the ADMIN role. Returns a violation reason or null. */
export const checkRoleAssignment = (actor, oldRoles = [], newRoles = []) => {
    if (hasRole(actor, ROLE.ADMIN)) return null;
    if (!canManageUsers(actor)) return 'only ADMIN/HR can manage users';
    const hadAdmin = oldRoles.includes(ROLE.ADMIN);
    const hasAdmin = newRoles.includes(ROLE.ADMIN);
    if (hadAdmin !== hasAdmin) return 'only ADMIN can grant or remove the ADMIN role';
    return null;
};

/**
 * An employee writing their own timesheet (clock in/out, breaks) may not change break approval status.
 * New breaks must be Pending; existing breaks must keep their stored status.
 * Returns a violation reason or null.
 */
export const checkOwnTimesheetBreaks = (existingBreaks = [], incomingBreaks = []) => {
    const previous = new Map(existingBreaks.map(b => [b.id, b.status]));
    for (const b of incomingBreaks) {
        const allowed = previous.has(b.id) ? previous.get(b.id) : STATUS.PENDING;
        if ((b.status || STATUS.PENDING) !== allowed) {
            return `employee cannot set break ${b.id} status to ${b.status}`;
        }
    }
    return null;
};

/**
 * Leave written by its owner (not an approver): new requests must be Pending,
 * existing ones may only keep their status or be cancelled. Returns a violation reason or null.
 */
export const checkOwnLeave = (existing, incoming) => {
    if (!existing) {
        return incoming.status === STATUS.PENDING ? null : `new leave must be ${STATUS.PENDING}`;
    }
    if (incoming.status === existing.status || incoming.status === STATUS.CANCELLED) return null;
    return `employee cannot change leave status from ${existing.status} to ${incoming.status}`;
};

/** Correction written by its owner: new must be PENDING, existing must keep its status. */
export const checkOwnCorrection = (existing, incoming) => {
    if (!existing) {
        return incoming.status === CORRECTION_STATUS.PENDING ? null : `new correction must be ${CORRECTION_STATUS.PENDING}`;
    }
    return incoming.status === existing.status ? null : `employee cannot change correction status to ${incoming.status}`;
};

/** Returns `YYYY-MM-DD` in the Europe/Bucharest timezone for a given Date. */
export const toServerLocalDateISO = (d = new Date()) =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Bucharest',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);

const toISOOrKeep = (val) => (val instanceof Date ? val.toISOString() : val);
const toDateISO = (val) => (val instanceof Date ? val.toISOString().slice(0, 10) : String(val).slice(0, 10));

/**
 * Computes authoritative timestamps (`date`, `startTime`, `endTime`, and break `startTime`/`endTime`)
 * for a timesheet write.
 * - Live punches (`incoming.clockAction` set) OR non-manager self-service writes always use `now` (server clock)
 *   and preserve already-recorded DB timestamps.
 * - Manager manual edits / approved corrections without `clockAction` keep the explicit timestamps sent.
 */
export const resolveTimesheetTimestamps = (actor, target, existingTs, existingBreaks = [], incoming = {}, now = new Date()) => {
    const isManagerEdit = !incoming.clockAction && canManageTimesheetsOf(actor, target);
    if (isManagerEdit) {
        return {
            date: incoming.date,
            startTime: incoming.startTime,
            endTime: incoming.endTime || null,
            breaks: (incoming.breaks || []).map(b => ({
                ...b,
                startTime: b.startTime,
                endTime: b.endTime || null,
            })),
        };
    }

    const nowISO = now.toISOString();
    const todayISO = toServerLocalDateISO(now);
    const prevBreakMap = new Map(existingBreaks.map(b => [b.id, b]));

    const date = existingTs?.date ? toDateISO(existingTs.date) : todayISO;
    const startTime = existingTs?.start_time ? toISOOrKeep(existingTs.start_time) : nowISO;
    const existingEnd = existingTs?.end_time ? toISOOrKeep(existingTs.end_time) : null;
    const endTime = existingEnd || ((incoming.endTime || incoming.clockAction === 'CLOCK_OUT') ? nowISO : null);

    const breaks = (incoming.breaks || []).map(b => {
        const prev = prevBreakMap.get(b.id);
        const bStart = prev?.start_time ? toISOOrKeep(prev.start_time) : nowISO;
        const prevEnd = prev?.end_time ? toISOOrKeep(prev.end_time) : null;
        const bEnd = prevEnd || (b.endTime ? nowISO : null);
        return { ...b, startTime: bStart, endTime: bEnd };
    });

    return { date, startTime, endTime, breaks };
};
