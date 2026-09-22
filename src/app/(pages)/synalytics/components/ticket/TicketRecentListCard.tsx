"use client";

import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { ExternalLink, Clock, AlertTriangle, Flag, ListTodo, ChevronLeft, ChevronRight } from "lucide-react";
import { CHART_COLORS } from "../chartColors";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const PAGE_SIZE = 6;

interface Props {
  rows: any[];
  loading?: boolean;
}

type TabKey = "unresolved" | "unassigned" | "ageing";

const STATUS_COLOR: Record<string, string> = {
  open: CHART_COLORS.BLUE,
  in_progress: CHART_COLORS.ORANGE,
  finished: CHART_COLORS.GREEN,
  closed: "#6b7280",
  waiting: CHART_COLORS.PURPLE,
};

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

function StatusDisplay({ statusBase, statusName }: { statusBase?: string; statusName?: string }) {
  if (!statusName) return <span className="text-xs text-gray-400">—</span>;
  const key = (statusBase ?? "").toLowerCase().replace(/\s+/g, "_");
  const color = STATUS_COLOR[key] ?? "#94a3b8";
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium max-w-[140px] min-w-0">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-gray-700 dark:text-gray-300 truncate min-w-0 whitespace-nowrap">{statusName}</span>
    </div>
  );
}

function SeverityDisplay({ name, color }: { name?: string; color?: string }) {
  if (!name) return <span className="text-xs text-gray-400">—</span>;
  const c = color ?? CHART_COLORS.RED;
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium">
      <Flag className="w-3 h-3 flex-shrink-0" fill={c} color={c} />
      <span className="text-gray-700 dark:text-gray-300 whitespace-nowrap">{name}</span>
    </div>
  );
}

function QueueDisplay({ name }: { name?: string }) {
  if (!name) return <span className="text-xs text-gray-400">—</span>;
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium max-w-[130px] min-w-0">
      <ListTodo className="w-3 h-3 flex-shrink-0 text-gray-600 dark:text-gray-400" />
      <span className="text-gray-700 dark:text-gray-300 truncate min-w-0">{name}</span>
    </div>
  );
}

function AssigneeDisplay({ name, profilePicture }: { name?: string; profilePicture?: string }) {
  if (!name) {
    return (
      <div className="w-6 h-6 rounded-full border border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center flex-shrink-0" title="Unassigned">
        <span className="text-[9px] text-gray-400">—</span>
      </div>
    );
  }
  return (
    <Avatar className="w-6 h-6">
      <AvatarImage src={profilePicture} />
      <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function AgeDateBadge({ ageDays, createdAt, isOverdue }: { ageDays?: number; createdAt?: string; isOverdue?: boolean }) {
  if (!createdAt && ageDays == null) return <span className="text-xs text-gray-400">—</span>;

  const dateStr = createdAt ? format(new Date(createdAt), "MMM d, yyyy") : null;
  const ageStr = ageDays != null ? `${ageDays}d old` : null;

  if (isOverdue) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-red-400 dark:border-red-500 rounded-md text-xs font-medium whitespace-nowrap">
        <AlertTriangle className="w-3 h-3 flex-shrink-0 text-red-500" />
        <span className="text-red-500 font-semibold">
          {dateStr ?? ageStr}
          {dateStr && ageStr && <span className="font-normal opacity-70"> · {ageStr}</span>}
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium whitespace-nowrap">
      <Clock className="w-3 h-3 flex-shrink-0 text-gray-400 dark:text-gray-500" />
      <span className="text-gray-700 dark:text-gray-300">
        {dateStr ?? ageStr}
        {dateStr && ageStr && <span className="text-gray-400 dark:text-gray-500 font-normal"> · {ageStr}</span>}
      </span>
    </div>
  );
}

function TicketTableRow({ r }: { r: any }) {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer group">
      <td className="px-4 py-2 w-24">
        <div className="flex items-center gap-2 group/code">
          <span className="font-mono text-xs font-semibold tracking-wide hover:underline" style={{ color: CHART_COLORS.BLUE }}>
            {r.ticket_code ?? "—"}
          </span>
          {r.ticket_id && r.ticket_space_id && (
            <a
              href={`/ticket-management/ticket/form?ticketSpaceId=${r.ticket_space_id}&edit=true&ticketId=${r.ticket_id}`}
              target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover/code:opacity-100 transition-opacity text-blue-500 hover:text-blue-700"
              title="Open in new tab"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </td>
      <td className="px-4 py-2 w-64">
        <p className="text-sm text-gray-900 dark:text-gray-100 truncate" title={r.ticket_name}>
          {r.ticket_name ?? "—"}
        </p>
      </td>
      <td className="px-4 py-2">
        <StatusDisplay statusBase={r.status_base} statusName={r.status_name} />
      </td>
      <td className="px-4 py-2">
        <SeverityDisplay name={r.severity_name} color={r.severity_color} />
      </td>
      <td className="px-4 py-2">
        <QueueDisplay name={r.queue_name} />
      </td>
      <td className="px-4 py-2 align-middle">
        <AssigneeDisplay name={r.assignee_name} profilePicture={r.assignee_profile_pic} />
      </td>
      <td className="px-4 py-2 align-middle text-right">
        <div className="flex justify-end">
          <AgeDateBadge ageDays={r.age_days} createdAt={r.created_at} isOverdue={r.is_overdue} />
        </div>
      </td>
    </tr>
  );
}

export default function TicketRecentListCard({ rows, loading }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("unresolved");
  const [page, setPage] = useState(0);

  const grouped = useMemo(() => ({
    unresolved: rows.filter((r) => {
      const b = (r.status_base ?? "").toLowerCase();
      return b !== "finished";
    }),
    unassigned: rows.filter((r) => r.is_assigned === false || r.is_assigned === 0 || r.is_unallocated),
    ageing: rows.filter((r) => Number(r.age_days) > 7 || r.is_overdue),
  }), [rows]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "unresolved", label: "Unresolved" },
    { key: "unassigned", label: "Unassigned" },
    { key: "ageing", label: "Ageing" },
  ];

  const handleTabChange = (key: TabKey) => { setActiveTab(key); setPage(0); };

  const all = grouped[activeTab];
  const total = all.length;
  const pages = Math.ceil(total / PAGE_SIZE);
  const visible = all.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-border overflow-hidden flex flex-col h-full shadow-sm">
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recently Added Tickets</h3>
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`px-2 py-1 text-xs font-semibold border-b-2 transition-colors ${activeTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              {t.label} ({grouped[t.key].length})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center min-h-[280px]">
          <div className="w-8 h-8 rounded-full border-4 border-border border-t-primary animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-1 items-center justify-center min-h-[280px]">
          <p className="text-xs text-muted-foreground">No tickets</p>
        </div>
      ) : (
        <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider w-28">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider w-64">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider w-36">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider w-32">
                  Severity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider w-44">
                  Queue/Dept.
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider w-24">
                  Assignee
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider w-40">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {visible.map((r, i) => <TicketTableRow key={r.ticket_id ?? i} r={r} />)}
            </tbody>
          </table>
        </div>
      )}

      {!loading && pages > 1 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-border flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {page * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE + PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center justify-center w-6 h-6 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`inline-flex items-center justify-center w-6 h-6 rounded border text-xs font-medium transition-colors ${i === page
                    ? "border-primary bg-primary text-white"
                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              disabled={page === pages - 1}
              className="inline-flex items-center justify-center w-6 h-6 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}