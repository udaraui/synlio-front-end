"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

/** Formats a date as yyyy-MM-dd without shifting it into UTC. */
export const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

/** Parses a yyyy-MM-dd string as a local date, without a UTC shift. */
export const parseIsoDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

export const formatDay = (date: Date) =>
  date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** Weekday options, keyed by the value `Date.getDay()` returns. */
export const WEEK_DAYS: { value: number; label: string }[] = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

export const weekDayLabel = (value: number | undefined) =>
  WEEK_DAYS.find((day) => day.value === value)?.label ?? "";

interface YearStartPickerProps {
  /** Weekday every week of the calendar starts on (`Date.getDay()` value). */
  weekStartDay: number;
  /** First date of the first week of the year. */
  value: Date | undefined;
  onChange: (yearStart: Date | undefined) => void;
  /** Called when the user confirms with OK. */
  onConfirm: () => void;
  className?: string;
}

/**
 * Picks the year start date.
 *
 * Only days matching the chosen week start weekday are selectable, and they
 * are tinted in every week so the candidates are obvious. Once one is picked,
 * the rest of its week is highlighted to show the resulting first week.
 */
export function YearStartPicker({
  weekStartDay,
  value,
  onChange,
  onConfirm,
  className,
}: YearStartPickerProps) {
  const [displayMonth, setDisplayMonth] = React.useState<Date>(
    value || new Date(),
  );

  React.useEffect(() => {
    if (value) setDisplayMonth(value);
  }, [value]);

  const weekEnd = value ? addDays(value, 6) : undefined;

  const isInSelectedWeek = (date: Date) =>
    !!value && !!weekEnd && date >= value && date <= weekEnd;

  return (
    <div className={cn("flex flex-col gap-2 p-3", className)}>
      <Calendar
        mode="single"
        selected={value}
        month={displayMonth}
        onMonthChange={setDisplayMonth}
        onSelect={(date) => onChange(date)}
        // Only the chosen weekday can start a year.
        disabled={(date) => date.getDay() !== weekStartDay}
        modifiers={{
          // Candidate week starts, excluding the picked week so the two
          // highlights never fight over the same day.
          weekStartDay: (date) =>
            date.getDay() === weekStartDay && !isInSelectedWeek(date),
          selectedWeek: (date) => isInSelectedWeek(date),
        }}
        modifiersClassNames={{
          weekStartDay:
            "bg-primary/10 text-primary font-medium rounded-md opacity-100!",
          selectedWeek: "bg-primary/25 text-foreground rounded-md opacity-100!",
        }}
        initialFocus
      />

      <div className="border-t pt-2 space-y-2">
        {value && weekEnd ? (
          <div className="text-[11px] leading-4">
            <p className="font-medium">Week 1</p>
            <p className="text-muted-foreground">
              {formatDay(value)} &ndash; {formatDay(weekEnd)}
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Pick a highlighted {weekDayLabel(weekStartDay)} to start the year.
          </p>
        )}

        <div className="flex justify-end gap-2">
          {value && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
              onClick={() => onChange(undefined)}
            >
              Clear
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="h-7 px-4 text-[11px]"
            disabled={!value}
            onClick={onConfirm}
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}

export default YearStartPicker;
