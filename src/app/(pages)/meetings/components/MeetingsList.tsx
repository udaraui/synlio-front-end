"use client";
import React, { useState, useCallback } from "react";
import { Meeting, MeetingProvider, getMeetings } from "@/services/common/meetings-integration.service";
import { MeetingTableRow, hasMeetingAction } from "./MeetingTableRow";
import { useAuth } from "@/contexts/auth.context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PackageOpen,
  Search,
  RefreshCcw,
  Video,
  Plus,
  X,
  Users,
  MonitorPlay,
  Hash,
  Handshake,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { NewInternalMeetingDialog } from "./NewInternalMeetingDialog";

interface MeetingsListProps {
  startDate?: string;
  endDate?: string;
}

const PROVIDERS: { value: string; label: string; icon?: React.ElementType; color?: string }[] = [
  { value: "teams", label: "Microsoft Teams", icon: Users, color: "#6264A7" },
  { value: "zoom", label: "Zoom", icon: Video, color: "#2D8CFF" },
  { value: "google_meet", label: "Google Meet", icon: MonitorPlay, color: "#00A783" },
  { value: "slack", label: "Slack", icon: Hash, color: "#4A154B" },
  { value: "internal", label: "Internal", icon: Handshake, color: "#8b5cf6" },
];

export const MeetingsList: React.FC<MeetingsListProps> = ({
  startDate,
  endDate,
}) => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>("");
  const [search, setSearch] = useState("");
  const [isInternalMeetingDialogOpen, setIsInternalMeetingDialogOpen] = useState(false);
  const limit = 7;

  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(
    async (pg: number = 1) => {
      setLoading(true);
      setError(null);
      try {
        const result = await getMeetings({
          startDate,
          endDate,
          provider: provider ? (provider as MeetingProvider) : undefined,
          page: pg,
          limit,
          includeIgnored: true,
        });
        setMeetings(result.data);
        setTotal(result.total);
      } catch {
        setError("Failed to load meetings. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, provider],
  );

  // `page` drives the fetch — the pagination controls only move this state,
  // so it must be a dependency or the list never leaves page 1.
  React.useEffect(() => {
    load(page);
  }, [load, page]);

  // A new search term re-filters against a fresh first page.
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.ceil(total / limit);

  // Client-side filter by search text
  const filtered = search
    ? meetings.filter((m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.organizerEmail?.toLowerCase().includes(search.toLowerCase()),
    )
    : meetings;

  const showActionsColumn = filtered.some((m) => hasMeetingAction(m, user?.id));

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar section - spans full page width above the split */}
      <div className="flex-none">
        <div className="px-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => setIsInternalMeetingDialogOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" /> Add Meeting
            </Button>

            <Button
              size="sm"
              variant="outline"
              className={`h-7 w-7 p-0 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => load(page)}
              disabled={loading}
              title={loading ? 'Loading...' : 'Refresh'}
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <div className="mx-1 h-3.5 w-px bg-gray-300 dark:bg-gray-600" />

            <div className="flex gap-1.5">
              <div className="relative w-56">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name"
                  className="h-7 pl-7 text-xs shadow-none placeholder:text-xs"
                />
              </div>

              <Select
                value={provider}
                onValueChange={(v) => {
                  setProvider(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-[170px] text-xs shadow-none flex gap-1">
                  <SelectValue placeholder="Provider" className="flex-1 text-left truncate" />
                  {provider && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setProvider("");
                        setPage(1);
                      }}
                      className="ml-auto hover:text-destructive cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </div>
                  )}
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <SelectItem key={p.value} value={p.value} className="text-xs">
                        <div className="flex items-center gap-2">
                          {Icon && <Icon className="w-3.5 h-3.5" color={p.color} />}
                          <span className="truncate">{p.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Content section: table */}
      <div className="p-2.5 flex flex-col flex-1 min-h-0">
        <div className="flex flex-col flex-1 min-h-0 rounded-lg border overflow-hidden bg-white dark:bg-zinc-950">
          <div className="relative flex-1 min-h-0 overflow-auto [&_[data-slot=table-container]]:overflow-visible">
            <Table>
              <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-gray-50 dark:[&_th]:bg-gray-900">
                <TableRow className="hover:bg-transparent">
                  <TableHead className={cn(showActionsColumn ? "w-[30%]" : "w-[36%]", "h-10 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground")}>
                    Meeting
                  </TableHead>
                  <TableHead className={cn(showActionsColumn ? "w-[22%]" : "w-[24%]", "h-10 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground")}>
                    Occurred At
                  </TableHead>
                  <TableHead className="w-[10%] h-10 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Duration
                  </TableHead>
                  <TableHead className={cn(showActionsColumn ? "w-[12%]" : "w-[15%]", "h-10 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground")}>
                    Status
                  </TableHead>
                  <TableHead
                    className={cn(
                      showActionsColumn ? "w-[14%] text-left" : "w-[15%] text-right",
                      "h-10 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground",
                    )}
                  >
                    Organizer
                  </TableHead>
                  {showActionsColumn && (
                    <TableHead className="w-[12%] h-10 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Skeleton */}
                {loading &&
                  Array.from({ length: limit }).map((_, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                      <TableCell className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-[22px] w-[75px] rounded-md shrink-0" />
                          <Skeleton className="h-4 w-[160px]" />
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4"><Skeleton className="h-4 w-[160px]" /></TableCell>
                      <TableCell className="py-2 px-4">
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-3 w-3 rounded-full" />
                          <Skeleton className="h-4 w-8" />
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4"><Skeleton className="h-[22px] w-[85px] rounded-md" /></TableCell>
                      <TableCell className="py-2 px-4">
                        <div className={cn("flex items-center h-[28px]", showActionsColumn ? "justify-start" : "justify-end")}>
                          <Skeleton className="h-4 w-[120px]" />
                        </div>
                      </TableCell>
                      {showActionsColumn && (
                        <TableCell className="py-2 px-4">
                          <div className="flex items-center justify-end gap-1 h-[28px]">
                            <Skeleton className="h-7 w-12 rounded-md" />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}

                {/* Error */}
                {!loading && error && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={showActionsColumn ? 6 : 5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <p className="text-sm text-destructive">{error}</p>
                        <Button variant="outline" size="sm" onClick={() => load(page)}>
                          Retry
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Empty */}
                {!loading && !error && filtered.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={showActionsColumn ? 6 : 5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 py-8">
                        <PackageOpen className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-muted-foreground">
                          No meetings found
                        </p>
                        <p className="text-xs text-muted-foreground/60">
                          Connect your calendar accounts above and sync to see your meetings here.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* List */}
                {!loading && !error && filtered.map((meeting) => (
                  <MeetingTableRow
                    key={meeting.id}
                    meeting={meeting}
                    showActionsColumn={showActionsColumn}
                    onChanged={() => load(page)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && !error && total > 0 && (
            <div className="flex-none border-t bg-background">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-2 py-1.5">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} meetings
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[
                      { icon: ChevronsLeft, onClick: () => setPage(1), disabled: page === 1, title: "First page" },
                      { icon: ChevronLeft, onClick: () => setPage(Math.max(1, page - 1)), disabled: page === 1, title: "Previous page" },
                      { icon: null },
                      { icon: ChevronRight, onClick: () => setPage(Math.min(totalPages, page + 1)), disabled: page >= totalPages, title: "Next page" },
                      { icon: ChevronsRight, onClick: () => setPage(totalPages), disabled: page >= totalPages, title: "Last page" },
                    ].map((item, i) => {
                      if (!item.icon) {
                        return (
                          <span key={i} className="text-xs px-2 text-gray-600 dark:text-gray-400">
                            Page {page} of {totalPages}
                          </span>
                        );
                      }
                      const Icon = item.icon;
                      return (
                        <button
                          key={i}
                          onClick={item.onClick}
                          disabled={item.disabled}
                          title={item.title}
                          aria-label={item.title}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Internal Meeting Dialog */}
      <NewInternalMeetingDialog
        open={isInternalMeetingDialogOpen}
        onOpenChange={setIsInternalMeetingDialogOpen}
        onCreated={() => load(1)}
      />
    </div>
  );
};
