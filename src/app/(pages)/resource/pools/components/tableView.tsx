"use client";

import React, { useState } from "react";
import { ResourcePoolTableSkeleton } from "./ResourcePoolSkeletons";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Pencil,
  Trash,
  Lock,
  Unlock,
  Users,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { deletePool, disable } from "@/services/resource-pool-service";
import DeleteModal from "@/components/DeleteModal";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { useRouter } from "next/navigation";


// --- Interfaces (Matching your GridView) ---
interface ResourcePool {
  resource_pool_id: number;
  resource_pool_name: string;
  resource_pool_status: boolean;
  isActive?: boolean;
  division_name: string;
  pool_owner_first_name: string | null;
  pool_owner_last_name: string | null;
  pool_owner_email?: string | null;
  resources?: any[] | null;
}

interface TableViewProps {
  resourcePools: ResourcePool[];
  isLoading: boolean;
  onEditResourcePool: (id: number) => void;
  reloadPools: () => void;
}

const ResourceGroupTableView: React.FC<TableViewProps> = ({
  resourcePools,
  isLoading,
  onEditResourcePool,
  reloadPools,
}) => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingPoolId, setDeletingPoolId] = useState<number | null>(null);

  const canEdit = usePrivilegeGuard("43") as boolean;
  const canDelete = usePrivilegeGuard("51") as boolean;

  const columns: ColumnDef<ResourcePool>[] = [
    {
      accessorKey: "resource_pool_name",
      header: "GROUP",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <span
            className="text-sm font-medium cursor-pointer hover:text-blue-600 transition-colors"
          >
            {row.original.resource_pool_name}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "division_name",
      header: "DIVISION",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="border-dashed border-gray-300 dark:border-gray-600 dark:text-gray-400"
        >
          {row.original.division_name}
        </Badge>
      ),
    },
    {
      accessorKey: "pool_owner",
      header: "OWNER",
      cell: ({ row }) => {
        const first = row.original.pool_owner_first_name;
        const last = row.original.pool_owner_last_name;
        const email = row.original.pool_owner_email;
        const name = first ? `${first} ${last || ""}`.trim() : null;

        if (!name) {
          return (
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 cursor-default">
                    <div>
                      <div className="w-8 h-8 rounded-full border border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 italic truncate">
                        No Owner
                      </span>
                      <span className="text-xs text-transparent mt-0.5 truncate select-none">
                        -
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>No Owner</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return (
          <>
          <div className="flex items-center gap-1.5">
            <div>
              <Avatar className="w-8 h-8 text-xs relative">
                <AvatarFallback className="text-xs font-semibold bg-primary text-white">
                  {((first?.charAt(0) || "") + (last?.charAt(0) || "")).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">
                {name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 truncate">
                {email || "No email"}
              </span>
            </div>
            </div>
          </>
        );
      },
    },
    {
      accessorKey: "resources",
      header: "MEMBERS",
      cell: ({ row }) => {
        const resources = row.original.resources || [];
        const MAX_VISIBLE = 4;
        const visibleResources = resources.slice(0, MAX_VISIBLE);
        const remainingCount = Math.max(resources.length - MAX_VISIBLE, 0);

        if (resources.length === 0) {
          return <span className="text-xs text-gray-400 italic">No members</span>;
        }

        return (
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <div className="flex items-center group/avatars cursor-pointer">
                <AvatarGroup
                  className={`${resources.length <= 1 ? "-space-x-0" : "-space-x-2"} *:transition-all *:ring-1 *:ring-white dark:*:ring-gray-800 *:group-hover/avatars:ring-primary/50`}
                >
                  {visibleResources.map((resource: any) => {
                    const rFirst = resource.first_name || resource.firstName;
                    const rLast = resource.last_name || resource.lastName;
                    const rName = `${rFirst || ""} ${rLast || ""}`.trim();
                    return (
                      <Avatar
                        key={resource.id || resource.resourceId}
                        className="w-8 h-8 text-xs relative"
                      >
                        {resource.profile_pic && (
                          <AvatarImage src={resource.profile_pic} alt={rName} className="object-cover" />
                        )}
                        <AvatarFallback className="text-xs font-semibold bg-primary text-white">
                          {((rFirst?.charAt(0) || "") + (rLast?.charAt(0) || "")).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })}
                  {remainingCount > 0 && (
                    <AvatarGroupCount
                      className="w-8 h-8 text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-none font-medium relative"
                    >
                      +{remainingCount}
                    </AvatarGroupCount>
                  )}
                </AvatarGroup>
              </div>
            </HoverCardTrigger>
            <HoverCardContent align="start" className="w-auto p-0 overflow-hidden" sideOffset={8}>
              <div className="flex flex-col">
                <div className="px-3 py-2">
                  <h4 className="text-xs text-gray-900 dark:text-gray-100">Resource Group Members</h4>
                </div>
                <div className="h-px bg-gray-200 dark:bg-gray-700 w-full" />
                <div className="flex flex-col gap-3 p-3">
                  {resources.map((r: any) => {
                    const rFirst = r.first_name || r.firstName;
                    const rLast = r.last_name || r.lastName;
                    return (
                      <div key={r.id || r.resourceId} className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium leading-none">{rFirst} {rLast}</span>
                        {r.email && <span className="text-[11px] text-muted-foreground">{r.email}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "STATUS",
      cell: ({ row }) => (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border text-xs font-medium">
          <span
            className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${row.original.isActive
                ? "bg-green-500 dark:bg-green-400"
                : "bg-red-400 dark:bg-red-500"
              }`}
          />
          {row.original.isActive ? "Active" : "Inactive"}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right pr-1">ACTIONS</div>,
      cell: ({ row }) => {
        const pool = row.original;
        const isActive = pool.isActive;

        return (
          <div className="flex justify-end gap-1">
            <TooltipProvider delayDuration={0}>
              {/* View Resources Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:text-primary hover:border-primary transition-colors"
                    disabled={!pool.isActive}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/resource/management?resourceGroupId=${pool.resource_pool_id}`);
                    }}
                  >
                    <Users className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">View Resources</TooltipContent>
              </Tooltip>

              {/* Edit Button */}
              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 hover:text-primary hover:border-primary transition-colors"
                      disabled={!pool.isActive}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditResourcePool(pool.resource_pool_id);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Edit Resource Group</TooltipContent>
                </Tooltip>
              )}

              {/* Toggle Status Button */}
              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-7 w-7 p-0 hover:text-primary dark:hover:text-primary hover:border-primary transition-colors ${!pool.isActive
                        ? 'text-green-600 dark:text-green-400'
                        : ''
                        }`}
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await disable(pool.resource_pool_id);
                          toast.success(`Resource group ${isActive ? "inactivated" : "activated"}`,
                          );
                          reloadPools();
                        } catch (err) {
                          toast.error("Update failed");
                        }
                      }}
                    >
                      {isActive ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{isActive ? "Inactivate Resource Group" : "Activate Resource Group"}</TooltipContent>
                </Tooltip>
              )}

              {/* Delete Button */}
              {canDelete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:border-destructive transition-colors"
                      disabled={!pool.isActive}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingPoolId(pool.resource_pool_id);
                        setIsDeleting(true);
                      }}
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Delete Resource Group</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: resourcePools,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading)
    return (
      <div className="h-full flex flex-col">
        <ResourcePoolTableSkeleton rows={12} />
      </div>
    );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col rounded-lg border overflow-hidden">
        {/* Single scroll container — neutralize the Table's own overflow wrapper */}
        <div className="relative flex-1 min-h-0 overflow-auto [&_[data-slot=table-container]]:overflow-visible">
          <Table className="table-fixed min-w-[900px]">
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-gray-50 dark:[&_th]:bg-gray-900">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="hover:bg-transparent border-b border-border"
                >
                  {headerGroup.headers.map((header) => {
                    const getWidthClass = (id: string) => {
                      switch (id) {
                        case "resource_pool_name": return "w-64";
                        case "division_name": return "w-40";
                        case "pool_owner": return "w-56";
                        case "resources": return "w-40";
                        case "isActive": return "w-32";
                        case "actions": return "w-16";
                        default: return "";
                      }
                    };
                    return (
                      <TableHead
                        key={header.id}
                        className={`h-10 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground ${getWidthClass(header.column.id)}`}
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
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={`group transition-colors border-b border-border hover:bg-gray-50/50 dark:hover:bg-gray-800/50 ${!row.original.isActive ? 'cursor-not-allowed bg-gray-50 dark:bg-gray-900/50' : 'cursor-pointer'}`}
                    onClick={() => {
                      if (row.original.isActive) {
                        router.push(
                          `/resource/management?resourceGroupId=${row.original.resource_pool_id}`,
                        );
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={`py-1.75 px-4 ${!row.original.isActive && cell.column.id !== 'actions' ? 'opacity-60 grayscale' : ''}`}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center opacity-50"
                  >
                    No resource groups found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {isDeleting && (
        <DeleteModal
          isOpen={isDeleting}
          onClose={() => setIsDeleting(false)}
          onDelete={async () => {
            const res = await deletePool(deletingPoolId!);
            if (res) {
              toast.success("Resource group deleted");
              reloadPools();
            }
          }}
          id={deletingPoolId!}
          title="Delete Resource Group"
          description="Are you sure you want to delete this group? Resources will remain but the group mapping will be lost"
        />
      )}
    </div>
  );
};

export default ResourceGroupTableView;

