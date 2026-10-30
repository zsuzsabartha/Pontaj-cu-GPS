// Run with: node --test bridge/auth/policy.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    canSeeUser, canManageTimesheetsOf, canDecideLeavesOf, canManageUsers, canEditConfig,
    checkRoleAssignment, checkOwnTimesheetBreaks, checkOwnLeave, checkOwnCorrection, STATUS,
} from './policy.js';

const user = (id, roles, companyId = 'C1', extra = {}) => ({ id, roles, companyId, ...extra });

const admin = user('admin', ['ADMIN'], 'C9');
const hr = user('hr', ['HR']);
const manager = user('mgr', ['MANAGER']);
const pontator = user('pont', ['PONTATOR']);
const employee = user('emp', ['EMPLOYEE']);
const colleague = user('col', ['EMPLOYEE']);
const timekept = user('tk', ['EMPLOYEE'], 'C2', { timekeeperId: 'pont' });
const otherCompany = user('oth', ['EMPLOYEE'], 'C2');

test('everyone sees their own data; nobody sees anything without a session', () => {
    for (const a of [admin, hr, manager, pontator, employee]) assert.equal(canSeeUser(a, a), true);
    assert.equal(canSeeUser(null, employee), false);
});

test('employee sees only own data', () => {
    assert.equal(canSeeUser(employee, colleague), false);
    assert.equal(canManageTimesheetsOf(employee, employee), false);
    assert.equal(canDecideLeavesOf(employee, employee), false);
});

test('manager and HR see their company, not other companies', () => {
    assert.equal(canSeeUser(manager, colleague), true);
    assert.equal(canSeeUser(hr, colleague), true);
    assert.equal(canSeeUser(manager, otherCompany), false);
    assert.equal(canDecideLeavesOf(manager, colleague), true);
    assert.equal(canDecideLeavesOf(manager, otherCompany), false);
});

test('pontator sees and manages timesheets only of assigned users, cannot decide leaves', () => {
    assert.equal(canSeeUser(pontator, timekept), true);
    assert.equal(canSeeUser(pontator, colleague), false);
    assert.equal(canManageTimesheetsOf(pontator, timekept), true);
    assert.equal(canDecideLeavesOf(pontator, timekept), false);
});

test('admin sees everything across companies', () => {
    assert.equal(canSeeUser(admin, otherCompany), true);
    assert.equal(canManageTimesheetsOf(admin, otherCompany), true);
});

test('user management and configuration permissions', () => {
    assert.equal(canManageUsers(hr), true);
    assert.equal(canManageUsers(manager), false);
    assert.equal(canEditConfig(admin), true);
    assert.equal(canEditConfig(hr), false);
});

test('HR cannot grant or remove ADMIN; admin can', () => {
    assert.equal(checkRoleAssignment(hr, ['EMPLOYEE'], ['EMPLOYEE', 'MANAGER']), null);
    assert.notEqual(checkRoleAssignment(hr, ['EMPLOYEE'], ['ADMIN']), null);
    assert.notEqual(checkRoleAssignment(hr, ['ADMIN'], ['EMPLOYEE']), null);
    assert.equal(checkRoleAssignment(admin, ['EMPLOYEE'], ['ADMIN']), null);
    assert.notEqual(checkRoleAssignment(employee, [], ['ADMIN']), null);
});

test('employee cannot approve own breaks', () => {
    const existing = [{ id: 'b1', status: STATUS.PENDING }];
    assert.equal(checkOwnTimesheetBreaks(existing, [{ id: 'b1', status: STATUS.PENDING }, { id: 'b2', status: STATUS.PENDING }]), null);
    assert.notEqual(checkOwnTimesheetBreaks(existing, [{ id: 'b1', status: STATUS.APPROVED }]), null);
    assert.notEqual(checkOwnTimesheetBreaks([], [{ id: 'b3', status: STATUS.APPROVED }]), null);
    // Already-approved break stays approved when the employee clocks out.
    assert.equal(checkOwnTimesheetBreaks([{ id: 'b1', status: STATUS.APPROVED }], [{ id: 'b1', status: STATUS.APPROVED }]), null);
});

test('employee leave: create pending, cancel allowed, self-approval blocked', () => {
    assert.equal(checkOwnLeave(null, { status: STATUS.PENDING }), null);
    assert.notEqual(checkOwnLeave(null, { status: STATUS.APPROVED }), null);
    assert.equal(checkOwnLeave({ status: STATUS.APPROVED }, { status: STATUS.CANCELLED }), null);
    assert.notEqual(checkOwnLeave({ status: STATUS.PENDING }, { status: STATUS.APPROVED }), null);
});

test('employee correction: create pending, cannot approve', () => {
    assert.equal(checkOwnCorrection(null, { status: 'PENDING' }), null);
    assert.notEqual(checkOwnCorrection(null, { status: 'APPROVED' }), null);
    assert.notEqual(checkOwnCorrection({ status: 'PENDING' }, { status: 'APPROVED' }), null);
});
