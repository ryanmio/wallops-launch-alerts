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

// Health check for cron system. Deliberately doesn't call Launch Library: this endpoint is public, and every
// call would count against LL2's 15 requests/hour, which the site and the cron need.
export async function checkCronHealth(): Promise<{
  healthy: boolean
  issues: string[]
}> {
  const issues: string[] = []

  for (const name of ["CRON_SECRET", "TOKEN_SECRET", "RESEND_API_KEY", "DATABASE_URL", "NEXT_PUBLIC_BASE_URL"]) {
    if (!process.env[name]) {
      issues.push(`${name} not configured`)
    }
  }

  return {
    healthy: issues.length === 0,
    issues,
  }
}
