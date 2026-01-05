import React, { useState } from 'react';
import { User, Timesheet, LeaveRequest, CorrectionRequest, BreakStatus, LeaveStatus, ShiftStatus, Company, Office, BreakConfig, LeaveConfig, Holiday, Role } from '../types';
import { FileText, Coffee, Users, AlertOctagon, LayoutList, Calendar, CheckCircle, Clock4, Stethoscope, Palmtree, CheckSquare, AlertCircle, MapPin, PlusCircle, Filter, ChevronLeft, ChevronRight, Slash, LogIn, LogOut } from 'lucide-react';
import TimesheetList from './TimesheetList';
import LeaveCalendarReport from './LeaveCalendarReport';

interface ManagerDashboardProps {
  users: User[];
  currentUser: User;
  timesheets: Timesheet[];
  leaves: LeaveRequest[];
  correctionRequests: CorrectionRequest[];
  companies: Company[];
  offices: Office[];
  breakConfigs?: BreakConfig[];
  leaveConfigs: LeaveConfig[];
  holidays: Holiday[]; // Added Prop
  canViewAllCompanies: boolean;
  onApproveLeave: (id: string) => void;
  onReject: (type: 'LEAVE' | 'CORRECTION' | 'BREAK', id: string, parentId?: string) => void;
  onApproveBreak: (tsId: string, brId: string, status: BreakStatus) => void;
  onApproveCorrection: (id: string) => void;
  onOpenTimesheetModal: (ts: Timesheet | null) => void;
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  users, currentUser, timesheets, leaves, correctionRequests, companies, offices, breakConfigs, leaveConfigs, holidays,
  canViewAllCompanies, onApproveLeave, onReject, onApproveBreak, onApproveCorrection, onOpenTimesheetModal
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'history' | 'leaves' | 'breaks' | 'calendar'>('status');
  const [selectedTeamCompany, setSelectedTeamCompany] = useState<string>('ALL');
  const [dashboardDate, setDashboardDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const changeDashboardDate = (offset: number) => {
      const current = new Date(dashboardDate);
      current.setDate(current.getDate() + offset);
      setDashboardDate(current.toISOString().split('T')[0]);
  }

  // --- FILTER DATA ---
  const teamUsers = users.filter(u => {
      if (u.id === currentUser.id) return false; 
      if (canViewAllCompanies) {
          if (selectedTeamCompany !== 'ALL' && u.companyId !== selectedTeamCompany) return false;
          return true;
      } else {
          return u.companyId === currentUser.companyId;
      }
  });

  // Pending Actions
  const teamPendingLeaves = leaves.filter(l => l.status === LeaveStatus.PENDING && teamUsers.some(u => u.id === l.userId));
  const teamPendingCorrections = correctionRequests.filter(r => r.status === 'PENDING' && teamUsers.some(u => u.id === r.userId));
  const teamTimesheets = timesheets.filter(t => teamUsers.some(u => u.id === t.userId));
  const teamPendingBreaks = teamTimesheets.filter(ts => ts.breaks.some(b => b.status === BreakStatus.PENDING));
  const pendingBreaksCount = teamPendingBreaks.reduce((count, ts) => count + ts.breaks.filter(b => b.status === BreakStatus.PENDING).length, 0);

  // Helper to format location text based on available data
  const formatLocation = (matchedOfficeId?: string, distance?: number): { text: string, color: string } => {
      if (matchedOfficeId) {
          const officeName = offices.find(o => o.id === matchedOfficeId)?.name || 'Sediu';
          return { text: `${officeName}`, color: 'text-blue-600' };
      }
      if (distance !== undefined) {
          const color = distance > 500 ? 'text-orange-600' : 'text-gray-500';
          return { text: `Extern (${distance}m)`, color };
      }
      return { text: '-', color: 'text-gray-400' };
  };

  // Live Status Logic
  const teamMemberStatuses = teamUsers.map(user => {
      const activeLeave = leaves.find(l => l.userId === user.id && l.startDate <= dashboardDate && l.endDate >= dashboardDate && l.status === LeaveStatus.APPROVED);
      const dailyTs = timesheets.find(t => t.userId === user.id && t.date === dashboardDate);
      
      let status = 'ABSENT'; 
      let events: { icon: React.ReactNode, label: string, time: string, loc: string, locColor: string }[] = [];

      if (activeLeave) {
          status = 'LEAVE';
          events.push({ 
              icon: <Palmtree size={12}/>, 
              label: 'Concediu', 
              time: '-', 
              loc: activeLeave.typeName,
              locColor: 'text-purple-600' 
          });
      } else if (dailyTs) {
          if (dailyTs.status === ShiftStatus.WORKING) status = 'WORKING';
          else if (dailyTs.status === ShiftStatus.ON_BREAK) status = 'BREAK';
          else status = 'COMPLETED';

          // 1. Clock In Event
          const startLoc = formatLocation(dailyTs.matchedOfficeId, dailyTs.distanceToOffice);
          events.push({
              icon: <LogIn size={12}/>,
              label: 'Start',
              time: new Date(dailyTs.startTime).toLocaleTimeString('ro-RO', {hour:'2-digit',minute:'2-digit'}),
              loc: startLoc.text,
              locColor: startLoc.color
          });

          // 2. Breaks Events (Chronological)
          dailyTs.breaks.forEach(br => {
              // Break Start
              const brStartLoc = formatLocation(undefined, br.startDistanceToOffice);
              events.push({
                  icon: <Coffee size={12}/>,
                  label: `Pauză (${br.typeName})`,
                  time: new Date(br.startTime).toLocaleTimeString('ro-RO', {hour:'2-digit',minute:'2-digit'}),
                  loc: brStartLoc.text,
                  locColor: brStartLoc.color
              });
              
              // Break End (if exists)
              if (br.endTime) {
                  const brEndLoc = formatLocation(undefined, br.endDistanceToOffice);
                  events.push({
                      icon: <Clock4 size={12}/>,
                      label: 'Revenire',
                      time: new Date(br.endTime).toLocaleTimeString('ro-RO', {hour:'2-digit',minute:'2-digit'}),
                      loc: brEndLoc.text,
                      locColor: brEndLoc.color
                  });
              }
          });

          // 3. Clock Out Event (if exists)
          if (dailyTs.endTime) {
              const endLoc = formatLocation(undefined, dailyTs.endDistanceToOffice);
              events.push({
                  icon: <LogOut size={12}/>,
                  label: 'Stop',
                  time: new Date(dailyTs.endTime).toLocaleTimeString('ro-RO', {hour:'2-digit',minute:'2-digit'}),
                  loc: endLoc.text,
                  locColor: endLoc.color
              });
          }
      }
      return { user, status, events };
  }).sort((a,b) => (a.status === 'WORKING' ? 0 : 1) - (b.status === 'WORKING' ? 0 : 1));

  const activeTeamMembersCount = teamMemberStatuses.filter(s => s.status === 'WORKING').length;

  return (
    <div className="space-y-6 animate-in fade-in">
        
        {/* HEADER & FILTERS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
                 <h1 className="text-2xl font-bold text-gray-800">Panou Manager</h1>
                 <p className="text-sm text-gray-500">Supervizare, aprobări și rapoarte echipă</p>
             </div>
             
             <div className="flex flex-wrap gap-3 items-center">
                 {/* Sub-Tabs Navigation */}
                 <div className="bg-white border border-gray-200 rounded-lg p-1 flex gap-1 shadow-sm overflow-x-auto">
                     <button onClick={() => setActiveTab('status')} className={`px-3 py-1.5 rounded text-xs font-bold transition whitespace-nowrap ${activeTab === 'status' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Status Echipă</button>
                     <button onClick={() => setActiveTab('history')} className={`px-3 py-1.5 rounded text-xs font-bold transition whitespace-nowrap ${activeTab === 'history' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Istoric</button>
                     <button onClick={() => setActiveTab('leaves')} className={`px-3 py-1.5 rounded text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${activeTab === 'leaves' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                         Concedii {teamPendingLeaves.length > 0 && <span className="bg-purple-500 text-white rounded-full px-1.5 text-[9px]">{teamPendingLeaves.length}</span>}
                     </button>
                     <button onClick={() => setActiveTab('breaks')} className={`px-3 py-1.5 rounded text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${activeTab === 'breaks' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                         Pauze {pendingBreaksCount > 0 && <span className="bg-indigo-500 text-white rounded-full px-1.5 text-[9px]">{pendingBreaksCount}</span>}
                     </button>
                     <button onClick={() => setActiveTab('calendar')} className={`px-3 py-1.5 rounded text-xs font-bold transition whitespace-nowrap ${activeTab === 'calendar' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}>Calendar</button>
                 </div>

                 {/* Company Filter (if applicable) */}
                 {canViewAllCompanies && (
                     <select value={selectedTeamCompany} onChange={(e) => setSelectedTeamCompany(e.target.value)} className="text-sm border border-gray-200 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-blue-500">
                         <option value="ALL">Toate Companiile</option>
                         {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                 )}
             </div>
        </div>

        {/* --- TAB: STATUS (Live Board & Widgets) --- */}
        {activeTab === 'status' && (
            <div className="space-y-6">
                {/* Widgets */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-24">
                         <span className="text-xs font-bold text-gray-500 uppercase">Prezență Azi</span>
                         <div className="flex items-end justify-between">
                             <span className="text-2xl font-bold text-green-600">{activeTeamMembersCount} / {teamUsers.length}</span>
                             <Users size={20} className="text-green-200"/>
                         </div>
                     </div>
                     <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between h-24 ${teamPendingLeaves.length > 0 ? 'bg-purple-50 border-purple-100' : 'bg-white border-gray-100'}`}>
                         <span className="text-xs font-bold text-gray-500 uppercase">Cereri Concediu</span>
                         <div className="flex items-end justify-between">
                             <span className={`text-2xl font-bold ${teamPendingLeaves.length > 0 ? 'text-purple-600' : 'text-gray-400'}`}>{teamPendingLeaves.length}</span>
                             <FileText size={20} className={teamPendingLeaves.length > 0 ? 'text-purple-200' : 'text-gray-200'}/>
                         </div>
                     </div>
                     <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between h-24 ${pendingBreaksCount > 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-gray-100'}`}>
                         <span className="text-xs font-bold text-gray-500 uppercase">Pauze Neconfirmate</span>
                         <div className="flex items-end justify-between">
                             <span className={`text-2xl font-bold ${pendingBreaksCount > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>{pendingBreaksCount}</span>
                             <Coffee size={20} className={pendingBreaksCount > 0 ? 'text-indigo-200' : 'text-gray-200'}/>
                         </div>
                     </div>
                     <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between h-24 ${teamPendingCorrections.length > 0 ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-100'}`}>
                         <span className="text-xs font-bold text-gray-500 uppercase">Solicitări Corecție</span>
                         <div className="flex items-end justify-between">
                             <span className={`text-2xl font-bold ${teamPendingCorrections.length > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{teamPendingCorrections.length}</span>
                             <AlertOctagon size={20} className={teamPendingCorrections.length > 0 ? 'text-orange-200' : 'text-gray-200'}/>
                         </div>
                     </div>
                </div>

                {/* Live Board Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                     <div className="bg-slate-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                         <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                             <Users size={16} className="text-blue-500"/> Status Echipă - {new Date(dashboardDate).toLocaleDateString('ro-RO')}
                         </h3>
                         {/* Date Controls for Live View Context */}
                         <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5">
                             <button onClick={() => changeDashboardDate(-1)} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ChevronLeft size={14}/></button>
                             <input type="date" value={dashboardDate} onChange={(e) => setDashboardDate(e.target.value)} className="text-xs font-bold text-gray-700 outline-none bg-transparent px-2 w-24 text-center"/>
                             <button onClick={() => changeDashboardDate(1)} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ChevronRight size={14}/></button>
                         </div>
                     </div>
                     <div className="overflow-x-auto">
                         <table className="w-full text-left text-sm">
                             <thead>
                                 <tr className="bg-gray-50/50 text-xs text-gray-500 uppercase font-bold border-b border-gray-100">
                                     <th className="px-4 py-3 w-1/4">Angajat</th>
                                     <th className="px-4 py-3 w-32">Status</th>
                                     <th className="px-4 py-3">Pontaje & Locație</th>
                                     <th className="px-4 py-3 text-right">Acțiuni</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-100">
                                 {teamMemberStatuses.map(({ user, status, events }) => (
                                     <tr key={user.id} className="hover:bg-slate-50 transition">
                                         <td className="px-4 py-3 align-top">
                                             <div className="flex items-center gap-3">
                                                 <div className="relative">
                                                     <img src={user.avatarUrl} className="w-9 h-9 rounded-full bg-gray-200 object-cover"/>
                                                     {status === 'WORKING' && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>}
                                                 </div>
                                                 <div>
                                                     <p className="font-bold text-gray-800 text-sm">{user.name}</p>
                                                     <p className="text-[10px] text-gray-400">{user.roles.includes(Role.MANAGER) ? 'Manager' : 'Angajat'}</p>
                                                 </div>
                                             </div>
                                         </td>
                                         <td className="px-4 py-3 align-top">
                                             <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                                 status === 'WORKING' ? 'bg-green-100 text-green-700 border-green-200' :
                                                 status === 'BREAK' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                                 status === 'LEAVE' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                 status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                 'bg-red-50 text-red-600 border-red-100'
                                             }`}>
                                                 {status === 'WORKING' ? 'ACTIV' : status}
                                             </span>
                                         </td>
                                         <td className="px-4 py-3">
                                             {/* Render Event Stream */}
                                             <div className="space-y-1">
                                                 {events.length === 0 && <span className="text-xs text-gray-400 italic">Nicio activitate înregistrată.</span>}
                                                 {events.map((evt, idx) => (
                                                     <div key={idx} className="flex items-center gap-2 text-xs">
                                                         <span className="text-gray-400 w-4 flex justify-center">{evt.icon}</span>
                                                         <span className="font-mono font-bold text-gray-700 w-10">{evt.time}</span>
                                                         <span className="text-gray-500 font-medium">{evt.label}</span>
                                                         <span className="text-gray-300">|</span>
                                                         <span className={`font-medium ${evt.locColor}`}>{evt.loc}</span>
                                                     </div>
                                                 ))}
                                             </div>
                                         </td>
                                         <td className="px-4 py-3 text-right align-top">
                                             <button onClick={() => onOpenTimesheetModal(null)} className="text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 transition"><PlusCircle size={18}/></button>
                                         </td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>
                </div>
            </div>
        )}

        {/* --- TAB: HISTORY (Grid) --- */}
        {activeTab === 'history' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2"><LayoutList size={20}/> Istoric Complet Echipă</h3>
                </div>
                <div className="p-4">
                    <TimesheetList 
                        timesheets={teamTimesheets} 
                        offices={offices} 
                        users={users}
                        breakConfigs={breakConfigs}
                        isManagerView={true} 
                        onEditTimesheet={onOpenTimesheetModal}
                    />
                </div>
            </div>
        )}

        {/* --- TAB: LEAVES (Requests) --- */}
        {activeTab === 'leaves' && (
            <div className="space-y-6 animate-in fade-in">
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-purple-900">Cereri de Concediu în Așteptare</h3>
                        <p className="text-xs text-purple-700">Aprobați sau respingeți cererile echipei.</p>
                    </div>
                    <span className="text-2xl font-bold text-purple-700">{teamPendingLeaves.length}</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {teamPendingLeaves.length === 0 && <p className="col-span-full text-center text-gray-400 italic py-8">Nu există cereri de concediu în așteptare.</p>}
                    {teamPendingLeaves.map(req => {
                        const requester = users.find(u => u.id === req.userId);
                        return (
                            <div key={req.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <img src={requester?.avatarUrl} className="w-8 h-8 rounded-full"/>
                                        <div>
                                            <p className="font-bold text-sm text-gray-800">{requester?.name}</p>
                                            <p className="text-[10px] text-gray-500">{requester?.email}</p>
                                        </div>
                                    </div>
                                    <div className="bg-purple-50 p-3 rounded-lg text-xs space-y-2">
                                        <div className="font-bold text-purple-800">{req.typeName}</div>
                                        <div className="flex items-center gap-1 text-gray-600"><Calendar size={12}/> {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</div>
                                        {req.reason && <div className="italic text-gray-500 border-t border-purple-100 pt-2 mt-2">"{req.reason}"</div>}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onApproveLeave(req.id)} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition">Aprobă</button>
                                    <button onClick={() => onReject('LEAVE', req.id)} className="flex-1 bg-white border border-red-200 text-red-600 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition">Respinge</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )}

        {/* --- TAB: BREAKS & CORRECTIONS --- */}
        {activeTab === 'breaks' && (
            <div className="space-y-8 animate-in fade-in">
                {/* 1. Breaks */}
                <div className="space-y-4">
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-indigo-900">Pauze Neconfirmate (Luare la Cunoștință)</h3>
                            <p className="text-xs text-indigo-700">Angajații au marcat aceste pauze. Managerul trebuie să confirme.</p>
                        </div>
                        <span className="text-2xl font-bold text-indigo-700">{pendingBreaksCount}</span>
                    </div>
                    {teamPendingBreaks.length === 0 ? (
                        <p className="text-center text-gray-400 italic py-4">Toate pauzele au fost verificate.</p>
                    ) : (
                        <TimesheetList 
                            timesheets={teamPendingBreaks} 
                            offices={offices}
                            users={users}
                            breakConfigs={breakConfigs}
                            isManagerView={true} 
                            onApproveBreak={onApproveBreak}
                        />
                    )}
                </div>

                {/* 2. Corrections (Grouped here for convenience as they are also "Approvals") */}
                {teamPendingCorrections.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-orange-900">Solicitări Corecție / Pontaj Lipsă</h3>
                            </div>
                            <span className="text-2xl font-bold text-orange-700">{teamPendingCorrections.length}</span>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {teamPendingCorrections.map(req => {
                                const requester = users.find(u => u.id === req.userId);
                                return (
                                    <div key={req.id} className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <img src={requester?.avatarUrl} className="w-6 h-6 rounded-full"/>
                                            <span className="font-bold text-sm text-gray-800">{requester?.name}</span>
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <p><span className="font-semibold">Data:</span> {req.requestedDate || 'N/A'}</p>
                                            <p className="mt-1"><span className="font-semibold">Interval:</span> {new Date(req.requestedStartTime).toLocaleTimeString()} - {req.requestedEndTime ? new Date(req.requestedEndTime).toLocaleTimeString() : '...'}</p>
                                            <p className="mt-2 bg-gray-50 p-2 rounded italic">"{req.reason}"</p>
                                        </div>
                                        <div className="flex gap-2 mt-auto">
                                            <button onClick={() => onApproveCorrection(req.id)} className="flex-1 bg-green-600 text-white py-1.5 rounded text-xs font-bold">Aprobă</button>
                                            <button onClick={() => onReject('CORRECTION', req.id)} className="flex-1 border border-red-200 text-red-600 py-1.5 rounded text-xs font-bold">Respinge</button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- TAB: CALENDAR REPORT --- */}
        {activeTab === 'calendar' && (
            <div className="animate-in fade-in">
                <LeaveCalendarReport 
                    users={teamUsers} 
                    leaves={leaves} 
                    leaveConfigs={leaveConfigs}
                    holidays={holidays} // PASSED HOLIDAYS TO COMPONENT
                />
            </div>
        )}

    </div>
  );
};

export default ManagerDashboard;