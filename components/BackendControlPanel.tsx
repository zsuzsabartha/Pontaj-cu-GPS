
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
      if(!confirm("PUSH: Această acțiune va trimite datele LOCALE (Companii, Departamente, Useri) către SQL Server, suprascriind datele existente acolo. Continuați?")) return;
      
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

          alert("Push Complet! Datele locale au fost salvate în SQL Server.");
      } catch (e) {
          alert("Eroare la sincronizare. Verificați consola și conexiunea Bridge.");
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
      if(confirm("FACTORY RESET: Această acțiune va șterge TOATE datele locale.")) {
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

-- Transaction Tables
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='timesheets' AND xtype='U') 
CREATE TABLE timesheets (
    id NVARCHAR(50) PRIMARY KEY, user_id NVARCHAR(50), start_time DATETIME2, end_time DATETIME2, date DATE, 
    status NVARCHAR(20), start_lat DECIMAL(10,8), start_long DECIMAL(11,8), matched_office_id NVARCHAR(50)
);
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='breaks' AND xtype='U') 
CREATE TABLE breaks (
    id NVARCHAR(50) PRIMARY KEY, timesheet_id NVARCHAR(50), type_id NVARCHAR(50), start_time DATETIME2, end_time DATETIME2, status NVARCHAR(20)
);
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='leave_requests' AND xtype='U') 
CREATE TABLE leave_requests (
    id NVARCHAR(50) PRIMARY KEY, user_id NVARCHAR(50), type_id NVARCHAR(50), start_date DATE, end_date DATE, reason NVARCHAR(MAX), status NVARCHAR(20), manager_comment NVARCHAR(MAX)
);
`;
    setGeneratedSQL(script);
  };

  const bridgeSources = {
    readme: `Run: npm install && node server.js`,
    package: `{ "name": "pontaj-bridge", "type": "module", "dependencies": { "express": "^4.18.2", "mssql": "^10.0.1", "cors": "^2.8.5", "dotenv": "^16.3.1" } }`,
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
import sql from 'mssql';
import { connectDB } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// GET DATA
// UPDATED: Mounted at /api/v1/health to match frontend expectations
app.get('/api/v1/health', async (req, res) => {
  try { await connectDB(); res.json({ status: 'ONLINE' }); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/config/users', async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT * FROM users');
    const data = result.recordset.map(u => ({
        ...u,
        roles: JSON.parse(u.roles || '[]'),
        isValidated: !!u.is_validated,
        requiresGPS: !!u.requires_gps
    }));
    res.json(data);
});

app.get('/api/v1/config/companies', async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT * FROM companies');
    res.json(result.recordset);
});

app.get('/api/v1/config/departments', async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT * FROM departments');
    res.json(result.recordset);
});

app.get('/api/v1/config/offices', async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT * FROM offices');
    const data = result.recordset.map(o => ({
        id: o.id, name: o.name, radiusMeters: o.radius_meters,
        coordinates: { latitude: o.latitude, longitude: o.longitude }
    }));
    res.json(data);
});

app.get('/api/v1/config/breaks', async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT id, name, is_paid as isPaid, icon FROM break_configs');
    res.json(result.recordset);
});

app.get('/api/v1/config/leaves', async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT id, name, code, requires_approval as requiresApproval FROM leave_configs');
    res.json(result.recordset);
});

app.get('/api/v1/config/holidays', async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT id, date, name FROM holidays');
    const data = result.recordset.map(h => ({...h, date: new Date(h.date).toISOString().split('T')[0]}));
    res.json(data);
});

app.get('/api/v1/timesheets', async (req, res) => {
    const pool = await connectDB();
    
    // Fetch Timesheets
    const tsResult = await pool.request().query('SELECT * FROM timesheets');
    
    // Fetch Breaks and JOIN Configs for Names
    const brResult = await pool.request().query(\`
        SELECT b.id, b.timesheet_id, b.type_id, b.start_time, b.end_time, b.status, bc.name as typeName
        FROM breaks b
        LEFT JOIN break_configs bc ON b.type_id = bc.id
    \`);
    
    const breaks = brResult.recordset;
    
    const data = tsResult.recordset.map(t => ({
        id: t.id, 
        userId: t.user_id, 
        date: new Date(t.date).toISOString().split('T')[0],
        startTime: t.start_time, 
        endTime: t.end_time, 
        status: t.status,
        matchedOfficeId: t.matched_office_id,
        // Breaks mapping
        breaks: breaks
            .filter(b => b.timesheet_id === t.id)
            .map(b => ({
                id: b.id,
                typeId: b.type_id,
                typeName: b.typeName || 'Unknown',
                status: b.status,
                startTime: b.start_time,
                endTime: b.end_time
            }))
    }));
    res.json(data);
});

app.get('/api/v1/leaves', async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query(\`
        SELECT l.id, l.user_id, l.type_id, l.start_date, l.end_date, l.reason, l.status, lc.name as typeName
        FROM leave_requests l
        LEFT JOIN leave_configs lc ON l.type_id = lc.id
    \`);
    const data = result.recordset.map(l => ({
        id: l.id, userId: l.user_id, typeId: l.type_id, status: l.status,
        typeName: l.typeName,
        startDate: new Date(l.start_date).toISOString().split('T')[0],
        endDate: new Date(l.end_date).toISOString().split('T')[0],
        reason: l.reason
    }));
    res.json(data);
});

const PORT = 3001;
app.listen(PORT, () => console.log('Server running on 3001'));
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
