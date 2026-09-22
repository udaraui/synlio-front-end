"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MULTI_SERIES_PALETTE } from "../chartColors";

interface Props {
  statusKpiRows: any[];
  dailyActivityRows: any[];
  loading?: boolean;
}

const FALLBACK_COLORS = MULTI_SERIES_PALETTE;

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs min-w-[140px]">
      <p className="font-semibold mb-1.5 text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.stroke ?? p.fill }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
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

export default function TicketStatusTrendChart({ statusKpiRows, dailyActivityRows, loading }: Props) {
  const axisColor = useAxisColor();
  const [chartType, setChartType] = useState<"daily" | "overall">("daily");

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const title = chartType === 'daily' ? "Daily Ticket Status" : "Overall Ticket Status";
  const rows = chartType === 'daily' ? statusKpiRows : dailyActivityRows;
  const dateKeyName = 'trend_date';
  const countKeyName = 'ticket_count';
  const statusKeyName = 'status_name';

  // ── Build stable color map keyed by status_name ──────────────────────────
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    let idx = 0;
    rows.forEach((r) => {
      if (r[statusKeyName] && !map[r[statusKeyName]]) {
        map[r[statusKeyName]] = r.status_color || FALLBACK_COLORS[idx++ % FALLBACK_COLORS.length];
      }
    });
    return map;
  }, [rows, statusKeyName]);

  const allStatuses = useMemo(() => Object.keys(colorMap), [colorMap]);
  const activeStatuses = selectedStatuses.length > 0 ? selectedStatuses : allStatuses;

  const toggleStatus = (s: string) => {
    setSelectedStatuses((prev) => {
      const current = prev.length > 0 ? prev : allStatuses;
      if (current.length === 1 && current.includes(s)) return current;
      return current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
    });
  };

  const chartData = useMemo(() => {
    const map: Record<string, { date: string; _raw: number; [key: string]: any }> = {};

    rows.forEach((r) => {
      let dateKey: string;
      let rawMs: number;

      if (r[dateKeyName]) {
        const d = parseISO(String(r[dateKeyName]));
        dateKey = format(d, "MMM d");
        rawMs = d.getTime();
      } else {
        dateKey = r.day_name ? r.day_name.substring(0, 3) : "—";
        rawMs = 0;
      }

      if (!map[dateKey]) map[dateKey] = { date: dateKey, _raw: rawMs };
      if (r[statusKeyName]) {
        map[dateKey][r[statusKeyName]] = parseInt(String(r[countKeyName]), 10) || 0;
      }
    });

    return Object.values(map)
      .sort((a, b) => a._raw - b._raw)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ _raw, ...rest }) => rest);
  }, [rows, dateKeyName, statusKeyName, countKeyName]);


  const axisProps = {
    tick: { fontSize: 11, fill: axisColor },
    axisLine: { stroke: axisColor },
    tickLine: { stroke: axisColor },
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg overflow-hidden shadow-sm flex flex-col h-full">

      {/* Header */}
      <div className="px-4 pr-2 py-2 border-b border-border flex items-center justify-between gap-2">
        <div>
          {/*<h2 className="text-sm font-semibold">{title}</h2>*/}
          <h2 className="text-sm font-semibold">Ticket Distribution</h2>
        </div>
        <div className="flex gap-1 bg-muted/40 border border-border rounded-lg p-0.5 flex-shrink-0">
          <Button size="sm" className="h-6 text-xs px-2.5"
            variant={chartType === "daily" ? "default" : "ghost"}
            onClick={() => setChartType("daily")}>Daily</Button>
          <Button size="sm" className="h-6 text-xs px-2.5"
            variant={chartType === "overall" ? "default" : "ghost"}
            onClick={() => setChartType("overall")}>Overall</Button>
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 pt-3 pb-1">
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: 260 }}>
            <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height: 260 }}>
            <p className="text-xs text-muted-foreground">No tickets</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="date" 
                {...axisProps} 
                interval={chartType === 'overall' ? 1 : "preserveEnd"}
              />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              {activeStatuses.map((s) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={colorMap[s]}
                  strokeWidth={2}
                  dot={{ r: 4, fill: colorMap[s] }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Custom badge legend — doubles as filter toggle */}
      {allStatuses.length > 0 && (
        <div className="px-4 pb-3 pt-2 flex flex-wrap gap-2 justify-center">
          {[...allStatuses]
            .sort((a, b) => (activeStatuses.includes(a) ? 0 : 1) - (activeStatuses.includes(b) ? 0 : 1))
            .map((s) => {
              const color = colorMap[s] ?? "#666";
              const isActive = activeStatuses.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  title={isActive ? "Click to remove from chart" : "Click to add to chart"}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium transition-opacity ${isActive ? "border" : "border border-dashed opacity-50"}`}
                >
                  {isActive ? (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  ) : (
                    <span className="w-3 h-3 flex-shrink-0 flex items-center justify-center font-bold leading-none text-sm">+</span>
                  )}
                  {s}
                  {isActive && <X className="w-3 h-3" />}
                </button>
              );
            })}
        </div>
      )}

    </div>
  );
}