"use client"

import { useEffect, useRef, useState } from "react"
import { Renderer, Stave, StaveNote, Voice, Formatter } from "vexflow"

interface ScoreProps {
  hours: number
  minutes: number
  seconds: number
  isPlaying: boolean
  soundToggles: {
    reference: boolean
    hour: boolean
    minute: boolean
    second: boolean
  }
}

// Define standard colors for various elements
const COLORS = {
  hour: "rgba(255, 130, 130, 1)", // Brighter red
  minute: "rgba(130, 255, 130, 1)", // Brighter green
  second: "rgba(130, 180, 255, 1)", // Brighter blue
  reference: "rgba(255, 255, 255, 1)", // White for reference (full opacity)
  default: "rgba(255, 255, 255, 1)", // White for staff, clefs, etc. (full opacity)
}

// Note name mapping constants
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

const HOUR_KEYS_BASS = [
  "c/3", // 12 o'clock (C3)
  "c/3", // 1 o'clock (C3)
  "d/3", // 2 o'clock (D3)
  "e/3", // 3 o'clock (E3)
  "f/3", // 4 o'clock (F3)
  "g/3", // 5 o'clock (G3)
  "a/3", // 6 o'clock (A3)
  "b/3", // 7 o'clock (B3)
  "c/4", // 8 o'clock (C4)
  "d/4", // 9 o'clock (D4)
  "e/4", // 10 o'clock (E4)
  "f/4", // 11 o'clock (F4)
  "g/4", // 12 o'clock (G4)
]

const MINUTE_TENS_NOTES = ["", "C4", "D4", "E4", "F4", "G4"]
const MINUTE_TENS_KEYS = ["", "c/4", "d/4", "e/4", "f/4", "g/4"]

const MINUTE_ONES_NOTES = ["", "C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5"]
const MINUTE_ONES_KEYS = ["", "c/4", "d/4", "e/4", "f/4", "g/4", "a/4", "b/4", "c/5", "d/5"]

const SECOND_TENS_NOTES = ["", "C5", "D5", "E5", "F5", "G5"]
const SECOND_TENS_KEYS = ["", "c/5", "d/5", "e/5", "f/5", "g/5"]

const SECOND_ONES_NOTES = ["", "C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6", "D6"]
const SECOND_ONES_KEYS = ["", "c/5", "d/5", "e/5", "f/5", "g/5", "a/5", "b/5", "c/6", "d/6"]

export default function Score({ hours, minutes, seconds, isPlaying, soundToggles }: ScoreProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [renderTrigger, setRenderTrigger] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)

  // Extract tens and ones digits for minutes and seconds
  const minuteTens = Math.floor(minutes / 10)
  const minuteOnes = minutes % 10
  const secondTens = Math.floor(seconds / 10)
  const secondOnes = seconds % 10

  // Format numbers as two digits (e.g., 1 -> "01")
  const formatTwoDigits = (num: number): string => {
    return num.toString().padStart(2, "0")
  }

  // Re-render the staff every 2 seconds
  useEffect(() => {
    if (!isPlaying) return

    // Align with even seconds
    const initialDelay = ((2 - (seconds % 2)) * 1000) % 2000

    const timeout = setTimeout(() => {
      // Start the interval aligned with even seconds
      const interval = setInterval(() => {
        setRenderTrigger((prev) => prev + 1)
      }, 2000)

      // Initial render
      setRenderTrigger((prev) => prev + 1)

      return () => clearInterval(interval)
    }, initialDelay)

    return () => clearTimeout(timeout)
  }, [isPlaying, seconds])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth)
      }
    }

    // Initial size
    handleResize()

    // Add resize listener
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Helper function to calculate note positions
  const calculateNotePositions = (staveX: number, staveWidth: number, noteCount: number): number[] => {
    const positions: number[] = []
    const usableWidth = staveWidth - 100 // Account for clef and time signature
    const startX = staveX + 80 // Start after clef and time signature

    for (let i = 0; i < noteCount; i++) {
      const x = startX + (usableWidth / noteCount) * (i + 0.5) // Center in each note's space
      positions.push(x)
    }

    return positions
  }

  // Hour note helpers
  const getHourNoteKeyBass = (hour: number): string => {
    return HOUR_KEYS_BASS[hour === 0 ? 12 : hour]
  }

  const getHourNoteName = (hour: number): string => {
    return HOUR_NOTES[hour === 0 ? 12 : hour]
  }

  // Minute note helpers
  const getMinuteTensNoteKey = (tens: number): string => {
    if (tens === 0) return "b/4" // Default for rest
    return MINUTE_TENS_KEYS[tens]
  }

  const getMinuteTensNoteName = (tens: number): string => {
    if (tens === 0) return ""
    return MINUTE_TENS_NOTES[tens]
  }

  const getMinuteOnesNoteKey = (ones: number): string => {
    if (ones === 0) return "b/4" // Default for rest
    return MINUTE_ONES_KEYS[ones]
  }

  const getMinuteOnesNoteName = (ones: number): string => {
    if (ones === 0) return ""
    return MINUTE_ONES_NOTES[ones]
  }

  // Second note helpers
  const getSecondTensNoteKey = (tens: number): string => {
    if (tens === 0) return "b/4" // Default for rest
    return SECOND_TENS_KEYS[tens]
  }

  const getSecondTensNoteName = (tens: number): string => {
    if (tens === 0) return ""
    return SECOND_TENS_NOTES[tens]
  }

  const getSecondOnesNoteKey = (ones: number): string => {
    if (ones === 0) return "b/4" // Default for rest
    return SECOND_ONES_KEYS[ones]
  }

  const getSecondOnesNoteName = (ones: number): string => {
    if (ones === 0) return ""
    return SECOND_ONES_NOTES[ones]
  }

  // Create and draw the staves
  const createAndDrawStaves = (context: any, staveX: number, staveWidth: number) => {
    // Define stave positions
    const secondStaveY = 40
    const minuteStaveY = 140
    const hourStaveY = 240

    // Create three staves
    const secondStave = new Stave(staveX, secondStaveY, staveWidth)
    secondStave.addClef("treble").addTimeSignature("4/4")
    secondStave.setStyle({ strokeStyle: COLORS.default, fillStyle: COLORS.default })

    const minuteStave = new Stave(staveX, minuteStaveY, staveWidth)
    minuteStave.addClef("treble").addTimeSignature("4/4")
    minuteStave.setStyle({ strokeStyle: COLORS.default, fillStyle: COLORS.default })

    const hourStave = new Stave(staveX, hourStaveY, staveWidth)
    hourStave.addClef("bass").addTimeSignature("4/4")
    hourStave.setStyle({ strokeStyle: COLORS.default, fillStyle: COLORS.default })

    // Draw the staves
    secondStave.setContext(context).draw()
    minuteStave.setContext(context).draw()
    hourStave.setContext(context).draw()

    return { secondStave, minuteStave, hourStave, secondStaveY, minuteStaveY, hourStaveY }
  }

  // Add staff labels
  const drawStaffLabels = (
    context: any,
    staveX: number,
    { secondStaveY, minuteStaveY, hourStaveY }: { secondStaveY: number; minuteStaveY: number; hourStaveY: number },
    hourNote: string,
  ) => {
    // Define label positions for vertical alignment
    const secondLabelY = secondStaveY + 100
    const minuteLabelY = minuteStaveY + 100
    const hourLabelY = hourStaveY + 100

    // Second staff label (blue) with current seconds value
    context.save()
    context.fillStyle = COLORS.second
    context.font = "bold 14px Arial"
    context.fillText(`Seconds ♬ (${formatTwoDigits(seconds)})`, staveX, secondLabelY)
    context.restore()

    // Minute staff label (green) with current minutes value
    context.save()
    context.fillStyle = COLORS.minute
    context.font = "bold 14px Arial"
    context.fillText(`Minutes ♩ (${formatTwoDigits(minutes)})`, staveX, minuteLabelY)
    context.restore()

    // Hour staff label (red) with hour number and note name
    context.save()
    context.fillStyle = COLORS.hour
    context.font = "bold 14px Arial"

    // Add hour note name next to the label if hour sounds are enabled
    if (soundToggles.hour) {
      context.fillText(`Hour ○ (${formatTwoDigits(hours)}) - ${hourNote}`, staveX, hourLabelY)
    } else {
      context.fillText(`Hour ○ (${formatTwoDigits(hours)})`, staveX, hourLabelY)
    }

    // Reference label (white) with note name next to the label
    context.fillStyle = COLORS.reference
    context.font = "14px Arial"
    if (soundToggles.reference) {
      context.fillText(`Reference - C3`, staveX + 220, hourLabelY)
    } else {
      context.fillText("Reference", staveX + 220, hourLabelY)
    }
    context.restore()
  }

  // Create hour notes
  const createHourNotes = (hourNoteKey: string) => {
    // Bass clef notes - reference and hour (transposed down an octave)
    // Reference note as a white whole note (C3)
    const referenceNote = new StaveNote({
      clef: "bass",
      keys: ["c/3"], // C3 in bass clef (transposed down)
      duration: "w",
    })
    referenceNote.setStyle({ fillStyle: COLORS.reference, strokeStyle: COLORS.reference })

    // Hour note as a red whole note at the appropriate interval
    const hourNote = new StaveNote({
      clef: "bass",
      keys: [hourNoteKey], // Based on C3 now
      duration: "w",
    })
    hourNote.setStyle({ fillStyle: COLORS.hour, strokeStyle: COLORS.hour })

    return { referenceNote, hourNote }
  }

  // Create a note or rest based on the pitch and soundToggles state
  const createNoteOrRest = (
    pitch: number,
    isEnabled: boolean,
    getKeyFunc: (p: number) => string,
    color: string,
    clef: string,
    duration: string,
    restKey = "b/4",
    options: any = {},
  ) => {
    if (isEnabled && pitch > 0) {
      const note = new StaveNote({
        clef,
        keys: [getKeyFunc(pitch)],
        duration,
        ...options,
      })
      note.setStyle({ fillStyle: color, strokeStyle: color })
      return note
    } else {
      const rest = new StaveNote({
        clef,
        keys: [restKey],
        duration: duration + "r",
      })
      rest.setStyle({ fillStyle: color, strokeStyle: color })
      return rest
    }
  }

  // Draw note labels
  const drawNoteLabels = (
    context: any,
    notePositions: number[],
    labelY: number,
    isEnabled: boolean,
    primaryDigit: number,
    secondaryDigit: number | null,
    getPrimaryNameFunc: (d: number) => string,
    getSecondaryNameFunc: (d: number) => string | null,
    color: string,
    pattern: number[],
  ) => {
    if (!isEnabled) return

    for (let i = 0; i < pattern.length; i++) {
      const position = pattern[i]
      const digit = position === 0 ? primaryDigit : secondaryDigit
      if (!digit || digit <= 0) continue

      const noteName = position === 0 ? getPrimaryNameFunc(digit) : getSecondaryNameFunc(digit as number)
      if (!noteName) continue

      context.save()
      context.fillStyle = color
      context.font = "12px Arial"
      context.textAlign = "center"
      context.fillText(noteName, notePositions[i], labelY)
      context.restore()
    }
  }

  // Render the score using VexFlow
  useEffect(() => {
    if (!containerRef.current || containerWidth === 0) return

    try {
      // Clear previous content
      containerRef.current.innerHTML = ""

      // Create VexFlow renderer
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG)

      // Configure renderer
      const width = containerWidth
      const height = 350 // Increased height to accommodate three staves
      renderer.resize(width, height)
      const context = renderer.getContext()

      // Set default color to white
      context.setFont("Arial", 10)
      context.setStrokeStyle(COLORS.default)
      context.setFillStyle(COLORS.default)

      // Create staves
      const staveX = 10
      const staveWidth = width - 20
      const { secondStave, minuteStave, hourStave, secondStaveY, minuteStaveY, hourStaveY } = createAndDrawStaves(
        context,
        staveX,
        staveWidth,
      )

      // Get note name for hour
      const hourNoteName = getHourNoteName(hours)

      // Add staff labels
      drawStaffLabels(context, staveX, { secondStaveY, minuteStaveY, hourStaveY }, hourNoteName)

      if (!isPlaying) {
        // Draw empty staff with just the clef and time signature
        // Position the message centered between the staves
        context.fillStyle = COLORS.default
        context.font = "14px Arial"
        context.textAlign = "center"

        // Calculate the vertical midpoint
        const midpointY = (secondStaveY + hourStaveY) / 2 + 30

        context.fillText("Press Play to see notation", staveX + staveWidth / 2, midpointY)
        context.textAlign = "start" // Reset text alignment
        context.font = "10px Arial" // Reset font size
      } else {
        // Create voices for each staff
        const secondVoice = new Voice({ num_beats: 4, beat_value: 4 })
        const minuteVoice = new Voice({ num_beats: 4, beat_value: 4 })
        const hourVoice = new Voice({ num_beats: 4, beat_value: 4 })

        // Arrays to hold notes for each voice
        const secondNotes = []
        const minuteNotes = []
        const hourNotes = []

        // Get hour note key
        const hourNoteKey = getHourNoteKeyBass(hours)
        const { referenceNote, hourNote } = createHourNotes(hourNoteKey)

        // Standard handling for all hours
        if (soundToggles.reference && soundToggles.hour) {
          // If both are enabled, use reference note
          // The hour note will be rendered separately
          hourNotes.push(referenceNote)
        } else if (soundToggles.reference) {
          hourNotes.push(referenceNote)
        } else if (soundToggles.hour) {
          hourNotes.push(hourNote)
        } else {
          // Neither reference nor hour is enabled, use a whole rest
          const rest = new StaveNote({
            clef: "bass",
            keys: ["d/3"],
            duration: "wr",
          })
          rest.setStyle({ fillStyle: COLORS.default, strokeStyle: COLORS.default })
          hourNotes.push(rest)
        }

        // Add hour notes to hour voice
        hourVoice.addTickables(hourNotes)

        // Create a second hour voice for the hour note if both are enabled
        if (soundToggles.reference && soundToggles.hour) {
          const hourOverlayVoice = new Voice({ num_beats: 4, beat_value: 4 })
          hourOverlayVoice.addTickables([hourNote])

          // Format and draw the hour voice
          const hourFormatter = new Formatter()
          hourFormatter.joinVoices([hourOverlayVoice]).format([hourOverlayVoice], staveWidth)

          hourOverlayVoice.draw(context, hourStave)
        }

        // Minute notes (quarter notes)
        if (soundToggles.minute) {
          // Create quarter notes/rests for minutes
          for (let i = 0; i < 4; i++) {
            const isEven = i % 2 === 0
            const pitch = isEven ? minuteTens : minuteOnes
            const getKeyFunc = isEven ? getMinuteTensNoteKey : getMinuteOnesNoteKey

            const note = createNoteOrRest(pitch, true, getKeyFunc, COLORS.minute, "treble", "q")

            minuteNotes.push(note)
          }
        } else {
          // If minute sounds are disabled, fill with quarter rests
          for (let i = 0; i < 4; i++) {
            const rest = new StaveNote({
              clef: "treble",
              keys: ["b/4"],
              duration: "qr",
            })
            rest.setStyle({ fillStyle: COLORS.default, strokeStyle: COLORS.default })
            minuteNotes.push(rest)
          }
        }

        // Add minute notes to minute voice
        minuteVoice.addTickables(minuteNotes)

        // Second notes - 16th notes alternating between 10s and ones (8 times)
        if (soundToggles.second) {
          // Calculate the next second (handling rollover from 59 to 0)
          const nextSecond = (seconds + 1) % 60
          const nextSecondTens = Math.floor(nextSecond / 10)
          const nextSecondOnes = nextSecond % 10

          // Create 16 sixteenth notes (4 groups of 4)
          for (let i = 0; i < 16; i++) {
            let note
            const isCurrentSecond = i < 8
            const isEven = i % 2 === 0
            const tens = isCurrentSecond ? secondTens : nextSecondTens
            const ones = isCurrentSecond ? secondOnes : nextSecondOnes
            const pitch = isEven ? tens : ones
            const getKeyFunc = isEven ? getSecondTensNoteKey : getSecondOnesNoteKey

            note = createNoteOrRest(pitch, true, getKeyFunc, COLORS.second, "treble", "16", "b/4", {
              stem_direction: -1,
              auto_stem: false,
            })

            secondNotes.push(note)
          }
        } else {
          // If second sounds are disabled, fill with 16th rests
          for (let i = 0; i < 16; i++) {
            const rest = new StaveNote({
              clef: "treble",
              keys: ["b/4"],
              duration: "16r",
            })
            rest.setStyle({ fillStyle: COLORS.default, strokeStyle: COLORS.default })
            secondNotes.push(rest)
          }
        }

        // Add second notes to second voice
        secondVoice.addTickables(secondNotes)

        // Format all voices separately
        const hourFormatter = new Formatter()
        hourFormatter.joinVoices([hourVoice]).formatToStave([hourVoice], hourStave, { minBuffer: 0 })

        const minuteFormatter = new Formatter()
        minuteFormatter.joinVoices([minuteVoice]).formatToStave([minuteVoice], minuteStave, { minBuffer: 0 })

        const secondFormatter = new Formatter()
        secondFormatter.joinVoices([secondVoice]).formatToStave([secondVoice], secondStave, { minBuffer: 0 })

        // Draw the voices
        hourVoice.draw(context, hourStave)
        minuteVoice.draw(context, minuteStave)
        secondVoice.draw(context, secondStave)

        // Calculate note positions for labels
        // For minute staff - quarter notes
        const minuteNotePositions = calculateNotePositions(staveX, staveWidth, 4)

        // For second staff - sixteenth notes
        const secondNotePositions = calculateNotePositions(staveX, staveWidth, 16)

        // Define label positions
        const secondLabelY = secondStaveY + 100
        const minuteLabelY = minuteStaveY + 100

        // For minute notes - add note names under the notes
        // Pattern [0, 1, 0, 1] indicates alternating tens, ones, tens, ones
        drawNoteLabels(
          context,
          minuteNotePositions,
          minuteLabelY,
          soundToggles.minute,
          minuteTens,
          minuteOnes,
          getMinuteTensNoteName,
          getMinuteOnesNoteName,
          COLORS.minute,
          [0, 1, 0, 1],
        )

        // For second notes - add note names under the notes
        if (soundToggles.second) {
          // Calculate the next second (handling rollover from 59 to 0)
          const nextSecond = (seconds + 1) % 60
          const nextSecondTens = Math.floor(nextSecond / 10)
          const nextSecondOnes = nextSecond % 10

          // Label all 16 notes
          for (let i = 0; i < 16; i++) {
            let noteName = ""
            const noteColor = COLORS.second

            if (i < 8) {
              // First 8 notes (current second)
              if (i % 2 === 0) {
                // Even positions - tens
                if (secondTens > 0) {
                  noteName = getSecondTensNoteName(secondTens)
                }
              } else {
                // Odd positions - ones
                if (secondOnes > 0) {
                  noteName = getSecondOnesNoteName(secondOnes)
                }
              }
            } else {
              // Last 8 notes (next second)
              if ((i - 8) % 2 === 0) {
                // Even positions - next second tens
                if (nextSecondTens > 0) {
                  noteName = getSecondTensNoteName(nextSecondTens)
                }
              } else {
                // Odd positions - next second ones
                if (nextSecondOnes > 0) {
                  noteName = getSecondOnesNoteName(nextSecondOnes)
                }
              }
            }

            if (noteName) {
              context.save()
              context.fillStyle = noteColor
              context.font = "12px Arial"
              context.textAlign = "center"
              context.fillText(noteName, secondNotePositions[i], secondLabelY)
              context.restore()
            }
          }
        }
      }
    } catch (error) {
      console.error("Error rendering score:", error)
      console.error("Error details:", error.message, error.stack)

      // Fallback rendering if VexFlow fails
      if (containerRef.current) {
        containerRef.current.innerHTML = ""
        const fallbackDiv = document.createElement("div")
        fallbackDiv.className = "p-4 text-center text-white"
        fallbackDiv.textContent = "Musical notation is currently unavailable. Error: " + error.message
        containerRef.current.appendChild(fallbackDiv)
      }
    }
  }, [
    containerWidth,
    hours,
    minutes,
    seconds,
    isPlaying,
    soundToggles,
    minuteTens,
    minuteOnes,
    secondTens,
    secondOnes,
    renderTrigger,
  ])

  return (
    <div className="w-full rounded-lg border border-white/10 bg-gray-800/50 p-4">
      <h3 className="mb-4 text-center text-sm font-medium text-gray-300">Sightread the Time</h3>
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-md bg-gray-900/50"
        aria-label="Score showing current time as notes"
      />
    </div>
  )
}
