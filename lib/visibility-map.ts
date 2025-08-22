import { createCanvas } from "canvas"

// Earth radius in kilometers (with 7/6 factor for atmospheric refraction)
const EARTH_RADIUS = 6371 * (7 / 6)

// Visibility ring configurations
const VISIBILITY_RINGS = [
  { altitude: 150, radius: 400, color: "#22c55e", alpha: 0.4, label: "Almost Certain" }, // Green - closest, best visibility
  { altitude: 100, radius: 600, color: "#eab308", alpha: 0.3, label: "Very Likely" }, // Yellow - medium distance
  { altitude: 50, radius: 800, color: "#f97316", alpha: 0.2, label: "Good" }, // Orange - farthest, still visible
]

// Calculate geodesic distance for visibility rings
function calculateVisibilityRadius(altitude: number): number {
  // Horizon distance formula with atmospheric refraction
  // d = sqrt(2 * R * h + h^2) where R is Earth radius with refraction factor
  const h = altitude // altitude in km
  const distance = Math.sqrt(2 * EARTH_RADIUS * h + h * h)
  return distance
}

// Convert lat/lon to canvas coordinates
function latLonToCanvas(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
): { x: number; y: number } {
  // Simple equirectangular projection centered on Wallops
  const x = canvasWidth / 2 + (lon - centerLon) * scale
  const y = canvasHeight / 2 - (lat - centerLat) * scale

  return { x, y }
}

// Calculate points on a circle (geodesic approximation)
function getCirclePoints(
  centerLat: number,
  centerLon: number,
  radiusKm: number,
  numPoints = 64,
): Array<{ lat: number; lon: number }> {
  const points = []
  const radiusRad = radiusKm / EARTH_RADIUS // Convert to radians

  for (let i = 0; i < numPoints; i++) {
    const bearing = (((i * 360) / numPoints) * Math.PI) / 180

    // Haversine formula for destination point
    const lat1 = (centerLat * Math.PI) / 180
    const lon1 = (centerLon * Math.PI) / 180

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(radiusRad) + Math.cos(lat1) * Math.sin(radiusRad) * Math.cos(bearing),
    )

    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(radiusRad) * Math.cos(lat1),
        Math.cos(radiusRad) - Math.sin(lat1) * Math.sin(lat2),
      )

    points.push({
      lat: (lat2 * 180) / Math.PI,
      lon: (lon2 * 180) / Math.PI,
    })
  }

  return points
}

// Calculate sun position using astronomical formulas
function calculateSunPosition(date: Date, latitude: number, longitude: number): { altitude: number; azimuth: number } {
  const rad = Math.PI / 180
  const deg = 180 / Math.PI

  // Convert to Julian day
  const a = Math.floor((14 - (date.getMonth() + 1)) / 12)
  const y = date.getFullYear() - a
  const m = date.getMonth() + 1 + 12 * a - 3
  const jd =
    date.getDate() +
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
  const utc = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  const lst = (100.46 + 0.985647 * n + longitude + 15 * utc) % 360
  const h = (lst - L) * rad

  // Convert to local coordinates
  const phi = latitude * rad
  const altitude = Math.asin(Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(h))
  const azimuth = Math.atan2(-Math.sin(h), Math.tan(delta) * Math.cos(phi) - Math.sin(phi) * Math.cos(h))

  return {
    altitude: altitude * deg,
    azimuth: azimuth * deg,
  }
}

// Determine if a launch is at night based on sun position
export function isNightLaunch(netTime: string): boolean {
  try {
    const launchTime = new Date(netTime)

    // Wallops coordinates (hardcoded for performance, could be cached from API)
    const wallopsLat = 37.8339
    const wallopsLon = -75.4877

    const sunPosition = calculateSunPosition(launchTime, wallopsLat, wallopsLon)

    // Night launch if sun altitude is ≤ -6° (civil twilight or darker)
    const isNight = sunPosition.altitude <= -6

    console.log(
      `[v0] Launch at ${netTime}: Sun altitude ${sunPosition.altitude.toFixed(1)}° - ${isNight ? "NIGHT" : "DAY"} launch`,
    )

    return isNight
  } catch (error) {
    console.error("[v0] Error calculating sun position:", error)
    // Default to false (day launch) if calculation fails
    return false
  }
}

export async function generateVisibilityMap(netTime: string): Promise<Buffer> {
  try {
    console.log("[v0] Generating visibility map...")

    // Wallops coordinates (hardcoded to avoid unnecessary API calls)
    const wallopsLat = 37.8339
    const wallopsLon = -75.4877

    console.log(`[v0] Wallops location: ${wallopsLat}, ${wallopsLon}`)

    // Determine if the launch is at night
    const isNight = isNightLaunch(netTime)
    if (isNight) {
      console.log("[v0] Launch is scheduled at night, visibility map will be adjusted accordingly.")
    }

    // Canvas setup
    const width = 1200
    const height = 800
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext("2d")

    // Map bounds (East Coast focus)
    const mapBounds = {
      north: 45, // Maine
      south: 25, // Florida
      east: -65, // Atlantic
      west: -85, // Inland
    }

    // Calculate scale
    const latRange = mapBounds.north - mapBounds.south
    const lonRange = mapBounds.east - mapBounds.west
    const scale = Math.min(width / Math.abs(lonRange), height / latRange) * 0.8

    // Background
    ctx.fillStyle = "#1e293b"
    ctx.fillRect(0, 0, width, height)

    // Draw coastline (simplified)
    ctx.strokeStyle = "#64748b"
    ctx.lineWidth = 2
    ctx.beginPath()

    // Simplified East Coast outline
    const coastPoints = [
      { lat: 44, lon: -69 }, // Maine
      { lat: 42, lon: -70 }, // Massachusetts
      { lat: 40, lon: -74 }, // New York
      { lat: 39, lon: -75 }, // Philadelphia
      { lat: 37, lon: -76 }, // Virginia
      { lat: 35, lon: -76 }, // North Carolina
      { lat: 32, lon: -81 }, // South Carolina
      { lat: 30, lon: -81 }, // Georgia
      { lat: 26, lon: -80 }, // Florida
    ]

    coastPoints.forEach((point, i) => {
      const { x, y } = latLonToCanvas(point.lat, point.lon, wallopsLat, wallopsLon, width, height, scale)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // Draw state boundaries (simplified)
    ctx.strokeStyle = "#475569"
    ctx.lineWidth = 1

    // Major cities
    const cities = [
      { name: "Boston", lat: 42.36, lon: -71.06 },
      { name: "New York", lat: 40.71, lon: -74.01 },
      { name: "Philadelphia", lat: 39.95, lon: -75.17 },
      { name: "Washington DC", lat: 38.91, lon: -77.04 },
      { name: "Richmond", lat: 37.54, lon: -77.46 },
      { name: "Raleigh", lat: 35.77, lon: -78.64 },
      { name: "Charleston", lat: 32.78, lon: -79.93 },
      { name: "Atlanta", lat: 33.75, lon: -84.39 },
      { name: "Jacksonville", lat: 30.33, lon: -81.66 },
    ]

    // Draw visibility rings
    VISIBILITY_RINGS.forEach((ring, index) => {
      const points = getCirclePoints(wallopsLat, wallopsLon, ring.radius)

      ctx.fillStyle =
        ring.color +
        Math.round(ring.alpha * 255)
          .toString(16)
          .padStart(2, "0")
      ctx.strokeStyle = ring.color
      ctx.lineWidth = 2

      ctx.beginPath()
      points.forEach((point, i) => {
        const { x, y } = latLonToCanvas(point.lat, point.lon, wallopsLat, wallopsLon, width, height, scale)
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    })

    // Draw cities
    ctx.fillStyle = "#f8fafc"
    ctx.font = "14px Arial"
    cities.forEach((city) => {
      const { x, y } = latLonToCanvas(city.lat, city.lon, wallopsLat, wallopsLon, width, height, scale)

      // City dot
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, 2 * Math.PI)
      ctx.fill()

      // City name
      ctx.fillText(city.name, x + 6, y - 6)
    })

    // Draw Wallops location
    const wallopsCanvas = latLonToCanvas(wallopsLat, wallopsLon, wallopsLat, wallopsLon, width, height, scale)
    ctx.fillStyle = "#dc2626"
    ctx.beginPath()
    ctx.arc(wallopsCanvas.x, wallopsCanvas.y, 8, 0, 2 * Math.PI)
    ctx.fill()

    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 16px Arial"
    ctx.fillText("🚀 Wallops", wallopsCanvas.x + 12, wallopsCanvas.y + 5)

    // Legend
    ctx.fillStyle = "rgba(30, 41, 59, 0.9)"
    ctx.fillRect(20, 20, 280, 140)

    ctx.strokeStyle = "#64748b"
    ctx.lineWidth = 1
    ctx.strokeRect(20, 20, 280, 140)

    ctx.fillStyle = "#f8fafc"
    ctx.font = "bold 18px Arial"
    ctx.fillText("Launch Visibility", 30, 45)

    ctx.font = "14px Arial"
    ctx.fillText("Estimated visibility zones for rocket plume:", 30, 65)

    VISIBILITY_RINGS.forEach((ring, index) => {
      const y = 85 + index * 20

      // Color swatch
      ctx.fillStyle = ring.color
      ctx.fillRect(30, y - 8, 16, 12)

      // Label
      ctx.fillStyle = "#f8fafc"
      ctx.fillText(`${ring.label} (${ring.altitude}km altitude)`, 55, y + 2)
    })

    // Disclaimer
    ctx.font = "12px Arial"
    ctx.fillStyle = "#94a3b8"
    ctx.fillText("* Visibility depends on weather conditions", 30, 150)

    if (isNight) {
      ctx.fillText("* Night launch conditions may affect visibility", 30, 170)
    }

    console.log("[v0] Visibility map generated successfully")

    try {
      // Try the standard method first
      return canvas.toBuffer()
    } catch (bufferError) {
      console.log("[v0] Standard toBuffer failed, trying alternative methods...")

      // Try with explicit PNG format
      if (typeof canvas.toBuffer === "function") {
        try {
          return (canvas as any).toBuffer("image/png")
        } catch (pngError) {
          console.log("[v0] PNG toBuffer failed, trying data URL conversion...")
        }
      }

      // Fallback: convert data URL to buffer
      const dataUrl = canvas.toDataURL("image/png")
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "")
      return Buffer.from(base64Data, "base64")
    }
  } catch (error) {
    console.error("[v0] Error generating visibility map:", error)

    // Return a simple fallback image
    const canvas = createCanvas(1200, 800)
    const ctx = canvas.getContext("2d")

    ctx.fillStyle = "#1e293b"
    ctx.fillRect(0, 0, 1200, 800)

    ctx.fillStyle = "#f8fafc"
    ctx.font = "24px Arial"
    ctx.textAlign = "center"
    ctx.fillText("Visibility Map Unavailable", 600, 400)

    try {
      return canvas.toBuffer()
    } catch (fallbackError) {
      const dataUrl = canvas.toDataURL("image/png")
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "")
      return Buffer.from(base64Data, "base64")
    }
  }
}

// Test function to generate and save a sample map
export async function generateSampleVisibilityMap(): Promise<void> {
  try {
    const buffer = await generateVisibilityMap("2023-10-01T00:00:00Z")
    console.log(`[v0] Generated visibility map: ${buffer.length} bytes`)
  } catch (error) {
    console.error("[v0] Error generating sample map:", error)
  }
}
