import React, { useState, useEffect } from 'react';
import { 
  MOCK_USERS, 
  INITIAL_TIMESHEETS, 
  INITIAL_LEAVE_REQUESTS, 
  HOLIDAYS_RO 
} from './constants';
import { 
  User, 
  Timesheet, 
  ShiftStatus, 
  Role, 
  Coordinates, 
  Office, 
  LeaveRequest, 
  LeaveStatus 
} from './types';
import ClockWidget from './components/ClockWidget';
import TimesheetList from './components/TimesheetList';
import LeaveModal from './components/LeaveModal';
import { Users, FileText, Settings, LogOut, CheckCircle, XCircle, BarChart3, CloudLightning } from 'lucide-react';
import { generateWorkSummary } from './services/geminiService';

export default function App() {
  // --- State ---
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[1]); // Default Employee
  const [timesheets, setTimesheets] = useState<Timesheet[]>(INITIAL_TIMESHEETS);
  const [leaves, setLeaves] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  
  // Navigation State (Simple Hash Router replacement for demo)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'leaves'>('dashboard');
  const [isLeaveModalOpen, setLeaveModalOpen] = useState(false);
  
  // Current active timesheet for the user
  const [currentShift, setCurrentShift] = useState<Timesheet | null>(null);

  // Sync to ERP Mock State
  const [isSyncing, setIsSyncing] = useState(false);

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // --- Effects ---
  useEffect(() => {
    // Check if user has an active shift in local state (simulated)
    const active = timesheets.find(t => t.userId === currentUser.id && t.status !== ShiftStatus.COMPLETED);
    if (active) setCurrentShift(active);
    else setCurrentShift(null);
  }, [currentUser, timesheets]);

  // --- Handlers ---

  const handleUserSwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const user = MOCK_USERS.find(u => u.id === e.target.value);
    if (user) {
        setCurrentUser(user);
        setActiveTab('dashboard'); // Reset view
        setAiSummary(null);
    }
  };

  const handleClockIn = (location: Coordinates, office: Office | null, dist: number) => {
    const now = new Date();
    const isHoliday = HOLIDAYS_RO.includes(now.toISOString().split('T')[0]);

    const newShift: Timesheet = {
      id: `ts-${Date.now()}`,
      userId: currentUser.id,
      startTime: now.toISOString(),
      date: now.toISOString().split('T')[0],
      breaks: [],
      startLocation: location,
      matchedOfficeId: office?.id,
      distanceToOffice: dist,
      status: ShiftStatus.WORKING,
      isHoliday
    };

    setTimesheets(prev => [newShift, ...prev]);
  };

  const handleClockOut = (location: Coordinates) => {
    if (!currentShift) return;

    const updatedShift: Timesheet = {
      ...currentShift,
      endTime: new Date().toISOString(),
      endLocation: location,
      status: ShiftStatus.COMPLETED
    };

    setTimesheets(prev => prev.map(t => t.id === currentShift.id ? updatedShift : t));
  };

  const handleToggleBreak = () => {
    if (!currentShift) return;

    let updatedShift = { ...currentShift };
    const now = new Date().toISOString();

    if (currentShift.status === ShiftStatus.WORKING) {
      // Start Break
      updatedShift.status = ShiftStatus.ON_BREAK;
      updatedShift.breaks = [...updatedShift.breaks, { startTime: now }];
    } else {
      // End Break
      updatedShift.status = ShiftStatus.WORKING;
      const lastBreakIndex = updatedShift.breaks.length - 1;
      if (lastBreakIndex >= 0) {
        updatedShift.breaks[lastBreakIndex].endTime = now;
      }
    }
    
    setTimesheets(prev => prev.map(t => t.id === currentShift.id ? updatedShift : t));
  };

  const handleLeaveSubmit = (req: Omit<LeaveRequest, 'id' | 'status' | 'userId'>) => {
    const newReq: LeaveRequest = {
        ...req,
        id: `lr-${Date.now()}`,
        userId: currentUser.id,
        status: LeaveStatus.PENDING
    };
    setLeaves(prev => [newReq, ...prev]);
  };

  const handleApproveLeave = (id: string, approve: boolean) => {
      setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: approve ? LeaveStatus.APPROVED : LeaveStatus.REJECTED } : l));
  };

  const handleSyncERP = () => {
      setIsSyncing(true);
      setTimeout(() => {
          setIsSyncing(false);
          alert("Datele au fost transmise cu succes către ERP-ul companiei.");
      }, 1500);
  };

  const handleGenerateAISummary = async () => {
      setAiSummary("Se analizează...");
      const userSheets = timesheets.filter(t => t.userId === currentUser.id);
      const summary = await generateWorkSummary(userSheets, currentUser);
      setAiSummary(summary);
  }

  // --- Render Helpers ---

  const myLeaves = leaves.filter(l => l.userId === currentUser.id);
  const myTimesheets = timesheets.filter(t => t.userId === currentUser.id);
  const pendingLeaves = leaves.filter(l => l.status === LeaveStatus.PENDING); // For manager

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-gray-800">
      
      {/* --- Sidebar --- */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col sticky top-0 md:h-screen z-10">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
           <span className="font-bold text-xl tracking-tight text-gray-900">PontajGroup</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
           <button 
             onClick={() => setActiveTab('dashboard')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
           >
             <FileText size={18} /> Dashboard
           </button>
           
           <button 
             onClick={() => setActiveTab('leaves')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'leaves' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
           >
             <Settings size={18} /> Cereri Concediu
           </button>

           {currentUser.role === Role.MANAGER && (
                <button 
                onClick={() => setActiveTab('team')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'team' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                <Users size={18} /> Echipa Mea
                </button>
           )}
        </nav>

        {/* User Profile & Role Switcher (Mock) */}
        <div className="p-4 border-t border-gray-100">
           <div className="mb-4">
              <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2 block">Simulare Utilizator</label>
              <select 
                className="w-full text-sm border-gray-200 rounded-md shadow-sm p-1.5 bg-gray-50"
                value={currentUser.id}
                onChange={handleUserSwitch}
              >
                  {MOCK_USERS.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
              </select>
           </div>
           
           <div className="flex items-center gap-3">
               <img src={currentUser.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full border border-gray-200" />
               <div className="flex-1 min-w-0">
                   <p className="text-sm font-medium text-gray-900 truncate">{currentUser.name}</p>
                   <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
               </div>
               <LogOut size={16} className="text-gray-400 cursor-pointer hover:text-red-500"/>
           </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        
        {/* --- DASHBOARD TAB --- */}
        {activeTab === 'dashboard' && (
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Panou de Control</h1>
                    {currentUser.role === Role.MANAGER && (
                         <button 
                            onClick={handleSyncERP}
                            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-slate-900 transition"
                         >
                             <CloudLightning size={16} className={isSyncing ? "animate-spin" : ""}/> 
                             {isSyncing ? 'Se trimite...' : 'Sync ERP'}
                         </button>
                    )}
                </header>

                <ClockWidget 
                    user={currentUser}
                    currentStatus={currentShift?.status || ShiftStatus.NOT_STARTED}
                    onClockIn={handleClockIn}
                    onClockOut={handleClockOut}
                    onToggleBreak={handleToggleBreak}
                />

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold">Analiză Activitate (AI)</h2>
                        <button onClick={handleGenerateAISummary} className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                            <BarChart3 size={16} /> Generează
                        </button>
                    </div>
                    {aiSummary ? (
                        <div className="bg-indigo-50 p-4 rounded-lg text-sm text-indigo-900 italic border-l-4 border-indigo-400">
                            {aiSummary}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">Apasă pe "Generează" pentru a primi un rezumat al activității tale recente.</p>
                    )}
                </div>

                <TimesheetList timesheets={myTimesheets} />
            </div>
        )}

        {/* --- LEAVES TAB --- */}
        {activeTab === 'leaves' && (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                     <h1 className="text-2xl font-bold text-gray-800">Concedii</h1>
                     <button 
                        onClick={() => setLeaveModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                     >
                        + Cerere Nouă
                     </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                            <tr>
                                <th className="p-4 font-medium">Tip</th>
                                <th className="p-4 font-medium">Perioada</th>
                                <th className="p-4 font-medium">Motiv</th>
                                <th className="p-4 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myLeaves.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-400 italic">Nicio cerere înregistrată.</td></tr>
                            ) : (
                                myLeaves.map(leave => (
                                    <tr key={leave.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="p-4 font-medium text-gray-800">{leave.type}</td>
                                        <td className="p-4 text-gray-600">{leave.startDate} -> {leave.endDate}</td>
                                        <td className="p-4 text-gray-500 truncate max-w-xs">{leave.reason}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                leave.status === LeaveStatus.APPROVED ? 'bg-green-100 text-green-700' :
                                                leave.status === LeaveStatus.REJECTED ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {leave.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- TEAM TAB (MANAGER) --- */}
        {activeTab === 'team' && currentUser.role === Role.MANAGER && (
             <div className="max-w-4xl mx-auto space-y-8">
                 <h1 className="text-2xl font-bold text-gray-800">Management Echipă</h1>
                 
                 {/* Approvals Section */}
                 <div className="space-y-4">
                     <h3 className="text-lg font-semibold text-gray-700">Cereri în Așteptare</h3>
                     {pendingLeaves.length === 0 ? (
                         <div className="bg-white p-6 rounded-xl border border-dashed border-gray-300 text-center text-gray-400">
                             Totul este la zi!
                         </div>
                     ) : (
                         <div className="grid gap-4">
                             {pendingLeaves.map(leave => {
                                 const requester = MOCK_USERS.find(u => u.id === leave.userId);
                                 return (
                                     <div key={leave.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                         <div>
                                             <div className="flex items-center gap-2 mb-1">
                                                 <img src={requester?.avatarUrl} className="w-6 h-6 rounded-full"/>
                                                 <span className="font-bold text-gray-900">{requester?.name}</span>
                                                 <span className="text-xs text-gray-500">vrea {leave.type}</span>
                                             </div>
                                             <p className="text-sm text-gray-600">{leave.startDate} - {leave.endDate}</p>
                                             <p className="text-xs text-gray-400 italic mt-1">"{leave.reason}"</p>
                                         </div>
                                         <div className="flex gap-2">
                                             <button 
                                                onClick={() => handleApproveLeave(leave.id, true)}
                                                className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition"
                                             >
                                                 <CheckCircle size={20} />
                                             </button>
                                             <button 
                                                onClick={() => handleApproveLeave(leave.id, false)}
                                                className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                                             >
                                                 <XCircle size={20} />
                                             </button>
                                         </div>
                                     </div>
                                 )
                             })}
                         </div>
                     )}
                 </div>

                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700">Pontaje Echipă (Recente)</h3>
                    <TimesheetList timesheets={timesheets.filter(t => t.userId !== currentUser.id)} isManagerView={true} />
                 </div>
             </div>
        )}

      </main>

      <LeaveModal 
        isOpen={isLeaveModalOpen} 
        onClose={() => setLeaveModalOpen(false)} 
        onSubmit={handleLeaveSubmit} 
      />
    </div>
  );
}