"use client";

import React, { useState, useEffect } from "react";
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ResponsiveSkillRow from "@/components/common/ResponsiveSkillRow";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  MoreVertical,
  Pencil,
  Trash,
  Lock,
  Unlock,
  UserCheck,
  Check,
  Loader2,
  Globe,
  Contact,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteResource,
  disableResource,
  quickUpdateResource,
} from "@/services/resource-management/resource-service";
import { loadDivisions } from "@/services/company-management/division-services";
import DeleteModal from "@/components/DeleteModal";
import { ResourceTableSkeleton } from "./ResourceSkeletons";
import ResponsiveBadgeRow from "@/components/common/ResponsiveBadgeRow";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Module-level cache to prevent refetching divisions on every view switch
let cachedDivisions: { id: number; division: string }[] | null = null;

// --- Interfaces ---
interface Resource {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  mobile?: string;
  profile_pic: string;
  active_status: boolean;
  type?: string;
  division?: { id: number; division: string };
  skills?: {
    id: number;
    skillName: string;
    skillLevelName: string;
    starCount: number;
    skillCategoryName: string;
    companyId: number;
    createdAt: string;
    updatedAt: string;
    // other fields can be added as needed
  }[];
  resourcePools: { pool_id: number; pool_name: string }[];
  reportingPerson?: { id: number; first_name: string; last_name: string; email: string; } | null;
  taskCount?: number;
  ticketCount?: number;
  projectCount?: number;
}

interface TableViewProps {
  resources: Resource[];
  isLoading: boolean;
  onResourceClick: (resourceId: number) => void;
  onEditResource: (resourceId: number) => void;
  onRefreshSkills?: (resourceId: number) => void; // kept for prop-spread compatibility
  onSyncWithUser: (resourceId: number) => void;
  reload: () => void;
}

// --- Helper UI Logic ---
const getUtilizationInfo = (percent: any) => {
  let gradientClasses = "";
  let colorText = "";

  if (percent <= 40) {
    // Muted/Neutral (Slate/Blue-Gray) for Low
    gradientClasses = "from-slate-500 to-slate-400";
    colorText = "text-slate-600 dark:text-slate-400";
  } else if (percent <= 70) {
    // Muted Warm (Amber/Orange) for Medium
    gradientClasses = "from-amber-300 to-amber-200";
    colorText = "text-amber-600 dark:text-amber-400";
  } else {
    // Softer Red/Rose for High
    gradientClasses = "from-red-300 to-red-200"; // Using slightly higher saturation/darker shade for impact
    colorText = "text-red-400 dark:text-red-300";
  }

  return { gradientClasses, colorText };
};

const hardcodedUtilizations = [80, 25, 55, 95, 40, 75, 10, 60, 35, 90];

const TableView: React.FC<TableViewProps> = ({
  resources,
  isLoading,
  onResourceClick,
  onEditResource,
  onSyncWithUser,
  reload,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingResourceId, setDeletingResourceId] = useState<number | null>(
    null,
  );
  const [editingCell, setEditingCell] = useState<{
    id: number;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<any>("");
  const [localResources, setLocalResources] = useState<Resource[]>(resources);
  const [updatingRows, setUpdatingRows] = useState<Set<number>>(new Set());

  // Quick Edit State
  const [editConfig, setEditConfig] = useState<{
    isOpen: boolean;
    id: number;
    field: string;
    value: any;
    label: string;
  }>({ isOpen: false, id: 0, field: "", value: "", label: "" });
  const [divisions, setDivisions] = useState<
    { id: number; division: string }[]
  >([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const canEditResource = usePrivilegeGuard("40") as boolean;
  const canDeleteResource = usePrivilegeGuard("41") as boolean;

  useEffect(() => {
    setLocalResources(resources);
  }, [resources]);

  useEffect(() => {
    const fetchDivisions = async () => {
      if (cachedDivisions) {
        setDivisions(cachedDivisions);
        return;
      }
      try {
        const stored = localStorage.getItem("active_company");
        if (!stored) return;
        const selectedCompany = JSON.parse(stored);

        const filters = [
          {
            field: "companyId",
            value: selectedCompany.companyId,
            matchMode: "equals",
          },
          { field: "isActive", value: true, matchMode: "equals" },
        ];

        const response = await loadDivisions({
          filters,
          first: 0,
          rows: 1000,
          multiSorts: [],
        });

        const extractedData = response?.data || response || [];
        cachedDivisions = extractedData;
        setDivisions(extractedData);
      } catch (error) {
        toast.error("Failed to load divisions");
      }
    };

    fetchDivisions();
  }, []); // Trigger on mount

  const handleInlineSave = async (id: number, field: string, overrideValue?: any) => {
    const finalValue = overrideValue !== undefined ? overrideValue : editValue;
    if (!finalValue) return setEditingCell(null);

    const originalResource = localResources.find((r) => r.id === id);
    if (!originalResource) return setEditingCell(null);

    let isSame = false;
    if (field === "division") {
      isSame = String(originalResource.division?.id || "") === String(finalValue);
    } else {
      isSame = originalResource[field as keyof Resource] === finalValue;
    }

    if (isSame) {
      return setEditingCell(null);
    }

    // 1. Set row-level loading
    setUpdatingRows((prev) => new Set(prev).add(id));
    setIsUpdating(true);

    try {
      await quickUpdateResource(id, field, finalValue);

      // 2. Update local state instead of calling reload()
      setLocalResources((prev) =>
        prev.map((res) => {
          if (res.id === id) {
            if (field === "division") {
              const selectedDiv = divisions.find(
                (d) => String(d.id) === String(finalValue),
              );
              return { ...res, division: selectedDiv };
            }
            return { ...res, [field]: finalValue };
          }
          return res;
        }),
      );

      toast.success(`Updated`);
    } catch (error) {
      toast.error("Update failed");
    } finally {
      // 3. Clean up states
      setIsUpdating(false);
      setUpdatingRows((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setEditingCell(null);
    }
  };

  const handleQuickUpdate = async () => {
    const { id, field, value, label } = editConfig;

    // Start loading for this specific row
    setUpdatingRows((prev) => new Set(prev).add(id));
    setIsUpdating(true);

    try {
      await quickUpdateResource(id, field, value);

      setLocalResources((prev) =>
        prev.map((res) => {
          if (res.id === id) {
            if (field === "division") {
              const selectedDiv = divisions.find(
                (d) => String(d.id) === String(value),
              );
              return { ...res, division: selectedDiv };
            }
            return { ...res, [field]: value };
          }
          return res;
        }),
      );

      toast.success(`${label} updated`);
      setEditConfig((prev) => ({ ...prev, isOpen: false }));
    } catch (error) {
      toast.error("Update failed");
    } finally {
      setIsUpdating(false);
      setUpdatingRows((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const columns: ColumnDef<Resource>[] = [
    {
      accessorKey: "name",
      header: "RESOURCE",
      cell: ({ row }) => {
        const r = row.original;
        const index = row.index;
        const fullName = `${r.first_name} ${r.last_name}`;
        const initials = `${r.first_name?.[0] || ""}${r.last_name?.[0] || ""}`.toUpperCase();

        const utilizationPercent = hardcodedUtilizations[index % hardcodedUtilizations.length];
        const utilizationInfo = getUtilizationInfo(utilizationPercent);

        // Circular Progress Calculation
        const radius = 16;
        const circumference = 2 * Math.PI * radius;
        const offset =
          circumference - (utilizationPercent / 100) * circumference;
        const isEditingFirst =
          editingCell?.id === r.id && editingCell?.field === "first_name";
        const isEditingLast =
          editingCell?.id === r.id && editingCell?.field === "last_name";
        return (
          <div className="flex items-center gap-2">
            {/* Status Dot */}
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <div className="flex items-center flex-shrink-0 cursor-help">
                    <span
                      className={`h-2 w-2 rounded-full ${r.active_status ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-400"}`}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs px-2 py-1">
                  {r.active_status ? "Active" : "Inactive"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="relative flex-shrink-0 group/avatar w-7 h-7 flex items-center justify-center">
              {/*
              <svg className="absolute -rotate-90 w-10 h-10">
                <circle
                  cx="20"
                  cy="20"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="transparent"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="20"
                  cy="20"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="transparent"
                  strokeDasharray={circumference}
                  style={{ strokeDashoffset: offset }}
                  strokeLinecap="round"
                  className={`transition-all duration-500 ${utilizationInfo.gradientClasses} text-blue-500`}
                />
              </svg>
              */}

              <div className="w-7 h-7 rounded-full overflow-hidden relative z-10 bg-primary flex items-center justify-center border border-gray-100 dark:border-gray-700">
                {r.profile_pic && r.profile_pic.length > 0 && !r.profile_pic.includes("ui-avatars.com") ? (
                  <img
                    src={r.profile_pic}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[10px] font-medium text-white dark:text-black leading-none mt-[1px]">
                    {initials}
                  </span>
                )}
                {/*
                <span className="absolute text-white dark:text-black inset-0 flex items-center justify-center text-[10px] opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 bg-primary">
                  {utilizationPercent}%
                </span>
                */}
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                {/* First Name Inline Input */}
                {isEditingFirst ? (
                  <Input
                    className="h-auto p-0 w-24 text-sm font-semibold text-gray-900 dark:text-gray-50 border-0 border-b border-primary rounded-none focus-visible:ring-0 bg-transparent"
                    value={editValue}
                    autoFocus
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleInlineSave(r.id, "first_name")}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleInlineSave(r.id, "first_name")
                    }
                  />
                ) : (
                  <TooltipProvider>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <span
                          className="cursor-pointer text-sm font-semibold text-gray-900 dark:text-gray-50 truncate hover:text-blue-600 transition-colors"
                          onClick={() => {
                            setEditingCell({ id: r.id, field: "first_name" });
                            setEditValue(r.first_name);
                          }}
                        >
                          {r.first_name}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs px-2 py-1">Click to edit</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Last Name Inline Input */}
                {isEditingLast ? (
                  <Input
                    className="h-auto p-0 w-24 text-sm font-semibold text-gray-900 dark:text-gray-50 border-0 border-b border-primary rounded-none focus-visible:ring-0 bg-transparent"
                    value={editValue}
                    autoFocus
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleInlineSave(r.id, "last_name")}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleInlineSave(r.id, "last_name")
                    }
                  />
                ) : (
                  <TooltipProvider>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <span
                          className="cursor-pointer text-sm font-semibold text-gray-900 dark:text-gray-50 truncate hover:text-blue-600 transition-colors"
                          onClick={() => {
                            setEditingCell({ id: r.id, field: "last_name" });
                            setEditValue(r.last_name);
                          }}
                        >
                          {r.last_name}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs px-2 py-1">Click to edit</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <span className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]" title={r.email}>
                {r.email}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "division",
      header: "DIVISION",
      cell: ({ row }) => {
        const r = row.original;

        return (
          <div className="min-w-[100px]">
            {divisions.length > 1 ? (
              <DropdownMenu>
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger className="focus:outline-none focus-visible:ring-0">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-dashed border-gray-300 bg-transparent text-xs text-gray-700 dark:bg-transparent dark:border-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                          {r.division?.division || "N/A"}
                        </span>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px] px-2 py-1">Click to edit</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent align="start" className="z-[100] min-w-[150px]">
                  {divisions.map((d) => (
                    <DropdownMenuItem
                      key={d.id}
                      className="cursor-pointer text-xs"
                      onClick={() => handleInlineSave(r.id, "division", d.id)}
                    >
                      {d.division}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-dashed border-gray-300 bg-transparent text-xs text-gray-700 dark:bg-transparent dark:border-gray-700 dark:text-gray-300 cursor-default opacity-90">
                {r.division?.division || "General"}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "TYPE",
      cell: ({ row }) => {
        const r = row.original;
        const rType = r.type || "Internal";
        const Icon = rType === "Internal" ? Contact : Globe;
        return (
          <div className="min-w-[80px]">
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 font-semibold rounded-md border border-gray-300 bg-transparent text-xs text-gray-700 dark:bg-transparent dark:border-gray-700 dark:text-gray-300"
            >
              <Icon className="w-3.5 h-3.5 text-primary" />
              {rType}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "resourcePools",
      header: "GROUPS",
      cell: ({ row }) => {
        const pools = row.original.resourcePools || [];
        return (
          <div className="flex flex-wrap items-center gap-1">
            {pools.length === 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-dashed border-gray-400 dark:border-gray-700 bg-transparent dark:bg-transparent text-[11px] font-medium text-gray-400 italic">
                No group
              </span>
              // <span className="text-xs px-2 py-0.5 rounded-md border border-dashed text-muted-foreground"></span>
            ) : (
              <>
                {pools.slice(0, 1).map((rp) => (
                  <span
                    key={rp.pool_id}
                    className="inline-flex items-center px-2 py-0.5 rounded-md border border-gray-300 bg-transparent text-xs text-gray-700 dark:bg-transparent dark:border-gray-700 dark:text-gray-300"
                  >
                    {rp.pool_name}
                  </span>
                ))}
                {pools.length > 1 && (
                  <HoverCard openDelay={100} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-dashed border-gray-300 bg-transparent text-xs text-gray-700 dark:bg-transparent dark:border-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors select-none">
                        +{pools.length - 1}
                      </span>
                    </HoverCardTrigger>
                    <HoverCardContent
                      side="top"
                      align="start"
                      className="w-56 p-2 z-50 bg-white dark:bg-gray-800 border-border shadow-md"
                    >
                      <div className="flex flex-col max-h-52 overflow-y-auto">
                        {pools.slice(1).map((rp, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between gap-2 py-1.5 px-1 border-b border-border last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-sm transition-colors"
                          >
                            <span className="text-xs text-gray-800 dark:text-gray-200 font-medium truncate">
                              {rp.pool_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                )}
              </>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "skills",
      header: "SKILLS",
      cell: ({ row }) => {
        const skills = row.original.skills || [];
        return (
          <div className="flex text-xs items-center w-full overflow-hidden">
            <ResponsiveSkillRow skills={skills} />
          </div>
        );
      },
    },
    {
      accessorKey: "reportingPerson",
      header: "REPORTING TO",
      cell: ({ row }) => {
        const reportingPerson = row.original.reportingPerson;
        if (!reportingPerson) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-dashed border-gray-400 dark:border-gray-700 bg-transparent dark:bg-transparent text-[11px] font-medium text-gray-400 italic">
              N/A
            </span>
          );
        }
        return (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {reportingPerson.first_name} {reportingPerson.last_name}
            </span>
            <span className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]" title={reportingPerson.email}>
              {reportingPerson.email}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "counts",
      header: "WORK",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="min-w-[150px]">
            <ResponsiveBadgeRow
              hideColorCircle={true}
              items={[
                {
                  statusId: 2,
                  name: "Tasks",
                  count: r.taskCount ?? 0,
                  color: "#f59e0b",
                },
                {
                  statusId: 3,
                  name: "Tickets",
                  count: r.ticketCount ?? 0,
                  color: "#f43f5e",
                },
              ]}
              emptyText="No active items"
            />
          </div>
        );
      },
    },
    {
      id: "actions",
      header: ({ table }) => (
        <div className="flex justify-center">
          {/* <DropdownMenu>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg border-border/60 text-[10px]"
                    >
                      <Settings2 className="h-2 w-2" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">Customize Columns</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-xl shadow-2xl"
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Visible Columns
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide(),
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize text-xs font-semibold py-2 rounded-md"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id.replace(/_/g, " ")}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu> */}
        </div>
      ),
      cell: ({ row }) => {
        const resource = row.original;
        return (
          <div className="flex justify-center">
            <DropdownMenu>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">Resource Actions</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {canEditResource && (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditResource(resource.id);
                      }}
                      className="cursor-pointer"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onSyncWithUser(resource.id);
                      }}
                      className="cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Sync With User
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem
                  onClick={async (e) => {
                    e.stopPropagation();
                    await disableResource(resource.id);
                    toast.success(resource.active_status ? "Resource inactivated" : "Resource activated");
                    reload();
                  }}
                  className="cursor-pointer"
                >
                  {resource.active_status ? (
                    <>
                      <Lock className="w-4 h-4 mr-2" /> Disable
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 mr-2 text-emerald-500" /> Activate
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingResourceId(resource.id);
                    setIsDeleting(true);
                  }}
                  disabled={!canDeleteResource}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer"
                >
                  <Trash className="w-4 h-4 mr-2 text-destructive" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: localResources,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnVisibility },
  });

  if (isLoading)
    return (
      <div className="h-full flex flex-col">
        <ResourceTableSkeleton />
      </div>
    );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col rounded-lg border overflow-hidden">
        {/* Single scroll container — neutralize the Table's own overflow wrapper */}
        <div className="relative flex-1 min-h-0 overflow-auto scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 dark:hover:scrollbar-thumb-gray-600 [&_[data-slot=table-container]]:overflow-visible">
          <Table className="w-full table-fixed">
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-gray-50 dark:[&_th]:bg-gray-900">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="hover:bg-transparent border-b"
                >
                  {headerGroup.headers.map((header) => {
                    const isStickyLeft = header.column.id === "name";
                    const isStickyRight = header.column.id === "actions";
                    const getWidthClass = (id: string) => {
                      switch (id) {
                        case "name": return "w-[270px]";
                        case "division": return "w-24";
                        case "type": return "w-24";
                        case "resourcePools": return "w-36";
                        case "skills": return "w-52";
                        case "reportingPerson": return "w-40";
                        case "counts": return "w-32";
                        case "actions": return "w-10";
                        default: return "";
                      }
                    };
                    return (
                      <TableHead
                        key={header.id}
                        className={`h-10 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground ${getWidthClass(header.column.id)} ${isStickyLeft ? "sticky left-0 z-30 bg-gray-50 dark:bg-gray-900 shadow-[1px_0_0_0_theme(colors.gray.200)] dark:shadow-[1px_0_0_0_theme(colors.gray.700)]" : ""
                          } ${isStickyRight ? "sticky right-0 z-30 bg-gray-50 dark:bg-gray-900 shadow-[-1px_0_0_0_theme(colors.gray.200)] dark:shadow-[-1px_0_0_0_theme(colors.gray.700)]" : ""
                          }`}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const isRowUpdating = updatingRows.has(row.original.id);

                  return (
                    <TableRow
                      key={row.id}
                      className={`group transition-colors border-b border-border 
                      ${isRowUpdating ? "opacity-50 pointer-events-none bg-muted/20" : "hover:bg-primary/[0.01]"}`}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isStickyLeft = cell.column.id === "name";
                        const isStickyRight = cell.column.id === "actions";
                        return (
                          <TableCell
                            key={cell.id}
                            className={`relative align-middle py-1.5 px-4 ${isStickyLeft
                              ? "sticky left-0 z-10 shadow-[1px_0_0_0_theme(colors.gray.200)] dark:shadow-[1px_0_0_0_theme(colors.gray.700)] bg-background group-hover:bg-gray-50 dark:group-hover:bg-gray-900"
                              : ""
                              } ${isStickyRight
                                ? "sticky right-0 z-10 shadow-[-1px_0_0_0_theme(colors.gray.200)] dark:shadow-[-1px_0_0_0_theme(colors.gray.700)] bg-background group-hover:bg-gray-50 dark:group-hover:bg-gray-900"
                                : ""
                              }`}
                          >
                            {/* Show a small spinner on the first cell if updating */}
                            {isRowUpdating && cell.column.id === "name" && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                              </div>
                            )}
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center opacity-50"
                  >
                    No records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Quick Edit Modal */}
      <Dialog
        open={editConfig.isOpen}
        onOpenChange={(open) =>
          setEditConfig((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold tracking-widest">
              Update {editConfig.label}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {editConfig.field === "division" ? (
              <Select
                value={String(editConfig.value)}
                onValueChange={(val) =>
                  setEditConfig((prev) => ({ ...prev, value: val }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.division}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={editConfig.value}
                onChange={(e) =>
                  setEditConfig((prev) => ({ ...prev, value: e.target.value }))
                }
                onKeyDown={(e) => e.key === "Enter" && handleQuickUpdate()}
                autoFocus
              />
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setEditConfig((prev) => ({ ...prev, isOpen: false }))
              }
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleQuickUpdate} disabled={isUpdating}>
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      {isDeleting && (
        <DeleteModal
          isOpen={isDeleting}
          onClose={() => {
            setIsDeleting(false);
            reload();
          }}
          onDelete={() => deleteResource(deletingResourceId!)}
          id={deletingResourceId!}
          title="Archive Resource"
          description="Are you sure? This will remove access for this resource"
        />
      )}
    </div>
  );
};
export default TableView;
