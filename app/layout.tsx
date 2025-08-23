import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">{children}</div>
          <footer className="border-t border-white/15 text-slate-400 text-sm py-6">
            <div className="mx-auto max-w-6xl px-4 text-center space-x-4">
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
              <span className="text-slate-600">•</span>
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
