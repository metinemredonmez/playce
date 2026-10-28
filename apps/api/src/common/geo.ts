export type LatLng = { lat: number; lng: number };

/** "41.03,28.97" → {lat, lng}; geçersizse null. */
export function parseLatLng(s: string): LatLng | null {
  const [lat, lng] = s.split(',').map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** İki nokta arası kuş uçuşu km (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Merkez etrafında yarıçapı kapsayan enlem/boylam kutusu (indeksli ön filtre; kesin mesafe sonra). */
export function boundingBox(c: LatLng, radiusKm: number) {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.cos((c.lat * Math.PI) / 180));
  return { lat: { gte: c.lat - dLat, lte: c.lat + dLat }, lng: { gte: c.lng - dLng, lte: c.lng + dLng } };
}
