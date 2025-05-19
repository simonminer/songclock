"use client"

import { useEffect, useRef, useState } from "react"
import { useAudioContext } from "./audio-context-provider"
import { getNoteFrequency, getTimeNote } from "@/utils/audio-utils"

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

// Type for a complete oscillator setup (oscillator + gain node)
interface OscillatorSetup {
  oscillator: OscillatorNode | null
  gain: GainNode | null
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
  const referenceOscillatorSetup = useRef<OscillatorSetup>({ oscillator: null, gain: null })
  const hourOscillatorSetup = useRef<OscillatorSetup>({ oscillator: null, gain: null })

  // Refs for minute tones
  const minuteTensOscillatorSetup = useRef<OscillatorSetup>({ oscillator: null, gain: null })
  const minuteOnesOscillatorSetup = useRef<OscillatorSetup>({ oscillator: null, gain: null })

  // Refs for second tones
  const secondTensOscillatorSetup = useRef<OscillatorSetup>({ oscillator: null, gain: null })
  const secondOnesOscillatorSetup = useRef<OscillatorSetup>({ oscillator: null, gain: null })

  // Ref for last hour value to detect changes
  const lastHourRef = useRef<number | null>(null)

  // State to track quarter-second for second tones
  const [quarterSecond, setQuarterSecond] = useState(0)

  // Interval ref for quarter-second updates
  const quarterSecondIntervalRef = useRef<number | null>(null)

  // Extract tens and ones digits for minutes and seconds
  const minuteTens = Math.floor(minutes / 10)
  const minuteOnes = minutes % 10
  const secondTens = Math.floor(seconds / 10)
  const secondOnes = seconds % 10

  // Helper function to create and connect an oscillator
  const createOscillator = (
    ctx: AudioContext,
    type: OscillatorType,
    frequency: number,
    destination: AudioNode,
  ): OscillatorNode => {
    const oscillator = ctx.createOscillator()
    oscillator.type = type
    oscillator.frequency.value = frequency
    oscillator.connect(destination)
    oscillator.start()
    return oscillator
  }

  // Helper function to create a gain node
  const createGain = (ctx: AudioContext, initialValue: number, destination: AudioNode): GainNode => {
    const gain = ctx.createGain()
    gain.gain.value = initialValue
    gain.connect(destination)
    return gain
  }

  // Helper function to dispose of an oscillator setup
  const disposeOscillatorSetup = (setup: OscillatorSetup) => {
    if (setup.oscillator) {
      try {
        setup.oscillator.stop()
        setup.oscillator.disconnect()
      } catch (e) {
        console.error("Error stopping oscillator:", e)
      }
    }

    if (setup.gain) {
      try {
        setup.gain.disconnect()
      } catch (e) {
        console.error("Error disconnecting gain:", e)
      }
    }
  }

  // Helper function to update oscillator frequency
  const updateOscillatorFrequency = (
    oscillator: OscillatorNode | null,
    frequency: number,
    time: number,
    duration = 0.2,
  ) => {
    if (!oscillator) return

    oscillator.frequency.cancelScheduledValues(time)
    oscillator.frequency.setValueAtTime(oscillator.frequency.value, time)
    oscillator.frequency.linearRampToValueAtTime(frequency, time + duration)
  }

  // Helper function to update gain with envelope
  const updateGainWithEnvelope = (
    gain: GainNode | null,
    targetVolume: number,
    time: number,
    attack = 0.05,
    release = 0.2,
  ) => {
    if (!gain) return

    gain.gain.cancelScheduledValues(time)
    gain.gain.setValueAtTime(gain.gain.value, time)
    gain.gain.linearRampToValueAtTime(targetVolume, time + attack)
  }

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
      const referenceGain = createGain(audioContext, 0, localMasterGain)
      const referenceOsc = createOscillator(audioContext, "sine", getNoteFrequency("C3"), referenceGain)
      referenceOscillatorSetup.current = { oscillator: referenceOsc, gain: referenceGain }

      // 2. Hour tone (varies based on hour)
      const hourGain = createGain(audioContext, 0, localMasterGain)
      const hourOsc = createOscillator(audioContext, "sine", getNoteFrequency("C3"), hourGain)
      hourOscillatorSetup.current = { oscillator: hourOsc, gain: hourGain }

      // 3. Minute tens oscillator
      const minuteTensGain = createGain(audioContext, 0, localMasterGain)
      const minuteTensOsc = createOscillator(audioContext, "triangle", getNoteFrequency("C4"), minuteTensGain)
      minuteTensOscillatorSetup.current = { oscillator: minuteTensOsc, gain: minuteTensGain }

      // 4. Minute ones oscillator
      const minuteOnesGain = createGain(audioContext, 0, localMasterGain)
      const minuteOnesOsc = createOscillator(audioContext, "triangle", getNoteFrequency("C4"), minuteOnesGain)
      minuteOnesOscillatorSetup.current = { oscillator: minuteOnesOsc, gain: minuteOnesGain }

      // 5. Second tens oscillator
      const secondTensGain = createGain(audioContext, 0, localMasterGain)
      const secondTensOsc = createOscillator(audioContext, "sine", getNoteFrequency("C5"), secondTensGain)
      secondTensOscillatorSetup.current = { oscillator: secondTensOsc, gain: secondTensGain }

      // 6. Second ones oscillator
      const secondOnesGain = createGain(audioContext, 0, localMasterGain)
      const secondOnesOsc = createOscillator(audioContext, "sine", getNoteFrequency("C5"), secondOnesGain)
      secondOnesOscillatorSetup.current = { oscillator: secondOnesOsc, gain: secondOnesGain }

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

      // Stop all oscillators and disconnect gain nodes
      disposeOscillatorSetup(referenceOscillatorSetup.current)
      disposeOscillatorSetup(hourOscillatorSetup.current)
      disposeOscillatorSetup(minuteTensOscillatorSetup.current)
      disposeOscillatorSetup(minuteOnesOscillatorSetup.current)
      disposeOscillatorSetup(secondTensOscillatorSetup.current)
      disposeOscillatorSetup(secondOnesOscillatorSetup.current)

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
    if (!audioContext || !referenceOscillatorSetup.current.gain || !isInitializedRef.current) return

    // Ensure audio context is running
    ensureAudioContextRunning()

    const now = audioContext.currentTime
    const targetVolume = soundToggles.reference ? soundVolumes.reference * masterVolume : 0

    // Use a longer fade time to prevent clicks
    updateGainWithEnvelope(referenceOscillatorSetup.current.gain, targetVolume, now, 0.2, 0.2)
  }, [audioContext, soundToggles.reference, soundVolumes.reference, masterVolume, ensureAudioContextRunning])

  // Handle hour tone
  useEffect(() => {
    if (
      !audioContext ||
      !hourOscillatorSetup.current.oscillator ||
      !hourOscillatorSetup.current.gain ||
      !isInitializedRef.current
    )
      return

    // Ensure audio context is running
    ensureAudioContextRunning()

    const now = audioContext.currentTime

    // Get the note for the current hour
    const hourNote = getTimeNote("hour", hours)
    const frequency = getNoteFrequency(hourNote)

    // Update frequency if hour changed
    if (lastHourRef.current !== hours) {
      updateOscillatorFrequency(hourOscillatorSetup.current.oscillator, frequency, now)
      lastHourRef.current = hours
    }

    const targetVolume = soundToggles.hour ? soundVolumes.hour * masterVolume : 0

    // Use a longer fade time to prevent clicks
    updateGainWithEnvelope(hourOscillatorSetup.current.gain, targetVolume, now, 0.2, 0.2)
  }, [audioContext, hours, soundToggles.hour, soundVolumes.hour, masterVolume, ensureAudioContextRunning])

  // Handle minute tones
  useEffect(() => {
    if (
      !audioContext ||
      !minuteTensOscillatorSetup.current.gain ||
      !minuteOnesOscillatorSetup.current.gain ||
      !isInitializedRef.current
    )
      return
    if (!minuteTensOscillatorSetup.current.oscillator || !minuteOnesOscillatorSetup.current.oscillator) return

    // Ensure audio context is running
    ensureAudioContextRunning()

    const now = audioContext.currentTime

    // Update frequencies for minute oscillators
    const minuteTensNote = getTimeNote("minuteTens", minuteTens)
    const minuteOnesNote = getTimeNote("minuteOnes", minuteOnes)

    updateOscillatorFrequency(minuteTensOscillatorSetup.current.oscillator, getNoteFrequency(minuteTensNote), now, 0.05)
    updateOscillatorFrequency(minuteOnesOscillatorSetup.current.oscillator, getNoteFrequency(minuteOnesNote), now, 0.05)

    if (soundToggles.minute) {
      // Determine which digit to play based on the second (even/odd)
      const playTens = seconds % 2 === 0

      if (playTens && minuteTens > 0) {
        // Play tens digit with smoother envelope
        minuteTensOscillatorSetup.current.gain.gain.cancelScheduledValues(now)
        minuteTensOscillatorSetup.current.gain.gain.setValueAtTime(0, now)
        // Attack - slower attack to prevent clicks
        minuteTensOscillatorSetup.current.gain.gain.linearRampToValueAtTime(
          soundVolumes.minute * masterVolume,
          now + 0.05,
        )
        // Decay and sustain
        minuteTensOscillatorSetup.current.gain.gain.linearRampToValueAtTime(
          soundVolumes.minute * masterVolume * 0.8,
          now + 0.15,
        )
        // Release - longer release to prevent clicks
        minuteTensOscillatorSetup.current.gain.gain.linearRampToValueAtTime(0, now + 0.8)

        // Ensure ones is silent
        updateGainWithEnvelope(minuteOnesOscillatorSetup.current.gain, 0, now, 0.05)
      } else if (!playTens && minuteOnes > 0) {
        // Play ones digit with smoother envelope
        minuteOnesOscillatorSetup.current.gain.gain.cancelScheduledValues(now)
        minuteOnesOscillatorSetup.current.gain.gain.setValueAtTime(0, now)
        // Attack - slower attack to prevent clicks
        minuteOnesOscillatorSetup.current.gain.gain.linearRampToValueAtTime(
          soundVolumes.minute * masterVolume,
          now + 0.05,
        )
        // Decay and sustain
        minuteOnesOscillatorSetup.current.gain.gain.linearRampToValueAtTime(
          soundVolumes.minute * masterVolume * 0.8,
          now + 0.15,
        )
        // Release - longer release to prevent clicks
        minuteOnesOscillatorSetup.current.gain.gain.linearRampToValueAtTime(0, now + 0.8)

        // Ensure tens is silent
        updateGainWithEnvelope(minuteTensOscillatorSetup.current.gain, 0, now, 0.05)
      } else {
        // Neither digit should play
        updateGainWithEnvelope(minuteTensOscillatorSetup.current.gain, 0, now, 0.05)
        updateGainWithEnvelope(minuteOnesOscillatorSetup.current.gain, 0, now, 0.05)
      }
    } else {
      // Minute sounds disabled, ensure both are silent
      updateGainWithEnvelope(minuteTensOscillatorSetup.current.gain, 0, now, 0.05)
      updateGainWithEnvelope(minuteOnesOscillatorSetup.current.gain, 0, now, 0.05)
    }
  }, [
    audioContext,
    minutes,
    seconds,
    soundToggles.minute,
    soundVolumes.minute,
    masterVolume,
    ensureAudioContextRunning,
    minuteTens,
    minuteOnes,
  ])

  // Handle second tones using the quarter-second state
  useEffect(() => {
    if (
      !audioContext ||
      !secondTensOscillatorSetup.current.gain ||
      !secondOnesOscillatorSetup.current.gain ||
      !isInitializedRef.current
    )
      return
    if (!secondTensOscillatorSetup.current.oscillator || !secondOnesOscillatorSetup.current.oscillator) return
    if (!soundToggles.second) return

    // Ensure audio context is running
    ensureAudioContextRunning()

    const now = audioContext.currentTime

    // Update frequencies for second oscillators
    const secondTensNote = getTimeNote("secondTens", secondTens)
    const secondOnesNote = getTimeNote("secondOnes", secondOnes)

    updateOscillatorFrequency(secondTensOscillatorSetup.current.oscillator, getNoteFrequency(secondTensNote), now, 0.02)
    updateOscillatorFrequency(secondOnesOscillatorSetup.current.oscillator, getNoteFrequency(secondOnesNote), now, 0.02)

    // Determine which digit to play based on the quarter second
    const playTens = quarterSecond === 0 || quarterSecond === 2

    if (playTens && secondTens > 0) {
      // Play tens digit with smoother envelope
      secondTensOscillatorSetup.current.gain.gain.cancelScheduledValues(now)
      secondTensOscillatorSetup.current.gain.gain.setValueAtTime(0, now)
      // Very quick attack but not instant (prevents clicks)
      secondTensOscillatorSetup.current.gain.gain.linearRampToValueAtTime(
        soundVolumes.second * masterVolume,
        now + 0.01,
      )
      // Short decay
      secondTensOscillatorSetup.current.gain.gain.linearRampToValueAtTime(0, now + 0.15)

      // Ensure ones is silent with a smooth transition
      updateGainWithEnvelope(secondOnesOscillatorSetup.current.gain, 0, now, 0.02)
    } else if (!playTens && secondOnes > 0) {
      // Play ones digit with smoother envelope
      secondOnesOscillatorSetup.current.gain.gain.cancelScheduledValues(now)
      secondOnesOscillatorSetup.current.gain.gain.setValueAtTime(0, now)
      // Very quick attack but not instant (prevents clicks)
      secondOnesOscillatorSetup.current.gain.gain.linearRampToValueAtTime(
        soundVolumes.second * masterVolume,
        now + 0.01,
      )
      // Short decay
      secondOnesOscillatorSetup.current.gain.gain.linearRampToValueAtTime(0, now + 0.15)

      // Ensure tens is silent with a smooth transition
      updateGainWithEnvelope(secondTensOscillatorSetup.current.gain, 0, now, 0.02)
    } else {
      // Neither digit should play - ensure smooth fade out
      updateGainWithEnvelope(secondTensOscillatorSetup.current.gain, 0, now, 0.02)
      updateGainWithEnvelope(secondOnesOscillatorSetup.current.gain, 0, now, 0.02)
    }
  }, [
    audioContext,
    seconds,
    quarterSecond,
    soundToggles.second,
    soundVolumes.second,
    masterVolume,
    ensureAudioContextRunning,
    secondTens,
    secondOnes,
  ])

  // Handle seconds toggle changes
  useEffect(() => {
    if (!audioContext || !secondTensOscillatorSetup.current.gain || !secondOnesOscillatorSetup.current.gain) return

    const now = audioContext.currentTime

    if (!soundToggles.second) {
      // If seconds are toggled off, silence both oscillators with a smooth transition
      updateGainWithEnvelope(secondTensOscillatorSetup.current.gain, 0, now, 0.05)
      updateGainWithEnvelope(secondOnesOscillatorSetup.current.gain, 0, now, 0.05)
    }
  }, [audioContext, soundToggles.second])

  // This component doesn't render anything visible
  return null
}
