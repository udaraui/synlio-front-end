'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Pencil,
  Trash,
  RefreshCw,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  X,
} from 'lucide-react';
import Info_button from '@/components/Info_button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Division } from '@/interfaces/division';
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrivilegeGuard } from '@/hooks/use-privilege-guard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { deleteDivision, disableDivision } from '@/services/company-management/division-services';
import DeleteModal from '@/components/DeleteModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DivisionListProps {
  divisions: Division[];
  onDivisionEditClick?: (division: Division) => void;
  itemsPerPage?: number;
  searchTerm?: string;
  onDivisionSearchChange?: (value: string) => void;
  statusTerm?: string;
  onStatusSearchChange?: (value: string) => void;
  currentPage?: number;
  setCurrentPage?: (page: number) => void;
  setItemsPerPage?: (size: number) => void;
  totalRecords?: number;
  useServerPagination?: boolean;
  onDivisionUpdate?: () => void;
  isLoading?: boolean;
  onDivisionCreateClick?: () => void;
  sortOption?: string;
  onSortChange?: (option: string) => void;
}

const DivisionList: React.FC<DivisionListProps> = ({
  divisions,
  onDivisionEditClick,
  itemsPerPage = 10,
  searchTerm: externalSearchTerm,
  onDivisionSearchChange,
  statusTerm: externalStatusTerm,
  onStatusSearchChange,
  currentPage = 1,
  setCurrentPage,
  setItemsPerPage,
  totalRecords = 0,
  useServerPagination = false,
  onDivisionUpdate,
  isLoading = false,
  onDivisionCreateClick,
  sortOption = '',
  onSortChange,
}) => {
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingDivisionId, setDeletingDivisionId] = useState<number | null>(null);

  const canViewDivision = usePrivilegeGuard('8') as boolean;
  const canCreateDivision = usePrivilegeGuard('5') as boolean;
  const canEditDivision = usePrivilegeGuard('6') as boolean;
  const canDeleteDivision = usePrivilegeGuard('7') as boolean;

  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : '';
  const statusTerm = externalStatusTerm !== undefined ? externalStatusTerm : '';

  const totalPages = useServerPagination
    ? Math.ceil(totalRecords / itemsPerPage)
    : Math.ceil(divisions.length / itemsPerPage);

  const currentDivisions = useServerPagination
    ? divisions
    : divisions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex-none sticky top-0 z-10">
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-1.5">
            {canCreateDivision && (
              <Button
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => onDivisionCreateClick?.()}
              >
                <Plus className="w-3.5 h-3.5" /> Add Division
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className={`h-7 w-7 p-0 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={onDivisionUpdate}
              disabled={isLoading}
              title={isLoading ? 'Loading...' : 'Refresh'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <DropdownMenu open={sortDropdownOpen} onOpenChange={setSortDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-7 text-xs px-1.5 ${sortOption ? 'bg-primary/10 dark:bg-primary/20 border-primary text-black dark:text-white' : ''}`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[250px]"
                onMouseLeave={() => setSortDropdownOpen(false)}
              >
                <DropdownMenuLabel className="text-xs font-semibold">Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2 space-y-1">
                  {(
                    [
                      { value: 'name-asc', label: 'Name (A-Z)', icon: <ArrowUp className="w-3.5 h-3.5" /> },
                      { value: 'name-desc', label: 'Name (Z-A)', icon: <ArrowDown className="w-3.5 h-3.5" /> },
                      { value: 'updatedAt-desc', label: 'Updated At (Latest → Earliest)', icon: <ArrowDown className="w-3.5 h-3.5" /> },
                      { value: 'updatedAt-asc', label: 'Updated At (Earliest → Latest)', icon: <ArrowUp className="w-3.5 h-3.5" /> },
                      { value: 'createdAt-desc', label: 'Created At (Latest → Earliest)', icon: <ArrowDown className="w-3.5 h-3.5" /> },
                      { value: 'createdAt-asc', label: 'Created At (Earliest → Latest)', icon: <ArrowUp className="w-3.5 h-3.5" /> },
                    ] as const
                  ).map(({ value, label, icon }) => (
                    <button
                      key={value}
                      onClick={() => { onSortChange?.(value); setSortDropdownOpen(false); }}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent ${sortOption === value ? 'bg-accent font-bold text-black dark:text-white' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        {icon}
                        <span>{label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Search + Status filter + Sort */}
            <div className="flex gap-1.5">
              <div className="relative w-56">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                <Input
                  placeholder="Name"
                  value={searchTerm}
                  onChange={(e) => onDivisionSearchChange?.(e.target.value)}
                  className="h-7 pl-7 text-xs border border-border shadow-none placeholder:text-xs"
                />
              </div>

              <Select
                value={statusTerm}
                onValueChange={(v) => onStatusSearchChange?.(v)}
              >
                <SelectTrigger className="h-7 w-[110px] text-xs border border-border shadow-none flex gap-1">
                  <SelectValue placeholder="Status" className="flex-1 text-left truncate" />
                  {statusTerm && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusSearchChange?.("");
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

      {/* ── Content ── */}
      <div className="flex px-3 py-2 flex-col flex-1 min-h-0">
        {/* Table */}
        <div className="flex flex-col flex-1 min-h-0 rounded-lg border overflow-hidden">
          {/* Single scroll container - neutralize the Table own overflow wrapper */}
          <div className="relative flex-1 min-h-0 overflow-auto [&_[data-slot=table-container]]:overflow-visible">
            <Table>
              <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-gray-50 dark:[&_th]:bg-gray-900">
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="w-[40%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Division
                  </TableHead>
                  <TableHead className="w-[30%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Code
                  </TableHead>
                  <TableHead className="w-[15%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="w-[15%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr:last-child]:border-b [&_tr:last-child]:border-border">
                {!canViewDivision ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-28 text-center text-sm text-destructive">
                      You are not authorized to view divisions
                    </TableCell>
                  </TableRow>
                ) : isLoading ? (
                  Array.from({ length: itemsPerPage > 8 ? 8 : itemsPerPage }).map((_, i) => (
                    <TableRow key={i} className="border-b border-border">
                      <TableCell className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell className="py-2 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Skeleton className="h-5 w-9 rounded-full" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-7 w-7 rounded-md" />
                          <Skeleton className="h-7 w-7 rounded-md" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : currentDivisions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-36 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Building2 className="h-8 w-8 opacity-30" />
                        <p className="text-sm">No divisions found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentDivisions.map((division) => (
                    <TableRow
                      key={division.id}
                      className="group border-b border-border transition-colors hover:bg-muted/30"
                    >
                      <TableCell className="py-2 px-4">
                        <p className="text-sm font-medium truncate">{division.division}</p>
                      </TableCell>

                      <TableCell className="py-2 px-4">
                        <div className="inline-flex items-center px-2 py-0.5 rounded-md border border-border text-xs font-medium text-foreground/70">
                          {division.division_code || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-2 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border text-xs font-medium text-foreground/70">
                          <span
                            className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${division.isActive
                              ? 'bg-green-500 dark:bg-green-400'
                              : 'bg-red-400 dark:bg-red-500'
                              }`}
                          />
                          {division.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </TableCell>

                      <TableCell className="py-2 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-center h-7 cursor-pointer">
                                  <Switch
                                    checked={division.isActive}
                                    onCheckedChange={async () => {
                                      if (!canEditDivision) {
                                        toast.error('Not authorized to change the division status');
                                        return;
                                      }
                                      try {
                                        const result = await disableDivision(division.id);
                                        if (result) {
                                          onDivisionUpdate?.();
                                          toast.success(division.isActive ? "Division inactivated" : "Division activated");
                                        }
                                      } catch {
                                        toast.error('Failed to update division status');
                                      }
                                    }}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {division.isActive ? 'Disable Division' : 'Enable Division'}
                              </TooltipContent>
                            </Tooltip>

                            <Info_button
                              id={division.id}
                              createdBy={division.createdBy || (division as any).created_by || 'Unknown'}
                              createdAt={division.createdAt || (division as any).created_at || ''}
                              updatedBy={division.updatedBy || (division as any).updated_by || 'Unknown'}
                              updatedAt={division.updatedAt || (division as any).updated_at || ''}
                            />

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (canEditDivision) {
                                      onDivisionEditClick?.(division);
                                    } else {
                                      toast.error('Not authorized to edit a division');
                                    }
                                  }}
                                >
                                  <Pencil className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Edit Division</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (canDeleteDivision) {
                                      setIsDeleting(true);
                                      setDeletingDivisionId(division.id);
                                    } else {
                                      toast.error('Not authorized to delete a division');
                                    }
                                  }}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Delete Division</TooltipContent>
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

      {/* Pagination */}
      {totalRecords > 0 && (
        <div className="flex-none border-t border-border bg-background -mx-1 px-1">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-1.5">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} –
              {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
              {totalRecords} divisions
            </span>
            <div className="flex items-center gap-3">
              {setItemsPerPage && (
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(v) => {
                    setItemsPerPage(parseInt(v));
                    setCurrentPage?.(1);
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
              )}
              <div className="flex items-center gap-1">
                {[
                  {
                    label: "«",
                    onClick: () => setCurrentPage?.(1),
                    disabled: currentPage === 1,
                  },
                  {
                    label: "‹",
                    onClick: () => setCurrentPage?.(Math.max(1, currentPage - 1)),
                    disabled: currentPage === 1,
                  },
                  { label: null },
                  {
                    label: "›",
                    onClick: () =>
                      setCurrentPage?.(Math.min(totalPages, currentPage + 1)),
                    disabled: currentPage >= totalPages,
                  },
                  {
                    label: "»",
                    onClick: () => setCurrentPage?.(totalPages),
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

      {isDeleting && (
        <DeleteModal
          isOpen={isDeleting}
          onClose={() => {
            setIsDeleting(false);
            setDeletingDivisionId(null);
            onDivisionUpdate?.();
          }}
          onDelete={() => deleteDivision(deletingDivisionId || 0)}
          id={deletingDivisionId || 0}
          title="Delete Division"
          description="Are you sure you want to delete this division? This action cannot be undone."
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

export default DivisionList;
