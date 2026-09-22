import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { AlertTriangle, CalendarDays, Lock } from "lucide-react";

export const parseManualDate = (s: string): Date | null => {
  const parts = s.trim().split(/[\/\-]/);
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if ([d, m, y].some(isNaN) || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const fullYear = y < 100 ? 2000 + y : y;
  const date = new Date(fullYear, m - 1, d);
  return date.getDate() === d && date.getMonth() === m - 1 ? date : null;
};

export const DatePickerItem = ({
  date,
  onSelect,
  placeholder = 'Not set',
  isStatusComplete = false,
  showOverdue = true,
  minDate,
  maxDate,
  disabled = false,
  disabledMessage = "Dates rolled up from children",
  className = "w-32",
}: {
  date: string | null | undefined;
  onSelect: (d: Date | undefined) => void;
  placeholder?: string;
  isStatusComplete?: boolean;
  showOverdue?: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  disabledMessage?: string; className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sel, setSel] = useState<Date | undefined>(date ? new Date(date) : undefined);
  const [month, setMonth] = useState<Date | undefined>(date ? new Date(date) : new Date());

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const isOverdue = showOverdue && !!(date && new Date(date) < todayStart) && !isStatusComplete;

  useEffect(() => {
    if (open) { setSel(date ? new Date(date) : undefined); setMonth(date ? new Date(date) : new Date()); setInput(''); }
  }, [open, date]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^\d\/]/g, '');
    if (v.length === 2 && !v.includes('/')) v += '/';
    else if (v.length === 5 && v.split('/').length === 2 && !v.endsWith('/') && v.split('/')[1].length === 2) v += '/';
    if (v.length > 10) v = v.slice(0, 10);
    setInput(v);
    const p = parseManualDate(v);
    if (p) { setSel(p); setMonth(p); }
  };

  const save = () => {
    if (!input) return;
    const p = parseManualDate(input);
    if (p) {
      if (minDate && p < minDate) return;
      if (maxDate && p > maxDate) return;
      onSelect(p); setInput(''); setOpen(false);
    }
  };

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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${className} bg-white dark:bg-gray-800 border ${isOverdue ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
        } rounded-md text-xs font-medium transition-colors ${disabled
          ? 'opacity-60 bg-gray-50 dark:bg-gray-900 pointer-events-none'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
        } text-gray-700 dark:text-gray-300`}
    >
      {isOverdue ? (
        <AlertTriangle className="w-3 h-3 shrink-0 text-red-500" />
      ) : disabled ? (
        <Lock className="w-3 h-3 shrink-0 text-gray-500 dark:text-gray-400" strokeWidth={2.5} />
      ) : (
        <CalendarDays className="w-3 h-3 shrink-0" />
      )}
      {date ? format(new Date(date), 'LLL dd, y') : <span className="text-gray-400">{placeholder}</span>}
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
                  {date && (
                    <div className="flex items-center gap-1.5 text-xs font-medium rounded-md border px-2 py-1 text-gray-700 dark:text-gray-300 w-fit">
                      <CalendarDays className="w-3 h-3 shrink-0" />
                      {format(new Date(date), 'LLL dd, y')}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">Update children to adjust dates.</p>
                </div>
              </div>
          </HoverCardContent>
        </HoverCard>
      ) : (
        <PopoverTrigger asChild>
          {triggerButton}
        </PopoverTrigger>
      )}

      <PopoverContent className="w-auto p-0" align="start" side="bottom" avoidCollisions={true}>
        <Calendar mode="single" selected={sel} month={month} onMonthChange={setMonth} onSelect={(d) => { if (d && minDate && d < minDate) return; if (d && maxDate && d > maxDate) return; setSel(d); onSelect(d); setOpen(false); }} disabled={(day) => { if (minDate && day < minDate) return true; if (maxDate && day > maxDate) return true; return false; }} initialFocus />
        <div className="p-2 border-t space-y-2">
          <div className="flex items-center gap-2">
            <Input type="text" value={input} onChange={handleInput} placeholder="dd/mm/yyyy" className="h-8 text-xs" maxLength={10} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }} onClick={(e) => e.stopPropagation()} />
            <Button size="sm" variant="outline" className="h-8 text-xs px-2" onClick={(e) => { e.stopPropagation(); save(); }} disabled={!input}>Set</Button>
          </div>
          {date && (
            <button type="button" className="w-full text-xs text-red-500 hover:text-red-700 transition-colors text-center py-0.5" onClick={(e) => { e.stopPropagation(); onSelect(undefined); setOpen(false); }}>Clear date</button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
