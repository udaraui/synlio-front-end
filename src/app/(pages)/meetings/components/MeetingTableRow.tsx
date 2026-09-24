"use client";
import React, { useState } from "react";
import {
  Meeting,
  MeetingProvider,
  deleteInternalMeeting,
} from "@/services/common/meetings-integration.service";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth.context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NewInternalMeetingDialog } from "./NewInternalMeetingDialog";
import {
  Clock,
  ExternalLink,
  Pencil,
  Trash,
  Loader2,
  ArrowRight,
  Users,
  Video,
  MonitorPlay,
  Hash,
  Handshake,
} from "lucide-react";

const PROVIDER_META: Record<
  MeetingProvider,
  { label: string; color: string; textColor: string; icon: React.ElementType }
> = {
  teams: { label: "Teams", color: "#6264A7", textColor: "text-[#6264A7]", icon: Users },
  zoom: { label: "Zoom", color: "#2D8CFF", textColor: "text-[#2D8CFF]", icon: Video },
  google_meet: { label: "Google", color: "#00A783", textColor: "text-[#00A783]", icon: MonitorPlay },
  slack: { label: "Slack", color: "#4A154B", textColor: "text-[#4A154B]", icon: Hash },
  internal: { label: "Internal", color: "#8b5cf6", textColor: "text-violet-500", icon: Handshake },
};

const STATUS_META = {
  scheduled: {
    dotClass: "bg-blue-500",
    label: "Scheduled",
  },
  ongoing: {
    dotClass: "bg-emerald-500 animate-pulse",
    label: "Live",
  },
  ended: {
    dotClass: "bg-muted-foreground",
    label: "Ended",
  },
  cancelled: {
    dotClass: "bg-red-500",
    label: "Cancelled",
  },
};

function formatDuration(minutes: number | null): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatMeetingDateTime(startStr: string, endStr: string | null): React.ReactNode {
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : null;

  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  const month = start.toLocaleString("default", { month: "short" });
  const day = start.getDate();
  const startTime = start.toLocaleTimeString("en-US", timeOpts);
  const endTime = end ? end.toLocaleTimeString("en-US", timeOpts) : null;

  return endTime ? (
    <span className="flex items-center gap-1">
      {month} {day}, {startTime} <ArrowRight className="w-4 h-4" /> {endTime}
    </span>
  ) : (
    <span>{month} {day}, {startTime}</span>
  );
}

import {
  TableRow,
  TableCell,
} from "@/components/ui/table";

interface MeetingTableRowProps {
  meeting: Meeting;
  /** Called after the meeting is edited or deleted so the list can refresh. */
  onChanged?: () => void;
  showActionsColumn?: boolean;
}

export function hasMeetingAction(meeting: Meeting, userId?: number | string | null): boolean {
  const effectiveStatus = (() => {
    if (meeting.provider !== "internal") return meeting.status;
    const now = new Date();
    const start = new Date(meeting.scheduledStartTime);
    const end = meeting.scheduledEndTime ? new Date(meeting.scheduledEndTime) : null;
    if (end && now > end) return "ended";
    if (now >= start && (!end || now <= end)) return "ongoing";
    return "scheduled";
  })();

  const canJoin = Boolean(
    meeting.joinUrl &&
    effectiveStatus !== "ended" &&
    effectiveStatus !== "cancelled"
  );

  const canManage =
    meeting.provider === "internal" &&
    meeting.organizerId != null &&
    userId != null &&
    Number(meeting.organizerId) === Number(userId) &&
    effectiveStatus === "scheduled";

  return canJoin || canManage;
}

export const MeetingTableRow: React.FC<MeetingTableRowProps> = ({
  meeting,
  onChanged,
  showActionsColumn = false,
}) => {
  const provider = PROVIDER_META[meeting.provider];
  const ProviderIcon = provider?.icon;
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Internal meetings don't have an external sync source, so we compute their
  // status client-side to ensure it's always accurate regardless of what the DB stores.
  const effectiveStatus = (() => {
    if (meeting.provider !== 'internal') return meeting.status;
    const now = new Date();
    const start = new Date(meeting.scheduledStartTime);
    const end = meeting.scheduledEndTime ? new Date(meeting.scheduledEndTime) : null;
    if (end && now > end) return 'ended';
    if (now >= start && (!end || now <= end)) return 'ongoing';
    return 'scheduled';
  })();

  // Only manually created internal meetings are managed here, and only by the
  // person who created them, and only while still upcoming. Anything synced
  // from Teams / Google / Zoom / Slack has to be changed in that provider
  // instead, and a meeting that has started is a record of what happened —
  // it can no longer be edited or deleted.
  const canManage =
    meeting.provider === "internal" &&
    meeting.organizerId != null &&
    user?.id != null &&
    Number(meeting.organizerId) === Number(user.id) &&
    effectiveStatus === "scheduled";

  const canJoin = Boolean(
    meeting.joinUrl &&
    effectiveStatus !== "ended" &&
    effectiveStatus !== "cancelled"
  );

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteInternalMeeting(meeting.id);
      toast.success("Meeting deleted");
      setConfirmDeleteOpen(false);
      onChanged?.();
    } catch (err: any) {
      // The API rejects deletes on meetings that already started — surface that
      // reason rather than a generic failure message.
      const apiMessage = err?.response?.data?.message;
      toast.error(
        (typeof apiMessage === "string" && apiMessage) ||
        "Failed to delete the meeting. Please try again",
      );
    } finally {
      setDeleting(false);
    }
  };

  const statusMeta = STATUS_META[effectiveStatus] ?? STATUS_META['scheduled'];

  return (
    <>
      <TableRow className="group">
        <TableCell className="py-2 px-4 font-medium text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs border rounded-md shrink-0">
              {ProviderIcon && (
                <ProviderIcon
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: provider?.color }}
                />
              )}
              <span>{provider?.label ?? meeting.provider}</span>
            </div>
            <span className="truncate" title={meeting.title}>
              {meeting.title}
            </span>
          </div>
        </TableCell>

        <TableCell className="py-2 px-4">
          <span className="text-md whitespace-nowrap">
            {formatMeetingDateTime(meeting.scheduledStartTime, meeting.scheduledEndTime)}
          </span>
        </TableCell>

        <TableCell className="py-2 px-4">
          {meeting.durationMinutes != null ? (
            <div className="flex items-center gap-1 text-sm font-medium">
              <Clock className="h-3 w-3" />
              {formatDuration(meeting.durationMinutes)}
            </div>
          ) : (
            <span className="text-sm">-</span>
          )}
        </TableCell>

        <TableCell className="py-2 px-4">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs border rounded-md font-medium shrink-0">
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusMeta.dotClass)} />
            <span>{statusMeta.label}</span>
          </div>
        </TableCell>

        <TableCell className={cn("py-2 px-4", showActionsColumn ? "text-left" : "text-right")}>
          <div className={cn("flex items-center h-[28px]", showActionsColumn ? "justify-start" : "justify-end")}>
            <span className="text-sm truncate max-w-[200px]" title={meeting.organizerEmail || undefined}>
              {meeting.organizerEmail ? meeting.organizerEmail : "-"}
            </span>
          </div>
        </TableCell>

        {showActionsColumn && (
          <TableCell className="py-2 px-4 text-right">
            <div className="flex items-center justify-end gap-1 h-[28px]">
              <TooltipProvider delayDuration={0}>
                {canJoin && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-7 px-2 text-xs gap-1 shrink-0 hover:bg-muted"
                        asChild
                      >
                        <a href={meeting.joinUrl ?? undefined} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Join Meeting</TooltipContent>
                  </Tooltip>
                )}

                {canManage && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-7 px-2 text-xs gap-1 shrink-0 hover:bg-muted"
                        onClick={() => setEditOpen(true)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Edit Meeting</TooltipContent>
                  </Tooltip>
                )}

                {canManage && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-7 px-2 text-xs gap-1 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setConfirmDeleteOpen(true)}
                      >
                        <Trash className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Delete Meeting</TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>

              {!canJoin && !canManage && (
                <span className="text-xs text-muted-foreground mr-1">N/A</span>
              )}
            </div>
          </TableCell>
        )}
      </TableRow>

      {canManage && (
        <NewInternalMeetingDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          meeting={meeting}
          onCreated={onChanged}
        />
      )}

      {canManage && (
        <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this meeting?</AlertDialogTitle>
              <AlertDialogDescription>
                &ldquo;{meeting.title}&rdquo; will be removed for you and everyone
                invited. This can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                disabled={deleting}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};
