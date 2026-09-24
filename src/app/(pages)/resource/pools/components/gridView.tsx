"use client";
import { ResourcePoolGridSkeleton } from "./ResourcePoolSkeletons";
import { Button } from "@/components/ui/button";
import { Lock, Pencil, Trash, Unlock, Plus, User } from "lucide-react";
import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { deletePool, disable, editResourcePool } from "@/services/resource-management/resource-pool-service";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { toast } from "sonner";
import DeleteModal from "@/components/DeleteModal";
import { useRouter } from "next/navigation";
import ResourceSelector from "@/components/common/ResourceSelector";
import { Resource } from "@/interfaces/resource";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useSidebar } from "@/components/ui/sidebar";

// --- INTERFACES (Kept as provided) ---
interface ResourcePool {
  resource_pool_id: number;
  resource_pool_name: string;
  resource_pool_status: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  isActive?: boolean;
  company_id: number;
  company_name: string;
  company_code: string;
  division_id: number;
  division_name: string;
  division_code: string;
  pool_owner_id: number | null;
  pool_owner_first_name: string | null;
  pool_owner_last_name: string | null;
  pool_owner_email: string | null;
  pool_owner_mobile: string | null;
  resources?:
  | {
    resourceId: number;
    firstName: string;
    lastName: string;
    email: string;
    profile_pic: string;
    divisionId: number;
    active: boolean;
  }[]
  | null;
}



interface GridViewProps {
  resourcePools: ResourcePool[];
  onResourcePoolClick: (resourcePoolId: number) => void;
  isLoading: boolean;
  onEditResourcePool: (resourcePoolId: number) => void;
  reloadPools: () => void;
}

// --- GRIDVIEW COMPONENT ---

const GridView: React.FC<GridViewProps> = ({
  resourcePools,
  onResourcePoolClick,
  isLoading,
  onEditResourcePool,
  reloadPools,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingPool, setDeletingPool] = useState<number | null>(null);

  const canEditResource = usePrivilegeGuard("43") as boolean;
  const canDeleteResource = usePrivilegeGuard("51") as boolean;

  const router = useRouter();
  const { open: sidebarOpen } = useSidebar();

  // --- DELETE MODAL HANDLERS ---
  const handleCloseDeleteModal = () => {
    setIsDeleting(false);
    setDeletingPool(null);
  };

  const handleConfirmDelete = async () => {
    if (deletingPool === null) return;

    try {
      const result = await deletePool(deletingPool);
      if (result) {
        toast.success(`Resource Group ${deletingPool} deleted`);
        reloadPools(); // Reload only on successful deletion
      } else {
        toast.error("Failed to delete resource group");
      }
    } catch (error) {
      // console.error('Error deleting resource group:', error);
      toast.error("An error occurred during deletion");
    } finally {
      handleCloseDeleteModal();
    }
  };
  // --- END DELETE MODAL HANDLERS ---

  const handleAddResources = async (resourcePool: ResourcePool, newResources: Resource[]) => {
    try {
      const ids = newResources.map((r) => r.id || (r as any).resourceId);
      await editResourcePool(resourcePool.resource_pool_id, {
        name: resourcePool.resource_pool_name,
        company: resourcePool.company_id,
        division: resourcePool.division_id,
        pool_owner: resourcePool.pool_owner_id,
        resources: ids,
      });
      toast.success("Resources updated");
      reloadPools();
    } catch (error) {
      toast.error("Failed to update resources");
    }
  };

  if (isLoading) {
    return <ResourcePoolGridSkeleton count={12} />;
  }

  return (
    <>
      <div className={`grid gap-3 ${sidebarOpen ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'}`}>
        {resourcePools.map((resourcePool) => {
          const resources = resourcePool.resources || [];
          const MAX_VISIBLE = 4;
          const visibleResources = resources.slice(0, MAX_VISIBLE);
          const remainingCount = Math.max(resources.length - MAX_VISIBLE, 0);

          // Status Bar Color Logic
          const isActive = resourcePool.isActive;
          const statusText = isActive ? "Active" : "Inactive";

          return (
            <div
              key={resourcePool.resource_pool_id}
              className={`group relative rounded-xl border-y border-r border-l-2 shadow-sm transition-all duration-300 overflow-hidden flex flex-col h-full min-h-[160px]
              ${isActive
                  ? 'border-t-gray-200/60 border-b-gray-200/60 border-r-gray-200/60 border-l-primary bg-white dark:bg-gray-800 dark:border-t-gray-700/60 dark:border-b-gray-700/60 dark:border-r-gray-700/60 hover:shadow-xl hover:border-primary dark:hover:border-primary cursor-pointer'
                  : 'border-t-gray-200/40 border-b-gray-200/40 border-r-gray-200/40 border-l-gray-300 dark:border-l-gray-600 bg-gray-50 dark:bg-gray-900 dark:border-t-gray-800 dark:border-b-gray-800 dark:border-r-gray-800 cursor-not-allowed'
                }`}
              onClick={() => {
                if (isActive) {
                  router.push(
                    `/resource/management?resourceGroupId=${resourcePool.resource_pool_id}`
                  );
                }
              }}
            >
              <div className={`flex flex-col flex-1 p-3 pb-0 ${!isActive ? 'opacity-60 grayscale' : ''}`}>
                {/* Header: Name & Status */}
                <div className="flex items-center justify-between gap-3">
                  <h4
                    className="text-md font-semibold text-gray-900 dark:text-gray-50 transition-colors line-clamp-1 group-hover:text-primary dark:group-hover:text-primary"
                    title={resourcePool.resource_pool_name}
                  >
                    {resourcePool.resource_pool_name}
                  </h4>
                  <div className="flex items-center gap-2 flex-shrink-0" title={`Divison: ${resourcePool.division_name}`}>
                    {resourcePool.division_name && (
                      <Badge
                        variant="outline"
                        className="border-dashed border-gray-300 dark:border-gray-600 dark:text-gray-400"
                      >
                        {resourcePool.division_name}
                      </Badge>
                    )}
                    {/* <div className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs border font-medium text-gray-600 dark:text-gray-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                    {statusText}
                  </div> */}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border/60 my-3 flex-shrink-0" />

                {/* Owner & Team Members */}
                <div className="flex items-center justify-between pt-3 pb-3 flex-shrink-0">
                  {/* Owner */}
                  <div className="flex items-center gap-1.5">
                    {resourcePool.pool_owner_first_name ? (
                      <TooltipProvider>
                        <Tooltip delayDuration={300}>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 cursor-default">
                              <div>
                                <Avatar className="w-8 h-8 text-xs bg-primary/10">
                                  <AvatarFallback className="text-xs font-semibold bg-primary">
                                    {((resourcePool.pool_owner_first_name?.charAt(0) || "") + (resourcePool.pool_owner_last_name?.charAt(0) || "")).toUpperCase() || "?"}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm text-gray-900 dark:text-gray-100 leading-none">
                                  {resourcePool.pool_owner_first_name} {resourcePool.pool_owner_last_name}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-none">
                                  {resourcePool.pool_owner_email || "No email"}
                                </span>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Resource Group Owner</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <TooltipProvider>
                        <Tooltip delayDuration={300}>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 cursor-default">
                              <div>
                                <div className="w-8 h-8 rounded-full border border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center flex-shrink-0">
                                  <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm text-gray-500 dark:text-gray-400 italic leading-none">
                                  No Owner
                                </span>
                                <span className="text-xs text-transparent mt-1 leading-none select-none">
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
                    )}
                  </div>
                  {/* Team Members */}
                  <div className="flex flex-col items-end gap-1 relative group/avatars">
                    <div className="flex items-center rounded-full cursor-pointer transition-all">
                      {resources.length > 0 ? (
                        <HoverCard openDelay={200} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <div className="flex items-center">
                              <AvatarGroup className={`${resources.length <= 1 ? '-space-x-0' : '-space-x-2'} *:transition-all *:ring-1 *:ring-white dark:*:ring-gray-800 *:group-hover/avatars:ring-primary/50`}>
                                {visibleResources.map((resource) => (
                                  <Avatar key={resource.resourceId} className="w-8 h-8 text-xs relative">
                                    {resource.profile_pic && resource.profile_pic.length > 0 && (
                                      <AvatarImage src={resource.profile_pic} alt={`${resource.firstName} ${resource.lastName}`} className="object-cover" />
                                    )}
                                    <AvatarFallback className="text-xs font-semibold bg-primary">
                                      {((resource.firstName?.charAt(0) || "") + (resource.lastName?.charAt(0) || "")).toUpperCase() || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                                {remainingCount > 0 && (
                                  <AvatarGroupCount
                                    className="w-8 h-8 text-sm bg-gray-100 dark:bg-gray-700 border-none font-medium flex items-center justify-center relative z-0 ring-2 ring-white dark:ring-gray-800"
                                  >
                                    +{remainingCount}
                                  </AvatarGroupCount>
                                )}
                              </AvatarGroup>
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent align="end" className="w-auto p-0 overflow-hidden" sideOffset={8}>
                            <div className="flex flex-col">
                              <div className="px-3 py-2">
                                <h4 className="text-xs text-gray-900 dark:text-gray-100">Resource Group Members</h4>
                              </div>
                              <div className="h-px bg-gray-200 dark:bg-gray-700 w-full" />
                              <div className="flex flex-col gap-3 p-3">
                                {resources.map((r) => (
                                  <div key={r.resourceId} className="flex flex-col gap-0.5">
                                    <span className="text-sm font-medium leading-none">{r.firstName} {r.lastName}</span>
                                    {r.email && <span className="text-[11px] text-muted-foreground">{r.email}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400 italic leading-none">No Members</span>
                          <div className="w-8 h-8 rounded-full border border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center flex-shrink-0" title="No Members">
                            <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons - Single Row */}
              <div className="p-3 mt-auto">
                <TooltipProvider>
                  <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex-1 min-w-0">
                      <ResourceSelector
                        mode="multi"
                        selectedResources={resources.map((r) => ({
                          id: r.resourceId,
                          resourceId: r.resourceId,
                          first_name: r.firstName,
                          last_name: r.lastName,
                          email: r.email,
                          profile_pic: r.profile_pic,
                          working_hours: 0,
                        }))}
                        onChange={(newResources) => handleAddResources(resourcePool, newResources)}
                        showTrigger={true}
                        showAllTabs={true}
                        showResourceGroups={false}
                        triggerElement={
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-xs font-medium hover:text-primary hover:border-primary transition-colors"
                            disabled={!isActive}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add Resource
                          </Button>
                        }
                      />
                    </div>

                    {canEditResource && (
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 hover:text-primary hover:border-primary transition-colors"
                            disabled={!isActive}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditResourcePool(resourcePool.resource_pool_id);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Edit Resource Group</TooltipContent>
                      </Tooltip>
                    )}

                    {canEditResource && (
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-7 w-7 p-0 hover:text-primary dark:hover:text-primary hover:border-primary transition-colors ${!isActive
                              ? 'text-green-600 dark:text-green-400'
                              : ''
                              }`}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await disable(resourcePool.resource_pool_id);
                                toast.success(`Resource Group ${isActive ? "inactivated" : "activated"}`
                                );
                                reloadPools();
                              } catch (error) {
                                toast.error(`Failed to ${isActive ? "disable" : "enable"} group`);
                              }
                            }}
                          >
                            {isActive ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">{isActive ? "Inactivate Resource Group" : "Activate Resource Group"}</TooltipContent>
                      </Tooltip>
                    )}

                    {canDeleteResource && (
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:border-destructive transition-colors"
                            disabled={!isActive}
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsDeleting(true);
                              setDeletingPool(resourcePool.resource_pool_id);
                            }}
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Delete Resource Group</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TooltipProvider>
              </div>
            </div>
          );
        })}
      </div>

      {isDeleting && deletingPool !== null && (
        <DeleteModal
          isOpen={isDeleting}
          onClose={handleCloseDeleteModal}
          // Pass the handler that executes the API call using the stored ID
          onDelete={handleConfirmDelete}
          id={deletingPool}
          title="Delete Resource Group"
          description={`Are you sure you want to permanently delete Resource Group "${resourcePools.find((p) => p.resource_pool_id === deletingPool)
              ?.resource_pool_name || deletingPool
            }"? This action cannot be undone`}
          buttonText="Delete"
          buttonVariant="destructive"
          buttonIcon={<Trash />}
          buttonClassName="w-full"
          confirmationRequired={false}
          confirmationText="DELETE"
        />
      )}
    </> // Added React Fragment to contain both the grid and the modal
  );
};

export default GridView;

