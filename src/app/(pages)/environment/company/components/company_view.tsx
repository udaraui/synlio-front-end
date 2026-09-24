import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw,
  Search,
  XIcon,
  Pencil,
  ShieldOff,
  Trash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SkeletonLoadinWithoutImage } from "@/components/loading/GeneralSkeletons";
import { Input } from "@/components/ui/input";
import { loadCompanyById } from "@/services/company-management/company-services";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DivisionCreateDrawer from "./division_create_drawer";
import Info_button from "@/components/Info_button";
import DivisionEditDrawer from "./division_edit_drawer";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { toast } from "sonner";
import { deleteDivision, disableDivision } from "@/services/company-management/division-services";
import DeleteModal from "@/components/DeleteModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";

interface CompanyViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
}

const CompanyView: React.FC<CompanyViewProps> = ({
  open,
  onOpenChange,
  companyId,
}) => {
  if (!open) return null;
  const [company, setCompany] = useState<any[]>([]);
  const [debouncedDivisionTerm, setDebouncedDivisionTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [useServerPagination, setUseServerPagination] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [openCreateDivisionDrawer, setOpenCreateDivisionDrawer] =
    useState(false);
  const [openEditDivisionDrawer, setOpenEditDivisionDrawer] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const canCreateDivision = usePrivilegeGuard("5") as boolean;
  const canEditDivision = usePrivilegeGuard("6") as boolean;
  const canDeleteDivision = usePrivilegeGuard("7") as boolean;
  const canViewDivision = usePrivilegeGuard("8") as boolean;

  const totalPages = useServerPagination
    ? Math.ceil(totalRecords / itemsPerPage)
    : Math.ceil(company.length / itemsPerPage);

  const currentCompany = useServerPagination
    ? company
    : company.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    );

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const getCompany = async (companyId: number) => {
    setIsLoading(true);
    const filters = [
      ...(companyId
        ? [
          {
            field: "companyId",
            value: companyId,
            matchMode: "equals",
          },
        ]
        : []),
      ...(debouncedDivisionTerm
        ? [
          {
            field: "division",
            value: debouncedDivisionTerm,
            matchMode: "contains",
          },
        ]
        : []),
    ];

    const params = {
      first: (currentPage - 1) * itemsPerPage,
      rows: itemsPerPage,
      filters,
    };
    if (canViewDivision) {
      const result = await loadCompanyById(params);
      if (result && Array.isArray(result.data)) {
        setCompany(result.data);
        setTotalRecords(result.total);
      }
    }
    // console.log(result);
    setIsLoading(false);
  };

  useEffect(() => {
    getCompany(companyId);
  }, [companyId, debouncedDivisionTerm, currentPage, itemsPerPage]);

  return (
    <div>
      <div className="rounded-lg px-2 sm:px-2">
        <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
          <div>
            <h1 className="text-lg tracking-tight">Divisions</h1>
            {/* <p className="text-sm text-muted-foreground">
              All divisions for Selected Company
            </p> */}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            <div className="relative flex-1 sm:flex-initial sm:min-w-48 md:min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" />
              <Input
                placeholder="Search by name..."
                value={debouncedDivisionTerm}
                onChange={(e) => {
                  const value = e.target.value;
                  setDebouncedDivisionTerm(value);
                }}
                inputSize="sm"
                className="pl-10 w-full"
              />
            </div>

            <div className="flex justify-between gap-2 sm:justify-start">
              <div className="inline-flex rounded-md" role="group">
                <Button
                  className="rounded-r-none"
                  size="sm"
                  variant="outline"
                // onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-none border-x"
                  onClick={() => getCompany(companyId)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="rounded-l-none"
                  onClick={() => {
                    if (canCreateDivision) {
                      setOpenCreateDivisionDrawer(true);
                    } else {
                      toast.error("Not authorized to create a division",
                      );
                    }
                  }}
                >
                  Add <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <Separator className="my-2" />
        <div className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 my-2">
          <span>
            {currentCompany.length} of {totalRecords} divisions
            {debouncedDivisionTerm && <span className="ml-1">(filtered)</span>}
          </span>

          {/* Compact Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCurrentPage && setCurrentPage(Math.max(currentPage - 1, 1))
                }
                disabled={currentPage === 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>

              {/* Responsive page numbers */}
              <div className="flex items-center space-x-1 text-primary">
                {Array.from(
                  { length: Math.min(totalPages, isMobile ? 3 : 5) },
                  (_, i) => {
                    const maxVisible = isMobile ? 3 : 5;
                    let pageNum;
                    if (totalPages <= maxVisible) {
                      pageNum = i + 1;
                    } else if (currentPage <= Math.floor(maxVisible / 2) + 1) {
                      pageNum = i + 1;
                    } else if (
                      currentPage >=
                      totalPages - Math.floor(maxVisible / 2)
                    ) {
                      pageNum = totalPages - maxVisible + 1 + i;
                    } else {
                      pageNum = currentPage - Math.floor(maxVisible / 2) + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "outline" : "ghost"}
                        size="sm"
                        onClick={() =>
                          setCurrentPage && setCurrentPage(pageNum)
                        }
                        className="h-7 w-7 p-0 text-xs"
                      >
                        {pageNum}
                      </Button>
                    );
                  },
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCurrentPage &&
                  setCurrentPage(Math.min(currentPage + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Items per page selector - Mobile friendly */}
          {setItemsPerPage && (
            <div className="flex items-center space-x-1">
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => setItemsPerPage(parseInt(value))}
              >
                <SelectTrigger className=" h-6 text-xs w-17">
                  <SelectValue placeholder="Show" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <SkeletonLoadinWithoutImage count={3} />
          </div>
        ) : company && company.length > 0 ? (
          <div className="space-y-2">
            {currentCompany.map((company, index) => (
              <div key={company.id} className="rounded-lg p-2 border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-2 items-center">
                      <p className="text-sm font-semibold">
                        {company.division}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-xs self-center rounded-md sm:self-auto ${company.isActive
                            ? "bg-green-100 text-green-700 border-green-300"
                            : "bg-red-100 text-red-700 border-red-300"
                          }`}
                      >
                        {company.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Info_button
                        id={company.id}
                        createdBy={company.createdBy}
                        createdAt={company.createdAt}
                        updatedBy={company.updatedBy}
                        updatedAt={company.updatedAt}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {company.division_code}
                    </p>
                  </div>

                  <div className="flex gap-2 items-center justify-end">
                    <TooltipProvider>
                      <div className="flex items-center gap-1 sm:gap-2 self-center sm:self-auto">
                        {/* 1. EDIT BUTTON TOOLTIP */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-1 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 px-2 sm:px-3"
                              onClick={() => {
                                if (canEditDivision) {
                                  setOpenEditDivisionDrawer(true);
                                  setSelectedDivision(company);
                                } else {
                                  toast.error("Not authorized to edit a division",
                                  );
                                }
                              }}
                            >
                              <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit Division Details</p>
                          </TooltipContent>
                        </Tooltip>

                        {/* 2. ACTIVE STATUS SWITCH TOOLTIP (Modified from previous answer) */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-indigo-50 p-2  rounded-md transition-colors duration-150"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Switch
                                id="active-status-switch"
                                checked={company.isActive}
                                onCheckedChange={async () => {
                                  if (canEditDivision) {
                                    try {
                                      const result = await disableDivision(
                                        company.id || 0,
                                      );

                                      if (result) {
                                        setSelectedDivision(null);
                                        await getCompany(companyId);
                                        toast.success(
                                          company.isActive ? "Division inactivated" : "Division activated",
                                        );
                                      }
                                    } catch (error) {
                                      console.error(
                                        "Status toggle failed:",
                                        error,
                                      );
                                      toast.error("Failed to update division status",
                                      );
                                    }
                                  } else {
                                    toast.error("Not authorized to change the division status",
                                    );
                                  }
                                }}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Toggle Active Status</p>
                          </TooltipContent>
                        </Tooltip>

                        {/* 3. DELETE BUTTON TOOLTIP */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 px-2 sm:px-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canDeleteDivision) {
                                  setIsDeleting(true);
                                  setSelectedDivision(company);
                                } else {
                                  toast.error("Not authorized to delete a company",
                                  );
                                }
                              }}
                            >
                              <Trash className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete Division</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="italic text-center py-8 text-sm sm:text-base">
            No divisions assigned
          </p>
        )}
      </div>
      <DivisionCreateDrawer
        open={openCreateDivisionDrawer}
        onOpenChange={setOpenCreateDivisionDrawer}
        companyId={companyId}
        onSubmit={() => getCompany(companyId)}
      />
      <DivisionEditDrawer
        open={openEditDivisionDrawer}
        onOpenChange={setOpenEditDivisionDrawer}
        companyId={companyId}
        division={selectedDivision}
        onSubmit={() => getCompany(companyId)}
      />
      {isDeleting && (
        <DeleteModal
          isOpen={isDeleting}
          onClose={() => {
            setIsDeleting(false);
            setSelectedDivision(null);
            getCompany(companyId);
          }}
          onDelete={() => deleteDivision(selectedDivision.id || 0)}
          id={selectedDivision.id || 0}
          title="Delete Division"
          description="Are you sure you want to Delete this division"
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

export default CompanyView;
