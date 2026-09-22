"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { CHART_COLORS } from "../chartColors";

interface Props {
  dashboardRows: any[];
  isTaskView?: boolean;
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
    <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs min-w-[160px]">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.stroke }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-semibold text-foreground">{p.value} hrs</span>
        </div>
      ))}
    </div>
  );
}

export default function ProjectTimelineChart({ dashboardRows, isTaskView, loading }: Props) {
  const axisColor = useAxisColor();

  const { chartData, plannedEnd, actualEnd, delayDays } = useMemo(() => {
    if (!dashboardRows || dashboardRows.length === 0) return { chartData: [], plannedEnd: "—", actualEnd: "—", delayDays: 0 };

    let planned = 0;
    let actual = 0;

    if (isTaskView) {
      planned = dashboardRows.reduce((sum, row) => sum + (Number(row.estimate_effort_hrs) || 0), 0);
      actual = dashboardRows.reduce((sum, row) => sum + (Number(row.actual_effort_hrs) || 0), 0);
    } else {
      planned = dashboardRows.reduce((sum, row) => sum + (Number(row.total_planned_effort_hrs) || 0), 0);
      actual = dashboardRows.reduce((sum, row) => sum + (Number(row.total_actual_effort_hrs) || 0), 0);
    }

    // Build a simple 4-point cumulative effort curve
    const points = [
      { week: "Start", Planned: 0, Actual: 0 },
      { week: "25%", Planned: Math.round(planned * 0.25), Actual: Math.round(actual * 0.25) },
      { week: "50%", Planned: Math.round(planned * 0.50), Actual: Math.round(actual * 0.50) },
      { week: "75%", Planned: Math.round(planned * 0.75), Actual: Math.round(actual * 0.75) },
      { week: "End", Planned: planned, Actual: actual },
    ];

    const latestPlannedEndTime = dashboardRows.reduce((latest, row) => {
      const dateVal = isTaskView ? row.planned_due_date : row.latest_planned_end;
      if (!dateVal) return latest;
      const date = new Date(dateVal).getTime();
      return date > latest ? date : latest;
    }, 0);

    const latestActualEndTime = dashboardRows.reduce((latest, row) => {
      const dateVal = isTaskView ? row.actual_end_date : row.latest_actual_end;
      if (!dateVal) return latest;
      const date = new Date(dateVal).getTime();
      return date > latest ? date : latest;
    }, 0);

    const maxDelayDays = dashboardRows.reduce((max, row) => {
      const delay = Number(isTaskView ? row.schedule_variance_days : row.schedule_delay_days) || 0;
      return delay > max ? delay : max;
    }, 0);

    const fmt = (d: any) => {
      if (!d) return "—";
      try { return format(new Date(d), "MMM d, yyyy"); } catch { return "—"; }
    };

    return {
      chartData: points,
      plannedEnd: fmt(latestPlannedEndTime || null),
      actualEnd: fmt(latestActualEndTime || null),
      delayDays: maxDelayDays,
    };
  }, [dashboardRows, isTaskView]);

  const axisProps = { tick: { fontSize: 11, fill: axisColor }, axisLine: { stroke: axisColor }, tickLine: { stroke: axisColor } };

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg overflow-hidden shadow-sm flex flex-col h-[465px]">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Planned vs. Actual Timeline</h2>
      </div>

      <div className="px-4 pt-3">
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin" />
          </div>
        ) : !dashboardRows || dashboardRows.length === 0 ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-xs text-muted-foreground">No data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="Planned" stroke={CHART_COLORS.BLUE} strokeWidth={2} dot={{ r: 3, fill: "#fff", stroke: CHART_COLORS.BLUE }} />
              <Line type="monotone" dataKey="Actual" stroke={CHART_COLORS.ORANGE} strokeWidth={2} dot={{ r: 3, fill: "#fff", stroke: CHART_COLORS.ORANGE }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {!loading && (
        <div className="px-4 pb-3 flex flex-wrap gap-2 justify-center">
          {[
            { label: "Planned", color: CHART_COLORS.BLUE },
            { label: "Actual", color: CHART_COLORS.ORANGE },
          ].map((item) => (
            <div key={item.label} className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded-md">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      )}

      <div className="px-4 pb-4 grid grid-cols-3 gap-4">
        <div className="bg-border/30 rounded px-3 py-2">
          <p className="text-xs text-muted-foreground">Planned End</p>
          <p className="text-sm font-semibold text-foreground">{plannedEnd}</p>
        </div>
        <div className="bg-border/30 rounded px-3 py-2">
          <p className="text-xs text-muted-foreground">Actual End (Est.)</p>
          <p className="text-sm font-semibold text-foreground">{actualEnd}</p>
        </div>
        <div className="bg-border/30 rounded px-3 py-2">
          <p className="text-xs text-muted-foreground">Delivery</p>
          {/*<p className={`text-sm font-semibold ${delayDays > 0 ? "text-red-400" : "text-green-400"}`}>*/}
          {/*  {delayDays > 0 ? `+${delayDays}d` : delayDays === 0 ? "On Track" : `${delayDays}d`}*/}
          {/*</p>*/}
          <p className={`text-sm font-semibold ${delayDays > 0 ? "text-red-400" : "text-green-400"}`}>
            {delayDays > 0 ? `+${delayDays}d Late` : delayDays === 0 ? "On Time" : `${delayDays}d Early`}
          </p>
        </div>
      </div>
    </div>
  );
}