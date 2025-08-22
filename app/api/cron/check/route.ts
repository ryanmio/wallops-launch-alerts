import { type NextRequest, NextResponse } from "next/server"
import { processLaunchNotifications } from "@/lib/notifications"

// Security: Verify cron requests
function verifyCronRequest(request: NextRequest): boolean {
  // Check for Vercel Cron secret
  const cronSecret = request.headers.get("authorization")
  const expectedSecret = process.env.CRON_SECRET

  if (expectedSecret && cronSecret !== `Bearer ${expectedSecret}`) {
    return false
  }

  // Additional security: check user agent for Vercel Cron
  const userAgent = request.headers.get("user-agent")
  if (userAgent && !userAgent.includes("vercel")) {
    console.log(`[v0] Suspicious cron request from user agent: ${userAgent}`)
  }

  return true
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log("[v0] Cron job started:", new Date().toISOString())

  try {
    // Verify request authenticity
    if (!verifyCronRequest(request)) {
      console.error("[v0] Unauthorized cron request")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Process launch notifications
    await processLaunchNotifications()

    const duration = Date.now() - startTime
    console.log(`[v0] Cron job completed successfully in ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: "Launch notifications processed successfully",
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

// Allow GET for manual testing (with additional security)
export async function GET(request: NextRequest) {
  // Only allow in development or with special header
  const isDev = process.env.NODE_ENV === "development"
  const testHeader = request.headers.get("x-test-cron")

  if (!isDev && testHeader !== process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 })
  }

  console.log("[v0] Manual cron test triggered")

  // Reuse POST logic
  return POST(request)
}
