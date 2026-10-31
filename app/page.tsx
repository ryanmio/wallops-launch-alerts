import { getInfoUrl, getUpcomingWallopsLaunches, getWebcastUrl, type Launch } from "@/lib/launch-library"
import { formatNet, hasExactTime, hasFirmDate } from "@/lib/launch-time"
import { isNightLaunch } from "@/lib/visibility-map"
import HomePageClient, { type LaunchView } from "@/components/HomePageClient"

export const revalidate = 600

// Format on the server (in Eastern time) so the client renders exactly what the server did
function toLaunchView(launch: Launch): LaunchView {
  const exactTime = hasExactTime(launch)
  return {
    id: launch.id,
    name: launch.name,
    net: launch.net,
    when: formatNet(launch),
    exactTime,
    firmDate: hasFirmDate(launch),
    night: exactTime && isNightLaunch(launch.net),
    status: { id: launch.status.id, name: launch.status.name },
    padName: launch.pad?.name || "Wallops Flight Facility",
    rocketName: launch.rocket?.configuration?.full_name || launch.rocket?.configuration?.name || null,
    missionDescription: launch.mission?.description || null,
    webcastUrl: getWebcastUrl(launch),
    infoUrl: getInfoUrl(launch),
  }
}

export default async function HomePage() {
  const launches = await getUpcomingWallopsLaunches()
  return <HomePageClient launches={launches ? launches.map(toLaunchView) : null} />
}
