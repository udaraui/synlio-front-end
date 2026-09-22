"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import { useViewPreference } from "@/hooks/use-view-preference";
import { toast } from "@/lib/toast";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { useAuth } from "@/contexts/auth.context";
import {
  LayoutGrid,
  Plus,
  RefreshCw,
  TableProperties,
  Columns3,
  ClipboardXIcon,
  Bug,
  FileText,
  Zap,
  AlertTriangle,
  CheckCircle,
  Circle,
  Settings,
  HelpCircle,
  ListTodo,
  type LucideIcon,
  Filter,
  Search,
  X,
  Pin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Flag,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import NextImage from "next/image";
import {
  searchTickets,
  searchTicketsByQueue,
  deleteTicket,
  getBulkTicketRelations,
} from "@/services/ticket-management/ticket.service";
import { exportTicketsToExcel } from "@/services/ticket-management/ticket-export.service";
import {
  searchTicketSpaces,
  getTicketSpaceStatusConfig,
  getTicketSpaceSeverityConfig,
  getTicketSpaceTypesConfig,
  getTicketSpaceQueueConfig,
  getTicketSpaceMembersConfig,
  getTicketSpaceSlaConfig,
  getTicketSpaceImpactConfig,
} from "@/services/ticket-management/ticket-space.service";
import {
  createOrUpdateUserConfig,
  getUserConfig,
} from "@/services/user-config-service";
import { FilterTemplateButton } from "@/components/common/FilterTemplateButton";
import CalendarRange from "@/components/common/CalendarRange";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import TicketGridView from "./components/TicketGridView";
import TicketTableView from "./components/TicketTableView";
import TicketKanbanView from "./components/TicketKanbanView";
import {
  TicketGridSkeleton,
  TicketTableSkeleton,
  TicketKanbanSkeleton,
} from "./components/TicketSkeletons";

const TICKET_FILTERS_SESSION_KEY = "ticketPageFilters";

// Icon mapping helper for ticket types
const getIconComponent = (iconName: string | undefined): LucideIcon | null => {
  if (!iconName) return null;

  const iconMap: Record<string, LucideIcon> = {
    bug: Bug,
    filetext: FileText,
    "file-text": FileText,
    task: FileText,
    zap: Zap,
    improvement: Zap,
    alerttriangle: AlertTriangle,
    "alert-triangle": AlertTriangle,
    warning: AlertTriangle,
    checkcircle: CheckCircle,
    "check-circle": CheckCircle,
    done: CheckCircle,
    circle: Circle,
    settings: Settings,
    config: Settings,
    helpcircle: HelpCircle,
    "help-circle": HelpCircle,
    question: HelpCircle,
    listtodo: ListTodo,
    "list-todo": ListTodo,
    todo: ListTodo,
  };

  const normalizedIcon = iconName.toLowerCase().replace(/[^a-z]/g, "");
  return iconMap[normalizedIcon] || iconMap[iconName.toLowerCase()] || Circle;
};

// Reusable member avatar (profile pic or initials fallback)
function MemberAvatar({ m, size = 5 }: { m: any; size?: number }) {
  const sizeClass = `w-${size} h-${size}`;
  const textClass = size <= 5 ? "text-[9px]" : "text-xs";
  if (m?.userProfilePicture && m.userProfilePicture !== 'null' && m.userProfilePicture.trim() !== '') {
    return (
      <NextImage
        src={m.userProfilePicture}
        alt={`${m.userFirstName} ${m.userLastName}`}
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
        {m?.userFirstName?.[0]}
        {m?.userLastName?.[0]}
      </span>
    </div>
  );
}

// ── Module-level helpers ─────────────────────────────────────────────────────
// Converts TicketPermission entity format → User display format.
// Stable reference (no component deps) so safe to call inside useCallback.
function transformToUserFormat(data: any): any {
  if (!data) return data;
  // TicketPermission entities have `userFirstName`; User objects have `first_name`
  if (data.userFirstName !== undefined) {
    return {
      id: data.userId,
      first_name: data.userFirstName,
      last_name: data.userLastName,
      email: data.userEmail,
      profile_picture: data.userProfilePicture,
    };
  }
  return data; // already User format
}

// Normalises a raw ticket from the search API so both assignee and participants
// are always in User format, regardless of which search endpoint was used.
function normalizeTicket(ticket: any): any {
  return {
    ...ticket,
    assignee: transformToUserFormat(ticket.assignee),
    participants: (ticket.participants || []).map(transformToUserFormat),
  };
}

// Enriches a raw ticket using the space configuration data, replacing expensive backend LEFT JOINs.
function enrichTickets(tickets: any[], currentConfig: any): any[] {
  if (!currentConfig) return tickets;
  return tickets.map((t) => {
    const enriched = { ...t };
    if (!enriched.status && enriched.statusId) {
      enriched.status = currentConfig.statuses?.find((s: any) => s.id === enriched.statusId);
    }
    if (!enriched.severity && enriched.severityId) {
      enriched.severity = currentConfig.severities?.find((s: any) => s.id === enriched.severityId);
    }
    if (!enriched.ticketType && enriched.ticketTypeId) {
      enriched.ticketType = currentConfig.types?.find((s: any) => s.id === enriched.ticketTypeId);
    }
    if (!enriched.queue && enriched.queueId) {
      enriched.queue = currentConfig.queues?.find((s: any) => s.id === enriched.queueId);
    }
    if (!enriched.assignee && enriched.assigneeId) {
      const mem = currentConfig.members?.find((m: any) => m.id === enriched.assigneeId);
      if (mem) enriched.assignee = transformToUserFormat(mem);
    }
    return enriched;
  });
}

function TicketPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketSpaceId = searchParams?.get("ticketSpaceId");
  const { setBreadcrumbs } = useBreadcrumb();

  // Refs for tracking
  const ticketSpacesLoadedRef = useRef(false);
  const loadedConfigSpaceRef = useRef<number | null>(null);
  const isLoadingConfigRef = useRef(false);
  const configTicketFetchedRef = useRef(false);

  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [ticketSpacesLoaded, setTicketSpacesLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const canView = usePrivilegeGuard("101") as boolean;
  const canCreate = usePrivilegeGuard("103") as boolean;
  const canViewAllTicketSpaces = usePrivilegeGuard("105") as boolean;
  // Export Excel privilege — id: 113 (export:excel-tickets)
  const canExportTickets = usePrivilegeGuard("113") as boolean;
  const [isLoading, setIsLoading] = useState(false);
  const [isRelationsLoading, setIsRelationsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasDataFetched, setHasDataFetched] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [changeView, setChangeView] = useViewPreference(
    "ticket",
    ["card", "table", "kanban", "group"],
    "card",
    user?.id,
  );
  const [data, setData] = useState<any[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<any>(null);

  // Shared config for both Kanban and Filters
  const [config, setConfig] = useState<any>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  // Always-current ref so fetchData (useCallback) can read config without stale closure
  const configRef = useRef<any>(null);
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  // Bumped each time config successfully loads – used as a fetchData dep so the
  // search re-runs automatically once the space configuration is available.
  const [configVersion, setConfigVersion] = useState(0);

  // Hydrate tickets automatically once config is loaded (frontend join optimization)
  useEffect(() => {
    if (configRef.current && data.length > 0) {
      if (!data[0].status && data[0].statusId) {
        setData((prev) => enrichTickets(prev, configRef.current));
      }
    }
  }, [configVersion]);

  // Deduplication: prevent duplicate in-flight requests (e.g. React Strict Mode double-invoke)
  const isFetchingRef = useRef(false);
  const lastKeyRef = useRef("");

  // Filter states
  const [selectedTicketSpaceFilter, setSelectedTicketSpaceFilter] =
    useState<string>(ticketSpaceId || "");
  const [nameFilter, setNameFilter] = useState<string>("");
  const [descriptionFilter, setDescriptionFilter] = useState<string>("");
  const [codeFilter, setCodeFilter] = useState<string>("");

  // Debounced filters
  const [debouncedNameFilter, setDebouncedNameFilter] = useState<string>("");
  const [debouncedDescriptionFilter, setDebouncedDescriptionFilter] =
    useState<string>("");
  const [debouncedCodeFilter, setDebouncedCodeFilter] = useState<string>("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedNameFilter(nameFilter), 500);
    return () => clearTimeout(timer);
  }, [nameFilter]);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedDescriptionFilter(descriptionFilter),
      500,
    );
    return () => clearTimeout(timer);
  }, [descriptionFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCodeFilter(codeFilter), 500);
    return () => clearTimeout(timer);
  }, [codeFilter]);

  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string[]>([]);
  const [ticketTypeFilter, setTicketTypeFilter] = useState<string[]>([]);
  const [queueFilter, setQueueFilter] = useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [participantFilter, setParticipantFilter] = useState<string[]>([]);
  const [slaResponseDeadlineRange, setSlaResponseDeadlineRange] = useState<{
    start?: string | null;
    end?: string | null;
  }>({ start: null, end: null });
  const [slaResolutionDeadlineRange, setSlaResolutionDeadlineRange] = useState<{
    start?: string | null;
    end?: string | null;
  }>({ start: null, end: null });
  const [createdDateRange, setCreatedDateRange] = useState<{
    start?: string | null;
    end?: string | null;
  }>({ start: null, end: null });

  // Sort options
  type SortOption =
    | "createdAt-desc"
    | "createdAt-asc"
    | "updatedAt-desc"
    | "updatedAt-asc"
    | "code-asc"
    | "code-desc"
    | "name-asc"
    | "name-desc"
    | "statusId-asc"
    | "statusId-desc"
    | "slaResponseDeadline-asc"
    | "slaResponseDeadline-desc"
    | "slaResolutionDeadline-asc"
    | "slaResolutionDeadline-desc";
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedPrefs = localStorage.getItem("user_view_preferences");
        if (savedPrefs) {
          const prefs = JSON.parse(savedPrefs);
          if (prefs.ticketDefaultSort) {
            return prefs.ticketDefaultSort as SortOption;
          }
        }
      } catch (e) {
        console.error("Error reading ticketDefaultSort from localStorage:", e);
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
          if (prefs.ticketDefaultSort) {
            return prefs.ticketDefaultSort as SortOption;
          }
        }
      } catch (e) {
        console.error("Error reading ticketDefaultSort from localStorage:", e);
      }
    }
    return "createdAt-desc";
  });

  // Config is lazy-loaded only when needed (e.g., Kanban view, inline dropdowns)
  const [ticketSpaces, setTicketSpaces] = useState<any[]>([]);
  const [spaceMembers, setSpaceMembers] = useState<any[]>([]);

  // Search queries for dropdowns
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState<string>("");
  const [participantSearchQuery, setParticipantSearchQuery] =
    useState<string>("");
  const [createdByFilter, setCreatedByFilter] = useState<string[]>([]);
  const [createdBySearchQuery, setCreatedBySearchQuery] = useState<string>("");

  /**
   * Safely transforms a date filter string or instance into a UTC ISO string
   * capturing the absolute local start or end boundary of that specific day.
   */
  const safeParseLocalBoundaryISO = (
    dateStr: string | null | undefined,
    boundary: "start" | "end",
  ): string | null => {
    if (!dateStr) return null;

    let year: number, month: number, day: number;

    // If it's a standard YYYY-MM-DD format string
    if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const parts = dateStr.split("T")[0].split("-");
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
      day = parseInt(parts[2], 10);
    } else {
      // Fallback parser for full dates/objects
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      year = d.getFullYear();
      month = d.getMonth();
      day = d.getDate();
    }

    if (boundary === "start") {
      // Set to local 12:00:00 AM
      return new Date(year, month, day, 0, 0, 0, 0).toISOString();
    } else {
      // Set to local 11:59:59.999 PM
      return new Date(year, month, day, 23, 59, 59, 999).toISOString();
    }
  };

  // Pinned filters
  type FilterType =
    | "ticketSpace"
    | "status"
    | "severity"
    | "ticketType"
    | "queue"
    | "assignee"
    | "participant"
    | "code"
    | "name"
    | "description"
    | "slaResponseDeadline"
    | "slaResolutionDeadline"
    | "createdDateRange"
    | "createdBy";
  const [pinnedFilters, setPinnedFilters] = useState<FilterType[]>(() => {
    const saved = localStorage.getItem("pinnedTicketFilters");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        return parsed.map((f) =>
          f === "slaDeadline" ? "slaResponseDeadline" : f,
        ) as FilterType[];
      } catch {
        return ["status"];
      }
    }
    return ["status"]; // Default: only Status pinned
  });

  useEffect(() => {
    localStorage.setItem("pinnedTicketFilters", JSON.stringify(pinnedFilters));
  }, [pinnedFilters]);

  // Filter template state
  const [ticketFilterTemplates, setTicketFilterTemplates] = useState<any[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // ── Helper to clear all filter states ───────────────────────────────────────
  const clearAllFilterStates = () => {
    setNameFilter("");
    setDescriptionFilter("");
    setCodeFilter("");
    setStatusFilter([]);
    setSeverityFilter([]);
    setTicketTypeFilter([]);
    setQueueFilter([]);
    setAssigneeFilter([]);
    setParticipantFilter([]);
    setCreatedByFilter([]);
    setSlaResponseDeadlineRange({ start: null, end: null });
    setSlaResolutionDeadlineRange({ start: null, end: null });
    setCreatedDateRange({ start: null, end: null });
    setSortOption(defaultSortOption);
    setCurrentPage(1);
    setActiveTemplateId(null);
  };

  // Clear all filters
  const clearAllFilters = () => {
    sessionStorage.removeItem(TICKET_FILTERS_SESSION_KEY);
    setSelectedTicketSpaceFilter(ticketSpaceId || "");
    clearAllFilterStates();
  };

  // Toggle pin/unpin filter
  const togglePinFilter = (filterType: FilterType) => {
    setPinnedFilters((prev) => {
      if (prev.includes(filterType)) {
        return prev.filter((f) => f !== filterType);
      } else {
        if (prev.length >= 5) {
          toast.warning("You can only pin up to 5 filters. Unpin one first");
          return prev;
        }
        return [...prev, filterType];
      }
    });
  };

  // Check if a filter is pinned
  const isFilterPinned = (filterType: FilterType): boolean => {
    return pinnedFilters.includes(filterType);
  };

  // Filtered data - assignee/participant filtering is now server-side
  const filteredData = data;

  // ── One-shot: load ticket spaces + filter templates ──────────────────────────
  useEffect(() => {
    if (ticketSpacesLoadedRef.current) return;
    ticketSpacesLoadedRef.current = true;

    const load = async () => {
      try {
        const activeCompany = JSON.parse(
          localStorage.getItem("active_company") || "null",
        );
        const filters: any[] = activeCompany?.id
          ? [
            {
              field: "companyId",
              value: activeCompany.id,
              matchMode: "equals",
            },
          ]
          : [];
        if (!canViewAllTicketSpaces && user?.id) {
          filters.push({
            field: "userId",
            value: user.id,
            matchMode: "member",
          });
        }
        const response = await searchTicketSpaces({
          first: 0,
          rows: 100,
          filters,
        });
        setTicketSpaces(response.data || []);
        setTicketSpacesLoaded(true);
      } catch (error) {
        console.error("Error loading ticket spaces:", error);
      }

      if (user?.id) {
        try {
          const userConfig = await getUserConfig(user.id);
          const activeCompany = (() => {
            try { return JSON.parse(localStorage.getItem("active_company") || "null"); } catch { return null; }
          })();
          const activeCompanyId: number | undefined = activeCompany?.companyId;
          if (userConfig?.filterTemplates?.ticket) {
            const all = userConfig.filterTemplates.ticket;
            // Strictly show only templates for the active company.
            const filtered = activeCompanyId
              ? all.filter((t: any) => t.companyId === activeCompanyId)
              : all;
            setTicketFilterTemplates(filtered);
          }
          if (userConfig?.viewPreference?.ticketDefaultSort) {
            const fetchedDefault = userConfig.viewPreference.ticketDefaultSort as SortOption;
            setDefaultSortOption(fetchedDefault);

            // Apply the fetched default sort option only if no session filters are present
            const savedSession = sessionStorage.getItem(TICKET_FILTERS_SESSION_KEY);
            if (!savedSession) {
              setSortOption(fetchedDefault);
            }
          }
          // Restore saved page size
          if (userConfig?.viewPreference?.ticketPageSize) {
            const saved = Number(userConfig.viewPreference.ticketPageSize);
            if ([10, 20, 50, 100].includes(saved)) {
              setItemsPerPage(saved);
            }
          }
        } catch (error) {
          console.error("Error loading user configs on mount:", error);
        }
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Restore filters from session / URL — reactive to every navigation ────────
  useEffect(() => {
    const urlSpaceId = searchParams?.get("ticketSpaceId");
    const fromSpace = searchParams?.get("fromSpace") === "1";

    // Block fetchData until restoration is complete
    setIsInitialized(false);

    const restoreFiltersFromSession = (f: any) => {
      if (f.nameFilter !== undefined) setNameFilter(f.nameFilter);
      if (f.descriptionFilter !== undefined)
        setDescriptionFilter(f.descriptionFilter);
      if (f.codeFilter !== undefined) setCodeFilter(f.codeFilter);
      if (f.statusFilter) setStatusFilter(f.statusFilter);
      if (f.severityFilter) setSeverityFilter(f.severityFilter);
      if (f.ticketTypeFilter) setTicketTypeFilter(f.ticketTypeFilter);
      if (f.queueFilter) setQueueFilter(f.queueFilter);
      if (f.assigneeFilter) setAssigneeFilter(f.assigneeFilter);
      if (f.participantFilter) setParticipantFilter(f.participantFilter);
      if (f.createdByFilter) setCreatedByFilter(f.createdByFilter);
      if (f.slaResponseDeadlineRange)
        setSlaResponseDeadlineRange(f.slaResponseDeadlineRange);
      if (f.slaDeadlineRange) setSlaResponseDeadlineRange(f.slaDeadlineRange); // legacy session compatibility
      if (f.slaResolutionDeadlineRange)
        setSlaResolutionDeadlineRange(f.slaResolutionDeadlineRange);
      if (f.createdDateRange) setCreatedDateRange(f.createdDateRange);
      if (f.sortOption) setSortOption(f.sortOption);
      if (f.currentPage) setCurrentPage(f.currentPage);
      if (f.templateId) setActiveTemplateId(f.templateId);
    };

    if (fromSpace) {
      // User entered from ticket space listing — start fresh
      setSelectedTicketSpaceFilter(urlSpaceId || "");
      clearAllFilterStates();
      try {
        sessionStorage.removeItem(TICKET_FILTERS_SESSION_KEY);
      } catch {
        /* ignore */
      }
    } else if (urlSpaceId) {
      // Returning from form or direct link — restore filters if same space
      setSelectedTicketSpaceFilter(urlSpaceId);
      try {
        const saved = sessionStorage.getItem(TICKET_FILTERS_SESSION_KEY);
        if (saved) {
          const f = JSON.parse(saved);
          if (f.selectedTicketSpaceFilter === urlSpaceId) {
            // Same space — restore all filters
            restoreFiltersFromSession(f);
          } else {
            // Different space stored — clear stale session
            try {
              sessionStorage.removeItem(TICKET_FILTERS_SESSION_KEY);
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        /* ignore */
      }
    } else {
      // No URL space — restore everything from session (including space)
      try {
        const saved = sessionStorage.getItem(TICKET_FILTERS_SESSION_KEY);
        if (saved) {
          const f = JSON.parse(saved);
          if (f.selectedTicketSpaceFilter)
            setSelectedTicketSpaceFilter(f.selectedTicketSpaceFilter);
          restoreFiltersFromSession(f);
        }
      } catch {
        /* ignore */
      }
    }

    setIsInitialized(true);
  }, [searchParams]);

  // ── Persist filters to sessionStorage ───────────────────────────────────────
  useEffect(() => {
    if (!isInitialized) return;
    try {
      sessionStorage.setItem(
        TICKET_FILTERS_SESSION_KEY,
        JSON.stringify({
          nameFilter,
          descriptionFilter,
          codeFilter,
          statusFilter,
          severityFilter,
          ticketTypeFilter,
          queueFilter,
          assigneeFilter,
          participantFilter,
          createdByFilter,
          slaResponseDeadlineRange,
          slaResolutionDeadlineRange,
          createdDateRange,
          selectedTicketSpaceFilter,
          currentPage,
          sortOption,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [
    isInitialized,
    nameFilter,
    descriptionFilter,
    codeFilter,
    statusFilter,
    severityFilter,
    ticketTypeFilter,
    queueFilter,
    assigneeFilter,
    participantFilter,
    createdByFilter,
    slaResponseDeadlineRange,
    slaResolutionDeadlineRange,
    createdDateRange,
    selectedTicketSpaceFilter,
    currentPage,
    sortOption,
  ]);

  // Load breadcrumbs — resolved purely from the already-loaded ticketSpaces list.
  // No extra getTicketSpaceById call needed.
  useEffect(() => {
    if (!ticketSpaceId) {
      setBreadcrumbs([{ label: "Tickets", href: "/ticket-management/ticket" }]);
      return;
    }

    if (!ticketSpacesLoaded) return; // wait for the list to load

    const existingSpace = ticketSpaces.find(
      (s) => s.id?.toString() === ticketSpaceId,
    );
    if (existingSpace) {
      setBreadcrumbs([
        {
          label: existingSpace.name,
          href: `/ticket-management/ticket?ticketSpaceId=${ticketSpaceId}`,
        },
      ]);
    } else {
      // Space not in the list (e.g. no access) — show generic breadcrumb
      setBreadcrumbs([{ label: "Tickets", href: "/ticket-management/ticket" }]);
    }
  }, [ticketSpaceId, ticketSpaces, ticketSpacesLoaded, setBreadcrumbs]);

  // Reset hasDataFetched whenever the effective ticket space changes — covers both
  // URL navigation (ticketSpaceId param) AND dropdown selection (selectedTicketSpaceFilter).
  // This ensures the skeleton is shown while config + data for the new space load,
  // instead of the "No Tickets Found" message flashing before data arrives.
  useEffect(() => {
    if (isInitialized) {
      setHasDataFetched(false);
      setData([]);
    }
  }, [selectedTicketSpaceFilter, isInitialized]);

  const handleExportToExcel = async () => {
    if (data.length === 0) {
      toast.error("No data to export");
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

      // Add ticket space filter if selected
      if (selectedTicketSpaceFilter) {
        filters.push({
          field: "ticketSpaceId",
          matchMode: "=",
          value: selectedTicketSpaceFilter,
        });
      }

      // Add text filters
      if (codeFilter) {
        filters.push({
          field: "code",
          matchMode: "contains",
          value: codeFilter,
        });
      }
      if (nameFilter) {
        filters.push({
          field: "name",
          matchMode: "contains",
          value: nameFilter,
        });
      }
      if (descriptionFilter) {
        filters.push({
          field: "description",
          matchMode: "contains",
          value: descriptionFilter,
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

      // Add ticket type filter
      if (ticketTypeFilter.length > 0) {
        filters.push({
          field: "ticketTypeId",
          matchMode: "in",
          value: ticketTypeFilter,
        });
      }

      // Add queue filter
      if (queueFilter.length > 0) {
        filters.push({
          field: "queueId",
          matchMode: "in",
          value: queueFilter,
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

      // Add participant filter
      if (participantFilter.length > 0) {
        filters.push({
          field: "participantIds",
          matchMode: "in",
          value: participantFilter,
        });
      }

      // Add created by filter
      if (createdByFilter.length > 0) {
        filters.push({
          field: "createdBy",
          matchMode: "in",
          value: createdByFilter,
        });
      }

      // Add SLA response deadline filter
      if (slaResponseDeadlineRange.start || slaResponseDeadlineRange.end) {
        filters.push({
          field: "slaResponseDeadline",
          matchMode: "dateRange",
          value: slaResponseDeadlineRange,
        });
      }

      // Add SLA resolution deadline filter
      if (slaResolutionDeadlineRange.start || slaResolutionDeadlineRange.end) {
        filters.push({
          field: "slaResolutionDeadline",
          matchMode: "dateRange",
          value: slaResolutionDeadlineRange,
        });
      }

      // Add created date range filter
      if (createdDateRange.start || createdDateRange.end) {
        filters.push({
          field: "createdAt",
          matchMode: "dateRange",
          value: createdDateRange,
        });
      }

      const queryParam = {
        filters,
        multiSorts,
        first: (currentPage - 1) * itemsPerPage,
        rows: itemsPerPage,
      };

      await exportTicketsToExcel(queryParam);
      toast.success("Tickets exported");
    } catch (error) {
      console.error("Error exporting tickets:", error);
      toast.error("Failed to export tickets. Please try again");
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch tickets data
  const fetchData = useCallback(async () => {
    if (configTicketFetchedRef.current) {
      configTicketFetchedRef.current = false;
      return;
    }
    if (!canView || !user?.id || !isInitialized) return;
    // When a ticket space is selected, wait until its config is loaded so the
    // default status filter (TOSTART + PROCESSING) can be applied correctly.
    // configVersion being in the deps array ensures this runs once config arrives.
    if (selectedTicketSpaceFilter && !configRef.current) return;

    // Deduplication: skip if an identical request is already in-flight
    const key = JSON.stringify({
      selectedTicketSpaceFilter,
      debouncedNameFilter,
      debouncedDescriptionFilter,
      debouncedCodeFilter,
      statusFilter,
      severityFilter,
      ticketTypeFilter,
      queueFilter,
      assigneeFilter,
      participantFilter,
      createdByFilter,
      slaResponseDeadlineRange,
      slaResolutionDeadlineRange,
      sortOption,
      currentPage,
      itemsPerPage,
      configVersion,
    });
    if (isFetchingRef.current && lastKeyRef.current === key) return;
    isFetchingRef.current = true;
    lastKeyRef.current = key;

    setIsLoading(true);
    try {
      const filters: any[] = [];

      // Ticket Space filter
      if (selectedTicketSpaceFilter) {
        filters.push({
          field: "ticketSpaceId",
          value: Number(selectedTicketSpaceFilter),
          matchMode: "equals",
        });
      }

      // Name filter
      if (debouncedNameFilter) {
        filters.push({
          field: "name",
          matchMode: "contains",
          value: debouncedNameFilter,
        });
      }

      // Description filter
      if (debouncedDescriptionFilter) {
        filters.push({
          field: "description",
          matchMode: "contains",
          value: debouncedDescriptionFilter,
        });
      }

      // Code filter
      if (debouncedCodeFilter) {
        filters.push({
          field: "code",
          matchMode: "contains",
          value: debouncedCodeFilter,
        });
      }

      // Status filter
      if (statusFilter.length > 0) {
        // User explicitly selected statuses → respect their choice
        filters.push({
          field: "statusId",
          matchMode: "in",
          value: statusFilter.map((id) => parseInt(id)),
        });
      } else if (selectedTicketSpaceFilter) {
        // No user selection → default to AUTOSTART + PROCESSING statuses only.
        // If the user wants other statuses (e.g. Finished) they can add a status filter.
        const defaultStatusIds = (configRef.current?.statuses || [])
          .filter((s: any) => s.base === "To Start" || s.base === "Processing")
          .map((s: any) => s.id);
        if (defaultStatusIds.length > 0) {
          filters.push({
            field: "statusId",
            matchMode: "in",
            value: defaultStatusIds,
          });
        }
      }

      // Severity filter
      if (severityFilter.length > 0) {
        filters.push({
          field: "severityId",
          matchMode: "in",
          value: severityFilter.map((id) => parseInt(id)),
        });
      }

      // Ticket Type filter
      if (ticketTypeFilter.length > 0) {
        filters.push({
          field: "ticketTypeId",
          matchMode: "in",
          value: ticketTypeFilter.map((id) => parseInt(id)),
        });
      }

      // Queue filter
      if (queueFilter.length > 0) {
        filters.push({
          field: "queueId",
          matchMode: "in",
          value: queueFilter.map((id: string) => parseInt(id)),
        });
      }

      // Assignee filter (server-side: assigneeId is TicketPermission.id)
      if (assigneeFilter.length > 0) {
        filters.push({
          field: "assigneeId",
          matchMode: "in",
          value: assigneeFilter.map((id) => parseInt(id)),
        });
      }

      // Participant filter (server-side via join table)
      if (participantFilter.length > 0) {
        filters.push({
          field: "id",
          matchMode: "relation-in",
          value: {
            joinTable: "ticket_participants",
            ownerColumn: "ticketId",
            filterColumn: "memberId",
            ids: participantFilter.map((id) => parseInt(id)),
          },
        });
      }

      // Created By filter
      if (createdByFilter.length > 0) {
        filters.push({
          field: "createdBy",
          matchMode: "in",
          value: createdByFilter,
        });
      }

      // SLA Response Deadline filter
      if (slaResponseDeadlineRange?.start && slaResponseDeadlineRange?.end) {
        const startUTC = safeParseLocalBoundaryISO(
          slaResponseDeadlineRange.start,
          "start",
        );
        const endUTC = safeParseLocalBoundaryISO(
          slaResponseDeadlineRange.end,
          "end",
        );

        filters.push({
          field: "slaResponseDeadline",
          matchMode: "dateBetween",
          value: [startUTC, endUTC],
        });
      }

      // SLA Resolution Deadline filter
      if (
        slaResolutionDeadlineRange?.start &&
        slaResolutionDeadlineRange?.end
      ) {
        const startUTC = safeParseLocalBoundaryISO(
          slaResolutionDeadlineRange.start,
          "start",
        );
        const endUTC = safeParseLocalBoundaryISO(
          slaResolutionDeadlineRange.end,
          "end",
        );

        filters.push({
          field: "slaResolutionDeadline",
          matchMode: "dateBetween",
          value: [startUTC, endUTC],
        });
      }

      // Created date range filter
      if (createdDateRange?.start && createdDateRange?.end) {
        const startUTC = safeParseLocalBoundaryISO(
          createdDateRange.start,
          "start",
        );
        const endUTC = safeParseLocalBoundaryISO(createdDateRange.end, "end");

        filters.push({
          field: "createdAt",
          matchMode: "dateBetween",
          value: [startUTC, endUTC],
        });
      }

      // Determine sort configuration
      let sortField = "statusId";
      let sortOrder = 1;

      if (sortOption === "createdAt-desc") {
        sortField = "createdAt";
        sortOrder = -1;
      } else if (sortOption === "createdAt-asc") {
        sortField = "createdAt";
        sortOrder = 1;
      } else if (sortOption === "updatedAt-desc") {
        sortField = "updatedAt";
        sortOrder = -1;
      } else if (sortOption === "updatedAt-asc") {
        sortField = "updatedAt";
        sortOrder = 1;
      } else if (sortOption === "code-asc") {
        sortField = "code";
        sortOrder = 1;
      } else if (sortOption === "code-desc") {
        sortField = "code";
        sortOrder = -1;
      } else if (sortOption === "name-asc") {
        sortField = "name";
        sortOrder = 1;
      } else if (sortOption === "name-desc") {
        sortField = "name";
        sortOrder = -1;
      } else if (sortOption === "statusId-asc") {
        sortField = "statusId";
        sortOrder = 1;
      } else if (sortOption === "statusId-desc") {
        sortField = "statusId";
        sortOrder = -1;
      } else if (sortOption === "slaResponseDeadline-asc") {
        sortField = "slaResponseDeadline";
        sortOrder = 1;
      } else if (sortOption === "slaResponseDeadline-desc") {
        sortField = "slaResponseDeadline";
        sortOrder = -1;
      } else if (sortOption === "slaResolutionDeadline-asc") {
        sortField = "slaResolutionDeadline";
        sortOrder = 1;
      } else if (sortOption === "slaResolutionDeadline-desc") {
        sortField = "slaResolutionDeadline";
        sortOrder = -1;
      }

      const params = {
        first: (currentPage - 1) * itemsPerPage,
        rows: itemsPerPage,
        filters,
        multiSorts: [{ field: sortField, order: sortOrder.toString() }],
      };

      const result = canViewAllTicketSpaces
        ? await searchTickets(params)
        : await searchTicketsByQueue(params);
      // Normalise assignee + participants from TicketPermission → User format
      const tickets = (result.data || []).map(normalizeTicket);

      // ── Phase 1 ─────────────────────────────────────────────────────────
      // Render cards/rows immediately.
      setData(enrichTickets(tickets, configRef.current));
      setTotalRecords(result.total || 0);

      if (tickets.length > 0) {
        // ── Phase 2 ───────────────────────────────────────────────────────
        // Silently enrich with commentCount only.
        // Participants come from the search result; bulk-relations only
        // returns commentCount and must NOT overwrite participants.
        // IDs chunked ≤50 and sent in parallel via Promise.all.
        setIsRelationsLoading(true);
        const allIds: number[] = tickets.map((t: any) => t.id);
        const CHUNK = 50;
        const chunks: number[][] = Array.from(
          { length: Math.ceil(allIds.length / CHUNK) },
          (_, i) => allIds.slice(i * CHUNK, i * CHUNK + CHUNK),
        );
        Promise.all(chunks.map((chunk) => getBulkTicketRelations(chunk)))
          .then((results) => {
            const bulkRelations: Record<number, any> = Object.assign(
              {},
              ...results,
            );
            setData((prevData) =>
              prevData.map((t: any) => {
                const rel = bulkRelations[t.id];
                if (!rel) return t;
                const merged = { ...t, ...rel };
                if (merged.participants) {
                  merged.participants = merged.participants.map(transformToUserFormat);
                }
                return merged;
              }),
            );
          })
          .catch((error) => {
            console.error("Error fetching bulk relations:", error);
            // keep Phase-1 data — relation enrichment is non-critical
          })
          .finally(() => {
            setIsRelationsLoading(false);
          });
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to fetch tickets");
      setData([]);
      setTotalRecords(0);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
      setHasDataFetched(true);
    }
  }, [
    canView,
    canViewAllTicketSpaces,
    user?.id,
    isInitialized,
    configVersion,
    currentPage,
    itemsPerPage,
    selectedTicketSpaceFilter,
    debouncedNameFilter,
    debouncedDescriptionFilter,
    debouncedCodeFilter,
    statusFilter,
    severityFilter,
    ticketTypeFilter,
    queueFilter,
    assigneeFilter,
    participantFilter,
    createdByFilter,
    slaResponseDeadlineRange,
    slaResolutionDeadlineRange,
    createdDateRange,
    sortOption,
  ]);

  // Trigger fetchData whenever it changes (filter/sort/page changes rebuild it)
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = () => {
    router.push(
      `/ticket-management/ticket/form?ticketSpaceId=${ticketSpaceId || ""}`,
    );
  };

  const handleEdit = (ticket: any) => {
    router.push(
      `/ticket-management/ticket/form?ticketSpaceId=${ticketSpaceId || ""}&edit=true&ticketId=${ticket.id}`,
    );
  };

  const handleDeleteClick = (ticket: any) => {
    setTicketToDelete(ticket);
    setDeleteDialogOpen(true);
  };

  const handleRefresh = () => {
    fetchData();
  };

  // Load config when ticket space changes (single request for both Kanban and Filters)
  useEffect(() => {
    const loadConfig = async () => {
      if (!selectedTicketSpaceFilter) {
        setConfig(null);
        setSpaceMembers([]);
        loadedConfigSpaceRef.current = null;
        return;
      }

      const spaceId = Number(selectedTicketSpaceFilter);

      // Prevent duplicate loads
      if (
        loadedConfigSpaceRef.current === spaceId ||
        isLoadingConfigRef.current
      )
        return;

      isLoadingConfigRef.current = true;
      setIsLoadingConfig(true);
      loadedConfigSpaceRef.current = spaceId;
      // Clear stale config so fetchData waits for the new space's config
      setConfig(null);

      try {
        // ── Parallel execution of Config & Tickets (Maximum Speed) ───────────

        // 1. Launch ALL configs in one giant parallel block
        const configPromise = Promise.all([
          getTicketSpaceStatusConfig(spaceId),
          getTicketSpaceSeverityConfig(spaceId),
          getTicketSpaceTypesConfig(spaceId),
          getTicketSpaceQueueConfig(spaceId),
          getTicketSpaceMembersConfig(spaceId),
          getTicketSpaceSlaConfig(spaceId),
          getTicketSpaceImpactConfig(spaceId),
        ]).then(([statusRes, severityRes, typesRes, queuesRes, membersRes, slasRes, impactsRes]) => {
          const members = membersRes?.members || [];
          const configResponse = {
            statuses: statusRes.statuses ?? [],
            severities: severityRes.severities ?? [],
            types: typesRes.types ?? [],
            queues: queuesRes.queues ?? [],
            members,
            slas: slasRes?.slas ?? [],
            impacts: impactsRes?.impacts ?? [],
          };
          setConfig(configResponse);
          setConfigVersion((v) => v + 1); // signal fetchData to re-run if future filters change
          setSpaceMembers(members);

          try {
            sessionStorage.setItem(
              `tsConfig_${spaceId}`,
              JSON.stringify({ ...configResponse, _cachedAt: Date.now() }),
            );
          } catch {
            /* ignore */
          }
          // Intentionally removed default status filter checking so we load all tickets initially
        });

        // 2. Launch initial ticket search in parallel (with NO status filters so it loads instantly)
        const hasSessionRestored = !!sessionStorage.getItem(TICKET_FILTERS_SESSION_KEY);
        const ticketsPromise = (async () => {
          if (!hasSessionRestored) {
            const initialFilters: any[] = [
              { field: "ticketSpaceId", value: spaceId, matchMode: "equals" },
            ];

            const params = {
              first: 0,
              rows: 20,
              filters: initialFilters,
              multiSorts: [{ field: "createdAt", order: "-1" }], // Default sort by date
            };

            const result = canViewAllTicketSpaces
              ? await searchTickets(params)
              : await searchTicketsByQueue(params);

            const tickets = (result.data || []).map(normalizeTicket);
            setData(enrichTickets(tickets, configRef.current));
            setTotalRecords(result.total || 0);
            setHasDataFetched(true);

            // Instantly hide the skeleton loader!
            setIsLoading(false);
            configTicketFetchedRef.current = true;

            if (tickets.length > 0) {
              setIsRelationsLoading(true);
              const allIds: number[] = tickets.map((t: any) => t.id);
              const CHUNK = 50;
              const chunks: number[][] = Array.from(
                { length: Math.ceil(allIds.length / CHUNK) },
                (_, i) => allIds.slice(i * CHUNK, i * CHUNK + CHUNK),
              );
              await Promise.all(chunks.map((chunk) => getBulkTicketRelations(chunk)))
                .then((results) => {
                  const bulkRelations: Record<number, any> = Object.assign({}, ...results);
                  setData((prevData) =>
                    prevData.map((t: any) => {
                      const rel = bulkRelations[t.id];
                      if (!rel) return t;
                      const merged = { ...t, ...rel };
                      if (merged.participants) {
                        merged.participants = merged.participants.map(transformToUserFormat);
                      }
                      return merged;
                    }),
                  );
                })
                .catch(() => {})
                .finally(() => setIsRelationsLoading(false));
            }
          }
        })();

        await Promise.all([configPromise, ticketsPromise]);
      } catch (error) {
        console.error("Error loading config:", error);
        toast.error("Failed to load configuration");
        loadedConfigSpaceRef.current = null;
      } finally {
        setIsLoadingConfig(false);
        isLoadingConfigRef.current = false;
      }
    };

    loadConfig();
  }, [selectedTicketSpaceFilter]);

  // Kanban config loader
  const KanbanViewWrapper = () => {
    if (isLoadingConfig && !config) {
      return <TicketKanbanSkeleton columns={5} cardsPerColumn={4} />;
    }

    if (!config) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>Please select a ticket space to view the Kanban board</p>
        </div>
      );
    }

    return (
      <TicketKanbanView
        data={filteredData}
        configData={config}
        getIconComponent={getIconComponent}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        onUpdateTicket={handleUpdateTicket}
        onCardClick={handleEdit}
        isRelationsLoading={isRelationsLoading}
      />
    );
  };

  const handleDeleteConfirm = async () => {
    if (!ticketToDelete) return;

    try {
      await deleteTicket(ticketToDelete.id);
      toast.success("Ticket deleted");
      setDeleteDialogOpen(false);
      setTicketToDelete(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast.error("Failed to delete ticket");
    }
  };

  const handleUpdateTicket = async (
    ticketId: number,
    updates: any,
    updatedData?: any,
  ) => {
    try {
      // Note: PATCH API call is already done by the inline component or drag-and-drop handler
      // This function only handles UI updates with the returned data

      // Don't re-fetch if only status changed (Kanban drag & drop)
      // This prevents unnecessary API calls to config/status
      const isOnlyStatusChange =
        updates.statusId && Object.keys(updates).length === 1;

      // Only re-fetch if sorting is active (not default) or if code changed
      // But skip refetch for status-only changes (Kanban drag & drop)
      if (
        !isOnlyStatusChange &&
        (sortOption !== "createdAt-desc" || updates.code)
      ) {
        // Re-fetch to maintain correct sort order
        fetchData();
      } else {
        // Optimistic update: Apply changed fields to the specific ticket
        const dataMerge: any = { ...updates };

        if (updatedData) {
          const transformedAssignee =
            updatedData.assignee !== undefined
              ? transformToUserFormat(updatedData.assignee)
              : undefined;
          const transformedParticipants =
            updatedData.participants !== undefined
              ? (updatedData.participants || []).map((p: any) =>
                transformToUserFormat(p),
              )
              : undefined;

          if (transformedAssignee !== undefined) {
            dataMerge.assignee = transformedAssignee;
            dataMerge.assigneeName = transformedAssignee ? `${transformedAssignee.first_name || ''} ${transformedAssignee.last_name || ''}`.trim() : null;
            dataMerge.assigneeProfilePicUrl = transformedAssignee?.profile_picture || null;
            dataMerge.assigneeEmail = transformedAssignee?.email || null;
          }
          if (transformedParticipants !== undefined)
            dataMerge.participants = transformedParticipants;
          if (updatedData.status !== undefined) {
            dataMerge.status = updatedData.status;
            dataMerge.statusName = updatedData.status?.name || null;
            dataMerge.statusColor = updatedData.status?.color || null;
            dataMerge.statusBase = updatedData.status?.base || null;
          }
          if (updatedData.severity !== undefined) {
            dataMerge.severity = updatedData.severity;
            dataMerge.severityName = updatedData.severity?.name || null;
            dataMerge.severityColor = updatedData.severity?.color || null;
          }
          if (updatedData.queue !== undefined) {
            dataMerge.queue = updatedData.queue;
            dataMerge.queueName = updatedData.queue?.name || null;
          }
          if (updatedData.ticketType !== undefined) {
            dataMerge.ticketType = updatedData.ticketType;
            dataMerge.ticketTypeName = updatedData.ticketType?.name || null;
            dataMerge.ticketTypeIcon = updatedData.ticketType?.icon || null;
            dataMerge.ticketTypeColor = updatedData.ticketType?.color || null;
          }
          if (updatedData.department !== undefined)
            dataMerge.department = updatedData.department;
          if (updatedData.impact !== undefined)
            dataMerge.impact = updatedData.impact;
          if (updatedData.slaResponseTime !== undefined)
            dataMerge.slaResponseTime = updatedData.slaResponseTime;
          if (updatedData.slaResolutionTime !== undefined)
            dataMerge.slaResolutionTime = updatedData.slaResolutionTime;
          if (updatedData.slaResponseDeadline !== undefined)
            dataMerge.slaResponseDeadline = updatedData.slaResponseDeadline;
          if (updatedData.slaResolutionDeadline !== undefined)
            dataMerge.slaResolutionDeadline = updatedData.slaResolutionDeadline;
        }

        setData((prevData) =>
          prevData.map((ticket) =>
            ticket.id === ticketId ? { ...ticket, ...dataMerge } : ticket,
          ),
        );
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error("Failed to update ticket", undefined, "bottom-right");
      throw error;
    }
  };

  // Filter template functions
  const saveCurrentAsTicketTemplate = async (name: string) => {
    if (!name.trim() || !user?.id) return;
    setIsSavingTemplate(true);
    try {
      const activeCompany = (() => {
        try { return JSON.parse(localStorage.getItem("active_company") || "null"); } catch { return null; }
      })();
      const activeCompanyId: number | undefined = activeCompany?.companyId;
      const newTemplate = {
        id: Date.now().toString(),
        name: name.trim(),
        companyId: activeCompanyId,
        filters: {
          nameFilter,
          descriptionFilter,
          codeFilter,
          statusFilter,
          severityFilter,
          ticketTypeFilter,
          queueFilter,
          assigneeFilter,
          participantFilter,
          createdByFilter,
          slaResponseDeadlineRange,
          slaResolutionDeadlineRange,
          createdDateRange,
          selectedTicketSpaceFilter,
          sortOption,
        },
        createdAt: new Date().toISOString(),
      };
      // Fetch the full unfiltered list so we don't drop other companies' templates
      const freshConfig = await getUserConfig(user.id);
      const allExisting: any[] = freshConfig?.filterTemplates?.ticket ?? [];
      const allUpdated = [...allExisting, newTemplate];
      await createOrUpdateUserConfig(user.id, {
        filterTemplates: { ticket: allUpdated },
      });
      // State only tracks current-company templates
      setTicketFilterTemplates((prev) => [...prev, newTemplate]);
      toast.success(`Filter template "${newTemplate.name}" saved`);
    } catch (error) {
      console.error("Error saving filter template:", error);
      toast.error("Failed to save filter template");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const applyTicketFilterTemplate = (template: any) => {
    if (activeTemplateId === template.id) {
      sessionStorage.removeItem(TICKET_FILTERS_SESSION_KEY);
      setSelectedTicketSpaceFilter(ticketSpaceId || "");
      setNameFilter("");
      setDescriptionFilter("");
      setCodeFilter("");
      setStatusFilter([]);
      setSeverityFilter([]);
      setTicketTypeFilter([]);
      setQueueFilter([]);
      setAssigneeFilter([]);
      setParticipantFilter([]);
      setCreatedByFilter([]);
      setSlaResponseDeadlineRange({ start: null, end: null });
      setSlaResolutionDeadlineRange({ start: null, end: null });
      setCreatedDateRange({ start: null, end: null });
      setSortOption(defaultSortOption);
      setCurrentPage(1);
      setActiveTemplateId(null);
      toast.success(`Deselected template "${template.name}"`);
      return;
    }
    const f = template.filters;
    setNameFilter(f.nameFilter || "");
    setDescriptionFilter(f.descriptionFilter || "");
    setCodeFilter(f.codeFilter || "");
    setStatusFilter(f.statusFilter || []);
    setSeverityFilter(f.severityFilter || []);
    setTicketTypeFilter(f.ticketTypeFilter || []);
    setQueueFilter(f.queueFilter || []);
    setAssigneeFilter(f.assigneeFilter || []);
    setParticipantFilter(f.participantFilter || []);
    setCreatedByFilter(f.createdByFilter || []);
    setSlaResponseDeadlineRange(
      f.slaResponseDeadlineRange ||
      f.slaDeadlineRange || { start: null, end: null },
    );
    setSlaResolutionDeadlineRange(
      f.slaResolutionDeadlineRange || { start: null, end: null },
    );
    setCreatedDateRange(f.createdDateRange || { start: null, end: null });
    if (f.selectedTicketSpaceFilter) {
      setSelectedTicketSpaceFilter(f.selectedTicketSpaceFilter);
    }
    setSortOption(f.sortOption || defaultSortOption);
    setCurrentPage(1);
    setActiveTemplateId(template.id);
    toast.success(`Applied template "${template.name}"`);
  };

  const deleteTicketFilterTemplate = async (templateId: string) => {
    if (!user?.id) return;
    try {
      // Fetch the full unfiltered list so we don't drop other companies' templates
      const freshConfig = await getUserConfig(user.id);
      const allExisting: any[] = freshConfig?.filterTemplates?.ticket ?? [];
      const allUpdated = allExisting.filter((t) => t.id !== templateId);
      await createOrUpdateUserConfig(user.id, {
        filterTemplates: { ticket: allUpdated },
      });
      setTicketFilterTemplates((prev) => prev.filter((t) => t.id !== templateId));
      if (activeTemplateId === templateId) setActiveTemplateId(null);
      toast.success("Filter template deleted");
    } catch (error) {
      console.error("Error deleting filter template:", error);
      toast.error("Failed to delete filter template");
    }
  };

  const handleSaveDefaultSort = async () => {
    if (!user?.id) return;
    try {
      const savedPrefs = localStorage.getItem("user_view_preferences");
      const prefs = savedPrefs ? JSON.parse(savedPrefs) : {};
      prefs.ticketDefaultSort = sortOption;
      localStorage.setItem("user_view_preferences", JSON.stringify(prefs));

      await createOrUpdateUserConfig(user.id, { viewPreference: prefs });
      setDefaultSortOption(sortOption);
      toast.success("Default sorting preference updated");
    } catch (err) {
      console.error("Failed to save default sorting preference:", err);
      toast.error("Failed to update default sorting preference");
    }
  };

  // Render pinned filter
  const renderPinnedFilter = (filterType: FilterType) => {
    switch (filterType) {
      case "ticketSpace":
        return (
          <Select
            key={selectedTicketSpaceFilter || "no-space-pinned"}
            value={selectedTicketSpaceFilter || undefined}
            onValueChange={(value) => {
              // Changing space → clear all filters and sessionStorage
              sessionStorage.removeItem(TICKET_FILTERS_SESSION_KEY);
              clearAllFilterStates();
              loadedConfigSpaceRef.current = null;
              setSelectedTicketSpaceFilter(value || "");
            }}
          >
            <SelectTrigger
              className={`h-7 text-xs w-[140px] font-medium rounded-sm shadow-none bg-background hover:bg-accent hover:text-accent-foreground transition-colors [&>svg]:opacity-100 [&>svg]:!w-3.5 [&>svg]:!h-3.5 [&>svg]:text-current ${selectedTicketSpaceFilter ? "" : ""}`}
            >
              <SelectValue placeholder="Ticket Space" />
            </SelectTrigger>
            <SelectContent>
              {ticketSpaces.map((space) => (
                <SelectItem
                  key={space.id}
                  value={space.id?.toString()}
                  className="text-xs"
                >
                  {space.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "status":
        if (!config?.statuses) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
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
                {config.statuses.map((status: any) => (
                  <label
                    key={status.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={statusFilter.includes(status.id?.toString())}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setStatusFilter([
                            ...statusFilter,
                            status.id?.toString(),
                          ]);
                        } else {
                          setStatusFilter(
                            statusFilter.filter(
                              (s) => s !== status.id?.toString(),
                            ),
                          );
                        }
                      }}
                      className="w-3.5 h-3.5"
                    />
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-xs truncate">{status.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        );

      case "severity":
        if (!config?.severities) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
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
                {config.severities.map((severity: any) => (
                  <label
                    key={severity.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={severityFilter.includes(severity.id?.toString())}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSeverityFilter([
                            ...severityFilter,
                            severity.id?.toString(),
                          ]);
                        } else {
                          setSeverityFilter(
                            severityFilter.filter(
                              (s) => s !== severity.id?.toString(),
                            ),
                          );
                        }
                      }}
                      className="w-3.5 h-3.5"
                    />
                    <div className="flex items-center gap-1.5">
                      <Flag
                        className="w-3.5 h-3.5"
                        style={{ color: severity.color }}
                        fill={severity.color}
                      />
                      <span className="text-xs truncate">{severity.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        );

      case "ticketType":
        if (!config?.types) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
              >
                Type
                {ticketTypeFilter.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium">
                    {ticketTypeFilter.length}
                  </span>
                )}
                {ticketTypeFilter.length > 0 && (
                  <span
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setTicketTypeFilter([]);
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
                {config.types.map((type: any) => {
                  const IconComponent = getIconComponent(type.icon);
                  return (
                    <label
                      key={type.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={ticketTypeFilter.includes(type.id?.toString())}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTicketTypeFilter([
                              ...ticketTypeFilter,
                              type.id?.toString(),
                            ]);
                          } else {
                            setTicketTypeFilter(
                              ticketTypeFilter.filter(
                                (t) => t !== type.id?.toString(),
                              ),
                            );
                          }
                        }}
                        className="w-3.5 h-3.5"
                      />
                      <div className="flex items-center gap-1.5">
                        {IconComponent && (
                          <IconComponent className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                        )}
                        <span className="text-xs truncate">{type.name}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        );

      case "queue":
        if (!config?.queues || config.queues.length === 0) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2 border border-border shadow-none"
              >
                Queue/Dept.
                {queueFilter.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium">
                    {queueFilter.length}
                  </span>
                )}
                {queueFilter.length > 0 && (
                  <span
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setQueueFilter([]);
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
                {config.queues.map((queue: any) => (
                  <label
                    key={queue.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={queueFilter.includes(queue.id?.toString())}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setQueueFilter([...queueFilter, queue.id?.toString()]);
                        } else {
                          setQueueFilter(
                            queueFilter.filter(
                              (q) => q !== queue.id?.toString(),
                            ),
                          );
                        }
                      }}
                      className="w-3.5 h-3.5"
                    />
                    <span className="text-xs truncate">{queue.name}</span>
                  </label>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        );

      case "assignee": {
        if (!spaceMembers.length) return null;
        const filteredAndSorted = [...spaceMembers]
          .filter((m: any) => {
            const name = `${m.userFirstName} ${m.userLastName}`.toLowerCase();
            return name.includes(assigneeSearchQuery.toLowerCase());
          })
          .sort((a: any, b: any) => {
            const aSelected = assigneeFilter.includes(a.id.toString());
            const bSelected = assigneeFilter.includes(b.id.toString());
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;
            const nameA = `${a.userFirstName} ${a.userLastName}`.toLowerCase();
            const nameB = `${b.userFirstName} ${b.userLastName}`.toLowerCase();
            return nameA.localeCompare(nameB);
          });
        return (
          <Popover key="assignee">
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2 border border-border shadow-none"
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
                  value={assigneeSearchQuery}
                  onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                  className="h-7 text-xs pl-7 pr-2 placeholder:text-xs"
                />
              </div>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {filteredAndSorted.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={assigneeFilter.includes(m.id?.toString())}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAssigneeFilter([
                            ...assigneeFilter,
                            m.id?.toString(),
                          ]);
                        } else {
                          setAssigneeFilter(
                            assigneeFilter.filter((a) => a !== m.id?.toString()),
                          );
                        }
                      }}
                      className="w-3.5 h-3.5"
                    />
                    <MemberAvatar m={m} size={5} />
                    <span className="text-xs truncate">
                      {m.userFirstName} {m.userLastName}
                    </span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        );
      }
      case "createdBy": {
        if (!spaceMembers.length) return null;
        const filteredAndSorted = [...spaceMembers]
          .filter((m: any) => {
            const name = `${m.userFirstName} ${m.userLastName}`.toLowerCase();
            return name.includes(createdBySearchQuery.toLowerCase());
          })
          .sort((a: any, b: any) => {
            const emailA = a.userEmail || a.email || "";
            const emailB = b.userEmail || b.email || "";
            const aSelected = createdByFilter.includes(emailA);
            const bSelected = createdByFilter.includes(emailB);
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;
            const nameA = `${a.userFirstName} ${a.userLastName}`.toLowerCase();
            const nameB = `${b.userFirstName} ${b.userLastName}`.toLowerCase();
            return nameA.localeCompare(nameB);
          });
        return (
          <Popover key="createdBy">
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2 border border-border shadow-none"
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
                  value={createdBySearchQuery}
                  onChange={(e) => setCreatedBySearchQuery(e.target.value)}
                  className="h-7 text-xs pl-7 pr-2 placeholder:text-xs"
                />
              </div>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {filteredAndSorted.map((m) => {
                  const email = m.userEmail || m.email || "";
                  return (
                    <label
                      key={m.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={createdByFilter.includes(email)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCreatedByFilter([
                              ...createdByFilter,
                              email,
                            ]);
                          } else {
                            setCreatedByFilter(
                              createdByFilter.filter((n) => n !== email),
                            );
                          }
                        }}
                        className="w-3.5 h-3.5"
                      />
                      <MemberAvatar m={m} size={5} />
                      <span className="text-xs truncate">
                        {m.userFirstName} {m.userLastName}
                      </span>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        );
      }

      case "name":
        return (
          <div className="relative w-[140px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Name"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
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
          <div className="relative w-[120px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Code"
              value={codeFilter}
              onChange={(e) => setCodeFilter(e.target.value)}
              className="h-7 pl-7 pr-7 text-xs border border-border shadow-none placeholder:text-xs"
            />
            {codeFilter && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0"
                onClick={() => setCodeFilter("")}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        );

      case "description":
        return (
          <div className="relative w-[140px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Description"
              value={descriptionFilter}
              onChange={(e) => setDescriptionFilter(e.target.value)}
              className="h-7 pl-7 pr-7 text-xs border border-border shadow-none placeholder:text-xs"
            />
            {descriptionFilter && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0"
                onClick={() => setDescriptionFilter("")}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        );

      case "participant": {
        if (!spaceMembers.length) return null;
        const filteredParticipants = spaceMembers.filter((m) =>
          `${m.userFirstName} ${m.userLastName}`
            .toLowerCase()
            .includes(participantSearchQuery.toLowerCase()),
        );
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2 border border-border shadow-none"
              >
                Participant
                {participantFilter.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium">
                    {participantFilter.length}
                  </span>
                )}
                {participantFilter.length > 0 && (
                  <span
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setParticipantFilter([]);
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
                {filteredParticipants.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={participantFilter.includes(m.id?.toString())}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setParticipantFilter([
                            ...participantFilter,
                            m.id?.toString(),
                          ]);
                        } else {
                          setParticipantFilter(
                            participantFilter.filter(
                              (p) => p !== m.id?.toString(),
                            ),
                          );
                        }
                      }}
                      className="w-3.5 h-3.5"
                    />
                    <MemberAvatar m={m} size={5} />
                    <span className="text-xs truncate">
                      {m.userFirstName} {m.userLastName}
                    </span>
                  </label>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }

      case "slaResponseDeadline":
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2 border border-border shadow-none"
              >
                {slaResponseDeadlineRange.start && slaResponseDeadlineRange.end
                  ? <span className="flex items-center gap-1">{slaResponseDeadlineRange.start} <ArrowRight className="w-3 h-3 text-muted-foreground" /> {slaResponseDeadlineRange.end}</span>
                  : "SLA Response"}
                {(slaResponseDeadlineRange.start || slaResponseDeadlineRange.end) && (
                  <span
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSlaResponseDeadlineRange({ start: null, end: null });
                      setCurrentPage(1);
                    }}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarRange
                value={slaResponseDeadlineRange}
                onChange={setSlaResponseDeadlineRange}
              />
            </PopoverContent>
          </Popover>
        );

      case "slaResolutionDeadline":
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2 border border-border shadow-none"
              >
                {slaResolutionDeadlineRange.start &&
                  slaResolutionDeadlineRange.end
                  ? <span className="flex items-center gap-1">{slaResolutionDeadlineRange.start} <ArrowRight className="w-3 h-3 text-muted-foreground" /> {slaResolutionDeadlineRange.end}</span>
                  : "SLA Resolution"}
                {(slaResolutionDeadlineRange.start || slaResolutionDeadlineRange.end) && (
                  <span
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSlaResolutionDeadlineRange({ start: null, end: null });
                      setCurrentPage(1);
                    }}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarRange
                value={slaResolutionDeadlineRange}
                onChange={setSlaResolutionDeadlineRange}
              />
            </PopoverContent>
          </Popover>
        );

      case "createdDateRange":
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2 border border-border shadow-none"
              >
                {createdDateRange.start && createdDateRange.end
                  ? <span className="flex items-center gap-1">{createdDateRange.start} <ArrowRight className="w-3 h-3 text-muted-foreground" /> {createdDateRange.end}</span>
                  : "Created"}
                {(createdDateRange.start || createdDateRange.end) && (
                  <span
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCreatedDateRange({ start: null, end: null });
                      setCurrentPage(1);
                    }}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarRange
                value={createdDateRange}
                onChange={setCreatedDateRange}
              />
            </PopoverContent>
          </Popover>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-28px)]">
      {/* Header */}
      <div className="flex-none pt-9 pb-1 bg-background">
        <div className="px-3 pt-2 pb-0 border-border">
          <div className="flex items-center gap-1.5">
            {/* Add Button */}
            {canCreate && selectedTicketSpaceFilter && (
              <Button
                size="sm"
                className="h-7 text-xs px-2.5 dark:text-black"
                onClick={handleAdd}
                disabled={isLoading}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Ticket
              </Button>
            )}

            {/* Refresh Button */}
            <Button
              size="sm"
              variant="outline"
              className={`h-7 w-7 p-0 ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={handleRefresh}
              disabled={isLoading}
              title={isLoading ? "Loading..." : "Refresh"}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>

            {/* Export Button */}
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

            <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

            {/* View Toggle */}
            <div className="flex gap-1 border border-border bg-background rounded-sm shrink-0 items-center h-7">
              <Button
                size="sm"
                variant={changeView === "card" ? "default" : "ghost"}
                className={`h-full text-xs shadow-none ${changeView === "card" ? "px-2.5 dark:text-black" : "px-2"}`}
                onClick={() => setChangeView("card")}
                title="Switch to Grid View"
              >
                <LayoutGrid className={`w-3.5 h-3.5 ${changeView === "card" ? "mr-1" : ""}`} />
                {changeView === "card" && "Grid"}
              </Button>
              <Button
                size="sm"
                variant={changeView === "table" ? "default" : "ghost"}
                className={`h-full text-xs shadow-none ${changeView === "table" ? "px-2.5 dark:text-black" : "px-2"}`}
                onClick={() => setChangeView("table")}
                title="Switch to Table View"
              >
                <TableProperties className={`w-3.5 h-3.5 ${changeView === "table" ? "mr-1" : ""}`} />
                {changeView === "table" && "Table"}
              </Button>
              <Button
                size="sm"
                variant={changeView === "kanban" ? "default" : "ghost"}
                className={`h-full text-xs shadow-none ${changeView === "kanban" ? "px-2.5 dark:text-black" : "px-2"}`}
                onClick={() => setChangeView("kanban")}
                title="Switch to Kanban View"
              >
                <Columns3 className={`w-3.5 h-3.5 ${changeView === "kanban" ? "mr-1" : ""}`} />
                {changeView === "kanban" && "Kanban"}
              </Button>
            </div>

            {/* Pinned Filters */}
            <div className="flex-1 flex items-center gap-1.5 min-w-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {pinnedFilters.length > 0 && (
                <>
                  <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1 shrink-0"></div>
                  {pinnedFilters.map((filterType) => (
                    <div key={filterType} className="shrink-0">{renderPinnedFilter(filterType)}</div>
                  ))}
                </>
              )}
            </div>

            <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-7 w-7 p-0 shrink-0 ${sortOption !== defaultSortOption ? "border-primary" : ""} border border-border shadow-none`}
                  title="Sort"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[240px]">
                <DropdownMenuLabel className="text-xs font-semibold">
                  Sort By
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2 space-y-1">
                  {(
                    [
                      { field: "createdAt", label: "Created At", defaultDir: "desc" as const },
                      { field: "updatedAt", label: "Updated At", defaultDir: "desc" as const },
                      { field: "code", label: "Code", defaultDir: "asc" as const },
                      { field: "name", label: "Name", defaultDir: "asc" as const },
                      { field: "statusId", label: "Status", defaultDir: "asc" as const },
                      { field: "slaResponseDeadline", label: "SLA Response", defaultDir: "asc" as const },
                      { field: "slaResolutionDeadline", label: "SLA Resolution", defaultDir: "asc" as const },
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
                        }}
                        className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent cursor-pointer transition-colors ${isActive ? "bg-accent font-bold text-black dark:text-white" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          {displayDir === "asc"
                            ? <ArrowUp className="w-3.5 h-3.5 flex-shrink-0" />
                            : <ArrowDown className="w-3.5 h-3.5 flex-shrink-0" />}
                          <span className="flex-1">
                            {label}
                            {field === "createdAt" || field === "updatedAt" || field === "slaResponseDeadline" || field === "slaResolutionDeadline"
                              ? displayDir === "desc"
                                ? " (Latest → Earliest)"
                                : " (Earliest → Latest)"
                              : displayDir === "asc"
                                ? " (A → Z)"
                                : " (Z → A)"}
                            {((defaultSortOption === ascValue && displayDir === "asc") || (defaultSortOption === descValue && displayDir === "desc")) && (
                              <span className="ml-1 text-[10px] text-muted-foreground font-normal italic">
                                (Default)
                              </span>
                            )}
                          </span>
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

            {/* Filters Button Group */}
            <div className="inline-flex items-center shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2 rounded-r-none"
                  >
                    <Filter className="w-3.5 h-3.5 mr-1.5" />
                    Filters
                    {(selectedTicketSpaceFilter ||
                      nameFilter ||
                      descriptionFilter ||
                      codeFilter ||
                      statusFilter.length > 0 ||
                      severityFilter.length > 0 ||
                      ticketTypeFilter.length > 0 ||
                      queueFilter.length > 0 ||
                      assigneeFilter.length > 0 ||
                      participantFilter.length > 0 ||
                      slaResponseDeadlineRange.start ||
                      slaResponseDeadlineRange.end ||
                      slaResolutionDeadlineRange.start ||
                      slaResolutionDeadlineRange.end ||
                      createdDateRange.start ||
                      createdDateRange.end) && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium">
                          {
                            [
                              selectedTicketSpaceFilter,
                              nameFilter,
                              descriptionFilter,
                              codeFilter,
                              statusFilter.length > 0,
                              severityFilter.length > 0,
                              ticketTypeFilter.length > 0,
                              queueFilter.length > 0,
                              assigneeFilter.length > 0,
                              participantFilter.length > 0,
                              slaResponseDeadlineRange.start ||
                              slaResponseDeadlineRange.end,
                              slaResolutionDeadlineRange.start ||
                              slaResolutionDeadlineRange.end,
                              createdDateRange.start || createdDateRange.end,
                            ].filter(Boolean).length
                          }
                        </span>
                      )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[320px]">
                  <DropdownMenuLabel className="text-xs font-semibold flex items-center justify-between">
                    <span>Filters</span>
                    {(selectedTicketSpaceFilter ||
                      nameFilter ||
                      descriptionFilter ||
                      codeFilter ||
                      statusFilter.length > 0 ||
                      severityFilter.length > 0 ||
                      ticketTypeFilter.length > 0 ||
                      queueFilter.length > 0 ||
                      assigneeFilter.length > 0 ||
                      participantFilter.length > 0 ||
                      slaResponseDeadlineRange.start ||
                      slaResponseDeadlineRange.end ||
                      slaResolutionDeadlineRange.start ||
                      slaResolutionDeadlineRange.end ||
                      createdDateRange.start ||
                      createdDateRange.end) && (
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
                  <div className="p-2 space-y-3 max-h-[500px] overflow-y-auto">
                    {/* Status Filter */}
                    {selectedTicketSpaceFilter && config?.statuses && (
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
                                  ? "Unpin filter"
                                  : "Pin filter to toolbar"
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
                          {config.statuses.map((status: any) => (
                            <label
                              key={status.id}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={statusFilter.includes(
                                  status.id?.toString(),
                                )}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setStatusFilter([
                                      ...statusFilter,
                                      status.id?.toString(),
                                    ]);
                                  } else {
                                    setStatusFilter(
                                      statusFilter.filter(
                                        (s) => s !== status.id?.toString(),
                                      ),
                                    );
                                  }
                                }}
                                className="w-3.5 h-3.5"
                              />
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: status.color }}
                                />
                                <span className="text-xs">{status.name}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Severity Filter */}
                    {selectedTicketSpaceFilter && config?.severities && (
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
                                  ? "Unpin filter"
                                  : "Pin filter to toolbar"
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
                          {config.severities.map((severity: any) => (
                            <label
                              key={severity.id}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={severityFilter.includes(
                                  severity.id?.toString(),
                                )}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSeverityFilter([
                                      ...severityFilter,
                                      severity.id?.toString(),
                                    ]);
                                  } else {
                                    setSeverityFilter(
                                      severityFilter.filter(
                                        (s) => s !== severity.id?.toString(),
                                      ),
                                    );
                                  }
                                }}
                                className="w-3.5 h-3.5"
                              />
                              <div className="flex items-center gap-1.5">
                                <Flag
                                  className="w-3.5 h-3.5"
                                  style={{ color: severity.color }}
                                  fill={severity.color}
                                />
                                <span className="text-xs">{severity.name}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ticket Type Filter */}
                    {selectedTicketSpaceFilter && config?.types && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Ticket Type
                          </label>
                          <div className="flex items-center gap-1">
                            {ticketTypeFilter.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1 text-xs text-red-500 hover:text-red-600"
                                onClick={() => setTicketTypeFilter([])}
                              >
                                Clear
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-5 w-5 p-0 ${isFilterPinned("ticketType") ? "text-primary" : "text-gray-400"}`}
                              onClick={() => togglePinFilter("ticketType")}
                              title={
                                isFilterPinned("ticketType")
                                  ? "Unpin filter"
                                  : "Pin filter to toolbar"
                              }
                            >
                              <Pin
                                className="h-3.5 w-3.5"
                                fill={
                                  isFilterPinned("ticketType")
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1.5 max-h-[150px] overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2">
                          {config.types.map((type: any) => {
                            const IconComponent = getIconComponent(type.icon);
                            return (
                              <label
                                key={type.id}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={ticketTypeFilter.includes(
                                    type.id?.toString(),
                                  )}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTicketTypeFilter([
                                        ...ticketTypeFilter,
                                        type.id?.toString(),
                                      ]);
                                    } else {
                                      setTicketTypeFilter(
                                        ticketTypeFilter.filter(
                                          (t) => t !== type.id?.toString(),
                                        ),
                                      );
                                    }
                                  }}
                                  className="w-3.5 h-3.5"
                                />
                                <div className="flex items-center gap-1.5">
                                  {IconComponent && (
                                    <IconComponent className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                                  )}
                                  <span className="text-xs">{type.name}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Queue Filter */}
                    {selectedTicketSpaceFilter && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Queue/Dept.
                          </label>
                          <div className="flex items-center gap-1">
                            {queueFilter.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1 text-xs text-red-500 hover:text-red-600"
                                onClick={() => setQueueFilter([])}
                              >
                                Clear
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-5 w-5 p-0 ${isFilterPinned("queue") ? "text-primary" : "text-gray-400"}`}
                              onClick={() => togglePinFilter("queue")}
                              title={
                                isFilterPinned("queue")
                                  ? "Unpin filter"
                                  : "Pin filter to toolbar"
                              }
                            >
                              <Pin
                                className="h-3.5 w-3.5"
                                fill={
                                  isFilterPinned("queue")
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1.5 max-h-[150px] overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2">
                          {config?.queues && config.queues.length > 0 ? (
                            config.queues.map((queue: any) => (
                              <label
                                key={queue.id}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={queueFilter.includes(
                                    queue.id?.toString(),
                                  )}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setQueueFilter([
                                        ...queueFilter,
                                        queue.id?.toString(),
                                      ]);
                                    } else {
                                      setQueueFilter(
                                        queueFilter.filter(
                                          (q) => q !== queue.id?.toString(),
                                        ),
                                      );
                                    }
                                  }}
                                  className="w-3.5 h-3.5"
                                />
                                <span className="text-xs">{queue.name}</span>
                              </label>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500 italic">
                              {!config
                                ? "Loading..."
                                : "No queues configured for this space"}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Assignee Filter */}
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
                                ? "Unpin filter"
                                : "Pin filter to toolbar"
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
                      <div className="space-y-2 border border-gray-300 dark:border-gray-600 rounded-md p-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                          <Input
                            placeholder="Search assignees..."
                            value={assigneeSearchQuery}
                            onChange={(e) =>
                              setAssigneeSearchQuery(e.target.value)
                            }
                            className="h-7 text-xs pl-7 pr-2 border-gray-300 dark:border-gray-600 placeholder:text-xs"
                          />
                        </div>
                        <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                          {spaceMembers.length > 0 ? (
                            spaceMembers
                              .filter((m) =>
                                `${m.userFirstName} ${m.userLastName}`
                                  .toLowerCase()
                                  .includes(assigneeSearchQuery.toLowerCase()),
                              )
                              .map((m) => (
                                <label
                                  key={m.id}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={assigneeFilter.includes(
                                      m.id?.toString(),
                                    )}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setAssigneeFilter([
                                          ...assigneeFilter,
                                          m.id?.toString(),
                                        ]);
                                      } else {
                                        setAssigneeFilter(
                                          assigneeFilter.filter(
                                            (a) => a !== m.id?.toString(),
                                          ),
                                        );
                                      }
                                    }}
                                    className="w-3.5 h-3.5"
                                  />
                                  <MemberAvatar m={m} size={5} />
                                  <span className="text-xs">
                                    {m.userFirstName} {m.userLastName}
                                  </span>
                                </label>
                              ))
                          ) : selectedTicketSpaceFilter ? (
                            <div className="text-xs text-gray-500 text-center py-2">
                              {isLoadingConfig
                                ? "Loading..."
                                : "No members found"}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 text-center py-2">
                              Select a ticket space first
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Participant Filter */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Participant
                        </label>
                        <div className="flex items-center gap-1">
                          {participantFilter.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-xs text-red-500 hover:text-red-600"
                              onClick={() => setParticipantFilter([])}
                            >
                              Clear
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-5 w-5 p-0 ${isFilterPinned("participant") ? "text-primary" : "text-gray-400"}`}
                            onClick={() => togglePinFilter("participant")}
                            title={
                              isFilterPinned("participant")
                                ? "Unpin filter"
                                : "Pin filter to toolbar"
                            }
                          >
                            <Pin
                              className="h-3.5 w-3.5"
                              fill={
                                isFilterPinned("participant")
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 border border-gray-300 dark:border-gray-600 rounded-md p-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                          <Input
                            placeholder="Search participants..."
                            value={participantSearchQuery}
                            onChange={(e) =>
                              setParticipantSearchQuery(e.target.value)
                            }
                            className="h-7 text-xs pl-7 pr-2 border-gray-300 dark:border-gray-600 placeholder:text-xs"
                          />
                        </div>
                        <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                          {spaceMembers.length > 0 ? (
                            spaceMembers
                              .filter((m) =>
                                `${m.userFirstName} ${m.userLastName}`
                                  .toLowerCase()
                                  .includes(
                                    participantSearchQuery.toLowerCase(),
                                  ),
                              )
                              .map((m) => (
                                <label
                                  key={m.id}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={participantFilter.includes(
                                      m.id?.toString(),
                                    )}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setParticipantFilter([
                                          ...participantFilter,
                                          m.id?.toString(),
                                        ]);
                                      } else {
                                        setParticipantFilter(
                                          participantFilter.filter(
                                            (p) => p !== m.id?.toString(),
                                          ),
                                        );
                                      }
                                    }}
                                    className="w-3.5 h-3.5"
                                  />
                                  <MemberAvatar m={m} size={5} />
                                  <span className="text-xs">
                                    {m.userFirstName} {m.userLastName}
                                  </span>
                                </label>
                              ))
                          ) : selectedTicketSpaceFilter ? (
                            <div className="text-xs text-gray-500 text-center py-2">
                              {isLoadingConfig
                                ? "Loading..."
                                : "No members found"}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 text-center py-2">
                              Select a ticket space first
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Created By Filter */}
                    {spaceMembers.length > 0 && (
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
                                  ? "Unpin filter"
                                  : "Pin filter to toolbar"
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
                        <div className="border border-gray-300 dark:border-gray-600 rounded-md p-2 space-y-2">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                            <Input
                              placeholder="Search creators..."
                              value={createdBySearchQuery}
                              onChange={(e) => setCreatedBySearchQuery(e.target.value)}
                              className="h-7 text-xs pl-7 pr-2 placeholder:text-xs"
                            />
                          </div>
                          <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                            {spaceMembers
                              .filter((m) =>
                                `${m.userFirstName} ${m.userLastName}`
                                  .toLowerCase()
                                  .includes(createdBySearchQuery.toLowerCase()),
                              )
                              .map((m) => {
                                const email = m.userEmail || m.email || "";
                                return (
                                  <label
                                    key={m.id}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={createdByFilter.includes(email)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setCreatedByFilter([
                                            ...createdByFilter,
                                            email,
                                          ]);
                                        } else {
                                          setCreatedByFilter(
                                            createdByFilter.filter((n) => n !== email),
                                          );
                                        }
                                      }}
                                      className="w-3.5 h-3.5"
                                    />
                                    <MemberAvatar m={m} size={5} />
                                    <span className="text-xs truncate">
                                      {m.userFirstName} {m.userLastName}
                                    </span>
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Code Filter */}
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
                                ? "Unpin filter"
                                : "Pin filter to toolbar"
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
                          onChange={(e) => setCodeFilter(e.target.value)}
                          className="h-7 text-xs pl-2 pr-2 border-gray-300 dark:border-gray-600 placeholder:text-xs"
                        />
                      </div>
                    </div>

                    {/* Name Filter */}
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
                                ? "Unpin filter"
                                : "Pin filter to toolbar"
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
                          onChange={(e) => setNameFilter(e.target.value)}
                          className="h-7 text-xs pl-2 pr-2 border-gray-300 dark:border-gray-600 placeholder:text-xs"
                        />
                      </div>
                    </div>

                    {/* Description Filter */}
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
                                ? "Unpin filter"
                                : "Pin filter to toolbar"
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
                          onChange={(e) => setDescriptionFilter(e.target.value)}
                          className="h-7 text-xs pl-2 pr-2 border-gray-300 dark:border-gray-600 placeholder:text-xs"
                        />
                      </div>
                    </div>

                    {/* Space (read-only) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Space
                        </label>
                      </div>
                      <Select
                        value={selectedTicketSpaceFilter || undefined}
                        disabled
                      >
                        <SelectTrigger className="h-7 text-xs border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-60">
                          <SelectValue placeholder="No space selected" />
                        </SelectTrigger>
                        <SelectContent>
                          {ticketSpaces.map((space) => (
                            <SelectItem
                              key={space.id}
                              value={space.id?.toString()}
                              className="text-xs"
                            >
                              {space.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Created Date Range Filter */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Created
                        </label>
                        <div className="flex items-center gap-1">
                          {(createdDateRange.start || createdDateRange.end) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-xs text-red-500 hover:text-red-600"
                              onClick={() =>
                                setCreatedDateRange({ start: null, end: null })
                              }
                            >
                              Clear
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-5 w-5 p-0 ${isFilterPinned("createdDateRange") ? "text-primary" : "text-gray-400"}`}
                            onClick={() => togglePinFilter("createdDateRange")}
                            title={
                              isFilterPinned("createdDateRange")
                                ? "Unpin filter"
                                : "Pin filter to toolbar"
                            }
                          >
                            <Pin
                              className="h-3.5 w-3.5"
                              fill={
                                isFilterPinned("createdDateRange")
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className={`h-7 w-full bg-transparent text-xs text-gray-300 px-2 `}
                            >
                              {createdDateRange.start && createdDateRange.end
                                ? `${createdDateRange.start} → ${createdDateRange.end}`
                                : "Select date range"}
                            </Button>
                          </PopoverTrigger>

                          <PopoverContent className="w-auto p-0">
                            <CalendarRange
                              value={createdDateRange}
                              onChange={setCreatedDateRange}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* SLA Response Deadline Date Range Filter */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          SLA Response Deadline
                        </label>
                        <div className="flex items-center gap-1">
                          {(slaResponseDeadlineRange.start ||
                            slaResponseDeadlineRange.end) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1 text-xs text-red-500 hover:text-red-600"
                                onClick={() =>
                                  setSlaResponseDeadlineRange({
                                    start: null,
                                    end: null,
                                  })
                                }
                              >
                                Clear
                              </Button>
                            )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-5 w-5 p-0 ${isFilterPinned("slaResponseDeadline") ? "text-primary" : "text-gray-400"}`}
                            onClick={() =>
                              togglePinFilter("slaResponseDeadline")
                            }
                            title={
                              isFilterPinned("slaResponseDeadline")
                                ? "Unpin filter"
                                : "Pin filter to toolbar"
                            }
                          >
                            <Pin
                              className="h-3.5 w-3.5"
                              fill={
                                isFilterPinned("slaResponseDeadline")
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-7 w-full bg-transparent text-xs text-gray-300 px-2"
                            >
                              {slaResponseDeadlineRange.start &&
                                slaResponseDeadlineRange.end
                                ? `${slaResponseDeadlineRange.start} → ${slaResponseDeadlineRange.end}`
                                : "Select SLA response deadline"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarRange
                              value={slaResponseDeadlineRange}
                              onChange={setSlaResponseDeadlineRange}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* SLA Resolution Deadline Date Range Filter */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          SLA Resolution Deadline
                        </label>
                        <div className="flex items-center gap-1">
                          {(slaResolutionDeadlineRange.start ||
                            slaResolutionDeadlineRange.end) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1 text-xs text-red-500 hover:text-red-600"
                                onClick={() =>
                                  setSlaResolutionDeadlineRange({
                                    start: null,
                                    end: null,
                                  })
                                }
                              >
                                Clear
                              </Button>
                            )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-5 w-5 p-0 ${isFilterPinned("slaResolutionDeadline") ? "text-primary" : "text-gray-400"}`}
                            onClick={() =>
                              togglePinFilter("slaResolutionDeadline")
                            }
                            title={
                              isFilterPinned("slaResolutionDeadline")
                                ? "Unpin filter"
                                : "Pin filter to toolbar"
                            }
                          >
                            <Pin
                              className="h-3.5 w-3.5"
                              fill={
                                isFilterPinned("slaResolutionDeadline")
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-7 w-full bg-transparent text-xs text-gray-300 px-2"
                            >
                              {slaResolutionDeadlineRange.start &&
                                slaResolutionDeadlineRange.end
                                ? `${slaResolutionDeadlineRange.start} → ${slaResolutionDeadlineRange.end}`
                                : "Select SLA resolution deadline"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarRange
                              value={slaResolutionDeadlineRange}
                              onChange={setSlaResolutionDeadlineRange}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              {/*Filter Templates Dropdown */}
              <FilterTemplateButton
                templates={ticketFilterTemplates}
                activeTemplateId={activeTemplateId}
                isFilterActive={
                  !!(
                    selectedTicketSpaceFilter ||
                    nameFilter ||
                    descriptionFilter ||
                    codeFilter ||
                    statusFilter.length > 0 ||
                    severityFilter.length > 0 ||
                    ticketTypeFilter.length > 0 ||
                    queueFilter.length > 0 ||
                    assigneeFilter.length > 0 ||
                    participantFilter.length > 0 ||
                    slaResponseDeadlineRange.start ||
                    slaResponseDeadlineRange.end ||
                    slaResolutionDeadlineRange.start ||
                    slaResolutionDeadlineRange.end ||
                    createdDateRange.start ||
                    createdDateRange.end
                  )
                }
                isSaving={isSavingTemplate}
                onSave={saveCurrentAsTicketTemplate}
                onApply={applyTicketFilterTemplate}
                onDelete={deleteTicketFilterTemplate}
              />
            </div>
          </div>
        </div>
      </div>
      <div
        className={`flex-1 ${changeView === "kanban" || changeView === "table" ? "overflow-hidden" : "overflow-y-auto"} bg-background`}
      >
        <div
          className={
            changeView === "kanban"
              ? "px-2 h-full"
              : changeView === "table"
                ? "p-2 h-full flex flex-col"
                : "p-2"
          }
        >
          {isLoading || !hasDataFetched ? (
            <>
              {/* Show view-specific skeleton until data is fetched from backend */}
              {changeView === "card" && <TicketGridSkeleton count={12} />}
              {changeView === "table" && <TicketTableSkeleton rows={10} />}
              {changeView === "kanban" && (
                <TicketKanbanSkeleton columns={5} cardsPerColumn={4} />
              )}
              {changeView === "group" && <TicketGridSkeleton count={12} />}
            </>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardXIcon className="h-16 w-16 mb-4 text-gray-400 dark:text-gray-600" />
              <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">
                No Tickets Found
              </h3>
              <p className="text-muted-foreground mb-4">
                {selectedTicketSpaceFilter
                  ? "Get started by creating your first ticket"
                  : "Please select a ticket space to view and create tickets"}
              </p>
              {/* {canCreate && selectedTicketSpaceFilter && (
                <Button onClick={handleAdd} variant="default">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Ticket
                </Button>
              )} */}
            </div>
          ) : (
            <>
              {/* Grid View - Ticket Cards */}
              {changeView === "card" && (
                <TicketGridView
                  data={filteredData}
                  getIconComponent={getIconComponent}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  onUpdateTicket={handleUpdateTicket}
                  onCardClick={handleEdit}
                  configData={config}
                  isRelationsLoading={isRelationsLoading}
                />
              )}

              {/* Table View */}
              {changeView === "table" && (
                <TicketTableView
                  data={filteredData}
                  getIconComponent={getIconComponent}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  onUpdateTicket={handleUpdateTicket}
                  onRowClick={handleEdit}
                  configData={config}
                  isRelationsLoading={isRelationsLoading}
                />
              )}

              {/* Kanban View */}
              {changeView === "kanban" && <KanbanViewWrapper />}

              {/*/!* Group View *!/*/}
              {/*{changeView === "group" && (*/}
              {/*  <TicketGroupView*/}
              {/*    data={filteredData}*/}
              {/*    relations={relations}*/}
              {/*    configData={configData}*/}
              {/*    getIconComponent={getIconComponent}*/}
              {/*    onEdit={handleEdit}*/}
              {/*    onDelete={handleDeleteClick}*/}
              {/*    onUpdateTicket={handleUpdateTicket}*/}
              {/*    onCardClick={handleEdit}*/}
              {/*  />*/}
              {/*)}*/}
            </>
          )}
        </div>
      </div>

      {/* Pagination */}
      {filteredData.length > 0 && (
        <div className="flex-none border-t bg-background">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-1.5">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} –{" "}
              {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
              {totalRecords} tickets
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
                      prefs.ticketPageSize = newSize;
                      localStorage.setItem("user_view_preferences", JSON.stringify(prefs));
                      createOrUpdateUserConfig(user.id, { viewPreference: prefs }).catch(() => {});
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
                  Page {currentPage} of {Math.ceil(totalRecords / itemsPerPage)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={
                    currentPage >= Math.ceil(totalRecords / itemsPerPage)
                  }
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  ›
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={
                    currentPage >= Math.ceil(totalRecords / itemsPerPage)
                  }
                  onClick={() =>
                    setCurrentPage(Math.ceil(totalRecords / itemsPerPage))
                  }
                >
                  »
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete ticket{" "}
              <strong>{ticketToDelete?.code}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false);
                setTicketToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TicketPage;

