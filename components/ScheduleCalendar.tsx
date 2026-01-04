import React, { useState } from 'react';
import { DailySchedule, WorkSchedule, User, Role, Holiday } from '../types';
import { MOCK_SCHEDULES } from '../constants';
import { ChevronLeft, ChevronRight, CalendarClock, Moon, Sun, Clock, PartyPopper } from 'lucide-react';

interface ScheduleCalendarProps {
  currentUser: User;
  users: User[]; // All users (for Manager to select)
  schedules: DailySchedule[];
  holidays: Holiday[];
  onAssignSchedule: (userId: string, date: string, scheduleId: string) => void;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ currentUser, users, schedules, holidays, onAssignSchedule }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<string>(currentUser.id);

  const isManager = currentUser.roles.includes(Role.MANAGER) || currentUser.roles.includes(Role.ADMIN);
  
  // Helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
      const day = new Date(year, month, 1).getDay();
      return day === 0 ? 6 : day - 1; // Adjust for Monday start (0=Mon...6=Sun)
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = currentDate.toLocaleString('ro-RO', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDayClick = (day: number) => {
      if (!isManager && selectedUser !== currentUser.id) return; // Basic protection
      
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // If manager, cycle through schedules
      if (isManager) {
          const currentPlan = schedules.find(s => s.userId === selectedUser && s.date === dateStr);
          let nextSchIndex = -1;
          
          if (currentPlan) {
             const currentIndex = MOCK_SCHEDULES.findIndex(s => s.id === currentPlan.scheduleId);
             nextSchIndex = currentIndex + 1;
          } else {
             nextSchIndex = 0;
          }

          if (nextSchIndex >= MOCK_SCHEDULES.length) {
              // Reset to default (no explicit schedule -> assume Standard or remove entry)
               onAssignSchedule(selectedUser, dateStr, 'sch1'); // Force standard or cycle back
          } else {
              onAssignSchedule(selectedUser, dateStr, MOCK_SCHEDULES[nextSchIndex].id);
          }
      }
  };

  const getScheduleForDay = (day: number) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const plan = schedules.find(s => s.userId === selectedUser && s.date === dateStr);
      // Default to Standard if no plan exists, or show nothing
      if (plan) {
          return MOCK_SCHEDULES.find(s => s.id === plan.scheduleId);
      }
      return null;
  };

  const getHolidayForDay = (day: number) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return holidays.find(h => h.date === dateStr);
  };

  // Render
  const days = [];
  // Empty slots for days before 1st
  for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-28 bg-gray-50/50 border border-gray-100"></div>);
  }
  // Days
  for (let day = 1; day <= daysInMonth; day++) {
      const schedule = getScheduleForDay(day);
      const holiday = getHolidayForDay(day);
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
      
      days.push(
          <div 
            key={day} 
            onClick={() => handleDayClick(day)}
            className={`h-28 border border-gray-100 p-2 relative transition hover:bg-blue-50 cursor-pointer flex flex-col justify-between ${
                holiday ? 'bg-purple-50/60 hover:bg-purple-100' : (isToday ? 'bg-blue-50/30' : 'bg-white')
            }`}
          >
              <div className="flex justify-between items-start">
                  <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{day}</span>
                  {holiday && <PartyPopper size={14} className="text-purple-500" />}
              </div>

              {holiday && (
                  <div className="text-[10px] text-purple-700 font-bold leading-tight bg-white/50 p-1 rounded border border-purple-100 mb-1">
                      {holiday.name}
                  </div>
              )}

              {schedule ? (
                  <div className={`p-1 rounded text-[10px] border flex flex-col gap-0.5 items-center ${schedule.crossesMidnight ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                      {schedule.crossesMidnight ? <Moon size={10}/> : <Sun size={10}/>}
                      <span className="font-bold truncate w-full text-center">{schedule.name.split(' ')[0]}</span>
                      <span>{schedule.startTime}-{schedule.endTime}</span>
                  </div>
              ) : (
                  !holiday && <div className="mt-2 text-[10px] text-gray-300 text-center italic">Standard</div>
              )}
          </div>
      );
  }

  const teamUsers = isManager ? users.filter(u => u.companyId === currentUser.companyId) : [currentUser];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button onClick={prevMonth} className="p-1 hover:bg-white rounded shadow-sm transition"><ChevronLeft size={18}/></button>
                    <button onClick={nextMonth} className="p-1 hover:bg-white rounded shadow-sm transition"><ChevronRight size={18}/></button>
                </div>
                <h2 className="text-lg font-bold text-gray-800 capitalize flex items-center gap-2">
                    <CalendarClock size={20} className="text-blue-600"/> {monthName}
                </h2>
            </div>

            {isManager && (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Planificare pentru:</span>
                    <select 
                        value={selectedUser} 
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        {teamUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>

        {/* Legend */}
        <div className="bg-gray-50 px-4 py-2 text-xs flex gap-4 text-gray-500 flex-wrap">
             <div className="flex items-center gap-1">
                 <span className="w-2 h-2 rounded-full bg-purple-500"></span> Sărbătoare Legală
             </div>
             <div className="flex items-center gap-1">
                 <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Tură Noapte
             </div>
             <div className="flex items-center gap-1">
                 <span className="w-2 h-2 rounded-full bg-green-500"></span> Tură Standard
             </div>
             {isManager && <span className="ml-auto text-yellow-700 font-medium">Click pe zi pentru a schimba programul</span>}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 text-center border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <div className="py-2">Luni</div>
            <div className="py-2">Marți</div>
            <div className="py-2">Miercuri</div>
            <div className="py-2">Joi</div>
            <div className="py-2">Vineri</div>
            <div className="py-2 text-red-400">Sâmbătă</div>
            <div className="py-2 text-red-400">Duminică</div>
        </div>
        <div className="grid grid-cols-7">
            {days}
        </div>
    </div>
  );
};

export default ScheduleCalendar;