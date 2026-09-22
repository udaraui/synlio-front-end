"use client";

import React, { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
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

export default function OverdueTasksPanel({ rows, loading }: Props) {
  const overdueTasks = useMemo(
    () => rows.filter((r) => r.is_overdue === true || r.is_overdue === "true" || r.is_overdue === 1)
      .sort((a, b) => (Number(b.days_overdue) || 0) - (Number(a.days_overdue) || 0)),
    [rows],
  );

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg overflow-hidden shadow-sm flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
        <h2 className="text-sm font-semibold">Overdue Tasks</h2>
        <div className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded-md">
          <span className="text-red-500">{overdueTasks.length}</span>
          Overdue
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center min-h-[280px]">
          <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin" />
        </div>
      ) : overdueTasks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center min-h-[280px]">
          <p className="text-xs text-muted-foreground">No overdue tasks</p>
        </div>
      ) : (
        <div className="px-3 py-2 flex-1 min-h-[280px]">
          <div className="max-h-56 overflow-y-auto divide-y divide-border">
            {overdueTasks.map((r, i) => (
              <div
                key={r.task_id ?? i}
                className="flex items-center gap-2 py-2 px-1 hover:bg-muted/40 transition-colors rounded-sm"
              >
                <p className="flex-1 text-xs font-medium text-foreground truncate min-w-0">
                  {r.task_name}
                </p>

                {r.severity_name && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 border rounded-md text-[10px] font-semibold flex-shrink-0"
                    style={{ borderColor: r.severity_color ?? "#e5e7eb", color: r.severity_color ?? "#6b7280" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.severity_color ?? "#6b7280" }} />
                    {r.severity_name}
                  </span>
                )}

                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-red-400 rounded-md text-[10px] font-semibold text-red-500 flex-shrink-0">
                  <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
                  {r.days_overdue}d
                </span>

                <Avatar className="w-5 h-5" title={r.assignee_full_name ?? "Unassigned"}>
                  <AvatarImage src={r.assignee_profile_pic} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-[9px] font-bold">
                    {getInitials(r.assignee_full_name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}