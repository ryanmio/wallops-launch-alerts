import postgres from "postgres"

// Configure for Supabase pooler compatibility
// - ssl required (also set via ?sslmode=require in URL)
// - disable prepared statements to avoid issues with some poolers
const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
  prepare: false,
})

export interface Subscriber {
  id: string
  email: string
  created_at: Date
  region_hint?: string | null
  active: boolean
}

export interface LaunchSnapshot {
  id: string
  ll2_id: string
  net: string
  window_start?: string | null
  window_end?: string | null
  status: string
  last_updated: string
  notified_t24: boolean
  notified_t2: boolean
  last_net_emailed?: string | null
}

export async function pingDatabase(): Promise<boolean> {
  try {
    await sql`SELECT 1`
    return true
  } catch {
    return false
  }
}

// Subscriber operations
export async function createSubscriber(email: string, regionHint?: string): Promise<Subscriber> {
  const result = await sql<Subscriber[]>`
    INSERT INTO subscribers (email, region_hint)
    VALUES (${email}, ${regionHint ?? null})
    RETURNING *
  `
  return result[0] as Subscriber
}

export async function getSubscriber(email: string): Promise<Subscriber | null> {
  const result = await sql<Subscriber[]>`
    SELECT * FROM subscribers WHERE email = ${email}
  `
  return (result[0] as Subscriber) || null
}

export async function activateSubscriber(email: string): Promise<void> {
  await sql`
    UPDATE subscribers 
    SET active = true 
    WHERE email = ${email}
  `
}

export async function deactivateSubscriber(email: string): Promise<void> {
  await sql`
    UPDATE subscribers 
    SET active = false 
    WHERE email = ${email}
  `
}

export async function getActiveSubscribers(): Promise<Subscriber[]> {
  const result = await sql<Subscriber[]>`
    SELECT * FROM subscribers WHERE active = true
  `
  return result as Subscriber[]
}

// Launch snapshot operations
export async function upsertLaunchSnapshot(
  launch: Omit<LaunchSnapshot, "id" | "last_updated">
): Promise<LaunchSnapshot> {
  const result = await sql<LaunchSnapshot[]>`
    INSERT INTO launch_snapshots (
      ll2_id, net, window_start, window_end, status, 
      notified_t24, notified_t2, last_net_emailed
    )
    VALUES (
      ${launch.ll2_id}, ${launch.net}, ${launch.window_start ?? null}, 
      ${launch.window_end ?? null}, ${launch.status}, ${launch.notified_t24}, 
      ${launch.notified_t2}, ${launch.last_net_emailed ?? null}
    )
    ON CONFLICT (ll2_id) 
    DO UPDATE SET
      net = EXCLUDED.net,
      window_start = EXCLUDED.window_start,
      window_end = EXCLUDED.window_end,
      status = EXCLUDED.status,
      notified_t24 = COALESCE(EXCLUDED.notified_t24, launch_snapshots.notified_t24),
      notified_t2 = COALESCE(EXCLUDED.notified_t2, launch_snapshots.notified_t2),
      last_net_emailed = COALESCE(EXCLUDED.last_net_emailed, launch_snapshots.last_net_emailed),
      last_updated = NOW()
    RETURNING *
  `
  return result[0] as LaunchSnapshot
}

export async function getLaunchSnapshot(ll2Id: string): Promise<LaunchSnapshot | null> {
  const result = await sql<LaunchSnapshot[]>`
    SELECT * FROM launch_snapshots WHERE ll2_id = ${ll2Id}
  `
  return (result[0] as LaunchSnapshot) || null
}

export async function updateNotificationStatus(
  ll2Id: string,
  updates: { notified_t24?: boolean; notified_t2?: boolean; last_net_emailed?: string | null },
): Promise<void> {
  const fieldsToUpdate: Record<string, unknown> = {}
  if (updates.notified_t24 !== undefined) fieldsToUpdate.notified_t24 = updates.notified_t24
  if (updates.notified_t2 !== undefined) fieldsToUpdate.notified_t2 = updates.notified_t2
  if (updates.last_net_emailed !== undefined) fieldsToUpdate.last_net_emailed = updates.last_net_emailed

  if (Object.keys(fieldsToUpdate).length === 0) return

  await sql`
    UPDATE launch_snapshots
    SET ${sql(fieldsToUpdate)}
    WHERE ll2_id = ${ll2Id}
  `
}

export async function getUpcomingLaunches(): Promise<LaunchSnapshot[]> {
  const result = await sql<LaunchSnapshot[]>`
    SELECT * FROM launch_snapshots 
    WHERE net > NOW() 
    ORDER BY net ASC
  `
  return result as LaunchSnapshot[]
}
