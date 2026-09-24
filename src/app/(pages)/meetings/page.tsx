"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useBreadcrumbsEffect } from "@/hooks/useBreadcrumbsEffect";
import {
  ProviderConnectionStatus,
  getConnectionStatus,
  syncMeetings,
} from "@/services/common/meetings-integration.service";
import { ProviderConnectionCard } from "./components/ProviderConnectionCard";
import { MeetingsList } from "./components/MeetingsList";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RefreshCcw, ShieldCogCorner, ShieldCheck, Users, Video, MonitorPlay, Hash } from "lucide-react";
import { subDays, addDays } from "date-fns";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getCompanyMeetingProviders, updateCompanyMeetingProviders } from "@/services/company-management/company-services";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

const ADMIN_CONSENT_PROVIDERS = [
  { id: "teams", label: "Microsoft Teams", icon: Users, color: "#6264A7" },
  { id: "zoom", label: "Zoom", icon: Video, color: "#2D8CFF" },
  { id: "google_meet", label: "Google Meet", icon: MonitorPlay, color: "#00A783" },
  { id: "slack", label: "Slack", icon: Hash, color: "#4A154B" },
];

const MeetingsPage = () => {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<ProviderConnectionStatus[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const hasAdminConsentPrivilege = usePrivilegeGuard('110');

  // Admin Consent states
  const [allowedProviders, setAllowedProviders] = useState<string[]>(["teams", "zoom", "google_meet"]);
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tempSelectedProviders, setTempSelectedProviders] = useState<string[]>([]);
  const [savingProviders, setSavingProviders] = useState(false);

  // Pinned for the lifetime of the page: recomputing `new Date()` each render
  // produced a new ISO string every time, which re-created MeetingsList's
  // fetch callback and made it refetch on every parent re-render.
  const startDate = useMemo(() => subDays(new Date(), 14).toISOString(), []);
  const endDate = useMemo(() => addDays(new Date(), 30).toISOString(), []);

  useBreadcrumbsEffect([
    { label: "Pulse", href: "/pulse" },
    { label: "Manage Integrations", isCurrentPage: true },
  ]);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const status = await getConnectionStatus();
      setConnections(status);

      const storedCompany = localStorage.getItem("active_company");
      if (storedCompany) {
        const parsed = JSON.parse(storedCompany);
        if (parsed?.companyId) {
          setActiveCompanyId(parsed.companyId);
          const compData = await getCompanyMeetingProviders(parsed.companyId);
          if (compData?.data?.allowedMeetingProviders) {
            setAllowedProviders(compData.data.allowedMeetingProviders);
          }
        }
      }
    } catch {
      toast.error("Failed to load connection status");
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();

    // Handle OAuth callback query params
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    const provider = searchParams.get("provider");

    if (connected) {
      toast.success(`Connected ${connected}, syncing your meetings`);
      // Auto-sync after connect
      syncMeetings({ provider: connected as any }).catch(() => { });
    }
    if (error) {
      toast.error(`Failed to connect ${provider ?? "provider"}: ${error.replace(/_/g, " ")}`,
      );
    }
  }, [loadStatus, searchParams]);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const results = await syncMeetings();
      const totalSynced = results.reduce((acc, r) => acc + r.synced, 0);
      toast.success(`Synced ${totalSynced} meetings across ${results.length} provider(s)`);
      await loadStatus();
    } catch {
      toast.error("Sync failed. Please try again");
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveProviders = async () => {
    if (!activeCompanyId) return;
    if (tempSelectedProviders.length > 4) {
      toast.error("You can select a maximum of 4 providers");
      return;
    }
    setSavingProviders(true);
    try {
      await updateCompanyMeetingProviders({
        id: activeCompanyId,
        allowedMeetingProviders: tempSelectedProviders,
      });
      setAllowedProviders(tempSelectedProviders);
      setIsDialogOpen(false);
      toast.success("Meeting providers updated");
    } catch {
      toast.error("Failed to update meeting providers");
    } finally {
      setSavingProviders(false);
    }
  };

  const filteredConnections = connections.filter((c) =>
    allowedProviders.includes(c.provider)
  );

  const connectedCount = filteredConnections.filter((c) => c.status === "connected").length;

  return (
    <div className="flex flex-col h-full pt-8">
      <div className="flex flex-col flex-1 overflow-hidden bg-background border-t border-x border-border/60 relative">

        {/* Provider Connections */}
        <div className="flex-none p-3">
          <div className={cn("flex items-center justify-between", (loadingStatus || filteredConnections.length > 0) && "pb-3")}>
            <div className="flex items-center gap-2">
              {connectedCount > 0 && (
                <Button
                  size="sm"
                  className="h-7 text-xs shadow-none gap-1.5"
                  onClick={handleSyncAll}
                  disabled={syncing}
                >
                  {syncing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-3.5 w-3.5" />
                  )}
                  Sync All
                </Button>
              )}
              {hasAdminConsentPrivilege && (
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  if (open) {
                    setTempSelectedProviders(allowedProviders);
                  }
                  setIsDialogOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs border border-dashed border-primary text-primary">
                      <ShieldCogCorner className="w-3.5 h-3.5" /> Admin Consent
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Admin Consent - Meeting Providers</DialogTitle>
                      <DialogDescription>
                        Select up to 4 external providers that your company uses.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="pt-2">
                      <div className="flex flex-col gap-3">
                        {ADMIN_CONSENT_PROVIDERS.map((provider) => {
                          const Icon = provider.icon;
                          return (
                            <div key={provider.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={provider.id}
                                checked={tempSelectedProviders.includes(provider.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setTempSelectedProviders([...tempSelectedProviders, provider.id]);
                                  } else {
                                    setTempSelectedProviders(tempSelectedProviders.filter((id) => id !== provider.id));
                                  }
                                }}
                                disabled={
                                  !tempSelectedProviders.includes(provider.id) &&
                                  tempSelectedProviders.length >= 4
                                }
                              />
                              <label
                                htmlFor={provider.id}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                              >
                                <Icon className="w-4 h-4 shrink-0" style={{ color: provider.color }} />
                                <span>{provider.label}</span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveProviders} disabled={savingProviders} className="gap-1.5">
                        {savingProviders ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        Give Consent
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {(loadingStatus || filteredConnections.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 shrink-0 shadow-none"
                  onClick={loadStatus}
                  disabled={loadingStatus}
                  title="Refresh connections"
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </div>

          {loadingStatus ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-md border p-3 flex flex-col gap-3 bg-white dark:bg-gray-900 h-[142px]">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <div className="flex items-center justify-between gap-2">
                        <Skeleton className="h-[22px] w-[80px]" />
                        <Skeleton className="h-[22px] w-[100px] rounded-md" />
                      </div>
                      <Skeleton className="h-[18px] w-full mt-1" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-auto flex-wrap">
                    <Skeleton className="flex-1 h-8 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredConnections.map((conn) => (
                <ProviderConnectionCard
                  key={conn.provider}
                  connection={conn}
                  onStatusChange={loadStatus}
                />
              ))}
            </div>
          )}
        </div>

        <Separator className="mb-3" />

        {/* Meetings List — always visible so internal meetings show even without external provider */}
        <div className="flex flex-col flex-1 min-h-0">
          <MeetingsList
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>
    </div>
  );
};

export default MeetingsPage;
