import React from "react";
import { Tabs, TabsTrigger, TabsList, TabsContent } from "@/components/ui/tabs";
import { MailIcon, PhoneIcon, XIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { Calendar } from "@/interfaces/calendar";
import Info_button from "@/components/Info_button";
import View from "./tabs/view";
import CalendarDates from "./tabs/calendarDates";
import RepeatedHolidays from "./tabs/repeatedHolidays";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  extendCalendar,
  getAllCalendarDays,
  getCalendarWeekConfig,
  type CalendarWeekConfig,
} from "@/services/resource-management/calendar-services";
import { formatDay, parseIsoDate } from "./week_start_picker";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";

interface CalendarViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendar: Calendar;
  isLoading: boolean;
  isSystemUser?: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  open,
  onOpenChange,
  calendar,
  isLoading,
  isSystemUser,
}) => {
  const canViewSkillCategory = usePrivilegeGuard("29") as boolean;

  const [isExtending, setIsExtending] = React.useState(false);
  const [weekConfig, setWeekConfig] =
    React.useState<CalendarWeekConfig | null>(null);
  const [existingYears, setExistingYears] = React.useState<number[]>([]);
  const [yearsLoading, setYearsLoading] = React.useState(false);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [selectedYear, setSelectedYear] = React.useState<string>("");

  const parseYears = (data: any[]): number[] => {
    const yearValues = (data as any[]).map((d) => Number(d.year));
    const validYears = yearValues.filter((y): y is number => !Number.isNaN(y));
    return Array.from(new Set(validYears)).sort((a, b) => b - a);
  };

  // Load existing years on component mount
  React.useEffect(() => {
    if (open && calendar?.id) {
      const loadYears = async () => {
        setYearsLoading(true);
        try {
          const res = await getAllCalendarDays(calendar.id);
          const years = parseYears(res.data);
          setExistingYears(years);
          if (years.length > 0 && !selectedYear) {
            setSelectedYear(String(years[0]));
          }
        } catch (e) {
          toast.error("Failed to fetch calendar years");
        } finally {
          setYearsLoading(false);
        }
      };
      loadYears();
    }
  }, [open, calendar?.id]);

  const handleOpenPopover = async (isOpen: boolean) => {
    setPopoverOpen(isOpen);
    if (isOpen) {
      setYearsLoading(true);
      try {
        const [res, config] = await Promise.all([
          getAllCalendarDays(calendar.id),
          getCalendarWeekConfig(calendar.id),
        ]);
        setExistingYears(parseYears(res.data));
        setWeekConfig(config);
      } catch (e) {
        toast.error("Failed to fetch existing years");
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
      setSelectedYear(String(weekConfig.nextYear));
      const [res, config] = await Promise.all([
        getAllCalendarDays(calendar.id),
        getCalendarWeekConfig(calendar.id),
      ]);
      setExistingYears(parseYears(res.data));
      setWeekConfig(config);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to extend calendar");
    } finally {
      setIsExtending(false);
    }
  };

  if (!open) return null;

  // Full loading state when no user data is available yet
  if (isLoading && !calendar) {
    return (
      <div className="animate-pulse">
        <div className="sticky top-0 pb-3 flex justify-between items-center">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-sm" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <div className="flex items-center gap-1">
                  <MailIcon className="h-3 w-3" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex items-center gap-1">
                  <PhoneIcon className="h-3 w-3" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl font-bold w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-gray-100 flex-shrink-0"
          >
            <XIcon />
          </button>
        </div>

        <div className="w-full space-y-4">
          <div className="w-full grid grid-cols-2 gap-2">
            <Skeleton className="h-8 w-full rounded" />
            <Skeleton className="h-8 w-full rounded" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 pb-3 flex justify-between items-center">
        {canViewSkillCategory ? (
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16 rounded-sm" />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <h1 className="text-lg tracking-tight">{calendar.name}</h1>
                    <span
                      className={`inline-block px-2  py-0.5 rounded-sm text-xs h-fit ${calendar.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                        }`}
                    >
                      {calendar.isActive ? "Active" : "Inactive"}
                    </span>
                    <Info_button
                      id={calendar.id}
                      createdBy={calendar.createdBy || ""}
                      createdAt={calendar.createdAt || new Date()}
                      updatedBy={calendar.updatedBy || ""}
                      updatedAt={calendar.updatedAt || new Date()}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-red-500">
            You are not authorized to view calendars
          </div>
        )}
        <div className="flex items-center gap-2">
          {canViewSkillCategory && !yearsLoading && existingYears.length > 0 && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-28 h-9">
                <SelectValue placeholder="Select Year" />
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
          {canViewSkillCategory && (
            <Popover open={popoverOpen} onOpenChange={handleOpenPopover}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <CalendarPlus className="w-4 h-4" />
                  Extend
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-4">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Extend Calendar Year</h4>
                  {yearsLoading ? (
                    <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
                  ) : weekConfig?.nextYearStartDate && weekConfig?.nextYearEndDate ? (
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
                        {isExtending ? "Extending…" : `Extend to ${weekConfig.nextYear}`}
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
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl font-bold w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-gray-100 flex-shrink-0"
          >
            <XIcon />
          </button>
        </div>
      </div>
      <Tabs defaultValue="view" className="w-full">
        <TabsList className="w-full grid grid-cols-4 gap-0 mx-0  h-auto">
          <TabsTrigger
            value="view"
            className="text-xs sm:text-sm sm:px-3 py-1 sm:py-2 w-full"
          >
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <span className="truncate">View</span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="holidays"
            className="text-xs sm:text-sm  sm:px-3 py-1 sm:py-2 w-full"
          >
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <span className="truncate">Holidays</span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="special_working_days"
            className="text-xs sm:text-sm  sm:px-3 py-1 sm:py-2 w-full"
          >
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <span className="truncate">Special Working Days</span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="repeated_holidays"
            className="text-xs sm:text-sm  sm:px-3 py-1 sm:py-2 w-full"
          >
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <span className="truncate">Repeated Holidays</span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="view">
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <View calendarId={calendar.id} selectedYear={selectedYear ? Number(selectedYear) : undefined} />
          )}
        </TabsContent>
        <TabsContent value="special_working_days">
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <CalendarDates calendar={calendar} type="specialWorkingDay" isSystemUser={isSystemUser} selectedYear={selectedYear ? Number(selectedYear) : undefined} />
          )}
        </TabsContent>
        <TabsContent value="holidays">
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <CalendarDates calendar={calendar} type="holidays" isSystemUser={isSystemUser} selectedYear={selectedYear ? Number(selectedYear) : undefined} />
          )}
        </TabsContent>
        <TabsContent value="repeated_holidays">
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <RepeatedHolidays calendar={calendar} isSystemUser={isSystemUser} selectedYear={selectedYear ? Number(selectedYear) : undefined} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CalendarView;

