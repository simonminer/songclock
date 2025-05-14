"use client"

import type React from "react"

import { AudioContextProvider } from "@/components/audio-context-provider"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return <AudioContextProvider>{children}</AudioContextProvider>
}
