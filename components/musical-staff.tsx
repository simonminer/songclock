"use client"

import { useEffect, useRef, useState } from "react"
import { Renderer, Stave, StaveNote, Voice, Formatter } from "vexflow"

interface MusicalStaffProps {
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

export default function MusicalStaff({ hours, minutes, seconds, isPlaying, soundToggles }: MusicalStaffProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [renderTrigger, setRenderTrigger] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)

  // Extract tens and ones digits for minutes and seconds
  const minuteTens = Math.floor(minutes / 10)
  const minuteOnes = minutes % 10
  const secondTens = Math.floor(seconds / 10)
  const secondOnes = seconds % 10

  // Define colors to match analog clock hands
  const hourColor = "rgba(255, 100, 100, 0.9)" // Red
  const minuteColor = "rgba(100, 255, 100, 0.9)" // Green
  const secondColor = "rgba(100, 150, 255, 0.9)" // Blue
  const referenceColor = "rgba(255, 255, 255, 0.9)" // White for reference
  const defaultColor = "rgba(255, 255, 255, 0.9)" // White for staff, clefs, etc.

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

  // Render the staff using VexFlow
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
      context.setStrokeStyle(defaultColor)
      context.setFillStyle(defaultColor)

      // Create staves
      const staveX = 10
      const secondStaveY = 40
      const minuteStaveY = 140
      const hourStaveY = 240
      const staveWidth = width - 20

      // Create three staves
      const secondStave = new Stave(staveX, secondStaveY, staveWidth)
      secondStave.addClef("treble").addTimeSignature("4/4")
      secondStave.setStyle({ strokeStyle: defaultColor, fillStyle: defaultColor })

      const minuteStave = new Stave(staveX, minuteStaveY, staveWidth)
      minuteStave.addClef("treble").addTimeSignature("4/4")
      minuteStave.setStyle({ strokeStyle: defaultColor, fillStyle: defaultColor })

      const hourStave = new Stave(staveX, hourStaveY, staveWidth)
      hourStave.addClef("bass").addTimeSignature("4/4")
      hourStave.setStyle({ strokeStyle: defaultColor, fillStyle: defaultColor })

      // Draw the staves
      secondStave.setContext(context).draw()
      minuteStave.setContext(context).draw()
      hourStave.setContext(context).draw()

      // Define label positions for vertical alignment
      const secondLabelY = secondStaveY + 100
      const minuteLabelY = minuteStaveY + 100
      const hourLabelY = hourStaveY + 100

      // Add staff labels below each staff at the left end with note names and numeric values
      // Second staff label (blue) with current seconds value
      context.save()
      context.fillStyle = secondColor
      context.font = "bold 14px Arial"
      context.fillText("Seconds ♬", staveX, secondLabelY)
      // Add seconds value underneath
      context.font = "12px Arial"
      context.fillText(`${seconds}s`, staveX, secondLabelY + 20)
      context.restore()

      // Minute staff label (green) with current minutes value
      context.save()
      context.fillStyle = minuteColor
      context.font = "bold 14px Arial"
      context.fillText("Minutes ♩", staveX, minuteLabelY)
      // Add minutes value underneath
      context.font = "12px Arial"
      context.fillText(`${minutes}m`, staveX, minuteLabelY + 20)
      context.restore()

      // Hour staff label (red) with hour number
      context.save()
      context.fillStyle = hourColor
      context.font = "bold 14px Arial"
      context.fillText(`Hour ○ (${hours})`, staveX, hourLabelY)
      // Add hour value underneath
      context.font = "12px Arial"
      context.fillText(`${hours}h`, staveX, hourLabelY + 20)

      // Reference label (white) without note name
      context.fillStyle = referenceColor
      context.font = "14px Arial"
      context.fillText("Reference", staveX + 120, hourLabelY)
      context.restore()

      if (!isPlaying) {
        // Draw empty staff with just the clef and time signature
        // Position the message centered between the staves
        context.fillStyle = defaultColor
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

        // Bass clef notes - reference and hour (transposed down an octave)
        // Reference note as a white whole note (C3)
        const referenceNote = new StaveNote({
          clef: "bass",
          keys: ["c/3"], // C3 in bass clef (transposed down)
          duration: "w",
        })
        referenceNote.setStyle({ fillStyle: referenceColor, strokeStyle: referenceColor })

        // Hour note as a red whole note at the appropriate interval
        const hourNote = new StaveNote({
          clef: "bass",
          keys: [getHourNoteKeyBass(hours)], // Based on C3 now
          duration: "w",
        })
        hourNote.setStyle({ fillStyle: hourColor, strokeStyle: hourColor })

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
          rest.setStyle({ fillStyle: defaultColor, strokeStyle: defaultColor })
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
          // Create a pattern of alternating 10s and ones notes
          // First quarter note - 10s
          if (minuteTens > 0) {
            const minuteTensNote1 = new StaveNote({
              clef: "treble",
              keys: [getMinuteTensNoteKey(minuteTens)],
              duration: "q",
            })
            minuteTensNote1.setStyle({ fillStyle: minuteColor, strokeStyle: minuteColor })
            minuteNotes.push(minuteTensNote1)
          } else {
            const rest = new StaveNote({
              clef: "treble",
              keys: ["b/4"],
              duration: "qr",
            })
            rest.setStyle({ fillStyle: minuteColor, strokeStyle: minuteColor })
            minuteNotes.push(rest)
          }

          // Second quarter note - ones
          if (minuteOnes > 0) {
            const minuteOnesNote1 = new StaveNote({
              clef: "treble",
              keys: [getMinuteOnesNoteKey(minuteOnes)],
              duration: "q",
            })
            minuteOnesNote1.setStyle({ fillStyle: minuteColor, strokeStyle: minuteColor })
            minuteNotes.push(minuteOnesNote1)
          } else {
            const rest = new StaveNote({
              clef: "treble",
              keys: ["b/4"],
              duration: "qr",
            })
            rest.setStyle({ fillStyle: minuteColor, strokeStyle: minuteColor })
            minuteNotes.push(rest)
          }

          // Third quarter note - 10s again
          if (minuteTens > 0) {
            const minuteTensNote2 = new StaveNote({
              clef: "treble",
              keys: [getMinuteTensNoteKey(minuteTens)],
              duration: "q",
            })
            minuteTensNote2.setStyle({ fillStyle: minuteColor, strokeStyle: minuteColor })
            minuteNotes.push(minuteTensNote2)
          } else {
            const rest = new StaveNote({
              clef: "treble",
              keys: ["b/4"],
              duration: "qr",
            })
            rest.setStyle({ fillStyle: minuteColor, strokeStyle: minuteColor })
            minuteNotes.push(rest)
          }

          // Fourth quarter note - ones again
          if (minuteOnes > 0) {
            const minuteOnesNote2 = new StaveNote({
              clef: "treble",
              keys: [getMinuteOnesNoteKey(minuteOnes)],
              duration: "q",
            })
            minuteOnesNote2.setStyle({ fillStyle: minuteColor, strokeStyle: minuteColor })
            minuteNotes.push(minuteOnesNote2)
          } else {
            const rest = new StaveNote({
              clef: "treble",
              keys: ["b/4"],
              duration: "qr",
            })
            rest.setStyle({ fillStyle: minuteColor, strokeStyle: minuteColor })
            minuteNotes.push(rest)
          }
        } else {
          // If minute sounds are disabled, fill with quarter rests
          for (let i = 0; i < 4; i++) {
            const rest = new StaveNote({
              clef: "treble",
              keys: ["b/4"],
              duration: "qr",
            })
            rest.setStyle({ fillStyle: defaultColor, strokeStyle: defaultColor })
            minuteNotes.push(rest)
          }
        }

        // Add minute notes to minute voice
        minuteVoice.addTickables(minuteNotes)

        // Second notes - 16th notes alternating between 10s and ones (8 times)
        if (soundToggles.second) {
          // Create 16 sixteenth notes (4 groups of 4)
          for (let i = 0; i < 16; i++) {
            let note

            // Alternate between 10s and ones for all 16 notes
            if (i % 2 === 0) {
              // Even positions (0, 2, 4, 6, 8, 10, 12, 14) - use 10s
              if (secondTens > 0) {
                note = new StaveNote({
                  clef: "treble",
                  keys: [getSecondTensNoteKey(secondTens)],
                  duration: "16",
                  stem_direction: -1, // Force stem up
                  auto_stem: false,
                })
                note.setStyle({ fillStyle: secondColor, strokeStyle: secondColor })
              } else {
                // If 10s is 0, use a sixteenth rest
                note = new StaveNote({
                  clef: "treble",
                  keys: ["b/4"],
                  duration: "16r",
                })
                note.setStyle({ fillStyle: secondColor, strokeStyle: secondColor })
              }
            } else {
              // Odd positions (1, 3, 5, 7, 9, 11, 13, 15) - use ones
              if (secondOnes > 0) {
                note = new StaveNote({
                  clef: "treble",
                  keys: [getSecondOnesNoteKey(secondOnes)],
                  duration: "16",
                  stem_direction: -1, // Force stem up
                  auto_stem: false,
                })
                note.setStyle({ fillStyle: secondColor, strokeStyle: secondColor })
              } else {
                // If ones is 0, use a sixteenth rest
                note = new StaveNote({
                  clef: "treble",
                  keys: ["b/4"],
                  duration: "16r",
                })
                note.setStyle({ fillStyle: secondColor, strokeStyle: secondColor })
              }
            }

            // Add to the voice
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
            rest.setStyle({ fillStyle: defaultColor, strokeStyle: defaultColor })
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
        // For hour staff - whole notes
        const hourNotePositions = calculateNotePositions(staveX, staveWidth, 1)

        // For minute staff - quarter notes
        const minuteNotePositions = calculateNotePositions(staveX, staveWidth, 4)

        // For second staff - sixteenth notes
        const secondNotePositions = calculateNotePositions(staveX, staveWidth, 16)

        // Add note name labels
        // For hour notes
        if (soundToggles.reference) {
          const referenceNoteName = "C3"
          context.save()
          context.fillStyle = referenceColor
          context.font = "12px Arial"
          context.textAlign = "center"
          context.fillText(referenceNoteName, hourNotePositions[0], hourLabelY)
          context.restore()
        }

        if (soundToggles.hour) {
          const hourNoteName = getHourNoteName(hours)
          context.save()
          context.fillStyle = hourColor
          context.font = "12px Arial"
          context.textAlign = "center"
          // If reference is also enabled, offset the hour note label slightly
          const xPos = soundToggles.reference ? hourNotePositions[0] + 30 : hourNotePositions[0]
          context.fillText(hourNoteName, xPos, hourLabelY)
          context.restore()
        }

        // For minute notes
        if (soundToggles.minute) {
          // First quarter note - 10s
          if (minuteTens > 0) {
            const minuteTensNoteName = getMinuteTensNoteName(minuteTens)
            context.save()
            context.fillStyle = minuteColor
            context.font = "12px Arial"
            context.textAlign = "center"
            context.fillText(minuteTensNoteName, minuteNotePositions[0], minuteLabelY)
            context.fillText(minuteTensNoteName, minuteNotePositions[2], minuteLabelY)
            context.restore()
          }

          // Second quarter note - ones
          if (minuteOnes > 0) {
            const minuteOnesNoteName = getMinuteOnesNoteName(minuteOnes)
            context.save()
            context.fillStyle = minuteColor
            context.font = "12px Arial"
            context.textAlign = "center"
            context.fillText(minuteOnesNoteName, minuteNotePositions[1], minuteLabelY)
            context.fillText(minuteOnesNoteName, minuteNotePositions[3], minuteLabelY)
            context.restore()
          }
        }

        // For second notes
        if (soundToggles.second) {
          // Label all 16 notes
          for (let i = 0; i < 16; i++) {
            let noteName = ""
            const noteColor = secondColor

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
      console.error("Error rendering musical staff:", error)
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
    hourColor,
    minuteColor,
    secondColor,
    referenceColor,
    defaultColor,
  ])

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

  // Get hour note key for bass clef (transposed down an octave)
  const getHourNoteKeyBass = (hour: number): string => {
    const hourNotes = [
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

    return hourNotes[hour === 0 ? 12 : hour]
  }

  // Get hour note name
  const getHourNoteName = (hour: number): string => {
    const hourNoteNames = [
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

    return hourNoteNames[hour === 0 ? 12 : hour]
  }

  // Get minute tens note key for VexFlow
  const getMinuteTensNoteKey = (tens: number): string => {
    if (tens === 0) return "b/4" // Default for rest

    const tensNotes = ["", "c/4", "d/4", "e/4", "f/4", "g/4"]
    return tensNotes[tens]
  }

  // Get minute tens note name
  const getMinuteTensNoteName = (tens: number): string => {
    if (tens === 0) return ""

    const tensNoteNames = ["", "C4", "D4", "E4", "F4", "G4"]
    return tensNoteNames[tens]
  }

  // Get minute ones note key for VexFlow
  const getMinuteOnesNoteKey = (ones: number): string => {
    if (ones === 0) return "b/4" // Default for rest

    const onesNotes = ["", "c/4", "d/4", "e/4", "f/4", "g/4", "a/4", "b/4", "c/5", "d/5"]
    return onesNotes[ones]
  }

  // Get minute ones note name
  const getMinuteOnesNoteName = (ones: number): string => {
    if (ones === 0) return ""

    const onesNoteNames = ["", "C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5"]
    return onesNoteNames[ones]
  }

  // Get second tens note key for VexFlow
  const getSecondTensNoteKey = (tens: number): string => {
    if (tens === 0) return "b/4" // Default for rest

    const tensNotes = ["", "c/5", "d/5", "e/5", "f/5", "g/5"]
    return tensNotes[tens]
  }

  // Get second tens note name
  const getSecondTensNoteName = (tens: number): string => {
    if (tens === 0) return ""

    const tensNoteNames = ["", "C5", "D5", "E5", "F5", "G5"]
    return tensNoteNames[tens]
  }

  // Get second ones note key for VexFlow
  const getSecondOnesNoteKey = (ones: number): string => {
    if (ones === 0) return "b/4" // Default for rest

    const onesNotes = ["", "c/5", "d/5", "e/5", "f/5", "g/5", "a/5", "b/5", "c/6", "d/6"]
    return onesNotes[ones]
  }

  // Get second ones note name
  const getSecondOnesNoteName = (ones: number): string => {
    if (ones === 0) return ""

    const onesNoteNames = ["", "C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6", "D6"]
    return onesNoteNames[ones]
  }

  return (
    <div className="w-full rounded-lg border border-white/10 bg-gray-800/50 p-4">
      <h3 className="mb-4 text-center text-sm font-medium text-gray-300">Sightread the Time</h3>
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-md bg-gray-900/50"
        aria-label="Musical staff showing current time as notes"
      />
    </div>
  )
}
