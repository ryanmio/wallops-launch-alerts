import { type NextRequest, NextResponse } from "next/server"
import { getUpcomingLaunches, getActiveSubscribers } from "@/lib/database"
import { getUpcomingWallopsLaunches } from "@/lib/launch-library"
import { isAuthorizedCronRequest } from "@/lib/cron-utils"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Get system status
    const [dbLaunches, subscribers, ll2Launches] = await Promise.all([
      getUpcomingLaunches(),
      getActiveSubscribers(),
      getUpcomingWallopsLaunches(),
    ])

    const now = new Date()
    const upcomingLaunches = dbLaunches.filter((launch) => new Date(launch.net) > now)

    return NextResponse.json({
      success: true,
      status: {
        activeSubscribers: subscribers.length,
        upcomingLaunchesInDb: upcomingLaunches.length,
        upcomingLaunchesFromLL2: ll2Launches?.length ?? null,
        nextLaunch: upcomingLaunches[0]
          ? {
              ll2Id: upcomingLaunches[0].ll2_id,
              net: upcomingLaunches[0].net,
              notifiedT24: upcomingLaunches[0].notified_t24,
              notifiedT2: upcomingLaunches[0].notified_t2,
            }
          : null,
        timestamp: now.toISOString(),
      },
    })
  } catch (error) {
    console.error("[v0] Error getting cron status:", error)
    return NextResponse.json({ success: false, error: "Failed to get status" }, { status: 500 })
  }
}
