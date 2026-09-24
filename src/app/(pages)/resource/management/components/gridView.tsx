"use client";
import { useSidebar } from "@/components/ui/sidebar";
import { ResourceGridSkeleton } from "./ResourceSkeletons";
import { Button } from "@/components/ui/button";
import {
  Lock,
  Pencil,
  Trash,
  Unlock,
  MoreVertical,
  UserCheck,
  Contact,
  Globe,
  UserStar
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteResource, disableResource } from "@/services/resource-management/resource-service";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import DeleteModal from "@/components/DeleteModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import ResponsiveBadgeRow from "@/components/common/ResponsiveBadgeRow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

// --- Interface Definitions ---
interface Resource {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_pic: string;
  mobile: number;
  active_status: boolean;
  type?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  division?: {
    id: number;
    division: string;
  };
  calendar?: {
    id: number;
    name: string;
  };
  skills?: {
    id: number;
    skillName: string;
    skillLevelName: string;
    starCount: number;
    skillCategoryName: string;
    companyId: number;
    createdAt: string;
    updatedAt: string;
  }[];
  projectCount?: number;
  taskCount?: number;
  ticketCount?: number;
  reportingPerson?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface GridViewProps {
  resources: Resource[];
  onResourceClick: (resourceId: number) => void;
  isLoading: boolean;
  isSkillsLoading?: boolean;
  individualSkillLoading: { [key: number]: boolean };
  onRefreshSkills?: (resourceId: number) => void; // kept for prop-spread compatibility
  onSyncWithUser: (resourceId: number) => void;
  onEditResource: (resourceId: number) => void;
  reload: () => void;
}

// ----------------------------------------------------------------------------

const getResourceStatusInfo = (isActive: Resource["active_status"]) => {
  if (isActive) {
    return {
      text: "Active",
      classes:
        "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
      barColor: "bg-green-500/80",
    };
  } else {
    return {
      text: "Inactive",
      classes:
        "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
      barColor: "bg-gray-500/80",
    };
  }
};

const GridView: React.FC<GridViewProps> = ({
  resources: initialResources,
  onResourceClick,
  isLoading,
  individualSkillLoading,
  onSyncWithUser,
  onEditResource,
  reload,
}) => {
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingResource, setDeletingResource] = useState<number | null>(null);

  const canEditResource = usePrivilegeGuard("40") as boolean;
  const canDeleteResource = usePrivilegeGuard("41") as boolean;
  const { open: sidebarOpen } = useSidebar();

  useEffect(() => {
    setResources(initialResources);
  }, [initialResources]);


  if (isLoading) {
    return (
      <div >
        <ResourceGridSkeleton />
      </div>
    );
  }

  if (resources.length === 0 && !isLoading) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        No resources found.
      </div>
    );
  }


  // Handle status toggle locally to prevent a jarring full grid reload
  const handleToggleStatus = async (resourceId: number, currentStatus: boolean) => {
    if (!canEditResource) {
      toast.error("Unauthorized");
      return;
    }

    const nextStatus = !currentStatus;

    // Optimistically update view state immediately
    setResources((prev) =>
      prev.map((r) => (r.id === resourceId ? { ...r, active_status: nextStatus } : r))
    );

    try {
      const res = await disableResource(resourceId);
      if (res.status === 200 || res.status === 201) {
        toast.success(currentStatus ? "Resource inactivated" : "Resource activated");
      } else {
        throw new Error(res.message || "Failed to update status");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
      // Revert status state on failure
      setResources((prev) =>
        prev.map((r) => (r.id === resourceId ? { ...r, active_status: currentStatus } : r))
      );
    }
  };

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

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${sidebarOpen ? "lg:grid-cols-2 xl:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4"}`}>
      {resources.map((resource, index) => {
        const fullName = `${resource.first_name} ${resource.last_name}`;
        const initials = `${resource.first_name?.[0] || ""}${resource.last_name?.[0] || ""}`.toUpperCase();

        const utilizationPercent =
          hardcodedUtilizations[index % hardcodedUtilizations.length];
        const utilizationInfo = getUtilizationInfo(utilizationPercent);

        // Circular Progress Calculation
        const radius = 20;
        const circumference = 2 * Math.PI * radius;
        const offset =
          circumference - (utilizationPercent / 100) * circumference;

        return (
          <div
            key={resource.id}
            onClick={() => onResourceClick(resource.id)}
            className="h-[210px] flex flex-col group relative rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer hover:border-blue-400/60 dark:hover:border-blue-500/60"
          >
            {/* 1. Full Header Section with Background Color */}
            <div className="bg-primary/15 dark:bg-slate-900/40 p-2 border-b border-dashed border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                {/* 3. Circular Utilization around Image */}
                <div className="relative flex-shrink-0 group/avatar w-8 h-8 flex items-center justify-center">
                  {/* 
                  <svg className="absolute -rotate-90 w-14 h-14">
                    <circle
                      cx="28"
                      cy="28"
                      r={radius}
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="transparent"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                      cx="28"
                      cy="28"
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

                  <div className="w-8 h-8 rounded-full overflow-hidden relative z-10 bg-primary flex items-center justify-center border border-gray-100 dark:border-gray-700">
                    {resource.profile_pic && resource.profile_pic.length > 0 ? (
                      <img
                        src={resource.profile_pic}
                        alt={fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white dark:text-black text-xs font-semibold">
                        {initials}
                      </span>
                    )}
                    {/*
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white dark:text-black opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 bg-primary">
                      {utilizationPercent}%
                    </span>
                    */}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-50 truncate group-hover:text-blue-600 transition-colors">
                        {fullName}
                      </h4>
                      {/* 2. Status Dot */}
                      <div
                        className="flex items-center"
                        title={resource.active_status ? "Active" : "Inactive"}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${resource.active_status ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-400"}`}
                        />
                      </div>
                    </div>
                    {resource.email && (
                      <p className="text-xs text-muted-foreground truncate">
                        {resource.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Type Tag */}
                {(() => {
                  const rType = resource.type || "Internal";
                  const Icon = rType === "Internal" ? Contact : Globe;
                  return (
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 font-semibold rounded-md border border-gray-200 bg-white text-xs text-gray-700 dark:bg-transparent dark:border-gray-700 dark:text-gray-300"
                    >
                      <Icon className="w-3.5 h-3.5 text-primary" />
                      {rType}
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="flex flex-col flex-grow overflow-hidden">

              {/* 3. Skills: flex-grow pushes the bottom bar down */}
              <div className="p-2 flex-grow overflow-y-auto mb-3">
                <div className="flex gap-1 flex-wrap">
                  {individualSkillLoading[resource.id] ? (
                    // SHOW SKELETONS WHILE THIS RESOURCE'S SKILLS ARE LOADING
                    <>
                      <Skeleton className="h-6 w-16 rounded-sm" />
                      <Skeleton className="h-6 w-20 rounded-sm" />
                      <Skeleton className="h-6 w-14 rounded-sm" />
                    </>
                  ) : (resource.skills && resource.skills.length > 0) ? (
                    <>
                      {/* Show first 3 skills */}
                      {resource.skills.slice(0, 3).map((skill, i) => (
                        <TooltipProvider key={i}>
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md border border-primary bg-primary text-xs font-medium text-white dark:text-black whitespace-nowrap">
                                {skill.skillName}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="p-2 min-w-[120px] bg-white dark:bg-gray-800 border border-border shadow-md"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 capitalize">
                                  {skill?.skillLevelName || "Level"}
                                </span>
                                <div className="flex text-yellow-500">
                                  {[...Array(5)].map((_, index) => (
                                    <span
                                      key={index}
                                      className={index < (skill?.starCount || 0) ? "opacity-100" : "opacity-20"}
                                    >
                                      ★
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}

                      {/* Overflow: hover to show all skills */}
                      {resource.skills.length > 3 && (
                        <HoverCard openDelay={100} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md border border-primary text-primary border-dashed bg-transparent text-xs dark:bg-transparent dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap select-none">
                              +{resource.skills.length - 3}
                            </span>
                          </HoverCardTrigger>
                          <HoverCardContent
                            side="top"
                            align="start"
                            className="w-max min-w-[224px] p-2 bg-white dark:bg-gray-800 border-border shadow-md"
                          >
                            <div className="flex flex-col max-h-52 overflow-y-auto">
                              {resource.skills.slice(3).map((skill, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between gap-2 py-1.5 px-1 border-b border-border last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-none transition-colors"
                                >
                                  <span className="text-xs text-gray-800 dark:text-gray-200 font-medium">
                                    {skill.skillName}
                                  </span>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-[11px] text-gray-500 capitalize">
                                      {skill?.skillLevelName || "Level"}
                                    </span>
                                    <div className="flex text-yellow-500">
                                      {[...Array(5)].map((_, index) => (
                                        <span
                                          key={index}
                                          className={`text-[10px] ${index < (skill?.starCount || 0) ? "opacity-100" : "opacity-20"}`}
                                        >
                                          ★
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      )}
                    </>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-dashed border-gray-300 dark:border-gray-700 bg-transparent dark:bg-transparent text-[11px] font-medium text-gray-400 italic">
                      No skills
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-dashed border-border" />

              {/* 4. Bottom Bar: Stats and Action Dropdown */}
              <div className="p-2 flex items-center justify-between gap-2 flex-shrink-0">
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <div className="flex-1 min-w-0">
                    <ResponsiveBadgeRow
                      hideColorCircle={true}
                      items={[
                        {
                          statusId: 2,
                          name: "Tasks",
                          count: resource.taskCount ?? 0,
                          color: "#f59e0b",
                        },
                        {
                          statusId: 3,
                          name: "Tickets",
                          count: resource.ticketCount ?? 0,
                          color: "#f43f5e",
                        },
                      ]}
                      emptyText="No active items"
                    />
                  </div>
                  {resource.reportingPerson && (
                    <TooltipProvider>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 font-medium rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 whitespace-nowrap cursor-help">
                            <UserStar className="w-3 h-3 text-muted-foreground" />
                            {resource.reportingPerson.first_name} {resource.reportingPerson.last_name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="flex flex-col px-2.5 py-2 bg-white dark:bg-gray-800 border-border shadow-md">
                          <span className="text-xs text-muted-foreground pb-2">{resource.first_name} reports to,</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {resource.reportingPerson.first_name} {resource.reportingPerson.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {resource.reportingPerson.email}
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                <DropdownMenu>
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
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    {/* <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        // Implement assignment logic here
                      }}
                    >
                      Assignments
                    </DropdownMenuItem> */}
                    {canEditResource && (
                      <>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onSyncWithUser(resource.id);
                          }}
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          Sync With User
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditResource(resource.id);
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          if (canEditResource) {
                            handleToggleStatus(resource.id, resource.active_status);
                            // toast.success(`Status updated`);
                            // reload();
                          } else toast.error("Unauthorized");
                        } catch (error) {
                          toast.error(`Failed to update status`);
                        }
                      }}
                    >
                      {resource.active_status ? (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4 mr-2" />
                          Enable
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canDeleteResource) {
                          setIsDeleting(true);
                          setDeletingResource(resource.id);
                        } else toast.error("Unauthorized");
                      }}
                    >
                      <Trash className="w-4 h-4 mr-2 text-destructive" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        );
      })}

      {/* Delete Modal Restored */}
      {isDeleting && deletingResource !== null && (
        <DeleteModal
          isOpen={isDeleting}
          onClose={() => {
            setIsDeleting(false);
            setDeletingResource(null);
            reload();
          }}
          onDelete={() => deleteResource(deletingResource || 0)}
          id={deletingResource}
          title="Delete Resource Group"
          description={`Are you sure you want to delete "${resources.find((p) => p.id === deletingResource)?.first_name}"`}
          buttonText="Delete"
          buttonVariant="destructive"
          buttonIcon={<Trash />}
          buttonClassName="w-full"
          confirmationRequired={false}
          confirmationText="DELETE"
        />
      )}
    </div>
  );
};

export default GridView;

