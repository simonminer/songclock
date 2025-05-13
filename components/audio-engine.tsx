"use client"

import { useEffect, useRef } from "react"

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
  const audioContextRef = useRef<AudioContext | null>(null)
  const reverbRef = useRef<ConvolverNode | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const activeSourcesRef = useRef<OscillatorNode[]>([])
  const secondSchedulerRef = useRef<number | null>(null)
  const referenceSourceRef = useRef<OscillatorNode | null>(null)
  const hourSourceRef = useRef<OscillatorNode | null>(null)
  const lastPlayedHourRef = useRef<number | null>(null)

  // Initialize audio context
  useEffect(() => {
    // Create AudioContext
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    audioContextRef.current = ctx

    // Resume context (browser policy)
    if (ctx.state === "suspended") {
      ctx.resume()
    }

    // Create master gain
    const masterGain = ctx.createGain()
    masterGain.gain.value = masterVolume
    masterGain.connect(ctx.destination)
    masterGainRef.current = masterGain

    // Create reverb
    const convolver = ctx.createConvolver()
    createReverbImpulse(ctx, convolver)
    convolver.connect(masterGain)
    reverbRef.current = convolver

    // Clean up function
    return () => {
      // Cancel any scheduled second tones
      if (secondSchedulerRef.current !== null) {
        clearInterval(secondSchedulerRef.current)
      }

      // Stop reference and hour tones
      if (referenceSourceRef.current) {
        try {
          referenceSourceRef.current.stop()
        } catch (e) {
          // Ignore errors from already stopped sources
        }
        referenceSourceRef.current = null
      }

      if (hourSourceRef.current) {
        try {
          hourSourceRef.current.stop()
        } catch (e) {
          // Ignore errors from already stopped sources
        }
        hourSourceRef.current = null
      }

      // Stop all active sources
      activeSourcesRef.current.forEach((source) => {
        try {
          source.stop()
        } catch (e) {
          // Ignore errors from already stopped sources
        }
      })

      // Close context after a short delay to allow sounds to fade out
      setTimeout(() => {
        try {
          ctx.close()
        } catch (e) {
          // Ignore errors from already closed context
        }
      }, 100)
    }
  }, [masterVolume])

  // Play a synthesized note
  const playNote = (
    instrument: "ambient" | "harp" | "vibraphone",
    note: string,
    volume: number,
    destination: AudioNode,
    startTime = 0,
    duration?: number,
  ) => {
    if (!audioContextRef.current) return null

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
    if (!audioContextRef.current) return null

    const ctx = audioContextRef.current
    const frequency = NOTE_FREQUENCIES[note] || 440 // Default to A4 if note not found
    const now = ctx.currentTime + startTime

    switch (instrument) {
      case "ambient": {
        // Create a warm ambient pad with multiple oscillators and subtle modulation
        // with enhanced audibility while maintaining ambient quality

        // Primary oscillator (sine wave for warmth)
        const oscillator1 = ctx.createOscillator()
        oscillator1.type = "sine"
        oscillator1.frequency.value = frequency

        // Secondary oscillator (triangle wave for harmonics)
        const oscillator2 = ctx.createOscillator()
        oscillator2.type = "triangle"
        oscillator2.frequency.value = frequency

        // Slightly detuned oscillator for richness
        const oscillator3 = ctx.createOscillator()
        oscillator3.type = "sine"
        oscillator3.frequency.value = frequency * 1.003 // Slight detune

        // Sub oscillator for depth
        const subOscillator = ctx.createOscillator()
        subOscillator.type = "sine"
        subOscillator.frequency.value = frequency / 2 // One octave down

        // Higher harmonic for audibility
        const highOscillator = ctx.createOscillator()
        highOscillator.type = "sine"
        highOscillator.frequency.value = frequency * 2 // One octave up

        // Create gain nodes for each oscillator
        const gain1 = ctx.createGain()
        gain1.gain.value = volume * 0.6 // Increased from 0.5

        const gain2 = ctx.createGain()
        gain2.gain.value = volume * 0.4 // Increased from 0.3

        const gain3 = ctx.createGain()
        gain3.gain.value = volume * 0.25 // Increased from 0.2

        const subGain = ctx.createGain()
        subGain.gain.value = volume * 0.3 // Increased from 0.25

        const highGain = ctx.createGain()
        highGain.gain.value = volume * 0.15 // Subtle high frequency component

        // Create a master gain for the pad
        const masterPadGain = ctx.createGain()
        masterPadGain.gain.setValueAtTime(0, now)
        masterPadGain.gain.linearRampToValueAtTime(volume * 1.5, now + 1.5) // Increased overall volume by 50%

        if (duration) {
          masterPadGain.gain.setValueAtTime(volume * 1.5, now + duration - 2)
          masterPadGain.gain.linearRampToValueAtTime(0.001, now + duration)
        }

        // Create a lowpass filter for warmth
        const filter = ctx.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 2000 // Increased from 1200 for more presence
        filter.Q.value = 0.7 // Increased from 0.5 for more resonance

        // Create a highpass filter to remove muddy low frequencies
        const highpass = ctx.createBiquadFilter()
        highpass.type = "highpass"
        highpass.frequency.value = 80
        highpass.Q.value = 0.5

        // Create a peak filter to enhance presence
        const peakFilter = ctx.createBiquadFilter()
        peakFilter.type = "peaking"
        peakFilter.frequency.value = frequency * 1.5
        peakFilter.Q.value = 2
        peakFilter.gain.value = 6 // dB boost

        // Create LFO for subtle filter modulation
        const lfo = ctx.createOscillator()
        lfo.type = "sine"
        lfo.frequency.value = 0.2 // Very slow modulation

        const lfoGain = ctx.createGain()
        lfoGain.gain.value = 300 // Increased modulation amount

        // Create a subtle amplitude modulation for pulsing effect
        const amplitudeLfo = ctx.createOscillator()
        amplitudeLfo.type = "sine"
        amplitudeLfo.frequency.value = 0.3 // Slow pulsing

        const amplitudeLfoGain = ctx.createGain()
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

        // Stop oscillators if duration is provided
        if (duration) {
          oscillator1.stop(now + duration)
          oscillator2.stop(now + duration)
          oscillator3.stop(now + duration)
          subOscillator.stop(now + duration)
          highOscillator.stop(now + duration)
          lfo.stop(now + duration)
          amplitudeLfo.stop(now + duration)
        }

        // Add to active sources for cleanup
        activeSourcesRef.current.push(
          oscillator1,
          oscillator2,
          oscillator3,
          subOscillator,
          highOscillator,
          lfo,
          amplitudeLfo,
        )

        return oscillator1 // Return primary oscillator as reference
      }

      case "harp": {
        // Create a pizzicato string sound with gentle pluck and natural decay

        // Main oscillator (triangle for warmth with less harshness than sawtooth)
        const oscillator = ctx.createOscillator()
        oscillator.type = "triangle"
        oscillator.frequency.value = frequency

        // Create gain node for envelope
        const gainNode = ctx.createGain()

        // Pizzicato-like envelope: very fast attack, quick initial decay, then longer tail
        gainNode.gain.setValueAtTime(0, now)
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.003) // Very fast attack
        gainNode.gain.exponentialRampToValueAtTime(volume * 0.4, now + 0.1) // Quick initial decay
        gainNode.gain.exponentialRampToValueAtTime(volume * 0.2, now + 0.5) // Mid decay
        if (duration) {
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)
        } else {
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2.5) // Keep the same decay length
        }

        // Create just a few harmonics for a cleaner, less intense sound
        // Fewer harmonics than guitar but more than vibraphone
        const harmonics = [
          { freq: frequency * 2, gain: 0.15 }, // 1st overtone (octave)
          { freq: frequency * 3, gain: 0.05 }, // 2nd overtone (octave + fifth)
        ]

        // Create and connect harmonic oscillators
        const harmonicOscs = harmonics.map((h) => {
          const osc = ctx.createOscillator()
          osc.type = "sine" // Sine for gentler harmonics
          osc.frequency.value = h.freq

          const harmonicGain = ctx.createGain()
          harmonicGain.gain.value = volume * h.gain

          osc.connect(harmonicGain)
          harmonicGain.connect(gainNode)

          osc.start(now)
          if (duration) {
            osc.stop(now + duration)
          } else {
            osc.stop(now + 2.5)
          }

          return osc
        })

        // Create a very subtle pitch bend at the beginning (string pluck effect)
        oscillator.frequency.setValueAtTime(frequency * 1.005, now) // Start slightly sharp
        oscillator.frequency.exponentialRampToValueAtTime(frequency, now + 0.01) // Quick bend to correct pitch

        // Create filter for warm tone shaping
        const filter = ctx.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 2500 // Warmer than guitar but not too dark
        filter.Q.value = 0.5

        // Create a second filter for body resonance
        const bodyFilter = ctx.createBiquadFilter()
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
        if (duration) {
          oscillator.stop(now + duration)
        } else {
          oscillator.stop(now + 2.5) // Keep the same duration
        }

        // Add to active sources for cleanup
        activeSourcesRef.current.push(oscillator, ...harmonicOscs)

        return oscillator
      }

      case "vibraphone": {
        // Create oscillator
        const oscillator = ctx.createOscillator()
        oscillator.type = "sine"
        oscillator.frequency.value = frequency

        // Create gain node
        const gainNode = ctx.createGain()

        // Fast attack, long sustain with vibrato
        gainNode.gain.setValueAtTime(0, now)
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.02)
        if (duration) {
          gainNode.gain.setValueAtTime(volume * 0.8, now + duration - 0.2)
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)
        } else {
          gainNode.gain.exponentialRampToValueAtTime(volume * 0.7, now + 0.2)
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5)
        }

        // Create a second oscillator for harmonic richness
        const harmonicOsc = ctx.createOscillator()
        harmonicOsc.type = "sine"
        harmonicOsc.frequency.value = frequency * 2 // One octave higher

        // Create gain node for harmonic
        const harmonicGain = ctx.createGain()
        harmonicGain.gain.value = volume * 0.2 // Subtle harmonic

        // Add vibrato for vibraphone
        const vibratoOsc = ctx.createOscillator()
        vibratoOsc.frequency.value = 5 // 5 Hz vibrato
        const vibratoGain = ctx.createGain()
        vibratoGain.gain.value = 3 // Vibrato depth
        vibratoOsc.connect(vibratoGain)
        vibratoGain.connect(oscillator.frequency)

        // Create filter for metallic tone shaping
        const filter = ctx.createBiquadFilter()
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
        if (duration) {
          oscillator.stop(now + duration)
          harmonicOsc.stop(now + duration)
          vibratoOsc.stop(now + duration)
        } else {
          oscillator.stop(now + 1.5)
          harmonicOsc.stop(now + 1.5)
          vibratoOsc.stop(now + 1.5)
        }

        // Add to active sources for cleanup
        activeSourcesRef.current.push(oscillator, harmonicOsc, vibratoOsc)

        return oscillator
      }

      default:
        return null
    }
  }

  // Update sounds when time or settings change
  useEffect(() => {
    if (!audioContextRef.current) return

    const ctx = audioContextRef.current
    const masterGain = masterGainRef.current
    const reverb = reverbRef.current

    if (!ctx || !masterGain || !reverb) return

    // Clear any existing second scheduler
    if (secondSchedulerRef.current !== null) {
      clearInterval(secondSchedulerRef.current)
      secondSchedulerRef.current = null
    }

    // Handle reference tone (C4 ambient pad with reverb)
    if (soundToggles.reference) {
      // Only create a new reference tone if one isn't already playing
      if (!referenceSourceRef.current) {
        referenceSourceRef.current = playNote(
          "ambient",
          "C4",
          soundVolumes.reference * masterVolume * 1.2, // Increased volume multiplier
          reverb,
        )
      }
    } else {
      // Stop the reference tone if it exists and the toggle is off
      if (referenceSourceRef.current) {
        try {
          referenceSourceRef.current.stop()
        } catch (e) {
          // Ignore errors from already stopped sources
        }
        referenceSourceRef.current = null
      }
    }

    // Handle hour tone (ambient pad with reverb)
    if (soundToggles.hour) {
      const hourNote = getHourNote(hours)

      // Only create a new hour tone if the hour has changed or one isn't already playing
      if (lastPlayedHourRef.current !== hours || !hourSourceRef.current) {
        // Stop the previous hour tone if it exists
        if (hourSourceRef.current) {
          try {
            hourSourceRef.current.stop()
          } catch (e) {
            // Ignore errors from already stopped sources
          }
        }

        // Create a new hour tone
        hourSourceRef.current = playNote(
          "ambient",
          hourNote,
          soundVolumes.hour * masterVolume * 1.2, // Increased volume multiplier
          reverb,
        )

        // Update the last played hour
        lastPlayedHourRef.current = hours
      }
    } else {
      // Stop the hour tone if it exists and the toggle is off
      if (hourSourceRef.current) {
        try {
          hourSourceRef.current.stop()
        } catch (e) {
          // Ignore errors from already stopped sources
        }
        hourSourceRef.current = null
        lastPlayedHourRef.current = null
      }
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
        playNote("harp", minuteTensNote, soundVolumes.minute * masterVolume, masterGain, 0, 1)
      } else if (!playTens && minuteOnes > 0) {
        const minuteOnesNote = getMinuteOnesNote(minuteOnes)
        playNote("harp", minuteOnesNote, soundVolumes.minute * masterVolume, masterGain, 0, 1)
      }
    }

    // Schedule second tones (vibraphone)
    if (soundToggles.second) {
      scheduleSecondTones(
        ctx,
        seconds,
        milliseconds,
        masterGain,
        soundToggles.second,
        soundVolumes.second * masterVolume,
      )
    }
  }, [hours, minutes, seconds, masterVolume, soundToggles, soundVolumes])

  // Schedule second tones to alternate quickly
  const scheduleSecondTones = (
    ctx: AudioContext,
    currentSecond: number,
    milliseconds: number,
    destination: AudioNode,
    enabled: boolean,
    volume: number,
  ) => {
    if (!enabled) return

    // Extract tens and ones digits from seconds
    const secondTens = Math.floor(currentSecond / 10)
    const secondOnes = currentSecond % 10

    // Extract the current millisecond position in the second
    const msInSecond = milliseconds

    // Calculate which quarter of the second we're in (0-3)
    const quarterSecond = Math.floor(msInSecond / 250)

    // Calculate time until next quarter second
    const timeToNextQuarter = (250 - (msInSecond % 250)) / 1000

    // Schedule the first tone immediately
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
      if (!ctx || ctx.state === "closed") {
        if (secondSchedulerRef.current !== null) {
          clearInterval(secondSchedulerRef.current)
        }
        return
      }

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
      "C4", // 12 o'clock
      "C4", // 1 o'clock
      "D4", // 2 o'clock
      "E4", // 3 o'clock
      "F4", // 4 o'clock
      "G4", // 5 o'clock
      "A4", // 6 o'clock
      "B4", // 7 o'clock
      "C5", // 8 o'clock
      "D5", // 9 o'clock
      "E5", // 10 o'clock
      "F5", // 11 o'clock
      "G5", // 12 o'clock
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
