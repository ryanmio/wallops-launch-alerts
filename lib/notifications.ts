import { getActiveSubscribers, upsertLaunchSnapshot, getLaunchSnapshot } from "@/lib/database"
import {
  getUpcomingWallopsLaunches,
  getLaunchDetail,
  hasSignificantScheduleSlip,
  shouldNotifyForLaunch,
} from "@/lib/launch-library"
import { sendLaunchNotification } from "@/lib/email"
import { isNightLaunch, generateVisibilityMap } from "@/lib/visibility-map"

interface LaunchSnapshot {
  id: string
  ll2Id: string
  net: string
  windowStart?: string | null
  windowEnd?: string | null
  status: string
  lastUpdated: string
  notifiedT24: boolean
  notifiedT2: boolean
  lastNetEmailed?: string | null
}

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
    console.log("[v0] Starting launch notification processing")

    // Get upcoming Wallops launches
    const launches = await getUpcomingWallopsLaunches()
    if (launches.length === 0) {
      console.log("[v0] No upcoming Wallops launches found")
      return result
    }

    console.log(`[v0] Processing ${launches.length} upcoming launches`)

    // Get active subscribers
    const subscribers = await getActiveSubscribers()
    if (subscribers.length === 0) {
      console.log("[v0] No active subscribers found")
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
  const hasStatusChange = snapshot && snapshot.status !== launch.status.name
  const hasScheduleChange = snapshot && hasSignificantScheduleSlip(snapshot.net, launch.net)

  // Update or create snapshot
  const newSnapshot: LaunchSnapshot = {
    id: launch.id,
    ll2Id: launch.id,
    net: launch.net,
    windowStart: launch.window_start || null,
    windowEnd: launch.window_end || null,
    status: launch.status.name,
    lastUpdated: launch.last_updated,
    notifiedT24: snapshot?.notifiedT24 || false,
    notifiedT2: snapshot?.notifiedT2 || false,
    lastNetEmailed: snapshot?.lastNetEmailed || null,
  }

  await upsertLaunchSnapshot(newSnapshot)

  // Handle scrub/hold notifications
  if (hasStatusChange && (launch.status.name.includes("Hold") || launch.status.name.includes("Scrub"))) {
    console.log(`[v0] Launch ${launch.name} has been scrubbed/held`)
    await sendNotificationsToSubscribers(launch, subscribers, "scrub", result)
    return
  }

  // Handle schedule slip notifications
  if (hasScheduleChange && snapshot) {
    console.log(`[v0] Launch ${launch.name} has significant schedule slip`)

    // Only send slip notification if we haven't already notified for this NET
    if (snapshot.lastNetEmailed !== launch.net) {
      await sendNotificationsToSubscribers(launch, subscribers, "slip", result)

      // Update the snapshot to record this NET was emailed
      newSnapshot.lastNetEmailed = launch.net
      await upsertLaunchSnapshot(newSnapshot)
    }
    return
  }

  // Handle T-24h notifications
  if (!newSnapshot.notifiedT24 && shouldNotifyForLaunch(launch, "T24")) {
    console.log(`[v0] Sending T-24h notifications for ${launch.name}`)
    await sendNotificationsToSubscribers(launch, subscribers, "T24", result)

    newSnapshot.notifiedT24 = true
    await upsertLaunchSnapshot(newSnapshot)
  }

  // Handle T-2h notifications
  if (!newSnapshot.notifiedT2 && shouldNotifyForLaunch(launch, "T2")) {
    console.log(`[v0] Sending T-2h notifications for ${launch.name}`)
    await sendNotificationsToSubscribers(launch, subscribers, "T2", result)

    newSnapshot.notifiedT2 = true
    await upsertLaunchSnapshot(newSnapshot)
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
      const resetSnapshot: LaunchSnapshot = {
        ...snapshot,
        notifiedT24: false,
        notifiedT2: false,
        lastNetEmailed: null,
      }
      await upsertLaunchSnapshot(resetSnapshot)
      console.log(`[v0] Reset notification flags for launch ${launchId}`)
    }
  } catch (error) {
    console.error(`[v0] Error resetting notification flags for launch ${launchId}:`, error)
  }
}
