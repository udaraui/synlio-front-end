 import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';

// Skeleton for Grid/Card View — matches real TicketCard exactly
export function TicketCardSkeleton() {
  return (
    <div className="group rounded-lg border border-gray-300 dark:border-gray-700 shadow-xs overflow-hidden">
      {/* Section 1: Type icon + code | Status badge (border rounded-md pill) */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-dashed border-border">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-3.5 rounded flex-shrink-0" /> {/* Type icon */}
          <Skeleton className="h-3 w-16" />                           {/* Ticket code */}
        </div>
        <Skeleton className="h-5 w-20 rounded-md" />                  {/* Status badge (border pill, not rounded-full) */}
      </div>

      {/* Section 2: Title + Assignee | Participants */}
      <div className="px-3 py-2.5 space-y-2">
        {/* Ticket name — single line (no description) */}
        <Skeleton className="h-4 w-full" />

        {/* Assignee avatar (w-7 h-7) | Participants stacked avatars */}
        <div className="flex items-center justify-between pt-1">
          {/* Assignee — avatar button only (InlineEditableAssignee renders a round avatar button) */}
          <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
          {/* Participants — stacked small avatars */}
          <div className="flex items-center -space-x-2">
            <Skeleton className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-800" />
            <Skeleton className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-800" />
            <Skeleton className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-800" />
          </div>
        </div>
      </div>

      {/* Section 3: Severity + Queue | Comment + Actions */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-dashed border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Severity — dot + text */}
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-2 w-2 rounded-full flex-shrink-0" />
            <Skeleton className="h-3.5 w-14" />
          </div>
          {/* Queue badge */}
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-7 w-7 rounded" />  {/* Comment button */}
          <Skeleton className="h-7 w-7 rounded" />  {/* Actions menu */}
        </div>
      </div>
    </div>
  );
}

// Skeleton for Grid View Container
export function TicketGridSkeleton({ count = 12 }: { count?: number }) {
  const { open: sidebarOpen } = useSidebar();
  return (
    <div className={`grid gap-3 ${sidebarOpen ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'}`}>
      {Array.from({ length: count }).map((_, index) => (
        <TicketCardSkeleton key={index} />
      ))}
    </div>
  );
}

// Skeleton for Table View — matches actual TicketTableView columns exactly
// Columns: Code (w-80) | Status (w-38) | Severity (w-32) | Queue/Dept (w-32) | Assignee (w-24) | Participants (w-40) | Actions (w-20)
export function TicketTableSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div className="rounded-lg border bg-background overflow-hidden flex-1 flex flex-col min-h-0">
      <div className="relative flex-1 overflow-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full">
        <table className="w-full text-sm table-fixed">
          {/* Header — real column labels, exact classes from TicketTableView */}
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-border">
            <tr>
              <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-80 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">
                Title
              </th>
              <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-38 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">
                Status
              </th>
              <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">
                Severity
              </th>
              <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">
                Queue/Dept.
              </th>
              <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">
                Assignee
              </th>
              <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-40 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">
                Participants
              </th>
              <th className="h-10 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-20 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border" />
            </tr>
          </thead>

          {/* Table Rows — px-4 py-2 matches real table body exactly */}
          <tbody className="">
            {Array.from({ length: rows }).map((_, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                {/* Code — TicketType button (w-6 h-6 rounded) + code mono text + ExternalLink */}
                <td className="px-4 py-2 w-80">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-6 w-6 rounded flex-shrink-0" />
                    <Skeleton className="h-3 w-14 flex-shrink-0" />
                    <div className="flex-1 min-w-0 mx-1">
                      <Skeleton className="h-3.5 w-full" />
                    </div>
                    <Skeleton className="h-3.5 w-3.5 rounded flex-shrink-0" />
                  </div>
                </td>

                {/* Status — border pill: dot + text (px-2 py-0.5 rounded-md text-xs) */}
                <td className="px-4 py-2 w-38">
                  <Skeleton className="h-5 w-24 rounded-md" />
                </td>

                {/* Severity — border pill: Flag icon + text (px-2 py-0.5 rounded-md text-xs) */}
                <td className="px-4 py-2 w-32">
                  <Skeleton className="h-5 w-20 rounded-md" />
                </td>

                {/* Queue — border pill: ListTodo icon + text (px-2 py-0.5 rounded-md text-xs) */}
                <td className="px-4 py-2 w-32">
                  <Skeleton className="h-5 w-24 rounded-md" />
                </td>

                {/* Assignee — UserAvatar size="sm" = w-6 h-6 rounded-full */}
                <td className="px-4 py-2 w-24">
                  <Skeleton className="h-6 w-6 rounded-full" />
                </td>

                {/* Participants — flex items-center gap-1 (NOT stacked, uses gap-1) */}
                <td className="px-4 py-2 w-40">
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
                    <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
                    <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
                  </div>
                </td>

                {/* Actions — comment h-7 px-1.5 + dropdown h-7 w-7 */}
                <td className="px-4 py-2 w-20">
                  <div className="flex items-center justify-end gap-1">
                    <Skeleton className="h-7 w-7 rounded" />
                    <Skeleton className="h-7 w-7 rounded" />
                    <Skeleton className="h-7 w-6 rounded" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Skeleton for Kanban View
export function TicketKanbanSkeleton({ columns = 5, cardsPerColumn = 4 }: { columns?: number; cardsPerColumn?: number }) {
  const { open: sidebarOpen } = useSidebar();
  return (
    <div className="relative flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>
      <div
        className="flex-1 overflow-x-auto overflow-y-hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex h-full">
          {Array.from({ length: columns }).map((_, columnIndex) => {
            const isLast = columnIndex === columns - 1;
            return (
              <div
                key={columnIndex}
                className="flex-shrink-0 flex flex-col h-full"
                style={{
                  width: sidebarOpen ? 'calc(30%)' : 'calc(23%)',
                  minWidth: '320px',
                  borderRight: isLast ? 'none' : '1px dashed rgba(128, 128, 128, 0.25)',
                }}
              >
                {/* Column Header */}
                <div className="px-4 py-2 flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-3 h-3 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-5 w-8 rounded-full" />
                  </div>
                </div>

                {/* Column Body */}
                <div
                  className="flex-1 p-2 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/20"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <div className="space-y-2">
                    {Array.from({ length: cardsPerColumn }).map((_, cardIndex) => (
                      <TicketCardSkeleton key={cardIndex} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
