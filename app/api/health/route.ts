import { NextResponse } from "next/server"
import { checkCronHealth } from "@/lib/cron-utils"
import { pingDatabase } from "@/lib/database"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [cronHealth, databaseHealthy] = await Promise.all([checkCronHealth(), pingDatabase()])

    const overallHealth = cronHealth.healthy && databaseHealthy

    return NextResponse.json(
      {
        healthy: overallHealth,
        timestamp: new Date().toISOString(),
        services: {
          cron: cronHealth,
          database: {
            healthy: databaseHealthy,
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
