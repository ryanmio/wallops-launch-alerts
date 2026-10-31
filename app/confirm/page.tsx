"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function ConfirmPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get("token")
    const email = searchParams.get("email")

    if (!token || !email) {
      setStatus("error")
      setMessage("Invalid confirmation link. Missing required parameters.")
      return
    }

    // Confirm subscription
    fetch(`/api/confirm?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setStatus("success")
          setMessage(data.message)
        } else {
          setStatus("error")
          setMessage(data.error || "Confirmation failed")
        }
      })
      .catch((error) => {
        console.error("Confirmation error:", error)
        setStatus("error")
        setMessage("An error occurred during confirmation. Please try again.")
      })
  }, [searchParams])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <Card className="glass w-full max-w-md text-white">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === "loading" && <Loader2 className="h-12 w-12 animate-spin text-sky-400" />}
            {status === "success" && <CheckCircle className="h-12 w-12 text-emerald-400" />}
            {status === "error" && <XCircle className="h-12 w-12 text-red-400" />}
          </div>
          <CardTitle className="text-2xl">
            {status === "loading" && "Confirming..."}
            {status === "success" && "Confirmed!"}
            {status === "error" && "Confirmation Failed"}
          </CardTitle>
          <CardDescription>Wallops Launch Alerts</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">{message}</p>
          {status === "success" && (
            <p className="text-sm text-emerald-300">
              You'll get an email around noon ET the day before or the day of each launch.
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-muted-foreground">
              Try{" "}
              <Link href="/" className="underline hover:text-white">
                subscribing again
              </Link>{" "}
              to get a fresh confirmation link.
            </p>
          )}
        </CardContent>
      </Card>
      <Link href="/" className="text-sm text-slate-300 hover:text-white transition-colors">
        ← Back to Wallops Launch Alerts
      </Link>
    </main>
  )
}
