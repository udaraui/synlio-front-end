"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { CHART_COLORS } from "../chartColors";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  skillGapRows: any[];
  loading?: boolean;
}

const PAGE_SIZE = 8;

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

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const fullName = payload[0]?.payload?.fullName ?? "";
  return (
    <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs min-w-[160px]">
      <p className="font-semibold mb-1.5 whitespace-nowrap">{fullName}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-3 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.fill ?? p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-semibold text-foreground">{Number(p.value).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

function CustomSkillXAxisTick({ x, y, payload, axisColor }: any) {
  const full = String(payload.value);
  const display = full.length > 10 ? full.slice(0, 10) + "…" : full;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={13} textAnchor="middle" fontSize={10} fill={axisColor}>
        {display}
      </text>
    </g>
  );
}

export default function SkillUtilizationChart({ skillGapRows, loading }: Props) {
  const axisColor = useAxisColor();
  const [page, setPage] = useState(0);

  const { data, totalPages } = useMemo(() => {
    const seen = new Map<string, number>();
    skillGapRows.forEach((r) => {
      const key = r.skill_name ?? "Unknown";
      if (!seen.has(key)) seen.set(key, Number(r.skill_utilization_pct ?? 0));
    });
    const allData = Array.from(seen.entries())
      .map(([name, utilization]) => ({ name, fullName: name, utilization }))
      .sort((a, b) => b.utilization - a.utilization);
      
    const totalPages = Math.ceil(allData.length / PAGE_SIZE);
    const paginatedData = allData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return { data: paginatedData, totalPages };
  }, [skillGapRows, page]);

  useEffect(() => { setPage(0); }, [skillGapRows]);

  const axisProps = {
    axisLine: { stroke: axisColor },
    tickLine: { stroke: axisColor },
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg overflow-hidden shadow-sm flex flex-col h-[420px]">
      <div className="px-4 py-3 border-b border-border flex-shrink-0 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Skill Utilization %</h2>
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
                interval={0}
                tick={(props) => <CustomSkillXAxisTick {...props} axisColor={axisColor} />}
              />
              <YAxis {...axisProps} tick={{ fontSize: 10, fill: axisColor }} domain={[0, 100]} unit="%" />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
              <Bar dataKey="utilization" name="Utilization %" fill={CHART_COLORS.GREEN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {!loading && (
        <div className="px-4 pb-3 flex-shrink-0 flex flex-wrap gap-2 justify-center">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded-md">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS.GREEN }} />
            Utilization %
          </div>
        </div>
      )}
    </div>
  );
}