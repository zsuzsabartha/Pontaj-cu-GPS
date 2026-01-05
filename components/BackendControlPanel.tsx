
import React, { useState, useEffect } from 'react';
import { Activity, Database, Server, Code, FileCode, CheckCircle, AlertTriangle, Play, RefreshCw, Layers, Download, Copy, Terminal, Shield, Settings, Save, BookOpen, Plug, Wifi, FileText, Clipboard, Lock, Package, UploadCloud, Trash2, Power, CloudDownload } from 'lucide-react';
import { API_CONFIG, MOCK_COMPANIES, MOCK_DEPARTMENTS, MOCK_OFFICES, MOCK_USERS, INITIAL_BREAK_CONFIGS, INITIAL_LEAVE_CONFIGS, HOLIDAYS_RO } from '../constants';

const BackendControlPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'status' | 'sql' | 'bridge' | 'swagger'>('status');
  const [connectionStatus, setConnectionStatus] = useState<'ONLINE' | 'CONNECTING' | 'OFFLINE'>('ONLINE');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [bridgeFile, setBridgeFile] = useState<'server' | 'db' | 'package' | 'env' | 'readme'>('server');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  // --- VERSIONING STATE ---
  const [buildVersion, setBuildVersion] = useState<number>(1);

  // --- CONNECTION CONFIGURATION STATE ---
  const [dbConfig, setDbConfig] = useState({
      server: 'localhost',
      database: 'PontajSmart',
      user: 'PontajAppUser',
      password: 'StrongPass123!',
      port: '1433'
  });

  const [jwtSecret, setJwtSecret] = useState('production_secret_key_change_me');

  // --- INITIALIZE VERSION ---
  useEffect(() => {
      const stored = localStorage.getItem('pontaj_build_count');
      const current = stored ? parseInt(stored) : 1;
      const next = current + 1;
      localStorage.setItem('pontaj_build_count', next.toString());
      setBuildVersion(next);
  }, []);

  const generateNewSecret = () => {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const secret = Array.from(array, dec => dec.toString(16).padStart(2, '0')).join('');
      setJwtSecret(secret);
  };

  // --- CONNECTION TEST STATE ---
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const handleTestConnection = async () => {
      setIsTesting(true);
      setTestResult(null);
      setConnectionStatus('CONNECTING');

      try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); 

          // UPDATED: Check /api/v1/health to match server config
          const response = await fetch('http://localhost:3001/api/v1/health', {
              signal: controller.signal
          });
          clearTimeout(timeoutId);

          const data = await response.json();

          if (response.ok && data.status === 'ONLINE') {
              setTestResult({ type: 'success', message: 'Succes! Bridge-ul este conectat la SQL Server.' });
              setConnectionStatus('ONLINE');
          } else {
              const err = data.error || '';
              let userMsg = `Eroare DB: ${err}`;
              setTestResult({ type: 'error', message: userMsg });
              setConnectionStatus('OFFLINE');
          }
      } catch (error) {
          setTestResult({ 
            type: 'error', 
            message: 'Eșec Conexiune Server (Port 3001). Verificați consola.' 
          });
          setConnectionStatus('OFFLINE');
      } finally {
          setIsTesting(false);
      }
  };

  // --- SYNC LOGIC ---
  const handlePushToSQL = async () => {
      if(!confirm("PUSH: Această acțiune va trimite TOATE datele locale (Companii, Useri, Pontaje, Concedii, Corecții) către SQL Server. Continuați?")) return;
      
      setIsSeeding(true);
      try {
          // 1. Configs
          await fetch(`${API_CONFIG.BASE_URL}/config/breaks`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(INITIAL_BREAK_CONFIGS) });
          await fetch(`${API_CONFIG.BASE_URL}/config/leaves`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(INITIAL_LEAVE_CONFIGS) });
          await fetch(`${API_CONFIG.BASE_URL}/config/holidays`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(HOLIDAYS_RO) });

          // 2. Structural
          await fetch(`${API_CONFIG.BASE_URL}/config/companies`, { 
              method: 'POST', headers: {'Content-Type': 'application/json'}, 
              body: JSON.stringify(JSON.parse(localStorage.getItem('pontaj_companies') || JSON.stringify(MOCK_COMPANIES))) 
          });
          
          await fetch(`${API_CONFIG.BASE_URL}/config/offices`, { 
              method: 'POST', headers: {'Content-Type': 'application/json'}, 
              body: JSON.stringify(JSON.parse(localStorage.getItem('pontaj_offices') || JSON.stringify(MOCK_OFFICES))) 
          });

          await fetch(`${API_CONFIG.BASE_URL}/config/departments`, { 
              method: 'POST', headers: {'Content-Type': 'application/json'}, 
              body: JSON.stringify(JSON.parse(localStorage.getItem('pontaj_departments') || JSON.stringify(MOCK_DEPARTMENTS))) 
          });

          await fetch(`${API_CONFIG.BASE_URL}/config/users`, { 
              method: 'POST', headers: {'Content-Type': 'application/json'}, 
              body: JSON.stringify(JSON.parse(localStorage.getItem('pontaj_users') || JSON.stringify(MOCK_USERS))) 
          });

          // 3. Transactions (Timesheets & Leaves & Corrections)
          const localTimesheets = JSON.parse(localStorage.getItem('pontaj_timesheets') || '[]');
          await fetch(`${API_CONFIG.BASE_URL}/seed/timesheets`, {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(localTimesheets)
          });

          const localLeaves = JSON.parse(localStorage.getItem('pontaj_leaves') || '[]');
          await fetch(`${API_CONFIG.BASE_URL}/seed/leaves`, {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(localLeaves)
          });

          const localCorrections = JSON.parse(localStorage.getItem('pontaj_corrections') || '[]');
          await fetch(`${API_CONFIG.BASE_URL}/seed/corrections`, {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(localCorrections)
          });

          alert("Push Complet! Toate datele au fost salvate în SQL Server.");
      } catch (e) {
          alert("Eroare la sincronizare. Verificați conexiunea Bridge și consola.");
          console.error(e);
      } finally {
          setIsSeeding(false);
      }
  };

  const handlePullFromSQL = async () => {
      // Logic handled in App.tsx now, but kept here for manual triggering
      alert("Pentru a actualiza datele, reîncărcați aplicația (F5) cu serverul pornit.");
  };

  const handleClearTable = (key: string, label: string) => {
      if(confirm(`Sigur doriți să ștergeți datele locale pentru: ${label}? Această acțiune nu poate fi anulată.`)) {
          localStorage.removeItem(key);
          window.location.reload();
      }
  };

  const handleFactoryReset = () => {
      if(confirm("FACTORY RESET: Această acțiune va șterge TOATE datele locale din browser. Dacă nu aveți o copie pe SQL Server, datele se vor pierde.")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  // --- ARTIFACT GENERATORS ---
  const generateSQLScript = () => {
    const script = `
/* DEPLOYMENT SCRIPT v1.0.${buildVersion} */
USE master;
GO
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '${dbConfig.database}') CREATE DATABASE ${dbConfig.database};
GO
USE ${dbConfig.database};
GO
-- Users
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
CREATE TABLE users (
    id NVARCHAR(50) PRIMARY KEY,
    erp_id NVARCHAR(50),
    company_id NVARCHAR(50),
    department_id NVARCHAR(50),
    assigned_office_id NVARCHAR(50),
    main_schedule_id NVARCHAR(50),
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255),
    auth_type NVARCHAR(20),
    roles NVARCHAR(MAX),
    contract_hours INT DEFAULT 8,
    is_validated BIT DEFAULT 0,
    requires_gps BIT DEFAULT 1,
    employment_status NVARCHAR(20) DEFAULT 'ACTIVE',
    created_at DATETIME2 DEFAULT GETDATE()
);
-- Config Tables
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='companies' AND xtype='U') CREATE TABLE companies (id NVARCHAR(50) PRIMARY KEY, name NVARCHAR(255));
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='departments' AND xtype='U') CREATE TABLE departments (id NVARCHAR(50) PRIMARY KEY, company_id NVARCHAR(50), name NVARCHAR(255), manager_id NVARCHAR(50), email_notifications BIT);
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='offices' AND xtype='U') CREATE TABLE offices (id NVARCHAR(50) PRIMARY KEY, name NVARCHAR(255), latitude DECIMAL(10,8), longitude DECIMAL(11,8), radius_meters INT);
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='break_configs' AND xtype='U') CREATE TABLE break_configs (id NVARCHAR(50) PRIMARY KEY, name NVARCHAR(100), is_paid BIT, icon NVARCHAR(50));
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='leave_configs' AND xtype='U') CREATE TABLE leave_configs (id NVARCHAR(50) PRIMARY KEY, name NVARCHAR(100), code NVARCHAR(20), requires_approval BIT);
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='holidays' AND xtype='U') CREATE TABLE holidays (id NVARCHAR(50) PRIMARY KEY, date DATE, name NVARCHAR(255));
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='work_schedules' AND xtype='U') 
CREATE TABLE work_schedules (
    id NVARCHAR(50) PRIMARY KEY, 
    name NVARCHAR(100), 
    start_time NVARCHAR(10), 
    end_time NVARCHAR(10), 
    crosses_midnight BIT
);

-- Transaction Tables
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='timesheets' AND xtype='U') 
CREATE TABLE timesheets (
    id NVARCHAR(50) PRIMARY KEY, user_id NVARCHAR(50), start_time DATETIME2, end_time DATETIME2, date DATE, 
    status NVARCHAR(20), start_lat DECIMAL(10,8), start_long DECIMAL(11,8), matched_office_id NVARCHAR(50),
    detected_schedule_id NVARCHAR(50)
);
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='breaks' AND xtype='U') 
CREATE TABLE breaks (
    id NVARCHAR(50) PRIMARY KEY, timesheet_id NVARCHAR(50), type_id NVARCHAR(50), start_time DATETIME2, end_time DATETIME2, status NVARCHAR(20)
);
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='leave_requests' AND xtype='U') 
CREATE TABLE leave_requests (
    id NVARCHAR(50) PRIMARY KEY, user_id NVARCHAR(50), type_id NVARCHAR(50), start_date DATE, end_date DATE, reason NVARCHAR(MAX), status NVARCHAR(20), manager_comment NVARCHAR(MAX)
);
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='correction_requests' AND xtype='U') 
CREATE TABLE correction_requests (
    id NVARCHAR(50) PRIMARY KEY, user_id NVARCHAR(50), timesheet_id NVARCHAR(50), requested_date DATE, requested_start_time DATETIME2, requested_end_time DATETIME2, reason NVARCHAR(MAX), status NVARCHAR(20), manager_note NVARCHAR(MAX)
);
`;
    setGeneratedSQL(script);
  };

  const bridgeSources = {
    readme: `Run: npm install && node server.js`,
    package: `{ 
  "name": "pontaj-bridge", 
  "type": "module", 
  "dependencies": { 
    "express": "^4.18.2", 
    "mssql": "^10.0.1", 
    "cors": "^2.8.5", 
    "dotenv": "^16.3.1",
    "zod": "^3.22.4"
  } 
}`,
    env: `PORT=3001\nDB_SERVER=${dbConfig.server}\nDB_NAME=${dbConfig.database}\nDB_USER=${dbConfig.user}\nDB_PASS=${dbConfig.password}`,
    db: `import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: true }
};
export const connectDB = async () => await sql.connect(config);`,
    server: `
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { connectDB } from './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

/* -------------------- HELPERS -------------------- */

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const toISODate = (d) =>
  new Date(d).toISOString().split('T')[0];

/* -------------------- HEALTH -------------------- */

app.get('/api/v1/health', asyncHandler(async (_, res) => {
  await connectDB();
  res.json({ status: 'ONLINE' });
}));

/* -------------------- GENERIC CONFIG SYNC -------------------- */

const handleConfigSync = async (table, data, mapFn) => {
    const pool = await connectDB();
    const transaction = new pool.Transaction();
    await transaction.begin();
    try {
        for (const item of data) {
            const { query, params } = mapFn(item);
            
            // 1. Clean existing record to ensure full update (simplistic approach for sync)
            const checkReq = transaction.request();
            checkReq.input('id', params.id);
            const check = await checkReq.query(\`SELECT 1 FROM \${table} WHERE id = @id\`);
            
            if (check.recordset.length > 0) {
               const delReq = transaction.request();
               delReq.input('id', params.id);
               await delReq.query(\`DELETE FROM \${table} WHERE id = @id\`);
            }

            // 2. Insert new record
            const req = transaction.request();
            Object.entries(params).forEach(([k, v]) => req.input(k, v));
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
        params: { id: d.id, name: d.name, cid: d.companyId, mid: d.managerId || null, en: d.emailNotifications ? 1 : 0 }
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
        query: \`INSERT INTO users (id, erp_id, company_id, department_id, assigned_office_id, main_schedule_id, name, email, auth_type, roles, contract_hours, is_validated, requires_gps, employment_status) 
                VALUES (@id, @erpId, @cid, @did, @oid, @sid, @name, @email, @auth, @roles, @hours, @val, @gps, @status)\`,
        params: {
            id: u.id, erpId: u.erpId || null, cid: u.companyId, did: u.departmentId || null, oid: u.assignedOfficeId || null, sid: u.mainScheduleId || null,
            name: u.name, email: u.email, auth: u.authType, roles: JSON.stringify(u.roles), hours: u.contractHours, val: u.isValidated?1:0, gps: u.requiresGPS?1:0, status: u.employmentStatus
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

/* -------------------- SEED ENDPOINTS -------------------- */

// TIMESHEETS
app.get('/api/v1/seed/timesheets', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    const { recordset } = await pool.request().query(\`
        SELECT t.*, b.id as bid, b.type_id, b.start_time as bstart, b.end_time as bend, b.status as bstatus, bc.name as bname
        FROM timesheets t
        LEFT JOIN breaks b ON b.timesheet_id = t.id
        LEFT JOIN break_configs bc ON bc.id = b.type_id
    \`);
    
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
                id: r.bid, typeId: r.type_id, typeName: r.bname,
                startTime: r.bstart, endTime: r.bend, status: r.bstatus
            });
        }
    });
    res.json([...map.values()]);
}));

app.post('/api/v1/seed/timesheets', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    const transaction = new pool.Transaction();
    await transaction.begin();
    try {
        for (const t of req.body) {
            await transaction.request().input('id', t.id).query('DELETE FROM timesheets WHERE id = @id');
            await transaction.request().input('id', t.id).query('DELETE FROM breaks WHERE timesheet_id = @id');

            await transaction.request()
               .input('id', t.id).input('uid', t.userId).input('date', t.date)
               .input('start', t.startTime).input('end', t.endTime || null)
               .input('status', t.status).input('oid', t.matchedOfficeId || null)
               .input('sid', t.detectedScheduleId || null)
               .query(\`INSERT INTO timesheets (id, user_id, date, start_time, end_time, status, matched_office_id, detected_schedule_id) 
                       VALUES (@id, @uid, @date, @start, @end, @status, @oid, @sid)\`);
            
            if (t.breaks) {
                for (const b of t.breaks) {
                    await transaction.request()
                       .input('id', b.id).input('tid', t.id).input('type', b.typeId)
                       .input('start', b.startTime).input('end', b.endTime || null).input('status', b.status)
                       .query(\`INSERT INTO breaks (id, timesheet_id, type_id, start_time, end_time, status) 
                               VALUES (@id, @tid, @type, @start, @end, @status)\`);
                }
            }
        }
        await transaction.commit();
        res.json({ success: true });
    } catch(e) {
        await transaction.rollback();
        throw e;
    }
}));

// LEAVES
app.get('/api/v1/seed/leaves', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query(\`
        SELECT l.*, lc.name as type_name, lc.code 
        FROM leave_requests l
        LEFT JOIN leave_configs lc ON lc.id = l.type_id
    \`);
    res.json(result.recordset.map(l => ({
        id: l.id, userId: l.user_id, typeId: l.type_id, typeName: l.type_name,
        startDate: toISODate(l.start_date), endDate: toISODate(l.end_date),
        reason: l.reason, status: l.status, managerComment: l.manager_comment
    })));
}));

app.post('/api/v1/seed/leaves', asyncHandler(async (req, res) => {
    await handleConfigSync('leave_requests', req.body, (l) => ({
        query: 'INSERT INTO leave_requests (id, user_id, type_id, start_date, end_date, reason, status, manager_comment) VALUES (@id, @uid, @tid, @start, @end, @reason, @status, @comm)',
        params: { id: l.id, uid: l.userId, tid: l.typeId, start: l.startDate, end: l.endDate, reason: l.reason, status: l.status, comm: l.managerComment || null }
    }));
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
        params: { id: c.id, uid: c.userId, tid: c.timesheetId || null, date: c.requestedDate, start: c.requestedStartTime, end: c.requestedEndTime || null, reason: c.reason, status: c.status, note: c.managerNote || null }
    }));
    res.json({ success: true });
}));

/* -------------------- SERVER START -------------------- */

const PORT = 3001;
app.listen(PORT, () => console.log(\`Server running on \${PORT}\`));
`
  };

  const handleDownload = (filename: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
  };

  const handleCopy = (content: string) => {
      navigator.clipboard.writeText(content);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(null), 2000);
  };

  useEffect(() => { generateSQLScript(); }, [dbConfig, buildVersion]);

  return (
    <div className="bg-slate-900 text-slate-200 rounded-xl overflow-hidden shadow-2xl border border-slate-700 font-mono text-sm h-[calc(100vh-5rem)] flex flex-col">
       {/* Header */}
       <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
              <Shield size={24} className="text-blue-400" />
              <h2 className="font-bold text-white">Admin Deployment Center</h2>
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded ${connectionStatus === 'ONLINE' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>{connectionStatus}</span>
       </div>

       {/* Tabs */}
       <div className="flex bg-slate-900 border-b border-slate-800">
          <button onClick={() => setActiveTab('status')} className={`px-4 py-2 hover:bg-slate-800 ${activeTab === 'status' ? 'text-white border-b-2 border-blue-500' : 'text-slate-500'}`}>Status</button>
          <button onClick={() => setActiveTab('bridge')} className={`px-4 py-2 hover:bg-slate-800 ${activeTab === 'bridge' ? 'text-white border-b-2 border-blue-500' : 'text-slate-500'}`}>Bridge Source</button>
          <button onClick={() => setActiveTab('sql')} className={`px-4 py-2 hover:bg-slate-800 ${activeTab === 'sql' ? 'text-white border-b-2 border-blue-500' : 'text-slate-500'}`}>SQL Script</button>
       </div>

       <div className="flex-1 overflow-auto bg-slate-900/50 p-4">
          {activeTab === 'status' && (
             <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-800 p-4 rounded border border-slate-700">
                        <h3 className="text-white font-bold mb-2">Sync Status</h3>
                        <div className="flex gap-2">
                            <button onClick={handlePushToSQL} disabled={isSeeding} className="bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center gap-2">
                                {isSeeding ? <RefreshCw className="animate-spin" size={12}/> : <UploadCloud size={12}/>} Push Local &rarr; SQL
                            </button>
                            <button onClick={handleTestConnection} disabled={isTesting} className="bg-slate-600 text-white px-3 py-1 rounded text-xs">
                                {isTesting ? '...' : 'Test Conn'}
                            </button>
                        </div>
                        {testResult && <p className={`text-xs mt-2 ${testResult.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{testResult.message}</p>}
                    </div>

                    <div className="bg-red-900/20 p-4 rounded border border-red-900/50">
                        <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2"><AlertTriangle size={16}/> Danger Zone</h3>
                         <button onClick={handleFactoryReset} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs flex items-center gap-2 font-bold transition shadow-lg shadow-red-900/50">
                            <Trash2 size={14}/> Factory Reset (Clear LocalStorage)
                        </button>
                        <p className="text-[10px] text-red-300 mt-2">Șterge toate datele din browser. Util dacă datele locale sunt corupte.</p>
                    </div>
                 </div>
             </div>
          )}

          {activeTab === 'sql' && (
              <div className="h-full flex flex-col">
                  <div className="flex gap-2 mb-2 justify-end">
                       <button onClick={() => handleCopy(generatedSQL)} className="bg-slate-700 text-white px-3 py-1 rounded text-xs flex items-center gap-1"><Copy size={12}/> Copy</button>
                       <button onClick={() => handleDownload('deployment.sql', generatedSQL)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1"><Download size={12}/> Download .sql</button>
                  </div>
                  <textarea readOnly value={generatedSQL} className="w-full h-full bg-black p-4 text-xs font-mono text-green-400 resize-none rounded border border-slate-700"/>
              </div>
          )}

          {activeTab === 'bridge' && (
             <div className="h-full flex flex-col">
                 <div className="flex gap-2 mb-2 justify-between">
                     <div className="flex gap-2">
                         <button onClick={() => setBridgeFile('server')} className={`px-2 py-1 text-xs rounded ${bridgeFile === 'server' ? 'bg-blue-600 text-white' : 'bg-slate-800'}`}>server.js</button>
                         <button onClick={() => setBridgeFile('db')} className={`px-2 py-1 text-xs rounded ${bridgeFile === 'db' ? 'bg-blue-600 text-white' : 'bg-slate-800'}`}>db.js</button>
                         <button onClick={() => setBridgeFile('package')} className={`px-2 py-1 text-xs rounded ${bridgeFile === 'package' ? 'bg-blue-600 text-white' : 'bg-slate-800'}`}>package.json</button>
                         <button onClick={() => setBridgeFile('env')} className={`px-2 py-1 text-xs rounded ${bridgeFile === 'env' ? 'bg-blue-600 text-white' : 'bg-slate-800'}`}>.env</button>
                     </div>
                 </div>
                 <div className="relative flex-1">
                     <textarea readOnly value={bridgeSources[bridgeFile]} className="w-full h-full bg-black p-4 text-xs font-mono text-blue-300 resize-none rounded border border-slate-700"/>
                     <div className="absolute top-2 right-2 flex gap-2">
                        <button onClick={() => handleCopy(bridgeSources[bridgeFile])} className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1"><Copy size={12}/> Copy</button>
                        <button onClick={() => handleDownload(`${bridgeFile === 'env' ? '' : bridgeFile}.${bridgeFile === 'package' ? 'json' : bridgeFile === 'env' ? 'env' : bridgeFile === 'readme' ? 'md' : 'js'}`, bridgeSources[bridgeFile])} className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1"><Download size={12}/> Download</button>
                     </div>
                 </div>
             </div>
          )}
       </div>
    </div>
  );
};

export default BackendControlPanel;
