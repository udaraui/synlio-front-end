"use client";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { Skill } from "@/interfaces/skill";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteSkill, disableSkill, loadSkills } from "@/services/resource-management/skill-services";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCw,
  Search,
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
import SkillCreateDrawer from "./form_drawe";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SkillListProps {
  skillCategoryId: number;
}

const Skill_list: React.FC<SkillListProps> = ({ skillCategoryId }) => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedSkillTerm, setDebouncedSkillTerm] = useState("");
  const [debouncedSkillStatusTerm, setDebouncedSkillStatusTerm] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const useServerPagination = true;
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isCreatingSkill, setIsCreatingSkill] = useState(false);
  const [isEditingSkill, setIsEditingSkill] = useState(false);
  const [isDeletingSkill, setIsDeletingSkill] = useState(false);
  const [deletingSkill, setDeletingSkill] = useState<number | null>(null);

  const canCreateSkill = usePrivilegeGuard("18") as boolean;
  const canViewSkill = usePrivilegeGuard("17") as boolean;
  const canEditSkill = usePrivilegeGuard("19") as boolean;
  const canDeleteSkill = usePrivilegeGuard("20") as boolean;

  const totalPages = useServerPagination
    ? Math.ceil(totalRecords / itemsPerPage)
    : Math.ceil(skills.length / itemsPerPage);

  const currentSkills = useServerPagination
    ? skills
    : skills.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const fetchSkills = async () => {
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

      if (!canViewSkill) {
        toast.error("Not authorized to view skills");
        setSkills([]);
        setTotalRecords(0);
        return;
      }

      const result = await loadSkills(params);
      if (result && Array.isArray(result.data)) {
        setTotalRecords(result.total || result.data.length);
        setSkills(result.data.map((skill: any) => ({
          id: skill.id,
          name: skill.name || "",
          categoryId: skill.categoryId,
          isActive: skill.isActive,
          createdAt: skill.createdAt || undefined,
          updatedAt: skill.updatedAt || undefined,
          createdBy: skill.created_by || "",
          updatedBy: skill.updated_by || "",
        })));
      } else {
        setSkills([]);
        setTotalRecords(0);
      }
    } catch {
      toast.error("Failed to fetch skills");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, [debouncedSkillTerm, debouncedSkillStatusTerm, currentPage, itemsPerPage, canViewSkill, sortOption, skillCategoryId]);

  const onSkillEditClick = (skill: Skill) => {
    setSelectedSkill(skill);
    setIsEditingSkill(true);
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5">
        {canCreateSkill && (
          <Button size="sm" className="h-7 text-xs px-2.5" onClick={() => setIsCreatingSkill(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Skill
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-7 px-1.5 bg-transparent" onClick={fetchSkills} disabled={isLoading}>
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
        ) : currentSkills.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-sm">No skills found</p>
            <p className="text-xs mt-1">
              {debouncedSkillTerm ? "Try adjusting your search" : "No skills available"}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {currentSkills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center justify-between gap-3 border border-border/60 rounded-lg px-3 py-3 bg-white dark:bg-gray-800 hover:bg-muted/30 transition-colors"
              >
                {/* Info */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{skill.name}</p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border text-xs font-medium text-foreground/70 flex-shrink-0">
                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${skill.isActive ? "bg-green-500 dark:bg-green-400" : "bg-red-400 dark:bg-red-500"
                      }`} />
                    {skill.isActive ? "Active" : "Inactive"}
                  </div>
                  {/* <Info_button
                  id={skill.id}
                  createdBy={skill.createdBy || ""}
                  createdAt={skill.createdAt || ""}
                  updatedBy={skill.updatedBy || ""}
                  updatedAt={skill.updatedAt || ""}
                /> */}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center h-7 cursor-pointer">
                          <Switch
                            checked={skill.isActive}
                            onCheckedChange={async () => {
                              if (!canEditSkill) {
                                toast.error("Not authorized to change skill status");
                                return;
                              }
                              try {
                                await disableSkill(skill.id);
                                fetchSkills();
                                toast.success(skill.isActive ? "Skill inactivated" : "Skill activated");
                              } catch {
                                toast.error("Failed to update skill status");
                              }
                            }}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {skill.isActive ? "Deactivate Skill" : "Activate Skill"}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canEditSkill) {
                              onSkillEditClick(skill);
                            } else {
                              toast.error("Not authorized to edit skills");
                            }
                          }}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Edit Skill</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canDeleteSkill) {
                              setDeletingSkill(skill.id);
                              setIsDeletingSkill(true);
                            } else {
                              toast.error("Not authorized to delete skills");
                            }
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Delete Skill</TooltipContent>
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
              {totalRecords} skills
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
        <SkillCreateDrawer
          open={isCreatingSkill}
          onOpenChange={setIsCreatingSkill}
          onSkillUpdate={fetchSkills}
          type="create"
          categoryId={skillCategoryId}
        />
      )}
      {isEditingSkill && (
        <SkillCreateDrawer
          open={isEditingSkill}
          onOpenChange={setIsEditingSkill}
          onSkillUpdate={fetchSkills}
          type="update"
          skill={selectedSkill as Skill}
        />
      )}
      {isDeletingSkill && (
        <DeleteModal
          isOpen={isDeletingSkill}
          onClose={() => {
            setIsDeletingSkill(false);
            setDeletingSkill(null);
            fetchSkills();
          }}
          onDelete={() => deleteSkill(deletingSkill || 0)}
          id={deletingSkill || 0}
          title="Delete Skill"
          description="Are you sure you want to delete this skill"
          buttonText="Delete"
          buttonVariant="destructive"
          buttonIcon={<Trash />}
          buttonClassName="w-full"
        />
      )}
    </div>
  );
};

export default Skill_list;
