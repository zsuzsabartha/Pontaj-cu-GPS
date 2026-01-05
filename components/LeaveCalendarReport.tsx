
import React, { useState } from 'react';
import { User, LeaveRequest, LeaveConfig, LeaveStatus } from '../types';
import { ChevronLeft, ChevronRight, Calendar, User as UserIcon } from 'lucide-react';

interface LeaveCalendarReportProps {
  users: User[];
  leaves: LeaveRequest[];
  leaveConfigs: LeaveConfig[];
}

const LeaveCalendarReport: React.FC<LeaveCalendarReportProps> = ({ users, leaves, leaveConfigs }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
      const day = new Date(year, month, 1).getDay();
      return day === 0 ? 6 : day - 1; // Adjust for Monday start
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = currentDate.toLocaleString('ro-RO', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getLeavesForDay = (day: number) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      return leaves.filter(l => {
          // Check if dateStr is within range [startDate, endDate]
          return dateStr >= l.startDate && dateStr <= l.endDate && l.status !== LeaveStatus.REJECTED;
      }).map(l => {
          const user = users.find(u => u.id === l.userId);
          const config = leaveConfigs.find(c => c.id === l.typeId);
          return { ...l, user, configName: config?.name || l.typeName, code: config?.code };
      });
  };

  // Render Grid
  const days = [];
  for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 bg-gray-50/50 border border-gray-100"></div>);
  }

  for (let day = 1; day <= daysInMonth; day++) {
      const dayLeaves = getLeavesForDay(day);
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
      const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6;

      days.push(
          <div key={day} className={`h-32 border p-1 flex flex-col ${isToday ? 'bg-blue-50/30' : 'bg-white'} ${isWeekend ? 'bg-gray-50' : ''}`}>
              <div className="flex justify-between items-start mb-1 px-1">
                  <span className={`text-xs font-semibold ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>{day}</span>
                  {dayLeaves.length > 0 && <span className="text-[10px] text-gray-400 font-medium">{dayLeaves.length}</span>}
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                  {dayLeaves.map(leave => (
                      <div 
                        key={leave.id} 
                        className={`text-[10px] px-1.5 py-1 rounded border flex flex-col shadow-sm ${
                            leave.status === LeaveStatus.PENDING 
                                ? 'bg-yellow-50 border-yellow-200 text-yellow-800' 
                                : 'bg-purple-50 border-purple-200 text-purple-800'
                        }`}
                        title={`${leave.user?.name} - ${leave.configName} (${leave.status})`}
                      >
                          <div className="flex items-center gap-1 font-bold truncate">
                              <span className="truncate">{leave.user?.name.split(' ')[0]}</span>
                          </div>
                          <span className="opacity-80 truncate text-[9px]">{leave.code || leave.typeName}</span>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 className="font-bold text-gray-700 flex items-center gap-2">
                <Calendar className="text-blue-600"/> Raport Concedii & Absențe
            </h2>
            <div className="flex items-center gap-4">
                <div className="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                    <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded transition"><ChevronLeft size={18}/></button>
                    <span className="px-3 font-bold text-sm flex items-center min-w-[140px] justify-center">{monthName}</span>
                    <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded transition"><ChevronRight size={18}/></button>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-7 text-center border-b border-gray-200 bg-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <div className="py-2">Luni</div>
            <div className="py-2">Marți</div>
            <div className="py-2">Miercuri</div>
            <div className="py-2">Joi</div>
            <div className="py-2">Vineri</div>
            <div className="py-2 text-red-400">Sâmbătă</div>
            <div className="py-2 text-red-400">Duminică</div>
        </div>
        <div className="grid grid-cols-7 border-l border-gray-200">
            {days}
        </div>
        <div className="p-2 bg-gray-50 flex gap-4 text-xs text-gray-500 border-t border-gray-200">
            <div className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-50 border border-purple-200 rounded"></span> Concediu Aprobat</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-50 border border-yellow-200 rounded"></span> În Așteptare</div>
        </div>
    </div>
  );
};

export default LeaveCalendarReport;
