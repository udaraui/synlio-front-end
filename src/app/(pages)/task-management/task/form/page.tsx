'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBreadcrumb } from '@/contexts/breadcrumb.context';
import { useAuth } from '@/contexts/auth.context';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flag,
  Folder,
  Info,
  Loader2,
  MessageSquare,
  Plus,
  Star,
  Clock,
  Share2,
  Copy,
  X,
  CircleCheck,
  Lock,
  NotebookPen,
  Ticket as TicketIcon,
  Unlink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import RichTextEditor from '@/components/common/RichTextEditor';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Slider } from '@/components/ui/slider';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  cn,
  getInitials,
  formatRelativeTime
} from '@/lib/utils';
import {
  getTaskSpaceById,
  getTaskSpaceStatusConfig,
  getTaskSpaceSeverityConfig,
  getTaskSpaceResourcesConfig,
  getHierarchyLevelConfig,
  addResourceToTaskSpace,
} from '@/services/task-management/task-space.service';
import { getHierarchyLevelIcon } from '@/enums/space-configure-icon.enum';
import {
  createTask,
  getNextTaskCode,
  peekNextTaskCode,
  getTaskById,
  getTaskBaseById,
  getTaskAssignees,
  getTaskChildTasks,
  getTaskChecklists,
  getTaskEvents,
  patchTaskLabels,
  patchTaskProgress,
  patchTaskSpecial,
  patchTaskName,
  patchTaskStatus,
  patchTaskSeverity,
  patchTaskAssignee,
  patchTaskCoAssignees,
  patchTaskDates,
  patchTaskDescription,
  patchTaskActualDates,
  patchTaskEffort,
  patchTaskMembers,
  updateTask,
} from '@/services/task-management/task.service';
import { getLabelsByTaskSpace, createTmTaskLabel } from '@/services/task-management/task-label.service';
import { TaskLabelDropdown } from '@/components/common/TaskLabelDropdown';
import { ChecklistSection } from '@/components/common/ChecklistSection';
import { AttachmentSection } from '@/components/common/AttachmentSection';
import { CommentSection } from '@/components/common/CommentSection';
import { TaskSpaceResourceDropdown } from '@/components/common/TaskSpaceResourceDropdown';
import { createResourceLog, deleteResourceLog, getResourceTaskLogHistory, updateResourceLog } from '@/services/work-log/work-log.service';
import { AssigneeType } from "@/enums/assignee-type.enum";
import { setMeetingActionState } from '@/services/meetings-integration.service';
import { linkTaskToActivity } from '@/services/activity.service';
import LinkWorkItemDialog from '@/components/link-management/LinkWorkItemDialog';
import {
  getWorkItemLinks,
  deleteWorkItemLink,
  checkWorkItemAccess,
  type WorkItemLink,
} from '@/services/link-management/work-item-link.service';
import { getLinkTypes, type LinkType } from '@/services/link-management/link-type.service';
import { DatePickerItem } from "@/components/ui/date-picker-item";
import { DetailsTable } from "@/components/common/details-table";
import { WorkLogTable } from "@/components/common/work-log-table";
import { ResourceRow } from '../components/InlineEditableTaskComponents';
import { usePrivilegeGuard } from '@/hooks/use-privilege-guard';

// --- User Avatar -------------------------------------------------------------

const UserAvatar = ({
  firstName,
  lastName,
  profilePic,
  size = 'sm',
}: {
  firstName?: string;
  lastName?: string;
  profilePic?: string | null;
  size?: 'xs' | 'sm' | 'md';
}) => {
  const sizeClass = { xs: 'w-5 h-5 text-[10px]', sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm' }[size];
  const fName = (firstName || '').trim();
  const lName = (lastName || '').trim();
  let initials = '?';

  if (fName && lName) {
    initials = (fName.charAt(0) + lName.charAt(0)).toUpperCase();
  } else if (fName && fName.includes(' ')) {
    const parts = fName.split(' ').filter(Boolean);
    if (parts.length > 1) {
      initials = (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    } else {
      initials = fName.substring(0, 2).toUpperCase();
    }
  } else if (fName) {
    initials = fName.substring(0, 2).toUpperCase();
  } else if (lName) {
    initials = lName.substring(0, 2).toUpperCase();
  }

  let finalProfilePic: string | undefined = undefined;
  if (profilePic && typeof profilePic === 'string' && profilePic.trim().length > 0) {
    finalProfilePic = profilePic.startsWith('http')
      ? profilePic
      : `${process.env.NEXT_PUBLIC_API_URL}/uploads/resource/${profilePic}`;
  }

  return (
    <Avatar className={sizeClass}>
      {finalProfilePic && <AvatarImage src={finalProfilePic} alt={`${firstName} ${lastName}`} className="object-cover" />}
      <AvatarFallback style={size === 'xs' ? { fontSize: '10px' } : undefined}>{initials}</AvatarFallback>
    </Avatar>
  );
};

const getNextWeekEndDay = (startDate: Date): Date | null => {
  try {
    const activeCompany = JSON.parse(localStorage.getItem('active_company') || '{}');
    if (!activeCompany.weekEndDate) return null;

    const weekEndDay = new Date(activeCompany.weekEndDate).getDay();

    const currentDay = startDate.getDay();
    let daysUntilWeekend = weekEndDay - currentDay;

    if (daysUntilWeekend < 0) {
      daysUntilWeekend += 7;
    }

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + daysUntilWeekend);
    return endDate;
  } catch (error) {
    return null;
  }
};



// --- Main Page ----------------------------------------------------------------

interface TaskConfig {
  taskSpace: any;
  statuses: any[];
  severities: any[];
  resources: any[];
  hierarchyLevels: any[];
}

export default function TaskFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setBreadcrumbs } = useBreadcrumb();
  const { user } = useAuth();
  // Privilege guard: only users with 'access:guest-member' (id 122) can add/remove guest members
  const canManageGuestMembers = usePrivilegeGuard('111');

  /** Full name used as updatedBy in all PATCH calls (firstName + lastName, falls back to empty) */
  const updatedBy = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || undefined;

  const taskId = searchParams.get('id');
  const taskSpaceIdParam = searchParams.get('taskSpaceId');
  const preStatusId = searchParams.get('statusId');
  const preHierarchyLevelSequence = searchParams.get('hierarchyLevelSequence');
  const preParentTaskId = searchParams.get('parentTaskId');
  const preStartDate = searchParams.get('startDate');
  const meetingId = searchParams.get('meetingId');
  const activityId = searchParams.get('activityId');
  const isEditMode = !!taskId;

  const [isLoading, setIsLoading] = useState(true);
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [isAssigneesLoading, setIsAssigneesLoading] = useState(false);
  const [isChildTasksLoading, setIsChildTasksLoading] = useState(false);
  const [isLinksLoading, setIsLinksLoading] = useState(false);
  const [isTaskEventsLoading, setIsTaskEventsLoading] = useState(false);
  const [isLogHistoryLoading, setIsLogHistoryLoading] = useState(false);
  const [isLabelsLoading, setIsLabelsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<TaskConfig | null>(null);
  // Raw task object from Phase-1 fetch — used as display fallback while config loads
  const [taskViewData, setTaskViewData] = useState<any>(null);
  const [nextTaskCode, setNextTaskCode] = useState<string>('');
  const [parentTaskInfo, setParentTaskInfo] = useState<{ id: number; name: string; code?: string; hierarchyLevelConfigId?: number; hierarchyLevelIcon?: string; hierarchyLevelColor?: string } | null>(null);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [childTasksOpen, setChildTasksOpen] = useState(false);
  const [linkedTasksOpen, setLinkedTasksOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [logHistoryOpen, setLogHistoryOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  // When set, the assignee popover shows a "pick a skill" prompt for this resource
  // instead of the normal resource list (shown right after assigning without a skill).
  const [pendingSkillPrompt, setPendingSkillPrompt] = useState<any | null>(null);
  const [coAssigneeOpen, setCoAssigneeOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [coAssigneeSearch, setCoAssigneeSearch] = useState('');
  // Cache of full resource objects for members that may not be in config?.resources
  const [memberResourceCache, setMemberResourceCache] = useState<Record<number, any>>({});
  // Root-task members — when editing/creating a child task (parentTaskId set, sequence > 0)
  // the assignee/co-assignee dropdowns must show the root task's member list, not space resources.
  // null = not yet determined | [] = root has no members | [...] = root members
  const [rootTaskMembers, setRootTaskMembers] = useState<any[] | null>(null);
  const [rootTask, setRootTask] = useState<any | null>(null);
  const [childTasks, setChildTasks] = useState<any[]>([]);
  const [childPage, setChildPage] = useState(1);
  const CHILD_PAGE_SIZE = 5;
  const [linkedPage, setLinkedPage] = useState(1);
  const LINKED_PAGE_SIZE = 5;
  const [activeTab, setActiveTab] = useState('details');
  const [memberToRemove, setMemberToRemove] = useState<number | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [memberRemoveError, setMemberRemoveError] = useState<string | null>(null);

  // -- Linked Tasks / Tickets -------------------------------------------------
  const [workItemLinks, setWorkItemLinks] = useState<WorkItemLink[]>([]);
  const [linkTypes, setLinkTypes] = useState<LinkType[]>([]);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [openLinkedCommentId, setOpenLinkedCommentId] = useState<number | null>(null);
  const [linkedCommentCounts, setLinkedCommentCounts] = useState<Record<number, number>>({});

  // -- Checklist --------------------------------------------------------------
  const [checklistItems, setChecklistItems] = useState<any[]>([]);

  // -- Log History ------------------------------------------------------------
  const [taskEvents, setTaskEvents] = useState<any[]>([]);
  const [logHistory, setLogHistory] = useState<any[]>([]);
  const [newLogEntry, setNewLogEntry] = useState({
    startTimeDate: null as Date | null,
    endTimeDate: null as Date | null,
    effort: '',
    note: '',
  });
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editingLogEntry, setEditingLogEntry] = useState<{
    startTimeDate: Date | null;
    endTimeDate: Date | null;
    effort: string;
    note: string;
  } | null>(null);
  const [logPage, setLogPage] = useState(1);
  const LOG_PAGE_SIZE = 3;
  const [visibleLogHistoryCount, setVisibleLogHistoryCount] = useState(5);

  // -- Labels -----------------------------------------------------------------
  const [taskLabels, setTaskLabels] = useState<any[]>([]);
  const [availableLabels, setAvailableLabels] = useState<any[]>([]);
  const [sidebarLabelOpen, setSidebarLabelOpen] = useState(false);
  const [labelSearch, setLabelSearch] = useState('');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    taskSpaceId: 0,
    statusId: undefined as number | undefined,
    severityId: undefined as number | undefined,
    hierarchyLevelConfigId: undefined as number | undefined,
    assigneeId: undefined as number | undefined,
    assigneeSkill: undefined as string | undefined,
    coAssigneeIds: [] as number[],
    memberIds: [] as number[],
    estimateEffort: '',
    actualEffort: '',
    progressPercentage: 0,
    startDate: undefined as string | undefined,
    dueDate: undefined as string | undefined,
    actualStartDate: undefined as string | undefined,
    actualEndDate: undefined as string | undefined,
    completionDate: undefined as string | undefined,
    parentTaskId: undefined as number | undefined,
    special: false as boolean,
  });

  const [metadata, setMetadata] = useState<{
    createdAt?: string; createdBy?: string; updatedAt?: string; updatedBy?: string;
  }>({});

  /** Timestamp of last successful auto-save (edit mode only) */
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  /** True while at least one auto-save request is in-flight */
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const pendingAutoSaves = useRef(0);

  const hasLoaded = useRef(false);
  const formDataSnapshot = useRef<typeof formData | null>(null);
  const descriptionPatchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (field: string, value: any) => setFormData((p) => ({ ...p, [field]: value }));

  /** Call before every auto-save PATCH to show the saving spinner */
  const beginAutoSave = () => {
    pendingAutoSaves.current += 1;
    setIsAutoSaving(true);
  };

  /** Call in the catch block of an auto-save when syncMeta won't be reached */
  const endAutoSave = () => {
    pendingAutoSaves.current = Math.max(0, pendingAutoSaves.current - 1);
    if (pendingAutoSaves.current === 0) setIsAutoSaving(false);
  };

  /** Sync metadata (updatedAt/updatedBy) from a PATCH response */
  const syncMeta = (res: any) => {
    if (res?.updatedAt) {
      setMetadata((prev) => ({ ...prev, updatedAt: res.updatedAt, updatedBy: updatedBy || res.updatedBy }));
    }
    setAutoSavedAt(res?.updatedAt ? new Date(res.updatedAt) : new Date());
    pendingAutoSaves.current = Math.max(0, pendingAutoSaves.current - 1);
    if (pendingAutoSaves.current === 0) setIsAutoSaving(false);
  };

  /** Progress value auto-derived from status base ('To Start' | 'Processing' | 'Finished') */
  const progressForBase = (base: string | null | undefined): number | null => {
    if (base === 'To Start') return 0;
    if (base === 'Processing') return 20;
    if (base === 'Finished') return 100;
    return null;
  };

  const toggleCoAssignee = (id: number) => {
    setFormData((p) => {
      const next = p.coAssigneeIds.includes(id)
        ? p.coAssigneeIds.filter((x) => x !== id)
        : [...p.coAssigneeIds, id];
      if (isEditMode && taskId) {
        beginAutoSave();
        patchTaskCoAssignees(Number(taskId), next, updatedBy)
          .then((res) => {
            const newMemberIds = res.members?.map((m: any) => m.id) ?? formDataSnapshot.current?.memberIds ?? [];
            formDataSnapshot.current = { ...formDataSnapshot.current!, coAssigneeIds: [...next], memberIds: newMemberIds };
            setTaskViewData((prev: any) => ({ ...prev, coAssignees: res.coAssignees, members: res.members ?? prev.members }));
            setFormData((prev) => ({ ...prev, memberIds: newMemberIds }));
            syncMeta(res);
            toast.success('Co-assignees saved');
          })
          .catch(() => { endAutoSave(); toast.error('Failed to save co-assignees'); });
      }
      return { ...p, coAssigneeIds: next };
    });
  };

  /**
   * Select (or unselect) a resource as assignee, optionally along with one of their skills.
   * Clicking the resource row (no `skill` arg) toggles the whole assignee on/off.
   * Clicking an already-selected skill badge again removes just the skill — it must NOT
   * also unassign the resource.
   */
  const selectAssignee = (r: any, skill?: string) => {
    const isSkillClick = skill !== undefined;
    const isSameSkillSelected = formData.assigneeId === r.id && formData.assigneeSkill === skill;
    const isUnselectingRow = !isSkillClick && formData.assigneeId === r.id;

    const newId = isUnselectingRow ? undefined : r.id;
    const newSkill = isUnselectingRow
      ? undefined
      : isSkillClick
        ? (isSameSkillSelected ? undefined : skill)
        : undefined;
    const oldAssigneeId = formData.assigneeId;

    // Freshly assigning via a plain row click (no skill picked yet) — keep the popover
    // open and switch it to a "pick a skill" prompt, if this resource has any skills.
    const shouldPromptForSkill = !isSkillClick && !isUnselectingRow && (r.skills ?? []).length > 0;
    if (shouldPromptForSkill) {
      setPendingSkillPrompt(r);
    } else {
      setAssigneeOpen(false);
      setPendingSkillPrompt(null);
    }

    set('assigneeId', newId);
    set('assigneeSkill', newSkill);
    if (isEditMode && taskId) {
      beginAutoSave();
      patchTaskAssignee(Number(taskId), newId ?? null, oldAssigneeId ?? null, updatedBy, newSkill ?? null)
        .then((res) => {
          const newMemberIds = res.members?.map((m: any) => m.id) ?? formData.memberIds;
          formDataSnapshot.current = { ...formDataSnapshot.current!, assigneeId: newId, assigneeSkill: newSkill, memberIds: newMemberIds };
          setTaskViewData((prev: any) => ({ ...prev, assignee: res.assignee, members: res.members ?? prev.members }));
          setFormData((p) => ({ ...p, memberIds: newMemberIds }));
          syncMeta(res);
          toast.success('Assignee saved');
        })
        .catch(() => {
          endAutoSave();
          set('assigneeId', oldAssigneeId);
          set('assigneeSkill', formDataSnapshot.current?.assigneeSkill);
          toast.error('Failed to save assignee');
        });
    }
  };

  /** Close the "pick a skill" prompt without picking one. */
  const dismissSkillPrompt = () => {
    setPendingSkillPrompt(null);
    setAssigneeOpen(false);
  };

  const toggleMember = (id: number) => {
    const isRemoval = formData.memberIds.includes(id);
    if (isRemoval && !isChildTask) {
      setMemberToRemove(id);
      return;
    }
    executeToggleMember(id);
  };

  const executeToggleMember = (id: number) => {
    setFormData((p) => {
      const next = p.memberIds.includes(id)
        ? p.memberIds.filter((x) => x !== id)
        : [...p.memberIds, id];
      if (isEditMode && taskId) {
        beginAutoSave();
        patchTaskMembers(Number(taskId), next, updatedBy)
          .then((res) => {
            const serverMemberIds = res.members?.map((m: any) => m.id) ?? next;
            formDataSnapshot.current = { ...formDataSnapshot.current!, memberIds: serverMemberIds };
            setTaskViewData((prev: any) => ({ ...prev, members: res.members }));
            setFormData((prev) => ({ ...prev, memberIds: serverMemberIds }));
            syncMeta(res);
            const isAdded = next.length > p.memberIds.length;
            toast.success(isAdded ? 'Guest added' : 'Guest removed');
          })
          .catch(() => { endAutoSave(); toast.error('Failed to save guest'); });
      }
      return { ...p, memberIds: next };
    });
  };

  const confirmRemoveMember = () => {
    if (!memberToRemove) return;
    const id = memberToRemove;
    const next = formData.memberIds.filter((x) => x !== id);

    if (isEditMode && taskId) {
      setIsRemovingMember(true);
      setMemberRemoveError(null);
      beginAutoSave();
      patchTaskMembers(Number(taskId), next, updatedBy)
        .then((res) => {
          const serverMemberIds = res.members?.map((m: any) => m.id) ?? next;
          formDataSnapshot.current = { ...formDataSnapshot.current!, memberIds: serverMemberIds };
          setTaskViewData((prev: any) => ({ ...prev, members: res.members }));
          setFormData((prev) => ({ ...prev, memberIds: serverMemberIds }));
          syncMeta(res);
          toast.success('Guest Member removed');

          const removedResource = (config?.resources ?? []).find((x: any) => x.id === id) ?? memberResourceCache[id];
          if (removedResource && user?.email && removedResource.email === user.email) {
            router.push('/task-management/task-space');
          }
          setMemberToRemove(null);
          setIsRemovingMember(false);
        })
        .catch((err) => {
          endAutoSave();
          setIsRemovingMember(false);
          const msg = err?.response?.data?.message;
          if (msg && typeof msg === 'string') {
            setMemberRemoveError(msg);
          } else {
            toast.error('Failed to remove member');
            setMemberToRemove(null);
          }
        });
    } else {
      setFormData((prev) => ({ ...prev, memberIds: next }));
      setMemberToRemove(null);
    }
  };

  // -- Load config ------------------------------------------------------------

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    const load = async () => {
      try {
        setIsLoading(true);

        let spaceId: number;

        if (isEditMode) {
          // ── Phase 1: fetch CORE task data (no heavy relations) → show form immediately ──
          const task = await getTaskBaseById(Number(taskId));
          spaceId = task.taskSpaceId;

          // Cache raw task for phase-1 display fallbacks (status/severity/etc.)
          setTaskViewData(task);

          const _initialFormData = {
            name: task.name ?? '',
            description: task.description ?? '',
            taskSpaceId: task.taskSpaceId,
            statusId: task.statusId ?? undefined,
            severityId: task.severityId ?? undefined,
            hierarchyLevelConfigId: task.hierarchyLevelConfigId ?? undefined,
            assigneeId: task.assigneeId ?? undefined,
            assigneeSkill: task.assigneeSkill ?? undefined,
            coAssigneeIds: [] as number[],
            memberIds: [] as number[],
            estimateEffort: task.estimateEffort ? String(task.estimateEffort) : '',
            actualEffort: task.actualEffort ? String(task.actualEffort) : '',
            progressPercentage: task.progressPercentage ?? 0,
            startDate: task.startDate ?? undefined,
            dueDate: task.dueDate ?? undefined,
            completionDate: task.completionDate ?? undefined,
            actualStartDate: task.actualStartDate ?? undefined,
            actualEndDate: task.actualEndDate ?? undefined,
            parentTaskId: task.parentTaskId ?? undefined,
            special: task.special ?? false,
          } as any;
          setFormData(_initialFormData);
          formDataSnapshot.current = _initialFormData;

          setNextTaskCode(task.code ?? '');

          if (task.parentTaskId) {
            if (task.parentTask) {
              setParentTaskInfo({ id: task.parentTask.id, name: task.parentTask.name, code: task.parentTask.code, hierarchyLevelConfigId: task.parentTask.hierarchyLevelConfigId, hierarchyLevelIcon: task.parentTask.hierarchyLevelIcon, hierarchyLevelColor: task.parentTask.hierarchyLevelColor });
            } else {
              // parentTask relation not loaded in base call — fetch separately
              try {
                const pt = await getTaskBaseById(Number(task.parentTaskId));
                setParentTaskInfo({ id: pt.id, name: pt.name, code: pt.code, hierarchyLevelConfigId: pt.hierarchyLevelConfigId, hierarchyLevelIcon: pt.hierarchyLevelConfig?.icon, hierarchyLevelColor: pt.hierarchyLevelConfig?.color });
              } catch { /* ignore */ }
            }
          }

          setMetadata({
            createdAt: task.createdAt,
            createdBy: task.createdBy,
            updatedAt: task.updatedAt,
            updatedBy: task.updatedBy,
          });

          setTaskLabels(Array.isArray(task.labels) ? task.labels : []);

          // Set breadcrumbs using taskSpace embedded in the task (available in Phase 1)
          const spaceName = task.taskSpace?.name ?? '';
          setBreadcrumbs([
            { label: spaceName, href: meetingId ? `/task-management/task?taskSpaceId=${spaceId}&meetingId=${meetingId}` : activityId ? `/task-management/task?taskSpaceId=${spaceId}&activityId=${activityId}` : `/task-management/task?taskSpaceId=${spaceId}` },
            { label: task.code ?? task.name, isCurrentPage: true },
          ]);

          // ── Phase 1 complete — show the form now ─────────────────────────────
          setIsLoading(false);

          // ── Phase 2 & 3: load remaining data in background (parallel) ────

          // 1. Grouped Space Config (Dropdowns)
          setIsConfigLoading(true);
          Promise.all([
            getTaskSpaceStatusConfig(spaceId).catch(() => null),
            getTaskSpaceSeverityConfig(spaceId).catch(() => null),
            getTaskSpaceResourcesConfig(spaceId).catch(() => null),
            getHierarchyLevelConfig(spaceId).catch(() => null),
            getLabelsByTaskSpace(spaceId).catch(() => null),
          ]).then(([statusRes, severityRes, resourceRes, hierarchyRes, labelsRes]) => {
            const space = task.taskSpace;
            setConfig({
              taskSpace: space,
              statuses: statusRes?.statuses ?? [],
              severities: severityRes?.severities ?? [],
              resources: resourceRes?.resources ?? [],
              hierarchyLevels: Array.isArray(hierarchyRes) ? hierarchyRes : [],
            });
            if (labelsRes) {
              setAvailableLabels(Array.isArray(labelsRes) ? labelsRes : []);
            }
          }).finally(() => setIsConfigLoading(false));

          // 2. Log History
          setIsLogHistoryLoading(true);
          getResourceTaskLogHistory(Number(taskId)).then(logHistoryRes => {
            if (logHistoryRes) {
              setLogHistory(Array.isArray(logHistoryRes) ? logHistoryRes : []);
            }
          }).catch(() => null).finally(() => setIsLogHistoryLoading(false));

          // 3. Assignees
          setIsAssigneesLoading(true);
          getTaskAssignees(Number(taskId)).then(assigneesRes => {
            if (assigneesRes) {
              const { assignee, coAssignees, members } = assigneesRes;
              const memberCache: Record<number, any> = {};
              (members ?? []).forEach((r: any) => { memberCache[r.id] = r; });
              (coAssignees ?? []).forEach((r: any) => { memberCache[r.id] = r; });
              if (assignee) memberCache[assignee.id] = assignee;
              setMemberResourceCache(memberCache);
              setTaskViewData((prev: any) => ({ ...prev, assignee, coAssignees, members }));
              setFormData((prev) => ({
                ...prev,
                assigneeId: assignee?.id ?? prev.assigneeId,
                assigneeSkill: assignee ? (assignee.assigneeSkill ?? undefined) : prev.assigneeSkill,
                coAssigneeIds: (coAssignees ?? []).map((r: any) => r.id),
                memberIds: (members ?? []).map((r: any) => r.id),
              }));
              formDataSnapshot.current = {
                ...formDataSnapshot.current!,
                assigneeId: assignee?.id ?? formDataSnapshot.current?.assigneeId,
                assigneeSkill: assignee ? (assignee.assigneeSkill ?? undefined) : formDataSnapshot.current?.assigneeSkill,
                coAssigneeIds: (coAssignees ?? []).map((r: any) => r.id),
                memberIds: (members ?? []).map((r: any) => r.id),
              };
            }
          }).catch(() => null).finally(() => setIsAssigneesLoading(false));

          // 4. Child Tasks
          setIsChildTasksLoading(true);
          getTaskChildTasks(Number(taskId)).then(childTasksRes => {
            if (childTasksRes) {
              const { childTasks: _childTasks } = childTasksRes;
              setChildTasks(_childTasks ?? []);
              setChildTasksOpen((_childTasks ?? []).length > 0);
            }
          }).catch(() => null).finally(() => setIsChildTasksLoading(false));

          // 5. Work Item Links
          setIsLinksLoading(true);
          Promise.all([
            getWorkItemLinks('Task', Number(taskId)).catch(() => null),
            getLinkTypes('Task').catch(() => null),
          ]).then(([workItemLinksRes, linkTypesRes]) => {
            if (workItemLinksRes) {
              const _links = workItemLinksRes.links ?? [];
              setWorkItemLinks(_links);
              setLinkedTasksOpen(_links.length > 0);
            }
            if (linkTypesRes) {
              setLinkTypes(Array.isArray(linkTypesRes) ? linkTypesRes : []);
            }
          }).finally(() => setIsLinksLoading(false));

          // 6. Checklist — ChecklistSection loads its own rows; this only
          //    seeds the collapsible's initial open state and header count.
          getTaskChecklists(Number(taskId)).then(checklistRes => {
            if (checklistRes) {
              const _checklists = checklistRes.taskChecklists ?? [];
              setChecklistItems(_checklists);
              setChecklistOpen(_checklists.length > 0);
            }
          }).catch(() => null);

          // 7. Task Events
          setIsTaskEventsLoading(true);
          getTaskEvents(Number(taskId)).then(taskEventsRes => {
            if (taskEventsRes) {
              const { taskEvents: _taskEvents } = taskEventsRes;
              setTaskEvents(_taskEvents ?? []);
              setLogHistoryOpen((_taskEvents ?? []).length > 0);
            }
          }).catch(() => null).finally(() => setIsTaskEventsLoading(false));
        } else {
          // Create mode
          if (!taskSpaceIdParam) {
            toast.error('Project Space ID is required');
            router.push('/task-management/task');
            return;
          }
          spaceId = Number(taskSpaceIdParam);

          const [spaceRes, statusRes, severityRes, resourceRes, hierarchyRes, labelsRes, ptRes] = await Promise.all([
            getTaskSpaceById(spaceId),
            getTaskSpaceStatusConfig(spaceId),
            getTaskSpaceSeverityConfig(spaceId),
            getTaskSpaceResourcesConfig(spaceId),
            getHierarchyLevelConfig(spaceId),
            getLabelsByTaskSpace(spaceId).catch(() => []),
            preParentTaskId ? getTaskById(Number(preParentTaskId)).catch(() => null) : Promise.resolve(null),
          ]);

          const space = spaceRes.data ?? spaceRes;
          const statuses: any[] = statusRes.statuses ?? [];
          setConfig({
            taskSpace: space,
            statuses,
            severities: severityRes.severities ?? [],
            resources: resourceRes.resources ?? [],
            hierarchyLevels: Array.isArray(hierarchyRes) ? hierarchyRes : [],
          });

          setAvailableLabels(Array.isArray(labelsRes) ? labelsRes : []);

          if (ptRes) {
            setParentTaskInfo({ id: ptRes.id, name: ptRes.name, code: ptRes.code });
          }

          const defaultStatusId = preStatusId
            ? Number(preStatusId)
            : statuses[0]?.id;

          // Auto-select hierarchy level: find by sequence from URL param, or fall back to first level
          const levels: any[] = Array.isArray(hierarchyRes) ? hierarchyRes : [];
          const sortedLevels = [...levels].sort((a, b) => a.sequence - b.sequence);
          const defaultHierarchyLevelId = preHierarchyLevelSequence !== null
            ? (sortedLevels.find((l) => l.sequence === Number(preHierarchyLevelSequence))?.id ?? sortedLevels[0]?.id)
            : sortedLevels[0]?.id;

          // Peek at the next code WITHOUT incrementing the counter.
          // The real code is generated atomically by createTask on save.
          try {
            if (defaultHierarchyLevelId) {
              const { code } = await peekNextTaskCode(
                spaceId,
                defaultHierarchyLevelId,
                preParentTaskId ? Number(preParentTaskId) : null,
              );
              setNextTaskCode(code);
            }
          } catch {
            // Non-blocking — code will show as empty if API unavailable
          }

          setFormData((p) => ({
            ...p,
            taskSpaceId: spaceId,
            statusId: defaultStatusId,
            hierarchyLevelConfigId: defaultHierarchyLevelId,
            parentTaskId: preParentTaskId ? Number(preParentTaskId) : undefined,
            // Pre-fill both start and end date from the calendar-clicked date
            startDate: preStartDate ?? undefined,
            dueDate: preStartDate ?? undefined,
          }));


          setBreadcrumbs([
            { label: space.name, href: meetingId ? `/task-management/task?taskSpaceId=${spaceId}&meetingId=${meetingId}` : activityId ? `/task-management/task?taskSpaceId=${spaceId}&activityId=${activityId}` : `/task-management/task?taskSpaceId=${spaceId}` },
            { label: 'New Task', isCurrentPage: true },
          ]);
        }
      } catch (err) {
        console.error('Error loading task form config:', err);
        toast.error('Failed to load form data');
      } finally {
        setIsLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- Load root task members for child tasks ----------------------------------
  // When a task has a parent (and sequence > 0) the assignee/co-assignee dropdowns
  // must show ONLY the root task's member list, not space resources.
  useEffect(() => {
    const parentId = formData.parentTaskId;
    // Use config hierarchyLevels if loaded, otherwise fall back to denormalized sequence on the task
    const seq = config?.hierarchyLevels?.find((h: any) => h.id === formData.hierarchyLevelConfigId)?.sequence
      ?? taskViewData?.hierarchyLevelSequence
      ?? 0;

    if (!parentId || seq === 0) {
      // Root-level task — no override needed
      setRootTaskMembers(null);
      return;
    }

    let cancelled = false;

    const findRootAndLoadMembers = async (pid: number): Promise<void> => {
      try {
        let currentId: number = pid;
        while (true) {
          const parent = await getTaskById(currentId);
          if (!parent.parentTaskId) {
            // Found root task
            if (cancelled) return;
            if (!cancelled) {
              setRootTask(parent);
              const allRootMembers = [];
              if (parent.assignee) {
                allRootMembers.push(parent.assignee);
              }
              const coAssignees = parent.coAssignees ?? [];
              allRootMembers.push(...coAssignees);

              const guestMembers = parent.members ?? [];
              allRootMembers.push(...guestMembers);

              // Deduplicate by id just in case
              const uniqueMap = new Map();
              allRootMembers.forEach(m => {
                if (m && m.id) uniqueMap.set(m.id, m);
              });

              setRootTaskMembers(Array.from(uniqueMap.values()));
            }
            return;
          }
          currentId = parent.parentTaskId;
        }
      } catch {
        if (!cancelled) setRootTaskMembers([]);
      }
    };

    findRootAndLoadMembers(parentId);
    return () => { cancelled = true; };
  }, [formData.parentTaskId, formData.hierarchyLevelConfigId, config?.hierarchyLevels]);

  // -- Reload work item links (after link/unlink) -----------------------------
  const reloadWorkItemLinks = useCallback(async () => {
    if (!taskId) return;
    try {
      const res = await getWorkItemLinks('Task', Number(taskId));
      setWorkItemLinks(res.links ?? []);
    } catch {
      /* ignore */
    }
  }, [taskId]);

  // -- Submit -----------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Title is required'); return; }
    if (!formData.taskSpaceId) { toast.error('Project Space is required'); return; }

    const payload = {
      ...formData,
      estimateEffort: formData.estimateEffort ? Number(formData.estimateEffort) : undefined,
      actualEffort: formData.actualEffort ? Number(formData.actualEffort) : undefined,
      labelIds: taskLabels.map((l) => l.id),
      divisionId: config?.taskSpace?.divisionId,
    };

    try {
      setIsSaving(true);
      if (isEditMode) {
        await updateTask(Number(taskId), payload);
        toast.success('Task updated');
        router.push(`/task-management/task${formData.taskSpaceId ? `?taskSpaceId=${formData.taskSpaceId}${meetingId ? `&meetingId=${meetingId}` : ''}` : ''}`);
      } else {
        if (!formData.hierarchyLevelConfigId) {
          toast.error('Hierarchy level is required');
          return;
        }
        // Fetch the next code at submit time (self-corrects any inflated counter).
        // This avoids incrementing the counter on form open while still ensuring
        // the backend create path receives a known code.
        const { code } = await getNextTaskCode(
          formData.taskSpaceId,
          formData.hierarchyLevelConfigId,
          formData.parentTaskId ?? null,
        );
        const newTask = await createTask({ ...payload, code });

        if (!formData.parentTaskId && user?.id) {
          const isSpaceMember = (config?.resources ?? []).some((r: any) => r.id === user.id);
          if (!isSpaceMember) {
            try {
              await addResourceToTaskSpace(formData.taskSpaceId, user.id);
              setConfig((prev: any) => ({
                ...prev,
                resources: [...(prev?.resources ?? []), { ...user, id: user.id }]
              }));
            } catch (err) {
              console.error('Failed to add user as space guest member', err);
            }
          }
        }
        // If we came from pulse meeting link flow, auto-link & redirect to pulse
        if (meetingId && newTask?.id) {
          await setMeetingActionState(Number(meetingId), { state: 'linked_to_task', taskId: newTask.id });
          toast.success('Task created and linked to meeting');
          router.push('/pulse');
        } else if (activityId && newTask?.id) {
          await linkTaskToActivity(Number(activityId), { taskId: newTask.id });
          toast.success('Task created and linked to activity');
          router.push('/pulse');
        } else {
          toast.success('Task created');
          router.push(`/task-management/task${formData.taskSpaceId ? `?taskSpaceId=${formData.taskSpaceId}` : ''}`);
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} task`);
    } finally {
      setIsSaving(false);
    }

  };

  const handleCancel = () => {
    const base = formData.taskSpaceId
      ? `/task-management/task?taskSpaceId=${formData.taskSpaceId}`
      : '/task-management/task';
    router.push(base);
  };

  // Actual effort is derived server-side from the cumulative work-log effort.
  // Every log create/update/delete returns the recalculated value.
  const applyActualEffort = (actualEffort?: number | null) => {
    if (actualEffort === undefined || actualEffort === null) return;
    const val = String(actualEffort);
    set('actualEffort', val);
    if (formDataSnapshot.current) {
      formDataSnapshot.current = { ...formDataSnapshot.current, actualEffort: val };
    }
  };

  const handleSaveLog = async () => {
    if (!taskId || !user) return;
    const { startTimeDate, endTimeDate, effort, note } = newLogEntry;
    if (!startTimeDate || !endTimeDate || !effort) {
      toast.error('Start date, end date, and effort are required');
      return;
    }
    setIsAddingLog(true);
    try {
      const resourceType =
        user.email === selectedAssignee?.email
          ? AssigneeType.ASS
          : AssigneeType.SBASS;

      const payload = {
        postId: Number(taskId),
        postCode: nextTaskCode,
        postType: 'Task' as any,
        resourceId: user.id,
        resourceName: `${user.first_name} ${user.last_name}`,
        resourceEmail: user.email,
        resourceType,
        startTimeDate: format(startTimeDate, 'yyyy-MM-dd'),
        endTimeDate: format(endTimeDate, 'yyyy-MM-dd'),
        effort: Number(effort),
        note: note || null,
      };
      const newLog = await createResourceLog(payload);
      setLogHistory([newLog, ...logHistory]);
      applyActualEffort(newLog?.actualEffort);
      setNewLogEntry({ startTimeDate: null, endTimeDate: null, effort: '', note: '' });
      toast.success('Log entry saved');
    } catch (error) {
      toast.error('Failed to save log entry');
    } finally {
      setIsAddingLog(false);
    }
  };

  const handleUpdateLog = async () => {
    if (!editingLogId || !editingLogEntry) return;

    const { startTimeDate, endTimeDate, effort } = editingLogEntry;
    if (!startTimeDate || !endTimeDate || !effort) {
      toast.error('Start date, end date, and effort are required');
      return;
    }

    setIsAddingLog(true); // Reuse the loading state for now
    try {
      const payload = {
        startTimeDate: format(startTimeDate, 'yyyy-MM-dd'),
        endTimeDate: format(endTimeDate, 'yyyy-MM-dd'),
        effort: Number(effort),
      };
      const updatedLog = await updateResourceLog(editingLogId, payload);
      setLogHistory(logHistory.map((log) => (log.id === editingLogId ? updatedLog : log)));
      applyActualEffort(updatedLog?.actualEffort);
      setEditingLogId(null);
      setEditingLogEntry(null);
      toast.success('Log entry updated');
    } catch (error) {
      toast.error('Failed to update log entry');
    } finally {
      setIsAddingLog(false);
    }
  };

  const handleDeleteLog = async (logId: number) => {
    try {
      const res = await deleteResourceLog(logId);
      setLogHistory(logHistory.filter((log) => log.id !== logId));
      applyActualEffort(res?.actualEffort);
      toast.success('Log entry deleted');
    } catch (error) {
      toast.error('Failed to delete log entry');
    }
  };

  // Phase-1 resource lookup map (assignee + coAssignees + members embedded in task)
  const taskViewResourceById = useMemo(() => {
    if (!taskViewData) return {} as Record<number, any>;
    const map: Record<number, any> = {};
    [...(taskViewData.coAssignees ?? []), ...(taskViewData.members ?? [])].forEach((r: any) => { map[r.id] = r; });
    if (taskViewData.assignee) map[taskViewData.assignee.id] = taskViewData.assignee;
    return map;
  }, [taskViewData]);

  const selectedAssignee =
    config?.resources?.find((r) => r.id === formData.assigneeId) ??
    memberResourceCache[formData.assigneeId!] ??
    taskViewData?.assignee;

  // When the task is a child (parentTaskId set), use root task members
  // for assignee/co-assignee dropdowns. rootTaskMembers===null means still loading.
  const isChildTask = !!formData.parentTaskId;
  // Use config resources when loaded; fall back to phase-1 embedded resources (same as task card/table)
  const allKnownResources: any[] = (() => {
    const base = config?.resources?.length ? config.resources : Object.values(taskViewResourceById);
    const map = new Map<number, any>(base.map((r: any) => [r.id, r]));
    Object.values(memberResourceCache).forEach((r: any) => map.set(r.id, r));
    return Array.from(map.values());
  })();

  // For root tasks: build the own-member objects from phase-1 embedded members + allKnownResources,
  // then filter to formData.memberIds so unsaved changes are reflected.
  // This mirrors how TaskCard/TaskTableView use task.members objects directly.
  const rootOwnMembers: any[] = (() => {
    if (isChildTask || !formData.memberIds?.length) return [];
    // Prefer full resource objects: phase-1 embedded members take priority, overridden by config resources
    const byId: Record<number, any> = {};
    (taskViewData?.members ?? []).forEach((r: any) => { byId[r.id] = r; });
    allKnownResources.forEach((r: any) => { byId[r.id] = r; });
    return formData.memberIds.map((id) => byId[id]).filter(Boolean);
  })();

  // rootTaskMembers (child-task member restriction) doesn't carry a `skills` array —
  // only allKnownResources (config.resources) does. Enrich by resource id so the skill
  // picker/prompt still works when the assignee list is member-restricted.
  const enrichWithSkills = (list: any[]): any[] => {
    if (allKnownResources.length === 0) return list;
    const skillsById = new Map(allKnownResources.map((r: any) => [r.id, r.skills]));
    return list.map((m: any) => (m.skills ? m : { ...m, skills: skillsById.get(m.id) ?? [] }));
  };

  const effectiveTaskMembers: any[] = isChildTask
    ? (rootTaskMembers !== null ? enrichWithSkills(rootTaskMembers) : [])
    : enrichWithSkills(rootOwnMembers);

  const effectiveResources: any[] = (() => {
    const base = [...allKnownResources];
    effectiveTaskMembers.forEach(m => {
      if (m && !base.some(br => br.id === m.id)) {
        base.push(m);
      }
    });
    return base;
  })();

  const filteredResources = (search: string) =>
    effectiveResources.filter((r) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return `${r.first_name ?? ''} ${r.last_name ?? ''}`.toLowerCase().startsWith(q) ||
        r.email?.toLowerCase().startsWith(q);
    });

  const canViewLogs = useMemo(() => {
    if (!user) return false;
    const assigneeEmail = selectedAssignee?.email;
    const coAssigneeEmails = (taskViewData?.coAssignees ?? []).map((ca: any) => ca.email);
    const hasLoggedWork = logHistory.some(log => log.resourceEmail === user.email);
    return user.email === assigneeEmail || coAssigneeEmails.includes(user.email) || hasLoggedWork;
  }, [user, selectedAssignee, taskViewData?.coAssignees, logHistory]);

  const canEditLogs = useMemo(() => {
    if (!user) return false;
    const assigneeEmail = selectedAssignee?.email;
    const coAssigneeEmails = (taskViewData?.coAssignees ?? []).map((ca: any) => ca.email);
    return user.email === assigneeEmail || coAssigneeEmails.includes(user.email);
  }, [user, selectedAssignee, taskViewData?.coAssignees]);


  const formStatusComplete = (() => {
    const s = config?.statuses?.find((s: any) => s.id === formData.statusId) ?? taskViewData?.status;
    return s?.base === 'Finished';
  })();

  const sortedLogHistory = useMemo(() => {
    return [...logHistory].sort((a: any, b: any) => {
      const dateA = a.startTimeDate ? new Date(a.startTimeDate).getTime() : 0;
      const dateB = b.startTimeDate ? new Date(b.startTimeDate).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [logHistory]);

  const totalLogPages = Math.ceil(sortedLogHistory.length / LOG_PAGE_SIZE);
  const paginatedLogs = sortedLogHistory.slice(
    (logPage - 1) * LOG_PAGE_SIZE,
    logPage * LOG_PAGE_SIZE
  );

  const childrenHaveDates = useMemo(() => {
    return childTasks.some((c: any) => c.startDate || c.dueDate || c.actualStartDate || c.actualEndDate);
  }, [childTasks]);

  const childrenHaveEffort = useMemo(() => {
    return childTasks.some((c: any) => c.estimateEffort || c.actualEffort);
  }, [childTasks]);

  // Actual effort is additive: children roll-up + this task's own work logs.
  // The children part is known from the loaded child tasks, so the own-logs
  // part is whatever is left over in the stored total.
  const actualEffortBreakdown = useMemo(() => {
    const total = Number(formData.actualEffort) || 0;
    const fromChildren = childTasks.reduce(
      (sum: number, c: any) => sum + (Number(c.actualEffort) || 0),
      0,
    );
    const fromOwnLogs = Math.max(0, Number((total - fromChildren).toFixed(2)));
    return { total, fromChildren, fromOwnLogs, hasChildren: childTasks.length > 0 };
  }, [formData.actualEffort, childTasks]);

  const dateDisabledTooltip = "Dates rolled up from children";

  // The form now renders immediately, showing granular loaders in dropdowns instead.

  return (
    <div className="flex flex-col h-full bg-background pt-8">
      {/* Back to Pulse banner — only shown when navigating from Pulse link-task flow */}
      {meetingId && (
        <div className="flex-none px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 flex items-center gap-2">
          <Info className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
          <span className="text-xs text-yellow-600 dark:text-yellow-500">You are viewing this task from the Pulse meeting link flow. Edit freely — use the back button to return and link.</span>
        </div>
      )}
      <div className="flex-1 overflow-hidden flex">

        {/* -- Left ? main content ------------------------------------------- */}
        <div className="flex flex-col"
          style={{ width: '60%' }}>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Task Code */}
            <div className="space-y-1">
              <Label className="text-sm">Code</Label>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Icon + code colored by hierarchy level */}
                {(() => {
                  const hl = config?.hierarchyLevels?.find((h: any) => h.id === formData.hierarchyLevelConfigId)
                    ?? taskViewData?.hierarchyLevelConfig;
                  const HLIcon = hl?.icon ? getHierarchyLevelIcon(hl.icon) : Folder;
                  const hlColor = hl?.color;
                  return (
                    <div className="flex items-center gap-2">
                      {isLoading || isConfigLoading ? (
                        <>
                          <Skeleton className="w-5 h-5 rounded-md" />
                          <Skeleton className="h-6 w-24" />
                        </>
                      ) : (
                        <>
                          <HLIcon
                            className="w-5 h-5 flex-shrink-0"
                            style={hlColor ? { color: hlColor } : undefined}
                          />
                          <span
                            className="text-md font-semibold tracking-wide"
                            style={{ color: '#3B82F6' }}
                          >
                            {nextTaskCode || ((config?.taskSpace?.prefix ?? taskViewData?.taskSpace?.prefix) ? `${config?.taskSpace?.prefix ?? taskViewData?.taskSpace?.prefix}-?` : '-')}
                          </span>
                        </>
                      )}
                      <button
                        type="button"
                        title={formData.special ? 'Special task - click to unmark' : 'Mark as special'}
                        onClick={async () => {
                          const next = !formData.special;
                          set('special', next);
                          if (isEditMode && taskId) {
                            try {
                              beginAutoSave();
                              const res = await patchTaskSpecial(Number(taskId), next, updatedBy);
                              syncMeta(res);
                            }
                            catch { endAutoSave(); set('special', !next); }
                          }
                        }}
                        className={`flex-shrink-0 cursor-pointer rounded border-none outline-none focus:outline-none bg-transparent shadow-none p-0 transition-colors ${formData.special ? 'text-primary hover:text-primary/80' : 'text-muted-foreground/30 hover:text-primary'}`}
                      >
                        <Star className="w-5 h-5" fill={formData.special ? "currentColor" : "none"} />
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm">
                Title <span className="text-red-500">*</span>
              </Label>
              {isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Input
                  id="name"
                  placeholder="Provide a brief summary of the task..."
                  value={formData.name}
                  onChange={(e) => set('name', e.target.value)}
                  onBlur={async (e) => {
                    if (!isEditMode || !taskId) return;
                    const name = e.target.value.trim();
                    if (!name || name === formDataSnapshot.current?.name) return;
                    try {
                      beginAutoSave();
                      const res = await patchTaskName(Number(taskId), name, formDataSnapshot.current?.name ?? null, updatedBy);
                      formDataSnapshot.current = { ...formDataSnapshot.current!, name };
                      syncMeta(res);
                      toast.success('Title saved');
                    } catch { endAutoSave(); toast.error('Failed to save title'); }
                  }}
                  required
                  className="bg-white dark:bg-gray-900 shadow-none placeholder:opacity-80"
                />
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm">Description</Label>

              {/* Unified wrapper container to hold both editor and handle the click-outside save */}
              {isLoading ? (
                <Skeleton className="h-[180px] w-full" />
              ) : (
                <div
                  className="overflow-hidden rounded-md border border-input bg-white dark:bg-gray-900 focus-within:ring-1 focus-within:ring-ring h-[180px] flex flex-col"
                  onBlur={async (e) => {
                    // If the newly focused element is still INSIDE this container (like a toolbar button), do nothing.
                    if (e.currentTarget.contains(e.relatedTarget)) return;

                    // If we aren't in edit mode, or missing an ID, do nothing.
                    if (!isEditMode || !taskId) return;

                    // Optional but highly recommended: Only trigger the API call if the text ACTUALLY changed
                    if (formDataSnapshot.current?.description === formData.description) return;

                    try {
                      beginAutoSave();
                      const res = await patchTaskDescription(Number(taskId), formData.description, updatedBy);
                      formDataSnapshot.current = { ...formDataSnapshot.current!, description: formData.description };
                      syncMeta(res);
                      toast.success('Description saved');
                    } catch {
                      toast.error('Failed to save description');
                    } finally {
                      endAutoSave();
                    }
                  }}
                >
                  <RichTextEditor
                    value={formData.description}
                    onChange={(v) => {
                      set('description', v);
                    }}
                    placeholder="Provide details of the task..."
                    className="border-0 h-full flex flex-col rounded-none"
                    editorClassName="flex-1 min-h-0 overflow-y-auto"
                  />
                </div>
              )}
            </div>

            {/* Comments (edit mode only) */}
            {isEditMode && taskId && (
              <>
                <Collapsible open={commentsOpen} onOpenChange={setCommentsOpen}>
                  <CollapsibleTrigger asChild>
                    <button type="button" className="flex items-center gap-2 w-full text-left">
                      <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200', !commentsOpen && '-rotate-90')} />
                      <span className="text-sm font-medium">Comments</span>
                      {commentCount > 0 && <span className="text-xs text-muted-foreground ml-1">({commentCount})</span>}
                    </button>
                  </CollapsibleTrigger>
                  {/* Use a plain div (not CollapsibleContent) so CommentSection is always mounted,
                      allowing it to fetch on load and call onCommentCountChange to auto-expand */}
                  <div className={cn('mt-3', !commentsOpen && 'hidden')}>
                    <CommentSection
                      postId={Number(taskId)}
                      postType="Task"
                      onCommentCountChange={(count) => {
                        setCommentCount(count);
                        if (count > 0) setCommentsOpen(true);
                      }}
                    />
                  </div>
                </Collapsible>
              </>
            )}

            {/* Attachments */}
            <Separator />
            <Collapsible open={attachmentsOpen} onOpenChange={setAttachmentsOpen}>
              <CollapsibleTrigger asChild>
                <button type="button" className="flex items-center gap-2 w-full text-left">
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200', !attachmentsOpen && '-rotate-90')} />
                  <span className="text-sm font-medium">Attachments</span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <AttachmentSection
                  entityType="Task"
                  entityId={isEditMode && taskId ? Number(taskId) : undefined}
                  pendingFiles={[]}
                  onPendingFilesChange={() => { }}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Child Tasks (edit mode only) */}
            {isEditMode && (isChildTasksLoading || childTasks.length > 0) && (() => {
              const totalPages = Math.ceil(childTasks.length / CHILD_PAGE_SIZE);
              const paginated = childTasks.slice((childPage - 1) * CHILD_PAGE_SIZE, childPage * CHILD_PAGE_SIZE);
              // Derive child level name from the first child's hierarchy level config
              const firstChild = childTasks[0];
              const childHL =
                config?.hierarchyLevels?.find((h: any) => h.id === firstChild?.hierarchyLevelConfigId) ??
                firstChild?.hierarchyLevelConfig ??
                ((firstChild?.hierarchyLevelIcon || firstChild?.hierarchyLevelColor || firstChild?.hierarchyLevelName)
                  ? { name: firstChild.hierarchyLevelName }
                  : null);
              const childLevelName = childHL?.name ? `${childHL.name}s` : 'Child Tasks';
              return (
                <>
                  <Separator />
                  <Collapsible open={childTasksOpen} onOpenChange={setChildTasksOpen}>
                    <CollapsibleTrigger asChild>
                      <button type="button" className="flex items-center gap-2 w-full text-left">
                        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200', !childTasksOpen && '-rotate-90')} />
                        <span className="text-sm font-medium">{childLevelName}</span>
                        {!isChildTasksLoading && <span className="text-xs text-muted-foreground ml-1">({childTasks.length})</span>}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <div className="overflow-x-auto rounded-md border border-border bg-white dark:bg-gray-900">
                        {isChildTasksLoading ? (
                          <div className="p-4 flex justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                          </div>
                        ) : (
                          <table className="w-full text-xs bg-white dark:bg-gray-900">
                            <thead>
                              <tr className="bg-gray-50 dark:bg-gray-900/60 border-b border-border uppercase">
                                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-44">Code</th>
                                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-24">Severity</th>
                                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-28">Status</th>
                                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-36">Dates</th>
                                <th className="px-3 py-2 text-right font-medium text-muted-foreground w-10">Assignee</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginated.map((child: any) => {
                                const childStatus = config?.statuses?.find((s) => s.id === child.statusId) ?? child.status;
                                const childSeverity = config?.severities?.find((s) => s.id === child.severityId) ?? child.severity;
                                const childAssignee = config?.resources?.find((r) => r.id === child.assigneeId) ?? child.assignee;
                                const childHL =
                                  config?.hierarchyLevels?.find((h) => h.id === child.hierarchyLevelConfigId) ??
                                  child.hierarchyLevelConfig ??
                                  ((child.hierarchyLevelIcon || child.hierarchyLevelColor || child.hierarchyLevelName)
                                    ? { icon: child.hierarchyLevelIcon, color: child.hierarchyLevelColor, name: child.hierarchyLevelName }
                                    : null);
                                const ChildHLIcon = childHL?.icon ? getHierarchyLevelIcon(childHL.icon) : Folder;
                                const hlColor = childHL?.color || '#6B7280';
                                const isChildStatusComplete = childStatus?.base === 'Finished';
                                const isOverdue =
                                  child.dueDate &&
                                  new Date(child.dueDate) < new Date() &&
                                  (child.progressPercentage ?? 0) < 100 &&
                                  !isChildStatusComplete;

                                return (
                                  <tr
                                    key={child.id}
                                    className="border-b border-border last:border-0 transition-colors"
                                  >
                                    {/* Code: icon + code + open-in-new-tab */}
                                    <td className="px-3 py-2.5 w-24 max-w-[96px]">
                                      <div className="flex items-center gap-1.5 min-w-0 group/code overflow-hidden">
                                        <ChildHLIcon className="w-3 h-3 flex-shrink-0" style={{ color: hlColor }} />
                                        <span
                                          className="font-semibold tracking-wide truncate flex-shrink-0 text-blue-500"
                                        >
                                          {child.code}
                                        </span>
                                        <button
                                          type="button"
                                          title="Open in new tab"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(`/task-management/task/form?id=${child.id}`, '_blank');
                                          }}
                                          className="opacity-0 group-hover/code:opacity-100 transition-opacity flex-shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-blue-500"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </td>

                                    {/* Name */}
                                    <td className="px-3 py-2.5 max-w-0">
                                      <span className="font-medium text-gray-800 dark:text-gray-200 truncate block">{child.name}</span>
                                    </td>

                                    {/* Severity */}
                                    <td className="px-3 py-2.5 w-28">
                                      {childSeverity ? (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium whitespace-nowrap">
                                          <Flag className="w-3 h-3 flex-shrink-0" fill={childSeverity.color} style={{ color: childSeverity.color }} />
                                          <span className="text-gray-700 dark:text-gray-300">{childSeverity.name}</span>
                                        </span>
                                      ) : <span className="text-muted-foreground">-</span>}
                                    </td>

                                    {/* Status */}
                                    <td className="px-3 py-2.5 w-28">
                                      {childStatus ? (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium whitespace-nowrap">
                                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: childStatus.color }} />
                                          <span className="text-gray-700 dark:text-gray-300">{childStatus.name}</span>
                                        </span>
                                      ) : <span className="text-muted-foreground">-</span>}
                                    </td>

                                    {/* Date range badge */}
                                    <td className="px-3 py-2.5 w-36">
                                      {(child.startDate || child.dueDate) ? (
                                        <span
                                          className={cn(
                                            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium border whitespace-nowrap',
                                            isOverdue
                                              ? 'border-red-500 text-gray-600 dark:text-gray-400'
                                              : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400',
                                          )}
                                        >
                                          {isOverdue
                                            ? <AlertTriangle className="w-3 h-3 shrink-0 text-red-500" />
                                            : <CalendarDays className="w-3 h-3 shrink-0" />}
                                          {child.startDate && format(new Date(child.startDate), 'LLL dd')}
                                          {child.startDate && child.dueDate && ' – '}
                                          {child.dueDate && format(new Date(child.dueDate), 'LLL dd')}
                                        </span>
                                      ) : <span className="text-muted-foreground">-</span>}
                                    </td>

                                    {/* Assignee - avatar only */}
                                    <td className="px-3 py-2.5 w-10">
                                      <div className="flex justify-end">
                                        {childAssignee ? (
                                          <UserAvatar
                                            firstName={childAssignee.first_name}
                                            lastName={childAssignee.last_name}
                                            profilePic={childAssignee.profile_pic}
                                            size="xs"
                                          />
                                        ) : <span className="text-muted-foreground">-</span>}
                                      </div>
                                    </td>

                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-muted-foreground">
                            {(childPage - 1) * CHILD_PAGE_SIZE + 1} – {Math.min(childPage * CHILD_PAGE_SIZE, childTasks.length)} of {childTasks.length}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              disabled={childPage === 1}
                              onClick={() => setChildPage((p) => Math.max(1, p - 1))}
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </Button>
                            <span className="text-xs text-muted-foreground px-1">{childPage} / {totalPages}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              disabled={childPage === totalPages}
                              onClick={() => setChildPage((p) => Math.min(totalPages, p + 1))}
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </>
              );
            })()}

            {/* -- Linked Tasks / Tickets (edit mode only) ------------------ */}
            {isEditMode && taskId && (
              <>
                <Separator />
                <Collapsible open={linkedTasksOpen} onOpenChange={setLinkedTasksOpen}>
                  <CollapsibleTrigger asChild>
                    <button type="button" className="flex items-center gap-2 w-full text-left">
                      <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200', !linkedTasksOpen && '-rotate-90')} />
                      <span className="text-sm font-medium">{workItemLinks.length > 0 ? 'Linked Tasks & Tickets' : 'Link Tasks & Tickets'}</span>
                      {workItemLinks.length > 0 && <span className="text-xs text-muted-foreground ml-1">({workItemLinks.length})</span>}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-2">
                    {isLinksLoading ? (
                      <div className="p-4 flex justify-center border border-border rounded-md">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <>{(() => {
                        const totalPages = Math.ceil(workItemLinks.length / LINKED_PAGE_SIZE);
                        const paginated = workItemLinks.slice((linkedPage - 1) * LINKED_PAGE_SIZE, linkedPage * LINKED_PAGE_SIZE);
                        const handleUnlink = async (linkId: number) => {
                          const prev = workItemLinks;
                          const next = workItemLinks.filter((l) => l.linkId !== linkId);
                          setWorkItemLinks(next);
                          if (linkedPage > Math.max(1, Math.ceil(next.length / LINKED_PAGE_SIZE))) setLinkedPage(1);
                          try { await deleteWorkItemLink(linkId); toast.success('Link removed'); }
                          catch { setWorkItemLinks(prev); toast.error('Failed to remove link'); }
                        };
                        return (
                          <>
                            <div className="rounded-md border border-border bg-white dark:bg-gray-900">
                              <div className="overflow-x-auto scrollbar-thin">
                                <table className="w-full text-xs bg-white dark:bg-gray-900">
                                  <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-900/60 border-b border-border uppercase">
                                      <th className="px-3 py-2 text-left font-medium text-muted-foreground min-w-[300px] w-80 sticky left-0 z-20 bg-gray-50 dark:bg-gray-900/90 shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#374151]">Linked Item</th>
                                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-20">Severity</th>
                                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-20">Status</th>
                                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-28">Dates</th>
                                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-14">Assignee</th>
                                      <th className="px-3 py-2 text-right font-medium text-muted-foreground w-20 sticky right-0 z-20 bg-gray-50 dark:bg-gray-900/90 shadow-[-1px_0_0_0_#e5e7eb] dark:shadow-[-1px_0_0_0_#374151]">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {paginated.map((link) => {
                                      const it = link.item;
                                      const isTicket = it.type === 'Ticket';
                                      const href = isTicket
                                        ? `/ticket-management/ticket/form?id=${it.id}`
                                        : `/task-management/task/form?id=${it.id}`;
                                      const TypeIcon = isTicket ? TicketIcon : (it.typeIcon ? getHierarchyLevelIcon(it.typeIcon) : Folder);
                                      return (
                                        <tr
                                          key={link.linkId}
                                          className="border-b border-border last:border-0 transition-colors"
                                        >
                                          <td className="px-3 py-2.5 min-w-[300px] w-80 max-w-[500px] sticky left-0 z-10 bg-white dark:bg-gray-900 shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#374151]">
                                            <div className="flex flex-row items-center gap-2 min-w-0 group/code">
                                              <span className="inline-flex items-center gap-1 px-1.5 py-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-[10px] font-medium whitespace-nowrap flex-shrink-0" title={it.type}>
                                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isTicket ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                                <span className="text-gray-700 dark:text-gray-300">{it.type}</span>
                                              </span>
                                              {link.linkTypeName && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-[10px] font-medium whitespace-nowrap flex-shrink-0">
                                                  <span className="text-gray-700 dark:text-gray-300">{link.linkTypeName}</span>
                                                </span>
                                              )}
                                              <span className="font-semibold tracking-wide flex-shrink-0 text-blue-500 text-xs whitespace-nowrap">
                                                {it.code}
                                              </span>
                                              <span className="font-medium text-gray-800 dark:text-gray-200 truncate text-xs flex-1 min-w-0" title={it.name}>{it.name}</span>
                                            </div>
                                          </td>
                                          <td className="px-3 py-2.5 w-20">
                                            {it.severityName ? (
                                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium whitespace-nowrap">
                                                <Flag className="w-3 h-3 flex-shrink-0" fill={it.severityColor || undefined} style={{ color: it.severityColor || undefined }} />
                                                <span className="text-gray-700 dark:text-gray-300">{it.severityName}</span>
                                              </span>
                                            ) : <span className="text-muted-foreground">-</span>}
                                          </td>
                                          <td className="px-3 py-2.5 w-20">
                                            {it.statusName ? (
                                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium whitespace-nowrap">
                                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: it.statusColor || '#9ca3af' }} />
                                                <span className="text-gray-700 dark:text-gray-300">{it.statusName}</span>
                                              </span>
                                            ) : <span className="text-muted-foreground">-</span>}
                                          </td>
                                          <td className="px-3 py-2.5 w-28">
                                            {(it.startDate || it.dueDate) ? (
                                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                <CalendarDays className="w-3 h-3 shrink-0" />
                                                {it.startDate && format(new Date(it.startDate), 'LLL dd')}
                                                {it.startDate && it.dueDate && ' – '}
                                                {it.dueDate && format(new Date(it.dueDate), 'LLL dd')}
                                              </span>
                                            ) : <span className="text-muted-foreground">-</span>}
                                          </td>
                                          <td className="px-3 py-2.5 w-14">
                                            <div className="flex items-center">
                                              {it.assigneeName ? (
                                                <UserAvatar
                                                  firstName={it.assigneeName.split(' ')[0]}
                                                  lastName={it.assigneeName.split(' ').slice(1).join(' ')}
                                                  profilePic={it.assigneeProfilePicUrl}
                                                  size="xs"
                                                />
                                              ) : <span className="text-muted-foreground">-</span>}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2.5 w-20 sticky right-0 z-10 bg-white dark:bg-gray-900 shadow-[-1px_0_0_0_#e5e7eb] dark:shadow-[-1px_0_0_0_#374151]">
                                            <div className="flex items-center justify-end gap-1">
                                              <Popover
                                                open={openLinkedCommentId === link.linkId}
                                                onOpenChange={(o) => setOpenLinkedCommentId(o ? link.linkId : null)}
                                              >
                                                <PopoverTrigger asChild>
                                                  <button
                                                    type="button"
                                                    title="Comments"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-0.5"
                                                  >
                                                    {(linkedCommentCounts[link.linkId] ?? 0) > 0 && (
                                                      <span className="text-[10px] font-medium text-white dark:text-gray-900 leading-none">{linkedCommentCounts[link.linkId]}</span>
                                                    )}
                                                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                                                  </button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[420px] p-3 max-h-[320px] overflow-y-auto" align="end" onClick={(e) => e.stopPropagation()}>
                                                  <div className="flex items-center justify-between mb-2">
                                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Comments</p>
                                                    <button onClick={() => setOpenLinkedCommentId(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                                      <X className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>
                                                  <CommentSection
                                                    postId={it.id}
                                                    postType={it.type}
                                                    onCommentCountChange={(count) => setLinkedCommentCounts((prev) => ({ ...prev, [link.linkId]: count }))}
                                                    readOnly
                                                  />
                                                </PopoverContent>
                                              </Popover>
                                              {link.note && (
                                                <HoverCard openDelay={100} closeDelay={50}>
                                                  <HoverCardTrigger asChild>
                                                    <button type="button" className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                                      <NotebookPen className="w-3.5 h-3.5 text-muted-foreground" />
                                                    </button>
                                                  </HoverCardTrigger>
                                                  <HoverCardContent className="w-72 max-w-[90vw] text-xs" side="left" align="start">
                                                    <p className="font-semibold mb-1 text-muted-foreground">Note</p>
                                                    <p className="whitespace-pre-wrap break-words max-h-40 overflow-y-auto text-gray-700 dark:text-gray-300">{link.note}</p>
                                                  </HoverCardContent>
                                                </HoverCard>
                                              )}
                                              <button
                                                type="button"
                                                title="Remove link"
                                                onClick={(e) => { e.stopPropagation(); handleUnlink(link.linkId); }}
                                                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-muted-foreground"
                                              >
                                                <Unlink className="w-3.5 h-3.5" />
                                              </button>
                                              <button type="button" title="Open in new tab"
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  const res = await checkWorkItemAccess(it.type, it.id);
                                                  if (!res.hasAccess) {
                                                    toast.error(res.message || "Sorry, you must be a member of the space to view this item.");
                                                    return;
                                                  }
                                                  window.open(href, '_blank');
                                                }}
                                                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-muted-foreground">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                              <div className={cn(workItemLinks.length > 0 && 'border-t border-border')}>
                                <button
                                  type="button"
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white dark:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-b-md"
                                  onClick={() => setLinkDialogOpen(true)}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Link
                                </button>
                              </div>
                            </div>

                            {totalPages > 1 && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {(linkedPage - 1) * LINKED_PAGE_SIZE + 1} – {Math.min(linkedPage * LINKED_PAGE_SIZE, workItemLinks.length)} of {workItemLinks.length}
                                </span>
                                <div className="flex items-center gap-1">
                                  <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" disabled={linkedPage === 1} onClick={() => setLinkedPage((p) => Math.max(1, p - 1))}>
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                  </Button>
                                  <span className="text-xs text-muted-foreground px-1">{linkedPage} / {totalPages}</span>
                                  <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" disabled={linkedPage === totalPages} onClick={() => setLinkedPage((p) => Math.min(totalPages, p + 1))}>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}</>)}
                  </CollapsibleContent>
                </Collapsible>
                <LinkWorkItemDialog
                  open={linkDialogOpen}
                  onOpenChange={setLinkDialogOpen}
                  currentType="Task"
                  currentId={Number(taskId)}
                  linkTypes={linkTypes}
                  linkedKeys={new Set(workItemLinks.map((l) => `${l.item.type}:${l.item.id}`))}
                  onLinked={reloadWorkItemLinks}
                />
              </>
            )}

            {/* -- Checklist (edit mode only) -------------------------------- */}
            {isEditMode && taskId && (
              <>
                <Separator />
                <Collapsible open={checklistOpen} onOpenChange={setChecklistOpen}>
                  <CollapsibleTrigger asChild>
                    <button type="button" className="flex items-center gap-2 w-full text-left">
                      <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200', !checklistOpen && '-rotate-90')} />
                      <span className="text-sm font-medium">Checklist</span>
                      {checklistItems.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({checklistItems.filter((i) => i.isChecked).length}/{checklistItems.length})
                        </span>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <ChecklistSection
                      entityType="Task"
                      entityId={Number(taskId)}
                      resources={effectiveResources}
                      memberIds={(config?.resources ?? []).map((r: any) => r.id)}
                      isResourcesLoading={isChildTask ? rootTaskMembers === null : !config}
                      onSaved={(at) => setAutoSavedAt(at)}
                      onItemsChange={setChecklistItems}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {/* -- Log History (edit mode only) ------------------------------ */}
            {isEditMode && taskId && (isTaskEventsLoading || taskEvents.length > 0) && (() => {
              // Build email → resource lookup from all available sources
              const emailToResource: Record<string, any> = {};
              const allResources = [
                ...(config?.resources ?? []),
                ...(taskViewData?.members ?? []),
                ...(taskViewData?.coAssignees ?? []),
                ...(Object.values(memberResourceCache) ?? []),
              ];
              if (taskViewData?.assignee) allResources.push(taskViewData.assignee);
              allResources.forEach((r: any) => {
                if (r?.email) emailToResource[r.email] = r;
              });

              // Derive actor display name & initials from email or resource
              const getActorInfo = (actorId: string | null): { name: string; initials: string; profilePic?: string | null } => {
                if (!actorId) return { name: 'Unknown', initials: '' };
                const resource = emailToResource[actorId];
                if (resource) {
                  const name = `${resource.first_name ?? ''} ${resource.last_name ?? ''}`.trim() || actorId;
                  const initials = ((resource.first_name?.[0] ?? '') + (resource.last_name?.[0] ?? '')).toUpperCase() || actorId[0]?.toUpperCase() || '?';
                  return { name, initials, profilePic: resource.profile_pic };
                }
                // Fallback: derive from email (e.g. john.doe@company.com → JD)
                const parts = actorId.split('@')[0].split(/[._-]/);
                const initials = parts.slice(0, 2).map((p: string) => p[0]?.toUpperCase() ?? '').join('');
                return { name: actorId, initials: initials || '?' };
              };

              // Readable field name mapping
              const fieldLabels: Record<string, string> = {
                statusName: 'Status', statusId: 'Status',
                severityName: 'Priority', severityId: 'Priority',
                assigneeName: 'Assignee', assigneeId: 'Assignee',
                name: 'Name', description: 'Description',
                progressPercentage: 'Progress',
                estimateEffort: 'Estimate Effort', actualEffort: 'Actual Effort',
                startDate: 'Start Date', dueDate: 'Due Date',
                actualStartDate: 'Actual Start Date', actualEndDate: 'Actual End Date',
              };

              // Format date values for display in pills
              const formatFieldValue = (val: any): string => {
                if (val === null || val === undefined || val === '') return 'None';
                if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
                  const d = new Date(val);
                  if (!isNaN(d.getTime())) return format(d, 'LLL dd, yyyy');
                }
                if (typeof val === 'number' && (val === 0 || val)) return `${val}`;
                return String(val);
              };

              // Build action description for an event
              const getActionText = (ev: any): { text: string; field?: string } => {
                const t = ev.eventType as string;
                if (t === 'TASK_CREATED') return { text: 'created the task' };
                if (t === 'TASK_DELETED') return { text: 'deleted the task' };
                if (t === 'COMMENT_ADDED') return { text: 'added a comment' };
                if (t === 'STATUS_CHANGED') return { text: 'changed the Status', field: 'statusName' };
                if (t === 'SEVERITY_CHANGED') return { text: 'changed the Priority', field: 'severityName' };
                if (t === 'TASK_ASSIGNED') return { text: 'changed the Assignee', field: 'assigneeName' };
                if (t === 'NAME_CHANGED') return { text: 'renamed the task', field: 'name' };
                if (t === 'PROGRESS_CHANGED') return { text: 'updated the Progress', field: 'progressPercentage' };
                if (t === 'DATES_CHANGED') return { text: 'updated the Dates' };
                if (t === 'TASK_UPDATED' || t === 'TASK_DESCRIPTION_UPDATED') {
                  const payload = ev.payload ?? {};
                  const keys = Object.keys(payload).filter(k => !['taskId', 'id', 'updatedBy'].includes(k));
                  const labelKey = keys.find(k => fieldLabels[k]) || keys[0];
                  if (labelKey && fieldLabels[labelKey]) return { text: `updated the ${fieldLabels[labelKey]}`, field: labelKey };
                  if (labelKey) {
                    const readable = labelKey.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
                    return { text: `updated the ${readable}`, field: labelKey };
                  }
                  return { text: 'updated the task' };
                }
                // Generic fallback
                const readable = t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
                return { text: readable };
              };

              // Extract from/to pairs from payload
              const getFromTo = (ev: any, fieldHint?: string): Array<{ label: string; from: string; to: string; fromPic?: string; toPic?: string }> => {
                const payload = ev.payload ?? {};
                const t = ev.eventType as string;

                // DATES_CHANGED has multiple fields
                if (t === 'DATES_CHANGED') {
                  const pairs: Array<{ label: string; from: string; to: string }> = [];
                  ['startDate', 'dueDate'].forEach(k => {
                    const p = payload[k];
                    if (p && (p.from !== undefined || p.to !== undefined)) {
                      pairs.push({ label: fieldLabels[k] ?? k, from: formatFieldValue(p.from), to: formatFieldValue(p.to) });
                    }
                  });
                  return pairs;
                }

                // Single-field events: check fieldHint first, then all keys
                const keysToCheck = fieldHint
                  ? [fieldHint, ...Object.keys(payload).filter(k => k !== fieldHint)]
                  : Object.keys(payload);

                for (const k of keysToCheck) {
                  if (['taskId', 'id', 'updatedBy'].includes(k)) continue;
                  const p = payload[k];
                  if (p && typeof p === 'object' && ('from' in p || 'to' in p)) {
                    // Skip profile pic / url fields for display
                    if (k.toLowerCase().includes('pic') || k.toLowerCase().includes('url') || k.toLowerCase().includes('email')) continue;

                    let fromVal = formatFieldValue(p.from);
                    let toVal = formatFieldValue(p.to);

                    let fromPic: string | undefined;
                    let toPic: string | undefined;

                    // Resolve IDs to names if possible
                    if ((k === 'statusId' || k === 'statusName') && config?.statuses) {
                      const fromStatus = config.statuses.find((s: any) => String(s.id) === String(p.from));
                      const toStatus = config.statuses.find((s: any) => String(s.id) === String(p.to));
                      if (fromStatus) fromVal = fromStatus.name;
                      if (toStatus) toVal = toStatus.name;
                    } else if ((k === 'severityId' || k === 'severityName') && config?.severities) {
                      const fromSev = config.severities.find((s: any) => String(s.id) === String(p.from));
                      const toSev = config.severities.find((s: any) => String(s.id) === String(p.to));
                      if (fromSev) fromVal = fromSev.name;
                      if (toSev) toVal = toSev.name;
                    } else if ((k === 'assigneeId' || k === 'assigneeName') && config?.resources) {
                      const fromRes = config.resources.find((r: any) => String(r.id) === String(p.from));
                      const toRes = config.resources.find((r: any) => String(r.id) === String(p.to));
                      if (fromRes) fromVal = `${fromRes.first_name ?? ''} ${fromRes.last_name ?? ''}`.trim() || fromRes.email;
                      if (toRes) toVal = `${toRes.first_name ?? ''} ${toRes.last_name ?? ''}`.trim() || toRes.email;
                      fromPic = payload.assigneeProfilePicUrl?.from || payload.assigneeProfilePicture?.from || fromRes?.profile_picture;
                      toPic = payload.assigneeProfilePicUrl?.to || payload.assigneeProfilePicture?.to || toRes?.profile_picture;
                    }

                    if (k === 'assigneeName') {
                      fromPic = payload.assigneeProfilePicUrl?.from || payload.assigneeProfilePicture?.from;
                      toPic = payload.assigneeProfilePicUrl?.to || payload.assigneeProfilePicture?.to;
                    }

                    return [{ label: fieldLabels[k] ?? k, from: fromVal, to: toVal, fromPic, toPic }];
                  }
                }
                return [];
              };

              // Use primary color for avatar background
              const getAvatarColor = (email: string | null): string => {
                return 'bg-primary';
              };

              return (
                <>
                  <Separator />
                  <Collapsible open={logHistoryOpen} onOpenChange={setLogHistoryOpen}>
                    <CollapsibleTrigger asChild>
                      <button type="button" className="flex items-center gap-2 w-full text-left">
                        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200', !logHistoryOpen && '-rotate-90')} />
                        <span className="text-sm font-medium">Log History</span>
                        {!isTaskEventsLoading && <span className="text-xs text-muted-foreground ml-1">({taskEvents.length})</span>}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      {isTaskEventsLoading ? (
                        <div className="p-4 flex justify-center border border-border rounded-md">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                      ) : (
                        <div className="space-y-0">
                          {[...taskEvents].sort((a, b) => {
                            const isACreated = a.eventType?.includes('CREATED');
                            const isBCreated = b.eventType?.includes('CREATED');
                            if (isACreated && !isBCreated) return 1;
                            if (!isACreated && isBCreated) return -1;
                            const aTime = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
                            const bTime = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
                            return bTime - aTime;
                          }).slice(0, visibleLogHistoryCount).map((ev: any, idx: number) => {
                            const actor = getActorInfo(ev.actorId);
                            const { text: actionText, field: actionField } = getActionText(ev);
                            const fromToPairs = getFromTo(ev, actionField);
                            const avatarBg = getAvatarColor(ev.actorId);
                            const occurredDate = ev.occurredAt ? new Date(ev.occurredAt) : null;
                            const relativeTimeStr = occurredDate ? formatRelativeTime(occurredDate) : '';
                            const visibleEventsLength = Math.min(taskEvents.length, visibleLogHistoryCount);
                            const isLast = idx === visibleEventsLength - 1;

                            return (
                              <div key={ev.id ?? idx} className="flex gap-3">
                                {/* Timeline column: avatar + connector line */}
                                <div className="flex flex-col items-center flex-shrink-0">
                                  {/* Avatar */}
                                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white dark:text-gray-900 text-xs font-semibold flex-shrink-0 overflow-hidden', avatarBg)}>
                                    {actor.profilePic ? (
                                      <img src={actor.profilePic} alt={actor.name} className="w-full h-full object-cover" />
                                    ) : (
                                      actor.initials
                                    )}
                                  </div>
                                  {/* Connector line */}
                                  {(!isLast || visibleLogHistoryCount < taskEvents.length || visibleLogHistoryCount > 5) && (
                                    <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 my-1" />
                                  )}
                                </div>

                                {/* Content column */}
                                <div className={cn('flex-1 min-w-0', (!isLast || visibleLogHistoryCount < taskEvents.length || visibleLogHistoryCount > 5) && 'pb-4')}>
                                  {/* Row 1: actor name + action */}
                                  <div className="flex items-center gap-1 flex-wrap text-xs">
                                    <span className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{actor.name}</span>
                                    <span className="text-gray-600 dark:text-gray-400">{actionText}</span>
                                  </div>
                                  {/* Row 2: date & time */}
                                  <div className="text-[11px] text-muted-foreground mt-0.5">
                                    {relativeTimeStr}
                                  </div>
                                  {/* Row 3: from → to pills (if applicable) */}
                                  {fromToPairs.length > 0 && (
                                    <div className="mt-1.5 flex flex-col gap-1">
                                      {fromToPairs.map((pair, pi) => (
                                        <div key={pi} className="flex items-center gap-1.5 flex-wrap">
                                          <span className="inline-flex items-center text-[11px] text-white dark:text-gray-900 font-medium">
                                            {(pair as any).fromPic && (
                                              <Avatar className="h-3.5 w-3.5 mr-1"><AvatarImage src={(pair as any).fromPic} /><AvatarFallback className="text-[8px] bg-primary text-white">{getInitials(pair.from)}</AvatarFallback></Avatar>
                                            )}
                                            {pair.from}
                                          </span>
                                          <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                          <span className="inline-flex items-center text-[11px] text-primary font-semibold">
                                            {(pair as any).toPic && (
                                              <Avatar className="h-3.5 w-3.5 mr-1"><AvatarImage src={(pair as any).toPic} /><AvatarFallback className="text-[8px] bg-primary text-white">{getInitials(pair.to)}</AvatarFallback></Avatar>
                                            )}
                                            {pair.to}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {(visibleLogHistoryCount < taskEvents.length || visibleLogHistoryCount > 5) && (
                            <div className="flex gap-3 pt-1">
                              {/* Empty space for avatar column to align button */}
                              <div className="w-8 flex-shrink-0" />
                              <div className="flex gap-2">
                                {visibleLogHistoryCount < taskEvents.length && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs text-primary hover:text-primary/80 h-auto py-1 px-2 -ml-2"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setVisibleLogHistoryCount(prev => prev + 5);
                                    }}
                                  >
                                    Show more
                                  </Button>
                                )}
                                {visibleLogHistoryCount > 5 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs text-muted-foreground hover:text-foreground h-auto py-1 px-2 -ml-2"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setVisibleLogHistoryCount(5);
                                    }}
                                  >
                                    Show less
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </>
              );
            })()}
          </div>

          {/* Action footer */}
          <div className="border-t bg-background p-4 flex items-center justify-between">
            {/* Left side icons */}
            <div className="flex items-center gap-4 text-primary">
              {isEditMode && (
                <>
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-75 transition-opacity"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      const link = window.location.href;
                      const subject = encodeURIComponent(`Task: ${taskViewData?.name || ''}${taskViewData?.code ? ` [${taskViewData.code}]` : ''}`);
                      window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(link)}`;
                    }}
                    className="hover:opacity-75 transition-opacity"
                    title="Share via email"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      const link = window.location.href;
                      const text = `[${taskViewData?.code || "TSK"}] ${taskViewData?.name || "Task"}`;
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
                    className="hover:opacity-75 transition-opacity"
                    title="Copy Link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Right side buttons */}
            <div className="flex items-center gap-3">
              {/* Auto-saved indicator — shown inline just before the Go Back button */}
              {isEditMode && (isAutoSaving || autoSavedAt) && (
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  {isAutoSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CircleCheck className="w-3.5 h-3.5" />
                  )}
                  {isAutoSaving
                    ? 'Saving\u2026'
                    : `Changes Saved. ${autoSavedAt!.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`}
                </span>
              )}
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                {isEditMode ? 'Go Back' : 'Cancel'}
              </Button>
              {!isEditMode && (
                <Button onClick={handleSubmit} disabled={isSaving}>
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                  ) : 'Create Task'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* -- Right sidebar ----------------------------------------------- */}
        <div className="border-l bg-background overflow-y-auto flex flex-col"
          style={{ width: '40%' }}>

          {/* -- DETAILS --------------------------------------- */}
          <div className="px-2 py-3 pb-6">
            <div className="flex flex-col gap-2">

              {/* Parent Task */}
              <div className="grid grid-cols-[110px_1fr] items-center min-h-8 rounded-md hover:bg-muted/40 transition-colors">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-1">Parent</span>
                <div className="flex items-center gap-2 px-2 py-1">
                  {isLoading ? (
                    <Skeleton className="h-5 w-32" />
                  ) : parentTaskInfo ? (
                    <div className="flex items-center gap-2 min-w-0">
                      {parentTaskInfo.code && (() => {
                        const parentHL = config?.hierarchyLevels?.find((h: any) => h.id === parentTaskInfo.hierarchyLevelConfigId);
                        const iconName = parentHL?.icon ?? parentTaskInfo.hierarchyLevelIcon;
                        const ParentHLIcon = iconName ? getHierarchyLevelIcon(iconName) : Folder;
                        const color = parentHL?.color ?? parentTaskInfo.hierarchyLevelColor;
                        return (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <ParentHLIcon className="w-3.5 h-3.5 flex-shrink-0" style={color ? { color } : undefined} />
                            <span
                              className="text-sm font-semibold cursor-pointer hover:underline"
                              style={{ color: '#3B82F6' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/task-management/task/form?id=${parentTaskInfo.id}`, '_blank');
                              }}
                              title="Open parent task"
                            >
                              {parentTaskInfo.code}
                            </span>
                          </div>
                        );
                      })()}
                      <span className="text-sm truncate text-foreground">{parentTaskInfo.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">This is a root task</span>
                  )}
                </div>
              </div>

              {/* Hierarchy Level */}
              {(isConfigLoading || isLoading || (config?.hierarchyLevels?.length ?? 0) > 0 || !!taskViewData?.hierarchyLevelConfig) && (
                <div className="grid grid-cols-[110px_1fr] items-center min-h-8 rounded-md hover:bg-muted/40 transition-colors">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-1">Level</span>
                  <div className="px-2 py-1">
                    {isConfigLoading || isLoading ? (
                      <Skeleton className="h-5 w-32" />
                    ) : (
                      <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium", (isConfigLoading || isLoading) && "opacity-50")}>
                        {(() => {
                          const hl = config?.hierarchyLevels?.find((h: any) => h.id === formData.hierarchyLevelConfigId)
                            ?? (taskViewData?.hierarchyLevelName ? {
                              id: taskViewData.hierarchyLevelConfigId,
                              name: taskViewData.hierarchyLevelName,
                              icon: taskViewData.hierarchyLevelIcon,
                              color: taskViewData.hierarchyLevelColor,
                            } : taskViewData?.hierarchyLevelConfig);
                          if (!hl) return <span className="text-xs text-muted-foreground italic whitespace-nowrap">No level</span>;
                          const HLIcon = getHierarchyLevelIcon(hl.icon);
                          return (
                            <>
                              <HLIcon className="w-3 h-3 flex-shrink-0" style={{ color: hl.color }} />
                              <span className="text-gray-700 dark:text-gray-300">{hl.name}</span>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="grid grid-cols-[110px_1fr] items-center min-h-8 rounded-md hover:bg-muted/40 transition-colors">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-1">Status</span>
                <div className="px-2 py-1">
                  {isConfigLoading || isLoading ? (
                    <Skeleton className="h-5 w-32" />
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={!config?.statuses?.length}
                          title={isConfigLoading ? 'Loading options...' : undefined}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {(() => {
                            const status = config?.statuses?.find((s: any) => s.id === formData.statusId)
                              ?? (taskViewData?.statusName ? {
                                id: taskViewData.statusId,
                                name: taskViewData.statusName,
                                color: taskViewData.statusColor,
                                base: taskViewData.statusBase,
                              } : taskViewData?.status);
                            return status ? (
                              <>
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                                <span className="text-gray-700 dark:text-gray-300">{status.name}</span>
                              </>
                            ) : (
                              <span className="text-gray-400 italic">No status</span>
                            );
                          })()}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuLabel className="text-xs">Select Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {config?.statuses?.map((s: any) => (
                          <DropdownMenuItem
                            key={s.id}
                            onClick={() => {
                              if (isEditMode && taskId) {
                                const prevId = formData.statusId;
                                set('statusId', s.id);
                                beginAutoSave();
                                patchTaskStatus(Number(taskId), s.id, undefined, undefined, updatedBy)
                                  .then((res) => {
                                    formDataSnapshot.current = { ...formDataSnapshot.current!, statusId: s.id };
                                    setTaskViewData((prev: any) => ({ ...prev, status: res.status }));
                                    syncMeta(res);
                                    toast.success('Status saved');
                                    // If status base is To Start, Processing, or Finished, update progress accordingly
                                    const progress = progressForBase(s.base);
                                    if (progress !== null && formData.progressPercentage !== progress) {
                                      set('progressPercentage', progress);
                                      patchTaskProgress(Number(taskId), progress, undefined, updatedBy).catch(() => { });
                                    }
                                  })
                                  .catch(() => { endAutoSave(); set('statusId', prevId); toast.error('Failed to save status'); });
                              } else {
                                set('statusId', s.id);
                                // If status base is To Start, Processing, or Finished, update progress accordingly
                                const progress = progressForBase(s.base);
                                if (progress !== null && formData.progressPercentage !== progress) {
                                  set('progressPercentage', progress);
                                }
                              }
                            }}
                            className={`cursor-pointer ${formData.statusId === s.id ? 'bg-primary/10' : ''}`}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                              <span className="text-sm flex-1">{s.name}</span>
                              {formData.statusId === s.id && <Check className="w-4 h-4 text-primary" />}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Severity */}
              <div className="grid grid-cols-[110px_1fr] items-center min-h-8 rounded-md hover:bg-muted/40 transition-colors">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-1">Severity</span>
                <div className="px-2 py-1">
                  {isConfigLoading || isLoading ? (
                    <Skeleton className="h-5 w-32" />
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={!config?.severities?.length}
                          title={isConfigLoading ? 'Loading options...' : undefined}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {(() => {
                            const severity = config?.severities?.find((s: any) => s.id === formData.severityId)
                              ?? (taskViewData?.severityName ? {
                                id: taskViewData.severityId,
                                name: taskViewData.severityName,
                                color: taskViewData.severityColor,
                              } : taskViewData?.severity);
                            return severity ? (
                              <>
                                <Flag className="w-3 h-3 flex-shrink-0" fill={severity.color} style={{ color: severity.color }} />
                                <span className="text-gray-700 dark:text-gray-300">{severity.name}</span>
                              </>
                            ) : (
                              <>
                                <span className="text-gray-400 whitespace-nowrap">No severity</span>
                              </>
                            );
                          })()}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuLabel className="text-xs">Select Severity</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {config?.severities?.map((s: any) => (
                          <DropdownMenuItem
                            key={s.id}
                            onClick={() => {
                              if (isEditMode && taskId) {
                                const prevId = formData.severityId;
                                set('severityId', s.id);
                                beginAutoSave();
                                patchTaskSeverity(Number(taskId), s.id, undefined, updatedBy)
                                  .then((res) => {
                                    formDataSnapshot.current = { ...formDataSnapshot.current!, severityId: s.id };
                                    setTaskViewData((prev: any) => ({ ...prev, severity: res.severity }));
                                    syncMeta(res);
                                    toast.success('Severity saved');
                                  })
                                  .catch(() => { endAutoSave(); set('severityId', prevId); toast.error('Failed to save severity'); });
                              } else {
                                set('severityId', s.id);
                              }
                            }}
                            className={`cursor-pointer ${formData.severityId === s.id ? 'bg-primary/10' : ''}`}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Flag className="w-3 h-3 flex-shrink-0" fill={s.color} style={{ color: s.color }} />
                              <span className="text-sm flex-1">{s.name}</span>
                              {formData.severityId === s.id && <Check className="w-4 h-4 text-primary" />}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="grid grid-cols-[110px_1fr] items-center min-h-8 rounded-md hover:bg-muted/40 transition-colors">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-1">Progress</span>
                <div className="flex items-center gap-2 px-2 py-2">
                  <Slider
                    value={[formData.progressPercentage]}
                    min={0}
                    max={100}
                    step={5}
                    className="flex-1 [&_[data-slot=slider-thumb]]:size-3 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:border-primary [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-gray-200 dark:[&_[data-slot=slider-track]]:bg-gray-700 [&_[data-slot=slider-range]]:bg-primary"
                    onValueChange={([val]) => set('progressPercentage', val)}
                    onValueCommit={async ([val]) => {
                      if (isEditMode && taskId) {
                        try {
                          beginAutoSave();
                          const res = await patchTaskProgress(Number(taskId), val, undefined, updatedBy);
                          syncMeta(res);

                          // The backend will automatically update the status based on progress
                          // We just need to sync it to the UI if it changed
                          if (res.statusId && res.statusId !== formData.statusId) {
                            set('statusId', res.statusId);
                            setTaskViewData((prev: any) => ({ ...prev, status: res.status }));
                          }
                        } catch { endAutoSave(); /* non-blocking */ }
                      } else {
                        // For create mode, just update the local state
                        const targetBase = val === 0 ? 'To Start' : (val === 100 ? 'Finished' : 'Processing');
                        const targetStatus = config?.statuses?.find((s: any) => s.base === targetBase);
                        if (targetStatus) {
                          set('statusId', targetStatus.id);
                        }
                      }
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground font-mono w-7 text-right flex-shrink-0">{formData.progressPercentage}%</span>
                </div>
              </div>

              {/* Labels */}
              <div className="grid grid-cols-[110px_1fr] items-center min-h-8 rounded-md hover:bg-muted/40 transition-colors">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-1">Labels</span>
                <div className="px-2 py-1">
                  <TaskLabelDropdown
                    mode="form"
                    appliedLabels={taskLabels}
                    availableLabels={availableLabels}
                    open={sidebarLabelOpen}
                    onOpenChange={setSidebarLabelOpen}
                    search={labelSearch}
                    onSearchChange={setLabelSearch}
                    isCreating={isCreatingLabel}
                    onAdd={async (label) => {
                      const next = [...taskLabels, label];
                      setTaskLabels(next);
                      if (isEditMode && taskId) {
                        try { await patchTaskLabels(Number(taskId), next.map((l: any) => l.id), updatedBy); }
                        catch { setTaskLabels(taskLabels); }
                      }
                    }}
                    onRemove={async (labelId) => {
                      const next = taskLabels.filter((l: any) => l.id !== labelId);
                      setTaskLabels(next);
                      if (isEditMode && taskId) {
                        try { await patchTaskLabels(Number(taskId), next.map((l: any) => l.id), updatedBy); }
                        catch { setTaskLabels(taskLabels); }
                      }
                    }}
                    onCreate={async (name) => {
                      if (!formData.taskSpaceId) return;
                      setIsCreatingLabel(true);
                      try {
                        const created = await createTmTaskLabel({ name, taskSpaceId: formData.taskSpaceId });
                        setAvailableLabels((prev) => [...prev, created]);
                        const next = [...taskLabels, created];
                        setTaskLabels(next);
                        if (isEditMode && taskId) await patchTaskLabels(Number(taskId), next.map((l: any) => l.id), updatedBy);
                      } catch { /* ignore */ } finally { setIsCreatingLabel(false); }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* -- DATES & EFFORT TABS --------------------------------- */}
          <div>
            <div className="px-2 pb-2">
              <div className="flex w-fit rounded-lg border bg-white dark:bg-gray-800 shadow-shrink-0">
                <Button
                  size="sm"
                  className="h-6 text-xs px-2.5"
                  variant={activeTab === 'details' ? 'default' : 'ghost'}
                  // variant={'ghost'}
                  onClick={() => setActiveTab('details')}
                >
                  Details
                </Button>
                <Button
                  size="sm"
                  className="h-6 text-xs px-2.5"
                  variant={activeTab === 'logs' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('logs')}
                  disabled={!canViewLogs}
                >
                  My Logs
                </Button>
              </div>
            </div>

            <div className="min-h-[225px]">
              {activeTab === 'details' && (
                <DetailsTable
                  rows={[
                    {
                      label: "Start Date",
                      planned: isLoading ? (
                        <Skeleton className="h-8 w-full max-w-[120px]" />
                      ) : (
                        <DatePickerItem className="w-[110px]"
                          date={formData.startDate}
                          placeholder="Not set"
                          isStatusComplete={formStatusComplete}
                          showOverdue={false}
                          disabled={childrenHaveDates}
                          disabledMessage={dateDisabledTooltip}
                          onSelect={(newDate) => {
                            const dateStr = newDate ? format(newDate, 'yyyy-MM-dd') : undefined;
                            set('startDate', dateStr);
                            if (isEditMode && taskId) {
                              beginAutoSave();
                              patchTaskDates(Number(taskId), dateStr ?? null, formData.dueDate ?? null, updatedBy)
                                .then((res) => {
                                  formDataSnapshot.current = {
                                    ...formDataSnapshot.current!,
                                    startDate: dateStr as string | undefined
                                  };
                                  syncMeta(res);
                                  toast.success('Start date saved');
                                })
                                .catch(() => { endAutoSave(); toast.error('Failed to save start date'); });
                            }
                          }}
                        />
                      ),
                      actual: isLoading ? (
                        <Skeleton className="h-8 w-full max-w-[120px]" />
                      ) : (
                        <DatePickerItem
                          className="w-[110px]"
                          date={formData.actualStartDate}
                          placeholder="Not set"
                          showOverdue={false}
                          disabled={childrenHaveDates}
                          disabledMessage={dateDisabledTooltip}
                          maxDate={new Date(new Date().setHours(23, 59, 59, 999))}
                          onSelect={(newDate) => {
                            const dateStr = newDate ? format(newDate, 'yyyy-MM-dd') : undefined;
                            set('actualStartDate', dateStr);
                            if (isEditMode && taskId) {
                              beginAutoSave();
                              patchTaskActualDates(Number(taskId), dateStr ?? null, formData.actualEndDate ?? null, updatedBy)
                                .then((res) => {
                                  formDataSnapshot.current = {
                                    ...formDataSnapshot.current!,
                                    actualStartDate: dateStr as string | undefined
                                  };
                                  syncMeta(res);
                                  toast.success('Actual start date saved');
                                })
                                .catch(() => { endAutoSave(); toast.error('Failed to save actual start date'); });
                            }
                          }}
                        />
                      )
                    },
                    {
                      label: "End Date",
                      planned: isLoading ? (
                        <Skeleton className="h-8 w-full max-w-[120px]" />
                      ) : (
                        <DatePickerItem
                          className="w-[110px]"
                          date={formData.dueDate}
                          placeholder="Not set"
                          isStatusComplete={formStatusComplete}
                          showOverdue={true}
                          disabled={childrenHaveDates}
                          disabledMessage={dateDisabledTooltip}
                          onSelect={(newDate) => {
                            const dateStr = newDate ? format(newDate, 'yyyy-MM-dd') : undefined;
                            set('dueDate', dateStr);
                            if (isEditMode && taskId) {
                              beginAutoSave();
                              patchTaskDates(Number(taskId), formData.startDate ?? null, dateStr ?? null, updatedBy)
                                .then((res) => {
                                  formDataSnapshot.current = {
                                    ...formDataSnapshot.current!,
                                    dueDate: dateStr as string | undefined
                                  };
                                  syncMeta(res);
                                  toast.success('Due date saved');
                                })
                                .catch(() => { endAutoSave(); toast.error('Failed to save due date'); });
                            }
                          }}
                        />
                      ),
                      actual: isLoading ? (
                        <Skeleton className="h-8 w-full max-w-[120px]" />
                      ) : (
                        <DatePickerItem
                          className="w-[110px]"
                          date={formData.actualEndDate}
                          placeholder="Not set"
                          showOverdue={false}
                          disabled={childrenHaveDates}
                          disabledMessage={dateDisabledTooltip}
                          maxDate={new Date(new Date().setHours(23, 59, 59, 999))}
                          onSelect={(newDate) => {
                            const dateStr = newDate ? format(newDate, 'yyyy-MM-dd') : undefined;
                            set('actualEndDate', dateStr);
                            if (isEditMode && taskId) {
                              beginAutoSave();
                              patchTaskActualDates(Number(taskId), formData.actualStartDate ?? null, dateStr ?? null, updatedBy)
                                .then((res) => {
                                  formDataSnapshot.current = {
                                    ...formDataSnapshot.current!,
                                    actualEndDate: dateStr as string | undefined
                                  };
                                  syncMeta(res);
                                  toast.success('Actual end date saved');
                                })
                                .catch(() => { endAutoSave(); toast.error('Failed to save actual end date'); });
                            }
                          }}
                        />
                      )
                    },
                    {
                      label: "Effort (hrs)",
                      planned: isLoading ? (
                        <Skeleton className="h-8 w-full max-w-[120px]" />
                      ) : childrenHaveEffort ? (
                        <HoverCard openDelay={200}>
                          <HoverCardTrigger asChild>
                            <div className="inline-block cursor-not-allowed">
                              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 w-[110px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium transition-colors opacity-60 bg-gray-50 dark:bg-gray-900 pointer-events-none">
                                <Lock className="w-3 h-3 shrink-0" />
                                <input type="number" value={formData.estimateEffort ?? ''} readOnly className="w-full bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                              </label>
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-72 p-3" side="top" align="start" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-start gap-2.5">
                              <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-gray-400">
                                <Lock className="w-3.5 h-3.5 text-white dark:text-gray-900" />
                              </div>
                              <div className="space-y-1.5 min-w-0">
                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Effort rolled up from children</p>
                                {formData.estimateEffort && (
                                  <div className="flex items-center gap-1.5 text-xs font-medium rounded px-2 py-1 text-gray-700 dark:text-gray-300 bg-gray-400 w-fit">
                                    <Clock className="w-3 h-3 shrink-0" />
                                    {formData.estimateEffort} hrs
                                  </div>
                                )}
                                <p className="text-[11px] text-gray-400 dark:text-gray-500">To adjust effort, update the children tasks directly.</p>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      ) : (
                        <label className="inline-flex items-center gap-1.5 px-2.5 py-1 w-[110px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 cursor-text">
                          <Clock className="w-3 h-3 shrink-0" />
                          <input
                            type="number"
                            min={0}
                            placeholder="Not set"
                            value={formData.estimateEffort ?? ''}
                            onChange={(e) => set('estimateEffort', e.target.value)}
                            onBlur={(e) => {
                              const val = e.target.value;
                              if (isEditMode && taskId && val !== String(formDataSnapshot.current?.estimateEffort ?? '')) {
                                beginAutoSave();
                                patchTaskEffort(Number(taskId), val ? Number(val) : null, formData.actualEffort ? Number(formData.actualEffort) : null, updatedBy)
                                  .then((res) => { formDataSnapshot.current = { ...formDataSnapshot.current!, estimateEffort: val }; syncMeta(res); toast.success('Estimate effort saved'); })
                                  .catch(() => { endAutoSave(); toast.error('Failed to save effort'); });
                              }
                            }}
                            className="w-full bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </label>
                      ),
                      actual: isLoading ? (
                        <Skeleton className="h-8 w-full max-w-[120px]" />
                      ) : (
                        <HoverCard openDelay={200}>
                          <HoverCardTrigger asChild>
                            <div className="inline-block cursor-not-allowed">
                              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 w-[110px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium transition-colors opacity-60 bg-gray-50 dark:bg-gray-900 pointer-events-none">
                                <Lock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                                <input type="number" value={formData.actualEffort ?? ''} readOnly placeholder="Not set" className="w-full bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                              </label>
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80 p-3" side="top" align="start" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-start gap-2.5">
                              <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-gray-400">
                                <Lock className="w-3.5 h-3.5 text-white dark:text-gray-900" strokeWidth={2.5} />
                              </div>
                              <div className="min-w-0 flex flex-col gap-1 w-full">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                  {actualEffortBreakdown.hasChildren ? 'Actual effort rolled up from children' : 'Actual effort'}
                                </p>
                                <div className="flex items-center gap-1.5 text-xs font-medium rounded-md border px-2 py-1 text-gray-700 dark:text-gray-300 w-fit">
                                  <Clock className="w-3 h-3 shrink-0" />
                                  {actualEffortBreakdown.total} hrs
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {actualEffortBreakdown.hasChildren
                                    ? 'Update children to adjust effort.'
                                    : 'Update your logs to adjust effort.'}
                                </p>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      )
                    }
                  ]}
                />
              )}
              {activeTab === 'logs' && (
                <WorkLogTable
                  paginatedLogs={paginatedLogs}
                  canEditLogs={canEditLogs}
                  newLogEntry={newLogEntry}
                  setNewLogEntry={setNewLogEntry}
                  handleSaveLog={handleSaveLog}
                  isAddingLog={isAddingLog}
                  editingLogId={editingLogId}
                  setEditingLogId={setEditingLogId}
                  editingLogEntry={editingLogEntry}
                  setEditingLogEntry={setEditingLogEntry}
                  handleUpdateLog={handleUpdateLog}
                  handleDeleteLog={handleDeleteLog}
                  logPage={logPage}
                  setLogPage={setLogPage}
                  totalLogPages={totalLogPages}
                  getNextWeekEndDay={getNextWeekEndDay}
                  postType="Task"
                />
              )}
            </div>
          </div>

          {/* -- TEAM ------------------------------------------- */}
          <div className="px-5 py-4 mt-auto">
            {/*<h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Team</h3>*/}

            {/* Assignee | Co-Assignees */}
            <div className="flex gap-0 min-h-[72px]">

              {/* Assignee column */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-wide mb-2">Assignee</p>
                {(() => {
                  return (
                    <Popover
                      open={assigneeOpen}
                      onOpenChange={(o) => { setAssigneeOpen(o); if (!o) setPendingSkillPrompt(null); }}
                    >
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <PopoverTrigger asChild>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="flex items-center gap-2.5 w-full text-left rounded-md hover:bg-muted/50 transition-colors p-1 -m-1 focus:outline-none group"
                              >
                          {selectedAssignee ? (
                            <>
                              <Avatar className="h-8 w-8 flex-shrink-0 group-hover:ring-2 group-hover:ring-primary/50 transition-shadow">
                                <AvatarImage src={selectedAssignee.profile_pic} alt={`${selectedAssignee.first_name} ${selectedAssignee.last_name}`} />
                                <AvatarFallback className="text-xs font-semibold bg-primary text-white dark:text-gray-900">
                                  {selectedAssignee.first_name?.charAt(0)}{selectedAssignee.last_name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-foreground truncate leading-tight">
                                  {selectedAssignee.first_name} {selectedAssignee.last_name}
                                </div>
                                {selectedAssignee.email && (
                                  <div className="text-xs text-muted-foreground truncate leading-tight mt-0.5">{selectedAssignee.email}</div>
                                )}
                                {formData.assigneeSkill && (
                                  <Badge className="mt-1 text-xs rounded-md font-semibold py-2 px-2 h-4 bg-primary text-white dark:text-gray-900 hover:bg-primary/90">
                                    {formData.assigneeSkill}
                                  </Badge>
                                )}
                              </div>
                            </>
                          ) : isAssigneesLoading || isLoading ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className="bg-white dark:bg-gray-800 border border-dashed border-border text-muted-foreground">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className="bg-white dark:bg-gray-800 border border-dashed border-border text-muted-foreground">
                                  <Plus className="w-3.5 h-3.5" />
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          )}
                              </button>
                            </TooltipTrigger>
                          </PopoverTrigger>
                          <TooltipContent side="top" className="whitespace-pre-line text-xs">
                            {selectedAssignee
                              ? `${selectedAssignee.first_name} ${selectedAssignee.last_name}\nSkill: ${formData.assigneeSkill || 'Not selected'}`
                              : 'Click to assign'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <PopoverContent className="w-[300px] p-0" style={{ height: '300px' }} align="start" side="top" avoidCollisions={true} onMouseLeave={pendingSkillPrompt ? undefined : () => setAssigneeOpen(false)}>
                        {pendingSkillPrompt ? (
                          <div className="relative flex flex-col h-full p-3">
                            <button
                              type="button"
                              onClick={dismissSkillPrompt}
                              className="absolute top-2 right-2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Dismiss"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                            <div className="flex items-center gap-2.5 mb-3 pr-5">
                              <UserAvatar firstName={pendingSkillPrompt.first_name} lastName={pendingSkillPrompt.last_name} profilePic={pendingSkillPrompt.profile_pic} size="sm" />
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate leading-tight">{pendingSkillPrompt.first_name} {pendingSkillPrompt.last_name}</div>
                                <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">Pick a relevant skill for this task</div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 flex-1 overflow-y-auto content-start">
                              {[...new Set<string>(pendingSkillPrompt.skills as string[])].map((s: string, i: number) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => selectAssignee(pendingSkillPrompt, s)}
                                >
                                  <Badge variant="outline" className="text-xs font-normal cursor-pointer hover:bg-primary/10">{s}</Badge>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <Command shouldFilter={false} className="flex flex-col h-full">
                            <CommandInput placeholder="Search resources" value={assigneeSearch} onValueChange={setAssigneeSearch} />
                            <CommandList className="flex-1 overflow-y-auto max-h-none">
                              {(isChildTask ? rootTaskMembers === null : !config) ? (
                                <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Loading resources...
                                </div>
                              ) : (
                                <>
                                  <CommandEmpty>No resource found.</CommandEmpty>
                                  <CommandGroup>
                                    {filteredResources(assigneeSearch)
                                      .sort((a, b) => {
                                        const aSelected = formData.assigneeId === a.id ? 1 : 0;
                                        const bSelected = formData.assigneeId === b.id ? 1 : 0;
                                        if (aSelected !== bSelected) return bSelected - aSelected;

                                        const aIsMember = (config?.resources ?? []).some((m: any) => m.id === a.id) ? 1 : 0;
                                        const bIsMember = (config?.resources ?? []).some((m: any) => m.id === b.id) ? 1 : 0;
                                        if (aIsMember !== bIsMember) return bIsMember - aIsMember;

                                        const aName = a.first_name || '';
                                        const bName = b.first_name || '';
                                        return aName.localeCompare(bName);
                                      })
                                      .map((r, index, arr) => {
                                        const isSelected = formData.assigneeId === r.id;
                                        const isMember = !isSelected && !!(config?.resources ?? []).some((m: any) => m.id === r.id);
                                        const isOther = !isSelected && !isMember;

                                        const prevR = arr[index - 1];
                                        const prevIsSelected = prevR ? formData.assigneeId === prevR.id : false;
                                        const prevIsMember = prevR && !prevIsSelected ? !!(config?.resources ?? []).some((m: any) => m.id === prevR.id) : false;
                                        const prevIsOther = prevR ? !prevIsSelected && !prevIsMember : false;

                                        const showAssignedTitle = isSelected && !prevIsSelected;
                                        const showMemberTitle = isMember && !prevIsMember && (config?.resources ?? []).length > 0;
                                        const showOtherTitle = isOther && (!prevR || (!prevIsOther && (prevIsSelected || prevIsMember)));

                                        return (
                                          <React.Fragment key={r.id}>
                                            {showAssignedTitle && (
                                              <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                                                <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">Assigned</span>
                                              </div>
                                            )}
                                            {showMemberTitle && (
                                              <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                                                <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">Space Members</span>
                                              </div>
                                            )}
                                            {showOtherTitle && (
                                              <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                                                <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">
                                                  Guest Members
                                                </span>
                                              </div>
                                            )}
                                            <CommandItem value={`${r.first_name} ${r.last_name} ${r.email}`}
                                              onSelect={() => selectAssignee(r)}>
                                              <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                                              <ResourceRow r={r} selected={isSelected} selectedSkill={formData.assigneeSkill} onSelectSkill={(s) => selectAssignee(r, s)} />
                                            </CommandItem>
                                          </React.Fragment>
                                        );
                                      })}
                                  </CommandGroup>
                                </>
                              )}
                            </CommandList>
                          </Command>
                        )}
                      </PopoverContent>
                    </Popover>
                  );
                })()}
              </div>

              {/* Co-Assignees column */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-wide mb-2">
                  Co-Assignees
                  {formData.coAssigneeIds.length > 0 && (
                    <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">{formData.coAssigneeIds.length}</span>
                  )}
                </p>
                {(() => {
                  return (
                    /* + button is fixed first; avatars stack to the right after it */
                    <Popover open={coAssigneeOpen} onOpenChange={setCoAssigneeOpen}>
                      <div className="flex items-center flex-wrap gap-y-1">
                        {/* + button always first — stable, never moves */}
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="focus:outline-none relative z-30"
                            title="Add co-assignee"
                          >
                            <Avatar className="h-8 w-8 ring-2 ring-background cursor-pointer hover:opacity-80 transition-opacity">
                              <AvatarFallback className="bg-white dark:bg-gray-800 border border-dashed border-border text-muted-foreground">
                                {isAssigneesLoading || isLoading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Plus className="w-3.5 h-3.5" />
                                )}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                        </PopoverTrigger>
                        {effectiveResources
                          .filter((r) => formData.coAssigneeIds.includes(r.id))
                          .map((r, i) => (
                            <TooltipProvider delayDuration={200} key={r.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => toggleCoAssignee(r.id)}
                                    className="focus:outline-none -ml-2"
                                    style={{ zIndex: 20 - i, position: 'relative' }}
                                  >
                              <Avatar className="h-8 w-8 ring-2 ring-background cursor-pointer hover:ring-destructive/60 hover:opacity-80 transition-all">
                                <AvatarImage src={r.profile_pic} alt={`${r.first_name} ${r.last_name}`} />
                                <AvatarFallback className="text-xs font-semibold bg-primary text-white dark:text-gray-900">
                                  {r.first_name?.charAt(0)}{r.last_name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {r.first_name} {r.last_name} - click to remove
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                      </div>
                      <PopoverContent className="w-[300px] p-0" style={{ height: '300px' }} align="end" side="top" avoidCollisions={true} onMouseLeave={() => setCoAssigneeOpen(false)}>
                        <Command shouldFilter={false} className="flex flex-col h-full">
                          <CommandInput placeholder="Search resources..." value={coAssigneeSearch} onValueChange={setCoAssigneeSearch} />
                          <CommandList className="flex-1 overflow-y-auto max-h-none">
                            {(isChildTask ? rootTaskMembers === null : !config) ? (
                              <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading resources...
                              </div>
                            ) : (
                              <>
                                <CommandEmpty>No resource found.</CommandEmpty>
                                <CommandGroup>
                                  {filteredResources(coAssigneeSearch)
                                    .sort((a, b) => {
                                      const aSelected = formData.coAssigneeIds.includes(a.id) ? 1 : 0;
                                      const bSelected = formData.coAssigneeIds.includes(b.id) ? 1 : 0;
                                      if (aSelected !== bSelected) return bSelected - aSelected;

                                      const aIsMember = (config?.resources ?? []).some((m: any) => m.id === a.id) ? 1 : 0;
                                      const bIsMember = (config?.resources ?? []).some((m: any) => m.id === b.id) ? 1 : 0;
                                      if (aIsMember !== bIsMember) return bIsMember - aIsMember;

                                      const aName = a.first_name || '';
                                      const bName = b.first_name || '';
                                      return aName.localeCompare(bName);
                                    })
                                    .map((r, index, arr) => {
                                      const checked = formData.coAssigneeIds.includes(r.id);
                                      const isMember = !checked && !!(config?.resources ?? []).some((m: any) => m.id === r.id);
                                      const isOther = !checked && !isMember;

                                      const prevR = arr[index - 1];
                                      const prevIsSelected = prevR ? formData.coAssigneeIds.includes(prevR.id) : false;
                                      const prevIsMember = prevR && !prevIsSelected ? !!(config?.resources ?? []).some((m: any) => m.id === prevR.id) : false;
                                      const prevIsOther = prevR ? !prevIsSelected && !prevIsMember : false;

                                      const showAssignedTitle = checked && !prevIsSelected;
                                      const showMemberTitle = isMember && !prevIsMember && (config?.resources ?? []).length > 0;
                                      const showOtherTitle = isOther && (!prevR || (!prevIsOther && (prevIsSelected || prevIsMember)));

                                      return (
                                        <React.Fragment key={r.id}>
                                          {showAssignedTitle && (
                                            <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                                              <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">Selected</span>
                                            </div>
                                          )}
                                          {showMemberTitle && (
                                            <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                                              <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">Space Members</span>
                                            </div>
                                          )}
                                          {showOtherTitle && (
                                            <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                                              <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">
                                                Guest Members
                                              </span>
                                            </div>
                                          )}
                                          <CommandItem value={`${r.first_name} ${r.last_name} ${r.email}`}
                                            onSelect={() => toggleCoAssignee(r.id)}>
                                            <Check className={cn('mr-2 h-4 w-4', checked ? 'opacity-100' : 'opacity-0')} />
                                            <ResourceRow r={r} />
                                          </CommandItem>
                                        </React.Fragment>
                                      );
                                    })}
                                </CommandGroup>
                              </>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  );
                })()}
              </div>
            </div>

            {/* Members — hidden when the task has a parent or is loading */}
            {(() => {
              if (isLoading || isChildTask) return null;
              return (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-wide mb-2">
                    Guest Members
                    {formData.memberIds.length > 0 && (
                      <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">{formData.memberIds.length}</span>
                    )}
                  </p>

                  {canManageGuestMembers ? (
                    /* ── Has privilege: full add / remove UI ── */
                    <div className="flex items-center flex-wrap gap-y-1">
                      <TaskSpaceResourceDropdown
                        taskSpaceId={formData.taskSpaceId}
                        selectedResourceIds={new Set(formData.memberIds)}
                        onResourceAdded={(r) => {
                          setMemberResourceCache((prev) => ({ ...prev, [r.id]: r }));
                          toggleMember(r.id);
                        }}
                        onResourceRemoved={(id) => toggleMember(id)}
                        preloadedResources={!isChildTask ? undefined : config?.resources}
                        disabledResourceIds={!isChildTask ? new Set((config?.resources ?? []).map((r: any) => r.id)) : undefined}
                        skipApi
                        align="start"
                        side="top"
                        trigger={
                          <button
                            type="button"
                            className="focus:outline-none relative z-30"
                            title="Add member"
                            disabled={isLoading || isAutoSaving}
                          >
                            <Avatar className="h-8 w-8 ring-2 ring-background cursor-pointer hover:opacity-80 transition-opacity">
                              <AvatarFallback className="bg-white dark:bg-gray-800 border border-dashed border-border text-muted-foreground">
                                {isLoading || isAutoSaving ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Plus className="w-3.5 h-3.5" />
                                )}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                        }
                      />
                      {formData.memberIds.map((id, i) => {
                        const r = (config?.resources ?? []).find((x) => x.id === id) ?? memberResourceCache[id];
                        if (!r) {
                          return (
                            <div key={id} className="relative -ml-2 flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-background bg-gray-200 dark:bg-gray-800 animate-pulse" style={{ zIndex: 20 - i }}>
                              <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                            </div>
                          );
                        }
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleMember(r.id)}
                            className="focus:outline-none relative -ml-2"
                            style={{ zIndex: 20 - i }}
                            title={`${r.first_name} ${r.last_name} - click to remove`}
                          >
                            <Avatar className="h-8 w-8 ring-2 ring-background cursor-pointer hover:ring-destructive/60 hover:opacity-80 transition-all">
                              <AvatarImage src={r.profile_pic} alt={`${r.first_name} ${r.last_name}`} />
                              <AvatarFallback className="text-xs font-semibold bg-primary text-white dark:text-gray-900">
                                {r.first_name?.charAt(0)}{r.last_name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* ── No privilege: read-only avatars + hover "no access" card ── */
                    <HoverCard openDelay={200}>
                      <HoverCardTrigger asChild>
                        <div className="flex items-center flex-wrap gap-y-1 cursor-not-allowed">
                          {formData.memberIds.length === 0 ? (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 select-none">
                              <Lock className="w-3 h-3" />
                              <span>No members</span>
                            </div>
                          ) : (
                            formData.memberIds.map((id, i) => {
                              const r = (config?.resources ?? []).find((x) => x.id === id) ?? memberResourceCache[id];
                              if (!r) {
                                return (
                                  <div key={id} className="relative -ml-2 flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-background bg-gray-200 dark:bg-gray-800 opacity-60" style={{ zIndex: 20 - i }}>
                                    <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                                  </div>
                                );
                              }
                              return (
                                <div
                                  key={id}
                                  className={cn("relative select-none", i > 0 && "-ml-2")}
                                  style={{ zIndex: 20 - i }}
                                  title={`${r.first_name} ${r.last_name}`}
                                >
                                  <Avatar className="h-8 w-8 ring-2 ring-background">
                                    <AvatarImage src={r.profile_pic} alt={`${r.first_name} ${r.last_name}`} />
                                    <AvatarFallback className="text-xs font-semibold bg-primary text-white dark:text-gray-900">
                                      {r.first_name?.charAt(0)}{r.last_name?.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent side="top" align="start" className="w-72 p-3">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-orange-400">
                            <Lock className="w-3.5 h-3.5 text-white dark:text-gray-900" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                              You don't have permission to change guest members.
                            </p>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  )}
                </div>
              );
            })()}

          </div>

          {/* -- METADATA --------------------------------------- */}
          {isEditMode && (
            isLoading ? (
              <div className="px-4 pb-4 pt-3 border-t border-border space-y-2">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-56" />
              </div>
            ) : (metadata.createdAt || metadata.updatedAt) && (
              <div className="px-4 pb-4 pt-3 border-t border-border space-y-2">
                {metadata.createdAt && (
                  <p className="text-xs font-medium text-muted-foreground">
                    Created{metadata.createdBy && <> by <span className="text-primary">{metadata.createdBy}</span></>}, {new Date(metadata.createdAt).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                )}
                {metadata.updatedAt && (
                  <p className={`text-xs font-medium text-muted-foreground ${!metadata.updatedBy ? 'invisible' : ''}`}>
                    Updated{metadata.updatedBy && <> by <span className="text-primary">{metadata.updatedBy}</span></>}, {new Date(metadata.updatedAt).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Guest Member removal confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(o) => {
        if (!o && !isRemovingMember) {
          setMemberToRemove(null);
          setMemberRemoveError(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Guest Member</AlertDialogTitle>
            <AlertDialogDescription className={memberRemoveError ? "text-red-500 font-medium" : ""}>
              {memberRemoveError ? memberRemoveError : "Are you sure you want to remove this guest member from the task?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingMember} onClick={() => setMemberRemoveError(null)}>Cancel</AlertDialogCancel>
            {!memberRemoveError && (
              <Button
                variant="destructive"
                onClick={(e) => { e.preventDefault(); confirmRemoveMember(); }}
                disabled={isRemovingMember}
              >
                {isRemovingMember ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Remove
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
