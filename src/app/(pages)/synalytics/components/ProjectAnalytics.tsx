"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Flag, Calendar as CalendarIcon } from "lucide-react";
import { format, subMonths } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  getProjectDashboard,
  getProjectTaskDetail,
} from "@/services/synalytics/project-analytics.service";
import ProjectTimelineChart from "./project/ProjectTimelineChart";
import TaskDistributionCard from "./project/TaskDistributionCard";
import AssigneeWorkloadChart from "./project/AssigneeWorkloadChart";
import EffortAnalysisChart from "./project/EffortAnalysisChart";
import TaskCompletionTrendChart from "./project/TaskCompletionTrendChart";
import UpcomingTasksPanel from "./project/UpcomingTasksPanel";
import SpecialTasksPanel from "./project/SpecialTasksPanel";
import KpiStatCard from "./KpiStatCard";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import type { CardDefault, CardWidth } from "@/hooks/use-dashboard-layout";
import { DashboardGrid } from "@/components/dashboards/DashboardGrid";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ── Default layout ────────────────────────────────────────────────────────────
const DEFAULT_CARDS: CardDefault[] = [
  { id: "kpi-progress",    label: "Project Progress", width: "1/4" },
  { id: "kpi-overdue",     label: "Overdue Items",    width: "1/4" },
  { id: "kpi-health",      label: "Health Score",     width: "1/4" },
  { id: "kpi-total-tasks", label: "Total Items",      width: "1/4" },
  { id: "project-timeline",  label: "Project Timeline",         width: "3/4" },
  { id: "task-distribution", label: "Task Distribution", width: "1/4" },
  { id: "assignee-workload", label: "Assignee Workload",        width: "1/2" },
  { id: "effort-analysis",   label: "Effort Analysis",          width: "1/2" },
  { id: "completion-trend",  label: "Task Completion Trend",    width: "full" },
  // { id: "critical-priority", label: "Critical & High Priority", width: "1/2" },
  // { id: "blocked-tasks",     label: "Blocked Tasks",            width: "1/2" },
  { id: "upcoming-tasks",    label: "Upcoming Tasks",           width: "1/2" },
  { id: "special-tasks",     label: "Special Tasks",            width: "1/2" },
];

/** Minimum allowed widths per card — confirmed by user. */
const MIN_WIDTHS: Partial<Record<string, CardWidth>> = {
  "project-timeline": "1/2",
};

const SPACE_KEY = "synalytics_project_spaceId";
const TASK_KEY = "synalytics_project_taskId";

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

export default function ProjectAnalytics({
  isCustomizing,
  onResetRegister,
  onSaveStatusChange,
}: {
  isCustomizing?: boolean;
  onCustomizingChange?: (v: boolean) => void;
  onResetRegister?: (fn: () => void) => void;
  onSaveStatusChange?: (s: string) => void;
} = {}) {
  // ── Layout hook ────────────────────────────────────────────────────────────
  const { cards, sortedVisible, loaded, saveStatus, toggleVisibility, reorder, reorderAll, updateWidth, resetToDefault } =
    useDashboardLayout("synalytics_project_v2", DEFAULT_CARDS);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onResetRegister?.(resetToDefault); }, []); // mount-only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onSaveStatusChange?.(saveStatus); }, [saveStatus]); // intentional

  // ── Data state ─────────────────────────────────────────────────────────────
  const [allDashboardRows, setAllDashboardRows] = useState<any[]>([]);
  const [allTaskRows, setAllTaskRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return { from: subMonths(today, 1), to: today };
  });
  const [selectedStatuses, setSelectedStatuses]     = useState<string[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
  const fetchedRef = useRef(false);
  const analyticsQueryRef = useRef<string | null>(null);

  const [spaceDropdownOpen, setSpaceDropdownOpen] = useState(false);
  const [taskDropdownOpen, setTaskDropdownOpen] = useState(false);

  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return;

    const activeCompany = JSON.parse(localStorage.getItem("active_company") || "null");
    const companyId = activeCompany?.companyId ?? activeCompany?.id;
    if (!companyId) return;

    const dateFrom = format(dateRange.from, "yyyy-MM-dd");
    const dateTo   = format(dateRange.to,   "yyyy-MM-dd");
    const queryKey = `${companyId}-${dateFrom}-${dateTo}`;

    if (analyticsQueryRef.current === queryKey) return;
    analyticsQueryRef.current = queryKey;

    setLoading(true);
    const query = { companyId: Number(companyId), dateFrom, dateTo };

    Promise.all([
      getProjectDashboard({ companyId: Number(companyId) }),
      getProjectTaskDetail(query),
    ])
      .then(([dashboard, taskDetail]) => {
        setAllDashboardRows(dashboard ?? []);
        setAllTaskRows(taskDetail ?? []);

        if (!fetchedRef.current) {
          fetchedRef.current = true;
          const storedSpace = sessionStorage.getItem(SPACE_KEY);
          if (storedSpace && dashboard?.some((r: any) => String(r.task_space_id) === storedSpace)) {
            setSelectedSpaceId(storedSpace);
          } else {
            const firstId = dashboard?.[0]?.task_space_id ? String(dashboard[0].task_space_id) : "";
            setSelectedSpaceId(firstId);
            if (firstId) sessionStorage.setItem(SPACE_KEY, firstId);
          }
          const storedTask = sessionStorage.getItem(TASK_KEY);
          if (storedTask) setSelectedTaskId(storedTask);
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false));
  }, [dateRange]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const spaceOptions = useMemo(() => {
    const seen = new Set<string>();
    return allDashboardRows
      .filter((r) => { const k = String(r.task_space_id); if (seen.has(k)) return false; seen.add(k); return true; })
      .map((r) => ({ value: String(r.task_space_id), label: r.task_space_name ?? String(r.task_space_id) }));
  }, [allDashboardRows]);

  const rootTaskLevelName = useMemo(() => {
    const rootTask = allTaskRows.find(r => !r.parent_task_id && (selectedSpaceId === 'all' || String(r.task_space_id) === selectedSpaceId));
    return rootTask?.hierarchy_level_configured_name || "Root Task";
  }, [allTaskRows, selectedSpaceId]);

  const taskOptions = useMemo(() => {
    return allTaskRows
      .filter(r => r.task_id && !r.parent_task_id && String(r.task_space_id) === selectedSpaceId)
      .map(r => ({ value: String(r.task_id), label: r.task_name }))
      .sort((a, b) => (a.label ?? "").localeCompare(b.label ?? ""));
  }, [allTaskRows, selectedSpaceId]);

  const spaceDashboardRows = useMemo(() => {
    return allDashboardRows.filter((r) => String(r.task_space_id) === selectedSpaceId);
  }, [allDashboardRows, selectedSpaceId]);

  const spaceTaskRows = useMemo(() => {
    let baseRows = allTaskRows.filter((r) => String(r.task_space_id) === selectedSpaceId);
    
    if (selectedTaskId !== "all") {
      const selectedTask = allTaskRows.find(t => String(t.task_id) === selectedTaskId);
      if (selectedTask) {
        const getDescendants = (parentId: any, allTasks: any[]): any[] => {
          const children = allTasks.filter(t => t.parent_task_id && String(t.parent_task_id) === String(parentId)).map(t => t.task_id);
          const descendants = [...children];
          children.forEach(childId => {
            descendants.push(...getDescendants(childId, allTasks));
          });
          return descendants;
        };
        const childIds = getDescendants(selectedTask.task_id, allTaskRows);
        baseRows = baseRows.filter(r => String(r.task_id) === selectedTaskId || childIds.includes(r.task_id));
      } else {
        baseRows = baseRows.filter(r => String(r.task_id) === selectedTaskId);
      }
    }
    return baseRows;
  }, [allTaskRows, selectedSpaceId, selectedTaskId]);

  const { aggregatedProjectProgress, aggregatedOverdueItems, aggregatedHealthScore, aggregatedTotalItems } = useMemo(() => {
    if (selectedTaskId !== "all") {
      const totalProgress = spaceTaskRows.reduce((sum, row) => sum + (Number(row.progress_pct) || 0), 0);
      const aggregatedProjectProgress = spaceTaskRows.length > 0 ? (totalProgress / spaceTaskRows.length) : 0;
      const aggregatedOverdueItems = spaceTaskRows.filter(r => r.is_overdue).length;
      const totalHealthScore = spaceTaskRows.reduce((sum, row) => sum + (Number(row.task_health_score) || 0), 0);
      const aggregatedHealthScore = spaceTaskRows.length > 0 ? (totalHealthScore / spaceTaskRows.length) : 0;
      const aggregatedTotalItems = spaceTaskRows.length;
      return { aggregatedProjectProgress, aggregatedOverdueItems, aggregatedHealthScore, aggregatedTotalItems };
    }

    const totalProgress = spaceDashboardRows.reduce((sum, row) => sum + (Number(row.count_based_progress_pct) || 0), 0);
    const aggregatedProjectProgress = spaceDashboardRows.length > 0 ? (totalProgress / spaceDashboardRows.length) : 0;
    const aggregatedOverdueItems = spaceDashboardRows.reduce((sum, row) => sum + (Number(row.overdue_items) || 0), 0);
    const totalHealthScore = spaceDashboardRows.reduce((sum, row) => sum + (Number(row.avg_health_score) || 0), 0);
    const aggregatedHealthScore = spaceDashboardRows.length > 0 ? (totalHealthScore / spaceDashboardRows.length) : 0;
    const aggregatedTotalItems = spaceDashboardRows.reduce((sum, row) => sum + (Number(row.total_items) || 0), 0);
    return { aggregatedProjectProgress, aggregatedOverdueItems, aggregatedHealthScore, aggregatedTotalItems };
  }, [spaceDashboardRows, spaceTaskRows, selectedTaskId]);

  const timelineChartData = useMemo(() => {
    if (selectedTaskId !== "all") return spaceTaskRows;
    return spaceDashboardRows;
  }, [spaceDashboardRows, spaceTaskRows, selectedTaskId]);

  const statusOptions = useMemo(() => {
    const seen = new Map<string, string>();
    spaceTaskRows.forEach((r) => { if (r.status_name && !seen.has(r.status_name)) seen.set(r.status_name, r.status_color ?? "#6B7280"); });
    return Array.from(seen.entries()).map(([name, color]) => ({ name, color })).sort((a, b) => a.name.localeCompare(b.name));
  }, [spaceTaskRows]);

  const severityOptions = useMemo(() => {
    const seen = new Map<string, string>();
    spaceTaskRows.forEach((r) => { if (r.severity_name && !seen.has(r.severity_name)) seen.set(r.severity_name, r.severity_color ?? "#6B7280"); });
    return Array.from(seen.entries()).map(([name, color]) => ({ name, color })).sort((a, b) => a.name.localeCompare(b.name));
  }, [spaceTaskRows]);

  const assigneeOptions = useMemo(() => {
    const seen = new Set<number>();
    const list: { id: number; name: string; email: string, profilePic?: string }[] = [];
    spaceTaskRows.forEach((r) => {
      if (r.assignee_resource_id && !seen.has(r.assignee_resource_id)) {
        seen.add(r.assignee_resource_id);
        list.push({ id: r.assignee_resource_id, name: r.assignee_full_name ?? "", email: r.assignee_email ?? "", profilePic: r.assignee_profile_pic });
      }
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [spaceTaskRows]);

  const filteredRows = useMemo(
    () => spaceTaskRows.filter((r) => {
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(r.status_name)) return false;
      if (selectedSeverities.length > 0 && !selectedSeverities.includes(r.severity_name)) return false;
      if (selectedAssigneeIds.length > 0 && !selectedAssigneeIds.includes(r.assignee_resource_id)) return false;
      return true;
    }),
    [spaceTaskRows, selectedStatuses, selectedSeverities, selectedAssigneeIds],
  );

  const handleSpaceChange = (id: string) => {
    setSelectedSpaceId(id); sessionStorage.setItem(SPACE_KEY, id);
    setSelectedTaskId("all"); sessionStorage.removeItem(TASK_KEY);
    setSelectedStatuses([]); setSelectedSeverities([]); setSelectedAssigneeIds([]);
  };
  const handleTaskChange = (id: string) => {
    setSelectedTaskId(id); sessionStorage.setItem(TASK_KEY, id);
  };
  const toggleStatus   = (n: string) => setSelectedStatuses((p)   => p.includes(n) ? p.filter((x) => x !== n) : [...p, n]);
  const toggleSeverity = (n: string) => setSelectedSeverities((p) => p.includes(n) ? p.filter((x) => x !== n) : [...p, n]);
  const toggleAssignee = (id: number) => setSelectedAssigneeIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d, yyyy")}`
      : format(dateRange.from, "MMM d, yyyy")
    : "Date Range";

  // ── Card renderer ──────────────────────────────────────────────────────────
  const renderCard = (id: string) => {
    switch (id) {
      case "kpi-progress":    return <KpiStatCard label="Project Progress" value={aggregatedProjectProgress != null ? `${aggregatedProjectProgress.toFixed(1)}%` : "—"} color="text-green-400" loading={loading} />;
      case "kpi-overdue":     return <KpiStatCard label="Overdue Items"    value={aggregatedOverdueItems != null ? String(aggregatedOverdueItems) : "—"}                                  color="text-red-400"   loading={loading} />;
      case "kpi-health":      return <KpiStatCard label="Health Score"     value={aggregatedHealthScore != null ? `${aggregatedHealthScore.toFixed(0)}/100` : "—"}    color="text-blue-400"  loading={loading} />;
      case "kpi-total-tasks": return <KpiStatCard label="Total Items"      value={aggregatedTotalItems != null ? String(aggregatedTotalItems) : "—"}                                       color="text-cyan-400"  loading={loading} />;
      case "project-timeline":  return <ProjectTimelineChart dashboardRows={timelineChartData} isTaskView={selectedTaskId !== 'all'} loading={loading} />;
      case "task-distribution": return <TaskDistributionCard rows={filteredRows} loading={loading} />;
      case "assignee-workload": return <AssigneeWorkloadChart rows={filteredRows} loading={loading} />;
      case "effort-analysis":   return <EffortAnalysisChart rows={filteredRows} loading={loading} />;
      case "completion-trend":  return <TaskCompletionTrendChart rows={filteredRows} loading={loading} />;
      // case "critical-priority": return <CriticalHighPriorityPanel rows={filteredRows} loading={loading} />;
      // case "blocked-tasks":     return <BlockedTasksPanel rows={filteredRows} loading={loading} />;
      case "upcoming-tasks":    return <UpcomingTasksPanel rows={filteredRows} loading={loading} />;
      case "special-tasks":     return <SpecialTasksPanel rows={filteredRows} loading={loading} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap pt-3">

        <Popover open={spaceDropdownOpen} onOpenChange={setSpaceDropdownOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={spaceDropdownOpen}
              className="h-7 text-xs px-2.5 w-44 font-medium bg-primary/10 dark:bg-primary/20 border-primary justify-between"
              disabled={loading}
            >
              <span className="truncate">{loading && !selectedSpaceId ? "Syncing spaces..." : spaceOptions.find(s => s.value === selectedSpaceId)?.label || "Select space"}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search space..." />
              <CommandEmpty>No space found.</CommandEmpty>
              <CommandGroup>
                {spaceOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      handleSpaceChange(option.value);
                      setSpaceDropdownOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", selectedSpaceId === option.value ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover open={taskDropdownOpen} onOpenChange={setTaskDropdownOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={taskDropdownOpen}
              className="h-7 text-xs px-2.5 w-44 font-medium bg-primary/10 dark:bg-primary/20 border-primary justify-between"
              disabled={loading}
            >
              <span className="truncate">{loading && !taskOptions.length ? "Loading tasks..." : selectedTaskId === "all" ? `All ${rootTaskLevelName}s` : taskOptions.find(t => t.value === selectedTaskId)?.label}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search task..." />
              <CommandEmpty>No task found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => { handleTaskChange("all"); setTaskDropdownOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4 shrink-0", selectedTaskId === "all" ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">All {rootTaskLevelName}s</span>
                </CommandItem>
                {taskOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      handleTaskChange(option.value === selectedTaskId ? "all" : option.value);
                      setTaskDropdownOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", selectedTaskId === option.value ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{option.label}</span>
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
            <Button size="sm" variant="outline" className={`h-7 text-xs px-2 ${selectedStatuses.length > 0 ? "bg-primary/10 dark:bg-primary/20 border-primary" : ""}`} disabled={loading || statusOptions.length === 0}>
              Status {selectedStatuses.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium">{selectedStatuses.length}</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[180px]">
            <div className="p-2 space-y-1.5 max-h-[200px] overflow-y-auto">
              {statusOptions.map((s) => (
                <label key={s.name} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5" checked={selectedStatuses.includes(s.name)} onChange={() => toggleStatus(s.name)} />
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs truncate">{s.name}</span>
                  </div>
                </label>
              ))}
            </div>
            {selectedStatuses.length > 0 && <div className="px-2 pb-2"><Button variant="ghost" size="sm" className="h-6 w-full text-xs text-red-500 hover:text-red-600" onClick={() => setSelectedStatuses([])}>Clear</Button></div>}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className={`h-7 text-xs px-2 ${selectedSeverities.length > 0 ? "bg-primary/10 dark:bg-primary/20 border-primary" : ""}`} disabled={loading || severityOptions.length === 0}>
              Severity {selectedSeverities.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium">{selectedSeverities.length}</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[180px]">
            <div className="p-2 space-y-1.5 max-h-[200px] overflow-y-auto">
              {severityOptions.map((s) => (
                <label key={s.name} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5" checked={selectedSeverities.includes(s.name)} onChange={() => toggleSeverity(s.name)} />
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Flag className="w-3.5 h-3.5 flex-shrink-0" style={{ color: s.color }} fill={s.color} />
                    <span className="text-xs truncate">{s.name}</span>
                  </div>
                </label>
              ))}
            </div>
            {selectedSeverities.length > 0 && <div className="px-2 pb-2"><Button variant="ghost" size="sm" className="h-6 w-full text-xs text-red-500 hover:text-red-600" onClick={() => setSelectedSeverities([])}>Clear</Button></div>}
          </DropdownMenuContent>
        </DropdownMenu>

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
        skeletonCount={6}
        skeletonColClass="col-span-2"
        isCustomizing={isCustomizing}
      />
    </div>
  );
}