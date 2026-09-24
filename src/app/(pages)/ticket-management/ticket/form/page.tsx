"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import { toast } from "sonner";
import {
  Loader2,
  Bug,
  FileText,
  Zap,
  AlertTriangle,
  CalendarDays,
  CheckCircle,
  CircleCheck,
  Circle,
  Settings,
  HelpCircle,
  ListTodo,
  Check,
  Clock,
  Lock,
  ChevronDown,
  LucideIcon,
  Plus,
  X,
  ChevronLeft,
  Share2,
  Copy,
  ChevronRight,
  Info,
  ArrowRight,
  ExternalLink,
  Flag,
  Folder,
  MessageSquare,
  NotebookPen,
  Bookmark,
  Unlink,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import RichTextEditor from "@/components/common/RichTextEditor";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import {
  cn,
  getInitials,
  formatRelativeTime
} from '@/lib/utils';
import { useAuth } from "@/contexts/auth.context";
import {
  getTicketSpaceById,
  getTicketSpaceStatusConfig,
  getTicketSpaceSeverityConfig,
  getTicketSpaceTypesConfig,
  getTicketSpaceQueueConfig,
  getTicketSpaceSlaConfig,
  getTicketSpaceImpactConfig,
  getTicketSpaceMembersConfig,
} from "@/services/ticket-management/ticket-space.service";
import {
  createTicket,
  getTicketBaseById,
  getTicketAssignees,
  getTicketEvents,
  updateTicket,
  patchTicketName,
  patchTicketStatus,
  patchTicketSeverity,
  patchTicketQueue,
  patchTicketType,
  patchTicketImpact,
  patchTicketAssignee,
  patchTicketParticipants,
  patchTicketDescription,
  patchTicketEffort,
  patchTicketCompletionDate,
} from "@/services/ticket-management/ticket.service";
import {
  uploadTicketAttachment,
  createTicketAttachment,
} from "@/services/ticket-management/ticket-attachment.service";
import { AttachmentSection } from "@/components/common/AttachmentSection";
import { ChecklistSection } from "@/components/common/ChecklistSection";
import { TicketSpaceCreateConfig } from "@/interfaces/ticket";
import { CommentSection } from "@/components/common/CommentSection";
import { DatePickerItem } from "@/components/ui/date-picker-item";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WorkLogTable } from "@/components/common/work-log-table";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import {
  InlineEditableStatus,
  InlineEditableSeverity,
  InlineEditableQueue,
  InlineEditableImpact,
  InlineEditableTicketType,
} from "../components/InlineEditableTicketComponents";
import { createResourceLog, deleteResourceLog, getResourceTicketLogHistory, updateResourceLog } from "@/services/work-log/work-log.service";
import { AssigneeType } from "@/enums/assignee-type.enum";

import { getHierarchyLevelIcon } from "@/enums/space-configure-icon.enum";
import LinkWorkItemDialog from "@/components/link-management/LinkWorkItemDialog";
import {
  getWorkItemLinks,
  deleteWorkItemLink,
  checkWorkItemAccess,
  type WorkItemLink,
} from "@/services/common/work-item-link.service";
import { getLinkTypes, type LinkType } from "@/services/common/link-type.service";
import { fetchTemplates, createTicketTemplate, deleteTicketTemplate } from "@/services/ticket-management/ticket-template.service";
import { createTicketChecklist } from "@/services/ticket-management/ticket-checklist.service";
import type { TicketTemplate } from "@/interfaces/ticket-template";

// Icon mapping for ticket types
const getTicketTypeIcon = (iconName: string | undefined): LucideIcon | null => {
  if (!iconName) return null;

  const iconMap: Record<string, LucideIcon> = {
    bug: Bug,
    filetext: FileText,
    "file-text": FileText,
    task: FileText,
    zap: Zap,
    improvement: Zap,
    alerttriangle: AlertTriangle,
    "alert-triangle": AlertTriangle,
    warning: AlertTriangle,
    checkcircle: CheckCircle,
    "check-circle": CheckCircle,
    done: CheckCircle,
    circle: Circle,
    settings: Settings,
    config: Settings,
    helpcircle: HelpCircle,
    "help-circle": HelpCircle,
    question: HelpCircle,
    listtodo: ListTodo,
    "list-todo": ListTodo,
    todo: ListTodo,
  };

  const normalizedIcon = iconName.toLowerCase().replace(/[^a-z]/g, "");
  return iconMap[normalizedIcon] || iconMap[iconName.toLowerCase()] || Circle;
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

export default function CreateTicketPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketSpaceId = searchParams.get("ticketSpaceId");
  const isEditMode = searchParams.get("edit") === "true";
  const ticketId = searchParams.get("ticketId");
  const { setBreadcrumbs } = useBreadcrumb();
  const { user } = useAuth();
  const updatedBy = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || undefined;

  const [isLoading, setIsLoading] = useState(true);
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [isAssigneesLoading, setIsAssigneesLoading] = useState(false);
  const [isTicketEventsLoading, setIsTicketEventsLoading] = useState(false);
  const [isLinksLoading, setIsLinksLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  /** Timestamp of last successful auto-save (edit mode only) */
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  /** True while at least one auto-save request is in-flight */
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const pendingAutoSaves = useRef(0);

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
  /** Sync metadata (updatedAt/updatedBy) from a PATCH response and mark saved */
  const syncMeta = (res: any) => {
    if (res?.updatedAt) {
      setMetadata((prev) => ({
        ...prev,
        updatedAt: res.updatedAt,
        updatedBy: updatedBy || res.updatedBy,
      }));
    }
    setAutoSavedAt(res?.updatedAt ? new Date(res.updatedAt) : new Date());
    pendingAutoSaves.current = Math.max(0, pendingAutoSaves.current - 1);
    if (pendingAutoSaves.current === 0) setIsAutoSaving(false);
  };
  const [config, setConfig] = useState<TicketSpaceCreateConfig | null>(null);
  // Raw ticket object from Phase-1 fetch — used as display fallback while config loads
  const [ticketViewData, setTicketViewData] = useState<any>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [ticketEvents, setTicketEvents] = useState<any[]>([]);
  const [logHistoryOpen, setLogHistoryOpen] = useState(false);
  const [visibleLogHistoryCount, setVisibleLogHistoryCount] = useState(5);

  // -- Ticket Templates -------------------------------------------------------
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [templateSearchOpen, setTemplateSearchOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TicketTemplate | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [initialFormData, setInitialFormData] = useState<any>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [saveTemplateIsShared, setSaveTemplateIsShared] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<TicketTemplate | null>(null);
  const [deleteTemplateOpen, setDeleteTemplateOpen] = useState(false);
  // -- Linked Tasks / Tickets -------------------------------------------------
  const [workItemLinks, setWorkItemLinks] = useState<WorkItemLink[]>([]);
  const [linkTypes, setLinkTypes] = useState<LinkType[]>([]);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkedTasksOpen, setLinkedTasksOpen] = useState(false);
  const [linkedPage, setLinkedPage] = useState(1);
  const LINKED_PAGE_SIZE = 5;
  const [openLinkedCommentId, setOpenLinkedCommentId] = useState<number | null>(null);
  const [linkedCommentCounts, setLinkedCommentCounts] = useState<Record<number, number>>({});
  const [codeHintOpen, setCodeHintOpen] = useState(false);
  const [errors, setErrors] = useState({
    name: false,
    ticketTypeId: false,
  });

  // Ref to track if config has been loaded to prevent duplicate calls
  const hasLoaded = useRef(false);
  const descriptionPatchTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  /** Snapshot of last-saved scalar fields — used to supply oldValue to patch calls (no extra DB fetch needed) */
  const formDataSnapshot = useRef<{
    name: string;
    plannedEffort?: string;
    actualEffort?: string;
  } | null>(null);

  // Search state for assignee and participants
  const [assigneeSearchOpen, setAssigneeSearchOpen] = useState(false);
  const [participantsSearchOpen, setParticipantsSearchOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [participantsSearch, setParticipantsSearch] = useState("");

  // -- Log History ------------------------------------------------------------
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

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    ticketSpaceId: 0,
    ticketSpaceName: undefined as string | undefined,
    statusId: undefined as number | undefined,
    severityId: undefined as number | undefined,
    ticketTypeId: undefined as number | undefined,
    queueId: undefined as number | undefined,
    impactId: undefined as number | undefined,
    ticketSlaId: undefined as number | undefined,
    assigneeId: undefined as number | undefined,
    plannedEffort: "",
    actualEffort: "",
    participantIds: [] as number[],
    participants: [] as any[], // Full participant objects for better performance
    completionDate: undefined as string | undefined,
  });

  // Metadata for edit mode
  const [metadata, setMetadata] = useState<{
    createdAt?: string;
    createdBy?: string;
    updatedAt?: string;
    updatedBy?: string;
  }>({});

  // SLA countdown state
  const [slaCountdown, setSlaCountdown] = useState<{
    responseTimeLeft: string;
    resolutionTimeLeft: string;
    responseExpired: boolean;
    resolutionExpired: boolean;
    responseDeadline: Date | null;
    resolutionDeadline: Date | null;
  }>({
    responseTimeLeft: "",
    resolutionTimeLeft: "",
    responseExpired: false,
    resolutionExpired: false,
    responseDeadline: null,
    resolutionDeadline: null,
  });

  // Calculate SLA deadlines and countdown
  useEffect(() => {
    if (!isEditMode) return;

    // Prefer the pre-computed deadlines stored on the ticket (slaResponseDeadline /
    // slaResolutionDeadline). Fall back to re-computing from config.slas only when
    // the stored values are absent (e.g. older records before the migration).
    let responseDeadline: Date | null = null;
    let resolutionDeadline: Date | null = null;

    if (
      ticketViewData?.slaResponseDeadline ||
      ticketViewData?.slaResolutionDeadline
    ) {
      if (ticketViewData?.slaResponseDeadline) {
        responseDeadline = new Date(ticketViewData.slaResponseDeadline);
      }
      if (ticketViewData?.slaResolutionDeadline) {
        resolutionDeadline = new Date(ticketViewData.slaResolutionDeadline);
      }
    }

    if ((!responseDeadline || !resolutionDeadline) && metadata.createdAt) {
      const createdAt = new Date(metadata.createdAt);
      const respMinutes =
        ticketViewData?.slaResponseTime ??
        ticketViewData?.severity?.responseTimeInMinutes ??
        ticketViewData?.severity?.responseTime;
      const resMinutes =
        ticketViewData?.slaResolutionTime ??
        ticketViewData?.severity?.resolutionTimeInMinutes ??
        ticketViewData?.severity?.resolutionTime;

      if (!responseDeadline && respMinutes && Number(respMinutes) > 0) {
        responseDeadline = new Date(
          createdAt.getTime() + Number(respMinutes) * 60000,
        );
      }
      if (!resolutionDeadline && resMinutes && Number(resMinutes) > 0) {
        resolutionDeadline = new Date(
          createdAt.getTime() + Number(resMinutes) * 60000,
        );
      }

      if (!responseDeadline || !resolutionDeadline) {
        const ticketSla = config?.slas?.find(
          (sla: any) =>
            sla.id === formData.ticketSlaId ||
            sla.severityId === (formData.severityId ?? ticketViewData?.severityId ?? ticketViewData?.severity?.id) ||
            sla.id === (formData.severityId ?? ticketViewData?.severityId ?? ticketViewData?.severity?.id),
        );
        if (ticketSla) {
          if (!responseDeadline && ticketSla.responseTime && Number(ticketSla.responseTime) > 0) {
            responseDeadline = new Date(
              createdAt.getTime() + Number(ticketSla.responseTime) * 60000,
            );
          }
          if (!resolutionDeadline && ticketSla.resolutionTime && Number(ticketSla.resolutionTime) > 0) {
            resolutionDeadline = new Date(
              createdAt.getTime() + Number(ticketSla.resolutionTime) * 60000,
            );
          }
        }
      }
    }

    if (!responseDeadline || !resolutionDeadline) return;

    const updateCountdown = () => {
      const currentStatus = config?.statuses?.find(
        (s: any) => s.id === formData.statusId,
      );
      const isResponded = currentStatus && (currentStatus as any).base !== "To Start";
      const isFinished = currentStatus && (currentStatus as any).base === "Finished";

      const now = new Date();

      const responseMs = responseDeadline!.getTime() - now.getTime();
      const resolutionMs = resolutionDeadline!.getTime() - now.getTime();

      const formatTimeLeft = (ms: number, isDone: boolean, doneText: string): string => {
        if (isDone) return doneText;

        const abMs = Math.abs(ms);
        const totalMinutes = Math.floor(abMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const seconds = Math.floor((abMs % 60000) / 1000);

        let duration: string;
        if (hours > 24) {
          const days = Math.floor(hours / 24);
          const remainingHours = hours % 24;
          duration = `${days}d ${remainingHours}h ${minutes}m`;
        } else if (hours > 0) {
          duration = `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
          duration = `${minutes}m ${seconds}s`;
        } else {
          duration = `${seconds}s`;
        }

        return ms <= 0 ? `Late by ${duration}` : duration;
      };

      setSlaCountdown({
        responseTimeLeft: formatTimeLeft(responseMs, !!isResponded, "Responded"),
        resolutionTimeLeft: formatTimeLeft(resolutionMs, !!isFinished, "Resolved"),
        responseExpired: !isResponded && responseMs <= 0,
        resolutionExpired: !isFinished && resolutionMs <= 0,
        responseDeadline,
        resolutionDeadline,
      });
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [
    isEditMode,
    ticketViewData,
    metadata.createdAt,
    formData.ticketSlaId,
    formData.statusId,
    config?.slas,
    config?.statuses,
  ]);

  // Format hours to effort string (e.g., 8 → "8 hours", 16 → "2 days")
  const formatHoursToEffort = (hours: number): string => {
    if (hours % 8 === 0 && hours >= 8) {
      return `${hours / 8} days`;
    }
    return `${hours} hours`;
  };

  // Parse effort string to hours (e.g., "8 hours" → 8, "2 days" → 16, "1.5 days" → 12)
  const parseEffortToHours = (effortStr: string): number | undefined => {
    if (!effortStr || !effortStr.trim()) return undefined;

    const match = effortStr.match(
      /(\d+(?:\.\d+)?)\s*(hour|hours|day|days|h|d)?/i,
    );
    if (!match) return undefined;

    const value = parseFloat(match[1]);
    const unit = match[2]?.toLowerCase();

    // Convert days to hours (assuming 8 hours per day)
    if (unit === "day" || unit === "days" || unit === "d") {
      return value * 8;
    }

    return value;
  };

  // Load configuration
  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    /** Read cached config saved by the ticket list page (avoids duplicate API calls). */
    const readCachedConfig = (
      spaceId: number,
    ): {
      statuses: any[];
      severities: any[];
      types: any[];
      queues: any[];
      impacts: any[];
    } | null => {
      try {
        const raw = sessionStorage.getItem(`tsConfig_${spaceId}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        // Honour a 30-minute TTL
        if (Date.now() - (parsed._cachedAt || 0) > 30 * 60 * 1000) return null;
        return {
          statuses: parsed.statuses || [],
          severities: parsed.severities || [],
          types: parsed.types || [],
          queues: parsed.queues || [],
          impacts: parsed.impacts || [],
        };
      } catch {
        return null;
      }
    };

    const load = async () => {
      try {
        setIsLoading(true);

        if (isEditMode && ticketId) {
          // ── Phase 1: fetch CORE ticket data (no assignee / participants) → show form immediately ──
          const ticket = await getTicketBaseById(Number(ticketId));

          setTicketViewData(ticket);

          const plannedEffort = ticket.plannedEffort
            ? formatHoursToEffort(ticket.plannedEffort)
            : "";
          // Derived from work logs — always a plain hours value for the read-only field
          const actualEffort = ticket.actualEffort
            ? String(ticket.actualEffort)
            : "";

          setFormData({
            ticketSpaceId: ticket.ticketSpaceId,
            ticketSpaceName: ticket.ticketSpaceName || ticket.ticketSpace?.name,
            name: ticket.name || "",
            description: ticket.description || "",
            statusId: ticket.statusId,
            severityId: ticket.severityId,
            ticketTypeId: ticket.ticketTypeId,
            queueId: ticket.queueId,
            impactId: ticket.impactId,
            ticketSlaId: ticket.ticketSlaId,
            assigneeId: ticket.assigneeId ?? undefined,
            plannedEffort,
            actualEffort,
            participantIds: [],
            participants: [],
            completionDate: ticket.completionDate || undefined,
          });

          // Initialise snapshot for old-value supply in patch calls
          formDataSnapshot.current = {
            name: ticket.name || "",
            plannedEffort,
            actualEffort,
          };

          setMetadata({
            createdAt: ticket.createdAt,
            createdBy: ticket.createdBy,
            updatedAt: ticket.updatedAt,
            updatedBy: ticket.updatedBy,
          });

          setBreadcrumbs([
            { label: ticket.ticketSpace?.name ?? "", href: `/ticket-management/ticket?ticketSpaceId=${ticket.ticketSpaceId}`, },
            { label: ticket.code ?? ticket.name, isCurrentPage: true },
          ]);

          // ── Phase 1 complete — show the form now ──
          setIsLoading(false);

          // ── Phase 2: load space config + assignees in background (parallel) ──
          setIsConfigLoading(true);

          // Pre-populate dropdowns from the list-page cache so they are usable
          // immediately, before the individual config calls resolve.
          const cached = readCachedConfig(ticket.ticketSpaceId);
          if (cached) {
            setConfig(
              (prev: any) =>
                prev ?? {
                  ticketSpace: null,
                  statuses: cached.statuses,
                  severities: cached.severities,
                  types: cached.types,
                  queues: cached.queues,
                  slas: [],
                  impacts: cached.impacts,
                  departments: [],
                  members: [],
                },
            );
          }

          (async () => {
            const spaceId = ticket.ticketSpaceId;

            // 1. Grouped Space Config (Dropdowns)
            setIsConfigLoading(true);
            Promise.all([
              getTicketSpaceStatusConfig(spaceId).catch(() => null),
              getTicketSpaceSeverityConfig(spaceId).catch(() => null),
              getTicketSpaceTypesConfig(spaceId).catch(() => null),
              getTicketSpaceQueueConfig(spaceId).catch(() => null),
              getTicketSpaceSlaConfig(spaceId).catch(() => null),
              getTicketSpaceImpactConfig(spaceId).catch(() => null),
              getTicketSpaceMembersConfig(spaceId).catch(() => null),
            ]).then(([statusRes, severityRes, typesRes, queuesRes, slasRes, impactsRes, membersRes]) => {
              setConfig({
                ticketSpace: {
                  id: spaceId,
                  name: ticket.ticketSpace?.name ?? "",
                  prefix: ticket.ticketSpace?.prefix ?? "",
                  companyId: ticket.ticketSpace?.companyId ?? 0,
                  divisionId: ticket.ticketSpace?.divisionId ?? 0,
                },
                statuses: statusRes?.statuses ?? [],
                severities: severityRes?.severities ?? [],
                types: typesRes?.types ?? [],
                queues: queuesRes?.queues ?? [],
                slas: slasRes?.slas ?? [],
                impacts: impactsRes?.impacts ?? [],
                departments: [],
                members: membersRes?.members ?? [],
              });

              // Assignees fetch depends on membersRes, so we chain it here
              setIsAssigneesLoading(true);
              getTicketAssignees(Number(ticketId))
                .then((assigneesRes) => {
                  if (assigneesRes && typeof assigneesRes === 'object') {
                    const { assignee, participants } = assigneesRes;
                    setTicketViewData((prev: any) => ({ ...prev, assignee, participants }));

                    const participantIds = (participants ?? []).map((p: any) => {
                      const member = membersRes?.members?.find((m: any) => m.userId === p.userId);
                      return member?.id || p.id;
                    });

                    const participantObjects = (participants ?? []).map((p: any) => {
                      const member = membersRes?.members?.find((m: any) => m.userId === p.userId);
                      return member || { id: p.id, userId: p.userId, userFirstName: p.userFirstName, userLastName: p.userLastName, userEmail: p.userEmail, userProfilePicture: p.profile_picture };
                    });

                    setFormData((prev) => ({
                      ...prev,
                      assigneeId: assignee?.id ?? prev.assigneeId,
                      participantIds,
                      participants: participantObjects,
                    }));
                  }
                })
                .catch(() => null)
                .finally(() => setIsAssigneesLoading(false));
            }).finally(() => setIsConfigLoading(false));

            // 2. Resource Log History
            getResourceTicketLogHistory(Number(ticketId))
              .then((logHistoryRes) => {
                if (logHistoryRes) {
                  setLogHistory(Array.isArray(logHistoryRes) ? logHistoryRes : []);
                }
              })
              .catch(() => null);
          })();

          // ── Phase 3: load individual heavy sections (fire-and-forget) ──
          (async () => {
            setIsTicketEventsLoading(true);
            try {
              const { ticketEvents: events } = await getTicketEvents(Number(ticketId));
              setTicketEvents(events);
              setLogHistoryOpen(events.length > 0);
            } catch {
              /* non-blocking */
            } finally {
              setIsTicketEventsLoading(false);
            }
          })();

          (async () => {
            setIsLinksLoading(true);
            try {
              const [linksRes, typesRes] = await Promise.all([
                getWorkItemLinks("Ticket", Number(ticketId)).catch(() => null),
                getLinkTypes("Ticket").catch(() => null),
              ]);
              if (linksRes) {
                const _links = linksRes.links ?? [];
                setWorkItemLinks(_links);
                setLinkedTasksOpen(_links.length > 0);
              }
              if (typesRes) {
                setLinkTypes(Array.isArray(typesRes) ? typesRes : []);
              }
            } catch {
              /* non-blocking */
            } finally {
              setIsLinksLoading(false);
            }
          })();
        } else {
          // ── Create mode ──
          if (!ticketSpaceId) {
            toast.error("Ticket Space ID is required");
            router.push("/ticket-management/ticket");
            return;
          }
          const spaceId = Number(ticketSpaceId);

          const [
            spaceRes,
            statusRes,
            severityRes,
            typesRes,
            queuesRes,
            slasRes,
            impactsRes,
            membersRes,
            templatesRes,
          ] = await Promise.all([
            getTicketSpaceById(spaceId),
            getTicketSpaceStatusConfig(spaceId),
            getTicketSpaceSeverityConfig(spaceId),
            getTicketSpaceTypesConfig(spaceId),
            getTicketSpaceQueueConfig(spaceId),
            getTicketSpaceSlaConfig(spaceId),
            getTicketSpaceImpactConfig(spaceId),
            getTicketSpaceMembersConfig(spaceId),
            fetchTemplates(spaceId).catch(() => []),
          ]);

          const space = spaceRes.data ?? spaceRes;

          setConfig({
            ticketSpace: {
              id: space.id,
              name: space.name,
              prefix: space.prefix ?? "",
              companyId: space.companyId ?? 0,
              divisionId: space.divisionId ?? 0,
            },
            statuses: statusRes.statuses ?? [],
            severities: severityRes.severities ?? [],
            types: typesRes.types ?? [],
            queues: queuesRes.queues ?? [],
            slas: slasRes.slas ?? [],
            impacts: impactsRes.impacts ?? [],
            departments: [],
            members: membersRes.members ?? [],
          });

          setTemplates(templatesRes ?? []);

          setBreadcrumbs([
            {
              label: space.name,
              href: `/ticket-management/ticket?ticketSpaceId=${ticketSpaceId}`,
            },
            { label: "New Ticket", isCurrentPage: true },
          ]);

          const firstStatus = (statusRes.statuses ?? [])
            .slice()
            .sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0))[0];

          // Default severity: prefer "Medium" by name, else first in list
          const severities: any[] = severityRes.severities ?? [];
          const defaultSeverity =
            severities.find((s: any) => s.name?.toLowerCase() === "medium") ??
            severities[0];
          const matchingSla = (slasRes.slas ?? []).find(
            (sla: any) => sla.severityId === defaultSeverity?.id,
          );

          const currentUserMember = (membersRes.members ?? []).find(
            (m: any) => m.userEmail === user?.email
          );

          setFormData((prev) => {
            const next = {
              ...prev,
              ticketSpaceId: space.id,
              ticketSpaceName: space.name,
              statusId: firstStatus?.id,
              severityId: defaultSeverity?.id,
              ticketSlaId: matchingSla?.id ?? prev.ticketSlaId,
              queueId:
                (queuesRes.queues ?? []).find((q: any) => q.name === "Default")
                  ?.id ?? (queuesRes.queues ?? [])[0]?.id,
              participantIds: currentUserMember ? [currentUserMember.id] : [],
              participants: currentUserMember ? [currentUserMember] : [],
            };
            setInitialFormData(next);
            return next;
          });
        }
      } catch (error) {
        console.error("Error loading ticket form:", error);
        toast.error(
          isEditMode
            ? "Failed to load ticket data"
            : "Failed to load ticket configuration",
        );
        hasLoaded.current = false;
      } finally {
        setIsLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setIsDirty(true);
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "name" || field === "ticketTypeId") {
      setErrors((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleSeverityChange = (severityId: number) => {
    setIsDirty(true);
    setFormData((prev) => {
      // Find matching SLA for this severity
      const matchingSla = config?.slas?.find(
        (sla) => sla.severityId === severityId,
      );

      return {
        ...prev,
        severityId,
        ticketSlaId: matchingSla?.id || prev.ticketSlaId,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;
    const newErrors = { name: false, ticketTypeId: false };

    // Validation
    if (!formData.name.trim()) {
      toast.error("Title is required");
      newErrors.name = true;
      hasError = true;
    }

    if (!formData.ticketSpaceId) {
      toast.error("Ticket Space is required");
      return;
    }

    if (!formData.ticketTypeId) {
      toast.error("Ticket Type is required");
      newErrors.ticketTypeId = true;
      hasError = true;
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));

    if (hasError) return;

    try {
      setIsSaving(true);

      const ticketData = {
        ...formData,
        plannedEffort: parseEffortToHours(formData.plannedEffort),
        actualEffort: parseEffortToHours(formData.actualEffort),
        ticketSpaceDivisionId: config?.ticketSpace?.divisionId,
        ticketSpacePrefix: config?.ticketSpace?.prefix,
        status: config?.statuses?.find((s: any) => s.id === formData.statusId),
        severity: config?.severities?.find((s: any) => s.id === formData.severityId),
        ticketType: config?.types?.find((t: any) => t.id === formData.ticketTypeId),
        queue: config?.queues?.find((q: any) => q.id === formData.queueId),
        impact: config?.impacts?.find((i: any) => i.id === formData.impactId),
        ticketSla: config?.slas?.find((s: any) => s.id === formData.ticketSlaId),
        assignee: config?.members?.find((m: any) => m.id === formData.assigneeId),
      };

      if (isEditMode && ticketId) {
        // Update existing ticket
        await updateTicket(Number(ticketId), ticketData);

        // Upload new attachments if any
        if (attachments.length > 0) {
          const uploadPromises = attachments.map(async (file) => {
            try {
              const uploadResponse = await uploadTicketAttachment(file);
              const attachmentUrl = uploadResponse.url;

              await createTicketAttachment({
                ticketId: Number(ticketId),
                link: attachmentUrl,
              });
            } catch (error) {
              console.error("Error uploading attachment:", error);
              toast.error(`Failed to upload ${file.name}`);
            }
          });

          await Promise.all(uploadPromises);
        }

        toast.success("Ticket updated");
        router.push(`/ticket-management/ticket?ticketSpaceId=${ticketSpaceId}`);
      } else {
        // Create new ticket — backend auto-generates the code
        const createdTicket = await createTicket(ticketData);

        // Upload attachments if any
        if (attachments.length > 0) {
          const uploadPromises = attachments.map(async (file) => {
            try {
              // Upload file to get URL
              const { url } = await uploadTicketAttachment(file);

              // Create attachment record
              await createTicketAttachment({
                ticketId: createdTicket.id,
                link: url,
              });
            } catch (error) {
              console.error("Error uploading attachment:", error);
              toast.warning(`Failed to upload ${file.name}`);
            }
          });

          await Promise.all(uploadPromises);
        }

        if (checklistItems.length > 0) {
          await Promise.all(checklistItems.map(item =>
            createTicketChecklist({
              ticketId: createdTicket.id,
              name: item.name,
              isChecked: item.isChecked || false,
              assigneeId: item.assigneeId
            }).catch(e => console.error("Failed to add checklist item", e))
          ));
        }

        toast.success("Ticket created");
        router.push(`/ticket-management/ticket?ticketSpaceId=${ticketSpaceId}`);
      }
    } catch (error: any) {
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} ticket:`,
        error,
      );
      toast.error(
        error?.response?.data?.message ||
        `Failed to ${isEditMode ? "update" : "create"} ticket`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(
      `/ticket-management/ticket${ticketSpaceId ? `?ticketSpaceId=${ticketSpaceId}` : ""}`,
    );
  };

  /**
   * Space members mapped onto the shared resource shape used by
   * ChecklistSection's assignee picker.
   */
  const checklistResources = useMemo(
    () =>
      (config?.members ?? []).map((m: any) => ({
        id: m.id,
        first_name: m.userFirstName,
        last_name: m.userLastName,
        email: m.userEmail,
        profile_pic: m.profile_picture ?? m.userProfilePicture,
      })),
    [config?.members],
  );

  // Get selected assignee
  const getSelectedAssignee = () => {
    if (!formData.assigneeId || !config) return null;
    return config.members.find((m) => m.id === formData.assigneeId);
  };

  const clearTemplate = () => {
    if (!isDirty && initialFormData) {
      setFormData(initialFormData);
      setChecklistItems([]);
    }
    setSelectedTemplate(null);
  };

  const applyTemplate = (template: TicketTemplate) => {
    setSelectedTemplate(template);
    setIsDirty(false);
    const data = template.templateData;
    setFormData((prev) => ({
      ...prev,
      name: data.name || prev.name,
      description: data.description || prev.description,
      ticketTypeId: data.ticketTypeId || prev.ticketTypeId,
      severityId: data.severityId || prev.severityId,
      statusId: data.statusId || prev.statusId,
      queueId: data.queueId || prev.queueId,
      impactId: data.impactId || prev.impactId,
      assigneeId: data.assigneeId || prev.assigneeId,
    }));

    setErrors((prev) => ({
      ...prev,
      name: data.name ? false : prev.name,
      ticketTypeId: data.ticketTypeId ? false : prev.ticketTypeId,
    }));

    if (data.checklistItems && data.checklistItems.length > 0) {
      const mapped = data.checklistItems.map((item: any, idx: number) => ({
        id: -(Date.now() + idx),
        name: item.name,
        isChecked: item.isChecked || false,
        assigneeId: item.assigneeId,
      }));
      setChecklistItems(mapped);
      setChecklistOpen(true);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!saveTemplateName.trim()) {
      toast.error("Template name is required");
      return;
    }

    setIsSaving(true);
    try {
      const templateData = {
        name: formData.name,
        description: formData.description,
        ticketTypeId: formData.ticketTypeId,
        severityId: formData.severityId,
        statusId: formData.statusId,
        queueId: formData.queueId,
        impactId: formData.impactId,
        assigneeId: formData.assigneeId,
        checklistItems: checklistItems
      };

      await createTicketTemplate({
        name: saveTemplateName,
        isShared: saveTemplateIsShared,
        ticketSpaceId: Number(ticketSpaceId) || formData.ticketSpaceId,
        templateData
      });

      toast.success("Template saved");
      setSaveTemplateOpen(false);
      setSaveTemplateName("");
      setSaveTemplateIsShared(false);

      // Reload templates if in create mode
      if (!isEditMode) {
        const res = await fetchTemplates(Number(ticketSpaceId) || formData.ticketSpaceId).catch(() => []);
        setTemplates(res);
      }
    } catch (error: any) {
      console.error("Failed to save template", error);
      toast.error(error?.response?.data?.message || "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    setIsSaving(true);
    try {
      await deleteTicketTemplate(templateToDelete.id);
      toast.success("Template deleted");
      setDeleteTemplateOpen(false);
      setTemplateToDelete(null);
      if (selectedTemplate?.id === templateToDelete.id) {
        clearTemplate();
      }
      const res = await fetchTemplates(Number(ticketSpaceId) || formData.ticketSpaceId).catch(() => []);
      setTemplates(res);
    } catch (error: any) {
      console.error("Failed to delete template", error);
      toast.error(error?.response?.data?.message || "Failed to delete template");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle participant selection
  const toggleParticipant = (memberId: number) => {
    setFormData((prev) => {
      const isSelected = prev.participantIds.includes(memberId);
      const member = config?.members.find((m) => m.id === memberId);

      let nextIds: number[];
      let nextParticipants: any[];

      if (isSelected) {
        nextIds = prev.participantIds.filter((id) => id !== memberId);
        nextParticipants = prev.participants.filter((p) => p.id !== memberId);
      } else {
        nextIds = [...prev.participantIds, memberId];
        nextParticipants = member
          ? [...prev.participants, member]
          : prev.participants;
      }

      if (isEditMode && ticketId) {
        beginAutoSave();
        patchTicketParticipants(Number(ticketId), nextIds, nextParticipants)
          .then((res) => {
            setTicketViewData((p: any) => ({
              ...p,
              participants: res.participants,
            }));
            syncMeta(res);
          })
          .catch(() => {
            endAutoSave();
            toast.error("Failed to save participants");
          });
      }
      return {
        ...prev,
        participantIds: nextIds,
        participants: nextParticipants,
      };
    });
  };

  const assignee = getSelectedAssignee() ?? ticketViewData?.assignee;
  const participants =
    formData.participants.length > 0
      ? formData.participants
      : ticketViewData?.participants ?? [];

  const canViewLogs = useMemo(() => {
    if (!user) return false;
    const assigneeEmail = assignee?.userEmail;
    const participantEmails = (participants ?? []).map((p: any) => p.userEmail);
    const hasLoggedWork = logHistory.some(log => log.resourceEmail === user.email);
    return user.email === assigneeEmail || participantEmails.includes(user.email) || hasLoggedWork;
  }, [user, assignee, participants, logHistory]);

  const canEditLogs = useMemo(() => {
    if (!user) return false;
    const assigneeEmail = assignee?.userEmail;
    const participantEmails = (participants ?? []).map((p: any) => p.userEmail);
    return user.email === assigneeEmail || participantEmails.includes(user.email);
  }, [user, assignee, participants]);

  // Actual effort is derived server-side from the cumulative work-log effort.
  // Every log create/update/delete returns the recalculated value.
  const applyActualEffort = (actualEffort?: number | null) => {
    if (actualEffort === undefined || actualEffort === null) return;
    const val = String(actualEffort);
    handleInputChange("actualEffort", val);
    if (formDataSnapshot.current) {
      formDataSnapshot.current = { ...formDataSnapshot.current, actualEffort: val };
    }
  };

  const handleSaveLog = async () => {
    if (!ticketId || !user) return;
    const { startTimeDate, endTimeDate, effort, note } = newLogEntry;
    if (!startTimeDate || !endTimeDate || !effort) {
      toast.error('Start date, end date, and effort are required');
      return;
    }
    setIsAddingLog(true);
    try {
      const resourceType =
        user.email === assignee?.userEmail
          ? AssigneeType.ASS
          : AssigneeType.SBASS;

      const payload = {
        postId: Number(ticketId),
        postCode: ticketViewData?.code,
        postType: 'Ticket' as any,
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

  const reloadWorkItemLinks = useCallback(async () => {
    if (!ticketId) return;
    try {
      const res = await getWorkItemLinks("Ticket", Number(ticketId));
      setWorkItemLinks(res.links ?? []);
    } catch {
      /* ignore */
    }
  }, [ticketId]);

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

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Main Content - Two Column Layout */}
      <div className="flex-1 overflow-hidden flex pt-8">
        {/* Left Side - Form */}
        <div className="flex flex-col" style={{ width: "60%" }}>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Ticket Code */}
            {/* Ticket Code and Templates */}
            <div className="flex justify-between items-center w-full">
              <div className="space-y-1">
                <Label className="text-sm">Code</Label>
                <div className="flex items-center gap-2">
                  {isLoading ? (
                    <Skeleton className="h-6 w-24" />
                  ) : isEditMode ? (
                    <span className="text-md font-semibold tracking-wide"
                      style={{ color: '#3B82F6' }}>
                      {ticketViewData?.code ?? ""}
                    </span>
                  ) : (
                    <span className="text-md font-semibold tracking-wide select-none"
                      style={{ color: '#3B82F6' }}>
                      {config?.ticketSpace?.prefix ?? ""}-
                      <Popover open={codeHintOpen}>
                        <PopoverTrigger asChild>
                          <span
                            className="cursor-help"
                            onMouseEnter={() => setCodeHintOpen(true)}
                            onMouseLeave={() => setCodeHintOpen(false)}
                          >
                            ?
                          </span>
                        </PopoverTrigger>
                        <PopoverContent
                          side="right"
                          className="text-xs w-auto px-3 py-2"
                        >
                          Code will be generated when saving
                        </PopoverContent>
                      </Popover>
                    </span>
                  )}
                </div>
              </div>

              {!isEditMode && (
                <div className="flex flex-col items-end w-[220px]">
                  <Popover open={templateSearchOpen} onOpenChange={setTemplateSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between px-3 cursor-pointer bg-white dark:bg-gray-900 hover:bg-white dark:hover:bg-gray-900">
                        <span className={cn("truncate font-normal", !selectedTemplate && "text-muted-foreground")}>{selectedTemplate ? selectedTemplate.name : "Apply template..."}</span>
                        {selectedTemplate ? (
                          <div
                            className="cursor-pointer group"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              clearTemplate();
                            }}
                          >
                            <X className="h-4 w-4 shrink-0 text-destructive/70 group-hover:text-destructive transition-colors" />
                          </div>
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[420px] p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Search templates..." />
                        <CommandEmpty>No templates found.</CommandEmpty>
                        <CommandGroup>
                          {[...templates]
                            .sort((a, b) => {
                              const aIsMine = a.createdBy === user?.email;
                              const bIsMine = b.createdBy === user?.email;
                              if (aIsMine && !bIsMine) return -1;
                              if (!aIsMine && bIsMine) return 1;
                              return 0;
                            })
                            .map((t) => {
                              return (
                                <CommandItem
                                  key={t.id}
                                  value={t.name}
                                  onSelect={() => {
                                    if (selectedTemplate?.id === t.id) {
                                      clearTemplate();
                                    } else {
                                      applyTemplate(t);
                                    }
                                    setTemplateSearchOpen(false);
                                  }}
                                >
                                  <div className="flex justify-between items-center w-full cursor-pointer">
                                    <div className="flex items-center gap-2">
                                      {selectedTemplate?.id === t.id ? (
                                        <Check className="w-4 h-4 text-primary" />
                                      ) : (
                                        <div className="w-4 h-4" />
                                      )}
                                      <span className="text-sm">{t.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2">
                                      {t.createdBy === user?.email ? (
                                        <Badge variant="outline" className="bg-primary text-white text-[11px]">My Template</Badge>
                                      ) : t.isShared ? (
                                        <Badge variant="outline" className="border text-[11px]">Shared with me</Badge>
                                      ) : null}
                                      {t.createdBy === user?.email ? (
                                        <button
                                          type="button"
                                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors z-10 flex items-center justify-center w-4 h-4"
                                          onPointerDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setTemplateToDelete(t);
                                            setDeleteTemplateOpen(true);
                                          }}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                          }}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      ) : (
                                        <div className="w-4 h-4 shrink-0" />
                                      )}
                                    </div>
                                  </div>
                                </CommandItem>
                              );
                            })}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <span className={`flex items-center gap-1 pr-1 text-xs text-muted-foreground mt-1 whitespace-nowrap ${selectedTemplate ? "" : "invisible"}`}>
                    <Info className="w-3 h-3 shrink-0" />
                    Template applied. Review fields and modify before creating ticket.
                  </span>

                  <Dialog open={deleteTemplateOpen} onOpenChange={setDeleteTemplateOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Template</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete the template "{templateToDelete?.name}"? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTemplateOpen(false)} disabled={isSaving}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteTemplate} disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            "Delete"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
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
                  placeholder="Provide brief summary of the ticket..."
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  onBlur={async (e) => {
                    if (!isEditMode || !ticketId) return;
                    const name = e.target.value.trim();
                    if (!name) return;
                    try {
                      beginAutoSave();
                      const res = await patchTicketName(
                        Number(ticketId),
                        name,
                        formDataSnapshot.current?.name ?? null,
                      );
                      formDataSnapshot.current = {
                        ...formDataSnapshot.current!,
                        name,
                      };
                      syncMeta(res);
                    } catch {
                      endAutoSave();
                      toast.error("Failed to save title");
                    }
                  }}
                  required
                  className={cn(
                    "bg-white dark:bg-gray-900 shadow-none placeholder:opacity-80",
                    errors.name && "border-red-500 focus-visible:border-red-500 focus-visible:ring-0",
                  )}
                />
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm">
                Description
              </Label>

              {/* Unified container handling the click-outside save */}
              {isLoading ? (
                <Skeleton className="h-[180px] w-full" />
              ) : (
                <div
                  className="overflow-hidden rounded-md border border-input bg-white dark:bg-gray-900 focus-within:ring-1 focus-within:ring-ring h-[180px] flex flex-col"
                  onBlur={async (e) => {
                    // If the newly focused element is still INSIDE this container (like clicking a bold/italic button), do nothing.
                    if (e.currentTarget.contains(e.relatedTarget)) return;

                    // Ensure we are in edit mode and have an ID before saving
                    if (!isEditMode || !ticketId) return;

                    try {
                      beginAutoSave();
                      const res = await patchTicketDescription(
                        Number(ticketId),
                        formData.description,
                      );
                      syncMeta(res);
                      toast.success("Description saved");
                    } catch {
                      toast.error("Failed to save description");
                    } finally {
                      endAutoSave();
                    }
                  }}
                >
                  <RichTextEditor
                    value={formData.description}
                    onChange={(value) => {
                      // Only update local state here—no auto-save on typing
                      handleInputChange("description", value);
                    }}
                    placeholder="Provide details of the ticket"
                    className="border-0 h-full flex flex-col rounded-none"
                    editorClassName="flex-1 min-h-0 overflow-y-auto"
                  />
                </div>
              )}
            </div>

            {/* Comments — edit / view mode only, collapsible */}
            {isEditMode && ticketId && (
              <>
                <Collapsible open={commentsOpen} onOpenChange={setCommentsOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2 w-full text-left"
                    >
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform duration-200",
                          !commentsOpen && "-rotate-90",
                        )}
                      />
                      <span className="text-sm font-medium">Comments</span>
                      {commentCount > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({commentCount})
                        </span>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <div className={cn("mt-3", !commentsOpen && "hidden")}>
                    <CommentSection
                      postId={Number(ticketId)}
                      postType="Ticket"
                      onCommentCountChange={(count) => {
                        setCommentCount(count);
                        if (count > 0) setCommentsOpen(true);
                      }}
                    />
                  </div>
                </Collapsible>
              </>
            )}

            {/* Attachments — collapsible */}
            <Separator />
            <Collapsible
              open={attachmentsOpen}
              onOpenChange={setAttachmentsOpen}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full text-left"
                >
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform duration-200",
                      !attachmentsOpen && "-rotate-90",
                    )}
                  />
                  <span className="text-sm font-medium">Attachments</span>
                  {attachmentCount > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({attachmentCount})
                    </span>
                  )}
                </button>
              </CollapsibleTrigger>
              {/* Use a plain div (not CollapsibleContent) so AttachmentSection is always mounted,
                allowing it to fetch on load and call onAttachmentCountChange to auto-expand */}
              <div className={cn("mt-3", !attachmentsOpen && "hidden")}>
                <AttachmentSection
                  entityType="Ticket"
                  entityId={
                    isEditMode && ticketId ? Number(ticketId) : undefined
                  }
                  pendingFiles={attachments}
                  onPendingFilesChange={setAttachments}
                  onAttachmentCountChange={(count) => {
                    setAttachmentCount(count);
                    if (count > 0) setAttachmentsOpen(true);
                  }}
                />
              </div>
            </Collapsible>

            {/* Checklist — collapsible */}
            <>
              <Separator />
              <Collapsible open={checklistOpen} onOpenChange={setChecklistOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full text-left"
                  >
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform duration-200",
                        !checklistOpen && "-rotate-90",
                      )}
                    />
                    <span className="text-sm font-medium">Checklist</span>
                    {checklistItems.length > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({checklistItems.filter((i: any) => i.isChecked).length}/{checklistItems.length})
                      </span>
                    )}
                  </button>
                </CollapsibleTrigger>
                <div className={cn("mt-3", !checklistOpen && "hidden")}>
                  <ChecklistSection
                    mode={isEditMode && ticketId ? 'bound' : 'unbound'}
                    initialItems={!isEditMode || !ticketId ? checklistItems : undefined}
                    entityType="Ticket"
                    entityId={isEditMode && ticketId ? Number(ticketId) : 0}
                    resources={checklistResources}
                    memberIds={(config?.members ?? []).map((m: any) => m.id)}
                    isResourcesLoading={!config?.members}
                    onItemsChange={(items) => {
                      setChecklistItems(items);
                      if (items.length > 0 && !checklistOpen) setChecklistOpen(true);
                    }}
                  />
                </div>
              </Collapsible>
            </>

            {/* -- Linked Tasks / Tickets (edit mode only) ------------------ */}
            {isEditMode && ticketId && (
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
                                      const TypeIcon = isTicket ? undefined : (it.typeIcon ? getHierarchyLevelIcon(it.typeIcon) : Folder);
                                      const initials = (it.assigneeName ?? '')
                                        .split(' ')
                                        .filter(Boolean)
                                        .slice(0, 2)
                                        .map((s: string) => s[0]?.toUpperCase())
                                        .join('') || '';
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
                                              <span className="font-semibold tracking-wide flex-shrink-0 text-gray-900 dark:text-gray-100 text-xs whitespace-nowrap">
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
                                                <Avatar className="w-6 h-6 text-[10px]">
                                                  {it.assigneeProfilePicUrl && (
                                                    <AvatarImage src={it.assigneeProfilePicUrl} alt={it.assigneeName} className="object-cover" />
                                                  )}
                                                  <AvatarFallback style={{ fontSize: '10px' }}>{initials}</AvatarFallback>
                                                </Avatar>
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
                                                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-none">{linkedCommentCounts[link.linkId]}</span>
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
                                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                onClick={(e) => { e.stopPropagation(); handleUnlink(link.linkId); }}
                                              >
                                                <Unlink className="w-3.5 h-3.5 text-muted-foreground" />
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
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-b-md"
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
                  currentType="Ticket"
                  currentId={Number(ticketId)}
                  linkTypes={linkTypes}
                  linkedKeys={new Set(workItemLinks.map((l) => `${l.item.type}:${l.item.id}`))}
                  onLinked={reloadWorkItemLinks}
                />
              </>
            )}

            {/* -- Log History (edit mode only) ------------------------------ */}
            {isEditMode && ticketId && (isTicketEventsLoading || ticketEvents.length > 0) && (() => {
              // Build email → resource lookup from all available sources
              const emailToResource: Record<string, any> = {};
              const allResources = [
                ...(config?.members ?? []).map((m: any) => ({
                  email: m.userEmail,
                  first_name: m.userFirstName,
                  last_name: m.userLastName,
                  profile_pic: m.profile_picture ?? m.userProfilePicture,
                })),
                ...(ticketViewData?.participants ?? []).map((p: any) => ({
                  email: p.userEmail,
                  first_name: p.userFirstName,
                  last_name: p.userLastName,
                  profile_pic: p.profile_picture ?? p.userProfilePicture,
                })),
              ];
              if (ticketViewData?.assignee) allResources.push({
                email: ticketViewData.assignee.userEmail,
                first_name: ticketViewData.assignee.userFirstName,
                last_name: ticketViewData.assignee.userLastName,
                profile_pic: ticketViewData.assignee.profile_picture ?? ticketViewData.assignee.userProfilePicture,
              });
              allResources.forEach((r: any) => {
                if (r?.email) emailToResource[r.email] = r;
              });

              const getActorInfo = (actorId: string | null): { name: string; initials: string; profilePic?: string | null } => {
                if (!actorId) return { name: 'System', initials: 'S', profilePic: null };
                const resource = emailToResource[actorId];
                if (resource) {
                  const name = `${resource.first_name ?? ''} ${resource.last_name ?? ''}`.trim() || actorId;
                  const initials = ((resource.first_name?.[0] ?? '') + (resource.last_name?.[0] ?? '')).toUpperCase() || actorId[0]?.toUpperCase() || '?';
                  return { name, initials, profilePic: resource.profile_pic };
                }
                const parts = actorId.split('@')[0].split(/[._-]/);
                const initials = parts.slice(0, 2).map((p: string) => p[0]?.toUpperCase() ?? '').join('');
                return { name: actorId, initials: initials || '?' };
              };

              const fieldLabels: Record<string, string> = {
                statusName: 'Status', statusId: 'Status',
                severityName: 'Severity', severityId: 'Severity',
                assigneeName: 'Assignee', assigneeId: 'Assignee',
                queueName: 'Queue', queueId: 'Queue',
                ticketTypeName: 'Type', ticketTypeId: 'Type',
                name: 'Name', description: 'Description',
                plannedEffort: 'Planned Effort', actualEffort: 'Actual Effort',
                completionDate: 'Completion Date',
              };

              const formatFieldValue = (val: any): string => {
                if (val === null || val === undefined || val === '') return 'None';
                if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
                  const d = new Date(val);
                  if (!isNaN(d.getTime())) return format(d, 'LLL dd, yyyy');
                }
                if (typeof val === 'number' && (val === 0 || val)) return `${val}`;
                return String(val);
              };

              const getActionText = (ev: any): { text: string; field?: string } => {
                const t = ev.eventType as string;
                if (t === 'TICKET_CREATED') return { text: 'created the ticket' };
                if (t === 'TICKET_DELETED') return { text: 'deleted the ticket' };
                if (t === 'COMMENT_ADDED') return { text: 'added a comment' };
                if (t === 'STATUS_CHANGED') return { text: 'changed the Status', field: 'statusName' };
                if (t === 'SEVERITY_CHANGED') return { text: 'changed the Severity', field: 'severityName' };
                if (t === 'TICKET_ASSIGNED') return { text: 'changed the Assignee', field: 'assigneeName' };
                if (t === 'QUEUE_CHANGED') return { text: 'changed the Queue', field: 'queueName' };
                if (t === 'TYPE_CHANGED') return { text: 'changed the Type', field: 'ticketTypeName' };
                if (t === 'NAME_CHANGED') return { text: 'renamed the ticket', field: 'name' };
                if (t === 'TICKET_UPDATED' || t === 'TICKET_DESCRIPTION_UPDATED') {
                  const payload = ev.payload ?? {};
                  const keys = Object.keys(payload).filter(k => !['ticketId', 'id', 'updatedBy'].includes(k));
                  const labelKey = keys.find(k => fieldLabels[k]) || keys[0];
                  if (labelKey && fieldLabels[labelKey]) return { text: `updated the ${fieldLabels[labelKey]}`, field: labelKey };
                  if (labelKey) {
                    const readable = labelKey.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
                    return { text: `updated the ${readable}`, field: labelKey };
                  }
                  return { text: 'updated the ticket' };
                }
                const readable = t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
                return { text: readable };
              };

              const getFromTo = (ev: any, fieldHint?: string): Array<{ label: string; from: string; to: string; fromPic?: string; toPic?: string }> => {
                const payload = ev.payload ?? {};
                const keysToCheck = fieldHint
                  ? [fieldHint, ...Object.keys(payload).filter(k => k !== fieldHint)]
                  : Object.keys(payload);

                for (const k of keysToCheck) {
                  if (['ticketId', 'id', 'updatedBy'].includes(k)) continue;
                  const p = payload[k];
                  if (p && typeof p === 'object' && ('from' in p || 'to' in p)) {
                    if (k.toLowerCase().includes('pic') || k.toLowerCase().includes('url') || k.toLowerCase().includes('email')) continue;

                    let fromVal = formatFieldValue(p.from);
                    let toVal = formatFieldValue(p.to);
                    let fromPic: string | undefined;
                    let toPic: string | undefined;

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
                    } else if ((k === 'assigneeId' || k === 'assigneeName') && config?.members) {
                      const fromMember = config.members.find((m: any) => String(m.id) === String(p.from));
                      const toMember = config.members.find((m: any) => String(m.id) === String(p.to));
                      if (fromMember) fromVal = `${fromMember.userFirstName ?? ''} ${fromMember.userLastName ?? ''}`.trim() || (fromMember.userEmail ?? '');
                      if (toMember) toVal = `${toMember.userFirstName ?? ''} ${toMember.userLastName ?? ''}`.trim() || (toMember.userEmail ?? '');
                      fromPic = payload.assigneeProfilePicUrl?.from || payload.assigneeProfilePicture?.from || fromMember?.userProfilePicture;
                      toPic = payload.assigneeProfilePicUrl?.to || payload.assigneeProfilePicture?.to || toMember?.userProfilePicture;
                    } else if ((k === 'queueId' || k === 'queueName') && config?.queues) {
                      const fromQueue = config.queues.find((q: any) => String(q.id) === String(p.from));
                      const toQueue = config.queues.find((q: any) => String(q.id) === String(p.to));
                      if (fromQueue) fromVal = fromQueue.name;
                      if (toQueue) toVal = toQueue.name;
                    } else if ((k === 'ticketTypeId' || k === 'ticketTypeName') && config?.types) {
                      const fromType = config.types.find((t: any) => String(t.id) === String(p.from));
                      const toType = config.types.find((t: any) => String(t.id) === String(p.to));
                      if (fromType) fromVal = fromType.name;
                      if (toType) toVal = toType.name;
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
                        {!isTicketEventsLoading && <span className="text-xs text-muted-foreground ml-1">({ticketEvents.length})</span>}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      {isTicketEventsLoading ? (
                        <div className="p-4 flex justify-center border border-border rounded-md">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                      ) : (
                        <div className="space-y-0">
                          {[...ticketEvents].sort((a, b) => {
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
                            const visibleEventsLength = Math.min(ticketEvents.length, visibleLogHistoryCount);
                            const isLast = idx === visibleEventsLength - 1;

                            return (
                              <div key={ev.id ?? idx} className="flex gap-3">
                                {/* Timeline column: avatar + connector line */}
                                <div className="flex flex-col items-center flex-shrink-0">
                                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden', avatarBg)}>
                                    {actor.profilePic ? (
                                      <img src={actor.profilePic} alt={actor.name} className="w-full h-full object-cover" />
                                    ) : (
                                      actor.initials
                                    )}
                                  </div>
                                  {(!isLast || visibleLogHistoryCount < ticketEvents.length || visibleLogHistoryCount > 5) && (
                                    <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 my-1" />
                                  )}
                                </div>

                                {/* Content column */}
                                <div className={cn('flex-1 min-w-0', (!isLast || visibleLogHistoryCount < ticketEvents.length || visibleLogHistoryCount > 5) && 'pb-4')}>
                                  <div className="flex items-center gap-1 flex-wrap text-xs">
                                    <span className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{actor.name}</span>
                                    <span className="text-gray-600 dark:text-gray-400">{actionText}</span>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground mt-0.5">
                                    {relativeTimeStr}
                                  </div>
                                  {fromToPairs.length > 0 && (
                                    <div className="mt-1.5 flex flex-col gap-1">
                                      {fromToPairs.map((pair, pi) => (
                                        <div key={pi} className="flex items-center gap-1.5 flex-wrap">
                                          <span className="inline-flex items-center text-[11px] text-gray-500 dark:text-gray-400 font-medium">
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

                          {(visibleLogHistoryCount < ticketEvents.length || visibleLogHistoryCount > 5) && (
                            <div className="flex gap-3 pt-1">
                              <div className="w-8 flex-shrink-0" />
                              <div className="flex gap-2">
                                {visibleLogHistoryCount < ticketEvents.length && (
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

          {/* Left Side Footer - Action Buttons */}
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
                      const subject = encodeURIComponent(`Ticket: ${ticketViewData?.name || ''}${ticketViewData?.code ? ` [${ticketViewData.code}]` : ''}`);
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
                      const text = `[${ticketViewData?.code || "TKT"}] ${ticketViewData?.name || "Ticket"}`;
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
              {/* Auto-saved indicator */}
              {isEditMode && (isAutoSaving || autoSavedAt) && (
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  {isAutoSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CircleCheck className="w-3.5 h-3.5" />
                  )}
                  {isAutoSaving
                    ? "Saving\u2026"
                    : `Changes Saved. ${autoSavedAt!.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`}
                </span>
              )}



              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={handleCancel}
                disabled={isSaving}
              >
                {isEditMode ? "Go Back" : "Cancel"}
              </Button>

              {!selectedTemplate && (isDirty || isEditMode) && (
                <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" type="button" className="border-dashed cursor-pointer" disabled={isSaving}>
                      <Bookmark className="w-4 h-4" />
                      Save as Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Ticket Template</DialogTitle>
                      <DialogDescription>
                        Save the current ticket details as a reusable template.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Template Name</Label>
                        <Input value={saveTemplateName} onChange={e => setSaveTemplateName(e.target.value)} placeholder="e.g. Bug Report Template" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isShared"
                          checked={saveTemplateIsShared}
                          onChange={e => setSaveTemplateIsShared(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="isShared">Share with other space members</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSaveTemplateOpen(false)} disabled={isSaving}>Cancel</Button>
                      <Button onClick={handleSaveAsTemplate} disabled={isSaving || !saveTemplateName.trim()}>Save Template</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {!isEditMode && (
                <Button onClick={handleSubmit} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Ticket"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Metadata */}
        <div
          className="border-l bg-muted/30 overflow-y-auto flex flex-col [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
          style={{ width: "40%" }}
        >
          {/* ── STATUS / TYPE / SEVERITY / QUEUE / IMPACT ─────── */}
          <div className="px-2 py-3 flex flex-col gap-2 pb-6">
            {/* Status */}
            <div className="grid grid-cols-[110px_1fr] items-center min-h-8 rounded-md hover:bg-muted/40 transition-colors">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-1">
                Status
              </span>
              <div className="px-2 py-1">
                <InlineEditableStatus
                  externalLoading={isLoading}
                  status={
                    config?.statuses?.find(
                      (s: any) => s.id === formData.statusId,
                    ) ??
                    (ticketViewData?.statusName
                      ? {
                        id: ticketViewData.statusId,
                        name: ticketViewData.statusName,
                        color: ticketViewData.statusColor,
                        base: ticketViewData.statusBase,
                      }
                      : ticketViewData?.status) ??
                    null
                  }
                  ticketSpaceId={
                    formData.ticketSpaceId || Number(ticketSpaceId)
                  }
                  ticketId={Number(ticketId) || 0}
                  preloadedStatuses={config?.statuses}
                  onUpdate={async (statusId) => {
                    if (isEditMode && ticketId) {
                      try {
                        beginAutoSave();
                        const res = await patchTicketStatus(
                          Number(ticketId),
                          statusId,
                          formData.statusId ?? null,
                        );
                        handleInputChange("statusId", res.statusId ?? statusId);
                        setTicketViewData((p: any) => ({
                          ...p,
                          status: res.status,
                        }));
                        syncMeta(res);
                      } catch {
                        endAutoSave();
                        throw new Error("Failed to save status");
                      }
                    } else {
                      handleInputChange("statusId", statusId);
                    }
                  }}
                />
              </div>
            </div>

            {/* Type */}
            <div className="grid grid-cols-[110px_1fr] items-center min-h-8 rounded-md transition-colors">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-1">
                Type
              </span>
              <div className="px-2 py-1">
                <InlineEditableTicketType
                  externalLoading={isLoading}
                  ticketType={
                    config?.types?.find(
                      (t: any) => t.id === formData.ticketTypeId,
                    ) ??
                    (ticketViewData?.ticketTypeName
                      ? {
                        id: ticketViewData.ticketTypeId,
                        name: ticketViewData.ticketTypeName,
                        icon: ticketViewData.ticketTypeIcon,
                        color: ticketViewData.ticketTypeColor,
                      }
                      : ticketViewData?.ticketType) ??
                    null
                  }
                  ticketSpaceId={
                    formData.ticketSpaceId || Number(ticketSpaceId)
                  }
                  ticketId={Number(ticketId) || 0}
                  preloadedTypes={config?.types}
                  getIconComponent={getTicketTypeIcon}
                  hasError={errors.ticketTypeId}
                  onUpdate={async (typeId) => {
                    if (isEditMode && ticketId) {
                      try {
                        beginAutoSave();
                        const res = await patchTicketType(
                          Number(ticketId),
                          typeId,
                        );
                        handleInputChange(
                          "ticketTypeId",
                          res.ticketTypeId ?? typeId,
                        );
                        setTicketViewData((p: any) => ({
                          ...p,
                          ticketType: res.ticketType,
                        }));
                        syncMeta(res);
                      } catch {
                        endAutoSave();
                        throw new Error("Failed to save type");
                      }
                    } else {
                      handleInputChange("ticketTypeId", typeId);
                    }
                  }}
                />
              </div>
            </div>

            {/* Severity */}
            <div className="grid grid-cols-[110px_1fr] items-center min-h-8 rounded-md hover:bg-muted/40 transition-colors">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-1">
                Severity
              </span>
              <div className="px-2 py-1">
                <InlineEditableSeverity
                  externalLoading={isLoading}
                  severity={
                    config?.severities?.find(
                      (s: any) => s.id === formData.severityId,
                    ) ??
                    (ticketViewData?.severityName
                      ? {
                        id: ticketViewData.severityId,
                        name: ticketViewData.severityName,
                        color: ticketViewData.severityColor,
                      }
                      : ticketViewData?.severity) ??
                    null
                  }
                  ticketSpaceId={
                    formData.ticketSpaceId || Number(ticketSpaceId)
                  }
                  ticketId={Number(ticketId) || 0}
                  preloadedSeverities={config?.severities}
                  onUpdate={async (severityId) => {
                    if (isEditMode && ticketId) {
                      try {
                        beginAutoSave();
                        const res = await patchTicketSeverity(
                          Number(ticketId),
                          severityId,
                          formData.severityId ?? null,
                        );
                        handleSeverityChange(res.severityId ?? severityId);
                        setTicketViewData((p: any) => ({
                          ...p,
                          severity: res.severity,
                          slaResponseDeadline: res.slaResponseDeadline,
                          slaResolutionDeadline: res.slaResolutionDeadline,
                        }));

                        syncMeta(res);
                        syncMeta(res);
                      } catch {
                        endAutoSave();
                        throw new Error("Failed to save severity");
                      }
                    } else {
                      handleSeverityChange(severityId);
                    }
                  }}
                />
              </div>
            </div>


            {/* ── SLA ──────────────────────────────────────────── */}
            {isLoading ? (
              <div className="grid grid-cols-[110px_1fr] items-start min-h-8 rounded-md hover:bg-muted/40 transition-colors">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-1 pt-2">
                  SLA
                </span>
                <div className="flex flex-col gap-1.5 px-2 py-1">
                  <div className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                    <div className="flex items-start gap-2.5">
                      <Skeleton className="mt-0.5 w-7 h-7 rounded-full flex-shrink-0" />
                      <div className="space-y-2 min-w-0 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <div className="space-y-1 mt-1">
                          <Skeleton className="h-6 w-24 rounded" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                        <div className="border-t border-dashed border-border my-2" />
                        <div className="space-y-1">
                          <Skeleton className="h-6 w-24 rounded" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* SLA Information (Create mode only) */}
                {!isEditMode && (
                  <div className="grid grid-cols-[110px_1fr] items-start min-h-8 rounded-md hover:bg-muted/40 transition-colors">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-1 pt-2">
                      SLA
                    </span>
                    <div className="flex flex-col gap-1.5 px-2 py-1">
                      {!formData.severityId ? (
                        <div className="border border-dashed border-input rounded-lg p-4 bg-muted/20">
                          <div className="flex flex-col items-center justify-center text-center gap-2">
                            <AlertTriangle className="w-6 h-6 text-muted-foreground/50" />
                            <div className="text-xs text-muted-foreground">
                              Select severity to check SLA
                            </div>
                          </div>
                        </div>
                      ) : (
                        (() => {
                          const matchingSla = config?.slas?.find(
                            (sla) => sla.severityId === formData.severityId,
                          );
                          if (
                            !matchingSla ||
                            !matchingSla.responseTime ||
                            !matchingSla.resolutionTime
                          ) {
                            return (
                              <div className="border border-dashed border-input rounded-lg p-4 bg-muted/20">
                                <div className="flex flex-col items-center justify-center text-center gap-2">
                                  <Info className="w-6 h-6 text-muted-foreground/50" />
                                  <div className="text-xs text-muted-foreground">
                                    SLA is not configured for this severity
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          const {
                            responseTime: responseMinutes,
                            resolutionTime: resolutionMinutes,
                          } = matchingSla;
                          const createdAt = metadata.createdAt
                            ? new Date(metadata.createdAt)
                            : new Date();
                          const responseTime = new Date(
                            createdAt.getTime() + responseMinutes * 60 * 1000,
                          );
                          const resolutionTime = new Date(
                            createdAt.getTime() + resolutionMinutes * 60 * 1000,
                          );
                          const formatDateTime = (date: Date) =>
                            date.toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            });
                          return (
                            <div className="rounded-md border border-input bg-white dark:bg-transparent p-3">
                              <div className="flex items-start gap-2.5">
                                <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-gray-400">
                                  <Clock className="w-3.5 h-3.5 text-white dark:text-gray-900" strokeWidth={2.5} />
                                </div>
                                <div className="min-w-0 flex flex-col gap-1 w-full">
                                  <p className="text-sm font-semibold text-foreground">
                                    SLA Information
                                  </p>

                                  {/* Response row */}
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5 text-xs font-medium rounded-md border border-border px-2 py-1 w-fit text-foreground">
                                      <Clock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                                      <span className="font-bold tabular-nums">
                                        {responseMinutes >= 60
                                          ? `${(responseMinutes / 60).toFixed(1)}h`
                                          : `${responseMinutes}m`}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Response due {formatDateTime(responseTime)}
                                    </p>
                                  </div>

                                  <div className="border-t border-dashed border-border my-0.5" />

                                  {/* Resolution row */}
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5 text-xs font-medium rounded-md border border-border px-2 py-1 w-fit text-foreground">
                                      <Clock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                                      <span className="font-bold tabular-nums">
                                        {resolutionMinutes >= 60
                                          ? `${(resolutionMinutes / 60).toFixed(1)}h`
                                          : `${resolutionMinutes}m`}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Resolution due {formatDateTime(resolutionTime)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>
                )}

                {/* SLA Countdown (Edit mode only) */}
                {isEditMode &&
                  (slaCountdown.responseDeadline ||
                    slaCountdown.resolutionDeadline) && (
                    <div className="grid grid-cols-[110px_1fr] items-start min-h-8 rounded-md hover:bg-muted/40 transition-colors">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-1 pt-2">
                        SLA
                      </span>
                      <div className="flex flex-col gap-1.5 px-2 py-1">
                        <div className="rounded-md border border-input bg-white dark:bg-transparent p-3">
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${slaCountdown.responseExpired || slaCountdown.resolutionExpired ? "bg-red-400" : "bg-gray-400"}`}
                            >
                              {slaCountdown.responseExpired || slaCountdown.resolutionExpired ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-white dark:text-gray-900" strokeWidth={2.5} />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-white dark:text-gray-900" strokeWidth={2.5} />
                              )}
                            </div>
                            <div className="min-w-0 flex flex-col gap-1 w-full">
                              {slaCountdown.responseExpired || slaCountdown.resolutionExpired ? (
                                <p className="text-sm font-semibold text-destructive">
                                  SLA deadline breached
                                </p>
                              ) : (
                                <p className="text-sm font-semibold text-foreground">
                                  SLA on track
                                </p>
                              )}

                              {/* Response row */}
                              <div className="flex flex-col gap-0.5">
                                <div
                                  className={`flex items-center gap-1.5 text-xs font-medium rounded-md border border-border px-2 py-1 w-fit text-foreground`}
                                >
                                  {slaCountdown.responseExpired ? (
                                    <Clock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                                  ) : (
                                    <Clock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                                  )}
                                  <span className="font-bold tabular-nums">
                                    {slaCountdown.responseTimeLeft}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Response {slaCountdown.responseExpired ? "was due" : "due"}{" "}
                                  {slaCountdown.responseDeadline?.toLocaleString(
                                    "en-US",
                                    { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }
                                  )}
                                </p>
                              </div>

                              <div className="border-t border-dashed border-border my-0.5" />

                              {/* Resolution row */}
                              <div className="flex flex-col gap-0.5">
                                <div
                                  className={`flex items-center gap-1.5 text-xs font-medium rounded-md border border-border px-2 py-1 w-fit text-foreground`}
                                >
                                  {slaCountdown.resolutionExpired ? (
                                    <Clock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                                  ) : (
                                    <Clock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                                  )}
                                  <span className="font-bold tabular-nums">
                                    {slaCountdown.resolutionTimeLeft}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Resolution {slaCountdown.resolutionExpired ? "was due" : "due"}{" "}
                                  {slaCountdown.resolutionDeadline?.toLocaleString(
                                    "en-US",
                                    { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                {/* No SLA section in edit mode without SLA */}
                {isEditMode &&
                  !slaCountdown.responseDeadline &&
                  !slaCountdown.resolutionDeadline && (
                    <div className="grid grid-cols-[110px_1fr] items-start min-h-8 rounded-md hover:bg-muted/40 transition-colors">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-1 pt-2">
                        SLA
                      </span>
                      <div className="flex flex-col gap-1.5 px-2 py-1">
                        <div className="rounded-md border border-input bg-white dark:bg-transparent p-3">
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-gray-400">
                              <Clock className="w-3.5 h-3.5 text-white dark:text-gray-900" strokeWidth={2.5} />
                            </div>
                            <div className="min-w-0 flex flex-col gap-1 w-full pt-0.5">
                              <p className="text-xs font-semibold text-foreground">
                                No SLA Configured
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                No service level agreement is configured in this space.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
              </>
            )}

            {/* Queue */}
            <div className="grid grid-cols-[110px_1fr] items-center min-h-8 rounded-md hover:bg-muted/40 transition-colors">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-1">
                Queue
              </span>
              <div className="px-2 py-1">
                <InlineEditableQueue
                  externalLoading={isLoading}
                  queue={
                    config?.queues?.find(
                      (q: any) => q.id === formData.queueId,
                    ) ??
                    (ticketViewData?.queueName
                      ? {
                        id: ticketViewData.queueId,
                        name: ticketViewData.queueName,
                      }
                      : ticketViewData?.queue) ??
                    null
                  }
                  ticketSpaceId={
                    formData.ticketSpaceId || Number(ticketSpaceId)
                  }
                  ticketId={Number(ticketId) || 0}
                  preloadedQueues={config?.queues}
                  onUpdate={async (queueId) => {
                    if (isEditMode && ticketId && queueId !== null) {
                      try {
                        beginAutoSave();
                        const res = await patchTicketQueue(
                          Number(ticketId),
                          queueId,
                          formData.queueId ?? null,
                        );
                        handleInputChange("queueId", res.queueId ?? queueId);
                        setTicketViewData((p: any) => ({
                          ...p,
                          queue: res.queue,
                        }));
                        syncMeta(res);
                      } catch {
                        endAutoSave();
                        throw new Error("Failed to save queue");
                      }
                    } else {
                      if (queueId !== null)
                        handleInputChange("queueId", queueId);
                    }
                  }}
                />
              </div>
            </div>

            {/* Impact */}
            <div className="grid grid-cols-[110px_1fr] items-center min-h-8 rounded-md hover:bg-muted/40 transition-colors">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-1">
                Impact
              </span>
              <div className="px-2 py-1">
                <InlineEditableImpact
                  externalLoading={isLoading}
                  impact={
                    config?.impacts?.find(
                      (i: any) => i.id === formData.impactId,
                    ) ??
                    (ticketViewData?.impactName
                      ? {
                        id: ticketViewData.impactId,
                        name: ticketViewData.impactName,
                      }
                      : ticketViewData?.impact) ??
                    null
                  }
                  ticketSpaceId={
                    formData.ticketSpaceId || Number(ticketSpaceId)
                  }
                  ticketId={Number(ticketId) || 0}
                  preloadedImpacts={config?.impacts}
                  onUpdate={async (impactId) => {
                    if (isEditMode && ticketId) {
                      try {
                        beginAutoSave();
                        const res = await patchTicketImpact(
                          Number(ticketId),
                          impactId,
                          formData.impactId ?? null,
                        );
                        handleInputChange("impactId", res.impactId ?? impactId);
                        setTicketViewData((p: any) => ({
                          ...p,
                          impact: res.impact,
                        }));
                        syncMeta(res);
                      } catch {
                        endAutoSave();
                        throw new Error("Failed to save impact");
                      }
                    } else {
                      handleInputChange("impactId", impactId);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── EFFORT & DATE ─────────────────────────────────── */}
          <div>
            <div className="px-2 py-2">
              <div className="flex w-fit rounded-lg border bg-white dark:bg-gray-800">
                <Button
                  size="sm"
                  className="h-6 text-xs px-2.5"
                  variant={activeTab === "details" ? "default" : "ghost"}
                  onClick={() => setActiveTab("details")}
                >
                  Details
                </Button>
                <Button
                  size="sm"
                  className="h-6 text-xs px-2.5"
                  variant={activeTab === "logs" ? "default" : "ghost"}
                  onClick={() => setActiveTab("logs")}
                  disabled={!canViewLogs || !isEditMode}
                >
                  My Logs
                </Button>
              </div>
            </div>

            <div className="min-h-[225px]">
              {activeTab === 'details' && (
                <Table className="w-full table-fixed border-y [&_td]:border-r [&_td]:border-gray-200 dark:[&_td]:border-gray-800 [&_td:last-child]:border-r-0">
                  <TableBody>
                    {/* Planned Effort */}
                    <TableRow className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      <TableCell className="w-1/3 p-3 bg-muted/10 font-semibold text-gray-900 dark:text-gray-100">
                        Planned Effort (hrs)
                      </TableCell>
                      <TableCell className="p-2 w-2/3">
                        {isLoading ? (
                          <Skeleton className="h-8 w-full max-w-[120px]" />
                        ) : (
                          <label className="inline-flex items-center gap-1.5 px-2.5 py-1 w-[110px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-text">
                            <Clock className="w-3 h-3 shrink-0" />
                            <input
                              type="number"
                              min={0}
                              placeholder="Not set"
                              value={formData.plannedEffort}
                              onChange={(e) =>
                                handleInputChange("plannedEffort", e.target.value)
                              }
                              onBlur={(e) => {
                                if (!isEditMode || !ticketId) return;
                                const val = e.target.value;
                                if (val === formDataSnapshot.current?.plannedEffort)
                                  return;
                                beginAutoSave();
                                const planned = parseEffortToHours(val) ?? null;
                                const actual =
                                  parseEffortToHours(formData.actualEffort) ?? null;
                                patchTicketEffort(Number(ticketId), planned, actual)
                                  .then((res) => {
                                    formDataSnapshot.current = {
                                      ...formDataSnapshot.current!,
                                      plannedEffort: val,
                                    };
                                    syncMeta(res);
                                    toast.success("Planned effort saved");
                                  })
                                  .catch(() => {
                                    endAutoSave();
                                    toast.error("Failed to save planned effort");
                                  });
                              }}
                              className="w-full bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </label>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Actual Effort */}
                    <TableRow className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      <TableCell className="p-3 bg-muted/10 font-semibold text-gray-900 dark:text-gray-100">
                        Actual Effort (hrs)
                      </TableCell>
                      <TableCell className="p-2">
                        {isLoading ? (
                          <Skeleton className="h-8 w-full max-w-[120px]" />
                        ) : (
                          <HoverCard openDelay={200}>
                            <HoverCardTrigger asChild>
                              <div className="inline-block cursor-not-allowed">
                                <label className="inline-flex items-center gap-1.5 px-2.5 py-1 w-[110px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium transition-colors opacity-60 bg-gray-50 dark:bg-gray-900 pointer-events-none">
                                  <Lock className="w-3 h-3 shrink-0" />
                                  <input
                                    type="number"
                                    readOnly
                                    placeholder="Not set"
                                    value={formData.actualEffort}
                                    className="w-full bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </label>
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-72 p-3" side="top" align="start" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-start gap-2.5">
                                <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-gray-400">
                                  <Lock className="w-3.5 h-3.5 text-white dark:text-gray-900" strokeWidth={2.5} />
                                </div>
                                <div className="min-w-0 flex flex-col gap-1 w-full">
                                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                    Actual effort
                                  </p>
                                  <div className="flex items-center gap-1.5 text-xs font-medium rounded-md border px-2 py-1 text-gray-700 dark:text-gray-300 w-fit">
                                    <Clock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                                    {Number(formData.actualEffort) || 0} hrs
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Update your logs to adjust effort.
                                  </p>
                                </div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Completion Date */}
                    {isEditMode && (
                      <TableRow className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        <TableCell className="p-3 bg-muted/10 font-semibold text-gray-900 dark:text-gray-100">
                          Completion Date
                        </TableCell>
                        <TableCell className="p-2">
                          {isLoading ? (
                            <Skeleton className="h-8 w-full max-w-[120px]" />
                          ) : (
                            <DatePickerItem
                              className="w-[110px]"
                              date={formData.completionDate}
                              onSelect={(date) => {
                                const newDate = date
                                  ? format(date, "yyyy-MM-dd")
                                  : undefined;
                                handleInputChange("completionDate", newDate);
                                if (ticketId) {
                                  beginAutoSave();
                                  patchTicketCompletionDate(
                                    Number(ticketId),
                                    newDate ?? null,
                                  )
                                    .then((res) => {
                                      setTicketViewData((p: any) => ({
                                        ...p,
                                        completionDate: res.completionDate,
                                      }));
                                      syncMeta(res);
                                      toast.success("Completion date saved");
                                    })
                                    .catch(() => {
                                      endAutoSave();
                                      handleInputChange(
                                        "completionDate",
                                        formData.completionDate,
                                      );
                                      toast.error("Failed to save completion date",
                                      );
                                    });
                                }
                              }}
                              placeholder="Not set"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
              {activeTab === "logs" && (
                <div>
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
                    postType="Ticket"
                  />
                </div>
              )}
              {/* {!canEditLogs && (
              <div className="py-2 text-xs text-primary flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                You cannot change your previous work log because you are not currently an assignee or co-assignee in this ticket.
              </div>
            )} */}
            </div>
          </div>

          {/* ── TEAM ─────────────────────────────────────────── */}
          <div className="px-5 py-4 mt-auto">
            {/* Assignee | Participants */}
            <div className="flex gap-0 min-h-[30px]">
              {/* Assignee column */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-wide mb-2">
                  Assignee
                </p>
                <Popover
                  open={assigneeSearchOpen}
                  onOpenChange={setAssigneeSearchOpen}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2.5 w-full text-left rounded-md hover:bg-muted/50 transition-colors p-1 -m-1 focus:outline-none group"
                      disabled={
                        isAssigneesLoading ||
                        !config ||
                        !config?.members ||
                        config.members.length === 0
                      }
                      title={
                        formData.assigneeId
                          ? `${getSelectedAssignee()?.userFirstName ?? ticketViewData?.assignee?.userFirstName} ${getSelectedAssignee()?.userLastName ?? ticketViewData?.assignee?.userLastName} — click to change`
                          : "Click to assign"
                      }
                    >
                      {(() => {
                        const assignee =
                          getSelectedAssignee() ?? ticketViewData?.assignee;
                        return assignee ? (
                          <>
                            <Avatar className="h-8 w-8 flex-shrink-0 group-hover:ring-2 group-hover:ring-primary/50 transition-shadow">
                              <AvatarImage
                                src={
                                  assignee.profile_picture ??
                                  assignee.userProfilePicture
                                }
                                alt={`${assignee.userFirstName} ${assignee.userLastName}`}
                              />
                              <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                                {assignee.userFirstName?.charAt(0)}
                                {assignee.userLastName?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-foreground truncate leading-tight">
                                {assignee.userFirstName} {assignee.userLastName}
                              </div>
                              {assignee.userEmail && (
                                <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                                  {assignee.userEmail}
                                </div>
                              )}
                            </div>
                          </>
                        ) : isAssigneesLoading || isLoading ? (
                          <div className="flex items-center gap-2 h-8">
                            <div className="h-8 w-8 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center flex-shrink-0">
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 h-8">
                            <Avatar className="h-8 w-8 ring-2 ring-background cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
                              <AvatarFallback className="bg-white dark:bg-gray-800 border border-dashed border-border text-muted-foreground text-xs">
                                <Plus className="w-3.5 h-3.5" />
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        );
                      })()}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[300px] p-0"
                    style={{ height: "300px" }}
                    align="start"
                    side="top"
                    avoidCollisions={true}
                    onMouseLeave={() => setAssigneeSearchOpen(false)}
                  >
                    <Command
                      shouldFilter={false}
                      className="flex flex-col h-full"
                    >
                      <CommandInput
                        placeholder="Search members"
                        value={assigneeSearch}
                        onValueChange={setAssigneeSearch}
                      />
                      <CommandList className="flex-1 overflow-y-auto max-h-none">
                        {!config?.members || config.members.length === 0 ? (
                          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                            No members configured
                          </div>
                        ) : (
                          <>
                            {(() => {
                              const filteredMembers = config.members
                                .filter((m) => {
                                  if (!assigneeSearch) return true;
                                  const search = assigneeSearch.toLowerCase();
                                  const firstName =
                                    m.userFirstName?.toLowerCase() || "";
                                  const lastName =
                                    m.userLastName?.toLowerCase() || "";
                                  const fullName =
                                    `${firstName} ${lastName}`.trim();
                                  return (
                                    fullName.startsWith(search) ||
                                    firstName.startsWith(search) ||
                                    lastName.startsWith(search)
                                  );
                                })
                                .sort((a, b) => {
                                  const aSelected = formData.assigneeId === a.id;
                                  const bSelected = formData.assigneeId === b.id;
                                  if (aSelected && !bSelected) return -1;
                                  if (!aSelected && bSelected) return 1;
                                  const aName = a.userFirstName || '';
                                  const bName = b.userFirstName || '';
                                  return aName.localeCompare(bName);
                                });
                              return (
                                <>
                                  {filteredMembers.length === 0 && (
                                    <CommandEmpty>
                                      No member found.
                                    </CommandEmpty>
                                  )}
                                  <CommandGroup>
                                    {filteredMembers.map((member, index) => {
                                      const isSelected =
                                        formData.assigneeId === member.id;
                                      const prevMember =
                                        filteredMembers[index - 1];
                                      const showDivider =
                                        index > 0 &&
                                        formData.assigneeId ===
                                        prevMember?.id &&
                                        !isSelected;
                                      return (
                                        <React.Fragment key={member.id}>
                                          {showDivider && (
                                            <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                                              <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">
                                                Space Members
                                              </span>
                                            </div>
                                          )}
                                          <CommandItem
                                            value={`${member.userFirstName} ${member.userLastName} ${member.userEmail}`}
                                            onSelect={() => {
                                              const newId = isSelected ? undefined : member.id;
                                              const oldId = formData.assigneeId;

                                              let newParticipantIds = [...(formData.participantIds || [])];

                                              // Add old assignee to participants if not already present
                                              if (oldId && !newParticipantIds.includes(oldId)) {
                                                newParticipantIds.push(oldId);
                                              }

                                              // Remove new assignee from participants if present
                                              if (newId) {
                                                newParticipantIds = newParticipantIds.filter(id => id !== newId);
                                              }

                                              setFormData((prev: any) => ({
                                                ...prev,
                                                assigneeId: newId,
                                                participantIds: newParticipantIds
                                              }));
                                              setAssigneeSearchOpen(false);

                                              if (isEditMode && ticketId) {
                                                patchTicketAssignee(
                                                  Number(ticketId),
                                                  newId ?? null,
                                                  oldId ?? null,
                                                )
                                                  .then((res) => {
                                                    setTicketViewData(
                                                      (p: any) => ({
                                                        ...p,
                                                        assignee: res.assignee,
                                                      }),
                                                    );
                                                  })
                                                  .catch(() => {
                                                    setFormData((prev: any) => ({
                                                      ...prev,
                                                      assigneeId: oldId,
                                                      participantIds: formData.participantIds
                                                    }));
                                                    toast.error("Failed to save assignee",
                                                    );
                                                  });
                                              }
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                isSelected
                                                  ? "opacity-100"
                                                  : "opacity-0",
                                              )}
                                            />
                                            <div className="flex items-center gap-2">
                                              <Avatar className="h-6 w-6 flex-shrink-0">
                                                <AvatarImage
                                                  src={
                                                    member.userProfilePicture
                                                  }
                                                  alt={`${member.userFirstName} ${member.userLastName}`}
                                                />
                                                <AvatarFallback className="text-[10px] font-semibold bg-primary text-primary-foreground">
                                                  {member.userFirstName?.charAt(
                                                    0,
                                                  )}
                                                  {member.userLastName?.charAt(
                                                    0,
                                                  )}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div className="flex flex-col">
                                                <span className="text-sm">
                                                  {member.userFirstName}{" "}
                                                  {member.userLastName}
                                                </span>
                                                {member.userEmail && (
                                                  <span className="text-xs text-muted-foreground">
                                                    {member.userEmail}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </CommandItem>
                                        </React.Fragment>
                                      );
                                    })}
                                  </CommandGroup>
                                </>
                              );
                            })()}
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Divider */}


              {/* Participants column */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-wide mb-2">
                  Participants
                  {formData.participantIds.length > 0 && (
                    <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">
                      {formData.participantIds.length}
                    </span>
                  )}
                </p>
                <div className="flex items-center flex-wrap gap-y-1">
                  {/* Zero-width anchor at the START of the row — popover's bottom-right corner
                      aligns here, i.e. at the left edge of the first avatar */}
                  <Popover
                    open={participantsSearchOpen}
                    onOpenChange={setParticipantsSearchOpen}
                  >
                    <PopoverTrigger asChild>
                      <span
                        className="inline-block w-0 h-8 overflow-hidden shrink-0 pointer-events-none"
                        aria-hidden
                      />
                    </PopoverTrigger>
                    {/* Add participant button — plain button, does NOT move the popover anchor */}
                    <button
                      type="button"
                      className="focus:outline-none relative z-30"
                      title="Add participant"
                      disabled={
                        isAssigneesLoading ||
                        !config?.members ||
                        config.members.length === 0
                      }
                      onClick={() => setParticipantsSearchOpen(true)}
                    >
                      <Avatar className="h-8 w-8 ring-2 ring-background cursor-pointer hover:opacity-80 transition-opacity">
                        <AvatarFallback className="bg-white dark:bg-gray-800 border border-dashed border-border text-muted-foreground text-xs">
                          {isAssigneesLoading || isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    {/* Phase-1 fallback: show ticketViewData participants when config not yet loaded */}
                    {!config &&
                      (ticketViewData?.participants ?? []).map(
                        (member: any, i: number) => (
                          <div
                            key={member.id}
                            className="focus:outline-none -ml-2"
                            style={{ zIndex: 20 - i, position: "relative" }}
                            title={`${member.userFirstName} ${member.userLastName}`}
                          >
                            <Avatar className="h-8 w-8 ring-2 ring-background">
                              <AvatarImage
                                src={member.profile_picture}
                                alt={`${member.userFirstName} ${member.userLastName}`}
                              />
                              <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                                {member.userFirstName?.charAt(0)}
                                {member.userLastName?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        ),
                      )}
                    {/* Phase-2+: show from config.members once loaded */}
                    {config &&
                      (config?.members ?? [])
                        .filter((m) => formData.participantIds.includes(m.id))
                        .map((member, i) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => toggleParticipant(member.id)}
                            className="focus:outline-none -ml-2"
                            style={{ zIndex: 20 - i, position: "relative" }}
                            title={`${member.userFirstName} ${member.userLastName} — click to remove`}
                          >
                            <Avatar className="h-8 w-8 ring-2 ring-background cursor-pointer hover:ring-destructive/60 hover:opacity-80 transition-all">
                              <AvatarImage
                                src={member.userProfilePicture}
                                alt={`${member.userFirstName} ${member.userLastName}`}
                              />
                              <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                                {member.userFirstName?.charAt(0)}
                                {member.userLastName?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                        ))}
                    <PopoverContent
                      className="w-[300px] p-0"
                      style={{ height: "300px" }}
                      align="end"
                      side="top"
                      avoidCollisions={true}
                      onMouseLeave={() => setParticipantsSearchOpen(false)}
                    >
                      <Command
                        shouldFilter={false}
                        className="flex flex-col h-full"
                      >
                        <CommandInput
                          placeholder="Search members"
                          value={participantsSearch}
                          onValueChange={setParticipantsSearch}
                        />
                        <CommandList className="flex-1 overflow-y-auto max-h-none">
                          {!config?.members || config.members.length === 0 ? (
                            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                              No members configured
                            </div>
                          ) : (
                            <>
                              {(() => {
                                const filteredMembers = config.members
                                  .filter((m) => {
                                    if (!participantsSearch) return true;
                                    const search =
                                      participantsSearch.toLowerCase();
                                    const firstName =
                                      m.userFirstName?.toLowerCase() || "";
                                    const lastName =
                                      m.userLastName?.toLowerCase() || "";
                                    const fullName =
                                      `${firstName} ${lastName}`.trim();
                                    return (
                                      fullName.startsWith(search) ||
                                      firstName.startsWith(search) ||
                                      lastName.startsWith(search)
                                    );
                                  })
                                  .sort((a, b) => {
                                    const aSelected = formData.participantIds.includes(a.id);
                                    const bSelected = formData.participantIds.includes(b.id);
                                    if (aSelected && !bSelected) return -1;
                                    if (!aSelected && bSelected) return 1;
                                    const aName = a.userFirstName || '';
                                    const bName = b.userFirstName || '';
                                    return aName.localeCompare(bName);
                                  });
                                return (
                                  <>
                                    {filteredMembers.length === 0 && (
                                      <CommandEmpty>
                                        No member found.
                                      </CommandEmpty>
                                    )}
                                    <CommandGroup>
                                      {filteredMembers.map((member, index) => {
                                        const isSelected =
                                          formData.participantIds.includes(
                                            member.id,
                                          );
                                        const prevMember = filteredMembers[index - 1];
                                        const showDivider =
                                          index > 0 &&
                                          formData.participantIds.includes(prevMember?.id) &&
                                          !isSelected;
                                        return (
                                          <React.Fragment key={member.id}>
                                            {showDivider && (
                                              <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                                                <span className="text-xs font-semibold tracking-wider text-gray-400 dark:text-gray-500">
                                                  Space Members
                                                </span>
                                              </div>
                                            )}
                                            <CommandItem
                                              value={`${member.userFirstName} ${member.userLastName} ${member.userEmail}`}
                                              onSelect={() =>
                                                toggleParticipant(member.id)
                                              }
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4",
                                                  isSelected
                                                    ? "opacity-100"
                                                    : "opacity-0",
                                                )}
                                              />
                                              <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6 flex-shrink-0">
                                                  <AvatarImage
                                                    src={
                                                      member.userProfilePicture
                                                    }
                                                    alt={`${member.userFirstName} ${member.userLastName}`}
                                                  />
                                                  <AvatarFallback className="text-[10px] font-semibold bg-primary text-primary-foreground">
                                                    {member.userFirstName?.charAt(
                                                      0,
                                                    )}
                                                    {member.userLastName?.charAt(
                                                      0,
                                                    )}
                                                  </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                  <span className="text-sm">
                                                    {member.userFirstName}{" "}
                                                    {member.userLastName}
                                                  </span>
                                                  {member.userEmail && (
                                                    <span className="text-xs text-muted-foreground">
                                                      {member.userEmail}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </CommandItem>
                                          </React.Fragment>
                                        );
                                      })}
                                    </CommandGroup>
                                  </>
                                );
                              })()}
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>

          {/* ── METADATA ─────────────────────────────────────── */}
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
                    Created
                    {metadata.createdBy && (
                      <>
                        {" "}
                        by{" "}
                        <span className="text-primary">{metadata.createdBy}</span>
                      </>
                    )}
                    ,{" "}
                    {new Date(metadata.createdAt).toLocaleString("en-US", {
                      month: "2-digit",
                      day: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                )}
                {metadata.updatedAt && (
                  <p
                    className={`text-xs font-medium text-muted-foreground ${!metadata.updatedBy ? "invisible" : ""}`}
                  >
                    Updated
                    {metadata.updatedBy && (
                      <>
                        {" "}
                        by{" "}
                        <span className="text-primary">{metadata.updatedBy}</span>
                      </>
                    )}
                    ,{" "}
                    {new Date(metadata.updatedAt).toLocaleString("en-US", {
                      month: "2-digit",
                      day: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
