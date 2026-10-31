import { Resend } from "resend"
import { generateUnsubscribeToken } from "@/lib/tokens"
import { formatNet, hasExactTime, launchDayLabel } from "@/lib/launch-time"
import { getWebcastUrl, type Launch } from "@/lib/launch-library"
import { isNightLaunch, VISIBILITY_MAP_EMAIL_PATH } from "@/lib/visibility-map"

// Created on first use so importing this module (e.g. during `next build`) doesn't require the API key
let resendClient: Resend | null = null
function resend(): Resend {
  resendClient ??= new Resend(process.env.RESEND_API_KEY)
  return resendClient
}

export type LaunchNotificationType = "alert" | "slip" | "delay"

function fromAddress(): string {
  return process.env.EMAIL_FROM || "Wallops Launch Alerts <onboarding@resend.dev>"
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
}

// Launch names and descriptions come from Launch Library, a community-edited source, so escape them
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function button(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="background: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; margin: 4px;">${label}</a>`
}

function layout({ title, subtitle, body, footer }: { title: string; subtitle?: string; body: string; footer: string }): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e293b 0%, #1e40af 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🚀 Wallops Launch Alerts</h1>
          ${subtitle ? `<p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">${subtitle}</p>` : ""}
        </div>

        <div style="background: #f8fafc; padding: 30px; border-radius: 10px;">
          ${body}
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            ${footer}
          </p>
        </div>
      </body>
    </html>
  `
}

const DATA_CREDIT = "Launch data from The Space Devs Launch Library"

export async function sendConfirmationEmail(email: string, token: string): Promise<boolean> {
  try {
    const confirmUrl = `${baseUrl()}/confirm?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`

    const { error } = await resend().emails.send({
      from: fromAddress(),
      to: [email],
      subject: "Confirm your Wallops Launch Alert subscription",
      html: layout({
        title: "Confirm Your Subscription",
        subtitle: "Confirm your subscription",
        body: `
          <h2 style="color: #1e293b; margin-top: 0;">Almost there!</h2>
          <p style="margin-bottom: 25px;">
            Thanks for subscribing to Wallops Launch Alerts! You'll receive email notifications:
          </p>
          <ul style="margin-bottom: 25px; padding-left: 20px;">
            <li><strong>Launch alert</strong> around noon ET the day before or the day of each launch</li>
            <li><strong>Schedule changes</strong> if a launch you were alerted about is delayed or rescheduled</li>
            <li><strong>Night launches</strong> - Visibility maps for East Coast viewing</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            ${button(confirmUrl, "Confirm Subscription")}
          </div>

          <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
            This confirmation link will expire in 24 hours. If you didn't request this subscription, you can safely ignore this email.
          </p>
        `,
        footer: `Wallops Launch Alerts • ${DATA_CREDIT}`,
      }),
    })

    if (error) {
      console.error("[v0] Error sending confirmation email:", error)
      return false
    }

    console.log(`[v0] Confirmation email sent successfully to ${email}`)
    return true
  } catch (error) {
    console.error("[v0] Error sending confirmation email:", error)
    return false
  }
}

function detailRow(label: string, value: string): string {
  return `<p style="margin: 6px 0;"><strong>${label}:</strong> ${value}</p>`
}

async function buildLaunchEmail(email: string, launch: Launch, type: LaunchNotificationType, night: boolean) {
  const unsubscribeToken = await generateUnsubscribeToken(email)
  const unsubscribeUrl = `${baseUrl()}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`
  // RFC 8058 one-click unsubscribe: mail apps POST here directly from their own "Unsubscribe" button
  const oneClickUrl = `${baseUrl()}/api/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`

  const name = escapeHtml(launch.name)
  const when = escapeHtml(formatNet(launch))
  const webcastUrl = getWebcastUrl(launch)

  let subject = ""
  let intro = ""
  switch (type) {
    case "alert": {
      const day = launchDayLabel(launch)
      subject = `🚀 Wallops launch ${day}: ${launch.name}`
      intro = `<h2 style="color: #1e293b; margin-top: 0;">Launch Alert</h2>
        <p><strong>${name}</strong> is scheduled to launch ${day}.</p>`
      break
    }
    case "slip":
      subject = `📅 Launch rescheduled: ${launch.name}`
      intro = `<h2 style="color: #1e293b; margin-top: 0;">Launch Rescheduled</h2>
        <p><strong>${name}</strong> has a new launch date. We'll send a launch alert shortly before it flies.</p>`
      break
    case "delay":
      subject = `⏸️ Launch delayed: ${launch.name}`
      intro = `<h2 style="color: #1e293b; margin-top: 0;">Launch Delayed</h2>
        <p><strong>${name}</strong> no longer has a firm launch date. We'll email you when a new date is set.</p>`
      break
  }

  const details = [
    type !== "delay" ? detailRow("Launch time", when) : "",
    detailRow("Status", escapeHtml(launch.status.name)),
    detailRow("Location", escapeHtml(launch.pad?.name || "Wallops Flight Facility")),
    launch.mission?.description ? detailRow("Mission", escapeHtml(launch.mission.description)) : "",
  ].join("")

  const actions =
    type === "delay"
      ? ""
      : `<div style="text-align: center; margin: 25px 0 5px;">
          ${webcastUrl ? button(webcastUrl, "Watch the webcast") : ""}
          ${button(baseUrl(), "Live countdown")}
        </div>`

  const map =
    night && type !== "delay"
      ? `<h3 style="color: #1e293b; margin: 30px 0 8px;">🌙 Night launch: you may be able to see it</h3>
         <p style="margin-top: 0;">Night launches from Wallops can be visible along much of the East Coast. Colors show how many seconds after liftoff the rocket rises into view.</p>
         <img src="${baseUrl()}${VISIBILITY_MAP_EMAIL_PATH}" alt="Map of where the launch may be visible along the East Coast" width="540" style="width: 100%; max-width: 540px; height: auto; border-radius: 8px;">`
      : ""

  return {
    from: fromAddress(),
    to: [email],
    subject,
    headers: {
      "List-Unsubscribe": `<${oneClickUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    html: layout({
      title: escapeHtml(subject),
      body: `${intro}${details}${actions}${map}`,
      footer: `<a href="${unsubscribeUrl}" style="color: #94a3b8;">Unsubscribe</a> • Wallops Launch Alerts • ${DATA_CREDIT}`,
    }),
  }
}

// Resend allows 100 emails per batch call and 2 API requests per second by default
const BATCH_SIZE = 100
const BATCH_DELAY_MS = 600

export async function sendLaunchNotifications(
  emails: string[],
  launch: Launch,
  type: LaunchNotificationType,
): Promise<{ sent: number; errors: string[] }> {
  const night = hasExactTime(launch) && isNightLaunch(launch.net)
  const messages = await Promise.all(emails.map((email) => buildLaunchEmail(email, launch, type, night)))

  let sent = 0
  const errors: string[] = []
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const chunk = messages.slice(i, i + BATCH_SIZE)
    try {
      const { error } = await resend().batch.send(chunk)
      if (error) {
        errors.push(`Failed to send ${type} emails ${i + 1}-${i + chunk.length} for ${launch.id}: ${error.message}`)
      } else {
        sent += chunk.length
      }
    } catch (error) {
      errors.push(`Failed to send ${type} emails ${i + 1}-${i + chunk.length} for ${launch.id}: ${error}`)
    }

    if (i + BATCH_SIZE < messages.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
    }
  }

  console.log(`[v0] Sent ${sent}/${emails.length} ${type} emails for ${launch.name}`)
  return { sent, errors }
}

// Sent when someone asks to unsubscribe by typing an address, so only the inbox owner can confirm
export async function sendUnsubscribeLinkEmail(email: string): Promise<boolean> {
  try {
    const token = await generateUnsubscribeToken(email)
    const unsubscribeUrl = `${baseUrl()}/unsubscribe?token=${encodeURIComponent(token)}`

    const { error } = await resend().emails.send({
      from: fromAddress(),
      to: [email],
      subject: "Unsubscribe from Wallops Launch Alerts",
      html: layout({
        title: "Unsubscribe from Wallops Launch Alerts",
        body: `
          <p>We received a request to unsubscribe this address from Wallops Launch Alerts.</p>
          <div style="text-align: center; margin: 30px 0;">
            ${button(unsubscribeUrl, "Unsubscribe")}
          </div>
          <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
            If you didn't request this, you can ignore this email and you'll keep receiving alerts.
          </p>
        `,
        footer: "Wallops Launch Alerts",
      }),
    })

    if (error) {
      console.error("[v0] Error sending unsubscribe link email:", error)
      return false
    }
    return true
  } catch (error) {
    console.error("[v0] Error sending unsubscribe link email:", error)
    return false
  }
}
