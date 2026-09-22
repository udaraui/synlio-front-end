"use client";
import { Skeleton } from '@/components/ui/skeleton';
import { useSidebar } from "@/components/ui/sidebar";

export function ResourcePoolTableSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div className="bg-background rounded-lg border h-full overflow-hidden flex-1 flex flex-col min-h-0">
      <div className="relative flex-1 overflow-auto [&_[data-slot=table-container]]:overflow-visible [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full">
        <table className="w-full text-sm table-fixed min-w-[900px]">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-border">
            <tr>
              <th className="h-10 px-4 text-left align-middle text-xs font-medium uppercase text-muted-foreground tracking-wider w-64 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">
                GROUP
              </th>
              <th className="h-10 px-4 text-left align-middle text-xs font-medium uppercase text-muted-foreground tracking-wider w-40 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">DIVISION</th>
              <th className="h-10 px-4 text-left align-middle text-xs font-medium uppercase text-muted-foreground tracking-wider w-56 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">OWNER</th>
              <th className="h-10 px-4 text-left align-middle text-xs font-medium uppercase text-muted-foreground tracking-wider w-40 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">MEMBERS</th>
              <th className="h-10 px-4 text-left align-middle text-xs font-medium uppercase text-muted-foreground tracking-wider w-32 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">STATUS</th>
              <th className="h-10 px-4 text-right align-middle text-xs font-medium uppercase text-muted-foreground tracking-wider w-16 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">
                <div className="text-right pr-1">ACTIONS</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                <td className="px-4 py-1.75 w-64 align-middle">
                  <Skeleton className="h-4 w-40" />
                </td>
                <td className="px-4 py-1.75 w-40 align-middle">
                  <Skeleton className="h-5 w-24 rounded-md" />
                </td>
                <td className="px-4 py-1.75 w-56 align-middle">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex flex-col min-w-0 gap-1.5">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-1.5 w-40 align-middle">
                  <div className="flex -space-x-2">
                    <Skeleton className="h-10 w-10 rounded-full ring-1 ring-background" />
                    <Skeleton className="h-10 w-10 rounded-full ring-1 ring-background" />
                    <Skeleton className="h-10 w-10 rounded-full ring-1 ring-background" />
                  </div>
                </td>
                <td className="px-4 py-1.75 w-32 align-middle">
                  <Skeleton className="h-5 w-16 rounded-md" />
                </td>
                <td className="px-4 py-1.75 w-16 align-middle">
                  <div className="flex items-center justify-end gap-1">
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <Skeleton className="h-7 w-7 rounded-md" />
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

export function ResourcePoolGridSkeleton({ count = 12 }: { count?: number }) {
  const { open: sidebarOpen } = useSidebar();
  return (
    <div className={`grid gap-3 ${sidebarOpen ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="group relative rounded-xl border-y border-r border-l-2 border-t-gray-200/60 border-b-gray-200/60 border-r-gray-200/60 border-l-gray-300 dark:border-t-gray-700/60 dark:border-b-gray-700/60 dark:border-r-gray-700/60 dark:border-l-gray-600 bg-white shadow-sm dark:bg-gray-800 overflow-hidden flex flex-col h-full min-h-[160px]">
          
          <div className="p-3 flex flex-col h-full">
            <div className="flex items-start justify-between gap-3 mb-1">
              <Skeleton className="h-6 w-3/4" />
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* <Skeleton className="h-5 w-16 rounded-md" /> */}
                <div className="flex items-center gap-1.5 pl-1 pr-2">
                  {/* <Skeleton className="h-1.5 w-1.5 rounded-full" /> */}
                  <Skeleton className="h-6 w-12 rounded" />
                </div>
              </div>
            </div>

            {/* <Skeleton className="h-3 w-full mt-1 mb-1" />
            <Skeleton className="h-3 w-2/3 mb-3" /> */}

            <div className="border-t border-border/60 my-3 flex-shrink-0" />

            <div className="flex items-center justify-between pt-3 pb-5 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-2.5 w-32" />
                </div>
              </div>
              
              <div className="flex -space-x-2">
                <Skeleton className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800" />
                <Skeleton className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800" />
                <Skeleton className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800" />
              </div>
            </div>

            <div className="flex gap-1.5 mt-auto">
              <Skeleton className="flex-1 h-7 rounded-md" />
              <Skeleton className="w-7 h-7 rounded-md" />
              <Skeleton className="w-7 h-7 rounded-md" />
              <Skeleton className="w-7 h-7 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
