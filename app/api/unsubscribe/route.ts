import { type NextRequest, NextResponse } from "next/server"
import { deactivateSubscriber, getSubscriber } from "@/lib/database"
import { sendUnsubscribeLinkEmail } from "@/lib/email"
import { verifyUnsubscribeToken } from "@/lib/tokens"

// Same response whether or not the address is subscribed, so this can't be used to look up subscribers
const LINK_SENT_MESSAGE = "If that address is subscribed, we've emailed it a link to confirm unsubscribing."

async function unsubscribeWithToken(token: string) {
  const tokenResult = await verifyUnsubscribeToken(token)
  if (!tokenResult.valid || !tokenResult.email) {
    return NextResponse.json({ success: false, error: "Invalid unsubscribe token" }, { status: 400 })
  }

  const normalizedEmail = tokenResult.email.toLowerCase().trim()
  await deactivateSubscriber(normalizedEmail)
  console.log(`[v0] Deactivated subscriber via token: ${normalizedEmail}`)

  return NextResponse.json({
    success: true,
    message: "Successfully unsubscribed from Wallops launch alerts.",
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, token } = body

    if (token) {
      return await unsubscribeWithToken(token)
    }

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    // Without a token, only the inbox owner can unsubscribe: email them a signed link
    const normalizedEmail = String(email).toLowerCase().trim()
    const subscriber = await getSubscriber(normalizedEmail)
    if (subscriber?.active) {
      const sent = await sendUnsubscribeLinkEmail(normalizedEmail)
      if (!sent) {
        console.error(`[v0] Failed to send unsubscribe link to ${normalizedEmail}`)
      }
    }

    return NextResponse.json({ success: true, linkSent: true, message: LINK_SENT_MESSAGE })
  } catch (error) {
    console.error("[v0] Error in /api/unsubscribe:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ success: false, error: "Token is required" }, { status: 400 })
    }

    return await unsubscribeWithToken(token)
  } catch (error) {
    console.error("[v0] Error in GET /api/unsubscribe:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
