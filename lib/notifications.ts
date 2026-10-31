import {
  getActiveSubscribers,
  upsertLaunchSnapshot,
  getLaunchSnapshot,
  updateNotificationStatus,
  type Subscriber,
} from "@/lib/database"
import { getUpcomingWallopsLaunches, hasSignificantScheduleSlip, type Launch } from "@/lib/launch-library"
import { sendLaunchNotifications, type LaunchNotificationType } from "@/lib/email"
import { hasFirmDate, STATUS } from "@/lib/launch-time"

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
    const launches = await getUpcomingWallopsLaunches()
    if (!launches) {
      result.errors.push("Could not fetch launches from Launch Library")
      return result
    }
    if (launches.length === 0) {
      console.log("No upcoming Wallops launches found")
      return result
    }

    const subscribers = await getActiveSubscribers()
    if (subscribers.length === 0) {
      console.log("No active subscribers found")
      return result
    }

    console.log(`[v0] Processing ${launches.length} upcoming launches for ${subscribers.length} subscribers`)

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

// Statuses that mean the launch no longer has a date to look forward to
const DELAYED_STATUS_IDS = [STATUS.HOLD, STATUS.TBD]
const DELAYED_STATUS_NAMES = ["On Hold", "To Be Determined"]

async function processLaunch(launch: Launch, subscribers: Subscriber[], result: ProcessingResult): Promise<void> {
  const snapshot = await getLaunchSnapshot(launch.id)

  const hasStatusChange = Boolean(snapshot && snapshot.status !== launch.status.name)
  const hasScheduleChange = Boolean(snapshot && hasSignificantScheduleSlip(snapshot.net, launch.net))
  const wasDelayed = Boolean(snapshot && DELAYED_STATUS_NAMES.includes(snapshot.status))
  // Launch Library keeps far-off launches at placeholder dates (e.g. "TBD, sometime in 2026" stored as Dec 31 00:00 UTC).
  // Only a Go / To Be Confirmed launch with at least a known day is worth an email.
  const firmDate = hasFirmDate(launch)

  await upsertLaunchSnapshot({
    ll2_id: launch.id,
    net: launch.net,
    window_start: launch.window_start ?? null,
    window_end: launch.window_end ?? null,
    status: launch.status.name,
    notified_t24: snapshot?.notified_t24 ?? false,
    notified_t2: snapshot?.notified_t2 ?? false,
    last_net_emailed: snapshot?.last_net_emailed ?? null,
  })

  // Subscribers have heard about a launch once they've had its alert or a reschedule email. Delay/reschedule emails
  // are only sent for those launches; otherwise placeholder dates that Launch Library moves around would generate a
  // stream of meaningless "rescheduled" emails.
  const subscribersKnow = Boolean(snapshot?.notified_t24 || snapshot?.last_net_emailed)

  // Put on hold or back to "To Be Determined": tell people not to expect it on the date they were given
  if (subscribersKnow && hasStatusChange && !wasDelayed && DELAYED_STATUS_IDS.includes(launch.status.id)) {
    console.log(`[v0] Launch ${launch.name} has been delayed (${launch.status.name})`)
    await notify(launch, subscribers, "delay", result)
    return
  }

  let alerted = snapshot?.notified_t24 ?? false

  // New firm date, either a NET change or coming back from a hold/TBD
  if (subscribersKnow && firmDate && (hasScheduleChange || (hasStatusChange && wasDelayed))) {
    console.log(`[v0] Launch ${launch.name} has been rescheduled`)

    // If it moved into the alert window, the launch alert below covers it
    if (!isWithinAlertWindow(launch.net)) {
      await notify(launch, subscribers, "slip", result)
    }

    // Re-arm the launch alert for the new date
    await updateNotificationStatus(launch.id, { notified_t24: false, last_net_emailed: launch.net })
    alerted = false
  }

  // Launch alert: one email per launch, sent by the last daily run before it
  if (!alerted && firmDate && isWithinAlertWindow(launch.net)) {
    console.log(`[v0] Sending launch alerts for ${launch.name}`)
    await notify(launch, subscribers, "alert", result)
    await updateNotificationStatus(launch.id, { notified_t24: true })
  }
}

async function notify(
  launch: Launch,
  subscribers: Subscriber[],
  type: LaunchNotificationType,
  result: ProcessingResult,
): Promise<void> {
  const { sent, errors } = await sendLaunchNotifications(
    subscribers.map((subscriber) => subscriber.email),
    launch,
    type,
  )
  result.notifications += sent
  result.errors.push(...errors)
}

// The cron runs once a day (16:00 UTC), so alert for anything launching before the next run.
// 26h rather than 24h covers Vercel starting the cron anywhere within its scheduled hour.
const ALERT_WINDOW_MS = 26 * 60 * 60 * 1000

function isWithinAlertWindow(launchIso: string): boolean {
  const msUntilLaunch = new Date(launchIso).getTime() - Date.now()
  return msUntilLaunch >= 0 && msUntilLaunch < ALERT_WINDOW_MS
}
