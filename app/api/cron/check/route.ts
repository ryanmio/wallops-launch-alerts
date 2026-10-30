import { type NextRequest, NextResponse } from "next/server"
import { isAuthorizedCronRequest } from "@/lib/cron-utils"
import { processLaunchNotifications } from "@/lib/notifications"

export const dynamic = "force-dynamic"

async function runCron(request: NextRequest) {
  const startTime = Date.now()
  console.log("Cron job started:", new Date().toISOString())

  if (!isAuthorizedCronRequest(request)) {
    console.error("[v0] Unauthorized cron request")
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await processLaunchNotifications()

    const duration = Date.now() - startTime
    console.log(`[v0] Cron job completed in ${duration}ms`)

    return NextResponse.json({
      success: result.errors.length === 0,
      processed: result.processed,
      notifications: result.notifications,
      errors: result.errors.length,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error("[v0] Cron job failed:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process launch notifications",
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// Vercel Cron invokes GET; POST is kept for manual runs (scripts/004-test-cron-job.js)
export async function GET(request: NextRequest) {
  return runCron(request)
}

export async function POST(request: NextRequest) {
  return runCron(request)
}
