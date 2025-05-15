"use client"

import { useEffect, useRef } from "react"
import { useAudioContext } from "./audio-context-provider"

interface AudioEngineProps {
  hours: number
  minutes: number
  seconds: number
  milliseconds: number
  masterVolume: number
  soundToggles: {
    reference: boolean
    hour: boolean
    minute: boolean
    second: boolean
  }
  soundVolumes: {
    reference: number
    hour: number
    minute: number
    second: number
  }
}

// Define note frequencies for each instrument
const NOTE_FREQUENCIES: Record<string, number> = {
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  C6: 1046.5,
  D6: 1174.66,
}

export default function AudioEngine({
  hours,
  minutes,
  seconds,
  milliseconds,
  masterVolume,
  soundToggles,
  soundVolumes,
}: AudioEngineProps) {
  // Use the shared audio context
  const { audioContext, masterGain, ensureAudioContextRunning } = useAudioContext()

  // Local refs for transient sounds
  const localMasterGainRef = useRef<GainNode | null>(null)
  const activeSourcesRef = useRef<Array<{ source: OscillatorNode; endTime?: number; gainNode?: GainNode }>>([])
  const secondSchedulerRef = useRef<number | null>(null)
  const cleanupTimerRef = useRef<number | null>(null)
  const isInitializedRef = useRef<boolean>(false)

  // Dedicated refs for continuous drones
  const continuousDronesContextRef = useRef<AudioContext | null>(null)
  const referenceOscillatorRef = useRef<OscillatorNode | null>(null)
  const referenceGainRef = useRef<GainNode | null>(null)
  const hourOscillatorRef = useRef<OscillatorNode | null>(null)
  const hourGainRef = useRef<GainNode | null>(null)
  const lastHourRef = useRef<number | null>(null)

  // Initialize main audio processing chain for transient sounds
  useEffect(() => {
    if (!audioContext || !masterGain || isInitializedRef.current) return

    // Ensure audio context is running
    ensureAudioContextRunning()

    try {
      // Create local master gain (for this instance's volume control)
      const localMasterGain = audioContext.createGain()
      localMasterGain.gain.value = masterVolume
      localMasterGain.connect(masterGain)
      localMasterGainRef.current = localMasterGain

      // Set up periodic cleanup of finished nodes
      cleanupTimerRef.current = window.setInterval(() => {
        cleanupFinishedNodes()
      }, 1000) as unknown as number

      isInitializedRef.current = true
      console.log("Audio engine initialized successfully")
    } catch (error) {
      console.error("Error initializing audio engine:", error)
    }

    // Clean up function
    return () => {
      // Cancel any scheduled second tones
      if (secondSchedulerRef.current !== null) {
        clearInterval(secondSchedulerRef.current)
        secondSchedulerRef.current = null
      }

      // Cancel cleanup timer
      if (cleanupTimerRef.current !== null) {
        clearInterval(cleanupTimerRef.current)
        cleanupTimerRef.current = null
      }

      // Stop all active sources
      cleanupAllNodes()

      // Disconnect local master gain
      if (localMasterGainRef.current) {
        try {
          localMasterGainRef.current.disconnect()
          localMasterGainRef.current = null
        } catch (e) {
          console.error("Error disconnecting local master gain:", e)
        }
      }

      isInitializedRef.current = false
    }
  }, [audioContext, masterGain, masterVolume, ensureAudioContextRunning])

  // Update master volume when it changes
  useEffect(() => {
    if (localMasterGainRef.current) {
      localMasterGainRef.current.gain.value = masterVolume
    }
  }, [masterVolume])

  // COMPLETELY SEPARATE AUDIO CONTEXT FOR CONTINUOUS DRONES
  // This is a radical approach to ensure these tones are completely isolated
  useEffect(() => {
    // Create a separate audio context for continuous drones if needed
    if (!continuousDronesContextRef.current && (soundToggles.reference || soundToggles.hour)) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        continuousDronesContextRef.current = new AudioContextClass()
        console.log("Created separate audio context for continuous drones")
      } catch (error) {
        console.error("Failed to create separate audio context for drones:", error)
      }
    }

    // Clean up function
    return () => {
      // Clean up reference oscillator
      if (referenceOscillatorRef.current) {
        try {
          referenceOscillatorRef.current.stop()
          referenceOscillatorRef.current.disconnect()
          referenceOscillatorRef.current = null
        } catch (e) {
          console.error("Error cleaning up reference oscillator:", e)
        }
      }

      if (referenceGainRef.current) {
        try {
          referenceGainRef.current.disconnect()
          referenceGainRef.current = null
        } catch (e) {
          console.error("Error cleaning up reference gain:", e)
        }
      }

      // Clean up hour oscillator
      if (hourOscillatorRef.current) {
        try {
          hourOscillatorRef.current.stop()
          hourOscillatorRef.current.disconnect()
          hourOscillatorRef.current = null
        } catch (e) {
          console.error("Error cleaning up hour oscillator:", e)
        }
      }

      if (hourGainRef.current) {
        try {
          hourGainRef.current.disconnect()
          hourGainRef.current = null
        } catch (e) {
          console.error("Error cleaning up hour gain:", e)
        }
      }

      // Close the separate audio context
      if (continuousDronesContextRef.current) {
        try {
          continuousDronesContextRef.current.close()
          continuousDronesContextRef.current = null
          console.log("Closed separate audio context for continuous drones")
        } catch (e) {
          console.error("Error closing separate audio context:", e)
        }
      }
    }
  }, [soundToggles.reference, soundToggles.hour])

  // Handle reference tone in separate context
  useEffect(() => {
    const ctx = continuousDronesContextRef.current
    if (!ctx) return

    // Resume context if needed
    if (ctx.state === "suspended") {
      ctx.resume().catch((err) => console.error("Failed to resume drone context:", err))
    }

    // Handle reference tone
    if (soundToggles.reference) {
      if (!referenceOscillatorRef.current) {
        try {
          // Create a simple sine oscillator
          const oscillator = ctx.createOscillator()
          oscillator.type = "sine"
          oscillator.frequency.value = NOTE_FREQUENCIES["C3"]

          // Create gain node
          const gainNode = ctx.createGain()
          gainNode.gain.value = 0

          // Connect
          oscillator.connect(gainNode)
          gainNode.connect(ctx.destination)

          // Start oscillator
          oscillator.start()

          // Store references
          referenceOscillatorRef.current = oscillator
          referenceGainRef.current = gainNode

          // Fade in
          const now = ctx.currentTime
          gainNode.gain.setValueAtTime(0, now)
          gainNode.gain.linearRampToValueAtTime(soundVolumes.reference * masterVolume, now + 1)

          console.log("Created reference tone in separate context")
        } catch (error) {
          console.error("Error creating reference tone:", error)
        }
      } else if (referenceGainRef.current) {
        // Just update volume
        const now = ctx.currentTime
        referenceGainRef.current.gain.cancelScheduledValues(now)
        referenceGainRef.current.gain.setValueAtTime(referenceGainRef.current.gain.value, now)
        referenceGainRef.current.gain.linearRampToValueAtTime(soundVolumes.reference * masterVolume, now + 0.5)
      }
    } else if (referenceOscillatorRef.current && referenceGainRef.current) {
      // Fade out and stop
      try {
        const now = ctx.currentTime
        referenceGainRef.current.gain.cancelScheduledValues(now)
        referenceGainRef.current.gain.setValueAtTime(referenceGainRef.current.gain.value, now)
        referenceGainRef.current.gain.linearRampToValueAtTime(0, now + 0.5)

        // Schedule cleanup
        setTimeout(() => {
          if (referenceOscillatorRef.current) {
            referenceOscillatorRef.current.stop()
            referenceOscillatorRef.current.disconnect()
            referenceOscillatorRef.current = null
          }

          if (referenceGainRef.current) {
            referenceGainRef.current.disconnect()
            referenceGainRef.current = null
          }

          console.log("Cleaned up reference tone")
        }, 600)
      } catch (error) {
        console.error("Error stopping reference tone:", error)
      }
    }
  }, [soundToggles.reference, soundVolumes.reference, masterVolume])

  // Handle hour tone in separate context
  useEffect(() => {
    const ctx = continuousDronesContextRef.current
    if (!ctx) return

    // Resume context if needed
    if (ctx.state === "suspended") {
      ctx.resume().catch((err) => console.error("Failed to resume drone context:", err))
    }

    // Handle hour tone
    if (soundToggles.hour) {
      const hourNote = getHourNote(hours)
      const frequency = NOTE_FREQUENCIES[hourNote] || 440

      // Create new oscillator if hour changed or none exists
      if (lastHourRef.current !== hours || !hourOscillatorRef.current) {
        // Clean up previous oscillator if it exists
        if (hourOscillatorRef.current) {
          try {
            const now = ctx.currentTime

            if (hourGainRef.current) {
              hourGainRef.current.gain.cancelScheduledValues(now)
              hourGainRef.current.gain.setValueAtTime(hourGainRef.current.gain.value, now)
              hourGainRef.current.gain.linearRampToValueAtTime(0, now + 0.5)
            }

            // Schedule cleanup
            setTimeout(() => {
              if (hourOscillatorRef.current) {
                hourOscillatorRef.current.stop()
                hourOscillatorRef.current.disconnect()
                hourOscillatorRef.current = null
              }

              if (hourGainRef.current) {
                hourGainRef.current.disconnect()
                hourGainRef.current = null
              }

              console.log("Cleaned up previous hour tone")
            }, 600)
          } catch (error) {
            console.error("Error cleaning up previous hour tone:", error)
          }
        }

        try {
          // Create a simple sine oscillator
          const oscillator = ctx.createOscillator()
          oscillator.type = "sine"
          oscillator.frequency.value = frequency

          // Create gain node
          const gainNode = ctx.createGain()
          gainNode.gain.value = 0

          // Connect
          oscillator.connect(gainNode)
          gainNode.connect(ctx.destination)

          // Start oscillator
          oscillator.start()

          // Store references
          hourOscillatorRef.current = oscillator
          hourGainRef.current = gainNode
          lastHourRef.current = hours

          // Fade in
          const now = ctx.currentTime
          gainNode.gain.setValueAtTime(0, now)
          gainNode.gain.linearRampToValueAtTime(soundVolumes.hour * masterVolume, now + 1)

          console.log(`Created hour tone (${hourNote}) in separate context`)
        } catch (error) {
          console.error("Error creating hour tone:", error)
        }
      } else if (hourGainRef.current) {
        // Just update volume
        const now = ctx.currentTime
        hourGainRef.current.gain.cancelScheduledValues(now)
        hourGainRef.current.gain.setValueAtTime(hourGainRef.current.gain.value, now)
        hourGainRef.current.gain.linearRampToValueAtTime(soundVolumes.hour * masterVolume, now + 0.5)
      }
    } else if (hourOscillatorRef.current && hourGainRef.current) {
      // Fade out and stop
      try {
        const now = ctx.currentTime
        hourGainRef.current.gain.cancelScheduledValues(now)
        hourGainRef.current.gain.setValueAtTime(hourGainRef.current.gain.value, now)
        hourGainRef.current.gain.linearRampToValueAtTime(0, now + 0.5)

        // Schedule cleanup
        setTimeout(() => {
          if (hourOscillatorRef.current) {
            hourOscillatorRef.current.stop()
            hourOscillatorRef.current.disconnect()
            hourOscillatorRef.current = null
          }

          if (hourGainRef.current) {
            hourGainRef.current.disconnect()
            hourGainRef.current = null
          }

          lastHourRef.current = null
          console.log("Cleaned up hour tone")
        }, 600)
      } catch (error) {
        console.error("Error stopping hour tone:", error)
      }
    }
  }, [hours, soundToggles.hour, soundVolumes.hour, masterVolume])

  // MINUTE AND SECOND TONES - Handled in the main audio context
  useEffect(() => {
    if (!audioContext || !localMasterGainRef.current || !isInitializedRef.current) return

    // Ensure context is running
    ensureAudioContextRunning()

    const localMasterGain = localMasterGainRef.current

    // Clear any existing second scheduler
    if (secondSchedulerRef.current !== null) {
      clearInterval(secondSchedulerRef.current)
      secondSchedulerRef.current = null
    }

    // Extract tens and ones digits from minutes
    const minuteTens = Math.floor(minutes / 10)
    const minuteOnes = minutes % 10

    // Determine which minute digit to play based on the second
    const playTens = seconds % 2 === 0

    // Play minute tones (alternating tens and ones with harp)
    if (soundToggles.minute) {
      if (playTens && minuteTens > 0) {
        const minuteTensNote = getMinuteTensNote(minuteTens)
        playNote("harp", minuteTensNote, soundVolumes.minute * masterVolume, localMasterGain, 0, 1)
      } else if (!playTens && minuteOnes > 0) {
        const minuteOnesNote = getMinuteOnesNote(minuteOnes)
        playNote("harp", minuteOnesNote, soundVolumes.minute * masterVolume, localMasterGain, 0, 1)
      }
    }

    // Schedule second tones (vibraphone)
    if (soundToggles.second) {
      scheduleSecondTones(
        seconds,
        milliseconds,
        localMasterGain,
        soundToggles.second,
        soundVolumes.second * masterVolume,
      )
    }
  }, [
    audioContext,
    minutes,
    seconds,
    milliseconds,
    masterVolume,
    soundToggles.minute,
    soundToggles.second,
    soundVolumes.minute,
    soundVolumes.second,
    ensureAudioContextRunning,
  ])

  // Clean up finished nodes
  const cleanupFinishedNodes = () => {
    if (!audioContext) return

    const now = audioContext.currentTime
    const nodesToKeep: Array<{ source: OscillatorNode; endTime?: number; gainNode?: GainNode }> = []

    activeSourcesRef.current.forEach(({ source, endTime, gainNode }) => {
      if (endTime && now > endTime + 0.1) {
        // Node has finished playing, disconnect it
        try {
          if (gainNode) {
            gainNode.disconnect()
          }
          source.disconnect()
        } catch (e) {
          // Ignore errors from already disconnected nodes
        }
      } else {
        // Keep this node
        nodesToKeep.push({ source, endTime, gainNode })
      }
    })

    activeSourcesRef.current = nodesToKeep
  }

  // Clean up all nodes
  const cleanupAllNodes = () => {
    activeSourcesRef.current.forEach(({ source, gainNode }) => {
      try {
        if (gainNode) {
          gainNode.disconnect()
        }
        source.stop()
        source.disconnect()
      } catch (e) {
        // Ignore errors from already stopped/disconnected sources
      }
    })
    activeSourcesRef.current = []
  }

  // Play a synthesized note
  const playNote = (
    instrument: "harp" | "vibraphone",
    note: string,
    volume: number,
    destination: AudioNode,
    startTime = 0,
    duration?: number,
  ) => {
    if (!audioContext) return null

    // Ensure context is running
    ensureAudioContextRunning()

    const frequency = NOTE_FREQUENCIES[note] || 440 // Default to A4 if note not found
    const now = audioContext.currentTime + startTime

    // Create oscillator
    const oscillator = audioContext.createOscillator()
    oscillator.type = instrument === "harp" ? "triangle" : "sine"
    oscillator.frequency.value = frequency

    // Create gain node
    const gainNode = audioContext.createGain()
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01)

    const stopTime = duration ? now + duration : now + 1
    gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime)

    // Connect nodes
    oscillator.connect(gainNode)
    gainNode.connect(destination)

    // Start oscillator
    oscillator.start(now)
    oscillator.stop(stopTime)

    // Add to active sources for cleanup
    activeSourcesRef.current.push({ source: oscillator, endTime: stopTime, gainNode })

    return { source: oscillator, gainNode }
  }

  // Schedule second tones to alternate quickly
  const scheduleSecondTones = (
    currentSecond: number,
    milliseconds: number,
    destination: AudioNode,
    enabled: boolean,
    volume: number,
  ) => {
    if (!enabled || !audioContext) return

    // Ensure context is running
    ensureAudioContextRunning()

    // Extract tens and ones digits from seconds
    const secondTens = Math.floor(currentSecond / 10)
    const secondOnes = currentSecond % 10

    // Extract the current millisecond position in the second
    const msInSecond = milliseconds

    // Calculate which quarter of the second we're in (0-3)
    const quarterSecond = Math.floor(msInSecond / 250)

    // Schedule the first tone immediately
    // Tens plays first, then ones
    const isFirstTens = quarterSecond === 0 || quarterSecond === 2
    if (isFirstTens && secondTens > 0) {
      const secondTensNote = getSecondTensNote(secondTens)
      playNote("vibraphone", secondTensNote, volume, destination, 0, 0.2)
    } else if (!isFirstTens && secondOnes > 0) {
      const secondOnesNote = getSecondOnesNote(secondOnes)
      playNote("vibraphone", secondOnesNote, volume, destination, 0, 0.2)
    }

    // Set up interval to schedule tones every quarter second
    secondSchedulerRef.current = window.setInterval(() => {
      if (!audioContext || audioContext.state === "closed") {
        if (secondSchedulerRef.current !== null) {
          clearInterval(secondSchedulerRef.current)
          secondSchedulerRef.current = null
        }
        return
      }

      // Ensure context is running
      ensureAudioContextRunning()

      const now = new Date()
      const currentMs = now.getMilliseconds()
      const currentQuarter = Math.floor(currentMs / 250)

      // Get current second
      const currentSec = now.getSeconds()
      const secTens = Math.floor(currentSec / 10)
      const secOnes = currentSec % 10

      // Determine if we should play tens or ones
      const isTens = currentQuarter === 0 || currentQuarter === 2

      // Schedule the tone
      if (isTens && secTens > 0) {
        const secondTensNote = getSecondTensNote(secTens)
        playNote("vibraphone", secondTensNote, volume, destination, 0, 0.2)
      } else if (!isTens && secOnes > 0) {
        const secondOnesNote = getSecondOnesNote(secOnes)
        playNote("vibraphone", secondOnesNote, volume, destination, 0, 0.2)
      }
    }, 250) as unknown as number
  }

  // Get hour note based on hour value
  const getHourNote = (hour: number): string => {
    const hourNotes = [
      "C3", // 12 o'clock
      "C3", // 1 o'clock
      "D3", // 2 o'clock
      "E3", // 3 o'clock
      "F3", // 4 o'clock
      "G3", // 5 o'clock
      "A3", // 6 o'clock
      "B3", // 7 o'clock
      "C4", // 8 o'clock
      "D4", // 9 o'clock
      "E4", // 10 o'clock
      "F4", // 11 o'clock
      "G4", // 12 o'clock
    ]

    return hourNotes[hour === 0 ? 12 : hour]
  }

  // Get minute tens note
  const getMinuteTensNote = (tens: number): string => {
    if (tens === 0) return "C4" // Default

    const tensNotes = ["C4", "C4", "D4", "E4", "F4", "G4"]
    return tensNotes[tens]
  }

  // Get minute ones note
  const getMinuteOnesNote = (ones: number): string => {
    if (ones === 0) return "C4" // Default

    const onesNotes = ["C4", "C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5"]
    return onesNotes[ones]
  }

  // Get second tens note
  const getSecondTensNote = (tens: number): string => {
    if (tens === 0) return "C5" // Default

    const tensNotes = ["C5", "C5", "D5", "E5", "F5", "G5"]
    return tensNotes[tens]
  }

  // Get second ones note
  const getSecondOnesNote = (ones: number): string => {
    if (ones === 0) return "C5" // Default

    const onesNotes = ["C5", "C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6", "D6"]
    return onesNotes[ones]
  }

  // This component doesn't render anything visible
  return null
}
