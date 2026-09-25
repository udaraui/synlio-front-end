"use client";
import React, { useCallback, useEffect, useState, useRef } from "react";
import NextImage from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { useAuth } from "@/contexts/auth.context";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import {
  LayoutGrid,
  Plus,
  RefreshCw,
  ClipboardXIcon,
  Search,
  X,
  Filter,
  Pin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Flag,
  CalendarIcon,
  CalendarDays,
  TableProperties,
  Columns3,
  AlertTriangle,
  Star,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FilterTemplateButton } from "@/components/common/FilterTemplateButton";
import {
  createOrUpdateUserConfig,
  getUserConfig,
} from "@/services/user-management/user-config-service";
import {
  CategorizedFilterTemplates,
  createFilterTemplate,
  deleteFilterTemplate,
  getCategorizedFilterTemplates,
} from "@/services/filter-template/filter-template-service";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  searchTasks,
  deleteTask,
  getBulkTaskRelations,
  getTaskById,
} from "@/services/task-management/task.service";
import { exportTasksToExcel } from "@/services/task-management/task-export.service";
import {
  searchTaskSpaces,
  getTaskSpaceStatusConfig,
  getTaskSpaceSeverityConfig,
  getTaskSpaceResourcesConfig,
  getHierarchyLevelConfig,
} from "@/services/task-management/task-space.service";
import TaskGridView from "./components/TaskGridView";
import TaskTableView from "./components/TaskTableView";
import TaskKanbanView from "./components/TaskKanbanView";
import TaskCalendarView from "./components/TaskCalendarView";
import {
  TaskGridSkeleton,
  TaskTableSkeleton,
  TaskKanbanSkeleton,
} from "./components/TaskSkeletons";
import type { TaskCardConfigData } from "./components/task-card.types";
import InlineTaskCreateCard from "./components/InlineTaskCreateCard";
import { InlineTaskCreatorRow } from "./components/InlineTaskCreatorRow";
import { useViewPreference } from "@/hooks/use-view-preference";

const TASK_FILTERS_SESSION_KEY = "tmTaskPageFilters";
const LS_SPACE_CONTEXT_KEY = "tmTaskSpaceContext";
const LS_PINNED_FILTERS_KEY = "pinnedTaskFilters";

type ParentTaskEntry = {
  id: number;
  name: string;
  hierarchyLevelName?: string;
  hierarchyLevelConfigId?: number;
  hierarchyLevelSequence?: number;
  /** Members of this (root) task — used to restrict assignee pickers on child tasks */
  members?: any[];
};

// reusable resource avatar (profile pic or initials fallback)
function ResourceAvatar({ r, size = 5 }: { r: any; size?: number }) {
  const sizeClass = `w-${size} h-${size}`;
  const textClass = size <= 5 ? "text-[9px]" : "text-xs";
  if (r?.profile_pic && r.profile_pic !== 'null' && r.profile_pic.trim() !== '') {
    return (
      <NextImage
        src={r.profile_pic}
        alt={`${r.first_name} ${r.last_name}`}
        width={size * 4}
        height={size * 4}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 border border-gray-200 dark:border-gray-600`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} rounded-full bg-primary flex items-center justify-center flex-shrink-0`}
    >
      <span className={`${textClass} font-medium text-white dark:text-black`}>
        {r?.first_name?.[0]}
        {r?.last_name?.[0]}
      </span>
    </div>
  );
}

function Page() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = searchParams.get("meetingId");
  const activityId = searchParams.get("activityId");
  const { setBreadcrumbs, setOnBack } = useBreadcrumb();

  const canView = usePrivilegeGuard("54") as boolean;
  const canCreate = usePrivilegeGuard("55") as boolean;
  const canEdit = usePrivilegeGuard("56") as boolean;
  const canDelete = usePrivilegeGuard("57") as boolean;
  // Export Excel privilege — id: 112 (export:excel-tasks)
  const canExportTasks = usePrivilegeGuard("112") as boolean;

  const [changeView, setChangeView] = useViewPreference(
    "task-management-task",
    ["grid", "table", "kanban", "calendar"],
    "grid",
    user?.id,
  );
  // Latches on the first visit to the Calendar view and never resets, so the
  // calendar is mounted lazily (users who never open it pay nothing) but then
  // stays mounted — hidden — instead of being torn down and refetched on every
  // view switch.
  const [hasVisitedCalendar, setHasVisitedCalendar] = useState(
    changeView === "calendar",
  );
  useEffect(() => {
    if (changeView === "calendar") setHasVisitedCalendar(true);
  }, [changeView]);

  const [isLoading, setIsLoading] = useState(false);
  const [isRelationsLoading, setIsRelationsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasDataFetched, setHasDataFetched] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [triggerCalendarCreate, setTriggerCalendarCreate] = useState<number>(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // filter states
  const [nameFilter, setNameFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [descriptionFilter, setDescriptionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [coAssigneeFilter, setCoAssigneeFilter] = useState<string[]>([]);
  const [coAssigneeSearch, setCoAssigneeSearch] = useState("");
  const [createdByFilter, setCreatedByFilter] = useState<string[]>([]);
  const [createdBySearch, setCreatedBySearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [specialFilter, setSpecialFilter] = useState<boolean | null>(null);

  // Debounced text filters
  const [debouncedNameFilter, setDebouncedNameFilter] = useState("");
  const [debouncedCodeFilter, setDebouncedCodeFilter] = useState("");
  const [debouncedDescriptionFilter, setDebouncedDescriptionFilter] =
    useState("");

  // Sort
  type SortOption =
    | "createdAt-desc"
    | "createdAt-asc"
    | "updatedAt-desc"
    | "updatedAt-asc"
    | "code-asc"
    | "code-desc"
    | "name-asc"
    | "name-desc"
    | "dueDate-asc"
    | "dueDate-desc"
    | "statusId-asc"
    | "statusId-desc";
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedPrefs = localStorage.getItem("user_view_preferences");
        if (savedPrefs) {
          const prefs = JSON.parse(savedPrefs);
          if (prefs.taskDefaultSort) {
            return prefs.taskDefaultSort as SortOption;
          }
        }
      } catch (e) {
        console.error("Error reading taskDefaultSort from localStorage:", e);
      }
    }
    return "createdAt-desc";
  });
  const [defaultSortOption, setDefaultSortOption] = useState<SortOption>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedPrefs = localStorage.getItem("user_view_preferences");
        if (savedPrefs) {
          const prefs = JSON.parse(savedPrefs);
          if (prefs.taskDefaultSort) {
            return prefs.taskDefaultSort as SortOption;
          }
        }
      } catch (e) {
        console.error("Error reading taskDefaultSort from localStorage:", e);
      }
    }
    return "createdAt-desc";
  });
  const [isSortExplicit, setIsSortExplicit] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const savedPrefs = localStorage.getItem("user_view_preferences");
        if (savedPrefs) {
          const prefs = JSON.parse(savedPrefs);
          if (prefs.taskDefaultSort) {
            return true;
          }
        }
      } catch (e) {
        console.error("Error reading taskDefaultSort from localStorage:", e);
      }
    }
    return false;
  });

  // Pinned filters (persisted to localStorage)
  type FilterType =
    | "name"
    | "code"
    | "description"
    | "status"
    | "severity"
    | "assignee"
    | "coAssignee"
    | "dateRange"
    | "special"
    | "createdBy";
  const [pinnedFilters, setPinnedFilters] = useState<FilterType[]>(() => {
    try {
      const saved = localStorage.getItem(LS_PINNED_FILTERS_KEY);
      return saved ? JSON.parse(saved) : ["status"];
    } catch {
      return ["status"];
    }
  });

  // Controlled open state for Sort dropdown (auto-close on select + mouse leave)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Filter templates
  const [categorizedTaskTemplates, setCategorizedTaskTemplates] = useState<CategorizedFilterTemplates>({
    private: [],
    sharedWithMe: [],
    public: [],
  });
  const [activeTemplateId, setActiveTemplateId] = useState<string | number | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const fetchTaskFilterTemplates = useCallback(async () => {
    try {
      const res = await getCategorizedFilterTemplates("TASK");
      setCategorizedTaskTemplates(res);
    } catch (err) {
      console.error("Failed to fetch task filter templates:", err);
    }
  }, []);
  //
  const [taskSpaces, setTaskSpaces] = useState<any[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<any>(null);
  const [configData, setConfigData] = useState<TaskCardConfigData>({
    statuses: [],
    severities: [],
    hierarchyLevels: [],
    resources: [],
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const tableViewHandleRef = React.useRef<{
    notifyTaskDeleted: (id: number) => void;
  } | null>(null);
  const [parentTaskStack, setParentTaskStack] = useState<ParentTaskEntry[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const isFetchingRef = useRef(false);
  const lastKeyRef = useRef("");
  const prevViewRef = useRef(changeView);
  // Computed synchronously during render: prevViewRef.current still holds the
  // PREVIOUS view because the ref is updated inside a useEffect (post-render).
  // True only on the first render where changeView just became "table".
  const isTableViewSwitch =
    prevViewRef.current !== "table" && changeView === "table";
  const taskSpacesRef = useRef<any[]>([]);
  const taskSpacesLoadedRef = useRef(false);
  // Prevents fetchData from re-running the same query that the config effect
  // already pre-fetched at the end of its Promise.all chain.
  const configTaskFetchedRef = useRef(false);
  // When the searchParams effect restores filters from session storage (e.g.
  // navigating from the home-page board shortcut), the config effect must NOT
  // do its own bare-bones initial task search — fetchData will run instead
  // with the full restored filter set.
  const pendingSessionRestoreRef = useRef(false);
  // Always-current ref so callbacks don't suffer from stale closures
  const parentTaskStackRef = useRef<ParentTaskEntry[]>([]);
  parentTaskStackRef.current = parentTaskStack;
  const selectedSpaceIdRef = useRef<number | null>(null);
  selectedSpaceIdRef.current = selectedSpaceId;
  const configDataRef = useRef(configData);
  configDataRef.current = configData;
  // Keep latest selectedSpace in a ref so breadcrumb effect doesn't need it as dep
  const selectedSpaceRef = useRef<any>(null);
  selectedSpaceRef.current = selectedSpace;

  const [isFromSpace, setIsFromSpace] = useState(false);
  const [showInlineCreate, setShowInlineCreate] = useState(false);

  // Root task members for the drilled-down context.
  // parentTaskStack[0] is ALWAYS the top-most root task we drilled into.
  // Its members are loaded as part of the bulk-relations Phase-2 enrichment
  // (or from getTaskById when restoring from URL) — no extra API call needed.
  // null  → root-level view, no restriction on assignee pickers
  // []    → root task has no members → block child-task assignee pickers
  // [...] → restrict pickers to these members
  const effectiveConfigData: TaskCardConfigData = {
    ...configData,
    rootTaskMembers:
      parentTaskStack.length > 0 ? (parentTaskStack[0].members ?? []) : null,
  };

  // ── Clear table expand state when switching TO table from another view ───────
  // This prevents TaskTableView from auto-restoring previously expanded rows
  // (which would fire extra fetchChildTasksInline API calls on mount).
  useEffect(() => {
    const prevView = prevViewRef.current;
    prevViewRef.current = changeView;
    if (prevView !== "table" && changeView === "table" && selectedSpaceId) {
      try {
        sessionStorage.removeItem(`tmTaskExpand-${selectedSpaceId}`);
      } catch {
        /* ignore */
      }
    }
  }, [changeView, selectedSpaceId]);

  // Force table view if meetingId or activityId is present
  useEffect(() => {
    if ((meetingId || activityId) && changeView !== "table") {
      setChangeView("table");
    }
  }, [meetingId, activityId, changeView, setChangeView]);

  // debounce effects for text filters
  useEffect(() => {
    const t = setTimeout(() => setDebouncedNameFilter(nameFilter), 500);
    return () => clearTimeout(t);
  }, [nameFilter]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCodeFilter(codeFilter), 500);
    return () => clearTimeout(t);
  }, [codeFilter]);
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedDescriptionFilter(descriptionFilter),
      500,
    );
    return () => clearTimeout(t);
  }, [descriptionFilter]);

  // Persist pinned filters
  useEffect(() => {
    try {
      localStorage.setItem(
        LS_PINNED_FILTERS_KEY,
        JSON.stringify(pinnedFilters),
      );
    } catch {
      /* ignore */
    }
  }, [pinnedFilters]);

  // filter helpers
  const clearAllFilters = () => {
    setNameFilter("");
    setCodeFilter("");
    setDescriptionFilter("");
    setStatusFilter([]);
    setSeverityFilter([]);
    setAssigneeFilter([]);
    setCoAssigneeFilter([]);
    setCreatedByFilter([]);
    setDateRange(undefined);
    setSpecialFilter(null);
    setParentTaskStack([]);
    setSortOption("updatedAt-desc");
    setIsSortExplicit(false);
    setCurrentPage(1);
    setActiveTemplateId(null);
  };

  const togglePinFilter = (filterType: FilterType) => {
    setPinnedFilters((prev) => {
      if (prev.includes(filterType))
        return prev.filter((f) => f !== filterType);
      if (prev.length >= 5) {
        toast.warning("You can only pin up to 5 filters. Unpin one first");
        return prev;
      }
      return [...prev, filterType];
    });
  };

  const isFilterPinned = (filterType: FilterType) =>
    pinnedFilters.includes(filterType);

  // selectedSpaceId is intentionally excluded — filtering by space keeps the
  // hierarchy intact so the expand/collapse chevron must remain visible.
  const hasActiveFilters = !!(
    nameFilter ||
    codeFilter ||
    descriptionFilter ||
    statusFilter.length > 0 ||
    severityFilter.length > 0 ||
    assigneeFilter.length > 0 ||
    coAssigneeFilter.length > 0 ||
    createdByFilter.length > 0 ||
    dateRange?.from ||
    specialFilter !== null
  );

  const activeFilterCount = [
    selectedSpaceId,
    nameFilter,
    codeFilter,
    descriptionFilter,
    statusFilter.length > 0,
    severityFilter.length > 0,
    assigneeFilter.length > 0,
    coAssigneeFilter.length > 0,
    createdByFilter.length > 0,
    dateRange?.from,
    specialFilter !== null,
  ].filter(Boolean).length;

  // filter template helpers
  const saveCurrentAsTaskTemplate = async (name: string) => {
    if (!name.trim() || !user?.id) return;
    setIsSavingTemplate(true);
    try {
      const activeCompany = (() => {
        try { return JSON.parse(localStorage.getItem("active_company") || "null"); } catch { return null; }
      })();
      const activeCompanyId: number | undefined = activeCompany?.companyId;
      await createFilterTemplate({
        name: name.trim(),
        type: "TASK",
        filters: {
          spaceId: selectedSpaceId,
          nameFilter,
          codeFilter,
          descriptionFilter,
          statusFilter,
          severityFilter,
          assigneeFilter,
          coAssigneeFilter,
          createdByFilter,
          dateRangeFrom: dateRange?.from?.toISOString(),
          dateRangeTo: dateRange?.to?.toISOString(),
          specialFilter,
          sortOption,
        },
      });
      await fetchTaskFilterTemplates();
      toast.success(`Filter template "${name}" saved`);
    } catch {
      toast.error("Failed to save filter template");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const applyTaskFilterTemplate = (template: any) => {
    if (String(activeTemplateId) === String(template.id)) {
      clearAllFilters();
      toast.success(`Deselected template "${template.name}"`);
      return;
    }
    const f = template.filters;
    setNameFilter(f.nameFilter || "");
    setCodeFilter(f.codeFilter || "");
    setDescriptionFilter(f.descriptionFilter || "");
    setStatusFilter(f.statusFilter || []);
    setSeverityFilter(f.severityFilter || []);
    setAssigneeFilter(f.assigneeFilter || []);
    setCoAssigneeFilter(f.coAssigneeFilter || []);
    setCreatedByFilter(f.createdByFilter || []);
    setDateRange(
      f.dateRangeFrom
        ? {
          from: new Date(f.dateRangeFrom),
          to: f.dateRangeTo ? new Date(f.dateRangeTo) : undefined,
        }
        : undefined,
    );
    setSpecialFilter(f.specialFilter ?? null);
    const templateSort = f.sortOption || defaultSortOption;
    setSortOption(templateSort);
    setIsSortExplicit(!!f.sortOption || defaultSortOption !== "createdAt-desc");
    setCurrentPage(1);
    setActiveTemplateId(template.id);
    toast.success(`Applied template "${template.name}"`);
  };

  const deleteTaskFilterTemplate = async (templateId: number | string) => {
    try {
      await deleteFilterTemplate(Number(templateId));
      await fetchTaskFilterTemplates();
      if (String(activeTemplateId) === String(templateId)) setActiveTemplateId(null);
      toast.success("Filter template deleted");
    } catch {
      toast.error("Failed to delete filter template");
    }
  };

  const handleSaveDefaultSort = async () => {
    if (!user?.id) return;
    try {
      const savedPrefs = localStorage.getItem("user_view_preferences");
      const prefs = savedPrefs ? JSON.parse(savedPrefs) : {};
      prefs.taskDefaultSort = sortOption;
      localStorage.setItem("user_view_preferences", JSON.stringify(prefs));

      await createOrUpdateUserConfig(user.id, { viewPreference: prefs });
      setDefaultSortOption(sortOption);
      toast.success("Default sorting preference updated");
    } catch (err) {
      console.error("Failed to save default sorting preference:", err);
      toast.error("Failed to update default sorting preference");
    }
  };

  // Persist all filter state to sessionStorage whenever it changes
  useEffect(() => {
    if (!isInitialized) return;
    sessionStorage.setItem(
      TASK_FILTERS_SESSION_KEY,
      JSON.stringify({
        spaceId: selectedSpaceId,
        parentTaskStack,
        nameFilter,
        codeFilter,
        descriptionFilter,
        statusFilter,
        severityFilter,
        assigneeFilter,
        coAssigneeFilter,
        createdByFilter,
        dateRangeFrom: dateRange?.from?.toISOString(),
        dateRangeTo: dateRange?.to?.toISOString(),
        specialFilter,
        sortOption,
        currentPage,
      }),
    );
  }, [
    isInitialized,
    selectedSpaceId,
    parentTaskStack,
    nameFilter,
    codeFilter,
    descriptionFilter,
    statusFilter,
    severityFilter,
    assigneeFilter,
    coAssigneeFilter,
    createdByFilter,
    dateRange,
    specialFilter,
    sortOption,
    currentPage,
  ]);

  // load filter templates and default sorting on mount
  useEffect(() => {
    if (!user?.id) return;
    const activeCompany = (() => {
      try { return JSON.parse(localStorage.getItem("active_company") || "null"); } catch { return null; }
    })();
    const activeCompanyId: number | undefined = activeCompany?.companyId;
    getUserConfig(user.id)
      .then((cfg) => {
        fetchTaskFilterTemplates();
        if (cfg?.viewPreference?.taskDefaultSort) {
          const fetchedDefault = cfg.viewPreference.taskDefaultSort as SortOption;
          setDefaultSortOption(fetchedDefault);

          // Apply the fetched default sort option only if no session filters are present
          const savedSession = sessionStorage.getItem(TASK_FILTERS_SESSION_KEY);
          if (!savedSession) {
            setSortOption(fetchedDefault);
            setIsSortExplicit(true);
          }
        }
        // Restore saved page size
        if (cfg?.viewPreference?.taskPageSize) {
          const saved = Number(cfg.viewPreference.taskPageSize);
          if ([10, 20, 50, 100].includes(saved)) {
            setItemsPerPage(saved);
          }
        }
      })
      .catch(() => {
        /* ignore */
      });
  }, [user?.id]);

  // render pinned filter in toolbar
  const renderPinnedFilter = (filterType: FilterType) => {
    switch (filterType) {
      case "name":
        return (
          <div key="name" className="relative w-[130px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Name"
              value={nameFilter}
              onChange={(e) => {
                setNameFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-7 pl-7 pr-7 text-xs border border-border shadow-none placeholder:text-xs"
            />
            {nameFilter && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0"
                onClick={() => setNameFilter("")}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        );
      case "code":
        return (
          <div key="code" className="relative w-[110px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Code"
              value={codeFilter}
              onChange={(e) => {
                setCodeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-7 pl-7 pr-7 text-xs border border-border shadow-none placeholder:text-xs"
            />
            {codeFilter && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0"
                onClick={() => {
                  setCodeFilter("");
                  setCurrentPage(1);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        );
      case "description":
        return (
          <div key="description" className="relative w-[140px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Description"
              value={descriptionFilter}
              onChange={(e) => {
                setDescriptionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-7 pl-7 pr-7 text-xs border border-border shadow-none placeholder:text-xs"
            />
            {descriptionFilter && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0"
                onClick={() => {
                  setDescriptionFilter("");
                  setCurrentPage(1);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        );
      case "status":
        if (!configData.statuses?.length) return null;
        return (
          <DropdownMenu key="status">
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className={`h-7 text-xs px-2 ${statusFilter.length > 0 ? "" : ""} border border-border shadow-none`}
              >
                Status
                {statusFilter.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium">
                    {statusFilter.length}
                  </span>
                )}
                {statusFilter.length > 0 && (
                  <span
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStatusFilter([]);
                      setCurrentPage(1);
                    }}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[180px]">
              <div className="p-2 space-y-1.5 max-h-[200px] overflow-y-auto">
                {configData.statuses.map((s: any) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5"
                      checked={statusFilter.includes(s.id?.toString())}
                      onChange={(e) =>
                        setStatusFilter(
                          e.target.checked
                            ? [...statusFilter, s.id?.toString()]
                            : statusFilter.filter((x) => x !== s.id?.toString()),
                        )
                      }
                    />
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-xs truncate">{s.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      case "severity":
        if (!configData.severities?.length) return null;
        return (
          <DropdownMenu key="severity">
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className={`h-7 text-xs px-2 ${severityFilter.length > 0 ? "" : ""} border border-border shadow-none`}
              >
                Severity
                {severityFilter.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium">
                    {severityFilter.length}
                  </span>
                )}
                {severityFilter.length > 0 && (
                  <span
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSeverityFilter([]);
                      setCurrentPage(1);
                    }}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[180px]">
              <div className="p-2 space-y-1.5 max-h-[200px] overflow-y-auto">
                {configData.severities.map((s: any) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5"
                      checked={severityFilter.includes(s.id.toString())}
                      onChange={(e) =>
                        setSeverityFilter(
                          e.target.checked
                            ? [...severityFilter, s.id.toString()]
                            : severityFilter.filter(
                              (x) => x !== s.id.toString(),
                            ),
                        )
                      }
                    />
                    <div className="flex items-center gap-1.5">
                      <Flag
                        className="w-3.5 h-3.5"
                        style={{ color: s.color }}
                        fill={s.color}
                      />
                      <span className="text-xs truncate">{s.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      case "assignee": {
        const resources: any[] = effectiveConfigData.resources ?? [];
        if (!resources.length) return null;
        const filteredAndSorted = [...resources]
          .filter((r: any) => {
            const name = `${r.first_name} ${r.last_name}`.toLowerCase();
            return name.includes(assigneeSearch.toLowerCase());
          })
          .sort((a: any, b: any) => {
            const aSelected = assigneeFilter.includes(a.id.toString());
            const bSelected = assigneeFilter.includes(b.id.toString());
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;
            const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
            const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
            return nameA.localeCompare(nameB);
          });
        return (
          <Popover key="assignee">
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className={`h-7 text-xs px-2 ${assigneeFilter.length > 0 ? "" : ""} border border-border shadow-none`}
              >
                Assignee
                {assigneeFilter.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium">
                    {assigneeFilter.length}
                  </span>
                )}
                {assigneeFilter.length > 0 && (
                  <span
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAssigneeFilter([]);
                      setCurrentPage(1);
                    }}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[220px] p-2 space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <Input
                  placeholder="Search assignees"
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                  className="h-7 text-xs pl-7 pr-2 placeholder:text-xs"
                />
              </div>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {filteredAndSorted.map((r: any) => (
                  <label
                    key={r.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5"
                      checked={assigneeFilter.includes(r.id.toString())}
                      onChange={(e) =>
                        setAssigneeFilter(
                          e.target.checked
                            ? [...assigneeFilter, r.id.toString()]
                            : assigneeFilter.filter(
                              (x) => x !== r.id.toString(),
                            ),
                        )
                      }
                    />
                    <ResourceAvatar r={r} size={6} />
                    <span className="text-xs truncate">
                      {r.first_name} {r.last_name}
                    </span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        );
      }
      case "createdBy": {
        const resources: any[] = effectiveConfigData.resources ?? [];
        if (!resources.length) return null;
        const filteredAndSorted = [...resources]
          .filter((r: any) => {
            const name = `${r.first_name} ${r.last_name}`.toLowerCase();
            return name.includes(createdBySearch.toLowerCase());
          })
          .sort((a: any, b: any) => {
            const emailA = a.email || "";
            const emailB = b.email || "";
            const aSelected = createdByFilter.includes(emailA);
            const bSelected = createdByFilter.includes(emailB);
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;
            const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
            const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
            return nameA.localeCompare(nameB);
          });
        return (
          <Popover key="createdBy">
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className={`h-7 text-xs px-2 ${createdByFilter.length > 0 ? "" : ""} border border-border shadow-none`}
              >
                Created By
                {createdByFilter.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium">
                    {createdByFilter.length}
                  </span>
                )}
                {createdByFilter.length > 0 && (
                  <span
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCreatedByFilter([]);
                      setCurrentPage(1);
                    }}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[220px] p-2 space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <Input
                  placeholder="Search creators..."
                  value={createdBySearch}
                  onChange={(e) => setCreatedBySearch(e.target.value)}
                  className="h-7 text-xs pl-7 pr-2 placeholder:text-xs"
                />
              </div>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {filteredAndSorted.map((r: any) => {
                  const email = r.email || "";
                  return (
                    <label
                      key={r.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5"
                        checked={createdByFilter.includes(email)}
                        onChange={(e) =>
                          setCreatedByFilter(
                            e.target.checked
                              ? [...createdByFilter, email]
                              : createdByFilter.filter((x) => x !== email),
                          )
                        }
                      />
                      <ResourceAvatar r={r} size={6} />
                      <span className="text-xs truncate">
                        {r.first_name} {r.last_name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        );
      }
      case "coAssignee": {
        const resources: any[] = effectiveConfigData.resources ?? [];
        if (!resources.length) return null;
        return (
          <DropdownMenu key="coAssignee">
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className={`h-7 text-xs px-2 ${coAssigneeFilter.length > 0 ? "" : ""} border border-border shadow-none`}
              >
                Co-Assignee
                {coAssigneeFilter.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium">
                    {coAssigneeFilter.length}
                  </span>
                )}
                {coAssigneeFilter.length > 0 && (
                  <span
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCoAssigneeFilter([]);
                      setCurrentPage(1);
                    }}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[220px]">
              <div className="p-2 space-y-1.5 max-h-[200px] overflow-y-auto">
                {resources.map((r: any) => (
                  <label
                    key={r.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5"
                      checked={coAssigneeFilter.includes(r.id.toString())}
                      onChange={(e) =>
                        setCoAssigneeFilter(
                          e.target.checked
                            ? [...coAssigneeFilter, r.id.toString()]
                            : coAssigneeFilter.filter(
                              (x) => x !== r.id.toString(),
                            ),
                        )
                      }
                    />
                    <ResourceAvatar r={r} size={6} />
                    <span className="text-xs truncate">
                      {r.first_name} {r.last_name}
                    </span>
                  </label>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
      case "dateRange": {
        const label = dateRange?.from
          ? dateRange.to
            ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d, yyyy")}`
            : format(dateRange.from, "MMM d, yyyy")
          : "Date Range";
        return (
          <Popover key="dateRange">
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className={`h-7 text-xs px-2 gap-1.5 ${dateRange?.from ? "" : ""} border border-border shadow-none`}
              >
                {/* <CalendarIcon className="w-3 h-3" /> */}
                <span>{label}</span>
                {dateRange?.from && (
                  <span
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDateRange(undefined);
                      setCurrentPage(1);
                    }}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(r) => {
                  setDateRange(r);
                  setCurrentPage(1);
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        );
      }
      case "special":
        return (
          <Button
            key="special"
            size="sm"
            variant="outline"
            className={`h-7 text-xs px-2 shadow-none gap-1.5 ${specialFilter === true ? "font-medium" : "border-border"}`}
            onClick={() => {
              setSpecialFilter(specialFilter === true ? null : true);
              setCurrentPage(1);
            }}
          >
            <Star
              className={`w-3.5 h-3.5 ${specialFilter === true ? "text-primary" : "text-muted-foreground"}`}
              fill={specialFilter === true ? "currentColor" : "none"}
            />
            Special
          </Button>
        );
      default:
        return null;
    }
  };

  // Restore filters from session / URL
  useEffect(() => {
    let cancelled = false;

    const urlSpaceId = searchParams.get("taskSpaceId");
    const urlParentTaskId = searchParams.get("parentTaskId");
    const fromSpace = searchParams.get("fromSpace") === "1";

    setIsFromSpace(fromSpace);
    // CRITICAL: always block fetchData while we rebuild state from the new URL.
    // Without this a stale isFromSpace/selectedSpaceId change triggers fetchData
    // with the OLD parentTaskStack before buildAncestorStack completes → "No Task Found".
    setIsInitialized(false);

    // Helper to restore filter values from a parsed session object
    const restoreFiltersFromSession = (f: any) => {
      if (f.nameFilter !== undefined) setNameFilter(f.nameFilter);
      if (f.codeFilter !== undefined) setCodeFilter(f.codeFilter);
      if (f.descriptionFilter !== undefined)
        setDescriptionFilter(f.descriptionFilter);
      if (f.statusFilter) setStatusFilter(f.statusFilter);
      if (f.severityFilter) setSeverityFilter(f.severityFilter);
      if (f.assigneeFilter) setAssigneeFilter(f.assigneeFilter);
      if (f.coAssigneeFilter) setCoAssigneeFilter(f.coAssigneeFilter);
      if (f.createdByFilter) setCreatedByFilter(f.createdByFilter);
      if (f.dateRangeFrom)
        setDateRange({
          from: new Date(f.dateRangeFrom),
          to: f.dateRangeTo ? new Date(f.dateRangeTo) : undefined,
        });
      if (f.specialFilter !== undefined) setSpecialFilter(f.specialFilter);
      if (f.sortOption) {
        setSortOption(f.sortOption);
        setIsSortExplicit(true);
      }
      if (f.currentPage) setCurrentPage(f.currentPage);
      if (f.templateId) setActiveTemplateId(f.templateId);
    };

    if (urlSpaceId) {
      const numericSpaceId = Number(urlSpaceId);
      setSelectedSpaceId(numericSpaceId);
      if (!urlParentTaskId) setParentTaskStack([]);

      if (fromSpace) {
        // User is entering from the task-space listing — clear all filters, session, and expand stacks
        setNameFilter("");
        setCodeFilter("");
        setDescriptionFilter("");
        setStatusFilter([]);
        setSeverityFilter([]);
        setAssigneeFilter([]);
        setCoAssigneeFilter([]);
        setCreatedByFilter([]);
        setDateRange(undefined);
        setSpecialFilter(null);
        setSortOption(defaultSortOption);
        setIsSortExplicit(defaultSortOption !== "createdAt-desc");
        setCurrentPage(1);
        setParentTaskStack([]);
        try {
          sessionStorage.removeItem(TASK_FILTERS_SESSION_KEY);
          sessionStorage.removeItem(`tmTaskExpand-${numericSpaceId}`);
        } catch {
          /* ignore */
        }
      } else {
        // Returning from task form or breadcrumb nav — restore filters if same space.
        // IMPORTANT: Skip restoration during internal drill-down/back navigation
        // (pushState/replaceState from handleShowChildTasks or handleNavigateBack).
        // Those handlers already set the correct filter state; restoring from a
        // stale session would create a different fetchData key → duplicate request.
        const stackTop =
          parentTaskStackRef.current[parentTaskStackRef.current.length - 1];
        const isInternalNav =
          urlParentTaskId !== null &&
          stackTop != null &&
          stackTop.id === Number(urlParentTaskId);

        if (!isInternalNav) {
          try {
            const saved = sessionStorage.getItem(TASK_FILTERS_SESSION_KEY);
            if (saved) {
              const f = JSON.parse(saved);
              if (f.spaceId === numericSpaceId) {
                restoreFiltersFromSession(f);
                // Signal the config effect to skip its bare-bones initial
                // task search so fetchData can run with the restored filters.
                pendingSessionRestoreRef.current = true;
                // When URL has no parentTaskId, we are at the space root level:
                // reset drill-down stack and clear it in saved session rather than resurrecting it
                if (!urlParentTaskId) {
                  setParentTaskStack([]);
                  if (f.parentTaskStack?.length) {
                    f.parentTaskStack = [];
                    sessionStorage.setItem(TASK_FILTERS_SESSION_KEY, JSON.stringify(f));
                  }
                }
              }
            }
          } catch {
            /* ignore */
          }
        }
      }
    } else {
      try {
        const saved = sessionStorage.getItem(TASK_FILTERS_SESSION_KEY);
        if (saved) {
          const f = JSON.parse(saved);
          if (f.spaceId) setSelectedSpaceId(f.spaceId);
          if (f.parentTaskStack?.length) setParentTaskStack(f.parentTaskStack);
          restoreFiltersFromSession(f);
          // Signal the config effect to skip its bare-bones initial task
          // search so fetchData can run with the restored filters.
          pendingSessionRestoreRef.current = true;
        }
      } catch {
        /* ignore */
      }
    }

    if (urlParentTaskId) {
      const taskId = Number(urlParentTaskId);

      // Optimisation: if the stack was already updated internally (by handleShowChildTasks
      // or handleNavigateBack) the top entry will already match the URL's parentTaskId.
      // Skip the buildAncestorStack API call entirely — just mark as ready.
      const currentTopEntry =
        parentTaskStackRef.current[parentTaskStackRef.current.length - 1];
      if (currentTopEntry && currentTopEntry.id === taskId) {
        setIsInitialized(true);
        return () => {
          cancelled = true;
        };
      }

      // External navigation (breadcrumb link, page refresh, direct URL) — rebuild from API.
      const buildAncestorStack = async (
        id: number,
      ): Promise<ParentTaskEntry[]> => {
        const task = await getTaskById(id);
        const entry: ParentTaskEntry = {
          id: task.id,
          name: task.name,
          hierarchyLevelName:
            task.hierarchyLevelConfig?.name ?? task.hierarchyLevelName,
          hierarchyLevelConfigId: task.hierarchyLevelConfigId,
          hierarchyLevelSequence:
            task.hierarchyLevelConfig?.sequence ?? task.hierarchyLevelSequence,
          members: task.members ?? [],
        };
        if (task.parentTaskId) {
          const parentEntries = await buildAncestorStack(task.parentTaskId);
          return [...parentEntries, entry];
        }
        return [entry];
      };

      buildAncestorStack(taskId)
        .then((stack) => {
          if (!cancelled) setParentTaskStack(stack);
        })
        .catch(() => {
          if (!cancelled) setParentTaskStack([]);
        })
        .finally(() => {
          if (!cancelled) setIsInitialized(true);
        });
    } else {
      setIsInitialized(true);
    }

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  // Auto-open inline task creator when navigated from home quick-action (?autoCreate=1)
  useEffect(() => {
    if (isInitialized && searchParams.get("autoCreate") === "1") {
      setShowInlineCreate(true);
    }
  }, [isInitialized, searchParams]);

  // Load task spaces for the selector
  useEffect(() => {
    if (taskSpacesLoadedRef.current) return;
    taskSpacesLoadedRef.current = true;
    const load = async () => {
      try {
        const result = await searchTaskSpaces({
          first: 0,
          rows: 100,
          filters: [],
          sortField: "name",
          sortOrder: 1,
        });
        const spaces = result.data || [];
        setTaskSpaces(spaces);
        taskSpacesRef.current = spaces;
        // If a space is already selected but selectedSpace lacks a name
        // (config effect ran before spaces loaded), fill it in now.
        const currentId = selectedSpaceIdRef.current;
        if (currentId) {
          const matched = spaces.find((s: any) => s.id === currentId);
          if (matched) setSelectedSpace(matched);
        }
      } catch {
        /* ignore */
      }
    };
    load();
  }, []);

  // Load selected space config data — depends only on selectedSpaceId (taskSpaces read via ref)
  useEffect(() => {
    if (!selectedSpaceId) {
      setSelectedSpace(null);
      setConfigData({
        statuses: [],
        severities: [],
        hierarchyLevels: [],
        resources: [],
      });
      try {
        localStorage.removeItem(LS_SPACE_CONTEXT_KEY);
      } catch {
        /* ignore */
      }
      return;
    }

    // Block fetchData from making its own initial task search while this effect
    // will do it below. Set synchronously so fetchData's useEffect (defined later)
    // sees the flag as true when it fires for this same render cycle.
    // Exception: when session filters were restored (e.g. navigating from home-page
    // board shortcut), skip the bare-bones initial search here — fetchData will run
    // with the full restored filter set.
    const hasPendingRestore = pendingSessionRestoreRef.current;
    pendingSessionRestoreRef.current = false;

    if (!hasPendingRestore) {
      configTaskFetchedRef.current = true;
    }

    const load = async () => {
      try {
        // ── Parallel execution of Config & Tasks ─────────────────────────────
        const configPromise = Promise.all([
          getTaskSpaceStatusConfig(selectedSpaceId),
          getTaskSpaceSeverityConfig(selectedSpaceId),
          getTaskSpaceResourcesConfig(selectedSpaceId),
          getHierarchyLevelConfig(selectedSpaceId).catch(() => []),
        ]).then(([statusRes, severityRes, resourceRes, hierarchyRes]) => {
          const space = taskSpacesRef.current.find(
            (s: any) => s.id === selectedSpaceId,
          ) ?? {
            id: selectedSpaceId,
          };

          const hierarchyLevels: any[] = Array.isArray(hierarchyRes)
            ? hierarchyRes
            : [];

          setSelectedSpace(space);
          setConfigData({
            taskSpace: space,
            statuses: statusRes.statuses ?? [],
            severities: severityRes.severities ?? [],
            hierarchyLevels,
            resources: resourceRes.resources ?? [],
          });
          try {
            localStorage.setItem(
              LS_SPACE_CONTEXT_KEY,
              JSON.stringify({
                taskSpaceId: selectedSpaceId,
                taskSpaceName: (space as any).name,
              }),
            );
          } catch {
            /* ignore */
          }
        });

        const tasksPromise = (async () => {
          if (!hasPendingRestore) {
            const initialTaskFilters: any[] = [
              {
                field: "taskSpaceId",
                value: selectedSpaceId,
                matchMode: "equals",
              },
              { field: "parentTaskId", matchMode: "is-null", value: "" },
            ];

            const taskRes = await searchTasks({
              first: 0,
              rows: 20,
              filters: initialTaskFilters,
              multiSorts: [{ field: "createdAt", order: "-1" }],
            });
            const tasks: any[] = taskRes.data || [];
            setData(tasks);
            setTotalRecords(taskRes.total || 0);
            setHasDataFetched(true);
            setIsLoading(false); // Hide skeleton immediately after task data is ready

            if (tasks.length > 0) {
              setIsRelationsLoading(true);
              const allIds: number[] = tasks.map((t: any) => t.id);
              const CHUNK = 50;
              const chunks: number[][] = Array.from(
                { length: Math.ceil(allIds.length / CHUNK) },
                (_, i) => allIds.slice(i * CHUNK, i * CHUNK + CHUNK),
              );
              await Promise.all(chunks.map((chunk) => getBulkTaskRelations(chunk)))
                .then((results) => {
                  const relations: Record<number, any> = Object.assign(
                    {},
                    ...results,
                  );
                  setData(
                    tasks.map((t: any) => {
                      const rel = relations[t.id];
                      return rel ? { ...t, ...rel } : t;
                    }),
                  );
                })
                .catch(() => {
                  /* keep Phase-1 data */
                })
                .finally(() => {
                  setIsRelationsLoading(false);
                });
            }
          }
        })();

        // Wait for both independent promises to finish without blocking each other's execution
        await Promise.all([configPromise, tasksPromise]);
      } catch {
        /* ignore */
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [selectedSpaceId]);

  // Sync navbar breadcrumbs with current drill-down level.
  // Reads selectedSpace and taskSpaces via refs so async data loads don't
  // cause extra breadcrumb re-fires — only real navigation changes trigger this.
  // selectedSpace?.name is included so the breadcrumb updates once the standalone
  // spaces effect resolves and fills in the space name (config effect may use a
  // partial space object { id } while spaces are still loading).
  useEffect(() => {
    if (!selectedSpaceId) {
      setBreadcrumbs([]);
      return;
    }
    const spaceName =
      selectedSpaceRef.current?.name ??
      taskSpacesRef.current.find((s: any) => s.id === selectedSpaceId)?.name ??
      "";
    const spaceHref = `/task-management/task?taskSpaceId=${selectedSpaceId}`;
    if (parentTaskStack.length === 0) {
      setBreadcrumbs([{ label: spaceName, isCurrentPage: true }]);
    } else {
      setBreadcrumbs([
        { label: spaceName, href: spaceHref },
        ...parentTaskStack.map((p, i) => ({
          label: p.name,
          href: `/task-management/task?taskSpaceId=${selectedSpaceId}&parentTaskId=${p.id}`,
          isCurrentPage: i === parentTaskStack.length - 1,
        })),
      ]);
    }
  }, [selectedSpaceId, parentTaskStack, setBreadcrumbs, selectedSpace?.name]);

  // handleNavigateBack
  // Mirror of handleShowChildTasks but in reverse: pops one level (hierarchy -1).
  // Called directly by the breadcrumb ← button so NO extra getTaskById API calls
  // are made (unlike the URL-driven buildAncestorStack path).
  const handleNavigateBack = useCallback(() => {
    const currentStack = parentTaskStackRef.current;
    if (currentStack.length === 0) return;
    const newStack = currentStack.slice(0, -1);
    setParentTaskStack(newStack);
    setCurrentPage(1);
    // Keep the URL in sync so a page refresh shows the correct level.
    // replaceState (not pushState) so we don't add an extra history entry.
    const spaceId = selectedSpaceIdRef.current;
    if (spaceId && typeof window !== "undefined") {
      const newParentId =
        newStack.length > 0 ? newStack[newStack.length - 1].id : null;
      const newUrl = newParentId
        ? `/task-management/task?taskSpaceId=${spaceId}&parentTaskId=${newParentId}`
        : `/task-management/task?taskSpaceId=${spaceId}`;
      window.history.replaceState(null, "", newUrl);
    }
  }, []);

  // Register the direct-pop callback in the breadcrumb context whenever the
  // drill-down depth changes. At root (depth 0) we clear it so EnhancedBreadcrumb
  // falls back to navigating to the task-space listing.
  useEffect(() => {
    if (parentTaskStack.length > 0) {
      setOnBack(handleNavigateBack);
    } else {
      setOnBack(undefined);
    }
    return () => {
      setOnBack(undefined);
    };
  }, [parentTaskStack.length, handleNavigateBack, setOnBack]);

  const fetchData = useCallback(async () => {
    if (!canView || !isInitialized) return;
    // Skip if the config effect already pre-fetched this initial load.
    // One-time skip: cleared immediately so subsequent filter changes fetch normally.
    if (configTaskFetchedRef.current) {
      configTaskFetchedRef.current = false;
      return;
    }
    const key = JSON.stringify({
      selectedSpaceId,
      debouncedNameFilter,
      debouncedCodeFilter,
      debouncedDescriptionFilter,
      statusFilter,
      severityFilter,
      assigneeFilter,
      coAssigneeFilter,
      createdByFilter,
      dateRange,
      specialFilter,
      sortOption,
      currentPage,
      itemsPerPage,
      parentTaskStack,
      isFromSpace,
    });
    if (isFetchingRef.current && lastKeyRef.current === key) return;
    isFetchingRef.current = true;
    lastKeyRef.current = key;
    setIsLoading(true);
    try {
      // Determine if any filter-dropdown filter is active.
      // When active: skip hierarchyLevelSequence & parentTaskId so ALL task levels
      // in the space are returned, and always sort by code A→Z.
      const hasFilterActive = !!(
        debouncedNameFilter ||
        debouncedCodeFilter ||
        debouncedDescriptionFilter ||
        statusFilter.length > 0 ||
        severityFilter.length > 0 ||
        assigneeFilter.length > 0 ||
        coAssigneeFilter.length > 0 ||
        createdByFilter.length > 0 ||
        dateRange?.from ||
        specialFilter !== null
      );

      const filters: any[] = [];
      if (selectedSpaceId) {
        filters.push({
          field: "taskSpaceId",
          value: selectedSpaceId,
          matchMode: "equals",
        });
        if (!hasFilterActive) {
          // Sort config levels once — used for both root and child level lookups.
          // Using sorted-order lookup (instead of +1 arithmetic) makes the filter
          // robust when config sequences don't happen to be contiguous integers.
          const sortedConfigLevels = [
            ...(configDataRef.current.hierarchyLevels ?? []),
          ].sort((a: any, b: any) => a.sequence - b.sequence);

          if (parentTaskStack.length > 0) {
            const parentEntry = parentTaskStack[parentTaskStack.length - 1];
            filters.push({
              field: "parentTaskId",
              value: parentEntry.id,
              matchMode: "equals",
            });

            // Find the next level after the parent's sequence from config.
            // const nextLevelFromConfig = sortedConfigLevels.find(
            //   (l: any) =>
            //     l.sequence > (parentEntry.hierarchyLevelSequence ?? -Infinity),
            // );
            // if (nextLevelFromConfig) {
            //   // Restrict to the correct child hierarchy level
            //   filters.push({
            //     field: "hierarchyLevelSequence",
            //     value: nextLevelFromConfig.sequence,
            //     matchMode: "equals",
            //   });
            // }
            // If config isn't loaded yet, skip the sequence filter — parentTaskId is enough.
          } else {
            filters.push({
              field: "parentTaskId",
              matchMode: "is-null",
              value: "",
            });
            // if (isFromSpace) {
            //   // Use the first (lowest-sequence) config level instead of hardcoded 0
            //   const firstLevel = sortedConfigLevels[0];
            //   filters.push({
            //     field: "hierarchyLevelSequence",
            //     value: firstLevel?.sequence ?? 0,
            //     matchMode: "equals",
            //   });
            // }
          }
        }
        // When hasFilterActive: skip parentTaskId and hierarchyLevelSequence
        // so ALL hierarchy levels within the space are searched.
      }
      if (debouncedNameFilter)
        filters.push({
          field: "name",
          value: debouncedNameFilter,
          matchMode: "contains",
        });
      if (debouncedCodeFilter)
        filters.push({
          field: "code",
          value: debouncedCodeFilter,
          matchMode: "contains",
        });
      if (debouncedDescriptionFilter)
        filters.push({
          field: "description",
          value: debouncedDescriptionFilter,
          matchMode: "contains",
        });
      if (statusFilter.length > 0)
        filters.push({
          field: "statusId",
          matchMode: "in",
          value: statusFilter.map(Number),
        });
      if (severityFilter.length > 0)
        filters.push({
          field: "severityId",
          matchMode: "in",
          value: severityFilter.map(Number),
        });
      if (assigneeFilter.length > 0)
        filters.push({
          field: "assigneeId",
          matchMode: "in",
          value: assigneeFilter.map(Number).filter(id => id > 0),
        });
      if (coAssigneeFilter.length > 0)
        filters.push({
          field: "id",
          matchMode: "relation-in",
          value: {
            joinTable: "tm_task_co_assignees",
            ownerColumn: "taskId",
            filterColumn: "resourceId",
            ids: coAssigneeFilter.map(Number),
          },
        });
      if (createdByFilter.length > 0)
        filters.push({
          field: "createdBy",
          matchMode: "in",
          value: createdByFilter,
        });
      if (dateRange?.from)
        filters.push({
          field: "startDate",
          matchMode: ">=",
          value: format(dateRange.from, "yyyy-MM-dd"),
        });
      if (dateRange?.to)
        filters.push({
          field: "dueDate",
          matchMode: "<=",
          value: format(dateRange.to, "yyyy-MM-dd") + "T23:59:59",
        });
      if (specialFilter !== null)
        filters.push({
          field: "special",
          value: specialFilter,
          matchMode: "equals",
        });

      // When any filter-dropdown filter is active → always sort by updated A→Z.
      // Otherwise use the user-selected sort option.
      let multiSorts: { field: string; order: string }[];
      if (hasFilterActive) {
        multiSorts = [{ field: "updatedAt", order: "-1" }];
      } else {
        // Build sort
        let sortField = "updatedAt";
        let sortOrder = "-1";
        if (sortOption === "updatedAt-desc") {
          sortField = "updatedAt";
          sortOrder = "-1";
        } else if (sortOption === "updatedAt-asc") {
          sortField = "updatedAt";
          sortOrder = "1";
        } else if (sortOption === "createdAt-desc") {
          sortField = "createdAt";
          sortOrder = "-1";
        } else if (sortOption === "createdAt-asc") {
          sortField = "createdAt";
          sortOrder = "1";
        } else if (sortOption === "code-asc") {
          sortField = "code";
          sortOrder = "1";
        } else if (sortOption === "code-desc") {
          sortField = "code";
          sortOrder = "-1";
        } else if (sortOption === "name-asc") {
          sortField = "name";
          sortOrder = "1";
        } else if (sortOption === "name-desc") {
          sortField = "name";
          sortOrder = "-1";
        } else if (sortOption === "dueDate-asc") {
          sortField = "dueDate";
          sortOrder = "1";
        } else if (sortOption === "dueDate-desc") {
          sortField = "dueDate";
          sortOrder = "-1";
        } else if (sortOption === "statusId-asc") {
          sortField = "statusId";
          sortOrder = "1";
        } else if (sortOption === "statusId-desc") {
          sortField = "statusId";
          sortOrder = "-1";
        }

        // When space is selected and no explicit sort chosen, use hierarchyLevelSequence for natural ordering.
        // If the user has explicitly chosen a sort option, always honour it.
        multiSorts =
          selectedSpaceId && !isSortExplicit
            ? [
              // { field: "hierarchyLevelSequence", order: "1" },
              { field: "updatedAt", order: "-1" },
            ]
            : [{ field: sortField, order: sortOrder }];
      }

      const result = await searchTasks({
        first: (currentPage - 1) * itemsPerPage,
        rows: itemsPerPage,
        filters,
        multiSorts,
      });
      const tasks: any[] = result.data || [];
      setTotalRecords(result.total || 0);

      // ── Phase 1 ─────────────────────────────────────────────────────────
      // Render cards/rows immediately with data from searchTasks (includes
      // relations loaded via withRelations):
      //   code, name, hierarchy icon/color, status, severity, assignee,
      //   coAssignees, dates
      setData(tasks);

      // ── Phase 2 ─────────────────────────────────────────────────────────
      // Silently enrich each row with computed bulk-relation data:
      //   commentCount, childTaskCount, childrenHaveDates, nextLevelName.
      // Cards re-render in-place — no loading flash, no blank screen wait.
      // IDs are chunked (≤50 per request) and sent in parallel via Promise.all.
      if (tasks.length > 0) {
        setIsRelationsLoading(true);
        const allIds: number[] = tasks.map((t: any) => t.id);
        const CHUNK = 50;
        const chunks: number[][] = Array.from(
          { length: Math.ceil(allIds.length / CHUNK) },
          (_, i) => allIds.slice(i * CHUNK, i * CHUNK + CHUNK),
        );
        Promise.all(chunks.map((chunk) => getBulkTaskRelations(chunk)))
          .then((results) => {
            const relations: Record<number, any> = Object.assign(
              {},
              ...results,
            );
            setData(
              tasks.map((t: any) => {
                const rel = relations[t.id];
                return rel ? { ...t, ...rel } : t;
              }),
            );
          })
          .catch(() => {
            // keep Phase-1 data — relation enrichment is non-critical
          })
          .finally(() => {
            setIsRelationsLoading(false);
          });
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to fetch tasks");
      setData([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
      setHasDataFetched(true);
      isFetchingRef.current = false;
    }
  }, [
    canView,
    isInitialized,
    selectedSpaceId,
    debouncedNameFilter,
    debouncedCodeFilter,
    debouncedDescriptionFilter,
    statusFilter,
    severityFilter,
    assigneeFilter,
    coAssigneeFilter,
    createdByFilter,
    dateRange,
    specialFilter,
    sortOption,
    isSortExplicit,
    currentPage,
    itemsPerPage,
    parentTaskStack,
    isFromSpace,
    // the space config loads after isInitialized fires.
    refreshTrigger,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateTask = async (
    taskId: number,
    updates: any,
    updatedData?: any,
  ) => {
    // Prefer the full API response (updatedData) so that related objects
    // (status, severity, assignee, coAssignees, etc.) are updated without
    // any follow-up GET call.
    try {
      const stateUpdate = { ...(updatedData ?? updates) };

      // Sync denormalized fields so table views (which favor denormalized fields) instantly reflect updates
      if (stateUpdate.status !== undefined) {
        stateUpdate.statusName = stateUpdate.status?.name || null;
        stateUpdate.statusColor = stateUpdate.status?.color || null;
        stateUpdate.statusBase = stateUpdate.status?.base || null;
      }
      if (stateUpdate.severity !== undefined) {
        stateUpdate.severityName = stateUpdate.severity?.name || null;
        stateUpdate.severityColor = stateUpdate.severity?.color || null;
      }
      if (stateUpdate.assignee !== undefined) {
        stateUpdate.assigneeName = stateUpdate.assignee ? `${stateUpdate.assignee.first_name || ''} ${stateUpdate.assignee.last_name || ''}`.trim() : null;
        stateUpdate.assigneeProfilePicUrl = stateUpdate.assignee?.profile_picture || stateUpdate.assignee?.profile_pic || null;
        stateUpdate.assigneeEmail = stateUpdate.assignee?.email || null;
      }
      if (stateUpdate.hierarchyLevelConfig !== undefined) {
        stateUpdate.hierarchyLevelName = stateUpdate.hierarchyLevelConfig?.name || null;
        stateUpdate.hierarchyLevelIcon = stateUpdate.hierarchyLevelConfig?.icon || null;
        stateUpdate.hierarchyLevelColor = stateUpdate.hierarchyLevelConfig?.color || null;
      }

      setData((prev) =>
        prev.map((t) => (t.id !== taskId ? t : { ...t, ...stateUpdate })),
      );
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task", { position: "bottom-right" });
    }
  };

  const handleCreateTask = (savedTasks: any[]) => {
    setData((prev) => {
      const savedTasksMap = new Map(savedTasks.map((t) => [t.id, t]));
      const prevIds = new Set(prev.map((t) => t.id));
      const newTask = savedTasks.find((t) => !prevIds.has(t.id));

      // Update existing tasks in the current view
      let result = prev.map((t) => {
        const updatedTask = savedTasksMap.get(t.id);
        return updatedTask ? { ...t, ...updatedTask } : t;
      });

      // If the new task belongs in the current view, add it
      const currentParentId =
        parentTaskStack.length > 0
          ? parentTaskStack[parentTaskStack.length - 1].id
          : null;
      if (newTask && newTask.parentTaskId === currentParentId) {
        result.unshift({ ...newTask, childTaskCount: 0, childTasks: [] });
      }

      return result;
    });

    const currentParentId =
      parentTaskStack.length > 0
        ? parentTaskStack[parentTaskStack.length - 1].id
        : null;
    const newTask = savedTasks.find((t) => !data.some((pt) => pt.id === t.id));
    if (newTask && newTask.parentTaskId === currentParentId) {
      setTotalRecords((prev) => prev + 1);
    }

    setShowInlineCreate(false);
    toast.success("Task created");
  };

  const handleExportToExcel = async () => {
    if (!hasActiveFilters && !selectedSpaceId && data.length === 0) {
      toast.error("No data to export. Please apply filters or select a space",
        {
          position: "bottom-right",
        },
      );
      return;
    }

    setIsExporting(true);
    try {
      // Parse sort option to convert to multiSorts format
      const [sortField, sortOrder] = sortOption.split("-");
      const multiSorts = [
        {
          field: sortField,
          order: sortOrder === "asc" ? "ASC" : "DESC",
        },
      ];

      // Build filters array
      const filters: any[] = [];

      // Add space filter if selected
      if (selectedSpaceId && selectedSpaceId !== 0) {
        filters.push({
          field: "taskSpaceId",
          matchMode: "equals",
          value: selectedSpaceId,
        });
      }

      // Add parent task filter if drilling down
      // if (parentTaskStack.length > 0) {
      //   const parentTask = parentTaskStack[parentTaskStack.length - 1];
      //   filters.push({
      //     field: "parentTaskId",
      //     matchMode: "equals",
      //     value: parentTask.id,
      //   });
      // }

      // Add text filters
      if (debouncedNameFilter) {
        filters.push({
          field: "name",
          matchMode: "contains",
          value: debouncedNameFilter,
        });
      }
      if (debouncedCodeFilter) {
        filters.push({
          field: "code",
          matchMode: "contains",
          value: debouncedCodeFilter,
        });
      }
      if (debouncedDescriptionFilter) {
        filters.push({
          field: "description",
          matchMode: "contains",
          value: debouncedDescriptionFilter,
        });
      }

      // Add status filter
      if (statusFilter.length > 0) {
        filters.push({
          field: "statusId",
          matchMode: "in",
          value: statusFilter,
        });
      }

      // Add severity filter
      if (severityFilter.length > 0) {
        filters.push({
          field: "severityId",
          matchMode: "in",
          value: severityFilter,
        });
      }

      // Add assignee filter
      if (assigneeFilter.length > 0) {
        filters.push({
          field: "assigneeId",
          matchMode: "in",
          value: assigneeFilter,
        });
      }

      // Add co-assignee filter
      if (coAssigneeFilter.length > 0) {
        filters.push({
          field: "coAssigneeIds",
          matchMode: "in",
          value: coAssigneeFilter,
        });
      }
      if (createdByFilter.length > 0) {
        filters.push({
          field: "createdBy",
          matchMode: "in",
          value: createdByFilter,
        });
      }

      // Add date range filter
      if (dateRange?.from) {
        filters.push({
          field: "dueDate",
          matchMode: "dateIs",
          value: dateRange,
        });
      }

      // Add special filter (favorite, archived, etc.)
      if (specialFilter !== null) {
        filters.push({
          field: "isFavorite",
          matchMode: "=",
          value: specialFilter,
        });
      }

      const queryParam = {
        filters,
        multiSorts,
        first: (currentPage - 1) * itemsPerPage,
        rows: itemsPerPage,
      };

      await exportTasksToExcel(queryParam);
      toast.success("Tasks exported", {
        position: "bottom-right",
      });
    } catch (error) {
      console.error("Error exporting tasks:", error);
      toast.error("Failed to export tasks. Please try again", {
        position: "bottom-right",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Drill-down into child tasks (hierarchy +1)
  const handleShowChildTasks = (task: any) => {
    // Clear all active filters so the child-task drill-down uses normal
    // hierarchy navigation (parentTaskId + hierarchyLevelSequence filters).
    // Without this, hasFilterActive would stay true and skip those filters.
    setNameFilter("");
    setCodeFilter("");
    setDescriptionFilter("");
    setStatusFilter([]);
    setSeverityFilter([]);
    setAssigneeFilter([]);
    setCoAssigneeFilter([]);
    setCreatedByFilter([]);
    setDateRange(undefined);
    setSpecialFilter(null);

    const newEntry: ParentTaskEntry = {
      id: task.id,
      name: task.name,
      hierarchyLevelName: task.hierarchyLevelName,
      hierarchyLevelConfigId: task.hierarchyLevelConfigId,
      hierarchyLevelSequence:
        task.hierarchyLevelSequence ?? task.hierarchyLevelConfig?.sequence,
      members: task.members ?? [],
    };
    setParentTaskStack((prev) => [...prev, newEntry]);
    setCurrentPage(1);
    // Push a browser-history entry so the native back button can restore this level.
    // pushState does NOT trigger a Next.js navigation, so buildAncestorStack is NOT called.
    // The ref-check optimization in the searchParams effect handles it if pushState
    // happens to be intercepted by Next.js in future versions.
    const spaceId = selectedSpaceIdRef.current;
    if (spaceId && typeof window !== "undefined") {
      const newUrl = `/task-management/task?taskSpaceId=${spaceId}&parentTaskId=${task.id}`;
      window.history.pushState(
        { taskSpaceId: spaceId, parentTaskId: task.id },
        "",
        newUrl,
      );
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteTask(deleteConfirmId);
      toast.success("Task deleted");
      setData((prev) => prev.filter((t) => t.id !== deleteConfirmId));
      setTotalRecords((prev) => prev - 1);
      tableViewHandleRef.current?.notifyTaskDeleted(deleteConfirmId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete task");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const totalPages = Math.ceil(totalRecords / itemsPerPage);

  const getCreateHierarchySequence = (): number | undefined => {
    if (parentTaskStack.length > 0) {
      const parentEntry = parentTaskStack[parentTaskStack.length - 1];
      if (parentEntry.hierarchyLevelSequence !== undefined) {
        return parentEntry.hierarchyLevelSequence + 1;
      }
    } else if (selectedSpaceId) {
      return 0;
    }
    return undefined;
  };

  const getNextLevelName = (): string => {
    if (!configData.hierarchyLevels || configData.hierarchyLevels.length === 0)
      return "";
    const sortedLevels = [...configData.hierarchyLevels].sort(
      (a: any, b: any) => a.sequence - b.sequence,
    );

    if (parentTaskStack.length > 0) {
      const parentEntry = parentTaskStack[parentTaskStack.length - 1];
      const parentSeq = parentEntry.hierarchyLevelSequence ?? -Infinity;
      const nextLevel = sortedLevels.find((l: any) => l.sequence > parentSeq);
      return nextLevel ? nextLevel.name : "";
    }

    return sortedLevels[0]?.name || "";
  };

  const nextLevelName = getNextLevelName()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return (
    <div className="flex flex-col h-[calc(100vh-28px)]">
      {/* Header */}
      <div className="flex-none pt-9 pb-1 bg-background">
        <div className="px-3 pt-2 pb-0">
          <div className="flex items-center gap-1.5">
            {canCreate &&
              selectedSpaceId &&
              hasDataFetched &&
              !isLoading &&
              (configData.hierarchyLevels?.length ?? 0) === 0 ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    title="Quick task create"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="end">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-400" />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        No Levels Configured
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        This project space has no hierarchy levels set up.
                        Configure task levels in the space settings first.
                      </p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : canCreate ? (
              <Button
                size="sm"
                className="h-7 text-xs px-2.5"
                title={`Quick ${nextLevelName ? nextLevelName.toLowerCase() : "task"} create`}
                onClick={() => {
                  if (!selectedSpaceId) {
                    toast.error("Please select a project space first");
                    return;
                  }
                  if (changeView === "calendar") {
                    setTriggerCalendarCreate(Date.now());
                    return;
                  }
                  setShowInlineCreate(true);
                  if (changeView !== "table") setChangeView("grid");
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Add
                {nextLevelName ? ` ${nextLevelName}` : ""}
              </Button>
            ) : null}

            <Button
              size="sm"
              variant="outline"
              className={`h-7 w-7 p-0 shrink-0 ${isLoading ? "opacity-50" : ""}`}
              onClick={fetchData}
              disabled={isLoading}
              title="Refresh Tasks"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0 transition-colors shrink-0"
              onClick={handleExportToExcel}
              disabled={isExporting || !canView}
              title="Export"
            >
              <Download className={`w-3.5 h-3.5 ${isExporting ? "animate-bounce" : ""}`} />
            </Button>

            {!meetingId && (
              <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
            )}

            {!meetingId && (
              <div className="flex gap-1 bg-background border border-border rounded-sm shrink-0 items-center h-7">
                <Button
                  size="sm"
                  variant={changeView === "grid" ? "default" : "ghost"}
                  className={`h-full text-xs shadow-none ${changeView === "grid" ? "px-2.5" : "px-2"}`}
                  onClick={() => setChangeView("grid")}
                  title="Switch to Grid View"
                >
                  <LayoutGrid className={`w-3.5 h-3.5 ${changeView === "grid" ? "mr-1" : ""}`} />
                  {changeView === "grid" && "Grid"}
                </Button>

                <Button
                  size="sm"
                  variant={changeView === "table" ? "default" : "ghost"}
                  className={`h-full text-xs shadow-none ${changeView === "table" ? "px-2.5" : "px-2"}`}
                  onClick={() => setChangeView("table")}
                  title="Switch to Table View"
                >
                  <TableProperties className={`w-3.5 h-3.5 ${changeView === "table" ? "mr-1" : ""}`} />
                  {changeView === "table" && "Table"}
                </Button>

                <Button
                  size="sm"
                  variant={changeView === "kanban" ? "default" : "ghost"}
                  className={`h-full text-xs shadow-none ${changeView === "kanban" ? "px-2.5" : "px-2"}`}
                  onClick={() => setChangeView("kanban")}
                  title="Switch to Kanban View"
                >
                  <Columns3 className={`w-3.5 h-3.5 ${changeView === "kanban" ? "mr-1" : ""}`} />
                  {changeView === "kanban" && "Kanban"}
                </Button>

                <Button
                  size="sm"
                  variant={changeView === "calendar" ? "default" : "ghost"}
                  className={`h-full text-xs shadow-none ${changeView === "calendar" ? "px-2.5" : "px-2"}`}
                  onClick={() => setChangeView("calendar")}
                  title="Switch to Calendar View"
                >
                  <CalendarDays className={`w-3.5 h-3.5 ${changeView === "calendar" ? "mr-1" : ""}`} />
                  {changeView === "calendar" && "Calendar"}
                </Button>
              </div>
            )}

            <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Project Space Selector */}
            <Select
              value={
                selectedSpaceId
                  ? String(selectedSpaceId)
                  : taskSpaces[0]
                    ? String(taskSpaces[0].id)
                    : undefined
              }
              onValueChange={(v) => {
                setSelectedSpaceId(Number(v));
                setCurrentPage(1);
                setParentTaskStack([]);
                // Clear all filters when user switches Project space
                setNameFilter("");
                setCodeFilter("");
                setDescriptionFilter("");
                setStatusFilter([]);
                setSeverityFilter([]);
                setAssigneeFilter([]);
                setCoAssigneeFilter([]);
                setDateRange(undefined);
                setSpecialFilter(null);
                setSortOption("updatedAt-desc");
                setIsSortExplicit(false);
                try {
                  sessionStorage.removeItem(TASK_FILTERS_SESSION_KEY);
                } catch {
                  /* ignore */
                }
              }}
            >
              <SelectTrigger
                className={`h-7 text-xs px-2.5 w-44 shrink-0 font-medium rounded-sm border border-border shadow-none bg-background hover:bg-accent hover:text-accent-foreground transition-colors ${selectedSpaceId ? "" : ""} [&>svg]:opacity-100 [&>svg]:!w-3.5 [&>svg]:!h-3.5 [&>svg]:text-current`}
              >
                <SelectValue placeholder="Select space" />
              </SelectTrigger>
              <SelectContent>
                {taskSpaces.map((s) => (
                  <SelectItem
                    key={s.id}
                    value={String(s.id)}
                    className="text-xs"
                  >
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Pinned Filters */}
            <div className="flex-1 flex items-center gap-1.5 min-w-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {pinnedFilters.length > 0 && (
                <>
                  <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1 shrink-0" />
                  {pinnedFilters.map((filterType) => (
                    <div key={filterType} className="shrink-0">{renderPinnedFilter(filterType)}</div>
                  ))}
                </>
              )}
            </div>

            <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1 shrink-0" />

            {/* Sort Dropdown — controlled: closes on selection and on mouse leave */}
            <DropdownMenu
              open={sortDropdownOpen}
              onOpenChange={setSortDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  title="Sort"
                  className={`h-7 w-7 p-0 shrink-0 transition-colors ${sortOption !== "createdAt-desc" || defaultSortOption !== "createdAt-desc" ? "border-primary hover:bg-primary/5 dark:hover:bg-primary/10" : ""}`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[280px]"
                onMouseLeave={() => setSortDropdownOpen(false)}
              >
                <DropdownMenuLabel className="text-xs font-semibold">
                  Sort By
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2 space-y-1">
                  {(
                    [
                      { field: "updatedAt", label: "Updated At", defaultDir: "desc" as const },
                      { field: "createdAt", label: "Created At", defaultDir: "desc" as const },
                      { field: "code", label: "Code", defaultDir: "asc" as const },
                      { field: "name", label: "Name", defaultDir: "asc" as const },
                      { field: "dueDate", label: "End Date", defaultDir: "asc" as const },
                      { field: "statusId", label: "Status", defaultDir: "asc" as const },
                    ] as const
                  ).map(({ field, label, defaultDir }) => {
                    const ascValue = `${field}-asc` as SortOption;
                    const descValue = `${field}-desc` as SortOption;
                    const isActive = sortOption === ascValue || sortOption === descValue;
                    const currentDir: "asc" | "desc" = sortOption === ascValue ? "asc" : sortOption === descValue ? "desc" : defaultDir;
                    const displayDir = isActive ? currentDir : defaultDir;

                    return (
                      <DropdownMenuItem
                        key={field}
                        onSelect={(e) => {
                          e.preventDefault();
                        }}
                        onClick={() => {
                          let next: SortOption;
                          if (!isActive) {
                            next = `${field}-${defaultDir}` as SortOption;
                          } else {
                            next = currentDir === "asc" ? descValue : ascValue;
                          }
                          setSortOption(next);
                          setIsSortExplicit(true);
                        }}
                        className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent cursor-pointer transition-colors ${isActive ? "bg-accent font-bold text-black dark:text-white" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          {displayDir === "asc"
                            ? <ArrowUp className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={isActive ? 3 : 2} />
                            : <ArrowDown className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={isActive ? 3 : 2} />}
                          <span className="flex-1 whitespace-nowrap truncate">
                            {label}
                            <span className={`${isActive ? "font-bold" : "font-normal"}`}>
                              {field === "updatedAt" || field === "createdAt" || field === "dueDate"
                                ? displayDir === "desc"
                                  ? " (Latest → Earliest)"
                                  : " (Earliest → Latest)"
                                : displayDir === "asc"
                                  ? " (A → Z)"
                                  : " (Z → A)"}
                            </span>
                          </span>
                          {((defaultSortOption === ascValue && displayDir === "asc") || (defaultSortOption === descValue && displayDir === "desc")) && (
                            <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-xs font-bold text-primary">
                              Default
                            </span>
                          )}
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </div>
                {sortOption !== defaultSortOption && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveDefaultSort();
                      }}
                      className="px-2 py-1.5 text-xs text-primary cursor-pointer"
                    >
                      Set current sorting as default
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filters Button + Template Dropdown */}
            <div className="inline-flex items-center shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-7 text-xs px-2 rounded-r-none ${hasActiveFilters || !!selectedSpaceId ? "" : ""}`}
                  >
                    <Filter className="w-3.5 h-3.5 mr-1.5" />
                    Filters
                    {(hasActiveFilters || !!selectedSpaceId) && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[320px]">
                  <DropdownMenuLabel className="text-xs font-semibold flex items-center justify-between">
                    <span>Filters</span>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-2 text-xs text-red-500 hover:text-red-600"
                        onClick={clearAllFilters}
                      >
                        Clear All
                      </Button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="p-2 space-y-3 max-h-[520px] overflow-y-auto">
                    {/* ── Status ─────────────────────────────────────────── */}
                    {configData.statuses?.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Status
                          </label>
                          <div className="flex items-center gap-1">
                            {statusFilter.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1 text-xs text-red-500 hover:text-red-600"
                                onClick={() => setStatusFilter([])}
                              >
                                Clear
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-5 w-5 p-0 ${isFilterPinned("status") ? "text-primary" : "text-gray-400"}`}
                              onClick={() => togglePinFilter("status")}
                              title={
                                isFilterPinned("status")
                                  ? "Unpin"
                                  : "Pin to toolbar"
                              }
                            >
                              <Pin
                                className="h-3.5 w-3.5"
                                fill={
                                  isFilterPinned("status")
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1.5 max-h-[150px] overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2">
                          {configData.statuses.map((s: any) => (
                            <label
                              key={s.id}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                className="w-3.5 h-3.5"
                                checked={statusFilter.includes(s.id?.toString())}
                                onChange={(e) =>
                                  setStatusFilter(
                                    e.target.checked
                                      ? [...statusFilter, s.id?.toString()]
                                      : statusFilter.filter(
                                        (x) => x !== s.id?.toString(),
                                      ),
                                  )
                                }
                              />
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: s.color }}
                                />
                                <span className="text-xs">{s.name}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Severity ───────────────────────────────────────── */}
                    {configData.severities?.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Severity
                          </label>
                          <div className="flex items-center gap-1">
                            {severityFilter.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1 text-xs text-red-500 hover:text-red-600"
                                onClick={() => setSeverityFilter([])}
                              >
                                Clear
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-5 w-5 p-0 ${isFilterPinned("severity") ? "text-primary" : "text-gray-400"}`}
                              onClick={() => togglePinFilter("severity")}
                              title={
                                isFilterPinned("severity")
                                  ? "Unpin"
                                  : "Pin to toolbar"
                              }
                            >
                              <Pin
                                className="h-3.5 w-3.5"
                                fill={
                                  isFilterPinned("severity")
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1.5 max-h-[150px] overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2">
                          {configData.severities.map((s: any) => (
                            <label
                              key={s.id}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                className="w-3.5 h-3.5"
                                checked={severityFilter.includes(
                                  s.id.toString(),
                                )}
                                onChange={(e) =>
                                  setSeverityFilter(
                                    e.target.checked
                                      ? [...severityFilter, s.id.toString()]
                                      : severityFilter.filter(
                                        (x) => x !== s.id.toString(),
                                      ),
                                  )
                                }
                              />
                              <div className="flex items-center gap-1.5">
                                <Flag
                                  className="w-3.5 h-3.5"
                                  style={{ color: s.color }}
                                  fill={s.color}
                                />
                                <span className="text-xs">{s.name}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Start–Due Date Range ───────────────────────────── */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Start – Due
                        </label>
                        <div className="flex items-center gap-1">
                          {dateRange?.from && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-xs text-red-500 hover:text-red-600"
                              onClick={() => {
                                setDateRange(undefined);
                                setCurrentPage(1);
                              }}
                            >
                              Clear
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-5 w-5 p-0 ${isFilterPinned("dateRange") ? "text-primary" : "text-gray-400"}`}
                            onClick={() => togglePinFilter("dateRange")}
                            title={
                              isFilterPinned("dateRange")
                                ? "Unpin"
                                : "Pin to toolbar"
                            }
                          >
                            <Pin
                              className="h-3.5 w-3.5"
                              fill={
                                isFilterPinned("dateRange")
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </Button>
                        </div>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`w-full h-8 text-xs justify-start font-normal gap-2 bg-white dark:bg-transparent ${dateRange?.from ? "border-primary bg-primary/5 dark:bg-primary/10" : "text-muted-foreground"}`}
                          >
                            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                            {dateRange?.from
                              ? dateRange.to
                                ? `${format(dateRange.from, "MMM d, yyyy")} – ${format(dateRange.to, "MMM d, yyyy")}`
                                : format(dateRange.from, "MMM d, yyyy")
                              : "Pick a date range"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0 rounded-xl overflow-hidden shadow-lg"
                          align="end"
                        >
                          <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={(r) => {
                              setDateRange(r);
                              setCurrentPage(1);
                            }}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* ── Assignee ───────────────────────────────────────── */}
                    {(effectiveConfigData.resources?.length > 0 ||
                      !selectedSpaceId) && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              Assignee
                            </label>
                            <div className="flex items-center gap-1">
                              {assigneeFilter.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-xs text-red-500 hover:text-red-600"
                                  onClick={() => setAssigneeFilter([])}
                                >
                                  Clear
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-5 w-5 p-0 ${isFilterPinned("assignee") ? "text-primary" : "text-gray-400"}`}
                                onClick={() => togglePinFilter("assignee")}
                                title={
                                  isFilterPinned("assignee")
                                    ? "Unpin"
                                    : "Pin to toolbar"
                                }
                              >
                                <Pin
                                  className="h-3.5 w-3.5"
                                  fill={
                                    isFilterPinned("assignee")
                                      ? "currentColor"
                                      : "none"
                                  }
                                />
                              </Button>
                            </div>
                          </div>
                          {!selectedSpaceId ? (
                            <p className="text-xs text-gray-400 italic">
                              Select a project space to see assignees
                            </p>
                          ) : (
                            <div className="border border-gray-300 dark:border-gray-600 rounded-md p-2 space-y-2">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                <Input
                                  placeholder="Search assignees"
                                  value={assigneeSearch}
                                  onChange={(e) =>
                                    setAssigneeSearch(e.target.value)
                                  }
                                  className="h-7 text-xs pl-7 pr-2 placeholder:text-xs"
                                />
                              </div>
                              <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                                {(effectiveConfigData.resources ?? [])
                                  .filter((r: any) => {
                                    const name =
                                      `${r.first_name} ${r.last_name}`.toLowerCase();
                                    return name.includes(
                                      assigneeSearch.toLowerCase(),
                                    );
                                  })
                                  .map((r: any) => (
                                    <label
                                      key={r.id}
                                      className="flex items-center gap-2 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        className="w-3.5 h-3.5"
                                        checked={assigneeFilter.includes(
                                          r.id.toString(),
                                        )}
                                        onChange={(e) =>
                                          setAssigneeFilter(
                                            e.target.checked
                                              ? [
                                                ...assigneeFilter,
                                                r.id.toString(),
                                              ]
                                              : assigneeFilter.filter(
                                                (x) => x !== r.id.toString(),
                                              ),
                                          )
                                        }
                                      />
                                      <ResourceAvatar r={r} size={6} />
                                      <span className="text-xs truncate">
                                        {r.first_name} {r.last_name}
                                      </span>
                                    </label>
                                  ))}
                                {(effectiveConfigData.resources ?? []).length ===
                                  0 && (
                                    <p className="text-xs text-gray-400 italic text-center py-2">
                                      No resources in this space
                                    </p>
                                  )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                    {/* ── Co-Assignee ────────────────────────────────────── */}
                    {(effectiveConfigData.resources?.length > 0 ||
                      !selectedSpaceId) && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              Co-Assignee
                            </label>
                            <div className="flex items-center gap-1">
                              {coAssigneeFilter.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-xs text-red-500 hover:text-red-600"
                                  onClick={() => setCoAssigneeFilter([])}
                                >
                                  Clear
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-5 w-5 p-0 ${isFilterPinned("coAssignee") ? "text-primary" : "text-gray-400"}`}
                                onClick={() => togglePinFilter("coAssignee")}
                                title={
                                  isFilterPinned("coAssignee")
                                    ? "Unpin"
                                    : "Pin to toolbar"
                                }
                              >
                                <Pin
                                  className="h-3.5 w-3.5"
                                  fill={
                                    isFilterPinned("coAssignee")
                                      ? "currentColor"
                                      : "none"
                                  }
                                />
                              </Button>
                            </div>
                          </div>
                          {!selectedSpaceId ? (
                            <p className="text-xs text-gray-400 italic">
                              Select a project space to see co-assignees
                            </p>
                          ) : (
                            <div className="border border-gray-300 dark:border-gray-600 rounded-md p-2 space-y-2">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                <Input
                                  placeholder="Search co-assignees..."
                                  value={coAssigneeSearch}
                                  onChange={(e) =>
                                    setCoAssigneeSearch(e.target.value)
                                  }
                                  className="h-7 text-xs pl-7 pr-2 placeholder:text-xs"
                                />
                              </div>
                              <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                                {(effectiveConfigData.resources ?? [])
                                  .filter((r: any) => {
                                    const name =
                                      `${r.first_name} ${r.last_name}`.toLowerCase();
                                    return name.includes(
                                      coAssigneeSearch.toLowerCase(),
                                    );
                                  })
                                  .map((r: any) => (
                                    <label
                                      key={r.id}
                                      className="flex items-center gap-2 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        className="w-3.5 h-3.5"
                                        checked={coAssigneeFilter.includes(
                                          r.id.toString(),
                                        )}
                                        onChange={(e) =>
                                          setCoAssigneeFilter(
                                            e.target.checked
                                              ? [
                                                ...coAssigneeFilter,
                                                r.id.toString(),
                                              ]
                                              : coAssigneeFilter.filter(
                                                (x) => x !== r.id.toString(),
                                              ),
                                          )
                                        }
                                      />
                                      <ResourceAvatar r={r} size={6} />
                                      <span className="text-xs truncate">
                                        {r.first_name} {r.last_name}
                                      </span>
                                    </label>
                                  ))}
                                {(effectiveConfigData.resources ?? []).length ===
                                  0 && (
                                    <p className="text-xs text-gray-400 italic text-center py-2">
                                      No resources in this space
                                    </p>
                                  )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                    {/* ── Created By ────────────────────────────────────── */}
                    {(effectiveConfigData.resources?.length > 0 ||
                      !selectedSpaceId) && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              Created By
                            </label>
                            <div className="flex items-center gap-1">
                              {createdByFilter.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-xs text-red-500 hover:text-red-600"
                                  onClick={() => setCreatedByFilter([])}
                                >
                                  Clear
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-5 w-5 p-0 ${isFilterPinned("createdBy") ? "text-primary" : "text-gray-400"}`}
                                onClick={() => togglePinFilter("createdBy")}
                                title={
                                  isFilterPinned("createdBy")
                                    ? "Unpin"
                                    : "Pin to toolbar"
                                }
                              >
                                <Pin
                                  className="h-3.5 w-3.5"
                                  fill={
                                    isFilterPinned("createdBy")
                                      ? "currentColor"
                                      : "none"
                                  }
                                />
                              </Button>
                            </div>
                          </div>
                          {!selectedSpaceId ? (
                            <p className="text-xs text-gray-400 italic">
                              Select a project space to see creators
                            </p>
                          ) : (
                            <div className="border border-gray-300 dark:border-gray-600 rounded-md p-2 space-y-2">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                <Input
                                  placeholder="Search creators..."
                                  value={createdBySearch}
                                  onChange={(e) =>
                                    setCreatedBySearch(e.target.value)
                                  }
                                  className="h-7 text-xs pl-7 pr-2 placeholder:text-xs"
                                />
                              </div>
                              <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                                {(effectiveConfigData.resources ?? [])
                                  .filter((r: any) => {
                                    const name =
                                      `${r.first_name} ${r.last_name}`.toLowerCase();
                                    return name.includes(
                                      createdBySearch.toLowerCase(),
                                    );
                                  })
                                  .map((r: any) => {
                                    const email = r.email || "";
                                    return (
                                      <label
                                        key={r.id}
                                        className="flex items-center gap-2 cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          className="w-3.5 h-3.5"
                                          checked={createdByFilter.includes(email)}
                                          onChange={(e) =>
                                            setCreatedByFilter(
                                              e.target.checked
                                                ? [
                                                  ...createdByFilter,
                                                  email,
                                                ]
                                                : createdByFilter.filter(
                                                  (x) => x !== email,
                                                ),
                                            )
                                          }
                                        />
                                        <ResourceAvatar r={r} size={6} />
                                        <span className="text-xs truncate">
                                          {r.first_name} {r.last_name}
                                        </span>
                                      </label>
                                    );
                                  })}
                                {(effectiveConfigData.resources ?? []).length ===
                                  0 && (
                                    <p className="text-xs text-gray-400 italic text-center py-2">
                                      No resources in this space
                                    </p>
                                  )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                    {/* ── Special Task ───────────────────────────────────── */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Special Task
                        </label>
                        <div className="flex items-center gap-1">
                          {specialFilter !== null && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-xs text-red-500 hover:text-red-600"
                              onClick={() => {
                                setSpecialFilter(null);
                                setCurrentPage(1);
                              }}
                            >
                              Clear
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-5 w-5 p-0 ${isFilterPinned("special") ? "text-primary" : "text-gray-400"}`}
                            onClick={() => togglePinFilter("special")}
                            title={
                              isFilterPinned("special")
                                ? "Unpin"
                                : "Pin to toolbar"
                            }
                          >
                            <Pin
                              className="h-3.5 w-3.5"
                              fill={
                                isFilterPinned("special")
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </Button>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSpecialFilter(
                            specialFilter === true ? null : true,
                          );
                          setCurrentPage(1);
                        }}
                        className={`w-full flex items-center gap-2 text-xs px-2 py-2 rounded-md border transition-colors ${specialFilter === true
                          ? "border-primary hover:bg-primary/5 dark:hover:bg-primary/10 font-medium"
                          : "border-gray-300 dark:border-gray-600 hover:bg-accent"
                          }`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${specialFilter === true ? "text-primary fill-primary" : "text-gray-400"}`}
                        />
                        <span>Show Special Tasks Only</span>
                        {/*<span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${specialFilter === true ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>*/}
                        {/*  {specialFilter === true ? 'ON' : 'OFF'}*/}
                        {/*</span>*/}
                      </button>
                    </div>

                    {/* ── Code ───────────────────────────────────────────── */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Code
                        </label>
                        <div className="flex items-center gap-1">
                          {codeFilter && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-xs text-red-500 hover:text-red-600"
                              onClick={() => setCodeFilter("")}
                            >
                              Clear
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-5 w-5 p-0 ${isFilterPinned("code") ? "text-primary" : "text-gray-400"}`}
                            onClick={() => togglePinFilter("code")}
                            title={
                              isFilterPinned("code")
                                ? "Unpin"
                                : "Pin to toolbar"
                            }
                          >
                            <Pin
                              className="h-3.5 w-3.5"
                              fill={
                                isFilterPinned("code") ? "currentColor" : "none"
                              }
                            />
                          </Button>
                        </div>
                      </div>
                      <div className="relative">
                        <Input
                          placeholder="Search by code..."
                          value={codeFilter}
                          onChange={(e) => {
                            setCodeFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="h-7 text-xs pl-2 pr-2 border-gray-300 dark:border-gray-600 placeholder:text-xs"
                        />
                      </div>
                    </div>

                    {/* ── Name ───────────────────────────────────────────── */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Name
                        </label>
                        <div className="flex items-center gap-1">
                          {nameFilter && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-xs text-red-500 hover:text-red-600"
                              onClick={() => setNameFilter("")}
                            >
                              Clear
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-5 w-5 p-0 ${isFilterPinned("name") ? "text-primary" : "text-gray-400"}`}
                            onClick={() => togglePinFilter("name")}
                            title={
                              isFilterPinned("name")
                                ? "Unpin"
                                : "Pin to toolbar"
                            }
                          >
                            <Pin
                              className="h-3.5 w-3.5"
                              fill={
                                isFilterPinned("name") ? "currentColor" : "none"
                              }
                            />
                          </Button>
                        </div>
                      </div>
                      <div className="relative">
                        <Input
                          placeholder="Search by name..."
                          value={nameFilter}
                          onChange={(e) => {
                            setNameFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="h-7 text-xs pl-2 pr-2 border-gray-300 dark:border-gray-600 placeholder:text-xs"
                        />
                      </div>
                    </div>

                    {/* ── Description ────────────────────────────────────── */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Description
                        </label>
                        <div className="flex items-center gap-1">
                          {descriptionFilter && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-xs text-red-500 hover:text-red-600"
                              onClick={() => setDescriptionFilter("")}
                            >
                              Clear
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-5 w-5 p-0 ${isFilterPinned("description") ? "text-primary" : "text-gray-400"}`}
                            onClick={() => togglePinFilter("description")}
                            title={
                              isFilterPinned("description")
                                ? "Unpin"
                                : "Pin to toolbar"
                            }
                          >
                            <Pin
                              className="h-3.5 w-3.5"
                              fill={
                                isFilterPinned("description")
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </Button>
                        </div>
                      </div>
                      <div className="relative">
                        <Input
                          placeholder="Search by description..."
                          value={descriptionFilter}
                          onChange={(e) => {
                            setDescriptionFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="h-7 text-xs pl-2 pr-2 border-gray-300 dark:border-gray-600 placeholder:text-xs"
                        />
                      </div>
                    </div>

                    {/* ── Space (read-only) ───────────────────────────────── */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Space
                        </label>
                      </div>
                      <Select
                        value={
                          selectedSpaceId ? String(selectedSpaceId) : undefined
                        }
                        disabled
                      >
                        <SelectTrigger className="h-7 text-xs border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-60">
                          <SelectValue placeholder="Space" />
                        </SelectTrigger>
                        <SelectContent>
                          {taskSpaces.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Filter Templates Dropdown */}
              <FilterTemplateButton
                categorizedTemplates={categorizedTaskTemplates}
                activeTemplateId={activeTemplateId}
                isFilterActive={hasActiveFilters || !!selectedSpaceId}
                isSaving={isSavingTemplate}
                onSave={saveCurrentAsTaskTemplate}
                onApply={applyTaskFilterTemplate}
                onDelete={deleteTaskFilterTemplate}
                onRefresh={fetchTaskFilterTemplates}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className={`flex-1 ${changeView === "kanban" || changeView === "calendar" || changeView === "table" ? "overflow-hidden" : "overflow-y-auto"} bg-background`}
      >
        {/* Calendar view manages its own data fetching and loading states.
             It needs the WHOLE space (every hierarchy level, unpaginated) to
             build its tree and its Unscheduled panel, so it can't read the
             paginated `data` the other views share. Instead it is mounted on
             first visit and then kept mounted-but-hidden — exactly like Grid /
             Table / Kanban below — so returning to it costs no request and
             shows no loading state. */}
        {hasVisitedCalendar ? (
          <div
            className={
              changeView === "calendar"
                ? "px-3 pb-3 pt-1 h-full flex flex-col"
                : "hidden"
            }
          >
            <TaskCalendarView
              key={selectedSpaceId}
              taskSpaceId={selectedSpaceId}
              isActive={changeView === "calendar"}
              configData={effectiveConfigData}
              canCreate={!!canCreate}
              canEdit={!!canEdit}
              filters={{
                name: debouncedNameFilter || undefined,
                code: debouncedCodeFilter || undefined,
                description: debouncedDescriptionFilter || undefined,
                statusIds: statusFilter.length > 0 ? statusFilter : undefined,
                severityIds:
                  severityFilter.length > 0 ? severityFilter : undefined,
                assigneeIds:
                  assigneeFilter.length > 0 ? assigneeFilter : undefined,
                coAssigneeIds:
                  coAssigneeFilter.length > 0 ? coAssigneeFilter : undefined,
                special: specialFilter,
              }}
              onTaskClick={(id) =>
                router.push(`/task-management/task/form?id=${id}`)
              }
              onCreateTask={(startDate) => {
                if (!selectedSpaceId) {
                  toast.error("Please select a project space first");
                  return;
                }
                const params = new URLSearchParams();
                if (startDate) params.append("startDate", startDate);
                router.push(
                  `/task-management/task/form?taskSpaceId=${selectedSpaceId}&${params.toString()}`,
                );
              }}
              triggerCalendarCreate={triggerCalendarCreate}
              tasks={data}
              onRefresh={() => setRefreshTrigger((v) => v + 1)}
            />
          </div>
        ) : null}

        <div
          className={`${changeView === "calendar" ? "hidden" : ""} ${changeView === "kanban" ? "px-2 pt-2 h-full" : changeView === "table" ? "py-2 px-2.5 h-full flex flex-col" : "py-2 px-2.5"}`}
        >
          {/* Skeleton — only on the very first load (no data yet).
               On subsequent refreshes (hasDataFetched=true) keep the view
               mounted so TaskTableView's expand state is preserved and we
               avoid the cascade of per-expanded-row child-task fetches. */}
          {!hasDataFetched ? (
            changeView === "kanban" ? (
              <TaskKanbanSkeleton
                columns={configData.statuses.length || 4}
                cardsPerColumn={3}
              />
            ) : changeView === "table" ? (
              <TaskTableSkeleton rows={12} />
            ) : (
              <TaskGridSkeleton count={12} />
            )
          ) : data.length === 0 &&
            !showInlineCreate &&
            !isLoading &&
            changeView !== "kanban" ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardXIcon className="h-16 w-16 mb-4 text-gray-400 dark:text-gray-600" />
              <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">
                No Tasks Found
              </h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters
                  ? "No tasks match your filter criteria"
                  : parentTaskStack.length > 0
                    ? `No ${nextLevelName ? nextLevelName.toLowerCase() + "s" : "child tasks"} found for this task`
                    : `Get started by creating your first ${nextLevelName ? nextLevelName.toLowerCase() : "task"}`}
              </p>
              {canCreate &&
                !hasActiveFilters &&
                (configData.hierarchyLevels?.length ?? 0) === 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" /> Add{" "}
                        {nextLevelName || "Task"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3" align="center">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                          <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-400" />
                        </div>
                        <div className="space-y-1.5 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                            No Levels Configured
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            This project space has no hierarchy levels set up.
                            Configure task levels in the space settings first.
                          </p>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
            </div>
          ) : changeView === "kanban" ? (
            !selectedSpaceId ? (
              <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400 text-sm">
                Please select a project space to view the Kanban board
              </div>
            ) : (
              <TaskKanbanView
                tasks={data}
                configData={effectiveConfigData}
                isRelationsLoading={isRelationsLoading}
                onTaskClick={(t) =>
                  router.push(`/task-management/task/${t.id}`)
                }
                onEdit={
                  canEdit
                    ? (t) =>
                      router.push(`/task-management/task/form?id=${t.id}`)
                    : undefined
                }
                onDelete={
                  canDelete ? (t) => setDeleteConfirmId(t.id) : undefined
                }
                onUpdateTask={canEdit ? handleUpdateTask : undefined}
                onShowChildTasks={handleShowChildTasks}
                inlineCreateCard={
                  showInlineCreate && selectedSpaceId ? (
                    <InlineTaskCreateCard
                      taskSpaceId={selectedSpaceId}
                      configData={effectiveConfigData}
                      hierarchyLevelSequence={getCreateHierarchySequence() ?? 0}
                      parentTaskId={
                        parentTaskStack.length > 0
                          ? parentTaskStack[parentTaskStack.length - 1].id
                          : undefined
                      }
                      parentTask={
                        parentTaskStack.length > 0
                          ? parentTaskStack[parentTaskStack.length - 1]
                          : undefined
                      }
                      onSave={handleCreateTask}
                      onCancel={() => setShowInlineCreate(false)}
                    />
                  ) : undefined
                }
              />
            )
          ) : changeView === "table" ? (
            // Table view — filtersActive hides the inline expand chevron
            <TaskTableView
              onHandleReady={(h) => {
                tableViewHandleRef.current = h;
              }}
              tasks={data}
              configData={effectiveConfigData}
              meetingId={meetingId ?? undefined}
              activityId={activityId ?? undefined}
              isRelationsLoading={isRelationsLoading}
              onRowClick={(t) => router.push(`/task-management/task/${t.id}`)}
              onEdit={
                canEdit
                  ? (t) => router.push(`/task-management/task/form?id=${t.id}`)
                  : undefined
              }
              onDelete={canDelete ? (t) => setDeleteConfirmId(t.id) : undefined}
              onUpdateTask={canEdit ? handleUpdateTask : undefined}
              onShowChildTasks={handleShowChildTasks}
              filtersActive={hasActiveFilters}
              expandStorageKey={
                selectedSpaceId ? `tmTaskExpand-${selectedSpaceId}` : undefined
              }
              skipExpandRestore={isTableViewSwitch}
              sortOption={sortOption}
              topInlineCreatorRow={
                showInlineCreate && selectedSpaceId && configData
                  ? (() => {
                    const seq = getCreateHierarchySequence();
                    const hlForCreate =
                      (seq !== undefined
                        ? configData.hierarchyLevels?.find(
                          (l: any) => l.sequence === seq,
                        )
                        : undefined) ?? configData.hierarchyLevels?.[0];
                    return (
                      <InlineTaskCreatorRow
                        siblingTask={{
                          taskSpaceId: selectedSpaceId,
                          hierarchyLevelConfigId: hlForCreate?.id,
                          hierarchyLevelSequence: hlForCreate?.sequence,
                          hierarchyLevelName: hlForCreate?.name,
                          hierarchyLevelIcon: hlForCreate?.icon,
                          hierarchyLevelColor: hlForCreate?.color,
                          parentTaskId:
                            parentTaskStack.length > 0
                              ? parentTaskStack[parentTaskStack.length - 1].id
                              : null,
                          parentTask:
                            parentTaskStack.length > 0
                              ? parentTaskStack[parentTaskStack.length - 1]
                              : null,
                        }}
                        configData={effectiveConfigData}
                        depth={0}
                        filtersActive={hasActiveFilters}
                        onSave={handleCreateTask}
                        onCancel={() => setShowInlineCreate(false)}
                      />
                    );
                  })()
                  : undefined
              }
            />
          ) : (
            <TaskGridView
              tasks={data}
              configData={effectiveConfigData}
              isRelationsLoading={isRelationsLoading}
              onTaskClick={(t) => router.push(`/task-management/task/${t.id}`)}
              onEdit={
                canEdit
                  ? (t) => router.push(`/task-management/task/form?id=${t.id}`)
                  : undefined
              }
              onDelete={canDelete ? (t) => setDeleteConfirmId(t.id) : undefined}
              onUpdateTask={canEdit ? handleUpdateTask : undefined}
              onShowChildTasks={handleShowChildTasks}
              inlineCreateCard={
                showInlineCreate && selectedSpaceId ? (
                  <InlineTaskCreateCard
                    taskSpaceId={selectedSpaceId}
                    configData={effectiveConfigData}
                    hierarchyLevelSequence={getCreateHierarchySequence() ?? 0}
                    parentTaskId={
                      parentTaskStack.length > 0
                        ? parentTaskStack[parentTaskStack.length - 1].id
                        : undefined
                    }
                    parentTask={
                      parentTaskStack.length > 0
                        ? parentTaskStack[parentTaskStack.length - 1]
                        : undefined
                    }
                    onSave={handleCreateTask}
                    onCancel={() => setShowInlineCreate(false)}
                  />
                ) : undefined
              }
            />
          )}
        </div>
      </div>

      {/* Pagination */}
      {data.length > 0 && changeView !== "calendar" && (
        <div className="flex-none border-t bg-background">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-1.5">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} –
              {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
              {totalRecords} tasks
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    const newSize = parseInt(value);
                    setItemsPerPage(newSize);
                    setCurrentPage(1);
                    // Persist page size to user config (viewPreference)
                    if (user?.id) {
                      const savedPrefs = localStorage.getItem("user_view_preferences");
                      const prefs = savedPrefs ? JSON.parse(savedPrefs) : {};
                      prefs.taskPageSize = newSize;
                      localStorage.setItem("user_view_preferences", JSON.stringify(prefs));
                      createOrUpdateUserConfig(user.id, { viewPreference: prefs }).catch(() => { });
                    }
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
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                >
                  «
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  ‹
                </Button>
                <span className="text-xs px-2 text-gray-600 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  ›
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                >
                  »
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(o) => {
          if (!o) setDeleteConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Page;
