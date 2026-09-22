"use client";

import React, { useMemo, useState, useEffect } from "react";
import { MULTI_SERIES_PALETTE } from "../chartColors";


function useBgStroke() {
  const [stroke, setStroke] = useState("#ffffff");
  useEffect(() => {
    const update = () =>
      setStroke(document.documentElement.classList.contains("dark") ? "#1f2937" : "#ffffff");
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return stroke;
}
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  rows: any[];
  loading?: boolean;
}

const FALLBACK_COLORS = MULTI_SERIES_PALETTE;

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs min-w-[120px] shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.payload.color }} />
        <span className="font-semibold">{item.name}</span>
      </div>
      <div className="text-muted-foreground">
        Count: <span className="font-semibold text-foreground">{item.value}</span>
      </div>
    </div>
  );
}

export default function TicketsByPriorityCard({ rows, loading }: Props) {
  const bgStroke = useBgStroke();
  const data = useMemo(() => {
    const map: Record<string, { name: string; value: number; color: string }> = {};
    rows.forEach((r) => {
      const key = r.priority_name ?? "Unknown";
      if (!map[key]) {
        map[key] = { name: key, value: 0, color: r.priority_color || FALLBACK_COLORS[Object.keys(map).length % FALLBACK_COLORS.length] };
      }
      map[key].value += Number(r.ticket_count) || 0;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [rows]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-semibold mb-4 text-foreground">Tickets by Priority</h3>
      {loading ? (
        <div className="h-[150px] flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border-4 border-border border-t-primary animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="h-[150px] flex items-center justify-center">
          <p className="text-xs text-muted-foreground">No tickets</p>
        </div>
      ) : (
        <>
          <div className="flex justify-center">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  dataKey="value"
                  nameKey="name"
                  strokeWidth={2}
                  stroke={bgStroke}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 pt-3 border-t border-border space-y-1 text-xs">
            {data.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium text-foreground/80">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  {d.name}
                </span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-foreground">{d.value}</span>
                  <span className="text-muted-foreground">
                    ({total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
