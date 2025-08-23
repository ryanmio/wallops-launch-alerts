import { NextResponse } from "next/server"
import { generateVisibilityMap } from "@/lib/visibility-map"

export async function GET() {
  try {
    console.log("Generating test visibility map...")
    const mapBuffer = await generateVisibilityMap()

    return new NextResponse(mapBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": mapBuffer.length.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("[v0] Error generating test visibility map:", error)
    return NextResponse.json({ error: "Failed to generate visibility map" }, { status: 500 })
  }
}
