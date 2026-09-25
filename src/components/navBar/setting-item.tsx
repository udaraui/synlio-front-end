"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Search,
  X,
  ExternalLink,
  Folder,
  Lightbulb,
  Flag,
  BotMessageSquare,
} from "lucide-react";
import { usePathname } from "next/navigation";
import insightsConfig from "@/lib/insights-config.json";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTheme } from "next-themes";
import { NavUser } from "./nav-user";
import Notification from "./notification";
import CustomColorPicker from "./color-picker";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@radix-ui/react-dialog";
import { DialogHeader } from "../Dialog";
import { useAuth } from "@/contexts/auth.context";
import { toast } from "sonner";
import { searchTasks } from "@/services/task-management/task.service";
import {
  searchTaskSpaces,
  getTaskSpaceStatusConfig,
  getTaskSpaceSeverityConfig,
} from "@/services/task-management/task-space.service";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { getHierarchyLevelIcon } from "@/enums/space-configure-icon.enum";
import { ParentLevelsHoverCard } from "@/components/common/ParentLevelsHoverCard";

// Icon mapping for hierarchy level icons — use shared enum helper (same as TaskCard)
void Folder; // kept for fallback usage inside getHierarchyLevelIcon

function SettingItem() {
  const [primaryColor, setPrimaryColor] = useState("default");
  const [sidebarColor, setSidebarColor] = useState("default");
  const [isHydrated, setIsHydrated] = useState(false);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  // Find the best matching insight for the current path (longest match wins)
  const currentInsight = pathname
    ? insightsConfig
      .filter((item) => item.show && item.link && pathname.startsWith(item.pathPattern))
      .sort((a, b) => b.pathPattern.length - a.pathPattern.length)[0] ?? null
    : null;
  const {
    user,
    updateTheme: updateThemeBackend,
    updatePrimaryColor: updatePrimaryColorBackend,
    updateSidebarColor: updateSidebarColorBackend,
  } = useAuth();
  const [openColorPicker, setOpenColorPicker] = useState(false);
  const [openSidebarColorPicker, setOpenSidebarColorPicker] = useState(false);

  const sidebarColorOptions = [
    { name: "Default", value: "default" },
    { name: "Gray", value: "#1f2937" },
    { name: "White", value: "#ffffff" },
    { name: "Green", value: "#14532d" },
    { name: "Alto", value: "#e5e7eb" },
    { name: "Purple", value: "#7e22ce" },
  ];

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [taskSpaces, setTaskSpaces] = useState<any[]>([]);

  // Filter state
  const [selectedTaskSpace, setSelectedTaskSpace] = useState<number[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<any[]>([]);
  const [availableSeverities, setAvailableSeverities] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<number[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<number[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Privilege checks
  const canSearchTasks = usePrivilegeGuard("54");
  const canSearchSpaces = usePrivilegeGuard("44");
  const canViewAllSpaces = usePrivilegeGuard("106");

  // Handle theme change with backend sync
  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    if (user?.id) {
      try {
        await updateThemeBackend(newTheme);
      } catch (error) {
        console.error("Failed to save theme to backend:", error);
        toast.error("Failed to save theme preference");
      }
    }
  };

  // Load task spaces for filter
  useEffect(() => {
    if (!canSearchSpaces) return;
    const fetchTaskSpaces = async () => {
      try {
        const filters: any[] = [];
        if (!canViewAllSpaces && user?.id) {
          filters.push({ field: "userId", value: user.id, matchMode: "member" });
        }

        const response = await searchTaskSpaces({
          first: 0,
          rows: 100,
          filters,
          multiSorts: [{ field: "name", order: 1 }],
        });
        setTaskSpaces(response.data || []);
      } catch (error) {
        console.error("Error loading project spaces:", error);
      }
    };
    fetchTaskSpaces();
  }, [canSearchSpaces, canViewAllSpaces, user?.id]);

  // Load status + severity configs whenever selected spaces change
  useEffect(() => {
    if (selectedTaskSpace.length === 0) {
      setAvailableStatuses([]);
      setAvailableSeverities([]);
      setSelectedStatus([]);
      setSelectedSeverity([]);
      return;
    }
    const load = async () => {
      try {
        const [statusResults, severityResults] = await Promise.all([
          Promise.all(
            selectedTaskSpace.map(async (id) => {
              try {
                const res = await getTaskSpaceStatusConfig(id);
                // API returns { statuses, availableStatuses } — use whichever is populated
                return res.statuses?.length > 0
                  ? res.statuses
                  : (res.availableStatuses ?? []);
              } catch {
                return [];
              }
            })
          ),
          Promise.all(
            selectedTaskSpace.map(async (id) => {
              try {
                const res = await getTaskSpaceSeverityConfig(id);
                // API returns { severities, availableSeverities }
                return res.severities?.length > 0
                  ? res.severities
                  : (res.availableSeverities ?? []);
              } catch {
                return [];
              }
            })
          ),
        ]);
        const uniqueStatuses = Array.from(
          new Map(statusResults.flat().map((s: any) => [s.id, s])).values()
        );
        const uniqueSeverities = Array.from(
          new Map(severityResults.flat().map((s: any) => [s.id, s])).values()
        );
        setAvailableStatuses(uniqueStatuses);
        setAvailableSeverities(uniqueSeverities);
        // Auto-select all statuses and severities from the chosen space(s)
        setSelectedStatus(uniqueStatuses.map((s: any) => s.id));
        setSelectedSeverity(uniqueSeverities.map((s: any) => s.id));
      } catch (err) {
        console.error("Failed to load space status/severity config:", err);
      }
    };
    void load();
  }, [selectedTaskSpace]);

  // Load recent tasks (last 5 updated)
  const loadRecentTasks = useCallback(async () => {
    setIsSearching(true);
    try {
      const filters: any[] = [];

      if (selectedTaskSpace.length > 0) {
        filters.push({ field: "taskSpaceId", value: selectedTaskSpace, matchMode: "in" });
      }
      if (selectedStatus.length > 0) {
        filters.push({ field: "statusId", value: selectedStatus, matchMode: "in" });
      }
      if (selectedSeverity.length > 0) {
        filters.push({ field: "severityId", value: selectedSeverity, matchMode: "in" });
      }

      const response = await searchTasks({
        first: 0,
        rows: 5,
        filters,
        multiSorts: [{ field: "updatedAt", order: -1 }],
      });

      setSearchResults(response.data || []);
    } catch (error) {
      console.error("Error loading recent tasks:", error);
      toast.error("Failed to load recent tasks");
    } finally {
      setIsSearching(false);
    }
  }, [selectedTaskSpace, selectedStatus, selectedSeverity]);

  // Load initial 5 latest updated tasks on mount
  useEffect(() => {
    if (canSearchTasks) {
      loadRecentTasks();
    }
  }, [canSearchTasks, loadRecentTasks]);

  // Search tasks with debounce
  const handleSearchTasks = useCallback(
    async (term: string) => {
      if (!term.trim()) {
        loadRecentTasks();
        return;
      }

      setIsSearching(true);
      try {
        const filters: any[] = [
          { field: "name", value: term, matchMode: "contains" },
        ];

        if (selectedTaskSpace.length > 0) {
          filters.push({ field: "taskSpaceId", value: selectedTaskSpace, matchMode: "in" });
        }
        if (selectedStatus.length > 0) {
          filters.push({ field: "statusId", value: selectedStatus, matchMode: "in" });
        }
        if (selectedSeverity.length > 0) {
          filters.push({ field: "severityId", value: selectedSeverity, matchMode: "in" });
        }

        const response = await searchTasks({
          first: 0,
          rows: 10,
          filters,
          multiSorts: [{ field: "createdAt", order: -1 }],
        });

        setSearchResults(response.data || []);
      } catch (error) {
        console.error("Error searching tasks:", error);
        toast.error("Failed to search tasks");
      } finally {
        setIsSearching(false);
      }
    },
    [selectedTaskSpace, selectedStatus, selectedSeverity, loadRecentTasks],
  );

  // Debounce search (only when dropdown is visible)
  useEffect(() => {
    if (!showSearchDropdown) return;
    const timer = setTimeout(() => {
      handleSearchTasks(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Re-search when filters change
  useEffect(() => {
    if (showSearchDropdown) {
      if (searchTerm.trim()) {
        handleSearchTasks(searchTerm);
      } else {
        loadRecentTasks();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaskSpace, selectedStatus, selectedSeverity]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchDropdown(false);
        setTimeout(() => {
          setSearchTerm("");
          loadRecentTasks();
          clearFilters();
        }, 150);
      }
    };

    if (showSearchDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSearchDropdown, loadRecentTasks]);

  useEffect(() => {
    if (!showSearchDropdown) {
      setSearchTerm("");
    }
  }, [showSearchDropdown]);

  // Handle task selection — TM task form route
  const handleTaskClick = (taskId: number) => {
    router.push(`/task-management/task/form?id=${taskId}`);
    setShowSearchDropdown(false);
    setSearchTerm("");
    setSearchResults([]);
  };

  const clearFilters = () => {
    setSelectedTaskSpace([]);
    setSelectedStatus([]);
    setSelectedSeverity([]);
  };

  // Color options
  const colorOptions = [
    { name: "Default", value: "default" },
    { name: "Green", value: "#10b981" },
    { name: "Slate", value: "#475569" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Purple", value: "#a855f7" },
    { name: "Red", value: "#ef4444" },
  ];

  function getReadableColor(bgColor: string) {
    let L = 1;
    if (bgColor.startsWith("oklch")) {
      const match = bgColor.match(/oklch\(([\d.]+)\s[\d.]+\s[\d.]+\)/);
      if (match) L = parseFloat(match[1]);
    } else if (bgColor.startsWith("#")) {
      const r = parseInt(bgColor.slice(1, 3), 16) / 255;
      const g = parseInt(bgColor.slice(3, 5), 16) / 255;
      const b = parseInt(bgColor.slice(5, 7), 16) / 255;
      L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    return L > 0.5 ? "oklch(0 0 0)" : "oklch(0.985 0 0)";
  }

  useEffect(() => {
    setIsHydrated(true);
    const savedColor = localStorage.getItem("primary-color");
    if (savedColor) {
      setPrimaryColor(savedColor);
      applyPrimaryColor(savedColor);
    } else {
      setPrimaryColor("default");
      applyPrimaryColor("default");
    }
  }, []);

  useEffect(() => {
    const savedSidebarColor = localStorage.getItem("sidebar-color");
    if (savedSidebarColor && savedSidebarColor !== "default") {
      setSidebarColor(savedSidebarColor);
      applySidebarColor(savedSidebarColor);
    } else {
      setSidebarColor("default");
      applySidebarColor("default");
    }
  }, []);

  const applySidebarColor = (color: string) => {
    const root = document.documentElement;
    if (color === "default") {
      root.style.removeProperty("--sidebar");
      root.style.removeProperty("--sidebar-foreground");
      return;
    }
    root.style.setProperty("--sidebar", color);
    root.style.setProperty("--sidebar-foreground", getReadableColor(color));
  };

  const handleSidebarColorChange = async (color: string) => {
    setSidebarColor(color);
    applySidebarColor(color);
    localStorage.setItem("sidebar-color", color);
    localStorage.setItem("sidebar-foreground", getReadableColor(color));

    if (user?.id) {
      try {
        await updateSidebarColorBackend(color);
      } catch (error) {
        console.error("Failed to save sidebar color to backend:", error);
        toast.error("Failed to save sidebar color preference");
      }
    }
  };

  const applyPrimaryColor = (color: string) => {
    const root = document.documentElement;
    if (color === "default") {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-foreground");
      return;
    }
    root.style.setProperty("--primary", color);
    root.style.setProperty("--primary-foreground", getReadableColor(color));
  };

  const handleColorChange = async (color: string) => {
    setPrimaryColor(color);
    applyPrimaryColor(color);
    localStorage.setItem("primary-color", color);
    if (user?.id) {
      try {
        await updatePrimaryColorBackend(color);
      } catch (error) {
        console.error("Failed to save primary color to backend:", error);
        toast.error("Failed to save color preference");
      }
    }
  };

  return (
    <>
      <div className="flex-1">
        <div className="flex justify-end items-center">
          {/* Search Bar with Dropdown */}
          <div className="relative" ref={searchRef}>
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Search task"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={() => {
                  setShowSearchDropdown(true);
                  setSearchTerm("");
                }}
                className="pl-9 pr-10 py-1.5 text-sm bg-white dark:bg-gray-900 border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground w-64 transition-all"
              />
              {searchTerm && (
                <X
                  className="absolute right-2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => {
                    setSearchTerm("");
                    setSearchResults([]);
                    setShowSearchDropdown(false);
                  }}
                />
              )}
            </div>

            {/* Search Dropdown with Side Panel Layout */}
            {showSearchDropdown && (
              <div className="absolute top-full mt-2 right-0 w-[660px] bg-popover border border-border rounded-lg shadow-lg z-50 max-h-[500px] overflow-hidden flex">
                {/* Results Section (Left Side) */}
                <div className="flex-1 overflow-y-auto flex flex-col">
                  {/* Header */}
                  {!isSearching && searchResults.length > 0 && (
                    <div className="px-3 py-2 border-b border-border bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground">
                        {searchTerm.trim()
                          ? `Search Results (${searchResults.length})`
                          : `Recent Tasks (${searchResults.length})`}
                      </p>
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          Searching...
                        </div>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                        <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No tasks found
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Try adjusting your search or filters
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {searchResults.map((task) => {
                          const HierarchyIcon = task.hierarchyLevelIcon
                            ? getHierarchyLevelIcon(task.hierarchyLevelIcon)
                            : Folder;
                          const resolvedStatus =
                            task.statusName ? { name: task.statusName, color: task.statusColor } :
                              task.status ??
                              (task.statusId ? availableStatuses.find((s: any) => s.id === task.statusId) : null);
                          const resolvedSeverity =
                            task.severityName ? { name: task.severityName, color: task.severityColor } :
                              task.severity ??
                              (task.severityId ? availableSeverities.find((s: any) => s.id === task.severityId) : null);

                          return (
                            <div
                              key={task.id}
                              onClick={() => handleTaskClick(task.id)}
                              className="px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors group"
                            >
                              {/* Line 1: Icon · Code · Title */}
                              <div className="flex items-center gap-2 mb-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="shrink-0">
                                      <HierarchyIcon
                                        className="w-3.5 h-3.5 flex-shrink-0"
                                        style={{ color: task.hierarchyLevelColor || "#6B7280" }}
                                      />
                                    </span>
                                  </TooltipTrigger>
                                  {task.hierarchyLevelName && (
                                    <TooltipContent side="top" className="text-xs">
                                      {task.hierarchyLevelName}
                                    </TooltipContent>
                                  )}
                                </Tooltip>

                                {task.code && (
                                  <ParentLevelsHoverCard
                                    id={task.id}
                                    postType="Task"
                                    code={task.code}
                                    className="text-xs font-semibold tracking-wide shrink-0"
                                  />
                                )}

                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
                                  {task.name}
                                </span>

                                {/* Open-in-new-tab — fades in on hover */}
                                <a
                                  href={`/task-management/task/form?id=${task.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
                                  title="Open in new tab"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>

                              {/* Line 2: Description (HTML stripped) */}
                              {task.description && (
                                <p
                                  className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-1.5 pl-[22px]"
                                  dangerouslySetInnerHTML={{
                                    __html: task.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
                                  }}
                                  style={{ pointerEvents: "none" }}
                                />
                              )}

                              {/* Line 3: Severity (left) · Status badge (right) */}
                              <div className="flex items-center gap-2">
                                {/* Severity — Flag icon filled with color, gray border (matches InlineEditableTaskSeverity trigger) */}
                                <div className="flex items-center">
                                  {resolvedSeverity ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium">
                                      <Flag
                                        className="w-3 h-3 flex-shrink-0"
                                        fill={resolvedSeverity.color}
                                        style={{ color: resolvedSeverity.color }}
                                      />
                                      <span className="text-gray-700 dark:text-gray-300">{resolvedSeverity.name}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium">
                                      <Flag className="w-3 h-3 flex-shrink-0 text-gray-400" />
                                      <span className="text-gray-400 italic">No priority</span>
                                    </span>
                                  )}
                                </div>

                                {/* Status — colored dot, gray border (matches InlineEditableTaskStatus trigger) */}
                                <div className="flex items-center">
                                  {resolvedStatus ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium max-w-[140px] min-w-0">
                                      <div
                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: resolvedStatus.color }}
                                      />
                                      <span className="text-gray-700 dark:text-gray-300 truncate whitespace-nowrap">{resolvedStatus.name}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium">
                                      <span className="text-gray-400 italic whitespace-nowrap">No status</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Filters Side Panel (Right Side) */}
                <div className="w-56 border-l border-border bg-muted/20 flex flex-col">
                  {/* Header */}
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-semibold uppercase tracking-wide">
                        Filters
                      </h4>
                      {(selectedTaskSpace.length > 0 || selectedStatus.length > 0 || selectedSeverity.length > 0) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="h-5 text-[10px] px-2"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    {searchResults.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {searchResults.length} result
                        {searchResults.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  {/* Filter Content - Scrollable */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-4">
                    {/* Task Space Filter */}
                    <div>
                      <label className="text-xs font-medium mb-2 block">
                        Space
                      </label>
                      <div className="space-y-1.5">
                        {taskSpaces.map((space) => (
                          <label
                            key={space.id}
                            className="flex items-center gap-2 cursor-pointer group"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTaskSpace.includes(space.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTaskSpace([...selectedTaskSpace, space.id]);
                                } else {
                                  setSelectedTaskSpace(
                                    selectedTaskSpace.filter((id) => id !== space.id),
                                  );
                                }
                              }}
                              className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                            <span className="text-xs group-hover:text-primary transition-colors truncate">
                              {space.name}
                            </span>
                          </label>
                        ))}
                        {taskSpaces.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">
                            No spaces available
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status + Severity — side-by-side two-column grid, appears after a space is selected */}
                    {selectedTaskSpace.length > 0 && (availableStatuses.length > 0 || availableSeverities.length > 0) && (
                      <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                        {/* Status column */}
                        <div>
                          <label className="text-xs font-medium mb-2 block">Status</label>
                          <div className="space-y-1.5">
                            {availableStatuses.map((status: any) => (
                              <label key={status.id} className="flex items-center gap-1.5 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={selectedStatus.includes(status.id)}
                                  onChange={(e) => {
                                    setSelectedStatus(e.target.checked
                                      ? [...selectedStatus, status.id]
                                      : selectedStatus.filter((id) => id !== status.id));
                                  }}
                                  className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                                />
                                <span className="flex items-center gap-1 text-[10px] group-hover:text-primary transition-colors truncate">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: status.color || "#6b7280" }}
                                  />
                                  <span className="truncate">{status.name}</span>
                                </span>
                              </label>
                            ))}
                            {availableStatuses.length === 0 && (
                              <p className="text-[10px] text-muted-foreground italic">None</p>
                            )}
                          </div>
                        </div>

                        {/* Severity column */}
                        <div>
                          <label className="text-xs font-medium mb-2 block">Severity</label>
                          <div className="space-y-1.5">
                            {availableSeverities.map((severity: any) => (
                              <label key={severity.id} className="flex items-center gap-1.5 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={selectedSeverity.includes(severity.id)}
                                  onChange={(e) => {
                                    setSelectedSeverity(e.target.checked
                                      ? [...selectedSeverity, severity.id]
                                      : selectedSeverity.filter((id) => id !== severity.id));
                                  }}
                                  className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                                />
                                <span className="flex items-center gap-1 text-[10px] group-hover:text-primary transition-colors truncate">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: severity.color || "#6b7280" }}
                                  />
                                  <span className="truncate">{severity.name}</span>
                                </span>
                              </label>
                            ))}
                            {availableSeverities.length === 0 && (
                              <p className="text-[10px] text-muted-foreground italic">None</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notification dropdown trigger */}
          <div className="ml-[5px]">
            <Notification />
          </div>

          {/* Settings drawer trigger */}
          <Sheet modal={true}>
            <Tooltip>
              <TooltipTrigger asChild>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="ml-0 cursor-pointer"
                    onPointerDown={(e) => e.currentTarget.blur()}
                    onClick={(e) => e.currentTarget.blur()}
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Theme Settings</p>
              </TooltipContent>
            </Tooltip>
            <SheetContent onCloseAutoFocus={(e) => e.preventDefault()}>
              <div className="mx-auto w-full max-w-sm p-4">
                <SheetHeader className="px-0">
                  <SheetTitle className="font-xl">Theme Settings</SheetTitle>
                  <SheetDescription>Customize your synlio experience</SheetDescription>
                </SheetHeader>
                {/* THEME SETTINGS */}
                <div className="space-y-2 mt-4 text-start grid grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    className={cn("w-full", isHydrated && theme === "light" ? "border-2 border-primary text-primary" : "")}
                    onClick={() => handleThemeChange("light")}
                  >
                    <Sun className={cn("h-4 w-4", isHydrated && theme === "light" ? "text-primary" : "")} /> Light
                  </Button>

                  <Button
                    variant="outline"
                    className={cn("w-full", isHydrated && theme === "dark" ? "border-2 border-primary text-primary" : "")}
                    onClick={() => handleThemeChange("dark")}
                  >
                    <Moon className={cn("h-4 w-4", isHydrated && theme === "dark" ? "text-primary" : "")} /> Dark
                  </Button>

                  <Button
                    variant="outline"
                    className={cn("w-full", isHydrated && theme === "system" ? "border-2 border-primary text-primary" : "")}
                    onClick={() => handleThemeChange("system")}
                  >
                    <Monitor className={cn("h-4 w-4", isHydrated && theme === "system" ? "text-primary" : "")} /> System
                  </Button>
                </div>
                {/* PRIMARY COLOR */}
                <div className="mt-6">
                  <p className="text-sm font-semibold mb-2">Primary Color</p>
                  <div className="grid grid-cols-3 gap-2">
                    {colorOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant="outline"
                        onClick={() => handleColorChange(option.value)}
                        className={cn(
                          "flex items-center gap-2 justify-start",
                          isHydrated && primaryColor === option.value
                            ? "border-2 border-primary" // Highlight selected color
                            : "bg-transparent",
                        )}
                      >
                        <span
                          className={cn(
                            "h-4 w-4 rounded-full border border-border",
                          )}
                          style={{
                            backgroundColor:
                              option.value !== "default"
                                ? option.value
                                : "oklch(71.443% 0.12133 240.504)", // The exact default blue
                          }}
                        />
                        {option.name}
                      </Button>
                    ))}

                    <div>
                      <Dialog
                        open={openColorPicker}
                        onOpenChange={setOpenColorPicker}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "flex items-center gap-2 justify-start border-dashed border-2",
                              isHydrated &&
                                !colorOptions.some(
                                  (o) => o.value === primaryColor,
                                )
                                ? "border-primary" // Highlight selected custom color
                                : "bg-transparent", // Default bg for predefined colors
                            )}
                          >
                            <span
                              className="h-4 w-4 rounded-full border border-gray-400"
                              style={{
                                backgroundColor: !colorOptions.some(
                                  (o) => o.value === primaryColor,
                                )
                                  ? primaryColor
                                  : "transparent",
                              }}
                            />
                            Custom
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="p-0 w-full right-0 h-52 absolute">
                          <DialogHeader className="p-4 pt-1 pb-2">
                            <DialogTitle className="hidden">
                              Pick a custom color
                            </DialogTitle>
                          </DialogHeader>
                          <CustomColorPicker
                            onChange={(color: string) => {
                              applyPrimaryColor(color); // Update theme colors
                              setPrimaryColor(color); // Update state
                              localStorage.setItem("primary-color", color); // Persist color
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
                {/* SIDEBAR SETTINGS */}
                <div className="mt-6 mb-2">
                  <p className="text-sm font-semibold mb-2">Sidebar Color</p>
                  <div className="grid grid-cols-3 gap-2">
                    {sidebarColorOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant="outline"
                        onClick={() => handleSidebarColorChange(option.value)}
                        className={cn(
                          "flex items-center gap-2 justify-start",
                          isHydrated && sidebarColor === option.value
                            ? "border-2 border-primary"
                            : "bg-transparent",
                        )}
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-border"
                          style={{
                            backgroundColor:
                              option.value !== "default"
                                ? option.value
                                : "hsl(213, 53%, 20%)", // Default sidebar color
                          }}
                        />
                        {option.name}
                      </Button>
                    ))}
                    <div>
                      <Dialog
                        open={openSidebarColorPicker}
                        onOpenChange={setOpenSidebarColorPicker}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "flex items-center gap-2 justify-start border-dashed border-2",
                              isHydrated &&
                                !sidebarColorOptions.some(
                                  (o) => o.value === sidebarColor,
                                )
                                ? "border-primary"
                                : "bg-transparent",
                            )}
                          >
                            <span
                              className="h-4 w-4 rounded-full border border-gray-400"
                              style={{
                                backgroundColor: !sidebarColorOptions.some(
                                  (o) => o.value === sidebarColor,
                                )
                                  ? sidebarColor
                                  : "transparent",
                              }}
                            />
                            Custom
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="p-0 w-full right-0 h-52 absolute">
                          <DialogHeader className="p-4 pt-1 pb-2">
                            <DialogTitle className="hidden">
                              Pick a custom color
                            </DialogTitle>
                          </DialogHeader>

                          <CustomColorPicker
                            onChange={async (color: string) => {
                              handleSidebarColorChange(color);
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Insights button - 0px margin + 20px total ghost padding = 20px visual gap */}
          {currentInsight && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-0 cursor-pointer"
                  onClick={() => window.open(currentInsight.link, "_blank")}
                >
                  <Lightbulb className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to get insights about {currentInsight.process}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Ask AI button */}
          {/* <Button
            variant="outline"
            size="sm"
            className="text-sm ml-[5px] cursor-pointer rounded-md hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
          >
            <BotMessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Ask AI
            </span>
          </Button> */}
          {/* NavUser */}
          <div className="ml-[5px]">
            <NavUser />
          </div>
        </div>
      </div>
    </>
  );
}

export default SettingItem;
