import { type NextRequest, NextResponse } from "next/server"
import { createSubscriber, getSubscriber } from "@/lib/database"
import { sendConfirmationEmail } from "@/lib/email"
import { generateConfirmationToken } from "@/lib/tokens"

export async function POST(request: NextRequest) {
  console.log("Subscribe API called")

  try {
    // Env diagnostics (no secrets logged)
    const hasDbUrl = Boolean(process.env.DATABASE_URL)
    const hasResend = Boolean(process.env.RESEND_API_KEY)
    const hasTokenSecret = Boolean(process.env.TOKEN_SECRET)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "unset"
    console.log(
      "[v0] Env checks:",
      JSON.stringify({ DATABASE_URL: hasDbUrl, RESEND_API_KEY: hasResend, TOKEN_SECRET: hasTokenSecret, BASE_URL: baseUrl }),
    )

    console.log("Parsing request body...")
    const body = await request.json()
    const { email, regionHint } = body
    console.log("Request body parsed:", { email: email ? "***@***" : "missing", regionHint })

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      console.log("Invalid email format:", email)
      return NextResponse.json({ success: false, error: "Invalid email address" }, { status: 400 })
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()
    console.log(`[v0] Processing subscription request for ${normalizedEmail}`)

    // Check if subscriber already exists
    console.log("Checking for existing subscriber...")
    let existingSubscriber = null
    try {
      existingSubscriber = await getSubscriber(normalizedEmail)
    } catch (dbErr) {
      console.error("[v0] DB error during getSubscriber:", dbErr)
      throw new Error("DB_GET_SUBSCRIBER_FAILED")
    }

    if (existingSubscriber) {
      if (existingSubscriber.active) {
        console.log("Subscriber already exists and is active")
        return NextResponse.json(
          {
            success: false,
            error: "Email is already subscribed to launch alerts",
          },
          { status: 409 },
        )
      } else {
        console.log("Subscriber exists but is inactive, will reactivate")
      }
    }

    // Create or update subscriber
    if (!existingSubscriber) {
      console.log("Creating new subscriber...")
      try {
        await createSubscriber(normalizedEmail, regionHint)
      } catch (dbErr) {
        console.error("[v0] DB error during createSubscriber:", dbErr)
        throw new Error("DB_CREATE_SUBSCRIBER_FAILED")
      }
      console.log(`[v0] Created new subscriber: ${normalizedEmail}`)
    }

    // Generate confirmation token
    console.log("Generating confirmation token...")
    let token = ""
    try {
      token = await generateConfirmationToken(normalizedEmail)
    } catch (tokenErr) {
      console.error("[v0] Error generating token:", tokenErr)
      throw new Error("TOKEN_GENERATION_FAILED")
    }
          console.log("Confirmation token generated successfully")

    // Send confirmation email
    console.log("Sending confirmation email...")
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
    const errorCode = error instanceof Error ? error.message : "UNKNOWN_ERROR"
    return NextResponse.json({ success: false, error: "Internal server error", errorCode }, { status: 500 })
  }
}
