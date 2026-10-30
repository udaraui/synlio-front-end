'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  Pencil,
  Trash,
  RefreshCw,
  Plus,
  Users,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  X,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { User } from '@/interfaces/user';
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from '@/components/ui/select';
import { PaginationControls } from '@/components/common/PaginationControls';
import {
  CompanyFilterCombobox,
  CompanyFilterOption,
} from '@/components/common/CompanyFilterCombobox';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrivilegeGuard } from '@/hooks/use-privilege-guard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { disableUser } from '@/services/user-management/user-service';
import { disableResource } from '@/services/resource-management/resource-service';
import DeleteUserModal from './delete-user-modal';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Info_button from '@/components/Info_button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UserListProps {
  users: User[];
  onUserClick?: (userId: number) => void;
  onUserEditClick?: (userId: number) => void;
  itemsPerPage?: number;
  searchTerm?: string;
  onNameSearchChange?: (value: string) => void;
  statusTerm?: string;
  onStatusSearchChange?: (value: string) => void;
  currentPage?: number;
  setCurrentPage?: (page: number) => void;
  setItemsPerPage?: (size: number) => void;
  totalRecords?: number;
  useServerPagination?: boolean;
  onUserUpdate?: () => void;
  isLoading?: boolean;
  onUserCreateDrawerClick?: () => void;
  selectedUser?: User | null;
  isSystemUser?: boolean;
  companies?: CompanyFilterOption[];
  onCompanySearchChange?: (value: string) => void;
  companyTerm?: string;
  sortOption?: string;
  onSortChange?: (option: string) => void;
  panel?: React.ReactNode;
  panelOpen?: boolean;
}

const UserList: React.FC<UserListProps> = ({
  users,
  onUserClick,
  onUserEditClick,
  itemsPerPage = 10,
  searchTerm: externalSearchTerm,
  onNameSearchChange,
  statusTerm: externalStatusTerm,
  onStatusSearchChange,
  currentPage = 1,
  setCurrentPage,
  setItemsPerPage,
  totalRecords = 0,
  useServerPagination = false,
  onUserUpdate,
  isLoading = false,
  onUserCreateDrawerClick,
  selectedUser,
  isSystemUser,
  companies = [],
  onCompanySearchChange,
  companyTerm,
  sortOption = '',
  onSortChange,
  panel,
  panelOpen = false,
}) => {
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const canViewUser = usePrivilegeGuard('16') as boolean;
  const canCreateUser = usePrivilegeGuard('13') as boolean;
  const canEditUser = usePrivilegeGuard('14') as boolean;
  const canDeleteUser = usePrivilegeGuard('15') as boolean;

  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : '';
  const statusTerm = externalStatusTerm !== undefined ? externalStatusTerm : '';

  const safeUsers = Array.isArray(users) ? users : [];
  const totalPages = useServerPagination
    ? Math.max(1, Math.ceil(totalRecords / itemsPerPage))
    : Math.max(1, Math.ceil(safeUsers.length / itemsPerPage));

  const currentUsers = useServerPagination
    ? safeUsers
    : safeUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getInitials = (firstName: string, lastName: string) => {
    const f = (firstName || '').trim();
    const l = (lastName || '').trim();
    return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Toolbar section — spans full page width above the split ── */}
      <div className="flex-none">
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-1.5">
            {canCreateUser && (
              <Button
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => onUserCreateDrawerClick?.()}
              >
                <Plus className="w-3.5 h-3.5" /> Add User
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className={`h-7 w-7 p-0 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={onUserUpdate}
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
                  className="h-7 w-7 p-0"
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

            {/* Search + Status filter + Sort + Company */}
            <div className="flex gap-1.5">
              <div className="relative w-56">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                <Input
                  placeholder="Name or email"
                  value={searchTerm}
                  onChange={(e) => onNameSearchChange?.(e.target.value)}
                  className="h-7 pl-7 text-xs border border-border shadow-none placeholder:text-xs"
                />
              </div>

              <Select
                value={statusTerm}
                onValueChange={(value) =>
                  onStatusSearchChange?.(value)
                }
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

              {isSystemUser && (
                <CompanyFilterCombobox
                  companies={companies}
                  value={companyTerm}
                  onChange={(value) => onCompanySearchChange?.(value)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body: table + panel side-by-side ── */}
      <div className="flex px-1 flex-1 overflow-hidden min-h-0">
        <div
          className={`flex flex-col min-h-0 transition-all duration-300 ease-in-out ${panelOpen ? "flex-1 min-w-0" : "w-full"
            }`}
        >
          {/* ── Content section: title + table ── */}
          <div className="pt-2 pl-2 pr-2 pb-2 flex flex-col flex-1 min-h-0">
            {/* Table */}
            <div className="flex flex-col flex-1 min-h-0 rounded-lg border overflow-hidden">
              {/* Single scroll container - neutralize the Table own overflow wrapper */}
              <div className="relative flex-1 min-h-0 overflow-auto [&_[data-slot=table-container]]:overflow-visible">
                <Table>
                  <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-gray-50 dark:[&_th]:bg-gray-900">
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="w-[20%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        User
                      </TableHead>
                      <TableHead className="w-[20%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Email
                      </TableHead>
                      <TableHead className="w-[10%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                        Phone
                      </TableHead>
                      <TableHead className="w-[15%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Roles
                      </TableHead>
                      <TableHead className="w-[10%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </TableHead>
                      {isSystemUser && (
                        <TableHead className="w-[15%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                          Company
                        </TableHead>
                      )}
                      <TableHead className="w-[10%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr:last-child]:border-b [&_tr:last-child]:border-border">
                    {!canViewUser ? (
                      <TableRow>
                        <TableCell colSpan={isSystemUser ? 7 : 6} className="h-28 text-center text-sm text-destructive">
                          You are not authorized to view users
                        </TableCell>
                      </TableRow>
                    ) : isLoading ? (
                      Array.from({ length: itemsPerPage > 8 ? 8 : itemsPerPage }).map((_, i) => (
                        <TableRow key={i} className="border-b border-border">
                          <TableCell className="py-2 px-4">
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-8 w-8 rounded-full" />
                              <Skeleton className="h-4 w-32" />
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-4">
                            <Skeleton className="h-4 w-40" />
                          </TableCell>
                          <TableCell className="py-2 px-4 hidden lg:table-cell">
                            <Skeleton className="h-4 w-28" />
                          </TableCell>
                          <TableCell className="py-2 px-4">
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell className="py-2 px-4">
                            <Skeleton className="h-5 w-16 rounded-full" />
                          </TableCell>
                          {isSystemUser && (
                            <TableCell className="py-2 px-4 hidden lg:table-cell">
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                          )}
                          <TableCell className="py-2 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Skeleton className="h-5 w-9 rounded-full mr-1.5" />
                              <Skeleton className="h-7 w-7 rounded-md" />
                              <Skeleton className="h-7 w-7 rounded-md" />
                              <Skeleton className="h-7 w-7 rounded-md" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : currentUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isSystemUser ? 7 : 6} className="h-36 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Users className="h-8 w-8 opacity-30" />
                            <p className="text-sm text-muted-foreground">No users found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentUsers.map((user) => (
                        <TableRow
                          key={user.id}
                          className={`group border-b border-border cursor-pointer transition-colors
                      ${user.id === selectedUser?.id
                              ? 'bg-primary/5 border-l-2 border-l-primary'
                              : 'hover:bg-muted/30'
                            }`}
                          onClick={() => onUserClick?.(user.id)}
                        >
                          <TableCell className="py-2 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage
                                  src={user.profile_picture || undefined}
                                  alt={`${user.first_name} ${user.last_name}`}
                                />
                                <AvatarFallback className="text-xs font-semibold bg-primary text-white dark:text-black">
                                  {getInitials(user.first_name, user.last_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {user.first_name} {user.last_name}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-2 px-4">
                            <p className="text-[13px] text-foreground/90 truncate max-w-[180px]">
                              {user.email}
                            </p>
                          </TableCell>

                          <TableCell className="py-2 px-4 hidden lg:table-cell">
                            <p className="text-[13px] text-foreground/90">
                              {user.mobile_number || <span className="text-muted-foreground">—</span>}
                            </p>
                          </TableCell>

                          <TableCell className="py-2 px-4">
                            {(() => {
                              const roles = (user.userCompanyRoles || []);
                              const filtered = companyTerm
                                ? roles.filter(r => r.company?.id === parseInt(companyTerm) || (r as { company_id?: number }).company_id === parseInt(companyTerm))
                                : roles;
                              if (!filtered.length) return <span className="text-muted-foreground text-sm">—</span>;
                              const [first, ...rest] = filtered;
                              const firstName = first?.role?.role || '—';
                              const restNames = rest.map(r => r.role?.role).filter(Boolean).join(', ');
                              return (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md border dark:border-gray-700 bg-transparent text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{firstName}</span>
                                  {rest.length > 0 && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-dashed border-border bg-transparent text-xs font-medium text-gray-700 dark:text-gray-300 cursor-default flex-shrink-0">
                                            +{rest.length}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                          <p className="text-xs max-w-[200px]">{restNames}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>

                          <TableCell className="py-2 px-4">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border text-xs font-medium text-foreground/70">
                              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${user.isActive ? 'bg-green-500 dark:bg-green-400' : 'bg-red-400 dark:bg-red-500'
                                }`} />
                              {user.isActive ? 'Active' : 'Inactive'}
                            </div>
                          </TableCell>

                          {isSystemUser && (
                            <TableCell className="py-2 px-4 hidden lg:table-cell">
                              {(() => {
                                const companiesMap = new Map();
                                (user.userCompanyRoles || []).forEach(r => {
                                  if (r.company) {
                                    companiesMap.set(r.company.id, r.company.company);
                                  } else if ((r as { company_id?: number }).company_id) {
                                    const targetId = (r as { company_id?: number }).company_id;
                                    const c = companies.find((comp) => comp.id === targetId || (comp as { companyId?: number }).companyId === targetId);
                                    if (c) companiesMap.set(c.id, c.company);
                                  }
                                });
                                const uniqueCompanies = Array.from(companiesMap.values());
                                if (uniqueCompanies.length === 0) {
                                  return <span className="text-xs text-muted-foreground italic">Unknown</span>;
                                }
                                const [first, ...rest] = uniqueCompanies;
                                return (
                                  <div className="flex items-center gap-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-dashed border-border bg-transparent text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                                      {first}
                                    </span>
                                    {rest.length > 0 && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-dashed border-border bg-transparent text-xs font-medium text-gray-700 dark:text-gray-300 cursor-default flex-shrink-0">
                                              +{rest.length}
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent side="top">
                                            <p className="text-xs max-w-[200px]">{rest.join(', ')}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </div>
                                );
                              })()}
                            </TableCell>
                          )}

                          <TableCell
                            className="py-2 px-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center h-7 pr-1.5 cursor-pointer">
                                      <Switch
                                        checked={user.isActive}
                                        onCheckedChange={async () => {
                                          if (!canEditUser) {
                                            toast.error('Not authorized to change user status');
                                            return;
                                          }
                                          try {
                                            const res = await disableUser(user.id || 0);
                                            onUserUpdate?.();
                                            toast.success(user.isActive ? 'User inactivated' : 'User activated');
                                            if (res?.data?.promptResourceDisable && res?.data?.associatedResourceId) {
                                              toast.info(`Do you want to deactivate the associated resource for ${res.data.email}`,
                                                {
                                                  action: {
                                                    label: 'Yes',
                                                    onClick: async () => {
                                                      try {
                                                        await disableResource(res.data.associatedResourceId);
                                                        toast.success('Resource deactivated');
                                                      } catch {
                                                        toast.error('Failed to deactivate resource');
                                                      }
                                                    },
                                                  },
                                                  duration: 10000,
                                                }
                                              );
                                            }
                                          } catch {
                                            toast.error('Failed to update user status');
                                          }
                                        }}
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    {user.isActive ? 'Deactivate User' : 'Activate User'}
                                  </TooltipContent>
                                </Tooltip>

                                <Info_button
                                  id={user.id || 0}
                                  createdBy={user.createdBy || (user as { created_by?: string }).created_by || 'Unknown'}
                                  createdAt={user.createdAt || (user as { created_at?: string }).created_at || ''}
                                  updatedBy={user.updatedBy || (user as { updated_by?: string }).updated_by || 'Unknown'}
                                  updatedAt={user.updatedAt || (user as { updated_at?: string }).updated_at || ''}
                                />

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (canEditUser) {
                                          onUserEditClick?.(user.id || 0);
                                        } else {
                                          toast.error('Not authorized to edit a user');
                                        }
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Edit User</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (canDeleteUser) {
                                          setIsDeleting(true);
                                          setDeletingUserId(user.id || 0);
                                        } else {
                                          toast.error('Not authorized to delete a user');
                                        }
                                      }}
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Delete User</TooltipContent>
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
            <div className="flex-none -mx-1 px-1">
              <PaginationControls
                currentPage={currentPage}
                totalItems={totalRecords}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage && setCurrentPage(page)}
                onItemsPerPageChange={setItemsPerPage ? (size) => {
                  setItemsPerPage(size);
                  setCurrentPage && setCurrentPage(1);
                } : undefined}
                pageSizeOptions={[10, 20, 50, 100]}
                itemName="users"
              />
            </div>
          )}
        </div>
        {panel}
      </div>

      {isDeleting && deletingUserId !== null && (
        <DeleteUserModal
          isOpen={isDeleting}
          onClose={() => {
            setIsDeleting(false);
            setDeletingUserId(null);
          }}
          userId={deletingUserId}
          userName={(() => {
            const user = users.find((u) => u.id === deletingUserId);
            return user ? `${user.first_name} ${user.last_name}` : '';
          })()}
          companyId={(() => {
            const safeParse = (str: string | null) => {
              try { return str ? JSON.parse(str) : null; } catch { return null; }
            };
            const localCompanies = typeof window !== 'undefined' ? safeParse(localStorage.getItem('companies')) || [] : [];
            const isSystem = localCompanies.length === 0;
            if (isSystem) {
              return companyTerm ? parseInt(companyTerm) : undefined;
            } else {
              const selectedCompany = typeof window !== 'undefined' ? safeParse(localStorage.getItem('active_company')) : null;
              return selectedCompany?.companyId ? parseInt(selectedCompany.companyId) : undefined;
            }
          })()}
          onSuccess={() => {
            onUserUpdate?.();
          }}
        />
      )}
    </div>
  );
};

export default UserList;
