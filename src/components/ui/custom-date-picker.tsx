"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";

// Helper function to parse dd/mm/yyyy format
const parseManualDate = (dateStr: string): Date | null => {
  const trimmed = dateStr.trim();
  const parts = trimmed.split(/[\/\-]/);

  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const fullYear = year < 100 ? 2000 + year : year;
  const date = new Date(fullYear, month - 1, day);

  if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== fullYear) {
    return null;
  }

  return date;
};

interface CustomDatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CustomDatePicker({
  date,
  setDate,
  placeholder = "Pick a date",
  disabled = false,
  className = "",
}: CustomDatePickerProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [displayMonth, setDisplayMonth] = React.useState<Date | undefined>(date || new Date());

  // Sync displayMonth when date changes externally (but only when picker opens)
  React.useEffect(() => {
    if (date) {
      setDisplayMonth(date);
    }
  }, [date]);

  // Handle input change with auto-formatting
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^\d\/]/g, '');

    if (value.length === 2 && !value.includes('/')) {
      value = value + '/';
    } else if (value.length === 5 && value.split('/').length === 2 && !value.endsWith('/')) {
      const parts = value.split('/');
      if (parts[1].length === 2) {
        value = value + '/';
      }
    }

    if (value.length > 10) {
      value = value.substring(0, 10);
    }

    setInputValue(value);

    // Auto-navigate calendar to typed date
    const parsedDate = parseManualDate(value);
    if (parsedDate) {
      setDisplayMonth(parsedDate);
    }
  };

  // Handle Set button - save typed date
  const handleSetDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputValue) {
      const parsedDate = parseManualDate(inputValue);
      if (parsedDate) {
        setDate(parsedDate);
        setInputValue('');
      }
    }
  };

  // Handle calendar selection - save immediately
  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
  };

  // Handle Clear button - clear immediately
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDate(undefined);
    setInputValue('');
  };

  return (
    <div className={cn("flex flex-col items-start space-y-2 p-3", className)}>
      <Calendar
        mode="single"
        selected={date}
        month={displayMonth}
        onMonthChange={setDisplayMonth}
        onSelect={handleCalendarSelect}
        initialFocus
      />
      <div className="w-full space-y-2 border-t pt-2">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (inputValue) {
                  handleSetDate(e as any);
                } else if (date) {
                  handleClear(e as any);
                }
              }
            }}
            placeholder="dd/mm/yyyy"
            className="h-7 text-xs flex-1"
            onClick={(e) => e.stopPropagation()}
            maxLength={10}
          />
          {/* Smart button: Shows "Set" when typing, "Clear" when date exists, hidden when neither */}
          {inputValue ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSetDate}
              className="h-7 text-xs px-3"
            >
              Set
            </Button>
          ) : date ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="h-7 text-xs px-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
