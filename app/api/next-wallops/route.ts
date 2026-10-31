import { NextResponse } from "next/server"
import { getUpcomingWallopsLaunches } from "@/lib/launch-library"
import { isNightLaunch } from "@/lib/visibility-map"
import { hasExactTime } from "@/lib/launch-time"

export const revalidate = 600 // Revalidate every 10 minutes (600 seconds)
export const dynamic = "force-static"

export async function GET() {
  try {
    const launches = await getUpcomingWallopsLaunches()
    if (!launches) {
      throw new Error("Launch Library unavailable")
    }

    // Placeholder dates (e.g. "sometime in 2026") have no meaningful time of day
    const next = launches[0]
    const nightLaunch = next ? hasExactTime(next) && isNightLaunch(next.net) : false

    const response = NextResponse.json({
      success: true,
      launches,
      isNightLaunch: nightLaunch,
      timestamp: new Date().toISOString(),
    })

    // Public cache for 10 minutes, serve stale while revalidating
    response.headers.set("Cache-Control", "public, s-maxage=600, stale-while-revalidate=600")

    return response
  } catch (error) {
    console.error("[v0] Error fetching launches:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch launch data",
        launches: [],
        isNightLaunch: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
