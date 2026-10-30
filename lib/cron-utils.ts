// Utility functions for cron job management and monitoring

import { timingSafeEqual } from "crypto"

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set on the project.
// Fails closed: if CRON_SECRET isn't configured, every request is rejected.
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error("[v0] CRON_SECRET is not configured; rejecting cron request")
    return false
  }

  const provided = Buffer.from(request.headers.get("authorization") ?? "")
  const expected = Buffer.from(`Bearer ${secret}`)
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

export interface CronJobResult {
  success: boolean
  duration: number
  timestamp: string
  launchesProcessed: number
  notificationsSent: number
  errors: string[]
}

export class CronJobLogger {
  private startTime: number
  private errors: string[] = []
  private launchesProcessed = 0
  private notificationsSent = 0

  constructor() {
    this.startTime = Date.now()
  }

  logError(error: string | Error): void {
    const errorMessage = error instanceof Error ? error.message : error
    this.errors.push(errorMessage)
    console.error(`[v0] Cron error: ${errorMessage}`)
  }

  logLaunchProcessed(): void {
    this.launchesProcessed++
  }

  logNotificationSent(): void {
    this.notificationsSent++
  }

  getResult(): CronJobResult {
    return {
      success: this.errors.length === 0,
      duration: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
      launchesProcessed: this.launchesProcessed,
      notificationsSent: this.notificationsSent,
      errors: this.errors,
    }
  }
}

// Rate limiting for cron jobs to prevent abuse
const cronCallTracker = new Map<string, number>()

export function rateLimitCronCall(identifier: string, maxCallsPerHour = 3): boolean {
  const now = Date.now()
  const hourAgo = now - 60 * 60 * 1000

  // Clean old entries
  for (const [key, timestamp] of cronCallTracker.entries()) {
    if (timestamp < hourAgo) {
      cronCallTracker.delete(key)
    }
  }

  // Count recent calls for this identifier
  const recentCalls = Array.from(cronCallTracker.values()).filter((timestamp) => timestamp > hourAgo).length

  if (recentCalls >= maxCallsPerHour) {
    console.warn(`[v0] Rate limit exceeded for cron calls: ${recentCalls}/${maxCallsPerHour}`)
    return false
  }

  cronCallTracker.set(identifier, now)
  return true
}

// Health check for cron system
export async function checkCronHealth(): Promise<{
  healthy: boolean
  issues: string[]
  lastRun?: string
}> {
  const issues: string[] = []

  // Check environment variables
  if (!process.env.CRON_SECRET) {
    issues.push("CRON_SECRET not configured")
  }

  if (!process.env.TOKEN_SECRET) {
    issues.push("TOKEN_SECRET not configured")
  }

  if (!process.env.RESEND_API_KEY) {
    issues.push("RESEND_API_KEY not configured")
  }

  if (!process.env.DATABASE_URL) {
    issues.push("DATABASE_URL not configured")
  }

  // Check if we can connect to Launch Library
  try {
    const response = await fetch("https://ll.thespacedevs.com/2.3.0/launches/?limit=1")
    if (!response.ok) {
      issues.push("Cannot connect to Launch Library API")
    }
  } catch (error) {
    issues.push("Launch Library API connection failed")
  }

  return {
    healthy: issues.length === 0,
    issues,
    lastRun: new Date().toISOString(),
  }
}
