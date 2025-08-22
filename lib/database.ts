import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

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

// Subscriber operations
export async function createSubscriber(email: string, regionHint?: string): Promise<Subscriber> {
  const result = await sql`
    INSERT INTO subscribers (email, region_hint)
    VALUES (${email}, ${regionHint})
    RETURNING *
  `
  return result[0] as Subscriber
}

export async function getSubscriber(email: string): Promise<Subscriber | null> {
  const result = await sql`
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
  const result = await sql`
    SELECT * FROM subscribers WHERE active = true
  `
  return result as Subscriber[]
}

// Launch snapshot operations
export async function upsertLaunchSnapshot(
  launch: Omit<LaunchSnapshot, "id" | "last_updated">,
): Promise<LaunchSnapshot> {
  const result = await sql`
    INSERT INTO launch_snapshots (
      ll2_id, net, window_start, window_end, status, 
      notified_t24, notified_t2, last_net_emailed
    )
    VALUES (
      ${launch.ll2_id}, ${launch.net}, ${launch.window_start}, 
      ${launch.window_end}, ${launch.status}, ${launch.notified_t24}, 
      ${launch.notified_t2}, ${launch.last_net_emailed}
    )
    ON CONFLICT (ll2_id) 
    DO UPDATE SET
      net = EXCLUDED.net,
      window_start = EXCLUDED.window_start,
      window_end = EXCLUDED.window_end,
      status = EXCLUDED.status,
      last_updated = NOW()
    RETURNING *
  `
  return result[0] as LaunchSnapshot
}

export async function getLaunchSnapshot(ll2Id: string): Promise<LaunchSnapshot | null> {
  const result = await sql`
    SELECT * FROM launch_snapshots WHERE ll2_id = ${ll2Id}
  `
  return (result[0] as LaunchSnapshot) || null
}

export async function updateNotificationStatus(
  ll2Id: string,
  updates: { notified_t24?: boolean; notified_t2?: boolean; last_net_emailed?: string },
): Promise<void> {
  const setParts = []
  const values = []

  if (updates.notified_t24 !== undefined) {
    setParts.push(`notified_t24 = $${setParts.length + 2}`)
    values.push(updates.notified_t24)
  }
  if (updates.notified_t2 !== undefined) {
    setParts.push(`notified_t2 = $${setParts.length + 2}`)
    values.push(updates.notified_t2)
  }
  if (updates.last_net_emailed !== undefined) {
    setParts.push(`last_net_emailed = $${setParts.length + 2}`)
    values.push(updates.last_net_emailed)
  }

  if (setParts.length > 0) {
    await sql`
      UPDATE launch_snapshots 
      SET ${sql.unsafe(setParts.join(", "))}
      WHERE ll2_id = ${ll2Id}
    `.values([ll2Id, ...values])
  }
}

export async function getUpcomingLaunches(): Promise<LaunchSnapshot[]> {
  const result = await sql`
    SELECT * FROM launch_snapshots 
    WHERE net > NOW() 
    ORDER BY net ASC
  `
  return result as LaunchSnapshot[]
}
