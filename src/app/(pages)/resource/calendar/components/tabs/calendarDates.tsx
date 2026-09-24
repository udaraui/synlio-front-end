"use client";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { useAuth } from "@/contexts/auth.context";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteHolidaysAndWorkingDays,
  loadCalendardates,
} from "@/services/resource-management/calendar-services";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw,
  Search,
  ShieldOff,
  CalendarOff,
  Pencil,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SelectTrigger } from "@/components/ui/select";
import { SelectValue } from "@/components/ui/select";
import { SelectContent } from "@/components/ui/select";
import { SelectItem } from "@/components/ui/select";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import { Building2 } from "lucide-react";
import { SkeletonLoadinWithoutImage } from "@/components/loading/GeneralSkeletons";
import { Badge } from "@/components/ui/badge";
import Info_button from "@/components/Info_button";
import DeleteModal from "@/components/DeleteModal";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import { Calendar } from "@/interfaces/calendar";
import { CalendarDays } from "@/interfaces/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { HolidayWorkingDayDrawer } from "../formDrawers/holiday_workingDay";
import { isPastDate, resolveDayState } from "@/lib/calendar-day-state";

interface CalendarDatesProps {
  type: "holidays" | "specialWorkingDay";
  calendar: Calendar;
  isSystemUser?: boolean;
  selectedYear?: number;
}

// function Skill_categories_list() {
const CalendarDates: React.FC<CalendarDatesProps> = ({ calendar, type, isSystemUser, selectedYear }) => {
  const { setBreadcrumbs } = useBreadcrumb();
  const { logout } = useAuth();

  const [calendarDates, setCalendarDates] = useState<CalendarDays[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [openDate, setOpenDate] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [openDateRange, setOpenDateRange] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const useServerPagination = true;
  const [selectedHoliday, setSelectedHoliday] = useState<CalendarDays | null>(
    null,
  );
  const [isCreatingHoliday, setIsCreatingHoliday] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<CalendarDays | null>(
    null,
  );
  const [isDeletingHoliday, setIsDeletingHoliday] = useState(false);
  const [deletingHoliday, setDeletingHoliday] = useState<number | null>(null);
  const canCreateHoliday = usePrivilegeGuard(
    type === "holidays" ? "33" : "34",
  ) as boolean;
  const canViewHoliday = usePrivilegeGuard("29") as boolean;
  const canDeleteHoliday = usePrivilegeGuard(
    type === "holidays" ? "36" : "37",
  ) as boolean;
  const totalPages = useServerPagination
    ? Math.ceil(totalRecords / itemsPerPage)
    : Math.ceil(calendarDates.length / itemsPerPage);

  const currentHolidays = useServerPagination
    ? calendarDates
    : calendarDates.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    );

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const fetchHolidays = async () => {
    setIsLoading(true);
    try {
      const filters = [
        ...(calendar.id
          ? [
            {
              field: "calendarId",
              value: calendar.id,
              matchMode: "equals",
            },
          ]
          : []),
        // Temporarily commented out to debug
        ...(type
          ? [
            {
              field:
                type === "holidays"
                  ? "isHoliday"
                  : type === "specialWorkingDay"
                    ? "isSpecialWorkingDay"
                    : "",
              value: true,
              matchMode: "equals",
            },
          ]
          : []),
        ...(selectedYear
          ? [
            {
              field: "year",
              value: selectedYear,
              matchMode: "equals",
            },
          ]
          : []),
        ...(selectedDate
          ? [
            {
              field: "date",
              value: selectedDate.toLocaleDateString("en-CA"), // YYYY-MM-DD format
              matchMode: "equals",
            },
          ]
          : []),
        ...(dateRange?.from
          ? [
            {
              field: "date",
              value: dateRange.from.toLocaleDateString("en-CA"),
              matchMode: "dateAfter",
            },
          ]
          : []),
        ...(dateRange?.to
          ? [
            {
              field: "date",
              value: dateRange.to.toLocaleDateString("en-CA"),
              matchMode: "dateBefore",
            },
          ]
          : []),
      ];

      const params = {
        first: (currentPage - 1) * itemsPerPage,
        rows: itemsPerPage,
        filters,
      };

      if (canViewHoliday) {
        const result = await loadCalendardates(params);
        if (result && Array.isArray(result.data)) {
          // Set total records for pagination
          setTotalRecords(result.total || result.data.length);

          // Transform API data to match User interface if needed
          const transformedCalendarDates = result.data.map(
            (calendarDate: any) => ({
              id: calendarDate.id,
              date: calendarDate.date || "",
              year: calendarDate.year,
              yearStartDate: calendarDate.yearStartDate ?? null,
              weekNumber: calendarDate.weekNumber ?? null,
              daysOfWeek: calendarDate.daysOfWeek ?? null,
              weekStartDate: calendarDate.weekStartDate ?? null,
              weekEndDate: calendarDate.weekEndDate ?? null,
              isHoliday: calendarDate.isHoliday,
              isWeekend: calendarDate.isWeekend,
              isWorkingDay: calendarDate.isWorkingDay,
              isSpecialWorkingDay: calendarDate.isSpecialWorkingDay ?? false,
              dayType: calendarDate.dayType,
              calendarId: calendarDate.calendarId,
              createdAt: calendarDate.createdAt || undefined,
              updatedAt: calendarDate.updatedAt || undefined,
              createdBy: calendarDate.createdBy,
              updatedBy: calendarDate.updatedBy,
            }),
          );
          setCalendarDates(transformedCalendarDates);
        } else {
          toast.error("Failed to fetch calendar dates");
          setCalendarDates([]);
          setTotalRecords(0);
          setIsLoading(false);
        }
      } else {
        toast.error("Not authorized to view calendar dates");
        setCalendarDates([]);
        setTotalRecords(0);
        setIsLoading(false);
        // Removed logout() call to prevent logout on page refresh
      }
    } catch (error) {
      // console.error("Error fetching calendar dates:", error);
      toast.error("Failed to fetch calendar dates");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
    // console.log("calendar.id: ", calendar.id);
    // console.log("type: ", type);
    // console.log("canViewHoliday: ", canViewHoliday);
    // console.log("canCreateHoliday: ", canCreateHoliday);
  }, [
    selectedDate,
    dateRange,
    calendar.id,
    currentPage,
    itemsPerPage,
    canViewHoliday,
    selectedYear,
  ]);

  return (
    <div className="space-y-4">
      {/* Search Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="flex-1">
            <Popover open={openDate} onOpenChange={setOpenDate}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between font-normal"
                  onClick={() => setOpenDate(true)}
                >
                  {selectedDate ? (
                    selectedDate.toLocaleDateString()
                  ) : (
                    <span>Select date</span>
                  )}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex flex-col items-start space-y-2">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        // Keep the date as selected without timezone conversion
                        setSelectedDate(date);
                      }
                      setOpenDate(false);
                    }}
                    initialFocus
                  />
                  {selectedDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDate(undefined);
                        setOpenDate(false);
                      }}
                      className="text-xs text-red-500"
                    >
                      Clear Date
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="inline-flex rounded-md" role="group">
          <Button
            className="rounded-r-none"
            size="sm"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter />
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="rounded-none border-x"
            onClick={fetchHolidays}
          >
            <RefreshCw />
          </Button>
          <Button
            size="sm"
            variant="default"
            className="rounded-l-none"
            onClick={() => {
              if (canCreateHoliday) {
                setIsCreatingHoliday(true);
              } else {
                toast.error("Not authorized to create a holiday");
              }
            }}
          >
            <span>Add</span> <Plus />
          </Button>
        </div>
      </div>
      {showFilters && (
        <div className="grid grid-cols-1 gap-2 border-b border-muted pb-2">
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Date Range</Label>
            <div className="flex gap-2">
              <Popover open={openDateRange} onOpenChange={setOpenDateRange}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {dateRange.from.toLocaleDateString()} -{" "}
                          {dateRange.to.toLocaleDateString()}
                        </>
                      ) : (
                        dateRange.from.toLocaleDateString()
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex flex-col items-start space-y-2 p-2">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={1}
                    />
                    {dateRange?.from && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDateRange(undefined);
                          setOpenDateRange(false);
                        }}
                        className="text-xs text-red-500"
                      >
                        Clear Range
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      )}
      {/* Results Info */}
      <div className="space-y-2">
        {/* Results Info */}
        <div className="text-xs text-gray-600 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
          <span>
            {currentHolidays.length} of {totalRecords} calendar dates
            {(selectedDate || dateRange?.from) && (
              <span className="ml-1">(filtered)</span>
            )}
          </span>

          {/* Compact Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCurrentPage && setCurrentPage(Math.max(currentPage - 1, 1))
                }
                disabled={currentPage === 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>

              {/* Responsive page numbers */}
              <div className="flex items-center space-x-1 text-primary">
                {Array.from(
                  { length: Math.min(totalPages, isMobile ? 3 : 5) },
                  (_, i) => {
                    const maxVisible = isMobile ? 3 : 5;
                    let pageNum;
                    if (totalPages <= maxVisible) {
                      pageNum = i + 1;
                    } else if (currentPage <= Math.floor(maxVisible / 2) + 1) {
                      pageNum = i + 1;
                    } else if (
                      currentPage >=
                      totalPages - Math.floor(maxVisible / 2)
                    ) {
                      pageNum = totalPages - maxVisible + 1 + i;
                    } else {
                      pageNum = currentPage - Math.floor(maxVisible / 2) + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "outline" : "ghost"}
                        size="sm"
                        onClick={() =>
                          setCurrentPage && setCurrentPage(pageNum)
                        }
                        className="h-7 w-7 p-0 text-xs"
                      >
                        {pageNum}
                      </Button>
                    );
                  },
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCurrentPage &&
                  setCurrentPage(Math.min(currentPage + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Items per page selector - Mobile friendly */}
          {setItemsPerPage && (
            <div className="flex items-center space-x-1">
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => setItemsPerPage(parseInt(value))}
              >
                <SelectTrigger className=" h-6 text-xs w-17">
                  <SelectValue placeholder="Show" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Dates - Debug View */}
      {isLoading ? (
        <div className="space-y-2">
          <SkeletonLoadinWithoutImage />
        </div>
      ) : currentHolidays.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Calendar Dates found</h3>
          <p className="text-muted-foreground">
            {selectedDate || dateRange?.from
              ? "Try adjusting your search criteria"
              : "No calendar dates available"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {currentHolidays.map((holiday) => (
            <div
              key={holiday.id}
              onClick={() => {
                setSelectedHoliday(holiday);
                setBreadcrumbs([
                  {
                    label: "Calendar",
                    href: "/resource/calendar",
                  },
                  {
                    label: `${calendar.name}`,
                    href: `/resource/calendar`,
                  },
                  {
                    label:
                      type === "holidays"
                        ? `Holiday - ${holiday.date
                          ? new Date(holiday.date).toLocaleDateString()
                          : "No Date"
                        }`
                        : `Special Working Day - ${holiday.date
                          ? new Date(holiday.date).toLocaleDateString()
                          : "No Date"
                        }`,
                    isCurrentPage: true,
                  },
                ]);
              }}
              className={`w-full hover:shadow-md transition-all duration-200 group hover:scale-[1.001] border rounded-sm p-2 ${holiday.id === selectedHoliday?.id ? "border-l-5 bg-muted" : ""
                } cursor-pointer ${isPastDate(holiday.date) ? "opacity-60" : ""
                }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                {/* Holiday Information */}
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  {/* Date and Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                    {/* Date Section */}
                    <div className="flex flex-col space-y-1">
                      <h3 className="text-sm text-center sm:text-left">
                        {holiday.date
                          ? new Date(holiday.date).toLocaleDateString()
                          : "No Date"}
                      </h3>
                    </div>

                    {/* Badges Section */}
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      <Badge
                        variant="outline"
                        className={`text-xs h-6 whitespace-nowrap ${type === "holidays"
                          ? "bg-red-100 text-red-700 border-red-300"
                          : "bg-green-100 text-green-700 border-green-300"
                          }`}
                      >
                        {resolveDayState(holiday).baseLabel}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs h-6 whitespace-nowrap bg-muted text-muted-foreground border-muted-foreground"
                      >
                        {holiday.dayType}
                      </Badge>
                      {holiday.isWeekend && (
                        <Badge
                          variant="outline"
                          className="text-xs h-6 whitespace-nowrap bg-muted text-muted-foreground border-muted-foreground"
                        >
                          On repeated holiday
                        </Badge>
                      )}
                    </div>

                    {/* Info Button Section */}
                    <div className="flex justify-center sm:justify-end">
                      <Info_button
                        id={holiday.id}
                        createdBy={holiday.createdBy || ""}
                        createdAt={holiday.createdAt || ""}
                        updatedBy={holiday.updatedBy || ""}
                        updatedAt={holiday.updatedAt || ""}
                      />
                    </div>
                  </div>
                  {isPastDate(holiday.date) && (
                    <p className="text-xs text-muted-foreground">
                      Past date — kept for history and can no longer be changed.
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-1 sm:gap-2 self-center sm:self-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1 px-2 sm:px-3"
                    disabled={isPastDate(holiday.date)}
                    title={
                      isPastDate(holiday.date)
                        ? "Past dates cannot be changed"
                        : "Edit"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPastDate(holiday.date)) {
                        toast.error("Past dates cannot be changed");
                        return;
                      }
                      if (canCreateHoliday) {
                        setEditingHoliday(holiday);
                      } else {
                        toast.error(
                          type === "holidays"
                            ? "You are not authorized to edit a holiday"
                            : "You are not authorized to edit a working day",
                        );
                      }
                    }}
                  >
                    <Pencil className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 px-2 sm:px-3"
                    disabled={isPastDate(holiday.date)}
                    title={
                      isPastDate(holiday.date)
                        ? "Past dates cannot be changed"
                        : "Remove"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPastDate(holiday.date)) {
                        toast.error("Past dates cannot be changed");
                        return;
                      }
                      if (canDeleteHoliday) {
                        setIsDeletingHoliday(true);
                        setDeletingHoliday(holiday.id);
                      } else {
                        toast.error("Not authorized to delete a holiday",
                        );
                      }
                    }}
                  >
                    <CalendarOff className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isCreatingHoliday && (
        <HolidayWorkingDayDrawer
          open={isCreatingHoliday}
          onOpenChange={setIsCreatingHoliday}
          type={type === "holidays" ? "holiday" : "workingDay"}
          calendarId={calendar.id}
          calendarYear={calendarDates.length > 0 ? calendarDates[0].year : undefined}
          holidayWorkingDay={null}
          isSystemUser={isSystemUser}
          onHolidayWorkingDayUpdate={() => {
            setIsCreatingHoliday(false);
            fetchHolidays();
          }}
        />
      )}
      {editingHoliday && (
        <HolidayWorkingDayDrawer
          open={!!editingHoliday}
          onOpenChange={(open) => {
            if (!open) setEditingHoliday(null);
          }}
          type={type === "holidays" ? "holiday" : "workingDay"}
          calendarId={calendar.id}
          calendarYear={editingHoliday.year}
          holidayWorkingDay={editingHoliday}
          isSystemUser={isSystemUser}
          onHolidayWorkingDayUpdate={() => {
            setEditingHoliday(null);
            fetchHolidays();
          }}
        />
      )}
      {isDeletingHoliday && (
        <DeleteModal
          isOpen={isDeletingHoliday}
          onClose={() => {
            setIsDeletingHoliday(false);
            setDeletingHoliday(null);
            fetchHolidays();
          }}
          onDelete={() => {
            return deleteHolidaysAndWorkingDays(
              calendar.id,
              deletingHoliday || 0,
              type,
            );
          }}
          id={deletingHoliday || 0}
          title="Delete Holiday"
          description="Are you sure you want to delete this holiday"
          buttonText="Delete"
          buttonVariant="destructive"
          buttonIcon={<CalendarOff />}
          buttonClassName="w-full"
        />
      )}
    </div>
  );
};

export default CalendarDates;

