"use client";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { Skill_level } from "@/interfaces/skill";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { loadSkill_level, deleteSkillLevel, disableSkillLevel } from "@/services/resource-management/skill-services";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkeletonLoadinWithoutImage } from "@/components/loading/GeneralSkeletons";
import Info_button from "@/components/Info_button";
import SkillLevelFormDrawer from "./form_drawer";
import DeleteModal from "@/components/DeleteModal";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Skill_level_listProps {
  skillCategoryId: number;
}

const Skill_level_list: React.FC<Skill_level_listProps> = ({ skillCategoryId }) => {
  const [skill_levels, setSkill_levels] = useState<Skill_level[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedSkillTerm, setDebouncedSkillTerm] = useState("");
  const [debouncedSkillStatusTerm, setDebouncedSkillStatusTerm] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const useServerPagination = true;
  const [selectedSkill_level, setSelectedSkill_level] = useState<Skill_level | null>(null);
  const [isCreatingSkill, setIsCreatingSkill] = useState(false);
  const [isEditingSkill, setIsEditingSkill] = useState(false);
  const [isDeletingSkill_level, setIsDeletingSkill_level] = useState(false);
  const [deletingSkill_level, setDeletingSkill_level] = useState<number | null>(null);

  const canCreateSkill_level = usePrivilegeGuard("18") as boolean;
  const canViewSkill_level = usePrivilegeGuard("17") as boolean;
  const canEditSkill = usePrivilegeGuard("19") as boolean;
  const canDeleteSkill_level = usePrivilegeGuard("20") as boolean;

  const totalPages = useServerPagination
    ? Math.ceil(totalRecords / itemsPerPage)
    : Math.ceil(skill_levels.length / itemsPerPage);

  const currentSkill_levels = useServerPagination
    ? skill_levels
    : skill_levels.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const fetchSkill_levels = async () => {
    setIsLoading(true);
    try {
      const filters = [
        ...(skillCategoryId
          ? [{ field: "categoryId", value: skillCategoryId, matchMode: "equals" }]
          : []),
        ...(debouncedSkillTerm
          ? [{ field: "name", value: debouncedSkillTerm, matchMode: "contains" }]
          : []),
        ...(debouncedSkillStatusTerm
          ? [{ field: "isActive", value: debouncedSkillStatusTerm, matchMode: "equals" }]
          : []),
      ];
      const params = {
        first: (currentPage - 1) * itemsPerPage,
        rows: itemsPerPage,
        filters,
        ...(sortOption
          ? {
            multiSorts: [{
              field: sortOption.startsWith("name") ? "name"
                : sortOption.startsWith("updatedAt") ? "updatedAt"
                  : "createdAt",
              order: sortOption.endsWith("-desc") ? "-1" : "1",
            }],
          }
          : {}),
      };

      if (!canViewSkill_level) {
        toast.error("Not authorized to view skill levels");
        setSkill_levels([]);
        setTotalRecords(0);
        return;
      }

      const result = await loadSkill_level(params);
      if (result && Array.isArray(result.data)) {
        setTotalRecords(result.total || result.data.length);
        setSkill_levels(result.data.map((sl: any) => ({
          id: sl.id,
          name: sl.name || "",
          star_count: sl.star_count,
          categoryId: sl.categoryId,
          isActive: sl.isActive,
          createdAt: sl.createdAt || undefined,
          updatedAt: sl.updatedAt || undefined,
          createdBy: sl.created_by || "",
          updatedBy: sl.updated_by || "",
        })));
      } else {
        setSkill_levels([]);
        setTotalRecords(0);
      }
    } catch {
      toast.error("Failed to fetch skill levels");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSkill_levels();
  }, [debouncedSkillTerm, debouncedSkillStatusTerm, currentPage, itemsPerPage, canViewSkill_level, skillCategoryId, sortOption]);

  const onSkillEditClick = (skill: Skill_level) => {
    setSelectedSkill_level(skill);
    setIsEditingSkill(true);
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5">
        {canCreateSkill_level && (
          <Button size="sm" className="h-7 text-xs px-2.5" onClick={() => setIsCreatingSkill(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Level
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-7 px-1.5 bg-transparent" onClick={fetchSkill_levels} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </Button>

        <DropdownMenu open={sortDropdownOpen} onOpenChange={setSortDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 px-1.5 bg-transparent">
              <ArrowUpDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[250px]" onMouseLeave={() => setSortDropdownOpen(false)}>
            <DropdownMenuLabel className="text-xs font-semibold">Sort By</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-2 space-y-1">
              {[
                { value: "name-asc", label: "Name (A-Z)", icon: <ArrowUp className="w-3.5 h-3.5" /> },
                { value: "name-desc", label: "Name (Z-A)", icon: <ArrowDown className="w-3.5 h-3.5" /> },
                { value: "updatedAt-desc", label: "Updated At (Latest → Earliest)", icon: <ArrowDown className="w-3.5 h-3.5" /> },
                { value: "updatedAt-asc", label: "Updated At (Earliest → Latest)", icon: <ArrowUp className="w-3.5 h-3.5" /> },
                { value: "createdAt-desc", label: "Created At (Latest → Earliest)", icon: <ArrowDown className="w-3.5 h-3.5" /> },
                { value: "createdAt-asc", label: "Created At (Earliest → Latest)", icon: <ArrowUp className="w-3.5 h-3.5" /> },
              ].map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => { setSortOption(value); setSortDropdownOpen(false); }}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent ${sortOption === value ? "bg-accent font-bold text-black dark:text-white" : ""}`}
                >
                  <div className="flex items-center gap-2">{icon}<span>{label}</span></div>
                </button>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

        <div className="flex gap-1.5">
          <div className="relative w-56">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Name"
              value={debouncedSkillTerm}
              onChange={(e) => setDebouncedSkillTerm(e.target.value)}
              className="h-7 pl-7 text-xs border-gray-300 dark:border-gray-600 placeholder:text-xs shadow-none"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="space-y-2">
            <SkeletonLoadinWithoutImage />
          </div>
        ) : currentSkill_levels.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-sm">No skill levels found</p>
            <p className="text-xs mt-1">
              {debouncedSkillTerm ? "Try adjusting your search" : "No skill levels available"}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {currentSkill_levels.map((sl) => (
              <div
                key={sl.id}
                className="flex items-center justify-between gap-3 border border-border/60 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 hover:bg-muted/30 transition-colors"
              >
                {/* Info */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{sl.name}</p>
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < sl.star_count
                              ? "fill-current text-yellow-500"
                              : "text-gray-300 dark:text-gray-600"
                            }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border text-xs font-medium text-foreground/70 flex-shrink-0">
                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${sl.isActive ? "bg-green-500 dark:bg-green-400" : "bg-red-400 dark:bg-red-500"
                      }`} />
                    {sl.isActive ? "Active" : "Inactive"}
                  </div>
                  {/* <Info_button
                  id={sl.id}
                  createdBy={sl.createdBy || ""}
                  createdAt={sl.createdAt || ""}
                  updatedBy={sl.updatedBy || ""}
                  updatedAt={sl.updatedAt || ""}
                /> */}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center h-7 cursor-pointer">
                          <Switch
                            checked={sl.isActive}
                            onCheckedChange={async () => {
                              if (!canEditSkill) {
                                toast.error("Not authorized to change skill level status");
                                return;
                              }
                              try {
                                await disableSkillLevel(sl.id);
                                fetchSkill_levels();
                                toast.success(sl.isActive ? "Skill level inactivated" : "Skill level activated");
                              } catch {
                                toast.error("Failed to update skill level status");
                              }
                            }}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {sl.isActive ? "Deactivate Skill Level" : "Activate Skill Level"}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-muted"
                          onClick={() => {
                            if (canEditSkill) {
                              onSkillEditClick(sl);
                            } else {
                              toast.error("Not authorized to edit skill levels");
                            }
                          }}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Edit Skill Level</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            if (canDeleteSkill_level) {
                              setDeletingSkill_level(sl.id);
                              setIsDeletingSkill_level(true);
                            } else {
                              toast.error("Not authorized to delete skill levels");
                            }
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Delete Skill Level</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination footer */}
      {totalRecords > 0 && (
        <div className="flex-none border-t bg-background -mx-5 px-5 mt-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 py-1.5">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} –
              {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
              {totalRecords} skill levels
            </span>
            <div className="flex items-center gap-3">
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(v) => {
                  setItemsPerPage(parseInt(v));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-6 text-sm w-20">
                  <SelectValue placeholder="Show" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
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
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreatingSkill && (
        <SkillLevelFormDrawer
          open={isCreatingSkill}
          onOpenChange={setIsCreatingSkill}
          onSkillUpdate={fetchSkill_levels}
          type="create"
          categoryId={skillCategoryId}
        />
      )}
      {isEditingSkill && (
        <SkillLevelFormDrawer
          open={isEditingSkill}
          onOpenChange={setIsEditingSkill}
          onSkillUpdate={fetchSkill_levels}
          type="update"
          categoryId={skillCategoryId}
          skillLevel={selectedSkill_level as Skill_level}
        />
      )}
      {isDeletingSkill_level && (
        <DeleteModal
          isOpen={isDeletingSkill_level}
          onClose={() => {
            setIsDeletingSkill_level(false);
            setDeletingSkill_level(null);
            fetchSkill_levels();
          }}
          onDelete={() => deleteSkillLevel(deletingSkill_level || 0)}
          id={deletingSkill_level || 0}
          title="Delete Skill Level"
          description="Are you sure you want to delete this skill level"
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

export default Skill_level_list;
