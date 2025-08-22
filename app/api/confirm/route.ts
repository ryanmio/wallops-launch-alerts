import { type NextRequest, NextResponse } from "next/server"
import { activateSubscriber, getSubscriber } from "@/lib/database"
import { verifyConfirmationToken } from "@/lib/tokens"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")
    const email = searchParams.get("email")

    if (!token || !email) {
      return NextResponse.json({ success: false, error: "Missing token or email" }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    console.log(`[v0] Processing confirmation for ${normalizedEmail}`)

    // Verify token
    const tokenResult = verifyConfirmationToken(token, normalizedEmail)

    if (!tokenResult.valid) {
      const errorMessage = tokenResult.expired
        ? "Confirmation link has expired. Please subscribe again."
        : "Invalid confirmation link."

      return NextResponse.json({ success: false, error: errorMessage }, { status: 400 })
    }

    // Check if subscriber exists
    const subscriber = await getSubscriber(normalizedEmail)
    if (!subscriber) {
      return NextResponse.json({ success: false, error: "Subscriber not found" }, { status: 404 })
    }

    if (subscriber.active) {
      return NextResponse.json({
        success: true,
        message: "Email is already confirmed and active.",
      })
    }

    // Activate subscriber
    await activateSubscriber(normalizedEmail)
    console.log(`[v0] Activated subscriber: ${normalizedEmail}`)

    return NextResponse.json({
      success: true,
      message: "Email confirmed successfully! You will now receive Wallops launch alerts.",
    })
  } catch (error) {
    console.error("[v0] Error in /api/confirm:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
