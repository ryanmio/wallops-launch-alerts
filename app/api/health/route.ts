import { NextResponse } from "next/server"
import { checkCronHealth } from "@/lib/cron-utils"
import { getActiveSubscribers } from "@/lib/database"

export async function GET() {
  try {
    const [cronHealth, subscriberCount] = await Promise.all([
      checkCronHealth(),
      getActiveSubscribers()
        .then((subs) => subs.length)
        .catch(() => 0),
    ])

    const overallHealth = cronHealth.healthy

    return NextResponse.json(
      {
        healthy: overallHealth,
        timestamp: new Date().toISOString(),
        services: {
          cron: cronHealth,
          database: {
            healthy: subscriberCount >= 0,
            activeSubscribers: subscriberCount,
          },
        },
      },
      {
        status: overallHealth ? 200 : 503,
      },
    )
  } catch (error) {
    console.error("[v0] Health check failed:", error)

    return NextResponse.json(
      {
        healthy: false,
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      {
        status: 503,
      },
    )
  }
}
