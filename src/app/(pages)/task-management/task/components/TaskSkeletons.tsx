import { Skeleton } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';

export function TaskTableSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div className="bg-background rounded-lg border border-border overflow-hidden flex-1 flex flex-col min-h-0">
      <div className="relative flex-1 overflow-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full">
        <table className="w-full text-sm table-fixed min-w-[1328px]">
          {/* Header — real labels matching exact TaskTableView th classes */}
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-border">
            <tr>
              {/* Code / Title — no label text, just spacer like real header */}
              <th className="pl-1 pr-2 h-10 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-96 sticky top-0 left-0 z-30 bg-gray-50 dark:bg-gray-900 border-b border-border shadow-[1px_0_0_0_theme(colors.gray.200)] dark:shadow-[1px_0_0_0_theme(colors.gray.700)]">
                <div className="flex items-center gap-1">
                  <span className="w-5 flex-shrink-0" />
                  TITLE
                </div>
              </th>
              <th className="px-4 h-10 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">Status</th>
              <th className="px-4 h-10 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">Severity</th>
              <th className="px-4 h-10 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-20 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">Assignee</th>
              <th className="px-4 h-10 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border truncate" title="Co-Assignees">Co-Assignees</th>
              <th className="px-4 h-10 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">Start Date</th>
              <th className="px-4 h-10 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">End Date</th>
              <th className="px-4 h-10 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-40 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">Labels</th>
              <th className="px-2 h-10 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-24 sticky top-0 right-0 z-30 bg-gray-50 dark:bg-gray-900 border-b border-border shadow-[-1px_0_0_0_theme(colors.gray.200)] dark:shadow-[-1px_0_0_0_theme(colors.gray.700)]"></th>
            </tr>
          </thead>
          <tbody className="">
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
                {/* Code / Title */}
                <td className="pl-1 pr-2 py-2 w-96">
                  <div className="flex items-center gap-1 min-w-0">
                    <Skeleton className="h-5 w-5 flex-shrink-0 rounded" />       {/* chevron button h-5 w-5 */}
                    <Skeleton className="h-5 w-5 flex-shrink-0 rounded" />       {/* hierarchy icon h-5 w-5 */}
                    <Skeleton className="h-3.5 w-14 flex-shrink-0" />           {/* code: font-mono text-xs */}
                    <Skeleton className="h-4 flex-1 min-w-0 ml-1" />            {/* title: text-sm font-medium */}
                  </div>
                </td>
                {/* Status — border pill */}
                <td className="px-4 py-2 w-32">
                  <Skeleton className="h-5 w-24 rounded-md" />
                </td>
                {/* Severity */}
                <td className="px-4 py-2 w-32">
                  <Skeleton className="h-5 w-24 rounded-md" />
                </td>
                {/* Assignee — avatar */}
                <td className="px-4 py-2 w-20">
                  <Skeleton className="h-6 w-6 rounded-full" />
                </td>
                {/* Co-Assignees — stacked avatars */}
                <td className="px-4 py-2 w-32">
                  <div className="flex -space-x-1">
                    <Skeleton className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-800" />
                    <Skeleton className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-800" />
                    <Skeleton className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-800" />
                  </div>
                </td>
                {/* Start Date — chip */}
                <td className="px-4 py-2 w-32">
                  <Skeleton className="h-5 w-16 rounded-md" />
                </td>
                {/* Due Date — chip */}
                <td className="px-4 py-2 w-32">
                  <Skeleton className="h-5 w-16 rounded-md" />
                </td>
                {/* Labels — badge */}
                <td className="px-4 py-2 w-40">
                  <Skeleton className="h-5 w-20 rounded-md" />
                </td>
                {/* Actions — comment + more */}
                <td className="px-2 py-2 w-24">
                  <div className="flex items-center justify-end gap-1">
                    <Skeleton className="h-7 w-7 rounded" />
                    <Skeleton className="h-7 w-6 rounded" />
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

export function TaskCardSkeleton() {
  return (
    <div className="bg-background rounded-lg border border-gray-300 dark:border-gray-700 shadow-xs overflow-hidden">
      {/* Section 1: Hierarchy icon button + code | Status badge — px-3 py-2 matches real card */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-dashed border-border">
        <div className="flex items-center gap-2">
          {/* icon wrapped in button (px-1 py-0.5) — approximated with slight extra height */}
          <div className="flex items-center px-1 py-0.5">
            <Skeleton className="h-3.5 w-3.5 rounded flex-shrink-0" />
          </div>
          <Skeleton className="h-3 w-16" /> {/* code: font-mono text-xs */}
        </div>
        {/* Status: border rounded-md pill — inline-flex py-0.5 px-2 text-xs ≈ h-5 */}
        <Skeleton className="h-5 w-20 rounded-md" />
      </div>

      {/* Section 2: px-3 py-2.5 space-y-2 — matches real card */}
      <div className="px-3 py-2.5 space-y-2">
        {/* Task name: text-sm leading-tight = 14px × 1.25 ≈ 18px */}
        <Skeleton className="h-[18px] w-full" />

        {/* Assignee (w-6 h-6 rounded-full) | divider | co-assignees (gap-1) | child tasks btn */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />  {/* Assignee avatar */}
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 shrink-0" />
            {/* Co-assignees: gap-1 matches InlineEditableTaskCoAssignees flex gap */}
            <div className="flex items-center gap-1">
              <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
              <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
            </div>
          </div>
          {/* Child tasks button: border rounded-md px-2 py-0.5 text-xs */}
          <Skeleton className="h-6 w-24 rounded-md" />
        </div>
      </div>

      {/* Section 3: px-3 py-2 bg-gray-50 border-t border-dashed — matches real card */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-dashed border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Severity: dot + text */}
          <Skeleton className="h-5 w-18 rounded-md" />

          {/* Date range chip: border rounded-md px-2 py-0.5 text-xs ≈ h-5 */}
          <Skeleton className="h-5 w-28 rounded-md" />
        </div>
        {/* Buttons: h-7 px-1.5 (comment) and h-7 w-7 (actions) */}
        <div className="flex items-center gap-1">
          <Skeleton className="h-7 w-7 rounded" />
          <Skeleton className="h-7 w-7 rounded" />
        </div>
      </div>
    </div>
  );
}

export function TaskGridSkeleton({ count = 12 }: { count?: number }) {
  const { open: sidebarOpen } = useSidebar();
  return (
    <div className={`grid gap-3 ${sidebarOpen ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'}`}>
      {Array.from({ length: count }).map((_, i) => <TaskCardSkeleton key={i} />)}
    </div>
  );
}

export function TaskKanbanSkeleton({ columns = 4, cardsPerColumn = 3 }: { columns?: number; cardsPerColumn?: number }) {
  const { open: sidebarOpen } = useSidebar();
  return (
    <div className="relative flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>
      <div className="flex-1 overflow-x-auto overflow-y-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="flex h-full">
          {Array.from({ length: columns }).map((_, i) => {
            const isLast = i === columns - 1;
            return (
              <div
                key={i}
                className="flex-shrink-0 flex flex-col h-full"
                style={{
                  width: sidebarOpen ? 'calc(30%)' : 'calc(23%)',
                  minWidth: '320px',
                  borderRight: isLast ? 'none' : '1px dashed rgba(128,128,128,0.25)',
                }}
              >
                {/* Column header */}
                <div className="px-4 py-2 flex-shrink-0 bg-gray-100/80/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-3 h-3 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-5 w-8 rounded-full" />
                  </div>
                </div>

                {/* Column body */}
                <div className="flex-1 p-2 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/20">
                  <div className="space-y-2">
                    {Array.from({ length: cardsPerColumn }).map((_, j) => (
                      <TaskCardSkeleton key={j} />
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
