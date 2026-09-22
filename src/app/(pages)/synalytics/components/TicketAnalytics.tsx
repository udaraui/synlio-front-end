"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { format, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { searchTicketSpaces } from "@/services/ticket-management/ticket-space.service";
import { useAuth } from "@/contexts/auth.context";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import {
  getTicketDashboard,
  getTicketStatusKpi,
  getTicketWorkload,
  getTicketRecentList,
  getTicketDailyActivity,
} from "@/services/synalytics/ticket-analytics.service";
import TicketsDistributionCard from "./ticket/TicketsDistributionCard";
import TicketStatusTrendChart from "./ticket/TicketStatusTrendChart";
import TicketWorkloadChart from "./ticket/TicketWorkloadChart";
import KeyInsightsPanel from "./ticket/KeyInsightsPanel";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import type { CardDefault, CardWidth } from "@/hooks/use-dashboard-layout";
import { DashboardGrid } from "@/components/dashboards/DashboardGrid";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Default layout ────────────────────────────────────────────────────────────
const DEFAULT_CARDS: CardDefault[] = [
  { id: "key-insights",        label: "Key Insights",            width: "full" },
  { id: "ticket-status-trend",      label: "Status Trend Chart",      width: "3/4" },
  { id: "ticket-distribution",      label: "Tickets Distribution",    width: "1/4" },
  { id: "ticket-workload",          label: "User Workload Chart",     width: "full" },
];

/** Minimum allowed widths per card — confirmed by user. */
const MIN_WIDTHS: Partial<Record<string, CardWidth>> = {
  "ticket-status-trend": "1/2",
  "ticket-workload":     "1/2",
};

function AssigneeAvatar({ name, src, size = 5 }: { name: string; src?: string; size?: number }) {
  const parts = name.trim().split(" ");
  const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (
    <Avatar className={`w-${size} h-${size}`}>
      <AvatarImage src={src} />
      <AvatarFallback className="bg-primary text-primary-foreground text-[9px] font-bold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export default function TicketAnalytics({
  isCustomizing: isCustomizingProp,
  onResetRegister,
  onSaveStatusChange,
}: {
  isCustomizing?: boolean;
  onCustomizingChange?: (v: boolean) => void;
  onResetRegister?: (fn: () => void) => void;
  onSaveStatusChange?: (s: string) => void;
} = {}) {
  const { user } = useAuth();
  const canViewAllTicketSpaces = usePrivilegeGuard("105") as boolean;

  // ── Layout hook ────────────────────────────────────────────────────────────
  const { cards, sortedVisible, loaded, saveStatus, toggleVisibility, reorder, reorderAll, updateWidth, resetToDefault } =
    useDashboardLayout("synalytics_ticket", DEFAULT_CARDS);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onResetRegister?.(resetToDefault); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onSaveStatusChange?.(saveStatus); }, [saveStatus]);

  // Use controlled prop from parent (SnapshotHistory.tsx) if provided
  const isCustomizing = isCustomizingProp ?? false;

  // ── Filters ────────────────────────────────────────────────────────────────
  const [ticketSpaces, setTicketSpaces] = useState<any[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | undefined>();
  const [spaceDropdownOpen, setSpaceDropdownOpen] = useState(false);
  const handleSpaceChange = (v: string) => { setSelectedSpaceId(v); };
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return { from: subDays(today, 14), to: today };
  });

  // ── Data ───────────────────────────────────────────────────────────────────
  const [dashboardRows, setDashboardRows] = useState<any[]>([]);
  const [statusKpiRows, setStatusKpiRows] = useState<any[]>([]);
  const [workloadRows, setWorkloadRows]   = useState<any[]>([]);
  const [recentListRows, setRecentListRows] = useState<any[]>([]);
  const [dailyActivityRows, setDailyActivityRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const spacesLoadedRef     = useRef(false);
  const analyticsQueryRef   = useRef<string | null>(null);

  useEffect(() => {
    if (spacesLoadedRef.current) return;
    spacesLoadedRef.current = true;
    setLoadingSpaces(true);
    const load = async () => {
      try {
        const activeCompany = JSON.parse(localStorage.getItem("active_company") || "null");
        const filters: any[] = activeCompany?.id
          ? [{ field: "companyId", value: activeCompany.id, matchMode: "equals" }] : [];
        if (!canViewAllTicketSpaces && user?.id)
          filters.push({ field: "userId", value: user.id, matchMode: "member" });
        const result = await searchTicketSpaces({ first: 0, rows: 1000, filters, sortField: "name", sortOrder: 1 });
        const spaces = result.data || [];
        setTicketSpaces(spaces);
        if (spaces.length > 0) handleSpaceChange(String(spaces[0].id));
      } catch { /* ignore */ } finally {
        setLoadingSpaces(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedSpaceId || !dateRange?.from || !dateRange?.to) return;
    const activeCompany = JSON.parse(localStorage.getItem("active_company") || "null");
    const companyId = activeCompany?.companyId ?? activeCompany?.id;
    if (!companyId) return;
    const dateFrom = format(dateRange.from, "yyyy-MM-dd");
    const dateTo   = format(dateRange.to,   "yyyy-MM-dd");
    const queryKey = `${companyId}-${selectedSpaceId}-${dateFrom}-${dateTo}-${selectedAssigneeIds.join(',')}`;
    if (analyticsQueryRef.current === queryKey) return;
    analyticsQueryRef.current = queryKey;
    const query = { companyId: Number(companyId), spaceId: Number(selectedSpaceId), dateFrom, dateTo, assigneePermissionIds: selectedAssigneeIds };
    setLoading(true);
    Promise.all([
      getTicketDashboard(query),
      getTicketStatusKpi(query),
      getTicketWorkload(query),
      getTicketRecentList(query),
      getTicketDailyActivity(query),
    ])
      .then(([dashboard, statusKpi, workload, recentList, dailyActivity]) => {
        setDashboardRows(dashboard ?? []);
        setStatusKpiRows(statusKpi ?? []);
        setWorkloadRows(workload ?? []);
        setRecentListRows(recentList ?? []);
        setDailyActivityRows(dailyActivity ?? []);
      })
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false));
  }, [selectedSpaceId, dateRange, selectedAssigneeIds]);

  const assigneeOptions = useMemo(() => {
    const seen = new Set<number>();
    const list: { id: number; name: string; email: string, profilePic?: string }[] = [];
    workloadRows.forEach((r) => {
      if (r.assignee_user_id && !seen.has(r.assignee_user_id)) {
        seen.add(r.assignee_user_id);
        list.push({ id: r.assignee_user_id, name: r.assignee_name, email: r.assignee_email, profilePic: r.assignee_profile_pic });
      }
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [workloadRows]);

  const toggleAssignee = (id: number) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d, yyyy")}`
      : format(dateRange.from, "MMM d, yyyy")
    : "Date Range";

  // ── Card renderer ──────────────────────────────────────────────────────────
  const renderCard = (id: string) => {
    switch (id) {
      case "key-insights":
        return <KeyInsightsPanel statusKpiRows={statusKpiRows} dashboardRows={dashboardRows} recentListRows={recentListRows} loading={loading} />;
      case "ticket-status-trend":
        return <TicketStatusTrendChart statusKpiRows={statusKpiRows} dailyActivityRows={dailyActivityRows} loading={loading} />;
      case "ticket-distribution":
        return <TicketsDistributionCard rows={dashboardRows} loading={loading} />;
      case "ticket-workload":
        return <TicketWorkloadChart rows={workloadRows} loading={loading} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Filters + Customize button on same row */}
      <div className="flex items-center gap-2 flex-wrap pt-3">
        <Popover open={spaceDropdownOpen} onOpenChange={setSpaceDropdownOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={spaceDropdownOpen}
              className="h-7 text-xs px-2.5 w-44 font-medium bg-primary/10 dark:bg-primary/20 border-primary justify-between"
              disabled={loading || loadingSpaces}
            >
              <span className="truncate">{loadingSpaces ? "Syncing spaces..." : ticketSpaces.find(s => String(s.id) === selectedSpaceId)?.name || "Select space"}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search space..." />
              <CommandEmpty>No space found.</CommandEmpty>
              <CommandGroup>
                {ticketSpaces.map((option) => (
                  <CommandItem
                    key={option.id}
                    onSelect={() => {
                      handleSpaceChange(String(option.id));
                      setSpaceDropdownOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", selectedSpaceId === String(option.id) ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{option.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-0.5" />

        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className={`h-7 text-xs px-2 gap-1.5 bg-white dark:bg-neutral-900 ${dateRange?.from ? "bg-primary/10 dark:bg-primary/20 border-primary" : ""}`} disabled={loading}>
              <CalendarIcon className="w-3 h-3" /><span>{dateLabel}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="range" selected={dateRange} onSelect={(r) => { if (r) setDateRange(r); }} numberOfMonths={2} />
          </PopoverContent>
        </Popover>
        
        <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-0.5" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className={`h-7 text-xs px-2 ${selectedAssigneeIds.length > 0 ? "bg-primary/10 dark:bg-primary/20 border-primary" : ""}`} disabled={loading || assigneeOptions.length === 0}>
              Assignee {selectedAssigneeIds.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium">{selectedAssigneeIds.length}</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[220px]">
            <div className="p-2 space-y-1.5 max-h-[200px] overflow-y-auto">
              {assigneeOptions.map((a) => (
                <label key={a.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 flex-shrink-0" checked={selectedAssigneeIds.includes(a.id)} onChange={() => toggleAssignee(a.id)} />
                  <AssigneeAvatar name={a.name} src={a.profilePic} size={5} />
                  <span className="text-xs truncate">{a.name}</span>
                </label>
              ))}
            </div>
            {selectedAssigneeIds.length > 0 && <div className="px-2 pb-2"><Button variant="ghost" size="sm" className="h-6 w-full text-xs text-red-500 hover:text-red-600" onClick={() => setSelectedAssigneeIds([])}>Clear</Button></div>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dashboard grid */}
      <DashboardGrid
        cards={cards}
        sortedVisible={sortedVisible}
        loaded={loaded}
        saveStatus={saveStatus}
        onReorder={reorder}
        onReorderAll={reorderAll}
        onWidthChange={updateWidth}
        onToggle={toggleVisibility}
        renderCard={renderCard}
        minWidths={MIN_WIDTHS}
        skeletonCount={4}
        skeletonColClass="col-span-2"
        isCustomizing={isCustomizing}
      />
    </div>
  );
}