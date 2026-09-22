"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth.context";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowRight, ChevronDown, Info, LayoutDashboard, Loader2, Ticket } from "lucide-react";
import { getUserConfig, FilterTemplate } from "@/services/user-config-service";
import { searchTaskSpaces } from "@/services/task-management/task-space.service";
import { searchTicketSpaces } from "@/services/ticket-management/ticket-space.service";

// ── Filter summary helpers ────────────────────────────────────────────────────

function getTaskTemplateTags(f: any): string[] {
  const tags: string[] = [];
  if (f?.spaceId)                    tags.push("Space set");
  if (f?.nameFilter)                 tags.push(`Name: "${f.nameFilter}"`);
  if (f?.codeFilter)                 tags.push(`Code: "${f.codeFilter}"`);
  if (f?.statusFilter?.length)       tags.push(`Status (${f.statusFilter.length})`);
  if (f?.severityFilter?.length)     tags.push(`Severity (${f.severityFilter.length})`);
  if (f?.assigneeFilter?.length)     tags.push(`Assignee (${f.assigneeFilter.length})`);
  if (f?.coAssigneeFilter?.length)   tags.push(`Co-assignee (${f.coAssigneeFilter.length})`);
  if (f?.dateRangeFrom)              tags.push("Date range");
  if (f?.specialFilter)              tags.push("Special");
  if (f?.sortOption && f.sortOption !== "createdAt-desc") tags.push("Custom sort");
  return tags;
}

function getTicketTemplateTags(f: any): string[] {
  const tags: string[] = [];
  if (f?.selectedTicketSpaceFilter)  tags.push("Space set");
  if (f?.nameFilter)                 tags.push(`Name: "${f.nameFilter}"`);
  if (f?.codeFilter)                 tags.push(`Code: "${f.codeFilter}"`);
  if (f?.statusFilter?.length)       tags.push(`Status (${f.statusFilter.length})`);
  if (f?.severityFilter?.length)     tags.push(`Severity (${f.severityFilter.length})`);
  if (f?.ticketTypeFilter?.length)   tags.push(`Type (${f.ticketTypeFilter.length})`);
  if (f?.queueFilter?.length)        tags.push(`Queue (${f.queueFilter.length})`);
  if (f?.assigneeFilter?.length)     tags.push(`Assignee (${f.assigneeFilter.length})`);
  if (f?.participantFilter?.length)  tags.push(`Participants (${f.participantFilter.length})`);
  if (f?.sortOption && f.sortOption !== "createdAt-desc") tags.push("Custom sort");
  return tags;
}

// ── Generic selectable column ─────────────────────────────────────────────────

interface QuickColumnProps<T> {
  icon: React.ReactNode;
  title?: string;
  /** Default hint shown when nothing is selected */
  hint: string;
  items: T[];
  headerLoading: boolean;
  itemsLoading: boolean;
  placeholder: string;
  emptyMessage: string;
  actionLabel: string;
  getId: (item: T) => string | number;
  getLabel: (item: T) => string;
  getSub?: (item: T) => string;
  /** Returns filter summary tags shown below the dropdown when item is selected */
  getFilterTags?: (item: T) => string[];
  /** Auto-selected when it becomes truthy and nothing is selected yet */
  defaultValue?: T;
  /** Called when user clicks the action button */
  onNavigate: (item: T) => void;
  onFirstOpen?: () => void;
}

function QuickColumn<T>({
  icon, hint, items, headerLoading, itemsLoading,
  placeholder, emptyMessage, actionLabel, getId, getLabel, getSub,
  getFilterTags, defaultValue, onNavigate, onFirstOpen,
}: QuickColumnProps<T>) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<T | null>(null);
  const hasOpenedRef = useRef(false);

  // Auto-select first item once data arrives, if nothing manually chosen yet
  useEffect(() => {
    if (defaultValue && selected === null) {
      setSelected(defaultValue);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && !hasOpenedRef.current) {
      hasOpenedRef.current = true;
      onFirstOpen?.();
    }
  };

  const filterTags = selected && getFilterTags ? getFilterTags(selected) : [];
  const description = selected && filterTags.length > 0
    ? `${filterTags.length} filter${filterTags.length !== 1 ? "s" : ""} active`
    : selected && getSub && getSub(selected)
      ? getSub(selected)
      : hint;

  return (
    <div className="h-full min-w-0">
      <Popover open={open} onOpenChange={handleOpenChange}>
        {/* Full-height card — flush, no rounding, no border (grid handles dividers) */}
        <div className="flex flex-col h-full w-full bg-transparent px-3 py-2 gap-2">
          {/* Top row: icon + label + chevron — entire area is the dropdown trigger */}
          <PopoverTrigger asChild disabled={headerLoading}>
            <button
              className="flex items-center gap-3 pl-1 pr-2 min-w-0 w-full text-left focus-visible:outline-none flex-1"
              aria-haspopup="listbox"
            >
              {/* Icon column — always visible */}
              <div className="shrink-0">
                {icon}
              </div>
              {/* Title + description column */}
              <div className="flex flex-col min-w-0 flex-1 gap-1">
                {headerLoading ? (
                  <>
                    <Skeleton className="h-3.5 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </>
                ) : (
                  <>
                    <span className={`text-sm leading-snug line-clamp-1 break-words ${selected ? "text-foreground" : "text-muted-foreground"}`}>
                      {selected ? getLabel(selected) : placeholder}
                    </span>
                    {selected && (
                      <span className="text-xs text-muted-foreground truncate mt-0.5 leading-none">
                        {description}
                      </span>
                    )}
                  </>
                )}
              </div>
              {/* Chevron */}
              {!headerLoading && (
                <ChevronDown className={`w-5 h-5 ${open ? "rotate-180" : ""}`} />
              )}
            </button>
          </PopoverTrigger>

          {/* Action button — skeleton during load, real button when selected */}
          {headerLoading ? (
            <Skeleton className="h-7 w-full rounded-md mt-auto" />
          ) : selected && (
            <div className="flex items-center gap-3 mt-auto">
              <button
                onClick={(e) => { e.stopPropagation(); onNavigate(selected); }}
                className="shadow-xs flex items-center justify-between flex-1 px-2.5 py-1.5 text-xs border border-border rounded-md bg-background hover:bg-muted transition-colors font-medium"
              >
                {actionLabel}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <PopoverContent className="w-60 p-0" align="start" sideOffset={4}>
          <Command>
            <CommandInput placeholder="Search…" className="h-8 text-xs" />
            <CommandList>
              {itemsLoading ? (
                <div className="flex items-center justify-center gap-2 py-5 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading…
                </div>
              ) : (
                <>
                  <CommandEmpty className="text-xs py-5 text-center text-muted-foreground">
                    {emptyMessage}
                  </CommandEmpty>
                  <CommandGroup>
                    {items.map((item) => (
                      <CommandItem
                        key={getId(item)}
                        value={getLabel(item)}
                        onSelect={() => { setOpen(false); setSelected(item); }}
                        className="text-xs cursor-pointer border-b border-border last:border-b-0 rounded-none"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-medium">{getLabel(item)}</span>
                          {getSub && getSub(item) && (
                            <span className="truncate text-muted-foreground">{getSub(item)}</span>
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
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

interface QuickActionsCardProps {
  canTasks?: boolean;
  canTickets?: boolean;
  initialTaskSpaces?: any[];
  initialTicketSpaces?: any[];
}

export default function QuickActionsCard({ canTasks = true, canTickets = true, initialTaskSpaces, initialTicketSpaces }: QuickActionsCardProps) {
  const { user } = useAuth();

  const [boardsInfoOpen,      setBoardsInfoOpen]      = useState(false);
  const [quickCreateInfoOpen, setQuickCreateInfoOpen] = useState(false);
  const boardsOpenTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardsCloseTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickCreateOpenTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickCreateCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const makeHoverHandlers = (
    setOpen: (v: boolean) => void,
    openTimer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    closeTimer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  ) => ({
    handleEnter: () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      openTimer.current = setTimeout(() => setOpen(true), 200);
    },
    handleLeave: () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      closeTimer.current = setTimeout(() => setOpen(false), 150);
    },
  });

  const [taskTemplates,   setTaskTemplates]   = useState<FilterTemplate[]>([]);
  const [ticketTemplates, setTicketTemplates] = useState<FilterTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  const [taskSpaces,          setTaskSpaces]          = useState<any[]>(initialTaskSpaces ?? []);
  const [ticketSpaces,        setTicketSpaces]         = useState<any[]>(initialTicketSpaces ?? []);
  const [taskSpacesLoading,   setTaskSpacesLoading]   = useState(false);
  const [ticketSpacesLoading, setTicketSpacesLoading] = useState(false);

  // Header-level skeleton for Quick Create — mirrors templatesLoading for My Boards
  const [spacesHeaderLoading, setSpacesHeaderLoading] = useState(
    (canTasks && initialTaskSpaces === undefined) || (canTickets && initialTicketSpaces === undefined)
  );

  const templatesFetchedRef    = useRef(false);
  const taskSpacesFetchedRef   = useRef(!!initialTaskSpaces);
  const ticketSpacesFetchedRef = useRef(!!initialTicketSpaces);

  useEffect(() => {
    if (initialTaskSpaces) { setTaskSpaces(initialTaskSpaces); taskSpacesFetchedRef.current = true; }
  }, [initialTaskSpaces]);

  useEffect(() => {
    if (initialTicketSpaces) { setTicketSpaces(initialTicketSpaces); ticketSpacesFetchedRef.current = true; }
  }, [initialTicketSpaces]);

  // Dismiss Quick Create skeleton once the initial spaces data (or empty array) has arrived
  useEffect(() => {
    if ((!canTasks || initialTaskSpaces !== undefined) && (!canTickets || initialTicketSpaces !== undefined)) {
      setSpacesHeaderLoading(false);
    }
  }, [canTasks, canTickets, initialTaskSpaces, initialTicketSpaces]);

  useEffect(() => {
    if (!user?.id || templatesFetchedRef.current) return;
    templatesFetchedRef.current = true;
    getUserConfig(user.id)
      .then((config) => {
        setTaskTemplates((config?.filterTemplates?.task   ?? []) as FilterTemplate[]);
        setTicketTemplates((config?.filterTemplates?.ticket ?? []) as FilterTemplate[]);
      })
      .catch(() => {})
      .finally(() => setTemplatesLoading(false));
  }, [user?.id]);

  const loadTaskSpaces = () => {
    if (!user?.id || taskSpacesFetchedRef.current) return;
    taskSpacesFetchedRef.current = true;
    setTaskSpacesLoading(true);
    searchTaskSpaces({ first: 0, rows: 200, filters: [{ field: "userId", value: user.id, matchMode: "member" }] })
      .then((res) => setTaskSpaces(res?.data ?? []))
      .catch(() => {})
      .finally(() => setTaskSpacesLoading(false));
  };

  const loadTicketSpaces = () => {
    if (!user?.id || ticketSpacesFetchedRef.current) return;
    ticketSpacesFetchedRef.current = true;
    setTicketSpacesLoading(true);
    searchTicketSpaces({ first: 0, rows: 200, filters: [{ field: "userId", value: user.id, matchMode: "member" }] })
      .then((res) => setTicketSpaces(res?.data ?? []))
      .catch(() => {})
      .finally(() => setTicketSpacesLoading(false));
  };

  const handleTaskBoard = (template: FilterTemplate) => {
    try { sessionStorage.setItem("tmTaskPageFilters", JSON.stringify({ ...template.filters })); } catch {}
    window.open(`/task-management/task?taskSpaceId=${template.filters.spaceId}`, "_blank");
  };
  const handleTicketBoard = (template: FilterTemplate) => {
    try { sessionStorage.setItem("ticketPageFilters", JSON.stringify({ ...template.filters })); } catch {}
    window.open(`/ticket-management/ticket?ticketSpaceId=${template.filters.selectedTicketSpaceFilter}`, "_blank");
  };
  const handleTaskSpace   = (space: any) => window.open(`/task-management/task?taskSpaceId=${space.id}&fromSpace=1&autoCreate=1`, "_blank");
  const handleTicketSpace = (space: any) => window.open(`/ticket-management/ticket/form?ticketSpaceId=${space.id}`, "_blank");

  const colCount  = (canTasks ? 2 : 0) + (canTickets ? 2 : 0);
  const gridClass = colCount >= 4 ? "grid-cols-2 lg:grid-cols-4" : colCount === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1";
  const divideClass = colCount >= 4 ? "divide-y divide-border lg:divide-y-0 lg:divide-x" : colCount === 2 ? "divide-y sm:divide-y-0 sm:divide-x divide-border" : "";

  return (
    <div className={`grid ${gridClass} ${divideClass} h-full items-stretch rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden`}>

      {/* ── Section titles row ── */}
      {canTasks && canTickets && (() => {
        const boards = makeHoverHandlers(setBoardsInfoOpen, boardsOpenTimer, boardsCloseTimer);
        const qc     = makeHoverHandlers(setQuickCreateInfoOpen, quickCreateOpenTimer, quickCreateCloseTimer);
        return (
          <>
            <div className="col-span-1 border-b lg:col-span-2 px-3 py-2 flex items-center gap-1.5">
              <span className="text-md tracking-wider font-semibold">My Boards</span>
              <Popover open={boardsInfoOpen} onOpenChange={setBoardsInfoOpen}>
                <PopoverTrigger asChild>
                  <span className="inline-flex cursor-pointer" onMouseEnter={boards.handleEnter} onMouseLeave={boards.handleLeave}>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                  </span>
                </PopoverTrigger>
                <PopoverContent side="right" align="start" className="max-w-[240px] text-xs p-3"
                  onMouseEnter={boards.handleEnter} onMouseLeave={boards.handleLeave}>
                  <p className="font-semibold mb-1 text-sm">My Boards</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Jump to task or ticket page with saved filter set. Select a board from the dropdown and click the action button to navigate directly to it.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
            <div className="col-span-1 border-b lg:col-span-2 px-3 py-2 flex items-center gap-1.5">
              <span className="text-md tracking-wider font-semibold">Quick Create</span>
              <Popover open={quickCreateInfoOpen} onOpenChange={setQuickCreateInfoOpen}>
                <PopoverTrigger asChild>
                  <span className="inline-flex cursor-pointer" onMouseEnter={qc.handleEnter} onMouseLeave={qc.handleLeave}>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                  </span>
                </PopoverTrigger>
                <PopoverContent side="right" align="start" className="max-w-[240px] text-xs p-3"
                  onMouseEnter={qc.handleEnter} onMouseLeave={qc.handleLeave}>
                  <p className="font-semibold mb-1 text-sm">Quick Create</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Quickly create a task or ticket in a space. Select a space from the dropdown and click the action button to go directly to the creation form.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
          </>
        );
      })()}
      {canTasks && (
        <QuickColumn<FilterTemplate>
          icon={<LayoutDashboard className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0" />}
          hint="Jump to a saved task filter"
          items={taskTemplates}
          headerLoading={templatesLoading}
          itemsLoading={false}
          placeholder="Select a board…"
          emptyMessage="No saved task boards yet"
          actionLabel="Open Project Board"
          defaultValue={taskTemplates[0]}
          getId={(t) => t.id}
          getLabel={(t) => t.name}
          getSub={(t) => { const n = getTaskTemplateTags(t.filters).length; return n > 0 ? `${n} filter${n !== 1 ? "s" : ""} active` : ""; }}
          getFilterTags={(t) => getTaskTemplateTags(t.filters)}
          onNavigate={handleTaskBoard}
        />
      )}

      {canTickets && (
        <QuickColumn<FilterTemplate>
          icon={<Ticket className="w-7 h-7 text-blue-600 dark:text-blue-400 shrink-0" />}
          hint="Jump to a saved ticket filter"
          items={ticketTemplates}
          headerLoading={templatesLoading}
          itemsLoading={false}
          placeholder="Select a board…"
          emptyMessage="No saved ticket boards yet"
          actionLabel="Open Ticket Board"
          defaultValue={ticketTemplates[0]}
          getId={(t) => t.id}
          getLabel={(t) => t.name}
          getSub={(t) => { const n = getTicketTemplateTags(t.filters).length; return n > 0 ? `${n} filter${n !== 1 ? "s" : ""} active` : ""; }}
          getFilterTags={(t) => getTicketTemplateTags(t.filters)}
          onNavigate={handleTicketBoard}
        />
      )}

      {canTasks && (
        <QuickColumn<any>
          icon={<LayoutDashboard className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0" />}
          hint="Select a project space to proceed"
          items={taskSpaces}
          headerLoading={spacesHeaderLoading}
          itemsLoading={taskSpacesLoading}
          placeholder="Select a project space..."
          emptyMessage="No project spaces found"
          actionLabel="Create Task"
          defaultValue={taskSpaces[0]}
          getId={(s) => s.id}
          getLabel={(s) => s.name}
          getSub={(s) => s.prefix ?? ""}
          onNavigate={handleTaskSpace}
          onFirstOpen={loadTaskSpaces}
        />
      )}

      {canTickets && (
        <QuickColumn<any>
          icon={<Ticket className="w-7 h-7 text-blue-600 dark:text-blue-400 shrink-0" />}
          hint="Select a ticket space to proceed"
          items={ticketSpaces}
          headerLoading={spacesHeaderLoading}
          itemsLoading={ticketSpacesLoading}
          placeholder="Select a ticket space..."
          emptyMessage="No ticket spaces found"
          actionLabel="Create Ticket"
          defaultValue={ticketSpaces[0]}
          getId={(s) => s.id}
          getLabel={(s) => s.name}
          getSub={(s) => s.prefix ?? ""}
          onNavigate={handleTicketSpace}
          onFirstOpen={loadTicketSpaces}
        />
      )}
    </div>
  );
}
