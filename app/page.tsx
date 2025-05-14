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
      }

      // Question mark to open help
      if (e.key === "?" || e.key === "/") {
        e.preventDefault()
        setIsHelpOpen(true)
      }

      // Comma to open settings
      if (e.key === ",") {
        e.preventDefault()
        setIsSettingsOpen(true)
      }

      // 's' to toggle music staff
      if (e.key === "s" || e.key === "S") {
        e.preventDefault()
        setShowMusicStaff((prev) => !prev)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isSettingsOpen, isHelpOpen, isPlaying]) // Added isPlaying to the dependency array

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

  const togglePlay = () => {
    const newIsPlaying = !isPlaying
    setIsPlaying(newIsPlaying)

    // Announce state change to screen readers
    setAnnouncement(newIsPlaying ? "Sound on" : "Sound off")
  }

  const toggleMusicStaff = () => {
    const newShowMusicStaff = !showMusicStaff
    setShowMusicStaff(newShowMusicStaff)

    // Announce state change to screen readers
    setAnnouncement(newShowMusicStaff ? "Music staff on" : "Music staff off")
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

  return (
    <div className="flex min-h-screen flex-col bg-gray-900 text-white">
      {/* Live region for screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <header className="border-b border-white/10 bg-gray-800/50 p-4">
        <div className="flex w-full flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex h-full items-center justify-center sm:justify-start">
            <Image
              src="/images/songclock-logo-light.png"
              alt="Song Clock - Listen to the time."
              width={300}
              height={70}
              className="h-auto w-auto max-h-16"
              priority
            />
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
              ref={staffToggleButtonRef}
              onClick={toggleMusicStaff}
              variant="outline"
              className="flex items-center gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              aria-label={showMusicStaff ? "Hide music staff" : "Show music staff"}
            >
              {showMusicStaff ? (
                <>
                  <EyeOff className="h-5 w-5" />
                  <span className="hidden sm:inline">Hide Staff</span>
                  <span className="sm:hidden">Staff</span>
                </>
              ) : (
                <>
                  <Music className="h-5 w-5" />
                  <span className="hidden sm:inline">Show Staff</span>
                  <span className="sm:hidden">Staff</span>
                </>
              )}
            </Button>
            <Button
              ref={helpButtonRef}
              onClick={() => setIsHelpOpen(true)}
              variant="outline"
              className="flex items-center gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              aria-label="Open help"
            >
              <HelpCircle className="h-5 w-5" />
              <span className="hidden sm:inline">Help</span>
            </Button>
            <Button
              ref={settingsButtonRef}
              onClick={() => setIsSettingsOpen(true)}
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
            onClick={togglePlay}
            aria-label={`Clock panel. Click to ${isPlaying ? "pause" : "play"} sound`}
            type="button"
          >
            <AnalogClock hours={displayHours} minutes={displayMinutes} seconds={displaySeconds} />
            <div className="mt-4 text-center text-2xl font-mono">
              {formatTwoDigits(displayHours)}:{formatTwoDigits(displayMinutes)}:{formatTwoDigits(displaySeconds)}
            </div>
          </button>

          {/* Musical Staff Section - Conditionally rendered */}
          {showMusicStaff && (
            <div className="mx-4 flex items-center justify-center w-auto">
              <MusicalStaff
                hours={displayHours}
                minutes={displayMinutes}
                seconds={displaySeconds}
                isPlaying={isPlaying}
                soundToggles={soundToggles}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-5 border-t border-white/10 bg-gray-800/50 py-4 px-4 text-center text-sm text-gray-400">
        &copy; {currentYear}{" "}
        <Link
          href="https://pedalpoint.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white hover:text-white/80 underline underline-offset-2 transition-colors"
        >
          Pedal Point Solutions
        </Link>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false)
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
          // Return focus to help button when modal closes
          if (helpButtonRef.current) {
            helpButtonRef.current.focus()
          }
        }}
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
  )
}
