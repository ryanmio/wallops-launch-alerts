// Launch Library 2 API integration for Wallops launches
// Base URL: https://ll.thespacedevs.com/2.3.0
// Rate limit: 15 requests/hour on free tier

interface LaunchLibraryResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

interface Launch {
  id: string
  name: string
  net: string
  window_start?: string
  window_end?: string
  status: {
    id: number
    name: string
    abbrev: string
  }
  rocket: {
    configuration: {
      name: string
      family: string
    }
  }
  pad: {
    name: string
    location: {
      id: number
      name: string
    }
  }
  mission?: {
    name: string
    description: string
    type: string
  }
  vid_urls?: Array<{
    priority: number
    source: string
    publisher: string
    title: string
    description: string
    feature_image: string
    url: string
  }>
  last_updated: string
}

interface Location {
  id: number
  name: string
  country_code: string
  map_image: string
  timezone_name: string
  total_launch_count: number
  total_landing_count: number
  latitude: string
  longitude: string
}

// Cache for API responses
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes for launches
const LOCATION_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours for location

// Rate limiting
let lastRequestTime = 0
let requestCount = 0
let hourlyResetTime = Date.now() + 60 * 60 * 1000 // Reset every hour

const MAX_REQUESTS_PER_HOUR = 12 // Leave some buffer from the 15 limit
const MIN_REQUEST_INTERVAL = 30 * 1000 // 30 seconds minimum between requests

async function makeApiRequest<T>(endpoint: string, cacheDuration: number = CACHE_DURATION): Promise<T | null> {
  const cacheKey = endpoint
  const cached = cache.get(cacheKey)

  // Return cached data if still valid
  if (cached && Date.now() - cached.timestamp < cacheDuration) {
    console.log(`[v0] Using cached data for ${endpoint}`)
    return cached.data
  }

  const now = Date.now()
  if (now > hourlyResetTime) {
    requestCount = 0
    hourlyResetTime = now + 60 * 60 * 1000
    console.log(`[v0] Rate limit counter reset`)
  }

  if (requestCount >= MAX_REQUESTS_PER_HOUR) {
    const waitTime = hourlyResetTime - now
    console.log(`[v0] Hourly rate limit reached, waiting ${waitTime}ms until reset`)
    await new Promise((resolve) => setTimeout(resolve, waitTime))
    requestCount = 0
    hourlyResetTime = Date.now() + 60 * 60 * 1000
  }

  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest
    console.log(`[v0] Rate limiting: waiting ${waitTime}ms before API request`)
    await new Promise((resolve) => setTimeout(resolve, waitTime))
  }

  try {
    const url = `https://ll.thespacedevs.com/2.3.0${endpoint}`
    console.log(`[v0] Making API request to: ${url}`)

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Wallops-Launch-Alerts/1.0",
      },
    })

    lastRequestTime = Date.now()
    requestCount++ // Increment request counter

    if (!response.ok) {
      console.error(`[v0] API request failed: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    // Cache the response
    cache.set(cacheKey, { data, timestamp: Date.now() })
    console.log(`[v0] API request successful, data cached`)

    return data
  } catch (error) {
    console.error(`[v0] Error making API request to ${endpoint}:`, error)
    return null
  }
}

export async function getUpcomingWallopsLaunches(): Promise<Launch[]> {
  const now = new Date().toISOString()
  const endpoint = `/launches/?pad__location=21&include_suborbital=true&net__gte=${now}&ordering=net&limit=10&mode=list`

  const response = await makeApiRequest<LaunchLibraryResponse<Launch>>(endpoint)

  if (!response) {
    console.error("[v0] Failed to fetch upcoming Wallops launches")
    return []
  }

  console.log(`[v0] Found ${response.results.length} upcoming Wallops launches`)
  return response.results
}

export async function getLaunchDetail(launchId: string): Promise<Launch | null> {
  const endpoint = `/launches/${launchId}/?mode=normal`

  const launch = await makeApiRequest<Launch>(endpoint)

  if (!launch) {
    console.error(`[v0] Failed to fetch launch detail for ID: ${launchId}`)
    return null
  }

  console.log(`[v0] Fetched launch detail for: ${launch.name}`)
  return launch
}

export async function getWallopsLocation(): Promise<Location | null> {
  const endpoint = "/locations/21/"

  const location = await makeApiRequest<Location>(endpoint, LOCATION_CACHE_DURATION)

  if (!location) {
    console.error("[v0] Failed to fetch Wallops location data")
    return null
  }

  console.log(`[v0] Fetched Wallops location: ${location.name}`)
  return location
}

// Helper function to determine if a launch needs notification
export function shouldNotifyForLaunch(launch: Launch, notificationType: "T24" | "T2"): boolean {
  const now = new Date()
  const launchTime = new Date(launch.net)
  const timeDiff = launchTime.getTime() - now.getTime()

  // Convert to hours
  const hoursUntilLaunch = timeDiff / (1000 * 60 * 60)

  if (notificationType === "T24") {
    // Notify if launch is between 23-25 hours away
    return hoursUntilLaunch >= 23 && hoursUntilLaunch <= 25
  } else if (notificationType === "T2") {
    // Notify if launch is between 1.5-2.5 hours away
    return hoursUntilLaunch >= 1.5 && hoursUntilLaunch <= 2.5
  }

  return false
}

// Helper function to detect significant schedule slips
export function hasSignificantScheduleSlip(oldNet: string, newNet: string): boolean {
  const oldTime = new Date(oldNet)
  const newTime = new Date(newNet)
  const diffMinutes = Math.abs(newTime.getTime() - oldTime.getTime()) / (1000 * 60)

  // Consider it significant if the slip is 15 minutes or more
  return diffMinutes >= 15
}

// Clear cache (useful for testing)
export function clearCache(): void {
  cache.clear()
  console.log("[v0] API cache cleared")
}
