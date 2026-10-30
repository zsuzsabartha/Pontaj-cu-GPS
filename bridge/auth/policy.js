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
