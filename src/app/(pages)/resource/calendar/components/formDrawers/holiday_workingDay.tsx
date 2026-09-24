"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarCheck, CalendarOff, ChevronDown, Loader2, Save, Circle, CircleDashed } from "lucide-react";
import {
  createSpecialHoliday,
  createSpecialWorkingDay,
  getAllCalendarDays,
} from "@/services/resource-management/calendar-services";
import { Calendar } from "@/components/ui/calendar";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import {
  allowedDayTypes,
  buildWeekendBaseTypes,
  canBeSpecialHoliday,
  canBeSpecialWorkingDay,
  resolveDayState,
  weekendBaseTypeOf,
  type DayTypeValue,
} from "@/lib/calendar-day-state";

interface HolidayWorkingDayDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holidayWorkingDay?: any;
  onHolidayWorkingDayUpdate?: () => void;
  type: "holiday" | "workingDay";
  calendarId: number;
  calendarYear?: number;
  isSystemUser?: boolean;
}

export function HolidayWorkingDayDrawer({
  open,
  onOpenChange,
  holidayWorkingDay,
  onHolidayWorkingDayUpdate,
  type,
  calendarId,
  calendarYear,
}: HolidayWorkingDayDrawerProps) {
  const canCreateHoliday = usePrivilegeGuard("33") as boolean;
  const canCreateWorkingDay = usePrivilegeGuard("34") as boolean;
  const canAccess = type === "holiday" ? canCreateHoliday : canCreateWorkingDay;

  // Editing an existing entry: the date is fixed, only its type can change.
  const isEdit = !!holidayWorkingDay?.id;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openDate, setOpenDate] = useState(false);

  const normalizeDate = (date: Date | string) => {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  // Formats a Date as "YYYY-MM-DD" using LOCAL timezone components to avoid
  // UTC shift when Axios calls .toISOString() on the Date object.
  const toLocalDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [daysLoading, setDaysLoading] = useState(false);

  // The repeated-holiday type behind each weekday drives which options a date
  // may take, so it is derived once from the loaded days.
  const weekendBaseTypes = useMemo(
    () => buildWeekendBaseTypes(calendarDays),
    [calendarDays],
  );

  /** The stored day for a date, if the calendar covers it. */
  const findDay = (date: Date) => {
    const checkDate = normalizeDate(date).getTime();
    return calendarDays.find(
      (d) => normalizeDate(d.date).getTime() === checkDate,
    );
  };

  const isValidDate = (date: Date) => {
    const checkDate = normalizeDate(date);
    const today = normalizeDate(new Date());

    if (calendarYear && checkDate.getFullYear() !== calendarYear) return false;

    // Past days are frozen; today itself can still be changed.
    if (checkDate < today) return false;

    const match = findDay(date);
    if (!match) return false;

    // A special working day only overrides a repeated holiday, and a special
    // holiday cannot be dropped on top of a special working day.
    return type === "workingDay"
      ? canBeSpecialWorkingDay(match)
      : canBeSpecialHoliday(match, weekendBaseTypes);
  };

  const formSchema = z.object({
    dayType: z.string().min(1, { message: "Day Type is required." }),
    date: z.date().refine((date) => isValidDate(date), {
      message:
        type === "workingDay"
          ? "Pick a repeated holiday (weekend) date from today onwards that has no special holiday on it."
          : "Pick a date from today onwards — a normal working day, or a half repeated holiday.",
    }),
  });

  const getDefaultDate = () => {
    if (holidayWorkingDay && holidayWorkingDay.date) {
      return normalizeDate(holidayWorkingDay.date);
    }
    const today = normalizeDate(new Date());
    if (calendarYear && calendarYear !== today.getFullYear()) {
      return new Date(calendarYear, 0, 1);
    }
    // Today itself is still editable, so it is the natural starting point.
    return today;
  };

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dayType:
        (holidayWorkingDay?.dayType ?? "").toUpperCase() === "HALF"
          ? "Half"
          : "Full",
      date: getDefaultDate(),
    },
  });

  // Both flows need the stored days: a special working day may only land on a
  // repeated holiday, and a special holiday may not land on a special working
  // day, so the picker has to know each date's current state.
  useEffect(() => {
    if (!open || !calendarId) return;

    setDaysLoading(true);
    getAllCalendarDays(calendarId)
      .then((res) => {
        const days = res.data || [];
        setCalendarDays(days);
        const baseTypes = buildWeekendBaseTypes(days);

        // Without a pre-selected date, land on the first date that qualifies.
        if (!holidayWorkingDay || !holidayWorkingDay.date) {
          const today = normalizeDate(new Date());

          const firstUsable = days
            .filter((d: any) => {
              const dDate = normalizeDate(d.date);
              if (calendarYear && dDate.getFullYear() !== calendarYear)
                return false;
              if (dDate < today) return false;
              return type === "workingDay"
                ? canBeSpecialWorkingDay(d)
                : canBeSpecialHoliday(d, baseTypes);
            })
            .sort(
              (a: any, b: any) =>
                normalizeDate(a.date).getTime() - normalizeDate(b.date).getTime(),
            )[0];

          if (firstUsable) {
            form.setValue("date", normalizeDate(firstUsable.date));
          }
        }
      })
      .catch((err) => {
        console.error("Failed to fetch calendar days:", err);
        toast.error("Failed to load calendar days for validation");
      })
      .finally(() => {
        setDaysLoading(false);
      });
  }, [open, type, calendarId, calendarYear]);

  const selectedDate = form.watch("date");
  const selectedDay = selectedDate ? findDay(selectedDate) : undefined;

  // Only the day types this scenario allows are offered.
  const dayTypeOptions: DayTypeValue[] = selectedDay
    ? allowedDayTypes(selectedDay, type, weekendBaseTypes)
    : ["FULL", "HALF"];

  const selectedBaseType = selectedDay
    ? weekendBaseTypeOf(selectedDay, weekendBaseTypes)
    : undefined;

  // Snap the choice back to Full when Half stops being available.
  useEffect(() => {
    if (
      !dayTypeOptions.includes("HALF") &&
      form.getValues("dayType")?.toUpperCase() === "HALF"
    ) {
      form.setValue("dayType", "Full");
    }
  }, [selectedDate, dayTypeOptions.length]);

  // Nothing to pick when the calendar has no upcoming weekend dates left.
  const hasEligibleDate = calendarDays.some((d) => isValidDate(new Date(d.date)));

  const onSubmit = async (data: any) => {
    const normalizedDate = normalizeDate(data.date);
    const payload = {
      ...data,
      // Send as "YYYY-MM-DD" string so it is not shifted by UTC conversion
      date: toLocalDateString(normalizedDate),
      calendarId,
    };
    setIsSubmitting(true);
    try {
      const response =
        type === "holiday"
          ? await createSpecialHoliday(calendarId, payload)
          : await createSpecialWorkingDay(calendarId, payload);

      if (response.status === 201 || response.status === 200) {
        toast.success(
          isEdit
            ? type === "holiday"
              ? "Holiday updated"
              : "Special working day updated."
            : type === "holiday"
              ? "Holiday created."
              : "Working day created.",
        );
        onOpenChange(false);
        form.reset();
        onHolidayWorkingDayUpdate?.();
      } else {
        toast.error("Creation failed");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || error.message || "Something went wrong",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const Icon = type === "holiday" ? CalendarOff : CalendarCheck;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-4 pb-2 sticky top-0 z-10 bg-background">
          <div className="flex items-center gap-3">
            {/* <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="w-5 h-5 text-primary" />
            </div> */}
            <div>
              <DialogTitle className="text-lg">
                {isEdit
                  ? type === "holiday"
                    ? "Edit Holiday"
                    : "Edit Special Working Day"
                  : type === "holiday"
                    ? "Add Holiday"
                    : "Add Working Day"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {isEdit
                  ? "Change the day type for this date. Remove the entry instead to put the date back to what it was."
                  : type === "holiday"
                    ? "Mark a specific date as a holiday in this calendar."
                    : "Mark a specific date as a special working day."}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
              {!canAccess ? (
                <p className="text-sm text-muted-foreground">
                  You are not authorized to {isEdit ? "edit" : "add"}{" "}
                  {type === "holiday" ? "holidays" : "working days"}.
                </p>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover open={openDate} onOpenChange={setOpenDate}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-between font-normal"
                                disabled={daysLoading || isEdit}
                              >
                                {daysLoading ? (
                                  <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading days...
                                  </span>
                                ) : field.value ? (
                                  field.value.toLocaleDateString()
                                ) : (
                                  <span>Select date</span>
                                )}
                                <ChevronDown className="h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(selectedDate) => {
                                if (selectedDate) {
                                  field.onChange(normalizeDate(selectedDate));
                                }
                                setOpenDate(false);
                              }}
                              disabled={(date) => !isValidDate(date)}
                              defaultMonth={field.value}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {(() => {
                          const match = field.value
                            ? findDay(field.value)
                            : undefined;
                          if (match) {
                            const state = resolveDayState(match);
                            const dotColor = state.key === "SPECIAL_WORKING" ? "#22c55e" : state.key === "HOLIDAY" ? "rgba(248, 113, 113, 0.8)" : state.key === "WEEKEND" ? "rgba(254, 202, 202, 0.7)" : "#22c55e";
                            return (
                              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                                <span className="text-xs text-muted-foreground mr-1">Currently</span>
                                <span className="inline-flex items-center gap-1.5 rounded-md border border-border pl-2 pr-2.5 py-1 text-xs font-medium text-foreground bg-gray-50/50 dark:bg-zinc-900/50">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
                                  {state.baseLabel}
                                </span>
                                {match.dayType && (
                                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground bg-gray-50/50 dark:bg-zinc-900/50">
                                    {match.dayType.toUpperCase() === "HALF" ? (
                                      <CircleDashed className="h-3 w-3" color={dotColor} />
                                    ) : (
                                      <Circle className="h-3 w-3" color={dotColor} />
                                    )}
                                    {match.dayType.charAt(0).toUpperCase() + match.dayType.slice(1).toLowerCase()} Day
                                  </span>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {isEdit ? (
                          <p className="text-sm text-destructive">
                            The date cannot be moved. Remove this entry and add it on another date instead.
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {type === "workingDay"
                              ? "Special working days apply only to repeated holiday (weekend) dates, from today onwards."
                              : "Holidays apply from today onwards. Remove a special working day before making that date a holiday."}
                          </p>
                        )}
                        {!isEdit &&
                          type === "workingDay" &&
                          !daysLoading &&
                          calendarDays.length > 0 &&
                          !hasEligibleDate && (
                            <p className="text-xs text-destructive">
                              No upcoming repeated holiday (weekend) dates are
                              available. Add a repeated holiday first.
                            </p>
                          )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dayType"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center space-x-2 pt-1">
                            <Switch
                              checked={field.value === "Full"}
                              onCheckedChange={(checked) => field.onChange(checked ? "Full" : "Half")}
                              disabled={dayTypeOptions.length < 2}
                            />
                            <span className="text-sm font-medium">
                              {field.value === "Full" ? "Full Day" : "Half Day"}
                            </span>
                          </div>
                        </FormControl>
                        {selectedBaseType === "HALF" && (
                          <p className="text-sm text-muted-foreground">
                            This date is a half repeated holiday, so it can only
                            become a full{" "}
                            {type === "workingDay"
                              ? "special working day"
                              : "special holiday"}
                            .
                          </p>
                        )}
                        {type === "workingDay" && selectedBaseType === "FULL" && (
                          <p className="text-sm text-muted-foreground">
                            This date is a full repeated holiday, so it can
                            become a full or half special working day.
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="px-6 py-4 bg-muted/30">
              <div className="flex justify-between w-full items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !canAccess ||
                    daysLoading ||
                    (!isEdit && type === "workingDay" && !hasEligibleDate)
                  }
                >
                  {isSubmitting && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  <Save className="w-4 h-4" />
                  {isEdit ? "Update" : "Save"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default HolidayWorkingDayDrawer;
