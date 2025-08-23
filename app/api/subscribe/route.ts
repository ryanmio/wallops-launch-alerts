import { type NextRequest, NextResponse } from "next/server"
import { createSubscriber, getSubscriber } from "@/lib/database"
import { sendConfirmationEmail } from "@/lib/email"
import { generateConfirmationToken } from "@/lib/tokens"

export async function POST(request: NextRequest) {
  console.log("[v0] Subscribe API called")

  try {
    console.log("[v0] Parsing request body...")
    const body = await request.json()
    const { email, regionHint } = body
    console.log("[v0] Request body parsed:", { email: email ? "***@***" : "missing", regionHint })

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      console.log("[v0] Invalid email format:", email)
      return NextResponse.json({ success: false, error: "Invalid email address" }, { status: 400 })
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()
    console.log(`[v0] Processing subscription request for ${normalizedEmail}`)

    // Check if subscriber already exists
    console.log("[v0] Checking for existing subscriber...")
    const existingSubscriber = await getSubscriber(normalizedEmail)

    if (existingSubscriber) {
      if (existingSubscriber.active) {
        console.log("[v0] Subscriber already exists and is active")
        return NextResponse.json(
          {
            success: false,
            error: "Email is already subscribed to launch alerts",
          },
          { status: 409 },
        )
      } else {
        console.log("[v0] Subscriber exists but is inactive, will reactivate")
      }
    }

    // Create or update subscriber
    if (!existingSubscriber) {
      console.log("[v0] Creating new subscriber...")
      await createSubscriber(normalizedEmail, regionHint)
      console.log(`[v0] Created new subscriber: ${normalizedEmail}`)
    }

    // Generate confirmation token
    console.log("[v0] Generating confirmation token...")
    const token = await generateConfirmationToken(normalizedEmail)
    console.log("[v0] Confirmation token generated successfully")

    // Send confirmation email
    console.log("[v0] Sending confirmation email...")
    const emailSent = await sendConfirmationEmail(normalizedEmail, token)

    if (!emailSent) {
      console.error("[v0] Failed to send confirmation email")
      return NextResponse.json(
        {
          success: false,
          error: "Failed to send confirmation email. Please try again.",
        },
        { status: 500 },
      )
    }

    console.log(`[v0] Confirmation email sent successfully to ${normalizedEmail}`)
    console.log(`[v0] Subscription request processed successfully for ${normalizedEmail}`)

    return NextResponse.json({
      success: true,
      message: "Please check your email and click the confirmation link to complete your subscription.",
    })
  } catch (error) {
    console.error("[v0] Error in /api/subscribe:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
