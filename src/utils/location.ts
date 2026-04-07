import { CITY_COORDS } from "@/contexts/CityContext";

/**
 * Calculates the distance between two points on Earth using the Haversine formula.
 */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds the name of the city nearest to the given coordinates among the pre-defined list.
 * Returns null if the list is empty or coordinates are invalid.
 */
export function findNearestCity(lat: number, lng: number): string | null {
  let nearestCity: string | null = null;
  let minDistance = Infinity;

  Object.entries(CITY_COORDS).forEach(([city, coords]) => {
    const distance = getDistance(lat, lng, coords.lat, coords.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city;
    }
  });

  // If minDistance is too large (e.g., > 100km), we could return null, 
  // but for now, we follow the requirement to just "put the name".
  return nearestCity;
}
