"use client"

import { useState, useEffect, useRef, type KeyboardEvent } from "react"
import { Play, Pause, Volume2, Info, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import AnalogClock from "@/components/analog-clock"
import AudioEngine from "@/components/audio-engine"
import IntervalLegend from "@/components/interval-legend"
import MusicalStaff from "@/components/musical-staff"

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

  // Ref to track if we're currently resetting
  const isResettingRef = useRef(false)

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
    setIsPlaying(!isPlaying)
  }

  const handleMasterVolumeChange = (value: number[]) => {
    setMasterVolume(value[0])
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

  // Extract tens and ones digits for display
  const minuteTens = Math.floor(displayMinutes / 10)
  const minuteOnes = displayMinutes % 10
  const secondTens = Math.floor(displaySeconds / 10)
  const secondOnes = displaySeconds % 10

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-white/10 bg-gray-800/50 p-4">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-bold">SongClock</h1>
          <p className="mt-1 text-gray-400">Ear training tool: Learn to tell time by listening to musical intervals</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4">
        {/* Primary Play/Pause control - Always visible at top */}
        <div className="mb-8">
          <Button
            onClick={togglePlay}
            variant="outline"
            size="lg"
            className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 md:w-64"
            aria-label={isPlaying ? "Pause sound" : "Play sound"}
          >
            {isPlaying ? (
              <>
                <Pause className="mr-2 h-5 w-5" />
                Pause Sound
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Play Sound
              </>
            )}
          </Button>
        </div>

        {/* Main Content Section - Clock and Musical Staff */}
        <div className="mb-8 flex flex-col gap-8">
          {/* Clock Section */}
          <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 p-6">
            <AnalogClock hours={displayHours} minutes={displayMinutes} seconds={displaySeconds} />
            <div className="mt-4 text-center text-2xl font-mono">
              {formatTwoDigits(displayHours)}:{formatTwoDigits(displayMinutes)}:{formatTwoDigits(displaySeconds)}
            </div>
          </div>

          {/* Musical Staff Section - Now full width */}
          <div className="flex items-center justify-center w-full">
            <MusicalStaff
              hours={displayHours}
              minutes={displayMinutes}
              seconds={displaySeconds}
              isPlaying={isPlaying}
              soundToggles={soundToggles}
            />
          </div>
        </div>

        {/* Controls Section - Sound and Time Controls */}
        <div className="mb-8 grid gap-8 lg:grid-cols-2">
          {/* Sound Controls */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-medium">Sound Controls</h2>

            <div className="grid gap-4">
              <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-3">
                <div className="text-right text-sm font-medium">{formatPercentage(soundVolumes.reference)}</div>
                <div
                  className="group relative"
                  onKeyDown={(e) => handleSliderKeyDown(e, "reference", soundVolumes.reference)}
                  tabIndex={soundToggles.reference ? 0 : -1}
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(soundVolumes.reference * 100)}
                  aria-label="Reference tone volume"
                  aria-disabled={!soundToggles.reference}
                >
                  <div className="flex items-center gap-2">
                    <Label htmlFor="reference-toggle" className="text-sm">
                      Reference Tone
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Warm ambient C4 pad with reverb that plays continuously</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Slider
                    value={[soundVolumes.reference]}
                    max={1}
                    step={0.01}
                    onValueChange={(value) => handleSoundVolumeChange("reference", value)}
                    className="w-full focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 group-focus-visible:ring-2 group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-gray-900"
                    disabled={!soundToggles.reference}
                  />
                </div>
                <Switch
                  id="reference-toggle"
                  checked={soundToggles.reference}
                  onCheckedChange={() => toggleSoundComponent("reference")}
                  className="focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                  aria-label="Toggle reference tone"
                />
              </div>

              <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-3">
                <div className="text-right text-sm font-medium">{formatPercentage(soundVolumes.hour)}</div>
                <div
                  className="group relative"
                  onKeyDown={(e) => handleSliderKeyDown(e, "hour", soundVolumes.hour)}
                  tabIndex={soundToggles.hour ? 0 : -1}
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(soundVolumes.hour * 100)}
                  aria-label="Hour tone volume"
                  aria-disabled={!soundToggles.hour}
                >
                  <div className="flex items-center gap-2">
                    <Label htmlFor="hour-toggle" className="text-sm">
                      Hour Tone
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Ambient pad with reverb playing the interval corresponding to the hour
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Slider
                    value={[soundVolumes.hour]}
                    max={1}
                    step={0.01}
                    onValueChange={(value) => handleSoundVolumeChange("hour", value)}
                    className="w-full focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 group-focus-visible:ring-2 group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-gray-900"
                    disabled={!soundToggles.hour}
                  />
                </div>
                <Switch
                  id="hour-toggle"
                  checked={soundToggles.hour}
                  onCheckedChange={() => toggleSoundComponent("hour")}
                  className="focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                  aria-label="Toggle hour tone"
                />
              </div>

              <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-3">
                <div className="text-right text-sm font-medium">{formatPercentage(soundVolumes.minute)}</div>
                <div
                  className="group relative"
                  onKeyDown={(e) => handleSliderKeyDown(e, "minute", soundVolumes.minute)}
                  tabIndex={soundToggles.minute ? 0 : -1}
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(soundVolumes.minute * 100)}
                  aria-label="Minute tones volume"
                  aria-disabled={!soundToggles.minute}
                >
                  <div className="flex items-center gap-2">
                    <Label htmlFor="minute-toggle" className="text-sm">
                      Minute Tones
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Alternating tones for tens and ones digits of minutes. Tens: {minuteTens} (
                            {minuteTens > 0 ? ["C", "D", "E", "F", "G"][minuteTens - 1] : "none"}), Ones: {minuteOnes} (
                            {minuteOnes > 0 ? ["C", "D", "E", "F", "G", "A", "B", "C", "D"][minuteOnes - 1] : "none"})
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Slider
                    value={[soundVolumes.minute]}
                    max={1}
                    step={0.01}
                    onValueChange={(value) => handleSoundVolumeChange("minute", value)}
                    className="w-full focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 group-focus-visible:ring-2 group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-gray-900"
                    disabled={!soundToggles.minute}
                  />
                </div>
                <Switch
                  id="minute-toggle"
                  checked={soundToggles.minute}
                  onCheckedChange={() => toggleSoundComponent("minute")}
                  className="focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                  aria-label="Toggle minute tones"
                />
              </div>

              <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-3">
                <div className="text-right text-sm font-medium">{formatPercentage(soundVolumes.second)}</div>
                <div
                  className="group relative"
                  onKeyDown={(e) => handleSliderKeyDown(e, "second", soundVolumes.second)}
                  tabIndex={soundToggles.second ? 0 : -1}
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(soundVolumes.second * 100)}
                  aria-label="Second tones volume"
                  aria-disabled={!soundToggles.second}
                >
                  <div className="flex items-center gap-2">
                    <Label htmlFor="second-toggle" className="text-sm">
                      Second Tones
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Tones for tens and ones digits of seconds. Tens: {secondTens}, Ones: {secondOnes}. Each
                            plays twice per second (0.25s each).
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Slider
                    value={[soundVolumes.second]}
                    max={1}
                    step={0.01}
                    onValueChange={(value) => handleSoundVolumeChange("second", value)}
                    className="w-full focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 group-focus-visible:ring-2 group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-gray-900"
                    disabled={!soundToggles.second}
                  />
                </div>
                <Switch
                  id="second-toggle"
                  checked={soundToggles.second}
                  onCheckedChange={() => toggleSoundComponent("second")}
                  className="focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                  aria-label="Toggle second tones"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <Volume2 className="h-5 w-5" />
              <Label htmlFor="master-volume" className="text-sm">
                Master Volume
              </Label>
              <div className="text-sm font-medium">{formatPercentage(masterVolume)}</div>
              <div
                className="group relative flex-1"
                onKeyDown={(e) => handleSliderKeyDown(e, "master", masterVolume)}
                tabIndex={0}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(masterVolume * 100)}
                aria-label="Master volume"
              >
                <Slider
                  id="master-volume"
                  value={[masterVolume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleMasterVolumeChange}
                  className="w-full focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 group-focus-visible:ring-2 group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Time Controls */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium">Manual Time Control</h2>
              <Switch
                id="manual-time-toggle"
                checked={useManualTime}
                onCheckedChange={toggleTimeMode}
                aria-label="Toggle manual time control"
                className="focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="hours-input" className="text-xs">
                  Hours (00-12)
                </Label>
                <div className="relative">
                  <Input
                    id="hours-input"
                    type="text"
                    inputMode="numeric"
                    value={formatTwoDigits(inputValues.hours)}
                    onChange={(e) => handleManualTimeChange("hours", e.target.value)}
                    disabled={!useManualTime}
                    className="bg-white/10 font-mono text-center text-lg focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                    maxLength={2}
                    aria-label="Hours"
                  />
                  {useManualTime && (
                    <div className="absolute right-0 top-0 flex h-full flex-col">
                      <button
                        type="button"
                        onClick={() => handleTimeIncrement("hours", true)}
                        className="flex h-1/2 w-6 items-center justify-center rounded-tr-md border-l border-t border-white/10 bg-white/5 text-xs hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                        aria-label="Increase hours"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTimeIncrement("hours", false)}
                        className="flex h-1/2 w-6 items-center justify-center rounded-br-md border-b border-l border-white/10 bg-white/5 text-xs hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                        aria-label="Decrease hours"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="minutes-input" className="text-xs">
                  Minutes (00-59)
                </Label>
                <div className="relative">
                  <Input
                    id="minutes-input"
                    type="text"
                    inputMode="numeric"
                    value={formatTwoDigits(inputValues.minutes)}
                    onChange={(e) => handleManualTimeChange("minutes", e.target.value)}
                    disabled={!useManualTime}
                    className="bg-white/10 font-mono text-center text-lg focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                    maxLength={2}
                    aria-label="Minutes"
                  />
                  {useManualTime && (
                    <div className="absolute right-0 top-0 flex h-full flex-col">
                      <button
                        type="button"
                        onClick={() => handleTimeIncrement("minutes", true)}
                        className="flex h-1/2 w-6 items-center justify-center rounded-tr-md border-l border-t border-white/10 bg-white/5 text-xs hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                        aria-label="Increase minutes"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTimeIncrement("minutes", false)}
                        className="flex h-1/2 w-6 items-center justify-center rounded-br-md border-b border-l border-white/10 bg-white/5 text-xs hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                        aria-label="Decrease minutes"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="seconds-input" className="text-xs">
                  Seconds (00-59)
                </Label>
                <div className="relative">
                  <Input
                    id="seconds-input"
                    type="text"
                    inputMode="numeric"
                    value={formatTwoDigits(inputValues.seconds)}
                    onChange={(e) => handleManualTimeChange("seconds", e.target.value)}
                    disabled={!useManualTime}
                    className="bg-white/10 font-mono text-center text-lg focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                    maxLength={2}
                    aria-label="Seconds"
                  />
                  {useManualTime && (
                    <div className="absolute right-0 top-0 flex h-full flex-col">
                      <button
                        type="button"
                        onClick={() => handleTimeIncrement("seconds", true)}
                        className="flex h-1/2 w-6 items-center justify-center rounded-tr-md border-l border-t border-white/10 bg-white/5 text-xs hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                        aria-label="Increase seconds"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTimeIncrement("seconds", false)}
                        className="flex h-1/2 w-6 items-center justify-center rounded-br-md border-b border-l border-white/10 bg-white/5 text-xs hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                        aria-label="Decrease seconds"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {useManualTime && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetToCurrentTime}
                className="mt-4 flex items-center gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                aria-label="Reset to current time"
              >
                <RefreshCw className="h-4 w-4" />
                Reset to Current Time
              </Button>
            )}

            <div className="mt-6">
              <h3 className="mb-2 text-lg font-medium">Instrument Guide</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-300">
                <li>Reference tone: Ambient pad playing C3 with reverb</li>
                <li>Hours: Ambient pad playing intervals in the C-Major scale</li>
                <li>Minutes: Piano-like synthesized tones for alternating tens and ones digits</li>
                <li>Seconds: Vibraphone-like synthesized tones for alternating tens and ones digits</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Reference Section */}
        <div className="mb-8">
          <IntervalLegend />
        </div>
      </main>

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
