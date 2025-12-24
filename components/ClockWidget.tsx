
import React, { useState, useEffect } from 'react';
import { Play, Square, Coffee, MapPin, AlertTriangle, CalendarDays, Clock, Satellite, Briefcase, User as UserIcon, Utensils, Cigarette } from 'lucide-react';
import { getCurrentLocation, findNearestOffice } from '../services/geoService';
import { ShiftStatus, Coordinates, Office, User, BreakConfig } from '../types';

interface ClockWidgetProps {
  user: User;
  offices: Office[];
  currentStatus: ShiftStatus;
  breakConfigs: BreakConfig[]; // Added Prop
  onClockIn: (location: Coordinates, office: Office | null, dist: number) => void;
  onClockOut: (location: Coordinates) => void;
  onToggleBreak: (breakConfig?: BreakConfig, location?: Coordinates, dist?: number) => void; // Changed signature
}

const ClockWidget: React.FC<ClockWidgetProps> = ({ user, offices, currentStatus, breakConfigs, onClockIn, onClockOut, onToggleBreak }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nearestInfo, setNearestInfo] = useState<{ office: Office | null, distance: number } | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [showBreakSelector, setShowBreakSelector] = useState(false);

  // Get localized date string
  const todayDate = new Date().toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const todayDateCapitalized = todayDate.charAt(0).toUpperCase() + todayDate.slice(1);

  // Determine explicit status text and color
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

  // Simulate timer if working
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

  // When status changes to working, set start time (mocking persistent store for demo)
  useEffect(() => {
    if (currentStatus === ShiftStatus.WORKING && !startTime) {
      setStartTime(Date.now());
    } else if (currentStatus === ShiftStatus.NOT_STARTED) {
        setStartTime(null);
        setElapsedTime("00:00:00");
    }
  }, [currentStatus, startTime]);

  const getLocationSafe = async (): Promise<{coords: Coordinates, isMock: boolean}> => {
      try {
          const coords = await getCurrentLocation();
          return { coords, isMock: false };
      } catch (err) {
          if (user.requiresGPS) {
              if (confirm("Localizarea GPS a eșuat. Doriți să continuați folosind o locație simulată (Test Mode)?")) {
                  // Mock coords near the first office or default
                  const mock = offices.length > 0 ? offices[0].coordinates : { latitude: 44.4268, longitude: 26.1025 };
                  return { coords: mock, isMock: true };
              } else {
                  throw new Error("Este necesară activarea localizării.");
              }
          }
          return { coords: { latitude: 0, longitude: 0 }, isMock: true };
      }
  };

  const handleClockIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { coords } = await getLocationSafe();
      const { office, distance } = findNearestOffice(coords, offices);
      setNearestInfo({ office, distance });

      if (coords.latitude !== 0 && office && distance > office.radiusMeters + 500) { 
         if(!window.confirm(`Ești la ${distance}m de biroul ${office.name}. Confirmă start pontaj remote?`)) {
             setLoading(false);
             return;
         }
      }

      onClockIn(coords, office, distance);
    } catch (err: any) {
       setError(err.message || "Eroare localizare.");
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
        const { coords } = await getLocationSafe();
        onClockOut(coords);
    } catch (e) {
        // Fallback
        onClockOut({latitude: 0, longitude: 0});
    } finally {
        setLoading(false);
    }
  };

  const handleStartBreak = async (config: BreakConfig) => {
      setShowBreakSelector(false);
      setLoading(true);
      setError(null);
      try {
          const { coords } = await getLocationSafe();
          const { distance } = findNearestOffice(coords, offices);
          onToggleBreak(config, coords, distance);
      } catch (err: any) {
          setError(err.message || "Eroare localizare la start pauză.");
      } finally {
          setLoading(false);
      }
  };

  const handleEndBreak = async () => {
      setLoading(true);
      try {
          const { coords } = await getLocationSafe();
          const { distance } = findNearestOffice(coords, offices);
          onToggleBreak(undefined, coords, distance);
      } catch (err) {
          onToggleBreak(undefined, {latitude: 0, longitude: 0}, 0);
      } finally {
          setLoading(false);
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

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-auto border border-gray-100 relative overflow-hidden">
      {/* Decorative bg */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-50 rounded-full opacity-50 blur-xl"></div>
      
      {/* Header Info */}
      <div className="flex flex-col gap-4 mb-6 relative z-10">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-xl font-bold text-gray-800">Bună, {user.name.split(' ')[0]}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <CalendarDays size={14}/>
                    <span>{todayDateCapitalized}</span>
                </div>
            </div>
            
            {/* Explicit Status Badge */}
            <div className={`px-3 py-1 rounded-full border text-xs font-bold tracking-wide uppercase flex items-center gap-2 ${statusColor}`}>
                <div className={`w-2 h-2 rounded-full ${currentStatus === ShiftStatus.WORKING ? 'bg-green-500 animate-pulse' : 'bg-current'}`}></div>
                {statusText}
            </div>
        </div>
        
        {/* GPS Status Indicator for User */}
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

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 w-full">
            {currentStatus === ShiftStatus.NOT_STARTED || currentStatus === ShiftStatus.COMPLETED ? (
                 <button 
                 onClick={handleClockIn}
                 disabled={loading}
                 className="col-span-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-semibold transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-70"
               >
                 {loading ? 'Se localizează...' : <><Play size={24} /> START PONTAJ</>}
               </button>
            ) : (
                <>
                    {/* Break Logic */}
                    {showBreakSelector ? (
                        <div className="col-span-2 grid grid-cols-3 gap-2 animate-in fade-in zoom-in duration-200 bg-gray-50 p-2 rounded-lg border border-gray-200">
                             {breakConfigs.map(config => (
                                 <button 
                                    key={config.id}
                                    onClick={() => handleStartBreak(config)}
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
                            onClick={currentStatus === ShiftStatus.ON_BREAK ? handleEndBreak : () => setShowBreakSelector(true)}
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
            <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-lg text-sm w-full animate-pulse">
                <AlertTriangle size={16} /> {error}
            </div>
        )}

        {nearestInfo && currentStatus === ShiftStatus.WORKING && (
             <div className="mt-6 flex items-center gap-2 text-gray-500 text-xs bg-gray-50 px-3 py-1 rounded-full border">
                <MapPin size={12} />
                {nearestInfo.office ? `Locație: ${nearestInfo.office.name}` : 'Locație: Remote/Nedetectată'}
             </div>
        )}
      </div>
    </div>
  );
};

export default ClockWidget;
