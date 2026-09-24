"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar as ShadCalendar } from "@/components/ui/calendar";
import { Calendar } from "@/interfaces/calendar";
import {
  CalendarPlus,
  Plus,
  Circle,
  CircleDashed,
  Umbrella,
  Briefcase,
  Trash,
  Undo2,
  Info,
  X,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  deleteHolidaysAndWorkingDays,
  getAllCalendarDays,
} from "@/services/resource-management/calendar-services";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { toast } from "sonner";
import HolidayWorkingDayDrawer from "./formDrawers/holiday_workingDay";
import DeleteModal from "@/components/DeleteModal";
import type { DayProps } from "react-day-picker";
import {
  buildWeekendBaseTypes,
  isPastDate,
  resolveDayState,
  startOfDay,
  weekendBaseTypeOf,
} from "@/lib/calendar-day-state";

interface CalendarViewPanelProps {
  calendar: Calendar;
  setLegendStats?: (stats: { working: number; holidays: number; weekends: number; canView: boolean; loading: boolean }) => void;
}

type ViewMode = "month" | "three";

/**
 * One palette per day state. `full` paints the whole cell, `half` sets the
 * colour the diagonal overlay uses — both resolve to the same token, so a half
 * day is the same colour as a full one and only differs in shape.
 */
const DAY_PALETTE = {
  HOLIDAY: {
    full: "bg-red-300 hover:bg-red-400 text-red-950 dark:bg-red-500/60 dark:hover:bg-red-500/80 dark:text-white font-bold",
    half: "[--half-color:var(--color-red-300)] hover:[--half-color:var(--color-red-400)] dark:[--half-color:color-mix(in_oklab,var(--color-red-500)_60%,transparent)] dark:hover:[--half-color:color-mix(in_oklab,var(--color-red-500)_80%,transparent)] text-red-950 dark:text-white font-bold",
  },
  WEEKEND: {
    full: "bg-red-100 hover:bg-red-200 text-red-900 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-200 font-semibold",
    half: "[--half-color:var(--color-red-100)] hover:[--half-color:var(--color-red-200)] dark:[--half-color:color-mix(in_oklab,var(--color-red-900)_30%,transparent)] dark:hover:[--half-color:color-mix(in_oklab,var(--color-red-900)_50%,transparent)] text-red-900 dark:text-red-200 font-semibold",
  },
  SPECIAL_WORKING: {
    full: "bg-green-100 hover:bg-green-200 text-green-900 dark:bg-green-800/40 dark:hover:bg-green-800/60 dark:text-green-200 font-semibold",
    half: "[--half-color:var(--color-green-100)] hover:[--half-color:var(--color-green-200)] dark:[--half-color:color-mix(in_oklab,var(--color-green-800)_40%,transparent)] dark:hover:[--half-color:color-mix(in_oklab,var(--color-green-800)_60%,transparent)] text-green-900 dark:text-green-200 font-semibold",
  },
} as const;

const HALF_DAY_BACKGROUND =
  "linear-gradient(225deg, var(--half-color) 50%, transparent 50%)";

/** One button offered for the selected day. */
interface DayAction {
  key: string;
  label: string;
  variant: "default" | "outline" | "destructive";
  icon?: React.ElementType;
  dashed?: boolean;
  onClick: () => void;
}

interface SelectedDayCardProps {
  selected: Date | undefined;
  info: any;
  actions: DayAction[];
  /** Why no action is offered, when that is the case. */
  actionNote?: string;
  vertical: boolean;
  onGoToToday?: () => void;
}

const SelectedDayCard: React.FC<SelectedDayCardProps> = ({
  selected,
  info,
  actions,
  actionNote,
  vertical,
  onGoToToday,
}) => {
  if (!selected) {
    return (
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Selected Day
        </p>
        <p className="text-xs text-muted-foreground text-center py-4">
          Select a date to view details
        </p>
      </div>
    );
  }

  const infoState = info ? resolveDayState(info) : undefined;
  const statusLabel = infoState?.baseLabel ?? "Working day";
  const statusClass = infoState?.badgeClass ?? "";

  const dotColor =
    infoState?.key === "SPECIAL_WORKING"
      ? "#22c55e"
      : infoState?.key === "HOLIDAY"
        ? "rgba(248, 113, 113, 0.8)"
        : infoState?.key === "WEEKEND"
          ? "rgba(252, 165, 165, 0.9)" // red-300
          : "#22c55e";

  const isToday = selected && startOfDay(selected).getTime() === startOfDay(new Date()).getTime();

  if (vertical) {
    return (
      <div className="border border-border/50 rounded-xl bg-gray-50/50 dark:bg-zinc-900/50 overflow-hidden h-full flex flex-col">
        <div className="px-3 py-2 border-b border-border bg-gray-100/50 dark:bg-zinc-800/50 flex-shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Selected Day
          </p>
        </div>
        <div className="p-3 flex flex-col flex-1 min-h-0">
          <div className="text-center py-3">
            <p className="text-5xl font-bold leading-none">{selected.getDate()}</p>
            <p className="text-sm font-medium mt-2">
              {selected.toLocaleDateString("en-US", { weekday: "long" })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selected.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          <Separator />
          <div className="py-3 space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Status</span>
              <Badge
                variant="outline"
                className={`text-[10px] ${statusClass}`}
              >
                {statusLabel}
              </Badge>
            </div>
            {info?.dayType && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Type</span>
                <span className="text-xs">{info.dayType.charAt(0).toUpperCase() + info.dayType.slice(1).toLowerCase()} day</span>
              </div>
            )}
            {info?.weekNumber != null && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Week</span>
                <span className="text-xs">Week {info.weekNumber}</span>
              </div>
            )}
          </div>
          <Separator />
          <div className="flex flex-col gap-2 pt-3 mt-auto">
            {actions.map((action) => {
              const Icon = action.icon || CalendarPlus;
              const isDestructive = action.variant === "destructive";
              return (
                <Button
                  key={action.key}
                  variant={isDestructive ? "outline" : action.variant}
                  size="sm"
                  className={`h-8 text-xs w-full shadow-none ${action.dashed ? 'border-dashed' : ''} ${isDestructive ? 'hover:bg-destructive/10 hover:border-destructive/30' : ''
                    }`}
                  onClick={action.onClick}
                >
                  <Icon className={`h-3.5 w-3.5 ${isDestructive ? 'text-destructive' : ''}`} />
                  {action.label}
                </Button>
              );
            })}
            {actions.length === 0 && actionNote && (
              <p className="text-[11px] text-muted-foreground text-center">
                {actionNote}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border border-border/50 rounded-xl p-3 bg-gray-50/50 dark:bg-zinc-900/50 flex flex-col justify-between flex-1">
        {/* Top Info Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <h5 className="text-2xl font-semibold text-primary">
                {selected.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h5>
            </div>
            {info?.weekNumber != null && (
              <span className="text-xl font-semibold text-muted-foreground">
                Week {info.weekNumber}
              </span>
            )}
          </div>

          {/* Top Right Badges */}
          <div className="flex items-center justify-end gap-2 flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border pl-2 pr-2.5 py-1 text-xs font-medium text-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
              {statusLabel}
            </span>
            {info?.dayType && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border pl-2 pr-2.5 py-1 text-xs font-medium text-foreground">
                {info.dayType.toUpperCase() === "HALF" ? (
                  <CircleDashed className="h-3 w-3" color={dotColor} />
                ) : (
                  <Circle className="h-3 w-3" color={dotColor} />
                )}
                {info.dayType.charAt(0).toUpperCase() + info.dayType.slice(1).toLowerCase()} day
              </span>
            )}
            {isToday ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-transparent pl-2 pr-2.5 py-1 text-xs font-medium bg-primary text-white dark:text-black shadow-sm">
                Today
              </span>
            ) : (
              <button
                onClick={onGoToToday}
                className="inline-flex items-center gap-1.5 rounded-md border border-border pl-2 pr-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Undo2 className="h-4 w-4" />
                Jump to today
              </button>
            )}
          </div>
        </div>

        {/* Bottom Actions Section */}
        <div className="flex gap-3 pt-4 mt-auto items-center w-full">
          {actions.map((action) => {
            const Icon = action.icon || CalendarPlus;
            const isDestructive = action.variant === "destructive";
            return (
              <Button
                key={action.key}
                variant={isDestructive ? "outline" : action.variant}
                className={`flex-1 font-medium shadow-none ${action.dashed ? 'border-dashed' : ''} ${isDestructive ? 'hover:bg-destructive/10 hover:border-destructive/30' : ''
                  }`}
                onClick={action.onClick}
              >
                <Icon className={`h-4 w-4 mr-2 ${isDestructive ? 'text-destructive' : ''}`} />
                {action.label}
              </Button>
            );
          })}
          {actions.length === 0 && actionNote && (
            <p className="text-xs text-muted-foreground italic w-full text-center">{actionNote}</p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * One day cell with its hover card.
 *
 * The card is controlled on purpose: an uncontrolled Radix HoverCard treats the
 * click on its own trigger as a dismiss, so selecting a date closed the card and
 * the still-hovering pointer immediately reopened it — a visible flicker. Here
 * the pointer alone decides, so clicking a date leaves the card untouched.
 */
interface DayCellProps {
  date: Date;
  isSelected: boolean;
  className: string;
  style?: React.CSSProperties;
  baseLabel: string;
  dayType: string;
  dotColor: string;
  weekNumber?: number | null;
  onSelect: (date: Date) => void;
}

const HOVER_OPEN_DELAY = 120;

const DayCell: React.FC<DayCellProps> = ({
  date,
  isSelected,
  className,
  style,
  baseLabel,
  dayType,
  dotColor,
  weekNumber,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => clearTimer, []);

  return (
    <td role="presentation" className="p-0 text-center flex-1 relative">
      <HoverCard open={open}>
        <HoverCardTrigger asChild>
          <button
            className={className}
            style={style}
            aria-label={date.toDateString()}
            aria-pressed={isSelected}
            onPointerEnter={() => {
              clearTimer();
              timer.current = setTimeout(() => setOpen(true), HOVER_OPEN_DELAY);
            }}
            onPointerLeave={() => {
              clearTimer();
              setOpen(false);
            }}
            onClick={() => onSelect(date)}
          >
            {date.getDate()}
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="text-sm w-auto pointer-events-none z-50">
          <div className="space-y-1.5">
            <p className="font-semibold">
              {date.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border pl-2 pr-2.5 py-1 text-[11px] font-medium text-foreground bg-gray-50/50 dark:bg-zinc-900/50">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
                {baseLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-foreground bg-gray-50/50 dark:bg-zinc-900/50">
                {dayType.toUpperCase() === "HALF" ? (
                  <CircleDashed className="h-3 w-3" color={dotColor} />
                ) : (
                  <Circle className="h-3 w-3" color={dotColor} />
                )}
                {dayType.charAt(0).toUpperCase() + dayType.slice(1).toLowerCase()} Day
              </span>
            </div>
            {weekNumber != null && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Week {weekNumber}
              </p>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    </td>
  );
};

const CalendarViewPanel: React.FC<CalendarViewPanelProps> = ({
  calendar,
  setLegendStats,
}) => {
  const canView = usePrivilegeGuard("29") as boolean;
  const canCreateHoliday = usePrivilegeGuard("33") as boolean;
  const canCreateWorkingDay = usePrivilegeGuard("34") as boolean;
  const canDeleteHoliday = usePrivilegeGuard("36") as boolean;
  const canDeleteWorkingDay = usePrivilegeGuard("37") as boolean;

  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("three");
  const [existingYears, setExistingYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  const [showHolidays, setShowHolidays] = useState(true);
  const [showWeekends, setShowWeekends] = useState(true);
  const [showWorking, setShowWorking] = useState(true);

  const [openHolidayDrawer, setOpenHolidayDrawer] = useState(false);
  const [openWorkingDayDrawer, setOpenWorkingDayDrawer] = useState(false);
  const [removingType, setRemovingType] = useState<
    "holidays" | "specialWorkingDay" | null
  >(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Load calendar days
  useEffect(() => {
    if (!calendar?.id) return;
    setLoading(true);
    getAllCalendarDays(calendar.id)
      .then((res) => {
        const parsed = res.data.map((d: any) => ({
          ...d,
          date: new Date(d.date),
        }));
        setCalendarDays(parsed);

        const years = Array.from(
          new Set(parsed.map((d: any) => Number(d.year)).filter((y: number) => !Number.isNaN(y))),
        ).sort((a: any, b: any) => b - a) as number[];
        setExistingYears(years);
        if (years.length > 0 && selectedYear === undefined) {
          const today = new Date();
          const todayYear = today.getFullYear();
          if (years.includes(todayYear)) {
            setSelectedYear(todayYear);
            setCurrentMonth(new Date(todayYear, today.getMonth(), 1));
            setSelected(today);
          } else {
            setSelectedYear(years[0]);
            setCurrentMonth(new Date(years[0], 0, 1));
            setSelected(new Date(years[0], 0, 1));
          }
        }
      })
      .catch(() => toast.error("Failed to fetch calendar data"))
      .finally(() => setLoading(false));
  }, [calendar?.id, refreshCounter]);

  // Filter by selected year for highlighting
  const yearFiltered = useMemo(
    () =>
      selectedYear
        ? calendarDays.filter((d) => d.year === selectedYear)
        : calendarDays,
    [calendarDays, selectedYear],
  );

  // Each day resolves to exactly one state, so the buckets no longer overlap
  // and none of them has to be subtracted from another.
  const holidayDates = yearFiltered
    .filter((d) => resolveDayState(d).key === "HOLIDAY")
    .map((d) => d.date);
  const weekendDates = yearFiltered
    .filter((d) => resolveDayState(d).key === "WEEKEND")
    .map((d) => d.date);
  const workingDates = yearFiltered
    .filter((d) => {
      const key = resolveDayState(d).key;
      return key === "NORMAL" || key === "SPECIAL_WORKING";
    })
    .map((d) => d.date);

  const filteredHolidayDates = holidayDates;
  const filteredWeekendDates = weekendDates;

  const isDateDisabled = (date: Date): boolean => {
    if (!selectedYear) return false;
    return date.getFullYear() !== selectedYear;
  };

  const handleMonthChange = (date: Date) => {
    if (selectedYear) {
      if (date.getFullYear() === selectedYear) setCurrentMonth(date);
    } else {
      setCurrentMonth(date);
    }
  };

  const selectedDayInfo = selected
    ? yearFiltered.find((d) => d.date.toDateString() === selected.toDateString())
    : null;

  const weekendBaseTypes = buildWeekendBaseTypes(calendarDays);

  // Removal is confirmed first; the modal reports any backend error itself.
  const confirmRemoval = async () => {
    if (!selectedDayInfo || !removingType) return;

    const response = await deleteHolidaysAndWorkingDays(
      calendar.id,
      selectedDayInfo.id,
      removingType,
    );
    toast.success(
      removingType === "holidays"
        ? "Holiday removed"
        : "Special working day removed.",
    );
    return response;
  };

  /**
   * Only the changes the day-state rules allow are offered:
   *
   *   normal working day    -> mark as holiday
   *   repeated holiday full -> mark as special working day
   *   repeated holiday half -> mark as holiday, or as special working day
   *   special holiday       -> change its type, or remove it
   *   special working day   -> change its type, or remove it
   */
  const selectedDayActions: DayAction[] = (() => {
    if (!selectedDayInfo || !selected) return [];
    if (isPastDate(selected)) return [];

    const state = resolveDayState(selectedDayInfo);
    const baseType = weekendBaseTypeOf(selectedDayInfo, weekendBaseTypes);

    const markHoliday: DayAction = {
      key: "mark-holiday",
      label: "Mark as Holiday",
      variant: "outline",
      icon: Umbrella,
      onClick: () => setOpenHolidayDrawer(true),
    };
    const markWorking: DayAction = {
      key: "mark-working",
      label: "Mark as Special Working Day",
      variant: "outline",
      icon: Briefcase,
      onClick: () => setOpenWorkingDayDrawer(true),
    };

    if (state.key === "HOLIDAY") {
      return [
        ...(canCreateHoliday
          ? [{ ...markHoliday, label: "Change Holiday Type", dashed: true }]
          : []),
        ...(canDeleteHoliday
          ? [
            {
              key: "remove-holiday",
              label: "Remove Holiday",
              variant: "destructive" as const,
              icon: Trash,
              onClick: () => setRemovingType("holidays"),
            },
          ]
          : []),
      ];
    }

    if (state.key === "SPECIAL_WORKING") {
      return [
        ...(canCreateWorkingDay
          ? [{ ...markWorking, label: "Change Working Day Type", dashed: true }]
          : []),
        ...(canDeleteWorkingDay
          ? [
            {
              key: "remove-working",
              label: "Remove Special Working Day",
              variant: "destructive" as const,
              icon: Trash,
              onClick: () => setRemovingType("specialWorkingDay"),
            },
          ]
          : []),
      ];
    }

    if (state.key === "WEEKEND") {
      // A full repeated holiday is already a full day off, so a holiday on top
      // of it adds nothing — only a special working day can override it.
      return [
        ...(baseType === "HALF" && canCreateHoliday ? [markHoliday] : []),
        ...(canCreateWorkingDay ? [markWorking] : []),
      ];
    }

    return canCreateHoliday ? [markHoliday] : [];
  })();

  // Opening the drawer on a date that already carries this override edits it,
  // so the stored row is handed over rather than just the date.
  const drawerPayload = (kind: "holiday" | "workingDay") => {
    if (!selected) return null;
    if (!selectedDayInfo) return { date: selected };

    const state = resolveDayState(selectedDayInfo);
    const isSameKind =
      kind === "holiday"
        ? state.key === "HOLIDAY"
        : state.key === "SPECIAL_WORKING";

    return isSameKind ? selectedDayInfo : { date: selected };
  };

  const selectedDayActionNote =
    selected && isPastDate(selected)
      ? "Past date — kept for history and can no longer be changed."
      : selectedDayInfo
        ? "You are not authorized to change this day."
        : undefined;

  // Counts for the month currently in view, used by the stat strip
  const isSameMonth = (d: Date) =>
    d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
  const monthWorkingCount = workingDates.filter(isSameMonth).length;
  const monthHolidayCount = filteredHolidayDates.filter(isSameMonth).length;
  const monthWeekendCount = filteredWeekendDates.filter(isSameMonth).length;

  useEffect(() => {
    if (setLegendStats) {
      setLegendStats({
        working: monthWorkingCount,
        holidays: monthHolidayCount,
        weekends: monthWeekendCount,
        canView,
        loading,
      });
    }
  }, [monthWorkingCount, monthHolidayCount, monthWeekendCount, canView, loading, setLegendStats]);

  // Render a custom Day with hover info & color coding.
  // Selection comes from the day's own modifiers, so this deliberately does not
  // depend on `selected` — clicking a date must not rebuild the day cells.
  const renderDay = useCallback((dayProps: DayProps) => {
    const { day, modifiers } = dayProps as any;
    const date: Date = day.date;
    const isSelected = modifiers?.selected;
    const dateStr = date.toDateString();

    const match = yearFiltered.find((d) => d.date.toDateString() === dateStr);
    const state = match ? resolveDayState(match) : undefined;
    const baseLabel = state?.baseLabel ?? "Working day";
    const dayType = match?.dayType ?? "FULL";
    const isHalf = state?.isHalf ?? false;
    const dotColor =
      state?.key === "SPECIAL_WORKING"
        ? "#22c55e"
        : state?.key === "HOLIDAY"
          ? "rgba(248, 113, 113, 0.8)"
          : state?.key === "WEEKEND"
            ? "rgba(254, 202, 202, 0.7)"
            : "#22c55e";

    // One state per day, so the colour follows the override that is in force:
    // special working day beats special holiday beats repeated holiday.
    const visibleKey =
      state?.key === "SPECIAL_WORKING" && showWorking
        ? "SPECIAL_WORKING"
        : state?.key === "HOLIDAY" && showHolidays
          ? "HOLIDAY"
          : state?.key === "WEEKEND" && showWeekends
            ? "WEEKEND"
            : undefined;

    const isOutside = !!(dayProps as any).modifiers?.outside;
    const classes = [
      "rounded-md w-full h-full aspect-square text-sm p-0 font-normal transition-all duration-200",
    ];

    if (isSelected) classes.push("ring-2 ring-primary");
    if (visibleKey) {
      const palette = DAY_PALETTE[visibleKey];
      classes.push(isHalf ? palette.half : palette.full);
    } else {
      classes.push("hover:bg-muted");
    }
    if (isOutside) classes.push("opacity-35 text-muted-foreground");

    // Half day: the same colour as a full day, clipped to a diagonal half.
    const halfStyle: React.CSSProperties | undefined =
      isHalf && visibleKey
        ? { backgroundImage: HALF_DAY_BACKGROUND }
        : undefined;

    return (
      <DayCell
        date={date}
        isSelected={!!isSelected}
        className={classes.join(" ")}
        style={halfStyle}
        baseLabel={baseLabel}
        dayType={dayType}
        dotColor={dotColor}
        weekNumber={match?.weekNumber ?? null}
        onSelect={setSelected}
      />
    );
  }, [yearFiltered, showHolidays, showWeekends, showWorking, viewMode]);

  const dayComponents = useMemo(() => ({ Day: renderDay }), [renderDay]);

  const monthsForThreeView = [
    new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
  ];

  return (
    <div className="space-y-0 flex flex-col h-full">
      {/* Toolbar */}
      <div className="pb-3 px-3 flex items-center border-b gap-2 flex-nowrap overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
        <div className="flex bg-gray-50/50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md shrink-0 items-center h-7">
          <button
            className={`h-full text-xs px-3 transition-colors flex items-center justify-center font-medium rounded-sm ${viewMode === "month"
              ? "bg-primary text-white dark:text-gray-900"
              : "hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            onClick={() => setViewMode("month")}
          >
            {/* <CalendarDays className="h-3.5 w-3.5 mr-1.5" /> */}
            Month
          </button>
          <button
            className={`h-full text-xs px-3 transition-colors flex items-center justify-center font-medium rounded-sm ${viewMode === "three"
              ? "bg-primary text-white dark:text-gray-900"
              : "hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            onClick={() => setViewMode("three")}
          >
            {/* <Grid3x3 className="h-3.5 w-3.5 mr-1.5" /> */}
            3 Months
          </button>
        </div>

        {existingYears.length > 0 && <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1 flex-shrink-0" />}

        {existingYears.length > 0 && (
          <Select
            value={selectedYear ? String(selectedYear) : ""}
            onValueChange={(v) => {
              const y = Number(v);
              setSelectedYear(y);
              const today = new Date();
              if (today.getFullYear() === y) {
                setCurrentMonth(new Date(y, today.getMonth(), 1));
                setSelected(today);
              } else {
                setCurrentMonth(new Date(y, 0, 1));
                setSelected(new Date(y, 0, 1));
              }
            }}
          >
            <SelectTrigger className="h-7 w-24 text-xs flex-shrink-0 shadow-none font-medium">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent align="end">
              {existingYears.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center gap-2 flex-wrap flex-shrink-0 ml-auto">
          {canView && !loading && (
            <>
              <button
                onClick={() => setShowWorking(!showWorking)}
                className={`inline-flex items-center gap-1.5 rounded-md border pl-2 pr-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${showWorking
                  ? "border-border text-foreground"
                  : "border-border border-dashed text-muted-foreground hover:bg-muted/50"
                  }`}
              >
                {showWorking ? (
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                Special working days
                <span className="font-medium bg-primary text-white dark:text-black px-1.5 py-0.5 rounded-full text-[10px]">{monthWorkingCount}</span>
                {showWorking && <X className="h-3 w-3 ml-0.5 text-muted-foreground opacity-70" />}
              </button>

              <button
                onClick={() => setShowHolidays(!showHolidays)}
                className={`inline-flex items-center gap-1.5 rounded-md border pl-2 pr-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${showHolidays
                  ? "border-border text-foreground"
                  : "border-border border-dashed text-muted-foreground hover:bg-muted/50"
                  }`}
              >
                {showHolidays ? (
                  <span className="h-2 w-2 rounded-full bg-red-400/80 dark:bg-red-500/60" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                Holidays
                <span className="font-medium bg-primary text-white dark:text-black px-1.5 py-0.5 rounded-full text-[10px]">{monthHolidayCount}</span>
                {showHolidays && <X className="h-3 w-3 ml-0.5 text-muted-foreground opacity-70" />}
              </button>

              <button
                onClick={() => setShowWeekends(!showWeekends)}
                className={`inline-flex items-center gap-1.5 rounded-md border pl-2 pr-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${showWeekends
                  ? "border-border text-foreground"
                  : "border-border border-dashed text-muted-foreground hover:bg-muted/50"
                  }`}
              >
                {showWeekends ? (
                  <span className="h-2 w-2 rounded-full bg-red-300 dark:bg-red-800/80" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                Weekends
                <span className="font-medium bg-primary text-white dark:text-black px-1.5 py-0.5 rounded-full text-[10px]">{monthWeekendCount}</span>
                {showWeekends && <X className="h-3 w-3 ml-0.5 text-muted-foreground opacity-70" />}
              </button>

              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Filter info"
                      className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-1 rounded-full hover:bg-muted"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Click badge to remove filter
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1 flex-shrink-0" />

              <span className="inline-flex items-center gap-1.5 rounded-md border border-transparent pl-2 pr-2.5 py-1 text-xs font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full ring-2 ring-primary" />
                Selected
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-transparent pl-2 pr-2.5 py-1 text-xs font-medium text-muted-foreground">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundImage:
                      "linear-gradient(225deg, rgba(239, 68, 68, 0.85) 50%, transparent 50%)",
                  }}
                />
                Half day
              </span> */}
            </>
          )}
        </div>
        {/* <div className="ml-auto flex items-center gap-2 flex-shrink-0 min-w-0">
          <p className="text-sm font-semibold truncate text-muted-foreground mr-1">Calendar:</p>
          <p className="text-sm font-semibold truncate">{calendar.name}</p>
        </div> */}
      </div>

      {/* Calendar + Selected Day */}
      <div className="pt-3 px-4 flex flex-col flex-1 min-h-0">
        {!canView ? (
          <div className="text-center py-10 text-muted-foreground">
            You are not authorized to view calendars
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-none">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className={`flex-col items-center min-w-0 ${idx !== 1 && viewMode !== "three" ? "hidden md:flex md:invisible" : "flex"}`}
                >
                  <div className="rounded-xl border border-border/50 bg-gray-50/50 dark:bg-zinc-900/50 p-4 w-full flex flex-col gap-4">
                    <div className="flex justify-between items-center px-1 h-8">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-4" />
                    </div>
                    <div className="grid grid-cols-7 gap-0 text-center">
                      {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-4 w-8 mx-auto mt-2 mb-2" />)}
                    </div>
                    <div className="grid grid-cols-7 gap-1 mt-1">
                      {Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="w-full flex-1 flex flex-col min-h-0">
              <div className="border border-border/50 rounded-xl p-4 bg-gray-50/50 dark:bg-zinc-900/50 flex flex-col justify-between flex-1">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex flex-col gap-2.5">
                    <Skeleton className="h-8 w-64" />
                  </div>
                  <div className="flex items-center justify-end gap-2 flex-shrink-0">
                    <Skeleton className="h-7 w-20 rounded-md" />
                    <Skeleton className="h-7 w-20 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-none">
              {monthsForThreeView.map((m, idx) => {
                const isCenter = idx === 1;
                const isVisible = viewMode === "three" || isCenter;
                return (
                  <div
                    key={idx}
                    className={`flex-col items-center min-w-0 ${!isVisible ? "hidden md:flex md:invisible" : "flex"
                      }`}
                  >
                    {isVisible && (
                      <ShadCalendar
                        mode="single"
                        selected={selected}
                        onSelect={setSelected}
                        month={m}
                        onMonthChange={isCenter ? handleMonthChange : undefined}
                        hideNavigation={!isCenter}
                        disabled={isDateDisabled}
                        numberOfMonths={1}
                        modifiers={{
                          working: showWorking ? workingDates : [],
                          holiday: showHolidays ? filteredHolidayDates : [],
                          weekend: showWeekends ? filteredWeekendDates : [],
                          selected: selected ? [selected] : [],
                        }}
                        classNames={{
                          root: "w-full",
                          weekdays: "flex w-full gap-1",
                          week: "flex w-full mt-1 gap-1",
                          day: "relative w-full h-full p-0 text-center group/day select-none [&:last-child[data-selected=true]_button]:rounded-r-md [&:first-child[data-selected=true]_button]:rounded-l-md",
                        }}
                        className="rounded-xl border border-border/50 bg-gray-50/50 dark:bg-zinc-900/50 p-4 [--cell-size:2rem] w-full"
                        components={dayComponents}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="w-full flex-1 flex flex-col min-h-0">
              <SelectedDayCard
                selected={selected}
                info={selectedDayInfo}
                actions={selectedDayActions}
                actionNote={selectedDayActionNote}
                vertical={false}
                onGoToToday={() => {
                  const today = new Date();
                  setSelectedYear(today.getFullYear());
                  setCurrentMonth(today);
                  setSelected(today);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {openHolidayDrawer && (
        <HolidayWorkingDayDrawer
          open={openHolidayDrawer}
          onOpenChange={setOpenHolidayDrawer}
          type="holiday"
          calendarId={calendar.id}
          calendarYear={selectedYear}
          holidayWorkingDay={drawerPayload("holiday")}
          onHolidayWorkingDayUpdate={() => {
            setOpenHolidayDrawer(false);
            setRefreshCounter((c) => c + 1);
          }}
        />
      )}
      {removingType && selectedDayInfo && (
        <DeleteModal
          isOpen={!!removingType}
          onClose={() => {
            setRemovingType(null);
            setRefreshCounter((c) => c + 1);
          }}
          onDelete={confirmRemoval}
          id={selectedDayInfo.id}
          title={
            removingType === "holidays"
              ? "Remove Holiday"
              : "Remove Special Working Day"
          }
          description={`Remove the ${removingType === "holidays"
            ? "special holiday"
            : "special working day"
            } on ${selectedDayInfo.date.toLocaleDateString()}? The date goes back to ${selectedDayInfo.isWeekend
              ? "its repeated holiday (weekend)"
              : "a normal working day"
            }.`}
          buttonText="Remove"
          buttonVariant="destructive"
        />
      )}
      {openWorkingDayDrawer && (
        <HolidayWorkingDayDrawer
          open={openWorkingDayDrawer}
          onOpenChange={setOpenWorkingDayDrawer}
          type="workingDay"
          calendarId={calendar.id}
          calendarYear={selectedYear}
          holidayWorkingDay={drawerPayload("workingDay")}
          onHolidayWorkingDayUpdate={() => {
            setOpenWorkingDayDrawer(false);
            setRefreshCounter((c) => c + 1);
          }}
        />
      )}
    </div>
  );
};

export default CalendarViewPanel;

