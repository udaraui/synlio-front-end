"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBreadcrumbsEffect } from "@/hooks/useBreadcrumbsEffect";
import { useViewPreference } from "@/hooks/use-view-preference";
import { toast } from "sonner";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { useAuth } from "@/contexts/auth.context";
import {
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
  TableProperties,
  ClipboardXIcon,
  Pointer
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskSpaceForm } from "./components/TaskSpaceForm";
import TaskSpaceGridView from "./components/TaskSpaceGridView";
import TaskSpaceTableView from "./components/TaskSpaceTableView";
import {
  TaskSpaceGridSkeleton,
  TaskSpaceTableSkeleton,
} from "./components/TaskSpaceSkeletons";
import {
  searchTaskSpaces,
  getBulkTaskStatusCounts,
  toggleTaskSpaceStatus,
} from "@/services/task-management/task-space.service";
import DeleteModal from "@/components/DeleteModal";
import { safeParse } from "@/services/auth/auth-service";

function Page() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = searchParams.get("meetingId");
  const activityId = searchParams.get("activityId");
  const activityTitle = searchParams.get("activityTitle");
  const isLinkMode = !!(meetingId || activityId);
  const [nameTerm, setNameTerm] = useState("");
  const [descTerm, setDescTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const canView = usePrivilegeGuard("44") as boolean;
  const canCreate = usePrivilegeGuard("45") as boolean;
  const canEdit = usePrivilegeGuard("46") as boolean;
  const canDelete = usePrivilegeGuard("50") as boolean;
  const canViewAllSpaces = usePrivilegeGuard("106") as boolean;
  const canCreateTask = usePrivilegeGuard("55") as boolean;
  const canViewTask = usePrivilegeGuard("54") as boolean;
  const [isLoading, setIsLoading] = useState(false);
  const [hasDataFetched, setHasDataFetched] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [changeView, setChangeView] = useViewPreference(
    "task-space",
    ["card", "table"],
    "card",
    user?.id,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [statusCountsBySpace, setStatusCountsBySpace] = useState<
    Record<number, any[]>
  >({});
  const [levelNamesBySpace, setLevelNamesBySpace] = useState<
    Record<number, string>
  >({});
  const [isCountsLoading, setIsCountsLoading] = useState(false);

  const isFetchingRef = React.useRef(false);
  const lastFetchParamsRef = React.useRef<string>("");

  const currentData = data;

  useBreadcrumbsEffect([{ label: "Project Space", isCurrentPage: true }]);

  useEffect(() => {
    sessionStorage.removeItem("tm-task-table-expanded-state");
    sessionStorage.removeItem("tmTaskPageFilters");
  }, []);

  const fetchData = React.useCallback(async () => {
    if (!canView || !user?.id) return;

    const companyId = safeParse(localStorage.getItem("active_company"));

    const fetchKey = JSON.stringify({
      canViewAllSpaces,
      userId: user.id,
      nameTerm,
      descTerm,
      currentPage,
      itemsPerPage,
      companyId: companyId?.companyId ?? null,
    });
    if (isFetchingRef.current && lastFetchParamsRef.current === fetchKey)
      return;

    isFetchingRef.current = true;
    lastFetchParamsRef.current = fetchKey;
    setIsLoading(true);

    try {
      const filters: any[] = [];
      if (!canViewAllSpaces)
        filters.push({ field: "userId", value: user.id, matchMode: "member" });
      if (nameTerm)
        filters.push({ field: "name", value: nameTerm, matchMode: "contains" });
      if (descTerm)
        filters.push({
          field: "description",
          value: descTerm,
          matchMode: "contains",
        });


      const result = await searchTaskSpaces({
        first: (currentPage - 1) * itemsPerPage,
        rows: itemsPerPage,
        filters,
        sortField: "id",
        sortOrder: 1,
        skipActiveFilter: true,
      });

      // ── Phase 1 ─────────────────────────────────────────────────────────
      // Render cards/rows immediately: name, prefix, description, active state
      setData(result.data || []);
      setTotalRecords(result.total || 0);

      // ── Phase 2 ─────────────────────────────────────────────────────────
      // ONE bulk request for all space status counts — fire-and-forget
      if (result.data?.length > 0) {
        setStatusCountsBySpace({});
        setLevelNamesBySpace({});
        setIsCountsLoading(true);
        const spaceIds = result.data.map((s: any) => s.id);
        (async () => {
          try {
            const [bulk] = await Promise.all([getBulkTaskStatusCounts(spaceIds)]);
            const countsMap: Record<number, any[]> = {};
            const levelNamesMap: Record<number, string> = {};
            Object.entries(bulk).forEach(([id, val]) => {
              countsMap[Number(id)] = val.counts;
              if (val.hierarchyLevelName)
                levelNamesMap[Number(id)] = val.hierarchyLevelName;
            });
            setStatusCountsBySpace(countsMap);
            setLevelNamesBySpace(levelNamesMap);
          } catch {
            // non-critical — badges just won't show
          } finally {
            setIsCountsLoading(false);
          }
        })();
      } else {
        setStatusCountsBySpace({});
        setLevelNamesBySpace({});
        setIsCountsLoading(false);
      }
    } catch (error) {
      console.error("Error fetching project spaces:", error);
      toast.error("Failed to fetch project spaces");
      setData([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
      setHasDataFetched(true);
      isFetchingRef.current = false;
    }
  }, [
    canView,
    canViewAllSpaces,
    user?.id,
    nameTerm,
    descTerm,
    currentPage,
    itemsPerPage,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (id: number) => {
    setEditingId(id);
    setIsEditing(true);
  };
  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
    setDeleteConfirmOpen(true);
  };

  const handleToggleStatus = async (id: number) => {
    try {
      const result = await toggleTaskSpaceStatus(id);
      setData((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: result.isActive } : s))
      );
      toast.success(result.isActive ? "Project space activated" : "Project space inactivated");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update project space status");
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const { deleteTaskSpace } =
        await import("@/services/task-management/task-space.service");
      await deleteTaskSpace(deleteConfirmId);
      toast.success("Project space deleted");
      await fetchData();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to delete project space",
      );
    } finally {
      setDeleteConfirmId(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleConfigure = (id: number) =>
    router.push(`/task-management/task-space/configure/${id}`);

  const handleSpaceUpdate = async (space: any, action: "create" | "edit") => {
    if (action === "create") {
      setData((prev) => [space, ...prev]);
      setTotalRecords((prev) => prev + 1);
      getBulkTaskStatusCounts([space.id]).then((bulk) => {
        const val = bulk[space.id];
        if (val) {
          setStatusCountsBySpace((prev) => ({ ...prev, [space.id]: val.counts }));
          if (val.hierarchyLevelName)
            setLevelNamesBySpace((prev) => ({ ...prev, [space.id]: val.hierarchyLevelName! }));
        }
      }).catch(() => { });
    } else {
      setData((prev) => prev.map((s) => (s.id === space.id ? space : s)));
    }
  };

  const totalPages = Math.ceil(totalRecords / itemsPerPage);

  return (
    <div className="flex flex-col h-[calc(100vh-28px)]">
      {/* Header */}
      <div className="flex-none pt-9 pb-1 bg-background">
        <div className="px-3 pt-2 pb-0">
          <div className="flex items-center gap-1.5">
            {canCreate && !isLinkMode && (
              <Button
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="w-3.5 h-3.5" /> Add Space
              </Button>
            )}
            {isLinkMode && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                disabled={true}
              >
                <Pointer className="w-3.5 h-3.5" /> Select a Project Space
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className={`h-7 w-7 p-0 ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={fetchData}
              disabled={isLoading}
              title={isLoading ? "Loading" : "Refresh"}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>

            <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

            <div className="flex gap-1 bg-background border border-border rounded-sm shrink-0 items-center h-7">
              <Button
                size="sm"
                variant={changeView === "card" ? "default" : "ghost"}
                className={`h-full text-xs shadow-none ${changeView === "card" ? "px-2.5" : "px-2"}`}
                onClick={() => setChangeView("card")}
                title="Switch to Grid View"
              >
                <LayoutGrid className={`w-3.5 h-3.5 ${changeView === "card" ? "mr-1" : ""}`} />
                {changeView === "card" && "Grid"}
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
            </div>

            <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

            <div className="flex gap-1.5 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                <Input
                  placeholder="Name"
                  value={nameTerm}
                  onChange={(e) => {
                    setNameTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-7 pl-7 text-xs shadow-none border border-border placeholder:text-xs"
                />
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                <Input
                  placeholder="Description"
                  value={descTerm}
                  onChange={(e) => {
                    setDescTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-7 pl-7 text-xs border border-border shadow-none placeholder:text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`px-0.5 flex-1 ${changeView === "table" ? "overflow-hidden" : "overflow-y-auto"} bg-background`}>
        <div className={`p-2 ${changeView === "table" ? "h-full" : ""}`}>
          {isLoading || !hasDataFetched ? (
            <>
              {changeView === "card" && <TaskSpaceGridSkeleton count={12} />}
              {changeView === "table" && <TaskSpaceTableSkeleton rows={10} />}
            </>
          ) : currentData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardXIcon className="h-16 w-16 mb-4 text-gray-400 dark:text-gray-600" />
              <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">
                No Project Spaces Found
              </h3>
              <p className="text-muted-foreground mb-4">
                {nameTerm || descTerm
                  ? "No project spaces match your search criteria"
                  : "Get started by creating your first project space"}
              </p>
              {/* {canCreate && !nameTerm && !descTerm && (
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Create Project Space
                </Button>
              )} */}
            </div>
          ) : (
            <>
              {changeView === "card" && (
                <TaskSpaceGridView
                  dataArr={currentData}
                  onEditData={handleEdit}
                  onDelete={handleDelete}
                  onToggleStatus={canEdit ? handleToggleStatus : undefined}
                  onConfigure={(!isLinkMode && canEdit) ? handleConfigure : undefined}
                  onCreate={(id) => {
                    const meetingName = searchParams.get('meetingName');
                    router.push(
                      `/task-management/task?taskSpaceId=${id}&fromSpace=1${meetingId ? `&meetingId=${meetingId}` : ''}${meetingName ? `&meetingName=${encodeURIComponent(meetingName)}` : ''}${activityId ? `&activityId=${activityId}` : ''}${activityTitle ? `&activityTitle=${encodeURIComponent(activityTitle)}` : ''}`,
                    );
                  }}
                  statusCountsBySpace={statusCountsBySpace}
                  levelNamesBySpace={levelNamesBySpace}
                  isCountsLoading={isCountsLoading}
                  canEdit={isLinkMode ? false : canEdit}
                  canDelete={isLinkMode ? false : canDelete}
                  canCreate={isLinkMode ? false : canCreateTask}
                  canViewTask={canViewTask}
                  hideActionButtons={isLinkMode}
                />
              )}
              {changeView === "table" && (
                <TaskSpaceTableView
                  dataArr={currentData}
                  onEditData={handleEdit}
                  onDelete={handleDelete}
                  onToggleStatus={canEdit ? handleToggleStatus : undefined}
                  onConfigure={(!isLinkMode && canEdit) ? handleConfigure : undefined}
                  onCreate={(id) => {
                    const meetingName = searchParams.get('meetingName');
                    router.push(
                      `/task-management/task?taskSpaceId=${id}&fromSpace=1${meetingId ? `&meetingId=${meetingId}` : ''}${meetingName ? `&meetingName=${encodeURIComponent(meetingName)}` : ''}${activityId ? `&activityId=${activityId}` : ''}${activityTitle ? `&activityTitle=${encodeURIComponent(activityTitle)}` : ''}`,
                    );
                  }}
                  statusCountsBySpace={statusCountsBySpace}
                  levelNamesBySpace={levelNamesBySpace}
                  isCountsLoading={isCountsLoading}
                  canCreate={isLinkMode ? false : canCreateTask}
                  canEdit={isLinkMode ? false : canEdit}
                  canDelete={isLinkMode ? false : canDelete}
                  canViewTask={canViewTask}
                  hideActionButtons={isLinkMode}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Pagination */}
      {currentData.length > 0 && (
        <div className="flex-none border-t bg-background">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-1.5">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} –
              {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
              {totalRecords} project spaces
            </span>
            <div className="flex items-center gap-3">
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(parseInt(value));
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

      {/* Form dialog */}
      <TaskSpaceForm
        open={isCreating || isEditing}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false);
            setIsEditing(false);
            setEditingId(null);
          }
        }}
        onUpdate={handleSpaceUpdate}
        type={isCreating ? "create" : "edit"}
        id={editingId || undefined}
      />

      <DeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onDelete={confirmDelete}
        title="Delete Project Space"
        description="Are you sure you want to delete this project space? This action cannot be undone."
      />
    </div>
  );
}

export default Page;
