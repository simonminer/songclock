/**
 * Audio utility functions for Song Clock
 */

// Define note frequencies for every note used in the app
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

/**
 * Get frequency in Hz for a note name
 * @param noteName - Standard note name with octave (e.g., "C4")
 * @returns Frequency in Hz
 */
export const getNoteFrequency = (noteName: string): number => {
  return NOTE_FREQUENCIES[noteName] || 440 // Default to A4 if not found
}

// Mapping tables for different time components to notes
const HOUR_NOTES = [
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

const MINUTE_TENS_NOTES = ["C4", "C4", "D4", "E4", "F4", "G4"]
const MINUTE_ONES_NOTES = ["C4", "C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5"]

const SECOND_TENS_NOTES = ["C5", "C5", "D5", "E5", "F5", "G5"]
const SECOND_ONES_NOTES = ["C5", "C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6", "D6"]

type TimeComponent = "hour" | "minuteTens" | "minuteOnes" | "secondTens" | "secondOnes"

/**
 * Get the musical note for a specific time component
 * @param component - The time component ('hour', 'minuteTens', etc.)
 * @param value - The value of the time component
 * @returns The note name (e.g., "C4")
 */
export const getTimeNote = (component: TimeComponent, value: number): string => {
  // Ensure value is valid
  switch (component) {
    case "hour":
      return HOUR_NOTES[value === 0 ? 12 : value]
    case "minuteTens":
      return value > 0 && value < MINUTE_TENS_NOTES.length ? MINUTE_TENS_NOTES[value] : "C4"
    case "minuteOnes":
      return value > 0 && value < MINUTE_ONES_NOTES.length ? MINUTE_ONES_NOTES[value] : "C4"
    case "secondTens":
      return value > 0 && value < SECOND_TENS_NOTES.length ? SECOND_TENS_NOTES[value] : "C5"
    case "secondOnes":
      return value > 0 && value < SECOND_ONES_NOTES.length ? SECOND_ONES_NOTES[value] : "C5"
    default:
      return "C4" // Default fallback
  }
}

/**
 * Create a volume envelope for a given gain node
 * @param gain - The gain node to apply the envelope to
 * @param audioContext - The audio context
 * @param startTime - Start time for the envelope
 * @param maxVolume - Maximum volume
 * @param attackTime - Attack time in seconds
 * @param decayTime - Decay time in seconds
 * @param sustainLevel - Sustain level (as a percentage of maxVolume)
 * @param releaseTime - Release time in seconds
 */
export const createVolumeEnvelope = (
  gain: GainNode,
  audioContext: AudioContext,
  startTime: number,
  maxVolume: number,
  attackTime = 0.05,
  decayTime = 0.1,
  sustainLevel = 0.8,
  releaseTime = 0.5,
): void => {
  const sustainVolume = maxVolume * sustainLevel
  const totalDuration = attackTime + decayTime + releaseTime

  // Clear any scheduled changes
  gain.gain.cancelScheduledValues(startTime)

  // Start at 0
  gain.gain.setValueAtTime(0, startTime)

  // Attack phase - ramp up to max volume
  gain.gain.linearRampToValueAtTime(maxVolume, startTime + attackTime)

  // Decay phase - ramp down to sustain level
  gain.gain.linearRampToValueAtTime(sustainVolume, startTime + attackTime + decayTime)

  // Release phase - ramp down to 0
  gain.gain.linearRampToValueAtTime(0, startTime + totalDuration)
}
