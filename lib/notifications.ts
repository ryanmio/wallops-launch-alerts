import {
  getActiveSubscribers,
  upsertLaunchSnapshot,
  getLaunchSnapshot,
  updateNotificationStatus,
} from "@/lib/database"
import {
  getUpcomingWallopsLaunches,
  getLaunchDetail,
  hasSignificantScheduleSlip,
  shouldNotifyForLaunch,
} from "@/lib/launch-library"
import { sendLaunchNotification } from "@/lib/email"
import { isNightLaunch, generateVisibilityMap } from "@/lib/visibility-map"

// Use DB shape for snapshots (snake_case) to avoid undefined values during SQL upserts
import type { LaunchSnapshot as DbLaunchSnapshot } from "@/lib/database"

interface ProcessingResult {
  processed: number
  notifications: number
  errors: string[]
}

export async function processLaunchNotifications(): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    processed: 0,
    notifications: 0,
    errors: [],
  }

  try {
    console.log("Starting launch notification processing")

    // Get upcoming Wallops launches
    const launches = await getUpcomingWallopsLaunches()
    if (launches.length === 0) {
      console.log("No upcoming Wallops launches found")
      return result
    }

    console.log(`[v0] Processing ${launches.length} upcoming launches`)

    // Get active subscribers
    const subscribers = await getActiveSubscribers()
    if (subscribers.length === 0) {
      console.log("No active subscribers found")
      return result
    }

    console.log(`[v0] Found ${subscribers.length} active subscribers`)

    // Process each launch
    for (const launch of launches) {
      try {
        await processLaunch(launch, subscribers, result)
        result.processed++
      } catch (error) {
        const errorMsg = `Error processing launch ${launch.id}: ${error}`
        console.error(`[v0] ${errorMsg}`)
        result.errors.push(errorMsg)
      }
    }

    console.log(
      `[v0] Notification processing complete. Processed: ${result.processed}, Notifications: ${result.notifications}, Errors: ${result.errors.length}`,
    )
    return result
  } catch (error) {
    const errorMsg = `Fatal error in processLaunchNotifications: ${error}`
    console.error(`[v0] ${errorMsg}`)
    result.errors.push(errorMsg)
    return result
  }
}

async function processLaunch(launch: any, subscribers: any[], result: ProcessingResult): Promise<void> {
  // Get or create launch snapshot
  const snapshot = await getLaunchSnapshot(launch.id)

  const isNewLaunch = !snapshot
  const hasStatusChange = Boolean(snapshot && snapshot.status !== launch.status.name)
  const hasScheduleChange = Boolean(snapshot && hasSignificantScheduleSlip(snapshot.net, launch.net))

  // Update or create snapshot
  const upsertPayload: Omit<DbLaunchSnapshot, "id" | "last_updated"> = {
    ll2_id: launch.id,
    net: launch.net,
    window_start: launch.window_start ?? null,
    window_end: launch.window_end ?? null,
    status: launch.status.name,
    notified_t24: snapshot?.notified_t24 ?? false,
    notified_t2: snapshot?.notified_t2 ?? false,
    last_net_emailed: snapshot?.last_net_emailed ?? null,
  }

  await upsertLaunchSnapshot(upsertPayload)

  // Subscribers only hear about a launch shortly before it, so scrub/slip emails are only sent for launches
  // they've already been alerted about. Otherwise placeholder NETs (e.g. "end of year") that Launch
  // Library moves around would generate a stream of meaningless "rescheduled" emails.
  const alreadyAlerted = snapshot?.notified_t24 ?? false

  // Handle scrub/hold notifications
  if (
    alreadyAlerted &&
    hasStatusChange &&
    (launch.status.name.includes("Hold") || launch.status.name.includes("Scrub"))
  ) {
    console.log(`[v0] Launch ${launch.name} has been scrubbed/held`)
    await sendNotificationsToSubscribers(launch, subscribers, "scrub", result)
    return
  }

  let notifiedLaunchDay = alreadyAlerted

  // Handle schedule slip notifications
  if (alreadyAlerted && hasScheduleChange && snapshot) {
    console.log(`[v0] Launch ${launch.name} has significant schedule slip`)

    // If it slipped into the alert window, the launch alert below covers it
    if (!isWithinAlertWindow(launch.net) && snapshot.last_net_emailed !== launch.net) {
      await sendNotificationsToSubscribers(launch, subscribers, "slip", result)
    }

    // Re-arm the launch alert for the new date
    await updateNotificationStatus(launch.id, { notified_t24: false, last_net_emailed: launch.net })
    notifiedLaunchDay = false
  }

  // Launch alert: one email per launch, sent by the last daily run before it
  if (!notifiedLaunchDay && isWithinAlertWindow(launch.net)) {
    console.log(`Sending launch alerts for ${launch.name}`)
    // "T24" template says "today"/"tomorrow" with the time in ET
    await sendNotificationsToSubscribers(launch, subscribers, "T24", result)

    await updateNotificationStatus(launch.id, { notified_t24: true })
  }
}

async function sendNotificationsToSubscribers(
  launch: any,
  subscribers: any[],
  notificationType: "T24" | "T2" | "slip" | "scrub",
  result: ProcessingResult,
): Promise<void> {
  // Get detailed launch information
  const detailedLaunch = await getLaunchDetail(launch.id)
  if (!detailedLaunch) {
    throw new Error(`Failed to get detailed launch information for ${launch.id}`)
  }

  // Check if this is a night launch and generate visibility map if needed
  let visibilityMapBuffer: Buffer | undefined
  if (isNightLaunch(detailedLaunch.net)) {
    console.log(`[v0] Night launch detected, generating visibility map`)
    try {
      visibilityMapBuffer = await generateVisibilityMap()
    } catch (error) {
      console.error(`[v0] Failed to generate visibility map:`, error)
      // Continue without map rather than failing the entire notification
    }
  }

  // Send notifications in batches to avoid overwhelming the email service
  const batchSize = 10
  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize)

    const promises = batch.map(async (subscriber) => {
      try {
        const success = await sendLaunchNotification(
          subscriber.email,
          detailedLaunch,
          notificationType,
          visibilityMapBuffer,
        )

        if (success) {
          result.notifications++
          console.log(`[v0] Notification sent to ${subscriber.email}`)
        } else {
          throw new Error("Email sending failed")
        }
      } catch (error) {
        const errorMsg = `Failed to send notification to ${subscriber.email}: ${error}`
        console.error(`[v0] ${errorMsg}`)
        result.errors.push(errorMsg)
      }
    })

    await Promise.all(promises)

    // Small delay between batches to be respectful to email service
    if (i + batchSize < subscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
}

// Helper function to check if notifications should be paused
export function shouldPauseNotifications(status: string): boolean {
  const pauseStatuses = ["Hold", "Scrub", "Failure", "Partial Failure"]
  return pauseStatuses.some((pauseStatus) => status.includes(pauseStatus))
}

// Helper function to reset notification flags when launch is rescheduled
export async function resetNotificationFlags(launchId: string): Promise<void> {
  try {
    const snapshot = await getLaunchSnapshot(launchId)
    if (snapshot) {
      await updateNotificationStatus(launchId, {
        notified_t24: false,
        notified_t2: false,
        last_net_emailed: null,
      })
      console.log(`[v0] Reset notification flags for launch ${launchId}`)
    }
  } catch (error) {
    console.error(`[v0] Error resetting notification flags for launch ${launchId}:`, error)
  }
}

// The cron runs once a day (16:00 UTC), so alert for anything launching before the next run.
// 26h rather than 24h covers Vercel starting the cron anywhere within its scheduled hour.
const ALERT_WINDOW_MS = 26 * 60 * 60 * 1000

function isWithinAlertWindow(launchIso: string): boolean {
  const msUntilLaunch = new Date(launchIso).getTime() - Date.now()
  return msUntilLaunch >= 0 && msUntilLaunch < ALERT_WINDOW_MS
}
