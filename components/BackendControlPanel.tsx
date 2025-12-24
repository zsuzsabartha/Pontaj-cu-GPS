
import React, { useState } from 'react';
import { Activity, Database, Server, Code, FileCode, CheckCircle, AlertTriangle, Play } from 'lucide-react';

const BackendControlPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'diag' | 'sql' | 'swagger'>('diag');

  const simulatedSQL = `
-- Script generat pentru Productie --
-- Timestamp: ${new Date().toISOString()} --

CREATE TABLE IF NOT EXISTS BreakTypes (
  ID VARCHAR(50) PRIMARY KEY,
  Name VARCHAR(100) NOT NULL,
  IsPaid BIT DEFAULT 0,
  Icon VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS LeaveTypes (
  ID VARCHAR(50) PRIMARY KEY,
  Name VARCHAR(100) NOT NULL,
  Code VARCHAR(20) UNIQUE,
  RequiresApproval BIT DEFAULT 1
);

-- Insert Default Data
INSERT INTO BreakTypes (ID, Name, IsPaid, Icon) VALUES ('bc1', 'Pauză Personală', 0, 'coffee');
INSERT INTO BreakTypes (ID, Name, IsPaid, Icon) VALUES ('bc2', 'Interes Serviciu', 1, 'briefcase');
-- ... more data ...

-- Database Maintenance
DBCC CHECKIDENT ('Timesheets', RESEED, 1042);
UPDATE STATISTICS Users;
  `;

  return (
    <div className="bg-slate-900 text-slate-200 rounded-xl overflow-hidden shadow-2xl border border-slate-700 font-mono text-sm h-[600px] flex flex-col">
       {/* Header */}
       <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center gap-3">
          <Server className="text-green-500" size={20} />
          <h2 className="font-bold text-lg">Consolă Administrare Backend (v2.4.0)</h2>
          <span className="ml-auto flex items-center gap-2 text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-800">
             <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> ONLINE
          </span>
       </div>

       {/* Tabs */}
       <div className="flex bg-slate-900 border-b border-slate-800">
          <button 
            onClick={() => setActiveTab('diag')} 
            className={`px-6 py-3 flex items-center gap-2 transition hover:bg-slate-800 ${activeTab === 'diag' ? 'border-b-2 border-blue-500 text-white bg-slate-800' : 'text-slate-500'}`}
          >
             <Activity size={16}/> Diagnosticare
          </button>
          <button 
            onClick={() => setActiveTab('sql')} 
            className={`px-6 py-3 flex items-center gap-2 transition hover:bg-slate-800 ${activeTab === 'sql' ? 'border-b-2 border-blue-500 text-white bg-slate-800' : 'text-slate-500'}`}
          >
             <Database size={16}/> Scripturi SQL
          </button>
          <button 
            onClick={() => setActiveTab('swagger')} 
            className={`px-6 py-3 flex items-center gap-2 transition hover:bg-slate-800 ${activeTab === 'swagger' ? 'border-b-2 border-blue-500 text-white bg-slate-800' : 'text-slate-500'}`}
          >
             <FileCode size={16}/> API (Swagger)
          </button>
       </div>

       {/* Content */}
       <div className="flex-1 overflow-auto p-6 bg-slate-900/50">
          
          {activeTab === 'diag' && (
             <div className="space-y-6">
                 <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <p className="text-slate-400 text-xs uppercase mb-1">Utilizare CPU</p>
                        <div className="text-2xl font-bold text-white">12%</div>
                        <div className="w-full bg-slate-700 h-1 mt-2 rounded-full overflow-hidden">
                           <div className="bg-blue-500 h-full w-[12%]"></div>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <p className="text-slate-400 text-xs uppercase mb-1">Memorie (RAM)</p>
                        <div className="text-2xl font-bold text-white">4.2 GB / 16 GB</div>
                        <div className="w-full bg-slate-700 h-1 mt-2 rounded-full overflow-hidden">
                           <div className="bg-purple-500 h-full w-[25%]"></div>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <p className="text-slate-400 text-xs uppercase mb-1">Conexiuni DB Active</p>
                        <div className="text-2xl font-bold text-white">48</div>
                        <div className="w-full bg-slate-700 h-1 mt-2 rounded-full overflow-hidden">
                           <div className="bg-green-500 h-full w-[40%]"></div>
                        </div>
                    </div>
                 </div>

                 <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Activity size={16}/> Stare Servicii</h3>
                    <div className="space-y-2">
                       <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded">
                          <span>Baza de Date Primară (MSSQL)</span>
                          <span className="text-green-400 flex items-center gap-1"><CheckCircle size={14}/> Operațional</span>
                       </div>
                       <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded">
                          <span>Strat Cache (Redis)</span>
                          <span className="text-green-400 flex items-center gap-1"><CheckCircle size={14}/> Operațional</span>
                       </div>
                       <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded">
                          <span>Serviciu Email (SMTP)</span>
                          <span className="text-yellow-400 flex items-center gap-1"><AlertTriangle size={14}/> Latență Ridicată (240ms)</span>
                       </div>
                    </div>
                 </div>
             </div>
          )}

          {activeTab === 'sql' && (
             <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-2">
                   <h3 className="text-slate-400">Script Migrare Generat</h3>
                   <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">
                      <Play size={12}/> Execută în Producție
                   </button>
                </div>
                <textarea 
                   readOnly 
                   value={simulatedSQL}
                   className="flex-1 bg-black p-4 rounded-lg border border-slate-700 text-green-500 font-mono text-xs resize-none focus:outline-none"
                />
             </div>
          )}

          {activeTab === 'swagger' && (
             <div className="space-y-4">
                 <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                    <div className="bg-blue-900/30 p-2 border-b border-slate-700 flex gap-2 items-center">
                       <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold">GET</span>
                       <span className="text-slate-300">/api/v1/nomenclators/breaks</span>
                    </div>
                    <div className="p-3 text-xs text-slate-400">
                       Returnează lista tipurilor de pauză configurate.
                    </div>
                 </div>

                 <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                    <div className="bg-green-900/30 p-2 border-b border-slate-700 flex gap-2 items-center">
                       <span className="bg-green-600 text-white px-2 py-0.5 rounded text-xs font-bold">POST</span>
                       <span className="text-slate-300">/api/v1/clock-in</span>
                    </div>
                    <div className="p-3 text-xs text-slate-400">
                       Înregistrează un nou start de tură. Body necesar: {'{ "userId": "uuid", "coordinates": {...} }'}
                    </div>
                 </div>

                 <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                    <div className="bg-orange-900/30 p-2 border-b border-slate-700 flex gap-2 items-center">
                       <span className="bg-orange-600 text-white px-2 py-0.5 rounded text-xs font-bold">PUT</span>
                       <span className="text-slate-300">/api/v1/leaves/{'{id}'}/approve</span>
                    </div>
                    <div className="p-3 text-xs text-slate-400">
                       Aprobă o cerere de concediu. Necesită rol de Manager.
                    </div>
                 </div>
             </div>
          )}

       </div>
    </div>
  );
};

export default BackendControlPanel;
