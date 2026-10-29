"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
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
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth.context";
import { Button } from "@/components/ui/button";
import { createTicket } from "@/services/ticket-management/ticket.service";
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
import Link from "next/link";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  InlineEditableTicketType,
  InlineEditableTicketName,
  InlineEditableStatus,
  InlineEditableSeverity,
  InlineEditableQueue,
  InlineEditableAssignee,
} from "@/app/(pages)/ticket-management/ticket/components/InlineEditableTicketComponents";

export interface TicketDraftData {
  name?: string;
  description?: string;
  ticketSpaceId?: number;
  ticketSpaceName?: string;
  ticketTypeId?: number;
  ticketTypeName?: string;
  severityId?: number;
  severityName?: string;
  statusId?: number;
  statusName?: string;
  assigneeId?: number;
  assigneeName?: string;
  queueId?: number;
  queueName?: string;
  ticketSlaId?: number;
  completionDate?: string;
  plannedEffort?: number;
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
    needs?: Array<{
      field: string;
      label: string;
      options: Array<{ id: number; name: string; prefix?: string }>;
    }>;
  };
  onUpdateDraft?: (updated: TicketDraftData) => void;
  onSelectOption?: (field: string, option: { id: number; name: string }) => void;
  onCancel?: () => void;
}

// Icon mapping helper for ticket types
const getIconComponent = (iconName: string | undefined): LucideIcon | null => {
  if (!iconName) return Zap;

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
  return iconMap[normalizedIcon] || iconMap[iconName.toLowerCase()] || Zap;
};

interface SpaceConfigs {
  types: Array<{ id: number; name: string; icon?: string; color?: string }>;
  severities: Array<{ id: number; name: string; color?: string }>;
  statuses: Array<{ id: number; name: string; color?: string; base?: string; sequence?: number }>;
  queues: Array<{ id: number; name: string }>;
  slas: Array<{ id: number; severityId?: number }>;
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
        const matchedSev = next.severityName
          ? severities.find(
              (s) =>
                s.name?.toLowerCase().includes(next.severityName?.toLowerCase() || "") ||
                (next.severityName && next.severityName.toLowerCase().includes(s.name?.toLowerCase()))
            )
          : null;
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

      // 6. Assignee (if "me" or "myself")
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
          next.assigneeName = `${myMember.userFirstName || myMember.firstName || ""} ${myMember.userLastName || myMember.lastName || ""}`.trim() || myMember.userEmail;
        }
      }

      return next;
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
        window.dispatchEvent(
          new CustomEvent("synlio:ticket-created", { detail: { ticket: result } })
        );
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
          icon: "zap",
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
    const matched = spaceMembers.find(
      (m) =>
        m.id === draft.assigneeId ||
        m.userId === draft.assigneeId ||
        `${m.userFirstName || m.firstName || ""} ${m.userLastName || m.lastName || ""}`.trim().toLowerCase() ===
          draft.assigneeName?.trim().toLowerCase()
    );
    if (matched) {
      return {
        id: matched.userId || matched.id,
        first_name: matched.userFirstName || matched.firstName || "",
        last_name: matched.userLastName || matched.lastName || "",
        profile_picture: matched.userProfilePicture || matched.profilePicture || null,
      };
    }
    if (draft.assigneeName) {
      const parts = draft.assigneeName.split(" ");
      return {
        id: draft.assigneeId || 0,
        first_name: parts[0] || "",
        last_name: parts.slice(1).join(" ") || "",
        profile_picture: null,
      };
    }
    return null;
  }, [draft.assigneeId, draft.assigneeName, spaceMembers, user]);

  const filteredWarnings = useMemo(() => {
    return (warnings || []).filter((w) => !w.toLowerCase().includes('matching "me"'));
  }, [warnings]);

  return (
    <div className="w-full group bg-card rounded-xl border border-border shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
      <div>
        {/* Section 1: Type Icon, Code/Draft Badge, and Status Tag */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/40 border-b border-dashed border-border">
          <div className="flex items-center gap-2 min-w-0">
            <InlineEditableTicketType
              ticketType={currentTicketType}
              ticketId={createdTicket?.id || 0}
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

            <span
              className="text-xs font-semibold tracking-wide text-primary select-none whitespace-nowrap"
              title={createdTicket?.code ? `Ticket ${createdTicket.code}` : "Ticket draft code"}
            >
              {createdTicket?.code || (spacePrefix ? `${spacePrefix}-?` : "DRAFT")}
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
        </div>

        {/* Warnings Banner if any */}
        {filteredWarnings.length > 0 && (
          <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {filteredWarnings.map((w, idx) => (
                <p key={idx}>{w}</p>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Name and Assignee Avatar */}
        <div className="p-3.5 sm:p-4 space-y-3">
          <h3 className="text-sm font-semibold leading-snug">
            <span className="inline-flex items-center gap-1.5 w-full">
              <InlineEditableTicketName
                name={draft.name || ""}
                onUpdate={async (name) => {
                  const updated = { ...draft, name };
                  setDraft(updated);
                  onUpdateDraft?.(updated);
                }}
                className="font-semibold text-foreground truncate text-[14px]"
              />
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
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">Description</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {draft.description || draft.name}
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              )}
            </span>
          </h3>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center">
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
                  };
                  setDraft(updated);
                  onUpdateDraft?.(updated);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Severity, Queue, and Actions (X and Save) */}
      <div className="px-3.5 py-2.5 bg-muted/30 border-t border-dashed border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
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
                title="Save ticket"
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
  const [dismissedIndexSet, setDismissedIndexSet] = useState<Set<number>>(new Set());
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [createdTicketsMap, setCreatedTicketsMap] = useState<Record<number, any>>({});
  const [editedDraftsMap, setEditedDraftsMap] = useState<Record<number, TicketDraftData>>({});

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
    return draftsList.find((d) => d.ticketSpaceId)?.ticketSpaceId || null;
  }, [selectedSpaceId, draftsList]);

  // Sync warnings from props
  useEffect(() => {
    setWarnings(payload.warnings || []);
    setSelectedSpaceId(null);
    setIsOptionSelected(false);
    setDismissedIndexSet(new Set());
    setCreatedTicketsMap({});
    setEditedDraftsMap({});
  }, [payload]);

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
          icon: t.icon || "zap",
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
    setIsOptionSelected(true);
    setSelectedSpaceId(spaceId);
    if (onSelectOption) {
      onSelectOption("ticketSpace", { id: spaceId, name: spaceName });
    }
  };

  const handleDismissAll = () => {
    setIsOptionSelected(true);
    onCancel?.();
  };

  const handleDismissOne = (index: number) => {
    const nextSet = new Set(dismissedIndexSet);
    nextSet.add(index);
    setDismissedIndexSet(nextSet);

    if (nextSet.size >= draftsList.length) {
      setIsOptionSelected(true);
      onCancel?.();
    }
  };

  // Filter visible drafts (excluding individually dismissed ones)
  const visibleDrafts = draftsList
    .map((d, index) => ({
      draft: {
        ...d,
        ...(editedDraftsMap[index] || {}),
        ticketSpaceId: (editedDraftsMap[index]?.ticketSpaceId) || d.ticketSpaceId || effectiveSpaceId || undefined,
      },
      index,
    }))
    .filter(({ index }) => !dismissedIndexSet.has(index));

  const uncreatedCount = visibleDrafts.filter(({ index }) => !createdTicketsMap[index]).length;

  const handleCreateAll = async () => {
    if (isSubmittingAll) return;
    setIsSubmittingAll(true);

    try {
      const uncreated = visibleDrafts.filter(({ index }) => !createdTicketsMap[index]);
      if (uncreated.length === 0) return;

      // Use Promise.all and send ticket array data one by one
      const creationPromises = uncreated.map(async ({ draft: item, index }) => {
        let finalAssigneeId = item.assigneeId;
        const isMe =
          item.assigneeName?.toLowerCase() === "me" ||
          item.assigneeName?.toLowerCase() === "myself";

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
            (m) =>
              Number(m.userId) === Number(finalAssigneeId) ||
              Number(m.id) === Number(finalAssigneeId)
          );
          if (matched) {
            finalAssigneeId = Number(matched.id);
          }
        }

        const createPayload: any = {
          name: (item.name || "").trim(),
          description: item.description || "",
          ticketSpaceId: item.ticketSpaceId || effectiveSpaceId,
          ticketTypeId: item.ticketTypeId,
          severityId: item.severityId,
          statusId: item.statusId,
          queueId: item.queueId,
          ticketSlaId: item.ticketSlaId,
          assigneeId: finalAssigneeId,
          completionDate: item.completionDate ? new Date(item.completionDate).toISOString() : undefined,
          plannedEffort: item.plannedEffort,
        };

        const result = await createTicket(createPayload);
        const ticketId = result?.ticketId || result?.id || 0;
        const code = result?.code || result?.prefixCode;

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("synlio:ticket-created", { detail: { ticket: result } })
          );
        }

        return {
          index,
          createdTicket: {
            id: ticketId,
            code,
            name: item.name,
            ticketSpaceId: item.ticketSpaceId || result?.ticketSpaceId,
          },
        };
      });

      const results = await Promise.all(creationPromises);

      setCreatedTicketsMap((prev) => {
        const next = { ...prev };
        results.forEach(({ index, createdTicket }) => {
          next[index] = createdTicket;
        });
        return next;
      });

      toast.success(
        results.length === 1
          ? "Ticket created successfully!"
          : `Successfully created all ${results.length} tickets!`
      );
    } catch (err: any) {
      console.error("Failed to create all tickets:", err);
      toast.error(err?.response?.data?.message || "Failed to create some tickets");
    } finally {
      setIsSubmittingAll(false);
    }
  };

  if (isOptionSelected) {
    return null;
  }

  const isNeedsSpace = payload.status === "NEEDS_INPUT" || !effectiveSpaceId;

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

  // If multiple tickets: render in 2-column responsive grid view with bulk action card below
  if (visibleDrafts.length > 1) {
    return (
      <div className="w-full my-3 space-y-3">
        {/* 2 cards in one row responsive grid with generous width */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {visibleDrafts.map(({ draft: draftItem, index }) => (
            <SingleTicketDraftItem
              key={index}
              initialDraft={draftItem}
              spaceConfigs={spaceConfigs}
              spaceMembers={spaceMembers}
              spacePrefix={spacePrefix}
              spaceData={spaceData}
              warnings={index === 0 ? warnings : []}
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
            />
          ))}
        </div>

        {/* Bulk Action Card below generated tickets (Matching bring all data card UI) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 px-4 py-3 rounded-xl border border-border">
          <div className="text-sm flex items-center gap-1.5">
            {uncreatedCount > 0 ? (
              <span>
                There are <strong>{visibleDrafts.length}</strong> ticket drafts ready. Would you like to create them all?
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> All {visibleDrafts.length} tickets created successfully
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {uncreatedCount > 0 && (
              <>
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
                      <span>Saving ({uncreatedCount})...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save all ({uncreatedCount})</span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmittingAll}
                  onClick={handleDismissAll}
                  className="h-8 gap-1.5 text-xs font-medium border-dashed text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Dismiss all</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Single ticket: dynamic width with comfortable max-width
  const singleItem = visibleDrafts[0];
  return (
    <div className="w-full max-w-[560px] my-3">
      <SingleTicketDraftItem
        initialDraft={singleItem.draft}
        spaceConfigs={spaceConfigs}
        spaceMembers={spaceMembers}
        spacePrefix={spacePrefix}
        spaceData={spaceData}
        warnings={warnings}
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
      />
    </div>
  );
}
