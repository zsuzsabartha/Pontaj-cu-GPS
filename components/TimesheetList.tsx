
import React from 'react';
import { Timesheet, ShiftStatus, BreakStatus, Office, User, BreakConfig } from '../types';
import { MapPin, CheckSquare, Edit2, AlertCircle, CloudOff, Info, User as UserIcon, Robot, Clock } from 'lucide-react';
import SmartTable, { Column } from './SmartTable';

interface TimesheetListProps {
  timesheets: Timesheet[];
  offices?: Office[]; 
  users?: User[]; // Needed for resolving names
  breakConfigs?: BreakConfig[]; // Needed to calculate net time (unpaid breaks)
  isManagerView?: boolean;
  onApproveBreak?: (timesheetId: string, breakId: string, status: BreakStatus) => void;
  onEditTimesheet?: (timesheet: Timesheet) => void;
}

const TimesheetList: React.FC<TimesheetListProps> = ({ timesheets, offices = [], users = [], breakConfigs = [], isManagerView, onApproveBreak, onEditTimesheet }) => {

  const calculateBalance = (ts: Timesheet, user?: User) => {
      if (!ts.endTime || !user) return null;

      const start = new Date(ts.startTime).getTime();
      const end = new Date(ts.endTime).getTime();
      const totalDuration = end - start;

      // Calculate Unpaid Breaks
      const unpaidBreakDuration = ts.breaks.reduce((acc, b) => {
          const config = breakConfigs.find(bc => bc.id === b.typeId);
          // Assuming breaks without end time are ignored for calculation or handled elsewhere
          if (config && !config.isPaid && b.endTime) {
              const bStart = new Date(b.startTime).getTime();
              const bEnd = new Date(b.endTime).getTime();
              return acc + (bEnd - bStart);
          }
          return acc;
      }, 0);

      const netWorkMs = totalDuration - unpaidBreakDuration;
      const contractMs = (user.contractHours || 8) * 60 * 60 * 1000;
      
      const balanceMs = netWorkMs - contractMs;
      
      const absMs = Math.abs(balanceMs);
      const h = Math.floor(absMs / 3600000);
      const m = Math.floor((absMs % 3600000) / 60000);
      
      const sign = balanceMs >= 0 ? '+' : '-';
      const color = balanceMs >= 0 ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200';
      const label = `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      // If deviation is less than 5 mins, treat as neutral
      if (absMs < 5 * 60000) {
          return <span className="text-xs font-mono text-gray-400 font-medium">Std.</span>;
      }

      return (
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${color}`}>
              {label}
          </span>
      );
  };

  const columns: Column<Timesheet>[] = [
    // 1. Employee Column (Manager Only)
    ...(isManagerView ? [{
        header: 'Angajat',
        accessor: (ts: Timesheet) => {
            const user = users.find(u => u.id === ts.userId);
            return user ? user.name : 'Unknown';
        },
        sortable: true,
        filterable: true,
        render: (ts: Timesheet) => {
            const user = users.find(u => u.id === ts.userId);
            return (
                <div className="flex items-center gap-2">
                    {user?.avatarUrl && <img src={user.avatarUrl} className="w-6 h-6 rounded-full border border-gray-200"/>}
                    <span className="font-bold text-gray-800">{user?.name || 'Unknown User'}</span>
                </div>
            )
        }
    } as Column<Timesheet>] : []),

    // 2. Date Column
    {
        header: 'Data',
        accessor: 'date',
        sortable: true,
        filterable: true,
        width: 'w-24'
    },

    // 3. Interval Column
    {
        header: 'Interval Orar',
        accessor: 'startTime', // dummy accessor for sorting
        sortable: true,
        render: (ts: Timesheet) => {
            const start = new Date(ts.startTime).toLocaleTimeString('ro-RO', {hour:'2-digit', minute:'2-digit'});
            const end = ts.endTime ? new Date(ts.endTime).toLocaleTimeString('ro-RO', {hour:'2-digit', minute:'2-digit'}) : '...';
            
            // Duration Calc
            let durationStr = '';
            if (ts.endTime) {
                const diff = new Date(ts.endTime).getTime() - new Date(ts.startTime).getTime();
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                durationStr = `${h}h ${m}m`;
            }

            return (
                <div>
                    <div className="font-mono text-gray-700 font-medium">{start} - {end}</div>
                    {durationStr && <div className="text-[10px] text-gray-400">{durationStr} Brut</div>}
                </div>
            );
        }
    },

    // 4. Balance Column (NEW)
    {
        header: 'Bilanț',
        accessor: 'id', // dummy
        render: (ts: Timesheet) => {
            if (ts.status === ShiftStatus.WORKING || ts.status === ShiftStatus.ON_BREAK) return <span className="text-xs text-blue-500 italic">În lucru...</span>;
            const user = users.find(u => u.id === ts.userId);
            return calculateBalance(ts, user);
        }
    },

    // 5. Location Column
    {
        header: 'Locație',
        accessor: (ts: Timesheet) => {
             if (ts.matchedOfficeId) return offices.find(o => o.id === ts.matchedOfficeId)?.name || 'Sediu';
             return 'Extern';
        },
        filterable: true,
        render: (ts: Timesheet) => {
            const matchedOffice = ts.matchedOfficeId ? offices.find(o => o.id === ts.matchedOfficeId) : null;
            const dist = ts.distanceToOffice !== undefined ? (ts.distanceToOffice > 1000 ? `${(ts.distanceToOffice/1000).toFixed(1)}km` : `${ts.distanceToOffice}m`) : null;
            
            if (!matchedOffice && !dist) return <span className="text-gray-400">-</span>;

            return (
                <div className="flex flex-col items-start">
                    {matchedOffice ? (
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border border-blue-100">
                            <MapPin size={10}/> {matchedOffice.name}
                        </span>
                    ) : (
                        <span className="text-gray-500 text-xs">Locație Externă</span>
                    )}
                    {dist && <span className="text-[10px] text-gray-400 mt-0.5 ml-1">la {dist} de sediu</span>}
                </div>
            );
        }
    },

    // 6. Status Column
    {
        header: 'Status',
        accessor: 'status',
        sortable: true,
        filterable: true,
        render: (ts: Timesheet) => {
            const isSyncing = ts.syncStatus === 'PENDING_SYNC';
            return (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        {ts.status === ShiftStatus.WORKING && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                        <span className={`text-xs font-bold ${ts.status === ShiftStatus.WORKING ? 'text-green-600' : 'text-gray-600'}`}>
                            {ts.status === ShiftStatus.WORKING ? 'ACTIV' : ts.status === ShiftStatus.ON_BREAK ? 'PAUZĂ' : 'FINALIZAT'}
                        </span>
                    </div>
                    
                    {/* Flags */}
                    {isSyncing && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1 rounded flex items-center gap-1 w-fit"><CloudOff size={8}/> Nesincronizat</span>}
                    {ts.isSystemAutoCheckout && (
                        <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded flex items-center gap-1 w-fit border border-red-200" title="Check-out realizat automat de sistem">
                            <AlertCircle size={8}/> AUTO-CHECKOUT
                        </span>
                    )}
                    {ts.isHoliday && <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded w-fit">Sărbătoare</span>}
                </div>
            )
        }
    },

    // 7. Actions (Breaks, Edit)
    {
        header: 'Acțiuni',
        accessor: 'id',
        width: 'w-32',
        render: (ts: Timesheet) => {
            const pendingBreaks = ts.breaks.filter(b => b.status === BreakStatus.PENDING).length;
            
            return (
                <div className="flex items-center justify-end gap-2">
                    {pendingBreaks > 0 && isManagerView && onApproveBreak && (
                        <button 
                            className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-2 py-1 rounded text-xs flex items-center gap-1 font-bold transition"
                            title="Confirmă Pauze"
                            onClick={() => {
                                // Auto approve first pending break for demo simplicity, or open modal in real app
                                const firstPending = ts.breaks.find(b => b.status === BreakStatus.PENDING);
                                if(firstPending) onApproveBreak(ts.id, firstPending.id, BreakStatus.APPROVED);
                            }}
                        >
                            <CheckSquare size={12}/> {pendingBreaks} Pauze
                        </button>
                    )}
                    
                    {onEditTimesheet && (
                        <button 
                            onClick={() => onEditTimesheet(ts)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title={isManagerView ? "Editează" : "Solicită Corecție"}
                        >
                            <Edit2 size={16}/>
                        </button>
                    )}
                </div>
            )
        }
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <UserIcon size={20} className="text-blue-600"/>
        Istoric Pontaje {isManagerView ? '(Toată Echipa)' : '(Personal)'}
      </h3>
      
      <SmartTable 
        data={timesheets}
        columns={columns}
        pageSize={isManagerView ? 15 : 10}
        className="shadow-md"
      />
    </div>
  );
};

export default TimesheetList;
