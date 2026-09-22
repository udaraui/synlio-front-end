"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronsLeft, Users, Video, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format, add, getWeek, getQuarter } from 'date-fns';
import { Meeting } from '@/services/meetings-integration.service';

const providerInfo: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  teams: { label: 'Teams', color: '#6264A7', icon: Users },
  google_meet: { label: 'Google', color: '#00A783', icon: Video },
  zoom: { label: 'Zoom', color: '#2D8CFF', icon: Video },
  slack: { label: 'Slack', color: '#4A154B', icon: Users },
  internal: { label: 'Internal', color: '#8b5cf6', icon: Users },
};

export interface DayCount {
  tasks: number;
  tickets: number;
  meetings: number;
}
export type DayCountsMap = Record<string, DayCount>;

const LEGEND_ITEMS = [
  { key: "tasks", label: "Tasks", bg: "bg-emerald-500" },
  { key: "tickets", label: "Tickets", bg: "bg-blue-500" },
  { key: "meetings", label: "Meetings", bg: "bg-purple-500" },
] as const;

function DotBadge({ count, bg }: { count: number; bg: string }) {
  if (count === 0) return null;
  return <span className={cn("block w-2 h-2 rounded-full flex-shrink-0", bg)} />;
}

const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

interface Props {
  selectedDates?: string[];
  onDatesSelect: (dates: string[]) => void;
  dayCountsMap?: DayCountsMap;
  loading?: boolean;
  /** Called when the visible window changes so the parent can re-fetch dots. */
  onRangeChange?: (from: string, to: string) => void;
  meetingsData?: Meeting[];
}

type ViewMode = '14-day' | '1-month' | 'quarter' | 'custom';

export default function WeekCalendar({
  selectedDates = [],
  onDatesSelect,
  dayCountsMap = {},
  loading,
  onRangeChange,
  meetingsData = [],
}: Props) {

  const [viewMode, setViewMode] = useState<ViewMode>('14-day');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(() => {
    const fromDate = new Date();
    fromDate.setHours(0, 0, 0, 0);
    return {
      from: fromDate,
      to: add(fromDate, { days: 13 }),
    };
  });
  const [windowOffset, setWindowOffset] = useState(0);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayStr = useMemo(() => toDateStr(today), [today]);
  const windowStart = useMemo(() => {
    const d = new Date(today);
    if (viewMode === '14-day') d.setDate(today.getDate() + windowOffset * 14);
    if (viewMode === '1-month') d.setMonth(today.getMonth() + windowOffset);
    if (viewMode === 'quarter') d.setFullYear(today.getFullYear() + windowOffset);
    return d;
  }, [today, windowOffset, viewMode]);

  useEffect(() => {
    setWindowOffset(0);
    onDatesSelect([]);
  }, [viewMode, onDatesSelect]);

  useEffect(() => {
    let start: Date, end: Date;
    switch (viewMode) {
      case '1-month':
        start = new Date(windowStart.getFullYear(), windowStart.getMonth(), 1);
        end = new Date(windowStart.getFullYear(), windowStart.getMonth() + 1, 0);
        break;
      case 'quarter':
        start = new Date(windowStart.getFullYear(), 0, 1);
        end = new Date(windowStart.getFullYear(), 11, 31);
        break;
      case 'custom':
        if (customDateRange?.from && customDateRange.to) {
          start = customDateRange.from;
          end = customDateRange.to;
        } else {
          return;
        }
        break;
      default: // 14-day
        start = windowStart;
        end = add(windowStart, { days: 13 });
    }
    onRangeChange?.(toDateStr(start), toDateStr(end));
  }, [viewMode, windowStart, customDateRange, onRangeChange]);

  const handleNavigate = useCallback((direction: 1 | -1) => {
    setWindowOffset(prev => Math.max(0, prev + direction));
  }, []);

  const handleGoToToday = useCallback(() => {
    setWindowOffset(0);
    onDatesSelect([]);
  }, [onDatesSelect]);

  const handleDateClick = (dates: string[]) => {
    const currentSelection = new Set(selectedDates);
    const allSelected = dates.every(d => currentSelection.has(d));

    if (allSelected) {
      dates.forEach(d => currentSelection.delete(d));
    } else {
      dates.forEach(d => currentSelection.add(d));
    }
    onDatesSelect(Array.from(currentSelection));
  };

  const canGoPrev = windowOffset > 0;

  const renderCalendarGrid = () => {
    switch (viewMode) {
      case '1-month': {
        const weeks = Array.from({ length: 4 }, (_, i) => {
          const start = add(windowStart, { weeks: i });
          const end = add(start, { days: 6 });
          return { label: `Week ${i + 1}`, start, end };
        });
        return (
          <div className="grid gap-1.5 flex-1 min-w-0" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            {weeks.map(({ label, start, end }) => {
              const weekDates = Array.from({ length: 7 }, (_, i) => toDateStr(add(start, { days: i })));
              const isSelected = weekDates.every(d => selectedDates.includes(d));
              const isCurrentWeek = getWeek(today) === getWeek(start);
              const counts = weekDates.reduce((acc, dateStr) => {
                const dayCount = dayCountsMap[dateStr] ?? { tasks: 0, tickets: 0, meetings: 0 };
                acc.tasks += dayCount.tasks;
                acc.tickets += dayCount.tickets;
                acc.meetings += dayCount.meetings;
                return acc;
              }, { tasks: 0, tickets: 0, meetings: 0 });

              return (
                <button key={label} onClick={() => handleDateClick(weekDates)} className={cn("flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-all border h-full", isSelected ? "border-primary text-primary" : isCurrentWeek ? "border-gray-400" : "border-border", isCurrentWeek ? "bg-gray-50" : "bg-muted/30 hover:bg-gray-100 dark:hover:bg-muted")}>
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-xs text-muted-foreground">{format(start, 'MMM d')} - {format(end, 'MMM d')}</span>
                  <div className="flex items-center justify-center gap-0.5 pt-0.5 h-2.5">
                    <DotBadge count={counts.tasks} bg={LEGEND_ITEMS[0].bg} />
                    <DotBadge count={counts.tickets} bg={LEGEND_ITEMS[1].bg} />
                    <DotBadge count={counts.meetings} bg={LEGEND_ITEMS[2].bg} />
                  </div>
                </button>
              );
            })}
          </div>
        );
      }
      case 'quarter': {
        const quarters = [
          { label: 'Q1', start: new Date(windowStart.getFullYear(), 0, 1), end: new Date(windowStart.getFullYear(), 2, 31) },
          { label: 'Q2', start: new Date(windowStart.getFullYear(), 3, 1), end: new Date(windowStart.getFullYear(), 5, 30) },
          { label: 'Q3', start: new Date(windowStart.getFullYear(), 6, 1), end: new Date(windowStart.getFullYear(), 8, 30) },
          { label: 'Q4', start: new Date(windowStart.getFullYear(), 9, 1), end: new Date(windowStart.getFullYear(), 11, 31) },
        ];
        return (
          <div className="grid gap-1.5 flex-1 min-w-0" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            {quarters.map(({ label, start, end }) => {
              const quarterDates = Array.from({ length: (end.getTime() - start.getTime()) / (1000 * 3600 * 24) + 1 }, (_, i) => toDateStr(add(start, { days: i })));
              const isSelected = quarterDates.every(d => selectedDates.includes(d));
              const isCurrentQuarter = getQuarter(today) === getQuarter(start);
              const counts = quarterDates.reduce((acc, dateStr) => {
                const dayCount = dayCountsMap[dateStr] ?? { tasks: 0, tickets: 0, meetings: 0 };
                acc.tasks += dayCount.tasks;
                acc.tickets += dayCount.tickets;
                acc.meetings += dayCount.meetings;
                return acc;
              }, { tasks: 0, tickets: 0, meetings: 0 });

              return (
                <button key={label} onClick={() => handleDateClick(quarterDates)} className={cn("flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-all border h-full", isSelected ? "border-primary text-primary" : isCurrentQuarter ? "border-gray-400" : "border-border", isCurrentQuarter ? "bg-gray-50" : "bg-muted/30 hover:bg-gray-100 dark:hover:bg-muted")}>
                  <span className="text-lg font-bold">{label}</span>
                  <span className="text-xs text-muted-foreground">{format(start, 'MMM d')} - {format(end, 'MMM d')}</span>
                  <div className="flex items-center justify-center gap-0.5 pt-0.5 h-2.5">
                    <DotBadge count={counts.tasks} bg={LEGEND_ITEMS[0].bg} />
                    <DotBadge count={counts.tickets} bg={LEGEND_ITEMS[1].bg} />
                    <DotBadge count={counts.meetings} bg={LEGEND_ITEMS[2].bg} />
                  </div>
                </button>
              );
            })}
          </div>
        );
      }
      case '14-day':
      default:
        const days = Array.from({ length: 14 }, (_, i) => add(windowStart, { days: i }));
        return (
          <div className="grid gap-1.5 flex-1 min-w-0" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
            {days.map((day) => {
              const dateStr = toDateStr(day);
              const isToday = dateStr === todayStr;
              const isSelected = selectedDates.includes(dateStr);
              const counts = dayCountsMap[dateStr] ?? { tasks: 0, tickets: 0, meetings: 0 };
              const dayLetter = day.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3).toUpperCase();

              return (
                <button key={dateStr} onClick={() => handleDateClick([dateStr])} className={cn("flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all border", isSelected ? "border-primary text-primary" : isToday ? 'border-gray-400' : "border-border", isToday ? "" : "bg-muted/30 hover:bg-gray-100 dark:hover:bg-muted/50")}>
                  <span className={cn("text-[10px] font-semibold leading-none", isSelected ? "text-primary" : "text-muted-foreground")}>{isToday ? "TODAY" : dayLetter}</span>
                  <span className={cn("text-xl font-bold leading-none", isSelected ? "text-primary" : "")}>{day.getDate()}</span>
                  <div className="flex items-center justify-center gap-0.5 pt-0.5 h-2">
                    {loading ? <span className="block w-2 h-2 rounded-full border border-muted-foreground/40 border-t-muted-foreground/80 animate-spin" /> : (
                      <>
                        <DotBadge count={counts.tasks} bg={LEGEND_ITEMS[0].bg} />
                        <DotBadge count={counts.tickets} bg={LEGEND_ITEMS[1].bg} />
                        {counts.meetings > 0 ? (
                          <div onClick={e => e.stopPropagation()}>
                            <HoverCard openDelay={100} closeDelay={100}>
                              <HoverCardTrigger asChild>
                                <div className="cursor-pointer py-1">
                                  <DotBadge count={counts.meetings} bg={LEGEND_ITEMS[2].bg} />
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent side="top" align="center" className="w-64 p-3 z-[60] text-left shadow-lg">
                                <div className="flex flex-col gap-3">
                                  <span className="text-sm font-semibold pb-1 border-b text-foreground">Meetings ({counts.meetings})</span>
                                  <div className="flex flex-col gap-2.5 max-h-[250px] overflow-y-auto pr-1">
                                    {meetingsData.filter(m => m.effectiveStartTime?.startsWith(dateStr)).map(m => {
                                      const provider = providerInfo[m.provider] || { label: m.provider, color: '#888', icon: Video };
                                      const Icon = provider.icon;
                                      const sTime = new Date(m.effectiveStartTime!).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                                      const eTime = m.effectiveEndTime ? new Date(m.effectiveEndTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;

                                      return (
                                        <div key={m.id} className="flex flex-col gap-1 rounded-md bg-muted/30 p-2 border">
                                          <div className="flex items-start justify-between gap-2">
                                            <span className="font-medium text-foreground text-xs leading-tight">{m.title}</span>
                                            <div className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold border" style={{ color: provider.color, borderColor: `${provider.color}30`, backgroundColor: `${provider.color}10` }}>
                                              <Icon className="h-2.5 w-2.5" />
                                              {provider.label}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                                            <div className="flex items-center gap-1">
                                              <Clock className="h-3 w-3" />
                                              <span>{sTime}{eTime ? ` - ${eTime}` : ''}</span>
                                            </div>
                                            {m.attendees?.length > 0 && (
                                              <div className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                <span>{m.attendees.length}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          </div>
                        ) : (
                          <DotBadge count={counts.meetings} bg={LEGEND_ITEMS[2].bg} />
                        )}
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <div className="flex w-fit gap-1 rounded-md border p-0.5 bg-background shadow-shrink-0">
            <Button
              size="sm"
              className="h-6 text-xs px-2.5"
              variant={viewMode === '14-day' ? 'default' : 'ghost'}
              onClick={() => {
                setViewMode('14-day');
                setCustomDateRange({ from: windowStart, to: add(windowStart, { days: 13 }) });
              }}
            >
              14 Days
            </Button>
            {/*<Button size="sm" className="h-6 text-xs px-2.5" variant={viewMode === '1-month' ? 'default' : 'ghost'} onClick={() => setViewMode('1-month')}>1 Month</Button>*/}
            {/*<Button size="sm" className="h-6 text-xs px-2.5" variant={viewMode === 'quarter' ? 'default' : 'ghost'} onClick={() => setViewMode('quarter')}>Quarter</Button>*/}
            <Button
              size="sm"
              className="h-6 text-xs px-2.5"
              variant={viewMode === 'custom' ? 'default' : 'ghost'}
              onClick={() => {
                if (viewMode !== 'custom') {
                  setCustomDateRange({ from: windowStart, to: add(windowStart, { days: 13 }) });
                }
                setViewMode('custom');
              }}
            >
              {/*<CalendarIcon />Custom*/}
              Custom
            </Button>
          </div>
        </div>

        {/* Legend and Unselect All */}
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedDates.length > 0 && (
            <button onClick={() => onDatesSelect([])} className="text-xs font-semibold text-primary hover:underline mr-2">Unselect All</button>
          )}
          {LEGEND_ITEMS.map((item) => {
            const total = loading ? null : Object.values(dayCountsMap).reduce((sum, counts) => sum + counts[item.key as keyof DayCount], 0);
            return (
              <div key={item.key} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border text-xs font-medium">
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", item.bg)} />
                <span className="text-foreground">{item.label}</span>
                {loading ? <span className="w-2 h-2 rounded bg-muted-foreground/20 animate-pulse inline-block" /> : <span className="text-muted-foreground font-semibold">{total}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day row — all 14 days in ONE row with prev/next arrows */}
      <div className="h-[68px] flex items-center">
        {viewMode === 'custom' ? (
          <div className="p-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !customDateRange && "text-muted-foreground"
                  )}
                >
                  {/*<CalendarIcon className="mr-2 h-4 w-4" />*/}
                  {customDateRange?.from ? (
                    customDateRange.to ? (
                      <>
                        {format(customDateRange.from, "LLL dd, y")} -{" "}
                        {format(customDateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(customDateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={customDateRange?.from}
                  selected={customDateRange}
                  onSelect={setCustomDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <div className="flex items-stretch gap-1 flex-1">
            {/* Prev arrows: << on top, < below — stacked in same column */}
            <div className="flex flex-col items-center justify-center gap-1 shrink-0">
              <button onClick={handleGoToToday} disabled={!canGoPrev} title="Jump to today" className={cn("flex items-center justify-center p-0.5 rounded transition-all leading-none", canGoPrev ? "text-foreground hover:text-gray-500" : "text-muted-foreground/20 cursor-not-allowed pointer-events-none")}>
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button onClick={() => handleNavigate(-1)} disabled={!canGoPrev} title="Previous period" className={cn("flex items-center justify-center p-0.5 rounded transition-all leading-none", canGoPrev ? "text-foreground hover:text-gray-500" : "text-muted-foreground/20 cursor-not-allowed")}>
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            {renderCalendarGrid()}

            {/* Next arrow */}
            <button onClick={() => handleNavigate(1)} title="Next period" className="flex items-center justify-center rounded-lg hover:text-gray-500 text-foreground transition-all shrink-0">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
