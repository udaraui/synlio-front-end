"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Info,
  Bug,
  FileText,
  Zap,
  CheckCircle,
  Circle,
  Settings,
  HelpCircle,
  ListTodo,
  Save,
  X,
  ArrowUpRight,
  LayoutGrid,
  TableProperties,
  FolderClosed,
  Flag,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth.context";
import { useViewPreference } from "@/hooks/use-view-preference";
import { Button } from "@/components/ui/button";
import { createTicket, mutateTickets, patchTicket, searchTickets } from "@/services/ticket-management/ticket.service";
import {
  searchTicketSpaces,
  getTicketSpaceById,
  getTicketSpaceStatusConfig,
  getTicketSpaceSeverityConfig,
  getTicketSpaceTypesConfig,
  getTicketSpaceQueueConfig,
  getTicketSpaceMembersConfig,
  getTicketSpaceSlaConfig,
} from "@/services/ticket-management/ticket-space.service";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  InlineEditableTicketType,
  InlineEditableTicketName,
  InlineEditableStatus,
  InlineEditableSeverity,
  InlineEditableQueue,
  InlineEditableAssignee,
  UserAvatar,
} from "@/app/(pages)/ticket-management/ticket/components/InlineEditableTicketComponents";

export interface TicketDraftData {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  ticketSpaceId?: number;
  ticketSpaceName?: string;
  ticketTypeId?: number;
  ticketTypeName?: string;
  severityId?: number;
  severityName?: string;
  severityColor?: string;
  statusId?: number;
  statusName?: string;
  statusColor?: string;
  assigneeId?: number;
  assigneeName?: string;
  queueId?: number | null;
  queueName?: string;
  ticketSlaId?: number;
  completionDate?: string;
  plannedEffort?: number;
  requestedAssigneeName?: string;
  assigneeWarning?: string;
  warnings?: string[];
}

export interface TicketDraftCardProps {
  payload: {
    action: string;
    status: "READY" | "NEEDS_INPUT";
    summary?: string;
    draft?: TicketDraftData | TicketDraftData[];
    drafts?: TicketDraftData[];
    tickets?: TicketDraftData[];
    warnings?: string[];
    options?: any[];
    candidateTickets?: any[];
    needs?: Array<{
      field: string;
      label: string;
      options: Array<{ id: number; name: string; label?: string; prefix?: string }>;
    }>;
  };
  onUpdateDraft?: (updated: TicketDraftData) => void;
  onSelectOption?: (field: string, option: { id: number; name: string }) => void;
  onCancel?: () => void;
}

// Icon mapping helper for ticket types
const getIconComponent = (iconName: string | undefined): LucideIcon | null => {
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

interface SpaceConfigs {
  types: Array<{ id: number; name: string; icon?: string; color?: string }>;
  severities: Array<{ id: number; name: string; color?: string }>;
  statuses: Array<{ id: number; name: string; color?: string; base?: string; sequence?: number }>;
  queues: Array<{ id: number; name: string }>;
  slas: Array<{ id: number; severityId?: number }>;
}

function resolveTicketDraftEntities(
  draft: TicketDraftData,
  spaceConfigs: SpaceConfigs,
  spaceData: any,
  spaceMembers: any[],
  user: any,
  fallbackSpaceId?: number | null
): TicketDraftData {
  const next: TicketDraftData = { ...draft };
  if (!next.ticketSpaceId && fallbackSpaceId) {
    next.ticketSpaceId = fallbackSpaceId;
  }
  const { types, severities, statuses, queues, slas } = spaceConfigs;

  // 1. Ticket Type
  if (!next.ticketTypeId && types.length > 0) {
    const matchedType = next.ticketTypeName
      ? types.find(
          (t) =>
            t.name?.toLowerCase().includes(next.ticketTypeName?.toLowerCase() || "") ||
            (next.ticketTypeName && next.ticketTypeName.toLowerCase().includes(t.name?.toLowerCase()))
        )
      : null;

    if (next.ticketTypeName && !matchedType) {
      if (!next.warnings) next.warnings = [];
      const avail = types.map((t) => t.name).join(", ");
      next.warnings.push(`Ticket type "${next.ticketTypeName}" is not recognized in space "${spaceData?.name || 'this space'}". Available types: ${avail}`);
    }

    const defaultType =
      matchedType ||
      (spaceData?.defaultTicketTypeId
        ? types.find((t) => Number(t.id) === Number(spaceData.defaultTicketTypeId))
        : null) ||
      types[0];
    if (defaultType) {
      next.ticketTypeId = Number(defaultType.id);
      next.ticketTypeName = defaultType.name;
    }
  }

  // 2. Severity
  if (!next.severityId && severities.length > 0) {
    let matchedSev = next.severityName
      ? severities.find(
          (s) =>
            s.name?.toLowerCase().includes(next.severityName?.toLowerCase() || "") ||
            (next.severityName && next.severityName.toLowerCase().includes(s.name?.toLowerCase()))
        )
      : null;

    if (!matchedSev && next.severityName) {
      const req = next.severityName.trim().toLowerCase();
      if (["critical", "blocker", "urgent", "p1", "highest", "sev1", "sev 1"].some((syn) => req.includes(syn))) {
        matchedSev = severities.find((s) => ["blocker", "critical", "urgent", "high"].some((t) => s.name?.toLowerCase().includes(t)));
      } else if (["high", "major", "p2", "sev2", "sev 2"].some((syn) => req.includes(syn))) {
        matchedSev = severities.find((s) => ["high", "major", "medium"].some((t) => s.name?.toLowerCase().includes(t)));
      } else if (["low", "minor", "trivial", "p4", "lowest", "sev4"].some((syn) => req.includes(syn))) {
        matchedSev = severities.find((s) => ["low", "minor", "trivial"].some((t) => s.name?.toLowerCase().includes(t)));
      }
    }

    const defaultSev =
      matchedSev ||
      (spaceData?.defaultSeverityId
        ? severities.find((s) => Number(s.id) === Number(spaceData.defaultSeverityId))
        : null) ||
      severities.find((s) => s.name?.toLowerCase() === "medium") ||
      severities[0];
    if (defaultSev) {
      next.severityId = Number(defaultSev.id);
      next.severityName = defaultSev.name;
    }
  }

  // 3. Status
  if (!next.statusId && statuses.length > 0) {
    const sortedStatuses = statuses.slice().sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    const matchedStat = next.statusName
      ? statuses.find(
          (st) =>
            st.name?.toLowerCase().includes(next.statusName?.toLowerCase() || "") ||
            (next.statusName && next.statusName.toLowerCase().includes(st.name?.toLowerCase()))
        )
      : null;
    const defaultStat =
      matchedStat ||
      (spaceData?.defaultStatusId
        ? statuses.find((st) => Number(st.id) === Number(spaceData.defaultStatusId))
        : null) ||
      sortedStatuses[0];
    if (defaultStat) {
      next.statusId = Number(defaultStat.id);
      next.statusName = defaultStat.name;
    }
  }

  // 4. Queue
  if (!next.queueId && queues.length > 0) {
    const matchedQueue = next.queueName
      ? queues.find(
          (q) =>
            q.name?.toLowerCase().includes(next.queueName?.toLowerCase() || "") ||
            (next.queueName && next.queueName.toLowerCase().includes(q.name?.toLowerCase()))
        )
      : null;
    const defaultQueue =
      matchedQueue ||
      (spaceData?.defaultQueueId
        ? queues.find((q) => Number(q.id) === Number(spaceData.defaultQueueId))
        : null) ||
      queues.find((q) => q.name?.toLowerCase() === "default") ||
      queues[0];
    if (defaultQueue) {
      next.queueId = Number(defaultQueue.id);
      next.queueName = defaultQueue.name;
    }
  }

  // 5. SLA
  if (!next.ticketSlaId && slas.length > 0) {
    const matchingSla =
      (next.severityId ? slas.find((s) => Number(s.severityId) === Number(next.severityId)) : null) ||
      slas[0];
    if (matchingSla) {
      next.ticketSlaId = Number(matchingSla.id);
    }
  }

  // 6. Assignee
  const isMe =
    next.assigneeName?.toLowerCase() === "me" ||
    next.assigneeName?.toLowerCase() === "myself";

  if (isMe && user?.email && spaceMembers.length > 0) {
    const myMember = spaceMembers.find(
      (m) =>
        m.userEmail?.toLowerCase() === user.email?.toLowerCase() ||
        Number(m.userId) === Number(user.id)
    );
    if (myMember) {
      next.assigneeId = Number(myMember.id);
      next.assigneeName =
        `${myMember.userFirstName || myMember.firstName || ""} ${myMember.userLastName || myMember.lastName || ""}`.replace(/\s+/g, " ").trim() ||
        myMember.userEmail;
    }
  } else if (next.assigneeName && spaceMembers.length > 0 && !next.assigneeId) {
    const searchName = next.assigneeName.replace(/\s+/g, " ").trim().toLowerCase();
    const matched = spaceMembers.find((m) => {
      const first = (m.userFirstName || m.firstName || m.first_name || "").trim().toLowerCase();
      const last = (m.userLastName || m.lastName || m.last_name || "").trim().toLowerCase();
      const fullName = `${first} ${last}`.replace(/\s+/g, " ").trim().toLowerCase();
      const email = (m.userEmail || m.email || "").toLowerCase().trim();
      const emailPrefix = email.split("@")[0];
      return (
        fullName === searchName ||
        fullName.includes(searchName) ||
        searchName.includes(fullName) ||
        (first && searchName === first) ||
        (last && searchName === last) ||
        email === searchName ||
        emailPrefix === searchName
      );
    });
    if (matched) {
      next.assigneeId = Number(matched.id);
      next.assigneeName =
        `${matched.userFirstName || matched.firstName || ""} ${matched.userLastName || matched.lastName || ""}`.replace(/\s+/g, " ").trim() ||
        matched.userEmail;
    } else {
      // User specifically asked for someone (e.g. Kasun) who is NOT in this space
      // DO NOT fallback to logged-in user! Keep unassigned and flag warning.
      next.assigneeId = undefined;
      next.requestedAssigneeName = next.assigneeName;
      const spaceName = spaceData?.name || next.ticketSpaceName || "this space";
      next.assigneeWarning = `"${next.assigneeName}" is not a member of ${spaceName}`;
    }
  } else if (next.assigneeId && spaceMembers.length > 0) {
    const matched = spaceMembers.find(
      (m) => Number(m.userId) === Number(next.assigneeId) || Number(m.id) === Number(next.assigneeId)
    );
    if (matched) {
      next.assigneeId = Number(matched.id);
    }
  }

  return next;
}

// Renders ticket description as formatted HTML if tags exist, or styled text otherwise
function FormattedDescription({ content }: { content?: string }) {
  if (!content || !content.trim()) {
    return <p className="text-muted-foreground italic">No description provided</p>;
  }

  // Detect whether string contains HTML tags
  const hasHtml = /<[a-z][\s\S]*>/i.test(content);
  if (!hasHtml) {
    return <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{content}</p>;
  }

  return (
    <div
      className="text-xs text-muted-foreground prose prose-sm max-w-none dark:prose-invert [&_p]:my-1 [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_a]:text-primary [&_a]:underline"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

// Single Ticket Draft Card component
function SingleTicketDraftItem({
  initialDraft,
  spaceConfigs,
  spaceMembers,
  spacePrefix,
  spaceData,
  warnings = [],
  createdTicketProp,
  isSubmittingProp,
  onCreated,
  onUpdateDraft,
  onDismiss,
  isUpdateAction = false,
  isLast = false,
}: {
  initialDraft: TicketDraftData;
  spaceConfigs: SpaceConfigs;
  spaceMembers: any[];
  spacePrefix: string;
  spaceData?: any;
  warnings?: string[];
  createdTicketProp?: { id: number; code?: string; name: string; ticketSpaceId?: number } | null;
  isSubmittingProp?: boolean;
  onCreated?: (created: { id: number; code?: string; name: string; ticketSpaceId?: number }) => void;
  onUpdateDraft?: (updated: TicketDraftData) => void;
  onDismiss: () => void;
  isUpdateAction?: boolean;
  isLast?: boolean;
}) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<TicketDraftData>(initialDraft);
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
  const [internalCreatedTicket, setInternalCreatedTicket] = useState<{
    id: number;
    code?: string;
    name: string;
    ticketSpaceId?: number;
  } | null>(null);

  const createdTicket = createdTicketProp || internalCreatedTicket;
  const isSubmitting = isSubmittingProp || internalIsSubmitting;

  // Sync when initialDraft or spaceConfigs update
  useEffect(() => {
    setDraft((prev) => {
      const next = { ...initialDraft, ...prev };
      return resolveTicketDraftEntities(next, spaceConfigs, spaceData, spaceMembers, user, next.ticketSpaceId);
    });
  }, [initialDraft, spaceConfigs, spaceData, spaceMembers, user]);

  const handleConfirmCreate = async () => {
    if (!draft.name || !draft.name.trim()) {
      toast.error("Ticket name is required");
      return;
    }
    if (!draft.ticketSpaceId) {
      toast.error("Please select a ticket space first");
      return;
    }

    setInternalIsSubmitting(true);
    try {
      let finalAssigneeId = draft.assigneeId;
      const isMe =
        draft.assigneeName?.toLowerCase() === "me" ||
        draft.assigneeName?.toLowerCase() === "myself";

      if ((!finalAssigneeId || isMe) && user?.email && spaceMembers.length > 0) {
        const myMember = spaceMembers.find(
          (m) =>
            m.userEmail?.toLowerCase() === user.email?.toLowerCase() ||
            Number(m.userId) === Number(user.id)
        );
        if (myMember) {
          finalAssigneeId = Number(myMember.id);
        }
      } else if (finalAssigneeId && spaceMembers.length > 0) {
        const matched = spaceMembers.find(
          (m) => Number(m.userId) === Number(finalAssigneeId) || Number(m.id) === Number(finalAssigneeId)
        );
        if (matched) {
          finalAssigneeId = Number(matched.id);
        }
      }

      if (isUpdateAction) {
        let ticketId = draft.id;
        if (!ticketId && draft.code) {
          try {
            const searchRes = await searchTickets({
              filters: [{ field: "code", matchMode: "equals", value: draft.code }],
              pageSize: 1,
              pageNumber: 1,
            });
            const found = searchRes?.tickets?.[0] || searchRes?.data?.[0];
            if (found?.id) ticketId = found.id;
          } catch (e) {
            console.error("Could not find ticket by code:", e);
          }
        }

        if (!ticketId) {
          toast.error(`Ticket ID not found for ${draft.code || "ticket"}`);
          return;
        }

        const updateDto: any = {
          name: draft.name.trim(),
          description: draft.description || "",
          ticketSpaceId: draft.ticketSpaceId,
          ticketTypeId: draft.ticketTypeId,
          severityId: draft.severityId,
          statusId: draft.statusId,
          queueId: draft.queueId,
          ticketSlaId: draft.ticketSlaId,
          assigneeId: finalAssigneeId,
          completionDate: draft.completionDate ? new Date(draft.completionDate).toISOString() : undefined,
          plannedEffort: draft.plannedEffort,
        };

        const result = await patchTicket(ticketId, updateDto);
        const updated = result || draft;
        const updatedObj = {
          id: updated.id || ticketId,
          code: updated.code || draft.code,
          name: updated.name || draft.name,
          ticketSpaceId: updated.ticketSpaceId || draft.ticketSpaceId,
          severityName: updated.severity?.name || updated.severityName || draft.severityName,
          severityColor: updated.severity?.color || updated.severityColor || draft.severityColor,
          statusName: updated.status?.name || updated.statusName || draft.statusName,
          statusColor: updated.status?.color || updated.statusColor || draft.statusColor,
          queueName: updated.queue?.name || updated.queueName || draft.queueName,
          assigneeName: updated.assigneeName || draft.assigneeName,
        };

        setInternalCreatedTicket(updatedObj);
        onCreated?.(updatedObj);

        if (typeof window !== "undefined") {
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent("synlio:ticket-updated", {
                detail: { ticket: updatedObj, tickets: [updatedObj], ticketSpaceId: draft.ticketSpaceId },
              })
            );
          }, 0);
        }
        toast.success(`Ticket ${draft.code || ""} updated successfully`);
        return;
      }

      const createPayload: any = {
        name: draft.name.trim(),
        description: draft.description || "",
        ticketSpaceId: draft.ticketSpaceId,
        ticketTypeId: draft.ticketTypeId,
        severityId: draft.severityId,
        statusId: draft.statusId,
        queueId: draft.queueId,
        ticketSlaId: draft.ticketSlaId,
        assigneeId: finalAssigneeId,
        completionDate: draft.completionDate ? new Date(draft.completionDate).toISOString() : undefined,
        plannedEffort: draft.plannedEffort,
      };

      const result = await createTicket(createPayload);
      const ticketId = result?.ticketId || result?.id || 0;
      const code = result?.code || result?.prefixCode;

      const createdObj = {
        id: ticketId,
        code,
        name: draft.name,
        ticketSpaceId: draft.ticketSpaceId || result?.ticketSpaceId,
      };

      setInternalCreatedTicket(createdObj);
      onCreated?.(createdObj);

      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("synlio:ticket-created", { detail: { ticket: result } })
          );
        }, 0);
      }

      toast.success("Ticket created successfully!");
    } catch (err: any) {
      console.error("Failed to create ticket:", err);
      toast.error(err?.response?.data?.message || "Failed to create ticket");
    } finally {
      setInternalIsSubmitting(false);
    }
  };

  // Derive active items for InlineEditable components
  const currentTicketType = useMemo(() => {
    if (!draft.ticketTypeId && !draft.ticketTypeName) {
      return spaceConfigs.types[0] || null;
    }
    const matched = spaceConfigs.types.find(
      (t) =>
        t.id === draft.ticketTypeId ||
        t.name?.toLowerCase() === draft.ticketTypeName?.toLowerCase() ||
        (draft.ticketTypeName && t.name?.toLowerCase().includes(draft.ticketTypeName.toLowerCase()))
    );
    if (matched) return matched;
    return draft.ticketTypeId
      ? {
          id: draft.ticketTypeId,
          name: draft.ticketTypeName || "Type",
          icon: undefined,
          color: "#3b82f6",
        }
      : spaceConfigs.types[0] || null;
  }, [draft.ticketTypeId, draft.ticketTypeName, spaceConfigs.types]);

  const currentStatus = useMemo(() => {
    if (!draft.statusId && !draft.statusName) {
      return spaceConfigs.statuses[0] || null;
    }
    const matched = spaceConfigs.statuses.find(
      (s) =>
        s.id === draft.statusId ||
        s.name?.toLowerCase() === draft.statusName?.toLowerCase() ||
        (draft.statusName && s.name?.toLowerCase().includes(draft.statusName.toLowerCase()))
    );
    if (matched) return matched;
    return draft.statusId
      ? {
          id: draft.statusId,
          name: draft.statusName || "Status",
          color: "#3b82f6",
        }
      : spaceConfigs.statuses[0] || null;
  }, [draft.statusId, draft.statusName, spaceConfigs.statuses]);

  const currentSeverity = useMemo(() => {
    if (!draft.severityId && !draft.severityName) {
      return spaceConfigs.severities[0] || null;
    }
    const matched = spaceConfigs.severities.find(
      (s) =>
        s.id === draft.severityId ||
        s.name?.toLowerCase() === draft.severityName?.toLowerCase() ||
        (draft.severityName && s.name?.toLowerCase().includes(draft.severityName.toLowerCase()))
    );
    if (matched) return matched;
    return draft.severityId
      ? {
          id: draft.severityId,
          name: draft.severityName || "Severity",
          color: "#ef4444",
        }
      : spaceConfigs.severities[0] || null;
  }, [draft.severityId, draft.severityName, spaceConfigs.severities]);

  const currentQueue = useMemo(() => {
    if (!draft.queueId && !draft.queueName) {
      return spaceConfigs.queues[0] || null;
    }
    const matched = spaceConfigs.queues.find(
      (q) =>
        q.id === draft.queueId ||
        q.name?.toLowerCase() === draft.queueName?.toLowerCase() ||
        (draft.queueName && q.name?.toLowerCase().includes(draft.queueName.toLowerCase()))
    );
    if (matched) return matched;
    return draft.queueId
      ? {
          id: draft.queueId,
          name: draft.queueName || "Queue",
        }
      : spaceConfigs.queues[0] || null;
  }, [draft.queueId, draft.queueName, spaceConfigs.queues]);

  const currentAssignee = useMemo(() => {
    if (draft.assigneeWarning || draft.requestedAssigneeName) {
      return {
        id: 0,
        isUnknown: true,
        first_name: "?",
        last_name: "",
        userFirstName: "?",
        userLastName: "",
        unknownMessage: draft.assigneeWarning,
      };
    }

    const isMe =
      draft.assigneeName?.toLowerCase() === "me" ||
      draft.assigneeName?.toLowerCase() === "myself";

    if (isMe && user?.email && spaceMembers.length > 0) {
      const myMember = spaceMembers.find(
        (m) =>
          m.userEmail?.toLowerCase() === user.email?.toLowerCase() ||
          Number(m.userId) === Number(user.id)
      );
      if (myMember) {
        return {
          id: myMember.userId || myMember.id,
          first_name: myMember.userFirstName || myMember.firstName || user.first_name || "",
          last_name: myMember.userLastName || myMember.lastName || user.last_name || "",
          profile_picture: myMember.userProfilePicture || myMember.profilePicture || user.profile_picture || null,
        };
      }
    }

    if (!draft.assigneeId && !draft.assigneeName) return null;
    const targetName = (draft.assigneeName || "").replace(/\s+/g, " ").trim().toLowerCase();
    const matched = spaceMembers.find(
      (m) => {
        if (draft.assigneeId && (Number(m.id) === Number(draft.assigneeId) || Number(m.userId) === Number(draft.assigneeId))) {
          return true;
        }
        if (targetName) {
          const first = (m.userFirstName || m.firstName || m.first_name || "").trim().toLowerCase();
          const last = (m.userLastName || m.lastName || m.last_name || "").trim().toLowerCase();
          const fullName = `${first} ${last}`.replace(/\s+/g, " ").trim().toLowerCase();
          return (
            fullName === targetName ||
            fullName.includes(targetName) ||
            targetName.includes(fullName)
          );
        }
        return false;
      }
    );
    if (matched) {
      return {
        id: matched.userId || matched.id,
        first_name: (matched.userFirstName || matched.firstName || matched.first_name || "").trim(),
        last_name: (matched.userLastName || matched.lastName || matched.last_name || "").trim(),
        profile_picture: matched.userProfilePicture || matched.profilePicture || null,
      };
    }
    if (draft.assigneeName) {
      const parts = draft.assigneeName.trim().split(/\s+/);
      return {
        id: draft.assigneeId || 0,
        first_name: parts[0] || "",
        last_name: parts.slice(1).join(" ") || "",
        profile_picture: null,
      };
    }
    return null;
  }, [draft.assigneeId, draft.assigneeName, draft.assigneeWarning, draft.requestedAssigneeName, spaceMembers, user]);

  const filteredWarnings = useMemo(() => {
    return (warnings || []).filter((w) => {
      const lower = w.toLowerCase();
      if (lower.includes('matching "me"')) return false;
      // If an assignee is already selected or resolved, suppress any "No team member matching" warning
      if (draft.assigneeId || currentAssignee) {
        if (lower.includes('no team member matching')) return false;
      }
      return true;
    });
  }, [warnings, draft.assigneeId, currentAssignee]);

  return (
    <div className="w-full group bg-card rounded-xl border border-border shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
      <div>
        {/* Section 1: Type Icon, Code/Draft Badge, and Status Tag */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/40 border-b border-dashed border-border">
          <div className="flex items-center gap-2 min-w-0">
            {createdTicket ? (
              <div
                className="inline-flex items-center justify-center w-6 h-6 rounded cursor-default select-none"
                title={currentTicketType ? currentTicketType.name : "No type"}
              >
                {currentTicketType ? (
                  (() => {
                    const TypeIcon = getIconComponent(currentTicketType.icon);
                    return TypeIcon ? (
                      <TypeIcon
                        className={cn(
                          "w-3.5 h-3.5 flex-shrink-0",
                          (!currentTicketType.color || currentTicketType.color.toLowerCase() === "#3b82f6") && "text-blue-500 dark:text-blue-400"
                        )}
                        style={
                          currentTicketType.color && currentTicketType.color.toLowerCase() !== "#3b82f6"
                            ? { color: currentTicketType.color }
                            : undefined
                        }
                      />
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                    );
                  })()
                ) : (
                  <div className="w-3 h-3 rounded-full bg-gray-300 flex-shrink-0" />
                )}
              </div>
            ) : (
              <InlineEditableTicketType
                ticketType={currentTicketType}
                ticketId={0}
                types={spaceConfigs.types}
                getIconComponent={getIconComponent}
                iconOnly
                onUpdate={async (typeId) => {
                  const t = spaceConfigs.types.find((item) => item.id === typeId);
                  const updated = {
                    ...draft,
                    ticketTypeId: typeId,
                    ticketTypeName: t?.name,
                  };
                  setDraft(updated);
                  onUpdateDraft?.(updated);
                }}
              />
            )}

            <span
              className="text-xs font-semibold tracking-wide text-primary select-none whitespace-nowrap"
              title={createdTicket?.code ? `Ticket ${createdTicket.code}` : "Ticket draft code"}
            >
              {createdTicket?.code || draft?.code || (spacePrefix ? `${spacePrefix}-?` : "DRAFT")}
            </span>

            {/* {draft.ticketSpaceName && (
              <span
                className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded truncate max-w-[100px]"
                title={draft.ticketSpaceName}
              >
                {draft.ticketSpaceName}
              </span>
            )} */}
          </div>

          {/* Status Tag */}
          {createdTicket ? (
            <div
              className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted/40 border border-gray-200 dark:border-gray-700/80 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 max-w-[140px] min-w-0 cursor-default select-none opacity-85"
              title={currentStatus ? currentStatus.name : "No status"}
            >
              {currentStatus ? (
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: currentStatus.color }}
                  />
                  <span className="text-gray-700 dark:text-gray-300 truncate min-w-0 whitespace-nowrap">
                    {currentStatus.name}
                  </span>
                </span>
              ) : (
                <span className="text-gray-400 italic whitespace-nowrap">No status</span>
              )}
            </div>
          ) : (
            <InlineEditableStatus
              status={currentStatus}
              statuses={spaceConfigs.statuses}
              ticketId={0}
              onUpdate={async (statusId) => {
                const s = spaceConfigs.statuses.find((item) => item.id === statusId);
                const updated = {
                  ...draft,
                  statusId,
                  statusName: s?.name,
                };
                setDraft(updated);
                onUpdateDraft?.(updated);
              }}
            />
          )}
        </div>

        {/* Warnings Banner if any */}
        {/* {filteredWarnings.length > 0 && (
          <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {filteredWarnings.map((w, idx) => (
                <p key={idx}>{w}</p>
              ))}
            </div>
          </div>
        )} */}

        {/* Section 2: Name and Assignee Avatar */}
        <div className="p-3.5 sm:p-4 space-y-3">
          <h3 className="text-sm font-semibold leading-snug">
            <span className="inline-flex items-center gap-1.5 w-full">
              {createdTicket ? (
                <span className="font-semibold text-foreground truncate text-[14px] select-none block">
                  {draft.name || ""}
                </span>
              ) : (
                <InlineEditableTicketName
                  name={draft.name || ""}
                  onUpdate={async (name) => {
                    const updated = { ...draft, name };
                    setDraft(updated);
                    onUpdateDraft?.(updated);
                  }}
                  className="font-semibold text-foreground truncate text-[14px]"
                />
              )}
              {(draft.description || (draft.name && draft.name.length > 35)) && (
                <HoverCard openDelay={150}>
                  <HoverCardTrigger asChild>
                    <button
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="View description"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent
                    className="w-80 max-h-80 overflow-y-auto"
                    side="right"
                    align="start"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-1.5 text-xs">
                      <div className="font-semibold text-foreground border-b border-border pb-1">
                        {draft.name}
                      </div>
                      <FormattedDescription content={draft.description} />
                    </div>
                  </HoverCardContent>
                </HoverCard>
              )}
            </span>
          </h3>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              {createdTicket ? (
                currentAssignee ? (
                  <div
                    className="inline-flex items-center gap-1.5 cursor-default opacity-85"
                    title={`${currentAssignee.first_name || ""} ${currentAssignee.last_name || ""}`.trim()}
                  >
                    <UserAvatar
                      firstName={currentAssignee.first_name}
                      lastName={currentAssignee.last_name}
                      profilePicture={currentAssignee.profile_picture}
                      size="sm"
                    />
                    <span className="text-xs text-foreground truncate max-w-[120px]">
                      {`${currentAssignee.first_name || ""} ${currentAssignee.last_name || ""}`.trim() || "Assignee"}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground/60 italic text-xs select-none cursor-default">—</span>
                )
              ) : draft.assigneeWarning ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <InlineEditableAssignee
                        assignee={currentAssignee}
                        members={spaceMembers}
                        ticketId={0}
                        onUpdate={async (memberId) => {
                          const m = spaceMembers.find((mem) => mem.id === memberId || mem.userId === memberId);
                          const updated = {
                            ...draft,
                            assigneeId: memberId || undefined,
                            assigneeName: m
                              ? `${m.userFirstName || m.firstName || ""} ${m.userLastName || m.lastName || ""}`.trim()
                              : undefined,
                            assigneeWarning: undefined,
                            requestedAssigneeName: undefined,
                          };
                          setDraft(updated);
                          onUpdateDraft?.(updated);
                        }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-xs p-2.5 shadow-md">
                    {/* <p className="font-semibold text-amber-600 dark:text-amber-400 mb-0.5">Assignee Warning</p> */}
                    <p className="text-popover-foreground leading-relaxed">{draft.assigneeWarning}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 border-t border-border/50 pt-1">Click to assign a space member</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="relative inline-flex items-center">
                  <InlineEditableAssignee
                    assignee={currentAssignee}
                    members={spaceMembers}
                    ticketId={0}
                    onUpdate={async (memberId) => {
                      const m = spaceMembers.find((mem) => mem.id === memberId || mem.userId === memberId);
                      const updated = {
                        ...draft,
                        assigneeId: memberId || undefined,
                        assigneeName: m
                          ? `${m.userFirstName || m.firstName || ""} ${m.userLastName || m.lastName || ""}`.trim()
                          : undefined,
                        assigneeWarning: undefined,
                        requestedAssigneeName: undefined,
                      };
                      setDraft(updated);
                      onUpdateDraft?.(updated);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Severity, Queue, and Actions (X and Save) */}
      <div className="px-3.5 py-2.5 bg-muted/30 border-t border-dashed border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {createdTicket ? (
            <div
              className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted/40 border border-gray-200 dark:border-gray-700/80 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 cursor-default select-none opacity-85"
              title={currentSeverity ? currentSeverity.name : "No severity"}
            >
              {currentSeverity ? (
                <>
                  <Flag
                    className="w-3.5 h-3.5 flex-shrink-0"
                    fill={currentSeverity.color || "#3b82f6"}
                    color={currentSeverity.color || "#3b82f6"}
                  />
                  <span className="text-gray-700 dark:text-gray-300">{currentSeverity.name}</span>
                </>
              ) : (
                <>
                  <Flag className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                  <span className="text-gray-400 italic">No severity</span>
                </>
              )}
            </div>
          ) : (
            <InlineEditableSeverity
              severity={currentSeverity}
              severities={spaceConfigs.severities}
              ticketId={0}
              onUpdate={async (severityId) => {
                const s = spaceConfigs.severities.find((item) => item.id === severityId);
                const matchingSla = spaceConfigs.slas.find((sla) => Number(sla.severityId) === severityId);
                const updated = {
                  ...draft,
                  severityId,
                  severityName: s?.name,
                  ticketSlaId: matchingSla ? Number(matchingSla.id) : prevDraftSlaId(draft.ticketSlaId),
                };
                setDraft(updated);
                onUpdateDraft?.(updated);
              }}
            />
          )}

          {createdTicket ? (
            <div
              className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted/40 border border-gray-200 dark:border-gray-700/80 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 cursor-default select-none opacity-85"
              title={currentQueue ? currentQueue.name : "No queue"}
            >
              <FolderClosed className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                {currentQueue ? currentQueue.name : <span className="text-gray-400 italic">No queue</span>}
              </span>
            </div>
          ) : (
            <InlineEditableQueue
              queue={currentQueue}
              queues={spaceConfigs.queues}
              ticketId={0}
              onUpdate={async (queueId) => {
                const q = spaceConfigs.queues.find((item) => item.id === queueId);
                const updated = {
                  ...draft,
                  queueId: queueId || undefined,
                  queueName: q?.name,
                };
                setDraft(updated);
                onUpdateDraft?.(updated);
              }}
            />
          )}
        </div>

        {/* Right: Dismiss (X) and Save, or Open once created */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {createdTicket ? (
            <button
              type="button"
              onClick={() => {
                const spaceId = draft.ticketSpaceId || createdTicket.ticketSpaceId || "";
                const url = `/ticket-management/ticket/form?ticketSpaceId=${spaceId}&edit=true&ticketId=${createdTicket.id}`;
                window.open(url, "_blank");
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-primary hover:underline transition-colors cursor-pointer select-none"
              title="Open in new window"
            >
              Open
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={onDismiss}
                disabled={isSubmitting}
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={handleConfirmCreate}
                disabled={isSubmitting || !draft.name || !draft.ticketSpaceId}
                title={isUpdateAction ? "Update ticket" : "Save ticket"}
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-primary" />
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function prevDraftSlaId(id?: number) {
  return id;
}

// Single Ticket Draft Table Row component (Table View)
function SingleTicketDraftTableRow({
  initialDraft,
  spaceConfigs,
  spaceMembers,
  spacePrefix,
  spaceData,
  warnings = [],
  createdTicketProp,
  isSubmittingProp,
  onCreated,
  onUpdateDraft,
  onDismiss,
  isUpdateAction = false,
  isLast = false,
}: {
  initialDraft: TicketDraftData;
  spaceConfigs: SpaceConfigs;
  spaceMembers: any[];
  spacePrefix: string;
  spaceData?: any;
  warnings?: string[];
  createdTicketProp?: { id: number; code?: string; name: string; ticketSpaceId?: number } | null;
  isSubmittingProp?: boolean;
  onCreated?: (created: { id: number; code?: string; name: string; ticketSpaceId?: number }) => void;
  onUpdateDraft?: (updated: TicketDraftData) => void;
  onDismiss: () => void;
  isUpdateAction?: boolean;
  isLast?: boolean;
}) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<TicketDraftData>(initialDraft);
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
  const [internalCreatedTicket, setInternalCreatedTicket] = useState<{
    id: number;
    code?: string;
    name: string;
    ticketSpaceId?: number;
  } | null>(null);

  const createdTicket = createdTicketProp || internalCreatedTicket;
  const isSubmitting = isSubmittingProp || internalIsSubmitting;

  useEffect(() => {
    setDraft((prev) => {
      const next = { ...initialDraft, ...prev };
      return resolveTicketDraftEntities(next, spaceConfigs, spaceData, spaceMembers, user, next.ticketSpaceId);
    });
  }, [initialDraft, spaceConfigs, spaceData, spaceMembers, user]);

  const handleConfirmCreate = async () => {
    if (!draft.name || !draft.name.trim()) {
      toast.error("Ticket name is required");
      return;
    }
    if (!draft.ticketSpaceId) {
      toast.error("Please select a ticket space first");
      return;
    }

    setInternalIsSubmitting(true);
    try {
      let finalAssigneeId = draft.assigneeId;
      const isMe =
        draft.assigneeName?.toLowerCase() === "me" ||
        draft.assigneeName?.toLowerCase() === "myself";

      if ((!finalAssigneeId || isMe) && user?.email && spaceMembers.length > 0) {
        const myMember = spaceMembers.find(
          (m) =>
            m.userEmail?.toLowerCase() === user.email?.toLowerCase() ||
            Number(m.userId) === Number(user.id)
        );
        if (myMember) {
          finalAssigneeId = Number(myMember.id);
        }
      } else if (finalAssigneeId && spaceMembers.length > 0) {
        const matched = spaceMembers.find(
          (m) => Number(m.userId) === Number(finalAssigneeId) || Number(m.id) === Number(finalAssigneeId)
        );
        if (matched) {
          finalAssigneeId = Number(matched.id);
        }
      }



      if (isUpdateAction) {
        let ticketId = draft.id;
        if (!ticketId && draft.code) {
          try {
            const searchRes = await searchTickets({
              filters: [{ field: "code", matchMode: "equals", value: draft.code }],
              pageSize: 1,
              pageNumber: 1,
            });
            const found = searchRes?.tickets?.[0] || searchRes?.data?.[0];
            if (found?.id) ticketId = found.id;
          } catch (e) {
            console.error("Could not find ticket by code:", e);
          }
        }

        if (!ticketId) {
          toast.error(`Ticket ID not found for ${draft.code || "ticket"}`);
          return;
        }

        const updateDto: any = {
          name: draft.name.trim(),
          description: draft.description || "",
          ticketSpaceId: draft.ticketSpaceId,
          ticketTypeId: draft.ticketTypeId,
          severityId: draft.severityId,
          statusId: draft.statusId,
          queueId: draft.queueId,
          ticketSlaId: draft.ticketSlaId,
          assigneeId: finalAssigneeId,
          completionDate: draft.completionDate ? new Date(draft.completionDate).toISOString() : undefined,
          plannedEffort: draft.plannedEffort,
        };

        const result = await patchTicket(ticketId, updateDto);
        const updated = result || draft;
        const updatedObj = {
          id: updated.id || ticketId,
          code: updated.code || draft.code,
          name: updated.name || draft.name,
          ticketSpaceId: updated.ticketSpaceId || draft.ticketSpaceId,
          severityName: updated.severity?.name || updated.severityName || draft.severityName,
          severityColor: updated.severity?.color || updated.severityColor || draft.severityColor,
          statusName: updated.status?.name || updated.statusName || draft.statusName,
          statusColor: updated.status?.color || updated.statusColor || draft.statusColor,
          queueName: updated.queue?.name || updated.queueName || draft.queueName,
          assigneeName: updated.assigneeName || draft.assigneeName,
        };

        setInternalCreatedTicket(updatedObj);
        onCreated?.(updatedObj);

        if (typeof window !== "undefined") {
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent("synlio:ticket-updated", {
                detail: { ticket: updatedObj, tickets: [updatedObj], ticketSpaceId: draft.ticketSpaceId },
              })
            );
          }, 0);
        }
        toast.success(`Ticket ${draft.code || ""} updated successfully`);
        return;
      }

      const createPayload: any = {
        name: draft.name.trim(),
        description: draft.description || "",
        ticketSpaceId: draft.ticketSpaceId,
        ticketTypeId: draft.ticketTypeId,
        severityId: draft.severityId,
        statusId: draft.statusId,
        queueId: draft.queueId,
        ticketSlaId: draft.ticketSlaId,
        assigneeId: finalAssigneeId,
        completionDate: draft.completionDate ? new Date(draft.completionDate).toISOString() : undefined,
        plannedEffort: draft.plannedEffort,
      };

      const result = await createTicket(createPayload);
      const ticketId = result?.ticketId || result?.id || 0;
      const code = result?.code || result?.prefixCode;

      const createdObj = {
        id: ticketId,
        code,
        name: draft.name,
        ticketSpaceId: draft.ticketSpaceId || result?.ticketSpaceId,
      };

      setInternalCreatedTicket(createdObj);
      onCreated?.(createdObj);

      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("synlio:ticket-created", { detail: { ticket: result } })
          );
        }, 0);
      }

      toast.success("Ticket created successfully!");
    } catch (err: any) {
      console.error("Failed to create ticket:", err);
      toast.error(err?.response?.data?.message || "Failed to create ticket");
    } finally {
      setInternalIsSubmitting(false);
    }
  };

  const currentTicketType = useMemo(() => {
    if (!draft.ticketTypeId && !draft.ticketTypeName) {
      return spaceConfigs.types[0] || null;
    }
    const matched = spaceConfigs.types.find(
      (t) =>
        t.id === draft.ticketTypeId ||
        t.name?.toLowerCase() === draft.ticketTypeName?.toLowerCase() ||
        (draft.ticketTypeName && t.name?.toLowerCase().includes(draft.ticketTypeName.toLowerCase()))
    );
    if (matched) return matched;
    return draft.ticketTypeId
      ? {
          id: draft.ticketTypeId,
          name: draft.ticketTypeName || "Type",
          icon: undefined,
          color: "#3b82f6",
        }
      : spaceConfigs.types[0] || null;
  }, [draft.ticketTypeId, draft.ticketTypeName, spaceConfigs.types]);

  const currentStatus = useMemo(() => {
    if (!draft.statusId && !draft.statusName) {
      return spaceConfigs.statuses[0] || null;
    }
    const matched = spaceConfigs.statuses.find(
      (s) =>
        s.id === draft.statusId ||
        s.name?.toLowerCase() === draft.statusName?.toLowerCase() ||
        (draft.statusName && s.name?.toLowerCase().includes(draft.statusName.toLowerCase()))
    );
    if (matched) return matched;
    return draft.statusId
      ? {
          id: draft.statusId,
          name: draft.statusName || "Status",
          color: "#3b82f6",
        }
      : spaceConfigs.statuses[0] || null;
  }, [draft.statusId, draft.statusName, spaceConfigs.statuses]);

  const currentSeverity = useMemo(() => {
    if (!draft.severityId && !draft.severityName) {
      return spaceConfigs.severities[0] || null;
    }
    const matched = spaceConfigs.severities.find(
      (s) =>
        s.id === draft.severityId ||
        s.name?.toLowerCase() === draft.severityName?.toLowerCase() ||
        (draft.severityName && s.name?.toLowerCase().includes(draft.severityName.toLowerCase()))
    );
    if (matched) return matched;
    return draft.severityId
      ? {
          id: draft.severityId,
          name: draft.severityName || "Severity",
          color: "#ef4444",
        }
      : spaceConfigs.severities[0] || null;
  }, [draft.severityId, draft.severityName, spaceConfigs.severities]);

  const currentQueue = useMemo(() => {
    if (!draft.queueId && !draft.queueName) {
      return spaceConfigs.queues[0] || null;
    }
    const matched = spaceConfigs.queues.find(
      (q) =>
        q.id === draft.queueId ||
        q.name?.toLowerCase() === draft.queueName?.toLowerCase() ||
        (draft.queueName && q.name?.toLowerCase().includes(draft.queueName.toLowerCase()))
    );
    if (matched) return matched;
    return draft.queueId
      ? {
          id: draft.queueId,
          name: draft.queueName || "Queue",
        }
      : spaceConfigs.queues[0] || null;
  }, [draft.queueId, draft.queueName, spaceConfigs.queues]);

  const currentAssignee = useMemo(() => {
    if (draft.assigneeWarning || draft.requestedAssigneeName) {
      return {
        id: 0,
        isUnknown: true,
        first_name: "?",
        last_name: "",
        userFirstName: "?",
        userLastName: "",
        unknownMessage: draft.assigneeWarning,
      };
    }

    const isMe =
      draft.assigneeName?.toLowerCase() === "me" ||
      draft.assigneeName?.toLowerCase() === "myself";

    if (isMe && user?.email && spaceMembers.length > 0) {
      const myMember = spaceMembers.find(
        (m) =>
          m.userEmail?.toLowerCase() === user.email?.toLowerCase() ||
          Number(m.userId) === Number(user.id)
      );
      if (myMember) {
        return {
          id: myMember.userId || myMember.id,
          first_name: (myMember.userFirstName || myMember.firstName || user.first_name || "").trim(),
          last_name: (myMember.userLastName || myMember.lastName || user.last_name || "").trim(),
          profile_picture: myMember.userProfilePicture || myMember.profilePicture || user.profile_picture || null,
        };
      }
    }

    if (!draft.assigneeId && !draft.assigneeName) return null;
    const targetName = (draft.assigneeName || "").replace(/\s+/g, " ").trim().toLowerCase();
    const matched = spaceMembers.find(
      (m) => {
        if (draft.assigneeId && (Number(m.id) === Number(draft.assigneeId) || Number(m.userId) === Number(draft.assigneeId))) {
          return true;
        }
        if (targetName) {
          const first = (m.userFirstName || m.firstName || m.first_name || "").trim().toLowerCase();
          const last = (m.userLastName || m.lastName || m.last_name || "").trim().toLowerCase();
          const fullName = `${first} ${last}`.replace(/\s+/g, " ").trim().toLowerCase();
          return (
            fullName === targetName ||
            fullName.includes(targetName) ||
            targetName.includes(fullName)
          );
        }
        return false;
      }
    );
    if (matched) {
      return {
        id: matched.userId || matched.id,
        first_name: (matched.userFirstName || matched.firstName || matched.first_name || "").trim(),
        last_name: (matched.userLastName || matched.lastName || matched.last_name || "").trim(),
        profile_picture: matched.userProfilePicture || matched.profilePicture || null,
      };
    }
    if (draft.assigneeName) {
      const parts = draft.assigneeName.trim().split(/\s+/);
      return {
        id: draft.assigneeId || 0,
        first_name: parts[0] || "",
        last_name: parts.slice(1).join(" ") || "",
        profile_picture: null,
      };
    }
    return null;
  }, [draft.assigneeId, draft.assigneeName, draft.assigneeWarning, draft.requestedAssigneeName, spaceMembers, user]);

  const filteredWarnings = useMemo(() => {
    return (warnings || []).filter((w) => {
      const lower = w.toLowerCase();
      if (lower.includes('matching "me"')) return false;
      if (draft.assigneeId || currentAssignee) {
        if (lower.includes('no team member matching')) return false;
      }
      return true;
    });
  }, [warnings, draft.assigneeId, currentAssignee]);

  return (
    <tr className={`h-[48px] hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors group ${!isLast ? "border-b border-border/70" : ""}`}>
      {/* 1. Merged Code & Title (Pinned to Left End) */}
      <td className="py-2.5 px-3.5 align-middle min-w-[220px] max-w-[320px] sticky left-0 z-10 bg-card group-hover:bg-gray-50 dark:group-hover:bg-zinc-900 transition-colors shadow-[1px_0_0_0_hsl(var(--border))]">
        <div className="flex items-center gap-2 min-w-0 h-7">
          <span
            className="text-xs font-semibold tracking-wide text-primary select-none whitespace-nowrap shrink-0"
            title={createdTicket?.code ? `Ticket ${createdTicket.code}` : "Ticket draft code"}
          >
            {createdTicket?.code || draft?.code || (spacePrefix ? `${spacePrefix}-?` : "DRAFT")}
          </span>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {createdTicket ? (
              <span className="font-medium text-foreground truncate text-xs sm:text-sm select-none">
                {draft.name || ""}
              </span>
            ) : (
              <InlineEditableTicketName
                name={draft.name || ""}
                onUpdate={async (name) => {
                  const updated = { ...draft, name };
                  setDraft(updated);
                  onUpdateDraft?.(updated);
                }}
                className="font-medium text-foreground truncate text-xs sm:text-sm"
              />
            )}
            {(draft.description || (draft.name && draft.name.length > 30)) && (
              <HoverCard openDelay={150}>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="View description"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </HoverCardTrigger>
                <HoverCardContent
                  className="w-80 max-h-80 overflow-y-auto"
                  side="right"
                  align="start"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-1.5 text-xs">
                    <div className="font-semibold text-foreground border-b border-border pb-1">
                      {draft.name}
                    </div>
                    <FormattedDescription content={draft.description} />
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
          </div>
        </div>

      </td>

      {/* 2. Ticket Type (Icon + Name) */}
      <td className="py-2.5 px-3.5 align-middle whitespace-nowrap">
        {createdTicket ? (
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted/40 border border-gray-200 dark:border-gray-700/80 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 cursor-default select-none opacity-85"
            title={currentTicketType ? currentTicketType.name : "No type"}
          >
            {currentTicketType ? (
              <>
                {(() => {
                  const TypeIcon = getIconComponent(currentTicketType.icon);
                  return TypeIcon ? (
                    <TypeIcon
                      className={cn(
                        "w-3.5 h-3.5 flex-shrink-0",
                        (!currentTicketType.color || currentTicketType.color.toLowerCase() === "#3b82f6") && "text-blue-500 dark:text-blue-400"
                      )}
                      style={
                        currentTicketType.color && currentTicketType.color.toLowerCase() !== "#3b82f6"
                          ? { color: currentTicketType.color }
                          : undefined
                      }
                    />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                  );
                })()}
                <span>{currentTicketType.name}</span>
              </>
            ) : (
              <span className="text-gray-400 italic">No type</span>
            )}
          </div>
        ) : (
          <InlineEditableTicketType
            ticketType={currentTicketType}
            ticketId={0}
            types={spaceConfigs.types}
            getIconComponent={getIconComponent}
            onUpdate={async (typeId) => {
              const t = spaceConfigs.types.find((item) => item.id === typeId);
              const updated = {
                ...draft,
                ticketTypeId: typeId,
                ticketTypeName: t?.name,
              };
              setDraft(updated);
              onUpdateDraft?.(updated);
            }}
          />
        )}
      </td>

      {/* 3. Status */}
      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
        {createdTicket ? (
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted/40 border border-gray-200 dark:border-gray-700/80 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 max-w-[140px] min-w-0 cursor-default select-none opacity-85"
            title={currentStatus ? currentStatus.name : "No status"}
          >
            {currentStatus ? (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: currentStatus.color }}
                />
                <span className="text-gray-700 dark:text-gray-300 truncate min-w-0 whitespace-nowrap">
                  {currentStatus.name}
                </span>
              </span>
            ) : (
              <span className="text-gray-400 italic whitespace-nowrap">No status</span>
            )}
          </div>
        ) : (
          <InlineEditableStatus
            status={currentStatus}
            statuses={spaceConfigs.statuses}
            ticketId={0}
            onUpdate={async (statusId) => {
              const s = spaceConfigs.statuses.find((item) => item.id === statusId);
              const updated = {
                ...draft,
                statusId,
                statusName: s?.name,
              };
              setDraft(updated);
              onUpdateDraft?.(updated);
            }}
          />
        )}
      </td>

      {/* 4. Severity */}
      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
        {createdTicket ? (
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted/40 border border-gray-200 dark:border-gray-700/80 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 cursor-default select-none opacity-85"
            title={currentSeverity ? currentSeverity.name : "No severity"}
          >
            {currentSeverity ? (
              <>
                <Flag
                  className="w-3.5 h-3.5 flex-shrink-0"
                  fill={currentSeverity.color || "#3b82f6"}
                  color={currentSeverity.color || "#3b82f6"}
                />
                <span className="text-gray-700 dark:text-gray-300">{currentSeverity.name}</span>
              </>
            ) : (
              <>
                <Flag className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                <span className="text-gray-400 italic">No severity</span>
              </>
            )}
          </div>
        ) : (
          <InlineEditableSeverity
            severity={currentSeverity}
            severities={spaceConfigs.severities}
            ticketId={0}
            onUpdate={async (severityId) => {
              const s = spaceConfigs.severities.find((item) => item.id === severityId);
              const updated = {
                ...draft,
                severityId,
                severityName: s?.name,
              };
              setDraft(updated);
              onUpdateDraft?.(updated);
            }}
          />
        )}
      </td>

      {/* 5. Queue */}
      <td className="py-2.5 px-3 align-middle whitespace-nowrap max-w-[140px] overflow-hidden">
        {createdTicket ? (
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted/40 border border-gray-200 dark:border-gray-700/80 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 cursor-default select-none opacity-85"
            title={currentQueue ? currentQueue.name : "No queue"}
          >
            <FolderClosed className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
              {currentQueue ? currentQueue.name : <span className="text-gray-400 italic">No queue</span>}
            </span>
          </div>
        ) : (
          <InlineEditableQueue
            queue={currentQueue}
            queues={spaceConfigs.queues}
            ticketId={0}
            onUpdate={async (queueId) => {
              const q = spaceConfigs.queues.find((item) => item.id === queueId);
              const updated = {
                ...draft,
                queueId: queueId || undefined,
                queueName: q?.name,
              };
              setDraft(updated);
              onUpdateDraft?.(updated);
            }}
          />
        )}
      </td>

      {/* 7. Assignee */}
      <td className="py-2.5 px-3.5 align-middle whitespace-nowrap max-w-[120px] overflow-hidden">
        <div className="flex items-center gap-1.5">
          {createdTicket ? (
            currentAssignee ? (
              <div
                className="inline-flex items-center gap-1.5 cursor-default opacity-85"
                title={`${currentAssignee.first_name || ""} ${currentAssignee.last_name || ""}`.trim()}
              >
                <UserAvatar
                  firstName={currentAssignee.first_name}
                  lastName={currentAssignee.last_name}
                  profilePicture={currentAssignee.profile_picture}
                  size="sm"
                />
                <span className="text-xs text-foreground truncate max-w-[120px]">
                  {`${currentAssignee.first_name || ""} ${currentAssignee.last_name || ""}`.trim() || "Assignee"}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground/60 italic text-xs select-none cursor-default">—</span>
            )
          ) : draft.assigneeWarning ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative inline-flex items-center cursor-pointer">
                  <InlineEditableAssignee
                    assignee={currentAssignee}
                    members={spaceMembers}
                    ticketId={0}
                    onUpdate={async (memberId) => {
                      if (!memberId) {
                        const updated = {
                          ...draft,
                          assigneeId: undefined,
                          assigneeName: undefined,
                          assigneeWarning: undefined,
                          requestedAssigneeName: undefined,
                        };
                        setDraft(updated);
                        onUpdateDraft?.(updated);
                        return;
                      }
                      const member = spaceMembers.find((m) => m.id === memberId);
                      if (member) {
                        const updated = {
                          ...draft,
                          assigneeId: member.id,
                          assigneeName:
                            `${member.userFirstName || member.firstName || ""} ${member.userLastName || member.lastName || ""}`.replace(/\s+/g, " ").trim() ||
                            member.userEmail,
                          assigneeWarning: undefined,
                          requestedAssigneeName: undefined,
                        };
                        setDraft(updated);
                        onUpdateDraft?.(updated);
                      }
                    }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-xs p-2.5 shadow-md">
                {/* <p className="font-semibold text-amber-600 dark:text-amber-400 mb-0.5">Assignee Warning</p> */}
                <p className="text-popover-foreground leading-relaxed">{draft.assigneeWarning}</p>
                <p className="text-xs text-muted-foreground mt-1.5 border-t border-border/50 pt-1">Click to assign a space member</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="relative inline-flex items-center">
              <InlineEditableAssignee
                assignee={currentAssignee}
                members={spaceMembers}
                ticketId={0}
                onUpdate={async (memberId) => {
                  if (!memberId) {
                    const updated = {
                      ...draft,
                      assigneeId: undefined,
                      assigneeName: undefined,
                      assigneeWarning: undefined,
                      requestedAssigneeName: undefined,
                    };
                    setDraft(updated);
                    onUpdateDraft?.(updated);
                    return;
                  }
                  const member = spaceMembers.find((m) => m.id === memberId);
                  if (member) {
                    const updated = {
                      ...draft,
                      assigneeId: member.id,
                      assigneeName:
                        `${member.userFirstName || member.firstName || ""} ${member.userLastName || member.lastName || ""}`.replace(/\s+/g, " ").trim() ||
                        member.userEmail,
                      assigneeWarning: undefined,
                      requestedAssigneeName: undefined,
                    };
                    setDraft(updated);
                    onUpdateDraft?.(updated);
                  }
                }}
              />
            </div>
          )}
        </div>
      </td>

      {/* 7. Row Actions (Pinned to Right End) */}
      <td className="py-2.5 px-3 align-middle whitespace-nowrap text-right min-w-[80px] w-[80px] sticky right-0 z-10 bg-card dark:bg-zinc-950 group-hover:bg-gray-50 dark:group-hover:bg-zinc-900 transition-colors shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="flex items-center justify-end gap-1 flex-shrink-0 h-7">
          {createdTicket ? (
            <button
              type="button"
              onClick={() => {
                const spaceId = draft.ticketSpaceId || createdTicket.ticketSpaceId || "";
                const url = `/ticket-management/ticket/form?ticketSpaceId=${spaceId}&edit=true&ticketId=${createdTicket.id}`;
                window.open(url, "_blank");
              }}
              className="inline-flex items-center gap-1 px-2 h-7 rounded text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer select-none"
              title="Open in new window"
            >
              Open
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={onDismiss}
                disabled={isSubmitting}
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={handleConfirmCreate}
                disabled={isSubmitting || !draft.name || !draft.ticketSpaceId}
                title={isUpdateAction ? "Update ticket" : "Save ticket"}
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-primary" />
                )}
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// Table Container component for Ticket Drafts
function TicketDraftTableView({
  visibleDrafts,
  spaceConfigs,
  spaceMembers,
  spacePrefix,
  spaceData,
  warnings,
  createdTicketsMap,
  isSubmittingAll,
  isUpdateAction = false,
  setCreatedTicketsMap,
  setEditedDraftsMap,
  onUpdateDraft,
  handleDismissOne,
}: {
  visibleDrafts: Array<{ draft: TicketDraftData; index: number }>;
  spaceConfigs: SpaceConfigs;
  spaceMembers: any[];
  spacePrefix: string;
  spaceData?: any;
  warnings: string[];
  createdTicketsMap: Record<number, any>;
  isSubmittingAll: boolean;
  isUpdateAction?: boolean;
  setCreatedTicketsMap: React.Dispatch<React.SetStateAction<Record<number, any>>>;
  setEditedDraftsMap: React.Dispatch<React.SetStateAction<Record<number, TicketDraftData>>>;
  onUpdateDraft?: (updated: TicketDraftData) => void;
  handleDismissOne: (index: number) => void;
}) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-500 [scrollbar-width:thin]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-border">
            <tr>
              <th className="h-10 px-3.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[220px] max-w-[320px] sticky left-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border shadow-[1px_0_0_0_hsl(var(--border))]">
                Title
              </th>
              <th className="h-10 px-3.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[130px]">
                Type
              </th>
              <th className="h-10 px-3.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[120px]">
                Status
              </th>
              <th className="h-10 px-3.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[110px]">
                Severity
              </th>
              <th className="h-10 px-3.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[120px]">
                Queue/Dept.
              </th>
              <th className="h-10 px-3.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[90px]">
                Assignee
              </th>
              <th className="h-10 px-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[80px] sticky right-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.08)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="">
            {visibleDrafts.map(({ draft: draftItem, index }, rowIdx) => {
              const cardWarnings = (draftItem as any).warnings || (
                warnings.filter((w) => {
                  const lower = w.toLowerCase();
                  if (lower.includes('matching "me"')) return false;
                  if (lower.includes('no team member matching') || lower.includes('multiple team members found matching')) {
                    const target = draftItem.assigneeName?.toLowerCase().trim();
                    return target ? lower.includes(`"${target}"`) : false;
                  }
                  return index === 0;
                })
              );

              return (
                <SingleTicketDraftTableRow
                  key={index}
                  initialDraft={draftItem}
                  spaceConfigs={spaceConfigs}
                  spaceMembers={spaceMembers}
                  spacePrefix={spacePrefix}
                  spaceData={spaceData}
                  warnings={cardWarnings}
                  createdTicketProp={createdTicketsMap[index]}
                  isSubmittingProp={isSubmittingAll}
                  isUpdateAction={isUpdateAction}
                  isLast={rowIdx === visibleDrafts.length - 1}
                  onCreated={(created) => {
                    setCreatedTicketsMap((prev) => ({ ...prev, [index]: created }));
                  }}
                  onUpdateDraft={(updated) => {
                    setEditedDraftsMap((prev) => ({ ...prev, [index]: updated }));
                    onUpdateDraft?.(updated);
                  }}
                  onDismiss={() => handleDismissOne(index)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TicketDraftCard({
  payload,
  onUpdateDraft,
  onSelectOption,
  onCancel,
}: TicketDraftCardProps) {
  const { user } = useAuth();
  const [warnings, setWarnings] = useState<string[]>(payload.warnings || []);
  const [availableSpaces, setAvailableSpaces] = useState<Array<{ id: number; name: string }>>([]);
  const [spacePrefix, setSpacePrefix] = useState<string>("");
  const [spaceMembers, setSpaceMembers] = useState<any[]>([]);
  const [spaceData, setSpaceData] = useState<any>(null);
  const [spaceConfigs, setSpaceConfigs] = useState<SpaceConfigs>({
    types: [],
    severities: [],
    statuses: [],
    queues: [],
    slas: [],
  });
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);
  const [isOptionSelected, setIsOptionSelected] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [dismissedIndexSet, setDismissedIndexSet] = useState<Set<number>>(new Set());
  const isUpdateAction = payload.action === "UPDATE_TICKET";
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [createdTicketsMap, setCreatedTicketsMap] = useState<Record<number, any>>({});
  const [editedDraftsMap, setEditedDraftsMap] = useState<Record<number, TicketDraftData>>({});

  // Sync with Ticket Page view mode ('card' | 'table' | 'kanban')
  const [ticketPageViewPreference] = useViewPreference(
    "ticket",
    ["card", "table", "kanban", "group"],
    "card",
    user?.id
  );

  // Allow manual toggle within Copilot response while staying synchronized with ticket page
  const [customViewMode, setCustomViewMode] = useState<"card" | "table" | null>(null);

  useEffect(() => {
    setCustomViewMode(null);
  }, [ticketPageViewPreference]);

  const effectiveViewMode: "card" | "table" = useMemo(() => {
    if (customViewMode) return customViewMode;
    if (ticketPageViewPreference === "table") return "table";
    return "card";
  }, [customViewMode, ticketPageViewPreference]);

  // Extract list of drafts (supports single draft, array of drafts, payload.drafts, payload.tickets)
  const draftsList: TicketDraftData[] = useMemo(() => {
    if (payload.drafts && Array.isArray(payload.drafts) && payload.drafts.length > 0) {
      return payload.drafts;
    }
    if (payload.tickets && Array.isArray(payload.tickets) && payload.tickets.length > 0) {
      return payload.tickets;
    }
    if (Array.isArray(payload.draft)) {
      return payload.draft;
    }
    if (payload.draft && typeof payload.draft === "object") {
      return [payload.draft];
    }
    return [];
  }, [payload.draft, payload.drafts, payload.tickets]);

  // Determine effective space ID (from selected or any draft)
  const effectiveSpaceId = useMemo(() => {
    if (selectedSpaceId) return selectedSpaceId;
    return (
      draftsList.find((d) => d.ticketSpaceId || (d as any).ticketSpace?.id)?.ticketSpaceId ||
      (draftsList.find((d) => (d as any).ticketSpace?.id) as any)?.ticketSpace?.id ||
      null
    );
  }, [selectedSpaceId, draftsList]);

  // Sync warnings and created status from props
  useEffect(() => {
    setWarnings(payload.warnings || []);
    setSelectedSpaceId(null);
    setIsOptionSelected(false);
    setDismissedIndexSet(new Set());

    const initialCreated: Record<number, any> = {};
    draftsList.forEach((d: any, idx: number) => {
      // For updates, do NOT pre-mark as created/confirmed on initial load
      if (d && !isUpdateAction && d.id) {
        initialCreated[idx] = {
          id: d.id,
          code: d.code,
          name: d.name,
          ticketSpaceId: d.ticketSpaceId,
        };
      }
    });
    setCreatedTicketsMap(initialCreated);
    setEditedDraftsMap({});
  }, [payload, draftsList]);

  // Load allowed spaces for fallback / picker
  useEffect(() => {
    const loadSpaces = async () => {
      try {
        const res = await searchTicketSpaces({ pageSize: 50, pageNumber: 1 });
        const spaces = res?.ticketSpaces || res?.data || [];
        setAvailableSpaces(
          spaces.map((s: any) => ({
            id: Number(s.ticketSpaceId || s.id),
            name: s.ticketSpaceName || s.name,
          }))
        );
      } catch (e) {
        console.error("Failed to load spaces for draft card:", e);
      }
    };
    loadSpaces();
  }, []);

  // When effectiveSpaceId changes, load space configs and members
  useEffect(() => {
    if (!effectiveSpaceId) return;
    const fetchConfigs = async () => {
      try {
        const spaceId = Number(effectiveSpaceId);
        const [
          statusRes,
          severityRes,
          typesRes,
          queuesRes,
          membersRes,
          slasRes,
          spaceRes,
        ] = await Promise.all([
          getTicketSpaceStatusConfig(spaceId).catch(() => null),
          getTicketSpaceSeverityConfig(spaceId).catch(() => null),
          getTicketSpaceTypesConfig(spaceId).catch(() => null),
          getTicketSpaceQueueConfig(spaceId).catch(() => null),
          getTicketSpaceMembersConfig(spaceId).catch(() => null),
          getTicketSpaceSlaConfig(spaceId).catch(() => null),
          getTicketSpaceById(spaceId).catch(() => null),
        ]);

        const rawStatuses = statusRes?.statuses || statusRes?.data || (Array.isArray(statusRes) ? statusRes : []);
        const rawSeverities = severityRes?.severities || severityRes?.data || (Array.isArray(severityRes) ? severityRes : []);
        const rawTypes = typesRes?.types || typesRes?.data || (Array.isArray(typesRes) ? typesRes : []);
        const rawQueues = queuesRes?.queues || queuesRes?.data || (Array.isArray(queuesRes) ? queuesRes : []);
        const rawMembers = membersRes?.members || membersRes?.data || (Array.isArray(membersRes) ? membersRes : []);
        const rawSlas = slasRes?.slas || slasRes?.data || (Array.isArray(slasRes) ? slasRes : []);
        const sData = spaceRes?.data ?? spaceRes;

        const types = rawTypes.map((t: any) => ({
          id: Number(t.id),
          name: t.name,
          icon: t.icon,
          color: t.color || "#3b82f6",
        }));
        const severities = rawSeverities.map((s: any) => ({
          id: Number(s.id),
          name: s.name,
          color: s.color || "#ef4444",
        }));
        const statuses = rawStatuses.map((st: any) => ({
          id: Number(st.id),
          name: st.name,
          color: st.color || "#3b82f6",
          base: st.base,
          sequence: st.sequence ?? 0,
        }));
        const queues = rawQueues.map((q: any) => ({ id: Number(q.id), name: q.name }));
        const slas = rawSlas.map((sla: any) => ({ id: Number(sla.id), severityId: Number(sla.severityId) }));

        setSpacePrefix(sData?.prefix || sData?.ticketSpacePrefix || "");
        setSpaceMembers(rawMembers);
        setSpaceData(sData);

        setSpaceConfigs({
          types,
          severities,
          statuses,
          queues,
          slas,
        });
      } catch (err) {
        console.error("Failed to fetch space configs:", err);
      }
    };
    fetchConfigs();
  }, [effectiveSpaceId]);

  const handleSpaceSelect = (spaceId: number, spaceName: string) => {
    setIsDismissed(true);
    setIsOptionSelected(true);
    setSelectedSpaceId(spaceId);
    if (onSelectOption) {
      onSelectOption("ticketSpace", { id: spaceId, name: spaceName });
    }
  };

  const handleDismissAll = () => {
    setIsDismissed(true);
    setIsOptionSelected(true);
    setTimeout(() => {
      onCancel?.();
    }, 0);
  };

  const handleDismissOne = (index: number) => {
    const nextSet = new Set(dismissedIndexSet);
    nextSet.add(index);
    setDismissedIndexSet(nextSet);

    const remainingUncreated = draftsList.filter(
      (_, i) => !createdTicketsMap[i] && !nextSet.has(i)
    ).length;

    if (nextSet.size >= draftsList.length || remainingUncreated === 0) {
      setIsDismissed(true);
      setIsOptionSelected(true);
      setTimeout(() => {
        onCancel?.();
      }, 0);
    }
  };

  // Filter visible drafts (excluding individually dismissed ones)
  const visibleDrafts = draftsList
    .map((d, index) => {
      const merged = {
        ...d,
        ...(editedDraftsMap[index] || {}),
        ticketSpaceId: (editedDraftsMap[index]?.ticketSpaceId) || d.ticketSpaceId || effectiveSpaceId || undefined,
      };
      const resolved = resolveTicketDraftEntities(
        merged,
        spaceConfigs,
        spaceData,
        spaceMembers,
        user,
        effectiveSpaceId
      );
      return {
        draft: resolved,
        index,
      };
    })
    .filter(({ index }) => !dismissedIndexSet.has(index));

  const uncreatedCount = visibleDrafts.filter(({ index }) => !createdTicketsMap[index]).length;

  const handleCreateAll = async () => {
    if (isSubmittingAll) return;
    setIsSubmittingAll(true);

    try {
      const uncreated = visibleDrafts.filter(({ index }) => !createdTicketsMap[index]);
      if (uncreated.length === 0) return;

      if (isUpdateAction) {
        // Bulk mutation of existing tickets via direct patchTicket
        const updatedList: any[] = [];
        const updatedMap: Record<number, any> = {};

        for (const { draft: rawItem, index } of uncreated) {
          const item = resolveTicketDraftEntities(
            rawItem,
            spaceConfigs,
            spaceData,
            spaceMembers,
            user,
            effectiveSpaceId
          );

          let ticketId = item.id;
          if (!ticketId && item.code) {
            try {
              const searchRes = await searchTickets({
                filters: [{ field: "code", matchMode: "equals", value: item.code }],
                pageSize: 1,
                pageNumber: 1,
              });
              const found = searchRes?.tickets?.[0] || searchRes?.data?.[0];
              if (found?.id) ticketId = found.id;
            } catch (e) {
              console.error("Could not find ticket by code:", e);
            }
          }

          if (!ticketId) continue;

          let itemAssigneeId = item.assigneeId;
          const isMe =
            item.assigneeName?.toLowerCase() === "me" ||
            item.assigneeName?.toLowerCase() === "myself";
          if ((!itemAssigneeId || isMe) && user?.email && spaceMembers.length > 0) {
            const myMember = spaceMembers.find(
              (m) =>
                m.userEmail?.toLowerCase() === user.email?.toLowerCase() ||
                Number(m.userId) === Number(user.id)
            );
            if (myMember) itemAssigneeId = Number(myMember.id);
          } else if (itemAssigneeId && spaceMembers.length > 0) {
            const matched = spaceMembers.find(
              (m) => Number(m.userId) === Number(itemAssigneeId) || Number(m.id) === Number(itemAssigneeId)
            );
            if (matched) itemAssigneeId = Number(matched.id);
          }

          const updateDto: any = {
            name: (item.name || "").trim(),
            description: item.description || "",
            ticketSpaceId: item.ticketSpaceId || effectiveSpaceId,
            ticketTypeId: item.ticketTypeId,
            severityId: item.severityId,
            statusId: item.statusId,
            queueId: item.queueId,
            ticketSlaId: item.ticketSlaId,
            assigneeId: itemAssigneeId,
            completionDate: item.completionDate ? new Date(item.completionDate).toISOString() : undefined,
            plannedEffort: item.plannedEffort,
          };

          try {
            const res = await patchTicket(ticketId, updateDto);
            const updated = res || item;
            const updatedObj = {
              id: updated.id || ticketId,
              code: updated.code || item.code,
              name: updated.name || item.name,
              ticketSpaceId: updated.ticketSpaceId || item.ticketSpaceId,
              severityName: updated.severity?.name || updated.severityName || item.severityName,
              severityColor: updated.severity?.color || updated.severityColor || item.severityColor,
              statusName: updated.status?.name || updated.statusName || item.statusName,
              statusColor: updated.status?.color || updated.statusColor || item.statusColor,
              queueName: updated.queue?.name || updated.queueName || item.queueName,
              assigneeName: updated.assigneeName || item.assigneeName,
            };

            updatedMap[index] = updatedObj;
            updatedList.push(updatedObj);
          } catch (patchErr) {
            console.error(`Failed to patch ticket ${item.code}:`, patchErr);
          }
        }

        setCreatedTicketsMap((prev) => ({ ...prev, ...updatedMap }));

        if (typeof window !== "undefined") {
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent("synlio:ticket-updated", {
                detail: {
                  tickets: updatedList,
                  ticketSpaceId: effectiveSpaceId,
                },
              })
            );
          }, 50);
        }

        toast.success(`Successfully updated ${updatedList.length} ticket${updatedList.length > 1 ? "s" : ""}`);
        return;
      }

      // Build payload array for single atomic bulk transaction with fully resolved entities
      const payloads = uncreated.map(({ draft: rawItem }) => {
        const item = resolveTicketDraftEntities(
          rawItem,
          spaceConfigs,
          spaceData,
          spaceMembers,
          user,
          effectiveSpaceId
        );

        return {
          name: (item.name || "").trim(),
          description: item.description || "",
          ticketSpaceId: item.ticketSpaceId || effectiveSpaceId,
          ticketTypeId: item.ticketTypeId,
          severityId: item.severityId,
          statusId: item.statusId,
          queueId: item.queueId,
          ticketSlaId: item.ticketSlaId,
          assigneeId: item.assigneeId,
          completionDate: item.completionDate ? new Date(item.completionDate).toISOString() : undefined,
          plannedEffort: item.plannedEffort,
        };
      });

      // Send single HTTP request for transactional creation
      const rawResult = await createTicket(payloads);
      const resultsArray: any[] = Array.isArray(rawResult) ? rawResult : [rawResult];

      const updatedMap: Record<number, any> = {};
      resultsArray.forEach((result, idx) => {
        const original = uncreated[idx];
        if (!original) return;
        const ticketId = result?.ticketId || result?.id || 0;
        const code = result?.code || result?.prefixCode;
        updatedMap[original.index] = {
          id: ticketId,
          code,
          name: original.draft.name,
          ticketSpaceId: original.draft.ticketSpaceId || result?.ticketSpaceId,
        };
      });

      setCreatedTicketsMap((prev) => ({ ...prev, ...updatedMap }));

      // Dispatch single refresh event to TicketPage AFTER render tick
      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("synlio:ticket-created", {
              detail: {
                ticket: resultsArray[0],
                tickets: resultsArray,
                count: resultsArray.length,
              },
            })
          );
        }, 0);
      }

      toast.success(
        resultsArray.length === 1
          ? "Ticket created successfully!"
          : `Successfully created all ${resultsArray.length} tickets!`
      );
    } catch (err: any) {
      console.error("Failed to create all tickets:", err);
      toast.error(err?.response?.data?.message || "Failed to create some tickets");
    } finally {
      setIsSubmittingAll(false);
    }
  };

  if (isOptionSelected || isDismissed) {
    return null;
  }

  const isNeedsTarget =
    payload.action === "UPDATE_TICKET" &&
    payload.status === "NEEDS_INPUT";

  // If this is an update mutation and no tickets were resolved, do not render any draft card
  if (payload.action === "UPDATE_TICKET" && draftsList.length === 0 && !isNeedsTarget) {
    return null;
  }

  if (isNeedsTarget) {
    const rawOptions =
      payload.needs?.find((n) => n.field === "targetTicket")?.options ||
      payload.options ||
      [];

    return (
      <div className="my-2.5 flex flex-wrap items-center gap-1.5 animate-in fade-in-50">
        {rawOptions.map((opt: any, idx: number) => {
          const isSelected = selectedSpaceId === (opt.id ?? idx);
          const displayLabel = opt.label || opt.name;
          const isAllOption = displayLabel.toLowerCase().startsWith("all");

          return (
            <button
              key={opt.id ?? idx}
              type="button"
              disabled={selectedSpaceId !== null}
              onClick={() => {
                setIsOptionSelected(true);
                setSelectedSpaceId(opt.id ?? idx);
                onSelectOption?.("targetTicket", {
                  id: opt.id ?? idx,
                  name: opt.name || opt.actionText || displayLabel,
                });
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer shadow-2xs select-none ${
                isAllOption
                  ? "bg-primary text-white dark:text-black hover:opacity-90 active:scale-95 border border-primary/20 font-bold"
                  : "bg-muted text-foreground hover:bg-muted/80 active:scale-95 border border-border"
              } ${
                isSelected ? "opacity-85 ring-2 ring-primary ring-offset-1" : ""
              } ${selectedSpaceId !== null && !isSelected ? "opacity-30 cursor-not-allowed" : ""}`}
            >
              {isSelected && (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              )}
              <span>{displayLabel}</span>
            </button>
          );
        })}

        <button
          type="button"
          disabled={selectedSpaceId !== null}
          onClick={handleDismissAll}
          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-transparent text-slate-700 dark:text-slate-300 border border-dashed border-slate-700 dark:border-slate-300 hover:text-slate-900 hover:dark:text-white hover:border-slate-900 hover:dark:border-white hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-all duration-150 cursor-pointer select-none ${
            selectedSpaceId !== null ? "opacity-30 cursor-not-allowed" : ""
          }`}
        >
          <span>Dismiss</span>
        </button>
      </div>
    );
  }

  const hasSpaceNeed = payload.needs?.some((n) => n.field === "ticketSpace");
  const isNeedsSpace =
    payload.action !== "UPDATE_TICKET" &&
    (hasSpaceNeed || (!effectiveSpaceId && draftsList.some((d) => Boolean(d.name))));

  // When a space is required, present the space selection badges
  if (isNeedsSpace) {
    const rawOptions =
      payload.needs?.find((n) => n.field === "ticketSpace")?.options ||
      availableSpaces;
    const spaceOptions = Array.from(
      new Map(rawOptions.map((s) => [s.id, s])).values()
    );

    return (
      <div className="my-2.5 flex flex-wrap items-center gap-1.5 animate-in fade-in-50">
        {spaceOptions.map((space) => {
          const isSelected = selectedSpaceId === space.id;
          return (
            <button
              key={space.id}
              type="button"
              disabled={selectedSpaceId !== null}
              onClick={() => handleSpaceSelect(space.id, space.name)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer shadow-2xs select-none ${
                isSelected
                  ? "bg-primary text-white dark:text-black opacity-85"
                  : selectedSpaceId !== null
                  ? "opacity-30 cursor-not-allowed bg-primary/40 text-white/70 dark:text-black/70"
                  : "bg-primary text-white dark:text-black hover:opacity-90 active:scale-95"
              }`}
            >
              {isSelected && (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              )}
              <span>{space.name}</span>
            </button>
          );
        })}

        <button
          type="button"
          disabled={selectedSpaceId !== null}
          onClick={handleDismissAll}
          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-transparent text-slate-700 dark:text-slate-300 border border-dashed border-slate-700 dark:border-slate-300 hover:text-slate-900 hover:dark:text-white hover:border-slate-900 hover:dark:border-white hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-all duration-150 cursor-pointer select-none ${
            selectedSpaceId !== null ? "opacity-30 cursor-not-allowed" : ""
          }`}
        >
          <span>Dismiss</span>
        </button>
      </div>
    );
  }

  if (visibleDrafts.length === 0) {
    return null;
  }

  // Render top toolbar with Grid/Table view toggle matching ticket page
  const renderToolbar = () => (
    <div className="flex items-center justify-start pb-0">
      {/* View Toggle matching ticket page */}
      <div className="flex gap-1 border border-border bg-background rounded-sm shrink-0 items-center h-7">
        <Button
          type="button"
          size="sm"
          variant={effectiveViewMode === "card" ? "default" : "ghost"}
          className={`h-full text-xs shadow-none cursor-pointer ${effectiveViewMode === "card" ? "px-2.5 dark:text-black" : "px-2"}`}
          onClick={() => setCustomViewMode("card")}
          title="Switch to Grid View"
        >
          <LayoutGrid className={`w-3.5 h-3.5 ${effectiveViewMode === "card" ? "mr-1" : ""}`} />
          {effectiveViewMode === "card" && "Grid"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={effectiveViewMode === "table" ? "default" : "ghost"}
          className={`h-full text-xs shadow-none cursor-pointer ${effectiveViewMode === "table" ? "px-2.5 dark:text-black" : "px-2"}`}
          onClick={() => setCustomViewMode("table")}
          title="Switch to Table View"
        >
          <TableProperties className={`w-3.5 h-3.5 ${effectiveViewMode === "table" ? "mr-1" : ""}`} />
          {effectiveViewMode === "table" && "Table"}
        </Button>
      </div>
    </div>
  );

  // Render bulk action footer card
  const renderBulkActionCard = () => {
    const createdCount = visibleDrafts.length - uncreatedCount;
    return (
      <div className="flex flex-col @[560px]:flex-row @[560px]:items-center copilot-bulk-action-card justify-between gap-3 bg-muted/20 px-4 py-3 rounded-xl border border-border">
        <div className="text-sm flex items-center gap-1.5">
          {uncreatedCount === 0 ? (
            <span className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> All {visibleDrafts.length} tickets {isUpdateAction ? "updated" : "created"} successfully
            </span>
          ) : createdCount > 0 ? (
            <span>
              <strong>{createdCount}</strong> {createdCount === 1 ? "ticket is saved" : "tickets are saved"}. <strong>{uncreatedCount}</strong> {uncreatedCount === 1 ? (isUpdateAction ? "is ready to update" : "is ready to create") : (isUpdateAction ? "are ready to update" : "are ready to create")}. Would you like to {isUpdateAction ? "update" : "create"} {uncreatedCount === 1 ? "it" : "them all"}?
            </span>
          ) : (
            <span>
              There are <strong>{visibleDrafts.length}</strong> ticket {isUpdateAction ? "updates" : "drafts"} ready. Would you like to {isUpdateAction ? "update" : "create"} them all?
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start @[560px]:self-auto">
          {uncreatedCount > 0 && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmittingAll}
                onClick={handleDismissAll}
                className="h-8 gap-1.5 text-xs font-medium border-dashed border-border hover:border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Dismiss All</span>
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={isSubmittingAll}
                onClick={handleCreateAll}
                className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
              >
                {isSubmittingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isUpdateAction ? "Updating" : "Saving"} ({uncreatedCount})...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isUpdateAction ? "Update All" : "Save All"} ({uncreatedCount})</span>
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  // Table View mode (for single or multiple drafts)
  if (effectiveViewMode === "table") {
    return (
      <div className="@container w-full my-3 space-y-2" style={{ containerType: "inline-size" }}>
        {renderToolbar()}
        <TicketDraftTableView
          visibleDrafts={visibleDrafts}
          spaceConfigs={spaceConfigs}
          spaceMembers={spaceMembers}
          spacePrefix={spacePrefix}
          spaceData={spaceData}
          warnings={warnings}
          createdTicketsMap={createdTicketsMap}
          isSubmittingAll={isSubmittingAll}
          isUpdateAction={isUpdateAction}
          setCreatedTicketsMap={setCreatedTicketsMap}
          setEditedDraftsMap={setEditedDraftsMap}
          onUpdateDraft={onUpdateDraft}
          handleDismissOne={handleDismissOne}
        />
        {visibleDrafts.length > 1 && (
          <div className="pt-1">
            {renderBulkActionCard()}
          </div>
        )}
      </div>
    );
  }

  // Card / Grid View mode
  if (visibleDrafts.length > 1) {
    return (
      <div className="@container w-full my-3 space-y-2" style={{ containerType: "inline-size" }}>
        {renderToolbar()}
        {/* Responsive grid based on panel container width: max 3 cards in a row */}
        <div className="grid grid-cols-1 @[520px]:grid-cols-2 @[800px]:grid-cols-3 copilot-card-grid gap-3.5 w-full">
          {visibleDrafts.map(({ draft: draftItem, index }) => {
            // Determine relevant warnings for this specific card
            const cardWarnings = [
              ...(draftItem.assigneeWarning ? [draftItem.assigneeWarning] : []),
              ...((draftItem as any).warnings || (
                warnings.filter((w) => {
                  const lower = w.toLowerCase();
                  if (lower.includes('matching "me"')) return false;
                  if (lower.includes('no team member matching') || lower.includes('multiple team members found matching')) {
                    const target = (draftItem.requestedAssigneeName || draftItem.assigneeName)?.toLowerCase().trim();
                    return target ? lower.includes(`"${target}"`) : false;
                  }
                  return index === 0;
                })
              ))
            ];

            return (
              <SingleTicketDraftItem
                key={index}
                initialDraft={draftItem}
                spaceConfigs={spaceConfigs}
                spaceMembers={spaceMembers}
                spacePrefix={spacePrefix}
                spaceData={spaceData}
                warnings={cardWarnings}
                createdTicketProp={createdTicketsMap[index]}
                isSubmittingProp={isSubmittingAll}
                onCreated={(created) => {
                  setCreatedTicketsMap((prev) => ({ ...prev, [index]: created }));
                }}
                onUpdateDraft={(updated) => {
                  setEditedDraftsMap((prev) => ({ ...prev, [index]: updated }));
                  onUpdateDraft?.(updated);
                }}
                onDismiss={() => handleDismissOne(index)}
                isUpdateAction={isUpdateAction}
              />
            );
          })}
        </div>
        <div className="pt-1">
          {renderBulkActionCard()}
        </div>
      </div>
    );
  }

  // Single ticket card view
  const singleItem = visibleDrafts[0];
  if (!singleItem) {
    return null;
  }
  return (
    <div className="@container w-full max-w-[560px] my-3 space-y-2" style={{ containerType: "inline-size" }}>
      {renderToolbar()}
      <SingleTicketDraftItem
        initialDraft={singleItem.draft}
        spaceConfigs={spaceConfigs}
        spaceMembers={spaceMembers}
        spacePrefix={spacePrefix}
        spaceData={spaceData}
        warnings={[...(singleItem.draft.assigneeWarning ? [singleItem.draft.assigneeWarning] : []), ...warnings]}
        createdTicketProp={createdTicketsMap[singleItem.index]}
        isSubmittingProp={isSubmittingAll}
        onCreated={(created) => {
          setCreatedTicketsMap((prev) => ({ ...prev, [singleItem.index]: created }));
        }}
        onUpdateDraft={(updated) => {
          setEditedDraftsMap((prev) => ({ ...prev, [singleItem.index]: updated }));
          onUpdateDraft?.(updated);
        }}
        onDismiss={() => handleDismissOne(singleItem.index)}
        isUpdateAction={isUpdateAction}
      />
    </div>
  );
}
