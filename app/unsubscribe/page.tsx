"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle, XCircle, Loader2, MailX } from "lucide-react"

export default function UnsubscribePage() {
  const [status, setStatus] = useState<"form" | "loading" | "success" | "linkSent" | "error">("form")
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const searchParams = useSearchParams()

  useEffect(() => {
    const urlEmail = searchParams.get("email")
    const token = searchParams.get("token")

    if (urlEmail) {
      setEmail(urlEmail)
    }

    // Auto-unsubscribe if token is provided
    if (token) {
      setStatus("loading")
      fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            setStatus("success")
            setMessage(data.message)
          } else {
            setStatus("error")
            setMessage(data.error || "Unsubscribe failed")
          }
        })
        .catch((error) => {
          console.error("Unsubscribe error:", error)
          setStatus("error")
          setMessage("An error occurred. Please try again.")
        })
    }
  }, [searchParams])

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setMessage("Please enter your email address")
      return
    }

    setStatus("loading")

    try {
      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus(data.linkSent ? "linkSent" : "success")
        setMessage(data.message)
      } else {
        setStatus("error")
        setMessage(data.error || "Unsubscribe failed")
      }
    } catch (error) {
      console.error("Unsubscribe error:", error)
      setStatus("error")
      setMessage("An error occurred. Please try again.")
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <Card className="glass w-full max-w-md text-white">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === "loading" && <Loader2 className="h-12 w-12 animate-spin text-sky-400" />}
            {status === "success" && <CheckCircle className="h-12 w-12 text-emerald-400" />}
            {status === "linkSent" && <CheckCircle className="h-12 w-12 text-sky-400" />}
            {status === "error" && <XCircle className="h-12 w-12 text-red-400" />}
            {status === "form" && (
              <MailX className="h-12 w-12 text-slate-300" aria-hidden="true" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === "form" && "Unsubscribe"}
            {status === "loading" && "Processing..."}
            {status === "success" && "Unsubscribed"}
            {status === "linkSent" && "Check your email"}
            {status === "error" && "Error"}
          </CardTitle>
          <CardDescription>Wallops Launch Alerts</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "form" && (
            <form onSubmit={handleUnsubscribe} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Enter your address and we'll email you a link to confirm. Every alert email also has a one-click
                unsubscribe link.
              </p>
              <div>
                <label htmlFor="unsubscribe-email" className="sr-only">
                  Email address
                </label>
                <Input
                  id="unsubscribe-email"
                  autoComplete="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Unsubscribe
              </Button>
            </form>
          )}

          {status !== "form" && (
            <div className="text-center space-y-3" aria-live="polite">
              <p className="text-sm text-muted-foreground">{message}</p>
              {status === "success" && (
                <p className="text-sm text-muted-foreground">
                  Changed your mind?{" "}
                  <Link href="/" className="underline hover:text-white">
                    Subscribe again
                  </Link>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <Link href="/" className="text-sm text-slate-300 hover:text-white transition-colors">
        ← Back to Wallops Launch Alerts
      </Link>
    </main>
  )
}
