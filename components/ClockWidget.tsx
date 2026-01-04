import React, { useState, useEffect } from 'react';
import { Play, Square, Coffee, MapPin, AlertTriangle, CalendarDays, Clock, Satellite, Briefcase, User as UserIcon, Utensils, Cigarette, Home, RefreshCw, CheckCircle, XCircle, PartyPopper, CalendarOff } from 'lucide-react';
import { getCurrentLocation, findNearestOffice } from '../services/geoService';
import { ShiftStatus, Coordinates, Office, User, BreakConfig, Holiday, LeaveRequest, LeaveStatus } from '../types';

interface ClockWidgetProps {
  user: User;
  companyName?: string;
  offices: Office[];
  currentStatus: ShiftStatus;
  breakConfigs: BreakConfig[];
  holidays: Holiday[]; 
  activeLeaveRequest?: LeaveRequest; // New prop
  onClockIn: (location: Coordinates, office: Office | null, dist: number) => void;
  onClockOut: (location: Coordinates) => void;
  onToggleBreak: (breakConfig?: BreakConfig, location?: Coordinates, dist?: number) => void;
}

const ClockWidget: React.FC<ClockWidgetProps> = ({ user, companyName, offices, currentStatus, breakConfigs, holidays, activeLeaveRequest, onClockIn, onClockOut, onToggleBreak }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMockOption, setShowMockOption] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [showBreakSelector, setShowBreakSelector] = useState(false);
  
  // States for confirmation UI
  const [confirmData, setConfirmData] = useState<{ coords: Coordinates, office: Office, distance: number } | null>(null);
  const [isRemoteWork, setIsRemoteWork] = useState(false);

  const todayDateObj = new Date();
  const todayDateStr = todayDateObj.toISOString().split('T')[0];
  const todayDate = todayDateObj.toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const todayDateCapitalized = todayDate.charAt(0).toUpperCase() + todayDate.slice(1);

  // Check for Holiday
  const todayHoliday = holidays.find(h => h.date === todayDateStr);

  let statusText = "NEPONTAT";
  let statusColor = "bg-gray-100 text-gray-500 border-gray-200";
  
  if (currentStatus === ShiftStatus.WORKING) {
      statusText = "PONTAT";
      statusColor = "bg-green-100 text-green-700 border-green-200";
  } else if (currentStatus === ShiftStatus.ON_BREAK) {
      statusText = "ÎN PAUZĂ";
      statusColor = "bg-orange-100 text-orange-700 border-orange-200";
  } else if (currentStatus === ShiftStatus.COMPLETED) {
      statusText = "ZI ÎNCHEIATĂ";
      statusColor = "bg-blue-100 text-blue-700 border-blue-200";
  }

  useEffect(() => {
    let interval: any;
    if (currentStatus === ShiftStatus.WORKING && startTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const diff = now - startTime;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentStatus, startTime]);

  useEffect(() => {
    if (currentStatus === ShiftStatus.WORKING && !startTime) {
      setStartTime(Date.now());
    } else if (currentStatus === ShiftStatus.NOT_STARTED) {
        setStartTime(null);
        setElapsedTime("00:00:00");
    }
  }, [currentStatus, startTime]);

  const handleClockIn = async () => {
    setLoading(true);
    setError(null);
    setConfirmData(null);
    setShowMockOption(false);
    
    try {
        if (isRemoteWork) {
            // Bypass strict location
            const coords = await getCurrentLocation().catch(() => ({ latitude: 0, longitude: 0 }));
            onClockIn(coords, null, 0);
            return;
        }

        const coords = await getCurrentLocation();
        const { office, distance } = findNearestOffice(coords, offices);

        if (office && distance > office.radiusMeters + 500) {
            // Instead of window.confirm, set state to show UI
            setConfirmData({ coords, office, distance });
            setLoading(false); // Stop loading to show UI
            return;
        } 
        
        onClockIn(coords, office, distance);

    } catch (err: any) {
        console.error("GPS Error:", err);
        setError(err.message || 'Eroare localizare');
        setShowMockOption(true);
    } finally {
        // If we are showing confirmation, don't stop loading yet (handled above)
        // Otherwise stop
        if (!confirmData) setLoading(false);
    }
  };

  const handleConfirmLocation = () => {
      if (confirmData) {
          onClockIn(confirmData.coords, confirmData.office, confirmData.distance);
          setConfirmData(null);
      }
  };

  const handleCancelLocation = () => {
      setConfirmData(null);
  };

  const handleForceMockClockIn = () => {
     const mockCoords = offices.length > 0 ? offices[0].coordinates : { latitude: 44.4268, longitude: 26.1025 };
     const { office, distance } = findNearestOffice(mockCoords, offices);
     onClockIn(mockCoords, office, distance);
     setShowMockOption(false);
     setError(null);
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
        const coords = await getCurrentLocation().catch(() => ({latitude: 0, longitude: 0}));
        onClockOut(coords);
    } finally {
        setLoading(false);
    }
  };

  const handleToggleBreak = async (config?: BreakConfig) => {
      setLoading(true);
      try {
          const coords = await getCurrentLocation().catch(() => ({latitude: 0, longitude: 0}));
          const { distance } = findNearestOffice(coords, offices);
          onToggleBreak(config, coords, distance);
      } finally {
          setLoading(false);
          setShowBreakSelector(false);
      }
  };

  const getIcon = (iconName?: string) => {
      switch(iconName) {
          case 'briefcase': return <Briefcase size={18} className="mb-1"/>;
          case 'utensils': return <Utensils size={18} className="mb-1"/>;
          case 'cigarette': return <Cigarette size={18} className="mb-1"/>;
          default: return <Coffee size={18} className="mb-1"/>;
      }
  }

  // --- CONFIRMATION SCREEN ---
  if (confirmData) {
      return (
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-auto border-2 border-orange-100">
             <div className="flex flex-col items-center text-center gap-4">
                 <div className="bg-orange-100 p-4 rounded-full text-orange-600">
                     <MapPin size={32} />
                 </div>
                 <h3 className="text-lg font-bold text-gray-800">Confirmare Locație</h3>
                 <p className="text-sm text-gray-600">
                     Ești la o distanță de <span className="font-bold">{confirmData.distance}m</span> de sediul <span className="font-bold">{confirmData.office.name}</span>.
                 </p>
                 <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                     Această distanță depășește limita permisă. Ești sigur că vrei să pontezi de aici?
                 </p>
                 <div className="grid grid-cols-2 gap-3 w-full mt-2">
                     <button onClick={handleCancelLocation} className="py-3 rounded-xl border border-gray-200 font-medium text-gray-600 hover:bg-gray-50">
                        Anulează
                     </button>
                     <button onClick={handleConfirmLocation} className="py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 shadow-md">
                        Da, Sunt Aici
                     </button>
                 </div>
             </div>
        </div>
      );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-auto border border-gray-100 relative overflow-hidden">
      {/* Decorative bg */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-50 rounded-full opacity-50 blur-xl"></div>
      
      {/* Holiday Banner */}
      {todayHoliday && (
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold p-2 -mx-6 -mt-6 mb-4 flex items-center justify-center gap-2 shadow-inner relative z-20">
              <PartyPopper size={14} className="animate-bounce"/>
              Sărbătoare Legală: {todayHoliday.name}
          </div>
      )}

      {/* Leave Request Banner */}
      {activeLeaveRequest && (
          <div className={`text-white text-xs font-bold p-2 -mx-6 -mt-6 mb-4 flex flex-col items-center justify-center gap-1 shadow-inner relative z-20 ${
              activeLeaveRequest.status === LeaveStatus.APPROVED ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 
              activeLeaveRequest.status === LeaveStatus.REJECTED ? 'bg-gradient-to-r from-red-500 to-rose-600' : 
              'bg-gradient-to-r from-orange-400 to-amber-500'
          }`}>
              <div className="flex items-center gap-2">
                  {activeLeaveRequest.status === LeaveStatus.APPROVED ? <CheckCircle size={14}/> : 
                   activeLeaveRequest.status === LeaveStatus.REJECTED ? <XCircle size={14}/> : <CalendarOff size={14}/>}
                  <span>Concediu: {activeLeaveRequest.typeName}</span>
              </div>
              <span className="opacity-90 bg-black/10 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
                  Status: {activeLeaveRequest.status === LeaveStatus.PENDING ? 'În Așteptare' : activeLeaveRequest.status === LeaveStatus.APPROVED ? 'Aprobat' : 'Respins'}
              </span>
          </div>
      )}
      
      {/* Header Info */}
      <div className="flex flex-col gap-4 mb-6 relative z-10">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-xl font-bold text-gray-800">Bună, {user.name.split(' ')[0]}</h2>
                <div className="flex flex-col mt-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <CalendarDays size={14}/>
                        <span>{todayDateCapitalized}</span>
                    </div>
                    {companyName && (
                        <div className="flex items-center gap-1 text-xs text-blue-600 font-medium mt-1">
                            <Briefcase size={10} /> {companyName}
                        </div>
                    )}
                </div>
            </div>
            
            <div className={`px-3 py-1 rounded-full border text-xs font-bold tracking-wide uppercase flex items-center gap-2 ${statusColor}`}>
                <div className={`w-2 h-2 rounded-full ${currentStatus === ShiftStatus.WORKING ? 'bg-green-500 animate-pulse' : 'bg-current'}`}></div>
                {statusText}
            </div>
        </div>
        
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
             <Satellite size={12} className={user.requiresGPS ? "text-blue-500" : "text-gray-300"}/>
             {user.requiresGPS ? "Localizare obligatorie" : "Localizare opțională"}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-4 relative z-10">
        <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-widest mb-1">
            <Clock size={12}/> Timp Lucrat
        </div>
        <div className="text-5xl font-mono font-semibold text-gray-700 tracking-wider mb-8">
          {elapsedTime}
        </div>
        
        {/* Remote Work Toggle */}
        {currentStatus === ShiftStatus.NOT_STARTED && (
            <label className="flex items-center gap-2 mb-6 cursor-pointer bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 hover:bg-blue-100 transition w-full justify-center">
                <input 
                    type="checkbox"
                    checked={isRemoteWork}
                    onChange={(e) => setIsRemoteWork(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Home size={16} className="text-blue-500" />
                    Lucrez de acasă / Remote
                </span>
            </label>
        )}

        {/* Buttons Grid */}
        <div className="grid grid-cols-2 gap-4 w-full">
            {currentStatus === ShiftStatus.NOT_STARTED || currentStatus === ShiftStatus.COMPLETED ? (
                 <button 
                 onClick={handleClockIn}
                 disabled={loading || (activeLeaveRequest?.status === LeaveStatus.APPROVED && !activeLeaveRequest?.typeName.includes('Delegatie'))} // Disable if approved leave (unless business trip)
                 className={`col-span-2 flex items-center justify-center gap-2 text-white py-4 rounded-xl font-semibold transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale ${isRemoteWork ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
               >
                 {loading ? (
                     <><RefreshCw className="animate-spin" size={24}/> SE LOCALIZEAZĂ...</>
                 ) : (
                     isRemoteWork ? <><Home size={24}/> START REMOTE</> : <><Play size={24} /> START PONTAJ</>
                 )}
               </button>
            ) : (
                <>
                    {/* Break Logic */}
                    {showBreakSelector ? (
                        <div className="col-span-2 grid grid-cols-3 gap-2 animate-in fade-in zoom-in duration-200 bg-gray-50 p-2 rounded-lg border border-gray-200">
                             {breakConfigs.map(config => (
                                 <button 
                                    key={config.id}
                                    onClick={() => handleToggleBreak(config)}
                                    className={`flex flex-col items-center justify-center border p-2 rounded-lg text-xs font-bold transition h-20 ${config.isPaid ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700' : 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700'}`}
                                 >
                                     {getIcon(config.icon)}
                                     <span className="text-center leading-tight">{config.name}</span>
                                     <span className="text-[9px] opacity-75 mt-1">{config.isPaid ? '(Plătit)' : '(Neplătit)'}</span>
                                 </button>
                             ))}
                             
                             <button 
                                onClick={() => setShowBreakSelector(false)}
                                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg flex items-center justify-center text-xs font-bold"
                             >
                                 ANULEAZĂ
                             </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => currentStatus === ShiftStatus.ON_BREAK ? handleToggleBreak() : setShowBreakSelector(true)}
                            disabled={loading}
                            className={`flex items-center justify-center gap-2 py-4 rounded-xl font-semibold transition-all shadow-sm border-2 ${currentStatus === ShiftStatus.ON_BREAK ? 'bg-orange-100 border-orange-200 text-orange-700 shadow-inner' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                            <Coffee size={20} />
                            {loading ? '...' : (currentStatus === ShiftStatus.ON_BREAK ? 'STOP PAUZĂ' : 'START PAUZĂ')}
                        </button>
                    )}

                    <button 
                        onClick={handleClockOut}
                        disabled={loading || currentStatus === ShiftStatus.ON_BREAK}
                        className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl font-semibold transition-all shadow-lg shadow-red-200 active:scale-95 disabled:opacity-50"
                    >
                        <Square size={20} /> STOP
                    </button>
                </>
            )}
        </div>

        {error && (
            <div className="mt-4 flex flex-col items-center gap-2 w-full animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-lg text-sm w-full font-medium border border-red-100">
                    <AlertTriangle size={16} className="shrink-0" /> {error}
                </div>
                
                {/* Fallback Option */}
                {showMockOption && (
                    <button 
                        onClick={handleForceMockClockIn}
                        className="text-xs bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition w-full flex items-center justify-center gap-2"
                    >
                        <Satellite size={14}/> Forțează Start (Test Mode / Locație Simulată)
                    </button>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default ClockWidget;