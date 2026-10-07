/**
 * Great-circle distance between two coordinates using the Haversine formula.
 * Returns distance in kilometres.
 */
export const haversineKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export type Coordinate = { latitude: number; longitude: number };

export const sortByProximity = <T extends Coordinate>(
  origin: { latitude: number; longitude: number },
  items: T[],
): Array<T & { distanceKm: number }> => {
  return items
    .map((item) => ({
      ...item,
      distanceKm: haversineKm(
        origin.latitude,
        origin.longitude,
        item.latitude,
        item.longitude,
      ),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
};