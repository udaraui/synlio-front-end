'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, CalendarDays, Loader2, Save, Folder, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { getHierarchyLevelIcon } from '@/enums/space-configure-icon.enum';
import {
  InlineEditableTaskStatus,
  InlineEditableTaskSeverity,
  InlineEditableTaskAssignee,
  InlineEditableTaskCoAssignees,
} from './InlineEditableTaskComponents';
import { createTask } from '@/services/task-management/task.service';
import { createTmTaskLabel, getLabelsByTaskSpace } from '@/services/task-management/task-label.service';
import type { TaskCardConfigData } from './task-card.types';
import { useSearchParams, useRouter } from 'next/navigation';
import { setMeetingActionState } from '@/services/common/meetings-integration.service';
import { linkTaskToActivity } from '@/services/pulse/activity.service';
import { toast } from 'sonner';

// ── Local date helpers (same as TaskTableView) ─────────────────────────────
function toLocalDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

interface InlineTaskCreatorRowProps {
  /** The sibling task — used to inherit taskSpaceId, parentTaskId, hierarchy level, etc. */
  siblingTask: any;
  configData: TaskCardConfigData;
  depth: number;
  filtersActive?: boolean;
  onSave: (tasks: any[]) => void;
  onCancel: () => void;
}

export function InlineTaskCreatorRow({
  siblingTask,
  configData,
  depth,
  onSave,
  onCancel,
}: InlineTaskCreatorRowProps) {
  const [name, setName] = useState('');
  const [statusId, setStatusId] = useState<number | null>(configData.statuses?.[0]?.id ?? null);
  const [severityId, setSeverityId] = useState<number | null>(configData.severities?.[0]?.id ?? null);
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const [assigneeSkill, setAssigneeSkill] = useState<string | null>(null);
  const [coAssigneeIds, setCoAssigneeIds] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState<'start' | 'due' | false>(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeHintOpen, setCodeHintOpen] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<any[]>([]);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [labelSearch, setLabelSearch] = useState('');
  const [availableLabels, setAvailableLabels] = useState<any[]>(configData?.labels ?? []);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [hoveredLabelId, setHoveredLabelId] = useState<number | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const labelSearchRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const meetingId = searchParams.get('meetingId');
  const activityId = searchParams.get('activityId');

  // ── Resolve IDs robustly — child tasks from search/bulk-relations may store
  //    these as flat fields OR as nested objects depending on the fetch path.
  //    Resolve the hierarchy level OBJECT first (most complete lookup), then
  //    extract the ID from it — not the other way around.
  // ──────────────────────────────────────────────────────────────────────────

  // 1. Task-space ID
  const resolvedTaskSpaceId: number | undefined =
    siblingTask.taskSpaceId ??
    siblingTask.taskSpace?.id ??
    configData.taskSpace?.id;

  // 2. Hierarchy level object — try every path before giving up
  const resolvedHL: any =
    // a) Direct lookup in configData by flat ID
    configData.hierarchyLevels?.find(
      (h: any) =>
        h.id === siblingTask.hierarchyLevelConfigId ||
        h.id === siblingTask.hierarchyLevelConfig?.id,
    ) ??
    // b) Lookup in configData by name or sequence (handles tasks that only
    //    carry denormalized display fields, common in child search results)
    configData.hierarchyLevels?.find(
      (h: any) =>
        (siblingTask.hierarchyLevelName && h.name === siblingTask.hierarchyLevelName) ||
        (siblingTask.hierarchyLevelSequence != null &&
          h.sequence === siblingTask.hierarchyLevelSequence),
    ) ??
    // c) Nested relation object on the task itself
    siblingTask.hierarchyLevelConfig ??
    // d) Last-resort: synthetic object from flat display fields
    (siblingTask.hierarchyLevelIcon || siblingTask.hierarchyLevelName
      ? {
        id: siblingTask.hierarchyLevelConfigId ?? undefined,
        icon: siblingTask.hierarchyLevelIcon,
        color: siblingTask.hierarchyLevelColor,
        name: siblingTask.hierarchyLevelName,
        sequence: siblingTask.hierarchyLevelSequence,
      }
      : null);

  // 3. Hierarchy-level config ID — now simply read from the resolved object
  const resolvedHierarchyLevelConfigId: number | undefined =
    resolvedHL?.id ??
    siblingTask.hierarchyLevelConfigId ??
    siblingTask.hierarchyLevelConfig?.id;

  // 4. Parent task ID for the new sibling (same parent as the clicked task)
  const resolvedParentTaskId: number | null = siblingTask.parentTaskId ?? null;

  // Effective values
  const effectiveHL = resolvedHL;
  const effectiveHierarchyLevelConfigId: number | undefined = resolvedHierarchyLevelConfigId;
  const HierarchyIcon = effectiveHL?.icon ? getHierarchyLevelIcon(effectiveHL.icon) : Folder;
  const hlColor: string = effectiveHL?.color ?? '#6B7280';

  // Autofocus the name input on mount
  useEffect(() => {
    setTimeout(() => nameInputRef.current?.focus(), 30);
  }, []);

  // ── Resolve display objects from IDs ───────────────────────────────────────

  const effectiveTaskMembers = configData.rootTaskMembers ?? [];
  const effectiveCardResources: any[] = (() => {
    const base = [...(configData.resources ?? [])];
    effectiveTaskMembers.forEach(m => {
      if (m && !base.some(br => br.id === m.id)) {
        base.push(m);
      }
    });
    return base;
  })();

  const status = statusId ? (configData.statuses.find((s: any) => s.id === statusId) ?? null) : null;
  const severity = severityId ? (configData.severities.find((s: any) => s.id === severityId) ?? null) : null;
  const assignee = assigneeId ? (effectiveCardResources.find((r: any) => r.id === assigneeId) ?? null) : null;
  const coAssignees = effectiveCardResources.filter((r: any) => coAssigneeIds.includes(r.id));

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Task name is required');
      nameInputRef.current?.focus();
      return;
    }
    if (!resolvedTaskSpaceId) {
      setError('Cannot determine project space. Please refresh and try again.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, any> = {
        name: trimmedName,
        taskSpaceId: resolvedTaskSpaceId,
        hierarchyLevelConfigId: effectiveHierarchyLevelConfigId,
        hierarchyLevel: effectiveHL,
        taskSpaceName: configData.taskSpace?.name,
        taskSpacePrefix: configData.taskSpace?.prefix,
        divisionId: configData.taskSpace?.divisionId,
      };

      if (resolvedParentTaskId) {
        payload.parentTaskId = resolvedParentTaskId;
        payload.parentTask = siblingTask.parentTask;
      }

      if (status) {
        payload.statusId = status.id;
        payload.statusName = status.name;
        payload.statusBase = status.base;
      }
      if (severity) {
        payload.severityId = severity.id;
        payload.severity = severity;
      }
      if (assignee) {
        payload.assigneeId = assignee.id;
        payload.assignee = assignee;
        if (assigneeSkill) payload.assigneeSkill = assigneeSkill;
      }
      if (coAssignees.length > 0) {
        payload.coAssigneeIds = coAssignees.map(a => a.id);
        payload.coAssignees = coAssignees;
      }
      if (dateRange?.from) payload.startDate = toLocalDateString(dateRange.from);
      if (dateRange?.to) payload.dueDate = toLocalDateString(dateRange.to);
      if (selectedLabels.length > 0) payload.labelIds = selectedLabels.map((l) => l.id);

      const savedTasks = await createTask(payload);
      const newTask = savedTasks?.[0]; // inline create returns the list, or we assume it's created
      if (meetingId && newTask) {
        // Find the created task ID
        const newlyCreated = savedTasks.find((t: any) => t.name === trimmedName);
        if (newlyCreated) {
          await setMeetingActionState(Number(meetingId), { state: 'linked_to_task', taskId: newlyCreated.id });
          toast.success('Task created and linked to meeting');
          router.push('/pulse');
          return; // Skip onSave since we redirect
        }
      } else if (activityId && newTask) {
        const newlyCreated = savedTasks.find((t: any) => t.name === trimmedName) ?? newTask;
        if (newlyCreated?.id) {
          await linkTaskToActivity(Number(activityId), { taskId: newlyCreated.id });
          toast.success('Task created and linked to activity');
          router.push('/pulse');
          return;
        }
      }
      onSave(savedTasks);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        (typeof err?.message === 'string' ? err.message : null) ??
        'Failed to create task. Please try again';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
      setSaving(false);
    }
  };

  // ── Label helpers ──────────────────────────────────────────────────────────
  const filteredAvailable = availableLabels.filter(
    (l) => !selectedLabels.some((sl) => sl.id === l.id) && l.name.toLowerCase().includes(labelSearch.toLowerCase()),
  );
  const canCreateLabel = labelSearch.trim().length > 0 && !availableLabels.some(
    (l) => l.name.toLowerCase() === labelSearch.trim().toLowerCase(),
  );

  const openLabelPicker = async () => {
    setLabelPickerOpen(true);
    setLabelSearch('');
    setTimeout(() => labelSearchRef.current?.focus(), 50);
    if (resolvedTaskSpaceId) {
      setLoadingLabels(true);
      try {
        const fetched = await getLabelsByTaskSpace(resolvedTaskSpaceId);
        setAvailableLabels(fetched ?? []);
      } catch { /* keep existing */ } finally {
        setLoadingLabels(false);
      }
    }
  };

  const addLabel = (label: any) => {
    setSelectedLabels((prev) => [...prev, label]);
    setLabelSearch('');
  };

  const removeLabel = (labelId: number) => {
    setSelectedLabels((prev) => prev.filter((l) => l.id !== labelId));
  };

  const handleCreateLabel = async () => {
    const trimmed = labelSearch.trim();
    if (!trimmed || !resolvedTaskSpaceId) return;
    setCreatingLabel(true);
    try {
      const created = await createTmTaskLabel({ name: trimmed, taskSpaceId: resolvedTaskSpaceId });
      setAvailableLabels((prev) => [...prev, created]);
      addLabel(created);
    } catch { /* silently fail */ } finally {
      setCreatingLabel(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  };

  // ── Date label helper ──────────────────────────────────────────────────────
  const dateLabelNode = dateRange?.from || dateRange?.to ? (
    <>
      {dateRange.from && format(dateRange.from, 'LLL dd')}
      {dateRange.from && dateRange.to && ' – '}
      {dateRange.to && format(dateRange.to, 'LLL dd')}
    </>
  ) : (
    <span className="text-gray-400">No date range</span>
  );

  return (
    <tr className="bg-primary/5 dark:bg-primary/10 border-l-2 border-primary animate-in fade-in duration-150">
      {/* ── Code + Title (merged) ────────────────────────────────────── */}
      <td className="pl-1 py-2 align-middle sticky left-0 z-10 bg-[var(--creator-sticky-bg)]">
        <div className="flex items-center gap-1 min-w-0" style={{ paddingLeft: `${depth * 10}px` }}>
          {/* Expand toggle placeholder */}
          <span className="w-5 flex-shrink-0" />

          {/* Hierarchy icon */}
          <span className="flex items-center rounded flex-shrink-0">
            <HierarchyIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: hlColor }} />
          </span>

          {/* Code placeholder — shown in primary color, backend generates real code on save */}
          {/*<span className="text-xs font-semibold font-mono tracking-wide text-primary flex-shrink-0 select-none">*/}
          {/*  {configData.taskSpace?.prefix ?? '?'}-<Popover open={codeHintOpen}>*/}
          {/*    <PopoverTrigger asChild>*/}
          {/*      <span*/}
          {/*        className="cursor-help"*/}
          {/*        onMouseEnter={() => setCodeHintOpen(true)}*/}
          {/*        onMouseLeave={() => setCodeHintOpen(false)}*/}
          {/*      >?</span>*/}
          {/*    </PopoverTrigger>*/}
          {/*    <PopoverContent side="top" className="text-xs w-auto px-3 py-2">*/}
          {/*      Code will be generated when saving*/}
          {/*    </PopoverContent>*/}
          {/*  </Popover>*/}
          {/*</span>*/}

          {/* Title input — takes remaining space */}
          <div className="flex-1 min-w-0 mx-1 ml-2 flex flex-col gap-0.5">
            <TooltipProvider>
              <Tooltip open={inputFocused && !!name.trim()}>
                <TooltipTrigger asChild>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    placeholder={`${effectiveHL?.name ?? 'Add'} name...`}
                    disabled={saving}
                    className={`text-sm bg-transparent border-0 border-b-2 outline-none focus:outline-none w-full placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100 py-0.5 ${error ? 'border-red-400' : 'border-primary'
                      }`}
                    style={{ boxShadow: 'none' }}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-border shadow-sm" arrowClassName="fill-white dark:fill-gray-800">
                  <span className="inline-flex items-center gap-1.5">
                    <KbdGroup><Kbd>Enter</Kbd></KbdGroup>
                    <span>to save</span>
                    <span className="text-gray-400">·</span>
                    <KbdGroup><Kbd>Esc</Kbd></KbdGroup>
                    <span>to cancel</span>
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {error && <span className="text-[10px] text-red-500 leading-tight">{error}</span>}
          </div>
        </div>
      </td>

      {/* ── Status ───────────────────────────────────────────────────── */}
      <td className="px-4 py-2 align-middle">
        <InlineEditableTaskStatus
          status={status}
          statuses={configData.statuses}
          taskId={0}
          onUpdate={async (id) => setStatusId(id)}
        />
      </td>

      {/* ── Severity ─────────────────────────────────────────────────── */}
      <td className="px-4 py-2 align-middle">
        <InlineEditableTaskSeverity
          severity={severity}
          severities={configData.severities}
          taskId={0}
          onUpdate={async (id) => setSeverityId(id)}
        />
      </td>

      {/* ── Assignee ─────────────────────────────────────────────────── */}
      <td className="px-4 py-2 align-middle">
        <InlineEditableTaskAssignee
          assignee={assignee}
          assigneeSkill={assigneeSkill}
          resources={effectiveCardResources}
          taskMembers={effectiveTaskMembers}
          taskId={0}
          onUpdate={async (id, skill) => { setAssigneeId(id); setAssigneeSkill(skill ?? null); }}
        />
      </td>

      {/* ── Co-Assignees ─────────────────────────────────────────────── */}
      <td className="px-4 py-2 align-middle">
        <InlineEditableTaskCoAssignees
          coAssignees={coAssignees}
          resources={effectiveCardResources}
          taskMembers={effectiveTaskMembers}
          taskId={0}
          onUpdate={async (ids) => setCoAssigneeIds(ids)}
        />
      </td>

      {/* ── Start Date ────────────────────────────────────────────────── */}
      <td className="px-4 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
        <Popover open={datePickerOpen === 'start'} onOpenChange={(open) => setDatePickerOpen(open ? 'start' : false)}>
          <PopoverTrigger asChild>
            <button
              title="Set start date"
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border ${!dateRange?.from ? 'border-dashed' : ''} border-gray-300 dark:border-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer text-gray-700 dark:text-gray-300`}
              onClick={(e) => e.stopPropagation()}
            >
              <CalendarDays className="w-3 h-3 shrink-0" />
              {dateRange?.from ? format(dateRange.from, 'LLL dd') : <span className="text-gray-400">Add date</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 bg-white dark:bg-gray-800"
            align="start"
            onClick={(e) => e.stopPropagation()}
            onMouseLeave={() => setDatePickerOpen(false)}
          >
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from ?? dateRange?.to}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
            {(dateRange?.from || dateRange?.to) && (
              <div className="border-t px-3 py-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setDateRange(undefined); }}
                  className="w-full text-xs text-red-500 hover:text-red-700 transition-colors text-center py-0.5"
                >
                  Clear dates
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </td>

      {/* ── Due Date ──────────────────────────────────────────────────── */}
      <td className="px-4 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
        <Popover open={datePickerOpen === 'due'} onOpenChange={(open) => setDatePickerOpen(open ? 'due' : false)}>
          <PopoverTrigger asChild>
            <button
              title="Set due date"
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border ${!dateRange?.to ? 'border-dashed' : ''} border-gray-300 dark:border-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer text-gray-700 dark:text-gray-300`}
              onClick={(e) => e.stopPropagation()}
            >
              <CalendarDays className="w-3 h-3 shrink-0" />
              {dateRange?.to ? format(dateRange.to, 'LLL dd') : <span className="text-gray-400">Add date</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 bg-white dark:bg-gray-800"
            align="start"
            onClick={(e) => e.stopPropagation()}
            onMouseLeave={() => setDatePickerOpen(false)}
          >
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from ?? dateRange?.to}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
            {(dateRange?.from || dateRange?.to) && (
              <div className="border-t px-3 py-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setDateRange(undefined); }}
                  className="w-full text-xs text-red-500 hover:text-red-700 transition-colors text-center py-0.5"
                >
                  Clear dates
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </td>

      {/* ── Labels ───────────────────────────────────────────────────── */}
      <td className="px-4 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
        <Popover open={labelPickerOpen} onOpenChange={(open) => { if (open) openLabelPicker(); else setLabelPickerOpen(false); }}>
          <PopoverTrigger asChild>
            <div className="flex items-center gap-1 min-w-0 cursor-pointer">
              {selectedLabels[0] ? (
                <Badge variant="outline" className="truncate max-w-[120px] text-xs font-normal bg-white dark:bg-transparent cursor-pointer border-gray-300 dark:border-gray-700">
                  {selectedLabels[0].name}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs border border-dashed text-gray-400 border-gray-300 dark:border-gray-700 bg-white dark:bg-transparent gap-1 cursor-pointer"
                  title="Add label"
                >
                  <Plus className="w-3 h-3" />Add Label
                </Badge>
              )}
              {selectedLabels.length > 1 && (
                <Badge variant="outline" className="text-xs font-normal flex-shrink-0 bg-white dark:bg-transparent cursor-pointer border-gray-300 dark:border-gray-700">
                  +{selectedLabels.length - 1}
                </Badge>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-56 p-0"
            align="start"
            side="bottom"
            onClick={(e) => e.stopPropagation()}
            onMouseLeave={() => setLabelPickerOpen(false)}
          >
            {selectedLabels.length > 0 && (
              <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Applied</p>
                <div className="flex flex-wrap gap-1">
                  {selectedLabels.map((label) => (
                    <div
                      key={label.id}
                      className="relative inline-flex items-center"
                      onMouseEnter={() => setHoveredLabelId(label.id)}
                      onMouseLeave={() => setHoveredLabelId(null)}
                    >
                      <Badge variant="outline" className="pr-6 text-xs font-normal bg-white dark:bg-transparent border-gray-300 dark:border-gray-700">
                        {label.name}
                      </Badge>
                      <button
                        className={`absolute right-1 top-1/2 -translate-y-1/2 transition-opacity text-gray-500 hover:text-red-500 ${hoveredLabelId === label.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        onClick={(e) => { e.stopPropagation(); removeLabel(label.id); }}
                        title="Remove label"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
              <Search className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <input
                ref={labelSearchRef}
                type="text"
                placeholder="Search or create..."
                className="flex-1 text-xs bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                value={labelSearch}
                onChange={(e) => setLabelSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && canCreateLabel) handleCreateLabel(); }}
              />
            </div>
            <div className="max-h-32 overflow-y-auto py-1">
              {loadingLabels ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              ) : filteredAvailable.length === 0 && !canCreateLabel ? (
                <p className="px-3 py-2 text-xs text-gray-400 italic">
                  {labelSearch ? 'No matches' : 'No labels available'}
                </p>
              ) : (
                filteredAvailable.map((label) => (
                  <button
                    key={label.id}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => addLabel(label)}
                  >
                    {label.name}
                  </button>
                ))
              )}
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700">
              {!loadingLabels && canCreateLabel ? (
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                  onClick={handleCreateLabel}
                  disabled={creatingLabel}
                >
                  {creatingLabel
                    ? <Loader2 className="w-3 h-3 shrink-0 animate-spin" />
                    : <Plus className="w-3 h-3 shrink-0" />}
                  Create &ldquo;{labelSearch.trim()}&rdquo;
                </button>
              ) : (
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setTimeout(() => labelSearchRef.current?.focus(), 10)}
                >
                  <Plus className="w-3 h-3 shrink-0" />Add Label
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </td>

      {/* ── Save / Cancel ────────────────────────────────────────────── */}
      <td className="px-2 py-2 align-middle sticky right-0 z-10 bg-[var(--creator-sticky-bg)]">
        <div className="flex items-center justify-end gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-1.5 gap-1 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            title="Save (Enter)"
          >
            {saving
              ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              : <Save className="w-3.5 h-3.5 text-primary" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={onCancel}
            disabled={saving}
            title="Cancel (Escape)"
          >
            <X className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
