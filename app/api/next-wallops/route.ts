import { NextResponse } from "next/server"
import { getUpcomingWallopsLaunches } from "@/lib/launch-library"
import { isNightLaunch } from "@/lib/visibility-map"

export const revalidate = 600 // Revalidate every 10 minutes (600 seconds)
export const dynamic = "force-dynamic" // Ensure fresh data for countdown

export async function GET() {
  try {
    console.log("[v0] Fetching upcoming Wallops launches...")
    const launches = await getUpcomingWallopsLaunches()
    console.log("[v0] Successfully fetched launches:", launches?.length || 0)

    let nightLaunch = false
    if (launches && launches.length > 0) {
      try {
        nightLaunch = isNightLaunch(launches[0].net)
        console.log("[v0] Night launch detection:", nightLaunch)
      } catch (error) {
        console.error("[v0] Error detecting night launch:", error)
      }
    }

    const response = NextResponse.json({
      success: true,
      launches: launches || [],
      isNightLaunch: nightLaunch,
      timestamp: new Date().toISOString(),
    })

    // Set cache headers: cache for 5 minutes, stale-while-revalidate for 10 minutes
    response.headers.set("Cache-Control", "s-maxage=300, stale-while-revalidate=600")

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
