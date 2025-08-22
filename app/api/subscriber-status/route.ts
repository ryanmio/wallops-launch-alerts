import { type NextRequest, NextResponse } from "next/server"
import { getSubscriber } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const subscriber = await getSubscriber(normalizedEmail)

    if (!subscriber) {
      return NextResponse.json({
        success: true,
        subscribed: false,
        active: false,
      })
    }

    return NextResponse.json({
      success: true,
      subscribed: true,
      active: subscriber.active,
      createdAt: subscriber.created_at,
    })
  } catch (error) {
    console.error("[v0] Error in /api/subscriber-status:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
