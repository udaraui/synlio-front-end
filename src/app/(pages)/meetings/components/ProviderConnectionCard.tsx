"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ProviderConnectionStatus,
  MeetingProvider,
  getAuthUrl,
  disconnectProvider,
  syncMeetings,
} from "@/services/meetings-integration.service";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Loader2,
  RefreshCcw,
  Unplug,
  Users,
  Video,
  MonitorPlay,
  Hash,
} from "lucide-react";

interface ProviderInfo {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  logo: React.ReactNode;
}

const PROVIDER_META: Record<Exclude<MeetingProvider, 'internal'>, ProviderInfo> = {
  teams: {
    label: "Microsoft Teams",
    color: "#6264A7",
    bgColor: "bg-[#6264A7]/8",
    borderColor: "border-[#6264A7]/30",
    description: "Sync calendar events with Teams meeting links",
    logo: <Users className="w-5 h-5 shrink-0" color="#6264A7" />,
  },
  zoom: {
    label: "Zoom",
    color: "#2D8CFF",
    bgColor: "bg-[#2D8CFF]/8",
    borderColor: "border-[#2D8CFF]/30",
    description: "Sync scheduled Zoom meetings",
    logo: <Video className="w-5 h-5 shrink-0" color="#2D8CFF" />,
  },
  google_meet: {
    label: "Google Meet",
    color: "#00A783",
    bgColor: "bg-[#00A783]/8",
    borderColor: "border-[#00A783]/30",
    description: "Sync Google Calendar events with meet links",
    logo: <MonitorPlay className="w-5 h-5 shrink-0" color="#00A783" />,
  },
  slack: {
    label: "Slack",
    color: "#4A154B",
    bgColor: "bg-[#4A154B]/8",
    borderColor: "border-[#4A154B]/30",
    description: "Sync Slack Huddles & calls (limited API)",
    logo: <Hash className="w-5 h-5 shrink-0" color="#4A154B" />,
  },
};

interface ProviderConnectionCardProps {
  connection: ProviderConnectionStatus;
  onStatusChange: () => void;
}

export const ProviderConnectionCard: React.FC<ProviderConnectionCardProps> = ({
  connection,
  onStatusChange,
}) => {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const meta = PROVIDER_META[connection.provider as Exclude<MeetingProvider, 'internal'>];
  const isConnected = connection.status === "connected";
  const isError = connection.status === "error";

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { url } = await getAuthUrl(connection.provider);
      window.location.href = url;
    } catch (e) {
      console.error("Failed to get auth URL", e);
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectProvider(connection.provider);
      onStatusChange();
    } catch (e) {
      console.error("Failed to disconnect", e);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncMeetings({ provider: connection.provider });
      onStatusChange();
    } catch (e) {
      console.error("Failed to sync", e);
    } finally {
      setSyncing(false);
    }
  };

  const statusBadge = isConnected ? (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-border/60 text-xs font-medium text-foreground/80 shrink-0">
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0 bg-green-500 dark:bg-green-400" />
      Active
    </div>
  ) : isError ? (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-border/60 text-xs font-medium text-foreground/80 shrink-0">
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0 bg-red-500 dark:bg-red-400" />
      Action needed
    </div>
  ) : (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-border/60 text-xs font-medium text-foreground/80 shrink-0">
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0 bg-gray-400 dark:bg-gray-500" />
      Not connected
    </div>
  );

  return (
    <div
      className={cn(
        "rounded-md border p-3 flex flex-col gap-2.5 bg-white dark:bg-gray-900 transition-shadow hover:shadow-md h-[180px]"
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {meta.logo}
              <p className="text-md font-semibold leading-tight">
                {meta.label}
              </p>
            </div>
            {statusBadge}
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-tight truncate">
            {meta.description}
          </p>
        </div>
      </div>

      {/* Last sync info */}
      {isConnected && connection.lastSyncAt && (
        <p className="text-xs">
          Last synced at{" "}
          {new Date(connection.lastSyncAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}

      {/* Authorization lost — reconnecting is the only fix */}
      {isError && connection.lastError && (
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-xs text-red-500 dark:text-red-400 line-clamp-3 leading-snug cursor-default">
              {connection.lastError}
            </p>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            {connection.lastError}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Still connected, but the last sync failed for a temporary reason.
          Shown as a warning so users don't reconnect unnecessarily. */}
      {isConnected && connection.lastError && (
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-xs text-amber-500 dark:text-amber-400 line-clamp-2 leading-snug cursor-default">
              Last sync failed, will retry automatically: {connection.lastError}
            </p>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            Last sync failed, will retry automatically: {connection.lastError}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto flex-wrap">
        {!isConnected ? (
          <Button
            size="sm"
            className="flex-1 min-w-0 text-xs h-8"
            style={{ backgroundColor: meta.color, borderColor: meta.color }}
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : null}
            {isError ? "Reconnect" : "Connect"}
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 min-w-0 text-xs h-8 gap-1"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCcw className="h-3 w-3" />
              )}
              Sync
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 min-w-0 text-xs h-8 text-red-500 dark:text-red-400 gap-1"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Unplug className="h-3 w-3" />
              )}
              Disconnect
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
