"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { CHART_COLORS } from "../chartColors";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  rows: any[];
  loading?: boolean;
}

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

const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name.split(' ').filter(p => p);
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || '').toUpperCase();
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const { estimate_effort_hrs, actual_effort_hrs, fullName, email, profilePic } = data;

  let status = "";
  let statusColor = "";

  if (estimate_effort_hrs < actual_effort_hrs) {
    status = "Overloaded";
    statusColor = CHART_COLORS.RED;
  } else if (estimate_effort_hrs > actual_effort_hrs) {
    status = "Available";
    statusColor = CHART_COLORS.BLUE;
  } else {
    status = "Optimal";
    statusColor = CHART_COLORS.GREEN;
  }

  return (
    <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs min-w-[180px]">
      <div className="flex items-center gap-2 mb-1.5">
        <Avatar className="w-7 h-7">
          <AvatarImage src={profilePic} />
          <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold whitespace-nowrap">{fullName}</p>
          <p className="text-muted-foreground -mt-0.5">{email}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{payload[0].name}</span>
        </div>
        <span className="font-semibold text-foreground">{payload[0].value}</span>
      </div>
      <div className="flex items-center justify-between gap-3 mt-1">
        <span className="text-muted-foreground">Estimated Effort:</span>
        <span className="font-semibold text-foreground">{estimate_effort_hrs} hrs</span>
      </div>
      <div className="flex items-center justify-between gap-3 mt-1">
        <span className="text-muted-foreground">Actual Effort:</span>
        <span className="font-semibold text-foreground">{actual_effort_hrs} hrs</span>
      </div>
      <div className="flex items-center justify-between gap-3 mt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
          <span className="text-muted-foreground">Status:</span>
        </div>
        <span className="font-semibold text-foreground">{status}</span>
      </div>
    </div>
  );
}

const PAGE_SIZE = 8;

export default function AssigneeWorkloadChart({ rows, loading }: Props) {
  const axisColor = useAxisColor();
  const [page, setPage] = useState(0);

  const { chartData, overloadedCount, optimalCount, availableCount, totalPages } = useMemo(() => {
    const map: Record<string, { name: string; fullName: string; email: string; profilePic: string; estimate_effort_hrs: number; actual_effort_hrs: number; taskCount: number }> = {};
    rows.forEach((r) => {
      const fullName = r.assignee_full_name;
      if (!fullName || fullName === "Unassigned") return;
      if (!map[fullName]) {
        map[fullName] = {
          name: getInitials(fullName),
          fullName: fullName,
          email: r.assignee_email,
          profilePic: r.assignee_profile_pic,
          estimate_effort_hrs: 0,
          actual_effort_hrs: 0,
          taskCount: 0
        };
      }
      map[fullName].estimate_effort_hrs += Number(r.estimate_effort_hrs) || 0;
      map[fullName].actual_effort_hrs += Number(r.actual_effort_hrs) || 0;
      map[fullName].taskCount += 1;
    });
    const allData = Object.values(map).sort((a, b) => b.taskCount - a.taskCount);
    const totalPages = Math.ceil(allData.length / PAGE_SIZE);
    const paginatedData = allData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    let overloaded = 0, optimal = 0, available = 0;
    allData.forEach((d) => {
      if (d.estimate_effort_hrs < d.actual_effort_hrs) overloaded++;
      else if (d.estimate_effort_hrs > d.actual_effort_hrs) available++;
      else optimal++;
    });

    return { chartData: paginatedData, overloadedCount: overloaded, optimalCount: optimal, availableCount: available, totalPages };
  }, [rows, page]);

  useEffect(() => { setPage(0); }, [rows]);

  const axisProps = { tick: { fontSize: 11, fill: axisColor }, axisLine: { stroke: axisColor }, tickLine: { stroke: axisColor } };

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg overflow-hidden shadow-sm flex flex-col h-[420px]">
      <div className="px-4 py-3 border-b border-border flex-shrink-0 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Assignee Workload</h2>
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

      <div className="px-4 pt-3 flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">No data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
              <Bar dataKey="taskCount" name="Task Count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => {
                  let color = CHART_COLORS.GREEN;
                  if (entry.estimate_effort_hrs < entry.actual_effort_hrs) {
                    color = CHART_COLORS.RED;
                  } else if (entry.estimate_effort_hrs > entry.actual_effort_hrs) {
                    color = CHART_COLORS.BLUE;
                  }
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {!loading && (
        <div className="px-4 pb-3 flex-shrink-0 flex flex-wrap gap-2 justify-center border-border">
          {[
            { label: "Overloaded", color: CHART_COLORS.RED, count: overloadedCount },
            { label: "Optimal", color: CHART_COLORS.GREEN, count: optimalCount },
            { label: "Available", color: CHART_COLORS.BLUE, count: availableCount },
          ].map((item) => (
            <div key={item.label} className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded-md">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              {item.label} <span>{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}