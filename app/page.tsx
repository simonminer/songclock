"use client"

import { useState, useEffect, useRef, type KeyboardEvent } from "react"
import { Play, Pause, Settings, HelpCircle, Music, EyeOff } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import AnalogClock from "@/components/analog-clock"
import AudioEngine from "@/components/audio-engine"
import MusicalStaff from "@/components/musical-staff"
import SettingsModal from "@/components/settings-modal"
import HelpModal from "@/components/help-modal"
import { useAudioContext } from "@/components/audio-context-provider"
import { Providers } from "./providers"
import { trackButtonClick, trackKeyboardShortcut } from "@/utils/analytics"

export default function SongClock() {
  // Running time state (for display and audio)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Input field values (static when manual mode is on)
  const [inputValues, setInputValues] = useState({
    hours: new Date().getHours() % 12 || 12,
    minutes: new Date().getMinutes(),
    seconds: new Date().getSeconds(),
  })

  const [isPlaying, setIsPlaying] = useState(false)
  const [masterVolume, setMasterVolume] = useState(0.5)
  const [useManualTime, setUseManualTime] = useState(false)
  const [manualTimeBase, setManualTimeBase] = useState<Date | null>(null)
  const [manualTimeOffset, setManualTimeOffset] = useState(0)
  const [soundToggles, setSoundToggles] = useState({
    reference: true,
    hour: true,
    minute: true,
    second: true,
  })
  const [soundVolumes, setSoundVolumes] = useState({
    reference: 0.75,
    hour: 0.75,
    minute: 0.5,
    second: 0.3,
  })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [showMusicStaff, setShowMusicStaff] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const [hasVisitedBefore, setHasVisitedBefore] = useState(true)

  // Get the audio context
  const { ensureAudioContextRunning } = useAudioContext()

  // Ref to track if we're currently resetting
  const isResettingRef = useRef(false)

  // Add refs for the buttons to manage focus
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const helpButtonRef = useRef<HTMLButtonElement>(null)
  const playButtonRef = useRef<HTMLButtonElement>(null)
  const staffToggleButtonRef = useRef<HTMLButtonElement>(null)

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Only handle shortcuts when no modals are open
      if (isSettingsOpen || isHelpOpen) return

      // "p" key to toggle play/pause
      if (e.key === "p" || e.key === "P") {
        e.preventDefault()
        togglePlay()
        trackKeyboardShortcut("p", isPlaying ? "Pause" : "Play")
      }

      // Question mark to open help
      if (e.key === "?" || e.key === "/") {
        e.preventDefault()
        setIsHelpOpen(true)
        trackKeyboardShortcut("?", "Open Help")
      }

      // Comma to open settings
      if (e.key === ",") {
        e.preventDefault()
        setIsSettingsOpen(true)
        trackKeyboardShortcut(",", "Open Settings")
      }

      // 's' to toggle music staff
      if (e.key === "s" || e.key === "S") {
        e.preventDefault()
        setShowMusicStaff((prev) => !prev)
        trackKeyboardShortcut("s", showMusicStaff ? "Hide Score" : "Show Score")
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isSettingsOpen, isHelpOpen, isPlaying, showMusicStaff]) // Added showMusicStaff to the dependency array

  // Update time automatically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()

      if (!useManualTime) {
        // Normal real-time mode
        setCurrentTime(now)
        setInputValues({
          hours: now.getHours() % 12 || 12,
          minutes: now.getMinutes(),
          seconds: now.getSeconds(),
        })
      } else if (manualTimeBase) {
        // Manual time mode with automatic second updates
        const elapsedMs = now.getTime() - manualTimeBase.getTime() + manualTimeOffset
        const updatedTime = new Date(elapsedMs)

        // Only update the current time for display and audio, not the input fields
        setCurrentTime(updatedTime)

        // Don't update input values in manual mode - they should remain static
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [useManualTime, manualTimeBase, manualTimeOffset])

  // Check if this is the first visit
  useEffect(() => {
    // Check localStorage for previous visits
    const hasVisited = localStorage.getItem("songClockHasVisited")

    if (!hasVisited) {
      // First visit - show help modal with welcome message
      setIsHelpOpen(true)
      setHasVisitedBefore(false)

      // Set the flag for future visits
      localStorage.setItem("songClockHasVisited", "true")
    } else {
      // Not first visit - ensure help modal is closed
      setIsHelpOpen(false)
      setHasVisitedBefore(true)
    }
  }, [])

  // Modify the togglePlay function to ensure audio context is resumed
  const togglePlay = async () => {
    // Ensure audio context is resumed on user interaction
    await ensureAudioContextRunning()

    const newIsPlaying = !isPlaying
    setIsPlaying(newIsPlaying)

    // Track the event
    trackButtonClick("Play/Pause", newIsPlaying ? "Play" : "Pause")

    // Announce state change to screen readers
    setAnnouncement(newIsPlaying ? "Sound on" : "Sound off")
  }

  const toggleMusicStaff = () => {
    const newShowMusicStaff = !showMusicStaff
    setShowMusicStaff(newShowMusicStaff)

    // Track the event
    trackButtonClick("Show/Hide Score", newShowMusicStaff ? "Show" : "Hide")

    // Announce state change to screen readers
    setAnnouncement(newShowMusicStaff ? "Score on" : "Score off")
  }

  const handleMasterVolumeChange = (value: number) => {
    setMasterVolume(value)
  }

  const handleSoundVolumeChange = (component: keyof typeof soundVolumes, value: number[]) => {
    setSoundVolumes((prev) => ({
      ...prev,
      [component]: value[0],
    }))
  }

  // Handle keyboard events for volume sliders
  const handleSliderKeyDown = (
    e: KeyboardEvent<HTMLDivElement>,
    component: keyof typeof soundVolumes | "master",
    currentValue: number,
  ) => {
    // Only handle arrow keys
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      return
    }

    e.preventDefault() // Prevent default behavior (scrolling)

    const step = 0.05 // 5% step for keyboard navigation
    let newValue = currentValue

    // Increase value with Up/Right arrows
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      newValue = Math.min(1, currentValue + step)
    }
    // Decrease value with Down/Left arrows
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      newValue = Math.max(0, currentValue - step)
    }

    // Update the appropriate volume
    if (component === "master") {
      setMasterVolume(newValue)
    } else {
      handleSoundVolumeChange(component, [newValue])
    }
  }

  const handleManualTimeChange = (field: "hours" | "minutes" | "seconds", value: string) => {
    // Allow empty string during typing
    if (value === "") {
      setInputValues((prev) => ({
        ...prev,
        [field]: "",
      }))
      return
    }

    const numValue = Number.parseInt(value, 10)

    if (isNaN(numValue)) return

    let validValue = numValue

    // Apply constraints
    if (field === "hours") {
      validValue = Math.max(0, Math.min(12, numValue))
      if (validValue === 0) validValue = 12 // Convert 0 to 12
    } else {
      validValue = Math.max(0, Math.min(59, numValue))
    }

    // Update the input values
    setInputValues((prev) => ({
      ...prev,
      [field]: validValue,
    }))

    // Create a new Date object with the updated time
    const now = new Date()
    const newDate = new Date()

    // Get current values, handling empty strings
    const currentHours = typeof inputValues.hours === "string" ? 0 : inputValues.hours
    const currentMinutes = typeof inputValues.minutes === "string" ? 0 : inputValues.minutes
    const currentSeconds = typeof inputValues.seconds === "string" ? 0 : inputValues.seconds

    // Set hours, minutes, seconds based on the input values
    newDate.setHours(
      field === "hours" ? validValue % 12 : currentHours % 12,
      field === "minutes" ? validValue : currentMinutes,
      field === "seconds" ? validValue : currentSeconds,
      0, // Reset milliseconds
    )

    // If hour is 12, adjust it to 0 for proper Date object handling
    if (field === "hours" && validValue === 12) {
      newDate.setHours(0)
    }

    // Update the current time and manual time base
    setCurrentTime(newDate)
    setManualTimeBase(now)
    setManualTimeOffset(newDate.getTime() - now.getTime())
  }

  // Handle increment/decrement for time inputs
  const handleTimeIncrement = (field: "hours" | "minutes" | "seconds", increment: boolean) => {
    // Get current value, ensuring it's a number
    const currentValue = typeof inputValues[field] === "string" ? 0 : inputValues[field]

    let newValue: number

    if (field === "hours") {
      if (increment) {
        newValue = currentValue === 12 ? 1 : currentValue + 1
      } else {
        newValue = currentValue === 1 ? 12 : currentValue - 1
      }
    } else {
      if (increment) {
        newValue = currentValue === 59 ? 0 : currentValue + 1
      } else {
        newValue = currentValue === 0 ? 59 : currentValue - 1
      }
    }

    // Update using the existing handler
    handleManualTimeChange(field, newValue.toString())
  }

  const resetToCurrentTime = () => {
    // Set the resetting flag to prevent unwanted updates
    isResettingRef.current = true

    const now = new Date()
    const hours = now.getHours() % 12 || 12
    const minutes = now.getMinutes()
    const seconds = now.getSeconds()

    // Update both the current time and input values
    setCurrentTime(now)
    setInputValues({
      hours,
      minutes,
      seconds,
    })

    // Reset the manual time base and offset
    setManualTimeBase(now)
    setManualTimeOffset(0)

    // Clear the resetting flag after a short delay
    setTimeout(() => {
      isResettingRef.current = false
    }, 100)
  }

  const toggleSoundComponent = (component: keyof typeof soundToggles) => {
    setSoundToggles((prev) => ({
      ...prev,
      [component]: !prev[component],
    }))
  }

  const toggleTimeMode = () => {
    if (!useManualTime) {
      // Switching to manual mode - set the base time to current
      const now = new Date()
      setManualTimeBase(now)
      setManualTimeOffset(0)

      // Initialize input values with current time
      setInputValues({
        hours: now.getHours() % 12 || 12,
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
      })
    } else {
      // Switching to real-time mode
      setManualTimeBase(null)
      setManualTimeOffset(0)
    }
    setUseManualTime(!useManualTime)
  }

  // Format numbers as two digits (e.g., 1 -> "01")
  const formatTwoDigits = (num: number | string) => {
    if (typeof num === "string") return num.padStart(2, "0")
    return num.toString().padStart(2, "0")
  }

  // Format percentage for volume display
  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`
  }

  // Extract display time values
  const displayHours = currentTime.getHours() % 12 || 12
  const displayMinutes = currentTime.getMinutes()
  const displaySeconds = currentTime.getSeconds()
  const displayMilliseconds = currentTime.getMilliseconds()

  // Get current year for footer
  const currentYear = new Date().getFullYear()

  // Ensure audio context is running when the component mounts
  useEffect(() => {
    ensureAudioContextRunning()
  }, [ensureAudioContextRunning])

  return (
    <Providers>
      <div className="flex min-h-screen flex-col bg-gray-900 text-white">
        {/* Live region for screen reader announcements */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </div>

        <header className="border-b border-white/10 bg-[#1a202c] p-4">
          <div className="flex w-full flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex h-full items-center justify-center sm:justify-start">
              <picture>
                <source srcSet="/images/songclock-logo-dark-bg.webp" type="image/webp" />
                <Image
                  src="/images/songclock-logo-dark-bg.png"
                  alt="Song Clock - Listen to the time."
                  width={400}
                  height={100}
                  className="h-auto w-auto max-h-16"
                  priority
                />
              </picture>
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3">
              <Button
                ref={playButtonRef}
                onClick={togglePlay}
                variant="outline"
                size="lg"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                aria-label={isPlaying ? "Pause sound" : "Play sound"}
              >
                {isPlaying ? (
                  <>
                    <Pause className="mr-2 h-5 w-5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                    Play
                  </>
                )}
              </Button>
              <Button
                ref={helpButtonRef}
                onClick={() => {
                  setIsHelpOpen(true)
                  trackButtonClick("Help", "Open")
                }}
                variant="outline"
                className="flex items-center gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                aria-label="Open help"
              >
                <HelpCircle className="h-5 w-5" />
                <span className="hidden sm:inline">Help</span>
              </Button>
              <Button
                ref={settingsButtonRef}
                onClick={() => {
                  setIsSettingsOpen(true)
                  trackButtonClick("Settings", "Open")
                }}
                variant="outline"
                className="flex items-center gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                aria-label="Open settings"
              >
                <Settings className="h-5 w-5" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full py-5">
          {/* Main Content Section - Clock and Musical Staff */}
          <div className="flex flex-col gap-5">
            {/* Clock Section - Converted to a button */}
            <button
              className="mx-4 flex w-auto flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 p-6 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              onClick={() => {
                togglePlay()
                trackButtonClick("Analog Clock Panel", isPlaying ? "Pause" : "Play")
              }}
              aria-label={`Clock panel showing ${formatTwoDigits(displayHours)}:${formatTwoDigits(displayMinutes)}:${formatTwoDigits(displaySeconds)}. ${isPlaying ? "Pause" : "Play"} sound`}
              type="button"
            >
              <AnalogClock hours={displayHours} minutes={displayMinutes} seconds={displaySeconds} />
              <div className="mt-4 text-center text-2xl font-mono">
                {formatTwoDigits(displayHours)}:{formatTwoDigits(displayMinutes)}:{formatTwoDigits(displaySeconds)}
              </div>
            </button>

            {/* Staff Toggle Button */}
            <div className="mx-4 flex justify-center w-auto">
              <Button
                ref={staffToggleButtonRef}
                onClick={toggleMusicStaff}
                variant="outline"
                size="lg"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                aria-label={showMusicStaff ? "Hide score" : "Show score"}
              >
                {showMusicStaff ? (
                  <>
                    <EyeOff className="mr-2 h-5 w-5" />
                    Hide Score
                  </>
                ) : (
                  <>
                    <Music className="mr-2 h-5 w-5" />
                    Show Score
                  </>
                )}
              </Button>
            </div>

            {/* Musical Staff Section - Conditionally rendered */}
            {showMusicStaff && (
              <div className="mx-4 flex items-center justify-center w-auto">
                <MusicalStaff
                  hours={displayHours}
                  minutes={displayMinutes}
                  seconds={displaySeconds}
                  isPlaying={isPlaying}
                  soundToggles={soundToggles}
                  soundVolumes={soundVolumes}
                />
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-5 border-t border-white/10 bg-gray-800/50 py-4 px-4 text-center text-sm text-gray-400">
          <div className="flex items-center justify-center gap-3">
            <span>&copy; {currentYear} Pedal Point Solutions</span>
            <div className="flex items-center gap-2">
              {/* LinkedIn Icon */}
              <Link
                href="https://www.linkedin.com/company/pedal-point-solutions"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-white h-6 w-6 hover:opacity-80 transition-opacity"
                aria-label="Pedal Point Solutions on LinkedIn"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="#0077b5"
                  className="h-4 w-4"
                >
                  <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 00.1.37V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"></path>
                </svg>
              </Link>

              {/* GitHub Icon */}
              <Link
                href="https://github.com/simonminer/songclock"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-white h-6 w-6 hover:opacity-80 transition-opacity"
                aria-label="Song Clock on GitHub"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  fill="#24292e"
                  className="h-4 w-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
                  ></path>
                </svg>
              </Link>
            </div>
          </div>
        </footer>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => {
            setIsSettingsOpen(false)
            trackButtonClick("Settings", "Close")
            // Return focus to settings button when modal closes
            if (settingsButtonRef.current) {
              settingsButtonRef.current.focus()
            }
          }}
          masterVolume={masterVolume}
          setMasterVolume={handleMasterVolumeChange}
          soundToggles={soundToggles}
          toggleSoundComponent={toggleSoundComponent}
          soundVolumes={soundVolumes}
          handleSoundVolumeChange={handleSoundVolumeChange}
          handleSliderKeyDown={handleSliderKeyDown}
          useManualTime={useManualTime}
          toggleTimeMode={toggleTimeMode}
          inputValues={inputValues}
          handleManualTimeChange={handleManualTimeChange}
          handleTimeIncrement={handleTimeIncrement}
          resetToCurrentTime={resetToCurrentTime}
          formatTwoDigits={formatTwoDigits}
          formatPercentage={formatPercentage}
        />

        {/* Help Modal */}
        <HelpModal
          isOpen={isHelpOpen}
          onClose={() => {
            setIsHelpOpen(false)
            trackButtonClick("Help", "Close")
            // Return focus to help button when modal closes
            if (helpButtonRef.current) {
              helpButtonRef.current.focus()
            }
          }}
          customTitle={!hasVisitedBefore ? "Welcome to Song Clock" : undefined}
        />

        {isPlaying && (
          <AudioEngine
            key={`${displayHours}-${displayMinutes}-${displaySeconds}-${isPlaying}`}
            hours={displayHours}
            minutes={displayMinutes}
            seconds={displaySeconds}
            milliseconds={displayMilliseconds}
            masterVolume={masterVolume}
            soundToggles={soundToggles}
            soundVolumes={soundVolumes}
          />
        )}
      </div>
    </Providers>
  )
}
