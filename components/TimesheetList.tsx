import React from 'react';
import { Timesheet, ShiftStatus } from '../types';
import { Clock, MapPin, Calendar } from 'lucide-react';

interface TimesheetListProps {
  timesheets: Timesheet[];
  isManagerView?: boolean;
}

const TimesheetList: React.FC<TimesheetListProps> = ({ timesheets, isManagerView }) => {
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

        return (
          <div key={ts.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition hover:shadow-md">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                 <span className="font-medium text-gray-900">{ts.date}</span>
                 {ts.isHoliday && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full">Sărbătoare</span>}
                 {ts.status === ShiftStatus.WORKING && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full animate-pulse">Activ</span>}
              </div>
              <div className="flex items-center gap-4 text-gray-700">
                <div className="flex items-center gap-1">
                    <Clock size={16} className="text-blue-400" />
                    <span className="font-semibold">
                        {start.toLocaleTimeString('ro-RO', {hour: '2-digit', minute:'2-digit'})} 
                        {end ? ` - ${end.toLocaleTimeString('ro-RO', {hour: '2-digit', minute:'2-digit'})}` : ' - ...'}
                    </span>
                </div>
                {end && (
                     <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded border">
                        {hours}h {mins}m
                     </span>
                )}
              </div>
              {ts.breaks.length > 0 && (
                  <div className="text-xs text-orange-500 mt-1">
                      {ts.breaks.length} pauze înregistrate
                  </div>
              )}
            </div>
            
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                 {ts.distanceToOffice !== undefined && (
                     <div className="flex items-center gap-1 text-xs text-gray-400" title="Distance from office at start">
                         <MapPin size={14} />
                         {ts.distanceToOffice > 1000 ? `${(ts.distanceToOffice/1000).toFixed(1)}km` : `${ts.distanceToOffice}m`}
                     </div>
                 )}
                 {isManagerView && (
                     <button className="text-blue-600 text-sm font-medium hover:underline">Editează</button>
                 )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TimesheetList;