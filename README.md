# Wallops Night-Launch Alert Service

A comprehensive email alert service for NASA Wallops launches with night visibility mapping.

## Features

- **Automated Notifications**: T-24h and T-2h email alerts for all Wallops launches
- **Night Launch Detection**: Automatic detection of night launches using solar elevation calculations
- **Visibility Maps**: Generated visibility maps showing potential rocket plume visibility along the East Coast
- **Schedule Slip Detection**: Automatic detection and notification of launch delays ≥15 minutes
- **Double Opt-in Subscriptions**: Secure email subscription management with confirmation
- **Rate Limited API Integration**: Respects Launch Library 2's 15 requests/hour limit with intelligent caching

## Architecture

### Core Components

1. **Database Layer** (`lib/database.ts`)
   - Subscriber management with double opt-in
   - Launch snapshot tracking for schedule changes
   - PostgreSQL with Neon integration

2. **Launch Library Integration** (`lib/launch-library.ts`)
   - Cached API calls to Launch Library 2
   - Exponential backoff for error handling
   - Wallops-specific launch filtering

3. **Email System** (`lib/email.ts`, `lib/notifications.ts`)
   - HTML email templates with calendar attachments
   - Batch sending to prevent service overload
   - Resend integration for reliable delivery

4. **Visibility Mapping** (`lib/visibility-map.ts`, `lib/sun-calculations.ts`)
   - Astronomical calculations for night detection
   - Geodesic ring generation for visibility zones
   - Canvas-based map rendering

5. **Subscription Management** (`app/api/subscribe/`, `app/api/unsubscribe/`)
   - Secure token-based confirmation
   - Unsubscribe handling with validation
   - Status checking endpoints

6. **Cron Scheduler** (`app/api/cron/check/`)
   - Automated processing every 30 minutes
   - Idempotent operation handling
   - Comprehensive error logging

### API Endpoints

- `POST /api/subscribe` - New subscription with double opt-in
- `GET /api/confirm` - Email confirmation handling
- `POST /api/unsubscribe` - Subscription cancellation
- `GET /api/next-wallops` - Cached upcoming launches
- `POST /api/cron/check` - Main notification processing (cron)
- `GET /api/health` - System health monitoring

### Environment Variables

Required:
- `DATABASE_URL` - Neon PostgreSQL connection
- `RESEND_API_KEY` - Email service API key
- `CRON_SECRET` - Security token for cron endpoints
- `TOKEN_SECRET` - Encryption key for confirmation tokens
- `NEXT_PUBLIC_BASE_URL` - Base URL for email links

## Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Add environment variables in project settings
3. Deploy - the `vercel.json` configures automatic cron scheduling

### Database Setup

1. Create Neon database integration
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
- Aggressive caching (10-15 minutes for launches, 24 hours for location data)
- Exponential backoff on errors

## Security

- Cron endpoints protected with bearer token authentication
- Email confirmation uses cryptographically secure tokens with expiration
- Unsubscribe tokens prevent unauthorized email removal
- Rate limiting prevents abuse of cron endpoints

## Launch Detection Logic

1. **T-24h Notifications**: Sent between 24h and 23h before launch
2. **T-2h Notifications**: Sent between 2h and 1h before launch  
3. **Schedule Slips**: Detected when NET changes by ≥15 minutes
4. **Night Detection**: Solar elevation ≤ -6° at Wallops coordinates
5. **Status Filtering**: Only notifies for 'Go', 'TBD', 'TBC' statuses

## Visibility Map Generation

Night launches include visibility maps showing three zones:
- **Good** (50km altitude): ~860km radius
- **Very Likely** (100km altitude): ~1220km radius  
- **Almost Certain** (150km altitude): ~1490km radius

Maps use geodesic calculations with atmospheric refraction correction (7/6 Earth radius factor).
