"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Rocket, MapPin } from "lucide-react"

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
}

function LaunchCountdown({ launch }: { launch: Launch | null }) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)

  useEffect(() => {
    if (!launch) return

    const timer = setInterval(() => {
      const now = new Date().getTime()
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
    }, 1000)

    return () => clearInterval(timer)
  }, [launch])

  if (!launch) {
    return (
      <div className="text-center text-slate-400">
        <p>Loading countdown...</p>
      </div>
    )
  }

  if (!timeLeft) {
    return (
      <div className="text-center">
        <p className="text-orange-400">Launch has occurred or is happening now!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-3 text-center">
      <div>
        <div className="text-2xl font-bold text-cyan-400">{timeLeft.days}</div>
        <div className="text-xs text-slate-400">Days</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-cyan-400">{timeLeft.hours}</div>
        <div className="text-xs text-slate-400">Hours</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-cyan-400">{timeLeft.minutes}</div>
        <div className="text-xs text-slate-400">Minutes</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-cyan-400">{timeLeft.seconds}</div>
        <div className="text-xs text-slate-400">Seconds</div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [nextLaunch, setNextLaunch] = useState<Launch | null>(null)
  const [isNightLaunch, setIsNightLaunch] = useState(false)
  const [visibilityMapUrl, setVisibilityMapUrl] = useState<string | null>(null)
  const [launchLoading, setLaunchLoading] = useState(true)
  const [launchError, setLaunchError] = useState<string | null>(null)

  useEffect(() => {
    const fetchNextLaunch = async () => {
      try {
        setLaunchLoading(true)
        setLaunchError(null)
        console.log("[v0] Fetching next launch from API...")

        const response = await fetch("/api/next-wallops")
        console.log("[v0] API response status:", response.status)

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`)
        }

        const data = await response.json()
        console.log("[v0] API response data:", data)

        if (data.success && data.launches && data.launches.length > 0) {
          console.log("[v0] First launch data:", data.launches[0])
          setNextLaunch(data.launches[0])

          setIsNightLaunch(data.isNightLaunch || false)

          if (data.isNightLaunch) {
            console.log("[v0] Night launch detected, generating visibility map...")
            try {
              const mapResponse = await fetch("/api/visibility-map", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  launchTime: data.launches[0].net,
                }),
              })

              if (mapResponse.ok) {
                const mapBlob = await mapResponse.blob()
                const mapUrl = URL.createObjectURL(mapBlob)
                setVisibilityMapUrl(mapUrl)
                console.log("[v0] Visibility map generated successfully")
              } else {
                console.error("[v0] Failed to generate visibility map")
              }
            } catch (mapError) {
              console.error("[v0] Error generating visibility map:", mapError)
            }
          }
        } else {
          setLaunchError("No upcoming launches found")
        }
      } catch (error) {
        console.error("[v0] Failed to fetch next launch:", error)
        setLaunchError("Failed to load launch data")
      } finally {
        setLaunchLoading(false)
      }
    }

    fetchNextLaunch()
  }, [])

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <Rocket className="h-8 w-8 text-orange-400 mr-3" />
            <h1 className="text-3xl md:text-4xl font-bold text-white">Wallops Launch Countdown</h1>
          </div>
          <p className="text-lg text-slate-300">Live countdown to the next NASA Wallops rocket launch</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Countdown - takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            {launchLoading ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6 text-center">
                  <p className="text-slate-400">Loading next launch...</p>
                </CardContent>
              </Card>
            ) : launchError ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6 text-center">
                  <p className="text-red-400">{launchError}</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-white text-xl">{nextLaunch?.name || "Unknown Mission"}</CardTitle>
                  <CardDescription className="text-slate-400">
                    {nextLaunch?.pad?.name || "Wallops Flight Facility"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <LaunchCountdown launch={nextLaunch} />
                  {nextLaunch && (
                    <div className="mt-4 text-center">
                      <p className="text-slate-300 text-sm">
                        {new Date(nextLaunch.net).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          timeZoneName: "short",
                        })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-lg">Get Launch Alerts</CardTitle>
                <CardDescription className="text-slate-400 text-sm">
                  Email notifications 24h and 2h before launch
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <form onSubmit={handleSubscribe} className="space-y-3">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                  <Button
                    type="submit"
                    disabled={status === "loading"}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {status === "loading" ? "Subscribing..." : "Subscribe"}
                  </Button>
                </form>

                {message && (
                  <Alert
                    className={`mt-3 ${status === "success" ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"}`}
                  >
                    <AlertDescription className={`text-sm ${status === "success" ? "text-green-400" : "text-red-400"}`}>
                      {message}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {isNightLaunch && nextLaunch && (
          <Card className="bg-slate-800/50 border-slate-700 mb-8">
            <CardHeader className="pb-4">
              <CardTitle className="text-white flex items-center justify-center text-lg">
                <MapPin className="h-5 w-5 mr-2 text-orange-400" />
                Night Launch - Visibility Map
              </CardTitle>
              <CardDescription className="text-slate-400 text-center text-sm">
                This is a night launch! You may be able to see it from the East Coast.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {visibilityMapUrl ? (
                <div className="space-y-3">
                  <img
                    src={visibilityMapUrl || "/placeholder.svg"}
                    alt="Launch Visibility Map"
                    className="w-full rounded-lg border border-slate-600 max-h-96 object-contain"
                  />
                  <div className="text-xs text-slate-300 flex justify-center space-x-6">
                    <span>
                      <span className="text-green-400">●</span> Almost Certain
                    </span>
                    <span>
                      <span className="text-yellow-400">●</span> Very Likely
                    </span>
                    <span>
                      <span className="text-orange-400">●</span> Good
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-700 rounded-lg p-6 text-slate-300 text-center">
                  <p className="text-sm">Generating visibility map...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="text-center text-slate-400 text-sm">
          <p>Powered by NASA Launch Library • Free service for space enthusiasts</p>
        </div>
      </div>
    </div>
  )
}
