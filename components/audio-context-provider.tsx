"use client"

import type React from "react"
import { createContext, useContext, useEffect, useRef, useState } from "react"

// Define the context type
interface AudioContextProviderProps {
  children: React.ReactNode
}

interface AudioContextValue {
  audioContext: AudioContext | null
  masterGain: GainNode | null
  ensureAudioContextRunning: () => Promise<boolean>
}

// Create the context
const AudioContextContext = createContext<AudioContextValue>({
  audioContext: null,
  masterGain: null,
  ensureAudioContextRunning: async () => false,
})

// Custom hook to use the audio context
export const useAudioContext = () => useContext(AudioContextContext)

// Provider component
export function AudioContextProvider({ children }: AudioContextProviderProps) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const resumeAttemptRef = useRef<number>(0)
  const resumeIntervalRef = useRef<number | null>(null)

  // Initialize the audio context
  useEffect(() => {
    // Only create the context once
    if (!audioContextRef.current) {
      try {
        // Create the audio context
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextClass) {
          console.error("Web Audio API is not supported in this browser")
          return
        }

        const ctx = new AudioContextClass()
        audioContextRef.current = ctx

        // Create master gain node
        const masterGain = ctx.createGain()
        masterGain.gain.value = 1.0
        masterGain.connect(ctx.destination)
        masterGainRef.current = masterGain

        console.log("AudioContext created with state:", ctx.state)
        setIsInitialized(true)

        // Set up periodic checks to ensure context stays running
        resumeIntervalRef.current = window.setInterval(() => {
          if (ctx.state === "suspended") {
            console.log("AudioContext suspended, attempting to resume...")
            resumeAttemptRef.current += 1
            ctx.resume().catch((err) => {
              console.warn("Failed to resume AudioContext:", err)
            })
          }
        }, 1000) as unknown as number
      } catch (error) {
        console.error("Error initializing AudioContext:", error)
      }
    }

    // Cleanup function
    return () => {
      if (resumeIntervalRef.current) {
        clearInterval(resumeIntervalRef.current)
      }

      // Don't close the audio context on unmount - it should persist for the app lifetime
    }
  }, [])

  // Function to ensure the audio context is running
  const ensureAudioContextRunning = async (): Promise<boolean> => {
    const ctx = audioContextRef.current
    if (!ctx) return false

    if (ctx.state === "suspended") {
      try {
        await ctx.resume()
        console.log("AudioContext resumed successfully")
        return true
      } catch (error) {
        console.error("Failed to resume AudioContext:", error)
        return false
      }
    }
    return ctx.state === "running"
  }

  // Set up event listeners for user interaction
  useEffect(() => {
    if (!isInitialized) return

    const handleUserInteraction = async () => {
      await ensureAudioContextRunning()
    }

    // Add event listeners for common user interactions
    const events = ["click", "touchstart", "keydown", "mousedown"]
    events.forEach((event) => {
      document.addEventListener(event, handleUserInteraction, { once: false })
    })

    // Clean up event listeners
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleUserInteraction)
      })
    }
  }, [isInitialized])

  // Context value
  const value: AudioContextValue = {
    audioContext: audioContextRef.current,
    masterGain: masterGainRef.current,
    ensureAudioContextRunning,
  }

  return <AudioContextContext.Provider value={value}>{children}</AudioContextContext.Provider>
}
