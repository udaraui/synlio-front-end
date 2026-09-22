'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Pencil,
  Trash,
  RefreshCw,
  Plus,
  ArrowUp,
  ArrowUpDown,
  ArrowDown,
  ShieldUser,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Role } from '@/interfaces/role';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePrivilegeGuard } from '@/hooks/use-privilege-guard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { deleteRole, disableRole } from '@/services/role-services';
import DeleteModal from '@/components/DeleteModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Info_button from '@/components/Info_button';

interface RoleListProps {
  roles: Role[];
  onRoleClick?: (roleId: number, role: string) => void;
  onRoleEditClick?: (roleId: number) => void;
  itemsPerPage?: number;
  searchTerm?: string;
  onRoleSearchChange?: (value: string) => void;
  statusTerm?: string;
  onStatusSearchChange?: (value: string) => void;
  currentPage?: number;
  setCurrentPage?: (page: number) => void;
  setItemsPerPage?: (size: number) => void;
  totalRecords?: number;
  useServerPagination?: boolean;
  onRoleUpdate?: () => void;
  selectedRole?: number;
  onRoleCreateClick?: () => void;
  isLoading?: boolean;
  isSystemUser?: boolean;
  companies?: any[];
  onCompanySearchChange?: (value: string) => void;
  companyTerm?: string;
  sortOption?: string;
  onSortChange?: (option: string) => void;
  panel?: React.ReactNode;
  panelOpen?: boolean;
}

function RoleList({
  roles,
  onRoleClick,
  onRoleEditClick,
  itemsPerPage = 10,
  searchTerm = '',
  onRoleSearchChange,
  statusTerm = '',
  onStatusSearchChange,
  currentPage = 1,
  setCurrentPage,
  setItemsPerPage,
  totalRecords = 0,
  useServerPagination = false,
  onRoleUpdate,
  selectedRole,
  onRoleCreateClick,
  isLoading = false,
  isSystemUser,
  companies = [],
  onCompanySearchChange,
  companyTerm,
  sortOption = '',
  onSortChange,
  panel,
  panelOpen = false,
}: RoleListProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<number | null>(null);

  const canEditRole = usePrivilegeGuard('10') as boolean;
  const canCreateRole = usePrivilegeGuard('9') as boolean;
  const canDeleteRole = usePrivilegeGuard('11') as boolean;

  const totalPages = useServerPagination
    ? Math.ceil(totalRecords / itemsPerPage)
    : Math.ceil(roles.length / itemsPerPage);

  const currentRoles = useServerPagination
    ? roles
    : roles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Toolbar — spans full page width above the split ── */}
      <div className="flex-none">
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-1.5">
            {canCreateRole && (
              <Button
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => onRoleCreateClick?.()}
              >
                <Plus className="w-3.5 h-3.5" /> Add Role
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className={`h-7 w-7 p-0 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={onRoleUpdate}
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
                  title="Sort"
                  className={`h-7 w-7 p-0 ${sortOption ? 'bg-primary/10 dark:bg-primary/20 border-primary text-black dark:text-white' : ''}`}
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
                  onChange={(e) => onRoleSearchChange?.(e.target.value)}
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



              {/* Company filter (system users only) */}
              {isSystemUser && (
                <Select
                  value={companyTerm}
                  onValueChange={(v) => onCompanySearchChange?.(v)}
                >
                  <SelectTrigger className="h-7 w-[180px] text-xs flex-shrink-0 border border-border shadow-none flex gap-1">
                    <SelectValue placeholder="Company" className="flex-1 text-left truncate" />
                    {companyTerm && (
                      <div
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCompanySearchChange?.("");
                        }}
                        className="ml-auto hover:text-destructive cursor-pointer flex items-center justify-center shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body: table + panel side-by-side ── */}
      <div className="flex px-1  flex-1 overflow-hidden min-h-0">
        <div
          className={`flex flex-col min-h-0 transition-all duration-300 ease-in-out ${panelOpen ? "flex-1 min-w-0" : "w-full"
            }`}
        >
          {/* ── Content ── */}
          <div className="pt-2 pb-2 pl-2 pr-2 flex flex-col flex-1 min-h-0">
            {/* Table */}
            <div className="flex flex-col flex-1 min-h-0 rounded-lg border overflow-hidden">
              {/* Single scroll container - neutralize the Table own overflow wrapper */}
              <div className="relative flex-1 min-h-0 overflow-auto [&_[data-slot=table-container]]:overflow-visible">
                <Table>
                  <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-gray-50 dark:[&_th]:bg-gray-900">
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="w-[50%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Role
                      </TableHead>
                      {isSystemUser && (
                        <TableHead className="w-[20%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                          Company
                        </TableHead>
                      )}

                      <TableHead className="w-[25%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </TableHead>
                      <TableHead className="w-[25%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr:last-child]:border-b [&_tr:last-child]:border-border">
                    {isLoading ? (
                      Array.from({ length: itemsPerPage > 8 ? 8 : itemsPerPage }).map((_, i) => (
                        <TableRow key={i} className="border-b border-border">
                          <TableCell className="py-2 px-4">
                            <Skeleton className="h-4 w-36" />
                          </TableCell>
                          {isSystemUser && (
                            <TableCell className="py-2 px-4 hidden lg:table-cell">
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                          )}

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
                    ) : currentRoles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-48 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <ShieldUser className="h-8 w-8 opacity-30" />
                            <p className="text-md text-muted-foreground">No roles found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentRoles.map((role) => (
                        <TableRow
                          key={role.id}
                          onClick={() => onRoleClick?.(role.id, role.role)}
                          className={`group border-b border-border cursor-pointer transition-colors ${role.id === selectedRole ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/30'
                            }`}
                        >
                          {/* Role name */}
                          <TableCell className="py-2 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{role.role}</span>
                            </div>
                          </TableCell>

                          {/* Company (if System User) */}
                          {isSystemUser && (
                            <TableCell className="py-2 px-4 hidden lg:table-cell">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-transparent text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                                {(() => {
                                  const cId = (role as any).companyId || role.company?.id || (role as any).company_id;
                                  if (!cId || !companies) return 'Unknown';
                                  const c = companies.find((comp: any) => comp.id === cId || comp.companyId === cId);
                                  return c ? (c.company || c.name || c.companyName) : 'Unknown';
                                })()}
                              </span>
                            </TableCell>
                          )}


                          {/* Status */}
                          <TableCell className="py-2 px-4">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border text-xs font-medium text-foreground/70">
                              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${role.active_status ? 'bg-green-500 dark:bg-green-400' : 'bg-red-400 dark:bg-red-500'
                                }`} />
                              {role.active_status ? 'Active' : 'Inactive'}
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell
                            className="py-2 px-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-2">
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center h-7 cursor-pointer">
                                      <Switch
                                        checked={role.active_status}
                                        onCheckedChange={async () => {
                                          if (!canEditRole) {
                                            toast.error('Not authorized to change the role status');
                                            return;
                                          }
                                          try {
                                            const result = await disableRole(role.id);
                                            if (result) {
                                              onRoleUpdate?.();
                                              toast.success(role.active_status ? 'Role inactivated' : 'Role activated');
                                            }
                                          } catch {
                                            toast.error('Failed to update role status');
                                          }
                                        }}
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    {role.active_status ? 'Disable Role' : 'Enable Role'}
                                  </TooltipContent>
                                </Tooltip>

                                <Info_button
                                  id={role.id}
                                  createdBy={role.createdBy || 'Unknown'}
                                  createdAt={role.createdAt || ''}
                                  updatedBy={role.updatedBy || 'Unknown'}
                                  updatedAt={role.updatedAt || ''}
                                />

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (canEditRole) {
                                          onRoleEditClick?.(role.id);
                                        } else {
                                          toast.error('Not authorized to edit a role');
                                        }
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Edit Role</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (canDeleteRole) {
                                          setIsDeleting(true);
                                          setDeletingRoleId(role.id);
                                        } else {
                                          toast.error('Not authorized to delete a role');
                                        }
                                      }}
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Delete Role</TooltipContent>
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

          {/* Pagination - spans the table column only, panel keeps its own scroll */}
          {totalRecords > 0 && (
            <div className="flex-none border-t border-border bg-background -mx-1 px-1">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-1.5">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1} –
                  {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
                  {totalRecords} roles
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
                      <SelectTrigger className="h-6 text-sm w-20 border border-border shadow-none">
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
        </div>
        {panel}
      </div>

      {isDeleting && (
        <DeleteModal
          isOpen={isDeleting}
          onClose={() => {
            setIsDeleting(false);
            setDeletingRoleId(null);
            onRoleUpdate?.();
          }}
          onDelete={() => deleteRole(deletingRoleId || 0)}
          id={deletingRoleId || 0}
          title="Delete Role"
          description="Are you sure you want to delete this role?"
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
}

export default RoleList;
