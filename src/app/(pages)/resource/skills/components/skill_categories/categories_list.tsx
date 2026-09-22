"use client";

import React, { useEffect, useState } from "react";
import { SkillCategory } from "@/interfaces/skill";
import { toast } from "sonner";
import {
  deleteSkillCategory,
  disableSkillCategory,
  loadSkillCategories,
} from "@/services/skill-services";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import SkillCategoryFormDrawer from "./form_drawer";
import DeleteModal from "@/components/DeleteModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Plus,
  RefreshCw,
  Pencil,
  Trash,
  Layers,
  BarChart2,
  ArrowUp,
  ArrowDown,
  X,
  ChevronDown,
  ArrowUpDown,
  Shapes,
  Folders
} from "lucide-react";

interface SkillCategoryTableProps {
  onCategoryClick: (category: SkillCategory) => void;
  onSkillLevelsClick: (category: SkillCategory) => void;
  panel?: React.ReactNode;
  panelOpen?: boolean;
}

const Skill_categories_list: React.FC<SkillCategoryTableProps> = ({
  onCategoryClick,
  onSkillLevelsClick,
  panel,
  panelOpen = false,
}) => {
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nameTerm, setNameTerm] = useState("");
  const [debouncedNameTerm, setDebouncedNameTerm] = useState("");
  const [statusTerm, setStatusTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalRecords, setTotalRecords] = useState(0);

  const [sortOption, setSortOption] = useState("");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editCategory, setEditCategory] = useState<SkillCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const canCreate = usePrivilegeGuard("18") as boolean;
  const canView = usePrivilegeGuard("17") as boolean;
  const canEdit = usePrivilegeGuard("19") as boolean;
  const canDelete = usePrivilegeGuard("20") as boolean;

  const totalPages = Math.ceil(totalRecords / itemsPerPage);

  // Debounce name search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedNameTerm(nameTerm), 400);
    return () => clearTimeout(t);
  }, [nameTerm]);

  // Reset page when filters change
  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [debouncedNameTerm, statusTerm]);

  const fetchCategories = async () => {
    let activeCompanyId: number | null = null;
    try {
      const str = localStorage.getItem("active_company");
      if (str) activeCompanyId = JSON.parse(str)?.companyId ?? null;
    } catch { }

    setIsLoading(true);
    try {
      if (!canView) {
        toast.error("Not authorized to view skill categories");
        setCategories([]);
        setTotalRecords(0);
        return;
      }

      const filters = [
        ...(activeCompanyId
          ? [{ field: "companyId", value: activeCompanyId, matchMode: "equals" }]
          : []),
        ...(debouncedNameTerm
          ? [{ field: "name", value: debouncedNameTerm, matchMode: "contains" }]
          : []),
        ...(statusTerm
          ? [{ field: "isActive", value: statusTerm === "true", matchMode: "equals" }]
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

      const result = await loadSkillCategories(params);
      if (result && Array.isArray(result.data)) {
        setTotalRecords(result.total || result.data.length);
        setCategories(
          result.data.map((c: any) => ({
            id: c.id,
            name: c.name || "",
            description: c.description || "",
            companyId: c.companyId,
            isActive: c.isActive,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            createdBy: c.created_by,
            updatedBy: c.updated_by,
          })),
        );
      } else {
        setCategories([]);
        setTotalRecords(0);
      }
    } catch {
      toast.error("Failed to fetch skill categories");
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [debouncedNameTerm, statusTerm, currentPage, itemsPerPage, canView, sortOption]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Toolbar — spans full page width above the split */}
      <div className="flex-none bg-background pt-1 pb-1">
        <div className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            {canCreate && (
              <Button
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setOpenCreate(true)}
              >
                <Plus className="w-3.5 h-3.5" /> Add Category
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className={`h-7 w-7 p-0 ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={fetchCategories}
              disabled={isLoading}
              title={isLoading ? "Loading" : "Refresh"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <DropdownMenu open={sortDropdownOpen} onOpenChange={setSortDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-7 w-7 text-xs px-2 `}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
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
                  value={nameTerm}
                  onChange={(e) => setNameTerm(e.target.value)}
                  className="h-7 pl-7 text-xs border border-border shadow-none placeholder:text-xs"
                />
              </div>
              <Select
                value={statusTerm}
                onValueChange={(v) => setStatusTerm(v)}
              >
                <SelectTrigger className="h-7 w-[110px] border border-border text-xs shadow-none flex gap-1">
                  <SelectValue placeholder="Status" className="flex-1 text-left truncate" />
                  {statusTerm && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setStatusTerm("");
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

      {/* Body: table + panel side-by-side */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <div
          className={`flex flex-col min-h-0 transition-all duration-300 ease-in-out ${panelOpen ? "flex-1 min-w-0" : "w-full"
            }`}
        >
          {/* Content */}
          <div className="px-3 pb-2 flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 flex flex-col rounded-lg border overflow-hidden">
              {/* Single scroll container — neutralize the Table's own overflow wrapper */}
              <div className="relative flex-1 min-h-0 overflow-auto [&_[data-slot=table-container]]:overflow-visible [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                <Table>
                  <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-gray-50 dark:[&_th]:bg-gray-900">
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[25%]">
                        Category
                      </TableHead>
                      <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[45%]">
                        Description
                      </TableHead>
                      <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[15%]">
                        Status
                      </TableHead>
                      <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right w-[15%]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: itemsPerPage > 8 ? 8 : itemsPerPage }).map((_, i) => (
                        <TableRow key={i} className="border-b border-border">
                          <TableCell className="py-2 px-4">
                            <Skeleton className="h-4 w-3/4 max-w-[200px] rounded" />
                          </TableCell>
                          <TableCell className="py-2 px-4">
                            <Skeleton className="h-4 w-full max-w-[350px] rounded" />
                          </TableCell>
                          <TableCell className="py-2 px-4">
                            <Skeleton className="h-6 w-20 rounded-full" />
                          </TableCell>
                          <TableCell className="py-2 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Skeleton className="h-5 w-9 rounded-full" />
                              <Skeleton className="h-7 w-7 rounded" />
                              <Skeleton className="h-7 w-7 rounded" />
                              <Skeleton className="h-7 w-7 rounded" />
                              <Skeleton className="h-7 w-7 rounded" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-36 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Shapes className="h-8 w-8 opacity-30" />
                            <p className="text-sm">No skill categories found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((cat) => (
                        <TableRow
                          key={cat.id}
                          className="group border-b border-border transition-colors hover:bg-muted/30"
                        >
                          <TableCell className="py-2 px-4">
                            <p className="text-sm font-medium truncate">{cat.name}</p>
                          </TableCell>

                          <TableCell className="py-2 px-4">
                            {cat.description ? (
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-[13px] text-foreground/70 truncate max-w-[350px] cursor-help">
                                      {cat.description}
                                    </p>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[400px] break-words">
                                    {cat.description}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <p className="text-[13px] text-foreground/70 truncate max-w-[350px]">
                                <span className="text-muted-foreground">—</span>
                              </p>
                            )}
                          </TableCell>

                          <TableCell className="py-2 px-4">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border text-xs font-medium text-foreground/70">
                              <span
                                className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cat.isActive
                                  ? "bg-green-500 dark:bg-green-400"
                                  : "bg-red-400 dark:bg-red-500"
                                  }`}
                              />
                              {cat.isActive ? "Active" : "Inactive"}
                            </div>
                          </TableCell>

                          <TableCell className="py-2 px-4 text-right">
                            <div
                              className="flex items-center justify-end gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center h-7 cursor-pointer">
                                      <Switch
                                        checked={cat.isActive}
                                        onCheckedChange={async () => {
                                          if (!canEdit) {
                                            toast.error("Not authorized to change status");
                                            return;
                                          }
                                          try {
                                            await disableSkillCategory(cat.id);
                                            fetchCategories();
                                            toast.success(cat.isActive ? "Skill category inactivated" : "Skill category activated");
                                          } catch {
                                            toast.error("Failed to update status");
                                          }
                                        }}
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    {cat.isActive ? "Deactivate Category" : "Activate Category"}
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onCategoryClick(cat);
                                      }}
                                    >
                                      <Shapes className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">View Skills</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSkillLevelsClick(cat);
                                      }}
                                    >
                                      <BarChart2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">View Skill Levels</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (canEdit) {
                                          setEditCategory(cat);
                                          setOpenEdit(true);
                                        } else {
                                          toast.error("Not authorized to edit");
                                        }
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Edit Category</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (canDelete) {
                                          setDeletingId(cat.id);
                                          setIsDeleting(true);
                                        } else {
                                          toast.error("Not authorized to delete");
                                        }
                                      }}
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Delete Category</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Pagination — spans the table column only, panel keeps its own scroll */}
          {totalRecords > 0 && (
            <div className="flex-none border-t bg-background">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-1.5">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1} –
                  {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
                  {totalRecords} categories
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
        </div>
        {panel}
      </div>

      {openCreate && (
        <SkillCategoryFormDrawer
          open={openCreate}
          onOpenChange={setOpenCreate}
          onSkillUpdate={fetchCategories}
          type="create"
        />
      )}
      {openEdit && editCategory && (
        <SkillCategoryFormDrawer
          open={openEdit}
          onOpenChange={setOpenEdit}
          onSkillUpdate={fetchCategories}
          type="update"
          skillCategory={editCategory}
        />
      )}
      {isDeleting && (
        <DeleteModal
          isOpen={isDeleting}
          onClose={() => {
            setIsDeleting(false);
            setDeletingId(null);
            fetchCategories();
          }}
          onDelete={() => deleteSkillCategory(deletingId || 0)}
          id={deletingId || 0}
          title="Delete Skill Category"
          description="Are you sure you want to delete this skill category"
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

export default Skill_categories_list;
