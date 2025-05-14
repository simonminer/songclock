"use client"

import { useEffect, useRef } from "react"

interface AnalogClockProps {
  hours: number
  minutes: number
  seconds: number
}

export default function AnalogClock({ hours, minutes, seconds }: AnalogClockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const size = 300
    canvas.width = size
    canvas.height = size
    const centerX = size / 2
    const centerY = size / 2
    const radius = size * 0.4

    // Clear canvas
    ctx.clearRect(0, 0, size, size)

    // Draw clock face
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw hour markers
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6
      const x1 = centerX + (radius - 10) * Math.sin(angle)
      const y1 = centerY - (radius - 10) * Math.cos(angle)
      const x2 = centerX + radius * Math.sin(angle)
      const y2 = centerY - radius * Math.cos(angle)

      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Draw minute markers
    for (let i = 0; i < 60; i++) {
      if (i % 5 !== 0) {
        const angle = (i * Math.PI) / 30
        const x1 = centerX + (radius - 5) * Math.sin(angle)
        const y1 = centerY - (radius - 5) * Math.cos(angle)
        const x2 = centerX + radius * Math.sin(angle)
        const y2 = centerY - radius * Math.cos(angle)

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    // Draw hour hand
    const hourAngle = ((hours % 12) * Math.PI) / 6 + (minutes * Math.PI) / (6 * 60)
    drawHand(ctx, centerX, centerY, radius * 0.5, hourAngle, 6, "rgba(255, 100, 100, 0.8)")

    // Draw minute hand
    const minuteAngle = (minutes * Math.PI) / 30 + (seconds * Math.PI) / (30 * 60)
    drawHand(ctx, centerX, centerY, radius * 0.7, minuteAngle, 4, "rgba(100, 255, 100, 0.8)")

    // Draw second hand
    const secondAngle = (seconds * Math.PI) / 30
    drawHand(ctx, centerX, centerY, radius * 0.8, secondAngle, 2, "rgba(100, 100, 255, 0.8)")

    // Draw center circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI)
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
    ctx.fill()
  }, [hours, minutes, seconds])

  const drawHand = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    length: number,
    angle: number,
    width: number,
    color: string,
  ) => {
    ctx.beginPath()
    ctx.lineWidth = width
    ctx.lineCap = "round"
    ctx.strokeStyle = color

    // Calculate hand coordinates
    const x = centerX + length * Math.sin(angle)
    const y = centerY - length * Math.cos(angle)

    // Draw the hand
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(x, y)
    ctx.stroke()

    // Draw a glow effect
    ctx.shadowColor = color
    ctx.shadowBlur = 10
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={300}
      className="rounded-full bg-gray-800/50 shadow-lg"
      aria-label="Analog clock"
    />
  )
}
