"use client";
import React, { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  Users, Video, Loader2, PackageOpen, AlertCircle, ChevronLeft, ChevronRight,
  Clock, Plus, Link as Link2, Unlink, Ban, RotateCcw, PlugZap, CalendarPlus, Info
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ParentLevelsHoverCard } from "@/components/common/ParentLevelsHoverCard";
import {
  getMeetings,
  getConnectionStatus,
  getAuthUrl,
  disconnectProvider,
  updateMeetingActualDuration,
  setMeetingActionState,
  Meeting,
  MeetingProvider,
  ProviderConnectionStatus,
  syncMeetings,
} from "@/services/common/meetings-integration.service";
import { syncPulseRecord } from "@/services/pulse/pulse.service";
import { NewInternalMeetingDialog } from "../../meetings/components/NewInternalMeetingDialog";
import { useAuth } from "@/contexts/auth.context";

export interface MeetingTimeHandle {
  syncMeetingsData: () => Promise<void>;
}

const ITEMS_PER_PAGE = 5;

const PROVIDER_META: Record<MeetingProvider, { label: string; color: string }> = {
  teams: { label: 'Teams', color: '#6264A7' },
  zoom: { label: 'Zoom', color: '#2D8CFF' },
  google_meet: { label: 'Google', color: '#00A783' },
  slack: { label: 'Slack', color: '#4A154B' },
  internal: { label: 'Internal', color: '#8b5cf6' },
};

const ProviderBadge = ({ provider }: { provider: MeetingProvider }) => {
  const info = PROVIDER_META[provider] ?? { label: provider, color: '#b89494' };
  return (
    <div className="inline-flex items-center gap-1.5 px-2 text-[11px] border rounded-md font-medium shrink-0">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: info.color }} />
      {info.label}
    </div>
  );
};

/** Format minutes as "Xh Ym" or "Ym" */
const formatDuration = (minutes: number | null | undefined): string => {
  if (minutes == null || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const formatMeetingTime = (start: Date, end: Date) => {
  const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  const startTime = start.toLocaleTimeString('en-US', options).toLowerCase();
  const endTime = end.toLocaleTimeString('en-US', options).toLowerCase();
  const month = start.toLocaleString('default', { month: 'short' });
  const day = start.getDate();
  return `${month} ${day} from ${startTime} to ${endTime}`;
};

// ─── Edit Duration Popover ──────────────────────────────────────────────────

interface EditDurationPopoverProps {
  meeting: Meeting;
  onSaved: (updated: Meeting) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isDraft?: boolean;
  draftId?: number | null;
}

const EditDurationPopover: React.FC<EditDurationPopoverProps> = ({ meeting, onSaved, isOpen, onOpenChange, isDraft, draftId }) => {
  const scheduledMinutes = meeting.durationMinutes ?? 0;
  const existingActual = meeting.actualDurationMinutes;

  // Initialise with existing actual or scheduled
  const initMinutes = existingActual ?? scheduledMinutes;

  // For standard "Effort" input like in SynlioActivity
  const [effort, setEffort] = useState(initMinutes > 0 ? (initMinutes / 60).toString() : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const m = (meeting.actualDurationMinutes ?? meeting.durationMinutes ?? 0);
      setEffort(m > 0 ? (m / 60).toString() : "");
      setError(null);
    }
  }, [isOpen, meeting]);

  const handleSave = async () => {
    const val = parseFloat(effort || "0");
    if (isNaN(val) || val < 0) {
      setError('Please enter a valid effort.');
      return;
    }
    const totalMinutes = Math.round(val * 60);
    if (totalMinutes > 1440) {
      setError('Duration cannot exceed 24 hours.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const updated = await updateMeetingActualDuration(meeting.id, { actualDurationMinutes: totalMinutes });

      if (isDraft && draftId) {
        const pulseSummary = JSON.stringify({
          title: updated.title,
          provider: updated.provider,
          scheduledStartTime: updated.scheduledStartTime,
          scheduledEndTime: updated.scheduledEndTime,
          durationMinutes: updated.durationMinutes,
          actualDurationMinutes: updated.actualDurationMinutes,
          attendees: updated.attendees || []
        });
        await syncPulseRecord(draftId, {
          postId: updated.id,
          postCode: updated.provider,
          postName: updated.title,
          postType: 'Meeting',
          pulseType: 'Meeting Time',
          resourceType: 'ASSIGNEE',
          pulseSummary: pulseSummary
        }).catch(console.error);
      }

      onSaved(updated);
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      setSaving(true);
      setError(null);
      const updated = await updateMeetingActualDuration(meeting.id, { actualDurationMinutes: 0 });
      onSaved(updated);
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to clear.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {((meeting.actualDurationMinutes ?? meeting.durationMinutes ?? 0) > 0) ? (
          <Button
            variant="outline"
            size="xs"
            className="h-6 text-xs gap-1 border-dashed border-primary/50 text-primary hover:text-primary hover:bg-primary/5"
            title="Edit Time"
          >
            <Clock className="h-3.5 w-3.5 mr-0.5" /> {Number((meeting.actualDurationMinutes ?? meeting.durationMinutes ?? 0) / 60).toFixed(2)}h
          </Button>
        ) : (
          <Button
            variant="outline"
            size="xs"
            className="h-6 text-xs gap-1"
            title="Log Time"
          >
            <Clock className="h-3 w-3" />
            Log Time
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" onClick={(e) => e.stopPropagation()} align="end">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Scheduled For</Label>
              <Input className="h-8 text-xs bg-muted/50" value={formatDuration(scheduledMinutes)} disabled />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Actual Time (Hours)</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                min={0}
                step="any"
                value={effort}
                onChange={(e) => setEffort(e.target.value)}
                placeholder="e.g. 1.5"
              />
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            {/* <Button variant="outline" size="sm" className="flex-1 h-8" onClick={handleClear} disabled={saving || existingActual == null}>Reset</Button> */}
            <Button size="sm" className="flex-1 h-8" onClick={handleSave} disabled={saving || !effort || parseFloat(effort) < 0}>
              {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ─── Connect Providers Dialog ─────────────────────────────────────────────────

interface ConnectProvidersDialogProps {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}

const ConnectProvidersDialog: React.FC<ConnectProvidersDialogProps> = ({ open, onClose, onConnected }) => {
  const [statuses, setStatuses] = useState<ProviderConnectionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<MeetingProvider | null>(null);
  const [disconnecting, setDisconnecting] = useState<MeetingProvider | null>(null);

  const loadStatuses = useCallback(async () => {
    try {
      setLoading(true);
      const s = await getConnectionStatus();
      setStatuses(s);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadStatuses();
  }, [open, loadStatuses]);

  const handleConnect = async (provider: MeetingProvider) => {
    try {
      setConnecting(provider);
      const { url } = await getAuthUrl(provider);
      window.location.href = url;
    } catch {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (provider: MeetingProvider) => {
    try {
      setDisconnecting(provider);
      await disconnectProvider(provider);
      await loadStatuses();
      onConnected();
    } catch {
    } finally {
      setDisconnecting(null);
    }
  };

  const providers: MeetingProvider[] = ['google_meet', 'zoom', 'teams', 'slack'];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            {/* <PlugZap className="h-4 w-4 text-purple-500" /> */}
            Connect Intergration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-1">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            providers.map((provider) => {
              const meta = PROVIDER_META[provider];
              const status = statuses.find((s) => s.provider === provider);
              const isConnected = status?.status === 'connected';
              const isError = status?.status === 'error';

              return (
                <div key={provider} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                    <span className="text-sm font-medium">{meta.label}</span>
                    {isConnected && (
                      <Badge variant="outline" className="text-[10px] text-green-600 border-green-300 bg-green-50 dark:bg-green-950/20 px-1.5 py-0">
                        Connected
                      </Badge>
                    )}
                    {isError && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0">
                        Error
                      </Badge>
                    )}
                  </div>
                  {isConnected ? (
                    <Button variant="ghost" size="xs" className="text-xs text-muted-foreground h-6" onClick={() => handleDisconnect(provider)} disabled={disconnecting === provider}>
                      {disconnecting === provider ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Disconnect'}
                    </Button>
                  ) : (
                    <Button variant="outline" size="xs" className="text-xs h-6 gap-1" onClick={() => handleConnect(provider)} disabled={connecting === provider}>
                      {connecting === provider ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Connect
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface MeetingTimeProps {
  startDate?: string;
  endDate?: string;
  isDraft?: boolean;
  draftId?: number | null;
  data?: any;
  loading?: boolean;
  error?: any;
  onActionComplete?: () => void;
}

const MeetingTime = forwardRef<MeetingTimeHandle, MeetingTimeProps>(({ startDate, endDate, isDraft, draftId, data, loading: parentLoading, error: parentError, onActionComplete }, ref) => {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(0);
  const [showProviders, setShowProviders] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [ignoringId, setIgnoringId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isInternalMeetingDialogOpen, setIsInternalMeetingDialogOpen] = useState(false);
  /** The manually created internal meeting currently open in the edit dialog. */
  const [internalMeetingToEdit, setInternalMeetingToEdit] = useState<Meeting | null>(null);
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    // Skip until the parent page has resolved a real date range — otherwise
    // this fires once with undefined dates and again moments later with real
    // ones, doubling every request below.
    if (!startDate || !endDate) {
      if (!parentLoading) setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    try {
      const [meetingsResult, connectionResult] = await Promise.allSettled([
        getMeetings({ startDate, endDate, limit: 100, page: 1, includeIgnored: true }),
        getConnectionStatus(),
      ]);
      if (!cancelled) {
        if (meetingsResult.status === 'fulfilled') setMeetings(meetingsResult.value.data);
        if (connectionResult.status === 'fulfilled') {
          const latestSync = connectionResult.value
            .map((c) => (c.lastSyncAt ? new Date(c.lastSyncAt).getTime() : 0))
            .reduce((a, b) => Math.max(a, b), 0);
          if (latestSync > 0) setLastSyncTime(new Date(latestSync));
        }
        // Only set error if meetings themselves failed
        if (meetingsResult.status === 'rejected') setError(meetingsResult.reason);
      }
    } catch (err: any) {
      if (!cancelled) setError(err);
    } finally {
      if (!cancelled) setLoading(false);
    }

    return () => { cancelled = true; };
  }, [startDate, endDate]);

  useEffect(() => {
    const cleanup = fetchData();
    return () => { cleanup.then((fn) => fn?.()); };
  }, [fetchData, parentLoading]);

  const handleIgnore = async (meeting: Meeting) => {
    const isIgnored = meeting.actionState === 'ignored';
    const newState = isIgnored ? 'none' : 'ignored';
    try {
      setIgnoringId(meeting.id);
      await setMeetingActionState(meeting.id, { state: newState });
      await fetchData();
      onActionComplete?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update meeting");
    } finally {
      setIgnoringId(null);
    }
  };

  const handleEditSaved = async (updatedMeeting: Meeting) => {
    await fetchData();
    onActionComplete?.();
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncMeetings();
      // toast.success("Meetings synced");
      await fetchData();
      setLastSyncTime(new Date());
      onActionComplete?.();
    } catch {
      toast.error("Failed to sync meetings");
    } finally {
      setSyncing(false);
    }
  };

  // Expose sync handle so parent (pulse page) can call it from bottom Sync button
  useImperativeHandle(ref, () => ({
    syncMeetingsData: handleSync,
  }));

  const formatLastSync = (d: Date | null): string => {
    if (!d) return '';
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).replace(/AM|PM/g, match => match.toLowerCase());
  };

  const totalPages = Math.ceil(meetings.length / ITEMS_PER_PAGE);
  const visibleMeetings = meetings.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  return (
    <>
      <div className="border rounded-lg border-l-2 border-l-purple-500 overflow-hidden bg-card text-card-foreground flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Video className="h-4 w-4 text-purple-500 flex-shrink-0" />
            Meeting Time
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs max-w-[300px] leading-relaxed">
                  Here's the time spent outside of Synlio. Your connected calendar meetings (Teams, Google Meet, Zoom) will appear here.
                  <div className="mt-1 text-foreground">You can,</div>
                  <ul className="mt-1 space-y-2">
                    <li className="flex items-center gap-2">
                      <PlugZap className="h-3.5 w-3.5 text-primary" />
                      <strong className="font-bold text-foreground">Connect your calendars</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <Plus className="h-3.5 w-3.5 text-primary" />
                      <strong className="font-bold text-foreground">Add meeting</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <strong className="font-bold text-foreground">Change meeting duration</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <Ban className="h-3.5 w-3.5 text-primary" />
                      <strong className="font-bold text-foreground">Ignore / Restore meetings</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <Link2 className="h-3.5 w-3.5 text-primary" />
                      <strong className="font-bold text-foreground">Link / Unlink to tasks</strong>
                    </li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
          <div className="flex items-center gap-2 mx-4 mr-auto">
            <Button
              variant="outline"
              size="xs"
              className="text-xs h-6 px-2 font-medium cursor-pointer gap-1.5 border-dashed"
              onClick={() => setIsInternalMeetingDialogOpen(true)}
            >
              <Plus className="w-3 h-3" />
              Add Meeting
            </Button>
            <Button
              variant="link"
              size="xs"
              className="text-xs h-6 px-2 font-medium cursor-pointer gap-1.5"
              onClick={() => router.push('/meetings')}
            >
              <PlugZap className="w-3 h-3" />
              Connect Integration
            </Button>
          </div>
          <span className="text-muted-foreground text-xs flex items-center gap-1">
            <span className="pr-1 hidden sm:inline">
              {/* Calendar time outside Synlio.{lastSyncTime ? ` Last synced ${formatLastSync(lastSyncTime)}` : ' Not synced yet'} */}
              {lastSyncTime ? `Last synced ${formatLastSync(lastSyncTime)}` : 'Not synced yet'}
            </span>
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-col">
          {/* Skeleton */}
          {(loading || parentLoading) && Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5 px-4 py-3 border-b last:border-b-0 animate-pulse">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded-sm" />
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-3/4 rounded mt-1" />
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <Skeleton className="h-5 w-12 rounded" />
                  <Skeleton className="h-3 w-16 rounded mt-1" />
                </div>
              </div>
            </div>
          ))}

          {/* Error */}
          {!(loading || parentLoading) && error && (
            <div className="flex flex-col items-center justify-center gap-2 text-center py-8 px-4">
              <AlertCircle className="h-8 w-8 text-destructive/50" />
              <p className="text-sm font-medium text-destructive">Failed to load meetings</p>
              <p className="text-xs text-muted-foreground">Please try refreshing the page.</p>
            </div>
          )}

          {/* Empty */}
          {!(loading || parentLoading) && !error && meetings.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 text-center py-8 px-4">
              <PackageOpen className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No recent meetings</p>
              <p className="text-xs text-muted-foreground/60">Your recent meetings will appear here.</p>
            </div>
          )}

          {/* Meeting rows */}
          {!(loading || parentLoading) && !error && visibleMeetings.map((meeting) => {
            const isIgnored = meeting.actionState === 'ignored';
            const effectiveStart = new Date(meeting.effectiveStartTime ?? meeting.scheduledStartTime);
            const effectiveEnd = meeting.effectiveEndTime
              ? new Date(meeting.effectiveEndTime)
              : meeting.scheduledEndTime
                ? new Date(meeting.scheduledEndTime)
                : null;
            const effectiveDuration = meeting.effectiveDurationMinutes ?? meeting.durationMinutes;
            const hasActualDuration = meeting.actualDurationMinutes != null;

            // Only meetings created manually in Synlio can be edited, only by
            // the person who created them, and only while still upcoming.
            // Provider-synced meetings must be changed in that provider.
            const canEditInternal =
              meeting.provider === 'internal' &&
              meeting.organizerId != null &&
              user?.id != null &&
              Number(meeting.organizerId) === Number(user.id) &&
              new Date() < new Date(meeting.scheduledStartTime);

            return (
              <div
                key={`${meeting.provider}-${meeting.externalId}`}
                className={`group flex items-center gap-3 px-4 py-3 transition-colors border-b last:border-b-0 dark:bg-card ${isIgnored
                  ? 'bg-muted/30'
                  : 'hover:bg-muted/50'
                  }`}
              >
                {/* Left: meeting info */}
                <div className={cn("flex-grow flex flex-col gap-1 min-w-0 transition-opacity", isIgnored && "opacity-50")}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium line-clamp-1 ${isIgnored ? 'line-through text-muted-foreground' : ''}`}>
                      {meeting.title}
                    </span>
                    <ProviderBadge provider={meeting.provider} />
                    {isIgnored && (
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 text-[11px] border rounded-md font-medium shrink-0"
                      )}>
                        <Ban className="w-3 h-3 text-red-500" />
                        Ignored
                      </div>
                    )}
                    {hasActualDuration && !isIgnored && (
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 text-[11px] border rounded-md font-medium shrink-0"
                      )}>
                        <Clock className="w-3 h-3 text-blue-500" />
                        Duration Changed
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    {meeting.linkedTaskId && meeting.linkedTaskCode && (
                      <>
                        <ParentLevelsHoverCard
                          id={meeting.linkedTaskId}
                          postType="Task"
                          code={meeting.linkedTaskCode}
                          className="text-xs"
                        />
                        <span>·</span>
                      </>
                    )}
                    {effectiveEnd && (
                      <>
                        <span className="whitespace-nowrap">{formatMeetingTime(effectiveStart, effectiveEnd)}</span>
                      </>
                    )}

                    {meeting.attendees?.length > 0 && (
                      <>
                        <span>·</span>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{meeting.attendees.length}</span>
                        </div>
                      </>
                    )}

                    {/* Edit — manually created internal meetings only, revealed on row hover */}
                    {canEditInternal && !isIgnored && (
                      <button
                        type="button"
                        className="text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                        title="Edit this meeting"
                        onClick={() => setInternalMeetingToEdit(meeting)}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Duration column removed - now rendered in action button */}

                {/* Right: action buttons — always visible */}
                <div className="flex items-center justify-end gap-2 shrink-0 ml-2 w-[270px]">
                  {/* Edit — disabled when ignored */}
                  {isIgnored ? (
                    ((meeting.actualDurationMinutes ?? meeting.durationMinutes ?? 0) > 0) ? (
                      <Button
                        variant="outline"
                        size="xs"
                        className="h-6 text-xs gap-1 border-dashed border-primary/50 text-primary opacity-50 cursor-not-allowed"
                        disabled={true}
                        title="Un-ignore this meeting first"
                      >
                        <Clock className="h-3.5 w-3.5 mr-0.5" /> {Number((meeting.actualDurationMinutes ?? meeting.durationMinutes ?? 0) / 60).toFixed(2)}h
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="xs"
                        className="h-6 text-xs gap-1 opacity-50 cursor-not-allowed"
                        disabled={true}
                        title="Un-ignore this meeting first"
                      >
                        <Clock className="h-3 w-3" />
                        Log Time
                      </Button>
                    )
                  ) : (
                    <EditDurationPopover
                      meeting={meeting}
                      isOpen={editingMeeting?.id === meeting.id}
                      onOpenChange={(isOpen) => setEditingMeeting(isOpen ? meeting : null)}
                      onSaved={handleEditSaved}
                      isDraft={isDraft}
                      draftId={draftId}
                    />
                  )}

                  {/* Link / Unlink Task */}
                  {meeting.actionState === 'linked_to_task' ? (
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button
                              variant="outline"
                              size="xs"
                              className={cn("text-xs h-6 gap-1 transition-colors", isIgnored ? "opacity-50" : "hover:bg-muted dark:hover:bg-gray-700/50")}
                              disabled={isIgnored}
                              onClick={async () => {
                                try {
                                  await setMeetingActionState(meeting.id, { state: 'none' });
                                  await fetchData();
                                  onActionComplete?.();
                                  toast.success("Task unlinked");
                                } catch (err: any) {
                                  toast.error(err?.response?.data?.message || "Failed to unlink task");
                                }
                              }}
                            >
                              <Unlink className="h-3 w-3" />
                              Unlink Task
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          Unlink {(meeting as any).linkedTaskName || meeting.linkedTaskCode || 'Task'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Button
                      variant="outline"
                      size="xs"
                      className={cn("text-xs h-6 gap-1 transition-colors", isIgnored ? "opacity-50" : "hover:bg-muted dark:hover:bg-gray-700/50")}
                      disabled={isIgnored}
                      title={isIgnored ? 'Un-ignore this meeting first' : 'Link this meeting to a task'}
                      onClick={() => router.push(`/task-management/task-space?meetingId=${meeting.id}&meetingName=${encodeURIComponent(meeting.title)}`)}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Link Task
                    </Button>
                  )}

                  {/* Ignore / Un-ignore toggle */}
                  <Button
                    variant="outline"
                    size="xs"
                    className={cn(
                      "text-xs h-6 gap-1 transition-colors",
                      isIgnored
                        ? "hover:bg-muted dark:hover:bg-gray-700/50"
                        : "text-red-500 dark:text-red-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                    )}
                    onClick={() => handleIgnore(meeting)}
                    disabled={ignoringId === meeting.id}
                    title={isIgnored ? 'Restore this meeting' : 'Ignore this meeting'}
                  >
                    {ignoringId === meeting.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : isIgnored ? (
                      <RotateCcw className="h-3 w-3" />
                    ) : (
                      <Ban className="h-3 w-3" />
                    )}
                    {isIgnored ? 'Restore' : 'Ignore'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {totalPages > 0 && (
          <div className={`flex items-center py-1.5 px-4 border-t bg-muted/30 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex-1" />

            {totalPages > 1 ? (
              <div className="flex items-center justify-center gap-1">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={loading || page === 0} className="p-1 disabled:opacity-30 disabled:cursor-not-allowed" title="Previous">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button key={i} onClick={() => setPage(i)} className={`h-1.5 rounded-full transition-all ${i === page ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/60"}`} />
                  ))}
                </div>
                <button onClick={() => setPage((p) => Math.max(0, Math.min(totalPages - 1, p + 1)))} disabled={loading || page >= totalPages - 1} className="p-1 disabled:opacity-30 disabled:cursor-not-allowed" title="Next">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex-1" />
            )}
            <div className="flex-1 flex justify-end">
              <span className="text-xs text-muted-foreground tabular-nums font-medium">
                {!loading && !error && totalPages > 1 && `Showing ${page * ITEMS_PER_PAGE + 1} - ${Math.min((page + 1) * ITEMS_PER_PAGE, meetings.length)} of ${meetings.length}`}
                {!loading && !error && totalPages <= 1 && `${meetings.length} item${meetings.length === 1 ? '' : 's'}`}
              </span>
            </div>
          </div>
        )}
      </div >

      {/* Provider connection dialog */}
      <ConnectProvidersDialog
        open={showProviders}
        onClose={() => setShowProviders(false)}
        onConnected={fetchData}
      />

      {/* Add Internal Meeting Dialog */}
      <NewInternalMeetingDialog
        open={isInternalMeetingDialogOpen}
        onOpenChange={setIsInternalMeetingDialogOpen}
        onCreated={() => {
          fetchData();
          onActionComplete?.();
        }}
        draftId={draftId}
      />

      {/* Edit dialog for manually created internal meetings. Keyed on the
          meeting so it remounts (and re-prefills) when a different row is opened. */}
      {internalMeetingToEdit && (
        <NewInternalMeetingDialog
          key={internalMeetingToEdit.id}
          open
          onOpenChange={(open) => { if (!open) setInternalMeetingToEdit(null); }}
          meeting={internalMeetingToEdit}
          onCreated={() => {
            setInternalMeetingToEdit(null);
            fetchData();
            onActionComplete?.();
          }}
        />
      )}
    </>
  );
});

MeetingTime.displayName = 'MeetingTime';

export default MeetingTime;