import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendConfirmationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  const confirmUrl = `${baseUrl}/confirm?token=${token}&email=${encodeURIComponent(email)}`

  try {
    const { data, error } = await resend.emails.send({
      from: "Wallops Alerts <onboarding@resend.dev>",
      to: [email],
      subject: "Confirm your Wallops Launch Alert subscription",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirm Your Subscription</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🚀 Wallops Launch Alerts</h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Confirm your subscription to receive launch notifications</p>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0;">
              <h2 style="color: #1e40af; margin-top: 0; font-size: 24px;">Almost there!</h2>
              <p style="font-size: 16px; margin-bottom: 25px;">
                Click the button below to confirm your email address and start receiving alerts for NASA Wallops launches.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmUrl}" style="background: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.2s;">
                  Confirm Subscription
                </a>
              </div>
              
              <p style="font-size: 14px; color: #64748b; margin-top: 25px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${confirmUrl}" style="color: #1e40af; word-break: break-all;">${confirmUrl}</a>
              </p>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background: #f1f5f9; border-radius: 8px; font-size: 14px; color: #64748b;">
              <p style="margin: 0;"><strong>What you'll receive:</strong></p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>T-24h and T-2h launch notifications</li>
                <li>Night launch visibility maps for East Coast viewing</li>
                <li>Schedule updates and scrub notifications</li>
              </ul>
            </div>
            
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 30px;">
              This confirmation link will expire in 24 hours.
            </p>
          </body>
        </html>
      `,
    })

    if (error) {
      console.error("[SERVER][v0] Error sending confirmation email:", error)
      throw error
    }

    console.log("[SERVER][v0] Confirmation email sent successfully:", data)
    return data
  } catch (error) {
    console.error("[SERVER][v0] Error sending confirmation email:", error)
    throw error
  }
}

export async function sendLaunchNotification(
  email: string,
  launch: any,
  notificationType: "T24" | "T2" | "slip" | "scrub",
  visibilityMapBuffer?: Buffer,
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`

  let subject = ""
  let heading = ""

  switch (notificationType) {
    case "T24":
      subject = `🚀 Wallops launch in 24 hours: ${launch.name}`
      heading = "Launch Alert - T-24 Hours"
      break
    case "T2":
      subject = `🚀 Wallops launch in 2 hours: ${launch.name}`
      heading = "Launch Alert - T-2 Hours"
      break
    case "slip":
      subject = `📅 Schedule Update: ${launch.name}`
      heading = "Launch Schedule Update"
      break
    case "scrub":
      subject = `❌ Launch Scrubbed: ${launch.name}`
      heading = "Launch Scrubbed"
      break
  }

  const attachments = []
  if (visibilityMapBuffer) {
    attachments.push({
      filename: "visibility-map.png",
      content: visibilityMapBuffer,
    })
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "Wallops Alerts <onboarding@resend.dev>",
      to: [email],
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🚀 ${heading}</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0;">
              <h2 style="color: #1e40af; margin-top: 0; font-size: 24px;">${launch.name}</h2>
              <div style="font-size: 16px; margin-bottom: 20px;">
                <p><strong>Launch Time:</strong> ${new Date(launch.net).toLocaleString("en-US", {
                  timeZone: "America/New_York",
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZoneName: "short",
                })}</p>
                <p><strong>Pad:</strong> ${launch.pad?.name || "TBD"}</p>
                <p><strong>Status:</strong> ${launch.status?.name || "Unknown"}</p>
              </div>
              
              ${
                visibilityMapBuffer
                  ? `
                <div style="margin: 20px 0;">
                  <h3 style="color: #1e40af; margin-bottom: 10px;">Night Launch Visibility Map</h3>
                  <img src="cid:visibility-map.png" alt="Launch Visibility Map" style="max-width: 100%; height: auto; border-radius: 8px;">
                  <p style="font-size: 14px; color: #64748b; margin-top: 10px;">
                    This map shows estimated visibility zones for the rocket plume during night conditions.
                  </p>
                </div>
              `
                  : ""
              }
            </div>
            
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 30px;">
              <a href="${unsubscribeUrl}" style="color: #94a3b8;">Unsubscribe</a> from these alerts
            </p>
          </body>
        </html>
      `,
      attachments,
    })

    if (error) {
      console.error("[SERVER][v0] Error sending launch notification:", error)
      throw error
    }

    console.log("[SERVER][v0] Launch notification sent successfully:", data)
    return data
  } catch (error) {
    console.error("[SERVER][v0] Error sending launch notification:", error)
    throw error
  }
}
