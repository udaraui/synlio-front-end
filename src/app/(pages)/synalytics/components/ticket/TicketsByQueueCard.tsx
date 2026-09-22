"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { MULTI_SERIES_PALETTE } from "../chartColors";

function useChartTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const update = () => setDark(document.documentElement.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return {
    tickColor:   dark ? "#9ca3af" : "#6b7280",  // gray-400 / gray-500
    axisColor:   dark ? "#4b5563" : "#d1d5db",  // gray-600 / gray-300
    cursorColor: dark ? "#374151" : "#f3f4f6",  // gray-700 / gray-100
  };
}

interface Props {
  rows: any[];
  loading?: boolean;
}

const BAR_COLORS = MULTI_SERIES_PALETTE;

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs min-w-[130px] shadow-sm">
      <div className="flex items-center gap-2 mb-1">

        <span className="font-semibold">{label}</span>
      </div>
      <div className="text-muted-foreground">
        Count: <span className="font-semibold text-foreground">{payload[0]?.value}</span>
      </div>
    </div>
  );
}

export default function TicketsByQueueCard({ rows, loading }: Props) {
  const { tickColor, axisColor, cursorColor } = useChartTheme();
  const data = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      const key = r.queue_name ?? "Unknown";
      map[key] = (map[key] || 0) + (Number(r.ticket_count) || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-semibold mb-4 text-foreground">Tickets by Queue</h3>
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
          <ResponsiveContainer width="100%" height={150}>
            <BarChart
              data={data}
              margin={{ top: 0, right: 5, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: tickColor }}
                tickLine={false}
                axisLine={{ stroke: axisColor }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: tickColor }}
                tickLine={false}
                axisLine={{ stroke: axisColor }}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: cursorColor, opacity: 0.6 }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 pt-3 border-t border-border text-xs space-y-1">
            {data.map((d, i) => (
              <div key={d.name} className="flex justify-between items-center">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium text-foreground/80">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                  />
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
