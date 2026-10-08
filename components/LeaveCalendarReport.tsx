
import React, { useState } from 'react';
import { User, LeaveRequest, LeaveConfig, LeaveStatus, Holiday } from '../types';
import { ChevronLeft, ChevronRight, Calendar, User as UserIcon } from 'lucide-react';

interface LeaveCalendarReportProps {
    users: User[];
    leaves: LeaveRequest[];
    leaveConfigs: LeaveConfig[];
    holidays: Holiday[];
}

const LeaveCalendarReport: React.FC<LeaveCalendarReportProps> = ({ users, leaves, leaveConfigs, holidays }) => {
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
        const dayObj = new Date(dateStr);
        const dayOfWeek = dayObj.getDay(); // 0 = Sun, 6 = Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidays.some(h => h.date === dateStr);

        // Specification: Don't generate rows for weekend and holidays
        if (isWeekend || isHoliday) return [];

        return leaves.filter(l => {
            // Check if dateStr is within range [startDate, endDate]
            // Filter out Rejected AND Cancelled
            return dateStr >= l.startDate && dateStr <= l.endDate && l.status !== LeaveStatus.REJECTED && l.status !== LeaveStatus.CANCELLED;
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

        const holiday = holidays.find(h => h.date === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);

        days.push(
            <div key={day} className={`h-32 border p-1 flex flex-col transition-colors ${isToday ? 'bg-emerald-50/30 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : (isWeekend ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800')} ${holiday ? 'bg-red-50/50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40' : ''}`}>
                <div className="flex justify-between items-start mb-1 px-1">
                    <span className={`text-xs font-semibold ${isToday ? 'text-emerald-600 dark:text-emerald-400' : (holiday || isWeekend ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400')}`}>{day}</span>
                    {dayLeaves.length > 0 && <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{dayLeaves.length}</span>}
                </div>

                {/* If it's a holiday, show it, otherwise show leaves */}
                {holiday ? (
                    <div className="flex items-center justify-center h-full">
                        <span className="text-[9px] text-red-400 dark:text-red-500 font-bold uppercase text-center rotate-45">{holiday.name}</span>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                        {dayLeaves.map(leave => (
                            <div
                                key={leave.id}
                                className={`text-[10px] px-1.5 py-1 rounded border flex flex-col shadow-sm transition-colors ${leave.status === LeaveStatus.PENDING
                                        ? 'bg-yellow-50 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-900 text-yellow-800 dark:text-yellow-300'
                                        : 'bg-purple-50 dark:bg-purple-900/40 border-purple-200 dark:border-purple-900 text-purple-800 dark:text-purple-300'
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
                )}
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 transition-colors">
                <h2 className="font-bold text-gray-700 dark:text-gray-100 flex items-center gap-2">
                    <Calendar className="text-emerald-600 dark:text-emerald-400" /> Raport Concedii & Absențe
                </h2>
                <div className="flex items-center gap-4">
                    <div className="flex bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1 shadow-sm transition-colors">
                        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-600 dark:text-gray-300"><ChevronLeft size={18} /></button>
                        <span className="px-3 font-bold text-sm flex items-center min-w-[140px] justify-center text-gray-800 dark:text-gray-200">{monthName}</span>
                        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-600 dark:text-gray-300"><ChevronRight size={18} /></button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-7 text-center border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/80 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">
                <div className="py-2">Luni</div>
                <div className="py-2">Marți</div>
                <div className="py-2">Miercuri</div>
                <div className="py-2">Joi</div>
                <div className="py-2">Vineri</div>
                <div className="py-2 text-red-400 dark:text-red-500">Sâmbătă</div>
                <div className="py-2 text-red-400 dark:text-red-500">Duminică</div>
            </div>
            <div className="grid grid-cols-7 border-l border-gray-200 dark:border-gray-800 transition-colors">
                {days}
            </div>
            <div className="p-2 bg-gray-50 dark:bg-gray-800/50 flex gap-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 transition-colors">
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-50 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-800 rounded"></span> Concediu Aprobat</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-50 dark:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-900 rounded"></span> În Așteptare</div>
            </div>
        </div>
    );
};

export default LeaveCalendarReport;
