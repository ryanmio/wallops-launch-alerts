"use client"

import { useEffect, useState } from "react"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === "loading" && <Loader2 className="h-12 w-12 animate-spin text-blue-500" />}
            {status === "success" && <CheckCircle className="h-12 w-12 text-green-500" />}
            {status === "error" && <XCircle className="h-12 w-12 text-red-500" />}
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
            <p className="text-sm text-green-600">
              You'll receive notifications 24 hours and 2 hours before each Wallops launch.
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-muted-foreground">Need help? Contact support or try subscribing again.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
