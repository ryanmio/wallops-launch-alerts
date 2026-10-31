// Launch time helpers shared by the site, the emails, and the notification logic.
// Pure functions only, so this module is safe to import from client components.

export const ET = "America/New_York"

// Launch Library 2 status ids (/config/launch_statuses/)
export const STATUS = { GO: 1, TBD: 2, SUCCESS: 3, FAILURE: 4, HOLD: 5, IN_FLIGHT: 6, PARTIAL_FAILURE: 7, TBC: 8 }

// Launch Library 2 net_precision ids: 0 Second, 1 Minute, 2 Hour, 3 Morning, 4 Afternoon, 5 Day, 6 Week,
// 7 Month, 8-11 Q1-Q4, 12-13 H1/H2, 14 Year, 15 Fiscal Year, 16 Decade
const PRECISION = { HOUR: 2, MORNING: 3, AFTERNOON: 4, DAY: 5, WEEK: 6, MONTH: 7, YEAR: 14, FISCAL_YEAR: 15, DECADE: 16 }

export interface LaunchTiming {
  net: string
  net_precision?: { id: number; name?: string; abbrev?: string } | null
  status?: { id: number; name?: string; abbrev?: string } | null
}

function precisionId(launch: LaunchTiming): number {
  // Older responses have no precision; treat them as exact
  return launch.net_precision?.id ?? 0
}

// The NET is a real time of day, not a placeholder like "sometime in 2026" (which LL2 stores as Dec 31 00:00 UTC)
export function hasExactTime(launch: LaunchTiming): boolean {
  return precisionId(launch) <= PRECISION.HOUR
}

// Worth alerting subscribers about: the provider has a date (Go / To Be Confirmed) known to at least the day
export function hasFirmDate(launch: LaunchTiming): boolean {
  const status = launch.status?.id
  return (status === STATUS.GO || status === STATUS.TBC) && precisionId(launch) <= PRECISION.DAY
}

function fmt(date: Date, options: Intl.DateTimeFormatOptions, timeZone = ET): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(date)
}

// Coarse placeholders are stored in UTC (e.g. 2026-12-31T00:00Z for "sometime in 2026"), and a day-precision NET is
// often midnight UTC, which would show as the previous evening in Eastern time. Read those calendar dates in UTC.
function dateZone(launch: LaunchTiming): string {
  const id = precisionId(launch)
  if (id > PRECISION.WEEK) return "UTC"
  if (id >= PRECISION.DAY && launch.net.match(/T00:00(:00)?(\.0+)?Z$/)) return "UTC"
  return ET
}

// Human-readable NET at the precision Launch Library actually knows it, e.g.
// "Fri, Oct 31, 6:15 PM EDT", "Fri, Oct 31 (morning)", "Week of Nov 3", "December 2026", "Q1 2027", "2026"
export function formatNet(launch: LaunchTiming): string {
  const date = new Date(launch.net)
  const id = precisionId(launch)
  const zone = dateZone(launch)
  const day = fmt(date, { weekday: "short", month: "short", day: "numeric" }, zone)

  if (id <= PRECISION.HOUR) {
    return fmt(date, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })
  }
  if (id === PRECISION.MORNING) return `${day} (morning)`
  if (id === PRECISION.AFTERNOON) return `${day} (afternoon)`
  if (id === PRECISION.DAY) return day
  if (id === PRECISION.WEEK) return `Week of ${fmt(date, { month: "short", day: "numeric" }, zone)}`

  const year = fmt(date, { year: "numeric" }, "UTC")
  if (id === PRECISION.MONTH) return fmt(date, { month: "long", year: "numeric" }, "UTC")
  if (id === PRECISION.YEAR) return year
  if (id === PRECISION.FISCAL_YEAR) return `FY ${year}`
  if (id === PRECISION.DECADE) return `${year.slice(0, 3)}0s`
  return launch.net_precision?.abbrev ? `${launch.net_precision.abbrev} ${year}` : year
}

function dateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
}

// "today" / "tomorrow" / "on Sat, Nov 1", relative to the current date in Eastern time
export function launchDayLabel(launch: LaunchTiming, now = new Date()): string {
  const net = new Date(launch.net)
  const launchDay = dateKey(net, dateZone(launch))
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  if (launchDay === dateKey(now, ET)) return "today"
  if (launchDay === dateKey(tomorrow, ET)) return "tomorrow"
  return `on ${fmt(net, { weekday: "short", month: "short", day: "numeric" }, dateZone(launch))}`
}
