"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { CHART_COLORS } from "../chartColors";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  rows: any[];
  loading?: boolean;
  selectedTask?: any;
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
  const data = payload[0].payload;
  const displayLabel = data.fullName || label;

  return (
    <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs min-w-[160px]">
      <p className="font-semibold mb-1.5">{displayLabel}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.fill }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

const PAGE_SIZE = 8;

export default function EffortAnalysisChart({ rows, loading, selectedTask }: Props) {
  const axisColor = useAxisColor();
  const [page, setPage] = useState(0);

  const { chartData, totalPages } = useMemo(() => {
    const taskMap = new Map(rows.map(t => [t.task_id, t]));
    const childrenMap = new Map<number, any[]>();
    rows.forEach(t => {
      if (t.parent_task_id) {
        if (!childrenMap.has(t.parent_task_id)) childrenMap.set(t.parent_task_id, []);
        childrenMap.get(t.parent_task_id)!.push(t);
      }
    });

    let data;

    if (selectedTask) {
      const directChildren = childrenMap.get(selectedTask.task_id) ?? [];

      const getDescendantLeaves = (parentTask: any): any[] => {
        const leaves: any[] = [];
        const queue: any[] = [parentTask];
        while (queue.length > 0) {
          const current = queue.shift()!;
          const children = childrenMap.get(current.task_id);
          if (children) {
            queue.push(...children);
          } else {
            leaves.push(current);
          }
        }
        return leaves;
      };

      data = directChildren.map(child => {
        const descendantLeaves = getDescendantLeaves(child);
        const onTime = descendantLeaves.filter(l => !l.is_overdue).length;
        const overdue = descendantLeaves.filter(l => l.is_overdue).length;
        return { name: child.task_code, fullName: child.task_name, onTime, overdue };
      });

    } else {
      const findRoot = (task: any): any => {
        if (task.parent_task_id) {
          const parent = taskMap.get(task.parent_task_id);
          if (parent) return findRoot(parent);
        }
        return task;
      };

      const leafTasks = rows.filter(t => !childrenMap.has(t.task_id));
      const grouped = new Map<string, { name: string, fullName: string, onTime: number, overdue: number }>();

      leafTasks.forEach(t => {
        const root = findRoot(t);
        const key = root?.task_code ?? "Unknown";
        if (!grouped.has(key)) grouped.set(key, { name: key, fullName: root?.task_name ?? "Unknown", onTime: 0, overdue: 0 });

        const group = grouped.get(key)!;
        if (t.is_overdue) {
          group.overdue += 1;
        } else {
          group.onTime += 1;
        }
      });
      data = Array.from(grouped.values());
    }

    const totalPages = Math.ceil(data.length / PAGE_SIZE);
    const paginatedData = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return { chartData: paginatedData, totalPages };
  }, [rows, page, selectedTask]);

  useEffect(() => { setPage(0); }, [rows, selectedTask]);

  const axisProps = { tick: { fontSize: 11, fill: axisColor }, axisLine: { stroke: axisColor }, tickLine: { stroke: axisColor } };

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg overflow-hidden shadow-sm flex flex-col h-[420px]">
      <div className="px-4 py-3 border-b border-border flex-shrink-0 flex items-center justify-between">
        <h2 className="text-sm font-semibold">On time vs. Overdue Tasks</h2>
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
              <YAxis {...axisProps} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
              <Bar dataKey="onTime" fill={CHART_COLORS.GREEN} name="On time" radius={[4, 4, 0, 0]} />
              <Bar dataKey="overdue" fill={CHART_COLORS.RED} name="Overdue" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {!loading && (
        <div className="px-4 pb-2 flex-shrink-0 flex flex-wrap gap-2 justify-center border-border pt-2">
          {[
            { label: "On time", color: CHART_COLORS.GREEN },
            { label: "Overdue", color: CHART_COLORS.RED },
          ].map((item) => (
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