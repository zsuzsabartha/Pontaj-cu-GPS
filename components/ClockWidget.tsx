import React, { useState, useEffect } from 'react';
import { Play, Square, Coffee, MapPin, AlertTriangle } from 'lucide-react';
import { getCurrentLocation, findNearestOffice } from '../services/geoService';
import { MOCK_OFFICES } from '../constants';
import { ShiftStatus, Coordinates, Office, User } from '../types';

interface ClockWidgetProps {
  user: User;
  currentStatus: ShiftStatus;
  onClockIn: (location: Coordinates, office: Office | null, dist: number) => void;
  onClockOut: (location: Coordinates) => void;
  onToggleBreak: () => void;
}

const ClockWidget: React.FC<ClockWidgetProps> = ({ user, currentStatus, onClockIn, onClockOut, onToggleBreak }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nearestInfo, setNearestInfo] = useState<{ office: Office | null, distance: number } | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");
  const [startTime, setStartTime] = useState<number | null>(null);

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

  const handleClockIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const coords = await getCurrentLocation();
      const { office, distance } = findNearestOffice(coords, MOCK_OFFICES);
      
      setNearestInfo({ office, distance });

      // Geo-fencing logic (soft check for demo)
      if (office && distance > office.radiusMeters + 500) { // 500m buffer
         if(!window.confirm(`Ești la ${distance}m de biroul ${office.name}. Confirmă start pontaj remote?`)) {
             setLoading(false);
             return;
         }
      }

      onClockIn(coords, office, distance);
    } catch (err) {
      setError("Te rugăm să permiți localizarea pentru a ponta.");
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
        const coords = await getCurrentLocation(); // Get exit location
        onClockOut(coords);
    } catch (e) {
        // Allow clock out even if GPS fails, but warn
        alert("Atenție: Nu am putut prelua locația la plecare.");
        onClockOut({latitude: 0, longitude: 0});
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-auto border border-gray-100 relative overflow-hidden">
      {/* Decorative bg */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-50 rounded-full opacity-50 blur-xl"></div>
      
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-xl font-bold text-gray-800">Bună, {user.name.split(' ')[0]}</h2>
           <p className="text-sm text-gray-500">{new Date().toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${currentStatus === ShiftStatus.WORKING ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
      </div>

      <div className="flex flex-col items-center justify-center py-4">
        <div className="text-5xl font-mono font-semibold text-gray-700 tracking-wider mb-8">
          {elapsedTime}
        </div>

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
                    <button 
                        onClick={onToggleBreak}
                        className={`flex items-center justify-center gap-2 py-4 rounded-xl font-semibold transition-all shadow-sm border-2 ${currentStatus === ShiftStatus.ON_BREAK ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >
                        <Coffee size={20} />
                        {currentStatus === ShiftStatus.ON_BREAK ? 'Stop Pauză' : 'Pauză'}
                    </button>
                    <button 
                        onClick={handleClockOut}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl font-semibold transition-all shadow-lg shadow-red-200 active:scale-95"
                    >
                        <Square size={20} /> STOP
                    </button>
                </>
            )}
        </div>

        {error && (
            <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-lg text-sm w-full">
                <AlertTriangle size={16} /> {error}
            </div>
        )}

        {nearestInfo && currentStatus === ShiftStatus.WORKING && (
             <div className="mt-6 flex items-center gap-2 text-gray-500 text-xs bg-gray-50 px-3 py-1 rounded-full border">
                <MapPin size={12} />
                {nearestInfo.office ? `Birou apropiat: ${nearestInfo.office.name} (${nearestInfo.distance}m)` : 'Lucru Remote'}
             </div>
        )}
      </div>
    </div>
  );
};

export default ClockWidget;