import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';

// Skeleton for Grid/Card View - Single Card
export function TicketSpaceCardSkeleton() {
  return (
    <div className="group relative rounded-xl border-y border-r border-l-2 border-t-gray-200/60 border-b-gray-200/60 border-r-gray-200/60 border-l-gray-300 dark:border-t-gray-700/60 dark:border-b-gray-700/60 dark:border-r-gray-700/60 dark:border-l-gray-600 shadow-sm overflow-hidden">
      <div className="p-4">
        {/* Header: Name with Prefix Badge */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <Skeleton className="h-6 flex-1" /> {/* Space name */}
          <Skeleton className="h-5 w-12 rounded-md" /> {/* Prefix badge */}
        </div>

        {/* Description - 2 lines */}
        <div className="mb-3 min-h-[2.5rem] flex flex-col gap-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>

        {/* Divider */}
        <div className="border-t border-border mb-3" />

        {/* Tickets Count Section */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Skeleton className="h-4 w-16" /> {/* "Tickets" label */}
          </div>
          {/* Status Count Badges - Show 3 badges in one line + dashed "+N more" badge */}
          <div className="relative min-h-[1.75rem] flex items-center gap-1.5">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex gap-1.5">
          <Skeleton className="flex-1 h-7 rounded" /> {/* New Ticket button */}
          <Skeleton className="h-7 w-7 rounded" /> {/* Edit button */}
          <Skeleton className="h-7 w-7 rounded" /> {/* Configure button */}
          <Skeleton className="h-7 w-7 rounded" /> {/* Delete button */}
        </div>
      </div>
    </div>
  );
}

// Skeleton for Grid View Container
export function TicketSpaceGridSkeleton({ count = 12 }: { count?: number }) {
  const { open: sidebarOpen } = useSidebar();
  return (
    <div className={`grid gap-3 ${sidebarOpen ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'}`}>
      {Array.from({ length: count }).map((_, index) => (
        <TicketSpaceCardSkeleton key={index} />
      ))}
    </div>
  );
}

// Skeleton for Table View
export function TicketSpaceTableSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-border/60 overflow-hidden bg-white dark:bg-zinc-950">
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <table className="w-full text-sm">
            {/* Header — matches TableView sticky header */}
            <thead className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-gray-50 dark:[&_th]:bg-gray-900 border-b border-border/60">
          <tr>
            <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[400px]">TITLE</th>
            <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[400px]">DESCRIPTION</th>
            <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">TICKETS</th>
            <th className="h-10 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-[160px]">ACTIONS</th>
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className="border-b border-border hover:bg-gray-50 dark:hover:bg-gray-900/50">
              <td className="py-2 px-4 w-[400px]">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-12 rounded-md" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </td>
              <td className="py-2 px-4 w-[400px]">
                <Skeleton className="h-4 w-48" />
              </td>
              <td className="py-2 px-4">
                <div className="flex gap-1.5">
                  <Skeleton className="h-6 w-20 rounded-md" />
                  <Skeleton className="h-6 w-24 rounded-md" />
                  <Skeleton className="h-6 w-20 rounded-md" />
                </div>
              </td>
              <td className="py-2 px-4 w-[160px]">
                <div className="flex justify-end gap-1">
                  <Skeleton className="h-7 w-7 rounded" />
                  <Skeleton className="h-7 w-7 rounded" />
                  <Skeleton className="h-7 w-7 rounded" />
                  <Skeleton className="h-7 w-7 rounded" />
                  <Skeleton className="h-7 w-7 rounded" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>
      </div>
    </div>
  );
}
