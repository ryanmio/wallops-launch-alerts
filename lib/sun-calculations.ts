import { getWallopsLocation } from "./launch-library"

// Sun position calculations based on astronomical formulas
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

function toDegrees(radians: number): number {
  return radians * (180 / Math.PI)
}

// Calculate Julian day number
function getJulianDay(date: Date): number {
  const a = Math.floor((14 - (date.getMonth() + 1)) / 12)
  const y = date.getFullYear() - a
  const m = date.getMonth() + 1 + 12 * a - 3

  return (
    date.getDate() +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  )
}

// Calculate sun position (elevation angle)
function calculateSunPosition(lat: number, lon: number, date: Date): { elevation: number; azimuth: number } {
  const jd = getJulianDay(date)
  const n = jd - 2451545.0

  // Mean longitude of the sun
  const L = (280.46 + 0.9856474 * n) % 360

  // Mean anomaly of the sun
  const g = toRadians((357.528 + 0.9856003 * n) % 360)

  // Ecliptic longitude of the sun
  const lambda = toRadians(L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g))

  // Obliquity of the ecliptic
  const epsilon = toRadians(23.439 - 0.0000004 * n)

  // Right ascension and declination
  const alpha = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda))
  const delta = Math.asin(Math.sin(epsilon) * Math.sin(lambda))

  // Hour angle
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24
  const lmst = (gmst + lon / 15) % 24
  const h = toRadians(15 * (lmst - toDegrees(alpha) / 15))

  // Convert to local coordinates
  const latRad = toRadians(lat)
  const elevation = Math.asin(Math.sin(latRad) * Math.sin(delta) + Math.cos(latRad) * Math.cos(delta) * Math.cos(h))
  const azimuth = Math.atan2(-Math.sin(h), Math.tan(delta) * Math.cos(latRad) - Math.sin(latRad) * Math.cos(h))

  return {
    elevation: toDegrees(elevation),
    azimuth: toDegrees(azimuth),
  }
}

// Check if launch is at night (sun elevation <= -6 degrees)
export async function isNightLaunch(launchTime: Date): Promise<boolean> {
  try {
    const location = await getWallopsLocation()
    if (!location) {
      console.error("[v0] Could not get Wallops location for night calculation")
      return false
    }

    const lat = Number.parseFloat(location.latitude)
    const lon = Number.parseFloat(location.longitude)

    const sunPos = calculateSunPosition(lat, lon, launchTime)
    const isNight = sunPos.elevation <= -6

    console.log(`[v0] Sun elevation at launch time: ${sunPos.elevation.toFixed(2)}° (night: ${isNight})`)

    return isNight
  } catch (error) {
    console.error("[v0] Error calculating sun position:", error)
    return false
  }
}

// Get sun elevation for a specific time and location
export function getSunElevation(lat: number, lon: number, date: Date): number {
  const sunPos = calculateSunPosition(lat, lon, date)
  return sunPos.elevation
}
