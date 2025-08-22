import { type NextRequest, NextResponse } from "next/server"
import { generateVisibilityMap } from "@/lib/visibility-map"

export async function POST(request: NextRequest) {
  try {
    const { launchTime } = await request.json()

    if (!launchTime) {
      return NextResponse.json({ error: "Launch time is required" }, { status: 400 })
    }

    console.log("[v0] Generating visibility map for launch:", launchTime)

    const mapBuffer = await generateVisibilityMap(launchTime)

    console.log("[v0] Visibility map generated successfully")

    return new NextResponse(mapBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error("[v0] Error generating visibility map:", error)

    return NextResponse.json({ error: "Failed to generate visibility map" }, { status: 500 })
  }
}
