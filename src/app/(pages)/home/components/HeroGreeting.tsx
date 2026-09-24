"use client";

import { useAuth } from "@/contexts/auth.context";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { ChevronDown, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getUserConfig, FilterTemplate } from "@/services/user-management/user-config-service";
import { searchTaskSpaces } from "@/services/task-management/task-space.service";
import { searchTicketSpaces } from "@/services/ticket-management/ticket-space.service";

interface HeroGreetingProps {
  canTasks?: boolean;
  canTickets?: boolean;
  canMeetings?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 3 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

// ── Reusable pill + command-popover ──────────────────────────────────────────

interface PillItem {
  id: string | number;
  label: string;
  sub?: string;
  count?: number;
}

function PillDropdown<T extends PillItem>({
  label, items, loading, onSelect, emptyMessage, color = "default",
}: {
  label: string;
  items: T[];
  loading?: boolean;
  onSelect: (item: T) => void;
  emptyMessage?: string;
  color?: "default" | "emerald" | "blue";
}) {
  const [open, setOpen] = useState(false);

  const dotClass =
    color === "emerald" ? "bg-emerald-400/80" :
      color === "blue" ? "bg-blue-400/90" : "bg-white/80";

  // const btnClass =
  //   color === "emerald"
  //     ? "border border-emerald-400/50 hover:bg-emerald-500/30"
  //     : color === "blue"
  //       ? "border border-blue-400/50 hover:bg-blue-500/30"
  //       : "border border-white/40 hover:bg-white/20";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={loading}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
          {label}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start" sideOffset={6}>
        <Command>
          <CommandInput placeholder="Search…" className="h-8 text-xs" />
          <CommandList>
            {loading ? (
              <div className="py-4 text-center text-xs text-muted-foreground">Loading…</div>
            ) : (
              <>
                <CommandEmpty className="text-xs py-4 text-center text-muted-foreground">
                  {emptyMessage ?? "No items found"}
                </CommandEmpty>
                <CommandGroup>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.label}
                      onSelect={() => { setOpen(false); onSelect(item); }}
                      className="text-xs cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full min-w-0 gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-medium">{item.label}</span>
                          {item.sub && (
                            <span className="truncate text-muted-foreground">{item.sub}</span>
                          )}
                        </div>
                        {item.count !== undefined && item.count > 0 && (
                          <span className="flex-shrink-0 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                            {item.count} filter{item.count !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Filter count helpers ───────────────────────────────────────────────────────

function countTaskFilters(f: any): number {
  if (!f) return 0;
  let n = 0;
  if (f.nameFilter) n++;
  if (f.codeFilter) n++;
  if (f.descriptionFilter) n++;
  if (Array.isArray(f.statusFilter) && f.statusFilter.length) n++;
  if (Array.isArray(f.severityFilter) && f.severityFilter.length) n++;
  if (Array.isArray(f.assigneeFilter) && f.assigneeFilter.length) n++;
  if (Array.isArray(f.coAssigneeFilter) && f.coAssigneeFilter.length) n++;
  if (f.dateRangeFrom) n++;
  if (f.specialFilter) n++;
  return n;
}

function countTicketFilters(f: any): number {
  if (!f) return 0;
  let n = 0;
  if (f.nameFilter) n++;
  if (f.codeFilter) n++;
  if (f.descriptionFilter) n++;
  if (Array.isArray(f.statusFilter) && f.statusFilter.length) n++;
  if (Array.isArray(f.severityFilter) && f.severityFilter.length) n++;
  if (Array.isArray(f.ticketTypeFilter) && f.ticketTypeFilter.length) n++;
  if (Array.isArray(f.queueFilter) && f.queueFilter.length) n++;
  if (Array.isArray(f.assigneeFilter) && f.assigneeFilter.length) n++;
  if (Array.isArray(f.participantFilter) && f.participantFilter.length) n++;
  return n;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function HeroGreeting({
  canTasks = true,
  canTickets = true,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canMeetings: _canMeetings = true,
  onRefresh,
  refreshing = false,
}: HeroGreetingProps) {
  const { user } = useAuth();
  const canViewAllTicketSpaces = usePrivilegeGuard("105") as boolean;
  const displayName = user?.first_name ?? user?.name ?? "there";
  const greeting = getGreeting();

  // ── Filter templates (My Boards) ─────────────────────────────────────
  const [taskTemplates, setTaskTemplates] = useState<FilterTemplate[]>([]);
  const [ticketTemplates, setTicketTemplates] = useState<FilterTemplate[]>([]);
  const [taskSpaces, setTaskSpaces] = useState<any[]>([]);
  const [ticketSpaces, setTicketSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!user?.id || fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);

    Promise.all([
      getUserConfig(user.id),
      canTasks ? searchTaskSpaces({}) : Promise.resolve({ data: [] }),
      canTickets ? searchTicketSpaces(
        !canViewAllTicketSpaces && user.id ? { filters: [{ field: 'userId', value: user.id, matchMode: 'member' }] } : {}
      ) : Promise.resolve({ data: [] }),
    ])
      .then(([config, taskSpacesRes, ticketSpacesRes]) => {
        const activeCompany = (() => {
          try { return JSON.parse(localStorage.getItem("active_company") || "null"); } catch { return null; }
        })();
        const activeCompanyId: number | undefined = activeCompany?.companyId;

        const allTaskTemplates = (config?.filterTemplates?.task ?? []) as FilterTemplate[];
        const allTicketTemplates = (config?.filterTemplates?.ticket ?? []) as FilterTemplate[];

        // Strictly show only templates for the active company.
        const filteredTaskTemplates = activeCompanyId
          ? allTaskTemplates.filter((t) => t.companyId === activeCompanyId)
          : allTaskTemplates;
        const filteredTicketTemplates = activeCompanyId
          ? allTicketTemplates.filter((t) => t.companyId === activeCompanyId)
          : allTicketTemplates;

        setTaskTemplates(filteredTaskTemplates);
        setTicketTemplates(filteredTicketTemplates);
        setTaskSpaces(taskSpacesRes.data ?? []);
        setTicketSpaces(ticketSpacesRes.data ?? []);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [user?.id, canTasks, canTickets, canViewAllTicketSpaces]);

  // ── Navigation handlers ───────────────────────────────────────────────
  const handleTaskBoard = (t: FilterTemplate) => {
    try { sessionStorage.setItem("tmTaskPageFilters", JSON.stringify({ ...t.filters })); } catch { }
    window.open(`/task-management/task?taskSpaceId=${(t.filters as any).spaceId}`, "_blank");
  };
  const handleTicketBoard = (t: FilterTemplate) => {
    try { sessionStorage.setItem("ticketPageFilters", JSON.stringify({ ...t.filters })); } catch { }
    window.open(`/ticket-management/ticket?ticketSpaceId=${(t.filters as any).selectedTicketSpaceFilter}`, "_blank");
  };
  const handleCreateTicket = (s: any) => window.open(`/ticket-management/ticket/form?ticketSpaceId=${s.id}`, "_blank");

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1a3a5c] to-[#2563a8] dark:from-slate-900 dark:to-slate-800/80 px-5 py-4 shadow-md h-full">
      {/* decorative circles */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10 dark:bg-white/5" />
      <div className="pointer-events-none absolute -right-4 top-16 h-32 w-32 rounded-full bg-white/5 dark:bg-white/5" />

      <div className="relative flex flex-col gap-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {greeting}, {displayName}.{" "}
            <span className="font-normal opacity-80">Here is what needs attention.</span>
          </h1>
          <p className="text-sm text-blue-100/80 w-full leading-relaxed">
            Surface overdue work, chase top priority tickets, track your meetings, and keep this week's delivery milestones in clear view.
          </p>
        </div>
        <div className="flex flex-wrap pt-2 gap-3">
          {/* My Ticket Boards */}
          {canTickets && (
            <PillDropdown<FilterTemplate & PillItem>
              label="Ticket Boards"
              color="blue"
              items={ticketTemplates.map((t) => {
                const n = countTicketFilters(t.filters);
                return { ...t, id: t.id, label: t.name, sub: n > 0 ? `${n} filter${n !== 1 ? "s" : ""}` : undefined };
              })}
              loading={loading}
              onSelect={handleTicketBoard}
              emptyMessage="No saved ticket boards"
            />
          )}

          {/* My Task Boards */}
          {canTasks && (
            <PillDropdown<FilterTemplate & PillItem>
              label="Project Boards"
              color="emerald"
              items={taskTemplates.map((t) => {
                const n = countTaskFilters(t.filters);
                return { ...t, id: t.id, label: t.name, sub: n > 0 ? `${n} filter${n !== 1 ? "s" : ""}` : undefined };
              })}
              loading={loading}
              onSelect={handleTaskBoard}
              emptyMessage="No saved task boards"
            />
          )}

          {/* Create Ticket */}
          {canTickets && (
            <PillDropdown<PillItem>
              label="Create Ticket"
              color="blue"
              items={ticketSpaces.map((s) => ({ id: s.id, label: s.name, sub: s.prefix ?? undefined }))}
              loading={loading}
              onSelect={handleCreateTicket}
              emptyMessage="No ticket spaces found"
            />
          )}

          {/* Refresh — pinned to the far end */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              title={'Refresh'}
              className="ml-auto inline-flex items-center rounded-full border-2 border-white/40 px-2 py-1 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}