import { ImageResponse } from "next/og"
import { getUpcomingWallopsLaunches } from "@/lib/launch-library"
import { formatNet } from "@/lib/launch-time"
import { readFileSync } from "fs"
import { join } from "path"

export const runtime = "nodejs"
// Regenerate with the homepage so link previews show the current next launch, not the one at deploy time
export const revalidate = 600

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"

function sanitizeMissionName(mission?: string | null, fallbackName?: string | null): string {
  let name = (mission || "").trim()
  if (!name && fallbackName) {
    // LL2 names often contain "•" separators like "Rocket • Mission"
    const parts = fallbackName.split("•").map((p) => p.trim())
    name = parts[parts.length - 1] || fallbackName
  }
  return name || "TBD"
}

function truncate(input: string, max: number): string {
  if (input.length <= max) return input
  if (max <= 1) return "…"
  return input.slice(0, Math.max(0, max - 1)).trimEnd() + "…"
}

export default async function Image() {
  const launches = await getUpcomingWallopsLaunches()
  const next = launches?.[0]

  const mission = sanitizeMissionName(next?.mission?.name, next?.name)
  const prefix = "NEXT LAUNCH: "
  const sep = " - "
  // Placeholder dates render at their real precision (e.g. "2026"), never as a made-up time of day
  const dateTimeText = next ? formatNet(next).replace(/ E[DS]T$/, " ET") : "TBD"

  // Heuristic total target length for a crisp single line at 1200px
  // Lowered to avoid ellipsis so the line remains visually centered
  const targetTotalChars = 52
  const allowedMissionChars = Math.max(12, targetTotalChars - (prefix.length + dateTimeText.length))
  const missionShort = truncate(mission, allowedMissionChars)

  const fullText = `${prefix}${missionShort}${sep}${dateTimeText}`

  // Adjust font size based on final string length
  const textLength = fullText.length
  let fontSize = 38
  if (textLength > 58) fontSize = 32
  if (textLength > 70) fontSize = 28
  if (textLength > 82) fontSize = 24

  // Load the base image from /public
  const baseImagePath = join(process.cwd(), "public", "og-share-base.jpg")
  const baseImageData = readFileSync(baseImagePath)
  const baseImageArrayBuffer = baseImageData.buffer.slice(
    baseImageData.byteOffset,
    baseImageData.byteOffset + baseImageData.byteLength,
  )

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          alignItems: "stretch",
          justifyContent: "center",
          backgroundColor: "#000",
        }}
      >
        <img
          src={baseImageArrayBuffer as any}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "32px 48px",
            backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.0))",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontSize,
              fontWeight: 800,
              letterSpacing: -1,
              textTransform: "uppercase",
            }}
          >
            {fullText}
          </div>
        </div>
      </div>
    ),
  )
}


