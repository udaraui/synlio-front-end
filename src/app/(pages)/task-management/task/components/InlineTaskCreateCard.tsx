'use client';

import React, { useState, useEffect, useRef } from 'react';
import {CalendarDays, Folder, Loader2, Save, X} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { getHierarchyLevelIcon } from '@/enums/space-configure-icon.enum';
import { createTask } from '@/services/task-management/task.service';
import {
  InlineEditableTaskStatus,
  InlineEditableTaskSeverity,
  InlineEditableTaskAssignee,
  InlineEditableTaskCoAssignees,
} from './InlineEditableTaskComponents';
import type { TaskCardConfigData } from './task-card.types';
import { useSearchParams, useRouter } from 'next/navigation';
import { setMeetingActionState } from '@/services/meetings-integration.service';
import { linkTaskToActivity } from '@/services/activity.service';
import { toast } from 'sonner';

// ─── Props ───────────────────────────────────────────────────────────────────

interface InlineTaskCreateCardProps {
  taskSpaceId: number;
  configData: TaskCardConfigData;
  hierarchyLevelSequence: number;
  parentTaskId?: number;
  parentTask?: any;
  label?: React.ReactNode;
  onSave: (task: any) => void;
  onCancel: () => void;
  hideBorders?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InlineTaskCreateCard({
  taskSpaceId,
  configData,
  hierarchyLevelSequence,
  parentTaskId,
  parentTask,
  label,
  onSave,
  onCancel,
  hideBorders,
}: InlineTaskCreateCardProps) {
  // ── form state ─────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [statusId, setStatusId]         = useState<number | null>(configData.statuses?.[0]?.id ?? null);
  const [severityId, setSeverityId]     = useState<number | null>(configData.severities?.[0]?.id ?? null);
  const [assigneeId, setAssigneeId]     = useState<number | null>(null);
  const [assigneeSkill, setAssigneeSkill] = useState<string | null>(null);
  const [coAssigneeIds, setCoAssigneeIds] = useState<number[]>([]);
  const [dateRange, setDateRange]       = useState<DateRange | undefined>(undefined);

  // ── meta ───────────────────────────────────────────────────────────────────
  const [hierarchyLevel, setHierarchyLevel] = useState<any>(null);
  const [isSaving, setIsSaving]             = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const meetingId = searchParams.get('meetingId');
  const activityId = searchParams.get('activityId');

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Resolve hierarchy level from configData — no code pre-fetch needed;
  // the backend generates the code on save.
  useEffect(() => {
    const sorted = [...(Array.isArray(configData.hierarchyLevels) ? configData.hierarchyLevels : [])]
      .sort((a, b) => a.sequence - b.sequence);
    const level = sorted.find((l) => l.sequence === hierarchyLevelSequence) ?? sorted[0];
    if (level) setHierarchyLevel(level);
  }, [hierarchyLevelSequence, configData.hierarchyLevels]);

  // ── derived ────────────────────────────────────────────────────────────────
  const HierarchyIcon = hierarchyLevel?.icon ? getHierarchyLevelIcon(hierarchyLevel.icon) : Folder;
  const hlColor = hierarchyLevel?.color || '#6B7280';

  // Is this an inline card for creating a CHILD task?
  const isChildCard = !!parentTaskId && hierarchyLevelSequence > 0;

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

  // resolve objects from ids (used as prop values for the inline components)
  const status      = (configData.statuses ?? []).find((s) => s.id === statusId)   ?? null;
  const severity    = (configData.severities ?? []).find((s) => s.id === severityId) ?? null;
  const assignee    = effectiveCardResources.find((r) => r.id === assigneeId)       ?? null;
  const coAssignees = effectiveCardResources.filter((r) => coAssigneeIds.includes(r.id));

  // ── save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim() || !hierarchyLevel) return;
    setIsSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        taskSpaceId,
        hierarchyLevelConfigId: hierarchyLevel.id,
        hierarchyLevel,
        taskSpaceName: configData.taskSpace?.name,
        taskSpacePrefix: configData.taskSpace?.prefix,
        divisionId: configData.taskSpace?.divisionId,
      };
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
      if (parentTaskId !== undefined) {
        payload.parentTaskId = parentTaskId;
        payload.parentTask = parentTask;
      }
      if (dateRange?.from) payload.startDate = format(dateRange.from, 'yyyy-MM-dd');
      if (dateRange?.to)   payload.dueDate   = format(dateRange.to,   'yyyy-MM-dd');
      const savedTasks = await createTask(payload);
      
      const newTask = savedTasks?.[0]; // inline create returns the list, or we assume it's created
      if (meetingId && newTask) {
        // Find the created task ID
        const newlyCreated = savedTasks.find((t: any) => t.name === name.trim());
        if (newlyCreated) {
          await setMeetingActionState(Number(meetingId), { state: 'linked_to_task', taskId: newlyCreated.id });
          toast.success('Task created and linked to meeting');
          router.push('/pulse');
          return; // Skip onSave since we redirect
        }
      } else if (activityId && newTask) {
        const newlyCreated = savedTasks.find((t: any) => t.name === name.trim()) ?? newTask;
        if (newlyCreated?.id) {
          await linkTaskToActivity(Number(activityId), { taskId: newlyCreated.id });
          toast.success('Task created and linked to activity');
          router.push('/pulse');
          return;
        }
      }
      onSave(savedTasks);
    } catch { /* parent handles */ }
    finally { setIsSaving(false); }
  };

  // shared section header/footer bg — identical to TaskCard
  const sectionCls = 'bg-gray-50 dark:bg-gray-900/50 border-border';

  return (
    <div className={cn(
      "rounded-lg overflow-hidden transition-all",
      hideBorders 
        ? "bg-transparent border-none shadow-none" 
        : "bg-white dark:bg-gray-800 border border-dashed border-primary/50 shadow-xs"
    )}>

      {/* ── Section 1: Icon + Code + Status ─────────────────────────── */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2', 
        sectionCls,
        !hideBorders && "border-b border-dashed"
      )}>

        {/* Hierarchy icon + optional label */}
        <div className="flex items-center gap-2 min-w-0">
          <HierarchyIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: hlColor }} />
          {label && (
            <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
          )}
        </div>

        {/* Status — exact same component as TaskCard */}
        <InlineEditableTaskStatus
          status={status}
          statuses={configData.statuses ?? []}
          taskId={0}
          onUpdate={async (id) => { setStatusId(id); }}
        />
      </div>

      {/* ── Section 2: Name + Assignee + Co-Assignees ─────────────── */}
      <div className="px-3 py-2 space-y-2 bg-white dark:bg-gray-800">

        {/* Name input */}
        <h3 className="text-sm leading-tight">
          <input
            ref={nameInputRef}
            type="text"
            placeholder={`${hierarchyLevel?.name ?? 'Add'} name...`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
              if (e.key === 'Escape') onCancel();
            }}
            className="w-full font-semibold text-gray-900 dark:text-gray-100 bg-transparent outline-none m-0 p-0 text-sm leading-tight placeholder:font-normal placeholder:text-gray-400"
            style={{ border: 'none', borderBottom: '2px solid', borderColor: 'var(--primary)', boxShadow: 'none' }}
          />
        </h3>

        {/* Assignee + Co-Assignees — exact same components as TaskCard */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1.5">
            <>
              {/* Assignee — exact same component as TaskCard */}
              <InlineEditableTaskAssignee
                assignee={assignee}
                assigneeSkill={assigneeSkill}
                resources={effectiveCardResources}
                taskMembers={effectiveTaskMembers}
                taskId={0}
                onUpdate={async (id, skill) => { setAssigneeId(id); setAssigneeSkill(skill ?? null); }}
              />

              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 shrink-0" />

              {/* Co-Assignees — exact same component as TaskCard */}
              <InlineEditableTaskCoAssignees
                coAssignees={coAssignees}
                resources={effectiveCardResources}
                taskMembers={effectiveTaskMembers}
                taskId={0}
                onUpdate={async (ids) => { setCoAssigneeIds(ids); }}
              />
            </>
          </div>
        </div>
      </div>

      {/* ── Section 3: Severity + Date Range + Save/Cancel ──────────── */}
      <div className={cn(
        'px-3 py-2 flex items-center justify-between gap-2', 
        sectionCls,
        !hideBorders && "border-t border-dashed"
      )}>

        {/* Left: Severity + Date Range */}
        <div className="flex items-center gap-2 min-w-0">

          {/* Severity — exact same component as TaskCard */}
          <InlineEditableTaskSeverity
            severity={severity}
            severities={configData.severities ?? []}
            taskId={0}
            onUpdate={async (id) => { setSeverityId(id); }}
          />

          {/* Date Range — same Popover/Calendar pattern as TaskCard */}
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                title="Set date range"
                className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <CalendarDays className="w-3 h-3 shrink-0 text-gray-400" />
                {dateRange?.from && dateRange?.to ? (
                  <span className="text-gray-700 dark:text-gray-300">{format(dateRange.from, 'LLL dd')} – {format(dateRange.to, 'LLL dd')}</span>
                ) : dateRange?.from ? (
                  <span className="text-gray-700 dark:text-gray-300">{format(dateRange.from, 'LLL dd')} – ?</span>
                ) : (
                  <span className="text-gray-400">No date range</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
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
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDateRange(undefined); setDatePickerOpen(false); }}
                    className="w-full text-xs text-red-500 hover:text-red-700 transition-colors text-center py-0.5"
                  >
                    Clear all dates
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Right: Save / Cancel */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button type="button" variant="ghost" size="sm"
            className="h-7 px-1.5 gap-1 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={handleSave} disabled={isSaving || !name.trim()} title="Save task">
            {isSaving
              ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              : <Save className="w-3.5 h-3.5 text-primary" />}
          </Button>
          <Button type="button" variant="ghost" size="sm"
            className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={onCancel} disabled={isSaving} title="Cancel">
            <X className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
          </Button>
        </div>
      </div>
    </div>
  );
}