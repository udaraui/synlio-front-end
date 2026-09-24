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
  Building2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Bell,
  Eye,
  EyeOff,
  Briefcase,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { Company } from '@/interfaces/company';
import { ActiveStatus } from '@/interfaces/common/status.enum';
import { Label } from '@/components/ui/label';
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
import {
  deleteCompany,
  getCompanyNotificationEmailConfig,
  updateCompanyNotificationEmail,
} from '@/services/company-management/company-services';
import DeleteModal from '@/components/DeleteModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CompanyListProps {
  companies: Company[];
  onCompanyClick?: (companyId: number, companyName: string) => void;
  onCompanyEditClick?: (companyId: number) => void;
  itemsPerPage?: number;
  searchTerm?: string;
  onCompanySearchChange?: (value: string) => void;
  statusTerm?: string;
  onStatusSearchChange?: (value: string) => void;
  currentPage?: number;
  setCurrentPage?: (page: number) => void;
  setItemsPerPage?: (size: number) => void;
  totalRecords?: number;
  useServerPagination?: boolean;
  onCompanyUpdate?: () => void;
  isLoading?: boolean;
  onCompanyCreateClick?: () => void;
  selectedCompany?: number;
  isSystemUser?: boolean;
  sortOption?: string;
  onSortChange?: (option: string) => void;
}

const CompanyList: React.FC<CompanyListProps> = ({
  companies,
  onCompanyClick,
  onCompanyEditClick,
  itemsPerPage = 10,
  searchTerm: externalSearchTerm,
  onCompanySearchChange,
  statusTerm: externalStatusTerm,
  onStatusSearchChange,
  currentPage = 1,
  setCurrentPage,
  setItemsPerPage,
  totalRecords = 0,
  useServerPagination = false,
  onCompanyUpdate,
  isLoading = false,
  onCompanyCreateClick,
  selectedCompany,
  isSystemUser,
  sortOption = '',
  onSortChange,
}) => {
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingCompanyId, setDeletingCompanyId] = useState<number | null>(null);

  // Notification email popover state
  const [notifPopoverOpen, setNotifPopoverOpen] = useState<number | null>(null);
  const [notifEmail, setNotifEmail] = useState('');
  const [notifProvider, setNotifProvider] = useState('');
  const [notifPassword, setNotifPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingNotif, setIsSavingNotif] = useState(false);
  const [isFetchingNotif, setIsFetchingNotif] = useState(false);
  const [notifIsExisting, setNotifIsExisting] = useState(false);

  const canViewCompany = usePrivilegeGuard('4') as boolean;
  const canCreateCompany = usePrivilegeGuard('1') as boolean;
  const canEditCompany = usePrivilegeGuard('2') as boolean;
  const canDeleteCompany = usePrivilegeGuard('3') as boolean;
  const canEditCompanySpaceEmailCredentials = usePrivilegeGuard('108') as boolean;

  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : '';
  const statusTerm = externalStatusTerm !== undefined ? externalStatusTerm : '';

  const totalPages = useServerPagination
    ? Math.ceil(totalRecords / itemsPerPage)
    : Math.ceil(companies.length / itemsPerPage);

  const currentCompanies = useServerPagination
    ? companies
    : companies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openNotifPopover = async (company: Company) => {
    setNotifEmail('');
    setNotifProvider('');
    setNotifPassword('');
    setShowPassword(false);
    setNotifIsExisting(false);
    setNotifPopoverOpen(company.id);

    setIsFetchingNotif(true);
    try {
      const config = await getCompanyNotificationEmailConfig(company.id);
      setNotifEmail(config.notificationEmail ?? '');
      setNotifProvider(config.emailProvider ?? '');
      setNotifPassword(config.notificationEmailPassword ?? '');
      setNotifIsExisting(!!config.notificationEmail);
    } catch {
      // keep fields empty if fetch fails
    } finally {
      setIsFetchingNotif(false);
    }
  };

  const saveNotifConfig = async (companyId: number) => {
    if (!notifEmail || !notifProvider || !notifPassword) {
      toast.error('All notification email fields are required');
      return;
    }
    setIsSavingNotif(true);
    try {
      const res = await updateCompanyNotificationEmail({
        id: companyId,
        notificationEmail: notifEmail,
        emailProvider: notifProvider,
        notificationEmailPassword: notifPassword,
      });
      if (res.status === 200) {
        toast.success('Notification email settings saved');
        setNotifPopoverOpen(null);
        onCompanyUpdate?.();
      } else {
        toast.error('Failed to save notification email settings');
      }
    } catch (err: any) {
      toast.error('Error:' + (err?.message ?? 'Unknown error'));
    } finally {
      setIsSavingNotif(false);
    }
  };

  const statusBadge = (status: ActiveStatus | string | undefined) => {
    const s = String(status || '').toLowerCase();
    const dotColor =
      s === ActiveStatus.ACTIVE
        ? 'bg-green-500 dark:bg-green-400'
        : s === ActiveStatus.SUSPEND
          ? 'bg-yellow-500 dark:bg-yellow-400'
          : s === ActiveStatus.BLOCK
            ? 'bg-red-400 dark:bg-red-500'
            : 'bg-muted-foreground';
    const label =
      s === ActiveStatus.ACTIVE
        ? 'Active'
        : s === ActiveStatus.SUSPEND
          ? 'Suspend'
          : s === ActiveStatus.BLOCK
            ? 'Block'
            : '—';
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border text-xs font-medium text-foreground/70">
        <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
        {label}
      </div>
    );
  };

  const showToolbar = canCreateCompany || canViewCompany || isSystemUser;

  return (
    <div className="flex px-1 flex-col h-full overflow-hidden">
      {/* ── Toolbar ── */}
      {showToolbar && (
        <div className="flex-none sticky top-0 z-10">
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-1.5">
              {canCreateCompany && (
                <Button
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => onCompanyCreateClick?.()}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Company
                </Button>
              )}
              {(canViewCompany || isSystemUser) && (
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-7 w-7 p-0 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={onCompanyUpdate}
                  disabled={isLoading}
                  title={isLoading ? 'Loading' : 'Refresh'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              )}

              {(canViewCompany || isSystemUser) && (
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
              )}

              {(canViewCompany || isSystemUser) && (
                <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
              )}

              {/* Search */}
              {(canViewCompany || isSystemUser) && (
                <div className="relative w-56">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <Input
                    placeholder="Name"
                    value={searchTerm}
                    onChange={(e) => onCompanySearchChange?.(e.target.value)}
                    className="h-7 pl-7 text-xs border border-border shadow-none placeholder:text-xs"
                  />
                </div>
              )}

              {/* Status filter + Sort */}
              {(canViewCompany || isSystemUser) && (
                <div className="flex gap-1.5">
                  <Select
                    value={statusTerm}
                    onValueChange={(value) => onStatusSearchChange?.(value)}
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
                      <SelectItem value={ActiveStatus.ACTIVE}>Active</SelectItem>
                      <SelectItem value={ActiveStatus.SUSPEND}>Suspend</SelectItem>
                      <SelectItem value={ActiveStatus.BLOCK}>Block</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="p-2 flex flex-col flex-1 min-h-0">
        {/* Table */}
        <div className="flex flex-col flex-1 min-h-0 rounded-lg border overflow-hidden">
          {/* Single scroll container - neutralize the Table own overflow wrapper */}
          <div className="relative flex-1 min-h-0 overflow-auto [&_[data-slot=table-container]]:overflow-visible">
            <Table>
              <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-gray-50 dark:[&_th]:bg-gray-900">
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="w-[40%] h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Company
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
                {isLoading ? (
                  Array.from({ length: itemsPerPage > 8 ? 8 : itemsPerPage }).map((_, i) => (
                    <TableRow key={i} className="border-b border-border">
                      <TableCell className="py-2 px-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-md" />
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
                        <Skeleton className="h-7 w-24 rounded ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : currentCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-36 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Briefcase className="h-8 w-8 opacity-30" />
                        <p className="text-md text-muted-foreground">No companies found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentCompanies.map((company) => (
                    <TableRow
                      key={company.id}
                      className={`group border-b border-border cursor-pointer transition-colors
                      ${company.id === selectedCompany
                          ? 'bg-primary/5 border-l-2 border-l-primary'
                          : 'hover:bg-muted/30'
                        }`}
                      onClick={() => onCompanyClick?.(company.id, company.company)}
                    >
                      <TableCell className="py-2 px-4">
                        <div className="flex items-center gap-3">
                          {company.logo ? (
                            <img
                              src={company.logo}
                              alt={company.company}
                              className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={company.logo} alt={company.company} />
                              <AvatarFallback className="text-xs font-semibold">
                                {company.company?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{company.company}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-2 px-4">
                        <div className="inline-flex items-center px-2 py-0.5 rounded-md border border-border text-xs font-medium text-foreground/70">
                          {company.company_code || <span className="text-muted-foreground">—</span>}
                        </div>
                      </TableCell>

                      <TableCell className="py-2 px-4">
                        {statusBadge(company.active_status)}
                      </TableCell>

                      <TableCell
                        className="py-2 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <TooltipProvider delayDuration={0}>
                            {/* {canEditCompany && ( */}
                            {canEditCompanySpaceEmailCredentials && (
                              <Popover
                                open={notifPopoverOpen === company.id}
                                onOpenChange={(open) => {
                                  if (open) {
                                    openNotifPopover(company);
                                  } else {
                                    setNotifPopoverOpen(null);
                                  }
                                }}
                              >
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`h-7 w-7 p-0 ${company.notificationEmail
                                          ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                                          : 'text-muted-foreground hover:text-foreground'
                                          }`}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Bell className="h-4 w-4" />
                                      </Button>
                                    </PopoverTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Notification Email Settings</TooltipContent>
                                </Tooltip>
                                <PopoverContent
                                  className="w-80 p-4"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Bell className="h-4 w-4 text-blue-500" />
                                    Update Notification Email Configurations
                                  </p>

                                  {isFetchingNotif ? (
                                    <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
                                      <RefreshCw className="h-4 w-4 animate-spin" />
                                      Loading…
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      <div className="flex flex-col gap-1">
                                        <Label className="text-xs text-muted-foreground">
                                          Email Provider
                                        </Label>
                                        <Select value={notifProvider} onValueChange={setNotifProvider}>
                                          <SelectTrigger className="h-8 text-sm">
                                            <SelectValue placeholder="Select provider" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="gmail">Gmail</SelectItem>
                                            <SelectItem value="outlook">Outlook</SelectItem>
                                            <SelectItem value="mail_service">Mail Service</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="flex flex-col gap-1">
                                        <Label className="text-xs text-muted-foreground">
                                          Notification Email
                                        </Label>
                                        <Input
                                          className="h-8 text-sm"
                                          type="text"
                                          autoComplete="off"
                                          placeholder="noreply@company.com"
                                          value={notifEmail}
                                          onChange={(e) => setNotifEmail(e.target.value)}
                                        />
                                      </div>

                                      <div className="flex flex-col gap-1">
                                        <Label className="text-xs text-muted-foreground">
                                          {notifProvider === 'mail_service' ? 'API Key' : 'App Password'}
                                        </Label>
                                        <div className="relative">
                                          <Input
                                            className="h-8 text-sm pr-9"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            placeholder={
                                              notifProvider === 'mail_service'
                                                ? 'Enter API key'
                                                : 'Enter app password'
                                            }
                                            value={notifPassword}
                                            onChange={(e) => setNotifPassword(e.target.value)}
                                          />
                                          <button
                                            type="button"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            onClick={() => setShowPassword((p) => !p)}
                                          >
                                            {showPassword ? (
                                              <EyeOff className="h-3.5 w-3.5" />
                                            ) : (
                                              <Eye className="h-3.5 w-3.5" />
                                            )}
                                          </button>
                                        </div>
                                      </div>

                                      <Button
                                        size="sm"
                                        className="w-full mt-1"
                                        disabled={isSavingNotif}
                                        onClick={() => saveNotifConfig(company.id)}
                                      >
                                        {isSavingNotif
                                          ? notifIsExisting
                                            ? 'Updating…'
                                            : 'Saving…'
                                          : notifIsExisting
                                            ? 'Update'
                                            : 'Save'}
                                      </Button>
                                    </div>
                                  )}
                                </PopoverContent>
                              </Popover>
                            )}

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCompanyClick?.(company.id, company.company);
                                  }}
                                >
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">View Divisions</TooltipContent>
                            </Tooltip>

                            {canEditCompany && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCompanyEditClick?.(company.id);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Edit Company</TooltipContent>
                              </Tooltip>
                            )}

                            {canDeleteCompany && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsDeleting(true);
                                      setDeletingCompanyId(company.id);
                                    }}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Delete Company</TooltipContent>
                              </Tooltip>
                            )}
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
              {totalRecords} companies
            </span>
            <div className="flex items-center gap-3">
              {setItemsPerPage && (
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setCurrentPage && setCurrentPage(1);
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
                    onClick: () => setCurrentPage && setCurrentPage(1),
                    disabled: currentPage === 1,
                  },
                  {
                    label: "‹",
                    onClick: () =>
                      setCurrentPage && setCurrentPage(Math.max(1, currentPage - 1)),
                    disabled: currentPage === 1,
                  },
                  { label: null },
                  {
                    label: "›",
                    onClick: () =>
                      setCurrentPage &&
                      setCurrentPage(Math.min(totalPages, currentPage + 1)),
                    disabled: currentPage >= totalPages,
                  },
                  {
                    label: "»",
                    onClick: () => setCurrentPage && setCurrentPage(totalPages),
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
            setDeletingCompanyId(null);
            onCompanyUpdate?.();
          }}
          onDelete={async () => {
            const res = await deleteCompany(deletingCompanyId || 0);
            if (res && (!res.data?.status || res.data.status < 400)) {
              toast.success(res?.data?.message || "Company deleted");
            }
            return res;
          }}
          id={deletingCompanyId || 0}
          title="Delete Company"
          description="Are you sure you want to delete this company? This action cannot be undone."
          buttonText="Delete"
          buttonVariant="destructive"
          buttonIcon={<Trash />}
          buttonClassName="w-full"
        />
      )}
    </div>
  );
};

export default CompanyList;
