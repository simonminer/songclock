import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Song Clock - Listen to the time.",
  description: "Learn to tell time by listening to musical intervals",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>{/* VexFlow is now imported directly in the component */}</head>
      <body className={inter.className}>
        {/* Wrap the entire app with the Providers component */}
        {children}
      </body>
    </html>
  )
}
