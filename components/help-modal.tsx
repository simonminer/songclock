"use client"

import { useEffect, useRef } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import IntervalLegend from "@/components/interval-legend"

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const initialFocusRef = useRef<HTMLButtonElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Handle closing the modal with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
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

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
    >
      <div
        ref={modalRef}
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-white/10 bg-gray-900 p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="help-title" className="text-2xl font-bold" ref={headingRef} tabIndex={-1}>
            Help
          </h2>
          <Button
            ref={initialFocusRef}
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-white/10"
            aria-label="Close help"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="mb-2 text-xl font-medium">How to Use SongClock</h3>
            <p className="mb-4 text-gray-300">
              SongClock is an ear training tool that helps you learn to tell time by listening to musical intervals.
              Each component of time (hours, minutes, seconds) is represented by different musical tones.
            </p>
            <ol className="list-decimal space-y-2 pl-5 text-gray-300">
              <li>
                <strong>Press Play</strong> to start hearing the musical representation of the current time.
              </li>
              <li>
                <strong>Listen to the tones</strong> - each part of the time has a distinct sound and pattern.
              </li>
              <li>
                <strong>Use the Settings</strong> to adjust volumes or set a manual time to practice specific times.
              </li>
              <li>
                <strong>Watch the musical notation</strong> to see how the sounds are represented visually.
              </li>
            </ol>
          </section>

          <section>
            <h3 className="mb-2 text-xl font-medium">Sound Components</h3>
            <ul className="list-disc space-y-1 pl-5 text-gray-300">
              <li>
                <strong>Reference Tone:</strong> Ambient pad playing C3 with reverb (continuous background)
              </li>
              <li>
                <strong>Hour Tone:</strong> Ambient pad playing intervals in the C-Major scale based on the hour
              </li>
              <li>
                <strong>Minute Tones:</strong> Piano-like tones for alternating tens and ones digits of minutes
              </li>
              <li>
                <strong>Second Tones:</strong> Vibraphone-like tones for alternating tens and ones digits of seconds
              </li>
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-xl font-medium">Interval Reference Guide</h3>
            <p className="mb-4 text-gray-300">
              The guide below shows the musical intervals used for each hour, minute, and second.
            </p>
            <IntervalLegend alwaysExpanded />
          </section>

          <section>
            <h3 className="mb-2 text-xl font-medium">Keyboard Shortcuts</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-gray-300">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-2 px-4 text-left">Key</th>
                    <th className="py-2 px-4 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/10">
                    <td className="py-2 px-4">
                      <kbd className="bg-gray-800 px-2 py-1 rounded">p</kbd>
                    </td>
                    <td className="py-2 px-4">Play/Pause sound</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-2 px-4">
                      <kbd className="bg-gray-800 px-2 py-1 rounded">s</kbd>
                    </td>
                    <td className="py-2 px-4">Show/Hide music staff</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-2 px-4">
                      <kbd className="bg-gray-800 px-2 py-1 rounded">?</kbd>
                    </td>
                    <td className="py-2 px-4">Open help modal</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-2 px-4">
                      <kbd className="bg-gray-800 px-2 py-1 rounded">,</kbd>
                    </td>
                    <td className="py-2 px-4">Open settings modal</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-2 px-4">
                      <kbd className="bg-gray-800 px-2 py-1 rounded">Escape</kbd>
                    </td>
                    <td className="py-2 px-4">Close open modals</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-2 px-4">
                      <kbd className="bg-gray-800 px-2 py-1 rounded">↑</kbd>{" "}
                      <kbd className="bg-gray-800 px-2 py-1 rounded">↓</kbd>{" "}
                      <kbd className="bg-gray-800 px-2 py-1 rounded">←</kbd>{" "}
                      <kbd className="bg-gray-800 px-2 py-1 rounded">→</kbd>
                    </td>
                    <td className="py-2 px-4">Adjust values when focused on sliders</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4">
                      <kbd className="bg-gray-800 px-2 py-1 rounded">Tab</kbd>
                    </td>
                    <td className="py-2 px-4">Navigate between interactive elements</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
