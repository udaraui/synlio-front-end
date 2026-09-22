'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Edit, Eye, MoreVertical, Info, ExternalLink,
  Share2, Copy,
  MessageSquare, X, Folder, CalendarDays, AlertTriangle,
  Plus, Lock, Loader2, ChevronRight, ChevronDown, Star, Link,
  Trash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CommentSection } from '@/components/common/CommentSection';
import { toast } from 'sonner';
import { setMeetingActionState } from '@/services/meetings-integration.service';
import { linkTaskToActivity } from '@/services/new-activity.service';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { getHierarchyLevelIcon } from '@/enums/space-configure-icon.enum';
import { ParentHierarchyView } from '@/components/common/ParentLevelsHoverCard';
import {
  InlineEditableTaskName,
  InlineEditableTaskStatus,
  InlineEditableTaskSeverity,
  InlineEditableTaskAssignee,
  InlineEditableTaskCoAssignees,
  InlineEditableTaskHierarchyLevel,
} from './InlineEditableTaskComponents';
import {
  patchTaskName,
  patchTaskStatus,
  patchTaskSeverity,
  patchTaskAssignee,
  patchTaskCoAssignees,
  patchTaskSpecial,
  patchTaskLabels,
  patchTaskDates,
  searchTasks,
  getBulkTaskRelations,
  patchTaskProgress,
  patchTaskHierarchyLevel,
} from '@/services/task-management/task.service';
import { createTmTaskLabel, getLabelsByTaskSpace } from '@/services/task-management/task-label.service';
import { TaskLabelDropdown } from '@/components/common/TaskLabelDropdown';
import type { TaskCardConfigData, TaskUpdateHandler } from './task-card.types';
import { InlineTaskCreatorRow } from './InlineTaskCreatorRow';
import { NoMembersWarningAvatar } from './NoMembersWarningAvatar';

/** Map status base to an auto-derived progress percentage */
const progressForBase = (base: string | null | undefined): number | null => {
  if (base === 'To Start') return 0;
  if (base === 'Processing') return 20;
  if (base === 'Finished') return 100;
  return null;
};

/**
 * Parse a date value as **local** midnight so that bare "YYYY-MM-DD" strings
 * are never shifted to the previous day by the UTC-parsing behavior of
 * `new Date("YYYY-MM-DD")`.
 */
function parseLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d); // local midnight — no UTC shift
  }
  return new Date(value);
}

/**
 * Serialize a Date to a "YYYY-MM-DD" string in **local** time so that the
 * saved date always matches what the user picked in the calendar.
 * (Using `toISOString()` converts to UTC first, which can shift the day back.)
 */
function toLocalDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}


interface TaskTableViewProps {
  tasks: any[];
  configData?: TaskCardConfigData;
  onRowClick?: (task: any) => void;
  onEdit?: (task: any) => void;
  onDelete?: (task: any) => void;
  onUpdateTask?: TaskUpdateHandler;
  onShowChildTasks?: (task: any) => void;
  onHandleReady?: (handle: any) => void;
  filtersActive?: boolean;
  topInlineCreatorRow?: React.ReactNode;
  /** Set to the task ID after a confirmed delete so the table cleans up its local maps. */
  lastDeletedTaskId?: number | null;
  isRelationsLoading?: boolean;
  /**
   * sessionStorage key used to persist / restore which task rows are expanded.
   * When provided, expanded state survives navigation away and back.
   */
  expandStorageKey?: string;
  /**
   * When true (set by parent on a view-switch mount), the expand-restore effect
   * is skipped entirely so no extra child-task API calls are made.
   * Captured in a ref at mount time so subsequent prop changes have no effect.
   */
  skipExpandRestore?: boolean;
  meetingId?: string;
  activityId?: string;
  sortOption?: string;
}

function TaskTableView({
  tasks,
  configData,
  onRowClick,
  onEdit,
  onDelete,
  onUpdateTask,
  onHandleReady,
  filtersActive = false,
  topInlineCreatorRow,
  isRelationsLoading,
  expandStorageKey,
  skipExpandRestore = false,
  meetingId,
  activityId,
  sortOption,
}: TaskTableViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingName = searchParams?.get('meetingName');
  const activityTitle = searchParams?.get('activityTitle');

  const [openCommentTaskId, setOpenCommentTaskId] = useState<number | null>(null);
  const [openActionsTaskId, setOpenActionsTaskId] = useState<number | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>(
    () => Object.fromEntries(tasks.map((t) => [t.id, t.commentCount ?? 0])),
  );
  const [specialStates, setSpecialStates] = useState<Record<number, boolean>>(
    () => Object.fromEntries(tasks.map((t) => [t.id, t.special ?? false])),
  );
  const [labelStates, setLabelStates] = useState<Record<number, any[]>>(
    () => Object.fromEntries(tasks.map((t) => [t.id, t.labels ?? []])),
  );
  const [labelSearches, setLabelSearches] = useState<Record<number, string>>({});
  const [openLabelPickerTaskId, setOpenLabelPickerTaskId] = useState<number | null>(null);
  const [creatingLabelForTaskId, setCreatingLabelForTaskId] = useState<number | null>(null);
  const [loadingLabelsForTaskId, setLoadingLabelsForTaskId] = useState<number | null>(null);

  // Available labels = configData.labels + any newly created ones this session
  const [localLabels, setLocalLabels] = useState<any[]>(() => configData?.labels ?? []);
  useEffect(() => { setLocalLabels(configData?.labels ?? []); }, [configData?.labels]);

  // Date range per task
  const [dateRangeStates, setDateRangeStates] = useState<Record<number, DateRange | undefined>>(
    () => Object.fromEntries(tasks.map((t) => [t.id, {
      from: t.startDate ? parseLocalDate(t.startDate) : undefined,
      to: t.dueDate ? parseLocalDate(t.dueDate) : undefined,
    }])),
  );
  const [datePickerOpenTaskId, setDatePickerOpenTaskId] = useState<string | null>(null);
  // Ref that always mirrors dateRangeStates so async callbacks (e.g. onSave)
  // never read a stale closure value.
  const dateRangeStatesRef = useRef<Record<number, DateRange | undefined>>({});
  useEffect(() => { dateRangeStatesRef.current = dateRangeStates; }, [dateRangeStates]);

  // ── Inline expand state ───────────────────────────────────────────────────
  // Store {id, taskSpaceId, parentTaskId} objects so we can restore any depth
  // without needing a cascade (fetch all levels in parallel on remount).
  type ExpandedTaskMeta = { id: number; taskSpaceId?: number; parentTaskId?: number | null };

  const parseExpandStorage = (key: string): ExpandedTaskMeta[] => {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item: any) => {
        // Support legacy format (plain number array) and new object format.
        if (typeof item === 'number') return { id: item };
        if (item && typeof item.id === 'number') return { id: item.id, taskSpaceId: item.taskSpaceId, parentTaskId: item.parentTaskId };
        return null;
      }).filter((x): x is ExpandedTaskMeta => x !== null && Number.isFinite(x.id));
    } catch { return []; }
  };

  // Lazy initializer reads stored task meta; extracts IDs for the Set.
  // On a view-switch mount (skipExpandRestore=true) start fully collapsed so
  // no rows appear expanded without their children being loaded.
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(() => {
    if (skipExpandRestore) return new Set();
    if (expandStorageKey && typeof window !== 'undefined') {
      const metas = parseExpandStorage(expandStorageKey);
      if (metas.length) return new Set(metas.map((m) => m.id));
    }
    return new Set();
  });

  // Ref that holds the full task meta for every expanded task (needed for restore).
  // Also cleared on view-switch so it stays consistent with expandedTaskIds.
  const expandedTasksMetaRef = useRef<Record<number, ExpandedTaskMeta>>(
    (() => {
      if (skipExpandRestore) return {};
      if (expandStorageKey && typeof window !== 'undefined') {
        const metas = parseExpandStorage(expandStorageKey);
        return Object.fromEntries(metas.map((m) => [m.id, m]));
      }
      return {};
    })(),
  );

  // Persist expanded task meta to sessionStorage whenever the set changes.
  useEffect(() => {
    if (!expandStorageKey) return;
    try {
      sessionStorage.setItem(
        expandStorageKey,
        JSON.stringify(Object.values(expandedTasksMetaRef.current)),
      );
    } catch { /* ignore */ }
  }, [expandedTaskIds, expandStorageKey]);

  const [childTasksMap, setChildTasksMap] = useState<Record<number, any[]>>({});
  // Ref that always mirrors childTasksMap — lets handleInlineUpdate read the
  // latest state without capturing a stale closure.
  const childTasksMapRef = React.useRef<Record<number, any[]>>({});
  const [expandLoadingSet, setExpandLoadingSet] = useState<Set<number>>(new Set());

  // ── Inline task creator ───────────────────────────────────────────────────
  // Tracks which level the creator row should appear at (null = hidden).
  // levelKey: 'root' for top-level, String(parentId) for child levels.
  const [creatorState, setCreatorState] = useState<{ siblingTask: any; levelKey: string } | null>(null);
  // Tasks inserted locally keyed by parentId (string) or 'root' for top-level.
  // Rendered at the TOP of the level they belong to.
  const [insertedAtTopMap, setInsertedAtTopMap] = useState<Record<string, any[]>>({});
  // Set of task IDs in insertedAtTopMap — prevents double-rendering when a task
  // also lives in childTasksMap (added there for date-rollup purposes).
  const insertedTaskIds = useMemo(
    () => new Set<number>(
      Object.values(insertedAtTopMap).flatMap((arr) => arr.map((t: any) => t.id)),
    ),
    [insertedAtTopMap],
  );

  // Keep the ref in sync whenever childTasksMap changes
  useEffect(() => { childTasksMapRef.current = childTasksMap; }, [childTasksMap]);

  useEffect(() => {
    // Merge (not replace) so that child-task states registered via
    // registerTaskStates are preserved when the top-level tasks prop changes.
    setCommentCounts((prev) => ({
      ...prev,
      ...Object.fromEntries(tasks.map((t) => [t.id, t.commentCount ?? 0])),
    }));
    setSpecialStates((prev) => ({
      ...prev,
      ...Object.fromEntries(tasks.map((t) => [t.id, t.special ?? false])),
    }));
    setLabelStates((prev) => ({
      ...prev,
      ...Object.fromEntries(tasks.map((t) => [t.id, t.labels ?? []])),
    }));
    setDateRangeStates((prev) => ({
      ...prev,
      ...Object.fromEntries(tasks.map((t) => [t.id, {
        from: t.startDate ? parseLocalDate(t.startDate) : undefined,
        to: t.dueDate ? parseLocalDate(t.dueDate) : undefined,
      }])),
    }));
  }, [tasks]);

  /** Register a batch of newly-fetched child tasks into all per-task state maps */
  const registerTaskStates = useCallback((newTasks: any[]) => {
    if (!newTasks.length) return;
    setCommentCounts((prev) => ({
      ...prev,
      ...Object.fromEntries(newTasks.map((t) => [t.id, t.commentCount ?? 0])),
    }));
    setSpecialStates((prev) => ({
      ...prev,
      ...Object.fromEntries(newTasks.map((t) => [t.id, t.special ?? false])),
    }));
    setLabelStates((prev) => ({
      ...prev,
      ...Object.fromEntries(newTasks.map((t) => [t.id, t.labels ?? []])),
    }));
    setDateRangeStates((prev) => ({
      ...prev,
      ...Object.fromEntries(newTasks.map((t) => [t.id, {
        from: t.startDate ? parseLocalDate(t.startDate) : undefined,
        to: t.dueDate ? parseLocalDate(t.dueDate) : undefined,
      }])),
    }));
  }, []);

  // Keep a ref to configData so async callbacks always read the latest value
  const configDataRef = useRef<TaskCardConfigData | undefined>(configData);
  useEffect(() => { configDataRef.current = configData; }, [configData]);

  // ── Root tasks ref (for member lookup in inline-expanded child rows) ─────────
  // The tasks prop holds the page-level depth-0 tasks.  Their `.members` field
  // is populated by the backend's getBulkTaskRelations (Phase 2 enrichment).
  // We use this ref in renderRows instead of making a separate API call.
  const rootTasksRef = useRef<any[]>(tasks);
  useEffect(() => { rootTasksRef.current = tasks; }, [tasks]);

  // Maps root task ID → code string so the NoMembersWarning can show the code
  const rootTaskCodeMap = useMemo<Record<number, string>>(
    () => Object.fromEntries(tasks.filter((t) => t.code).map((t) => [t.id, t.code])),
    [tasks],
  );

  /** Fetch child tasks for a given parent task inline (no page-level navigation) */
  const fetchChildTasksInline = useCallback(async (task: any, silent?: boolean) => {
    const taskId: number = task.id;
    if (expandLoadingSet.has(taskId)) return;
    if (!silent) setExpandLoadingSet((prev) => new Set(prev).add(taskId));
    try {
      const filters: any[] = [
        { field: 'parentTaskId', value: taskId, matchMode: 'equals' },
      ];
      if (task.taskSpaceId) {
        filters.push({ field: 'taskSpaceId', value: task.taskSpaceId, matchMode: 'equals' });
      }
      let multiSorts: any[] = [{ field: 'id', order: '-1' }];
      if (sortOption) {
        const [sortField, sortOrderStr] = sortOption.split('-');
        multiSorts = [{ field: sortField, order: sortOrderStr === 'asc' ? '1' : '-1' }];
      }

      const result = await searchTasks({
        first: 0,
        rows: 200,
        filters,
        multiSorts,
      });
      const fetched: any[] = result.data ?? [];

      // 1. Immediately render the base tasks from search
      setChildTasksMap((prev) => {
        const updated = { ...prev, [taskId]: fetched };
        childTasksMapRef.current = updated;
        return updated;
      });
      registerTaskStates(fetched);

      // 2. Fetch bulk relations asynchronously without blocking the UI
      if (fetched.length > 0) {
        const ids = fetched.map((t: any) => t.id);
        getBulkTaskRelations(ids).then((relations) => {
          setChildTasksMap((prev) => {
            const currentList = prev[taskId] || fetched;
            const enriched = currentList.map((t: any) => {
              const rel = relations[t.id];
              return rel ? { ...t, ...rel } : t;
            });
            const updated = { ...prev, [taskId]: enriched };
            childTasksMapRef.current = updated;
            return updated;
          });

          // Re-register states so comment counts, etc. appear
          const enrichedForStates = fetched.map((t: any) => {
            const rel = relations[t.id];
            return rel ? { ...t, ...rel } : t;
          });
          registerTaskStates(enrichedForStates);
        }).catch(() => {
          /* ignore errors, gracefully fallback to raw fetched data */
        });
      }
    } catch {
      const empty = { ...childTasksMapRef.current, [taskId]: [] };
      childTasksMapRef.current = empty;
      setChildTasksMap(empty);
    } finally {
      if (!silent) {
        setExpandLoadingSet((prev) => {
          const s = new Set(prev);
          s.delete(taskId);
          return s;
        });
      }
    }
  }, [expandLoadingSet, registerTaskStates, sortOption]);

  // ── Restore child-task data for ALL expanded IDs on mount ────────────────
  // Because we store the full task meta (id + taskSpaceId + parentTaskId) we
  // can fire fetchChildTasksInline for every expanded task in parallel — no
  // cascade required, so even deeply nested expansions are restored at once.
  //
  // Guard 0 (skipExpandRestoreRef): captured at mount time — when parent signals
  //   a view-switch (data already loaded), skip ALL restore fetches entirely.
  // Guard 1 (expandRestoreTriggeredRef): one-shot — skips the entire block
  //   after the first successful run (tasks were non-empty and expandedIds exist).
  // Guard 2 (!childTasksMap[id]): belt-and-suspenders — even if the ref somehow
  //   didn't prevent a re-run (e.g. component remounted), never re-fetch children
  //   that are already loaded.  Both guards are needed for a clean refresh.
  const skipExpandRestoreRef = useRef(skipExpandRestore);
  const expandRestoreTriggeredRef = useRef(false);
  useEffect(() => {
    if (!expandStorageKey) return;
    if (skipExpandRestoreRef.current) return;        // view-switch: no extra API calls
    if (expandRestoreTriggeredRef.current) return;
    if (!tasks.length || !expandedTaskIds.size) return;
    expandRestoreTriggeredRef.current = true;

    const metas = Object.values(expandedTasksMetaRef.current);
    if (!metas.length) {
      // Fallback: no stored meta — try top-level tasks only.
      tasks.forEach((task) => {
        if (expandedTaskIds.has(task.id) && !childTasksMapRef.current[task.id]) {
          fetchChildTasksInline(task, true);
        }
      });
      return;
    }

    // Fetch children for every expanded task simultaneously (silent — no spinner on view-switch restore).
    // Top-level tasks are preferably taken from the tasks prop (richer object);
    // others use the stored meta (has enough fields for the API call).
    const tasksById: Record<number, any> = Object.fromEntries(tasks.map((t) => [t.id, t]));
    metas.forEach((meta) => {
      if (expandedTaskIds.has(meta.id) && !childTasksMapRef.current[meta.id]) {
        fetchChildTasksInline(tasksById[meta.id] ?? meta, true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, expandStorageKey]);

  // ── Refetch child tasks when sortOption changes ───────────────────────────
  const prevSortOptionRef = useRef(sortOption);
  useEffect(() => {
    if (prevSortOptionRef.current !== sortOption) {
      prevSortOptionRef.current = sortOption;

      // Refetch all currently expanded tasks so they re-sort
      const metas = Object.values(expandedTasksMetaRef.current);
      const tasksById: Record<number, any> = Object.fromEntries(tasks.map((t) => [t.id, t]));
      metas.forEach((meta) => {
        if (expandedTaskIds.has(meta.id)) {
          fetchChildTasksInline(tasksById[meta.id] ?? meta, true);
        }
      });

      // Clear loaded child tasks that are NOT expanded so they fetch with new sort on next expand
      setChildTasksMap((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const key of Object.keys(next)) {
          if (!expandedTaskIds.has(Number(key))) {
            delete next[Number(key)];
            changed = true;
          }
        }
        if (changed) {
          childTasksMapRef.current = next;
          return next;
        }
        return prev;
      });
    }
  }, [sortOption, expandedTaskIds, fetchChildTasksInline, tasks]);


  /**
   * Update handler that keeps childTasksMap in sync so that inline-edited
   * child rows reflect their new values on subsequent renders.
   * Also rolls up date changes to the parent row's dateRangeStates.
   *
   * Uses childTasksMapRef (not the stale closure value) so the computation is
   * always based on the latest map.  Everything is computed synchronously
   * BEFORE calling setState so that both setChildTasksMap and setDateRangeStates
   * receive real values — the old approach of filling a variable inside a
   * setState updater failed because updaters run asynchronously.
   */
  const handleInlineUpdate = useCallback(async (taskId: number, updates: any, updatedData?: any) => {
    const currentMap = childTasksMapRef.current;

    // 1. Build the updated map — prefer the full API response (updatedData) so
    //    that related objects (e.g. status, severity, assignee) are also updated
    //    in the local state without a follow-up GET call.
    const stateUpdate = { ...(updatedData ?? updates) };

    // Sync denormalized fields for inline child tasks
    if (stateUpdate.status !== undefined) {
      stateUpdate.statusName = stateUpdate.status?.name || null;
      stateUpdate.statusColor = stateUpdate.status?.color || null;
      stateUpdate.statusBase = stateUpdate.status?.base || null;
    }
    if (stateUpdate.severity !== undefined) {
      stateUpdate.severityName = stateUpdate.severity?.name || null;
      stateUpdate.severityColor = stateUpdate.severity?.color || null;
    }
    if (stateUpdate.assignee !== undefined) {
      stateUpdate.assigneeName = stateUpdate.assignee ? `${stateUpdate.assignee.first_name || ''} ${stateUpdate.assignee.last_name || ''}`.trim() : null;
      stateUpdate.assigneeProfilePicUrl = stateUpdate.assignee?.profile_picture || stateUpdate.assignee?.profile_pic || null;
      stateUpdate.assigneeEmail = stateUpdate.assignee?.email || null;
    }
    if (stateUpdate.hierarchyLevelConfig !== undefined) {
      stateUpdate.hierarchyLevelName = stateUpdate.hierarchyLevelConfig?.name || null;
      stateUpdate.hierarchyLevelIcon = stateUpdate.hierarchyLevelConfig?.icon || null;
      stateUpdate.hierarchyLevelColor = stateUpdate.hierarchyLevelConfig?.color || null;
    }
    const newMap: Record<number, any[]> = {};
    let changed = false;
    for (const [key, children] of Object.entries(currentMap)) {
      newMap[Number(key)] = children.map((t) => {
        if (t.id === taskId) { changed = true; return { ...t, ...stateUpdate }; }
        return t;
      });
    }

    // 1b. Also update insertedAtTopMap — newly-created tasks live here and are
    //     NOT in childTasksMap, so status/severity/etc. changes would otherwise
    //     appear not to apply until a full page refresh.
    setInsertedAtTopMap((prev) => {
      let insertedChanged = false;
      const newInserted: Record<string, any[]> = {};
      for (const [key, arr] of Object.entries(prev)) {
        newInserted[key] = arr.map((t: any) => {
          if (t.id === taskId) { insertedChanged = true; return { ...t, ...stateUpdate }; }
          return t;
        });
      }
      return insertedChanged ? newInserted : prev;
    });

    if (changed) {
      // Keep ref in sync immediately so rapid successive calls see latest data
      childTasksMapRef.current = newMap;
      setChildTasksMap(newMap);

      // 2. If dates changed, compute multi-level rollup synchronously and apply
      if ('startDate' in updates || 'dueDate' in updates) {
        const updatedParentDates: Record<number, DateRange | undefined> = {};

        // Track the "effective" date strings for any task whose dates changed
        // (either directly edited, or re-computed via rollup).  This lets us
        // correctly propagate through grandparent, great-grandparent, etc.
        const effectiveDates: Record<number, { startDate: string | null; dueDate: string | null }> = {
          [taskId]: {
            startDate: ('startDate' in updates ? updates.startDate : undefined) ?? null,
            dueDate: ('dueDate' in updates ? updates.dueDate : undefined) ?? null,
          },
        };

        // Walk up the chain: find the parent of `currentId`, roll up, repeat.
        let currentId = taskId;
        while (true) {
          let parentId: number | null = null;
          let parentChildren: any[] | null = null;

          for (const [key, children] of Object.entries(newMap)) {
            if (children.some((c) => c.id === currentId)) {
              parentId = Number(key);
              parentChildren = children;
              break;
            }
          }

          if (parentId === null || parentChildren === null) break; // reached the top

          // Roll up children → parent.  Use effectiveDates when available so
          // that an intermediate parent's new computed range is forwarded to
          // its own parent on the next iteration.
          const starts: Date[] = [];
          const ends: Date[] = [];
          for (const child of parentChildren) {
            const eff = effectiveDates[child.id];
            const sdStr = eff !== undefined ? eff.startDate : (child.startDate ?? null);
            const ddStr = eff !== undefined ? eff.dueDate : (child.dueDate ?? null);
            if (sdStr) starts.push(parseLocalDate(sdStr));
            if (ddStr) ends.push(parseLocalDate(ddStr));
          }

          const newRange: DateRange | undefined =
            starts.length > 0 || ends.length > 0
              ? {
                from: starts.length > 0 ? new Date(Math.min(...starts.map((d) => d.getTime()))) : undefined,
                to: ends.length > 0 ? new Date(Math.max(...ends.map((d) => d.getTime()))) : undefined,
              }
              : undefined;

          // Only update dates when remaining children still have dates.
          // If no children have dates, preserve the parent's own existing dates.
          if (newRange) {
            updatedParentDates[parentId] = newRange;
            effectiveDates[parentId] = {
              startDate: newRange.from ? toLocalDateString(newRange.from) : null,
              dueDate: newRange.to ? toLocalDateString(newRange.to) : null,
            };
          } else {
            // Preserve the parent task's current dates — look it up in newMap buckets
            let existingStartDate: string | null = null;
            let existingDueDate: string | null = null;
            for (const gChildren of Object.values(newMap)) {
              const found = gChildren.find((c) => c.id === parentId);
              if (found) {
                existingStartDate = found.startDate ?? null;
                existingDueDate = found.dueDate ?? null;
                break;
              }
            }
            effectiveDates[parentId] = {
              startDate: existingStartDate,
              dueDate: existingDueDate,
            };
            // Do NOT add to updatedParentDates — keep current displayed dates unchanged
          }

          currentId = parentId; // walk one level higher
        }

        if (Object.keys(updatedParentDates).length > 0) {
          setDateRangeStates((prev) => ({ ...prev, ...updatedParentDates }));
          // ── KEY FIX: sync rolled-up dates back into `data` so that the
          // tasks-prop useEffect (which re-runs whenever a child update causes
          // the prop to change) does NOT overwrite the rollup with stale server
          // dates.  onUpdateTask here is just setData — no extra API call.
          for (const [pid, range] of Object.entries(updatedParentDates)) {
            onUpdateTask?.(Number(pid), {
              startDate: range?.from ? toLocalDateString(range.from) : null,
              dueDate: range?.to ? toLocalDateString(range.to) : null,
            });
          }
        }

        // ── Apply server-authoritative parentUpdates for ALL ancestor levels ──
        // The local rollup above is based on whichever tasks happen to be loaded
        // in childTasksMap.  If some ancestors were never expanded they won't be
        // in childTasksMap and the local rollup can't reach them.
        // The API response includes every level the backend updated, so we apply
        // them here as a final override — this guarantees every level is correct
        // regardless of which rows are currently expanded.
        const serverParentUpdates: Array<{ id: number; startDate: string | null; dueDate: string | null }> =
          updatedData?.parentUpdates ?? [];
        if (serverParentUpdates.length > 0) {
          const serverDateRanges: Record<number, DateRange | undefined> = {};
          for (const pu of serverParentUpdates) {
            serverDateRanges[pu.id] = {
              from: pu.startDate ? parseLocalDate(pu.startDate) : undefined,
              to: pu.dueDate ? parseLocalDate(pu.dueDate) : undefined,
            };
            // Push to page-level data so root-level tasks also reflect the change
            onUpdateTask?.(pu.id, { startDate: pu.startDate, dueDate: pu.dueDate });
          }
          setDateRangeStates((prev) => ({ ...prev, ...serverDateRanges }));
        }
      }

      // ── Status rollup: mirror backend rollupParentStatus logic ──────────
      if ('statusId' in updates) {
        const statuses: any[] = configDataRef.current?.statuses ?? [];

        // Walk up the chain, rolling up parent status at each level
        let currentId = taskId;
        let mapToWalk = newMap;

        while (true) {
          let parentId: number | null = null;
          let parentChildren: any[] | null = null;

          for (const [key, children] of Object.entries(mapToWalk)) {
            if (children.some((c) => c.id === currentId)) {
              parentId = Number(key);
              parentChildren = children;
              break;
            }
          }

          if (parentId === null || parentChildren === null) break;

          // Children with a known status base
          const childrenWithBase = parentChildren.filter((c) => {
            const s = statuses.find((st: any) => st.id === c.statusId);
            return s?.base != null;
          });

          if (childrenWithBase.length === 0) break;

          const hasProcessing = childrenWithBase.some((c) => {
            const s = statuses.find((st: any) => st.id === c.statusId);
            return s?.base === 'Processing';
          });
          const hasToStart = childrenWithBase.some((c) => {
            const s = statuses.find((st: any) => st.id === c.statusId);
            return s?.base === 'To Start';
          });
          const hasFinished = childrenWithBase.some((c) => {
            const s = statuses.find((st: any) => st.id === c.statusId);
            return s?.base === 'Finished';
          });
          const allFinished =
            childrenWithBase.length > 0 &&
            childrenWithBase.every((c) => {
              const s = statuses.find((st: any) => st.id === c.statusId);
              return s?.base === 'Finished';
            });

          let targetBase: string | null = null;
          if (hasProcessing || (hasFinished && !allFinished)) targetBase = 'Processing';
          else if (hasToStart) targetBase = 'To Start';
          else if (allFinished) targetBase = 'Finished';

          if (!targetBase) break;

          // Find the first matching status (by id ASC, same as backend)
          const matchingStatuses = statuses
            .filter((s: any) => s.base === targetBase)
            .sort((a: any, b: any) => a.id - b.id);
          const targetStatus = matchingStatuses[0] ?? null;

          if (!targetStatus) break;

          // Update the parent in newMap (if parent itself is a child somewhere)
          const newMapUpdated: Record<number, any[]> = {};
          let parentUpdatedInMap = false;
          for (const [key, children] of Object.entries(mapToWalk)) {
            newMapUpdated[Number(key)] = children.map((c) => {
              if (c.id === parentId) {
                parentUpdatedInMap = true;
                return { 
                  ...c, 
                  statusId: targetStatus.id,
                  statusName: targetStatus.name,
                  statusColor: targetStatus.color,
                  statusBase: targetStatus.base
                };
              }
              return c;
            });
          }
          if (parentUpdatedInMap) {
            mapToWalk = newMapUpdated;
            childTasksMapRef.current = newMapUpdated;
            setChildTasksMap(newMapUpdated);
          }

          // ── KEY: propagate to page-level `tasks` (root-level parents live here)
          onUpdateTask?.(parentId, { 
            statusId: targetStatus.id,
            statusName: targetStatus.name,
            statusColor: targetStatus.color,
            statusBase: targetStatus.base
          });

          currentId = parentId; // walk one level higher
        }
      }
    }

    await onUpdateTask?.(taskId, updates, updatedData);
  }, [onUpdateTask]);

  /** Toggle expand/collapse for a task row */
  const toggleExpand = useCallback(async (task: any) => {
    const taskId: number = task.id;
    if (expandedTaskIds.has(taskId)) {
      setExpandedTaskIds((prev) => { const s = new Set(prev); s.delete(taskId); return s; });
      delete expandedTasksMetaRef.current[taskId];
    } else {
      setExpandedTaskIds((prev) => new Set(prev).add(taskId));
      expandedTasksMetaRef.current[taskId] = {
        id: task.id,
        taskSpaceId: task.taskSpaceId,
        parentTaskId: task.parentTaskId ?? null,
      };
      if (!childTasksMapRef.current[taskId]) {
        await fetchChildTasksInline(task);
      }
    }
  }, [expandedTaskIds, fetchChildTasksInline]);

  /**
   * Delete wrapper that keeps all parent-level state in sync:
   * - removes the task from every childTasksMap bucket it appears in
   * - collapses any expanded state for the deleted task
   * - decrements the parent task's effective child count so the expand
   *   button / badge updates immediately without a full page refresh
   */
  const handleDeleteTask = useCallback((task: any) => {
    // Only open the confirmation dialog — do NOT remove from local state yet.
    // Removal happens in handleTaskDeleted, called after the API delete succeeds.
    onDelete?.(task);
  }, [onDelete]);

  /** Called by the page after the deletion API call succeeds. Cleans up local maps,
   *  recalculates parent dates, updates childrenHaveDates and childTaskCount so the
   *  parent row immediately shows an editable date picker and hides the expand icon
   *  when it has no more children. */
  const handleTaskDeleted = useCallback((taskId: number) => {
    const oldMap = childTasksMapRef.current;

    // ── Step 1: Find direct parent in childTasksMap ───────────────────────
    let directParentId: number | null = null;
    for (const [key, children] of Object.entries(oldMap)) {
      if (children.some((c) => c.id === taskId)) {
        directParentId = Number(key);
        break;
      }
    }

    // ── Step 2: Build updated map (remove deleted task) and walk ancestry ─
    // Copy the map so we can mutate safely.
    const workingMap: Record<number, any[]> = {};
    for (const [key, children] of Object.entries(oldMap)) {
      workingMap[Number(key)] = [...children];
    }
    if (directParentId !== null) {
      workingMap[directParentId] = workingMap[directParentId].filter((c) => c.id !== taskId);
    }

    // Walk up from the direct parent, rolling up dates and patching task objects
    // inside workingMap so that every level stays in sync.
    const dateRangeUpdates: Record<number, DateRange | undefined> = {};
    const taskObjectUpdates: Record<number, Record<string, any>> = {};
    const effectiveDates: Record<number, { startDate: string | null; dueDate: string | null }> = {};

    if (directParentId !== null) {
      let currentId: number = directParentId;

      while (true) {
        const siblings = workingMap[currentId] ?? [];

        // Compute rolled-up date range from remaining siblings
        const starts: Date[] = [];
        const ends: Date[] = [];
        for (const child of siblings) {
          const eff = effectiveDates[child.id];
          const sdStr = eff !== undefined ? eff.startDate : (child.startDate ?? null);
          const ddStr = eff !== undefined ? eff.dueDate : (child.dueDate ?? null);
          if (sdStr) starts.push(parseLocalDate(sdStr));
          if (ddStr) ends.push(parseLocalDate(ddStr));
        }

        const newRange: DateRange | undefined =
          starts.length > 0 || ends.length > 0
            ? {
              from: starts.length > 0
                ? new Date(Math.min(...starts.map((d) => d.getTime())))
                : undefined,
              to: ends.length > 0
                ? new Date(Math.max(...ends.map((d) => d.getTime())))
                : undefined,
            }
            : undefined;

        // Only update dates when remaining children still have dates.
        // If no children have dates, preserve the parent's own existing dates.
        if (newRange) {
          dateRangeUpdates[currentId] = newRange;
          effectiveDates[currentId] = {
            startDate: newRange.from ? toLocalDateString(newRange.from) : null,
            dueDate: newRange.to ? toLocalDateString(newRange.to) : null,
          };
        } else {
          // Find the parent task's current dates inside workingMap buckets
          let existingStartDate: string | null = null;
          let existingDueDate: string | null = null;
          for (const gChildren of Object.values(workingMap)) {
            const found = gChildren.find((c) => c.id === currentId);
            if (found) {
              existingStartDate = found.startDate ?? null;
              existingDueDate = found.dueDate ?? null;
              break;
            }
          }
          effectiveDates[currentId] = {
            startDate: existingStartDate,
            dueDate: existingDueDate,
          };
          // Do NOT add to dateRangeUpdates — keep current displayed dates unchanged
        }

        const taskUpdate: Record<string, any> = {
          childrenHaveDates: siblings.some((c: any) => c.startDate || c.dueDate),
          // For the direct parent, decrement childTaskCount so the expand icon
          // updates immediately (without a full page refresh or bulk-relations re-fetch).
          ...(currentId === directParentId ? { childTaskCount: siblings.length } : {}),
        };
        // Only include date fields in the update when they actually changed
        if (newRange) {
          taskUpdate.startDate = effectiveDates[currentId].startDate;
          taskUpdate.dueDate = effectiveDates[currentId].dueDate;
        }

        // Accumulate updates that need to be pushed back to the page-level tasks
        // array (top-level rows) so renderRows picks up the new childTaskCount without
        // requiring a refresh.
        taskObjectUpdates[currentId] = {
          ...(taskObjectUpdates[currentId] ?? {}),
          ...taskUpdate,
        };

        // Patch the currentId task inside its grandparent's bucket so nested
        // rows pick up the new childrenHaveDates / childTaskCount immediately.
        for (const [gKey, gChildren] of Object.entries(workingMap)) {
          if (gChildren.some((c) => c.id === currentId)) {
            workingMap[Number(gKey)] = gChildren.map((c) =>
              c.id === currentId ? { ...c, ...taskUpdate } : c,
            );
            break;
          }
        }

        // Walk one level higher (use oldMap structure — parent-child links don't change)
        let grandParentId: number | null = null;
        for (const [key, children] of Object.entries(oldMap)) {
          if (children.some((c) => c.id === currentId)) {
            grandParentId = Number(key);
            break;
          }
        }
        if (grandParentId === null) break;
        currentId = grandParentId;
      }
    }

    // ── Step 3: Commit all childTasksMap changes in one shot ──────────────
    childTasksMapRef.current = workingMap;
    setChildTasksMap(workingMap);

    // ── Step 3b: Status rollup after deletion ─────────────────────────────
    // Walk up from the direct parent all the way to the root, re-computing
    // the status at each ancestor level based on its remaining children.
    if (directParentId !== null) {
      const statuses: any[] = configDataRef.current?.statuses ?? [];
      if (statuses.length > 0) {
        let currentId: number = directParentId;
        let mapForStatus: Record<number, any[]> = workingMap; // deleted task already removed

        while (true) {
          const siblings = mapForStatus[currentId] ?? [];

          const childrenWithBase = siblings.filter((c: any) => {
            const s = statuses.find((st: any) => st.id === c.statusId);
            return s?.base != null;
          });
          if (childrenWithBase.length === 0) break;

          const hasProcessing = childrenWithBase.some((c: any) =>
            statuses.find((st: any) => st.id === c.statusId)?.base === 'Processing',
          );
          const hasToStart = childrenWithBase.some((c: any) =>
            statuses.find((st: any) => st.id === c.statusId)?.base === 'To Start',
          );
          const allFinished =
            childrenWithBase.length > 0 &&
            childrenWithBase.every((c: any) =>
              statuses.find((st: any) => st.id === c.statusId)?.base === 'Finished',
            );

          let targetBase: string | null = null;
          if (hasProcessing) targetBase = 'Processing';
          else if (hasToStart) targetBase = 'To Start';
          else if (allFinished) targetBase = 'Finished';
          if (!targetBase) break;

          const targetStatus = statuses
            .filter((s: any) => s.base === targetBase)
            .sort((a: any, b: any) => a.id - b.id)[0];
          if (!targetStatus) break;

          // Accumulate into taskObjectUpdates so step 7 pushes to page-level data
          taskObjectUpdates[currentId] = {
            ...(taskObjectUpdates[currentId] ?? {}),
            statusId: targetStatus.id,
            statusName: targetStatus.name,
            statusColor: targetStatus.color,
            statusBase: targetStatus.base,
          };

          // Walk one level higher: find currentId in its parent's bucket
          let gParentId: number | null = null;
          for (const [key, children] of Object.entries(mapForStatus)) {
            if ((children as any[]).some((c: any) => c.id === currentId)) {
              gParentId = Number(key);
              break;
            }
          }
          if (gParentId === null) break;

          // Propagate the updated status into the parent's children array
          // so the next iteration sees the correct status for currentId.
          mapForStatus = {
            ...mapForStatus,
            [gParentId]: (mapForStatus[gParentId] ?? []).map((c: any) =>
              c.id === currentId ? { 
                ...c, 
                statusId: targetStatus.id,
                statusName: targetStatus.name,
                statusColor: targetStatus.color,
                statusBase: targetStatus.base
              } : c,
            ),
          };
          currentId = gParentId;
        }

        // ── Commit status updates back into childTasksMap ──────────────────
        // mapForStatus diverges from workingMap once the first ancestor is
        // walked; we must write the final map back so every expanded ancestor
        // row shows its newly-rolled-up status badge immediately without a
        // page refresh.
        childTasksMapRef.current = mapForStatus;
        setChildTasksMap(mapForStatus);
      }
    }

    // ── Step 4: Apply date range updates ──────────────────────────────────
    if (Object.keys(dateRangeUpdates).length > 0) {
      setDateRangeStates((prev) => ({ ...prev, ...dateRangeUpdates }));
    }

    // ── Step 5: Remove from insertedAtTopMap ──────────────────────────────
    setInsertedAtTopMap((prev) => {
      let changed = false;
      const newMap: Record<string, any[]> = {};
      for (const [key, arr] of Object.entries(prev)) {
        const filtered = arr.filter((c: any) => c.id !== taskId);
        if (filtered.length !== arr.length) changed = true;
        newMap[key] = filtered;
      }
      return changed ? newMap : prev;
    });

    // ── Step 6: Collapse expand state for the deleted task ────────────────
    // Also collapse the direct parent if it now has no more children, so the
    // chevron disappears and no empty expanded section is left visible.
    const idsToCollapse = new Set<number>([taskId]);
    if (directParentId !== null) {
      const remainingCount = (workingMap[directParentId] ?? []).length;
      if (remainingCount === 0) idsToCollapse.add(directParentId);
    }
    setExpandedTaskIds((prev) => {
      const toRemove = [...idsToCollapse].filter((id) => prev.has(id));
      if (toRemove.length === 0) return prev;
      const s = new Set(prev);
      toRemove.forEach((id) => s.delete(id));
      return s;
    });
    idsToCollapse.forEach((id) => { delete expandedTasksMetaRef.current[id]; });

    // ── Step 7: Push parent updates to the page-level tasks data ──────────
    // This keeps card view, top-level tasks, and any other consumer in sync.
    for (const [pid, updates] of Object.entries(taskObjectUpdates)) {
      onUpdateTask?.(Number(pid), updates, updates);
    }
  }, [onUpdateTask]);

  // Notify parent with the handle so it can call notifyTaskDeleted after confirmed delete
  useEffect(() => {
    onHandleReady?.({ notifyTaskDeleted: handleTaskDeleted });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleTaskDeleted]);

  const handleRowClick = (task: any) => {
    onRowClick?.(task);
    const formUrl = meetingId
      ? `/task-management/task/form?id=${task.id}&meetingId=${meetingId}`
      : `/task-management/task/form?id=${task.id}`;
    router.push(formUrl);
  };

  const isAnyRootExpanded = tasks.some((t: any) => expandedTaskIds.has(t.id));

  // ── Recursive row renderer ────────────────────────────────────────────────
  const renderRows = (taskList: any[], depth: number, rootTaskId?: number): React.ReactNode[] => {
    return taskList.map((task: any) => {
      // For depth-0 tasks, they are the root. For deeper, inherit passed rootTaskId.
      const effectiveRootTaskId: number | undefined = depth === 0 ? task.id : rootTaskId;
      // ── Resolve config-driven fields ──────────────────────────────
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
        (configData?.resources?.find((r) => r.id === task.assigneeId) ?? task.assignee ?? fallbackAssignee);
      const coAssignees: any[] = task.coAssignees ?? [];
      const progress: number = task.progressPercentage ?? 0;
      const rawChildTaskCount: number | null =
        task.childTasks?.length != null
          ? (task.childTasks.length as number)
          : task.childTaskCount != null
            ? (task.childTaskCount as number)
            : null; // null = bulk-relations not yet loaded (unknown)

      // Warning avatars when child task has no root members defined
      const taskSequence = task.hierarchyLevelSequence ??
        configData?.hierarchyLevels?.find((h: any) => h.id === task.hierarchyLevelConfigId)?.sequence ?? 0;
      const isChildRow = !!task.parentTaskId && taskSequence > 0;

      // ── Determine root task members for assignee/co-assignee restriction ──────
      // Priority 1: drilled-down view — page sets configData.rootTaskMembers
      // Priority 2: inline expansion — look up the root task in the tasks prop;
      //             its .members field is populated by getBulkTaskRelations Phase 2.
      // Priority 3: root task row itself — use task.members directly.
      // undefined  → still loading / not applicable (no warning shown)
      // []         → root task has no members defined (block assignee pickers)
      // [...]      → restrict pickers to these members only
      const rootMembers: any[] | undefined =
        configData?.rootTaskMembers !== undefined && configData?.rootTaskMembers !== null
          ? configData.rootTaskMembers                                             // drilled view
          : isChildRow
            ? rootTasksRef.current.find((t: any) => t.id === effectiveRootTaskId)?.members // inline expand
            : Array.isArray(task.members) ? task.members : undefined;             // root task itself

      // Members lists (task.members / rootTaskMembers) don't carry a `skills` array —
      // only configData.resources does. Enrich restricted member lists with skills
      // looked up by resource id so the skill picker/prompt still works when a
      // task's assignee list is member-restricted rather than the full resource list.
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
      // Deduplicate by ID
      const effectiveResources: any[] = Array.from(new Map(combinedResources.map(r => [r.id, r])).values());

      const effectiveTaskMembers: any[] = Array.isArray(rootMembers) && rootMembers.length > 0
        ? enrichWithSkills(rootMembers)
        : [];
      const rootTaskCode: string | undefined = effectiveRootTaskId != null ? rootTaskCodeMap[effectiveRootTaskId] : undefined;
      const childTaskCount: number = rawChildTaskCount !== null ? Math.max(0, rawChildTaskCount) : 0;

      // ── Hierarchy level icon / color ──────────────────────────────
      // Prefer denormalized flat fields (always explicitly saved & correct) over
      // the eagerly-loaded hierarchyLevelConfig relation (which can carry stale
      // data when the configId is mismatched, e.g. right after createTask).
      const resolvedHL =
        ((task.hierarchyLevelIcon || task.hierarchyLevelColor || task.hierarchyLevelName)
          ? { icon: task.hierarchyLevelIcon, color: task.hierarchyLevelColor, name: task.hierarchyLevelName, sequence: task.hierarchyLevelSequence }
          : null) ??
        configData?.hierarchyLevels?.find((h) => h.id === task.hierarchyLevelConfigId) ??
        task.hierarchyLevelConfig ??
        null;
      const HierarchyIcon = resolvedHL?.icon ? getHierarchyLevelIcon(resolvedHL.icon) : Folder;
      const hlColor: string = resolvedHL?.color ?? '#6B7280';

      // ── Dates ─────────────────────────────────────────────────────
      const dateRange = dateRangeStates[task.id];
      const liveChildren: any[] = childTasksMap[task.id] ?? [];
      const childrenHaveDates: boolean =
        task.childrenHaveDates === true ||
        (Array.isArray(task.childTasks) && task.childTasks.some((c: any) => c.startDate || c.dueDate)) ||
        liveChildren.some((c: any) => c.startDate || c.dueDate);
      const isStatusComplete = status?.base === 'Finished';
      const isOverdue = dateRange?.to && dateRange.to < new Date() && progress < 100 && !isStatusComplete;

      // ── Child-task drill-down visibility ──────────────────────────
      const sortedLevels = [...(configData?.hierarchyLevels ?? [])].sort((a: any, b: any) => a.sequence - b.sequence);
      const rootLevelName = sortedLevels[0]?.name || 'Task';
      const actionItemName = isChildRow ? (resolvedHL?.name || 'Task') : (rootLevelName || resolvedHL?.name || 'Task');
      const currentSeq: number = resolvedHL?.sequence ?? task.hierarchyLevelSequence ?? -1;
      const nextLevel = sortedLevels.find((l: any) => l.sequence > currentSeq) ?? null;
      const hierarchyKnown = !!configData?.hierarchyLevels?.length;
      const isFinalLevel =
        task.nextLevelName === null ||
        (task.nextLevelName === undefined && hierarchyKnown && nextLevel === null);

      // ── Inline expand state ────────────────────────────────────────
      // Hide expand when filters are active — the result set is already flattened across all levels.
      const isCreatingChild = creatorState?.levelKey === String(task.id);
      const hasLocalChildren =
        (insertedAtTopMap[String(task.id)] ?? []).length > 0 ||
        (childTasksMap[task.id]?.length ?? 0) > 0;
      // Show expand icon unless childTaskCount is **confirmed 0** (null = still loading = show).
      const canExpand = !filtersActive && !isFinalLevel &&
        (rawChildTaskCount === null || childTaskCount > 0 || isCreatingChild || hasLocalChildren);
      const isExpanded = expandedTaskIds.has(task.id);
      // Only spin while the expand fetch itself is in-flight; never block on isRelationsLoading.
      const isExpandLoading = expandLoadingSet.has(task.id);

      // Exclude tasks already displayed via insertedAfterMap (they are also
      // added to childTasksMap for rollup, but must only render once).
      const inlineChildren = liveChildren.filter((c: any) => !insertedTaskIds.has(c.id));

      // Opaque bg for sticky left/right cells — bg-primary/15 is transparent and bleeds on scroll.
      // Use color-mix() CSS variables that pre-blend primary into the base background (fully opaque).
      const isSpecial = specialStates[task.id];
      const isExpandedBg = depth === 0 && isAnyRootExpanded && !isSpecial;

      const stickyBg = isSpecial
        ? 'bg-[var(--special-sticky-bg)] group-hover:bg-[var(--special-sticky-bg-hover)]'
        : isExpandedBg
          ? 'bg-gray-100 dark:bg-zinc-900 group-hover:bg-gray-200 dark:group-hover:bg-zinc-800'
          : 'bg-background group-hover:bg-gray-50 dark:group-hover:bg-zinc-900';
      // No divider shadow on special rows — they have their own row highlight color
      const stickyDivL = isSpecial ? '' : 'shadow-[1px_0_0_0_theme(colors.gray.200)] dark:shadow-[1px_0_0_0_theme(colors.gray.700)]';
      const stickyDivR = isSpecial ? '' : 'shadow-[-1px_0_0_0_theme(colors.gray.200)] dark:shadow-[-1px_0_0_0_theme(colors.gray.700)]';

      return (
        <React.Fragment key={`${depth}-${task.id}`}>
          <tr
            className={cn(
              'transition-colors group border-b border-gray-200 dark:border-gray-700',
              isExpandedBg && 'bg-gray-100 dark:bg-zinc-900 hover:bg-gray-200 dark:hover:bg-zinc-800',
              specialStates[task.id]
                ? 'bg-primary/15 dark:bg-primary/25 border-primary/40'
                : depth === 0 && !isExpandedBg ? 'hover:bg-gray-50 dark:hover:bg-zinc-900' : 'hover:bg-gray-100/80 dark:hover:bg-zinc-800/60',
            )}
          >
            {/* ── Code + Title (merged) ─────────────────────────────── */}<td className={`pl-1 pr-2 py-2 align-middle sticky left-0 z-10 ${stickyBg} ${stickyDivL}`}>
              <div className="flex items-center gap-1 min-w-0" style={{ paddingLeft: `${depth * 10}px` }}>
                {/* Expand / collapse toggle */}
                {canExpand ? (
                  <button
                    className="flex items-center justify-center h-5 w-5 flex-shrink-0 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={(e) => { e.stopPropagation(); toggleExpand(task); }}
                    title={isExpanded ? 'Collapse child tasks' : `Expand ${childTaskCount} child task(s)`}
                  >
                    {isExpandLoading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-600 dark:text-gray-400" />
                      : isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                        : <ChevronRight className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                    }
                  </button>
                ) : (
                  <span className="flex-shrink-0 w-5 h-5" />
                )}

                {/* Hierarchy icon */}
                {/* {configData ? (
                  <InlineEditableTaskHierarchyLevel
                    hierarchyLevel={resolvedHL}
                    hierarchyLevels={configData.hierarchyLevels ?? []}
                    taskId={task.id}
                    readonly={!onUpdateTask}
                    onUpdate={async (levelId) => {
                      const updated = await patchTaskHierarchyLevel(task.id, levelId);
                      const newLevel = configData.hierarchyLevels.find((l: any) => l.id === levelId);
                      await handleInlineUpdate(task.id, {
                        hierarchyLevelConfigId: levelId,
                        hierarchyLevelName: newLevel?.name,
                        hierarchyLevelIcon: newLevel?.icon,
                        hierarchyLevelColor: newLevel?.color,
                        hierarchyLevelSequence: newLevel?.sequence
                      }, updated);
                    }}
                  />
                ) : ( */}
                  <button
                    className="flex items-center rounded px-0.5 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0 cursor-default"
                    onClick={(e) => e.stopPropagation()}
                    title={resolvedHL?.name ?? 'No level'}
                  >
                    <HierarchyIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: hlColor }} />
                  </button>
                {/* )} */}

                {/* Code */}
                <span className="text-xs font-semibold tracking-wide flex-shrink-0 cursor-pointer hover:underline text-blue-500 dark:text-blue-400"
                  title={'View details'}
                  onClick={(e) => { e.stopPropagation(); handleRowClick(task); }}>
                  {task.code}
                </span>

                {/* Title — takes all remaining space */}
                <div className="flex-1 min-w-0 mx-1 ml-2">
                  {configData ? (
                    <InlineEditableTaskName
                      name={task.name}
                      onUpdate={async (name) => {
                        const updated = await patchTaskName(task.id, name, task.name);
                        onUpdateTask?.(task.id, { name }, updated);
                      }}
                      className="text-sm text-gray-900 dark:text-gray-100 truncate block w-full"
                    />
                  ) : (
                    <span className="text-sm text-gray-900 dark:text-gray-100 truncate block">{task.name}</span>
                  )}
                </div>

                {/* Open in new tab — collapsed by default so the title gets the space; expands on row hover */}
                <a
                  href={meetingId
                    ? `/task-management/task/form?id=${task.id}&meetingId=${meetingId}`
                    : `/task-management/task/form?id=${task.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-shrink-0 hover:opacity-75 transition-all opacity-0 w-0 overflow-hidden group-hover:opacity-100 group-hover:w-3"
                  style={{ color: '#3B82F6' }}
                  title="Open in new tab"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>

                {/* Share via Outlook */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const link = `${window.location.origin}/task-management/task/form?id=${task.id}`;
                    const subject = encodeURIComponent(`Task: ${task.name}${task.code ? ` [${task.code}]` : ''}`);
                    const body = encodeURIComponent(`Hi,\n\nPlease find the task details at the link below:\n\n${link}\n\nRegards`);
                    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                  }}
                  className="flex-shrink-0 hover:opacity-75 transition-all opacity-0 w-0 cursor-pointer overflow-hidden group-hover:opacity-100 group-hover:w-3 group-hover:ml-1"
                  style={{ color: '#3B82F6' }}
                  title="Share via email"
                >
                  <Share2 className="w-3 h-3" />
                </button>

                {/* Add CHILD task — hidden at final hierarchy level; collapsed by default, expands on row hover */}
                {configData && onUpdateTask && (
                  !isFinalLevel ? (
                    <button
                      className="flex-shrink-0 hover:opacity-75 transition-all opacity-0 w-0 cursor-pointer overflow-hidden group-hover:opacity-100 group-hover:w-3.5 group-hover:ml-1"
                      style={{ color: '#3B82F6' }}
                      title={`Add a ${nextLevel?.name ? ` ${nextLevel.name}` : 'child'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const levelKey = String(task.id);
                        // Synthetic sibling that represents a direct child of this task
                        const childSiblingTask = {
                          ...task,
                          parentTaskId: task.id,
                          parentTask: task,
                          hierarchyLevelConfigId: nextLevel?.id ?? task.hierarchyLevelConfigId,
                          hierarchyLevelName: nextLevel?.name ?? task.hierarchyLevelName,
                          hierarchyLevelIcon: nextLevel?.icon ?? task.hierarchyLevelIcon,
                          hierarchyLevelColor: nextLevel?.color ?? task.hierarchyLevelColor,
                          hierarchyLevelSequence: nextLevel?.sequence ?? task.hierarchyLevelSequence,
                          hierarchyLevelConfig: nextLevel ?? task.hierarchyLevelConfig,
                        };
                        // Auto-expand so the creator row (inside the expanded section) is visible.
                        // Expand directly — no child fetch — so the creator row appears instantly.
                        if (!isExpanded) {
                          setExpandedTaskIds((prev) => new Set(prev).add(task.id));
                          expandedTasksMetaRef.current[task.id] = {
                            id: task.id,
                            taskSpaceId: task.taskSpaceId ?? task.taskSpace?.id,
                            parentTaskId: task.parentTaskId ?? null,
                          };
                        }
                        setCreatorState((prev) =>
                          prev?.levelKey === levelKey ? null : { siblingTask: childSiblingTask, levelKey },
                        );
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="w-3.5 h-3.5 flex-shrink-0" />
                  )
                )}

                {/* Info / description popup — always visible */}
                <HoverCard openDelay={150}>
                  <HoverCardTrigger asChild>
                    <button
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-96 max-h-96 overflow-y-auto" side="right" align="start" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">Title</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{task.name}</p>
                      </div>
                      {task.description && (
                        <div>
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">Description</p>
                          <div className="text-xs text-gray-600 dark:text-gray-400 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: task.description }} />
                        </div>
                      )}
                      <hr className="border-border" />
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">Hierarchy</p>
                        <ParentHierarchyView id={task.id} postType="Task" code={task.code || `Task-${task.id}`} size="xs" />
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </td>

            {/* ── Status ────────────────────────────────────────────── */}
            <td className="px-4 py-2 align-middle">
              {configData ? (
                <InlineEditableTaskStatus
                  status={status}
                  statuses={configData.statuses}
                  taskId={task.id}
                  readonly={!onUpdateTask}
                  onUpdate={async (statusId) => {
                    const updated = await patchTaskStatus(task.id, statusId, task.status?.id ?? null, task.parentTaskId ?? null);
                    onUpdateTask?.(task.id, { statusId }, updated);
                    const newStatus = configData.statuses.find((s: any) => s.id === statusId);
                    const progress = progressForBase(newStatus?.base);
                    const currentProgress = task.progressPercentage ?? 0;
                    if (progress !== null && currentProgress !== progress) {
                      patchTaskProgress(task.id, progress).catch(() => { });
                      handleInlineUpdate(task.id, { statusId, progressPercentage: progress }, { ...updated, progressPercentage: progress });
                    } else {
                      handleInlineUpdate(task.id, { statusId }, updated);
                    }
                  }}
                />
              ) : status ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border rounded-md text-xs font-medium" style={{ borderColor: status.color, color: status.color }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                  {status.name}
                </span>
              ) : <span className="text-xs text-gray-400 italic">—</span>}
            </td>

            {/* ── Severity ──────────────────────────────────────────── */}
            <td className="px-4 py-2 align-middle">
              {configData ? (
                <InlineEditableTaskSeverity
                  severity={severity}
                  severities={configData.severities}
                  taskId={task.id}
                  readonly={!onUpdateTask}
                  onUpdate={async (severityId) => {
                    const updated = await patchTaskSeverity(task.id, severityId, task.severity?.id ?? null);
                    handleInlineUpdate(task.id, { severityId }, updated); // fire-and-forget
                  }}
                />
              ) : severity ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border rounded-md text-xs font-medium" style={{ borderColor: severity.color, color: severity.color }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: severity.color }} />
                  {severity.name}
                </span>
              ) : <span className="text-xs text-gray-400 italic">—</span>}
            </td>

            {/* ── Assignee ──────────────────────────────────────────── */}
            <td className="px-4 py-2 align-middle">
              <div className="flex items-center">
                {configData ? (
                  <InlineEditableTaskAssignee
                    assignee={assignee}
                    assigneeSkill={task.assigneeSkill}
                    resources={effectiveResources}
                    taskMembers={configData?.resources}
                    taskId={task.id}
                    readonly={!onUpdateTask}
                    onUpdate={async (assigneeId, assigneeSkill) => {
                      const updated = await patchTaskAssignee(task.id, assigneeId, assignee?.id ?? null, undefined, assigneeSkill);
                      handleInlineUpdate(task.id, { assigneeId, assigneeSkill: assigneeSkill ?? null }, updated); // fire-and-forget
                    }}
                  />
                ) : assignee ? (
                  <Avatar className="w-6 h-6 text-xs">
                    {(() => {
                      const pic = assignee.profile_pic || assignee.profilePic || assignee.userProfilePicture;
                      const validPic = pic && pic !== 'null' ? pic : null;
                      return validPic ? (
                        <AvatarImage src={validPic} alt={`${assignee.first_name || assignee.firstName || assignee.userFirstName} ${assignee.last_name || assignee.lastName || assignee.userLastName}`} className="object-cover" />
                      ) : null;
                    })()}
                    <AvatarFallback>
                      {(() => {
                        const fName = (assignee.first_name || assignee.firstName || assignee.userFirstName || '').trim();
                        const lName = (assignee.last_name || assignee.lastName || assignee.userLastName || '').trim();
                        if (fName && lName) return (fName[0] + lName[0]).toUpperCase();
                        if (fName) return fName.substring(0, 2).toUpperCase();
                        if (lName) return lName.substring(0, 2).toUpperCase();
                        return '?';
                      })()}
                    </AvatarFallback>
                  </Avatar>
                ) : <span className="text-xs text-gray-400 italic">—</span>}
              </div>
            </td>

            {/* ── Co-Assignees ──────────────────────────────────────── */}
            <td className="px-4 py-2 align-middle">
              <div className="flex items-center">
                {configData ? (
                  <InlineEditableTaskCoAssignees
                    coAssignees={coAssignees}
                    resources={effectiveResources}
                    taskMembers={configData?.resources}
                    taskId={task.id}
                    readonly={!onUpdateTask}
                    externalLoading={isRelationsLoading && task.coAssignees === undefined}
                    onUpdate={async (coAssigneeIds) => {
                      const updated = await patchTaskCoAssignees(task.id, coAssigneeIds);
                      handleInlineUpdate(task.id, { coAssigneeIds }, updated); // fire-and-forget
                    }}
                  />
                ) : isRelationsLoading && task.coAssignees === undefined ? (
                  <AvatarGroup>
                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                  </AvatarGroup>
                ) : coAssignees.length > 0 ? (
                  <AvatarGroup>
                    {coAssignees.slice(0, 1).map((ca: any) => (
                      <div key={ca.id} className="relative rounded-full overflow-hidden">
                        <Avatar className="w-6 h-6 text-xs">
                          {(ca.profile_pic || ca.profilePic) && <AvatarImage src={ca.profile_pic || ca.profilePic} alt={`${ca.first_name || ca.firstName} ${ca.last_name || ca.lastName}`} className="object-cover" />}
                          <AvatarFallback>
                            {(() => {
                              const fName = (ca.first_name || ca.firstName || '').trim();
                              const lName = (ca.last_name || ca.lastName || '').trim();
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
                ) : <span className="text-xs text-gray-400 italic">—</span>}
              </div>
            </td>

            {/* ── Start Date ────────────────────────────────────────── */}
            <td className="px-4 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
              {childrenHaveDates ? (
                /* Locked (rolled-up from children) — always HoverCard on hover */
                (() => {
                  const lockedDateLabel = dateRange?.from ? format(dateRange.from, 'LLL dd') : <span className="text-gray-400">—</span>;
                  return (
                    <HoverCard openDelay={150}>
                      <HoverCardTrigger asChild>
                        <span
                          onClick={(e) => e.stopPropagation()}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border cursor-default select-none whitespace-nowrap bg-white dark:bg-transparent border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300`}
                        >
                          <Lock className="w-3 h-3 shrink-0" />
                          {lockedDateLabel}
                        </span>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-72 p-3" side="right" align="start" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start gap-2.5">
                          <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-gray-400`}>
                            <Lock className={`w-3.5 h-3.5 text-white dark:text-gray-900`} strokeWidth={2.5} />
                          </div>
                          <div className="min-w-0 flex flex-col gap-1 w-full">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Dates rolled up from children</p>
                            {(dateRange?.from || dateRange?.to) && (
                              <div className={`flex items-center gap-1.5 text-xs font-medium rounded-md border px-2 py-1 text-gray-700 dark:text-gray-300 w-fit`}>
                                <CalendarDays className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                                {dateRange?.from && format(dateRange.from, 'LLL dd, y')}
                                {dateRange?.from && dateRange?.to && ' – '}
                                {dateRange?.to && format(dateRange.to, 'LLL dd, y')}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">Update children to adjust dates.</p>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })()
              ) : configData && onUpdateTask ? (
                /* Editable — click opens calendar */
                <div onClick={(e) => e.stopPropagation()}>
                  <Popover
                    open={datePickerOpenTaskId === `${task.id}-start`}
                    onOpenChange={async (open) => {
                      if (!open && datePickerOpenTaskId === `${task.id}-start`) {
                        const hasTouched = Object.prototype.hasOwnProperty.call(dateRangeStates, task.id);
                        const dr = dateRangeStates[task.id];
                        const startDateStr = hasTouched ? (dr?.from ? toLocalDateString(dr.from) : null) : (task.startDate ?? null);
                        const dueDateStr = hasTouched ? (dr?.to ? toLocalDateString(dr.to) : null) : (task.dueDate ?? null);
                        if (startDateStr !== (task.startDate ?? null) || dueDateStr !== (task.dueDate ?? null)) {
                          const updated = await patchTaskDates(task.id, startDateStr, dueDateStr, task.startDate ?? null, task.dueDate ?? null, task.parentTaskId ?? null);
                          await handleInlineUpdate(task.id, { startDate: startDateStr, dueDate: dueDateStr }, updated);
                        }
                      }
                      setDatePickerOpenTaskId(open ? `${task.id}-start` : null);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        title="Click to change start date"
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border ${!dateRange?.from ? 'border-dashed' : ''} rounded-md text-xs font-medium whitespace-nowrap hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300`}
                      >
                        <CalendarDays className="w-3 h-3 shrink-0" />
                        {dateRange?.from ? format(dateRange.from, 'LLL dd') : <span className="text-gray-400">Add date</span>}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-800" align="start" onClick={(e) => e.stopPropagation()}
                      onMouseLeave={async () => {
                        if (datePickerOpenTaskId === `${task.id}-start`) {
                          const hasTouched = Object.prototype.hasOwnProperty.call(dateRangeStates, task.id);
                          const dr = dateRangeStates[task.id];
                          const startDateStr = hasTouched ? (dr?.from ? toLocalDateString(dr.from) : null) : (task.startDate ?? null);
                          const dueDateStr = hasTouched ? (dr?.to ? toLocalDateString(dr.to) : null) : (task.dueDate ?? null);
                          setDatePickerOpenTaskId(null);
                          if (startDateStr !== (task.startDate ?? null) || dueDateStr !== (task.dueDate ?? null)) {
                            const updated = await patchTaskDates(task.id, startDateStr, dueDateStr, task.startDate ?? null, task.dueDate ?? null, task.parentTaskId ?? null);
                            await handleInlineUpdate(task.id, { startDate: startDateStr, dueDate: dueDateStr }, updated);
                          }
                        }
                      }}
                    >
                      <Calendar
                        mode="range"
                        defaultMonth={dateRange?.from ?? dateRange?.to}
                        selected={dateRange}
                        onSelect={(range) => setDateRangeStates((prev) => ({ ...prev, [task.id]: range }))}
                        numberOfMonths={2}
                      />
                      {(dateRange?.from || dateRange?.to) && (
                        <div className="border-t px-3 py-2">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setDateRangeStates((prev) => ({ ...prev, [task.id]: undefined }));
                              setDatePickerOpenTaskId(null);
                              const updated = await patchTaskDates(task.id, null, null, task.startDate ?? null, task.dueDate ?? null, task.parentTaskId ?? null);
                              await handleInlineUpdate(task.id, { startDate: null, dueDate: null }, updated);
                            }}
                            className="w-full text-xs text-red-500 hover:text-red-700 transition-colors text-center py-0.5"
                          >
                            Clear all dates
                          </button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                dateRange?.from ? (
                  <span className={`inline-flex items-center gap-1 text-xs font-medium text-muted-foreground`}>
                    <CalendarDays className="w-3 h-3" />
                    {format(dateRange.from, 'LLL dd')}
                  </span>
                ) : <span className="text-xs text-gray-400 italic">—</span>
              )}
            </td>

            {/* ── Due Date ──────────────────────────────────────────── */}
            <td className="px-4 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
              {childrenHaveDates ? (
                /* Locked (rolled-up from children) — always HoverCard on hover */
                (() => {
                  const lockedDateLabel = dateRange?.to ? format(dateRange.to, 'LLL dd') : <span className="text-gray-400">—</span>;
                  return (
                    <HoverCard openDelay={150}>
                      <HoverCardTrigger asChild>
                        <span
                          onClick={(e) => e.stopPropagation()}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border cursor-default select-none whitespace-nowrap bg-white dark:bg-transparent ${isOverdue ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} text-gray-700 dark:text-gray-300`}
                        >
                          {isOverdue ? <AlertTriangle className="w-3 h-3 shrink-0 text-red-500" strokeWidth={2.5} /> : <Lock className="w-3 h-3 shrink-0" strokeWidth={2.5} />}
                          {lockedDateLabel}
                        </span>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-72 p-3" side="right" align="start" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start gap-2.5">
                          <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-destructive ${isOverdue ? 'bg-red-400' : 'bg-gray-400'}`}>
                            {isOverdue ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-white dark:text-gray-900" strokeWidth={2.5} />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-white dark:text-gray-900" strokeWidth={2.5} />
                            )}
                          </div>
                          <div className="min-w-0 flex flex-col gap-1 w-full">
                            {isOverdue ? (
                              <>
                                <p className="text-sm font-semibold text-destructive">Overdue task</p>
                                <p className="text-xs font-medium text-gray-800 dark:text-gray-200">Dates rolled up from children</p>
                              </>
                            ) : (
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Dates rolled up from children</p>
                            )}
                            {(dateRange?.from || dateRange?.to) && (
                              <div className={`flex items-center gap-1.5 text-xs font-medium rounded-md border px-2 py-1 text-gray-700 dark:text-gray-300 w-fit`}>
                                <CalendarDays className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                                {dateRange?.from && format(dateRange.from, 'LLL dd, y')}
                                {dateRange?.from && dateRange?.to && ' – '}
                                {dateRange?.to && format(dateRange.to, 'LLL dd, y')}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">Update children to adjust dates.</p>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })()
              ) : configData && onUpdateTask ? (
                /* Editable — click opens calendar */
                <div onClick={(e) => e.stopPropagation()}>
                  <Popover
                    open={datePickerOpenTaskId === `${task.id}-due`}
                    onOpenChange={async (open) => {
                      if (!open && datePickerOpenTaskId === `${task.id}-due`) {
                        const hasTouched = Object.prototype.hasOwnProperty.call(dateRangeStates, task.id);
                        const dr = dateRangeStates[task.id];
                        const startDateStr = hasTouched ? (dr?.from ? toLocalDateString(dr.from) : null) : (task.startDate ?? null);
                        const dueDateStr = hasTouched ? (dr?.to ? toLocalDateString(dr.to) : null) : (task.dueDate ?? null);
                        if (startDateStr !== (task.startDate ?? null) || dueDateStr !== (task.dueDate ?? null)) {
                          const updated = await patchTaskDates(task.id, startDateStr, dueDateStr, task.startDate ?? null, task.dueDate ?? null, task.parentTaskId ?? null);
                          await handleInlineUpdate(task.id, { startDate: startDateStr, dueDate: dueDateStr }, updated);
                        }
                      }
                      setDatePickerOpenTaskId(open ? `${task.id}-due` : null);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        title={isOverdue ? 'Task is overdue - Click to change dates.' : 'Click to change due date'}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border ${!dateRange?.to ? 'border-dashed' : ''} rounded-md text-xs font-medium whitespace-nowrap hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${isOverdue ? 'border-red-500 text-gray-700 dark:text-gray-300' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                      >
                        {isOverdue ? <AlertTriangle className="w-3 h-3 shrink-0 text-red-500" /> : <CalendarDays className="w-3 h-3 shrink-0" />}
                        {dateRange?.to ? format(dateRange.to, 'LLL dd') : <span className="text-gray-400">Add date</span>}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-800" align="start" onClick={(e) => e.stopPropagation()}
                      onMouseLeave={async () => {
                        if (datePickerOpenTaskId === `${task.id}-due`) {
                          const hasTouched = Object.prototype.hasOwnProperty.call(dateRangeStates, task.id);
                          const dr = dateRangeStates[task.id];
                          const startDateStr = hasTouched ? (dr?.from ? toLocalDateString(dr.from) : null) : (task.startDate ?? null);
                          const dueDateStr = hasTouched ? (dr?.to ? toLocalDateString(dr.to) : null) : (task.dueDate ?? null);
                          setDatePickerOpenTaskId(null);
                          if (startDateStr !== (task.startDate ?? null) || dueDateStr !== (task.dueDate ?? null)) {
                            const updated = await patchTaskDates(task.id, startDateStr, dueDateStr, task.startDate ?? null, task.dueDate ?? null, task.parentTaskId ?? null);
                            await handleInlineUpdate(task.id, { startDate: startDateStr, dueDate: dueDateStr }, updated);
                          }
                        }
                      }}
                    >
                      <Calendar
                        mode="range"
                        defaultMonth={dateRange?.from ?? dateRange?.to}
                        selected={dateRange}
                        onSelect={(range) => setDateRangeStates((prev) => ({ ...prev, [task.id]: range }))}
                        numberOfMonths={2}
                      />
                      {(dateRange?.from || dateRange?.to) && (
                        <div className="border-t px-3 py-2">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setDateRangeStates((prev) => ({ ...prev, [task.id]: undefined }));
                              setDatePickerOpenTaskId(null);
                              const updated = await patchTaskDates(task.id, null, null, task.startDate ?? null, task.dueDate ?? null, task.parentTaskId ?? null);
                              await handleInlineUpdate(task.id, { startDate: null, dueDate: null }, updated);
                            }}
                            className="w-full text-xs text-red-500 hover:text-red-700 transition-colors text-center py-0.5"
                          >
                            Clear all dates
                          </button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                dateRange?.to ? (
                  <span className={`inline-flex items-center gap-1 text-xs font-medium text-muted-foreground`}>
                    <CalendarDays className="w-3 h-3" />
                    {format(dateRange.to, 'LLL dd')}
                  </span>
                ) : <span className="text-xs text-gray-400 italic">—</span>
              )}
            </td>

            {/* ── Labels ────────────────────────────────────────────── */}
            <td className="px-4 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
              {isRelationsLoading && task.labels === undefined ? (
                <div className="w-20 h-5 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse" />
              ) : (() => {
                const taskLabels: any[] = labelStates[task.id] ?? [];
                const search = labelSearches[task.id] ?? '';

                const applyLabels = async (newLabels: any[]) => {
                  const prevLabels = labelStates[task.id] ?? [];
                  setLabelStates((prev) => ({ ...prev, [task.id]: newLabels }));
                  try {
                    const updated = await patchTaskLabels(task.id, newLabels.map((l) => l.id));
                    await handleInlineUpdate(task.id, { labels: newLabels }, updated);
                  } catch {
                    setLabelStates((prev) => ({ ...prev, [task.id]: prevLabels }));
                  }
                };

                const openLabelPicker = async () => {
                  setOpenLabelPickerTaskId(task.id);
                  setLabelSearches((prev) => ({ ...prev, [task.id]: '' }));
                  if (task.taskSpaceId) {
                    setLoadingLabelsForTaskId(task.id);
                    try {
                      const fetched = await getLabelsByTaskSpace(task.taskSpaceId);
                      setLocalLabels(fetched ?? []);
                    } catch { /* keep existing */ } finally {
                      setLoadingLabelsForTaskId(null);
                    }
                  }
                };

                return (
                  <TaskLabelDropdown
                    mode="table"
                    appliedLabels={taskLabels}
                    availableLabels={localLabels}
                    open={openLabelPickerTaskId === task.id}
                    onOpenChange={async (open) => {
                      if (open) await openLabelPicker();
                      else setOpenLabelPickerTaskId(null);
                    }}
                    search={search}
                    onSearchChange={(val) => setLabelSearches((prev) => ({ ...prev, [task.id]: val }))}
                    isLoading={loadingLabelsForTaskId === task.id}
                    isCreating={creatingLabelForTaskId === task.id}
                    onAdd={(label) => applyLabels([...taskLabels, label])}
                    onRemove={(labelId) => applyLabels(taskLabels.filter((l) => l.id !== labelId))}
                    onCreate={async (name) => {
                      const taskSpaceId = task.taskSpaceId;
                      if (!taskSpaceId) return;
                      setCreatingLabelForTaskId(task.id);
                      try {
                        const created = await createTmTaskLabel({ name, taskSpaceId });
                        setLocalLabels((prev) => [...prev, created]);
                        await applyLabels([...taskLabels, created]);
                      } catch { /* silently fail */ } finally {
                        setCreatingLabelForTaskId(null);
                      }
                    }}
                    onMouseLeaveContent={() => setOpenLabelPickerTaskId(null)}
                    align="start"
                    side="bottom"
                  />
                );
              })()}
            </td>

            {/* ── Actions ───────────────────────────────────────────── */}
            <td className={`px-2 py-2 align-middle sticky right-0 z-10 ${stickyBg} ${stickyDivR}`}>
              <div className="flex items-center justify-end gap-0.5">

                {/* Link Action */}
                {meetingId && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 gap-1.5 text-xs font-medium text-foreground hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await setMeetingActionState(Number(meetingId), { state: 'linked_to_task', taskId: task.id });
                              toast.success("Meeting linked");
                              router.push('/pulse');
                            } catch (err: any) {
                              toast.error(err?.response?.data?.message ?? "Failed to link meeting");
                            }
                          }}
                        >
                          <Link className="h-3.5 w-3.5 text-primary" />
                          Link
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {meetingName ? (
                          <span>Link <span className="text-primary font-medium">{meetingName}</span> to <span className="font-semibold">{task.code}</span></span>
                        ) : (
                          <span>Link meeting to <span className="font-semibold">{task.code}</span></span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Activity Link Action */}
                {activityId && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 gap-1.5 text-xs font-medium text-foreground hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await linkTaskToActivity(Number(activityId), { taskId: task.id });
                              toast.success("Activity linked");
                              router.push('/pulse');
                            } catch (err: any) {
                              toast.error(err?.response?.data?.message ?? "Failed to link activity");
                            }
                          }}
                        >
                          <Link className="h-3.5 w-3.5 text-primary" />
                          Link
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {activityTitle ? (
                          <span>Link <span className="text-primary font-medium">{activityTitle}</span> to <span className="font-semibold">{task.code}</span></span>
                        ) : (
                          <span>Link activity to <span className="font-semibold">{task.code}</span></span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Comments — hidden in link mode */}
                {!meetingId && !activityId && (
                  <Popover
                    open={openCommentTaskId === task.id}
                    onOpenChange={(open) => setOpenCommentTaskId(open ? task.id : null)}
                  >
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-1.5 gap-1 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={(e) => e.stopPropagation()}>
                              {isRelationsLoading && !(commentCounts[task.id] > 0) ? (
                                <span className="w-4 text-center inline-block text-xs font-medium text-gray-400 dark:text-gray-500 leading-none tracking-widest animate-pulse">...</span>
                              ) : (commentCounts[task.id] ?? 0) > 0 ? (
                                <span className="w-4 text-center inline-block text-xs font-medium text-gray-500 dark:text-gray-400 leading-none">{commentCounts[task.id]}</span>
                              ) : (
                                <span className="w-4 inline-block" />
                              )}
                              <MessageSquare className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                            </Button>
                          </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top">Comments</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <PopoverContent className="w-[420px] p-3 max-h-[320px] overflow-y-auto" align="end" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Comments</p>
                        <button onClick={() => setOpenCommentTaskId(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <CommentSection postId={task.id} postType="Task" onCommentCountChange={(count) => setCommentCounts((prev) => ({ ...prev, [task.id]: count }))} />
                    </PopoverContent>
                  </Popover>
                )}

                {/* Actions dropdown — hidden in link mode */}
                {!meetingId && !activityId && (
                  <DropdownMenu open={openActionsTaskId === task.id} onOpenChange={(o) => setOpenActionsTaskId(o ? task.id : null)}>
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top">{actionItemName} Actions</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <DropdownMenuContent align="end" className="w-48" onMouseLeave={() => setOpenActionsTaskId(null)}>
                      <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {onEdit && (
                        <>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/task-management/task/form?id=${task.id}`); }} className="cursor-pointer">
                            <Eye className="w-3.5 h-3.5 mr-2" /><span className="text-xs">View</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="cursor-pointer">
                            <Edit className="w-3.5 h-3.5 mr-2" /><span className="text-xs">Edit</span>
                          </DropdownMenuItem>
                        </>
                      )}
                      {onUpdateTask && (
                        <DropdownMenuItem
                          onClick={async (e) => {
                            e.stopPropagation();
                            const newSpecial = !specialStates[task.id];
                            setSpecialStates((prev) => ({ ...prev, [task.id]: newSpecial }));
                            try {
                              const updated = await patchTaskSpecial(task.id, newSpecial);
                              await handleInlineUpdate(task.id, { special: newSpecial }, updated);
                            } catch {
                              setSpecialStates((prev) => ({ ...prev, [task.id]: !newSpecial }));
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <Star className={`w-3.5 h-3.5 mr-2 ${specialStates[task.id] ? 'text-primary fill-primary/20' : 'text-muted-foreground'}`} />
                          <span className={`text-xs ${specialStates[task.id] ? 'text-primary' : ''}`}>{specialStates[task.id] ? 'Remove Special' : 'Mark as Special'}</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={async (e) => {
                          e.stopPropagation();
                          const link = `${window.location.origin}/task-management/task/form?id=${task.id}`;
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
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteTask(task); }} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash className="w-3.5 h-3.5 mr-2 text-destructive" /><span className="text-xs">Delete</span>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </td>
          </tr>

          {/* ── Inline child rows (recursive) ─────────────────────── */}
          {isExpanded && (
            <>
              {/* Creator row always shows at top when active, even during loading */}
              {creatorState?.levelKey === String(task.id) && configData && (
                <InlineTaskCreatorRow
                  siblingTask={creatorState.siblingTask}
                  configData={{
                    ...configData,
                    // Pass root members so the inline creator can restrict/warn assignee pickers.
                    // Drilled view: configData.rootTaskMembers already set by page.
                    // Inline expand: look up depth-0 task from rootTasksRef (has .members from Phase 2).
                    rootTaskMembers: configData.rootTaskMembers !== undefined && configData.rootTaskMembers !== null
                      ? configData.rootTaskMembers
                      : (effectiveRootTaskId != null
                        ? (() => {
                          const foundRoot = rootTasksRef.current.find((t: any) => t.id === effectiveRootTaskId);
                          return foundRoot ? (foundRoot.members ?? []) : undefined;
                        })()
                        : undefined),
                  }}
                  depth={depth + 1}
                  filtersActive={filtersActive}
                  onCancel={() => {
                    setCreatorState(null);
                    // Collapse if there are no real children so we don't show an empty expanded state
                    const hasRealChildren =
                      childTaskCount > 0 ||
                      (childTasksMap[task.id]?.length ?? 0) > 0 ||
                      (insertedAtTopMap[String(task.id)] ?? []).length > 0;
                    if (!hasRealChildren) {
                      setExpandedTaskIds((prev) => { const s = new Set(prev); s.delete(task.id); return s; });
                    }
                  }}
                  onSave={(savedTasks) => {
                    const parentTask = task;

                    // Combine all known task IDs from all sources to reliably find the new one.
                    const allKnownIds = new Set<number>();
                    tasks.forEach(t => allKnownIds.add(t.id));
                    Object.values(childTasksMapRef.current).forEach(childList => childList.forEach(t => allKnownIds.add(t.id)));
                    Object.values(insertedAtTopMap).forEach(insertedList => insertedList.forEach(t => allKnownIds.add(t.id)));

                    const newTask = savedTasks.find(t => !allKnownIds.has(t.id));

                    if (!newTask) {
                      console.error("Could not determine new task from response", savedTasks);
                      return;
                    }

                    const taskWithDefaults = { childTaskCount: 0, childTasks: [], ...newTask };
                    registerTaskStates([taskWithDefaults]);
                    const topKey = String(parentTask.id);
                    setInsertedAtTopMap((prev) => ({
                      ...prev,
                      [topKey]: [taskWithDefaults, ...(prev[topKey] ?? [])],
                    }));

                    const newCount = (parentTask.childTaskCount ?? 0) + 1;
                    onUpdateTask?.(parentTask.id, { childTaskCount: newCount });

                    for (const saved of savedTasks) {
                      if (saved.id !== newTask.id) {
                        handleInlineUpdate(saved.id, saved, saved);
                      }
                    }

                    const rollupFields: Record<string, any> = {};
                    if (newTask.startDate != null || newTask.dueDate != null) {
                      rollupFields.startDate = newTask.startDate ?? null;
                      rollupFields.dueDate = newTask.dueDate ?? null;
                    }
                    if (newTask.statusId) rollupFields.statusId = newTask.statusId;
                    if (Object.keys(rollupFields).length > 0) {
                      setChildTasksMap(prev => ({
                        ...prev,
                        [parentTask.id]: [...(prev[parentTask.id] ?? []), taskWithDefaults]
                      }));
                      handleInlineUpdate(newTask.id, rollupFields, newTask).catch(() => { });
                    }

                    setCreatorState(null);
                  }}
                />
              )}
              {isExpandLoading ? (
                <>
                  {[0, 1, 2].map((i) => (
                    <tr key={`${task.id}-skeleton-${i}`} className="bg-gray-50/60 dark:bg-gray-900/40 animate-pulse border-b border-gray-200 dark:border-gray-700">
                      {/* Code + Title (merged skeleton) */}
                      <td className="pl-1 pr-4 py-2 align-middle">
                        <div className="flex items-center gap-1" style={{ paddingLeft: `${(depth + 1) * 12}px` }}>
                          <span className="w-7 flex-shrink-0" />
                          <div className="h-3 w-3.5 rounded bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                          <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                          <div className={`h-3 rounded bg-gray-200 dark:bg-gray-700 ${i === 0 ? 'w-48' : i === 1 ? 'w-36' : 'w-40'}`} />
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-2 align-middle">
                        <div className="h-5 w-20 rounded-md bg-gray-200 dark:bg-gray-700" />
                      </td>
                      {/* Severity */}
                      <td className="px-4 py-2 align-middle">
                        <div className="h-5 w-16 rounded-md bg-gray-200 dark:bg-gray-700" />
                      </td>
                      {/* Assignee */}
                      <td className="px-4 py-2 align-middle">
                        <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700" />
                      </td>
                      {/* Co-Assignees */}
                      <td className="px-4 py-2 align-middle">
                        <div className="flex -space-x-1">
                          <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700" />
                          <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700" />
                        </div>
                      </td>
                      {/* Start Date */}
                      <td className="px-4 py-2 align-middle">
                        <div className="h-5 w-20 rounded-md bg-gray-200 dark:bg-gray-700" />
                      </td>
                      {/* Due Date */}
                      <td className="px-4 py-2 align-middle">
                        <div className="h-5 w-20 rounded-md bg-gray-200 dark:bg-gray-700" />
                      </td>
                      {/* Labels */}
                      <td className="px-4 py-2 align-middle">
                        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-2 align-middle">
                        <div className="flex items-center justify-end gap-0.5">
                          <div className="h-7 w-7 rounded bg-gray-200 dark:bg-gray-700" />
                          <div className="h-7 w-7 rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ) : (
                renderRows([...(insertedAtTopMap[String(task.id)] ?? []), ...inlineChildren], depth + 1, effectiveRootTaskId)
              )}
            </>
          )}

        </React.Fragment>
      );
    });
  };

  return (
    <div className="rounded-lg border bg-background overflow-hidden flex-1 flex flex-col min-h-0">
      <div className="relative flex-1 overflow-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full">
        <table className="w-full text-sm table-fixed min-w-[1328px]">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-border">
            <tr>
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
              <th className="px-4 h-10 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-40 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">
                Labels
              </th>
              <th className="px-2 h-10 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-24 sticky top-0 right-0 z-30 bg-gray-50 dark:bg-gray-900 border-b border-border shadow-[-1px_0_0_0_theme(colors.gray.200)] dark:shadow-[-1px_0_0_0_theme(colors.gray.700)]"></th>
            </tr>
          </thead>
          <tbody className="">
            {topInlineCreatorRow}
            {/* Creator row at the TOP of the root level */}
            {creatorState?.levelKey === 'root' && configData && (
              <InlineTaskCreatorRow
                siblingTask={creatorState.siblingTask}
                configData={configData}
                depth={0}
                filtersActive={filtersActive}
                onCancel={() => setCreatorState(null)}
                onSave={(savedTasks) => {
                  const newTask = savedTasks.find(t => t.parentTaskId === null);
                  if (newTask) {
                    registerTaskStates([newTask]);
                    setInsertedAtTopMap((prev) => ({
                      ...prev,
                      root: [newTask, ...(prev['root'] ?? [])],
                    }));
                  }
                  setCreatorState(null);
                }}
              />
            )}
            {(insertedAtTopMap['root'] ?? []).length > 0 && renderRows(insertedAtTopMap['root'], 0)}
            {renderRows(tasks, 0)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TaskTableView;
