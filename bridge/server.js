
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import sql from 'mssql';
import { connectDB } from './db.js';

const app = express();

// Increase payload limit for large syncs
app.use(express.json({ limit: '50mb' }));
app.use(cors());

/* -------------------- HELPERS -------------------- */

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const toISODate = (d) => {
  if (!d) return null;
  return new Date(d).toISOString().split('T')[0];
};

/* -------------------- HEALTH -------------------- */

app.get('/api/v1/health', asyncHandler(async (_, res) => {
  try {
    const pool = await connectDB();
    await pool.request().query('SELECT 1'); // Simple ping
    res.json({ status: 'ONLINE', db: 'CONNECTED' });
  } catch (e) {
    res.status(503).json({ status: 'OFFLINE', error: e.message });
  }
}));

/* -------------------- GENERIC CONFIG SYNC -------------------- */

const handleConfigSync = async (table, data, mapFn) => {
    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
        for (const item of data) {
            const { query, params } = mapFn(item);
            
            // Check existence
            const checkReq = transaction.request();
            checkReq.input('id', params.id);
            const check = await checkReq.query(`SELECT 1 FROM ${table} WHERE id = @id`);
            
            // If exists, delete first to allow clean insert (simplest upsert for complex objects)
            if (check.recordset.length > 0) {
               const delReq = transaction.request();
               delReq.input('id', params.id);
               await delReq.query(`DELETE FROM ${table} WHERE id = @id`);
            }

            // Insert
            const req = transaction.request();
            Object.entries(params).forEach(([k, v]) => req.input(k, v !== undefined ? v : null)); 
            await req.query(query);
        }
        await transaction.commit();
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

/* -------------------- CONFIG ENDPOINTS -------------------- */

// COMPANIES
app.get('/api/v1/config/companies', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT * FROM companies');
    res.json(result.recordset);
}));
app.post('/api/v1/config/companies', asyncHandler(async (req, res) => {
    await handleConfigSync('companies', req.body, (c) => ({
        query: 'INSERT INTO companies (id, name) VALUES (@id, @name)',
        params: { id: c.id, name: c.name }
    }));
    res.json({ success: true });
}));

// DEPARTMENTS
app.get('/api/v1/config/departments', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT * FROM departments');
    res.json(result.recordset.map(d => ({
        id: d.id, name: d.name, companyId: d.company_id, managerId: d.manager_id, emailNotifications: d.email_notifications
    })));
}));
app.post('/api/v1/config/departments', asyncHandler(async (req, res) => {
    await handleConfigSync('departments', req.body, (d) => ({
        query: 'INSERT INTO departments (id, name, company_id, manager_id, email_notifications) VALUES (@id, @name, @cid, @mid, @en)',
        params: { id: d.id, name: d.name, cid: d.companyId, mid: d.managerId, en: d.emailNotifications ? 1 : 0 }
    }));
    res.json({ success: true });
}));

// OFFICES
app.get('/api/v1/config/offices', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT * FROM offices');
    res.json(result.recordset.map(o => ({
        id: o.id, name: o.name, radiusMeters: o.radius_meters,
        coordinates: { latitude: o.latitude, longitude: o.longitude }
    })));
}));
app.post('/api/v1/config/offices', asyncHandler(async (req, res) => {
    await handleConfigSync('offices', req.body, (o) => ({
        query: 'INSERT INTO offices (id, name, latitude, longitude, radius_meters) VALUES (@id, @name, @lat, @long, @rad)',
        params: { id: o.id, name: o.name, lat: o.coordinates.latitude, long: o.coordinates.longitude, rad: o.radiusMeters }
    }));
    res.json({ success: true });
}));

// USERS
app.get('/api/v1/config/users', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT * FROM users');
    res.json(result.recordset.map(u => ({
        ...u,
        roles: u.roles ? JSON.parse(u.roles) : [],
        alternativeScheduleIds: u.alternative_schedule_ids ? JSON.parse(u.alternative_schedule_ids) : [],
        companyId: u.company_id, departmentId: u.department_id, assignedOfficeId: u.assigned_office_id,
        mainScheduleId: u.main_schedule_id, contractHours: u.contract_hours, isValidated: u.is_validated,
        requiresGPS: u.requires_gps, erpId: u.erp_id, authType: u.auth_type, employmentStatus: u.employment_status
    })));
}));
app.post('/api/v1/config/users', asyncHandler(async (req, res) => {
    await handleConfigSync('users', req.body, (u) => ({
        query: `INSERT INTO users (id, erp_id, company_id, department_id, assigned_office_id, main_schedule_id, name, email, auth_type, roles, contract_hours, is_validated, requires_gps, employment_status, alternative_schedule_ids) 
                VALUES (@id, @erpId, @cid, @did, @oid, @sid, @name, @email, @auth, @roles, @hours, @val, @gps, @status, @altSched)`,
        params: {
            id: u.id, erpId: u.erpId, cid: u.companyId, did: u.departmentId, oid: u.assignedOfficeId, sid: u.mainScheduleId,
            name: u.name, email: u.email, auth: u.authType, roles: JSON.stringify(u.roles), hours: u.contractHours, val: u.isValidated?1:0, gps: u.requiresGPS?1:0, status: u.employmentStatus,
            altSched: JSON.stringify(u.alternativeScheduleIds || [])
        }
    }));
    res.json({ success: true });
}));

// OTHER CONFIGS
app.get('/api/v1/config/breaks', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT * FROM break_configs');
    res.json(result.recordset.map(b => ({ id: b.id, name: b.name, isPaid: b.is_paid, icon: b.icon })));
}));
app.post('/api/v1/config/breaks', asyncHandler(async (req, res) => {
    await handleConfigSync('break_configs', req.body, (b) => ({
        query: 'INSERT INTO break_configs (id, name, is_paid, icon) VALUES (@id, @name, @paid, @icon)',
        params: { id: b.id, name: b.name, paid: b.isPaid?1:0, icon: b.icon }
    }));
    res.json({ success: true });
}));

app.get('/api/v1/config/leaves', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT * FROM leave_configs');
    res.json(result.recordset.map(l => ({ id: l.id, name: l.name, code: l.code, requiresApproval: l.requires_approval })));
}));
app.post('/api/v1/config/leaves', asyncHandler(async (req, res) => {
    await handleConfigSync('leave_configs', req.body, (l) => ({
        query: 'INSERT INTO leave_configs (id, name, code, requires_approval) VALUES (@id, @name, @code, @req)',
        params: { id: l.id, name: l.name, code: l.code, req: l.requiresApproval?1:0 }
    }));
    res.json({ success: true });
}));

app.get('/api/v1/config/holidays', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT * FROM holidays');
    res.json(result.recordset.map(h => ({ id: h.id, date: toISODate(h.date), name: h.name })));
}));
app.post('/api/v1/config/holidays', asyncHandler(async (req, res) => {
    await handleConfigSync('holidays', req.body, (h) => ({
        query: 'INSERT INTO holidays (id, date, name) VALUES (@id, @date, @name)',
        params: { id: h.id, date: h.date, name: h.name }
    }));
    res.json({ success: true });
}));

// WORK SCHEDULES
app.get('/api/v1/config/schedules', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT * FROM work_schedules');
    res.json(result.recordset.map(s => ({
        id: s.id, name: s.name, startTime: s.start_time, endTime: s.end_time, crosses_midnight: s.crosses_midnight
    })));
}));
app.post('/api/v1/config/schedules', asyncHandler(async (req, res) => {
    await handleConfigSync('work_schedules', req.body, (s) => ({
        query: 'INSERT INTO work_schedules (id, name, start_time, end_time, crosses_midnight) VALUES (@id, @name, @start, @end, @cross)',
        params: { id: s.id, name: s.name, start: s.startTime, end: s.endTime, cross: s.crossesMidnight ? 1 : 0 }
    }));
    res.json({ success: true });
}));

/* -------------------- SEED ENDPOINTS -------------------- */

// TIMESHEETS
app.get('/api/v1/seed/timesheets', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    // This query triggers "Invalid column name 'manager_note'" if schema is old
    const { recordset } = await pool.request().query(`
        SELECT t.*, b.id as bid, b.type_id, b.type_name, b.start_time as bstart, b.end_time as bend, b.status as bstatus, b.manager_note, bc.name as config_name
        FROM timesheets t
        LEFT JOIN breaks b ON b.timesheet_id = t.id
        LEFT JOIN break_configs bc ON bc.id = b.type_id
    `);
    
    const map = new Map();
    recordset.forEach(r => {
        if (!map.has(r.id)) {
            map.set(r.id, {
                id: r.id, userId: r.user_id, date: toISODate(r.date),
                startTime: r.start_time, endTime: r.end_time, status: r.status,
                matchedOfficeId: r.matched_office_id, distanceToOffice: 0,
                detectedScheduleId: r.detected_schedule_id,
                breaks: []
            });
        }
        if (r.bid) {
            map.get(r.id).breaks.push({
                id: r.bid, typeId: r.type_id, 
                // Fallback to config name if available, else use saved snapshot, else default
                typeName: r.config_name || r.type_name || 'Unknown Break',
                startTime: r.bstart, endTime: r.bend, status: r.bstatus, managerNote: r.manager_note
            });
        }
    });
    res.json([...map.values()]);
}));

app.post('/api/v1/seed/timesheets', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
        for (const t of req.body) {
            
            // DUPLICATE CHECK: Prevent adding a second timesheet for the same user on the same date (unless updating same ID)
            const dupCheck = await transaction.request()
                .input('uid', t.userId)
                .input('date', t.date)
                .input('id', t.id)
                .query(`SELECT id FROM timesheets WHERE user_id = @uid AND date = @date AND id != @id`);

            if (dupCheck.recordset.length > 0) {
                 throw new Error(`Data Constraint Violation: User ${t.userId} already has a timesheet on ${t.date}`);
            }

            // Delete existing
            await transaction.request().input('id', t.id).query('DELETE FROM timesheets WHERE id = @id');
            await transaction.request().input('id', t.id).query('DELETE FROM breaks WHERE timesheet_id = @id');

            const sLat = t.startLocation ? t.startLocation.latitude : null;
            const sLong = t.startLocation ? t.startLocation.longitude : null;

            await transaction.request()
               .input('id', t.id).input('uid', t.userId).input('date', t.date)
               .input('start', t.startTime).input('end', t.endTime || null)
               .input('status', t.status).input('oid', t.matchedOfficeId || null)
               .input('sid', t.detectedScheduleId || null)
               .input('slat', sLat).input('slong', sLong)
               .query(`INSERT INTO timesheets (id, user_id, date, start_time, end_time, status, matched_office_id, detected_schedule_id, start_lat, start_long) 
                       VALUES (@id, @uid, @date, @start, @end, @status, @oid, @sid, @slat, @slong)`);
            
            if (t.breaks) {
                for (const b of t.breaks) {
                    await transaction.request()
                       .input('id', b.id).input('tid', t.id).input('type', b.typeId).input('name', b.typeName)
                       .input('start', b.startTime).input('end', b.endTime || null).input('status', b.status).input('note', b.managerNote || null)
                       .query(`INSERT INTO breaks (id, timesheet_id, type_id, type_name, start_time, end_time, status, manager_note) 
                               VALUES (@id, @tid, @type, @name, @start, @end, @status, @note)`);
                }
            }
        }
        await transaction.commit();
        res.json({ success: true });
    } catch(e) {
        await transaction.rollback();
        // Return 409 Conflict if constraint violation, else 500
        if (e.message.includes('Data Constraint Violation')) {
            throw new Error(e.message); 
        }
        throw e;
    }
}));

// DELETE TIMESHEET
app.delete('/api/v1/timesheets/:id', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    const id = req.params.id;
    await pool.request().input('id', id).query('DELETE FROM breaks WHERE timesheet_id = @id');
    await pool.request().input('id', id).query('DELETE FROM timesheets WHERE id = @id');
    res.json({ success: true, deletedId: id });
}));

// LEAVES
app.get('/api/v1/seed/leaves', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query(`
        SELECT l.*, lc.name as type_name, lc.code 
        FROM leave_requests l
        LEFT JOIN leave_configs lc ON lc.id = l.type_id
    `);
    res.json(result.recordset.map(l => ({
        id: l.id, userId: l.user_id, typeId: l.type_id, typeName: l.type_name,
        startDate: toISODate(l.start_date), endDate: toISODate(l.end_date),
        reason: l.reason, status: l.status, managerComment: l.manager_comment
    })));
}));

app.post('/api/v1/seed/leaves', asyncHandler(async (req, res) => {
    await handleConfigSync('leave_requests', req.body, (l) => ({
        query: 'INSERT INTO leave_requests (id, user_id, type_id, start_date, end_date, reason, status, manager_comment) VALUES (@id, @uid, @tid, @start, @end, @reason, @status, @comm)',
        params: { id: l.id, uid: l.userId, tid: l.typeId, start: l.startDate, end: l.endDate, reason: l.reason, status: l.status, comm: l.managerComment }
    }));
    res.json({ success: true });
}));

// DELETE LEAVE
app.delete('/api/v1/leaves/:id', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    await pool.request().input('id', req.params.id).query('DELETE FROM leave_requests WHERE id = @id');
    res.json({ success: true });
}));

// CORRECTIONS
app.get('/api/v1/seed/corrections', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT * FROM correction_requests');
    res.json(result.recordset.map(c => ({
        id: c.id, userId: c.user_id, timesheetId: c.timesheet_id,
        requestedDate: toISODate(c.requested_date), requestedStartTime: c.requested_start_time, requestedEndTime: c.requested_end_time,
        reason: c.reason, status: c.status, managerNote: c.manager_note
    })));
}));

app.post('/api/v1/seed/corrections', asyncHandler(async (req, res) => {
    await handleConfigSync('correction_requests', req.body, (c) => ({
        query: 'INSERT INTO correction_requests (id, user_id, timesheet_id, requested_date, requested_start_time, requested_end_time, reason, status, manager_note) VALUES (@id, @uid, @tid, @date, @start, @end, @reason, @status, @note)',
        params: { id: c.id, uid: c.userId, tid: c.timesheetId, date: c.requestedDate, start: c.requestedStartTime, end: c.requestedEndTime, reason: c.reason, status: c.status, note: c.managerNote }
    }));
    res.json({ success: true });
}));

// DELETE CORRECTION
app.delete('/api/v1/corrections/:id', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    await pool.request().input('id', req.params.id).query('DELETE FROM correction_requests WHERE id = @id');
    res.json({ success: true });
}));

/* -------------------- ERROR HANDLER -------------------- */

app.use((err, req, res, _) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: 'Validation Error', details: err.errors });
  }
  console.error('Server Error:', err);
  
  if (err.message && err.message.includes('Data Constraint Violation')) {
      return res.status(409).json({ error: 'Duplicate Entry', message: err.message });
  }

  res.status(500).json({ error: err.message, stack: err.stack });
});

/* -------------------- SERVER START -------------------- */

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
