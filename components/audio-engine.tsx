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

  // Local refs
  const reverbRef = useRef<ConvolverNode | null>(null)
  const localMasterGainRef = useRef<GainNode | null>(null)
  const activeSourcesRef = useRef<Array<{ source: OscillatorNode; endTime?: number; gainNode?: GainNode }>>([])
  const secondSchedulerRef = useRef<number | null>(null)
  const referenceSourceRef = useRef<OscillatorNode | null>(null)
  const referenceGainRef = useRef<GainNode | null>(null)
  const hourSourceRef = useRef<OscillatorNode | null>(null)
  const hourGainRef = useRef<GainNode | null>(null)
  const lastPlayedHourRef = useRef<number | null>(null)
  const cleanupTimerRef = useRef<number | null>(null)
  const isInitializedRef = useRef<boolean>(false)
  const minuteNotesRef = useRef<Array<{ source: OscillatorNode; gainNode: GainNode }>>([])
  const secondNotesRef = useRef<Array<{ source: OscillatorNode; gainNode: GainNode }>>([])

  // Add these refs after the other refs
  const prevSoundTogglesRef = useRef<{
    reference: boolean
    hour: boolean
    minute: boolean
    second: boolean
  }>({
    reference: false,
    hour: false,
    minute: false,
    second: false,
  })

  const prevSoundVolumesRef = useRef<{
    reference: number
    hour: number
    minute: number
    second: number
  }>({
    reference: 0,
    hour: 0,
    minute: 0,
    second: 0,
  })

  const prevMasterVolumeRef = useRef<number>(0)

  // Initialize audio processing chain
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

      // Create reverb
      const convolver = audioContext.createConvolver()
      createReverbImpulse(audioContext, convolver)
      convolver.connect(localMasterGain)
      reverbRef.current = convolver

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

      // Stop reference tone
      if (referenceSourceRef.current) {
        safelyStopAndDisconnectSource(referenceSourceRef.current, referenceGainRef.current)
        referenceSourceRef.current = null
        referenceGainRef.current = null
      }

      // Stop hour tone
      if (hourSourceRef.current) {
        safelyStopAndDisconnectSource(hourSourceRef.current, hourGainRef.current)
        hourSourceRef.current = null
        hourGainRef.current = null
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

      // Disconnect reverb
      if (reverbRef.current) {
        try {
          reverbRef.current.disconnect()
          reverbRef.current = null
        } catch (e) {
          console.error("Error disconnecting reverb:", e)
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

  // REFERENCE TONE - Completely isolated in its own effect
  useEffect(() => {
    if (!audioContext || !reverbRef.current || !isInitializedRef.current) return

    // Handle reference tone (C3 ambient pad with reverb)
    if (soundToggles.reference) {
      // Only create a new reference tone if one isn't already playing
      if (!referenceSourceRef.current) {
        console.log("Creating new reference tone")

        try {
          // Create oscillator
          const oscillator = audioContext.createOscillator()
          oscillator.type = "sine"
          oscillator.frequency.value = NOTE_FREQUENCIES["C3"]

          // Create gain node with smooth attack
          const gainNode = audioContext.createGain()
          const now = audioContext.currentTime
          gainNode.gain.setValueAtTime(0, now)
          gainNode.gain.linearRampToValueAtTime(soundVolumes.reference * masterVolume * 1.2, now + 2.0)

          // Connect nodes
          oscillator.connect(gainNode)
          gainNode.connect(reverbRef.current)

          // Start oscillator
          oscillator.start(now)

          // Store references
          referenceSourceRef.current = oscillator
          referenceGainRef.current = gainNode

          console.log("Reference tone created successfully")
        } catch (error) {
          console.error("Error creating reference tone:", error)
        }
      } else if (referenceGainRef.current) {
        // Just update the volume if needed
        const now = audioContext.currentTime
        const targetVolume = soundVolumes.reference * masterVolume * 1.2

        try {
          // Cancel any scheduled changes and set a new target
          referenceGainRef.current.gain.cancelScheduledValues(now)
          referenceGainRef.current.gain.setValueAtTime(referenceGainRef.current.gain.value, now)
          referenceGainRef.current.gain.linearRampToValueAtTime(targetVolume, now + 1.0)
        } catch (error) {
          console.error("Error updating reference tone volume:", error)
        }
      }
    } else {
      // Stop the reference tone if it exists and the toggle is off
      if (referenceSourceRef.current && referenceGainRef.current) {
        console.log("Stopping reference tone")

        try {
          const now = audioContext.currentTime

          // Fade out gain to avoid clicks
          referenceGainRef.current.gain.cancelScheduledValues(now)
          referenceGainRef.current.gain.setValueAtTime(referenceGainRef.current.gain.value, now)
          referenceGainRef.current.gain.linearRampToValueAtTime(0, now + 1.0)

          // Schedule cleanup after fade out
          setTimeout(() => {
            try {
              if (referenceSourceRef.current) {
                referenceSourceRef.current.stop()
                referenceSourceRef.current.disconnect()
                referenceSourceRef.current = null
              }

              if (referenceGainRef.current) {
                referenceGainRef.current.disconnect()
                referenceGainRef.current = null
              }

              console.log("Reference tone stopped and cleaned up")
            } catch (error) {
              console.error("Error cleaning up reference tone:", error)
            }
          }, 1100)
        } catch (error) {
          console.error("Error stopping reference tone:", error)
        }
      }
    }
  }, [audioContext, soundToggles.reference, soundVolumes.reference, masterVolume, isInitializedRef])

  // HOUR TONE - Completely isolated in its own effect
  useEffect(() => {
    if (!audioContext || !reverbRef.current || !isInitializedRef.current) return

    // Handle hour tone (ambient pad with reverb)
    if (soundToggles.hour) {
      const hourNote = getHourNote(hours)
      const frequency = NOTE_FREQUENCIES[hourNote] || 440

      // Create a new hour tone if the hour has changed or one isn't already playing
      if (lastPlayedHourRef.current !== hours || !hourSourceRef.current) {
        console.log(`Hour changed from ${lastPlayedHourRef.current} to ${hours}, creating new hour tone`)

        // Stop the previous hour tone if it exists
        if (hourSourceRef.current && hourGainRef.current) {
          try {
            const now = audioContext.currentTime

            // Fade out gain to avoid clicks
            hourGainRef.current.gain.cancelScheduledValues(now)
            hourGainRef.current.gain.setValueAtTime(hourGainRef.current.gain.value, now)
            hourGainRef.current.gain.linearRampToValueAtTime(0, now + 0.5)

            // Schedule cleanup after fade out
            setTimeout(() => {
              try {
                if (hourSourceRef.current) {
                  hourSourceRef.current.stop()
                  hourSourceRef.current.disconnect()
                  hourSourceRef.current = null
                }

                if (hourGainRef.current) {
                  hourGainRef.current.disconnect()
                  hourGainRef.current = null
                }

                console.log("Previous hour tone stopped and cleaned up")
              } catch (error) {
                console.error("Error cleaning up previous hour tone:", error)
              }
            }, 600)
          } catch (error) {
            console.error("Error stopping previous hour tone:", error)
          }
        }

        try {
          // Create oscillator
          const oscillator = audioContext.createOscillator()
          oscillator.type = "sine"
          oscillator.frequency.value = frequency

          // Create gain node with smooth attack
          const gainNode = audioContext.createGain()
          const now = audioContext.currentTime
          gainNode.gain.setValueAtTime(0, now)
          gainNode.gain.linearRampToValueAtTime(soundVolumes.hour * masterVolume * 1.2, now + 2.0)

          // Connect nodes
          oscillator.connect(gainNode)
          gainNode.connect(reverbRef.current)

          // Start oscillator
          oscillator.start(now)

          // Store references
          hourSourceRef.current = oscillator
          hourGainRef.current = gainNode

          // Update the last played hour
          lastPlayedHourRef.current = hours

          console.log("Hour tone created successfully")
        } catch (error) {
          console.error("Error creating hour tone:", error)
        }
      } else if (hourGainRef.current) {
        // Just update the volume if needed
        const now = audioContext.currentTime
        const targetVolume = soundVolumes.hour * masterVolume * 1.2

        try {
          // Cancel any scheduled changes and set a new target
          hourGainRef.current.gain.cancelScheduledValues(now)
          hourGainRef.current.gain.setValueAtTime(hourGainRef.current.gain.value, now)
          hourGainRef.current.gain.linearRampToValueAtTime(targetVolume, now + 1.0)
        } catch (error) {
          console.error("Error updating hour tone volume:", error)
        }
      }
    } else {
      // Stop the hour tone if it exists and the toggle is off
      if (hourSourceRef.current && hourGainRef.current) {
        console.log("Stopping hour tone")

        try {
          const now = audioContext.currentTime

          // Fade out gain to avoid clicks
          hourGainRef.current.gain.cancelScheduledValues(now)
          hourGainRef.current.gain.setValueAtTime(hourGainRef.current.gain.value, now)
          hourGainRef.current.gain.linearRampToValueAtTime(0, now + 1.0)

          // Schedule cleanup after fade out
          setTimeout(() => {
            try {
              if (hourSourceRef.current) {
                hourSourceRef.current.stop()
                hourSourceRef.current.disconnect()
                hourSourceRef.current = null
              }

              if (hourGainRef.current) {
                hourGainRef.current.disconnect()
                hourGainRef.current = null
              }

              lastPlayedHourRef.current = null
              console.log("Hour tone stopped and cleaned up")
            } catch (error) {
              console.error("Error cleaning up hour tone:", error)
            }
          }, 1100)
        } catch (error) {
          console.error("Error stopping hour tone:", error)
        }
      }
    }
  }, [audioContext, hours, soundToggles.hour, soundVolumes.hour, masterVolume, isInitializedRef])

  // MINUTE AND SECOND TONES - Handled in a separate effect
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

  const safelyStopAndDisconnectSource = (source: OscillatorNode, gainNode?: GainNode | null) => {
    if (!audioContext) return

    try {
      if (gainNode) {
        // Fade out to avoid clicks
        const now = audioContext.currentTime
        gainNode.gain.cancelScheduledValues(now)
        gainNode.gain.setValueAtTime(gainNode.gain.value, now)
        gainNode.gain.linearRampToValueAtTime(0, now + 0.5) // Longer fade out (500ms)

        // Schedule disconnection after fade completes
        setTimeout(() => {
          try {
            gainNode.disconnect()
          } catch (e) {
            // Ignore errors from already disconnected nodes
          }
        }, 600) // Wait longer than the fade time
      }

      // Stop the source after the fade out completes
      setTimeout(() => {
        try {
          if (source.frequency) {
            source.frequency.value = 0
          }
          source.stop()
        } catch (e) {
          // Ignore errors from already stopped sources
        }

        try {
          source.disconnect()
        } catch (e) {
          // Ignore errors from already disconnected sources
        }
      }, 600) // Match the disconnect timeout
    } catch (e) {
      console.error("Error stopping audio source:", e)
    }
  }

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
      safelyStopAndDisconnectSource(source, gainNode)
    })
    activeSourcesRef.current = []
  }

  // Play a synthesized note
  const playNote = (
    instrument: "ambient" | "harp" | "vibraphone",
    note: string,
    volume: number,
    destination: AudioNode,
    startTime = 0,
    duration?: number,
  ) => {
    if (!audioContext) return null

    // Ensure context is running
    ensureAudioContextRunning()

    return createSynthesizedNote(instrument, note, volume, destination, startTime, duration)
  }

  // Create a synthesized note
  const createSynthesizedNote = (
    instrument: "ambient" | "harp" | "vibraphone",
    note: string,
    volume: number,
    destination: AudioNode,
    startTime = 0,
    duration?: number,
  ) => {
    if (!audioContext) return null

    const frequency = NOTE_FREQUENCIES[note] || 440 // Default to A4 if note not found
    const now = audioContext.currentTime + startTime

    // For Safari, simplify the audio graph for better performance
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

    switch (instrument) {
      case "ambient": {
        // Create a simpler ambient pad for Safari
        if (isSafari) {
          // Primary oscillator (sine wave)
          const oscillator = audioContext.createOscillator()
          oscillator.type = "sine"
          oscillator.frequency.value = frequency

          // Create gain node for envelope with smoother attack and no abrupt changes
          const gainNode = audioContext.createGain()
          gainNode.gain.setValueAtTime(0, now)
          gainNode.gain.linearRampToValueAtTime(volume, now + 0.5) // Slower attack to avoid clicks

          // If duration is provided, create a smooth release
          if (duration) {
            gainNode.gain.setValueAtTime(volume, now + duration - 1.0) // Start fade 1 second before end
            gainNode.gain.linearRampToValueAtTime(0.001, now + duration) // Smooth fade out
          }

          // Connect nodes
          oscillator.connect(gainNode)
          gainNode.connect(destination)

          // Start oscillator
          oscillator.start(now)
          if (duration) {
            oscillator.stop(now + duration)
          }

          // Add to active sources for cleanup
          activeSourcesRef.current.push({
            source: oscillator,
            endTime: duration ? now + duration : undefined,
            gainNode,
          })

          return { source: oscillator, gainNode }
        }

        // Full implementation for other browsers
        // Primary oscillator (sine wave for warmth)
        const oscillator1 = audioContext.createOscillator()
        oscillator1.type = "sine"
        oscillator1.frequency.value = frequency

        // Secondary oscillator (triangle wave for harmonics)
        const oscillator2 = audioContext.createOscillator()
        oscillator2.type = "triangle"
        oscillator2.frequency.value = frequency

        // Slightly detuned oscillator for richness
        const oscillator3 = audioContext.createOscillator()
        oscillator3.type = "sine"
        oscillator3.frequency.value = frequency * 1.003 // Slight detune

        // Sub oscillator for depth
        const subOscillator = audioContext.createOscillator()
        subOscillator.type = "sine"
        subOscillator.frequency.value = frequency / 2 // One octave down

        // Higher harmonic for audibility
        const highOscillator = audioContext.createOscillator()
        highOscillator.type = "sine"
        highOscillator.frequency.value = frequency * 2 // One octave up

        // Create gain nodes for each oscillator
        const gain1 = audioContext.createGain()
        gain1.gain.value = volume * 0.6 // Increased from 0.5

        const gain2 = audioContext.createGain()
        gain2.gain.value = volume * 0.4 // Increased from 0.3

        const gain3 = audioContext.createGain()
        gain3.gain.value = volume * 0.25 // Increased from 0.2

        const subGain = audioContext.createGain()
        subGain.gain.value = volume * 0.3 // Increased from 0.25

        const highGain = audioContext.createGain()
        highGain.gain.value = volume * 0.15 // Subtle high frequency component

        // Create a master gain for the pad with smoother envelope
        const masterPadGain = audioContext.createGain()
        masterPadGain.gain.setValueAtTime(0, now)
        masterPadGain.gain.linearRampToValueAtTime(volume * 1.5, now + 2.0) // Slower attack (2 seconds)

        if (duration) {
          masterPadGain.gain.setValueAtTime(volume * 1.5, now + duration - 3)
          masterPadGain.gain.linearRampToValueAtTime(0.001, now + duration) // 3 second release
        }

        // Create a lowpass filter for warmth
        const filter = audioContext.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 2000 // Increased from 1200 for more presence
        filter.Q.value = 0.7 // Increased from 0.5 for more resonance

        // Create a highpass filter to remove muddy low frequencies
        const highpass = audioContext.createBiquadFilter()
        highpass.type = "highpass"
        highpass.frequency.value = 80
        highpass.Q.value = 0.5

        // Create a peak filter to enhance presence
        const peakFilter = audioContext.createBiquadFilter()
        peakFilter.type = "peaking"
        peakFilter.frequency.value = frequency * 1.5
        peakFilter.Q.value = 2
        peakFilter.gain.value = 6 // dB boost

        // Create LFO for subtle filter modulation
        const lfo = audioContext.createOscillator()
        lfo.type = "sine"
        lfo.frequency.value = 0.2 // Very slow modulation

        const lfoGain = audioContext.createGain()
        lfoGain.gain.value = 300 // Increased modulation amount

        // Create a subtle amplitude modulation for pulsing effect
        const amplitudeLfo = audioContext.createOscillator()
        amplitudeLfo.type = "sine"
        amplitudeLfo.frequency.value = 0.3 // Slow pulsing

        const amplitudeLfoGain = audioContext.createGain()
        amplitudeLfoGain.gain.value = 0.1 // Subtle effect

        // Connect LFO to filter
        lfo.connect(lfoGain)
        lfoGain.connect(filter.frequency)

        // Connect amplitude LFO
        amplitudeLfo.connect(amplitudeLfoGain)
        amplitudeLfoGain.connect(masterPadGain.gain)

        // Connect oscillators to their gain nodes
        oscillator1.connect(gain1)
        oscillator2.connect(gain2)
        oscillator3.connect(gain3)
        subOscillator.connect(subGain)
        highOscillator.connect(highGain)

        // Connect all gains to the filter chain
        gain1.connect(filter)
        gain2.connect(filter)
        gain3.connect(filter)
        subGain.connect(filter)
        highGain.connect(peakFilter)
        peakFilter.connect(filter)

        // Connect filter to highpass
        filter.connect(highpass)

        // Connect highpass to master pad gain
        highpass.connect(masterPadGain)

        // Connect master pad gain to destination
        masterPadGain.connect(destination)

        // Start all oscillators
        oscillator1.start(now)
        oscillator2.start(now)
        oscillator3.start(now)
        subOscillator.start(now)
        highOscillator.start(now)
        lfo.start(now)
        amplitudeLfo.start(now)

        // Calculate end time for cleanup
        const endTime = duration ? now + duration : undefined

        // Add to active sources for cleanup
        activeSourcesRef.current.push(
          { source: oscillator1, endTime, gainNode: masterPadGain },
          { source: oscillator2, endTime },
          { source: oscillator3, endTime },
          { source: subOscillator, endTime },
          { source: highOscillator, endTime },
          { source: lfo, endTime },
          { source: amplitudeLfo, endTime },
        )

        // Stop oscillators if duration is provided
        if (duration) {
          const stopTime = now + duration
          oscillator1.stop(stopTime)
          oscillator2.stop(stopTime)
          oscillator3.stop(stopTime)
          subOscillator.stop(stopTime)
          highOscillator.stop(stopTime)
          lfo.stop(stopTime)
          amplitudeLfo.stop(stopTime)
        }

        return { source: oscillator1, gainNode: masterPadGain } // Return primary oscillator and gain node as reference
      }

      case "harp": {
        // Simplified version for Safari
        if (isSafari) {
          const oscillator = audioContext.createOscillator()
          oscillator.type = "triangle"
          oscillator.frequency.value = frequency

          const gainNode = audioContext.createGain()
          gainNode.gain.setValueAtTime(0, now)
          gainNode.gain.linearRampToValueAtTime(volume, now + 0.01)
          gainNode.gain.exponentialRampToValueAtTime(volume * 0.2, now + 0.5)

          const stopTime = duration ? now + duration : now + 2
          gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime)

          oscillator.connect(gainNode)
          gainNode.connect(destination)

          oscillator.start(now)
          oscillator.stop(stopTime)

          activeSourcesRef.current.push({ source: oscillator, endTime: stopTime, gainNode })

          return { source: oscillator, gainNode }
        }

        // Full implementation for other browsers
        // Main oscillator (triangle for warmth with less harshness than sawtooth)
        const oscillator = audioContext.createOscillator()
        oscillator.type = "triangle"
        oscillator.frequency.value = frequency

        // Create gain node for envelope
        const gainNode = audioContext.createGain()

        // Pizzicato-like envelope: very fast attack, quick initial decay, then longer tail
        gainNode.gain.setValueAtTime(0, now)
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.003) // Very fast attack
        gainNode.gain.exponentialRampToValueAtTime(volume * 0.4, now + 0.1) // Quick initial decay
        gainNode.gain.exponentialRampToValueAtTime(volume * 0.2, now + 0.5) // Mid decay

        const stopTime = duration ? now + duration : now + 2.5
        gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime)

        // Create just a few harmonics for a cleaner, less intense sound
        // Fewer harmonics than guitar but more than vibraphone
        const harmonics = [
          { freq: frequency * 2, gain: 0.15 }, // 1st overtone (octave)
          { freq: frequency * 3, gain: 0.05 }, // 2nd overtone (octave + fifth)
        ]

        // Create and connect harmonic oscillators
        const harmonicOscs = harmonics.map((h) => {
          const osc = audioContext.createOscillator()
          osc.type = "sine" // Sine for gentler harmonics
          osc.frequency.value = h.freq

          const harmonicGain = audioContext.createGain()
          harmonicGain.gain.value = volume * h.gain

          osc.connect(harmonicGain)
          harmonicGain.connect(gainNode)

          osc.start(now)
          osc.stop(stopTime)

          // Add to active sources for cleanup
          activeSourcesRef.current.push({ source: osc, endTime: stopTime })

          return osc
        })

        // Create a very subtle pitch bend at the beginning (string pluck effect)
        oscillator.frequency.setValueAtTime(frequency * 1.005, now) // Start slightly sharp
        oscillator.frequency.exponentialRampToValueAtTime(frequency, now + 0.01) // Quick bend to correct pitch

        // Create filter for warm tone shaping
        const filter = audioContext.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 2500 // Warmer than guitar but not too dark
        filter.Q.value = 0.5

        // Create a second filter for body resonance
        const bodyFilter = audioContext.createBiquadFilter()
        bodyFilter.type = "peaking"
        bodyFilter.frequency.value = frequency * 1.2 // Slight resonance above the fundamental
        bodyFilter.Q.value = 2
        bodyFilter.gain.value = 3 // Gentle boost

        // Connect nodes
        oscillator.connect(filter)
        filter.connect(bodyFilter)
        bodyFilter.connect(gainNode)
        gainNode.connect(destination)

        // Start main oscillator
        oscillator.start(now)
        oscillator.stop(stopTime)

        // Add to active sources for cleanup
        activeSourcesRef.current.push({ source: oscillator, endTime: stopTime, gainNode })

        return { source: oscillator, gainNode }
      }

      case "vibraphone": {
        // Simplified version for Safari
        if (isSafari) {
          const oscillator = audioContext.createOscillator()
          oscillator.type = "sine"
          oscillator.frequency.value = frequency

          const gainNode = audioContext.createGain()
          gainNode.gain.setValueAtTime(0, now)
          gainNode.gain.linearRampToValueAtTime(volume, now + 0.02)

          const stopTime = duration ? now + duration : now + 1
          gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime)

          oscillator.connect(gainNode)
          gainNode.connect(destination)

          oscillator.start(now)
          oscillator.stop(stopTime)

          activeSourcesRef.current.push({ source: oscillator, endTime: stopTime, gainNode })

          return { source: oscillator, gainNode }
        }

        // Full implementation for other browsers
        // Create oscillator
        const oscillator = audioContext.createOscillator()
        oscillator.type = "sine"
        oscillator.frequency.value = frequency

        // Create gain node
        const gainNode = audioContext.createGain()

        // Fast attack, long sustain with vibrato
        gainNode.gain.setValueAtTime(0, now)
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.02)

        const stopTime = duration ? now + duration : now + 1.5

        if (duration) {
          gainNode.gain.setValueAtTime(volume * 0.8, now + duration - 0.2)
          gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime)
        } else {
          gainNode.gain.exponentialRampToValueAtTime(volume * 0.7, now + 0.2)
          gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime)
        }

        // Create a second oscillator for harmonic richness
        const harmonicOsc = audioContext.createOscillator()
        harmonicOsc.type = "sine"
        harmonicOsc.frequency.value = frequency * 2 // One octave higher

        // Create gain node for harmonic
        const harmonicGain = audioContext.createGain()
        harmonicGain.gain.value = volume * 0.2 // Subtle harmonic

        // Add vibrato for vibraphone
        const vibratoOsc = audioContext.createOscillator()
        vibratoOsc.frequency.value = 5 // 5 Hz vibrato
        const vibratoGain = audioContext.createGain()
        vibratoGain.gain.value = 3 // Vibrato depth
        vibratoOsc.connect(vibratoGain)
        vibratoGain.connect(oscillator.frequency)

        // Create filter for metallic tone shaping
        const filter = audioContext.createBiquadFilter()
        filter.type = "bandpass"
        filter.frequency.value = frequency * 2
        filter.Q.value = 2

        // Connect nodes
        oscillator.connect(filter)
        harmonicOsc.connect(harmonicGain)
        harmonicGain.connect(filter)
        filter.connect(gainNode)
        gainNode.connect(destination)

        // Start oscillators
        oscillator.start(now)
        harmonicOsc.start(now)
        vibratoOsc.start(now)

        // Stop oscillators
        oscillator.stop(stopTime)
        harmonicOsc.stop(stopTime)
        vibratoOsc.stop(stopTime)

        // Add to active sources for cleanup
        activeSourcesRef.current.push(
          { source: oscillator, endTime: stopTime, gainNode },
          { source: harmonicOsc, endTime: stopTime },
          { source: vibratoOsc, endTime: stopTime },
        )

        return { source: oscillator, gainNode }
      }

      default:
        return null
    }
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
    // MODIFIED: Reversed the order - tens plays first, then ones
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

      // MODIFIED: Reversed the order - tens plays first, then ones
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

  // Create a reverb impulse response
  const createReverbImpulse = (ctx: AudioContext, convolver: ConvolverNode) => {
    const duration = 4.0 // Longer reverb for ambient pad
    const decay = 2.5
    const sampleRate = ctx.sampleRate
    const length = sampleRate * duration

    const impulse = ctx.createBuffer(2, length, sampleRate)
    const leftChannel = impulse.getChannelData(0)
    const rightChannel = impulse.getChannelData(1)

    for (let i = 0; i < length; i++) {
      const n = i / length
      // Decay exponentially
      const value = Math.random() * 2 - 1
      leftChannel[i] = value * Math.pow(1 - n, decay)
      rightChannel[i] = value * Math.pow(1 - n, decay)
    }

    convolver.buffer = impulse
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
