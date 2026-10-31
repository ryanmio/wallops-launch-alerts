# Wallops Night-Launch Alert Service

A comprehensive email alert service for NASA Wallops launches with night visibility mapping.

## Features

- **Automated Notifications**: One email alert before each Wallops launch, sent 0–26h ahead, only once the launch has a firm date
- **Night Launch Detection**: Automatic detection of night launches using solar elevation calculations
- **Visibility Maps**: NASA's East Coast visibility map on the site and in emails for night launches
- **Schedule Changes**: Delay and reschedule emails for launches subscribers were already alerted about
- **Double Opt-in Subscriptions**: Secure email subscription management with confirmation
- **Rate Limited API Integration**: Respects Launch Library 2's 15 requests/hour limit with caching

## Architecture

### Core Components

1. **Database Layer** (`lib/database.ts`)
   - Subscriber management with double opt-in
   - Launch snapshot tracking for schedule changes
   - PostgreSQL (Supabase) via direct connection

2. **Launch Library Integration** (`lib/launch-library.ts`)
   - One cached `mode=detailed` request for upcoming Wallops launches (serves stale data rather than waiting when capped)
   - `lib/launch-time.ts`: date precision / status rules and Eastern-time formatting

3. **Email System** (`lib/email.tsx`, `lib/notifications.ts`)
   - HTML email templates (Launch Library text is HTML-escaped)
   - Resend batch API, 100 emails per request
   - One-click `List-Unsubscribe` headers (RFC 8058)

4. **Visibility Mapping** (`lib/visibility-map.ts`)
   - Solar position calculation for night detection
   - Static NASA visibility map (`public/images/`; JPEG copy for email clients without WebP support)

5. **Subscription Management** (`app/api/subscribe/`, `app/api/unsubscribe/`)
   - Secure token-based confirmation
   - Unsubscribe handling with validation
   - Status checking endpoints

6. **Cron Scheduler** (`app/api/cron/check/`)
   - Automated processing daily at 16:00 UTC
   - Idempotent operation handling
   - Comprehensive error logging

### API Endpoints

- `POST /api/subscribe` - New subscription with double opt-in
- `GET /api/confirm` - Email confirmation handling
- `POST /api/unsubscribe` - Subscription cancellation (also accepts one-click `POST /api/unsubscribe?token=...`)
- `GET /api/next-wallops` - Cached upcoming launches
- `GET /api/cron/check` - Main notification processing (Vercel Cron; `POST` also accepted for manual runs)
- `GET /api/health` - Env and database health (does not call Launch Library, to protect its rate limit)

### Environment Variables

Required:
- `DATABASE_URL` - Postgres connection string (Supabase pooler), server-only
- `RESEND_API_KEY` - Email service API key
- `CRON_SECRET` - Long random string; Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>`. Cron endpoints reject every request if unset
- `TOKEN_SECRET` - Long random string used to sign confirmation and unsubscribe links. Subscribing and alert emails fail if unset
- `NEXT_PUBLIC_BASE_URL` - Base URL for email links

Optional:
- `EMAIL_FROM` - Sender address on a verified Resend domain

The app does not use the Supabase JS client, so no Supabase API keys are needed.

## Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Add environment variables in project settings
3. Deploy - the `vercel.json` configures automatic cron scheduling

### Database Setup

1. Create the Postgres database (Supabase) and set `DATABASE_URL`
2. Run database migration scripts:
   \`\`\`bash
   # Execute in order:
   scripts/001-create-subscribers-table.sql
   scripts/002-create-launch-snapshots-table.sql
   \`\`\`

### Email Configuration

1. Set up Resend account and get API key
2. Configure sending domain (optional but recommended)
3. Add `RESEND_API_KEY` to environment variables

## Monitoring

- Health checks: `GET /api/health`
- Cron status: `GET /api/cron/status` (requires auth)
- Manual testing: `node scripts/004-test-cron-job.js`

## Rate Limiting

The service respects Launch Library 2's free tier limits:
- 15 requests/hour maximum
- Launches are cached for 10 minutes (Next.js fetch cache plus in-memory)
- One request covers the site and the cron; no per-launch detail requests

## Security

- Cron endpoints protected with bearer token authentication
- Email confirmation uses cryptographically secure tokens with expiration
- Unsubscribe tokens prevent unauthorized email removal

## Launch Detection Logic

1. **Firm dates only**: Launch Library keeps far-off launches at placeholder dates (e.g. "sometime in 2026", stored as Dec 31 00:00 UTC). Alerts only go out for launches with status Go or To Be Confirmed and a NET precise to at least the day
2. **Launch Alerts**: The daily cron (16:00 UTC) emails about any firm launch in the next 26 hours that hasn't been alerted yet, so morning launches are announced the day before
3. **Delays**: If a launch subscribers have heard about goes On Hold or back to To Be Determined, they get one "delayed" email
4. **Reschedules**: A new firm date (NET change of ≥15 minutes, or a firm date after a delay) sends a "rescheduled" email if it's more than 26h out, and re-arms the alert for the new date
5. **Night Detection**: Solar elevation ≤ -6° at Wallops coordinates, only for launches with an exact time
6. **Times**: Shown in Eastern time, at the precision Launch Library knows them
