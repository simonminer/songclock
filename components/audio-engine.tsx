"use client"

import { useEffect, useRef, useState } from "react"
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

  // Refs for audio nodes
  const localMasterGainRef = useRef<GainNode | null>(null)
  const isInitializedRef = useRef<boolean>(false)

  // Refs for continuous drones (reference and hour)
  const referenceOscillatorRef = useRef<OscillatorNode | null>(null)
  const referenceGainRef = useRef<GainNode | null>(null)
  const hourOscillatorRef = useRef<OscillatorNode | null>(null)
  const hourGainRef = useRef<GainNode | null>(null)

  // Refs for minute tones
  const minuteTensOscillatorRef = useRef<OscillatorNode | null>(null)
  const minuteTensGainRef = useRef<GainNode | null>(null)
  const minuteOnesOscillatorRef = useRef<OscillatorNode | null>(null)
  const minuteOnesGainRef = useRef<GainNode | null>(null)

  // Refs for second tones
  const secondTensOscillatorRef = useRef<OscillatorNode | null>(null)
  const secondTensGainRef = useRef<GainNode | null>(null)
  const secondOnesOscillatorRef = useRef<OscillatorNode | null>(null)
  const secondOnesGainRef = useRef<GainNode | null>(null)

  // Ref for last hour value to detect changes
  const lastHourRef = useRef<number | null>(null)

  // State to track quarter-second for second tones
  const [quarterSecond, setQuarterSecond] = useState(0)

  // Interval ref for quarter-second updates
  const quarterSecondIntervalRef = useRef<number | null>(null)

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

      // Create all oscillators and gain nodes once

      // 1. Reference tone (C3)
      const referenceOsc = audioContext.createOscillator()
      referenceOsc.type = "sine"
      referenceOsc.frequency.value = NOTE_FREQUENCIES["C3"]

      const referenceGain = audioContext.createGain()
      referenceGain.gain.value = 0 // Start silent

      referenceOsc.connect(referenceGain)
      referenceGain.connect(localMasterGain)
      referenceOsc.start()

      referenceOscillatorRef.current = referenceOsc
      referenceGainRef.current = referenceGain

      // 2. Hour tone (varies based on hour)
      const hourOsc = audioContext.createOscillator()
      hourOsc.type = "sine"
      hourOsc.frequency.value = NOTE_FREQUENCIES["C3"] // Will be updated based on hour

      const hourGain = audioContext.createGain()
      hourGain.gain.value = 0 // Start silent

      hourOsc.connect(hourGain)
      hourGain.connect(localMasterGain)
      hourOsc.start()

      hourOscillatorRef.current = hourOsc
      hourGainRef.current = hourGain

      // 3. Minute tens oscillator
      const minuteTensOsc = audioContext.createOscillator()
      minuteTensOsc.type = "triangle" // More harp-like
      minuteTensOsc.frequency.value = NOTE_FREQUENCIES["C4"] // Will be updated

      const minuteTensGain = audioContext.createGain()
      minuteTensGain.gain.value = 0 // Start silent

      minuteTensOsc.connect(minuteTensGain)
      minuteTensGain.connect(localMasterGain)
      minuteTensOsc.start()

      minuteTensOscillatorRef.current = minuteTensOsc
      minuteTensGainRef.current = minuteTensGain

      // 4. Minute ones oscillator
      const minuteOnesOsc = audioContext.createOscillator()
      minuteOnesOsc.type = "triangle" // More harp-like
      minuteOnesOsc.frequency.value = NOTE_FREQUENCIES["C4"] // Will be updated

      const minuteOnesGain = audioContext.createGain()
      minuteOnesGain.gain.value = 0 // Start silent

      minuteOnesOsc.connect(minuteOnesGain)
      minuteOnesGain.connect(localMasterGain)
      minuteOnesOsc.start()

      minuteOnesOscillatorRef.current = minuteOnesOsc
      minuteOnesGainRef.current = minuteOnesGain

      // 5. Second tens oscillator
      const secondTensOsc = audioContext.createOscillator()
      secondTensOsc.type = "sine" // More vibraphone-like
      secondTensOsc.frequency.value = NOTE_FREQUENCIES["C5"] // Will be updated

      const secondTensGain = audioContext.createGain()
      secondTensGain.gain.value = 0 // Start silent

      secondTensOsc.connect(secondTensGain)
      secondTensGain.connect(localMasterGain)
      secondTensOsc.start()

      secondTensOscillatorRef.current = secondTensOsc
      secondTensGainRef.current = secondTensGain

      // 6. Second ones oscillator
      const secondOnesOsc = audioContext.createOscillator()
      secondOnesOsc.type = "sine" // More vibraphone-like
      secondOnesOsc.frequency.value = NOTE_FREQUENCIES["C5"] // Will be updated

      const secondOnesGain = audioContext.createGain()
      secondOnesGain.gain.value = 0 // Start silent

      secondOnesOsc.connect(secondOnesGain)
      secondOnesGain.connect(localMasterGain)
      secondOnesOsc.start()

      secondOnesOscillatorRef.current = secondOnesOsc
      secondOnesGainRef.current = secondOnesGain

      isInitializedRef.current = true
      console.log("Audio engine initialized with persistent oscillators")

      // Start quarter-second interval for second tones
      quarterSecondIntervalRef.current = window.setInterval(() => {
        setQuarterSecond((prev) => (prev + 1) % 4)
      }, 250) as unknown as number
    } catch (error) {
      console.error("Error initializing audio engine:", error)
    }

    // Clean up function
    return () => {
      // Clear quarter-second interval
      if (quarterSecondIntervalRef.current) {
        clearInterval(quarterSecondIntervalRef.current)
        quarterSecondIntervalRef.current = null
      }

      // Stop all oscillators
      if (referenceOscillatorRef.current) {
        try {
          referenceOscillatorRef.current.stop()
          referenceOscillatorRef.current.disconnect()
        } catch (e) {
          console.error("Error stopping reference oscillator:", e)
        }
      }

      if (hourOscillatorRef.current) {
        try {
          hourOscillatorRef.current.stop()
          hourOscillatorRef.current.disconnect()
        } catch (e) {
          console.error("Error stopping hour oscillator:", e)
        }
      }

      if (minuteTensOscillatorRef.current) {
        try {
          minuteTensOscillatorRef.current.stop()
          minuteTensOscillatorRef.current.disconnect()
        } catch (e) {
          console.error("Error stopping minute tens oscillator:", e)
        }
      }

      if (minuteOnesOscillatorRef.current) {
        try {
          minuteOnesOscillatorRef.current.stop()
          minuteOnesOscillatorRef.current.disconnect()
        } catch (e) {
          console.error("Error stopping minute ones oscillator:", e)
        }
      }

      if (secondTensOscillatorRef.current) {
        try {
          secondTensOscillatorRef.current.stop()
          secondTensOscillatorRef.current.disconnect()
        } catch (e) {
          console.error("Error stopping second tens oscillator:", e)
        }
      }

      if (secondOnesOscillatorRef.current) {
        try {
          secondOnesOscillatorRef.current.stop()
          secondOnesOscillatorRef.current.disconnect()
        } catch (e) {
          console.error("Error stopping second ones oscillator:", e)
        }
      }

      // Disconnect gain nodes
      if (referenceGainRef.current) referenceGainRef.current.disconnect()
      if (hourGainRef.current) hourGainRef.current.disconnect()
      if (minuteTensGainRef.current) minuteTensGainRef.current.disconnect()
      if (minuteOnesGainRef.current) minuteOnesGainRef.current.disconnect()
      if (secondTensGainRef.current) secondTensGainRef.current.disconnect()
      if (secondOnesGainRef.current) secondOnesGainRef.current.disconnect()

      // Disconnect local master gain
      if (localMasterGainRef.current) {
        try {
          localMasterGainRef.current.disconnect()
        } catch (e) {
          console.error("Error disconnecting local master gain:", e)
        }
      }

      isInitializedRef.current = false
    }
  }, [audioContext, masterGain, masterVolume, ensureAudioContextRunning])

  // Update master volume when it changes
  useEffect(() => {
    if (localMasterGainRef.current && audioContext) {
      const now = audioContext.currentTime
      localMasterGainRef.current.gain.setValueAtTime(localMasterGainRef.current.gain.value, now)
      localMasterGainRef.current.gain.linearRampToValueAtTime(masterVolume, now + 0.1)
    }
  }, [audioContext, masterVolume])

  // Handle reference tone
  useEffect(() => {
    if (!audioContext || !referenceGainRef.current || !isInitializedRef.current) return

    // Ensure audio context is running
    ensureAudioContextRunning()

    const now = audioContext.currentTime
    const targetVolume = soundToggles.reference ? soundVolumes.reference * masterVolume : 0

    // Use a longer fade time to prevent clicks
    referenceGainRef.current.gain.cancelScheduledValues(now)
    referenceGainRef.current.gain.setValueAtTime(referenceGainRef.current.gain.value, now)
    referenceGainRef.current.gain.linearRampToValueAtTime(targetVolume, now + 0.2)
  }, [audioContext, soundToggles.reference, soundVolumes.reference, masterVolume, ensureAudioContextRunning])

  // Handle hour tone
  useEffect(() => {
    if (!audioContext || !hourOscillatorRef.current || !hourGainRef.current || !isInitializedRef.current) return

    // Ensure audio context is running
    ensureAudioContextRunning()

    const now = audioContext.currentTime

    // Get the note for the current hour
    const hourNote = getHourNote(hours)
    const frequency = NOTE_FREQUENCIES[hourNote]

    // Update frequency if hour changed
    if (lastHourRef.current !== hours) {
      hourOscillatorRef.current.frequency.cancelScheduledValues(now)
      hourOscillatorRef.current.frequency.setValueAtTime(hourOscillatorRef.current.frequency.value, now)
      hourOscillatorRef.current.frequency.linearRampToValueAtTime(frequency, now + 0.2)
      lastHourRef.current = hours
    }

    const targetVolume = soundToggles.hour ? soundVolumes.hour * masterVolume : 0

    // Use a longer fade time to prevent clicks
    hourGainRef.current.gain.cancelScheduledValues(now)
    hourGainRef.current.gain.setValueAtTime(hourGainRef.current.gain.value, now)
    hourGainRef.current.gain.linearRampToValueAtTime(targetVolume, now + 0.2)
  }, [audioContext, hours, soundToggles.hour, soundVolumes.hour, masterVolume, ensureAudioContextRunning])

  // Handle minute tones
  useEffect(() => {
    if (!audioContext || !minuteTensGainRef.current || !minuteOnesGainRef.current || !isInitializedRef.current) return
    if (!minuteTensOscillatorRef.current || !minuteOnesOscillatorRef.current) return

    // Ensure audio context is running
    ensureAudioContextRunning()

    const now = audioContext.currentTime

    // Extract tens and ones digits from minutes
    const minuteTens = Math.floor(minutes / 10)
    const minuteOnes = minutes % 10

    // Update frequencies for minute oscillators
    const minuteTensNote = getMinuteTensNote(minuteTens)
    const minuteOnesNote = getMinuteOnesNote(minuteOnes)

    minuteTensOscillatorRef.current.frequency.setValueAtTime(minuteTensOscillatorRef.current.frequency.value, now)
    minuteTensOscillatorRef.current.frequency.linearRampToValueAtTime(NOTE_FREQUENCIES[minuteTensNote], now + 0.05)

    minuteOnesOscillatorRef.current.frequency.setValueAtTime(minuteOnesOscillatorRef.current.frequency.value, now)
    minuteOnesOscillatorRef.current.frequency.linearRampToValueAtTime(NOTE_FREQUENCIES[minuteOnesNote], now + 0.05)

    if (soundToggles.minute) {
      // Determine which digit to play based on the second (even/odd)
      const playTens = seconds % 2 === 0

      if (playTens && minuteTens > 0) {
        // Play tens digit with smoother envelope
        minuteTensGainRef.current.gain.cancelScheduledValues(now)
        minuteTensGainRef.current.gain.setValueAtTime(0, now)
        // Attack - slower attack to prevent clicks
        minuteTensGainRef.current.gain.linearRampToValueAtTime(soundVolumes.minute * masterVolume, now + 0.05)
        // Decay and sustain
        minuteTensGainRef.current.gain.linearRampToValueAtTime(soundVolumes.minute * masterVolume * 0.8, now + 0.15)
        // Release - longer release to prevent clicks
        minuteTensGainRef.current.gain.linearRampToValueAtTime(0, now + 0.8)

        // Ensure ones is silent
        minuteOnesGainRef.current.gain.cancelScheduledValues(now)
        minuteOnesGainRef.current.gain.setValueAtTime(minuteOnesGainRef.current.gain.value, now)
        minuteOnesGainRef.current.gain.linearRampToValueAtTime(0, now + 0.05)
      } else if (!playTens && minuteOnes > 0) {
        // Play ones digit with smoother envelope
        minuteOnesGainRef.current.gain.cancelScheduledValues(now)
        minuteOnesGainRef.current.gain.setValueAtTime(0, now)
        // Attack - slower attack to prevent clicks
        minuteOnesGainRef.current.gain.linearRampToValueAtTime(soundVolumes.minute * masterVolume, now + 0.05)
        // Decay and sustain
        minuteOnesGainRef.current.gain.linearRampToValueAtTime(soundVolumes.minute * masterVolume * 0.8, now + 0.15)
        // Release - longer release to prevent clicks
        minuteOnesGainRef.current.gain.linearRampToValueAtTime(0, now + 0.8)

        // Ensure tens is silent
        minuteTensGainRef.current.gain.cancelScheduledValues(now)
        minuteTensGainRef.current.gain.setValueAtTime(minuteTensGainRef.current.gain.value, now)
        minuteTensGainRef.current.gain.linearRampToValueAtTime(0, now + 0.05)
      } else {
        // Neither digit should play
        minuteTensGainRef.current.gain.cancelScheduledValues(now)
        minuteTensGainRef.current.gain.setValueAtTime(minuteTensGainRef.current.gain.value, now)
        minuteTensGainRef.current.gain.linearRampToValueAtTime(0, now + 0.05)

        minuteOnesGainRef.current.gain.cancelScheduledValues(now)
        minuteOnesGainRef.current.gain.setValueAtTime(minuteOnesGainRef.current.gain.value, now)
        minuteOnesGainRef.current.gain.linearRampToValueAtTime(0, now + 0.05)
      }
    } else {
      // Minute sounds disabled, ensure both are silent
      minuteTensGainRef.current.gain.cancelScheduledValues(now)
      minuteTensGainRef.current.gain.setValueAtTime(minuteTensGainRef.current.gain.value, now)
      minuteTensGainRef.current.gain.linearRampToValueAtTime(0, now + 0.05)

      minuteOnesGainRef.current.gain.cancelScheduledValues(now)
      minuteOnesGainRef.current.gain.setValueAtTime(minuteOnesGainRef.current.gain.value, now)
      minuteOnesGainRef.current.gain.linearRampToValueAtTime(0, now + 0.05)
    }
  }, [
    audioContext,
    minutes,
    seconds,
    soundToggles.minute,
    soundVolumes.minute,
    masterVolume,
    ensureAudioContextRunning,
  ])

  // Handle second tones using the quarter-second state
  useEffect(() => {
    if (!audioContext || !secondTensGainRef.current || !secondOnesGainRef.current || !isInitializedRef.current) return
    if (!secondTensOscillatorRef.current || !secondOnesOscillatorRef.current) return
    if (!soundToggles.second) return

    // Ensure audio context is running
    ensureAudioContextRunning()

    const now = audioContext.currentTime

    // Extract tens and ones digits from seconds
    const secondTens = Math.floor(seconds / 10)
    const secondOnes = seconds % 10

    // Update frequencies for second oscillators
    const secondTensNote = getSecondTensNote(secondTens)
    const secondOnesNote = getSecondOnesNote(secondOnes)

    secondTensOscillatorRef.current.frequency.setValueAtTime(secondTensOscillatorRef.current.frequency.value, now)
    secondTensOscillatorRef.current.frequency.linearRampToValueAtTime(NOTE_FREQUENCIES[secondTensNote], now + 0.02)

    secondOnesOscillatorRef.current.frequency.setValueAtTime(secondOnesOscillatorRef.current.frequency.value, now)
    secondOnesOscillatorRef.current.frequency.linearRampToValueAtTime(NOTE_FREQUENCIES[secondOnesNote], now + 0.02)

    // Determine which digit to play based on the quarter second
    const playTens = quarterSecond === 0 || quarterSecond === 2

    if (playTens && secondTens > 0) {
      // Play tens digit with smoother envelope
      secondTensGainRef.current.gain.cancelScheduledValues(now)
      secondTensGainRef.current.gain.setValueAtTime(0, now)
      // Very quick attack but not instant (prevents clicks)
      secondTensGainRef.current.gain.linearRampToValueAtTime(soundVolumes.second * masterVolume, now + 0.01)
      // Short decay
      secondTensGainRef.current.gain.linearRampToValueAtTime(0, now + 0.15)

      // Ensure ones is silent with a smooth transition
      secondOnesGainRef.current.gain.cancelScheduledValues(now)
      secondOnesGainRef.current.gain.setValueAtTime(secondOnesGainRef.current.gain.value, now)
      secondOnesGainRef.current.gain.linearRampToValueAtTime(0, now + 0.02)
    } else if (!playTens && secondOnes > 0) {
      // Play ones digit with smoother envelope
      secondOnesGainRef.current.gain.cancelScheduledValues(now)
      secondOnesGainRef.current.gain.setValueAtTime(0, now)
      // Very quick attack but not instant (prevents clicks)
      secondOnesGainRef.current.gain.linearRampToValueAtTime(soundVolumes.second * masterVolume, now + 0.01)
      // Short decay
      secondOnesGainRef.current.gain.linearRampToValueAtTime(0, now + 0.15)

      // Ensure tens is silent with a smooth transition
      secondTensGainRef.current.gain.cancelScheduledValues(now)
      secondTensGainRef.current.gain.setValueAtTime(secondTensGainRef.current.gain.value, now)
      secondTensGainRef.current.gain.linearRampToValueAtTime(0, now + 0.02)
    } else {
      // Neither digit should play - ensure smooth fade out
      secondTensGainRef.current.gain.cancelScheduledValues(now)
      secondTensGainRef.current.gain.setValueAtTime(secondTensGainRef.current.gain.value, now)
      secondTensGainRef.current.gain.linearRampToValueAtTime(0, now + 0.02)

      secondOnesGainRef.current.gain.cancelScheduledValues(now)
      secondOnesGainRef.current.gain.setValueAtTime(secondOnesGainRef.current.gain.value, now)
      secondOnesGainRef.current.gain.linearRampToValueAtTime(0, now + 0.02)
    }
  }, [
    audioContext,
    seconds,
    quarterSecond,
    soundToggles.second,
    soundVolumes.second,
    masterVolume,
    ensureAudioContextRunning,
  ])

  // Handle seconds toggle changes
  useEffect(() => {
    if (!audioContext || !secondTensGainRef.current || !secondOnesGainRef.current) return

    const now = audioContext.currentTime

    if (!soundToggles.second) {
      // If seconds are toggled off, silence both oscillators with a smooth transition
      secondTensGainRef.current.gain.cancelScheduledValues(now)
      secondTensGainRef.current.gain.setValueAtTime(secondTensGainRef.current.gain.value, now)
      secondTensGainRef.current.gain.linearRampToValueAtTime(0, now + 0.05)

      secondOnesGainRef.current.gain.cancelScheduledValues(now)
      secondOnesGainRef.current.gain.setValueAtTime(secondOnesGainRef.current.gain.value, now)
      secondOnesGainRef.current.gain.linearRampToValueAtTime(0, now + 0.05)
    }
  }, [audioContext, soundToggles.second])

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
