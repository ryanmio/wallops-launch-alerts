"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === "loading" && <Loader2 className="h-12 w-12 animate-spin text-blue-500" />}
            {status === "success" && <CheckCircle className="h-12 w-12 text-green-500" />}
            {status === "linkSent" && <CheckCircle className="h-12 w-12 text-blue-500" />}
            {status === "error" && <XCircle className="h-12 w-12 text-red-500" />}
            {status === "form" && (
              <div className="h-12 w-12 bg-slate-200 rounded-full flex items-center justify-center text-2xl">📧</div>
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
              <div>
                <Input
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
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
