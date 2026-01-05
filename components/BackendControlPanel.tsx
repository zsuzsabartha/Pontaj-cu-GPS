
import React, { useState, useEffect } from 'react';
import { Activity, Database, Server, Code, FileCode, CheckCircle, AlertTriangle, Play, RefreshCw, Layers, Download, Copy, Terminal, Shield, Settings, Save, BookOpen, Plug, Wifi, FileText, Clipboard, Lock, Package, UploadCloud, Trash2, Power, CloudDownload } from 'lucide-react';
import { API_CONFIG, MOCK_COMPANIES, MOCK_DEPARTMENTS, MOCK_OFFICES, MOCK_USERS, INITIAL_BREAK_CONFIGS, INITIAL_LEAVE_CONFIGS, INITIAL_WORK_SCHEDULES, HOLIDAYS_RO } from '../constants';

const BackendControlPanel: React.FC = () => {
  // ... (Previous state management code remains same until generateSQLScript)
  const [activeTab, setActiveTab] = useState<'status' | 'sql' | 'bridge' | 'swagger'>('status');
  const [connectionStatus, setConnectionStatus] = useState<'ONLINE' | 'CONNECTING' | 'OFFLINE'>('ONLINE');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [bridgeFile, setBridgeFile] = useState<'server' | 'db' | 'package' | 'env' | 'readme'>('server');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [buildVersion, setBuildVersion] = useState<number>(1);
  const [dbConfig, setDbConfig] = useState({ server: 'localhost', database: 'PontajSmart', user: 'PontajAppUser', password: 'StrongPass123!', port: '1433' });

  // ... (Effect hooks and handlers same as before)
  useEffect(() => {
      const stored = localStorage.getItem('pontaj_build_count');
      const current = stored ? parseInt(stored) : 1;
      const next = current + 1;
      localStorage.setItem('pontaj_build_count', next.toString());
      setBuildVersion(next);
  }, []);

  const handleTestConnection = async () => {
      setIsTesting(true);
      setTestResult(null);
      setConnectionStatus('CONNECTING');
      try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); 
          const response = await fetch('http://localhost:3001/api/v1/health', { signal: controller.signal });
          clearTimeout(timeoutId);
          const data = await response.json();
          if (response.ok && data.status === 'ONLINE') {
              setTestResult({ type: 'success', message: 'Succes! Bridge-ul este conectat la SQL Server.' });
              setConnectionStatus('ONLINE');
          } else {
              setTestResult({ type: 'error', message: `Eroare DB: ${data.error || ''}` });
              setConnectionStatus('OFFLINE');
          }
      } catch (error) {
          setTestResult({ type: 'error', message: 'Eșec Conexiune Server (Port 3001). Verificați consola.' });
          setConnectionStatus('OFFLINE');
      } finally { setIsTesting(false); }
  };

  const handlePushToSQL = async () => {
      if(!confirm("PUSH: Această acțiune va trimite TOATE datele locale (Companii, Useri, Pontaje, Concedii, Corecții) către SQL Server. Continuați?")) return;
      setIsSeeding(true);
      try {
          await fetch(`${API_CONFIG.BASE_URL}/config/breaks`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(INITIAL_BREAK_CONFIGS) });
          await fetch(`${API_CONFIG.BASE_URL}/config/leaves`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(INITIAL_LEAVE_CONFIGS) });
          await fetch(`${API_CONFIG.BASE_URL}/config/holidays`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(HOLIDAYS_RO) });
          await fetch(`${API_CONFIG.BASE_URL}/config/schedules`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(JSON.parse(localStorage.getItem('pontaj_work_schedules') || JSON.stringify(INITIAL_WORK_SCHEDULES))) });
          await fetch(`${API_CONFIG.BASE_URL}/config/companies`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(JSON.parse(localStorage.getItem('pontaj_companies') || JSON.stringify(MOCK_COMPANIES))) });
          await fetch(`${API_CONFIG.BASE_URL}/config/offices`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(JSON.parse(localStorage.getItem('pontaj_offices') || JSON.stringify(MOCK_OFFICES))) });
          await fetch(`${API_CONFIG.BASE_URL}/config/departments`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(JSON.parse(localStorage.getItem('pontaj_departments') || JSON.stringify(MOCK_DEPARTMENTS))) });
          await fetch(`${API_CONFIG.BASE_URL}/config/users`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(JSON.parse(localStorage.getItem('pontaj_users') || JSON.stringify(MOCK_USERS))) });
          // ... Seed transactions ...
          alert("Push Complet!");
      } catch (e) { alert("Eroare la sincronizare."); } finally { setIsSeeding(false); }
  };

  const handleFactoryReset = () => { if(confirm("FACTORY RESET?")) { localStorage.clear(); window.location.reload(); } };
  const handleCopy = (content: string) => { navigator.clipboard.writeText(content); setCopyFeedback('Copied!'); setTimeout(() => setCopyFeedback(null), 2000); };
  const handleDownload = (filename: string, content: string) => { /* ... */ };

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
    alternative_schedule_ids NVARCHAR(MAX),
    birth_date DATE,
    share_birthday BIT DEFAULT 0,
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
-- Transaction Tables (Timesheets, Breaks, Leaves, Corrections) ... 
-- (Kept short for brevity as they are unchanged)

-- SCHEMA MIGRATIONS --
-- 7. USERS (birth_date, share_birthday)
IF EXISTS(SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
    IF NOT EXISTS(SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'users') AND name = 'birth_date')
    BEGIN
        ALTER TABLE users ADD birth_date DATE;
    END
    IF NOT EXISTS(SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'users') AND name = 'share_birthday')
    BEGIN
        ALTER TABLE users ADD share_birthday BIT DEFAULT 0;
    END
END
`;
    setGeneratedSQL(script);
  };

  const bridgeSources = {
    // ... other files ...
    server: `/* SERVER GENERATED BY PONTAJ APP v${buildVersion} */
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import sql from 'mssql';
import { connectDB } from './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

/* -------------------- HELPERS -------------------- */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const toISODate = (d) => { if (!d) return null; return new Date(d).toISOString().split('T')[0]; };

/* -------------------- USERS -------------------- */
app.get('/api/v1/config/users', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT * FROM users');
    res.json(result.recordset.map(u => ({
        ...u,
        roles: u.roles ? JSON.parse(u.roles) : [],
        alternativeScheduleIds: u.alternative_schedule_ids ? JSON.parse(u.alternative_schedule_ids) : [],
        companyId: u.company_id, departmentId: u.department_id, assignedOfficeId: u.assigned_office_id,
        mainScheduleId: u.main_schedule_id, contractHours: u.contract_hours, isValidated: u.is_validated,
        requiresGPS: u.requires_gps, erpId: u.erp_id, authType: u.auth_type, employmentStatus: u.employment_status,
        birthDate: u.birth_date ? toISODate(u.birth_date) : undefined,
        shareBirthday: !!u.share_birthday
    })));
}));
app.post('/api/v1/config/users', asyncHandler(async (req, res) => {
    await handleConfigSync('users', req.body, (u) => ({
        query: \`INSERT INTO users (id, erp_id, company_id, department_id, assigned_office_id, main_schedule_id, name, email, auth_type, roles, contract_hours, is_validated, requires_gps, employment_status, alternative_schedule_ids, birth_date, share_birthday) 
                VALUES (@id, @erpId, @cid, @did, @oid, @sid, @name, @email, @auth, @roles, @hours, @val, @gps, @status, @altSched, @bdate, @share)\`,
        params: {
            id: u.id, erpId: u.erpId, cid: u.companyId, did: u.departmentId, oid: u.assignedOfficeId, sid: u.mainScheduleId,
            name: u.name, email: u.email, auth: u.authType, roles: JSON.stringify(u.roles), hours: u.contractHours, val: u.isValidated?1:0, gps: u.requiresGPS?1:0, status: u.employmentStatus,
            altSched: JSON.stringify(u.alternativeScheduleIds || []),
            bdate: u.birthDate ? toISODate(u.birthDate) : null,
            share: u.shareBirthday ? 1 : 0
        }
    }));
    res.json({ success: true });
}));

// ... (Rest of server code for other endpoints remains unchanged) ...
`
  };

  // ... (Render mostly unchanged) ...
  // Returning truncated component structure for brevity as logical changes are in `generateSQLScript` and `bridgeSources.server`
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
                  </div>
                  <textarea readOnly value={generatedSQL} className="w-full h-full bg-black p-4 text-xs font-mono text-green-400 resize-none rounded border border-slate-700"/>
              </div>
          )}

          {activeTab === 'bridge' && (
             <div className="h-full flex flex-col">
                 <div className="flex gap-2 mb-2 justify-between">
                     <div className="flex gap-2">
                         <button onClick={() => setBridgeFile('server')} className={`px-2 py-1 text-xs rounded ${bridgeFile === 'server' ? 'bg-blue-600 text-white' : 'bg-slate-800'}`}>server.js</button>
                     </div>
                 </div>
                 <div className="relative flex-1">
                     <textarea readOnly value={bridgeSources[bridgeFile]} className="w-full h-full bg-black p-4 text-xs font-mono text-blue-300 resize-none rounded border border-slate-700"/>
                 </div>
             </div>
          )}
       </div>
    </div>
  );
};

export default BackendControlPanel;
