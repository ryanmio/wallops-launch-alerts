import { getUpcomingWallopsLaunches } from "@/lib/launch-library"
import { isNightLaunch } from "@/lib/visibility-map"
import HomePageClient from "@/components/HomePageClient"

export const revalidate = 600

export default async function HomePage() {
  const launches = await getUpcomingWallopsLaunches()
  const firstLaunch = launches?.[0] ?? null
  const night = firstLaunch ? isNightLaunch(firstLaunch.net) : false

  return <HomePageClient initialLaunch={firstLaunch} initialIsNightLaunch={night} />
}


