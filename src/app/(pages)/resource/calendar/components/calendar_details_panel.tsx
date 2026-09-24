"use client";

import React, { useEffect, useState } from "react";
import { CalendarPlus, Scaling } from "lucide-react";
import { Calendar } from "@/interfaces/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  extendCalendar,
  getCalendarWeekConfig,
  type CalendarWeekConfig,
} from "@/services/resource-management/calendar-services";
import { addDays, formatDay, parseIsoDate } from "./week_start_picker";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import CalendarDatesCompact from "./tabs/calendar_dates_compact";
import RepeatedHolidaysCompact from "./tabs/repeated_holidays_compact";

interface CalendarDetailsPanelProps {
  calendar: Calendar;
}

const CalendarDetailsPanel: React.FC<CalendarDetailsPanelProps> = ({
  calendar,
}) => {
  const canView = usePrivilegeGuard("29") as boolean;

  const [yearsLoading, setYearsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [weekConfig, setWeekConfig] = useState<CalendarWeekConfig | null>(null);
  const [holidayCount, setHolidayCount] = useState<number | null>(null);
  const [workingDayCount, setWorkingDayCount] = useState<number | null>(null);
  const [repeatedCount, setRepeatedCount] = useState<number | null>(null);

  useEffect(() => {
    if (calendar?.id) {
      (async () => {
        setYearsLoading(true);
        try {
          const config = await getCalendarWeekConfig(calendar.id);
          setWeekConfig(config);

          // Land on the year running today, falling back to the newest one.
          const starts = config.yearStarts ?? [];
          if (starts.length > 0) {
            const currentIndex = config.currentYearStartDate
              ? starts.indexOf(config.currentYearStartDate)
              : -1;
            setSelectedYear(
              String(currentIndex >= 0 ? currentIndex + 1 : starts.length),
            );
          } else {
            setSelectedYear("");
          }
        } catch {
          toast.error("Failed to fetch calendar years");
        } finally {
          setYearsLoading(false);
        }
      })();
    }
  }, [calendar?.id]);

  const handleOpenPopover = async (isOpen: boolean) => {
    setPopoverOpen(isOpen);
    if (isOpen) {
      setYearsLoading(true);
      try {
        setWeekConfig(await getCalendarWeekConfig(calendar.id));
      } catch {
        toast.error("Failed to fetch calendar years");
      } finally {
        setYearsLoading(false);
      }
    }
  };

  // The next year is fixed: its weeks continue straight after the last day, so
  // there is nothing to choose — only to confirm.
  const handleExtend = async () => {
    if (!weekConfig?.nextYear) return;

    setIsExtending(true);
    try {
      await extendCalendar(calendar.id, weekConfig.nextYear);
      toast.success(`Calendar extended for ${weekConfig.nextYear}`);
      setPopoverOpen(false);
      const config = await getCalendarWeekConfig(calendar.id);
      setWeekConfig(config);
      // The extension always appends, so the new year is the last one.
      setSelectedYear(String((config.yearStarts ?? []).length));
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to extend calendar");
    } finally {
      setIsExtending(false);
    }
  };

  /**
   * The calendar's own years — "Year 1" is the year it was created with, and
   * each extension adds the next one. Ends are the day before the following
   * year starts, or the calendar's last generated day for the newest year.
   */
  const fiscalYears = (weekConfig?.yearStarts ?? []).map((start, index, all) => {
    const nextStart = all[index + 1];
    const end = nextStart
      ? addDays(parseIsoDate(nextStart), -1)
      : weekConfig?.lastDate
        ? parseIsoDate(weekConfig.lastDate)
        : null;

    const startDate = parseIsoDate(start);

    return {
      index: index + 1,
      start: startDate,
      end,
      label: end
        ? `${formatDay(startDate)} – ${formatDay(end)}`
        : formatDay(startDate),
    };
  });

  const activeYear =
    fiscalYears.find((year) => String(year.index) === selectedYear) ?? null;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-background w-full">
      {/* Header with Information Label, Extend, and Year selector */}
      <div className="pt-4 pb-3 px-3 border-b border-gray-200 dark:border-gray-800 flex-none flex items-center justify-between">
        {/* <div className="h-7 flex items-center">
          <h2 className="text-sm font-medium">Information</h2>
        </div> */}
        <div className="flex items-center gap-2 flex-nowrap">
          {canView && (
            <Popover open={popoverOpen} onOpenChange={handleOpenPopover}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs flex items-center gap-1 flex-shrink-0">
                  <Scaling className="w-4 h-4 mr-1" />
                  Extend
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Extend Calendar Year</h4>
                  {yearsLoading ? (
                    <div className="text-sm text-muted-foreground animate-pulse">
                      Loading…
                    </div>
                  ) : weekConfig?.nextYearStartDate &&
                    weekConfig?.nextYearEndDate ? (
                    <div className="space-y-2">
                      <div className="rounded-md border bg-muted/30 px-3 py-2 space-y-1">
                        <p className="text-xs font-medium">
                          Adds {weekConfig.nextYearWeeks} weeks
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDay(parseIsoDate(weekConfig.nextYearStartDate))}
                          {" – "}
                          {formatDay(parseIsoDate(weekConfig.nextYearEndDate))}
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Weeks continue straight after{" "}
                        {weekConfig.lastDate
                          ? formatDay(parseIsoDate(weekConfig.lastDate))
                          : "the last day"}
                        , keeping the same week start day.
                        {weekConfig.repeatedHolidayCount > 0
                          ? ` The repeated holiday pattern (${weekConfig.repeatedHolidayCount} day${weekConfig.repeatedHolidayCount > 1 ? "s" : ""
                          } a week) is applied to the new year; one-off holidays are not copied.`
                          : " No repeated holiday pattern is set, so every day starts as a working day"}
                      </p>
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={isExtending}
                        onClick={handleExtend}
                      >
                        {isExtending
                          ? "Extending…"
                          : `Extend to ${weekConfig.nextYear}`}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      This calendar has no days yet, so there is nothing to
                      continue from.
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {canView && !yearsLoading && fiscalYears.length > 0 && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-7 w-auto text-xs flex-shrink-0 shadow-none font-medium">
                <SelectValue placeholder="Year">{activeYear?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                {fiscalYears.map((year) => (
                  <SelectItem key={year.index} value={String(year.index)}>
                    {year.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Tabs for Holidays / Working Days / Repeated Holidays */}
      <div className="flex-1 flex flex-col min-h-0">
        <Tabs defaultValue="holidays" className="w-full flex-1 flex flex-col min-h-0 py-3">
          <div className="border-b border-border flex-none">
            <TabsList className="flex w-full shrink-0 bg-transparent p-0 rounded-none h-9 items-center justify-start gap-1">
              <TabsTrigger
                value="holidays"
                className="relative flex-1 h-9 rounded-none border-b-2 border-transparent bg-transparent px-2 font-medium text-xs text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:!text-primary data-[state=active]:!bg-transparent data-[state=active]:shadow-none flex items-center justify-center gap-1.5 cursor-pointer -mb-px"
              >
                <span>Holidays</span>
                {holidayCount !== null && (
                  <Badge
                    variant="outline"
                    className="ml-1 px-1.5 py-0 h-4 text-[10px] font-medium rounded-full border-transparent bg-primary text-white dark:text-black"
                  >
                    {holidayCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="working_days"
                className="relative flex-1 h-9 rounded-none border-b-2 border-transparent bg-transparent px-2 font-medium text-xs text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:!text-primary data-[state=active]:!bg-transparent data-[state=active]:shadow-none flex items-center justify-center gap-1.5 cursor-pointer -mb-px"
              >
                <span>Special Working Days</span>
                {workingDayCount !== null && (
                  <Badge
                    variant="outline"
                    className="ml-1 px-1.5 py-0 h-4 text-[10px] font-medium rounded-full border-transparent bg-primary text-white dark:text-black"
                  >
                    {workingDayCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="repeated"
                className="relative flex-1 h-9 rounded-none border-b-2 border-transparent bg-transparent px-2 font-medium text-xs text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:!text-primary data-[state=active]:!bg-transparent data-[state=active]:shadow-none flex items-center justify-center gap-1.5 cursor-pointer -mb-px"
              >
                <span>Repeated</span>
                {repeatedCount !== null && (
                  <Badge
                    variant="outline"
                    className="ml-1 px-1.5 py-0 h-4 text-[10px] font-medium rounded-full border-transparent bg-primary text-white dark:text-black"
                  >
                    {repeatedCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="holidays" className="flex-1 flex flex-col min-h-0">
            <CalendarDatesCompact
              calendar={calendar}
              type="holidays"
              dateRange={
                activeYear?.end
                  ? { from: activeYear.start, to: activeYear.end }
                  : undefined
              }
              onCountChange={setHolidayCount}
            />
          </TabsContent>
          <TabsContent value="working_days" className="flex-1 flex flex-col min-h-0">
            <CalendarDatesCompact
              calendar={calendar}
              type="specialWorkingDay"
              dateRange={
                activeYear?.end
                  ? { from: activeYear.start, to: activeYear.end }
                  : undefined
              }
              onCountChange={setWorkingDayCount}
            />
          </TabsContent>
          <TabsContent value="repeated" className="flex-1 flex flex-col min-h-0">
            <RepeatedHolidaysCompact
              calendar={calendar}
              selectedYear={activeYear?.start.getFullYear()}
              onCountChange={setRepeatedCount}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CalendarDetailsPanel;
