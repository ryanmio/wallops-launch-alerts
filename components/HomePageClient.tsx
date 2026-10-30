"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { MapPin, Play, Info } from "lucide-react"

interface Launch {
  id: string
  name: string
  net: string
  pad: {
    name: string
  }
  mission?: {
    description: string
  }
  vid_urls?: Array<{
    url: string
    title?: string
    source?: string
    publisher?: string
    priority?: number
  }>
  info_urls?: Array<{
    url: string
    description?: string
  }>
}

function LaunchCountdown({ launch }: { launch: Launch | null }) {
  const [hasMounted, setHasMounted] = useState(false)
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!launch) return

    const update = () => {
      const now = Date.now()
      const launchTime = new Date(launch.net).getTime()
      const difference = launchTime - now

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        })
      } else {
        setTimeLeft(null)
      }
    }

    // Update immediately on client after hydration
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [launch])

  if (!launch) {
    return (
      <div className="text-center text-slate-400">
        <p>Loading countdown...</p>
      </div>
    )
  }

  if (!hasMounted) {
    return (
      <div className="grid grid-cols-4 gap-3 text-center">
        <div>
          <div className="h-8 bg-white/20 rounded animate-pulse mb-2" />
          <div className="h-3 bg-white/10 rounded animate-pulse" />
        </div>
        <div>
          <div className="h-8 bg-white/20 rounded animate-pulse mb-2" />
          <div className="h-3 bg-white/10 rounded animate-pulse" />
        </div>
        <div>
          <div className="h-8 bg-white/20 rounded animate-pulse mb-2" />
          <div className="h-3 bg-white/10 rounded animate-pulse" />
        </div>
        <div>
          <div className="h-8 bg-white/20 rounded animate-pulse mb-2" />
          <div className="h-3 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!timeLeft) {
    return (
      <div className="text-center">
        <p className="text-white">Launch has occurred or is happening now!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-3 text-center">
      <div>
        <div className="text-2xl font-bold text-white">{timeLeft.days}</div>
        <div className="text-xs text-slate-400">Days</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{timeLeft.hours}</div>
        <div className="text-xs text-slate-400">Hours</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{timeLeft.minutes}</div>
        <div className="text-xs text-slate-400">Minutes</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{timeLeft.seconds}</div>
        <div className="text-xs text-slate-400">Seconds</div>
      </div>
    </div>
  )
}

type HomePageClientProps = {
  initialLaunch: Launch | null
  initialIsNightLaunch: boolean
}

export default function HomePageClient({ initialLaunch, initialIsNightLaunch }: HomePageClientProps) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [nextLaunch, setNextLaunch] = useState<Launch | null>(initialLaunch)
  const [isNightLaunch, setIsNightLaunch] = useState(initialIsNightLaunch)
  const [visibilityMapUrl, setVisibilityMapUrl] = useState<string | null>(
    initialLaunch && initialIsNightLaunch ? "/images/wallops-visibility-map.webp" : null,
  )
  const [launchLoading, setLaunchLoading] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(initialLaunch ? null : "No upcoming launches found")
  const [formattedDate, setFormattedDate] = useState<string | null>(null)

  useEffect(() => {
    if (!nextLaunch || !isNightLaunch || visibilityMapUrl) return
    setVisibilityMapUrl("/images/wallops-visibility-map.webp")
  }, [nextLaunch, isNightLaunch, visibilityMapUrl])

  useEffect(() => {
    if (!nextLaunch) {
      setFormattedDate(null)
      return
    }
    try {
      const s = new Date(nextLaunch.net).toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
      setFormattedDate(s)
    } catch {
      setFormattedDate(new Date(nextLaunch.net).toISOString())
    }
  }, [nextLaunch])

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    // Honeypot: hidden from people, but form-filling bots tend to fill it in
    const website = new FormData(e.currentTarget as HTMLFormElement).get("website") || ""
    setStatus("loading")

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus("success")
        setMessage("Check your email to confirm your subscription!")
        setEmail("")
      } else {
        setStatus("error")
        setMessage(data.error || "Something went wrong")
      }
    } catch (error) {
      setStatus("error")
      setMessage("Network error. Please try again.")
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent_50%)]" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="glass-subtle rounded-2xl p-8 mb-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-4">
              <h1 className="text-4xl md:text-6xl font-bold text-white">Wallops Launch</h1>
            </div>
            <p className="text-xl md:text-2xl text-slate-300 font-light">Live countdown to the next Wallops launch</p>
            <div className="mt-4 flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm text-slate-400 uppercase tracking-wider">Real-time tracking</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12 lg:items-stretch">
          <div className="lg:col-span-2">
            {launchLoading ? (
              <div className="glass rounded-2xl overflow-hidden h-full">
                <div className="bg-white/10 p-6 text-center min-h-24 flex flex-col justify-center">
                  <div className="h-8 bg-white/20 rounded-lg mb-2 animate-pulse max-w-xs mx-auto" />
                  <div className="h-5 bg-white/10 rounded-lg animate-pulse max-w-48 mx-auto" />
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-4 gap-3 text-center mb-6">
                    <div>
                      <div className="h-8 bg-white/20 rounded animate-pulse mb-2" />
                      <div className="h-3 bg-white/10 rounded animate-pulse" />
                    </div>
                    <div>
                      <div className="h-8 bg-white/20 rounded animate-pulse mb-2" />
                      <div className="h-3 bg-white/10 rounded animate-pulse" />
                    </div>
                    <div>
                      <div className="h-8 bg-white/20 rounded animate-pulse mb-2" />
                      <div className="h-3 bg-white/10 rounded animate-pulse" />
                    </div>
                    <div>
                      <div className="h-8 bg-white/20 rounded animate-pulse mb-2" />
                      <div className="h-3 bg-white/10 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="h-5 bg-white/10 rounded animate-pulse max-w-80 mx-auto" />
                  </div>
                </div>
              </div>
            ) : launchError ? (
              <div className="glass rounded-2xl p-8 text-center h-full">
                <p className="text-red-400">{launchError}</p>
              </div>
            ) : (
              <div className="glass rounded-2xl overflow-hidden h-full">
                <div className="bg-white/10 p-6 text-center min-h-24 flex flex-col justify-center">
                  <h2 className="text-white text-2xl md:text-3xl font-bold mb-2">
                    {nextLaunch ? (
                      (() => {
                        const infoUrl = nextLaunch.info_urls?.[0]?.url
                        const videoUrl = nextLaunch.vid_urls?.[0]?.url
                        const primaryLink = infoUrl || videoUrl || null
                        if (primaryLink) {
                          return (
                            <a
                              href={primaryLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {nextLaunch.name}
                            </a>
                          )
                        }
                        return nextLaunch.name
                      })()
                    ) : (
                      "Unknown Mission"
                    )}
                  </h2>
                  <p className="text-slate-300 flex items-center justify-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {nextLaunch?.pad?.name || "Wallops Flight Facility"}
                  </p>
                </div>
                <div className="p-8">
                  <LaunchCountdown launch={nextLaunch} />
                  {nextLaunch && (
                    <div className="mt-6 text-center">
                      <p className="text-slate-300 text-sm md:text-base" suppressHydrationWarning>
                        {formattedDate ?? ""}
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-3">
                        {(() => {
                          const videoUrl = nextLaunch.vid_urls?.[0]?.url || null
                          return (
                            <div className="relative group">
                              {videoUrl ? (
                                <Button asChild className="bg-white text-slate-900 hover:bg-white/90">
                                  <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                                    <Play className="h-4 w-4" />
                                    Watch
                                  </a>
                                </Button>
                              ) : (
                                <Button disabled className="bg-white/40 text-slate-900/70 cursor-not-allowed">
                                  <Play className="h-4 w-4" />
                                  Watch
                                </Button>
                              )}
                              {!videoUrl && (
                                <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                                  No stream provided
                                </div>
                              )}
                            </div>
                          )
                        })()}
                        {(() => {
                          const infoUrl = nextLaunch.info_urls?.[0]?.url || null
                          return (
                            <div className="relative group">
                              {infoUrl ? (
                                <Button asChild variant="outline">
                                  <a href={infoUrl} target="_blank" rel="noopener noreferrer">
                                    <Info className="h-4 w-4" />
                                    More Info
                                  </a>
                                </Button>
                              ) : (
                                <Button disabled variant="outline" className="cursor-not-allowed">
                                  <Info className="h-4 w-4" />
                                  More Info
                                </Button>
                              )}
                              {!infoUrl && (
                                <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                                  No info link provided
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="glass rounded-2xl overflow-hidden h-full flex flex-col">
              <div className="bg-white/10 p-6 min-h-24 flex flex-col justify-center">
                <h3 className="text-white text-xl font-bold mb-2">Get Launch Alerts</h3>
                <p className="text-slate-300 text-sm">One email before each launch (around noon ET)</p>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center">
                <form onSubmit={handleSubscribe} className="space-y-4">
                  <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
                    <label htmlFor="website">Website</label>
                    <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
                  </div>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="glass-subtle border-0 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-white/30"
                  />
                  <Button
                    type="submit"
                    disabled={status === "loading"}
                    className="w-full bg-white text-slate-900 hover:bg-white/90 font-semibold py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
                  >
                    {status === "loading" ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full mr-2" />
                        Subscribing...
                      </div>
                    ) : (
                      "Subscribe"
                    )}
                  </Button>
                </form>

                <p className="text-slate-400 text-xs mt-3 text-center">
                  Your email is used for launch alerts only. It is not shared, sold, or used for any other purpose.
                </p>

                {message && (
                  <div className={`mt-4 glass-subtle rounded-xl p-4 ${status === "success" ? "border border-white/30" : "border border-red-500/30"}`}>
                    <p className={`text-sm ${status === "success" ? "text-white" : "text-red-400"}`}>{message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {visibilityMapUrl && nextLaunch && (
          <div className="glass rounded-2xl overflow-hidden mb-12">
            <div className="bg-white/10 p-6 text-center">
              <h3 className="text-white text-2xl font-bold flex items-center justify-center mb-2">
                <MapPin className="h-6 w-6 mr-3 text-white" />
                Night Launch Visibility Map
              </h3>
              <p className="text-slate-300">This is a night launch! You may be able to see it from the East Coast.</p>
            </div>
            <div className="p-8">
              <Image
                src={visibilityMapUrl}
                alt="Launch Visibility Map"
                className="w-full rounded-lg max-h-96 object-contain"
                width={1251}
                height={948}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 900px"
                quality={60}
              />
            </div>
          </div>
        )}

        <div className="text-center">
          <div className="text-slate-400 text-sm flex items-center justify-center gap-3">
            <a href="https://github.com/ryanmio/wallops-launch-alerts" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition-colors">
              GitHub
            </a>
            <span className="text-slate-600">•</span>
            <a href="/terms" className="text-slate-300 hover:text-white transition-colors">Terms of Service</a>
            <span className="text-slate-600">•</span>
            <a href="/privacy" className="text-slate-300 hover:text-white transition-colors">Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  )
}


