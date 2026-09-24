"use client";

import { getAllCalendarDays } from "@/services/resource-management/calendar-services";
import React, { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Grid,
  List,
  CalendarPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import UnleashLoading from "@/components/loading/unleash-loading";
import HolidayWorkingDayDrawer from "../formDrawers/holiday_workingDay";
import type { DayProps } from "react-day-picker";
import { resolveDayState } from "@/lib/calendar-day-state";

type CustomDayProps = DayProps;

interface ViewProps {
  calendarId: number;
  selectedYear?: number;
}

const View: React.FC<ViewProps> = ({ calendarId, selectedYear }) => {
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [selected, setSelected] = useState<Date | undefined>(
    selectedYear ? new Date(selectedYear, 0, 1) : new Date()
  );
  const [currentMonth, setCurrentMonth] = useState(
    selectedYear ? new Date(selectedYear, 0, 1) : new Date()
  );
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    showHolidays: true,
    showWeekends: true,
    showWorkingDays: true,
  });
  const [openHolidayDrawer, setOpenHolidayDrawer] = useState(false);
  const [openWorkingDayDrawer, setOpenWorkingDayDrawer] = useState(false);
  const [onHolidayWorkingDayUpdate, setOnHolidayWorkingDayUpdate] = useState(false);

  // Sync calendar view when selectedYear changes
  useEffect(() => {
    if (selectedYear) {
      setSelected(new Date(selectedYear, 0, 1));
      setCurrentMonth(new Date(selectedYear, 0, 1));
    }
  }, [selectedYear]);

  useEffect(() => {
    if (calendarId) {
      setLoading(true);
      getAllCalendarDays(calendarId)
        .then((res) => {
          let parsed = res.data.map((d: any) => ({
            ...d,
            date: new Date(d.date),
          }));
          // Filter by selected year if provided
          if (selectedYear) {
            parsed = parsed.filter((d: any) => d.year === selectedYear);
          }
          setCalendarDays(parsed);
          setLoading(false);
          setOnHolidayWorkingDayUpdate(false);
        })
        .catch(() => setLoading(false));
    }
  }, [calendarId, onHolidayWorkingDayUpdate, selectedYear]);

  // Helper functions for date manipulation
  const getMonthStart = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1);
  const getMonthEnd = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const getDaysInMonth = (date: Date) => {
    const start = getMonthStart(date);
    const end = getMonthEnd(date);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };
  const formatDate = (date: Date, format: string) => {
    const options: Intl.DateTimeFormatOptions = {};
    switch (format) {
      case "MMMM yyyy":
        return date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      case "EEEE, MMMM d, yyyy":
        return date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      case "EEEE":
        return date.toLocaleDateString("en-US", { weekday: "long" });
      case "MMM d":
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      case "EEEE, MMMM d":
        return date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });
      case "dd":
        return date.getDate().toString().padStart(2, "0");
      default:
        return date.toLocaleDateString();
    }
  };

  // Each day resolves to exactly one state, so the buckets never overlap.
  const holidayDates = calendarDays
    .filter((day) => resolveDayState(day).key === "HOLIDAY")
    .map((day) => day.date);

  const weekendDates = calendarDays
    .filter((day) => resolveDayState(day).key === "WEEKEND")
    .map((day) => day.date);

  const workingDates = calendarDays
    .filter((day) => {
      const key = resolveDayState(day).key;
      return key === "NORMAL" || key === "SPECIAL_WORKING";
    })
    .map((day) => day.date);

  const filteredHolidayDates = holidayDates;

  const filteredWeekendDates = weekendDates;

  // Calculate statistics
  const monthDays = getDaysInMonth(currentMonth);

  const monthStats = {
    totalDays: monthDays.length,
    workingDays: monthDays.filter((date) =>
      workingDates.some((wd) => wd.toDateString() === date.toDateString())
    ).length,
    holidays: monthDays.filter((date) =>
      filteredHolidayDates.some(
        (hd) => hd.toDateString() === date.toDateString()
      )
    ).length,
    weekends: monthDays.filter((date) =>
      filteredWeekendDates.some(
        (wd) => wd.toDateString() === date.toDateString()
      )
    ).length,
  };

  const getSelectedDayInfo = () => {
    if (!selected) return null;
    const dateStr = selected.toDateString();
    return calendarDays.find((d) => d.date.toDateString() === dateStr);
  };

  const selectedDayInfo = getSelectedDayInfo();

  // Get upcoming events
  const upcomingEvents = calendarDays
    .filter(
      (day) =>
        day.date >= new Date() && (day.isHoliday || day.dayType !== "Regular")
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  // Restrict month changes to selected year only
  const handleMonthChange = (date: Date) => {
    // If year is selected, only allow navigation within that year
    if (selectedYear) {
      if (date.getFullYear() === selectedYear) {
        // Only update if staying within the selected year
        setCurrentMonth(date);
      }
      // Silently ignore attempts to navigate outside the year
    } else {
      // No year selected, allow free navigation
      setCurrentMonth(date);
    }
  };

  // Disable dates outside selected year
  const isDateDisabled = (date: Date): boolean => {
    if (!selectedYear) return false;
    return date.getFullYear() !== selectedYear;
  };

  // Filter calendar days for list view
  const filteredCalendarDays = calendarDays
    .filter((day) => {
      if (!filters.showHolidays && day.isHoliday) return false;
      if (!filters.showWeekends && day.isWeekend) return false;
      if (!filters.showWorkingDays && day.isWorkingDay) return false;

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          day.dayType.toLowerCase().includes(searchLower) ||
          formatDate(day.date, "EEEE, MMMM d")
            .toLowerCase()
            .includes(searchLower)
        );
      }

      return true;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
  }> = ({ title, value, icon }) => (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="p-2 rounded-md bg-muted">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <UnleashLoading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={view === "calendar" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("calendar")}
              className="flex items-center gap-2"
            >
              <Grid className="h-4 w-4" />
              Calendar
            </Button>
            <Button
              variant={view === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("list")}
              className="flex items-center gap-2"
            >
              <List className="h-4 w-4" />
              List View
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-2 sm:p-4 space-y-4 lg:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Main Calendar */}
          <div className="lg:col-span-3">
            <Card className="border">
              <CardHeader className="pb-4 px-3 sm:px-6">
                <div className="flex flex-col gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-base sm:text-lg">
                      {view === "calendar" ? "Calendar View" : "List View"}
                    </span>
                  </CardTitle>

                  {/* Search and Filters */}
                  <div className="flex flex-col gap-4">
                    {view === "list" && (
                      <Input
                        placeholder="Search events..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:max-w-xs"
                      />
                    )}

                    {/* Filter Switches - Responsive Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="holidays"
                          checked={filters.showHolidays}
                          onCheckedChange={(checked) =>
                            setFilters((prev) => ({
                              ...prev,
                              showHolidays: checked,
                            }))
                          }
                        />
                        <Label
                          htmlFor="holidays"
                          className="flex items-center gap-1 text-xs sm:text-sm"
                        >
                          Holidays
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="weekends"
                          checked={filters.showWeekends}
                          onCheckedChange={(checked) =>
                            setFilters((prev) => ({
                              ...prev,
                              showWeekends: checked,
                            }))
                          }
                        />
                        <Label
                          htmlFor="weekends"
                          className="flex items-center gap-1 text-xs sm:text-sm"
                        >
                          Weekends
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="working"
                          checked={filters.showWorkingDays}
                          onCheckedChange={(checked) =>
                            setFilters((prev) => ({
                              ...prev,
                              showWorkingDays: checked,
                            }))
                          }
                        />
                        <Label
                          htmlFor="working"
                          className="flex items-center gap-1 text-xs sm:text-sm"
                        >
                          Working
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-3 sm:px-6">
                {view === "calendar" ? (
                  <>
                    {/* Legend - Responsive Grid */}
                    <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm p-3 sm:p-4 bg-muted rounded-md">
                      {filters.showHolidays && (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 border rounded"></div>
                          <span className="font-medium">Holidays</span>
                        </div>
                      )}
                      {filters.showWeekends && (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 bg-red-200 rounded"></div>
                          <span className="font-medium">Weekends</span>
                        </div>
                      )}
                      {filters.showWorkingDays && (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 border rounded"></div>
                          <span className="font-medium">Working Days</span>
                        </div>
                      )}
                    </div>

                    {/* Calendar - Responsive */}
                    <div className="overflow-x-auto flex flex-col sm:flex-row items-center justify-center">
                      <div className="block sm:hidden">
                        <Calendar
                          mode="single"
                          selected={selected}
                          onSelect={setSelected}
                          onMonthChange={handleMonthChange}
                          disabled={isDateDisabled}
                          numberOfMonths={1}
                          modifiers={{
                            working: filters.showWorkingDays
                              ? workingDates
                              : [],
                            holiday: filters.showHolidays
                              ? filteredHolidayDates
                              : [],
                            weekend: filters.showWeekends
                              ? filteredWeekendDates
                              : [],
                            selected: selected ? [selected] : [],
                          }}
                          className="rounded-md border-0"
                          components={{
                            Day: (dayProps: CustomDayProps) => {
                              const { day, modifiers } = dayProps;
                              const date = day.date;

                              const selected = modifiers?.selected;

                              const handleClick = () => {
                                setSelected(date);
                              };

                              const dateStr = date.toDateString();
                              const status = (() => {
                                const match = calendarDays.find(
                                  (d) => d.date.toDateString() === dateStr
                                );
                                if (!match)
                                  return { label: "Unknown", type: "Unknown" };
                                return {
                                  label: resolveDayState(match).baseLabel,
                                  type: match.dayType,
                                };
                              })();

                              const getClassNames = () => {
                                const classes = [
                                  "rounded-md w-8 h-8 text-sm p-0 font-normal transition-all duration-200 hover:bg-muted",
                                ];

                                if (selected) {
                                  classes.push(
                                    "bg-primary text-primary-foreground"
                                  );
                                }

                                if (
                                  filters.showHolidays &&
                                  filteredHolidayDates.some(
                                    (d) => d.toDateString() === dateStr
                                  )
                                ) {
                                  classes.push(
                                    "bg-red-500 hover:bg-red-700 text-background font-semibold"
                                  );
                                }
                                if (
                                  filters.showWorkingDays &&
                                  workingDates.some(
                                    (d) => d.toDateString() === dateStr
                                  )
                                ) {
                                  classes.push(
                                    "bg-green-500 hover:bg-green-700 text-background"
                                  );
                                }
                                if (
                                  filters.showWeekends &&
                                  filteredWeekendDates.some(
                                    (d) => d.toDateString() === dateStr
                                  )
                                ) {
                                  classes.push(
                                    "bg-red-200 hover:bg-red-400 font-semibold"
                                  );
                                }

                                return classes.join(" ");
                              };

                              return (
                                <HoverCard>
                                  <HoverCardTrigger asChild>
                                    <button
                                      className={getClassNames()}
                                      aria-label={date.toDateString()}
                                      aria-pressed={selected}
                                      onClick={handleClick}
                                    >
                                      {date.getDate()}
                                    </button>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="text-sm">
                                    <div className="space-y-2">
                                      <p className="font-semibold">
                                        {formatDate(date, "EEEE, MMMM d, yyyy")}
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant={
                                            status.label === "Working Day"
                                              ? "success"
                                              : status.label === "Holiday"
                                                ? "destructive"
                                                : "outline"
                                          }
                                        >
                                          {status.label === "Working Day"
                                            ? "Working Day"
                                            : status.label === "Holiday"
                                              ? "Holiday"
                                              : status.label === "Weekend"
                                                ? "Weekend"
                                                : "Regular Working Day"}
                                        </Badge>
                                      </div>
                                      <p className="text-muted-foreground text-xs">
                                        {status.type}
                                      </p>
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              );
                            },
                          }}
                        />
                      </div>
                      <div className="hidden sm:block">
                        <Calendar
                          mode="single"
                          selected={selected}
                          onSelect={setSelected}
                          onMonthChange={handleMonthChange}
                          disabled={isDateDisabled}
                          numberOfMonths={2}
                          modifiers={{
                            working: filters.showWorkingDays
                              ? workingDates
                              : [],
                            holiday: filters.showHolidays
                              ? filteredHolidayDates
                              : [],
                            weekend: filters.showWeekends
                              ? filteredWeekendDates
                              : [],
                            selected: selected ? [selected] : [],
                          }}
                          className="rounded-md border-0"
                          components={{
                            Day: (dayProps: CustomDayProps) => {
                              const { day, modifiers } = dayProps;
                              const date = day.date;

                              const selected = modifiers?.selected;

                              const handleClick = () => {
                                setSelected(date);
                              };

                              const dateStr = date.toDateString();
                              const status = (() => {
                                const match = calendarDays.find(
                                  (d) => d.date.toDateString() === dateStr
                                );
                                if (!match)
                                  return { label: "Unknown", type: "Unknown" };
                                return {
                                  label: resolveDayState(match).baseLabel,
                                  type: match.dayType,
                                };
                              })();

                              const getClassNames = () => {
                                const classes = [
                                  "rounded-md w-8 h-8 text-sm p-0 font-normal transition-all duration-200 hover:bg-muted",
                                ];

                                if (selected) {
                                  classes.push(
                                    "bg-primary text-primary-foreground"
                                  );
                                }

                                if (
                                  filters.showHolidays &&
                                  filteredHolidayDates.some(
                                    (d) => d.toDateString() === dateStr
                                  )
                                ) {
                                  classes.push(
                                    "bg-red-500 hover:bg-red-700 text-background font-semibold"
                                  );
                                }
                                if (
                                  filters.showWorkingDays &&
                                  workingDates.some(
                                    (d) => d.toDateString() === dateStr
                                  )
                                ) {
                                  classes.push(
                                    "bg-green-500 hover:bg-green-700 text-background"
                                  );
                                }
                                if (
                                  filters.showWeekends &&
                                  filteredWeekendDates.some(
                                    (d) => d.toDateString() === dateStr
                                  )
                                ) {
                                  classes.push(
                                    "bg-red-200 hover:bg-red-400 font-semibold"
                                  );
                                }

                                return classes.join(" ");
                              };

                              return (
                                <HoverCard>
                                  <HoverCardTrigger asChild>
                                    <button
                                      className={getClassNames()}
                                      aria-label={date.toDateString()}
                                      aria-pressed={selected}
                                      onClick={handleClick}
                                    >
                                      {date.getDate()}
                                    </button>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="text-sm">
                                    <div className="space-y-2">
                                      <p className="font-semibold">
                                        {formatDate(date, "EEEE, MMMM d, yyyy")}
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant={
                                            status.label === "Working Day"
                                              ? "success"
                                              : status.label === "Holiday"
                                                ? "destructive"
                                                : "outline"
                                          }
                                        >
                                          {status.label === "Working Day"
                                            ? "Working Day"
                                            : status.label === "Holiday"
                                              ? "Holiday"
                                              : status.label === "Weekend"
                                                ? "Weekend"
                                                : "Regular Working Day"}
                                        </Badge>
                                      </div>
                                      <p className="text-muted-foreground text-xs">
                                        {status.type}
                                      </p>
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              );
                            },
                          }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  /* List View - Responsive */
                  <div className="space-y-2 max-h-[50vh] sm:max-h-96 overflow-y-auto">
                    {filteredCalendarDays.length > 0 ? (
                      filteredCalendarDays.map((day, index) => (
                        <div
                          key={index}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-md hover:bg-muted transition-colors cursor-pointer"
                          onClick={() => setSelected(day.date)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-lg sm:text-xl font-semibold text-muted-foreground min-w-[2.5rem] sm:min-w-[3rem]">
                              {formatDate(day.date, "dd")}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm sm:text-base">
                                {formatDate(day.date, "EEEE, MMMM d")}
                              </p>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {day.dayType}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={resolveDayState(day).badgeVariant}
                            className="self-start sm:self-auto text-xs"
                          >
                            {resolveDayState(day).baseLabel}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <CalendarDays className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No events found</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Responsive */}
          <div className="space-y-4 lg:space-y-6">
            {/* Selected Day Info */}
            <Card className="border">
              <CardHeader className="">
                <CardTitle className="text-base sm:text-lg">
                  Selected Day
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {selectedDayInfo ? (
                  <div className="space-y-3">
                    <div className="text-center p-3 sm:p-4 bg-muted rounded-md">
                      <p className="text-xl sm:text-2xl font-bold">
                        {selected?.getDate()}
                      </p>
                      <p className="text-xs sm:text-sm font-medium">
                        {selected ? formatDate(selected, "EEEE") : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selected ? formatDate(selected, "MMMM yyyy") : ""}
                      </p>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                        <span className="text-xs sm:text-sm font-medium">
                          Status:
                        </span>
                        <Badge
                          variant={resolveDayState(selectedDayInfo).badgeVariant}
                          className="text-xs self-start sm:self-auto"
                        >
                          {resolveDayState(selectedDayInfo).baseLabel}
                        </Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                        <span className="text-xs sm:text-sm font-medium">
                          Type:
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {selectedDayInfo.dayType}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mt-2">
                        <Button
                          variant="outline"
                          className="text-xs sm:text-sm"
                          size="sm"
                          onClick={() => setOpenHolidayDrawer(true)}
                        >
                          <CalendarPlus /> Holiday
                        </Button>
                        <Button
                          variant="default"
                          className="text-xs sm:text-sm"
                          size="sm"
                          onClick={() => setOpenWorkingDayDrawer(true)}
                        >
                          <CalendarPlus /> Working Day
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground">
                    <CalendarDays className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-xs sm:text-sm">
                      Select a date to view details
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {openHolidayDrawer && (
        <HolidayWorkingDayDrawer
          open={openHolidayDrawer}
          onOpenChange={setOpenHolidayDrawer}
          type="holiday"
          calendarId={calendarId}
          holidayWorkingDay={selected}
          onHolidayWorkingDayUpdate={() => setOnHolidayWorkingDayUpdate(true)}
        />
      )}
      {openWorkingDayDrawer && (
        <HolidayWorkingDayDrawer
          open={openWorkingDayDrawer}
          onOpenChange={setOpenWorkingDayDrawer}
          type="workingDay"
          calendarId={calendarId}
          holidayWorkingDay={selected}
          onHolidayWorkingDayUpdate={() => setOnHolidayWorkingDayUpdate(true)}
        />
      )}
    </div>
  );
};

export default View;

