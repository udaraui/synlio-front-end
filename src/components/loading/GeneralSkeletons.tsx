import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonLoading() {
  return (
    <div className="flex items-center space-x-4 w-full mb-4">
      <Skeleton className="h-15 w-15 rounded-full " />
      <div className="space-y-2 w-full">
        <Skeleton className="h-4 " />
        <Skeleton className="h-4 w-3/4 " />
        <Skeleton className="h-4 w-2/4 " />
      </div>
    </div>
  )
}

// Project Card Skeleton for Grid View
export function ProjectCardSkeleton() {
  return (
    <div className="group relative border-y border-r border-l-2 border-t-gray-200/60 border-b-gray-200/60 border-r-gray-200/60 border-l-gray-300 dark:border-t-gray-700/60 dark:border-b-gray-700/60 dark:border-r-gray-700/60 dark:border-l-gray-600 rounded-xl bg-white shadow-sm dark:bg-gray-800 overflow-hidden">

      <div className="p-3 pl-4">
        {/* Row 1: Project Name & Priority Tag */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <Skeleton className="h-5 flex-1" /> {/* Project name */}
          <Skeleton className="h-5 w-16 rounded" /> {/* Priority badge */}
        </div>

        {/* Row 2: Project Code */}
        <div className="flex items-center gap-1.5 mb-2">
          <Skeleton className="h-3 w-24" /> {/* Project code */}
        </div>

        {/* Row 3: Description */}
        <div className="mb-2">
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-3/4" />
        </div>

        {/* Row 4: Duration with Status Dot */}
        <div className="flex items-center gap-2 mb-2 text-xs">
          <Skeleton className="h-3 w-16" /> {/* Duration label */}
          <div className="flex items-center gap-1">
            <Skeleton className="h-3 w-12" /> {/* Start date */}
            <Skeleton className="h-2 w-2" /> {/* Arrow */}
            <Skeleton className="h-3 w-12" /> {/* Due date */}
          </div>
          <Skeleton className="h-2 w-2 rounded-full ml-auto" /> {/* Status dot */}
        </div>

        {/* Row 5: Assignee, Co-Assignees, and Action Counts */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Assignee & Co-Assignees Avatars */}
          <div className="flex items-center gap-1">
            <Skeleton className="h-6 w-6 rounded-full" /> {/* Assignee */}
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
            <div className="flex items-center -space-x-1">
              <Skeleton className="h-5 w-5 rounded-full" /> {/* Co-assignee 1 */}
              <Skeleton className="h-5 w-5 rounded-full" /> {/* Co-assignee 2 */}
            </div>
          </div>

          {/* Right: Action Counts */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Skeleton className="h-3 w-3" /> {/* Child tasks icon */}
              <Skeleton className="h-3 w-3" /> {/* Count */}
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-3 w-3" /> {/* Comments icon */}
              <Skeleton className="h-3 w-3" /> {/* Count */}
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-3 w-3" /> {/* Attachments icon */}
              <Skeleton className="h-3 w-3" /> {/* Count */}
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-gray-300 dark:border-gray-600" />

      {/* Action Buttons */}
      <div className="p-2 flex items-center gap-1">
        <Skeleton className="h-6 w-6" /> {/* View button */}
        <Skeleton className="h-6 w-6" /> {/* Edit button */}
        <Skeleton className="h-6 w-6" /> {/* Delete button */}
      </div>
    </div>
  )
}

// Project Space Card Skeleton for Grid View
export function ProjectGroupCardSkeleton() {
  return (
    <div className="group relative rounded-xl border border-gray-200/60 bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700/60 overflow-hidden">
      {/* Status Bar Accent */}
      <Skeleton className="h-1 w-full" />

      <div className="p-3">
        {/* Header: Name with Prefix Badge */}
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-5 flex-1" /> {/* Group name */}
          <Skeleton className="h-5 w-12 rounded" /> {/* Prefix badge */}
        </div>

        {/* Description */}
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-3/4 mb-2" />

        {/* Divider */}
        <div className="border-t border-dashed border-gray-300 dark:border-gray-600 mb-2" />

        {/* Projects by Status */}
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-3 w-14" /> {/* Projects label */}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Skeleton className="h-7 w-16 rounded" /> {/* To Do badge */}
            <Skeleton className="h-7 w-24 rounded" /> {/* In Progress badge */}
            <Skeleton className="h-7 w-20 rounded" /> {/* On Hold badge */}
            <Skeleton className="h-7 w-20 rounded" /> {/* Complete badge */}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-300 dark:border-gray-600 mb-2" />

        {/* Action Buttons - All in One Row */}
        <div className="flex items-center gap-1">
          <Skeleton className="h-7 flex-1" /> {/* New Project button */}
          <Skeleton className="h-7 w-7" /> {/* View button */}
          <Skeleton className="h-7 w-7" /> {/* Edit button */}
          <Skeleton className="h-7 w-7" /> {/* Status button */}
          <Skeleton className="h-7 w-7" /> {/* Delete button */}
        </div>
      </div>
    </div>
  )
}

// Project List View Skeleton
export function ProjectListSkeleton() {
  return (
    <div className="group relative border-y border-r border-l-2 border-t-gray-200/60 border-b-gray-200/60 border-r-gray-200/60 border-l-gray-300 dark:border-t-gray-700/60 dark:border-b-gray-700/60 dark:border-r-gray-700/60 dark:border-l-gray-600 rounded-xl bg-white shadow-sm dark:bg-gray-800 overflow-hidden">

      <div className="p-3 pl-4">
        <div className="flex items-center gap-4">
          {/* Content */}
          <div className="flex items-center gap-4 flex-1">
            {/* Name & Priority */}
            <div className="flex items-center gap-2 min-w-[200px] max-w-[250px]">
              <Skeleton className="h-4 flex-1" /> {/* Project name */}
              <Skeleton className="h-5 w-16 rounded" /> {/* Priority */}
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

            {/* Description */}
            <div className="flex-1 min-w-[150px] max-w-[300px]">
              <Skeleton className="h-3 w-full" />
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

            {/* Project Details */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Dates */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-12" /> {/* Start date */}
                <Skeleton className="h-3 w-3" /> {/* Arrow */}
                <Skeleton className="h-3 w-12" /> {/* End date */}
              </div>

              {/* Resources */}
              <Skeleton className="h-6 w-24 rounded" /> {/* Resource badge */}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
            <Skeleton className="h-7 w-20" /> {/* Assign button */}
            <Skeleton className="h-7 w-7" /> {/* View button */}
            <Skeleton className="h-7 w-7" /> {/* Edit button */}
            <Skeleton className="h-7 w-7" /> {/* Delete button */}
          </div>
        </div>
      </div>
    </div>
  )
}

// Project Space List View Skeleton
export function ProjectGroupListSkeleton() {
  return (
    <div className="group relative border border-gray-200/60 rounded-xl bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700/60 overflow-hidden">
      {/* Status Indicator Bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5">
        <Skeleton className="h-full w-full" />
      </div>

      <div className="p-3 pl-4">
        <div className="flex items-center gap-4">
          {/* Content */}
          <div className="flex items-center gap-4 flex-1">
            {/* Name & Prefix */}
            <div className="flex items-center gap-2 min-w-[200px] max-w-[250px]">
              <Skeleton className="h-4 flex-1" /> {/* Group name */}
              <Skeleton className="h-5 w-12 rounded" /> {/* Prefix */}
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

            {/* Description */}
            <div className="flex-1 min-w-[150px] max-w-[300px]">
              <Skeleton className="h-3 w-full" />
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

            {/* Projects Tags */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Skeleton className="h-7 w-16 rounded" /> {/* To Do */}
              <Skeleton className="h-7 w-24 rounded" /> {/* In Progress */}
              <Skeleton className="h-7 w-20 rounded" /> {/* On Hold */}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
            <Skeleton className="h-7 w-24" /> {/* New Project button */}
            <Skeleton className="h-7 w-7" /> {/* View button */}
            <Skeleton className="h-7 w-7" /> {/* Edit button */}
            <Skeleton className="h-7 w-7" /> {/* Status button */}
            <Skeleton className="h-7 w-7" /> {/* Delete button */}
          </div>
        </div>
      </div>
    </div>
  )
}


// Single role card skeleton
export function WithoutImageCardSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 border border-border/60 rounded-lg px-3 py-2.5 bg-white dark:bg-zinc-950 shadow-sm">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Skeleton className="h-5 w-9 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  )
}

// Multiple role cards skeleton
export function SkeletonLoadinWithoutImage({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, index) => (
        <WithoutImageCardSkeleton key={index} />
      ))}
    </div>
  )
}

