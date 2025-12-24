import { Coordinates, Office } from '../types';

/**
 * Calculates the Haversine distance between two points in meters.
 */
export const getDistanceInMeters = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371e3; // Earth radius in meters
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

export const getCurrentLocation = (): Promise<Coordinates> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  });
};