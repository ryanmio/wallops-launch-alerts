import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendConfirmationEmail(email: string, token: string): Promise<boolean> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const confirmUrl = `${baseUrl}/confirm?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`

    console.log(`[v0] Sending confirmation email to ${email}`)

    const { data, error } = await resend.emails.send({
      from: "Wallops Launch Alerts <onboarding@resend.dev>",
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
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e293b 0%, #1e40af 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🚀 Wallops Launch Alerts</h1>
              <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Confirm your subscription</p>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 10px; border-left: 4px solid #f97316;">
              <h2 style="color: #1e293b; margin-top: 0;">Almost there!</h2>
              <p style="margin-bottom: 25px;">
                Thanks for subscribing to Wallops Launch Alerts! You'll receive email notifications:
              </p>
              <ul style="margin-bottom: 25px; padding-left: 20px;">
                <li><strong>Launch-day alert</strong> (around noon ET) with launch details</li>
                <li><strong>Night launches</strong> - Special visibility maps for East Coast viewing</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmUrl}" 
                   style="background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                  Confirm Subscription
                </a>
              </div>
              
              <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
                This confirmation link will expire in 24 hours. If you didn't request this subscription, you can safely ignore this email.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                Wallops Launch Alerts • Powered by NASA Launch Library
              </p>
            </div>
          </body>
        </html>
      `,
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

export async function sendLaunchNotification(
  email: string,
  launch: any,
  type: "T24" | "T2" | "slip" | "scrub",
  visibilityMapBuffer?: Buffer,
): Promise<boolean> {
  try {
    console.log(`[v0] Sending ${type} notification to ${email} for launch ${launch.name}`)

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`

    let subject = ""
    let content = ""

    switch (type) {
      case "T24":
        subject = `🚀 Wallops launch today: ${launch.name}`
        content = `
          <h2>Launch-Day Alert</h2>
          <p><strong>${launch.name}</strong> is scheduled to launch today.</p>
        `
        break
      case "T2":
        subject = `🚀 Wallops launch today: ${launch.name}`
        content = `
          <h2>Launch-Day Alert</h2>
          <p><strong>${launch.name}</strong> is scheduled to launch today.</p>
        `
        break
      case "slip":
        subject = `📅 Launch rescheduled: ${launch.name}`
        content = `
          <h2>Launch Schedule Update</h2>
          <p><strong>${launch.name}</strong> has been rescheduled.</p>
        `
        break
      case "scrub":
        subject = `❌ Launch scrubbed: ${launch.name}`
        content = `
          <h2>Launch Scrubbed</h2>
          <p><strong>${launch.name}</strong> has been scrubbed. We'll notify you when a new date is set.</p>
        `
        break
    }

    const attachments = []
    if (visibilityMapBuffer) {
      attachments.push({
        filename: "visibility-map.webp",
        content: visibilityMapBuffer,
      })
    }

    const { data, error } = await resend.emails.send({
      from: "Wallops Launch Alerts <onboarding@resend.dev>",
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
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e293b 0%, #1e40af 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🚀 Wallops Launch Alerts</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 10px; border-left: 4px solid #f97316;">
              ${content}
              <p><strong>Launch Time:</strong> ${new Date(launch.net).toLocaleString()}</p>
              <p><strong>Location:</strong> ${launch.pad?.name || "Wallops Flight Facility"}</p>
              ${launch.mission?.description ? `<p><strong>Mission:</strong> ${launch.mission.description}</p>` : ""}
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                <a href="${unsubscribeUrl}" style="color: #94a3b8;">Unsubscribe</a> • 
                Wallops Launch Alerts • Powered by NASA Launch Library
              </p>
            </div>
          </body>
        </html>
      `,
      attachments,
    })

    if (error) {
      console.error(`[v0] Error sending ${type} notification:`, error)
      return false
    }

    console.log(`[v0] ${type} notification sent successfully to ${email}`)
    return true
  } catch (error) {
    console.error(`[v0] Error sending ${type} notification:`, error)
    return false
  }
}
