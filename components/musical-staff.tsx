"use client"

import { useEffect, useRef, useState } from "react"
import { Renderer, Stave, StaveNote, Voice, Formatter, StaveConnector } from "vexflow"

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
      const height = 270 // Increased height to accommodate shifted legend
      renderer.resize(width, height)
      const context = renderer.getContext()

      // Set default color to white
      context.setFont("Arial", 10)
      context.setStrokeStyle(defaultColor)
      context.setFillStyle(defaultColor)

      // Create staves
      const staveX = 10
      const trebleStaveY = 40
      const bassStaveY = 130
      const staveWidth = width - 20

      // Create treble and bass staves
      const trebleStave = new Stave(staveX, trebleStaveY, staveWidth)
      trebleStave.addClef("treble").addTimeSignature("4/4")
      trebleStave.setStyle({ strokeStyle: defaultColor, fillStyle: defaultColor })

      const bassStave = new Stave(staveX, bassStaveY, staveWidth)
      bassStave.addClef("bass").addTimeSignature("4/4")
      bassStave.setStyle({ strokeStyle: defaultColor, fillStyle: defaultColor })

      // Connect the staves with a brace
      const connector = new StaveConnector(trebleStave, bassStave)
      connector.setType(StaveConnector.type.BRACE)
      connector.setContext(context)

      // Draw the staves
      trebleStave.setContext(context).draw()
      bassStave.setContext(context).draw()
      connector.draw()

      if (!isPlaying) {
        // Draw empty staff with just the clef and time signature
        // Position the message centered between the treble and bass clefs
        context.fillStyle = defaultColor
        context.font = "14px Arial"
        context.textAlign = "center"

        // Calculate the vertical midpoint between the two staves and add 65px
        const midpointY = trebleStaveY + (bassStaveY - trebleStaveY) / 2 + 65

        context.fillText(
          "Press Play to see notation",
          staveX + staveWidth / 2,
          midpointY, // Centered between the staves + 65px
        )
        context.textAlign = "start" // Reset text alignment
        context.font = "10px Arial" // Reset font size
      } else {
        // Create voices for each staff
        const trebleVoice = new Voice({ num_beats: 4, beat_value: 4 })
        const bassVoice = new Voice({ num_beats: 4, beat_value: 4 })
        const secondVoice = new Voice({ num_beats: 4, beat_value: 4 })

        // Arrays to hold notes for each voice
        const trebleNotes = []
        const bassNotes = []
        const secondNotes = []

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

        // Add notes to bass voice based on toggles
        if (soundToggles.reference && soundToggles.hour) {
          // If both are enabled, use reference note
          // The hour note will be rendered separately
          bassNotes.push(referenceNote)
        } else if (soundToggles.reference) {
          bassNotes.push(referenceNote)
        } else if (soundToggles.hour) {
          bassNotes.push(hourNote)
        } else {
          // Neither reference nor hour is enabled, use a whole rest
          const rest = new StaveNote({
            clef: "bass",
            keys: ["d/3"],
            duration: "wr",
          })
          rest.setStyle({ fillStyle: defaultColor, strokeStyle: defaultColor })
          bassNotes.push(rest)
        }

        // Add bass notes to bass voice
        bassVoice.addTickables(bassNotes)

        // Create a second bass voice for the hour note if both are enabled
        if (soundToggles.reference && soundToggles.hour) {
          const hourVoice = new Voice({ num_beats: 4, beat_value: 4 })
          hourVoice.addTickables([hourNote])

          // Format and draw the hour voice
          const hourFormatter = new Formatter()
          hourFormatter.joinVoices([hourVoice]).format([hourVoice], staveWidth)

          hourVoice.draw(context, bassStave)
        }

        // Treble clef - minute notes (quarter notes)
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
            trebleNotes.push(minuteTensNote1)
          } else {
            const rest = new StaveNote({
              clef: "treble",
              keys: ["b/4"],
              duration: "qr",
            })
            rest.setStyle({ fillStyle: minuteColor, strokeStyle: minuteColor })
            trebleNotes.push(rest)
          }

          // Second quarter note - ones
          if (minuteOnes > 0) {
            const minuteOnesNote1 = new StaveNote({
              clef: "treble",
              keys: [getMinuteOnesNoteKey(minuteOnes)],
              duration: "q",
            })
            minuteOnesNote1.setStyle({ fillStyle: minuteColor, strokeStyle: minuteColor })
            trebleNotes.push(minuteOnesNote1)
          } else {
            const rest = new StaveNote({
              clef: "treble",
              keys: ["b/4"],
              duration: "qr",
            })
            rest.setStyle({ fillStyle: minuteColor, strokeStyle: minuteColor })
            trebleNotes.push(rest)
          }

          // Third quarter note - 10s again
          if (minuteTens > 0) {
            const minuteTensNote2 = new StaveNote({
              clef: "treble",
              keys: [getMinuteTensNoteKey(minuteTens)],
              duration: "q",
            })
            minuteTensNote2.setStyle({ fillStyle: minuteColor, strokeStyle: minuteColor })
            trebleNotes.push(minuteTensNote2)
          } else {
            const rest = new StaveNote({
              clef: "treble",
              keys: ["b/4"],
              duration: "qr",
            })
            rest.setStyle({ fillStyle: minuteColor, strokeStyle: minuteColor })
            trebleNotes.push(rest)
          }

          // Fourth quarter note - ones again
          if (minuteOnes > 0) {
            const minuteOnesNote2 = new StaveNote({
              clef: "treble",
              keys: [getMinuteOnesNoteKey(minuteOnes)],
              duration: "q",
            })
            minuteOnesNote2.setStyle({ fillStyle: minuteColor, strokeStyle: minuteColor })
            trebleNotes.push(minuteOnesNote2)
          } else {
            const rest = new StaveNote({
              clef: "treble",
              keys: ["b/4"],
              duration: "qr",
            })
            rest.setStyle({ fillStyle: minuteColor, strokeStyle: minuteColor })
            trebleNotes.push(rest)
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
            trebleNotes.push(rest)
          }
        }

        // Add treble notes to treble voice
        trebleVoice.addTickables(trebleNotes)

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

        // Format all voices together
        const formatter = new Formatter()

        // Format the bass voice separately
        formatter.joinVoices([bassVoice]).formatToStave([bassVoice], bassStave, { minBuffer: 0 })

        // Format the treble and second voices together
        const trebleFormatter = new Formatter()
        trebleFormatter
          .joinVoices([trebleVoice, secondVoice])
          .formatToStave([trebleVoice, secondVoice], trebleStave, { minBuffer: 0 })

        // Draw the voices
        bassVoice.draw(context, bassStave)
        trebleVoice.draw(context, trebleStave)
        secondVoice.draw(context, trebleStave)

        // Add legend at the bottom with note symbols
        const legendY = height - 30 // Shifted downward by 30px
        context.fillStyle = defaultColor
        context.fillText("Legend:", 15, legendY)

        let xPos = 70

        // Draw simplified note symbols in the legend
        if (soundToggles.reference) {
          // Draw a simple circle for reference
          context.fillStyle = referenceColor
          context.strokeStyle = referenceColor
          context.fillText("○", xPos, legendY)
          context.fillText("Reference", xPos + 15, legendY)
          xPos += 90
        }

        if (soundToggles.hour) {
          // Draw a simple circle for hour
          context.fillStyle = hourColor
          context.strokeStyle = hourColor
          context.fillText("○", xPos, legendY)
          context.fillText("Hour", xPos + 15, legendY)
          xPos += 60
        }

        if (soundToggles.minute) {
          // Draw a simple symbol for minute
          context.fillStyle = minuteColor
          context.strokeStyle = minuteColor
          context.fillText("♩", xPos, legendY)
          context.fillText("Minute", xPos + 15, legendY)
          xPos += 70
        }

        if (soundToggles.second) {
          // Draw a simple symbol for second (sixteenth note)
          context.fillStyle = secondColor
          context.strokeStyle = secondColor
          context.fillText("♬", xPos, legendY) // Sixteenth note symbol
          context.fillText("Second", xPos + 28, legendY)
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

  // Get minute tens note key for VexFlow
  const getMinuteTensNoteKey = (tens: number): string => {
    if (tens === 0) return "b/4" // Default for rest

    const tensNotes = ["", "c/4", "d/4", "e/4", "f/4", "g/4"]
    return tensNotes[tens]
  }

  // Get minute ones note key for VexFlow
  const getMinuteOnesNoteKey = (ones: number): string => {
    if (ones === 0) return "b/4" // Default for rest

    const onesNotes = ["", "c/4", "d/4", "e/4", "f/4", "g/4", "a/4", "b/4", "c/5", "d/5"]
    return onesNotes[ones]
  }

  // Get second tens note key for VexFlow
  const getSecondTensNoteKey = (tens: number): string => {
    if (tens === 0) return "b/4" // Default for rest

    const tensNotes = ["", "c/5", "d/5", "e/5", "f/5", "g/5"]
    return tensNotes[tens]
  }

  // Get second ones note key for VexFlow
  const getSecondOnesNoteKey = (ones: number): string => {
    if (ones === 0) return "b/4" // Default for rest

    const onesNotes = ["", "c/5", "d/5", "e/5", "f/5", "g/5", "a/5", "b/5", "c/6", "d/6"]
    return onesNotes[ones]
  }

  return (
    <div className="w-full rounded-lg border border-white/10 bg-gray-800/50 p-4">
      <h3 className="mb-4 text-center text-sm font-medium text-gray-300">Musical Notation</h3>
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-md bg-gray-900/50"
        aria-label="Musical staff showing current time as notes"
      />
    </div>
  )
}
