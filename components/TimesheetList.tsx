import React, { useState } from 'react';
import { Timesheet, ShiftStatus, BreakStatus } from '../types';
import { Clock, MapPin, Calendar, Check, X, Coffee, Briefcase, User as UserIcon, Edit2, History, AlertCircle, CloudOff, Info, CheckSquare, CalendarClock } from 'lucide-react';

interface TimesheetListProps {
  timesheets: Timesheet[];
  isManagerView?: boolean;
  onApproveBreak?: (timesheetId: string, breakId: string, status: BreakStatus) => void;
  onEditTimesheet?: (timesheet: Timesheet) => void;
}

const TimesheetList: React.FC<TimesheetListProps> = ({ timesheets, isManagerView, onApproveBreak, onEditTimesheet }) => {
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null);

  const toggleLogs = (id: string) => {
      setExpandedLogs(expandedLogs === id ? null : id);
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <Calendar size={20} className="text-blue-600"/>
        Istoric Pontaje
      </h3>
      {timesheets.length === 0 && <p className="text-gray-400 text-sm italic">Nu există înregistrări.</p>}
      
      {timesheets.map((ts) => {
        const start = new Date(ts.startTime);
        const end = ts.endTime ? new Date(ts.endTime) : null;
        const durationMs = end ? end.getTime() - start.getTime() : 0;
        const hours = Math.floor(durationMs / 3600000);
        const mins = Math.floor((durationMs % 3600000) / 60000);
        const hasLogs = ts.logs && ts.logs.length > 0;
        const isOffline = ts.syncStatus === 'PENDING_SYNC';
        
        // Detect cross-day shift
        const isMultiDay = end && end.getDate() !== start.getDate();

        return (
          <div key={ts.id} className={`bg-white p-4 rounded-xl shadow-sm border transition hover:shadow-md relative group ${isOffline ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-100'}`}>
            
            {/* Sync Indicator */}
            {isOffline && (
                 <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                     <CloudOff size={10} /> Sincronizare...
                 </div>
            )}

            {/* Edit Button - Top Right */}
            {onEditTimesheet && (
                <button 
                    onClick={() => onEditTimesheet(ts)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition"
                    title={isManagerView ? "Modifică Pontaj" : "Solicită Corecție"}
                >
                    <Edit2 size={16} />
                </button>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <span className="font-medium text-gray-900">{ts.date}</span>
                        {ts.isHoliday && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full">Sărbătoare</span>}
                        {ts.status === ShiftStatus.WORKING && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full animate-pulse">Activ</span>}
                        {hasLogs && (
                            <button 
                                onClick={() => toggleLogs(ts.id)}
                                className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full hover:bg-gray-200"
                            >
                                <History size={10} /> {ts.logs?.length} modificări
                            </button>
                        )}
                        {ts.detectedScheduleName && (
                            <div className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                                <CalendarClock size={10} />
                                <span className="truncate max-w-[150px]" title={ts.detectedScheduleName}>{ts.detectedScheduleName}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-gray-700">
                        <div className="flex items-center gap-1">
                            <Clock size={16} className="text-blue-400" />
                            <span className="font-semibold">
                                {start.toLocaleTimeString('ro-RO', {hour: '2-digit', minute:'2-digit'})} 
                                {end ? ` - ${end.toLocaleTimeString('ro-RO', {hour: '2-digit', minute:'2-digit'})}` : ' - ...'}
                                {isMultiDay && <span className="text-[10px] text-orange-500 ml-1 font-bold">(+1 zi)</span>}
                            </span>
                        </div>
                        {end && (
                            <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded border">
                                {hours}h {mins}m
                            </span>
                        )}
                    </div>
                </div>
                
                {/* Distance Info - Hidden on mobile if not important */}
                <div className="hidden sm:block">
                     {ts.distanceToOffice !== undefined && (
                        <div className="flex items-center gap-1 text-xs text-gray-400" title="Distanța față de sediu la start">
                            <MapPin size={14} />
                            {ts.distanceToOffice > 1000 ? `${(ts.distanceToOffice/1000).toFixed(1)}km` : `${ts.distanceToOffice}m`}
                        </div>
                    )}
                </div>
            </div>

            {/* Logs/History Section */}
            {expandedLogs === ts.id && hasLogs && (
                <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100 animate-in fade-in slide-in-from-top-2">
                    <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1"><History size={12}/> Istoric Modificări</p>
                    <div className="space-y-2">
                        {ts.logs?.map(log => (
                            <div key={log.id} className="text-xs text-gray-500 border-l-2 border-blue-300 pl-2">
                                <span className="font-mono text-[10px] text-gray-400 block">{new Date(log.changeDate).toLocaleString('ro-RO')}</span>
                                {log.details}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Breaks Section */}
            {ts.breaks.length > 0 && (
                <div className="border-t border-gray-50 pt-3 mt-2">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Pauze înregistrate:</p>
                    <div className="space-y-2">
                        {ts.breaks.map((br) => (
                            <div key={br.id} className="flex flex-col sm:flex-row justify-between sm:items-center text-xs bg-gray-50 p-2 rounded border border-gray-100 gap-2">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <Coffee size={14} className="text-gray-500"/>
                                        <span className="font-medium text-gray-700">{br.typeName}</span>
                                        <span className="text-gray-400 font-mono">
                                            {new Date(br.startTime).toLocaleTimeString('ro-RO', {hour:'2-digit', minute:'2-digit'})} 
                                            {br.endTime ? ` - ${new Date(br.endTime).toLocaleTimeString('ro-RO', {hour:'2-digit', minute:'2-digit'})}` : '...'}
                                        </span>
                                    </div>
                                    
                                    {/* Detailed Location Info for Manager */}
                                    {(br.startLocation || br.endLocation) && (
                                        <div className="text-[10px] text-gray-400 pl-6 flex flex-col gap-0.5">
                                            {br.startLocation && (
                                                <span className="flex items-center gap-1">
                                                    Start: {br.startLocation.latitude.toFixed(4)}, {br.startLocation.longitude.toFixed(4)} ({br.startDistanceToOffice ?? '?'}m)
                                                </span>
                                            )}
                                            {br.endLocation && (
                                                <span className="flex items-center gap-1">
                                                    End: {br.endLocation.latitude.toFixed(4)}, {br.endLocation.longitude.toFixed(4)} ({br.endDistanceToOffice ?? '?'}m)
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                    {br.status === BreakStatus.REJECTED && br.managerNote && (
                                         <div className="group/tooltip relative">
                                             <Info size={14} className="text-red-400 cursor-help" />
                                             <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-800 text-white text-[10px] p-2 rounded hidden group-hover/tooltip:block z-10">
                                                 Motiv respingere: {br.managerNote}
                                             </div>
                                         </div>
                                    )}
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        br.status === BreakStatus.APPROVED ? 'bg-green-100 text-green-700' :
                                        br.status === BreakStatus.REJECTED ? 'bg-red-100 text-red-700' :
                                        'bg-orange-100 text-orange-700'
                                    }`}>
                                        {br.status === BreakStatus.APPROVED ? 'Confirmat' : br.status === BreakStatus.PENDING ? 'În așteptare' : 'Respins'}
                                    </span>
                                    
                                    {isManagerView && br.status === BreakStatus.PENDING && onApproveBreak && (
                                        <button 
                                            onClick={() => onApproveBreak(ts.id, br.id, BreakStatus.APPROVED)} 
                                            title="Confirmă luarea la cunoștință"
                                            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition shadow-sm animate-pulse"
                                        >
                                            <CheckSquare size={12}/> Luare la cunoștință
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TimesheetList;