"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CHART_COLORS, STATUS_COLOR } from "../chartColors";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  rows: any[];
  loading?: boolean;
}

const PAGE_SIZE = 8;

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

function statusColor(status?: string | null): string {
  if (!status) return CHART_COLORS.BLUE;
  const s = status.trim();
  return STATUS_COLOR[s] ?? CHART_COLORS.BLUE;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const raw = payload[0]?.payload ?? {};
  const { _utilizationPct, _workloadStatus, _email, _profilePic, _fullName } = raw;
  const statusClr = statusColor(_workloadStatus);

  const BAR_ITEMS = [
    { dataKey: "capacityHrs", label: "Capacity (hrs)", color: CHART_COLORS.GREEN },
    { dataKey: "overdueCount", label: "Overdue Tickets", color: CHART_COLORS.RED },
    { dataKey: "assignedCount", label: "Assigned Tickets", color: CHART_COLORS.AMBER },
  ];

  return (
    <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-md px-3 py-2.5 text-xs min-w-[200px]">
      <div className="flex items-center gap-2 mb-1.5">
        <Avatar className="w-7 h-7">
          <AvatarImage src={_profilePic} />
          <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
            {getInitials(_fullName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold whitespace-nowrap">{_fullName}</p>
          <p className="text-muted-foreground -mt-0.5">{_email}</p>
        </div>
      </div>

      {BAR_ITEMS.map(({ dataKey, label: lbl, color }) => (
        <div key={dataKey} className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground">{lbl}</span>
          </div>
          <span className="font-semibold text-foreground">{raw[dataKey] ?? 0}</span>
        </div>
      ))}

      <div className="border-t border-border my-2" />

      {_utilizationPct != null && (
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="text-muted-foreground">Utilization</span>
          <span className="font-semibold text-foreground">{Number(_utilizationPct).toFixed(1)}%</span>
        </div>
      )}

      {_workloadStatus && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Status</span>
          <span
            className="font-semibold px-1.5 py-0.5 rounded text-white text-[10px]"
            style={{ backgroundColor: statusClr }}
          >
            {_workloadStatus}
          </span>
        </div>
      )}
    </div>
  );
}

const LEGEND_ITEMS = [
  // { key: "capacityHrs", label: "Capacity (hrs)", color: CHART_COLORS.GREEN },
  { key: "overdueCount", label: "Overdue Tickets", color: CHART_COLORS.RED },
  { key: "assignedCount", label: "Assigned Tickets", color: CHART_COLORS.AMBER },
];

function useAxisColor() {
  const [color, setColor] = useState("#94a3b8");
  useEffect(() => {
    const update = () =>
      setColor(document.documentElement.classList.contains("dark") ? "#cbd5e1" : "#94a3b8");
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return color;
}

function CustomXAxisTick({ x, y, payload, axisColor }: any) {
  const full = String(payload.value);
  const display = getInitials(full);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={13} textAnchor="middle" fontSize={9} fill={axisColor}>
        {display}
      </text>
    </g>
  );
}

export default function TicketWorkloadChart({ rows, loading }: Props) {
  const axisColor = useAxisColor();
  const [page, setPage] = useState(0);
  const axisProps = {
    axisLine: { stroke: axisColor },
    tickLine: { stroke: axisColor },
  };

  const { chartData, totalPages } = useMemo(() => {
    const allData = rows.map((r) => ({
      name: r.assignee_name ?? "Unknown",
      capacityHrs: Number(r.weekly_capacity_hrs) || 0,
      allocatedEffortHrs: Number(r.allocated_effort_hrs) || 0,
      overdueCount: Number(r.overdue_count) || 0,
      assignedCount: Number(r.assigned_ticket_count) || 0,
      _utilizationPct: r.utilization_pct,
      _workloadStatus: r.workload_status,
      _fullName: r.assignee_name,
      _email: r.assignee_email,
      _profilePic: r.assignee_profile_pic,
    }));

    const totalPages = Math.ceil(allData.length / PAGE_SIZE);
    const paginatedData = allData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return { chartData: paginatedData, totalPages };
  }, [rows, page]);

  useEffect(() => { setPage(0); }, [rows]);

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg overflow-hidden shadow-sm flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold">User Workload Distribution</h2>
        {totalPages > 1 && (
          <div className={`flex items-center justify-center gap-1 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={loading || page === 0} className="disabled:opacity-30 disabled:cursor-not-allowed" title="Previous">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={loading || page >= totalPages - 1} className="disabled:opacity-30 disabled:cursor-not-allowed" title="Next">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <div className="px-4 pt-3">
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: 260 }}>
            <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height: 260 }}>
            <p className="text-xs text-muted-foreground">No workload data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
              barCategoryGap="25%"
              barGap={3}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                {...axisProps}
                tick={(props) => <CustomXAxisTick {...props} axisColor={axisColor} />}
              />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
              {/*<Bar dataKey="capacityHrs" name="Capacity (hrs)" fill={CHART_COLORS.GREEN} radius={[4, 4, 0, 0]} />*/}
              <Bar dataKey="overdueCount" name="Overdue Tickets" fill={CHART_COLORS.RED} radius={[4, 4, 0, 0]} />
              <Bar dataKey="assignedCount" name="Assigned Tickets" fill={CHART_COLORS.AMBER} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {!loading && (
        <div className="px-4 pb-3 flex flex-wrap gap-2 justify-center">
          {LEGEND_ITEMS.map((item) => (
            <div
              key={item.key}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs border rounded-md font-medium"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}