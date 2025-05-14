"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface IntervalLegendProps {
  alwaysExpanded?: boolean
}

export default function IntervalLegend({ alwaysExpanded = false }: IntervalLegendProps) {
  const [isOpen, setIsOpen] = useState(alwaysExpanded)

  const hourIntervals = [
    { hour: 1, interval: "Unison (C4)", description: "Same as reference tone" },
    { hour: 2, interval: "Major 2nd (D4)", description: "Whole step up" },
    { hour: 3, interval: "Major 3rd (E4)", description: "Bright, major quality" },
    { hour: 4, interval: "Perfect 4th (F4)", description: "Stable, foundational" },
    { hour: 5, interval: "Perfect 5th (G4)", description: "Strong, consonant" },
    { hour: 6, interval: "Major 6th (A4)", description: "Harmonious, sweet" },
    { hour: 7, interval: "Major 7th (B4)", description: "Tense, leading tone" },
    { hour: 8, interval: "Octave (C5)", description: "Same note, higher register" },
    { hour: 9, interval: "Major 9th (D5)", description: "Compound 2nd" },
    { hour: 10, interval: "Major 10th (E5)", description: "Compound 3rd" },
    { hour: 11, interval: "Perfect 11th (F5)", description: "Compound 4th" },
    { hour: 12, interval: "Perfect 12th (G5)", description: "Compound 5th" },
  ]

  const minuteIntervals = [
    { digit: 0, note: "None", description: "No tone plays" },
    { digit: 1, note: "C4", description: "1st scale degree" },
    { digit: 2, note: "D4", description: "2nd scale degree" },
    { digit: 3, note: "E4", description: "3rd scale degree" },
    { digit: 4, note: "F4", description: "4th scale degree" },
    { digit: 5, note: "G4", description: "5th scale degree" },
    { digit: 6, note: "A4", description: "6th scale degree" },
    { digit: 7, note: "B4", description: "7th scale degree" },
    { digit: 8, note: "C5", description: "8th scale degree (octave)" },
    { digit: 9, note: "D5", description: "9th scale degree" },
  ]

  const secondIntervals = [
    { digit: 0, note: "None", description: "No tone plays" },
    { digit: 1, note: "C5", description: "1st scale degree (higher octave)" },
    { digit: 2, note: "D5", description: "2nd scale degree" },
    { digit: 3, note: "E5", description: "3rd scale degree" },
    { digit: 4, note: "F5", description: "4th scale degree" },
    { digit: 5, note: "G5", description: "5th scale degree" },
    { digit: 6, note: "A5", description: "6th scale degree" },
    { digit: 7, note: "B5", description: "7th scale degree" },
    { digit: 8, note: "C6", description: "8th scale degree (octave)" },
    { digit: 9, note: "D6", description: "9th scale degree" },
  ]

  return (
    <div className="w-full rounded-lg border border-white/10 bg-white/5 p-4">
      {!alwaysExpanded && (
        <Button
          variant="ghost"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-lg font-medium">Interval Reference Guide</span>
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </Button>
      )}

      {alwaysExpanded && <h3 className="mb-4 text-lg font-medium">Interval Reference Guide</h3>}

      {(isOpen || alwaysExpanded) && (
        <Tabs defaultValue="hours" className={alwaysExpanded ? "" : "mt-4"}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="hours">Hour Intervals</TabsTrigger>
            <TabsTrigger value="minutes">Minute Notes</TabsTrigger>
            <TabsTrigger value="seconds">Second Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="hours" className="mt-2">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" aria-labelledby="hour-intervals-heading">
                <caption id="hour-intervals-heading" className="sr-only">
                  Hour Intervals Reference
                </caption>
                <thead>
                  <tr className="border-b border-white/10">
                    <th scope="col" className="py-2 px-2 text-left">
                      Hour
                    </th>
                    <th scope="col" className="py-2 px-2 text-left">
                      Interval
                    </th>
                    <th scope="col" className="py-2 px-2 text-left">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hourIntervals.map((item) => (
                    <tr key={item.hour} className="border-b border-white/10">
                      <td className="py-2 px-2">{item.hour}:00</td>
                      <td className="py-2 px-2">{item.interval}</td>
                      <td className="py-2 px-2 text-gray-300">{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="minutes" className="mt-2">
            <p className="mb-2 text-sm text-gray-300">
              The tens and ones digits of the minute each play their corresponding scale degree, alternating every
              second.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" aria-labelledby="minute-notes-heading">
                <caption id="minute-notes-heading" className="sr-only">
                  Minute Notes Reference
                </caption>
                <thead>
                  <tr className="border-b border-white/10">
                    <th scope="col" className="py-2 px-2 text-left">
                      Digit
                    </th>
                    <th scope="col" className="py-2 px-2 text-left">
                      Note
                    </th>
                    <th scope="col" className="py-2 px-2 text-left">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {minuteIntervals.map((item) => (
                    <tr key={item.digit} className="border-b border-white/10">
                      <td className="py-2 px-2">{item.digit}</td>
                      <td className="py-2 px-2">{item.note}</td>
                      <td className="py-2 px-2 text-gray-300">{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="seconds" className="mt-2">
            <p className="mb-2 text-sm text-gray-300">
              The tens and ones digits of the second each play their corresponding scale degree as pizzicato tones,
              alternating four times per second (0.25s each).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" aria-labelledby="second-notes-heading">
                <caption id="second-notes-heading" className="sr-only">
                  Second Notes Reference
                </caption>
                <thead>
                  <tr className="border-b border-white/10">
                    <th scope="col" className="py-2 px-2 text-left">
                      Digit
                    </th>
                    <th scope="col" className="py-2 px-2 text-left">
                      Note
                    </th>
                    <th scope="col" className="py-2 px-2 text-left">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {secondIntervals.map((item) => (
                    <tr key={item.digit} className="border-b border-white/10">
                      <td className="py-2 px-2">{item.digit}</td>
                      <td className="py-2 px-2">{item.note}</td>
                      <td className="py-2 px-2 text-gray-300">{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
