"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowUpRight, Ticket, ChevronLeft, ChevronRight } from "lucide-react";
import { getMyTickets } from "@/services/home/home.service";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRange } from "react-day-picker";
import { getTicketTypeIcon } from "@/enums/space-configure-icon.enum";
import { ParentLevelsHoverCard } from "@/components/common/ParentLevelsHoverCard";

function slaDeadlineLabel(deadline?: string | null): { label: string; danger: boolean } | null {
  if (!deadline) return null;
  const due = new Date(deadline);
  const now = new Date();
  const diffHours = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60));
  if (diffHours < 0)
    return { label: `SLA breached ${Math.abs(diffHours)}h ago`, danger: true };
  if (diffHours < 2)
    return { label: `SLA in ${diffHours}h`, danger: true };
  if (diffHours < 24)
    return { label: `SLA in ${diffHours}h`, danger: false };
  const diffDays = Math.ceil(diffHours / 24);
  return { label: `SLA in ${diffDays}d`, danger: false };
}

export interface MyTicketsColumnProps {
  dates?: string[];
  canFetch?: boolean;
  dateRange?: DateRange;
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  setTotalPages: (totalPages: number) => void;
  setLoading: (loading: boolean) => void;
}

const PAGE_SIZE = 5;

export default function MyTicketsColumn({ dates, canFetch = true, dateRange, page, setPage, totalPages, setTotalPages, setLoading }: MyTicketsColumnProps) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [allTickets, setAllTickets] = useState<any[]>([]);
  const [counts, setCounts] = useState<{
    total: number;
    overdue: number;
    dueToday: number;
    statuses: Record<string, number>;
  }>({
    total: 0,
    overdue: 0,
    dueToday: 0,
    statuses: {},
  });
  const [uniqueStatuses, setUniqueStatuses] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [loading, setLocalLoading] = useState(true);

  // Reset page to 0 only when date filters or tab changes
  useEffect(() => { setPage(0); }, [dates, activeTab, dateRange, setPage]);

  const fetchData = useCallback((signal?: AbortSignal) => {
    if (!canFetch) {
      setLoading(false);
      setLocalLoading(false);
      return;
    }
    setLoading(true);
    setLocalLoading(true);
    setError(null);

    const fromDate = undefined;
    const toDate = undefined;

    const fetchAll = activeTab === 'all';
    const pageToFetch = fetchAll ? 0 : page;

    getMyTickets(signal, dates, fetchAll ? 100 : PAGE_SIZE, pageToFetch, undefined, fromDate, toDate, activeTab)
      .then((res) => {
        const ticketsData = res.data ?? [];
        if (fetchAll) {
          setAllTickets(ticketsData);
          setTotalPages(Math.ceil(ticketsData.length / PAGE_SIZE));
        } else {
          setTickets(ticketsData);
          setTotalPages(Math.ceil((res.total ?? 0) / PAGE_SIZE));
        }

        setCounts({
          total: res.total ?? 0,
          overdue: res.overdueCount ?? 0,
          dueToday: res.dueTodayCount ?? 0,
          statuses: res.statusCounts as any ?? {},
        });

        if (fetchAll) {
          const statusMap = new Map<string, any>();
          ticketsData.forEach((ticket: any) => {
            if (ticket.statusName && !statusMap.has(ticket.statusName)) {
              statusMap.set(ticket.statusName, { id: ticket.statusName, name: ticket.statusName, color: ticket.statusColor, base: ticket.statusBase, sequence: ticket.statusSequence ?? 0 });
            }
          });
          setUniqueStatuses(Array.from(statusMap.values()).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)));
        }
      })
      .catch((err: any) => {
        if (err?.code !== "ERR_CANCELED") setError("Could not load tickets.");
      })
      .finally(() => {
        setLoading(false);
        setLocalLoading(false);
      });
  }, [canFetch, dates, dateRange, setLoading, page, activeTab, setPage, setTotalPages]);

  useEffect(() => {
    const controller = new AbortController();
    if (activeTab === 'all' && page > 0) {
      return;
    }
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData, page, activeTab]);

  useEffect(() => {
    if (activeTab === 'all') {
      const start = page * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      setTickets(allTickets.slice(start, end));
    }
  }, [page, allTickets, activeTab]);

  const triggerClass = "relative flex-1 h-9 rounded-none border-b-2 border-transparent bg-transparent hover:bg-transparent px-2 py-2 font-medium text-xs text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:!text-foreground data-[state=active]:!bg-transparent data-[state=active]:shadow-none flex items-center justify-center gap-1.5 cursor-pointer";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="flex w-full shrink-0 bg-transparent dark:bg-transparent p-0 rounded-none overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-b border-border">
          <TabsTrigger value="all" className={triggerClass}>All</TabsTrigger>
          <TabsTrigger value="overdue" className={triggerClass}>
            Overdue <Badge variant="outline" className="ml-1 px-1.5 py-0 h-4 text-[10px] font-medium rounded-full border-transparent bg-primary text-white dark:text-black">{counts.overdue}</Badge>
          </TabsTrigger>
          <TabsTrigger value="today" className={triggerClass}>
            Due Today <Badge variant="outline" className="ml-1 px-1.5 py-0 h-4 text-[10px] font-medium rounded-full border-transparent bg-primary text-white dark:text-black">{counts.dueToday}</Badge>
          </TabsTrigger>
          {uniqueStatuses.map((status) => {
            const count = counts.statuses[status.name];
            if (!count || status.base === 'Finished') return null;
            return (
              <TabsTrigger key={status.name} value={status.name} className={triggerClass}>
                {status.name} <Badge variant="outline" className="ml-1 px-1.5 py-0 h-4 text-[10px] font-medium rounded-full border-transparent bg-primary text-white dark:text-black">{Number(count)}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 min-h-0 overflow-y-auto flex flex-col px-3 pb-3">
          {loading && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1 px-3 py-2 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <Skeleton className="w-4 h-4 rounded-full flex-shrink-0" />
                      <Skeleton className="h-3.5 w-16 rounded" />
                      <Skeleton className="h-4 w-32 rounded" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-md shrink-0" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && error && (
            <div className="flex flex-1 flex-col items-center gap-2 text-center p-3">
              {/* <AlertCircle className="h-8 w-8 text-destructive/50" /> */}
              <p className="text-sm font-medium text-destructive">Failed to load tickets</p>
              <p className="text-xs text-muted-foreground/60">Please try refreshing the page.</p>
            </div>
          )}
          {!loading && !error && tickets.length === 0 && (
            <div className="flex flex-1 flex-col items-center gap-2 text-center p-3">
              {/* <Ticket className="h-8 w-8 text-muted-foreground/40" /> */}
              <p className="text-sm font-medium text-muted-foreground">No open tickets</p>
              <p className="text-xs text-muted-foreground/60">Tickets assigned to you will appear here.</p>
            </div>
          )}
          {!loading && !error && tickets.length > 0 && (
            <div className="flex flex-col gap-2">
              {tickets.map((ticket) => {
                const sla = slaDeadlineLabel(ticket.slaResolutionDeadline);
                const TicketIcon = getTicketTypeIcon(ticket.ticketTypeIcon);
                return (
                  <a
                    key={ticket.id}
                    href={`/ticket-management/ticket/form?ticketSpaceId=${ticket.ticketSpaceId}&edit=true&ticketId=${ticket.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex flex-col gap-1 px-3 py-2 rounded-lg border border-border transition-colors bg-muted/30 hover:bg-gray-100 dark:hover:bg-muted/50`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <TicketIcon className="w-4 h-4 flex-shrink-0 text-primary" />
                        <ParentLevelsHoverCard id={ticket.id} postType="Ticket" code={ticket.code} className="text-xs line-clamp-1 leading-snug font-semibold shrink-0" />
                        <span className="text-sm font-medium line-clamp-1 leading-snug text-gray-900 dark:text-gray-100">{ticket.name}</span>
                      </div>
                      {ticket.severityName && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs border border-border rounded-md font-medium shrink-0 bg-card text-card-foreground text-gray-700 dark:text-gray-200">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ticket.severityColor }} />
                          {ticket.severityName}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      {/*{sla && <span className={`flex items-center gap-1 ${sla.danger ? "text-red-500 dark:text-red-400" : ""}`}>{sla.label}<span>.</span></span>}*/}
                      {sla && <span className={`flex items-center gap-1`}>{sla.label}</span>}
                      <ArrowUpRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
      {/*{totalPages > 1 && (*/}
      {/*  <div className="flex items-center justify-center py-2 border-t">*/}
      {/*    <div className={`flex items-center justify-center gap-1 ${loading ? "opacity-50 pointer-events-none" : ""}`}>*/}
      {/*      <button onClick={() => setPage(Math.max(0, page - 1))} disabled={loading || page === 0} className="p-1 disabled:opacity-30 disabled:cursor-not-allowed" title="Previous">*/}
      {/*        <ChevronLeft className="w-4 h-4" />*/}
      {/*      </button>*/}
      {/*      <span className="text-xs font-medium">{page + 1} / {totalPages}</span>*/}
      {/*      <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={loading || page >= totalPages - 1} className="p-1 disabled:opacity-30 disabled:cursor-not-allowed" title="Next">*/}
      {/*        <ChevronRight className="w-4 h-4" />*/}
      {/*      </button>*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*)}*/}
    </div>
  );
}
