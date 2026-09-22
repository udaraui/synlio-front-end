"use client";
import { ResourcePoolTableSkeleton, ResourcePoolGridSkeleton } from "./components/ResourcePoolSkeletons";
import { useState, useEffect } from "react";
import {
  // List, // unused — list view hidden
  RefreshCw,
  Search,
  Contact,
  TableProperties,
  LayoutGrid,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { useViewPreference } from "@/hooks/use-view-preference";
import { useAuth } from "@/contexts/auth.context";
import { loadResourcePools } from "@/services/resource-pool-service";
import GridView from "./components/gridView";
import ResourcePoolMultiStepForm from "./components/form";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
// List view hidden — see notes below. Keeping the import commented for a quick re-enable.
// import ListView, { ResourcePoolListSkeleton } from "@/app/(pages)/resource/pools/components/listView";
import ResourcePoolViewModal from "@/app/(pages)/resource/pools/components/viewModel";
import ResourceGroupTableView from "@/app/(pages)/resource/pools/components/tableView";

function Page() {
  const { setBreadcrumbs } = useBreadcrumb();
  const { logout, user } = useAuth();
  const [resourcePool, setResourcePool] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasDataFetched, setHasDataFetched] = useState(false);
  const [changeView, setChangeView] = useViewPreference(
    "resource-pools",
    ["card", /* "list", */ "table"], // List view hidden
    "card",
    user?.id,
  );
  const [selectedResourcePool, setSelectedResourcePool] = useState<any>(0);
  const [openViewMode, setOpenViewMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [debouncedResourcePoolTerm, setDebouncedResourcePoolTerm] =
    useState("");
  const [isCreatingResource, setIsCreatingResource] = useState(false);
  const [isEditingResourcePool, setIsEditingResourcePool] = useState(false);
  const [editingResourcePool, setEditingResourcePool] = useState<any>(null);
  const [debouncedResourceStatusTerm, setDebouncedResourceStatusTerm] =
    useState("");
  const [totalRecords, setTotalRecords] = useState(0);

  const useServerPagination = true;

  const canViewResource = usePrivilegeGuard("42") as boolean;
  const canCreateResource = usePrivilegeGuard("52") as boolean;
  const totalPages = useServerPagination
    ? Math.ceil(totalRecords / itemsPerPage)
    : Math.ceil(resourcePool.length / itemsPerPage);

  const currentResources = useServerPagination
    ? resourcePool
    : resourcePool.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
      );

  // Set initial breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      {
        label: "Resource Group",
        href: "/resource/pools",
        isCurrentPage: true,
      },
    ]);
  }, [setBreadcrumbs]);

  const fetchResources = async () => {
   let activeCompanyId = null;
    try {
      const activeCompanyStr = localStorage.getItem("active_company");
      if (activeCompanyStr) {
        const activeCompany = JSON.parse(activeCompanyStr);
        activeCompanyId = activeCompany?.companyId;
      }
    } catch (e) {
      console.error("Error parsing active company", e);
    }

    setIsLoading(true);
    try {
      const filters = [
        ...(activeCompanyId
          ? [
              {
                field: "company_id",
                value: activeCompanyId,
                matchMode: "equals",
              },
            ]
          : []),
        ...(debouncedResourcePoolTerm
          ? [
              {
                field: "name",
                value: debouncedResourcePoolTerm,
                matchMode: "contains",
              },
            ]
          : []),
        ...(debouncedResourceStatusTerm && debouncedResourceStatusTerm !== "all"
          ? [
              {
                field: "isActive",
                value: debouncedResourceStatusTerm,
                matchMode: "equals",
              },
            ]
          : []),
      ];

      const params = {
        first: (currentPage - 1) * itemsPerPage,
        rows: itemsPerPage,
        filters,
      };

      if (canViewResource) {
        const result = await loadResourcePools(params);
        if (result && Array.isArray(result.data)) {
          // Set total records for pagination
          setTotalRecords(result.total || result.data.length);

          setResourcePool(result.data);
          setIsLoading(false);
        } else {
          toast.error("Failed to fetch resource group");
          setResourcePool([]);
          setTotalRecords(0);
          setIsLoading(false);
        }
      } else {
        toast.error("Not authorized to view resource group");
        setResourcePool([]);
        setTotalRecords(0);
        setIsLoading(false);
        // Removed logout() call to prevent logout on page refresh
      }
    } catch (error) {
      // console.error('Error fetching resource group:', error);
      toast.error("Failed to fetch resource group");
      setResourcePool([]);
      setIsLoading(false);
    } finally {
      setHasDataFetched(true);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [
    debouncedResourcePoolTerm,
    debouncedResourceStatusTerm,
    currentPage,
    itemsPerPage,
    canViewResource,
  ]);

  const handleEditResourcePool = (resourcePoolId: number) => {
    setIsEditingResourcePool(true);
    setEditingResourcePool(resourcePoolId);
    setSelectedResourcePool(resourcePoolId);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-none bg-background pt-9">
        <div className="px-3 pt-2">
          <div className="flex items-center gap-1.5">
            {canCreateResource && (
              <Button
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setIsCreatingResource(true)}
              >
                <Plus className="w-3.5 h-3.5" /> Add Group
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              className={`h-7 w-7 p-0 shrink-0 transition-colors ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={fetchResources}
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

            <div className="flex gap-1.5">
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Name"
                  value={debouncedResourcePoolTerm}
                  onChange={(e) => {
                    setDebouncedResourcePoolTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-7 py-1 pl-8 pr-2.5 text-xs border border-border shadow-none placeholder:text-xs"
                />
              </div>
              <div className="relative w-40">
              <Select
                value={debouncedResourceStatusTerm}
                onValueChange={(value) => {
                  setDebouncedResourceStatusTerm(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-7 py-1 px-2.5 text-xs border border-border shadow-none flex gap-1">
                  <SelectValue placeholder="Status" className="flex-1 text-left truncate" />
                  {debouncedResourceStatusTerm && debouncedResourceStatusTerm !== "all" && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDebouncedResourceStatusTerm("");
                        setCurrentPage(1);
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div
        className={`flex-1 min-h-0 ${changeView === "table" ? "overflow-hidden" : "overflow-y-auto"} bg-background`}
      >
        <div className={`px-3 pt-3 pb-3 ${changeView === "table" ? "h-full" : ""}`}>
          {isLoading || !hasDataFetched ? (
            <div className={changeView === "table" ? "h-full" : "space-y-2"}>
              {changeView === "card" ? (
                <ResourcePoolGridSkeleton count={12} />
              ) : (
                <ResourcePoolTableSkeleton rows={12} />
              )}
            </div>
          ) : currentResources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Contact className="h-16 w-16 mb-4 text-gray-400 dark:text-gray-600" />
              <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">
                No Resource Groups Found
              </h3>
              <p className="text-muted-foreground mb-4">
                {debouncedResourcePoolTerm || debouncedResourceStatusTerm
                  ? "No resource groups match your search criteria"
                  : "Get started by creating your first resource group"}
              </p>
            </div>
          ) : (
            <div className={changeView === "table" ? "h-full" : "space-y-2"}>
              {changeView === "card" ? (
                <GridView
                  resourcePools={currentResources}
                  isLoading={false}
                  onResourcePoolClick={(resourcePoolId) => {
                    setSelectedResourcePool(resourcePoolId);
                    setOpenViewMode(true);
                  }}
                  onEditResourcePool={handleEditResourcePool}
                  reloadPools={fetchResources}
                />
              ) : /* changeView === "list" ? (
                <ListView
                  resourcePools={currentResources}
                  isLoading={false}
                  onResourcePoolClick={(resourcePoolId) => {
                    setSelectedResourcePool(resourcePoolId);
                    setOpenViewMode(true);
                  }}
                  onEditResourcePool={handleEditResourcePool}
                />
              ) : */ (
                <ResourceGroupTableView
                  resourcePools={currentResources}
                  isLoading={false}
                  // onResourcePoolClick={(resourcePoolId) => {
                  //   setSelectedResourcePool(resourcePoolId);
                  //   setOpenViewMode(true);
                  // }}
                  onEditResourcePool={handleEditResourcePool}
                  reloadPools={fetchResources}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {currentResources.length > 0 && (
        <div className="flex-none border-t bg-background">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-1.5">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} –
              {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
              {totalRecords} resource groups
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
      {isCreatingResource && (
        <ResourcePoolMultiStepForm
          open={isCreatingResource}
          onOpenChange={setIsCreatingResource}
          onResourceUpdate={fetchResources}
          type={"create"}
          resourceId={0}
        />
      )}
      {isEditingResourcePool && (
        <ResourcePoolMultiStepForm
          open={isEditingResourcePool}
          onOpenChange={setIsEditingResourcePool}
          onResourceUpdate={fetchResources}
          type={"edit"}
          resourceId={editingResourcePool}
        />
      )}
      {openViewMode && selectedResourcePool && (
        <ResourcePoolViewModal
          open={openViewMode}
          onClose={() => {
            setOpenViewMode(false);
          }}
          id={selectedResourcePool}
        />
      )}
    </div>
  );
}

export default Page;


