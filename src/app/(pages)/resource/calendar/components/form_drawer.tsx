"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
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
  createCalendar,
  getCalendarWeekConfig,
  updateCalendar,
  type CalendarWeekConfig,
} from "@/services/calendar-services";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, Loader2, X, Save } from "lucide-react";
import {
  WEEK_DAYS,
  YearStartPicker,
  addDays,
  formatDay,
  parseIsoDate,
  toIsoDate,
  weekDayLabel,
} from "./week_start_picker";

interface CalendarFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendar?: any;
  type: "create" | "update";
  onCalendarUpdate?: () => void;
  isSystemUser?: boolean;
  companies?: any[];
  defaultCompanyId?: string;
}

const formSchema = z.object({
  name: z.string().min(1, { message: "Calendar name is required." }),
  weekStartDay: z.number().optional(),
  yearStartDate: z.date().optional(),
  companyId: z.number().optional(),
  isActive: z.boolean().optional(),
});

export function CalendarFormDrawer({
  open,
  onOpenChange,
  calendar,
  onCalendarUpdate,
  type,
  isSystemUser,
  companies,
  defaultCompanyId,
}: CalendarFormDrawerProps) {
  const createAccess = usePrivilegeGuard("30") as boolean;
  const updateAccess = usePrivilegeGuard("32") as boolean;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  // Week alignment of an existing calendar, plus whether it can still change.
  const [weekConfig, setWeekConfig] = useState<CalendarWeekConfig | null>(null);
  const [weekInfoLoading, setWeekInfoLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: type === "update" ? calendar?.name || "" : "",
      weekStartDay: undefined,
      yearStartDate: undefined,
      companyId:
        type === "update"
          ? calendar?.companyId || undefined
          : isSystemUser && defaultCompanyId
          ? parseInt(defaultCompanyId)
          : undefined,
      isActive: type === "update" ? calendar?.isActive ?? true : true,
    },
  });

  // In edit mode the year start date stays editable only while the calendar is
  // still unconfigured, because moving it regenerates every day.
  useEffect(() => {
    if (type !== "update" || !calendar?.id) return;

    let cancelled = false;
    (async () => {
      setWeekInfoLoading(true);
      try {
        const config = await getCalendarWeekConfig(calendar.id);
        if (cancelled) return;

        setWeekConfig(config);
        if (config.yearStartDate) {
          const yearStart = parseIsoDate(config.yearStartDate);
          form.setValue("yearStartDate", yearStart);
          form.setValue("weekStartDay", yearStart.getDay());
        }
      } catch {
        // Non-blocking: name and status can still be edited without it.
      } finally {
        if (!cancelled) setWeekInfoLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [type, calendar?.id]);

  const canEditYearStart = type === "create" || weekConfig?.isEditable === true;
  const weekStartDay = form.watch("weekStartDay");

  const onSubmit = async (data: any) => {
    if (type === "create" && data.weekStartDay === undefined) {
      form.setError("weekStartDay", {
        message: "Week start date is required.",
      });
      return;
    }

    if (type === "create" && !data.yearStartDate) {
      form.setError("yearStartDate", {
        message: "Year start date is required.",
      });
      return;
    }

    const active_company = JSON.parse(localStorage.getItem("active_company") || "{}");
    // weekStartDay only shapes the picker; the API derives it from the date.
    const { yearStartDate, ...rest } = data;
    delete rest.weekStartDay;

    const payload = {
      ...rest,
      companyId: isSystemUser ? data.companyId : active_company.companyId,
      // Only sent when it may actually change; a locked calendar keeps its days.
      ...(canEditYearStart && yearStartDate
        ? { yearStartDate: toIsoDate(yearStartDate) }
        : {}),
    };
    setIsSubmitting(true);
    try {
      const response =
        type === "update"
          ? await updateCalendar(calendar?.id, payload)
          : await createCalendar(payload);

      if (response.status === 201 || response.status === 200) {
        toast.success(type === "update" ? "Calendar updated." : "Calendar created.");
        onOpenChange(false);
        form.reset();
        onCalendarUpdate?.();
      } else {
        toast.error(type === "update" ? "Update failed." : "Creation failed.");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-2 sticky top-0 z-10 bg-background">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div>
                <DialogTitle className="text-lg">
                  {type === "create" ? "Create Calendar" : "Edit Calendar"}
                </DialogTitle>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 hover:bg-muted rounded transition-colors focus:outline-none"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </DialogHeader>

        {/* Body */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
              {!(createAccess || updateAccess) ? (
                <p className="text-sm text-muted-foreground">
                  You are not authorized to {type === "create" ? "create" : "edit"} calendars.
                </p>
              ) : (
                <>
                  {isSystemUser && (
                    <FormField
                      control={form.control}
                      name="companyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company<span className="text-destructive"> *</span></FormLabel>
                          <FormControl>
                            <Select
                              value={field.value?.toString()}
                              onValueChange={(v) => field.onChange(parseInt(v))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select company" />
                              </SelectTrigger>
                              <SelectContent>
                                {companies?.map((c: any) => (
                                  <SelectItem key={c.id} value={c.id.toString()}>
                                    {c.company}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name<span className="text-destructive"> *</span></FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Sri Lanka 2026" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="weekStartDay"
                    render={({ field }) => {
                      const locked = type === "update" && !canEditYearStart;
                      return (
                        <FormItem>
                          <FormLabel>Week Start Date<span className="text-destructive"> *</span></FormLabel>
                          <FormControl>
                            <div className="flex flex-wrap gap-1.5">
                              {WEEK_DAYS.map((day) => {
                                const active = field.value === day.value;
                                return (
                                  <button
                                    key={day.value}
                                    type="button"
                                    disabled={locked || weekInfoLoading}
                                    aria-pressed={active}
                                    onClick={() => {
                                      field.onChange(day.value);
                                      form.clearErrors("weekStartDay");
                                      // The picked year start no longer lines
                                      // up with the new weekday.
                                      form.setValue("yearStartDate", undefined);
                                    }}
                                    className={cn(
                                      "rounded-md border px-3 py-1 text-xs font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed",
                                      active
                                        ? "border-[#70B5E6] bg-[#70B5E6] text-white shadow-sm"
                                        : "border-gray-200 dark:border-gray-800 bg-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800",
                                    )}
                                  >
                                    {day.label}
                                  </button>
                                );
                              })}
                            </div>
                          </FormControl>
                          {field.value !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              Every week of this calendar starts on a{" "}
                              {weekDayLabel(field.value)}.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="yearStartDate"
                    render={({ field }) => {
                      const weekEnd = field.value
                        ? addDays(field.value, 6)
                        : undefined;

                      // Locked once holidays, weekend patterns, special working
                      // days or resources exist, since moving the start date
                      // regenerates every day of the calendar.
                      if (type === "update" && !canEditYearStart) {
                        return (
                          <FormItem>
                            <FormLabel>Year Start Date<span className="text-destructive"> *</span></FormLabel>
                            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 px-4 py-3 space-y-1.5">
                              {weekInfoLoading ? (
                                <span className="text-sm text-muted-foreground">
                                  Loading week alignment…
                                </span>
                              ) : field.value && weekEnd ? (
                                <>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {formatDay(field.value)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Week 1 runs {formatDay(field.value)} &ndash;{" "}
                                    {formatDay(weekEnd)}.
                                  </p>
                                  <div className="pt-2 text-xs">
                                    <p className="font-semibold text-[#D35D20] dark:text-[#E87336]">
                                      This calendar is already in use, so the
                                      year start date is locked:
                                    </p>
                                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[#D35D20] dark:text-[#E87336]">
                                      {weekConfig?.blockers.map((blocker) => (
                                        <li key={blocker}>{blocker}</li>
                                      ))}
                                    </ul>
                                    <p className="mt-2 text-muted-foreground">
                                      Changing it would renumber every week and
                                      discard that setup. Create a new calendar
                                      instead.
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  Not set for this calendar.
                                </span>
                              )}
                            </div>
                          </FormItem>
                        );
                      }

                      return (
                        <FormItem>
                          <FormLabel>Year Start Date<span className="text-destructive"> *</span></FormLabel>
                          <Popover
                            open={weekPickerOpen}
                            onOpenChange={setWeekPickerOpen}
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={
                                    weekInfoLoading || weekStartDay === undefined
                                  }
                                  className="w-full justify-start font-normal"
                                >
                                  <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                                  {field.value ? (
                                    formatDay(field.value)
                                  ) : (
                                    <span className="text-muted-foreground">
                                      {weekStartDay === undefined
                                        ? "Select a week start date first"
                                        : `Select the ${weekDayLabel(
                                            weekStartDay,
                                          )} that starts the year`}
                                    </span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              {weekStartDay !== undefined && (
                                <YearStartPicker
                                  weekStartDay={weekStartDay}
                                  value={field.value}
                                  onChange={(yearStart) => {
                                    field.onChange(yearStart);
                                    form.clearErrors("yearStartDate");
                                  }}
                                  onConfirm={() => setWeekPickerOpen(false)}
                                />
                              )}
                            </PopoverContent>
                          </Popover>
                          {field.value && weekEnd && (
                            <p className="text-xs text-muted-foreground">
                              Week 1 runs {formatDay(field.value)} &ndash;{" "}
                              {formatDay(weekEnd)}.
                            </p>
                          )}
                          {type === "update" && (
                            <p className="text-xs text-muted-foreground">
                              This calendar has no holidays, weekend pattern or
                              assigned resources yet, so the start date can
                              still move. Changing it regenerates
                              {weekConfig && weekConfig.yearCount > 1
                                ? ` all ${weekConfig.yearCount} years of days.`
                                : " the calendar days."}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Status<span className="text-destructive"> *</span></FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Determines if this calendar is active.
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex justify-end w-full items-center gap-3">
              <Button type="button" variant="outline" className="rounded-lg px-6" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-lg bg-primary hover:bg-primary/80 px-6" disabled={isSubmitting || !(createAccess || updateAccess)}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4" />
                {type === "create" ? "Create" : "Update"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CalendarFormDrawer;
