"use client";

import React, { useEffect, useState } from "react";
import { Calendar } from "@/interfaces/calendar";
import { toast } from "sonner";
import {
  deleteCalendar,
  disableCalendar,
  getCalendarWeekConfig,
  loadCalendars,
  type CalendarWeekConfig,
} from "@/services/calendar-services";
import {
  formatDay,
  parseIsoDate,
  weekDayLabel,
} from "./week_start_picker";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { safeParse } from "@/services/auth-service";
import { getAllCompany } from "@/services/company-services";
import CalendarFormDrawer from "./form_drawer";
import DeleteModal from "@/components/DeleteModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Plus,
  RefreshCw,
  Pencil,
  Trash,
  Calendar as CalendarIcon,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Info,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";

/**
 * Week setup of one calendar, loaded the first time the icon is hovered so the
 * list itself never fires a request per row.
 */
const CalendarWeekInfo: React.FC<{ calendarId: number }> = ({ calendarId }) => {
  const [config, setConfig] = useState<CalendarWeekConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = async () => {
    if (config || isLoading || failed) return;
    setIsLoading(true);
    try {
      setConfig(await getCalendarWeekConfig(calendarId));
    } catch {
      setFailed(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Years after the first one were added by extending the calendar.
  const extendedYears = (config?.yearStarts ?? [])
    .slice(1)
    .map((start) => parseIsoDate(start).getFullYear());

  const row = (label: string, value: string) => (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip onOpenChange={(open) => open && load()}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="h-7 w-7 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent cursor-pointer"
            onClick={(e) => e.stopPropagation()}
            aria-label="Week setup"
          >
            <Info className="h-4 w-4 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-none">
          {isLoading ? (
            <p className="text-xs">Loading…</p>
          ) : failed ? (
            <p className="text-xs">Could not load the week setup.</p>
          ) : config?.yearStartDate ? (
            <div className="space-y-1 text-xs">
              {row(
                "Week start day",
                weekDayLabel(parseIsoDate(config.yearStartDate).getDay()),
              )}
              {row(
                "Calendar start date",
                formatDay(parseIsoDate(config.yearStartDate)),
              )}
              {row(
                "Current year start date",
                config.currentYearStartDate
                  ? formatDay(parseIsoDate(config.currentYearStartDate))
                  : "—",
              )}
              {row(
                "Extended years",
                extendedYears.length > 0 ? extendedYears.join(", ") : "None",
              )}
            </div>
          ) : (
            <p className="text-xs">No week setup for this calendar yet.</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface CalendarListProps {
  // Navigation is now handled internally
}

const CalendarList: React.FC<CalendarListProps> = ({ }) => {
  const router = useRouter();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nameTerm, setNameTerm] = useState("");
  const [debouncedNameTerm, setDebouncedNameTerm] = useState("");
  const [statusTerm, setStatusTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalRecords, setTotalRecords] = useState(0);

  const [sortOption, setSortOption] = useState("");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const [isSystemUser, setIsSystemUser] = useState(false);
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [filterCompanyId, setFilterCompanyId] = useState<string>("");
  const [debouncedCompanyId, setDebouncedCompanyId] = useState("");

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editCalendar, setEditCalendar] = useState<Calendar | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const canCreate = usePrivilegeGuard("30") as boolean;
  const canView = usePrivilegeGuard("29") as boolean;
  const canEdit = usePrivilegeGuard("32") as boolean;
  const canDelete = usePrivilegeGuard("31") as boolean;

  const totalPages = Math.ceil(totalRecords / itemsPerPage);

  // System user detection + companies list (for system user filter)
  useEffect(() => {
    const localCompanies = safeParse(localStorage.getItem("companies")) || [];
    const isSystem = localCompanies.length === 0;
    setIsSystemUser(isSystem);

    if (isSystem) {
      (async () => {
        try {
          const result = await getAllCompany();
          setAllCompanies(result.data || []);
        } catch {
          // ignore
        }
      })();
    }
  }, []);

  // Debounced name search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedNameTerm(nameTerm), 400);
    return () => clearTimeout(t);
  }, [nameTerm]);

  // Debounced company filter
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCompanyId(filterCompanyId), 400);
    return () => clearTimeout(t);
  }, [filterCompanyId]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [debouncedNameTerm, statusTerm, debouncedCompanyId, sortOption]);

  const fetchCalendars = async () => {
    setIsLoading(true);
    try {
      if (!canView) {
        toast.error("Not authorized to view calendars");
        setCalendars([]);
        setTotalRecords(0);
        return;
      }

      const selectedCompany = safeParse(localStorage.getItem("active_company"));

      const filters = [
        ...(!isSystemUser && selectedCompany?.companyId
          ? [{ field: "company", value: selectedCompany.companyId, matchMode: "equals" }]
          : []),
        ...(isSystemUser && debouncedCompanyId
          ? [{ field: "company", value: parseInt(debouncedCompanyId), matchMode: "equals" }]
          : []),
        ...(debouncedNameTerm
          ? [{ field: "name", value: debouncedNameTerm, matchMode: "contains" }]
          : []),
        ...(statusTerm
          ? [{ field: "isActive", value: statusTerm === "true", matchMode: "equals" }]
          : []),
      ];

      const params = {
        first: (currentPage - 1) * itemsPerPage,
        rows: itemsPerPage,
        filters,
        ...(sortOption
          ? {
            multiSorts: [
              {
                field: sortOption.startsWith("name")
                  ? "name"
                  : sortOption.startsWith("updatedAt")
                    ? "updatedAt"
                    : "createdAt",
                order: sortOption.endsWith("-desc") ? "-1" : "1",
              },
            ],
          }
          : {}),
      };

      const result = await loadCalendars(params);
      if (result && Array.isArray(result.data)) {
        setTotalRecords(result.total || result.data.length);
        setCalendars(
          result.data.map((c: any) => ({
            id: c.id,
            name: c.name || "",
            year: c.year || 0,
            isActive: c.isActive,
            companyId: c.companyId || c.company_id || c.company,
            createdBy: c.created_by || "",
            createdAt: c.created_at || new Date().toISOString(),
            updatedBy: c.updated_by || "",
            updatedAt: c.updated_at || new Date().toISOString(),
          })),
        );
      } else {
        setCalendars([]);
        setTotalRecords(0);
      }
    } catch {
      toast.error("Failed to fetch calendars");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendars();
  }, [
    debouncedNameTerm,
    statusTerm,
    debouncedCompanyId,
    currentPage,
    itemsPerPage,
    canView,
    sortOption,
    isSystemUser,
  ]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar - spans full page width above the split */}
      <div className="flex-none">
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-1.5">
            {canCreate && (
              <Button
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setOpenCreate(true)}
              >
                <Plus className="w-3.5 h-3.5" /> Add Calendar
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className={`h-7 w-7 p-0 ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={fetchCalendars}
              disabled={isLoading}
              title={isLoading ? "Loading" : "Refresh"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>

            <DropdownMenu open={sortDropdownOpen} onOpenChange={setSortDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  title="Sort"
                  className={`h-7 w-7 p-0 ${sortOption
                      ? "bg-primary/10 dark:bg-primary/20 border-primary text-black dark:text-white"
                      : ""
                    }`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[250px]"
                onMouseLeave={() => setSortDropdownOpen(false)}
              >
                <DropdownMenuLabel className="text-xs font-semibold">
                  Sort By
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2 space-y-1">
                  {[
                    { value: "name-asc", label: "Name (A-Z)", icon: <ArrowUp className="w-3.5 h-3.5" /> },
                    { value: "name-desc", label: "Name (Z-A)", icon: <ArrowDown className="w-3.5 h-3.5" /> },
                    { value: "updatedAt-desc", label: "Updated At (Latest → Earliest)", icon: <ArrowDown className="w-3.5 h-3.5" /> },
                    { value: "updatedAt-asc", label: "Updated At (Earliest → Latest)", icon: <ArrowUp className="w-3.5 h-3.5" /> },
                    { value: "createdAt-desc", label: "Created At (Latest → Earliest)", icon: <ArrowDown className="w-3.5 h-3.5" /> },
                    { value: "createdAt-asc", label: "Created At (Earliest → Latest)", icon: <ArrowUp className="w-3.5 h-3.5" /> },
                  ].map(({ value, label, icon }) => (
                    <button
                      key={value}
                      onClick={() => {
                        setSortOption(value);
                        setSortDropdownOpen(false);
                      }}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent ${sortOption === value
                          ? "bg-accent font-bold text-black dark:text-white"
                          : ""
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        {icon}
                        <span>{label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

            <div className="flex gap-1.5">
              <div className="relative w-56">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                <Input
                  placeholder="Name"
                  value={nameTerm}
                  onChange={(e) => setNameTerm(e.target.value)}
                  className="h-7 pl-7 text-xs border border-border shadow-none placeholder:text-xs"
                />
              </div>

              <Select
                value={statusTerm}
                onValueChange={(v) => setStatusTerm(v)}
              >
                <SelectTrigger className="h-7 w-[110px] text-xs border border-border shadow-none flex gap-1">
                  <SelectValue placeholder="Status" className="flex-1 text-left truncate" />
                  {statusTerm && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setStatusTerm("");
                      }}
                      className="ml-auto hover:text-destructive cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </div>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {isSystemUser && (
                <Select
                  value={filterCompanyId}
                  onValueChange={(v) => setFilterCompanyId(v)}
                >
                  <SelectTrigger className="h-7 w-[160px] text-xs border border-border shadow-none flex gap-1">
                    <SelectValue placeholder="Company" className="flex-1 text-left truncate" />
                    {filterCompanyId && (
                      <div
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilterCompanyId("");
                        }}
                        className="ml-auto hover:text-destructive cursor-pointer flex items-center justify-center shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {allCompanies.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body: table side-by-side */}
      <div className="flex px-1 flex-1 overflow-hidden min-h-0">
        <div className="flex flex-col min-h-0 w-full">
          {/* Content */}
          <div className="p-2 flex flex-col flex-1 min-h-0">
            <div className="flex flex-col flex-1 min-h-0 rounded-lg border overflow-hidden">
              {/* Single scroll container - neutralize the Table own overflow wrapper */}
              <div className="relative flex-1 min-h-0 overflow-auto [&_[data-slot=table-container]]:overflow-visible">
                <Table>
                  <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-gray-50 dark:[&_th]:bg-gray-900">
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="w-[50%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Name
                      </TableHead>
                      {isSystemUser && (
                        <TableHead className="w-[20%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                          Company
                        </TableHead>
                      )}
                      <TableHead className="w-[25%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </TableHead>
                      <TableHead className="w-[25%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr:last-child]:border-b [&_tr:last-child]:border-border">
                    {isLoading ? (
                      Array.from({ length: 12 }).map((_, i) => (
                        <TableRow key={i} className="border-b border-border">
                          <TableCell className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-4 w-32 rounded" />
                            </div>
                          </TableCell>
                          {isSystemUser && (
                            <TableCell className="py-2.5 px-4 hidden lg:table-cell">
                              <Skeleton className="h-5 w-24 rounded-full" />
                            </TableCell>
                          )}
                          <TableCell className="py-2.5 px-4">
                            <Skeleton className="h-5 w-16 rounded-full" />
                          </TableCell>
                          <TableCell className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Skeleton className="h-5 w-9 rounded-full" />
                              <Skeleton className="h-7 w-7 rounded-md" />
                              <Skeleton className="h-7 w-7 rounded-md" />
                              <Skeleton className="h-7 w-7 rounded-md" />
                              <Skeleton className="h-7 w-7 rounded-md" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : calendars.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-36 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <CalendarIcon className="h-8 w-8 opacity-30" />
                            <p className="text-sm text-muted-foreground">No calendars found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      calendars.map((cal) => (
                        <TableRow
                          key={cal.id}
                          className="group border-b border-border transition-colors hover:bg-muted/30 cursor-pointer"
                          onClick={() => router.push(`/resource/calendar/${cal.id}?view=calendar`)}
                        >
                          <TableCell className="py-2.5 px-4">
                            <p className="text-sm font-medium truncate">{cal.name}</p>
                          </TableCell>

                          {isSystemUser && (
                            <TableCell className="py-2.5 px-4 hidden lg:table-cell">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-transparent text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                                {(() => {
                                  const cId = cal.companyId || (cal as any).company_id;
                                  if (!cId || !allCompanies) return 'Unknown';
                                  const c = allCompanies.find((comp: any) => comp.id === cId || comp.companyId === cId);
                                  return c ? (c.company || c.name || c.companyName) : 'Unknown';
                                })()}
                              </span>
                            </TableCell>
                          )}

                          <TableCell className="py-2.5 px-4">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border text-xs font-medium text-foreground/70">
                              <span
                                className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cal.isActive
                                    ? "bg-green-500 dark:bg-green-400"
                                    : "bg-red-400 dark:bg-red-500"
                                  }`}
                              />
                              {cal.isActive ? "Active" : "Inactive"}
                            </div>
                          </TableCell>

                          <TableCell className="py-2.5 px-4 text-right">
                            <div
                              className="flex items-center justify-end gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center h-7 cursor-pointer">
                                      <Switch
                                        checked={cal.isActive}
                                        onCheckedChange={async () => {
                                          if (!canEdit) {
                                            toast.error("Not authorized to change status");
                                            return;
                                          }
                                          try {
                                            await disableCalendar(cal.id);
                                            fetchCalendars();
                                            toast.success(cal.isActive ? "Calendar inactivated" : "Calendar activated");
                                          } catch {
                                            toast.error("Failed to update status");
                                          }
                                        }}
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    {cal.isActive ? "Disable Calendar" : "Enable Calendar"}
                                  </TooltipContent>
                                </Tooltip>

                                <CalendarWeekInfo calendarId={cal.id} />

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/resource/calendar/${cal.id}?view=calendar`);
                                      }}
                                    >
                                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">View Calendar</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (canEdit) {
                                          setEditCalendar(cal);
                                          setOpenEdit(true);
                                        } else {
                                          toast.error("Not authorized to edit");
                                        }
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Edit Calendar</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (canDelete) {
                                          setDeletingId(cal.id);
                                          setIsDeleting(true);
                                        } else {
                                          toast.error("Not authorized to delete");
                                        }
                                      }}
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Delete Calendar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Pagination */}
          {totalRecords > 0 && (
            <div className="flex-none border-t border-border bg-background -mx-1 px-1">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-1.5">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1} –
                  {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
                  {totalRecords} calendars
                </span>
                <div className="flex items-center gap-3">
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(v) => {
                      setItemsPerPage(parseInt(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-6 text-sm w-20">
                      <SelectValue placeholder="Show" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    {[
                      {
                        label: "«",
                        onClick: () => setCurrentPage(1),
                        disabled: currentPage === 1,
                      },
                      {
                        label: "‹",
                        onClick: () => setCurrentPage((p) => Math.max(1, p - 1)),
                        disabled: currentPage === 1,
                      },
                      { label: null },
                      {
                        label: "›",
                        onClick: () =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1)),
                        disabled: currentPage >= totalPages,
                      },
                      {
                        label: "»",
                        onClick: () => setCurrentPage(totalPages),
                        disabled: currentPage >= totalPages,
                      },
                    ].map((item, i) =>
                      item.label === null ? (
                        <span
                          key={i}
                          className="text-xs px-2 text-gray-600 dark:text-gray-400"
                        >
                          Page {currentPage} of {totalPages}
                        </span>
                      ) : (
                        <Button
                          key={i}
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          disabled={item.disabled}
                          onClick={item.onClick}
                        >
                          {item.label}
                        </Button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {openCreate && (
        <CalendarFormDrawer
          open={openCreate}
          onOpenChange={() => setOpenCreate(false)}
          type="create"
          onCalendarUpdate={fetchCalendars}
          isSystemUser={isSystemUser}
          companies={allCompanies}
          defaultCompanyId={filterCompanyId}
        />
      )}
      {openEdit && editCalendar && (
        <CalendarFormDrawer
          open={openEdit}
          onOpenChange={() => setOpenEdit(false)}
          type="update"
          calendar={editCalendar}
          onCalendarUpdate={fetchCalendars}
          isSystemUser={isSystemUser}
          companies={allCompanies}
        />
      )}
      {isDeleting && (
        <DeleteModal
          isOpen={isDeleting}
          onClose={() => {
            setIsDeleting(false);
            setDeletingId(null);
            fetchCalendars();
          }}
          onDelete={() => deleteCalendar(deletingId || 0)}
          id={deletingId || 0}
          title="Delete Calendar"
          description="Are you sure you want to delete this calendar"
          buttonText="Delete"
          buttonVariant="destructive"
          buttonIcon={<Trash />}
          buttonClassName="w-full"
          confirmationRequired={false}
          confirmationText="DELETE"
        />
      )}
    </div>
  );
};

export default CalendarList;
