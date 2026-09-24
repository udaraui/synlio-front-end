"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, Loader2, Repeat, Save } from "lucide-react";
import {
  createRepeatedHoliday,
  getAllCalendarDays,
} from "@/services/resource-management/calendar-services";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";

interface RepeatedHolidayDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repeatedHoliday?: any;
  onRepeatedHolidayUpdate?: () => void;
  type: "create" | "edit";
  calendarId: number;
  selectedYear?: number;
  isSystemUser?: boolean;
}

const daysMap = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

interface SelectedDay {
  day: number;
  type: "FULL" | "HALF";
}

interface RepeatedHolidayFormValues {
  year: number;
  selectedDays: SelectedDay[];
}

const formSchema = z.object({
  year: z.number().min(1900, { message: "Please select a valid year." }),
  selectedDays: z
    .array(
      z.object({
        day: z.number().min(0).max(6),
        type: z.enum(["FULL", "HALF"]),
      }),
    )
    .min(1, { message: "Please select at least one day." }),
});

export function RepeatedHolidayDrawer({
  open,
  onOpenChange,
  onRepeatedHolidayUpdate,
  type,
  calendarId,
  selectedYear,
}: RepeatedHolidayDrawerProps) {
  const canCreate = usePrivilegeGuard("35") as boolean;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDays, setSelectedDays] = useState<SelectedDay[]>([]);
  const [calendarYears, setCalendarYears] = useState<number[]>([]);
  const [yearsLoading, setYearsLoading] = useState(false);
  const currentYear = new Date().getFullYear();

  const form = useForm<RepeatedHolidayFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedDays: [],
      year: selectedYear ?? currentYear,
    },
  });

  const toggleDay = (dayValue: number) => {
    setSelectedDays((prev) => {
      const exists = prev.find((d) => d.day === dayValue);
      if (exists) return prev.filter((d) => d.day !== dayValue);
      return [...prev, { day: dayValue, type: "FULL" }];
    });
  };

  const updateDayType = (dayValue: number, t: "FULL" | "HALF") => {
    setSelectedDays((prev) =>
      prev.map((d) => (d.day === dayValue ? { ...d, type: t } : d)),
    );
  };

  const loadCalendarYears = async (id: number) => {
    setYearsLoading(true);
    try {
      const response = await getAllCalendarDays(id);
      const yearValues = response.data.map((d: any): number => Number(d?.year));
      const validYears = yearValues.filter((year: number) => !Number.isNaN(year));
      const years = Array.from(new Set<number>(validYears)).sort((a, b) => a - b);
      setCalendarYears(years);
      if (years.length > 0) {
        const validYear =
          selectedYear && years.includes(selectedYear) ? selectedYear : years[0];
        form.setValue("year", validYear);
      }
    } catch {
      toast.error("Failed to load calendar years");
    } finally {
      setYearsLoading(false);
    }
  };

  useEffect(() => {
    if (calendarId) loadCalendarYears(calendarId);
  }, [calendarId, selectedYear]);

  useEffect(() => {
    form.setValue("selectedDays", selectedDays);
  }, [selectedDays, form]);

  useEffect(() => {
    if (selectedYear) form.setValue("year", selectedYear);
  }, [selectedYear, form]);

  const handleSubmit = async (data: RepeatedHolidayFormValues) => {
    if (!calendarId) {
      toast.error("Calendar ID is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = { year: data.year, days: data.selectedDays };
      const response = await createRepeatedHoliday(calendarId, payload);
      if (response.status === 200 || response.status === 201) {
        toast.success("Repeated holiday saved");
        setSelectedDays([]);
        form.reset();
        onOpenChange(false);
        onRepeatedHolidayUpdate?.();
      } else {
        toast.error("Failed to save repeated holiday");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Something went wrong",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-4 pb-2 sticky top-0 z-10 bg-background">
          <div className="flex items-center gap-3">
            {/* <div className="p-2 bg-primary/10 rounded-lg">
              <Repeat className="w-5 h-5 text-primary" />
            </div> */}
            <div>
              <DialogTitle className="text-lg">
                {type === "create" ? "Add Repeated Holiday" : "Edit Repeated Holiday"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Configure recurring days that should be treated as holidays.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 space-y-5">
              {!canCreate ? (
                <p className="text-sm text-muted-foreground">
                  You are not authorized to add repeated holidays.
                </p>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <FormControl>
                          <Select
                            value={String(field.value)}
                            onValueChange={(v) => field.onChange(Number(v))}
                            disabled={calendarYears.length === 0}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                              {calendarYears.length > 0 ? (
                                calendarYears.map((year) => (
                                  <SelectItem key={year} value={String(year)}>
                                    {year}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="py-2 px-3 text-sm text-muted-foreground">
                                  {yearsLoading ? "Loading years..." : "No years available"}
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                        {!yearsLoading && calendarYears.length === 0 && (
                          <p className="text-xs text-destructive mt-1">
                            No calendar years are assigned to this calendar.
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="selectedDays"
                    render={() => (
                      <FormItem>
                        <FormLabel>Repeat on</FormLabel>
                        <FormControl>
                          <div className="space-y-3 border border-border/60 bg-muted/20 rounded-md p-3.5">
                            {daysMap.map((day) => {
                              const dayObj = selectedDays.find(
                                (d) => d.day === day.value,
                              );
                              return (
                                <div
                                  key={day.value}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <Checkbox
                                      id={`day-${day.value}`}
                                      checked={!!dayObj}
                                      onCheckedChange={() => toggleDay(day.value)}
                                    />
                                    <Label
                                      htmlFor={`day-${day.value}`}
                                      className="text-sm cursor-pointer"
                                    >
                                      {day.label}
                                    </Label>
                                  </div>
                                  {dayObj && (
                                    <div className="flex items-center space-x-2">
                                      <Switch
                                        checked={dayObj.type === "FULL"}
                                        onCheckedChange={(checked) =>
                                          updateDayType(
                                            day.value,
                                            checked ? "FULL" : "HALF",
                                          )
                                        }
                                      />
                                      <span className="text-xs font-medium w-14 text-right">
                                        {dayObj.type === "FULL" ? "Full Day" : "Half Day"}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </FormControl>
                        <FormMessage />
                        <p className="text-sm text-muted-foreground py-2">
                          Applies from today onwards only. Past dates keep
                          their current values. Special holidays already set on
                          these dates are kept, and special working days on a
                          weekday you remove become normal working days again.
                        </p>
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="px-6 pb-4 pt-2">
              <div className="flex justify-between w-full items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    yearsLoading ||
                    calendarYears.length === 0 ||
                    !canCreate
                  }
                >
                  {isSubmitting && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  <Save className="h-4 w-4" />
                  {type === "create" ? "Create" : "Save Changes"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default RepeatedHolidayDrawer;
