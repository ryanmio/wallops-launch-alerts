"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { CalendarClock, Info, MapPin, Moon, Play, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { STATUS } from "@/lib/launch-time"
import { VISIBILITY_MAP_PATH } from "@/lib/visibility-map"

export interface LaunchView {
  id: string
  name: string
  net: string
  // NET formatted at the precision Launch Library knows it, in Eastern time
  when: string
  exactTime: boolean
  firmDate: boolean
  night: boolean
  status: { id: number; name: string }
  padName: string
  rocketName: string | null
  missionDescription: string | null
  webcastUrl: string | null
  infoUrl: string | null
}

const STATUS_STYLES: Record<number, string> = {
  [STATUS.GO]: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
  [STATUS.TBC]: "bg-amber-400/15 text-amber-200 ring-amber-400/30",
  [STATUS.HOLD]: "bg-red-400/15 text-red-300 ring-red-400/30",
  [STATUS.IN_FLIGHT]: "bg-sky-400/15 text-sky-300 ring-sky-400/30",
}

function StatusBadge({ status }: { status: LaunchView["status"] }) {
  const style = STATUS_STYLES[status.id] ?? "bg-white/10 text-slate-300 ring-white/20"
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}>
      {status.name}
    </span>
  )
}

function CountdownSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-3 text-center" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i}>
          <div className="h-10 bg-white/20 rounded animate-pulse mb-2" />
          <div className="h-3 bg-white/10 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function LaunchCountdown({ net }: { net: string }) {
  // null until mounted, so the server and first client render match
  const [msLeft, setMsLeft] = useState<number | null>(null)

  useEffect(() => {
    const launchTime = new Date(net).getTime()
    const update = () => setMsLeft(launchTime - Date.now())
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [net])

  if (msLeft === null) return <CountdownSkeleton />

  if (msLeft <= 0) {
    return <p className="text-center text-lg text-white">Launch time reached. Check the webcast for live status.</p>
  }

  const units = [
    { label: "Days", value: Math.floor(msLeft / 86400000) },
    { label: "Hours", value: Math.floor((msLeft % 86400000) / 3600000) },
    { label: "Minutes", value: Math.floor((msLeft % 3600000) / 60000) },
    { label: "Seconds", value: Math.floor((msLeft % 60000) / 1000) },
  ]

  return (
    <div className="grid grid-cols-4 gap-3 text-center" role="timer" aria-label="Time until launch">
      {units.map((unit) => (
        <div key={unit.label}>
          <div className="text-3xl md:text-5xl font-bold text-white tabular-nums">
            {unit.label === "Days" ? unit.value : String(unit.value).padStart(2, "0")}
          </div>
          <div className="text-xs uppercase tracking-wider text-slate-400 mt-1">{unit.label}</div>
        </div>
      ))}
    </div>
  )
}

function NextLaunchCard({ launch }: { launch: LaunchView }) {
  return (
    <div className="glass rounded-2xl overflow-hidden h-full flex flex-col">
      <div className="bg-white/10 p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-xs uppercase tracking-wider text-slate-400">Next launch</span>
          <StatusBadge status={launch.status} />
        </div>
        <h2 className="text-white text-2xl md:text-3xl font-bold mb-2 text-balance">
          {launch.infoUrl ? (
            <a href={launch.infoUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {launch.name}
            </a>
          ) : (
            launch.name
          )}
        </h2>
        <p className="text-slate-300 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm md:text-base">
          <span className="inline-flex items-center">
            <MapPin className="h-4 w-4 mr-1.5 shrink-0" aria-hidden="true" />
            {launch.padName}
          </span>
          {launch.rocketName && (
            <span className="inline-flex items-center">
              <Rocket className="h-4 w-4 mr-1.5 shrink-0" aria-hidden="true" />
              {launch.rocketName}
            </span>
          )}
        </p>
      </div>

      <div className="p-6 md:p-8 flex-1 flex flex-col justify-center gap-6">
        {launch.exactTime ? (
          <>
            <LaunchCountdown net={launch.net} />
            <p className="text-center text-slate-300 text-sm md:text-base">{launch.when}</p>
          </>
        ) : (
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Expected</p>
            <p className="text-3xl md:text-4xl font-bold text-white">{launch.when}</p>
            <p className="mt-3 text-sm text-slate-400 max-w-md mx-auto">
              {launch.firmDate
                ? "The launch time hasn't been announced yet."
                : "This date is a rough estimate, not a confirmed launch date. Subscribers get an email once it's firm."}
            </p>
          </div>
        )}

        {launch.missionDescription && (
          <p className="text-slate-300 text-sm leading-relaxed line-clamp-4 max-w-2xl mx-auto text-center">
            {launch.missionDescription}
          </p>
        )}

        {(launch.webcastUrl || launch.infoUrl) && (
          <div className="flex items-center justify-center gap-3">
            {launch.webcastUrl && (
              <Button asChild className="bg-white text-slate-900 hover:bg-white/90">
                <a href={launch.webcastUrl} target="_blank" rel="noopener noreferrer">
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Watch
                </a>
              </Button>
            )}
            {launch.infoUrl && (
              <Button asChild variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                <a href={launch.infoUrl} target="_blank" rel="noopener noreferrer">
                  <Info className="h-4 w-4" aria-hidden="true" />
                  More Info
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SubscribeCard() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Honeypot: hidden from people, but form-filling bots tend to fill it in
    const website = new FormData(e.currentTarget).get("website") || ""
    setStatus("loading")
    setMessage("")

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus("success")
        setMessage("Check your email and click the link to confirm your subscription.")
        setEmail("")
      } else {
        setStatus("error")
        setMessage(data.error || "Something went wrong. Please try again.")
      }
    } catch {
      setStatus("error")
      setMessage("Network error. Please try again.")
    }
  }

  return (
    <div className="glass rounded-2xl overflow-hidden h-full flex flex-col">
      <div className="bg-white/10 p-6">
        <h2 className="text-white text-xl font-bold mb-2">Get Launch Alerts</h2>
        <p className="text-slate-300 text-sm">
          One email before each launch (around noon ET), plus a heads-up if it&apos;s delayed. Night launches include a
          map of where you can see it.
        </p>
      </div>
      <div className="p-6 flex-1 flex flex-col justify-center">
        <form onSubmit={handleSubscribe} className="space-y-4">
          <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
            <label htmlFor="website">Website</label>
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>
          <label htmlFor="subscribe-email" className="sr-only">
            Email address
          </label>
          <Input
            id="subscribe-email"
            type="email"
            autoComplete="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="glass-subtle border-0 text-white placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-white/40"
          />
          <Button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-white text-slate-900 hover:bg-white/90 font-semibold py-3 rounded-xl transition-colors"
          >
            {status === "loading" ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full mr-2" />
                Subscribing...
              </span>
            ) : (
              "Subscribe"
            )}
          </Button>
        </form>

        <div aria-live="polite">
          {message && (
            <div
              className={`mt-4 glass-subtle rounded-xl p-4 ${status === "success" ? "border border-emerald-400/40" : "border border-red-500/40"}`}
            >
              <p className={`text-sm ${status === "success" ? "text-white" : "text-red-300"}`}>{message}</p>
            </div>
          )}
        </div>

        <p className="text-slate-400 text-xs mt-4 text-center">
          Your email is used for launch alerts only. It is not shared, sold, or used for any other purpose.
        </p>
      </div>
    </div>
  )
}

function EmptyLaunchCard({ failed }: { failed: boolean }) {
  return (
    <div className="glass rounded-2xl p-8 h-full flex flex-col items-center justify-center text-center gap-3">
      <CalendarClock className="h-10 w-10 text-slate-400" aria-hidden="true" />
      <p className="text-white text-lg font-semibold">
        {failed ? "Launch schedule unavailable" : "Nothing on the schedule"}
      </p>
      <p className="text-slate-400 text-sm max-w-sm">
        {failed
          ? "We couldn't reach the launch schedule just now. Please check back in a few minutes."
          : "No launches are currently scheduled from Wallops. Subscribe and we'll email you before the next one."}
      </p>
    </div>
  )
}

function UpcomingList({ launches }: { launches: LaunchView[] }) {
  return (
    <section className="glass rounded-2xl overflow-hidden mb-12" aria-labelledby="upcoming-heading">
      <div className="bg-white/10 px-6 py-4">
        <h2 id="upcoming-heading" className="text-white text-xl font-bold">
          Also on the schedule
        </h2>
      </div>
      <ul className="divide-y divide-white/10">
        {launches.map((launch) => (
          <li key={launch.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold">
                {launch.infoUrl ? (
                  <a href={launch.infoUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {launch.name}
                  </a>
                ) : (
                  launch.name
                )}
              </p>
              <p className="text-slate-400 text-sm truncate">{launch.padName}</p>
            </div>
            <div className="flex items-center gap-3 sm:justify-end">
              <span className="text-slate-200 text-sm tabular-nums">{launch.when}</span>
              <StatusBadge status={launch.status} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function HomePageClient({ launches }: { launches: LaunchView[] | null }) {
  const nextLaunch = launches?.[0] ?? null
  const laterLaunches = launches?.slice(1) ?? []

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent_50%)]" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <main className="relative z-10 container mx-auto max-w-6xl px-4 py-8">
        <header className="text-center mb-10">
          <div className="glass-subtle rounded-2xl p-8 max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">Wallops Launch Alerts</h1>
            <p className="mt-3 text-lg md:text-2xl text-slate-300 font-light text-balance">
              Countdown and email alerts for rocket launches from NASA Wallops, Virginia
            </p>
          </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-8 mb-12 lg:items-stretch">
          <div className="lg:col-span-2">
            {nextLaunch ? <NextLaunchCard launch={nextLaunch} /> : <EmptyLaunchCard failed={launches === null} />}
          </div>
          <div className="lg:col-span-1">
            <SubscribeCard />
          </div>
        </div>

        {nextLaunch?.night && (
          <section className="glass rounded-2xl overflow-hidden mb-12" aria-labelledby="map-heading">
            <div className="bg-white/10 p-6 text-center">
              <h2 id="map-heading" className="text-white text-2xl font-bold flex items-center justify-center mb-2">
                <Moon className="h-6 w-6 mr-3" aria-hidden="true" />
                Night Launch Visibility Map
              </h2>
              <p className="text-slate-300">
                This is a night launch, so you may be able to see it from much of the East Coast.
              </p>
            </div>
            <div className="p-6 md:p-8">
              <Image
                src={VISIBILITY_MAP_PATH}
                alt="Map of the East Coast showing how many seconds after liftoff a Wallops launch becomes visible from each area"
                className="w-full rounded-lg max-h-[32rem] object-contain"
                width={1251}
                height={948}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 900px"
                quality={60}
              />
            </div>
          </section>
        )}

        {laterLaunches.length > 0 && <UpcomingList launches={laterLaunches} />}

        <footer className="text-center space-y-3">
          <nav className="text-sm flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <a
              href="https://github.com/ryanmio/wallops-launch-alerts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white transition-colors"
            >
              GitHub
            </a>
            <span className="text-slate-600" aria-hidden="true">•</span>
            <Link href="/terms" className="text-slate-300 hover:text-white transition-colors">
              Terms of Service
            </Link>
            <span className="text-slate-600" aria-hidden="true">•</span>
            <Link href="/privacy" className="text-slate-300 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <span className="text-slate-600" aria-hidden="true">•</span>
            <Link href="/unsubscribe" className="text-slate-300 hover:text-white transition-colors">
              Unsubscribe
            </Link>
          </nav>
          <p className="text-xs text-slate-500">
            Times in Eastern Time. Launch data from{" "}
            <a
              href="https://thespacedevs.com/llapi"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-300"
            >
              The Space Devs Launch Library 2
            </a>
            , updated every 10 minutes. Not affiliated with NASA.
          </p>
        </footer>
      </main>
    </div>
  )
}
