"use client";

import React, { useMemo } from "react";
import { CalendarDays } from "lucide-react";
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

function dueDateLabel(date: any): string {
  if (!date) return "?";
  try {
    const d = typeof date === "string" ? new Date(date) : new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return "?"; }
}

export default function CriticalHighPriorityPanel({ rows, loading }: Props) {
  const critHighTasks = useMemo(
    () => rows
      .filter((r) => {
        const s = (r.severity_name ?? "").toLowerCase();
        return s === "critical" || s === "high";
      })
      .sort((a, b) => {
        const order: Record<string, number> = { critical: 0, high: 1 };
        return (order[(a.severity_name ?? "").toLowerCase()] ?? 2) - (order[(b.severity_name ?? "").toLowerCase()] ?? 2);
      }),
    [rows],
  );

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg overflow-hidden shadow-sm flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
        <h2 className="text-sm font-semibold">Critical / High Priority</h2>
        <div className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded-md">
          <span className="text-orange-500">{critHighTasks.length}</span>
          Critical / High
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center min-h-[280px]">
          <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin" />
        </div>
      ) : critHighTasks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center min-h-[280px]">
          <p className="text-xs text-muted-foreground">No critical or high priority tasks</p>
        </div>
      ) : (
        <div className="px-4 py-1 flex-1 min-h-[280px]">
          <div className="max-h-56 overflow-y-auto pr-1">
            {critHighTasks.map((r, i) => (
              <div
                key={r.task_id ?? i}
                className="flex items-center gap-2.5 py-2 border-b border-border last:border-0"
              >
                <Avatar className="w-7 h-7" title={r.assignee_full_name ?? "Unassigned"}>
                  <AvatarImage src={r.assignee_profile_pic} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-bold">
                    {getInitials(r.assignee_full_name)}
                  </AvatarFallback>
                </Avatar>

                <p className="flex-1 text-xs font-semibold text-foreground truncate min-w-0">
                  {r.task_name}
                </p>

                {r.severity_name && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] border border-border rounded-md font-semibold flex-shrink-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.severity_color ?? "#6b7280" }} />
                    {r.severity_name}
                  </span>
                )}

                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] border border-border rounded-md font-semibold flex-shrink-0">
                  <CalendarDays className="w-2.5 h-2.5 flex-shrink-0" />
                  {dueDateLabel(r.planned_due_date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}