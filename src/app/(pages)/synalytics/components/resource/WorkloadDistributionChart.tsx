"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
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

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs min-w-[180px]">
      <div className="flex items-center gap-2 mb-1.5">
        <Avatar className="w-7 h-7">
          <AvatarImage src={item?.profilePic} />
          <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
            {getInitials(item?.fullName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold whitespace-nowrap">{item?.fullName ?? label}</p>
          <p className="text-muted-foreground -mt-0.5">{item?.email}</p>
        </div>
      </div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-3 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.payload?.statusColor ?? p.fill ?? p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-semibold text-foreground ml-auto pl-2">{Number(p.value).toFixed(2)}h</span>
        </div>
      ))}
    </div>
  );
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

export default function WorkloadDistributionChart({ rows, loading }: Props) {
  const axisColor = useAxisColor();
  const [page, setPage] = useState(0);

  const { data, totalPages } = useMemo(() => {
    const seen = new Set<number>();
    const allData = rows
      .filter((r) => {
        if (seen.has(r.resource_id)) return false;
        seen.add(r.resource_id);
        return true;
      })
      .map((r) => ({
        name: r.full_name ?? "Unknown",
        fullName: r.full_name ?? "Unknown",
        email: r.email,
        profilePic: r.profile_pic,
        hours: Number(r.allocated_effort_hrs ?? 0),
        status: r.workload_status ?? "Normal",
        statusColor: STATUS_COLOR[r.workload_status ?? "Normal"] ?? CHART_COLORS.BLUE,
      }));

    const totalPages = Math.ceil(allData.length / PAGE_SIZE);
    const paginatedData = allData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return { data: paginatedData, totalPages };
  }, [rows, page]);

  useEffect(() => { setPage(0); }, [rows]);

  const axisProps = {
    axisLine: { stroke: axisColor },
    tickLine: { stroke: axisColor },
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg overflow-hidden shadow-sm flex flex-col h-[460px]">
      <div className="px-4 py-3 border-b border-border flex-shrink-0 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Workload Distribution (Allocated Hours)</h2>
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
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">No data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                {...axisProps}
                tick={(props) => <CustomXAxisTick {...props} axisColor={axisColor} />}
              />
              <YAxis {...axisProps} tick={{ fontSize: 10, fill: axisColor }} unit="h" />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
              <Bar dataKey="hours" name="Allocated Hours" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={STATUS_COLOR[entry.status] ?? CHART_COLORS.BLUE} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {!loading && (
        <div className="px-4 pb-3 flex-shrink-0 flex flex-wrap gap-2 justify-center">
          {Object.entries(STATUS_COLOR).map(([status, color]) => (
            <div key={status} className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded-md">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              {status}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}