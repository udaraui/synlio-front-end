import { Skeleton } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';

export function ResourceTableSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div className="bg-background rounded-lg border h-full overflow-hidden flex-1 flex flex-col min-h-0">
      <div className="relative flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 dark:hover:scrollbar-thumb-gray-600 [&_[data-slot=table-container]]:overflow-visible">
        <table className="w-full text-sm table-fixed min-w-[1300px]">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-border">
            <tr>
              <th className="h-10 px-4 text-left align-middle text-xs font-medium uppercase text-muted-foreground tracking-wider w-[270px] sticky top-0 left-0 z-30 bg-gray-50 dark:bg-gray-900 border-b border-border">
                RESOURCE
              </th>
              <th className="h-10 px-4 text-left align-middle text-xs font-medium uppercase text-muted-foreground tracking-wider w-24 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">DIVISION</th>
              <th className="h-10 px-4 text-left align-middle text-xs font-medium uppercase text-muted-foreground tracking-wider w-24 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">TYPE</th>
              <th className="h-10 px-4 text-left align-middle text-xs font-medium uppercase text-muted-foreground tracking-wider w-36 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">GROUPS</th>
              <th className="h-10 px-4 text-left align-middle text-xs font-medium uppercase text-muted-foreground tracking-wider w-52 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">SKILLS</th>
              <th className="h-10 px-4 text-left align-middle text-xs font-medium uppercase text-muted-foreground tracking-wider w-40 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">REPORTING TO</th>
              <th className="h-10 px-4 text-left align-middle text-xs font-medium uppercase text-muted-foreground tracking-wider w-32 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">WORK</th>
              <th className="h-10 px-4 text-right align-middle text-xs font-medium uppercase text-muted-foreground tracking-wider w-10 sticky top-0 right-0 z-30 bg-gray-50 dark:bg-gray-900 border-b border-border"></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                <td className="px-4 py-1.5 w-[270px] sticky left-0 z-10">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-2 w-2 rounded-full shrink-0" />
                    <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-1.5 w-24">
                  <Skeleton className="h-6 w-16 rounded-md" />
                </td>
                <td className="px-4 py-1.5 w-24">
                  <Skeleton className="h-6 w-14 rounded-md" />
                </td>
                <td className="px-4 py-1.5 w-36">
                  <div className="flex gap-1 flex-wrap">
                    <Skeleton className="h-6 w-12 rounded-md" />
                    <Skeleton className="h-6 w-10 rounded-md" />
                  </div>
                </td>
                <td className="px-4 py-1.5 w-52">
                  <div className="flex gap-1 overflow-hidden">
                    <Skeleton className="h-6 w-14 rounded-md shrink-0" />
                    <Skeleton className="h-6 w-12 rounded-md shrink-0" />
                    <Skeleton className="h-6 w-10 rounded-md shrink-0" />
                  </div>
                </td>
                <td className="px-4 py-1.5 w-40">
                  <div className="flex flex-col gap-0.5">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </td>
                <td className="px-4 py-1.5 w-32">
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-10 rounded-full" />
                    <Skeleton className="h-6 w-10 rounded-full" />
                  </div>
                </td>
                <td className="px-4 py-1.5 w-10 sticky right-0 z-10">
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-8 w-8 rounded" />
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

export function ResourceCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow-xs overflow-hidden flex flex-col h-[210px]">
      <div className="bg-primary/15 dark:bg-slate-900/40 p-2 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-1">
          <div className="relative flex-shrink-0 w-8 h-8 flex items-center justify-center">
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="flex-1 min-w-0 ml-1">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-2 w-2 rounded-full shrink-0" />
              </div>
              <Skeleton className="h-4 w-40 mt-1" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-md shrink-0" />
        </div>
      </div>

      <div className="p-2 flex-1 flex flex-col">
        <div className="flex gap-2 flex-wrap mt-1">
          <Skeleton className="h-5 w-14 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-md" />
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-dashed border-border">
        <div className="flex-1 flex gap-3">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-3 w-8" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-3 w-8" />
          </div>
        </div>
        <Skeleton className="h-7 w-7 rounded-md shrink-0" />
      </div>
    </div>
  );
}

export function ResourceGridSkeleton({ count = 12 }: { count?: number }) {
  const { open: sidebarOpen } = useSidebar();
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${sidebarOpen ? "lg:grid-cols-2 xl:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4"}`}>
      {Array.from({ length: count }, (_, index) => (
        <ResourceCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ResourceListItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border rounded-md bg-backgroound">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="hidden md:flex flex-col gap-2 w-1/4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="text-center">
        <Skeleton className="h-4 w-20 mx-auto" />
      </div>
    </div>
  )
}

export function SkeletonLoadinResourceList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      <div className="space-y-4">
        {Array.from({ length: count }, (_, index) => (
          <ResourceListItemSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}
