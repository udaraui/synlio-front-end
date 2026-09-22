"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { CHART_COLORS } from "../chartColors";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  rows: any[];
  loading?: boolean;
}

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
        <div key={p.name} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.fill ?? p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-semibold text-foreground whitespace-nowrap">{p.value}h</span>
        </div>
      ))}
    </div>
  );
}

function CustomXAxisTick({ x, y, payload, axisColor }: any) {
  const displayName = getInitials(String(payload.value));
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={13} textAnchor="middle" fontSize={9} fill={axisColor}>
        {displayName}
      </text>
    </g>
  );
}

const LEGEND_ITEMS = [
  { label: "Weekly Capacity", color: CHART_COLORS.GREEN },
  { label: "Allocated Hours (Demand)", color: CHART_COLORS.RED },
];

export default function CapacityVsDemandChart({ rows, loading }: Props) {
  const axisColor = useAxisColor();

  const data = useMemo(() => {
    const seen = new Set<number>();
    return rows
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
        capacity: Number(r.weekly_capacity_hrs ?? 0),
        allocated: Number(r.allocated_effort_hrs ?? 0),
      }));
  }, [rows]);

  const axisProps = {
    axisLine: { stroke: axisColor },
    tickLine: { stroke: axisColor },
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg overflow-hidden shadow-sm flex flex-col h-[420px]">
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <h2 className="text-sm font-semibold">Capacity vs. Demand (Hours)</h2>
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
                interval={0}
                tick={(props) => <CustomXAxisTick {...props} axisColor={axisColor} />}
              />
              <YAxis {...axisProps} tick={{ fontSize: 10, fill: axisColor }} unit="h" />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
              <Bar dataKey="capacity" name="Weekly Capacity" fill={CHART_COLORS.GREEN} radius={[4, 4, 0, 0]} opacity={0.85} />
              <Bar dataKey="allocated" name="Allocated Hours (Demand)" fill={CHART_COLORS.RED} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {!loading && (
        <div className="px-4 pb-3 flex-shrink-0 flex flex-wrap gap-2 justify-center">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded-md">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}