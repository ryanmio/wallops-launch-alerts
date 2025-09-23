import { readFile } from "fs/promises"
import { join } from "path"

export function isNightLaunch(netTime: string): boolean {
  try {
    const launchTime = new Date(netTime)

    // Wallops coordinates
    const wallopsLat = 37.8339
    const wallopsLon = -75.4877

    // Calculate sun position using astronomical formulas
    const rad = Math.PI / 180
    const deg = 180 / Math.PI

    // Convert to Julian day
    const a = Math.floor((14 - (launchTime.getMonth() + 1)) / 12)
    const y = launchTime.getFullYear() - a
    const m = launchTime.getMonth() + 1 + 12 * a - 3
    const jd =
      launchTime.getDate() +
      Math.floor((153 * m + 2) / 5) +
      365 * y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400) -
      32045

    const n = jd - 2451545.0
    const L = (280.46 + 0.9856474 * n) % 360
    const g = ((357.528 + 0.9856003 * n) % 360) * rad
    const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad

    // Declination
    const delta = Math.asin(Math.sin(23.439 * rad) * Math.sin(lambda))

    // Hour angle
    const utc = launchTime.getUTCHours() + launchTime.getUTCMinutes() / 60 + launchTime.getUTCSeconds() / 3600
    const lst = (100.46 + 0.985647 * n + wallopsLon + 15 * utc) % 360
    const h = (lst - L) * rad

    // Convert to local coordinates
    const phi = wallopsLat * rad
    const altitude = Math.asin(Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(h))

    const sunAltitude = altitude * deg

    // Night launch if sun altitude is ≤ -6° (civil twilight or darker)
    const isNight = sunAltitude <= -6

    console.log(
      `[v0] Launch at ${netTime}: Sun altitude ${sunAltitude.toFixed(1)}° - ${isNight ? "NIGHT" : "DAY"} launch`,
    )

    return isNight
  } catch (error) {
    console.error("[v0] Error calculating sun position:", error)
    return false
  }
}

export async function generateVisibilityMap(): Promise<Buffer> {
  try {
    console.log("Using static NASA visibility map asset...")

    // Read the static NASA visibility map
    const imagePath = join(process.cwd(), "public", "images", "wallops-visibility-map.webp")
    const buffer = await readFile(imagePath)

    console.log(`[v0] Loaded NASA visibility map: ${buffer.length} bytes`)
    return buffer
  } catch (error) {
    console.error("[v0] Error loading static visibility map:", error)

    // Return a simple fallback message as buffer
    const fallbackMessage = "Visibility map temporarily unavailable"
    return Buffer.from(fallbackMessage, "utf-8")
  }
}
