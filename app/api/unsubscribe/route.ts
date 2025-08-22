import { type NextRequest, NextResponse } from "next/server"
import { deactivateSubscriber, getSubscriber } from "@/lib/database"
import { verifyUnsubscribeToken } from "@/lib/tokens"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, token } = body

    let targetEmail = email

    // If token is provided, verify it and extract email
    if (token) {
      const tokenResult = verifyUnsubscribeToken(token)
      if (!tokenResult.valid || !tokenResult.email) {
        return NextResponse.json({ success: false, error: "Invalid unsubscribe token" }, { status: 400 })
      }
      targetEmail = tokenResult.email
    }

    if (!targetEmail) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    const normalizedEmail = targetEmail.toLowerCase().trim()

    console.log(`[v0] Processing unsubscribe request for ${normalizedEmail}`)

    // Check if subscriber exists
    const subscriber = await getSubscriber(normalizedEmail)
    if (!subscriber) {
      return NextResponse.json({ success: false, error: "Email not found in our system" }, { status: 404 })
    }

    if (!subscriber.active) {
      return NextResponse.json({
        success: true,
        message: "Email is already unsubscribed.",
      })
    }

    // Deactivate subscriber
    await deactivateSubscriber(normalizedEmail)
    console.log(`[v0] Deactivated subscriber: ${normalizedEmail}`)

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed from Wallops launch alerts.",
    })
  } catch (error) {
    console.error("[v0] Error in /api/unsubscribe:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const token = searchParams.get("token")

    if (!email && !token) {
      return NextResponse.json({ success: false, error: "Email or token is required" }, { status: 400 })
    }

    // Handle token-based unsubscribe
    if (token) {
      const tokenResult = verifyUnsubscribeToken(token)
      if (!tokenResult.valid || !tokenResult.email) {
        return NextResponse.json({ success: false, error: "Invalid unsubscribe token" }, { status: 400 })
      }

      const normalizedEmail = tokenResult.email.toLowerCase().trim()

      // Deactivate subscriber
      await deactivateSubscriber(normalizedEmail)
      console.log(`[v0] Deactivated subscriber via token: ${normalizedEmail}`)

      return NextResponse.json({
        success: true,
        message: "Successfully unsubscribed from Wallops launch alerts.",
      })
    }

    // Handle email-based unsubscribe (requires confirmation)
    const normalizedEmail = email!.toLowerCase().trim()
    const subscriber = await getSubscriber(normalizedEmail)

    if (!subscriber) {
      return NextResponse.json({ success: false, error: "Email not found in our system" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "To complete unsubscription, please use the unsubscribe link in your email or contact support.",
      requiresConfirmation: true,
    })
  } catch (error) {
    console.error("[v0] Error in GET /api/unsubscribe:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
