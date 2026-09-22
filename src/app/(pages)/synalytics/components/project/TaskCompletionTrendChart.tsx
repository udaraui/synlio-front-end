"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { CHART_COLORS } from "../chartColors";

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

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs min-w-[140px]">
      <p className="font-semibold mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-muted-foreground">Completed:</span>
        <span className="font-semibold text-foreground">{payload[0]?.value}</span>
      </div>
    </div>
  );
}

export default function TaskCompletionTrendChart({ rows, loading }: Props) {
  const axisColor = useAxisColor();

  const { chartData, avgPerDay, total7d, trend } = useMemo(() => {
    // Filter completed tasks only and group by created_date
    const completed = rows.filter((r) => r.status_base === "Finished");

    const map: Record<string, { date: string; _raw: number; count: number }> = {};
    completed.forEach((r) => {
      if (!r.created_date) return;
      let d: Date;
      try { d = typeof r.created_date === "string" ? parseISO(r.created_date) : new Date(r.created_date); }
      catch { return; }
      const key = format(d, "MMM d");
      if (!map[key]) map[key] = { date: key, _raw: d.getTime(), count: 0 };
      map[key].count += 1;
    });

    const sorted = Object.values(map)
      .sort((a, b) => a._raw - b._raw)
      .slice(-14) // last 14 data points
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ _raw, ...rest }) => rest);

    const total = sorted.reduce((s, d) => s + d.count, 0);
    const avg = sorted.length ? total / sorted.length : 0;
    const half = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, half).reduce((s, d) => s + d.count, 0);
    const secondHalf = sorted.slice(half).reduce((s, d) => s + d.count, 0);
    const trendPct = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

    return { chartData: sorted, avgPerDay: avg, total7d: total, trend: trendPct };
  }, [rows]);

  const axisProps = { tick: { fontSize: 11, fill: axisColor }, axisLine: { stroke: axisColor }, tickLine: { stroke: axisColor } };

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg overflow-hidden shadow-sm flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Task Completion Trend</h2>
      </div>

      <div className="px-4 pt-3">
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: 280 }}>
            <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height: 280 }}>
            <p className="text-xs text-muted-foreground">No completed tasks</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" {...axisProps} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                name="Tasks Completed"
                stroke={CHART_COLORS.GREEN}
                strokeWidth={3}
                dot={{ r: 4, fill: "#fff", stroke: CHART_COLORS.GREEN }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="px-4 pb-3 flex flex-wrap gap-2 justify-center">
        {chartData.length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded-md">
              <span className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-400"/>
              Completed <span>{chartData.length}</span>
            </div>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="px-4 pb-4 grid grid-cols-3 gap-4">
          <div className="bg-border/30 rounded px-3 py-2">
            <p className="text-xs text-muted-foreground">Avg / Day</p>
            <p className="text-sm font-semibold text-foreground">{avgPerDay.toFixed(1)} tasks</p>
          </div>
          <div className="bg-border/30 rounded px-3 py-2">
            <p className="text-xs text-muted-foreground">Total (Period)</p>
            <p className="text-sm font-semibold text-foreground">{total7d} tasks</p>
          </div>
          <div className={`rounded px-3 py-2 ${trend >= 0 ? "bg-green-500/20" : "bg-red-500/10"}`}>
            <p className="text-xs text-muted-foreground">Trend</p>
            <p className={`text-sm font-semibold ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
              {trend >= 0 ? "+" : ""}{trend.toFixed(0)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

