"use client";
import { useState, useEffect, useMemo } from "react";
import {
  RefreshCw,
  Users as UsersIcon,
  TableProperties,
  LayoutGrid,
  X,
  Filter,
  Pin,
  Contact,
  Globe,
  Coffee,
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { useViewPreference } from "@/hooks/use-view-preference";
import { useAuth } from "@/contexts/auth.context";
import { useSearchParams } from "next/navigation";
import ViewResourceModal from "./view_model";
import GridView from "./components/gridView";
import ListView from "./components/listView";
import { loadResource, getResourceSkills, getResourceActiveCounts, syncResourceWithUser } from "@/services/resource-management/resource-service";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import { ResourceMultiStepForm } from "@/app/(pages)/resource/management/components/resource-multistep-form";
import { loadResourcePools } from "@/services/resource-management/resource-pool-service";
import TableView from "@/app/(pages)/resource/management/components/tableView";
import { ResourceGridSkeleton, ResourceTableSkeleton, SkeletonLoadinResourceList } from "./components/ResourceSkeletons";

function page() {
  const { setBreadcrumbs } = useBreadcrumb();
  const { logout, user } = useAuth();
  const [resources, setResources] = useState<any[]>([]);
  const [resourcePools, setResourcePools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [individualSkillLoading, setIndividualSkillLoading] = useState<{
    [key: number]: boolean;
  }>({});
  const [changeView, setChangeView] = useViewPreference(
    "resource-management",
    ["card-1", "card-2", "list", "table"],
    "card-1",
    user?.id,
  );
  const [openViewModal, setOpenViewModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [debouncedResourceTerm, setDebouncedResourceTerm] = useState("");
  const [isCreatingResource, setIsCreatingResource] = useState(false);
  const [isEditingResource, setIsEditingResource] = useState(false);
  const [editingResource, setEditingResource] = useState<any>(null);
  const [debouncedResourceEmailTerm, setDebouncedResourceEmailTerm] = useState("");
  const [debouncedResourceStatusTerms, setDebouncedResourceStatusTerms] = useState<string[]>([]);
  const [debouncedResourceTypeTerms, setDebouncedResourceTypeTerms] = useState<string[]>([]);
  const [debouncedReportingPersonTerms, setDebouncedReportingPersonTerms] = useState<string[]>([]);
  const [debouncedUnassignedTerm, setDebouncedUnassignedTerm] = useState("");
  const [debouncedSkillTerms, setDebouncedSkillTerms] = useState<string[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const searchParams = useSearchParams();
  const resourceGroupId = searchParams?.get("resourceGroupId");
  const [debouncedResourcePoolTerms, setDebouncedResourcePoolTerms] = useState<string[]>(
    resourceGroupId ? [String(resourceGroupId)] : []
  );

  // -- Filter Pinning and Session State --
  const RESOURCE_FILTERS_SESSION_KEY = "resourcePageFilters";
  type FilterType = "group" | "status" | "type" | "reportingPerson" | "assignment" | "skills" | "name" | "email";

  const [pinnedFilters, setPinnedFilters] = useState<FilterType[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pinnedResourceFilters");
      if (saved) {
        try {
          return JSON.parse(saved) as FilterType[];
        } catch {
          return ["group"];
        }
      }
    }
    return ["group"]; // Default: Group pinned
  });

  useEffect(() => {
    localStorage.setItem("pinnedResourceFilters", JSON.stringify(pinnedFilters));
  }, [pinnedFilters]);

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const urlGroupId = searchParams?.get("resourceGroupId");
    const restoreFiltersFromSession = (f: any) => {
      if (f.debouncedResourceTerm !== undefined) setDebouncedResourceTerm(f.debouncedResourceTerm);
      if (f.debouncedResourceEmailTerm !== undefined) setDebouncedResourceEmailTerm(f.debouncedResourceEmailTerm);
      if (f.debouncedResourceStatusTerms !== undefined) setDebouncedResourceStatusTerms(f.debouncedResourceStatusTerms);
      if (f.debouncedResourceTypeTerms !== undefined) setDebouncedResourceTypeTerms(f.debouncedResourceTypeTerms);
      if (f.debouncedReportingPersonTerms !== undefined) setDebouncedReportingPersonTerms(f.debouncedReportingPersonTerms);
      if (f.debouncedUnassignedTerm !== undefined) setDebouncedUnassignedTerm(f.debouncedUnassignedTerm);
      if (f.debouncedSkillTerms !== undefined) setDebouncedSkillTerms(f.debouncedSkillTerms);
      if (f.currentPage !== undefined) setCurrentPage(f.currentPage);
    };

    if (urlGroupId) {
      setDebouncedResourcePoolTerms([String(urlGroupId)]);
      try {
        const saved = sessionStorage.getItem(RESOURCE_FILTERS_SESSION_KEY);
        if (saved) {
          const f = JSON.parse(saved);
          if (f.debouncedResourcePoolTerm === urlGroupId || (f.debouncedResourcePoolTerms && f.debouncedResourcePoolTerms.includes(urlGroupId))) {
            restoreFiltersFromSession(f);
          } else {
            sessionStorage.removeItem(RESOURCE_FILTERS_SESSION_KEY);
          }
        }
      } catch { }
    } else {
      try {
        const saved = sessionStorage.getItem(RESOURCE_FILTERS_SESSION_KEY);
        if (saved) {
          const f = JSON.parse(saved);
          if (f.debouncedResourcePoolTerms !== undefined) setDebouncedResourcePoolTerms(f.debouncedResourcePoolTerms);
          restoreFiltersFromSession(f);
        }
      } catch { }
    }
    setIsInitialized(true);
  }, [searchParams]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      sessionStorage.setItem(
        RESOURCE_FILTERS_SESSION_KEY,
        JSON.stringify({
          debouncedResourceTerm,
          debouncedResourceEmailTerm,
          debouncedResourceStatusTerms,
          debouncedResourceTypeTerms,
          debouncedReportingPersonTerms,
          debouncedUnassignedTerm,
          debouncedSkillTerms,
          debouncedResourcePoolTerms,
          currentPage,
        })
      );
    } catch { }
  }, [
    isInitialized,
    debouncedResourceTerm,
    debouncedResourceEmailTerm,
    debouncedResourceStatusTerms,
    debouncedResourceTypeTerms,
    debouncedReportingPersonTerms,
    debouncedUnassignedTerm,
    debouncedSkillTerms,
    debouncedResourcePoolTerms,
    currentPage,
  ]);

  const clearAllFilterStates = () => {
    setDebouncedResourceTerm("");
    setDebouncedResourceEmailTerm("");
    setDebouncedResourceStatusTerms([]);
    setDebouncedResourceTypeTerms([]);
    setDebouncedReportingPersonTerms([]);
    setDebouncedUnassignedTerm("");
    setDebouncedSkillTerms([]);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    sessionStorage.removeItem(RESOURCE_FILTERS_SESSION_KEY);
    setDebouncedResourcePoolTerms(resourceGroupId ? [String(resourceGroupId)] : []);
    clearAllFilterStates();
  };

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

  const isFilterPinned = (filterType: FilterType): boolean => {
    return pinnedFilters.includes(filterType);
  };
  // -- End Filter Logic --
  const [isSkillsLoading, setIsSkillsLoading] = useState(false);
  const useServerPagination = true;
  const canViewResource = usePrivilegeGuard("38") as boolean;
  const canCreateResource = usePrivilegeGuard("39") as boolean;
  const canViewResourcePool = usePrivilegeGuard("42") as boolean;
  const totalPages = useServerPagination
    ? Math.ceil(totalRecords / itemsPerPage)
    : Math.ceil(resources.length / itemsPerPage);

  const currentResources = useServerPagination
    ? resources
    : resources.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    );

  const uniqueReportingPersons = useMemo(() => {
    const map = new Map();
    resources.forEach((r) => {
      if (r.reportingPerson) {
        map.set(r.reportingPerson.id, r.reportingPerson);
      }
    });
    return Array.from(map.values());
  }, [resources]);

  const uniqueSkills = useMemo(() => {
    const set = new Set<string>();
    resources.forEach((r) => {
      if (r.skills) {
        r.skills.forEach((s: any) => {
          if (s.skillName) set.add(s.skillName);
        });
      }
    });
    return Array.from(set).sort();
  }, [resources]);

  const filteredResources = useMemo(() => {
    let filtered = currentResources;
    if (debouncedReportingPersonTerms.length > 0) {
      if (debouncedReportingPersonTerms.includes("none")) {
        filtered = filtered.filter((r) => !r.reportingPerson);
      } else {
        filtered = filtered.filter((r) => r.reportingPerson && debouncedReportingPersonTerms.includes(String(r.reportingPerson.id)));
      }
    }
    if (debouncedUnassignedTerm) {
      if (debouncedUnassignedTerm === "unassigned") {
        filtered = filtered.filter((r) => r.taskCount === 0 && r.ticketCount === 0);
      }
    }
    if (debouncedSkillTerms.length > 0) {
      filtered = filtered.filter((r) => {
        const resourceSkillNames = r.skills ? r.skills.map((s: any) => s.skillName) : [];
        if (resourceSkillNames.length === 0) {
          return debouncedSkillTerms.includes("none");
        }
        return debouncedSkillTerms.some(term => resourceSkillNames.includes(term));
      });
    }
    if (debouncedResourcePoolTerms.length > 0) {
      filtered = filtered.filter((r) => {
        const poolIds = r.resourcePools ? r.resourcePools.map((pool: any) => String(pool.pool_id)) : [];
        if (poolIds.length === 0) {
          return debouncedResourcePoolTerms.includes("none");
        }
        return debouncedResourcePoolTerms.some(term => poolIds.includes(term));
      });
    }
    return filtered;
  }, [currentResources, debouncedReportingPersonTerms, debouncedUnassignedTerm, debouncedSkillTerms, debouncedResourcePoolTerms]);

  useEffect(() => {
    if (canViewResourcePool) {
      getResourcePools();
    }
  }, [canViewResourcePool]);

  useEffect(() => {
    if (resourceGroupId) {
      setDebouncedResourcePoolTerms([String(resourceGroupId)]);
      const pool = resourcePools.find(
        (p) => p.resource_pool_id === Number(resourceGroupId)
      );
      const poolName = pool?.resource_pool_name || "Resource Group";

      setBreadcrumbs([
        {
          label: "Resource Group",
          href: "/resource/pools",
        },
        {
          label: poolName,
        },
      ]);
    } else {
      setDebouncedResourcePoolTerms([]);
      setBreadcrumbs([
        {
          label: "Resource",
        },
        {
          label: "Resource",
          href: "/resource",
          isCurrentPage: true,
        },
      ]);
    }
  }, [resourceGroupId, resourcePools, setBreadcrumbs]);

  // Memoized callbacks for actions

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
              field: "companyId",
              value: activeCompanyId,
              matchMode: "equals",
            },
          ]
          : []),
        ...(debouncedResourceTerm
          ? [
            {
              field: "first_name",
              value: debouncedResourceTerm,
              matchMode: "contains",
            },
          ]
          : []),
        ...(debouncedResourceEmailTerm
          ? [
            {
              field: "email",
              value: debouncedResourceEmailTerm,
              matchMode: "contains",
            },
          ]
          : []),

        ...(debouncedResourceStatusTerms.length > 0
          ? [
            {
              field: "active_status",
              value: debouncedResourceStatusTerms,
              matchMode: "in",
            },
          ]
          : []),
        ...(debouncedResourceTypeTerms.length > 0
          ? [
            {
              field: "type",
              value: debouncedResourceTypeTerms,
              matchMode: "in",
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
        const result = await loadResource(params);
        if (result && Array.isArray(result.data)) {
          // Set total records for pagination
          setTotalRecords(result.total || result.data.length);

          // Transform API data to show basic info immediately (without skills)
          const transformedResources = result.data.map((resource: any) => ({
            id: resource.resourceId,
            first_name: resource.first_name || "",
            last_name: resource.last_name || "",
            email: resource.email || "",
            profile_pic: resource.profile_pic || "",
            companyId: resource.companyId,
            divisionId: resource.divisionId,
            calendarId: resource.calendarId,
            active_status: resource.active_status,
            type: resource.type,
            createdAt: resource.createdAt || undefined,
            updatedAt: resource.updatedAt || undefined,
            createdBy: resource.created_by,
            updatedBy: resource.updated_by,
            division: {
              id: resource.divisionId,
              division: resource.division,
            },
            calendar: {
              id: resource.calendarId,
              name: resource.calendarName,
            },
            reportingPerson: resource.reportingPerson || null,
            resourcePools: Array.isArray(resource.resourcePools)
              ? resource.resourcePools.map((pool: any) => ({
                pool_id: pool.pool_id,
                pool_name: pool.pool_name,
              }))
              : [],
            skills: [],
            projectCount: 0,
            taskCount: 0,
            ticketCount: 0,
          }));
          setResources(transformedResources);
          setIsLoading(false);

          const fetchAllDetails = async () => {
            // Mark all resources as skills-loading individually
            const initialLoadingState: { [key: number]: boolean } = {};
            result.data.forEach((resource) => {
              initialLoadingState[resource.resourceId] = true;
            });
            setIndividualSkillLoading(initialLoadingState);

            // Launch fetches for each resource without awaiting them all
            result.data.forEach((resource) => {
              (async () => {
                try {
                  const skills = await skillGetAndSet(resource.resourceId, -1, false);
                  const counts = await getResourceActiveCounts(resource.resourceId).catch(() => ({
                    projectCount: 0,
                    taskCount: 0,
                    ticketCount: 0,
                  }));
                  // Update resource as soon as data resolves
                  setResources((prevResources) =>
                    prevResources.map((res) =>
                      res.id === resource.resourceId
                        ? {
                          ...res,
                          skills,
                          projectCount: counts.projectCount,
                          taskCount: counts.taskCount,
                          ticketCount: counts.ticketCount,
                        }
                        : res,
                    ),
                  );
                } catch (error) {
                  console.error(`Error fetching details for resource ${resource.resourceId}:`, error);
                } finally {
                  // Clear loading state for this specific resource
                  setIndividualSkillLoading((prev) => ({ ...prev, [resource.resourceId]: false }));
                }
              })();
            });
          };

          fetchAllDetails();
        } else {
          toast.error("Failed to fetch resources");
          setResources([]);
          setTotalRecords(0);
          setIsLoading(false);
        }
      } else {
        toast.error("Not authorized to view resources");
        setResources([]);
        setTotalRecords(0);
        setIsLoading(false);
      }
    } catch (error) {
      toast.error("Failed to fetch resources");
      setResources([]);
      setIsLoading(false);
    }
  };

  const getResourcePools = async () => {
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

    if (!activeCompanyId) return;

    try {
      const filters = [
        {
          field: "company_id",
          value: activeCompanyId,
          matchMode: "equals",
        },
        {
          field: "isActive",
          value: true,
          matchMode: "equals",
        },
      ];
      const response = await loadResourcePools({
        filters,
        first: 0,
        rows: 1000,
        multiSorts: [],
      });
      setResourcePools(response.data);
    } catch (e) {
      // console.error(e);
    }
  };

  const skillGetAndSet = async (
    resourceId: number,
    count: number,
    skipCheckLocal: boolean = false,
  ) => {
    try {
      // Directly fetch skills from API; local cache logic can be added later if needed
      const response = await getResourceSkills(resourceId, count);
      if (response.status === 200) {
        // Optionally store in local storage/cache here
        return response.data;
      } else {
        toast.error('Failed to fetch skills');
        return [];
      }
    } catch (error) {
      console.error('Error fetching skills:', error);
      toast.error('Failed to fetch skills');
      return [];
    }
  };

  const refreshResourceSkills = async (resourceId: number) => {
    setIndividualSkillLoading((prev) => ({ ...prev, [resourceId]: true }));
    try {
      const skillsResponse = await skillGetAndSet(resourceId, -1, true);

      // Update the specific resource in the resources array
      setResources((prevResources) =>
        prevResources.map((resource) =>
          resource.id === resourceId
            ? { ...resource, skills: skillsResponse || [] }
            : resource,
        ),
      );
    } catch (error) {
      // console.error('Error refreshing skills:', error);
      toast.error("Failed to refresh skills");
    } finally {
      setIndividualSkillLoading((prev) => ({ ...prev, [resourceId]: false }));
    }
  };

  useEffect(() => {
    fetchResources();
  }, [
    debouncedResourceTerm,
    debouncedResourceEmailTerm,
    debouncedResourceStatusTerms,
    debouncedResourceTypeTerms,
    currentPage,
    itemsPerPage,
    canViewResource,
    debouncedResourcePoolTerms,
  ]);

  const handleEditResource = (resourceId: number) => {
    setIsEditingResource(true);
    setEditingResource(resourceId);
    setSelectedResource(resourceId);
  };

  const handleSyncWithUser = async (resourceId: number) => {
    try {
      const res = await syncResourceWithUser(resourceId);
      if (res?.status === 200 || res?.status === 201) {
        toast.success("Resource synced with user");
        fetchResources();
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "No active user found with the same email address";
      toast.error(message);
    }
  };

  const handleLocalResourceUpdate = (
    resourceData: any,
    actionType: "create" | "edit",
  ) => {
    if (!resourceData) {
      fetchResources();
      return;
    }

    const formattedResource = {
      id: resourceData.resourceId || resourceData.id || editingResource,
      first_name: resourceData.first_name || "",
      last_name: resourceData.last_name || "",
      email: resourceData.email || "",
      profile_pic: resourceData.profile_pic || "",
      companyId: resourceData.companyId,
      divisionId: resourceData.divisionId,
      calendarId: resourceData.calendarId,
      active_status:
        resourceData.active_status !== undefined
          ? resourceData.active_status
          : true,
      type: resourceData.type || "Internal",
      division: {
        id: resourceData.divisionId,
        division: resourceData.division?.division || resourceData.division,
      },
      calendar: {
        id: resourceData.calendarId,
        name: resourceData.calendar?.name || resourceData.calendarName,
      },
      resourcePools: Array.isArray(resourceData.resourcePools)
        ? resourceData.resourcePools
        : [],
      skills: resourceData.skills || [],
    };

    if (actionType === "create") {
      setResources((prev) => [formattedResource, ...prev]);
      setTotalRecords((prev) => prev + 1);
      refreshResourceSkills(formattedResource.id);
    } else if (actionType === "edit") {
      setResources((prev) =>
        prev.map((res) =>
          res.id === formattedResource.id
            ? {
              ...res,
              ...formattedResource,
              // Preserve counts — not returned by the update API
              projectCount: res.projectCount,
              taskCount: res.taskCount,
              ticketCount: res.ticketCount,
              // Keep existing skills until refreshResourceSkills resolves
              skills: res.skills,
            }
            : res,
        ),
      );
      refreshResourceSkills(formattedResource.id);
    }
  };

  const renderFilterOptions = (filterType: FilterType, isPinned = false) => {
    const containerClasses = `space-y-1.5 max-h-[150px] overflow-y-auto ${isPinned ? "" : "border border-gray-300 dark:border-gray-600 rounded-md p-2"}`;
    const toggleArrayFilter = (current: string[], val: string, setter: any) => {
      if (current.includes(val)) {
        setter(current.filter(item => item !== val));
      } else {
        setter([...current, val]);
      }
      setCurrentPage(1);
    };

    switch (filterType) {
      case "group":
        return (
          <div className={containerClasses}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={debouncedResourcePoolTerms.includes("none")}
                onChange={() => toggleArrayFilter(debouncedResourcePoolTerms, "none", setDebouncedResourcePoolTerms)}
                className="w-3.5 h-3.5"
              />
              <span className="text-xs text-muted-foreground italic">No Group</span>
            </label>
            {resourcePools.map((pool) => (
              <label key={pool.resource_pool_id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={debouncedResourcePoolTerms.includes(String(pool.resource_pool_id))}
                  onChange={() => toggleArrayFilter(debouncedResourcePoolTerms, String(pool.resource_pool_id), setDebouncedResourcePoolTerms)}
                  className="w-3.5 h-3.5"
                />
                <span className="text-xs">{pool.resource_pool_name}</span>
              </label>
            ))}
          </div>
        );
      case "status":
        return (
          <div className={containerClasses}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={debouncedResourceStatusTerms.includes("true")} onChange={() => toggleArrayFilter(debouncedResourceStatusTerms, "true", setDebouncedResourceStatusTerms)} className="w-3.5 h-3.5" />
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={debouncedResourceStatusTerms.includes("false")} onChange={() => toggleArrayFilter(debouncedResourceStatusTerms, "false", setDebouncedResourceStatusTerms)} className="w-3.5 h-3.5" />
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs">Inactive</span>
            </label>
          </div>
        );
      case "type":
        return (
          <div className={containerClasses}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={debouncedResourceTypeTerms.includes("Internal")} onChange={() => toggleArrayFilter(debouncedResourceTypeTerms, "Internal", setDebouncedResourceTypeTerms)} className="w-3.5 h-3.5" />
              <Contact className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs">Internal</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={debouncedResourceTypeTerms.includes("External")} onChange={() => toggleArrayFilter(debouncedResourceTypeTerms, "External", setDebouncedResourceTypeTerms)} className="w-3.5 h-3.5" />
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs">External</span>
            </label>
          </div>
        );
      case "reportingPerson":
        return (
          <div className={containerClasses}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={debouncedReportingPersonTerms.includes("none")} onChange={() => toggleArrayFilter(debouncedReportingPersonTerms, "none", setDebouncedReportingPersonTerms)} className="w-3.5 h-3.5" />
              <span className="text-xs italic text-muted-foreground">No reporting person</span>
            </label>
            {uniqueReportingPersons.map((rp: any) => (
              <label key={rp.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={debouncedReportingPersonTerms.includes(String(rp.id))}
                  onChange={() => toggleArrayFilter(debouncedReportingPersonTerms, String(rp.id), setDebouncedReportingPersonTerms)}
                  className="w-3.5 h-3.5"
                />
                <span className="text-xs truncate">{rp.first_name} {rp.last_name}</span>
              </label>
            ))}
          </div>
        );
      case "assignment":
        return (
          <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
            <Button
              variant="outline"
              size="sm"
              className={`w-full justify-start text-xs font-normal h-8 bg-transparent hover:bg-transparent ${debouncedUnassignedTerm === "unassigned" ? "border-primary font-semibold" : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"}`}
              onClick={() => { setDebouncedUnassignedTerm(debouncedUnassignedTerm === "unassigned" ? "" : "unassigned"); }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-4 w-4 shrink-0 ${debouncedUnassignedTerm === "unassigned" ? "text-primary" : ""}`}
              >
                <path d="M17 8h1a4 4 0 1 1 0 8h-1" fill="none" />
                <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" fill={debouncedUnassignedTerm === "unassigned" ? "currentColor" : "none"} />
                <line x1="6" x2="6" y1="2" y2="4" />
                <line x1="10" x2="10" y1="2" y2="4" />
                <line x1="14" x2="14" y1="2" y2="4" />
              </svg>
              Idle Resources
            </Button>
          </div>
        );
      case "skills":
        return (
          <div className={containerClasses}>
            {uniqueSkills.length === 0 ? (
              <div className="py-2 text-xs text-muted-foreground text-center">No skills found</div>
            ) : (
              <>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={debouncedSkillTerms.includes("none")}
                    onChange={(e) => {
                      setDebouncedSkillTerms((prev) =>
                        e.target.checked ? [...prev, "none"] : prev.filter((t) => t !== "none")
                      );
                    }}
                    className="w-3.5 h-3.5"
                  />
                  <span className="text-xs text-muted-foreground italic">No Skills</span>
                </label>
                {uniqueSkills.map((skill) => (
                  <label key={skill} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={debouncedSkillTerms.includes(skill)}
                      onChange={(e) => {
                        setDebouncedSkillTerms((prev) =>
                          e.target.checked ? [...prev, skill] : prev.filter((t) => t !== skill)
                        );
                      }}
                      className="w-3.5 h-3.5"
                    />
                    <span className="text-xs truncate">{skill}</span>
                  </label>
                ))
                }
              </>
            )}
          </div>
        );
      case "name":
        return (
          <div>
            <Input
              placeholder="Search by name..."
              value={debouncedResourceTerm}
              onChange={(e) => {
                setDebouncedResourceTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-7 text-xs shadow-none placeholder:text-xs"
            />
          </div>
        );
      case "email":
        return (
          <div>
            <Input
              placeholder="Search by email..."
              value={debouncedResourceEmailTerm}
              onChange={(e) => {
                setDebouncedResourceEmailTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-7 text-xs shadow-none placeholder:text-xs"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const renderMegaMenuSection = (filterType: FilterType, label: string, isActive: boolean, onClear: () => void) => (
    <div key={filterType}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="flex items-center gap-1">
          {isActive && (
            <Button variant="ghost" size="sm" className="h-5 px-1 text-xs text-red-500 hover:text-red-600" onClick={onClear}>Clear</Button>
          )}
          <Button variant="ghost" size="sm" className={`h-5 w-5 p-0 ${isFilterPinned(filterType) ? "text-primary" : "text-gray-400"}`} onClick={() => togglePinFilter(filterType)} title={isFilterPinned(filterType) ? "Unpin filter" : "Pin filter to toolbar"}>
            <Pin className="h-3.5 w-3.5" fill={isFilterPinned(filterType) ? "currentColor" : "none"} />
          </Button>
        </div>
      </div>
      {renderFilterOptions(filterType)}
    </div>
  );

  const renderPinnedFilter = (filterType: FilterType) => {
    const config = {
      group: { label: "Group", badgeCount: debouncedResourcePoolTerms.length, isActive: debouncedResourcePoolTerms.length > 0, onClear: () => { setDebouncedResourcePoolTerms([]); setCurrentPage(1); } },
      status: { label: "Status", badgeCount: debouncedResourceStatusTerms.length, isActive: debouncedResourceStatusTerms.length > 0, onClear: () => { setDebouncedResourceStatusTerms([]); setCurrentPage(1); } },
      type: { label: "Type", badgeCount: debouncedResourceTypeTerms.length, isActive: debouncedResourceTypeTerms.length > 0, onClear: () => { setDebouncedResourceTypeTerms([]); setCurrentPage(1); } },
      reportingPerson: { label: "Reporting Person", badgeCount: debouncedReportingPersonTerms.length, isActive: debouncedReportingPersonTerms.length > 0, onClear: () => { setDebouncedReportingPersonTerms([]); } },
      assignment: { label: "Assignment", badgeCount: debouncedUnassignedTerm ? 1 : 0, isActive: !!debouncedUnassignedTerm, onClear: () => { setDebouncedUnassignedTerm(""); } },
      skills: { label: "Skills", badgeCount: debouncedSkillTerms.length, isActive: debouncedSkillTerms.length > 0, onClear: () => { setDebouncedSkillTerms([]); } },
      name: { label: "Name", badgeCount: debouncedResourceTerm ? 1 : 0, isActive: !!debouncedResourceTerm, onClear: () => { setDebouncedResourceTerm(""); setCurrentPage(1); } },
      email: { label: "Email", badgeCount: debouncedResourceEmailTerm ? 1 : 0, isActive: !!debouncedResourceEmailTerm, onClear: () => { setDebouncedResourceEmailTerm(""); setCurrentPage(1); } },
    }[filterType];

    if (!config) return null;

    if (filterType === "assignment") {
      return (
        <Button
          key={filterType}
          size="sm"
          variant="outline"
          className={`h-7 text-xs px-2 shadow-none gap-1.5 ${config.isActive ? "font-medium" : "border-border"}`}
          onClick={() => {
            setDebouncedUnassignedTerm(config.isActive ? "" : "unassigned");
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-3.5 w-3.5 ${config.isActive ? "text-primary" : ""}`}
          >
            <path d="M17 8h1a4 4 0 1 1 0 8h-1" fill="none" />
            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" fill={config.isActive ? "currentColor" : "none"} />
            <line x1="6" x2="6" y1="2" y2="4" />
            <line x1="10" x2="10" y1="2" y2="4" />
            <line x1="14" x2="14" y1="2" y2="4" />
          </svg>
          Idle Resources
        </Button>
      );
    }

    return (
      <Popover key={filterType}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className={`h-7 text-xs px-2 shadow-none gap-1.5 border-border ${config.isActive ? "text-foreground" : ""}`}>
            {config.label}
            {config.badgeCount > 0 && (
              <span className="bg-primary text-primary-foreground rounded-full min-w-4 h-4 flex items-center justify-center text-[10px] px-1">
                {config.badgeCount}
              </span>
            )}
            {config.isActive && (
              <span
                role="button"
                tabIndex={0}
                className="ml-0.5 hover:text-destructive cursor-pointer"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  config.onClear();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    e.preventDefault();
                    config.onClear();
                  }
                }}
              >
                <X className="w-3 h-3 text-foreground hover:text-destructive" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className={`p-2 ${filterType === 'type' ? 'w-[140px]' :
          filterType === 'skills' ? 'w-[280px]' :
            'w-[200px]'
          }`}>
          {renderFilterOptions(filterType, true)}
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className={`flex-none bg-background pt-11 ${changeView !== "table" ? "pb-1" : "pb-1"}`}>
        <div className="px-3">
          <div className="flex items-center gap-1.5">
            {canCreateResource && (
              <Button
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setIsCreatingResource(true)}
              >
                <Plus className="w-3.5 h-3.5" /> Add Resource
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className={`h-7 w-7 p-0 shrink-0 transition-colors ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={fetchResources}
              disabled={isLoading}
              title={isLoading ? "Loading..." : "Refresh"}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>

            <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1 shrink-0" />

            <div className="flex gap-1 bg-background border border-border rounded-sm shrink-0 items-center h-7">
              <Button
                size="sm"
                variant={changeView === "card-1" ? "default" : "ghost"}
                className={`h-full text-xs shadow-none ${changeView === "card-1" ? "px-2.5" : "px-2"}`}
                onClick={() => setChangeView("card-1")}
                title="Switch to Grid View"
              >
                <LayoutGrid className={`w-3.5 h-3.5 ${changeView === "card-1" ? "mr-1" : ""}`} />
                {changeView === "card-1" && "Grid"}
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

            <div className="flex items-center gap-1.5 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2 border-border shadow-none"
                    title="Filter Options"
                  >
                    <Filter className="w-3.5 h-3.5 mr-1.5" />
                    Filters
                    {([
                      debouncedResourceTerm,
                      debouncedResourceEmailTerm,
                      debouncedResourcePoolTerms.length > 0,
                      debouncedResourceStatusTerms.length > 0,
                      debouncedResourceTypeTerms.length > 0,
                      debouncedReportingPersonTerms.length > 0,
                      debouncedUnassignedTerm,
                      debouncedSkillTerms.length > 0
                    ].filter(Boolean).length > 0) && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium">
                          {[
                            debouncedResourceTerm,
                            debouncedResourceEmailTerm,
                            debouncedResourcePoolTerms.length > 0,
                            debouncedResourceStatusTerms.length > 0,
                            debouncedResourceTypeTerms.length > 0,
                            debouncedReportingPersonTerms.length > 0,
                            debouncedUnassignedTerm,
                            debouncedSkillTerms.length > 0
                          ].filter(Boolean).length}
                        </span>
                      )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[320px]">
                  <DropdownMenuLabel className="text-xs font-semibold flex items-center justify-between">
                    <span>Filters</span>
                    {([
                      debouncedResourceTerm,
                      debouncedResourceEmailTerm,
                      debouncedResourcePoolTerms.length > 0,
                      debouncedResourceStatusTerms.length > 0,
                      debouncedResourceTypeTerms.length > 0,
                      debouncedReportingPersonTerms.length > 0,
                      debouncedUnassignedTerm,
                      debouncedSkillTerms.length > 0
                    ].filter(Boolean).length > 0) && (
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
                  <div className="p-2 space-y-3 max-h-[60vh] overflow-y-auto">
                    {renderMegaMenuSection("name", "Name", !!debouncedResourceTerm, () => { setDebouncedResourceTerm(""); setCurrentPage(1); })}
                    {renderMegaMenuSection("email", "Email", !!debouncedResourceEmailTerm, () => { setDebouncedResourceEmailTerm(""); setCurrentPage(1); })}
                    {renderMegaMenuSection("group", "Group", debouncedResourcePoolTerms.length > 0, () => { setDebouncedResourcePoolTerms([]); setCurrentPage(1); })}
                    {renderMegaMenuSection("status", "Status", debouncedResourceStatusTerms.length > 0, () => { setDebouncedResourceStatusTerms([]); setCurrentPage(1); })}
                    {renderMegaMenuSection("type", "Type", debouncedResourceTypeTerms.length > 0, () => { setDebouncedResourceTypeTerms([]); setCurrentPage(1); })}
                    {renderMegaMenuSection("reportingPerson", "Reporting Person", debouncedReportingPersonTerms.length > 0, () => { setDebouncedReportingPersonTerms([]); })}
                    {renderMegaMenuSection("assignment", "Assignment", !!debouncedUnassignedTerm, () => setDebouncedUnassignedTerm(""))}
                    {renderMegaMenuSection("skills", "Skills", debouncedSkillTerms.length > 0, () => setDebouncedSkillTerms([]))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div
        className={`flex-1 min-h-0 ${changeView === "table" ? "overflow-hidden" : "overflow-y-auto"} bg-background`}
      >
        <div className={`px-3 pt-2 pb-3 ${changeView === "table" ? "h-full" : ""}`}>
          {isLoading ? (
            changeView === "card-1" || changeView === "card-2" ? (
              <ResourceGridSkeleton count={12} />
            ) : changeView === "list" ? (
              <SkeletonLoadinResourceList count={5} />
            ) : (
              <ResourceTableSkeleton rows={12} />
            )
          ) : filteredResources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UsersIcon className="h-16 w-16 mb-4 text-gray-400 dark:text-gray-600" />
              <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">
                No Resources Found
              </h3>
              <p className="text-muted-foreground mb-4">
                {debouncedResourceTerm || debouncedResourceEmailTerm || debouncedResourcePoolTerms.length > 0 || debouncedResourceStatusTerms.length > 0 || debouncedResourceTypeTerms.length > 0 || debouncedReportingPersonTerms.length > 0 || debouncedUnassignedTerm || debouncedSkillTerms.length > 0
                  ? "No resources match your search criteria"
                  : "Get started by creating your first resource"}
              </p>
            </div>
          ) : (
            <div
              className={
                changeView === "table" ? "h-full" : "space-y-2"
              }
            >
              {(() => {
                const commonProps = {
                  resources: filteredResources,
                  isLoading: isLoading,
                  onResourceClick: (resourceId: number) => {
                    handleEditResource(resourceId);
                  },
                  onRefreshSkills: refreshResourceSkills,
                  onSyncWithUser: handleSyncWithUser,
                  onEditResource: handleEditResource,
                };

                switch (changeView) {
                  case "card-1":
                    return (
                      <GridView
                        {...commonProps}
                        individualSkillLoading={individualSkillLoading}
                        reload={fetchResources}
                        isSkillsLoading={isSkillsLoading}
                      />
                    );
                  case "list":
                    return (
                      <ListView
                        {...commonProps}
                        individualSkillLoading={individualSkillLoading}
                      />
                    );
                  case "table":
                    return (
                      <TableView {...commonProps} reload={fetchResources} />
                    );
                  default:
                    return null;
                }
              })()}
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
              {totalRecords} resources
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
      {openViewModal && (
        <ViewResourceModal
          open={openViewModal}
          onClose={() => setOpenViewModal(false)}
          resourceId={selectedResource}
        />
      )}
      {isCreatingResource && (
        <ResourceMultiStepForm
          open={isCreatingResource}
          onOpenChange={setIsCreatingResource}
          onResourceUpdate={handleLocalResourceUpdate}
          type={"create"}
          resourceId={0}
        />
      )}
      {isEditingResource && (
        <ResourceMultiStepForm
          open={isEditingResource}
          onOpenChange={setIsEditingResource}
          onResourceUpdate={handleLocalResourceUpdate}
          type={"edit"}
          resourceId={editingResource}
        />
      )}
    </div>
  );
}

export default page;
