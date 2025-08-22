import { type NextRequest, NextResponse } from "next/server"
import { createSubscriber, getSubscriber } from "@/lib/database"
import { sendConfirmationEmail } from "@/lib/email"
import { generateConfirmationToken } from "@/lib/tokens"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, regionHint } = body

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: "Invalid email address" }, { status: 400 })
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    console.log(`[v0] Processing subscription request for ${normalizedEmail}`)

    // Check if subscriber already exists
    const existingSubscriber = await getSubscriber(normalizedEmail)

    if (existingSubscriber) {
      if (existingSubscriber.active) {
        return NextResponse.json({ success: false, error: "Email is already subscribed" }, { status: 409 })
      } else {
        // Reactivate existing inactive subscriber
        console.log(`[v0] Reactivating existing subscriber: ${normalizedEmail}`)
      }
    } else {
      // Create new subscriber (inactive until confirmed)
      await createSubscriber(normalizedEmail, regionHint)
      console.log(`[v0] Created new subscriber: ${normalizedEmail}`)
    }

    // Generate confirmation token
    const confirmationToken = generateConfirmationToken(normalizedEmail)

    // Send confirmation email
    const emailSent = await sendConfirmationEmail(normalizedEmail, confirmationToken)

    if (!emailSent) {
      return NextResponse.json({ success: false, error: "Failed to send confirmation email" }, { status: 500 })
    }

    console.log(`[v0] Confirmation email sent to ${normalizedEmail}`)

    return NextResponse.json({
      success: true,
      message: "Confirmation email sent. Please check your inbox to complete subscription.",
    })
  } catch (error) {
    console.error("[v0] Error in /api/subscribe:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
