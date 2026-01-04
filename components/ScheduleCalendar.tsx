
import React, { useState } from 'react';
import { DailySchedule, WorkSchedule, User, Role, Holiday } from '../types';
import { MOCK_SCHEDULES, isDateInLockedPeriod } from '../constants';
import { ChevronLeft, ChevronRight, CalendarClock, Moon, Sun, Clock, PartyPopper, X, Check, Trash2, Edit, ShieldCheck, Lock } from 'lucide-react';

interface ScheduleCalendarProps {
  currentUser: User;
  users: User[]; // All users (for Manager to select)
  schedules: DailySchedule[];
  holidays: Holiday[];
  lockedDate: string; // Passed from App state
  onAssignSchedule: (userId: string, date: string, scheduleId: string) => void;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ currentUser, users, schedules, holidays, lockedDate, onAssignSchedule }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<string>(currentUser.id);
  const [selectionModal, setSelectionModal] = useState<{ isOpen: boolean, dateStr: string, day: number } | null>(null);

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

  const getHolidayForDay = (day: number) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return holidays.find(h => h.date === dateStr);
  };

  const handleDayClick = (day: number) => {
      if (!isManager) return; 
      
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setSelectionModal({ isOpen: true, dateStr, day });
  };

  const handleScheduleSelect = (scheduleId: string) => {
      if (selectionModal) {
          onAssignSchedule(selectedUser, selectionModal.dateStr, scheduleId);
          setSelectionModal(null);
      }
  };

  const getScheduleForDay = (day: number) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const plan = schedules.find(s => s.userId === selectedUser && s.date === dateStr);
      if (plan && plan.scheduleId) {
          return MOCK_SCHEDULES.find(s => s.id === plan.scheduleId);
      }
      return null;
  };

  const teamUsers = isManager ? users.filter(u => u.companyId === currentUser.companyId) : [currentUser];
  const targetUserObj = users.find(u => u.id === selectedUser);

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
            className={`h-28 border p-2 relative transition group flex flex-col ${
                isManager ? 'hover:bg-blue-50 cursor-pointer' : 'cursor-default'
            } ${
                holiday 
                  ? 'bg-red-50 border-red-200 shadow-inner' // Stronger Holiday Style
                  : (isToday ? 'bg-blue-50/30 border-blue-200' : 'bg-white border-gray-100')
            }`}
          >
              <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : (holiday ? 'text-red-600' : 'text-gray-700')}`}>{day}</span>
                  {holiday && <PartyPopper size={14} className="text-red-500 animate-pulse" />}
              </div>

              {holiday && (
                  <div className="text-[10px] text-red-800 font-bold leading-tight bg-white/80 p-1.5 rounded border border-red-100 mb-1 shadow-sm text-center">
                      {holiday.name}
                  </div>
              )}

              {schedule ? (
                  <div className={`p-1 rounded text-[10px] border flex flex-col gap-0.5 items-center mt-1 w-full ${schedule.crossesMidnight ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                      {schedule.crossesMidnight ? <Moon size={10}/> : <Sun size={10}/>}
                      <span className="font-bold truncate w-full text-center">{schedule.name.split(' ')[0]}</span>
                      <span>{schedule.startTime}-{schedule.endTime}</span>
                  </div>
              ) : (
                  !holiday && <div className="mt-2 text-[10px] text-gray-300 text-center italic">Standard</div>
              )}

              {isManager && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                      <Edit size={20} className="text-blue-600"/>
                  </div>
              )}
          </div>
      );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
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
                        className="border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
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
                 <span className="w-2 h-2 rounded-full bg-red-500"></span> Sărbătoare Legală
             </div>
             <div className="flex items-center gap-1">
                 <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Tură Noapte
             </div>
             <div className="flex items-center gap-1">
                 <span className="w-2 h-2 rounded-full bg-green-500"></span> Tură Standard
             </div>
             {isManager && <span className="ml-auto text-blue-600 font-medium">Administrator Mode Activ</span>}
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

        {/* Schedule Selection Modal */}
        {selectionModal && targetUserObj && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">Modificare Program</h3>
                            <p className="text-xs text-blue-100 opacity-90">
                                {targetUserObj.name} - {selectionModal.dateStr}
                            </p>
                        </div>
                        <button onClick={() => setSelectionModal(null)} className="p-1 hover:bg-white/20 rounded"><X size={20}/></button>
                    </div>
                    
                    <div className="p-4 space-y-2">
                        {(() => {
                            const isLocked = isDateInLockedPeriod(selectionModal.dateStr, lockedDate);
                            const holiday = getHolidayForDay(selectionModal.day);
                            
                            if (isLocked) {
                                return (
                                    <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-800 text-sm mb-3 flex items-center gap-3">
                                        <Lock size={24} className="shrink-0"/>
                                        <div>
                                            <p className="font-bold">Perioadă Închisă (Contabilitate)</p>
                                            <p className="text-xs mt-1">Nu se mai pot efectua modificări de program pentru această dată.</p>
                                        </div>
                                    </div>
                                );
                            }

                            const isEssentialStaff = targetUserObj.allowedScheduleIds.some(id => 
                                MOCK_SCHEDULES.find(s => s.id === id)?.crossesMidnight
                            );

                            if (holiday) {
                                return (
                                    <div className={`p-3 rounded-lg border text-xs mb-3 flex items-start gap-2 ${isEssentialStaff ? 'bg-indigo-50 border-indigo-100 text-indigo-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                                        {isEssentialStaff ? <ShieldCheck size={16} className="shrink-0 mt-0.5"/> : <PartyPopper size={16} className="shrink-0 mt-0.5"/>}
                                        <div>
                                            <p className="font-bold">Sărbătoare Legală: {holiday.name}</p>
                                            <p className="opacity-80 mt-1">
                                                {isEssentialStaff 
                                                    ? "Personal Operativ (Pază/Ture): Se permite alocarea oricărui tip de program (Zi/Noapte)." 
                                                    : "Personal Standard: Nu se lucrează în zilele de sărbătoare."}
                                            </p>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* Hide selection if locked */}
                        {!isDateInLockedPeriod(selectionModal.dateStr, lockedDate) && (
                            <>
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Selectați Orarul:</p>
                                
                                {MOCK_SCHEDULES.map(schedule => {
                                    const holiday = getHolidayForDay(selectionModal.day);
                                    const isAllowedUser = targetUserObj.allowedScheduleIds.includes(schedule.id);
                                    const isEssentialStaff = targetUserObj.allowedScheduleIds.some(id => 
                                        MOCK_SCHEDULES.find(s => s.id === id)?.crossesMidnight
                                    );

                                    let isAllowedDay = true;
                                    if (holiday && !isEssentialStaff) {
                                        isAllowedDay = false; // Standard staff blocked on holidays
                                    }
                                    
                                    const isDisabled = !isAllowedUser || !isAllowedDay;
                                    
                                    const currentPlan = schedules.find(s => s.userId === selectedUser && s.date === selectionModal.dateStr);
                                    const isActive = currentPlan?.scheduleId === schedule.id;

                                    return (
                                        <button
                                            key={schedule.id}
                                            onClick={() => !isDisabled && handleScheduleSelect(schedule.id)}
                                            disabled={isDisabled}
                                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition ${
                                                isDisabled 
                                                    ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed grayscale opacity-60' 
                                                    : (isActive ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50')
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${schedule.crossesMidnight ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>
                                                    {schedule.crossesMidnight ? <Moon size={16}/> : <Sun size={16}/>}
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold text-sm">{schedule.name}</p>
                                                    <p className="text-xs opacity-70">{schedule.startTime} - {schedule.endTime}</p>
                                                </div>
                                            </div>
                                            {isActive && <Check size={18} className="text-blue-600"/>}
                                            {isDisabled && <span className="text-[10px] italic">Indisponibil</span>}
                                        </button>
                                    );
                                })}

                                <div className="border-t border-gray-100 my-2 pt-2">
                                    <button 
                                        onClick={() => handleScheduleSelect("")}
                                        className="w-full flex items-center justify-center gap-2 p-3 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition"
                                    >
                                        <Trash2 size={16}/> Șterge Program (Zi Liberă / Standard)
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default ScheduleCalendar;
