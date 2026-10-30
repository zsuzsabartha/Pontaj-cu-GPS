// End-to-end authorization test for PontajSmart (dev database).
// Starts the bridge in AUTH_MODE=enforce on a temp port, creates sessions for real users with different roles
// (tokens signed with the app's JWT_SECRET), checks each rule, and removes all test data (ids "test-auth-*").
import { spawn } from 'child_process';
import { createRequire } from 'module';
import fs from 'fs';

// Run from the project root: npm run test:e2e  (needs network access to the dev SQL Server)
const ROOT = process.cwd().replace(/\\/g, '/');
const PORT = 3996;
const BASE = `http://127.0.0.1:${PORT}/api/v1`;
const require = createRequire(`${ROOT}/package.json`);
const jwt = require('jsonwebtoken');
const sql = require('mssql');

const env = Object.fromEntries(
  fs.readFileSync(`${ROOT}/.env`, 'utf8').split(/\r?\n/)
    .filter(l => l && !l.trim().startsWith('#') && l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`); };
const skip = (name, why) => { results.push({ name, ok: null, detail: why }); console.log(`SKIP  ${name}  -> ${why}`); };

const cookieFor = (userId, secret = env.JWT_SECRET) => `pontaj_session=${jwt.sign({ sub: userId }, secret, { expiresIn: '1h' })}`;
const call = async (method, path, { cookie, body } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data, headers: res.headers };
};

const dbConfig = {
  user: env.DB_USER, password: env.DB_PASS, server: env.DB_SERVER, database: env.DB_NAME,
  port: parseInt(env.DB_PORT || '1433'), options: { encrypt: true, trustServerCertificate: true },
};

const cleanup = async (pool) => {
  await pool.request().query("IF OBJECT_ID('timesheet_logs', 'U') IS NOT NULL DELETE FROM timesheet_logs WHERE timesheet_id LIKE 'test-auth-%' OR id LIKE 'test-auth-%'");
  await pool.request().query("IF OBJECT_ID('schedule_plans', 'U') IS NOT NULL DELETE FROM schedule_plans WHERE id LIKE 'test-auth-%' OR date >= '2099-01-01'");
  await pool.request().query("DELETE FROM breaks WHERE timesheet_id LIKE 'test-auth-%' OR id LIKE 'test-auth-%'");
  await pool.request().query("DELETE FROM timesheets WHERE id LIKE 'test-auth-%'");
  await pool.request().query("DELETE FROM leave_requests WHERE id LIKE 'test-auth-%'");
  await pool.request().query("DELETE FROM correction_requests WHERE id LIKE 'test-auth-%'");
};

let server;
let pool;
try {
  pool = await sql.connect(dbConfig);
  await cleanup(pool);

  // --- Pick real users by role ---
  const { recordset: rows } = await pool.request().query("SELECT id, name, roles, company_id, timekeeper_id FROM users WHERE employment_status = 'ACTIVE'");
  const users = rows.map(r => { let roles = []; try { roles = JSON.parse(r.roles || '[]'); } catch {} return { id: r.id, name: r.name, roles, companyId: r.company_id, timekeeperId: r.timekeeper_id }; });
  const byId = new Map(users.map(u => [u.id, u]));
  const onlyEmployee = u => u.roles.length > 0 && u.roles.every(r => r === 'EMPLOYEE');
  const admin = users.find(u => u.roles.includes('ADMIN'));
  const manager = users.find(u => u.roles.includes('MANAGER') && !u.roles.includes('ADMIN') && u.companyId
    && users.filter(x => onlyEmployee(x) && x.companyId === u.companyId).length >= 2);
  const sameCompany = manager ? users.filter(x => onlyEmployee(x) && x.companyId === manager.companyId) : [];
  const employee = sameCompany[0];
  const colleague = sameCompany[1];
  const { recordset: leaveTypes } = await pool.request().query('SELECT TOP 1 id FROM leave_configs');
  const leaveTypeId = leaveTypes[0]?.id;

  console.log(`Users: ${users.length} active | admin=${admin?.name} | manager=${manager?.name} (${manager?.companyId}) | employee=${employee?.name} | colleague=${colleague?.name} | leaveType=${leaveTypeId}`);
  if (!admin || !manager || !employee || !colleague || !leaveTypeId) throw new Error('Missing test users/roles in DB (need ADMIN, MANAGER with 2 EMPLOYEE-only colleagues, a leave type).');

  const C = { admin: cookieFor(admin.id), manager: cookieFor(manager.id), employee: cookieFor(employee.id) };

  // --- Start bridge in enforce mode ---
  server = spawn('node', ['bridge/server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), AUTH_MODE: 'enforce' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const serverLog = [];
  server.stdout.on('data', d => serverLog.push(String(d)));
  server.stderr.on('data', d => serverLog.push(String(d)));
  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    try { up = (await fetch(`${BASE}/ping`)).ok; } catch { await new Promise(r => setTimeout(r, 500)); }
  }
  if (!up) throw new Error('Server did not start:\n' + serverLog.join(''));
  check('server reports enforce mode', serverLog.join('').includes('Authorization mode: enforce'));

  // --- Authentication ---
  check('public /health works without session', (await call('GET', '/health')).status === 200);
  check('anonymous GET /config/users -> 401', (await call('GET', '/config/users')).status === 401);
  check('forged cookie (wrong secret) -> 401', (await call('GET', '/config/users', { cookie: cookieFor(admin.id, 'not-the-real-secret-not-the-real-secret') })).status === 401);
  const me = await call('GET', '/auth/me', { cookie: C.employee });
  check('/auth/me returns the session user', me.status === 200 && me.data?.user?.id === employee.id, `status ${me.status}`);
  const usersRes = await call('GET', '/config/users', { cookie: C.employee });
  check('user list exposes no PIN fields', usersRes.status === 200 && usersRes.data.every(u => !('pin' in u) && !('pin_hash' in u)));

  // --- Read scoping ---
  const tsEmp = await call('GET', '/seed/timesheets', { cookie: C.employee });
  check('employee sees only own timesheets', tsEmp.status === 200 && tsEmp.data.every(t => t.userId === employee.id), `${tsEmp.data?.length} rows`);
  const lvEmp = await call('GET', '/seed/leaves', { cookie: C.employee });
  check('employee sees only own leaves', lvEmp.status === 200 && lvEmp.data.every(l => l.userId === employee.id), `${lvEmp.data?.length} rows`);
  const tsMgr = await call('GET', '/seed/timesheets', { cookie: C.manager });
  check('manager sees only own company', tsMgr.status === 200 && tsMgr.data.every(t => t.userId === manager.id || byId.get(t.userId)?.companyId === manager.companyId), `${tsMgr.data?.length} rows`);
  const tsAdm = await call('GET', '/seed/timesheets', { cookie: C.admin });
  check('admin sees at least as much as manager', tsAdm.status === 200 && tsAdm.data.length >= tsMgr.data.length, `${tsAdm.data?.length} rows`);

  // --- Write rules ---
  check('employee cannot edit configuration', (await call('POST', '/config/companies', { cookie: C.employee, body: [] })).status === 403);
  check('employee cannot grant himself ADMIN', (await call('POST', '/config/users', { cookie: C.employee, body: [{ id: employee.id, roles: ['ADMIN'] }] })).status === 403);
  check('employee cannot run user sync', (await call('POST', '/auth/sync-users', { cookie: C.employee, body: {} })).status === 403);

  const ownTs = { id: 'test-auth-ts-emp', userId: employee.id, date: '2099-01-01', startTime: '2099-01-01T07:00:00.000Z', endTime: '2099-01-01T15:00:00.000Z', status: 'COMPLETED', breaks: [] };
  const r1 = await call('POST', '/seed/timesheets', { cookie: C.employee, body: [ownTs] });
  check('employee can save own timesheet', r1.status === 200, `status ${r1.status} ${JSON.stringify(r1.data)}`);
  check('server overrides client clock on employee timesheet punch', r1.data?.timesheets?.[0]?.startTime !== '2099-01-01T07:00:00.000Z' && r1.data?.timesheets?.[0]?.date !== '2099-01-01', `got ${r1.data?.timesheets?.[0]?.startTime}`);
  const withApprovedBreak = { ...ownTs, breaks: [{ id: 'test-auth-br-1', typeId: null, typeName: 'Test', startTime: '2099-01-01T10:00:00.000Z', endTime: '2099-01-01T10:15:00.000Z', status: 'Approved' }] };
  check('employee cannot approve own break', (await call('POST', '/seed/timesheets', { cookie: C.employee, body: [withApprovedBreak] })).status === 403);
  const colleagueTs = {
    ...ownTs,
    id: 'test-auth-ts-col',
    userId: colleague.id,
    date: '2099-01-02',
    notes: 'Tură verificată',
    distanceToOffice: 42,
    endLocation: { latitude: 46.5425, longitude: 24.5575 },
    logs: [{ id: 'test-auth-log-1', changedByUserId: manager.id, changeDate: '2099-01-02T16:00:00.000Z', details: 'Manager Created' }],
  };
  check("employee cannot write a colleague's timesheet", (await call('POST', '/seed/timesheets', { cookie: C.employee, body: [colleagueTs] })).status === 403);
  check('employee cannot delete timesheets', (await call('DELETE', '/timesheets/test-auth-ts-emp', { cookie: C.employee })).status === 403);
  const r2 = await call('POST', '/seed/timesheets', { cookie: C.manager, body: [colleagueTs] });
  check("manager can write a timesheet in own company", r2.status === 200, `status ${r2.status} ${JSON.stringify(r2.data)}`);
  const tsCheckMgr = await call('GET', '/seed/timesheets', { cookie: C.manager });
  const savedColTs = tsCheckMgr.data?.find(t => t.id === 'test-auth-ts-col');
  check('timesheet persists notes, distanceToOffice, endLocation, and audit logs',
    savedColTs?.notes === 'Tură verificată' && savedColTs?.distanceToOffice === 42 && Math.abs((savedColTs?.endLocation?.latitude || 0) - 46.5425) < 0.001 && savedColTs?.logs?.length === 1,
    JSON.stringify(savedColTs));

  const leave = { id: 'test-auth-lv-1', userId: employee.id, typeId: leaveTypeId, startDate: '2099-02-01', endDate: '2099-02-02', reason: 'test auth', status: 'Pending', createdAt: '2099-01-15T10:00:00.000Z' };
  const r3 = await call('POST', '/seed/leaves', { cookie: C.employee, body: [leave] });
  check('employee can request leave (Pending)', r3.status === 200, `status ${r3.status} ${JSON.stringify(r3.data)}`);
  check('employee cannot approve own leave', (await call('POST', '/seed/leaves', { cookie: C.employee, body: [{ ...leave, status: 'Approved' }] })).status === 403);
  const r4 = await call('POST', '/seed/leaves', { cookie: C.manager, body: [{ ...leave, status: 'Approved' }] });
  check('manager can approve leave in own company', r4.status === 200, `status ${r4.status} ${JSON.stringify(r4.data)}`);
  const r5 = await call('POST', '/seed/leaves', { cookie: C.employee, body: [{ ...leave, status: 'Cancelled', cancellationReason: 'Anulat pentru test' }] });
  check('employee can cancel own approved leave', r5.status === 200, `status ${r5.status}`);
  const lvAfterCancel = await call('GET', '/seed/leaves', { cookie: C.employee });
  const cancelledLv = lvAfterCancel.data?.find(l => l.id === 'test-auth-lv-1');
  check('leave persists cancellationReason and createdAt', cancelledLv?.cancellationReason === 'Anulat pentru test' && !!cancelledLv?.createdAt, JSON.stringify(cancelledLv));

  // --- Schedule plans & App settings (Phase 1 D4) ---
  check('employee cannot assign schedule plan', (await call('POST', '/schedule-plans', { cookie: C.employee, body: { id: 'test-auth-sp-1', userId: employee.id, date: '2099-03-01', scheduleId: 'sch-1' } })).status === 403);
  const spSave = await call('POST', '/schedule-plans', { cookie: C.manager, body: { id: 'test-auth-sp-1', userId: colleague.id, date: '2099-03-01', scheduleId: 'sch-1' } });
  check('manager can assign schedule plan in own company', spSave.status === 200);
  const spList = await call('GET', '/schedule-plans', { cookie: C.manager });
  check('schedule plan is persisted and returned by GET /schedule-plans', spList.status === 200 && spList.data?.some(p => p.userId === colleague.id && p.date === '2099-03-01' && p.scheduleId === 'sch-1'));

  check('manager cannot edit global settings (lockedDate)', (await call('POST', '/config/settings', { cookie: C.manager, body: { lockedDate: '2026-09-30' } })).status === 403);
  const prevSettings = await call('GET', '/config/settings', { cookie: C.admin });
  const setRes = await call('POST', '/config/settings', { cookie: C.admin, body: { lockedDate: prevSettings.data?.lockedDate || '2026-09-30' } });
  const afterSettings = await call('GET', '/config/settings', { cookie: C.employee });
  check('admin can persist lockedDate in app_settings and employee can read it', setRes.status === 200 && afterSettings.status === 200 && !!afterSettings.data?.lockedDate);

  const corr = { id: 'test-auth-cr-1', userId: employee.id, timesheetId: 'test-auth-ts-emp', requestedDate: '2099-01-01', requestedStartTime: '2099-01-01T06:00:00.000Z', requestedEndTime: '2099-01-01T15:00:00.000Z', reason: 'test auth', status: 'PENDING' };
  const rc = await call('POST', '/seed/corrections', { cookie: C.employee, body: [corr] });
  check('employee can request correction', rc.status === 200, `status ${rc.status} ${JSON.stringify(rc.data)}`);
  check('employee cannot approve own correction', (await call('POST', '/seed/corrections', { cookie: C.employee, body: [{ ...corr, status: 'APPROVED' }] })).status === 403);
  const listed = await call('GET', '/seed/corrections', { cookie: C.employee });
  const mine = listed.data?.find(c => c.id === corr.id);
  check('correction is stored with requested times', !!mine && !!mine.requestedStartTime && !!mine.requestedEndTime, JSON.stringify(mine));
  const resave = await call('POST', '/seed/timesheets', { cookie: C.employee, body: [{ ...ownTs, endTime: '2099-01-01T16:00:00.000Z' }] });
  check('timesheet with a pending correction can still be saved', resave.status === 200, `status ${resave.status} ${JSON.stringify(resave.data)}`);

  check('admin can delete test timesheet', (await call('DELETE', '/timesheets/test-auth-ts-emp', { cookie: C.admin })).status === 200);
  check('admin can delete test leave', (await call('DELETE', '/leaves/test-auth-lv-1', { cookie: C.admin })).status === 200);

  const out = await call('POST', '/auth/logout', { cookie: C.employee, body: {} });
  check('logout clears the session cookie', out.status === 200 && /pontaj_session=;/.test(out.headers.get('set-cookie') || ''));

  const violations = serverLog.join('').split('\n').filter(l => l.includes('[AUTHZ-VIOLATION]'));
  console.log(`\nServer logged ${violations.length} [AUTHZ-VIOLATION] lines (expected: one per denied test).`);
} catch (e) {
  check('test run completed', false, e.message);
} finally {
  if (pool) { try { await cleanup(pool); console.log('Test data removed.'); } catch (e) { console.log('Cleanup failed:', e.message); } await pool.close(); }
  if (server) server.kill();
  const failed = results.filter(r => r.ok === false).length;
  const passed = results.filter(r => r.ok === true).length;
  console.log(`\nRESULT: ${passed} passed, ${failed} failed, ${results.filter(r => r.ok === null).length} skipped`);
  process.exit(failed ? 1 : 0);
}

