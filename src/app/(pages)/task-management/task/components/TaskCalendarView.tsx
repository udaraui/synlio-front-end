"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { Draggable } from "@fullcalendar/interaction";
import {
  addDays,
  format,
  parseISO,
  subDays,
} from "date-fns";
import {
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Plus,
  Search,
  X,
  Scaling,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import InlineTaskCreateCard from "./InlineTaskCreateCard";
import {
  patchTaskDates,
  searchTasks,
} from "@/services/task-management/task.service";
import type { TaskCardConfigData } from "./task-card.types";
import { getHierarchyLevelIcon } from "@/enums/space-configure-icon.enum";
import { ParentLevelsHoverCard } from "@/components/common/ParentLevelsHoverCard";

export interface CalendarPageFilters {
  name?: string;
  code?: string;
  description?: string;
  statusIds?: string[];
  severityIds?: string[];
  assigneeIds?: string[];
  coAssigneeIds?: string[];
  special?: boolean | null;
}

interface TaskCalendarViewProps {
  taskSpaceId: number | null;
  configData: TaskCardConfigData;
  canCreate?: boolean;
  canEdit?: boolean;
  filters?: CalendarPageFilters;
  onTaskClick?: (taskId: number) => void;
  onCreateTask?: (startDate?: string) => void;
  /**
   * False while the page is showing Grid / Table / Kanban. The component stays
   * mounted (hidden) so its dataset and calendar position survive view
   * switches — see the isActive effect below for what happens on re-entry.
   */
  isActive?: boolean;
  triggerCalendarCreate?: number;
  tasks: any[];
  onRefresh?: () => void;
}

type CalViewType = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

const VIEW_LABELS: Record<CalViewType, string> = {
  dayGridMonth: "Month",
  timeGridWeek: "Week",
  timeGridDay: "Day",
};

// helpers

/**
 * FullCalendar all-day events use exclusive end dates.
 * Convert inclusive dueDate → exclusive FC end.
 */
function toFcEnd(dueDate: string | Date | null | undefined): string | undefined {
  if (!dueDate) return undefined;
  return format(addDays(new Date(dueDate), 1), "yyyy-MM-dd");
}

/**
 * Convert FC exclusive endStr → inclusive dueDate string.
 */
function fromFcEnd(endStr: string | null | undefined, startStr: string): string {
  if (!endStr) return startStr;
  return format(subDays(parseISO(endStr), 1), "yyyy-MM-dd");
}

// Avatar primitives — mirrors UserAvatar from InlineEditableTaskComponents.tsx
// (renders <img> when profile_pic is present, otherwise an initials circle)

type Person = {
  id: number;
  first_name?: string;
  last_name?: string;
  profile_pic?: string | null;
};

function initials(p?: Person | null): string {
  if (!p) return "?";
  const f = p.first_name?.[0] ?? "";
  const l = p.last_name?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

function fullName(p?: Person | null): string {
  if (!p) return "";
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
}

/** Single avatar — uses profile_pic <img> if available, otherwise initials. */
function PersonAvatar({
  person,
  size,
  variant,
  title,
}: {
  person: Person;
  size: number;
  variant: "assignee" | "coAssignee";
  title?: string;
}) {
  const fontSize = Math.max(8, Math.round(size * 0.45));
  const ringClass = "border border-white dark:border-gray-800";
  const fallbackClass =
    variant === "assignee"
      ? "bg-primary text-white"
      : "bg-primary/15 dark:bg-primary/30 text-primary";

  if (person.profile_pic) {
    return (
      <img
        src={person.profile_pic}
        alt={fullName(person)}
        title={title ?? fullName(person)}
        className={`rounded-full object-cover flex-shrink-0 ${ringClass}`}
        style={{ width: size, height: size }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${ringClass} ${fallbackClass}`}
      style={{ width: size, height: size, fontSize }}
      title={title ?? fullName(person)}
    >
      {initials(person)}
    </div>
  );
}


// Unscheduled panel sub-component

function UnscheduledPanel({
  tasks,
  hierarchyLevels,
  containerRef,
  onClose,
  onTaskClick,
  createForm,
}: {
  tasks: any[];
  hierarchyLevels: any[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onTaskClick?: (taskId: number) => void;
  createForm?: React.ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const STATUS_ORDER: Record<string, number> = { 'To Start': 0, 'Processing': 1, 'Finished': 2 };

  // Collect unique statuses by name, ordered To Start → Processing → Finished
  const uniqueStatuses = useMemo(() => {
    const map = new Map<string, { name: string; color: string; base: string }>();
    tasks.forEach((t) => {
      const sName = t.statusName ?? t.status?.name;
      const sColor = t.statusColor ?? t.status?.color;
      const sBase = t.statusBase ?? t.status?.base ?? '';
      if (sName && !map.has(sName))
        map.set(sName, { name: sName, color: sColor, base: sBase });
    });
    return Array.from(map.values()).sort(
      (a, b) => (STATUS_ORDER[a.base] ?? 99) - (STATUS_ORDER[b.base] ?? 99)
    );
  }, [tasks]);

  const toggleStatus = (name: string) =>
    setStatusFilter((prev) => prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]);

  const sortByStatus = (list: any[]) =>
    [...list].sort((a, b) =>
      (STATUS_ORDER[a.statusBase ?? a.status?.base] ?? 99) - (STATUS_ORDER[b.statusBase ?? b.status?.base] ?? 99)
    );

  const visible = sortByStatus(
    tasks.filter((t) => {
      const matchSearch = !search.trim() ||
        t.name?.toLowerCase().includes(search.trim().toLowerCase()) ||
        t.code?.toLowerCase().includes(search.trim().toLowerCase());
      const sName = t.statusName ?? t.status?.name;
      const matchStatus = statusFilter.length === 0 || (sName && statusFilter.includes(sName));
      return matchSearch && matchStatus;
    }),
  );

  return (
    <div
      className="w-100 flex-shrink-0 border rounded-md bg-white dark:bg-background flex flex-col overflow-hidden"
      style={{ maxHeight: "100%" }}
    >
      {/* header */}
      <div className="flex items-start justify-between px-3 py-2.5 border-b">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground leading-tight">Unscheduled Tasks</span>
          <span className="text-xs text-muted-foreground leading-tight">
            Drag a task onto the calendar to schedule it
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {tasks.length}
          </span> */}
          <button
            onClick={onClose}
            className="rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Inline Create Form from Parent */}
      {createForm && (
        <div className="border-b">
          {createForm}
        </div>
      )}

      {/* search + status filter */}
      {(tasks.length > 0 || search || statusFilter.length > 0) && (
        <div className="px-2 py-1.5 border-b flex items-center gap-1">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search task"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-7 pr-7 text-sm bg-transparent border-none outline-none focus:ring-0 shadow-none placeholder:text-muted-foreground"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Status filter dropdown */}
          {/* {uniqueStatuses.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className={`h-8 text-xs px-2 ${statusFilter.length > 0 ? "bg-primary/10 dark:bg-primary/20 border-primary" : ""}`}
              >
                Status
                {statusFilter.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium">
                    {statusFilter.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <div className="p-2 space-y-1.5 max-h-[200px] overflow-y-auto">
                {uniqueStatuses.map((s) => (
                  <label key={s.name} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5"
                      checked={statusFilter.includes(s.name)}
                      onChange={() => toggleStatus(s.name)}
                    />
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-xs truncate">{s.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )} */}
        </div>
      )}

      {/* draggable list */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-28 gap-2 text-muted-foreground">
            <CalendarOff className="h-7 w-7 opacity-30" />
            <span className="text-sm">
              {search || statusFilter.length > 0 ? "No tasks match your filters" : "No unscheduled tasks"}
            </span>
          </div>
        ) : (
          visible.map((t) => {
            const levelColor = t.hierarchyLevelColor ?? "#6366f1";
            const statusColor = t.statusColor ?? t.status?.color ?? null;
            const statusName = t.statusName ?? t.status?.name ?? null;
            const levelConfig = hierarchyLevels.find((l: any) => l.id === t.hierarchyLevelConfigId);
            const LevelIcon = levelConfig?.icon ? getHierarchyLevelIcon(levelConfig.icon) : null;
            return (
              <div
                key={t.id}
                className="unscheduled-item relative rounded-lg cursor-grab active:cursor-grabbing select-none hover:shadow-md transition-shadow border"
                style={{
                  backgroundColor: "rgba(156,163,175,0.12)",
                  borderColor: levelColor + "66",
                }}
                data-event={JSON.stringify({
                  id: String(t.id),
                  title: t.name ?? "(Untitled)",
                  allDay: true,
                  extendedProps: {
                    taskId: t.id,
                    code: t.code,
                    levelColor,
                    levelIcon: levelConfig?.icon ?? null,
                    levelName: t.hierarchyLevelName,
                    statusColor,
                    statusName,
                    hasChildren: false,
                    isExpanded: false,
                    sortKey: "999",
                    progressPercentage: 0,
                    assignee: t.assignee ?? null,
                    coAssignees: t.coAssignees ?? [],
                  },
                })}
              >
                {/* Assignee only — top right corner */}
                {t.assignee && (
                  <div className="absolute top-3 right-3 z-10">
                    <PersonAvatar
                      person={t.assignee}
                      size={22}
                      variant="assignee"
                      title={`Assignee: ${fullName(t.assignee)}`}
                    />
                  </div>
                )}

                <div className="p-3 space-y-1.5">
                  {/* top row: level icon + code + status badge */}
                  {(LevelIcon || t.code || (statusColor && statusName)) && (
                    <div className="flex items-center gap-1.5 flex-wrap pr-8">
                      {LevelIcon && (
                        <LevelIcon
                          className="w-4 h-4 flex-shrink-0"
                          style={{ color: levelColor }}
                        />
                      )}
                      {t.code && (
                        <ParentLevelsHoverCard
                          id={t.id}
                          postType="Task"
                          code={t.code}
                          className="text-[13px] tracking-wide"
                          onClick={() => onTaskClick?.(t.id)}
                        />
                      )}
                      {statusColor && statusName && (
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300"
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: statusColor }}
                          />
                          {statusName}
                        </span>
                      )}
                    </div>
                  )}

                  {/* name */}
                  <div className="text-[13px] font-medium text-gray-700 dark:text-gray-200 leading-snug break-words">
                    {t.name ?? "(Untitled)"}
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function TaskCalendarView({
  taskSpaceId,
  configData,
  canCreate,
  canEdit,
  filters,
  onTaskClick,
  onCreateTask,
  isActive = true,
  triggerCalendarCreate,
  tasks,
  onRefresh,
}: TaskCalendarViewProps) {
  const calRef = useRef<FullCalendar>(null);
  const unscheduledRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTitle, setCurrentTitle] = useState("");
  const [isPast, setIsPast] = useState(false);
  const [isFuture, setIsFuture] = useState(false);

  // Persist calendar position, view, and expanded rows across navigation via sessionStorage.
  const storageKey = taskSpaceId ? `task-cal-${taskSpaceId}` : null;
  const loadCalState = () => {
    if (typeof window === 'undefined' || !storageKey) return null;
    try { return JSON.parse(sessionStorage.getItem(storageKey) ?? 'null'); } catch { return null; }
  };
  const saveCalState = (patch: Record<string, unknown>) => {
    if (!storageKey) return;
    try {
      const prev = JSON.parse(sessionStorage.getItem(storageKey) ?? '{}');
      sessionStorage.setItem(storageKey, JSON.stringify({ ...prev, ...patch }));
    } catch { }
  };

  const [calView, setCalView] = useState<CalViewType>(() => loadCalState()?.view ?? 'dayGridMonth');
  const [calInitDate] = useState<string | undefined>(() => loadCalState()?.date ?? undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<number[]>([]);
  const [levelFilter, setLevelFilter] = useState<number[]>([]);
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>(() => loadCalState()?.expandedIds ?? {});
  const [showUnscheduled, setShowUnscheduled] = useState(false);
  const [showCreateRootForm, setShowCreateRootForm] = useState(false);
  const [addChildForTaskId, setAddChildForTaskId] = useState<number | null>(null);

  // Lazy-loading child tasks
  const [childTasksMap, setChildTasksMap] = useState<Record<number, any[]>>({});
  const [expandLoadingSet, setExpandLoadingSet] = useState<Set<number>>(new Set());
  const inflightFetches = useRef<Set<number>>(new Set());

  // Local cache for tasks created from the calendar view before a full page refresh
  const [localCreatedTasks, setLocalCreatedTasks] = useState<any[]>([]);

  // Merge loaded children into the tasks pool
  const allTasks = useMemo(() => {
    const merged = [...tasks, ...localCreatedTasks];
    Object.values(childTasksMap).forEach((children) => merged.push(...children));
    // deduplicate by id just in case
    // (localCreatedTasks might overlap with tasks after silentRefresh finishes)
    // Map keeps the LAST seen value, so localCreatedTasks might overwrite tasks. We should let tasks overwrite localCreatedTasks if we prefer server state, but since localCreatedTasks has the exact same structure it's fine.
    // We reverse merge so that server tasks take precedence if they arrive:
    const map = new Map();
    localCreatedTasks.forEach(t => map.set(t.id, t));
    Object.values(childTasksMap).forEach(children => children.forEach(t => map.set(t.id, t)));
    tasks.forEach(t => map.set(t.id, t));
    return Array.from(map.values());
  }, [tasks, childTasksMap, localCreatedTasks]);

  // Mirror tasks in a ref so event handlers can read the latest snapshot
  // (needed to look up oldStartDate / oldDueDate / parentTaskId before
  // calling patchTaskDates so the backend can roll up parent dates).
  const tasksRef = useRef<any[]>([]);
  useEffect(() => {
    tasksRef.current = allTasks;
  }, [allTasks]);

  const fetchChildTasksInline = useCallback(async (taskId: number) => {
    if (childTasksMap[taskId] || inflightFetches.current.has(taskId)) return;

    inflightFetches.current.add(taskId);
    setExpandLoadingSet((prev) => new Set(prev).add(taskId));
    try {
      const result = await searchTasks({
        first: 0,
        rows: 1000,
        filters: [{ field: "parentTaskId", value: taskId, matchMode: "equals" }],
        multiSorts: [
          { field: "hierarchyLevelSequence", order: "1" },
          { field: "updatedAt", order: "-1" },
        ],
      });
      const fetchedChildren = result.data || [];
      if (fetchedChildren.length > 0) {
        setChildTasksMap((prev) => ({ ...prev, [taskId]: fetchedChildren }));
      }
    } catch {
      toast.error("Failed to load child tasks");
    } finally {
      inflightFetches.current.delete(taskId);
      setExpandLoadingSet((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }, [childTasksMap]);

  useEffect(() => {
    if (triggerCalendarCreate) {
      setShowUnscheduled(true);
      setShowCreateRootForm(true);
      setAddChildForTaskId(null);
    }
  }, [triggerCalendarCreate]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // hierarchy helpers 

  const childrenMap = useMemo(() => {
    const map: Record<number, number[]> = {};
    allTasks.forEach((t) => {
      if (t.parentTaskId != null) {
        if (!map[t.parentTaskId]) map[t.parentTaskId] = [];
        map[t.parentTaskId].push(t.id);
      }
    });
    return map;
  }, [allTasks]);

  const taskById = useMemo(() => {
    const map: Record<number, any> = {};
    allTasks.forEach((t) => { map[t.id] = t; });
    return map;
  }, [allTasks]);

  const sortKeyMap = useMemo(() => {
    const map: Record<number, string> = {};

    const buildKey = (taskId: number, parentKey: string, siblingIdx: number) => {
      const seg = String(siblingIdx + 1).padStart(3, "0");
      const key = parentKey ? `${parentKey}.${seg}` : seg;
      map[taskId] = key;
      const children = (childrenMap[taskId] ?? []).slice().sort((a, b) => a - b);
      children.forEach((childId, i) => buildKey(childId, key, i));
    };

    const roots = allTasks
      .filter((t) => t.parentTaskId == null || !taskById[t.parentTaskId])
      .slice()
      .sort(
        (a, b) =>
          (a.hierarchyLevelSequence ?? 999) -
          (b.hierarchyLevelSequence ?? 999) ||
          a.id - b.id,
      );

    roots.forEach((t, i) => buildKey(t.id, "", i));
    return map;
  }, [allTasks, childrenMap, taskById]);

  const isTaskVisible = useCallback(
    (taskId: number): boolean => {
      const task = taskById[taskId];
      if (!task) return false;
      if (task.parentTaskId == null || !taskById[task.parentTaskId]) return true;
      if (!expandedIds[task.parentTaskId]) return false;
      return isTaskVisible(task.parentTaskId);
    },
    [taskById, expandedIds],
  );

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const isExpanded = !!prev[id];
      if (!isExpanded) {
        fetchChildTasksInline(id);
      }
      return { ...prev, [id]: !isExpanded };
    });
  }, [fetchChildTasksInline]);

  // Parent tasks whose dates are rolled up from at least one child with a
  // date are read-only on the calendar — same rule the table view enforces
  // (see TaskTableView.tsx `childrenHaveDates`). To shift such a parent, the
  // user must edit the children directly.
  const lockedTaskIds = useMemo(() => {
    const locked = new Set<number>();
    for (const t of allTasks) {
      if (t.parentTaskId != null && (t.startDate || t.dueDate)) {
        locked.add(t.parentTaskId);
      }
    }
    return locked;
  }, [allTasks]);

  // filter & event building

  const calEvents = useMemo(() => {
    let filtered = allTasks;

    // ── Internal (calendar-local) filters ─────────────────────────────────
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name?.toLowerCase().includes(q) ||
          t.code?.toLowerCase().includes(q),
      );
    }

    if (statusFilter.length > 0) {
      filtered = filtered.filter((t) =>
        statusFilter.includes(t.statusId ?? t.status?.id),
      );
    }

    if (levelFilter.length > 0) {
      filtered = filtered.filter((t) =>
        levelFilter.includes(t.hierarchyLevelConfigId),
      );
    }

    // ── Page-level filters (shared with Grid / Table / Kanban) ────────────
    if (filters) {
      if (filters.name?.trim()) {
        const q = filters.name.trim().toLowerCase();
        filtered = filtered.filter((t) => t.name?.toLowerCase().includes(q));
      }
      if (filters.code?.trim()) {
        const q = filters.code.trim().toLowerCase();
        filtered = filtered.filter((t) => t.code?.toLowerCase().includes(q));
      }
      if (filters.description?.trim()) {
        const q = filters.description.trim().toLowerCase();
        filtered = filtered.filter((t) =>
          t.description?.toLowerCase().includes(q),
        );
      }
      if (filters.statusIds && filters.statusIds.length > 0) {
        const ids = filters.statusIds.map(Number);
        filtered = filtered.filter((t) => ids.includes(t.statusId ?? t.status?.id));
      }
      if (filters.severityIds && filters.severityIds.length > 0) {
        const ids = filters.severityIds.map(Number);
        filtered = filtered.filter((t) => ids.includes(t.severityId));
      }
      if (filters.assigneeIds && filters.assigneeIds.length > 0) {
        const ids = filters.assigneeIds.map(Number);
        filtered = filtered.filter((t) => ids.includes(t.assigneeId));
      }
      if (filters.coAssigneeIds && filters.coAssigneeIds.length > 0) {
        const ids = filters.coAssigneeIds.map(Number);
        filtered = filtered.filter((t) =>
          (t.coAssignees as { id: number }[] ?? []).some((ca) =>
            ids.includes(ca.id),
          ),
        );
      }
      if (filters.special != null) {
        filtered = filtered.filter((t) => t.special === filters.special);
      }
    }

    return filtered
      .filter((t) => (t.startDate || t.dueDate) && isTaskVisible(t.id))
      .map((t) => {
        const start = t.startDate
          ? format(new Date(t.startDate), "yyyy-MM-dd")
          : format(new Date(t.dueDate), "yyyy-MM-dd");
        const end = toFcEnd(t.dueDate);
        const isLocked = lockedTaskIds.has(t.id);

        return {
          id: String(t.id),
          title: t.name ?? "(Untitled)",
          start,
          end,
          allDay: true,
          // Lock parent tasks whose dates are rolled up from children:
          // FullCalendar honours these per-event overrides regardless of
          // the calendar-level `editable` prop.
          editable: !isLocked,
          startEditable: !isLocked,
          durationEditable: !isLocked,
          extendedProps: {
            taskId: t.id,
            code: t.code,
            levelColor: t.hierarchyLevelColor ?? "#6366f1",
            levelName: t.hierarchyLevelName,
            levelIcon: (configData.hierarchyLevels ?? []).find(
              (l: any) => l.id === t.hierarchyLevelConfigId,
            )?.icon ?? null,
            levelSequence: t.hierarchyLevelSequence ?? 0,
            parentId: t.parentTaskId,
            statusColor: t.statusColor ?? t.status?.color ?? configData.statuses?.find((s:any) => s.id === t.statusId)?.color ?? null,
            statusName: t.statusName ?? t.status?.name ?? configData.statuses?.find((s:any) => s.id === t.statusId)?.name ?? null,
            hasChildren: (t.childTaskCount ?? 0) > 0 || (childrenMap[t.id]?.length ?? 0) > 0,
            childTaskCount: t.childTaskCount ?? childrenMap[t.id]?.length ?? 0,
            isExpanded: !!expandedIds[t.id],
            isLoadingExpand: expandLoadingSet.has(t.id),
            sortKey: sortKeyMap[t.id] ?? "999",
            progressPercentage: t.progressPercentage ?? 0,
            assignee: t.assignee ?? null,
            coAssignees: t.coAssignees ?? [],
            isLocked,
          },
        };
      });
  }, [
    allTasks,
    searchQuery,
    statusFilter,
    levelFilter,
    filters,
    configData,
    isTaskVisible,
    childrenMap,
    expandedIds,
    expandLoadingSet,
    sortKeyMap,
    lockedTaskIds,
  ]);

  // event handlers

  const silentRefresh = useCallback(() => {
    if (onRefresh) onRefresh();
  }, [onRefresh]);

  /**
   * Re-entry from another view. The component was only hidden, so the dataset,
   * the visible month and the expanded rows are all still here — we just have to
   *   1. tell FullCalendar to re-measure (it can't size itself in a display:none
   *      container, so the grid comes back collapsed otherwise), and
   *   2. refresh in the background, since tasks may have been edited in the
   *      Table / Grid / Kanban view while we were hidden.
   * silentRefresh() (not fetchTasks) keeps the current data on screen — no
   * spinner, no flash of an empty calendar.
   */
  const wasActiveRef = useRef(isActive);
  useEffect(() => {
    const reEntered = isActive && !wasActiveRef.current;
    wasActiveRef.current = isActive;
    if (!reEntered) return;
    calRef.current?.getApi().updateSize();
  }, [isActive]);

  /**
   * Persist a task date change and apply server-authoritative parent-date
   * rollup to local state. Mirrors what TaskTableView does — passing
   * `parentTaskId` is what makes the backend re-compute ancestor dates and
   * return them in `parentUpdates`.
   */
  const persistDateChange = useCallback(
    async (taskId: number, newStart: string | null, newDue: string | null) => {
      const original = tasksRef.current.find((t) => t.id === taskId);
      const oldStart = original?.startDate ?? null;
      const oldDue = original?.dueDate ?? null;
      const parentTaskId = original?.parentTaskId ?? null;

      const updated = await patchTaskDates(
        taskId,
        newStart,
        newDue,
        oldStart,
        oldDue,
        parentTaskId,
      );

      return updated;
    },
    [],
  );

  // Safety net used by drop / resize / receive handlers. Re-checks the
  // current task tree (event-level `editable: false` should already prevent
  // these but guards against any FullCalendar edge case).
  const isTaskLocked = useCallback((taskId: number) => {
    return tasksRef.current.some(
      (t) => t.parentTaskId === taskId && (t.startDate || t.dueDate),
    );
  }, []);

  const handleEventDrop = useCallback(
    async (info: any) => {
      if (!canEdit) {
        info.revert();
        toast.error("You don't have permission to edit tasks");
        return;
      }
      const taskId = parseInt(info.event.id, 10);
      if (isTaskLocked(taskId)) {
        info.revert();
        toast.error("Parent task dates are calculated from its children. Edit the children to change these dates",
        );
        return;
      }
      const newStart = info.event.startStr as string;
      const newDue = fromFcEnd(info.event.endStr, newStart);

      try {
        await persistDateChange(taskId, newStart, newDue);
        silentRefresh();
      } catch {
        info.revert();
        toast.error("Failed to update task dates");
      }
    },
    [canEdit, isTaskLocked, persistDateChange, silentRefresh],
  );

  const handleEventResize = useCallback(
    async (info: any) => {
      if (!canEdit) {
        info.revert();
        return;
      }
      const taskId = parseInt(info.event.id, 10);
      if (isTaskLocked(taskId)) {
        info.revert();
        toast.error("Parent task dates are calculated from its children. Edit the children to change these dates",
        );
        return;
      }
      const newStart = info.event.startStr as string;
      const newDue = fromFcEnd(info.event.endStr, newStart);

      try {
        await persistDateChange(taskId, newStart, newDue);
        silentRefresh();
      } catch {
        info.revert();
        toast.error("Failed to update task dates");
      }
    },
    [canEdit, isTaskLocked, persistDateChange, silentRefresh],
  );

  // Persist view and expanded state to sessionStorage whenever they change.
  useEffect(() => { saveCalState({ view: calView }); }, [calView]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { saveCalState({ expandedIds }); }, [expandedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Parent: single click → expand/collapse; double click → open detail.
  // Leaf: single click → nothing; double click → open detail.
  // Code badge click always opens detail regardless of task type.


  const handleEventClick = useCallback(
    (info: any) => {
      const taskId = parseInt(info.event.id, 10);
      const hasChildren = !!info.event.extendedProps?.hasChildren;

      if (hasChildren) {
        toggleExpand(taskId);
      }
    },
    [toggleExpand],
  );

  const handleDateClick = useCallback(
    (info: any) => {
      // Do nothing when empty space is clicked to avoid opening task page
    },
    [],
  );

  // custom event content

  const renderEventContent = useCallback(
    (eventInfo: any) => {
      const {
        taskId,
        code,
        levelColor,
        levelName,
        levelIcon,
        levelSequence,
        statusColor,
        statusName,
        hasChildren,
        childTaskCount,
        isExpanded,
        isLoadingExpand,
        assignee,
        isLocked,
      } = eventInfo.event.extendedProps as {
        taskId: number;
        code: string | null;
        levelColor: string;
        levelName: string | null;
        levelIcon: string | null;
        statusColor: string | null;
        statusName: string | null;
        hasChildren: boolean;
        childTaskCount: number;
        isExpanded: boolean;
        isLoadingExpand: boolean;
        assignee: Person | null;
        isLocked: boolean;
        levelSequence: number;
      };

      // "+" button: visible on hover when a child level exists
      const sortedLevels = [...(configData.hierarchyLevels ?? [])].sort(
        (a: any, b: any) => a.sequence - b.sequence,
      );
      const nextLevel = sortedLevels.find((l: any) => l.sequence > levelSequence);
      const canAddChild = !!canCreate && !!nextLevel;

      const LevelIcon = levelIcon ? getHierarchyLevelIcon(levelIcon) : null;
      const eventTitle: string = eventInfo.event.title ?? "";

      // Build a tooltip string that includes every piece of info, so when the
      // bar is too narrow to show the name / status / assignee, the user can
      // still see them on hover.
      const tooltipParts: string[] = [];
      if (code) tooltipParts.push(code);
      if (eventTitle) tooltipParts.push(eventTitle);
      if (statusName) tooltipParts.push(`Status: ${statusName}`);
      if (assignee) tooltipParts.push(`Assignee: ${fullName(assignee)}`);
      if (isLocked) {
        tooltipParts.push("Dates rolled up from children");
      }
      const tooltipText = tooltipParts.join(" • ");

      // Calculate duration in days to decide how much to render
      const evStart = eventInfo.event.start;
      const evEnd = eventInfo.event.end;
      const durationDays = evStart && evEnd
        ? Math.round((evEnd.getTime() - evStart.getTime()) / 86400000)
        : 1;
      // 1 day → icon + code + "…"; 2+ days → full content
      const isNarrow = durationDays <= 1;

      return (
        <div
          className="flex items-stretch w-full h-full overflow-hidden group event-bar"
        >
          <div
            className={`flex items-center w-full px-2 py-1 rounded-md transition-all relative overflow-hidden border ${hasChildren ? "cursor-pointer" : "cursor-default"}`}
            style={{
              backgroundColor: "rgba(156,163,175,0.12)",
              borderColor: levelColor + "66",
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleExpand(taskId);
            }}
          >
            {/* Left: icon + code (+ name/status/assignee for wide bars) */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
              {/* Level icon */}
              {LevelIcon && (
                <LevelIcon
                  className="w-3.5 h-3.5 flex-shrink-0 z-10"
                  style={{ color: levelColor }}
                />
              )}

              {/* Code — truncates when bar is too narrow */}
              {code && (
                <span
                  className="text-[13px] font-semibold tracking-wide z-10 cursor-pointer hover:underline truncate flex-shrink-0"
                  style={{ color: '#3B82F6' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskClick?.(taskId);
                  }}
                  title={tooltipText}
                >
                  {code}
                </span>
              )}

              {/* Ellipsis for narrow (≤2 day) bars */}
              {isNarrow && (
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex-shrink-0 z-10">…</span>
              )}

              {/* Full details: name + status + assignee — only for 3+ day bars */}
              {!isNarrow && (
                <div className="flex items-center gap-1.5 flex-1 min-w-0 z-10">
                  <span className="text-[13px] font-medium text-gray-700 dark:text-gray-200 truncate min-w-0 shrink">
                    {eventTitle}
                  </span>
                  {statusColor && statusName && (
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium text-gray-600 dark:text-gray-400 flex-shrink-0"
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: statusColor }}
                      />
                      {statusName}
                    </span>
                  )}
                  {assignee && (
                    <PersonAvatar
                      person={assignee}
                      size={20}
                      variant="assignee"
                      title={`Assignee: ${fullName(assignee)}`}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Right: action buttons pinned to the right */}
            <div className="flex items-center flex-shrink-0 ml-auto pl-1">
              {/* Add child task — only visible on hover */}
              {canAddChild && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddChildForTaskId(taskId);
                    setShowUnscheduled(true);
                  }}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                  title={`Add a${nextLevel?.name ? ` ${nextLevel.name}` : ' child'}`}
                >
                  <Plus size={14} className="text-gray-500 dark:text-gray-300" />
                </button>
              )}

              {/* Expand / Collapse toggle */}
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(taskId);
                  }}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 z-10"
                  title={isExpanded ? 'Collapse child tasks' : `Expand ${childTaskCount} child task(s)`}
                  disabled={isLoadingExpand}
                >
                  {isLoadingExpand ? (
                    <Loader2 size={14} className="text-gray-500 dark:text-gray-300 animate-spin" />
                  ) : isExpanded ? (
                    <ChevronDown size={14} className="text-gray-500 dark:text-gray-300" />
                  ) : (
                    <ChevronRight size={14} className="text-gray-500 dark:text-gray-300" />
                  )}
                </button>
              )}
            </div>{/* end right buttons */}
          </div>
        </div>
      );
    },
    [toggleExpand, configData, canCreate],
  );

  // view change 
  const changeCalView = useCallback((view: CalViewType) => {
    setCalView(view);
    calRef.current?.getApi().changeView(view);
  }, []);

  // derived stats
  const unscheduledTasks = useMemo(() => {
    return allTasks.filter((t) => !t.startDate && !t.dueDate);
  }, [allTasks]);

  // Initialise FullCalendar Draggable on the unscheduled panel
  useEffect(() => {
    if (!showUnscheduled || !unscheduledRef.current) return;
    const draggable = new Draggable(unscheduledRef.current, {
      itemSelector: ".unscheduled-item",
    });
    return () => draggable.destroy();
  }, [showUnscheduled, unscheduledTasks]);

  // Handle a task dropped from the unscheduled panel onto the calendar
  const handleEventReceive = useCallback(
    async (info: any) => {
      if (!canEdit) {
        info.revert();
        return;
      }
      const taskId = parseInt(info.event.id, 10);
      if (isTaskLocked(taskId)) {
        info.revert();
        toast.error("Parent task dates are calculated from its children. Edit the children to change these dates",
        );
        return;
      }
      const newStart = info.event.startStr as string;
      const newDue = fromFcEnd(info.event.endStr, newStart);
      try {
        await persistDateChange(taskId, newStart, newDue);
        toast.success("Task scheduled");
        silentRefresh();
      } catch {
        info.revert();
        toast.error("Failed to schedule task");
      }
    },
    [canEdit, isTaskLocked, persistDateChange, silentRefresh],
  );

  // render
  if (!mounted) return null;

  if (!taskSpaceId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Please select a project space to view the calendar.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* toolbar */}
      <div className="flex items-center gap-1.5 flex-wrap pb-2">

        {/* View toggle */}
        <div className="flex bg-background border border-border rounded-sm shrink-0 items-center h-7">
          {(Object.entries(VIEW_LABELS) as [CalViewType, string][]).map(
            ([v, label]) => (
              <Button
                key={v}
                size="sm"
                variant={calView === v ? "default" : "ghost"}
                className={`h-full text-xs shadow-none ${calView === v ? "px-2.5 font-semibold" : "px-2 font-semibold"}`}
                onClick={() => changeCalView(v as CalViewType)}
              >
                {label}
              </Button>
            ),
          )}
        </div>

        {/* Navigation cluster & Current period title */}
        <div className="flex items-center border border-border rounded-sm overflow-hidden bg-background h-7 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-full w-7 rounded-none border-r hover:bg-accent shrink-0"
            onClick={() => calRef.current?.getApi().prev()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="h-full px-3 text-xs font-semibold rounded-none hover:bg-accent min-w-[140px] gap-2"
            onClick={() => calRef.current?.getApi().today()}
            title="Go to Today"
          >
            {isFuture && <ChevronsLeft className="h-4 w-4 text-primary cursor-pointer" />}
            {currentTitle || "Today"}
            {isPast && <ChevronsRight className="h-4 w-4 text-primary cursor-pointer" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-full w-7 rounded-none border-l hover:bg-accent shrink-0"
            onClick={() => calRef.current?.getApi().next()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1" />

        {/* Hierarchy level filter */}
        {(configData.hierarchyLevels?.length ?? 0) > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-7 text-xs gap-1.5`}
              >
                {/* <Layers className="h-3.5 w-3.5" /> */}
                Levels
                {levelFilter.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-primary text-primary-foreground font-bold">
                    {levelFilter.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[220px] p-2">
              {/* {levelFilter.length > 0 && (
                <div className="flex items-center justify-end mb-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 text-xs text-red-500 hover:text-red-600"
                    onClick={() => setLevelFilter([])}
                  >
                    Clear filter
                  </Button>
                </div>
              )} */}
              <div className="space-y-1.5 max-h-[150px] overflow-y-auto p-1">
                {configData.hierarchyLevels.map((l: any) => {
                  const LevelIcon = getHierarchyLevelIcon(l.icon);
                  return (
                    <label
                      key={l.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5"
                        checked={levelFilter.includes(l.id)}
                        onChange={(e) => {
                          setLevelFilter((prev) =>
                            e.target.checked
                              ? [...prev, l.id]
                              : prev.filter((x) => x !== l.id),
                          );
                        }}
                      />
                      <div className="flex items-center gap-1.5">
                        <LevelIcon className="w-4 h-4 flex-shrink-0" style={{ color: l.color ?? "#6366f1" }} />
                        <span className="text-xs">{l.name}</span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Unscheduled tasks button */}
        <Button
          variant="outline"
          size="sm"
          className={`h-7 text-xs gap-1.5`}
          onClick={() => setShowUnscheduled((v) => !v)}
        >
          <CalendarOff className="h-3.5 w-3.5" />
          Unscheduled
          {unscheduledTasks.length >= 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium">
              {unscheduledTasks.length}
            </span>
          )}
        </Button>
      </div>
      {/* calendar + unscheduled panel side by side */}
      <div className="flex gap-1.5 items-start flex-1 min-h-0">
        {/* calendar */}
        <div className="flex-1 h-full border rounded-md overflow-hidden bg-white dark:bg-background min-w-0">
          <FullCalendar
            ref={calRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={calView}
            initialDate={calInitDate}
            firstDay={1}
            events={calEvents}
            editable={!!canEdit}
            droppable={!!canEdit}
            eventResizableFromStart={!!canEdit}
            eventContent={renderEventContent}
            headerToolbar={false}
            eventOrder={(a: any, b: any) => {
              const ka: string = a.extendedProps?.sortKey ?? "999";
              const kb: string = b.extendedProps?.sortKey ?? "999";
              return ka.localeCompare(kb);
            }}
            eventOrderStrict={true}
            dayMaxEvents={false}
            height="100%"
            eventClassNames="bg-transparent border-none px-0.5 mb-0.5"
            datesSet={(arg) => {
              setCurrentTitle(arg.view.title);
              saveCalState({ date: arg.view.currentStart.toISOString() });
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              setIsFuture(arg.view.currentStart > now);
              setIsPast(arg.view.currentEnd <= now);
            }}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventReceive={handleEventReceive}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
          />
        </div>

        {/* Unscheduled tasks panel */}
        {showUnscheduled && (
          <UnscheduledPanel
            tasks={unscheduledTasks}
            hierarchyLevels={configData.hierarchyLevels ?? []}
            containerRef={unscheduledRef}
            onClose={() => {
              setShowUnscheduled(false);
              setAddChildForTaskId(null);
              setShowCreateRootForm(false);
            }}
            onTaskClick={onTaskClick}
            createForm={
              addChildForTaskId !== null ? (() => {
                const parentTask = tasksRef.current.find((t) => t.id === addChildForTaskId);
                const sortedLvls = [...(configData.hierarchyLevels ?? [])].sort(
                  (a: any, b: any) => a.sequence - b.sequence,
                );
                const parentSeq = parentTask?.hierarchyLevelSequence ?? 0;
                const nextLevel = sortedLvls.find((l: any) => l.sequence > parentSeq);
                if (!parentTask || !nextLevel || !taskSpaceId) return null;

                return (
                  <InlineTaskCreateCard
                    taskSpaceId={taskSpaceId!}
                    configData={configData}
                    hierarchyLevelSequence={nextLevel.sequence}
                    parentTaskId={addChildForTaskId}
                    parentTask={parentTask}
                    label={<>Create child to <span className="text-primary font-semibold">{parentTask.code}</span></>}
                    onSave={(savedTasks) => {
                      const newTasks = Array.isArray(savedTasks) ? savedTasks : [savedTasks];
                      setLocalCreatedTasks(prev => [...prev, ...newTasks]);
                      setAddChildForTaskId(null);
                      toast.success("Child task created");
                      silentRefresh();
                    }}
                    onCancel={() => setAddChildForTaskId(null)}
                    hideBorders={true}
                  />
                );
              })() : showCreateRootForm ? (() => {
                const sortedLvls = [...(configData.hierarchyLevels ?? [])].sort(
                  (a: any, b: any) => a.sequence - b.sequence,
                );
                const rootLevel = sortedLvls[0];
                if (!rootLevel || !taskSpaceId) return null;

                return (
                  <InlineTaskCreateCard
                    taskSpaceId={taskSpaceId!}
                    configData={configData}
                    hierarchyLevelSequence={rootLevel.sequence}
                    label={<>Create new <span className="text-primary font-semibold">{rootLevel.name}</span></>}
                    onSave={(savedTasks) => {
                      const newTasks = Array.isArray(savedTasks) ? savedTasks : [savedTasks];
                      setLocalCreatedTasks(prev => [...prev, ...newTasks]);
                      setShowCreateRootForm(false);
                      toast.success(`${rootLevel.name} created`);
                      silentRefresh();
                    }}
                    onCancel={() => setShowCreateRootForm(false)}
                    hideBorders={true}
                  />
                );
              })() : null
            }
          />
        )}
      </div>

      {/* legend */}
      {configData.hierarchyLevels?.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap mt-3 pt-3 border-t pl-0.5">
          {configData.hierarchyLevels.map((l: any) => {
            const LevelIcon = getHierarchyLevelIcon(l.icon);
            return (
              <div key={l.id} className="flex items-center gap-1.5">
                <LevelIcon className="w-4 h-4 flex-shrink-0" style={{ color: l.color ?? "#6366f1" }} />
                <span className="text-xs font-medium text-muted-foreground">{l.name}</span>
              </div>
            );
          })}
          <div className="w-px h-4 bg-gray-400 dark:bg-gray-600 shrink-0" />
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Scaling className="h-4 w-4" />
            Drag to reschedule & Resize to extend
          </span>
        </div>
      )}

      {/* global calendar style overrides */}
      <style jsx global>{`
        /* Container-query driven layout: when the event bar is narrow,
           hide the name/status/assignee block and show an ellipsis instead.
           Hover the bar to see all details via the native tooltip. */
        .event-bar {
          container-type: inline-size;
        }

        .fc {
          --fc-event-text-color: inherit;
        }
        .fc-daygrid-event {
          background: none !important;
          border: none !important;
          color: inherit !important;
        }
        .fc-theme-standard td {
          border: 1px solid hsl(var(--border)) !important;
        }
        .fc-theme-standard th {
          border: 1px solid hsl(var(--border)) !important;
        }
        .fc-theme-standard .fc-scrollgrid {
          border: 1px solid hsl(var(--border)) !important;
        }
        .fc-scrollgrid-section > td {
          border: 1px solid hsl(var(--border)) !important;
        }
        .fc-daygrid-day-number {
          font-weight: 800;
          opacity: 0.35;
          font-size: 11px;
          padding: 8px !important;
        }
        .fc-day-today {
          background: hsl(var(--accent)) !important;
        }
        .fc-col-header-cell {
          background-color: hsl(var(--background)) !important;
        }
        .fc-col-header-cell-cushion {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          opacity: 0.55;
          padding: 8px 4px !important;
          color: hsl(var(--foreground)) !important;
          text-decoration: none !important;
        }
        .fc-scrollgrid-section-header .fc-scroller {
          background-color: hsl(var(--background)) !important;
        }
        .fc-timegrid-slot {
          height: 2.5em !important;
          border-color: hsl(var(--border)) !important;
        }
        .fc-timegrid-slot-lane {
          border-color: hsl(var(--border)) !important;
        }
        .fc-timegrid-col {
          border-color: hsl(var(--border)) !important;
        }
        .fc-timegrid-axis {
          border-color: hsl(var(--border)) !important;
        }
        .fc-timegrid-slot-label {
          border-color: hsl(var(--border)) !important;
          color: hsl(var(--muted-foreground)) !important;
          font-size: 11px;
        }
        .fc-daygrid-event-dot {
          display: none;
        }
        .fc-event-resizer {
          opacity: 0;
          transition: opacity 0.15s;
        }
        .fc-event:hover .fc-event-resizer {
          opacity: 1;
        }
        .fc-scrollgrid-sync-table {
          height: 100% !important;
        }
      `}</style>
    </div>
  );
}
