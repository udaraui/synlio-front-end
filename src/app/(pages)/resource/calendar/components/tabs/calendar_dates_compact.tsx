"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import {
  deleteHolidaysAndWorkingDays,
  loadCalendardates,
} from "@/services/calendar-services";
import { Calendar, CalendarDays } from "@/interfaces/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Info_button from "@/components/Info_button";
import DeleteModal from "@/components/DeleteModal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDashed,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash,
  Umbrella,
} from "lucide-react";
import { HolidayWorkingDayDrawer } from "../formDrawers/holiday_workingDay";
import { isPastDate, resolveDayState } from "@/lib/calendar-day-state";
import { toIsoDate } from "../week_start_picker";

interface CalendarDatesCompactProps {
  calendar: Calendar;
  type: "holidays" | "specialWorkingDay";
  selectedYear?: number;
  /** Restricts the list to one of the calendar's own years. */
  dateRange?: { from: Date; to: Date };
  isSystemUser?: boolean;
  onCountChange?: (count: number) => void;
}

const CalendarDatesCompact: React.FC<CalendarDatesCompactProps> = ({
  calendar,
  type,
  selectedYear,
  dateRange,
  isSystemUser,
  onCountChange,
}) => {
  const [calendarDates, setCalendarDates] = useState<CalendarDays[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const [isCreating, setIsCreating] = useState(false);
  const [editingDate, setEditingDate] = useState<CalendarDays | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const canCreate = usePrivilegeGuard(type === "holidays" ? "33" : "34") as boolean;
  const canView = usePrivilegeGuard("29") as boolean;
  const canDelete = usePrivilegeGuard(type === "holidays" ? "36" : "37") as boolean;

  const totalPages = Math.ceil(totalRecords / itemsPerPage);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [debouncedSearchTerm, selectedYear, dateRange?.from, dateRange?.to]);

  const fetchDates = async () => {
    if (!canView) {
      setCalendarDates([]);
      setTotalRecords(0);
      return;
    }
    setIsLoading(true);
    try {
      const filters = [
        ...(calendar.id
          ? [{ field: "calendarId", value: calendar.id, matchMode: "equals" }]
          : []),
        ...(type
          ? [
              {
                field: type === "holidays" ? "isHoliday" : "isSpecialWorkingDay",
                value: true,
                matchMode: "equals",
              },
            ]
          : []),
        // A calendar year is week aligned and spills into the next one, so the
        // range of the selected year is what scopes the list.
        ...(dateRange
          ? [
              {
                field: "date",
                value: [toIsoDate(dateRange.from), toIsoDate(dateRange.to)],
                matchMode: "dateBetween",
              },
            ]
          : selectedYear
            ? [{ field: "year", value: selectedYear, matchMode: "equals" }]
            : []),
        ...(debouncedSearchTerm
          ? [
              {
                field: "date",
                value: debouncedSearchTerm,
                matchMode: "contains",
              },
            ]
          : []),
      ];

      const params = {
        first: (currentPage - 1) * itemsPerPage,
        rows: itemsPerPage,
        filters,
      };

      const result = await loadCalendardates(params);
      if (result && Array.isArray(result.data)) {
        const total = result.total || result.data.length;
        setTotalRecords(total);
        if (!debouncedSearchTerm) onCountChange?.(total);
        setCalendarDates(
          result.data.map((d: any) => ({
            id: d.id,
            date: d.date || "",
            year: d.year,
            yearStartDate: d.yearStartDate ?? null,
            weekNumber: d.weekNumber ?? null,
            daysOfWeek: d.daysOfWeek ?? null,
            weekStartDate: d.weekStartDate ?? null,
            weekEndDate: d.weekEndDate ?? null,
            isHoliday: d.isHoliday,
            isWeekend: d.isWeekend,
            isWorkingDay: d.isWorkingDay,
            isSpecialWorkingDay: d.isSpecialWorkingDay ?? false,
            dayType: d.dayType,
            calendarId: d.calendarId,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            createdBy: d.createdBy,
            updatedBy: d.updatedBy,
          })),
        );
      } else {
        setCalendarDates([]);
        setTotalRecords(0);
        if (!debouncedSearchTerm) onCountChange?.(0);
      }
    } catch {
      toast.error("Failed to fetch calendar dates");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDates();
  }, [
    calendar.id,
    currentPage,
    itemsPerPage,
    debouncedSearchTerm,
    selectedYear,
    dateRange?.from,
    dateRange?.to,
    type,
    canView,
  ]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
        {/* Toolbar */}
        <div className="flex-none flex flex-wrap gap-2 items-center py-2 px-3">
          <div className="flex gap-2 flex-shrink-0">
            {canCreate && (
              <Button size="sm" className="h-7 text-xs px-2.5 shadow-none" onClick={() => setIsCreating(true)}>
                <Plus className="h-3 w-3" />
                Add New
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 w-7 p-0 shadow-none bg-transparent cursor-pointer hover:text-foreground" onClick={fetchDates} disabled={isLoading}>
              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by date"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-7 text-xs placeholder:text-xs shadow-none"
            />
          </div>
        </div>

      {/* List */}
      <div className="flex-1 px-3 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 border border-border/60 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-900/40">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <div className="flex flex-col items-center justify-center min-w-[3.5rem] bg-background border border-border rounded-md py-1.5 flex-shrink-0 relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-muted" />
                  <Skeleton className="h-3 w-6 mt-1" />
                  <Skeleton className="h-5 w-5 mt-1" />
                </div>
                <div className="min-w-0 flex-1 flex flex-col gap-2 justify-center py-1">
                  <Skeleton className="h-4 w-3/4 max-w-[200px]" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-md" />
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : calendarDates.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Umbrella className="h-8 w-8 opacity-30 mx-auto mb-2" />
          <p className="text-sm">
            {type === "holidays" ? "No holidays found" : "No working days found"}
          </p>
          {/* <p className="text-xs mt-1">
            {debouncedSearchTerm
              ? "Try adjusting your search"
              : "No entries available"}
          </p> */}
        </div>
      ) : (
        <div className="space-y-1.5">
          {calendarDates.map((item) => {
            const state = resolveDayState(item);
            const isPast = isPastDate(item.date);
            const dotColor = state.key === "SPECIAL_WORKING" ? "#22c55e" : state.key === "HOLIDAY" ? "rgba(248, 113, 113, 0.8)" : state.key === "WEEKEND" ? "rgba(254, 202, 202, 0.7)" : "#22c55e";
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 border border-border/60 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-900/40 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                    <p className="text-sm font-medium truncate leading-none mt-1">
                      {item.date ? new Date(item.date).toLocaleDateString() : "—"}
                    </p>
                    <div className="flex flex-wrap items-center gap-1">
                      {item.date && (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs font-medium">
                          {new Date(item.date).toLocaleDateString(undefined, {
                            weekday: "long",
                          })}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs font-medium text-foreground">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
                        {state.baseLabel}
                      </span>
                      {item.dayType && (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs font-medium text-foreground">
                          {item.dayType.toUpperCase() === "HALF" ? (
                            <CircleDashed className="h-3 w-3" color={dotColor} />
                          ) : (
                            <Circle className="h-3 w-3" color={dotColor} />
                          )}
                          {item.dayType.charAt(0).toUpperCase() + item.dayType.slice(1).toLowerCase()} Day
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Info_button
                    id={item.id}
                    createdBy={item.createdBy || ""}
                    createdAt={item.createdAt || ""}
                    updatedBy={item.updatedBy || ""}
                    updatedAt={item.updatedAt || ""}
                  />
                  {canCreate && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0" 
                      onClick={() => {
                        if (isPast) {
                          toast.error("Past dates cannot be changed");
                          return;
                        }
                        setEditingDate(item);
                      }}
                      disabled={isPast}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        if (isPast) {
                          toast.error("Past dates cannot be changed");
                          return;
                        }
                        setDeletingId(item.id);
                        setIsDeleting(true);
                      }}
                      disabled={isPast}
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
      </div>

      {/* Pagination footer */}
      <div className="h-11 px-4 flex-none flex items-center justify-between border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-background">
        <span className="text-xs font-medium text-muted-foreground">
          {calendarDates.length} of {totalRecords}{" "}
          {type === "holidays" ? "holidays" : "working days"}
        </span>
        <div className="flex items-center gap-2">
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(v) => setItemsPerPage(parseInt(v))}
          >
            <SelectTrigger className="h-8 w-[72px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium text-muted-foreground min-w-[40px] text-center">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {isCreating && (
        <HolidayWorkingDayDrawer
          open={isCreating}
          onOpenChange={setIsCreating}
          type={type === "holidays" ? "holiday" : "workingDay"}
          calendarId={calendar.id}
          calendarYear={selectedYear}
          holidayWorkingDay={null}
          isSystemUser={isSystemUser}
          onHolidayWorkingDayUpdate={() => {
            setIsCreating(false);
            fetchDates();
          }}
        />
      )}
      {editingDate && (
        <HolidayWorkingDayDrawer
          open={!!editingDate}
          onOpenChange={(open) => {
            if (!open) setEditingDate(null);
          }}
          type={type === "holidays" ? "holiday" : "workingDay"}
          calendarId={calendar.id}
          calendarYear={editingDate.year}
          holidayWorkingDay={editingDate}
          isSystemUser={isSystemUser}
          onHolidayWorkingDayUpdate={() => {
            setEditingDate(null);
            fetchDates();
          }}
        />
      )}
      {isDeleting && (
        <DeleteModal
          isOpen={isDeleting}
          onClose={() => {
            setIsDeleting(false);
            setDeletingId(null);
            fetchDates();
          }}
          onDelete={() =>
            deleteHolidaysAndWorkingDays(calendar.id, deletingId || 0, type)
          }
          id={deletingId || 0}
          title={type === "holidays" ? "Delete Holiday" : "Delete Working Day"}
          description={`Are you sure you want to delete this ${
            type === "holidays" ? "holiday" : "working day"
          }?`}
          buttonText="Delete"
          buttonVariant="destructive"
          buttonIcon={<CalendarOff />}
          buttonClassName="w-full"
        />
      )}
    </div>
  );
};

export default CalendarDatesCompact;

