import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { AlertTriangle, CalendarDays, Lock } from "lucide-react";
import { DateRange } from "react-day-picker";

export const DateRangePickerItem = ({
  startDate,
  endDate,
  onSelect,
  placeholder = 'Not set',
  isStatusComplete = false,
  showOverdue = true,
  minDate,
  maxDate,
  disabled = false,
  disabledMessage = "Dates rolled up from children",
  className = "w-48",
}: {
  startDate: string | null | undefined;
  endDate: string | null | undefined;
  onSelect: (range: DateRange | undefined) => void;
  placeholder?: string;
  isStatusComplete?: boolean;
  showOverdue?: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  disabledMessage?: string; 
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<DateRange | undefined>(
    startDate || endDate 
      ? { 
          from: startDate ? new Date(startDate) : undefined, 
          to: endDate ? new Date(endDate) : undefined 
        } 
      : undefined
  );
  const [month, setMonth] = useState<Date | undefined>(startDate ? new Date(startDate) : new Date());

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const isOverdue = showOverdue && !!(endDate && new Date(endDate) < todayStart) && !isStatusComplete;

  useEffect(() => {
    if (open) { 
      setSel(startDate || endDate ? { from: startDate ? new Date(startDate) : undefined, to: endDate ? new Date(endDate) : undefined } : undefined); 
      setMonth(startDate ? new Date(startDate) : new Date()); 
    }
  }, [open, startDate, endDate]);

  const triggerButton = (
    <button
      type="button"
      aria-disabled={disabled}
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      className={`inline-flex items-center justify-between gap-1.5 px-2.5 py-1 w-full bg-white dark:bg-gray-800 border ${isOverdue ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
        } rounded-md text-xs font-medium transition-colors ${disabled
          ? 'opacity-60 bg-gray-50 dark:bg-gray-900 pointer-events-none'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
        } text-gray-700 dark:text-gray-300`}
    >
      <span className="flex items-center gap-1.5 min-w-0">
        {isOverdue ? (
          <AlertTriangle className="w-3 h-3 shrink-0 text-red-500" />
        ) : disabled ? (
          <Lock className="w-3 h-3 shrink-0 text-gray-500 dark:text-gray-400" strokeWidth={2.5} />
        ) : (
          <CalendarDays className="w-3 h-3 shrink-0" />
        )}
        <span className="truncate">
          {startDate ? (
            endDate ? (
              `${format(new Date(startDate), 'LLL dd')} - ${format(new Date(endDate), 'LLL dd')}`
            ) : (
              format(new Date(startDate), 'LLL dd')
            )
          ) : <span className="text-gray-400">{placeholder}</span>}
        </span>
      </span>
    </button>
  );

  return (
    <Popover open={open} onOpenChange={(o) => { if (!disabled) setOpen(o); }}>
      {disabled ? (
        <HoverCard openDelay={200}>
          <HoverCardTrigger asChild>
            <div className={`cursor-not-allowed ${className}`}>
              <PopoverTrigger asChild>
                {triggerButton}
              </PopoverTrigger>
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-72 p-3" side="top" align="start" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-2.5">
                <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${isOverdue ? 'bg-red-400' : 'bg-gray-400'}`}>
                  {isOverdue ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-white dark:text-gray-900" strokeWidth={2.5} />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-white dark:text-gray-900" strokeWidth={2.5} />
                  )}
                </div>
                <div className="min-w-0 flex flex-col gap-1">
                  {isOverdue ? (
                    <>
                      <p className="text-sm font-semibold text-destructive">Overdue work</p>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{disabledMessage}</p>
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{disabledMessage}</p>
                  )}
                  {startDate && (
                    <div className="flex items-center gap-1.5 text-xs font-medium rounded-md border px-2 py-1 text-gray-700 dark:text-gray-300 w-fit">
                      <CalendarDays className="w-3 h-3 shrink-0" />
                      {endDate ? `${format(new Date(startDate), 'LLL dd')} - ${format(new Date(endDate), 'LLL dd')}` : format(new Date(startDate), 'LLL dd')}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">Update child items to adjust dates.</p>
                </div>
              </div>
          </HoverCardContent>
        </HoverCard>
      ) : (
        <PopoverTrigger asChild>
          <div className={className}>
            {triggerButton}
          </div>
        </PopoverTrigger>
      )}

      <PopoverContent className="w-auto p-0" align="start" side="bottom" avoidCollisions={true}>
        <Calendar 
          mode="range" 
          selected={sel} 
          month={month} 
          onMonthChange={setMonth} 
          onSelect={(d) => { 
            setSel(d); 
            onSelect(d); 
          }} 
          disabled={(day) => {
            if (minDate && day < minDate) return true;
            if (maxDate && day > maxDate) return true;
            return false;
          }}
          initialFocus 
        />
        <div className="p-2 border-t space-y-2">
          {(startDate || endDate) && (
            <button type="button" className="w-full text-xs text-red-500 hover:text-red-700 transition-colors text-center py-0.5" onClick={(e) => { e.stopPropagation(); onSelect(undefined); setOpen(false); }}>Clear dates</button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
