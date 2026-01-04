import React, { useState, useEffect } from 'react';
import { Activity, Database, Server, Code, FileCode, CheckCircle, AlertTriangle, Play, RefreshCw, Layers, Download, Copy, Terminal, Shield, Settings, Save, BookOpen, Plug, Wifi, FileText, Clipboard, Lock } from 'lucide-react';

const BackendControlPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'status' | 'sql' | 'bridge' | 'swagger'>('status');
  const [connectionStatus, setConnectionStatus] = useState<'ONLINE' | 'CONNECTING' | 'OFFLINE'>('ONLINE');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [bridgeFile, setBridgeFile] = useState<'server' | 'db' | 'package' | 'env' | 'readme'>('server');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  
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

-- Offices
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='offices' AND xtype='U')
CREATE TABLE offices (
    id NVARCHAR(50) PRIMARY KEY,
    company_id NVARCHAR(50) FOREIGN KEY REFERENCES companies(id),
    name NVARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INT DEFAULT 100
);

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

CREATE INDEX idx_timesheets_user_date ON timesheets(user_id, date);
CREATE INDEX idx_users_email ON users(email);
GO

PRINT 'Installation Complete. Database ${dbConfig.database} is ready.';
`;
    setGeneratedSQL(script);
  };

  const bridgeSources = {
    readme: `---------------------------------------------------------
 PONTAJ API BRIDGE - DOCUMENTATION
---------------------------------------------------------

*** TROUBLESHOOTING GUIDE ***

PROBLEM: "Eroare DB: The 'config.server' property is required..."
CAUSE: The server cannot read the .env file.
FIX:
1. Ensure you downloaded '.env'.
2. Check if the file is named exactly ".env". 
   - Windows might hide extensions and name it ".env.txt".
   - Enable "File name extensions" in Windows Explorer to check.
3. Open .env with Notepad and ensure DB_SERVER is set.

PROBLEM: "Cannot find module './db.js'"
FIX: Download db.js and place it next to server.js.

---------------------------------------------------------
STARTUP:
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

// Load environment variables
const result = dotenv.config();

if (result.error) {
  console.warn("⚠️ WARNING: .env file not found or could not be loaded!");
}

const rawServer = process.env.DB_SERVER || 'localhost';
let serverName = rawServer;
let instanceName = undefined;

// AUTOMATICALLY HANDLE "HOST\\INSTANCE" FORMAT
// e.g. "DESKTOP-ABC\\SQLEXPRESS" -> server: "DESKTOP-ABC", instance: "SQLEXPRESS"
if (rawServer.includes('\\\\')) {
    const parts = rawServer.split('\\\\');
    serverName = parts[0];
    instanceName = parts[1];
    console.log(\`ℹ️  Named Instance Detected: Host='\${serverName}', Instance='\${instanceName}'\`);
}

// Debug: Check if critical variables exist
if (!process.env.DB_SERVER) {
    console.error("❌ ERROR: DB_SERVER is missing in .env.");
}

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: serverName, // Hostname only
  database: process.env.DB_NAME,
  options: {
    encrypt: true, 
    trustServerCertificate: true,
    // Add instanceName if detected (Note: Port is typically ignored when instanceName is used, unless specified)
    ...(instanceName ? { instanceName } : {})
  }
};

// Only add port if NO instance name is used, or if specifically needed.
// Standard SQL Browser resolves port for named instances.
if (!instanceName && process.env.DB_PORT) {
    config.port = parseInt(process.env.DB_PORT);
}

export const connectDB = async () => {
  try {
    // Attempt connection
    const pool = await sql.connect(config);
    return pool;
  } catch (err) {
    console.error('❌ Database Connection Failed!', err.message);
    if (instanceName) {
        console.error("   HINT: You are using a Named Instance. Ensure 'SQL Server Browser' service is RUNNING in Windows Services.");
    }
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

console.log("------------------------------------------------");
console.log("Starting Pontaj Bridge Server...");
console.log("------------------------------------------------");

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
    // console.error("Health check failed:", err.message); // Quieter logs
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

// --- CLOCK IN ENDPOINT ---
app.post('/api/v1/clock-in', async (req, res) => {
  const { userId, location, officeId } = req.body;
  
  try {
    const pool = await connectDB();
    
    const query = \`
      INSERT INTO timesheets (id, user_id, start_time, date, start_lat, start_long, matched_office_id, status)
      OUTPUT INSERTED.*
      VALUES (@id, @userId, GETDATE(), CAST(GETDATE() AS DATE), @lat, @long, @officeId, 'WORKING')
    \`;
    
    const tsId = \`ts-\${Date.now()}\`;
    
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

// --- CONFIGURATION ENDPOINTS (NOMENCLATOARE) ---

// 1. Break Configs (Save List)
app.post('/api/v1/config/breaks', async (req, res) => {
    const breaks = req.body; // Expects array
    if (!Array.isArray(breaks)) return res.status(400).json({error: 'Expected array'});

    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        const request = new sql.Request(transaction);

        // Simple strategy: Clear table and re-insert (for config data this is fine)
        await request.query('DELETE FROM break_configs');

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
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Leave Configs (Save List)
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
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Holidays (Save List)
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
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


const PORT = process.env.PORT || 3001;

// Start Server and TEST CONNECTION IMMEDIATELY
app.listen(PORT, async () => {
  console.log(\`Bridge Server running on port \${PORT}\`);
  console.log("Attempting to connect to SQL Server...");
  
  try {
    await connectDB();
    console.log("\\x1b[32m%s\\x1b[0m", "✅ SUCCESS: Database connected successfully!");
    console.log("Ready to accept requests.");
  } catch (err) {
    console.log("\\x1b[31m%s\\x1b[0m", "❌ ERROR: Database connection failed.");
    console.log("   Details:", err.message);
    console.log("   Check your .env file and ensure SQL Server is running.");
    console.log("   If using SSMS Login, make sure you enabled TCP/IP in SQL Configuration Manager.");
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
                         <div className="flex items-center gap-1 text-blue-400 text-xs font-bold uppercase mb-2 bg-blue-900/20 p-1.5 rounded">
                             <Settings size={12}/> Configurare Conexiune
                         </div>
                         <div className="space-y-3">
                             {/* JWT SECRET SECTION MOVED TO TOP */}
                             <div className="mb-2 pb-2 border-b border-slate-800">
                                 <div className="flex items-center gap-1 text-yellow-400 text-[10px] font-bold uppercase mb-1">
                                     <Lock size={10}/> JWT Secret
                                 </div>
                                 <div className="flex gap-1">
                                     <input 
                                        type="text" 
                                        value={jwtSecret} 
                                        onChange={(e) => setJwtSecret(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-[10px] text-white focus:border-blue-500 outline-none placeholder-slate-600 font-mono truncate"
                                     />
                                     <button 
                                        onClick={() => handleCopy(jwtSecret)}
                                        title="Copy Secret"
                                        className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1.5 rounded text-[10px] border border-slate-600 transition flex items-center justify-center shrink-0"
                                     >
                                         <Copy size={10}/>
                                     </button>
                                     <button 
                                        onClick={generateNewSecret}
                                        className="bg-yellow-700 hover:bg-yellow-600 text-white px-2 py-1.5 rounded text-[10px] font-bold border border-yellow-600 transition flex items-center gap-1 shrink-0"
                                     >
                                         <RefreshCw size={10}/> Generare
                                     </button>
                                 </div>
                             </div>

                             <div>
                                 <label className="text-[10px] text-slate-400 font-bold block mb-1">Server Address (from SSMS)</label>
                                 <input 
                                    type="text" 
                                    value={dbConfig.server} 
                                    onChange={(e) => setDbConfig({...dbConfig, server: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none placeholder-slate-600"
                                    placeholder="localhost sau DESKTOP\SQLEXPRESS"
                                 />
                             </div>
                             <div>
                                 <label className="text-[10px] text-slate-400 font-bold block mb-1">DB Port (TCP/IP)</label>
                                 <input 
                                    type="text" 
                                    value={dbConfig.port} 
                                    onChange={(e) => setDbConfig({...dbConfig, port: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none placeholder-slate-600"
                                    placeholder="1433"
                                 />
                             </div>
                             <div>
                                 <label className="text-[10px] text-slate-400 font-bold block mb-1">Database Name</label>
                                 <input 
                                    type="text" 
                                    value={dbConfig.database} 
                                    onChange={(e) => setDbConfig({...dbConfig, database: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none placeholder-slate-600"
                                 />
                             </div>
                             <div>
                                 <label className="text-[10px] text-slate-400 font-bold block mb-1">DB User</label>
                                 <input 
                                    type="text" 
                                    value={dbConfig.user} 
                                    onChange={(e) => setDbConfig({...dbConfig, user: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none placeholder-slate-600"
                                 />
                             </div>
                             <div>
                                 <label className="text-[10px] text-slate-400 font-bold block mb-1">DB Password</label>
                                 <input 
                                    type="password" 
                                    value={dbConfig.password} 
                                    onChange={(e) => setDbConfig({...dbConfig, password: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none placeholder-slate-600"
                                 />
                             </div>
                             
                             <button 
                                onClick={handleTestConnection}
                                disabled={isTesting}
                                className={`w-full mt-2 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition ${isTesting ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                             >
                                 {isTesting ? <RefreshCw className="animate-spin" size={12}/> : <Wifi size={12}/>}
                                 {isTesting ? 'Se verifică...' : 'Verifică Conexiune'}
                             </button>
                             
                             {testResult && (
                                 <div className={`mt-2 p-2 rounded text-[10px] border leading-tight ${
                                     testResult.type === 'success' 
                                        ? 'bg-green-900/30 text-green-400 border-green-800' 
                                        : 'bg-red-900/30 text-red-400 border-red-800'
                                 }`}>
                                     {testResult.message}
                                 </div>
                             )}
                         </div>
                         
                         {/* QUICK INSTALL SECTION */}
                         <div className="mt-4 pt-4 border-t border-slate-800">
                             <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Instalare Rapidă (Dependințe)</div>
                             <div className="bg-black p-2 rounded border border-slate-700 flex items-center justify-between group">
                                 <code className="text-green-400 text-[10px] font-mono truncate mr-2">npm i express mssql cors dotenv jsonwebtoken</code>
                                 <button 
                                     onClick={() => handleCopy("npm install express mssql cors dotenv jsonwebtoken")}
                                     className="text-slate-400 hover:text-white"
                                     title="Copy Install Command"
                                 >
                                     <Copy size={12}/>
                                 </button>
                             </div>
                             <div className="mt-2 text-[10px] text-orange-400 bg-orange-900/20 p-2 rounded border border-orange-900/50">
                                <strong>MISSING FILES?</strong><br/>
                                Dacă primiți eroarea "Cannot find module './db.js'", înseamnă că nu ați descărcat fișierul <strong>db.js</strong>. Descărcați-l din meniul de mai sus.
                             </div>
                         </div>
                     </div>

                     <div className="p-3 text-xs font-bold text-slate-500 uppercase mt-2">Executable Code</div>
                     <button onClick={() => setBridgeFile('server')} className={`text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2 transition ${bridgeFile === 'server' ? 'text-blue-400 bg-slate-800/80 border-l-2 border-blue-500' : 'text-slate-400'}`}>
                         <FileCode size={12}/> server.js (Run this)
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
                     {bridgeFile === 'readme' && (
                         <div className="bg-red-500/20 text-red-200 text-xs p-2 text-center font-bold border-b border-red-500/30 flex items-center justify-center gap-2">
                             <AlertTriangle size={14}/> DOCUMENTATION ONLY - DO NOT RUN WITH NODE
                         </div>
                     )}
                     {bridgeFile === 'server' && (
                         <div className="bg-green-500/20 text-green-200 text-xs p-2 text-center font-bold border-b border-green-500/30 flex items-center justify-center gap-2">
                             <Play size={14}/> ENTRY POINT: Run "node server.js"
                         </div>
                     )}

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
             <div className="p-6 animate-in fade-in space-y-4 overflow-auto w-full">
                 <div className="flex justify-between items-start">
                     <div>
                         <h3 className="text-white font-bold text-lg">Pontaj API Documentation (v1.0)</h3>
                         <p className="text-slate-400 text-xs mt-1">OpenAPI 3.0 Standard</p>
                     </div>
                     <button 
                        onClick={() => handleDownload('openapi.json', JSON.stringify({openapi: '3.0.0', info: {title: 'Pontaj API', version: '1.0.0'}, paths: { '/health': { get: { summary: 'Health Check' } } }}, null, 2))}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition"
                     >
                        <Download size={14}/> Download OpenAPI Spec
                     </button>
                 </div>

                 <div className="space-y-3 mt-4">
                     {/* Mock Swagger UI items */}
                     <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                         <div className="bg-slate-950 p-3 flex gap-3 items-center border-b border-slate-800 cursor-pointer">
                             <span className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold w-14 text-center">GET</span>
                             <span className="text-slate-300 font-mono text-sm">/health</span>
                             <span className="text-slate-500 text-xs ml-auto">Check system status</span>
                         </div>
                     </div>
                     <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                         <div className="bg-slate-950 p-3 flex gap-3 items-center border-b border-slate-800 cursor-pointer">
                             <span className="bg-green-600 text-white px-2 py-1 rounded text-[10px] font-bold w-14 text-center">POST</span>
                             <span className="text-slate-300 font-mono text-sm">/api/v1/clock-in</span>
                             <span className="text-slate-500 text-xs ml-auto">Register shift start</span>
                         </div>
                         <div className="p-4 bg-slate-900/50 text-xs font-mono text-green-400">
                             {`{ "userId": "u-123", "location": { "lat": 44.4, "long": 26.1 } }`}
                         </div>
                     </div>
                 </div>
             </div>
          )}

       </div>
    </div>
  );
};

export default BackendControlPanel;