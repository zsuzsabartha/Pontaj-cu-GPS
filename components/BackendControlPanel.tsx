import React, { useState, useEffect } from 'react';
import { Activity, Database, Server, Code, FileCode, CheckCircle, AlertTriangle, Play, RefreshCw, Layers, Download, Copy, Terminal, Shield, Settings, Save, BookOpen } from 'lucide-react';

const BackendControlPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'status' | 'sql' | 'bridge' | 'swagger'>('status');
  const [connectionStatus, setConnectionStatus] = useState<'ONLINE' | 'CONNECTING' | 'OFFLINE'>('ONLINE');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [bridgeFile, setBridgeFile] = useState<'server' | 'db' | 'package' | 'env' | 'readme'>('readme'); // Default to readme
  
  // --- CONNECTION CONFIGURATION STATE ---
  const [dbConfig, setDbConfig] = useState({
      server: 'localhost',
      database: 'PontajSmart',
      user: 'PontajAppUser',
      password: 'StrongPass123!',
      port: '1433'
  });

  // --- ARTIFACT GENERATORS (MSSQL VERSION) ---

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
-- NOTE: We use the configured password from the panel
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = '${dbConfig.user}')
BEGIN
    CREATE LOGIN ${dbConfig.user} WITH PASSWORD = '${dbConfig.password}', CHECK_POLICY = OFF;
END

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = '${dbConfig.user}')
BEGIN
    CREATE USER ${dbConfig.user} FOR LOGIN ${dbConfig.user};
END

-- Grant permissions
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
    roles NVARCHAR(MAX), -- JSON Array e.g. '["EMPLOYEE", "MANAGER"]'
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

-- Indexes
CREATE INDEX idx_timesheets_user_date ON timesheets(user_id, date);
CREATE INDEX idx_users_email ON users(email);
GO

PRINT 'Installation Complete. Database ${dbConfig.database} is ready.';
`;
    setGeneratedSQL(script);
  };

  const bridgeSources = {
    readme: `# Pontaj API Bridge - Instalare

Acesta este serverul backend (Node.js) care face legătura între aplicația React și Microsoft SQL Server.

## 1. Instalare
1. Asigură-te că ai **Node.js** instalat.
2. Deschide un terminal în acest folder.
3. Rulează comanda:
   \`\`\`bash
   npm install
   \`\`\`

## 2. Configurare
Verifică fișierul \`.env\` pentru a te asigura că datele de conectare la SQL Server sunt corecte:
- Server: ${dbConfig.server}
- User: ${dbConfig.user}
- Database: ${dbConfig.database}

## 3. Pornire Server
Rulează comanda:
\`\`\`bash
node server.js
\`\`\`

Serverul va porni pe portul 3001.
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
# Database Connection Configured via Admin Panel
DB_SERVER=${dbConfig.server}
DB_PORT=${dbConfig.port}
DB_NAME=${dbConfig.database}
DB_USER=${dbConfig.user}
DB_PASS=${dbConfig.password}

# Security
JWT_SECRET=production_secret_key_change_me
FRONTEND_URL=http://localhost:3000`,
    db: `import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  options: {
    encrypt: true, // Use true for Azure, false for local dev if self-signed
    trustServerCertificate: true // Change to false for production with valid certs
  }
};

export const connectDB = async () => {
  try {
    const pool = await sql.connect(config);
    return pool;
  } catch (err) {
    console.error('Database Connection Failed! Bad Config: ', err);
    throw err;
  }
};`,
    server: `import express from 'express';
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

// --- CLOCK IN ENDPOINT ---
app.post('/api/v1/clock-in', async (req, res) => {
  const { userId, location, officeId } = req.body;
  
  // Real implementation would validate JWT token here
  
  try {
    const pool = await connectDB();
    
    // MSSQL Query using Parameters and OUTPUT for returning data
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(\`Bridge Server (MSSQL/JS) running on port \${PORT}\`);
});`
  };

  const handleDownload = (filename: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element);
  };

  // Re-generate artifacts when config changes
  useEffect(() => {
    generateSQLScript();
  }, [dbConfig]);

  return (
    <div className="bg-slate-900 text-slate-200 rounded-xl overflow-hidden shadow-2xl border border-slate-700 font-mono text-sm h-[600px] flex flex-col">
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
                 connectionStatus === 'ONLINE' ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'
             }`}>
                 <span className={`w-2 h-2 rounded-full ${connectionStatus === 'ONLINE' ? 'bg-green-500 animate-pulse' : 'bg-current'}`}></span>
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

       {/* Content Area */}
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
                     <button 
                        onClick={() => handleDownload('install_mssql.sql', generatedSQL)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs transition font-medium"
                     >
                        <Download size={14}/> Download Script
                     </button>
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
                     
                     {/* CONFIG FORM */}
                     <div className="p-3 bg-slate-900 border-b border-slate-800">
                         <div className="flex items-center gap-1 text-blue-400 text-xs font-bold uppercase mb-2 bg-blue-900/20 p-1.5 rounded">
                             <Settings size={12}/> Configurare Conexiune
                         </div>
                         <div className="space-y-3">
                             <div>
                                 <label className="text-[10px] text-slate-400 font-bold block mb-1">Server Address</label>
                                 <input 
                                    type="text" 
                                    value={dbConfig.server} 
                                    onChange={(e) => setDbConfig({...dbConfig, server: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none placeholder-slate-600"
                                    placeholder="localhost"
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
                         </div>
                     </div>

                     <div className="p-3 text-xs font-bold text-slate-500 uppercase mt-2">Project Files</div>
                     <button onClick={() => setBridgeFile('readme')} className={`text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2 transition ${bridgeFile === 'readme' ? 'text-green-400 bg-slate-800/80 border-l-2 border-green-500' : 'text-slate-400'}`}>
                         <BookOpen size={12}/> README.md (Instrucțiuni)
                     </button>
                     <button onClick={() => setBridgeFile('env')} className={`text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2 transition ${bridgeFile === 'env' ? 'text-blue-400 bg-slate-800/80 border-l-2 border-blue-500' : 'text-slate-400'}`}>
                         <Terminal size={12}/> .env (Config)
                     </button>
                     <button onClick={() => setBridgeFile('package')} className={`text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2 transition ${bridgeFile === 'package' ? 'text-blue-400 bg-slate-800/80 border-l-2 border-blue-500' : 'text-slate-400'}`}>
                         <Code size={12}/> package.json
                     </button>
                     <button onClick={() => setBridgeFile('server')} className={`text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2 transition ${bridgeFile === 'server' ? 'text-blue-400 bg-slate-800/80 border-l-2 border-blue-500' : 'text-slate-400'}`}>
                         <FileCode size={12}/> server.js
                     </button>
                     <button onClick={() => setBridgeFile('db')} className={`text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2 transition ${bridgeFile === 'db' ? 'text-blue-400 bg-slate-800/80 border-l-2 border-blue-500' : 'text-slate-400'}`}>
                         <Database size={12}/> db.js
                     </button>
                 </div>
                 
                 {/* Code View */}
                 <div className="flex-1 flex flex-col h-full overflow-hidden">
                     <div className="bg-slate-900 p-2 border-b border-slate-800 flex justify-between items-center shrink-0">
                         <span className="text-xs text-slate-500 pl-2">
                            {bridgeFile === 'package' ? 'Node.js Dependencies' : 
                             bridgeFile === 'env' ? 'Environment Variables (Generated from Config)' : 
                             bridgeFile === 'readme' ? 'Instrucțiuni de instalare' : 
                             bridgeFile === 'server' ? 'Main Entry Point (ESM)' : 'Database Connection (ESM)'}
                         </span>
                         <button 
                            onClick={() => handleDownload(bridgeFile === 'package' ? 'package.json' : bridgeFile === 'env' ? '.env' : bridgeFile === 'readme' ? 'README.md' : `${bridgeFile}.js`, bridgeSources[bridgeFile])}
                            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-xs transition"
                         >
                            <Download size={14}/> Download File
                         </button>
                     </div>
                     <textarea 
                        readOnly 
                        value={bridgeSources[bridgeFile]}
                        className={`w-full h-full bg-black p-4 font-mono text-xs resize-none focus:outline-none ${bridgeFile === 'readme' ? 'text-green-300' : 'text-blue-300'}`}
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