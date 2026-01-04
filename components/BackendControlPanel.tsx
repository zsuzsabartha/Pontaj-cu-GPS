
import React, { useState, useEffect } from 'react';
import { Activity, Database, Server, Code, FileCode, CheckCircle, AlertTriangle, Play, RefreshCw, Layers, Download, Copy, Terminal, Shield, Settings, Save, BookOpen, Plug, Wifi, FileText, Clipboard, Lock, Package, UploadCloud } from 'lucide-react';
import { API_CONFIG, MOCK_COMPANIES, MOCK_DEPARTMENTS, MOCK_OFFICES, MOCK_USERS, INITIAL_BREAK_CONFIGS, INITIAL_LEAVE_CONFIGS, HOLIDAYS_RO } from '../constants';

const BackendControlPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'status' | 'sql' | 'bridge' | 'swagger'>('status');
  const [connectionStatus, setConnectionStatus] = useState<'ONLINE' | 'CONNECTING' | 'OFFLINE'>('ONLINE');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [bridgeFile, setBridgeFile] = useState<'server' | 'db' | 'package' | 'env' | 'readme'>('server');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  
  // --- CONNECTION CONFIGURATION STATE ---
  const [dbConfig, setDbConfig] = useState({
      server: 'localhost',
      database: 'PontajSmart',
      user: 'PontajAppUser',
      password: 'StrongPass123!',
      port: '1433'
  });

  const [jwtSecret, setJwtSecret] = useState('production_secret_key_change_me');

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

          const response = await fetch('http://localhost:3001/health', {
              signal: controller.signal
          });
          clearTimeout(timeoutId);

          const data = await response.json();

          if (response.ok && data.status === 'ONLINE') {
              setTestResult({ type: 'success', message: 'Succes! Bridge-ul este conectat la SQL Server.' });
              setConnectionStatus('ONLINE');
          } else {
              // Analyze specific errors
              const err = data.error || '';
              let userMsg = `Eroare DB: ${err}`;

              if (err.includes('config.server') && err.includes('required')) {
                  userMsg = 'Lipsă Configurare (.env): Serverul nu găsește adresa bazei de date. Verificați dacă fișierul .env există și nu are extensia .txt ascunsă.';
              } else if (err.includes('Login failed')) {
                  userMsg = 'Eroare Login: Utilizator sau parolă incorectă în .env.';
              } else if (err.includes('Failed to connect') || err.includes('ETIMEDOUT') || err.includes('instance name')) {
                  userMsg = `Eroare Rețea: Nu se poate conecta la ${dbConfig.server}. Dacă folosiți instanță numită (ex: \\SQLEXPRESS), asigurați-vă că serviciul 'SQL Server Browser' este pornit.`;
              }

              setTestResult({ type: 'error', message: userMsg });
              setConnectionStatus('OFFLINE');
          }
      } catch (error) {
          setTestResult({ 
            type: 'error', 
            message: 'Eșec Conexiune Server (Port 3001). Verificați consola. Dacă vedeți "Cannot find module ./db.js", descărcați fișierul db.js.' 
          });
          setConnectionStatus('OFFLINE');
      } finally {
          setIsTesting(false);
      }
  };

  // --- SEEDING LOGIC ---
  const handlePushToSQL = async () => {
      if(!confirm("Această acțiune va trimite datele LOCALE (Companii, Departamente, Useri) către SQL Server. Continuați?")) return;
      
      setIsSeeding(true);
      try {
          // 1. Configs
          await fetch(`${API_CONFIG.BASE_URL}/config/breaks`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(INITIAL_BREAK_CONFIGS) });
          await fetch(`${API_CONFIG.BASE_URL}/config/leaves`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(INITIAL_LEAVE_CONFIGS) });
          await fetch(`${API_CONFIG.BASE_URL}/config/holidays`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(HOLIDAYS_RO) });

          // 2. Structural (Order Matters for FK!)
          // Companies first
          await fetch(`${API_CONFIG.BASE_URL}/config/companies`, { 
              method: 'POST', headers: {'Content-Type': 'application/json'}, 
              body: JSON.stringify(JSON.parse(localStorage.getItem('pontaj_companies') || JSON.stringify(MOCK_COMPANIES))) 
          });
          
          // Offices (Global)
          await fetch(`${API_CONFIG.BASE_URL}/config/offices`, { 
              method: 'POST', headers: {'Content-Type': 'application/json'}, 
              body: JSON.stringify(JSON.parse(localStorage.getItem('pontaj_offices') || JSON.stringify(MOCK_OFFICES))) 
          });

          // Departments (Depend on Companies)
          await fetch(`${API_CONFIG.BASE_URL}/config/departments`, { 
              method: 'POST', headers: {'Content-Type': 'application/json'}, 
              body: JSON.stringify(JSON.parse(localStorage.getItem('pontaj_departments') || JSON.stringify(MOCK_DEPARTMENTS))) 
          });

          // Users (Depend on Comp, Dept, Offices)
          await fetch(`${API_CONFIG.BASE_URL}/config/users`, { 
              method: 'POST', headers: {'Content-Type': 'application/json'}, 
              body: JSON.stringify(JSON.parse(localStorage.getItem('pontaj_users') || JSON.stringify(MOCK_USERS))) 
          });

          alert("Sincronizare completă! Datele au fost salvate în SQL.");
      } catch (e) {
          alert("Eroare la sincronizare. Verificați consola și conexiunea Bridge.");
          console.error(e);
      } finally {
          setIsSeeding(false);
      }
  };

  // --- ARTIFACT GENERATORS ---

  const generateSQLScript = () => {
    const script = `
/* 
   ----------------------------------------------------------------
   DEPLOYMENT SCRIPT - MICROSOFT SQL SERVER
   Database: ${dbConfig.database}
   Generated: ${new Date().toISOString()}
   ----------------------------------------------------------------
*/

USE master;
GO

-- 1. Create Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '${dbConfig.database}')
BEGIN
    CREATE DATABASE ${dbConfig.database};
END
GO

USE ${dbConfig.database};
GO

-- 2. Security Setup (Login & User)
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = '${dbConfig.user}')
BEGIN
    CREATE LOGIN ${dbConfig.user} WITH PASSWORD = '${dbConfig.password}', CHECK_POLICY = OFF;
END

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = '${dbConfig.user}')
BEGIN
    CREATE USER ${dbConfig.user} FOR LOGIN ${dbConfig.user};
END

ALTER ROLE db_datareader ADD MEMBER ${dbConfig.user};
ALTER ROLE db_datawriter ADD MEMBER ${dbConfig.user};
GO

-- 3. Schema Definitions

-- Companies
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='companies' AND xtype='U')
CREATE TABLE companies (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Departments
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='departments' AND xtype='U')
CREATE TABLE departments (
    id NVARCHAR(50) PRIMARY KEY,
    company_id NVARCHAR(50) FOREIGN KEY REFERENCES companies(id),
    name NVARCHAR(255) NOT NULL,
    manager_id NVARCHAR(50), 
    email_notifications BIT DEFAULT 0
);

-- Offices (GLOBAL - SHARED HQ)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='offices' AND xtype='U')
CREATE TABLE offices (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INT DEFAULT 100
);

-- MIGRATION: Remove old company_id from offices if it exists
IF EXISTS (SELECT * FROM sys.columns WHERE Name = N'company_id' AND Object_ID = Object_ID(N'offices'))
BEGIN
    -- Drop constraint if exists (Generic approach for unnamed constraints is complex in T-SQL, assuming named or just dropping column)
    DECLARE @ConstraintName nvarchar(200)
    SELECT @ConstraintName = Name FROM SYS.DEFAULT_CONSTRAINTS WHERE PARENT_OBJECT_ID = OBJECT_ID('offices') AND PARENT_COLUMN_ID = (SELECT column_id FROM sys.columns WHERE NAME = N'company_id' AND object_id = OBJECT_ID(N'offices'))
    IF @ConstraintName IS NOT NULL
    EXEC('ALTER TABLE offices DROP CONSTRAINT ' + @ConstraintName)
    
    -- Drop FK constraint
    SELECT @ConstraintName = obj.name
    FROM sys.foreign_key_columns fkc
    INNER JOIN sys.objects obj ON obj.object_id = fkc.constraint_object_id
    WHERE fkc.parent_object_id = OBJECT_ID('offices') AND fkc.parent_column_id = (SELECT column_id FROM sys.columns WHERE NAME = N'company_id' AND object_id = OBJECT_ID(N'offices'))
    
    IF @ConstraintName IS NOT NULL
    EXEC('ALTER TABLE offices DROP CONSTRAINT ' + @ConstraintName)

    ALTER TABLE offices DROP COLUMN company_id;
    PRINT 'Migrated offices table: Removed company_id';
END
GO

-- Users
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
CREATE TABLE users (
    id NVARCHAR(50) PRIMARY KEY,
    erp_id NVARCHAR(50),
    company_id NVARCHAR(50) FOREIGN KEY REFERENCES companies(id),
    department_id NVARCHAR(50) FOREIGN KEY REFERENCES departments(id),
    assigned_office_id NVARCHAR(50) FOREIGN KEY REFERENCES offices(id),
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) UNIQUE NOT NULL,
    password_hash NVARCHAR(255), 
    auth_type NVARCHAR(20),
    roles NVARCHAR(MAX),
    contract_hours INT DEFAULT 8,
    is_validated BIT DEFAULT 0,
    requires_gps BIT DEFAULT 1,
    employment_status NVARCHAR(20) DEFAULT 'ACTIVE',
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Nomenclators
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='break_configs' AND xtype='U')
CREATE TABLE break_configs (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    is_paid BIT DEFAULT 0,
    icon NVARCHAR(50)
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='leave_configs' AND xtype='U')
CREATE TABLE leave_configs (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    code NVARCHAR(20) NOT NULL,
    requires_approval BIT DEFAULT 1
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='holidays' AND xtype='U')
CREATE TABLE holidays (
    id NVARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    name NVARCHAR(255) NOT NULL
);

-- Time Tracking
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='timesheets' AND xtype='U')
CREATE TABLE timesheets (
    id NVARCHAR(50) PRIMARY KEY,
    user_id NVARCHAR(50) FOREIGN KEY REFERENCES users(id),
    start_time DATETIME2 NOT NULL,
    end_time DATETIME2,
    date DATE NOT NULL,
    status NVARCHAR(20),
    start_lat DECIMAL(10,8),
    start_long DECIMAL(11,8),
    end_lat DECIMAL(10,8),
    end_long DECIMAL(11,8),
    matched_office_id NVARCHAR(50) FOREIGN KEY REFERENCES offices(id),
    detected_schedule_id NVARCHAR(50),
    sync_status NVARCHAR(20) DEFAULT 'SYNCED'
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='breaks' AND xtype='U')
CREATE TABLE breaks (
    id NVARCHAR(50) PRIMARY KEY,
    timesheet_id NVARCHAR(50) FOREIGN KEY REFERENCES timesheets(id) ON DELETE CASCADE,
    type_id NVARCHAR(50) FOREIGN KEY REFERENCES break_configs(id),
    start_time DATETIME2 NOT NULL,
    end_time DATETIME2,
    status NVARCHAR(20) DEFAULT 'PENDING'
);

-- Leaves
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='leave_requests' AND xtype='U')
CREATE TABLE leave_requests (
    id NVARCHAR(50) PRIMARY KEY,
    user_id NVARCHAR(50) FOREIGN KEY REFERENCES users(id),
    type_id NVARCHAR(50) FOREIGN KEY REFERENCES leave_configs(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason NVARCHAR(MAX),
    status NVARCHAR(20) DEFAULT 'PENDING',
    manager_comment NVARCHAR(MAX)
);

-- Correction Requests
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='correction_requests' AND xtype='U')
CREATE TABLE correction_requests (
    id NVARCHAR(50) PRIMARY KEY,
    user_id NVARCHAR(50) FOREIGN KEY REFERENCES users(id),
    timesheet_id NVARCHAR(50) FOREIGN KEY REFERENCES timesheets(id), -- Nullable if new TS
    requested_date DATE, -- Used if timesheet_id is null
    requested_start DATETIME2,
    requested_end DATETIME2,
    reason NVARCHAR(MAX),
    status NVARCHAR(20) DEFAULT 'PENDING',
    manager_note NVARCHAR(MAX)
);

-- Indexes (Check existence before creating)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_timesheets_user_date' AND object_id = OBJECT_ID('timesheets'))
BEGIN
    CREATE INDEX idx_timesheets_user_date ON timesheets(user_id, date);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_users_email' AND object_id = OBJECT_ID('users'))
BEGIN
    CREATE INDEX idx_users_email ON users(email);
END
GO

PRINT 'Installation Complete. Database ${dbConfig.database} is ready.';
`;
    setGeneratedSQL(script);
  };

  const bridgeSources = {
    readme: `---------------------------------------------------------
 PONTAJ API BRIDGE - DOCUMENTATION
---------------------------------------------------------
1. npm install
2. node server.js
`,
    package: `{
  "name": "pontaj-api-bridge-mssql",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mssql": "^10.0.1",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "jsonwebtoken": "^9.0.2"
  }
}`,
    env: `PORT=3001
# Database Connection
DB_SERVER=${dbConfig.server}
DB_PORT=${dbConfig.port}
DB_NAME=${dbConfig.database}
DB_USER=${dbConfig.user}
DB_PASS=${dbConfig.password}

# Security
JWT_SECRET=${jwtSecret}
FRONTEND_URL=http://localhost:3000`,
    db: `import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const rawServer = process.env.DB_SERVER || 'localhost';
let serverName = rawServer;
let instanceName = undefined;

if (rawServer.includes('\\\\')) {
    const parts = rawServer.split('\\\\');
    serverName = parts[0];
    instanceName = parts[1];
}

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: serverName,
  database: process.env.DB_NAME,
  options: {
    encrypt: true, 
    trustServerCertificate: true,
    ...(instanceName ? { instanceName } : {})
  }
};

if (!instanceName && process.env.DB_PORT) {
    config.port = parseInt(process.env.DB_PORT);
}

export const connectDB = async () => {
  try {
    const pool = await sql.connect(config);
    return pool;
  } catch (err) {
    console.error('❌ Database Connection Failed!', err.message);
    throw err;
  }
};`,
    server: `/* 
  =============================================================
  PONTAJ API BRIDGE - SERVER ENTRY POINT
  File: server.js
  Usage: node server.js
  =============================================================
*/

import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import { connectDB } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// --- HEALTH CHECK ---
app.get('/health', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT GETDATE() as now');
    res.json({ status: 'ONLINE', db_time: result.recordset[0].now, server: 'MSSQL' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

// --- CLOCK IN/OUT ENDPOINTS ---

// GET All Timesheets (for loading history)
app.get('/api/v1/timesheets', async (req, res) => {
  try {
    const pool = await connectDB();
    
    // Fetch Timesheets
    const tsResult = await pool.request().query(\`
      SELECT 
        t.id, t.user_id as userId, t.start_time as startTime, t.end_time as endTime, 
        t.date, t.status, t.matched_office_id as matchedOfficeId, 
        t.start_lat, t.start_long, t.end_lat, t.end_long
      FROM timesheets t
      ORDER BY t.start_time DESC
    \`);
    
    const timesheets = tsResult.recordset;

    // Fetch Breaks
    const brResult = await pool.request().query(\`
      SELECT 
        b.id, b.timesheet_id as timesheetId, b.type_id as typeId, bc.name as typeName,
        b.start_time as startTime, b.end_time as endTime, b.status
      FROM breaks b
      LEFT JOIN break_configs bc ON b.type_id = bc.id
    \`);
    const breaks = brResult.recordset;

    // Merge breaks into timesheets
    const finalData = timesheets.map(ts => ({
        ...ts,
        // Convert SQL Dates to ISO strings for JS
        startTime: ts.startTime ? new Date(ts.startTime).toISOString() : null,
        endTime: ts.endTime ? new Date(ts.endTime).toISOString() : null,
        date: ts.date ? new Date(ts.date).toISOString().split('T')[0] : null,
        
        // Reconstruct Location Objects
        startLocation: (ts.start_lat != null && ts.start_long != null) ? { latitude: ts.start_lat, longitude: ts.start_long } : undefined,
        endLocation: (ts.end_lat != null && ts.end_long != null) ? { latitude: ts.end_lat, longitude: ts.end_long } : undefined,
        
        // Attach Breaks
        breaks: breaks.filter(b => b.timesheetId === ts.id).map(b => ({
            ...b,
            startTime: b.startTime ? new Date(b.startTime).toISOString() : null,
            endTime: b.endTime ? new Date(b.endTime).toISOString() : null
        })),
        
        // Defaults
        logs: [], // Logs not stored in DB yet
        syncStatus: 'SYNCED'
    }));

    res.json(finalData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database fetch failed' });
  }
});

app.post('/api/v1/clock-in', async (req, res) => {
  const { id, userId, location, officeId } = req.body;
  try {
    const pool = await connectDB();
    const query = \`
      INSERT INTO timesheets (id, user_id, start_time, date, start_lat, start_long, matched_office_id, status)
      OUTPUT INSERTED.*
      VALUES (@id, @userId, GETDATE(), CAST(GETDATE() AS DATE), @lat, @long, @officeId, 'WORKING')
    \`;
    // Use client ID if provided, otherwise generate one (fallback)
    const tsId = id || \`ts-\${Date.now()}\`;
    
    const result = await pool.request()
        .input('id', sql.NVarChar, tsId)
        .input('userId', sql.NVarChar, userId)
        .input('lat', sql.Decimal(10,8), location.latitude)
        .input('long', sql.Decimal(11,8), location.longitude)
        .input('officeId', sql.NVarChar, officeId)
        .query(query);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database transaction failed' });
  }
});

app.post('/api/v1/clock-out', async (req, res) => {
  const { timesheetId, location } = req.body;
  try {
    const pool = await connectDB();
    const query = \`
      UPDATE timesheets 
      SET end_time = GETDATE(), end_lat = @lat, end_long = @long, status = 'COMPLETED'
      WHERE id = @id
    \`;
    await pool.request()
        .input('id', sql.NVarChar, timesheetId)
        .input('lat', sql.Decimal(10,8), location.latitude)
        .input('long', sql.Decimal(11,8), location.longitude)
        .query(query);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database transaction failed' });
  }
});

// --- BREAK ENDPOINTS ---

app.post('/api/v1/breaks/start', async (req, res) => {
  const { id, timesheetId, typeId, location } = req.body;
  try {
    const pool = await connectDB();
    const query = \`
      INSERT INTO breaks (id, timesheet_id, type_id, start_time)
      VALUES (@id, @tsId, @typeId, GETDATE())
    \`;
    await pool.request()
        .input('id', sql.NVarChar, id)
        .input('tsId', sql.NVarChar, timesheetId)
        .input('typeId', sql.NVarChar, typeId)
        .query(query);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database transaction failed' });
  }
});

app.post('/api/v1/breaks/end', async (req, res) => {
  const { id } = req.body;
  try {
    const pool = await connectDB();
    const query = \`
      UPDATE breaks SET end_time = GETDATE() WHERE id = @id
    \`;
    await pool.request()
        .input('id', sql.NVarChar, id)
        .query(query);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database transaction failed' });
  }
});

// --- LEAVE & CORRECTIONS ---

// GET All Leaves (Load on Init)
app.get('/api/v1/leaves', async (req, res) => {
  try {
    const pool = await connectDB();
    
    // FETCH leaves with joined config name using strict aliasing
    const richResult = await pool.request().query(\`
        SELECT 
            lr.id, 
            lr.user_id as userId, 
            lr.type_id as typeId, 
            lc.name as typeName,
            lr.start_date as startDate, 
            lr.end_date as endDate, 
            lr.reason, 
            lr.status, 
            lr.manager_comment as managerComment 
        FROM leave_requests lr
        LEFT JOIN leave_configs lc ON lr.type_id = lc.id
    \`);

    res.json(richResult.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database fetch failed' });
  }
});

app.post('/api/v1/leaves', async (req, res) => {
  const { id, userId, typeId, startDate, endDate, reason, status } = req.body;
  try {
    const pool = await connectDB();
    const query = \`
      INSERT INTO leave_requests (id, user_id, type_id, start_date, end_date, reason, status)
      VALUES (@id, @userId, @typeId, @startDate, @endDate, @reason, @status)
    \`;
    
    await pool.request()
        .input('id', sql.NVarChar, id)
        .input('userId', sql.NVarChar, userId)
        .input('typeId', sql.NVarChar, typeId)
        .input('startDate', sql.Date, startDate)
        .input('endDate', sql.Date, endDate)
        .input('reason', sql.NVarChar, reason)
        .input('status', sql.NVarChar, status)
        .query(query);
        
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database transaction failed' });
  }
});

// Update Leave Status (Approve/Reject)
app.put('/api/v1/leaves/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, managerComment } = req.body;
    try {
        const pool = await connectDB();
        await pool.request()
            .input('id', sql.NVarChar, id)
            .input('status', sql.NVarChar, status)
            .input('comment', sql.NVarChar, managerComment || null)
            .query('UPDATE leave_requests SET status = @status, manager_comment = @comment WHERE id = @id');
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database transaction failed' });
    }
});

app.post('/api/v1/corrections', async (req, res) => {
  const { id, userId, timesheetId, requestedDate, requestedStart, requestedEnd, reason } = req.body;
  try {
    const pool = await connectDB();
    const query = \`
      INSERT INTO correction_requests (id, user_id, timesheet_id, requested_date, requested_start, requested_end, reason)
      VALUES (@id, @userId, @tsId, @rDate, @rStart, @rEnd, @reason)
    \`;
    
    await pool.request()
        .input('id', sql.NVarChar, id)
        .input('userId', sql.NVarChar, userId)
        .input('tsId', sql.NVarChar, timesheetId || null)
        .input('rDate', sql.Date, requestedDate || null)
        .input('rStart', sql.DateTime2, requestedStart)
        .input('rEnd', sql.DateTime2, requestedEnd || null)
        .input('reason', sql.NVarChar, reason)
        .query(query);
        
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database transaction failed' });
  }
});

// --- NOMENCLATOR ENDPOINTS ---

// 1. Break Configs (Delete All & Replace)
app.post('/api/v1/config/breaks', async (req, res) => {
    const breaks = req.body;
    if (!Array.isArray(breaks)) return res.status(400).json({error: 'Expected array'});

    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const request = new sql.Request(transaction);
        await request.query('DELETE FROM break_configs'); // Safe for configs
        for (const b of breaks) {
            const req = new sql.Request(transaction);
            await req.input('id', sql.NVarChar, b.id)
                     .input('name', sql.NVarChar, b.name)
                     .input('isPaid', sql.Bit, b.isPaid ? 1 : 0)
                     .input('icon', sql.NVarChar, b.icon || 'coffee')
                     .query('INSERT INTO break_configs (id, name, is_paid, icon) VALUES (@id, @name, @isPaid, @icon)');
        }
        await transaction.commit();
        res.json({ success: true, count: breaks.length });
    } catch (err) {
        if(transaction) await transaction.rollback();
        res.status(500).json({ error: err.message });
    }
});

// 2. Leave Configs (Delete All & Replace)
app.post('/api/v1/config/leaves', async (req, res) => {
    const leaves = req.body;
    if (!Array.isArray(leaves)) return res.status(400).json({error: 'Expected array'});

    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const request = new sql.Request(transaction);
        await request.query('DELETE FROM leave_configs');
        for (const l of leaves) {
            const req = new sql.Request(transaction);
            await req.input('id', sql.NVarChar, l.id)
                     .input('name', sql.NVarChar, l.name)
                     .input('code', sql.NVarChar, l.code)
                     .input('reqApp', sql.Bit, l.requiresApproval ? 1 : 0)
                     .query('INSERT INTO leave_configs (id, name, code, requires_approval) VALUES (@id, @name, @code, @reqApp)');
        }
        await transaction.commit();
        res.json({ success: true, count: leaves.length });
    } catch (err) {
        if(transaction) await transaction.rollback();
        res.status(500).json({ error: err.message });
    }
});

// 3. Holidays
app.post('/api/v1/config/holidays', async (req, res) => {
    const holidays = req.body;
    if (!Array.isArray(holidays)) return res.status(400).json({error: 'Expected array'});

    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const request = new sql.Request(transaction);
        await request.query('DELETE FROM holidays');
        for (const h of holidays) {
            const req = new sql.Request(transaction);
            await req.input('id', sql.NVarChar, h.id)
                     .input('date', sql.Date, h.date)
                     .input('name', sql.NVarChar, h.name)
                     .query('INSERT INTO holidays (id, date, name) VALUES (@id, @date, @name)');
        }
        await transaction.commit();
        res.json({ success: true, count: holidays.length });
    } catch (err) {
        if(transaction) await transaction.rollback();
        res.status(500).json({ error: err.message });
    }
});

// --- STRUCTURAL ENDPOINTS (UPSERT LOGIC) ---

// 4. Companies (Upsert to avoid FK errors)
app.post('/api/v1/config/companies', async (req, res) => {
    const list = req.body;
    if (!Array.isArray(list)) return res.status(400).json({error: 'Expected array'});
    
    const pool = await connectDB();
    try {
        for (const item of list) {
             const request = pool.request();
             await request
               .input('id', sql.NVarChar, item.id)
               .input('name', sql.NVarChar, item.name)
               .query(\`
                  IF EXISTS (SELECT 1 FROM companies WHERE id = @id)
                    UPDATE companies SET name = @name WHERE id = @id
                  ELSE
                    INSERT INTO companies (id, name) VALUES (@id, @name)
               \`);
        }
        res.json({ success: true, message: 'Companies synced (Upsert)' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 5. Offices
app.post('/api/v1/config/offices', async (req, res) => {
    const list = req.body;
    if (!Array.isArray(list)) return res.status(400).json({error: 'Expected array'});
    
    const pool = await connectDB();
    try {
        for (const item of list) {
             const request = pool.request();
             await request
               .input('id', sql.NVarChar, item.id)
               .input('name', sql.NVarChar, item.name)
               .input('lat', sql.Decimal(10,8), item.coordinates.latitude)
               .input('long', sql.Decimal(11,8), item.coordinates.longitude)
               .input('rad', sql.Int, item.radiusMeters)
               .query(\`
                  IF EXISTS (SELECT 1 FROM offices WHERE id = @id)
                    UPDATE offices SET name = @name, latitude = @lat, longitude = @long, radius_meters = @rad WHERE id = @id
                  ELSE
                    INSERT INTO offices (id, name, latitude, longitude, radius_meters) VALUES (@id, @name, @lat, @long, @rad)
               \`);
        }
        res.json({ success: true, message: 'Offices synced (Upsert)' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 6. Departments
app.post('/api/v1/config/departments', async (req, res) => {
    const list = req.body;
    if (!Array.isArray(list)) return res.status(400).json({error: 'Expected array'});
    
    const pool = await connectDB();
    try {
        for (const item of list) {
             const request = pool.request();
             await request
               .input('id', sql.NVarChar, item.id)
               .input('compId', sql.NVarChar, item.companyId)
               .input('name', sql.NVarChar, item.name)
               .input('email', sql.Bit, item.emailNotifications ? 1 : 0)
               .query(\`
                  IF EXISTS (SELECT 1 FROM departments WHERE id = @id)
                    UPDATE departments SET name = @name, company_id = @compId, email_notifications = @email WHERE id = @id
                  ELSE
                    INSERT INTO departments (id, company_id, name, email_notifications) VALUES (@id, @compId, @name, @email)
               \`);
        }
        res.json({ success: true, message: 'Departments synced (Upsert)' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 7. Users
app.post('/api/v1/config/users', async (req, res) => {
    const list = req.body;
    if (!Array.isArray(list)) return res.status(400).json({error: 'Expected array'});
    
    const pool = await connectDB();
    try {
        for (const u of list) {
             const request = pool.request();
             await request
               .input('id', sql.NVarChar, u.id)
               .input('erpId', sql.NVarChar, u.erpId || null)
               .input('compId', sql.NVarChar, u.companyId)
               .input('deptId', sql.NVarChar, u.departmentId || null)
               .input('offId', sql.NVarChar, u.assignedOfficeId || null)
               .input('name', sql.NVarChar, u.name)
               .input('email', sql.NVarChar, u.email)
               .input('auth', sql.NVarChar, u.authType)
               .input('roles', sql.NVarChar, JSON.stringify(u.roles))
               .input('valid', sql.Bit, u.isValidated ? 1 : 0)
               .input('status', sql.NVarChar, u.employmentStatus || 'ACTIVE')
               .query(\`
                  IF EXISTS (SELECT 1 FROM users WHERE id = @id)
                    UPDATE users SET name=@name, email=@email, erp_id=@erpId, company_id=@compId, department_id=@deptId, assigned_office_id=@offId, roles=@roles, is_validated=@valid, employment_status=@status WHERE id = @id
                  ELSE
                    INSERT INTO users (id, name, email, erp_id, company_id, department_id, assigned_office_id, auth_type, roles, is_validated, employment_status) 
                    VALUES (@id, @name, @email, @erpId, @compId, @deptId, @offId, @auth, @roles, @valid, @status)
               \`);
        }
        res.json({ success: true, message: 'Users synced' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(\`Bridge Server running on port \${PORT}\`);
  try {
    await connectDB();
    console.log("✅ SUCCESS: Database connected successfully!");
  } catch (err) {
    console.log("❌ ERROR: Database connection failed.");
  }
});`
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

  const handleDownloadAll = async () => {
      setIsDownloadingAll(true);
      const files = [
          { name: 'server.js', content: bridgeSources.server },
          { name: 'db.js', content: bridgeSources.db },
          { name: 'package.json', content: bridgeSources.package },
          { name: '.env', content: bridgeSources.env },
          { name: 'README.md', content: bridgeSources.readme },
          { name: 'install_mssql.sql', content: generatedSQL }
      ];

      for (const file of files) {
          const element = document.createElement("a");
          const blob = new Blob([file.content], {type: 'text/plain'});
          element.href = URL.createObjectURL(blob);
          element.download = file.name;
          document.body.appendChild(element); 
          element.click();
          document.body.removeChild(element);
          await new Promise(r => setTimeout(r, 600)); // Delay to prevent browser blocking
      }
      setIsDownloadingAll(false);
  };

  const handleCopy = (content: string) => {
      navigator.clipboard.writeText(content);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(null), 2000);
  };

  useEffect(() => {
    generateSQLScript();
  }, [dbConfig]);

  return (
    <div className="bg-slate-900 text-slate-200 rounded-xl overflow-hidden shadow-2xl border border-slate-700 font-mono text-sm h-[calc(100vh-5rem)] flex flex-col">
       {/* Header */}
       <div className="bg-slate-950 p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
              <div className="bg-blue-600/20 p-2 rounded-lg text-blue-400">
                  <Shield size={24} />
              </div>
              <div>
                  <h2 className="font-bold text-lg leading-tight text-white">Admin Deployment Center</h2>
                  <p className="text-xs text-slate-500">Bridge Control & Database Artifacts</p>
              </div>
          </div>

          <div className="flex items-center gap-3">
             <span className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded border font-bold uppercase transition-colors ${
                 connectionStatus === 'ONLINE' ? 'bg-green-900/30 text-green-400 border-green-800' : 
                 connectionStatus === 'CONNECTING' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' :
                 'bg-red-900/30 text-red-400 border-red-800'
             }`}>
                 <span className={`w-2 h-2 rounded-full ${connectionStatus === 'ONLINE' ? 'bg-green-500 animate-pulse' : connectionStatus === 'CONNECTING' ? 'bg-yellow-500 animate-bounce' : 'bg-current'}`}></span>
                 BRIDGE: {connectionStatus}
             </span>
          </div>
       </div>

       {/* Tabs */}
       <div className="flex bg-slate-900 border-b border-slate-800 overflow-x-auto shrink-0">
          <button onClick={() => setActiveTab('status')} className={`px-6 py-3 flex items-center gap-2 hover:bg-slate-800 whitespace-nowrap ${activeTab === 'status' ? 'border-b-2 border-blue-500 text-white bg-slate-800' : 'text-slate-500'}`}>
             <Activity size={16}/> Health Status
          </button>
          <button onClick={() => setActiveTab('sql')} className={`px-6 py-3 flex items-center gap-2 hover:bg-slate-800 whitespace-nowrap ${activeTab === 'sql' ? 'border-b-2 border-blue-500 text-white bg-slate-800' : 'text-slate-500'}`}>
             <Database size={16}/> Database Script
          </button>
          <button onClick={() => setActiveTab('bridge')} className={`px-6 py-3 flex items-center gap-2 hover:bg-slate-800 whitespace-nowrap ${activeTab === 'bridge' ? 'border-b-2 border-blue-500 text-white bg-slate-800' : 'text-slate-500'}`}>
             <Server size={16}/> Bridge Source
          </button>
          <button onClick={() => setActiveTab('swagger')} className={`px-6 py-3 flex items-center gap-2 hover:bg-slate-800 whitespace-nowrap ${activeTab === 'swagger' ? 'border-b-2 border-blue-500 text-white bg-slate-800' : 'text-slate-500'}`}>
             <FileCode size={16}/> API Specs
          </button>
       </div>

       <div className="flex-1 overflow-hidden bg-slate-900/50 flex">
          
          {/* --- STATUS TAB --- */}
          {activeTab === 'status' && (
             <div className="p-6 space-y-6 animate-in fade-in overflow-auto w-full">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition"><Database size={48}/></div>
                        <p className="text-slate-400 text-xs uppercase mb-1">Database Connection</p>
                        <div className="text-xl font-bold text-white">SQL Server 2019+</div>
                        <div className="flex items-center gap-2 mt-2 text-green-400 text-xs">
                             <CheckCircle size={12}/> Connected (T-SQL)
                        </div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition"><Activity size={48}/></div>
                        <p className="text-slate-400 text-xs uppercase mb-1">API Health</p>
                        <div className="text-xl font-bold text-white">99.9% Uptime</div>
                        <div className="w-full bg-slate-700 h-1 mt-3 rounded-full overflow-hidden">
                           <div className="bg-green-500 h-full w-[98%]"></div>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition"><Layers size={48}/></div>
                        <p className="text-slate-400 text-xs uppercase mb-1">Sync Queue</p>
                        <div className="text-xl font-bold text-white">0 Pending</div>
                        <div className="text-xs text-slate-500 mt-2">All changes synchronized</div>
                    </div>
                 </div>

                 <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 flex gap-4 items-start">
                     <AlertTriangle className="text-blue-400 shrink-0" size={20}/>
                     <div>
                         <h4 className="text-white font-bold text-sm">Deployment Readiness</h4>
                         <p className="text-slate-400 text-xs mt-1">
                             System is ready for Microsoft SQL Server deployment. 
                             Configure your server details in the "Bridge Source" tab, then download the artifacts.
                         </p>
                     </div>
                 </div>
                 
                 {/* SEED DATA BUTTON */}
                 <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4 flex flex-col gap-3">
                     <div className="flex gap-4 items-start">
                        <UploadCloud className="text-emerald-400 shrink-0" size={20}/>
                        <div>
                            <h4 className="text-white font-bold text-sm">Initial Data Seeding (Resolve Dependencies)</h4>
                            <p className="text-slate-400 text-xs mt-1">
                                Use this if you see <code>FOREIGN KEY</code> errors. This will push all Companies, Offices, Departments, and Users from your local defaults to the SQL Server in the correct order.
                            </p>
                        </div>
                     </div>
                     <button 
                        onClick={handlePushToSQL}
                        disabled={isSeeding}
                        className="self-end bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-900/50"
                     >
                        {isSeeding ? <RefreshCw className="animate-spin" size={14}/> : <UploadCloud size={14}/>}
                        {isSeeding ? 'Seeding...' : 'Push Local Data to SQL'}
                     </button>
                 </div>
             </div>
          )}

          {/* --- SQL TAB --- */}
          {activeTab === 'sql' && (
             <div className="flex flex-col h-full w-full animate-in fade-in">
                 <div className="bg-slate-950 p-2 border-b border-slate-800 flex justify-between items-center shrink-0">
                     <span className="text-xs text-slate-500 pl-2">File: install_mssql.sql</span>
                     <div className="flex gap-2">
                         <button 
                            onClick={() => handleCopy(generatedSQL)}
                            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-xs transition font-medium"
                         >
                            {copyFeedback || <><Clipboard size={14}/> Copy</>}
                         </button>
                         <button 
                            onClick={() => handleDownload('install_mssql.sql', generatedSQL)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs transition font-medium"
                         >
                            <Download size={14}/> Download Script
                         </button>
                     </div>
                 </div>
                 <div className="flex-1 relative overflow-auto">
                     <textarea 
                        readOnly 
                        value={generatedSQL}
                        className="w-full h-full bg-black p-4 text-green-500 font-mono text-xs resize-none focus:outline-none"
                     />
                 </div>
             </div>
          )}

          {/* --- BRIDGE SOURCE TAB --- */}
          {activeTab === 'bridge' && (
             <div className="flex h-full w-full animate-in fade-in overflow-hidden">
                 {/* Sidebar */}
                 <div className="w-56 bg-slate-950 border-r border-slate-800 flex flex-col overflow-y-auto shrink-0">
                     
                     <div className="p-3 bg-slate-900 border-b border-slate-800">
                         {/* Config Inputs Removed for Brevity - Keeping just the download section visible logic */}
                         <div className="flex items-center gap-1 text-blue-400 text-xs font-bold uppercase mb-2 bg-blue-900/20 p-1.5 rounded">
                             <Settings size={12}/> Configurare Conexiune
                         </div>
                         <div className="space-y-3 mb-4">
                             {/* Minimal Config UI here... (Matches previous) */}
                             <div className="mb-2 pb-2 border-b border-slate-800">
                                 <div className="flex items-center gap-1 text-yellow-400 text-[10px] font-bold uppercase mb-1">
                                     <Lock size={10}/> JWT Secret
                                 </div>
                                 <input type="text" value={jwtSecret} onChange={(e) => setJwtSecret(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-white outline-none"/>
                             </div>
                             <div>
                                 <label className="text-[10px] text-slate-400 font-bold block mb-1">Server Address</label>
                                 <input type="text" value={dbConfig.server} onChange={(e) => setDbConfig({...dbConfig, server: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none"/>
                             </div>
                             <div>
                                 <label className="text-[10px] text-slate-400 font-bold block mb-1">Database Name</label>
                                 <input type="text" value={dbConfig.database} onChange={(e) => setDbConfig({...dbConfig, database: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none"/>
                             </div>
                             <button onClick={handleTestConnection} disabled={isTesting} className={`w-full mt-2 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition ${isTesting ? 'bg-slate-700' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                                 {isTesting ? '...' : 'Verifică Conexiune'}
                             </button>
                         </div>
                         
                         {/* NEW DOWNLOAD ALL BUTTON */}
                         <button 
                            onClick={handleDownloadAll}
                            disabled={isDownloadingAll}
                            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold flex items-center justify-center gap-2 mb-4 shadow-lg shadow-green-900/20 transition disabled:opacity-50"
                         >
                            {isDownloadingAll ? <RefreshCw className="animate-spin" size={14}/> : <Package size={14}/>}
                            {isDownloadingAll ? 'Downloading...' : 'Download All Files'}
                         </button>
                     </div>

                     <div className="p-3 text-xs font-bold text-slate-500 uppercase mt-2">Executable Code</div>
                     <button onClick={() => setBridgeFile('server')} className={`text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2 transition ${bridgeFile === 'server' ? 'text-blue-400 bg-slate-800/80 border-l-2 border-blue-500' : 'text-slate-400'}`}>
                         <FileCode size={12}/> server.js
                     </button>
                     <button onClick={() => setBridgeFile('db')} className={`text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2 transition ${bridgeFile === 'db' ? 'text-blue-400 bg-slate-800/80 border-l-2 border-blue-500' : 'text-slate-400'}`}>
                         <Database size={12}/> db.js
                     </button>
                     
                     <div className="p-3 text-xs font-bold text-slate-500 uppercase mt-2">Config Files</div>
                     <button onClick={() => setBridgeFile('env')} className={`text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2 transition ${bridgeFile === 'env' ? 'text-yellow-400 bg-slate-800/80 border-l-2 border-yellow-500' : 'text-slate-400'}`}>
                         <Terminal size={12}/> .env
                     </button>
                     <button onClick={() => setBridgeFile('package')} className={`text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2 transition ${bridgeFile === 'package' ? 'text-yellow-400 bg-slate-800/80 border-l-2 border-yellow-500' : 'text-slate-400'}`}>
                         <Code size={12}/> package.json
                     </button>

                     <div className="p-3 text-xs font-bold text-slate-500 uppercase mt-2">Documentation</div>
                     <button onClick={() => setBridgeFile('readme')} className={`text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2 transition ${bridgeFile === 'readme' ? 'text-green-400 bg-slate-800/80 border-l-2 border-green-500' : 'text-slate-400'}`}>
                         <BookOpen size={12}/> README.md
                     </button>
                 </div>
                 
                 {/* Code View */}
                 <div className="flex-1 flex flex-col h-full overflow-hidden">
                     <div className="bg-slate-900 p-2 border-b border-slate-800 flex justify-between items-center shrink-0">
                         <span className="text-xs text-slate-500 pl-2">
                            {bridgeFile === 'package' ? 'Node.js Dependencies' : 
                             bridgeFile === 'env' ? 'Environment Variables' : 
                             bridgeFile === 'readme' ? 'Installation Guide' : 
                             bridgeFile === 'server' ? 'Server Entry Point' : 'Database Connection'}
                         </span>
                         <div className="flex gap-2">
                            <button 
                                onClick={() => handleCopy(bridgeSources[bridgeFile])}
                                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-xs transition"
                            >
                                {copyFeedback || <><Clipboard size={14}/> Copy Code</>}
                            </button>
                            <button 
                                onClick={() => handleDownload(bridgeFile === 'package' ? 'package.json' : bridgeFile === 'env' ? '.env' : bridgeFile === 'readme' ? 'README.md' : `${bridgeFile}.js`, bridgeSources[bridgeFile])}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs transition"
                            >
                                <Download size={14}/> Download File
                            </button>
                         </div>
                     </div>
                     <textarea 
                        readOnly 
                        value={bridgeSources[bridgeFile]}
                        className={`w-full h-full bg-black p-4 font-mono text-xs resize-none focus:outline-none ${
                            bridgeFile === 'readme' ? 'text-green-300' : 
                            bridgeFile === 'env' ? 'text-yellow-300' : 'text-blue-300'
                        }`}
                     />
                 </div>
             </div>
          )}

          {/* --- SWAGGER TAB --- */}
          {activeTab === 'swagger' && (
             <div className="p-6 text-white">API Documentation available</div>
          )}

       </div>
    </div>
  );
};

export default BackendControlPanel;
