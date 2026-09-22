"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
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

function CustomTooltip({ active, payload, label, symbol }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs min-w-[160px]">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.fill ?? p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-semibold text-foreground">{symbol}{Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function CostByDivisionChart({ rows, loading }: Props) {
  const axisColor = useAxisColor();

  const data = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const div = r.division_name ?? "Unknown";
      map.set(div, (map.get(div) ?? 0) + Number(r.monthly_cost ?? 0));
    });
    return Array.from(map.entries())
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 8);
  }, [rows]);

  const currency = rows[0]?.currency_code ?? "";
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "";

  const axisProps = {
    axisLine: { stroke: axisColor },
    tickLine: { stroke: axisColor },
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg overflow-hidden shadow-sm flex flex-col">
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <h2 className="text-sm font-semibold">Cost by Division (Monthly)</h2>
      </div>

      <div className="px-4 pt-3">
        {loading ? (
          <div className="flex items-center justify-center h-[250px]">
            <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[250px]">
            <p className="text-xs text-muted-foreground">No data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: 10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" {...axisProps} tick={{ fontSize: 10, fill: axisColor }} />
              <YAxis
                {...axisProps}
                tick={{ fontSize: 10, fill: axisColor }}
                tickFormatter={(v) => `${symbol}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip content={<CustomTooltip symbol={symbol} />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
              <Bar dataKey="cost" name="Monthly Cost" fill={CHART_COLORS.BLUE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {!loading && (
        <div className="px-4 pb-3 flex-shrink-0 flex flex-wrap gap-2 justify-center">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded-md">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS.BLUE }} />
            Monthly Cost
          </div>
        </div>
      )}

      {data.length > 0 && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-2 border-t border-border pt-3">
          {data.map((d, i) => (
            <div key={i} className="text-xs">
              <p className="font-semibold text-foreground truncate">{d.name}</p>
              <p className="text-muted-foreground">{symbol}{d.cost.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
