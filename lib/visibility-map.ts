// Wallops Island launch site
const WALLOPS_LAT = 37.8339
const WALLOPS_LON = -75.4877

// NASA's Wallops visibility map. The JPEG is for emails (Outlook can't display WebP).
export const VISIBILITY_MAP_PATH = "/images/wallops-visibility-map.webp"
export const VISIBILITY_MAP_EMAIL_PATH = "/images/wallops-visibility-map.jpg"

// Sun altitude in degrees at Wallops, using the low-precision solar position algorithm from the
// Astronomical Almanac (good to ~0.1° over this century)
export function sunAltitude(time: Date): number {
  const rad = Math.PI / 180
  const n = time.getTime() / 86400000 + 2440587.5 - 2451545.0 // days since J2000.0

  const meanLongitude = (280.46 + 0.9856474 * n) % 360
  const meanAnomaly = ((357.528 + 0.9856003 * n) % 360) * rad
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * rad
  const obliquity = (23.439 - 0.0000004 * n) * rad

  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude))
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude))

  const siderealTime = (280.46061837 + 360.98564736629 * n) % 360
  const hourAngle = (siderealTime + WALLOPS_LON) * rad - rightAscension

  const lat = WALLOPS_LAT * rad
  const altitude = Math.asin(
    Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle),
  )
  return altitude / rad
}

// Night launch if the sun is at least 6° below the horizon (past civil twilight)
export function isNightLaunch(netTime: string): boolean {
  const time = new Date(netTime)
  if (Number.isNaN(time.getTime())) return false
  return sunAltitude(time) <= -6
}
