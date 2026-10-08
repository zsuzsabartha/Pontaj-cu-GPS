
import React, { useState, useEffect } from 'react';
import { Activity, Database, Server, Code, FileCode, CheckCircle, AlertTriangle, Play, RefreshCw, Layers, Download, Copy, Terminal, Shield, Settings, Save, BookOpen, Plug, Wifi, FileText, Clipboard, Lock, Package, UploadCloud, Trash2, Power, DownloadCloud } from 'lucide-react';
import { API_CONFIG, MOCK_COMPANIES, MOCK_DEPARTMENTS, MOCK_OFFICES, MOCK_USERS, INITIAL_BREAK_CONFIGS, INITIAL_LEAVE_CONFIGS, INITIAL_WORK_SCHEDULES, HOLIDAYS_RO } from '../constants';

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
    const [testResult, setTestResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        setConnectionStatus('CONNECTING');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

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
        if (!confirm("PUSH: Această acțiune va trimite TOATE datele locale (Companii, Useri, Pontaje, Concedii, Corecții) către SQL Server. Continuați?")) return;

        setIsSeeding(true);
        try {
            await fetch(`${API_CONFIG.BASE_URL}/config/breaks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(INITIAL_BREAK_CONFIGS) });
            await fetch(`${API_CONFIG.BASE_URL}/config/leaves`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(INITIAL_LEAVE_CONFIGS) });
            await fetch(`${API_CONFIG.BASE_URL}/config/holidays`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(HOLIDAYS_RO) });

            await fetch(`${API_CONFIG.BASE_URL}/config/schedules`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(JSON.parse(localStorage.getItem('pontaj_work_schedules') || JSON.stringify(INITIAL_WORK_SCHEDULES)))
            });

            await fetch(`${API_CONFIG.BASE_URL}/config/companies`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(JSON.parse(localStorage.getItem('pontaj_companies') || JSON.stringify(MOCK_COMPANIES)))
            });

            await fetch(`${API_CONFIG.BASE_URL}/config/offices`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(JSON.parse(localStorage.getItem('pontaj_offices') || JSON.stringify(MOCK_OFFICES)))
            });

            await fetch(`${API_CONFIG.BASE_URL}/config/departments`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(JSON.parse(localStorage.getItem('pontaj_departments') || JSON.stringify(MOCK_DEPARTMENTS)))
            });

            await fetch(`${API_CONFIG.BASE_URL}/config/users`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(JSON.parse(localStorage.getItem('pontaj_users') || JSON.stringify(MOCK_USERS)))
            });

            const localTimesheets = JSON.parse(localStorage.getItem('pontaj_timesheets') || '[]');
            await fetch(`${API_CONFIG.BASE_URL}/seed/timesheets`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(localTimesheets)
            });

            const localLeaves = JSON.parse(localStorage.getItem('pontaj_leaves') || '[]');
            await fetch(`${API_CONFIG.BASE_URL}/seed/leaves`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(localLeaves)
            });

            const localCorrections = JSON.parse(localStorage.getItem('pontaj_corrections') || '[]');
            await fetch(`${API_CONFIG.BASE_URL}/seed/corrections`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
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

    const handleFactoryReset = () => {
        if (confirm("FACTORY RESET: Această acțiune va șterge TOATE datele locale din browser. Dacă nu aveți o copie pe SQL Server, datele se vor pierde.")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    // --- ARTIFACT GENERATORS ---
    const generateSQLScript = () => {
        const script = `/* DEPLOYMENT SCRIPT v1.0.${buildVersion} */
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

-- SCHEMA MIGRATIONS --
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

    const bridgeSources: Record<string, string> = {
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
`
    };

    const handleDownload = (filename: string, content: string) => {
        const element = document.createElement("a");
        const file = new Blob([content], { type: 'text/plain' });
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
        <div className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-700 font-mono text-sm h-[calc(100vh-5rem)] flex flex-col transition-colors">
            <div className="bg-gray-50 dark:bg-slate-950 p-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center transition-colors">
                <div className="flex items-center gap-3">
                    <Shield size={24} className="text-emerald-600 dark:text-emerald-400" />
                    <h2 className="font-bold text-gray-800 dark:text-white">Admin Deployment Center</h2>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded transition-colors ${connectionStatus === 'ONLINE' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-400'}`}>{connectionStatus}</span>
            </div>

            <div className="flex bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 transition-colors">
                <button onClick={() => setActiveTab('status')} className={`px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ${activeTab === 'status' ? 'text-emerald-600 dark:text-white border-b-2 border-emerald-600 dark:border-emerald-500' : 'text-gray-500 dark:text-slate-500'}`}>Status</button>
                <button onClick={() => setActiveTab('bridge')} className={`px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ${activeTab === 'bridge' ? 'text-emerald-600 dark:text-white border-b-2 border-emerald-600 dark:border-emerald-500' : 'text-gray-500 dark:text-slate-500'}`}>Bridge Source</button>
                <button onClick={() => setActiveTab('sql')} className={`px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ${activeTab === 'sql' ? 'text-emerald-600 dark:text-white border-b-2 border-emerald-600 dark:border-emerald-500' : 'text-gray-500 dark:text-slate-500'}`}>SQL Script</button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-900/50 p-4">
                {activeTab === 'status' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded border border-gray-200 dark:border-slate-700 transition-colors">
                                <h3 className="text-gray-800 dark:text-white font-bold mb-2">Sync Status</h3>
                                <div className="flex gap-2">
                                    <button onClick={handlePushToSQL} disabled={isSeeding} className="bg-emerald-600 dark:bg-emerald-700 text-white px-3 py-1 rounded text-xs flex items-center gap-2 hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors shadow-sm">
                                        {isSeeding ? <RefreshCw className="animate-spin" size={12} /> : <UploadCloud size={12} />} Push Local &rarr; SQL
                                    </button>
                                    <button onClick={handleTestConnection} disabled={isTesting} className="bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-white px-3 py-1 rounded text-xs hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                                        {isTesting ? '...' : 'Test Conn'}
                                    </button>
                                </div>
                                {testResult && <p className={`text-xs mt-2 font-bold ${testResult.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{testResult.message}</p>}
                            </div>

                            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded border border-red-200 dark:border-red-900/50 transition-colors">
                                <h3 className="text-red-600 dark:text-red-400 font-bold mb-2 flex items-center gap-2"><AlertTriangle size={16} /> Danger Zone</h3>
                                <button onClick={handleFactoryReset} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs flex items-center gap-2 font-bold transition shadow-lg shadow-red-200 dark:shadow-red-900/50">
                                    <Trash2 size={14} /> Factory Reset (Clear LocalStorage)
                                </button>
                                <p className="text-[10px] text-red-500 dark:text-red-300 mt-2">Șterge toate datele din browser. Util dacă datele locale sunt corupte.</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'sql' && (
                    <div className="h-full flex flex-col">
                        <div className="flex gap-2 mb-2 justify-end">
                            <button onClick={() => handleCopy(generatedSQL)} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white px-3 py-1 rounded text-xs flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"><Copy size={12} /> {copyFeedback || 'Copy'}</button>
                            <button onClick={() => handleDownload('deployment.sql', generatedSQL)} className="bg-emerald-600 dark:bg-emerald-700 text-white px-3 py-1 rounded text-xs flex items-center gap-1 hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"><Download size={12} /> Download .sql</button>
                        </div>
                        <textarea readOnly value={generatedSQL} className="w-full h-full bg-gray-900 dark:bg-black p-4 text-xs font-mono text-green-500 dark:text-green-400 resize-none rounded border border-gray-200 dark:border-slate-700 shadow-inner" />
                    </div>
                )}

                {activeTab === 'bridge' && (
                    <div className="h-full flex flex-col">
                        <div className="flex gap-2 mb-2 justify-between">
                            <div className="flex gap-2">
                                <button onClick={() => setBridgeFile('server')} className={`px-2 py-1 text-xs rounded transition-colors ${bridgeFile === 'server' ? 'bg-emerald-600 dark:bg-emerald-700 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'}`}>server.js</button>
                                <button onClick={() => setBridgeFile('db')} className={`px-2 py-1 text-xs rounded transition-colors ${bridgeFile === 'db' ? 'bg-emerald-600 dark:bg-emerald-700 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'}`}>db.js</button>
                                <button onClick={() => setBridgeFile('package')} className={`px-2 py-1 text-xs rounded transition-colors ${bridgeFile === 'package' ? 'bg-emerald-600 dark:bg-emerald-700 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'}`}>package.json</button>
                                <button onClick={() => setBridgeFile('env')} className={`px-2 py-1 text-xs rounded transition-colors ${bridgeFile === 'env' ? 'bg-emerald-600 dark:bg-emerald-700 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'}`}>.env</button>
                            </div>
                        </div>
                        <div className="relative flex-1">
                            <textarea readOnly value={bridgeSources[bridgeFile]} className="w-full h-full bg-gray-900 dark:bg-black p-4 text-xs font-mono text-emerald-500 dark:text-emerald-300 resize-none rounded border border-gray-200 dark:border-slate-700 shadow-inner" />
                            <div className="absolute top-2 right-2 flex gap-2">
                                <button onClick={() => handleCopy(bridgeSources[bridgeFile])} className="bg-slate-100 dark:bg-slate-700 text-gray-700 dark:text-white px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shadow-sm"><Copy size={12} /> {copyFeedback || 'Copy'}</button>
                                <button onClick={() => handleDownload(`${bridgeFile === 'env' ? '' : bridgeFile}.${bridgeFile === 'package' ? 'json' : bridgeFile === 'env' ? 'env' : bridgeFile === 'readme' ? 'md' : 'js'}`, bridgeSources[bridgeFile])} className="bg-slate-100 dark:bg-slate-700 text-gray-700 dark:text-white px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shadow-sm"><Download size={12} /> Download</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BackendControlPanel;
export default BackendControlPanel;
