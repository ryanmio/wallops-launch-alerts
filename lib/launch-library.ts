// Launch Library 2 API integration for Wallops launches
// Base URL: https://ll.thespacedevs.com/2.3.0
// Rate limit: 15 requests/hour on free tier

interface LaunchLibraryResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Launch {
  id: string
  slug?: string
  name: string
  net: string
  net_precision?: {
    id: number
    name: string
    abbrev: string
  } | null
  window_start?: string
  window_end?: string
  status: {
    id: number
    name: string
    abbrev: string
    description?: string
  }
  image?: {
    image_url?: string
    thumbnail_url?: string
  } | null
  rocket: {
    configuration: {
      name: string
      full_name?: string
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
  } | null
  // Only returned with mode=detailed
  info_urls?: Array<{
    url: string
    priority?: number
    title?: string
    description?: string
  }>
  vid_urls?: Array<{
    url: string
    priority?: number
    title?: string
    publisher?: string
  }>
  last_updated: string
}

// In-memory cache (per server instance). Next's fetch cache below is the shared layer.
const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

// Per-instance safety cap well under LL2's 15/hour. When it's hit we serve stale data rather than wait:
// sleeping inside a serverless function just burns its time limit.
const MAX_REQUESTS_PER_HOUR = 10
let requestCount = 0
let hourlyResetTime = Date.now() + 60 * 60 * 1000

async function makeApiRequest<T>(endpoint: string, cacheDuration: number = CACHE_DURATION): Promise<T | null> {
  const cached = cache.get(endpoint) as { data: T; timestamp: number } | undefined
  if (cached && Date.now() - cached.timestamp < cacheDuration) {
    return cached.data
  }

  const now = Date.now()
  if (now > hourlyResetTime) {
    requestCount = 0
    hourlyResetTime = now + 60 * 60 * 1000
  }
  if (requestCount >= MAX_REQUESTS_PER_HOUR) {
    console.warn(`[v0] Launch Library request cap reached; ${cached ? "serving stale data" : "no data available"}`)
    return cached?.data ?? null
  }

  try {
    const url = `https://ll.thespacedevs.com/2.3.0${endpoint}`
    console.log(`[v0] Making API request to: ${url}`)

    // Next.js fetch caching shares responses across requests to avoid exceeding API limits
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Wallops-Launch-Alerts/1.0",
      },
      next: { revalidate: Math.max(60, Math.floor(cacheDuration / 1000)) },
    } as RequestInit)

    requestCount++

    if (!response.ok) {
      console.error(`[v0] API request failed: ${response.status} ${response.statusText}`)
      return cached?.data ?? null
    }

    const data = (await response.json()) as T
    cache.set(endpoint, { data, timestamp: Date.now() })
    return data
  } catch (error) {
    console.error(`[v0] Error making API request to ${endpoint}:`, error)
    return cached?.data ?? null
  }
}

// Upcoming launches from Wallops (LL2 location 21), soonest first. Returns null if Launch Library is unreachable,
// so callers can tell "nothing scheduled" apart from "couldn't check".
export async function getUpcomingWallopsLaunches(): Promise<Launch[] | null> {
  // Round current time to 10 minutes to stabilize the cache key
  const roundedMs = Math.floor(Date.now() / (10 * 60 * 1000)) * (10 * 60 * 1000)
  const roundedIso = new Date(roundedMs).toISOString()
  // mode=detailed includes webcast and info links (~150 KB for 10 launches), so no per-launch detail calls are needed
  const endpoint = `/launches/?pad__location=21&include_suborbital=true&net__gte=${roundedIso}&ordering=net&limit=10&mode=detailed`

  const response = await makeApiRequest<LaunchLibraryResponse<Launch>>(endpoint)

  if (!response) {
    console.error("[v0] Failed to fetch upcoming Wallops launches")
    return null
  }

  return response.results
}

// Highest-priority link of each kind (LL2 priority: lower is better)
function bestUrl(urls?: Array<{ url: string; priority?: number }>): string | null {
  if (!urls?.length) return null
  return [...urls].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))[0].url
}

export function getWebcastUrl(launch: Pick<Launch, "vid_urls">): string | null {
  return bestUrl(launch.vid_urls)
}

// Space Launch Now is The Space Devs' own site for Launch Library data, so every launch has a page there.
// Preferred over info_urls, which are third-party links that go stale (e.g. press releases that have moved).
export function getInfoUrl(launch: Pick<Launch, "slug" | "info_urls">): string | null {
  if (launch.slug) return `https://spacelaunchnow.app/launch/${encodeURIComponent(launch.slug)}/`
  return bestUrl(launch.info_urls)
}

// Helper function to detect significant schedule slips
export function hasSignificantScheduleSlip(oldNet: string | Date, newNet: string | Date): boolean {
  const diffMinutes = Math.abs(new Date(newNet).getTime() - new Date(oldNet).getTime()) / (1000 * 60)

  // Consider it significant if the slip is 15 minutes or more
  return diffMinutes >= 15
}
