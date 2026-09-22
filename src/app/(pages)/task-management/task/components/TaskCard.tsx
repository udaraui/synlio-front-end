'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Edit,
  Eye,
  MoreVertical,
  Info,
  ExternalLink,
  Share2,
  Copy,
  MessageSquare,
  X,
  Folder,
  CalendarDays,
  ArrowUpRight,
  Lock,
  AlertTriangle,
  Loader2, Star,
  Trash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { CommentSection } from '@/components/common/CommentSection';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar';
import { getHierarchyLevelIcon } from '@/enums/space-configure-icon.enum';
import { ParentHierarchyView } from '@/components/common/ParentLevelsHoverCard';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import {
  patchTaskName,
  patchTaskStatus,
  patchTaskSeverity,
  patchTaskAssignee,
  patchTaskCoAssignees,
  patchTaskDates,
  patchTaskSpecial,
  patchTaskProgress,
  patchTaskHierarchyLevel,
} from '@/services/task-management/task.service';

/** Map status base to an auto-derived progress percentage */
const progressForBase = (base: string | null | undefined): number | null => {
  if (base === 'To Start') return 0;
  if (base === 'Processing') return 20;
  if (base === 'Finished') return 100;
  return null;
};
import {
  InlineEditableTaskName,
  InlineEditableTaskStatus,
  InlineEditableTaskSeverity,
  InlineEditableTaskAssignee,
  InlineEditableTaskCoAssignees,
  InlineEditableTaskHierarchyLevel,
} from './InlineEditableTaskComponents';
import { TaskCardConfigData, TaskUpdateHandler } from './task-card.types';
import { NoMembersWarningAvatarPair } from './NoMembersWarningAvatar';

export type { TaskCardConfigData };

interface TaskCardProps {
  task: any;
  configData?: TaskCardConfigData;
  onEdit?: (task: any) => void;
  onDelete?: (task: any) => void;
  onUpdateTask?: TaskUpdateHandler;
  isKanbanView?: boolean;
  onCardClick?: (task: any) => void;
  dragHandleProps?: any;
  onClick?: () => void;
  onShowChildTasks?: (task: any) => void;
  isRelationsLoading?: boolean;
  /** Map of rootTaskId → members[]. Used to restrict assignee/co-assignee pickers for child tasks. */
  rootMembersMap?: Record<number, any[]>;
  /** The root (top-level) ancestor task ID for this card. Used as key into rootMembersMap. */
  rootTaskId?: number;
}

export default function TaskCard({
  task,
  configData,
  onEdit,
  onDelete,
  onUpdateTask,
  isKanbanView = false,
  onCardClick,
  dragHandleProps,
  onClick,
  onShowChildTasks,
  isRelationsLoading,
  rootMembersMap,
  rootTaskId,
}: TaskCardProps) {

  const [isNavigatingToChildren, setIsNavigatingToChildren] = useState(false);
  const taskId = task.id;
  const status = task.statusName ? {
    id: task.statusId,
    name: task.statusName,
    color: task.statusColor,
    base: task.statusBase,
  } : (configData?.statuses?.find((s) => s.id === task.statusId) ?? task.status ?? null);
  
  const severity = task.severityName ? {
    id: task.severityId,
    name: task.severityName,
    color: task.severityColor,
  } : (configData?.severities?.find((s) => s.id === task.severityId) ?? task.severity ?? null);
  
  const resolvedHierarchyLevel = 
    ((task.hierarchyLevelIcon || task.hierarchyLevelColor || task.hierarchyLevelName)
      ? {
        icon: task.hierarchyLevelIcon as string | undefined,
        color: task.hierarchyLevelColor as string | undefined,
        name: task.hierarchyLevelName as string | undefined,
        sequence: task.hierarchyLevelSequence as number | undefined,
      }
      : null) ??
    configData?.hierarchyLevels?.find((h) => h.id === task.hierarchyLevelConfigId) ??
    task.hierarchyLevelConfig ??
    null;

  // ── Per-card resource resolution ─────────────────────────────────────────
  // Rules:
  //   • task has parentTaskId OR hierarchyLevelSequence > 0  → child task
  //       child tasks MUST use root task members only (never space members)
  //   • no parentTaskId AND hierarchyLevelSequence === 0      → root task
  //       root tasks use their own members if defined & non-empty, else space resources
  const taskSequence = resolvedHierarchyLevel?.sequence ?? task.hierarchyLevelSequence ?? 0;
  // Use AND (same as TaskTableView's isChildRow) so that tasks with taskSequence > 0
  // but no parentTaskId (e.g. returned by a cross-level filter search) are treated
  // as root tasks — consistent with the table view and avoids empty cardResources.
  const isChildTask = !!task.parentTaskId && taskSequence > 0;

  // Resolve which member list applies to this card:
  //   1. rootMembersMap[rootTaskId]  – explicit per-card lookup (passed from page/view)
  //   2. configData.rootTaskMembers  – drilled-view fallback (same root for all cards in view)
  //   3. null                         – not a child task
  const rootMembers: any[] | null | undefined =
    rootMembersMap && rootTaskId !== undefined
      ? (rootMembersMap[rootTaskId] ?? [])
      : isChildTask
        ? configData?.rootTaskMembers
        : null;

  // Members lists (task.members / rootMembers) don't carry a `skills` array — only
  // configData.resources does. Enrich restricted member lists with skills looked up
  // by resource id so the skill picker/prompt still works when the assignee list is
  // member-restricted rather than the full resource list.
  const enrichWithSkills = (list: any[]): any[] => {
    const allResources = configData?.resources ?? [];
    if (allResources.length === 0) return list;
    const skillsById = new Map(allResources.map((r: any) => [r.id, r.skills]));
    return list.map((m: any) => (m.skills ? m : { ...m, skills: skillsById.get(m.id) ?? [] }));
  };

  const allResources = configData?.resources ?? [];
  const combinedResources = [
    ...allResources,
    ...(Array.isArray(task.members) ? task.members : []),
    ...(Array.isArray(rootMembers) ? rootMembers : [])
  ];
  const cardResources: any[] = Array.from(new Map(combinedResources.map(r => [r.id, r])).values());

  const effectiveTaskMembers: any[] = Array.isArray(rootMembers) && rootMembers.length > 0 
    ? enrichWithSkills(rootMembers) 
    : [];

  const fallbackAssignee = task.assigneeId
    ? {
      id: task.assigneeId,
      first_name: task.assigneeName?.split(" ")[0] ?? "",
      last_name: task.assigneeName?.split(" ").slice(1).join(" ") ?? "",
      profile_pic: task.assigneeProfilePicUrl,
      email: task.assigneeEmail,
    }
    : null;

  const assignee = task.assigneeName ? fallbackAssignee :
    (cardResources.find((r: any) => r.id === task.assigneeId) ?? task.assignee ?? fallbackAssignee);
  const coAssignees = task.coAssignees ?? [];

  const prefix = configData?.taskSpace?.prefix ?? task.taskSpace?.prefix;
  void prefix;

  const [commentOpen, setCommentOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [liveCommentCount, setLiveCommentCount] = useState<number | null>(null);
  const commentCount: number = task.commentCount ?? 0;
  const [special, setSpecial] = useState<boolean>(task.special ?? false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: task.startDate ? new Date(task.startDate) : undefined,
    to: task.dueDate ? new Date(task.dueDate) : undefined,
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Sync dateRange when task dates change externally (e.g. parent rollup via onUpdateTask)
  useEffect(() => {
    if (!datePickerOpen) {
      setDateRange({
        from: task.startDate ? new Date(task.startDate) : undefined,
        to: task.dueDate ? new Date(task.dueDate) : undefined,
      });
    }
  }, [task.startDate, task.dueDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const { ref: dragHandleRef, ...dragHandleAttributes } = dragHandleProps || {};
  const HierarchyIcon = resolvedHierarchyLevel?.icon ? getHierarchyLevelIcon(resolvedHierarchyLevel.icon) : Folder;

  // Child tasks button logic — derive from task data directly; no need for configData.hierarchyLevels
  const childTaskCount: number = task.childTasks?.length ?? task.childTaskCount ?? 0;
  // Use embedded hierarchyLevelConfig from task data for next-level icon/name
  const taskHierarchyConfig = task.hierarchyLevelConfig ?? resolvedHierarchyLevel;
  const currentSequence: number = taskHierarchyConfig?.sequence ?? task.hierarchyLevelSequence ?? -1;
  // Next level: first level from configData whose sequence > current, or fall back to task's own nextLevelConfig
  const sortedLevels = [...(configData?.hierarchyLevels ?? [])].sort((a: any, b: any) => a.sequence - b.sequence);
  const nextLevel = sortedLevels.find((l: any) => l.sequence > currentSequence) ?? null;

  // Hide child-task button when we know the hierarchy and there is no deeper level.
  // Primary signal: API returns nextLevelName === null on bulk-relations response.
  // Fallback: derive from loaded configData hierarchy levels.
  const hierarchyKnown = !!configData?.hierarchyLevels?.length;
  const isFinalLevel =
    task.nextLevelName === null ||                                      // API says no next level
    (task.nextLevelName === undefined && hierarchyKnown && nextLevel === null); // config fallback

  const router = useRouter();
  const openFormPage = () => router.push(`/task-management/task/form?id=${taskId}`);

  const handleCardClick = () => { onCardClick?.(task); onClick?.(); openFormPage(); };

  return (
    <div
      className={cn(
        'group rounded-lg border shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden',
        special
          ? 'border-primary bg-primary/10 dark:bg-primary/20'
          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700',
      )}
    >
      {/* Section 1: Hierarchy Level Icon + Code + Status */}
      <div
        ref={isKanbanView && dragHandleRef ? dragHandleRef : undefined}
        {...(isKanbanView && dragHandleAttributes ? dragHandleAttributes : {})}
        className={cn(
          'flex items-center justify-between px-3 py-2 border-b border-dashed',
          special
            ? 'bg-primary/25 dark:bg-primary/35 border-primary/40'
            : 'bg-gray-50 dark:bg-gray-900/50 border-border',
          isKanbanView ? 'cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors' : '',
        )}
        title={isKanbanView ? 'Drag to move task' : undefined}
      >
        <div className="flex items-center gap-2 group/code">
          {/* Hierarchy level */}
          {/* {configData && onUpdateTask ? (
            <InlineEditableTaskHierarchyLevel
              hierarchyLevel={resolvedHierarchyLevel}
              hierarchyLevels={configData.hierarchyLevels ?? []}
              taskId={taskId}
              onUpdate={async (levelId) => {
                const updated = await patchTaskHierarchyLevel(taskId, levelId);
                const newLevel = configData.hierarchyLevels.find((l: any) => l.id === levelId);
                await onUpdateTask(taskId, {
                  hierarchyLevelConfigId: levelId,
                  hierarchyLevelName: newLevel?.name,
                  hierarchyLevelIcon: newLevel?.icon,
                  hierarchyLevelColor: newLevel?.color,
                  hierarchyLevelSequence: newLevel?.sequence
                }, updated);
              }}
            />
          ) : ( */}
            <button className="flex items-center rounded px-1 py-0.5 cursor-default" onClick={(e) => e.stopPropagation()} title={resolvedHierarchyLevel?.name ?? 'No level'}>
              <HierarchyIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: resolvedHierarchyLevel?.color || '#6B7280' }} />
            </button>
          {/* )} */}
          <span className="text-xs font-semibold tracking-wide cursor-pointer hover:underline text-blue-500 dark:text-blue-400" title="View details" onClick={(e) => { e.stopPropagation(); handleCardClick(); }}>{task.code}</span>
          <a
            href={`/task-management/task/form?id=${taskId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 opacity-0 group-hover/code:opacity-100 transition-opacity hover:opacity-75"
            style={{ color: '#3B82F6' }}
            title="Open in new tab"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const link = `${window.location.origin}/task-management/task/form?id=${taskId}`;
              const subject = encodeURIComponent(`Task: ${task.name}${task.code ? ` [${task.code}]` : ''}`);
              const body = encodeURIComponent(`Hi,\n\nPlease find the task details at the link below:\n\n${link}\n\nRegards`);
              window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
            }}
            className="flex-shrink-0 opacity-0 group-hover/code:opacity-100 cursor-pointer transition-opacity hover:opacity-75"
            style={{ color: '#3B82F6' }}
            title="Share via email"
          >
            <Share2 className="w-3 h-3" />
          </button>
        </div>

        {configData && onUpdateTask ? (
          <InlineEditableTaskStatus
            status={status}
            statuses={configData.statuses}
            taskId={taskId}
            onUpdate={async (statusId) => {
              const updated = await patchTaskStatus(taskId, statusId, task.status?.id ?? null, task.parentTaskId ?? null);
              const newStatus = configData.statuses.find((s: any) => s.id === statusId);
              const progress = progressForBase(newStatus?.base);
              const currentProgress = task.progressPercentage ?? 0;
              if (progress !== null && currentProgress !== progress) {
                patchTaskProgress(taskId, progress).catch(() => { });
                await onUpdateTask(taskId, { statusId, progressPercentage: progress }, { ...updated, progressPercentage: progress });
              } else {
                await onUpdateTask(taskId, { statusId }, updated);
              }
            }}
          />
        ) : (
          status && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border rounded-md text-xs font-medium" style={{ borderColor: status.color, color: status.color }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
              {status.name}
            </span>
          )
        )}
      </div>

      {/* Section 2: Name + Assignee + Co-Assignees */}
      <div className="px-3 py-2.5 space-y-2">
        <h3 className="text-sm leading-tight">
          <span className="inline-flex items-center gap-1 w-full">
            {configData && onUpdateTask ? (
              <InlineEditableTaskName
                name={task.name}
                onUpdate={async (name) => {
                  const updated = await patchTaskName(taskId, name, task.name);
                  await onUpdateTask(taskId, { name }, updated);
                }}
                className="font-semibold text-gray-900 dark:text-gray-100 truncate"
              />
            ) : (
              <span className="font-semibold text-gray-900 dark:text-gray-100 truncate block">{task.name}</span>
            )}
            {(task.description || task.name?.length > 50) && (
              <HoverCard openDelay={150}>
                <HoverCardTrigger asChild>
                  <button className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" onClick={(e) => e.stopPropagation()}>
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="w-96 max-h-96 overflow-y-auto" side="right" align="start" onClick={(e) => e.stopPropagation()}>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold mb-1">Title</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300">{task.name}</p>
                    </div>
                    {task.description && (
                      <div>
                        <p className="text-xs font-semibold mb-1">Description</p>
                        <div className="text-xs text-gray-600 dark:text-gray-400 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: task.description }} />
                      </div>
                    )}
                    <hr className="border-border" />
                    <div>
                      <p className="text-xs font-semibold mb-1">Hierarchy</p>
                      <ParentHierarchyView id={task.id} postType="Task" code={task.code || `Task-${task.id}`} size="xs" />
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
          </span>
        </h3>

        {/* Progress slider */}
        {/*{(configData && onUpdateTask ? true : progress > 0) && (*/}
        {/*  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>*/}
        {/*    <Slider*/}
        {/*      value={[progress]}*/}
        {/*      min={0}*/}
        {/*      max={100}*/}
        {/*      step={1}*/}
        {/*      className="[&_[data-slot=slider-thumb]]:size-2.5 [&_[data-slot=slider-track]]:h-1"*/}
        {/*      onValueChange={([val]) => setProgress(val)}*/}
        {/*      onValueCommit={async ([val]) => {*/}
        {/*        if (configData && onUpdateTask) {*/}
        {/*          const updated = await patchTaskProgress(taskId, val);*/}
        {/*          await onUpdateTask(taskId, { progressPercentage: val }, updated);*/}
        {/*        }*/}
        {/*      }}*/}
        {/*    />*/}
        {/*    <span className="text-[10px] text-gray-400 w-6 text-right shrink-0">{progress}%</span>*/}
        {/*  </div>*/}
        {/*)}*/}

        {/* Assignee | Co-Assignees  ·  Child tasks */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center">
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {configData && onUpdateTask ? (
                  <InlineEditableTaskAssignee
                    assignee={assignee}
                    assigneeSkill={task.assigneeSkill}
                    resources={cardResources}
                    taskMembers={configData?.resources}
                    taskId={taskId}
                    onUpdate={async (assigneeId, assigneeSkill) => {
                      const updated = await patchTaskAssignee(taskId, assigneeId, assignee?.id ?? null, undefined, assigneeSkill);
                      await onUpdateTask(taskId, { assigneeId, assigneeSkill: assigneeSkill ?? null }, updated);
                    }}
                  />
                ) : (
                  assignee ? (
                    <Avatar className="w-6 h-6 text-xs" title={`Assignee: ${assignee.first_name} ${assignee.last_name}`}>
                      {assignee.profile_pic && <AvatarImage src={assignee.profile_pic} alt={`${assignee.first_name} ${assignee.last_name}`} className="object-cover" />}
                      <AvatarFallback>
                        {(() => {
                          const fName = (assignee.first_name || '').trim();
                          const lName = (assignee.last_name || '').trim();
                          if (fName && lName) return (fName[0] + lName[0]).toUpperCase();
                          if (fName) return fName.substring(0, 2).toUpperCase();
                          if (lName) return lName.substring(0, 2).toUpperCase();
                          return '?';
                        })()}
                      </AvatarFallback>
                    </Avatar>
                  ) : null
                )}
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 shrink-0" />
                {configData && onUpdateTask ? (
                  <InlineEditableTaskCoAssignees
                    coAssignees={coAssignees}
                    resources={cardResources}
                    taskMembers={configData?.resources}
                    taskId={taskId}
                    onUpdate={async (coAssigneeIds) => {
                      const updated = await patchTaskCoAssignees(taskId, coAssigneeIds);
                      await onUpdateTask(taskId, { coAssigneeIds }, updated);
                    }}
                  />
                ) : (
                    coAssignees.length > 0 && (
                      <AvatarGroup>
                        {coAssignees.slice(0, 1).map((ca: any) => (
                          <div key={ca.id} className="relative rounded-full overflow-hidden">
                            <Avatar className="w-6 h-6 text-xs" title={`${ca.first_name} ${ca.last_name}`}>
                              {ca.profile_pic && <AvatarImage src={ca.profile_pic} alt={`${ca.first_name} ${ca.last_name}`} className="object-cover" />}
                              <AvatarFallback>
                                {(() => {
                                  const fName = (ca.first_name || '').trim();
                                  const lName = (ca.last_name || '').trim();
                                  if (fName && lName) return (fName[0] + lName[0]).toUpperCase();
                                  if (fName) return fName.substring(0, 2).toUpperCase();
                                  if (lName) return lName.substring(0, 2).toUpperCase();
                                  return '?';
                                })()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        ))}
                        {coAssignees.length > 1 && (
                          <AvatarGroupCount>
                            +{coAssignees.length - 1}
                          </AvatarGroupCount>
                        )}
                      </AvatarGroup>
                    )
                  )}
              </div>
            </div>
          </div>

          {/* Child tasks */}
          {!isFinalLevel && (() => {
            const levelName = task.nextLevelName ?? nextLevel?.name;
            return (
              <button
                disabled={isNavigatingToChildren || !onShowChildTasks}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-md text-xs font-medium transition-colors select-none',
                  isNavigatingToChildren ? 'opacity-60 cursor-not-allowed' : onShowChildTasks ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : 'cursor-default',
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!onShowChildTasks || isNavigatingToChildren) return;
                  setIsNavigatingToChildren(true);
                  onShowChildTasks(task);
                }}
                title={
                  isNavigatingToChildren ? 'Navigating...' :
                    isRelationsLoading ? 'Loading...' :
                      childTaskCount === 1
                        ? levelName ? `1 ${levelName}, click to view` : `1 child, click to view`
                        : levelName ? `${childTaskCount} ${levelName}s, click to view` : `${childTaskCount} children, click to view`
                }
              >
                {isNavigatingToChildren ? (
                  <span className="text-gray-400 italic">Navigating ...</span>
                ) : isRelationsLoading ? (
                  <span className="text-gray-400 italic">Syncing ...</span>
                ) : (
                  <span className="text-gray-700 dark:text-gray-300">
                    {childTaskCount === 1
                      ? levelName ? `1 ${levelName}` : '1 Child'
                      : levelName ? `${childTaskCount} ${levelName}s` : `${childTaskCount} Children`}
                  </span>
                )}
                {!isNavigatingToChildren && !isRelationsLoading && (
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-gray-700 dark:text-gray-400" />
                )}
              </button>
            );
          })()}
        </div>
      </div>

      {/* Section 3: Severity + Date Range + Comments + Actions */}
      <div className={cn(
        'px-3 py-2 border-t border-dashed flex items-center justify-between gap-2',
        special
          ? 'bg-primary/25 dark:bg-primary/35 border-primary/40'
          : 'bg-gray-50 dark:bg-gray-900/50 border-border',
      )}>
        <div className="flex items-center gap-2 min-w-0">
          {configData && onUpdateTask ? (
            <InlineEditableTaskSeverity
              severity={severity}
              severities={configData.severities}
              taskId={taskId}
              onUpdate={async (severityId) => {
                const updated = await patchTaskSeverity(taskId, severityId, task.severity?.id ?? null);
                await onUpdateTask(taskId, { severityId }, updated);
              }}
            />
          ) : (
            severity && (
              <span className="inline-flex items-center gap-1 text-xs" style={{ color: severity.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: severity.color }} />
                {severity.name}
              </span>
            )
          )}

          {/* Date range picker */}
          {(() => {
            // Detect rolled-up dates: from bulk-relations flag OR from loaded childTasks
            const childrenHaveDates: boolean =
              task.childrenHaveDates === true ||
              (Array.isArray(task.childTasks) &&
                task.childTasks.some((c: any) => c.startDate || c.dueDate));

            const isStatusComplete = status?.base === 'Finished';
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const isOverdue = dateRange?.to && dateRange.to < todayStart && !isStatusComplete;

            // ── Rolled-up / locked display ──────────────────────────────────
            if (childrenHaveDates) {
              // childrenHaveDates guarantees rolled-up dates exist — no — fallback needed
              const dateLabel = dateRange?.from && dateRange?.to
                ? <>{format(dateRange.from, 'LLL dd')} – {format(dateRange.to, 'LLL dd')}</>
                : dateRange?.from
                  ? <>{format(dateRange.from, 'LLL dd')} – ?</>
                  : dateRange?.to
                    ? <>? – {format(dateRange.to, 'LLL dd')}</>
                    : null;

              const lockedContent = (
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-destructive ${isOverdue ? 'bg-red-400' : 'bg-gray-400'}`}>
                    {isOverdue ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-white dark:text-gray-900" strokeWidth={2.5} />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-white dark:text-gray-900" strokeWidth={2.5} />
                    )}
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    {isOverdue ? (
                      <>
                        <p className="text-sm font-semibold text-destructive">Overdue task</p>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Dates rolled up from children</p>
                      </>
                    ) : (
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Dates rolled up from children</p>
                    )}
                    {(dateRange?.from || dateRange?.to) && (
                      <div className="flex items-center gap-1.5 text-xs font-medium rounded-md border px-2 py-1 text-gray-700 dark:text-gray-300 w-fit">
                        <CalendarDays className="w-3 h-3 shrink-0" />
                        {dateRange?.from && format(dateRange.from, 'LLL dd, y')}
                        {dateRange?.from && dateRange?.to && ' – '}
                        {dateRange?.to && format(dateRange.to, 'LLL dd, y')}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">Update children to adjust dates.</p>
                  </div>
                </div>
              );

              return (
                <HoverCard openDelay={150}>
                  <HoverCardTrigger asChild>
                    <span
                      onClick={(e) => e.stopPropagation()}
                      // title="Dates rolled up from children"
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border cursor-default select-none whitespace-nowrap bg-white dark:bg-gray-900/50 ${isOverdue ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} text-gray-700 dark:text-gray-300`}
                    >
                      {isOverdue ? <AlertTriangle className="w-3 h-3 shrink-0 text-red-500" strokeWidth={2.5} /> : <Lock className="w-3 h-3 shrink-0" strokeWidth={2.5} />}
                      {dateLabel}
                    </span>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-72 p-3" side="right" align="start" onClick={(e) => e.stopPropagation()}>
                    {lockedContent}
                  </HoverCardContent>
                </HoverCard>
              );
            }


            // ── Editable date picker ─────────────────────────────────────────
            if (configData && onUpdateTask) {
              const handleClearDates = async (e: React.MouseEvent) => {
                e.stopPropagation();
                setDateRange(undefined);
                setDatePickerOpen(false);
                const updated = await patchTaskDates(taskId, null, null, task.startDate ?? null, task.dueDate ?? null, task.parentTaskId ?? null);
                await onUpdateTask(taskId, { startDate: null, dueDate: null }, updated);
                if (updated?.parentTask && task.parentTaskId) {
                  await onUpdateTask(task.parentTaskId, { startDate: updated.parentTask.startDate ?? null, dueDate: updated.parentTask.dueDate ?? null });
                }
              };


              return (
                <div className="flex items-center gap-1">
                  <HoverCard openDelay={200}>
                    <HoverCardTrigger asChild>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Popover
                          open={datePickerOpen}
                          onOpenChange={async (open) => {
                            setDatePickerOpen(open);
                            if (!open) {
                              const startDateStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null;
                              const dueDateStr = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null;
                              if (startDateStr !== (task.startDate ?? null) || dueDateStr !== (task.dueDate ?? null)) {
                                const updated = await patchTaskDates(taskId, startDateStr, dueDateStr, task.startDate ?? null, task.dueDate ?? null, task.parentTaskId ?? null);
                                await onUpdateTask(taskId, { startDate: startDateStr, dueDate: dueDateStr }, updated);
                                if (updated?.parentTask && task.parentTaskId) {
                                  await onUpdateTask(task.parentTaskId, { startDate: updated.parentTask.startDate ?? null, dueDate: updated.parentTask.dueDate ?? null });
                                }
                              }
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              title={isOverdue ? 'Task is overdue - Click to change dates.' : 'Click to change dates'}
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-900/50 border rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${isOverdue ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} text-gray-700 dark:text-gray-300`}
                            >
                              {isOverdue
                                ? <AlertTriangle className="w-3 h-3 shrink-0 text-red-500" />
                                : <CalendarDays className="w-3 h-3 shrink-0" />
                              }
                              {dateRange?.from && dateRange?.to ? (
                                <>{format(dateRange.from, 'LLL dd')} – {format(dateRange.to, 'LLL dd')}</>
                              ) : dateRange?.from ? (
                                <>{format(dateRange.from, 'LLL dd')} – ?</>
                              ) : dateRange?.to ? (
                                <> ? – {format(dateRange.to, 'LLL dd')}</>
                              ) : (
                                <span className="text-gray-400">No date range</span>
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}
                            onMouseLeave={async () => {
                              if (!datePickerOpen) return;
                              setDatePickerOpen(false);
                              const startDateStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null;
                              const dueDateStr = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null;
                              if (startDateStr !== (task.startDate ?? null) || dueDateStr !== (task.dueDate ?? null)) {
                                const updated = await patchTaskDates(taskId, startDateStr, dueDateStr, task.startDate ?? null, task.dueDate ?? null, task.parentTaskId ?? null);
                                await onUpdateTask(taskId, { startDate: startDateStr, dueDate: dueDateStr }, updated);
                                if (updated?.parentTask && task.parentTaskId) {
                                  await onUpdateTask(task.parentTaskId, { startDate: updated.parentTask.startDate ?? null, dueDate: updated.parentTask.dueDate ?? null });
                                }
                              }
                            }}
                          >
                            <Calendar
                              mode="range"
                              defaultMonth={dateRange?.from ?? dateRange?.to}
                              selected={dateRange}
                              onSelect={(range) => {
                                setDateRange(range);
                              }}
                              numberOfMonths={2}
                            />
                            {/* Individual date controls */}
                            {(dateRange?.from || dateRange?.to) && (
                              <div className="border-t px-3 py-2 space-y-1.5">
                                {/*<div className="flex items-center gap-3 text-xs flex-wrap">*/}
                                {/*  {dateRange?.from && (*/}
                                {/*    <div className="flex items-center gap-1.5">*/}
                                {/*      <span className="text-muted-foreground font-medium">Start:</span>*/}
                                {/*      <span className="text-gray-700 dark:text-gray-300 font-medium">{format(dateRange.from, 'LLL dd, y')}</span>*/}
                                {/*      <button*/}
                                {/*        onClick={handleClearStart}*/}
                                {/*        className="flex items-center gap-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-1.5 py-0.5 rounded transition-colors"*/}
                                {/*        title="Remove start date"*/}
                                {/*      >*/}
                                {/*        <X className="w-3 h-3" />*/}
                                {/*        <span>Clear</span>*/}
                                {/*      </button>*/}
                                {/*    </div>*/}
                                {/*  )}*/}
                                {/*  {dateRange?.from && dateRange?.to && <span className="text-gray-300 dark:text-gray-600">|</span>}*/}
                                {/*  {dateRange?.to && (*/}
                                {/*    <div className="flex items-center gap-1.5">*/}
                                {/*      <span className={`font-medium ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>Due:</span>*/}
                                {/*      <span className={`font-medium ${isOverdue ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>{format(dateRange.to, 'LLL dd, y')}</span>*/}
                                {/*      <button*/}
                                {/*        onClick={handleClearDue}*/}
                                {/*        className="flex items-center gap-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-1.5 py-0.5 rounded transition-colors"*/}
                                {/*        title="Remove due date"*/}
                                {/*      >*/}
                                {/*        <X className="w-3 h-3" />*/}
                                {/*        <span>Clear</span>*/}
                                {/*      </button>*/}
                                {/*    </div>*/}
                                {/*  )}*/}
                                {/*</div>*/}
                                {dateRange?.from && dateRange?.to && (
                                  // <div className="pt-1 border-t border-dashed border-border">
                                  <div className="pt-1 border-border">
                                    <button
                                      onClick={handleClearDates}
                                      className="w-full text-xs text-red-500 hover:text-red-700 transition-colors text-center py-0.5"
                                    >
                                      Clear all dates
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    </HoverCardTrigger>
                  </HoverCard>
                </div>
              );
            }
            // Read-only fallback
            const isOverdueRO = dateRange?.to && dateRange.to < todayStart && !isStatusComplete;
            return (dateRange?.from || dateRange?.to) ? (
              <span className={`inline-flex items-center gap-1 text-xs font-medium text-muted-foreground`}>
                <CalendarDays className="w-3 h-3" />
                {dateRange?.from && dateRange?.to ? (
                  <>{format(dateRange.from, 'LLL dd')} – {format(dateRange.to, 'LLL dd')}</>
                ) : dateRange?.from ? (
                  <>{format(dateRange.from, 'LLL dd')} – ?</>
                ) : (
                  <> ? – {format(dateRange!.to!, 'LLL dd')}</>
                )}
              </span>
            ) : null;
          })()}
        </div>

        <div className="flex items-center gap-1">
          <Popover open={commentOpen} onOpenChange={setCommentOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-1.5 gap-1 hover:bg-gray-100 dark:hover:bg-gray-700" title="Comments" onClick={(e) => e.stopPropagation()}>
                {isRelationsLoading && liveCommentCount === null ? (
                  <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                ) : (liveCommentCount ?? commentCount) > 0 ? (
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-none">{liveCommentCount ?? commentCount}</span>
                ) : null}
                <MessageSquare className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] p-3 max-h-[320px] overflow-y-auto" align="end" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Comments</p>
                <button onClick={() => setCommentOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <CommentSection postId={taskId} postType="Task" onCommentCountChange={setLiveCommentCount} />
            </PopoverContent>
          </Popover>

          {(onEdit || onDelete) && (
            <DropdownMenu open={actionsOpen} onOpenChange={setActionsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700" title="Actions" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48" onMouseLeave={() => setActionsOpen(false)}>
                <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {onEdit && (
                  <>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openFormPage(); }} className="cursor-pointer">
                      <Eye className="w-3.5 h-3.5 mr-2" /><span className="text-xs">View</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openFormPage(); }} className="cursor-pointer">
                      <Edit className="w-3.5 h-3.5 mr-2" /><span className="text-xs">Edit</span>
                    </DropdownMenuItem>
                  </>
                )}
                {onUpdateTask && (
                  <DropdownMenuItem
                    onClick={async (e) => {
                      e.stopPropagation();
                      const newSpecial = !special;
                      setSpecial(newSpecial);
                      const updated = await patchTaskSpecial(taskId, newSpecial);
                      await onUpdateTask(taskId, { special: newSpecial }, updated);
                    }}
                    className="cursor-pointer"
                  >
                    <Star
                      className={`w-3.5 h-3.5 mr-2 ${special ? 'text-primary fill-primary/20' : 'text-muted-foreground'
                        }`}
                    />
                    <span className={`text-xs ${special ? 'text-primary' : ''}`}>{special ? 'Remove Special' : 'Mark as Special'}</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={async (e) => {
                    e.stopPropagation();
                    const link = `${window.location.origin}/task-management/task/form?id=${taskId}`;
                    const text = `[${task.code || "TSK"}] ${task.name || "Task"}`;
                    const html = `<a href="${link}">${text}</a>`;
                    try {
                      const clipboardItem = new ClipboardItem({
                        "text/html": new Blob([html], { type: "text/html" }),
                        "text/plain": new Blob([link], { type: "text/plain" }),
                      });
                      await navigator.clipboard.write([clipboardItem]);
                      toast.success("Rich text link copied to clipboard");
                    } catch (error) {
                      navigator.clipboard.writeText(link);
                      toast.success("Link copied to clipboard");
                    }
                  }}
                  className="cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 mr-2" /><span className="text-xs">Copy Link</span>
                </DropdownMenuItem>
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(task); }} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                      <Trash className="w-3.5 h-3.5 mr-2 text-destructive" /><span className="text-xs">Delete</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
