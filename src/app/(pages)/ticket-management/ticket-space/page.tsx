'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBreadcrumbsEffect } from '@/hooks/useBreadcrumbsEffect';
import { useViewPreference } from '@/hooks/use-view-preference';
import { toast } from 'sonner';
import { usePrivilegeGuard } from '@/hooks/use-privilege-guard';
import { useAuth } from '@/contexts/auth.context';
import {
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
  TableProperties,
  ClipboardXIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TicketSpaceForm } from './components/TicketSpaceForm';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TicketSpaceTableView from './components/TicketSpaceTableView';
import TicketSpaceGridView from './components/TicketSpaceGridView';
import { TicketSpaceGridSkeleton, TicketSpaceTableSkeleton } from './components/TicketSpaceSkeletons';
import { searchTicketSpaces, getBulkTicketSpaceStatusCounts } from '@/services/ticket-management/ticket-space.service';
import DeleteModal from '@/components/DeleteModal';
import { safeParse } from '@/services/auth-service';

function Page() {
  const { user } = useAuth();
  const router = useRouter();
  const [debouncedNameTerm, setDebouncedNameTerm] = useState('');
  const [debouncedDescriptionTerm, setDebouncedDescriptionTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const canView = usePrivilegeGuard("100") as boolean;
  const canCreate = usePrivilegeGuard("97") as boolean;
  const canEdit = usePrivilegeGuard("98") as boolean;
  const canDelete = usePrivilegeGuard("99") as boolean;
  const canViewAllSpaces = usePrivilegeGuard("105") as boolean;
  const canCreateTicket = usePrivilegeGuard("103") as boolean;
  const canViewTicket = usePrivilegeGuard("101") as boolean;

  const [isLoading, setIsLoading] = useState(false);
  const [hasDataFetched, setHasDataFetched] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [changeView, setChangeView] = useViewPreference('ticket-space', ['card', 'table'], 'card', user?.id);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [statusCountsBySpace, setStatusCountsBySpace] = useState<Record<number, any[]>>({});
  const [isCountsLoading, setIsCountsLoading] = useState(false);

  // Ref to prevent duplicate fetches
  const isFetchingRef = React.useRef(false);
  const lastFetchParamsRef = React.useRef<string>('');

  const useServerPagination = true;

  const currentData = useServerPagination
    ? data
    : data.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );

  // Breadcrumb setup
  useBreadcrumbsEffect([
    {
      label: 'Ticket Space',
      isCurrentPage: true,
    },
  ]);

  // Clear session storage when navigating to ticket space page
  useEffect(() => {
    sessionStorage.removeItem('task-table-expanded-state');
    sessionStorage.removeItem('taskPageFilters');
  }, []);

  // Fetch data function with common search API
  const fetchData = React.useCallback(async () => {
    if (!canView || !user?.id) return;

    const activeCompany = safeParse(localStorage.getItem('active_company'));

    // Create a unique key for this fetch request
    const fetchKey = JSON.stringify({
      canViewAllSpaces,
      userId: user.id,
      debouncedNameTerm,
      debouncedDescriptionTerm,
      currentPage,
      itemsPerPage,
      companyId: activeCompany?.companyId ?? null,
    });

    // Prevent duplicate fetches with same parameters
    if (isFetchingRef.current && lastFetchParamsRef.current === fetchKey) {
      return;
    }

    isFetchingRef.current = true;
    lastFetchParamsRef.current = fetchKey;
    setIsLoading(true);

    try {
      const filters: any[] = [];
      // Only add user membership filter if user doesn't have 'view:all-ticket-spaces' permission
      if (!canViewAllSpaces) {
        filters.push({
          field: 'userId',
          value: user.id,
          matchMode: 'member',
        });
      }


      // Add name filter if search term exists
      if (debouncedNameTerm) {
        filters.push({
          field: 'name',
          value: debouncedNameTerm,
          matchMode: 'contains',
        });
      }

      // Add description filter if search term exists
      if (debouncedDescriptionTerm) {
        filters.push({
          field: 'description',
          value: debouncedDescriptionTerm,
          matchMode: 'contains',
        });
      }

      const params = {
        first: (currentPage - 1) * itemsPerPage,
        rows: itemsPerPage,
        filters,
        sortField: 'id',
        sortOrder: 1,
      };

      // ── Phase 1 ─────────────────────────────────────────────────────────
      // Render cards/rows immediately: name, prefix, description, active state
      const result = await searchTicketSpaces(params);
      setData(result.data || []);
      setTotalRecords(result.total || 0);

      // ── Phase 2 ─────────────────────────────────────────────────────────
      // ONE bulk request for all space status counts — fire-and-forget
      if (result.data && result.data.length > 0) {
        setStatusCountsBySpace({});
        setIsCountsLoading(true);
        const spaceIds = result.data.map((s: any) => s.id);
        (async () => {
          try {
            const [bulk] = await Promise.all([getBulkTicketSpaceStatusCounts(spaceIds)]);
            const countsMap: Record<number, any[]> = {};
            Object.entries(bulk).forEach(([id, counts]) => {
              countsMap[Number(id)] = counts;
            });
            setStatusCountsBySpace(countsMap);
          } catch {
            // non-critical — badges just won't show
          } finally {
            setIsCountsLoading(false);
          }
        })();
      } else {
        setStatusCountsBySpace({});
        setIsCountsLoading(false);
      }
    } catch {
      toast.error('Failed to fetch ticket spaces');
      setData([]);
      setTotalRecords(0);
      setStatusCountsBySpace({});
    } finally{
      setIsLoading(false);
      setHasDataFetched(true);
      isFetchingRef.current = false;
    }
  }, [canView, canViewAllSpaces, user?.id, debouncedNameTerm, debouncedDescriptionTerm, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (id: number) => {
    setEditingId(id);
    setIsEditing(true);
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
    setDeleteConfirmOpen(true);
  };

  const handleToggleStatus = async (id: number) => {
    try {
      const { toggleTicketSpaceStatus } = await import('@/services/ticket-management/ticket-space.service');
      const result = await toggleTicketSpaceStatus(id);
      setData((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: result.isActive } : s))
      );
      toast.success(result.isActive ? "Ticket space activated" : "Ticket space inactivated");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update ticket space status");
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      const { deleteTicketSpace } = await import('@/services/ticket-management/ticket-space.service');
      await deleteTicketSpace(deleteConfirmId);
      toast.success('Ticket space deleted');
      await fetchData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete ticket space';
      toast.error(errorMessage);
    } finally {
      setDeleteConfirmId(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleConfigure = (id: number) => {
    router.push(`/ticket-management/ticket-space/configure/${id}`);
  };

  const handleTicketSpaceUpdate = async (ticketSpace: any, action: 'create' | 'edit') => {
    if (action === 'create') {
      // Optimistic update: add new space to the list
      setData((prevData) => [ticketSpace, ...prevData]);
      setTotalRecords((prev) => prev + 1);

      // Fetch status counts for the newly created space
      getBulkTicketSpaceStatusCounts([ticketSpace.id])
        .then((bulk) => {
          setStatusCountsBySpace((prev) => ({
            ...prev,
            [ticketSpace.id]: bulk[ticketSpace.id] ?? [],
          }));
        })
        .catch(() => {});
    } else {
      // Edit: update existing space in the list
      setData((prevData) =>
        prevData.map((space) =>
          space.id === ticketSpace.id ? ticketSpace : space
        )
      );
      // Status counts remain the same for edit
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-28px)]">
      {/* Fixed Header */}
      <div className="flex-none pt-9 pb-1 bg-background">
        <div className="px-3 pt-2 pb-0 border-border">
          <div className="flex items-center gap-1.5">
            {/* Add Button */}
            {canCreate && (
              <Button
                size="sm"
                className="h-7 text-xs px-2.5 dark:text-black"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Space
              </Button>
            )}

            {/* Refresh Button */}
            <Button
              size="sm"
              variant="outline"
              className={`h-7 w-7 p-0 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={fetchData}
              disabled={isLoading}
              title={isLoading ? 'Loading' : 'Refresh'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

            {/* View Toggle Buttons */}
            <div className="flex gap-1 bg-background border border-border rounded-sm shrink-0 items-center h-7">
              <Button
                  size="sm"
                  variant={changeView === 'card' ? 'default' : 'ghost'}
                  className={`h-full text-xs shadow-none ${changeView === 'card' ? 'px-2.5 dark:text-black' : 'px-2'}`}
                  onClick={() => setChangeView('card')}
                  title="Switch to Grid View"
              >
                <LayoutGrid className={`w-3.5 h-3.5 ${changeView === 'card' ? 'mr-1' : ''}`} />
                {changeView === 'card' && 'Grid'}
              </Button>
              <Button
                size="sm"
                variant={changeView === 'table' ? 'default' : 'ghost'}
                className={`h-full text-xs shadow-none ${changeView === 'table' ? 'px-2.5 dark:text-black' : 'px-2'}`}
                onClick={() => setChangeView('table')}
                title="Switch to Table View"
              >
                <TableProperties className={`w-3.5 h-3.5 ${changeView === 'table' ? 'mr-1' : ''}`} />
                {changeView === 'table' && 'Table'}
              </Button>
            </div>

            <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

            {/* Filters Container */}
            <div className="flex gap-1.5 flex-1">
              {/* Name Search */}
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                <Input
                  placeholder="Name"
                  value={debouncedNameTerm}
                  onChange={(e) => setDebouncedNameTerm(e.target.value)}
                  className="h-7 pl-7 text-xs border border-border shadow-none placeholder:text-xs"
                />
              </div>

              {/* Description Search*/}
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                <Input
                  placeholder="Description"
                  value={debouncedDescriptionTerm}
                  onChange={(e) => setDebouncedDescriptionTerm(e.target.value)}
                  className="h-7 pl-7 text-xs border border-border shadow-none placeholder:text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className={`px-0.5 flex-1 ${changeView === "table" ? "overflow-hidden" : "overflow-y-auto"} bg-background`}>
        <div className={`p-2 ${changeView === "table" ? "h-full" : ""}`}>
          {(isLoading || !hasDataFetched) ? (
            <>
              {/* Show view-specific skeleton based on active view */}
              {changeView === "card" && <TicketSpaceGridSkeleton count={12} />}
              {changeView === "table" && <TicketSpaceTableSkeleton rows={10} />}
            </>
          ) : currentData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardXIcon className="h-16 w-16 mb-4 text-gray-400 dark:text-gray-600" />
              <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">No Ticket Spaces Found</h3>
              <p className="text-muted-foreground mb-4">
                {debouncedNameTerm || debouncedDescriptionTerm
                  ? "No ticket spaces match your search criteria"
                  : "Get started by creating your first ticket space"}
              </p>
              {/* {canCreate && !debouncedNameTerm && !debouncedDescriptionTerm && (
                <Button
                  onClick={() => setIsCreating(true)}
                  variant="default"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Ticket Space
                </Button>
              )} */}
            </div>
          ) : (
            <>
              {/* Grid View */}
              {changeView === "card" && (
                <TicketSpaceGridView
                  dataArr={currentData}
                  onEditData={handleEdit}
                  onDelete={handleDelete}
                  onToggleStatus={canEdit ? handleToggleStatus : undefined}
                  onConfigure={canEdit ? handleConfigure : undefined}
                  onCreate={(id) => {
                    router.push(`/ticket-management/ticket/form?ticketSpaceId=${id}`);
                  }}
                  statusCountsBySpace={statusCountsBySpace}
                  isCountsLoading={isCountsLoading}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  canCreate={canCreateTicket}
                  canViewTicket={canViewTicket}
                />
              )}

              {/* Table View */}
              {changeView === "table" && (
                <TicketSpaceTableView
                  dataArr={currentData}
                  onEditData={handleEdit}
                  onDelete={(id) => {
                    setDeleteConfirmId(id);
                    setDeleteConfirmOpen(true);
                  }}
                  onToggleStatus={canEdit ? handleToggleStatus : undefined}
                  onConfigure={canEdit ? handleConfigure : undefined}
                  onCreate={(id) => {
                    router.push(`/ticket-management/ticket/form?ticketSpaceId=${id}`);
                  }}
                  statusCountsBySpace={statusCountsBySpace}
                  isCountsLoading={isCountsLoading}
                  canCreate={canCreateTicket}
                  canViewTicket={canViewTicket}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Fixed Pagination Footer */}
      {currentData.length > 0 && (
        <div className="flex-none border-t bg-background">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-1.5">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span>
                Showing {currentData.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} ticket spaces
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Items per page selector */}
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(parseInt(value));
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

              {/* Pagination controls */}
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={currentPage === 1}
                  onClick={() => toast.info('Go to first page')}
                  title="First page"
                >
                  «
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={currentPage === 1}
                  onClick={() => toast.info('Go to previous page')}
                  title="Previous page"
                >
                  ‹
                </Button>
                <span className="text-xs px-2 text-gray-600 dark:text-gray-400">
                  Page {currentPage} of {Math.ceil(totalRecords / itemsPerPage)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={currentPage >= Math.ceil(totalRecords / itemsPerPage)}
                  onClick={() => toast.info('Go to next page')}
                  title="Next page"
                >
                  ›
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={currentPage >= Math.ceil(totalRecords / itemsPerPage)}
                  onClick={() => toast.info('Go to last page')}
                  title="Last page"
                >
                  »
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form Dialog */}
      <TicketSpaceForm
        open={isCreating || isEditing}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false);
            setIsEditing(false);
            setEditingId(null);
          }
        }}
        onUpdate={handleTicketSpaceUpdate}
        type={isCreating ? 'create' : 'edit'}
        id={editingId || undefined}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onDelete={confirmDelete}
        title="Delete Ticket Space"
        description="Are you sure you want to delete this ticket space? This action cannot be undone."
      />
    </div>
  );
}

export default Page;

