"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  ArrowUpRight,
  Calendar,
  ClockFading,
  Users,
  Video,
  Loader2,
  RefreshCw,
  CalendarPlus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { Meeting, syncMeetings, getConnectionStatus } from "@/services/common/meetings-integration.service";
import { NewInternalMeetingDialog } from "../../meetings/components/NewInternalMeetingDialog";

const providerInfo: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  teams: { label: 'Teams', color: '#6264A7', icon: Users },
  google_meet: { label: 'Google', color: '#00A783', icon: Video },
  zoom: { label: 'Zoom', color: '#2D8CFF', icon: Video },
  slack: { label: 'Slack', color: '#4A154B', icon: Users },
  internal: { label: 'Internal', color: '#8b5cf6', icon: Users },
};

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const ProviderBadge = ({ provider }: { provider: Meeting['provider'] }) => {
  const { label, color } = providerInfo[provider] || { label: 'Unknown', color: '#888' };
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs border rounded-md font-medium shrink-0 bg-card text-card-foreground">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
};

const formatMeetingTime = (start: string) => {
  const startDate = new Date(start);
  const now = new Date();
  const diffTime = startDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const time = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (new Date().toDateString() === startDate.toDateString()) return { label: `Today at ${time}`, danger: false };
  if (new Date(now.setDate(now.getDate() + 1)).toDateString() === startDate.toDateString()) return { label: `Tomorrow at ${time}`, danger: false };
  if (diffDays < 0) return { label: `Ended on ${startDate.toLocaleDateString()}`, danger: true };
  return { label: startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ` at ${time}`, danger: false };
};

interface MyMeetingsColumnProps {
  dates?: string[];
  meetingData: Meeting[];
  loading?: boolean;
  error?: boolean;
  onSyncSuccess?: () => void;
}

export default function MyMeetingsColumn({ dates, meetingData, loading, error, onSyncSuccess }: MyMeetingsColumnProps) {
  const [countdown, setCountdown] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isInternalMeetingDialogOpen, setIsInternalMeetingDialogOpen] = useState(false);

  useEffect(() => {
    getConnectionStatus().then(statuses => {
      const latestSync = statuses
        .map((c) => (c.lastSyncAt ? new Date(c.lastSyncAt).getTime() : 0))
        .reduce((a, b) => Math.max(a, b), 0);
      if (latestSync > 0) {
        setLastSyncTime(new Date(latestSync));
      }
    }).catch(() => { });
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncMeetings();
      setLastSyncTime(new Date());
      // toast.success("Meetings synced");
      onSyncSuccess?.();
    } catch {
      toast.error("Failed to sync meetings");
    } finally {
      setSyncing(false);
    }
  };
  const nextMeeting = useMemo(() => {
    const now = new Date();
    return meetingData
      .filter(m => m.effectiveStartTime && new Date(m.effectiveStartTime) > now)
      .sort((a, b) => new Date(a.effectiveStartTime!).getTime() - new Date(b.effectiveStartTime!).getTime())[0];
  }, [meetingData]);

  useEffect(() => {
    if (!nextMeeting) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = new Date(nextMeeting.effectiveStartTime!).getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown("is starting now");
        clearInterval(interval);
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      let str = "";
      if (d > 0) str += `${d}d `;
      if (h > 0) str += `${h}h `;
      if (m > 0) str += `${m}m `;
      str += `${s}s`;
      setCountdown(str);
    }, 1000);

    return () => clearInterval(interval);
  }, [nextMeeting]);

  const filteredData = useMemo(() => {
    const now = new Date();
    let data = meetingData.filter(m => m.effectiveStartTime && new Date(m.effectiveStartTime) > now);
    if (dates && dates.length > 0) {
      data = data.filter(meeting => {
        const meetingDateStr = toDateStr(new Date(meeting.effectiveStartTime!));
        return dates.includes(meetingDateStr);
      });
    }
    return data.sort((a, b) => new Date(a.effectiveStartTime!).getTime() - new Date(b.effectiveStartTime!).getTime());
  }, [dates, meetingData]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="h-[86px] px-3 flex flex-col justify-center border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-md font-semibold flex items-center gap-2">
            Upcoming Meetings
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="xs"
              onClick={handleSync}
              disabled={syncing}
              title={lastSyncTime ? `Sync Meetings. Last Sync: ${lastSyncTime.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : "Sync Meetings"}
            >
              {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
            <Badge variant="outline" className="text-xs cursor-default">{filteredData.length}</Badge>
          </div>
        </div>
        {nextMeeting && (
          <div className="text-left pt-2">
            <div className="text-sm text-muted-foreground font-semibold gap-1 flex justify-start items-center">
              <ClockFading className="h-4 w-4" />
              <span>Next meeting starts in {countdown}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-2 pt-2 flex flex-col">
        <div className="flex flex-col gap-2">
          {(!loading && !error && filteredData.length > 0) && filteredData.map((meeting) => {
            const time = meeting.effectiveStartTime ? formatMeetingTime(meeting.effectiveStartTime) : null;
            const provider = providerInfo[meeting.provider] || { label: meeting.provider, color: '#888', icon: Video };
            const Icon = provider.icon;
            return (
              <a
                key={meeting.id}
                href=""
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "group flex flex-col gap-1 px-3 py-2 rounded-md border transition-colors bg-muted/30",
                  time?.danger
                    ? "hover:bg-red-100 dark:hover:bg-red-500/30"
                    : "hover:bg-gray-100 dark:hover:bg-muted"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <Icon className="h-4 w-4 flex-shrink-0" style={{ color: provider.color }} />
                    <span className="text-sm font-medium line-clamp-1 leading-snug cursor-default">
                      {meeting.title}
                    </span>
                  </div>
                  <ProviderBadge provider={meeting.provider} />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {time && (
                    <span className={cn("font-semibold", time.danger && "text-red-500 dark:text-red-400")}>
                      {time.label}
                    </span>
                  )}
                  <span>·</span>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{meeting.attendees?.length || 0}</span>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.s5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              </a>
            );
          })}
        </div>
        {loading && (
          <div className="flex flex-col gap-2 p-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 p-3 border rounded-md bg-muted/30">
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="flex flex-1 flex-col items-center gap-2 text-center p-3">
            {/* <AlertCircle className="h-8 w-8 text-destructive/50" /> */}
            <p className="text-sm font-medium text-destructive">Failed to load meetings</p>
            <p className="text-xs text-muted-foreground/60">Please try refreshing the page.</p>
          </div>
        )}
        {!loading && !error && filteredData.length === 0 && (
          <div className="flex flex-1 flex-col items-center gap-2 text-center p-3">
            {/* <Calendar className="h-8 w-8 text-muted-foreground/40" /> */}
            <p className="text-sm font-medium text-muted-foreground">No upcoming meetings</p>
            <p className="text-xs text-muted-foreground/60">Your upcoming meetings will appear here.</p>
          </div>
        )}
      </div>

      <NewInternalMeetingDialog
        open={isInternalMeetingDialogOpen}
        onOpenChange={setIsInternalMeetingDialogOpen}
        onCreated={() => onSyncSuccess?.()}
      />
    </div>
  );
}