import { NextResponse } from "next/server"
import { getUpcomingWallopsLaunches } from "@/lib/launch-library"
import { isNightLaunch } from "@/lib/visibility-map"

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

    return NextResponse.json({
      success: true,
      launches: launches || [],
      isNightLaunch: nightLaunch,
      timestamp: new Date().toISOString(),
    })
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
