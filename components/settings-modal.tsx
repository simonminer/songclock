"use client"

import { useEffect, useRef, useState } from "react"
import { X, Volume2, Info, Clock, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { KeyboardEvent } from "react"
import { trackButtonClick } from "@/utils/analytics"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  masterVolume: number
  setMasterVolume: (value: number) => void
  soundToggles: {
    reference: boolean
    hour: boolean
    minute: boolean
    second: boolean
  }
  toggleSoundComponent: (component: keyof typeof soundToggles) => void
  soundVolumes: {
    reference: number
    hour: number
    minute: number
    second: number
  }
  handleSoundVolumeChange: (component: keyof typeof soundVolumes, value: number[]) => void
  handleSliderKeyDown: (
    e: KeyboardEvent<HTMLDivElement>,
    component: keyof typeof soundVolumes | "master",
    currentValue: number,
  ) => void
  useManualTime: boolean
  toggleTimeMode: () => void
  inputValues: {
    hours: number | string
    minutes: number | string
    seconds: number | string
  }
  handleManualTimeChange: (field: "hours" | "minutes" | "seconds", value: string) => void
  handleTimeIncrement: (field: "hours" | "minutes" | "seconds", increment: boolean) => void
  resetToCurrentTime: () => void
  formatTwoDigits: (num: number | string) => string
  formatPercentage: (value: number) => string
}

export default function SettingsModal({
  isOpen,
  onClose,
  masterVolume,
  setMasterVolume,
  soundToggles,
  toggleSoundComponent,
  soundVolumes,
  handleSoundVolumeChange,
  handleSliderKeyDown,
  useManualTime,
  toggleTimeMode,
  inputValues,
  handleManualTimeChange,
  handleTimeIncrement,
  resetToCurrentTime,
  formatTwoDigits,
  formatPercentage,
}: SettingsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const initialFocusRef = useRef<HTMLButtonElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Local state for manual time inputs
  const [localInputValues, setLocalInputValues] = useState({
    hours: inputValues.hours,
    minutes: inputValues.minutes,
    seconds: inputValues.seconds,
  })

  // Update local values when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalInputValues({
        hours: inputValues.hours,
        minutes: inputValues.minutes,
        seconds: inputValues.seconds,
      })
    }
  }, [isOpen, inputValues])

  // Handle local time input changes
  const handleLocalTimeChange = (field: "hours" | "minutes" | "seconds", value: string) => {
    // Allow empty string during typing
    if (value === "") {
      setLocalInputValues((prev) => ({
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

    // Update local input values
    setLocalInputValues((prev) => ({
      ...prev,
      [field]: validValue,
    }))
  }

  // Apply the manual time changes
  const applyTimeChanges = () => {
    // Convert any string values to numbers
    const hours =
      typeof localInputValues.hours === "string"
        ? Number.parseInt(localInputValues.hours, 10) || 12
        : localInputValues.hours

    const minutes =
      typeof localInputValues.minutes === "string"
        ? Number.parseInt(localInputValues.minutes, 10) || 0
        : localInputValues.minutes

    const seconds =
      typeof localInputValues.seconds === "string"
        ? Number.parseInt(localInputValues.seconds, 10) || 0
        : localInputValues.seconds

    // Track the event
    trackButtonClick("Set Time", `${hours}:${minutes}:${seconds}`)

    // Update the application time
    handleManualTimeChange("hours", hours.toString())
    handleManualTimeChange("minutes", minutes.toString())
    handleManualTimeChange("seconds", seconds.toString())
  }

  // Handle local time increment/decrement
  const handleLocalTimeIncrement = (field: "hours" | "minutes" | "seconds", increment: boolean) => {
    // Get current value, ensuring it's a number
    const currentValue =
      typeof localInputValues[field] === "string"
        ? Number.parseInt(localInputValues[field] as string, 10) || 0
        : localInputValues[field]

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

    // Track the event
    trackButtonClick(`${field} ${increment ? "Increment" : "Decrement"}`, `${field}: ${newValue}`)

    // Update local input values
    setLocalInputValues((prev) => ({
      ...prev,
      [field]: newValue,
    }))
  }

  // Handle closing the modal with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown as any)
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown as any)
    }
  }, [isOpen, onClose])

  // Focus trap
  useEffect(() => {
    if (!isOpen) return

    const modal = modalRef.current
    if (!modal) return

    // Set initial focus to the heading
    if (headingRef.current) {
      headingRef.current.focus()
    }

    // Get all focusable elements
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    // Handle tab key to trap focus
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return

      if (e.shiftKey) {
        // If shift + tab and on first element, move to last element
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // If tab and on last element, move to first element
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    modal.addEventListener("keydown", handleTabKey as any)

    return () => {
      modal.removeEventListener("keydown", handleTabKey as any)
    }
  }, [isOpen])

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  // Enhanced toggle sound component with tracking
  const handleToggleSoundComponent = (component: keyof typeof soundToggles) => {
    trackButtonClick(`Toggle ${component}`, soundToggles[component] ? "Off" : "On")
    toggleSoundComponent(component)
  }

  // Enhanced toggle time mode with tracking
  const handleToggleTimeMode = () => {
    trackButtonClick("Toggle Time Mode", useManualTime ? "Real Time" : "Manual Time")
    toggleTimeMode()
  }

  // Enhanced reset to current time with tracking
  const handleResetToCurrentTime = () => {
    trackButtonClick("Reset to Current Time")
    resetToCurrentTime()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div
        ref={modalRef}
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-white/10 bg-gray-900 p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h1 id="settings-title" className="text-2xl font-bold" ref={headingRef} tabIndex={-1}>
            Settings
          </h1>
          <Button
            ref={initialFocusRef}
            onClick={() => {
              onClose()
              trackButtonClick("Settings Modal Close", "X Button")
            }}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-white/10"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-8">
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
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-full p-1 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                            aria-label="Reference tone information"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Background drone sound playing C3 continuously</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Slider
                    value={[soundVolumes.reference]}
                    max={1}
                    step={0.01}
                    onValueChange={(value) => {
                      handleSoundVolumeChange("reference", value)
                      trackButtonClick("Adjust Reference Volume", `${Math.round(value[0] * 100)}%`)
                    }}
                    className="w-full focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 group-focus-visible:ring-2 group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-gray-900"
                    disabled={!soundToggles.reference}
                  />
                </div>
                <Switch
                  id="reference-toggle"
                  checked={soundToggles.reference}
                  onCheckedChange={() => handleToggleSoundComponent("reference")}
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
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-full p-1 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                            aria-label="Hour tone information"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Background drone sound playing intervals in the C-Major scale based on the hour
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Slider
                    value={[soundVolumes.hour]}
                    max={1}
                    step={0.01}
                    onValueChange={(value) => {
                      handleSoundVolumeChange("hour", value)
                      trackButtonClick("Adjust Hour Volume", `${Math.round(value[0] * 100)}%`)
                    }}
                    className="w-full focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 group-focus-visible:ring-2 group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-gray-900"
                    disabled={!soundToggles.hour}
                  />
                </div>
                <Switch
                  id="hour-toggle"
                  checked={soundToggles.hour}
                  onCheckedChange={() => handleToggleSoundComponent("hour")}
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
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-full p-1 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                            aria-label="Minute tones information"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">"Bing-bong" tones for alternating tens and ones digits of minutes</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Slider
                    value={[soundVolumes.minute]}
                    max={1}
                    step={0.01}
                    onValueChange={(value) => {
                      handleSoundVolumeChange("minute", value)
                      trackButtonClick("Adjust Minute Volume", `${Math.round(value[0] * 100)}%`)
                    }}
                    className="w-full focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 group-focus-visible:ring-2 group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-gray-900"
                    disabled={!soundToggles.minute}
                  />
                </div>
                <Switch
                  id="minute-toggle"
                  checked={soundToggles.minute}
                  onCheckedChange={() => handleToggleSoundComponent("minute")}
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
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-full p-1 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                            aria-label="Second tones information"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Brief chirps for alternating tens and ones digits of seconds</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Slider
                    value={[soundVolumes.second]}
                    max={1}
                    step={0.01}
                    onValueChange={(value) => {
                      handleSoundVolumeChange("second", value)
                      trackButtonClick("Adjust Second Volume", `${Math.round(value[0] * 100)}%`)
                    }}
                    className="w-full focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 group-focus-visible:ring-2 group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-gray-900"
                    disabled={!soundToggles.second}
                  />
                </div>
                <Switch
                  id="second-toggle"
                  checked={soundToggles.second}
                  onCheckedChange={() => handleToggleSoundComponent("second")}
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
                  onValueChange={(value) => {
                    setMasterVolume(value[0])
                    trackButtonClick("Adjust Master Volume", `${Math.round(value[0] * 100)}%`)
                  }}
                  className="w-full focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 group-focus-visible:ring-2 group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Time Controls - Moved below Sound Controls */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-medium">Manual Time Control</h2>
                <span className="bg-amber-600/20 text-amber-400 text-xs px-2 py-0.5 rounded-md font-medium">BETA</span>
              </div>
              <Switch
                id="manual-time-toggle"
                checked={useManualTime}
                onCheckedChange={handleToggleTimeMode}
                aria-label="Toggle manual time control"
                className="focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="hours-input" className="text-xs whitespace-nowrap">
                  Hours (00-12)
                </Label>
                <div className="relative">
                  <Input
                    id="hours-input"
                    type="text"
                    inputMode="numeric"
                    value={formatTwoDigits(localInputValues.hours)}
                    onChange={(e) => handleLocalTimeChange("hours", e.target.value)}
                    disabled={!useManualTime}
                    className="bg-white/10 font-mono text-center text-lg focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                    maxLength={2}
                    aria-label="Hours"
                  />
                  {useManualTime && (
                    <div className="absolute right-0 top-0 flex h-full flex-col">
                      <button
                        type="button"
                        onClick={() => handleLocalTimeIncrement("hours", true)}
                        className="flex h-1/2 w-6 items-center justify-center rounded-tr-md border-l border-t border-white/10 bg-white/5 text-xs hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                        aria-label="Increase hours"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLocalTimeIncrement("hours", false)}
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
                <Label htmlFor="minutes-input" className="text-xs whitespace-nowrap">
                  Minutes (00-59)
                </Label>
                <div className="relative">
                  <Input
                    id="minutes-input"
                    type="text"
                    inputMode="numeric"
                    value={formatTwoDigits(localInputValues.minutes)}
                    onChange={(e) => handleLocalTimeChange("minutes", e.target.value)}
                    disabled={!useManualTime}
                    className="bg-white/10 font-mono text-center text-lg focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                    maxLength={2}
                    aria-labelledby="minutes-label"
                  />
                  <span id="minutes-label" className="sr-only">
                    Minutes
                  </span>
                  {useManualTime && (
                    <div className="absolute right-0 top-0 flex h-full flex-col">
                      <button
                        type="button"
                        onClick={() => handleLocalTimeIncrement("minutes", true)}
                        className="flex h-1/2 w-6 items-center justify-center rounded-tr-md border-l border-t border-white/10 bg-white/5 text-xs hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                        aria-label="Increase minutes"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLocalTimeIncrement("minutes", false)}
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
                <Label htmlFor="seconds-input" className="text-xs whitespace-nowrap">
                  Seconds (00-59)
                </Label>
                <div className="relative">
                  <Input
                    id="seconds-input"
                    type="text"
                    inputMode="numeric"
                    value={formatTwoDigits(localInputValues.seconds)}
                    onChange={(e) => handleLocalTimeChange("seconds", e.target.value)}
                    disabled={!useManualTime}
                    className="bg-white/10 font-mono text-center text-lg focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                    maxLength={2}
                    aria-labelledby="seconds-label"
                  />
                  <span id="seconds-label" className="sr-only">
                    Seconds
                  </span>
                  {useManualTime && (
                    <div className="absolute right-0 top-0 flex h-full flex-col">
                      <button
                        type="button"
                        onClick={() => handleLocalTimeIncrement("seconds", true)}
                        className="flex h-1/2 w-6 items-center justify-center rounded-tr-md border-l border-t border-white/10 bg-white/5 text-xs hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                        aria-label="Increase seconds"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLocalTimeIncrement("seconds", false)}
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
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    applyTimeChanges()
                    trackButtonClick(
                      "Settings - Set Time",
                      `${formatTwoDigits(localInputValues.hours)}:${formatTwoDigits(localInputValues.minutes)}:${formatTwoDigits(localInputValues.seconds)}`,
                    )
                  }}
                  className="flex items-center gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                  aria-label="Set time to specified values"
                  disabled={!useManualTime}
                >
                  <Clock className="h-4 w-4" />
                  Set Time
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetToCurrentTime()
                    trackButtonClick("Settings - Reset Time", "Current Time")
                  }}
                  className="flex items-center gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                  aria-label="Reset to current time"
                  disabled={!useManualTime}
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset to Current Time
                </Button>
              </div>
            )}

            <div className="mt-6">
              <h3 className="mb-2 text-lg font-medium">Instrument Guide</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-300">
                <li>Reference and hour tones: Background drone sounds</li>
                <li>Minutes: "Bing-bong" tones for alternating tens and ones digits</li>
                <li>Seconds: Brief chirps for alternating tens and ones digits</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom close button */}
        <div className="mt-8 flex justify-center">
          <Button
            onClick={() => {
              onClose()
              trackButtonClick("Settings Modal Close", "Bottom Button")
            }}
            variant="outline"
            size="lg"
            className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            aria-label="Close settings"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
