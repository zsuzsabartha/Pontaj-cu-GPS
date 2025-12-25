
import React, { useState, useEffect } from 'react';
import { Activity, Database, Server, Code, FileCode, CheckCircle, AlertTriangle, Play, RefreshCw, Layers } from 'lucide-react';

const BackendControlPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'diag' | 'sql' | 'swagger'>('diag');
  
  // Database Connection State
  const [currentDb, setCurrentDb] = useState('mssql_prod_01');
  const [isSwitchingDb, setIsSwitchingDb] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'ONLINE' | 'CONNECTING' | 'OFFLINE'>('ONLINE');

  const databases = [
    { id: 'mssql_prod_01', name: 'Production (MSSQL)', type: 'Master' },
    { id: 'mssql_dev_01', name: 'Development (MSSQL)', type: 'Test' },
    { id: 'mssql_archive_2023', name: 'Archive 2023 (Read-Only)', type: 'Slave' },
    { id: 'pg_analytics_01', name: 'Analytics (PostgreSQL)', type: 'DataWarehouse' }
  ];

  const handleDbChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newDb = e.target.value;
      setIsSwitchingDb(true);
      setConnectionStatus('CONNECTING');
      
      // Simulate network switch
      setTimeout(() => {
          setCurrentDb(newDb);
          setIsSwitchingDb(false);
          setConnectionStatus('ONLINE');
      }, 1200);
  };

  const simulatedSQL = `
-- Script generat pentru: ${databases.find(d => d.id === currentDb)?.name} --
-- Timestamp: ${new Date().toISOString()} --

USE [${currentDb}];
GO

CREATE TABLE IF NOT EXISTS BreakTypes (
  ID VARCHAR(50) PRIMARY KEY,
  Name VARCHAR(100) NOT NULL,
  IsPaid BIT DEFAULT 0,
  Icon VARCHAR(50)
);

-- Database Maintenance
DBCC CHECKIDENT ('Timesheets', RESEED, 1042);
UPDATE STATISTICS Users;
  `;

  return (
    <div className="bg-slate-900 text-slate-200 rounded-xl overflow-hidden shadow-2xl border border-slate-700 font-mono text-sm h-[600px] flex flex-col">
       {/* Header with DB Selector */}
       <div className="bg-slate-950 p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
              <Server className={connectionStatus === 'ONLINE' ? "text-green-500" : "text-yellow-500"} size={20} />
              <div>
                  <h2 className="font-bold text-lg leading-tight">Consolă Backend</h2>
                  <p className="text-xs text-slate-500">v2.4.0 • Cluster EU-West</p>
              </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
             <div className="flex items-center gap-2 px-2">
                 <Database size={14} className="text-blue-400"/>
                 <span className="text-xs font-bold text-slate-400 hidden md:inline">Conexiune Activă:</span>
             </div>
             
             <div className="relative">
                 <select 
                    value={currentDb}
                    onChange={handleDbChange}
                    disabled={isSwitchingDb}
                    className="bg-slate-800 text-white text-xs py-1.5 pl-2 pr-8 rounded border border-slate-700 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer hover:bg-slate-700 transition w-48"
                 >
                     {databases.map(db => (
                         <option key={db.id} value={db.id}>{db.name}</option>
                     ))}
                 </select>
                 <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                     {isSwitchingDb ? <RefreshCw size={10} className="animate-spin text-slate-400"/> : <Layers size={10} className="text-slate-400"/>}
                 </div>
             </div>

             <span className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded border font-bold uppercase transition-colors ${
                 connectionStatus === 'ONLINE' ? 'bg-green-900/30 text-green-400 border-green-800' : 
                 connectionStatus === 'CONNECTING' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' : 
                 'bg-red-900/30 text-red-400 border-red-800'
             }`}>
                 <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'ONLINE' ? 'bg-green-500 animate-pulse' : 'bg-current'}`}></span>
                 {connectionStatus}
             </span>
          </div>
       </div>

       {/* Tabs */}
       <div className="flex bg-slate-900 border-b border-slate-800 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('diag')} 
            className={`px-6 py-3 flex items-center gap-2 transition hover:bg-slate-800 whitespace-nowrap ${activeTab === 'diag' ? 'border-b-2 border-blue-500 text-white bg-slate-800' : 'text-slate-500'}`}
          >
             <Activity size={16}/> Diagnosticare
          </button>
          <button 
            onClick={() => setActiveTab('sql')} 
            className={`px-6 py-3 flex items-center gap-2 transition hover:bg-slate-800 whitespace-nowrap ${activeTab === 'sql' ? 'border-b-2 border-blue-500 text-white bg-slate-800' : 'text-slate-500'}`}
          >
             <Database size={16}/> Scripturi SQL
          </button>
          <button 
            onClick={() => setActiveTab('swagger')} 
            className={`px-6 py-3 flex items-center gap-2 transition hover:bg-slate-800 whitespace-nowrap ${activeTab === 'swagger' ? 'border-b-2 border-blue-500 text-white bg-slate-800' : 'text-slate-500'}`}
          >
             <FileCode size={16}/> API (Swagger)
          </button>
       </div>

       {/* Content */}
       <div className="flex-1 overflow-auto p-6 bg-slate-900/50">
          
          {activeTab === 'diag' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <p className="text-slate-400 text-xs uppercase mb-1">Target Database</p>
                        <div className="text-xl font-bold text-white truncate" title={currentDb}>{currentDb}</div>
                        <div className="text-xs text-blue-400 mt-1">Tip: {databases.find(d => d.id === currentDb)?.type}</div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <p className="text-slate-400 text-xs uppercase mb-1">Timp Răspuns (Latency)</p>
                        <div className="text-xl font-bold text-white">{isSwitchingDb ? '...' : Math.floor(Math.random() * 40 + 10) + ' ms'}</div>
                         <div className="w-full bg-slate-700 h-1 mt-2 rounded-full overflow-hidden">
                           <div className="bg-green-500 h-full w-[60%]"></div>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <p className="text-slate-400 text-xs uppercase mb-1">Sesiuni Active</p>
                        <div className="text-xl font-bold text-white">{isSwitchingDb ? '0' : Math.floor(Math.random() * 100 + 20)}</div>
                        <div className="text-xs text-slate-500 mt-1">Pool Size: 200</div>
                    </div>
                 </div>

                 <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Activity size={16}/> Stare Servicii Conexe</h3>
                    <div className="space-y-2">
                       <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded border border-slate-700/50">
                          <span className="flex items-center gap-2"><Database size={14} className="text-slate-400"/> Motor SQL ({currentDb})</span>
                          <span className={`flex items-center gap-1 text-xs font-bold ${isSwitchingDb ? 'text-yellow-400' : 'text-green-400'}`}>
                              {isSwitchingDb ? <RefreshCw size={14} className="animate-spin"/> : <CheckCircle size={14}/>} 
                              {isSwitchingDb ? 'Reconectare...' : 'Operațional'}
                          </span>
                       </div>
                       <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded border border-slate-700/50">
                          <span className="flex items-center gap-2"><Layers size={14} className="text-slate-400"/> Redis Cache Layer</span>
                          <span className="text-green-400 flex items-center gap-1 text-xs font-bold"><CheckCircle size={14}/> Sincronizat</span>
                       </div>
                       <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded border border-slate-700/50">
                          <span className="flex items-center gap-2"><Server size={14} className="text-slate-400"/> Job Scheduler</span>
                          <span className="text-green-400 flex items-center gap-1 text-xs font-bold"><CheckCircle size={14}/> Running</span>
                       </div>
                    </div>
                 </div>
             </div>
          )}

          {activeTab === 'sql' && (
             <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center mb-2">
                   <h3 className="text-slate-400 text-xs flex items-center gap-2">
                       <FileCode size={14}/>
                       Script Migrare (Target: <span className="text-white font-bold">{currentDb}</span>)
                   </h3>
                   <button 
                     disabled={isSwitchingDb}
                     className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1 rounded text-xs transition"
                   >
                      <Play size={12}/> Execută
                   </button>
                </div>
                <textarea 
                   readOnly 
                   value={simulatedSQL}
                   className="flex-1 bg-black p-4 rounded-lg border border-slate-700 text-green-500 font-mono text-xs resize-none focus:outline-none focus:border-slate-500 transition-colors"
                />
             </div>
          )}

          {activeTab === 'swagger' && (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                 <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                     <span>Base URL: https://api.pontaj-group.ro/{currentDb.split('_')[1]}</span>
                     <span className="text-green-400">v1.2 Active</span>
                 </div>
                 
                 <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden group">
                    <div className="bg-blue-900/30 p-2 border-b border-slate-700 flex gap-2 items-center group-hover:bg-blue-900/40 transition">
                       <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold w-12 text-center">GET</span>
                       <span className="text-slate-300 font-mono">/api/v1/nomenclators/breaks</span>
                    </div>
                    <div className="p-3 text-xs text-slate-400">
                       Returnează lista tipurilor de pauză configurate din <strong>{currentDb}</strong>.
                    </div>
                 </div>

                 <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden group">
                    <div className="bg-green-900/30 p-2 border-b border-slate-700 flex gap-2 items-center group-hover:bg-green-900/40 transition">
                       <span className="bg-green-600 text-white px-2 py-0.5 rounded text-xs font-bold w-12 text-center">POST</span>
                       <span className="text-slate-300 font-mono">/api/v1/clock-in</span>
                    </div>
                    <div className="p-3 text-xs text-slate-400">
                       Înregistrează un nou start de tură. Scrie direct în tabela TransactionLogs din <strong>{currentDb}</strong>.
                    </div>
                 </div>

                 <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden group">
                    <div className="bg-orange-900/30 p-2 border-b border-slate-700 flex gap-2 items-center group-hover:bg-orange-900/40 transition">
                       <span className="bg-orange-600 text-white px-2 py-0.5 rounded text-xs font-bold w-12 text-center">PUT</span>
                       <span className="text-slate-300 font-mono">/api/v1/leaves/{'{id}'}/approve</span>
                    </div>
                    <div className="p-3 text-xs text-slate-400">
                       Aprobă o cerere de concediu. Trigger-uiește notificări SMTP.
                    </div>
                 </div>
             </div>
          )}

       </div>
    </div>
  );
};

export default BackendControlPanel;
