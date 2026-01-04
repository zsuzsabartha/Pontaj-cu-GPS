import { Coordinates, Office } from '../types';

export const getDistanceInMeters = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371e3; 
  const q1 = (coord1.latitude * Math.PI) / 180;
  const q2 = (coord2.latitude * Math.PI) / 180;
  const dq = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dl = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dq / 2) * Math.sin(dq / 2) +
    Math.cos(q1) * Math.cos(q2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

export const findNearestOffice = (currentLocation: Coordinates, offices: Office[]): { office: Office | null, distance: number } => {
  if (offices.length === 0) return { office: null, distance: Infinity };

  let minDistance = Infinity;
  let nearest: Office | null = null;

  for (const office of offices) {
    const dist = getDistanceInMeters(currentLocation, office.coordinates);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = office;
    }
  }

  return { office: nearest, distance: minDistance };
};

// Internal helper for raw position
const getPosition = (highAccuracy: boolean, timeout: number): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            return reject(new Error('Geolocation not supported'));
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
            enableHighAccuracy: highAccuracy, 
            timeout: timeout, 
            maximumAge: 0 
        });
    });
};

/**
 * Tries to get location using Low Accuracy first (fast & reliable).
 * If explicitly needed, could switch to High Accuracy.
 */
export const getCurrentLocation = async (): Promise<Coordinates> => {
    try {
        // Attempt 1: Low Accuracy (Default as requested)
        // High accuracy often fails indoors or times out. Low accuracy uses Wifi/Cell towers.
        console.log("Acquiring GPS (Low Accuracy Mode)...");
        const pos = await getPosition(false, 15000); // 15s timeout
        return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch (error) {
        console.warn("Low Accuracy GPS failed, trying High Accuracy backup...");
        try {
            // Attempt 2: High Accuracy as backup
            const pos = await getPosition(true, 10000);
            return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        } catch (finalError: any) {
            let msg = 'Eroare localizare.';
            if (finalError.code === 1) msg = 'Permisiune GPS refuzată.';
            else if (finalError.code === 2) msg = 'Semnal GPS indisponibil.';
            else if (finalError.code === 3) msg = 'Timeout GPS.';
            throw new Error(msg);
        }
    }
};