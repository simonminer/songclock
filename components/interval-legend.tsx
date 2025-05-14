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
    { hour: 1, interval: "Unison (C3)", description: "Same as reference tone" },
    { hour: 2, interval: "Major 2nd (D3)", description: "Whole step up" },
    { hour: 3, interval: "Major 3rd (E3)", description: "Bright, major quality" },
    { hour: 4, interval: "Perfect 4th (F3)", description: "Stable, foundational" },
    { hour: 5, interval: "Perfect 5th (G3)", description: "Strong, consonant" },
    { hour: 6, interval: "Major 6th (A3)", description: "Harmonious, sweet" },
    { hour: 7, interval: "Major 7th (B3)", description: "Tense, leading tone" },
    { hour: 8, interval: "Octave (C4)", description: "Same note, higher register" },
    { hour: 9, interval: "Major 9th (D4)", description: "Compound 2nd" },
    { hour: 10, interval: "Major 10th (E4)", description: "Compound 3rd" },
    { hour: 11, interval: "Perfect 11th (F4)", description: "Compound 4th" },
    { hour: 12, interval: "Perfect 12th (G4)", description: "Compound 5th" },
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
          <span className="text-lg font-medium">How to Listen to the Time</span>
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </Button>
      )}

      {alwaysExpanded && <h3 className="mb-2 text-lg font-medium">Interval Reference Guide</h3>}
      {alwaysExpanded && (
        <p className="mb-4 text-sm text-gray-300 italic">
          Press a tab heading below to learn about each type of sound.
        </p>
      )}

      {(isOpen || alwaysExpanded) && (
        <Tabs defaultValue="hours" className={alwaysExpanded ? "" : "mt-4"}>
          <TabsList className="grid w-full grid-cols-3 bg-gray-900 p-0.5 rounded-md">
            <TabsTrigger
              value="hours"
              className="mx-0.5 first:ml-0 last:mr-0 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=inactive]:text-white/90 data-[state=inactive]:bg-gray-800"
            >
              Hour Intervals
            </TabsTrigger>
            <TabsTrigger
              value="minutes"
              className="mx-0.5 first:ml-0 last:mr-0 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=inactive]:text-white/90 data-[state=inactive]:bg-gray-800"
            >
              Minute Notes
            </TabsTrigger>
            <TabsTrigger
              value="seconds"
              className="mx-0.5 first:ml-0 last:mr-0 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=inactive]:text-white/90 data-[state=inactive]:bg-gray-800"
            >
              Second Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hours" className="mt-2">
            <p className="mb-2 text-sm text-gray-300">
              Each hour is represented as a specific musical interval relative to the reference tone (C3). The hour tone
              plays continuously as an ambient pad with reverb.
            </p>
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
              The tens and ones digits of the minute are each represented by their own notes in the C-Major scale. These
              tones alternate every second, with the tens digit playing on even seconds and the ones digit playing on
              odd seconds.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Tens Digit (0-5)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" aria-labelledby="minute-tens-heading">
                    <caption id="minute-tens-heading" className="sr-only">
                      Minute Tens Digit Notes
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
                      {minuteIntervals.slice(0, 6).map((item) => (
                        <tr key={`tens-${item.digit}`} className="border-b border-white/10">
                          <td className="py-2 px-2">{item.digit}</td>
                          <td className="py-2 px-2">{item.note}</td>
                          <td className="py-2 px-2 text-gray-300">{item.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Ones Digit (0-9)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" aria-labelledby="minute-ones-heading">
                    <caption id="minute-ones-heading" className="sr-only">
                      Minute Ones Digit Notes
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
                        <tr key={`ones-${item.digit}`} className="border-b border-white/10">
                          <td className="py-2 px-2">{item.digit}</td>
                          <td className="py-2 px-2">{item.note}</td>
                          <td className="py-2 px-2 text-gray-300">{item.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-300">
              <strong>Example:</strong> For 35 minutes, the tens digit (3) plays E4 on even seconds, and the ones digit
              (5) plays G4 on odd seconds.
            </p>
          </TabsContent>

          <TabsContent value="seconds" className="mt-2">
            <p className="mb-2 text-sm text-gray-300">
              The tens and ones digits of the second are each represented by their own notes in a higher octave of the
              C-Major scale. These tones alternate rapidly (four times per second), with the tens digit playing on even
              quarter-seconds and the ones digit playing on odd quarter-seconds.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Tens Digit (0-5)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" aria-labelledby="second-tens-heading">
                    <caption id="second-tens-heading" className="sr-only">
                      Second Tens Digit Notes
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
                      {secondIntervals.slice(0, 6).map((item) => (
                        <tr key={`tens-${item.digit}`} className="border-b border-white/10">
                          <td className="py-2 px-2">{item.digit}</td>
                          <td className="py-2 px-2">{item.note}</td>
                          <td className="py-2 px-2 text-gray-300">{item.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Ones Digit (0-9)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" aria-labelledby="second-ones-heading">
                    <caption id="second-ones-heading" className="sr-only">
                      Second Ones Digit Notes
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
                        <tr key={`ones-${item.digit}`} className="border-b border-white/10">
                          <td className="py-2 px-2">{item.digit}</td>
                          <td className="py-2 px-2">{item.note}</td>
                          <td className="py-2 px-2 text-gray-300">{item.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-300">
              <strong>Example:</strong> For 42 seconds, the tens digit (4) plays F5 on even quarter-seconds, and the
              ones digit (2) plays D5 on odd quarter-seconds.
            </p>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
