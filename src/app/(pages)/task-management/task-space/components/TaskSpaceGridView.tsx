'use client';
// TaskSpaceGridView — grid/card layout for task spaces

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Pencil, Trash, Settings, Lock, LockOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ResponsiveBadgeRow from '@/components/common/ResponsiveBadgeRow';
import { useSidebar } from '@/components/ui/sidebar';

const DescriptionCell = ({ name, description }: { name?: string; description?: string }) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (el) setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, [description]);

  if (!description) {
    return (
      <div className="mb-3 min-h-[2.5rem]">
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">No description</p>
      </div>
    );
  }

  const text = (
    <p
      ref={textRef}
      className="text-sm leading-5 text-gray-600 dark:text-gray-400 line-clamp-2"
    >
      {description}
    </p>
  );

  if (!isOverflowing) {
    return <div className="mb-3 min-h-[2.5rem]">{text}</div>;
  }

  return (
    <div className="mb-3 min-h-[2.5rem]">
      <HoverCard openDelay={150} closeDelay={100}>
        <HoverCardTrigger asChild onClick={(e) => e.stopPropagation()}>
          <div className="cursor-default">{text}</div>
        </HoverCardTrigger>
        <HoverCardContent className="max-w-xs w-72 p-3" side="bottom" align="start" onClick={(e) => e.stopPropagation()}>
          {name && <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{name}</p>}
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{description}</p>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
};

interface StatusCount { statusId: number; name: string; color: string; count: number; hierarchyLevelName?: string | null; }

interface TaskSpaceGridViewProps {
  dataArr: any[];
  onEditData: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleStatus?: (id: number) => void;
  onConfigure?: (id: number) => void;
  onCreate?: (id: number) => void;
  statusCountsBySpace?: Record<number, StatusCount[]>;
  levelNamesBySpace?: Record<number, string>;
  isCountsLoading?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canCreate?: boolean;
  canViewTask?: boolean;
  hideActionButtons?: boolean;
}

const TaskSpaceGridView: React.FC<TaskSpaceGridViewProps> = ({
  dataArr,
  onEditData,
  onDelete,
  onToggleStatus,
  onConfigure,
  onCreate,
  statusCountsBySpace = {},
  levelNamesBySpace = {},
  isCountsLoading = false,
  canEdit = true,
  canDelete = true,
  canCreate = true,
  canViewTask = true,
  hideActionButtons = false,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = searchParams.get("meetingId");
  const activityId = searchParams.get("activityId");
  const activityTitle = searchParams.get("activityTitle");
  const { open: sidebarOpen } = useSidebar();

  return (
    <div className={`grid gap-3 ${sidebarOpen ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'}`}>
      {dataArr.map((space) => {
        const statusCounts = statusCountsBySpace[space.id] || [];
        const levelName = levelNamesBySpace[space.id] ?? statusCounts[0]?.hierarchyLevelName ?? 'Task';

        return (
          <div
            key={space.id}
            className={`group relative rounded-xl border-y border-r border-l-2 shadow-sm transition-all duration-300 overflow-hidden
              ${space.isActive
                ? `border-t-gray-200/60 border-b-gray-200/60 border-r-gray-200/60 border-l-primary bg-white dark:bg-gray-800 dark:border-t-gray-700/60 dark:border-b-gray-700/60 dark:border-r-gray-700/60 hover:shadow-xl hover:border-primary dark:hover:border-primary ${canViewTask ? 'cursor-pointer' : 'cursor-not-allowed'}`
                : 'border-t-gray-200/40 border-b-gray-200/40 border-r-gray-200/40 border-l-gray-300 dark:border-l-gray-600 bg-gray-50 dark:bg-gray-900 dark:border-t-gray-800 dark:border-b-gray-800 dark:border-r-gray-800 cursor-not-allowed'
              }`}
            onClick={() => {
              if (space.isActive && canViewTask) {
                const meetingName = searchParams.get('meetingName');
                router.push(`/task-management/task?taskSpaceId=${space.id}&fromSpace=1${meetingId ? `&meetingId=${meetingId}` : ''}${meetingName ? `&meetingName=${encodeURIComponent(meetingName)}` : ''}${activityId ? `&activityId=${activityId}` : ''}${activityTitle ? `&activityTitle=${encodeURIComponent(activityTitle)}` : ''}`);
              }
            }}
          >
            <div className={!space.isActive ? 'opacity-60 grayscale' : ''}>
              <div className="px-4 pt-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-gray-50 group-hover:text-primary dark:group-hover:text-primary transition-colors line-clamp-1" title={space.name}>
                    {space.name}
                  </h4>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex-shrink-0">
                    {space.prefix}
                  </span>
                </div>

                <DescriptionCell name={space.name} description={space.description} />

                <div className="border-t border-border mb-3" />

                {/* Task counts by status */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {levelName}s
                    </span>
                  </div>
                  <div className="relative min-h-[1.75rem] flex items-center">
                    {isCountsLoading ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Syncing {levelName}s...</span>
                      </div>
                    ) : (
                      <ResponsiveBadgeRow
                        items={[...statusCounts].sort((a, b) => a.name.localeCompare(b.name))}
                        emptyText="No tasks yet"
                        accentClass="hover:border-primary dark:hover:border-primary"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions row — always OUTSIDE the greyed wrapper so all buttons are in normal flow and aligned */}
            {!hideActionButtons && (
              <div className="px-4 pb-4">
                <TooltipProvider>
                  <div className="flex gap-1.5">
                    {canCreate && onCreate && (
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs font-medium hover:text-primary hover:border-primary transition-colors"
                        disabled={!space.isActive}
                        onClick={(e) => { e.stopPropagation(); onCreate(space.id); }}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> New {levelName}
                      </Button>
                    )}
                    {canEdit && (
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0 hover:text-primary hover:border-primary transition-colors"
                            disabled={!space.isActive}
                            onClick={(e) => { e.stopPropagation(); onEditData(space.id); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Edit Project Space</TooltipContent>
                      </Tooltip>
                    )}
                    {onConfigure && (
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0 hover:text-primary hover:border-primary transition-colors"
                            disabled={!space.isActive}
                            onClick={(e) => { e.stopPropagation(); onConfigure(space.id); }}>
                            <Settings className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Configure Project Space</TooltipContent>
                      </Tooltip>
                    )}
                    {onToggleStatus && (
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="outline"
                            className={`h-7 w-7 p-0 hover:text-primary hover:border-primary transition-colors ${!space.isActive
                              ? 'text-green-600 dark:text-green-400'
                              : ''
                              }`}
                            onClick={(e) => { e.stopPropagation(); onToggleStatus(space.id); }}>
                            {space.isActive ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">{space.isActive ? 'Inactivate Project Space' : 'Activate Project Space'}</TooltipContent>
                      </Tooltip>
                    )}
                    {canDelete && (
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="outline"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:border-destructive transition-colors"
                            disabled={!space.isActive}
                            onClick={(e) => { e.stopPropagation(); onDelete(space.id); }}>
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Delete Project Space</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TooltipProvider>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TaskSpaceGridView;

