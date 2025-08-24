import { NextResponse } from "next/server"
import { getUpcomingWallopsLaunches } from "@/lib/launch-library"
import { isNightLaunch } from "@/lib/visibility-map"

export const revalidate = 600 // Revalidate every 10 minutes (600 seconds)
export const dynamic = "force-static"

export async function GET() {
  try {
    console.log("Fetching upcoming Wallops launches...")
    const launches = await getUpcomingWallopsLaunches()
          console.log("Successfully fetched launches:", launches?.length || 0)

    let nightLaunch = false
    if (launches && launches.length > 0) {
      try {
        nightLaunch = isNightLaunch(launches[0].net)
        console.log("Night launch detection:", nightLaunch)
      } catch (error) {
        console.error("[v0] Error detecting night launch:", error)
      }
    }

    const launchesArray = launches || []
    const response = NextResponse.json({
      success: true,
      launches: launchesArray,
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
