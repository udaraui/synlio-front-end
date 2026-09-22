"use client"

import * as React from "react"
import { addDays, format } from "date-fns"
import { type DateRange } from "react-day-picker"

import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"

type RangeValue = { start?: string | null; end?: string | null }

export default function CalendarRange({ value, onChange }: { value: RangeValue; onChange: (v: RangeValue) => void }) {
  const selected: DateRange | undefined = value?.start || value?.end
    ? {
        from: value?.start ? new Date(value.start) : undefined,
        to: value?.end ? new Date(value.end) : undefined,
      }
    : undefined

  const [internal, setInternal] = React.useState<DateRange | undefined>(selected)

  React.useEffect(() => {
    setInternal(selected)
  }, [value?.start, value?.end])

  const handleSelect = (range: DateRange | undefined) => {
    setInternal(range)
    const out: RangeValue = {
      start: range?.from ? format(range.from, "yyyy-MM-dd") : null,
      end: range?.to ? format(range.to, "yyyy-MM-dd") : null,
    }
    onChange(out)
  }

  return (
    <Card className="mx-auto w-fit p-0">
      <CardContent className="p-0">
        <Calendar
          mode="range"
          defaultMonth={internal?.from}
          selected={internal}
          onSelect={handleSelect}
          numberOfMonths={2}
          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
        />
      </CardContent>
    </Card>
  )
}
