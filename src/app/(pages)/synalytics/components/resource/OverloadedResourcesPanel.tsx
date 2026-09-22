"use client";

import React from "react";
import { TriangleAlert } from "lucide-react";
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

export default function OverloadedResourcesPanel({ rows, loading }: Props) {
  const overloaded = rows
    .filter((r) => r.workload_status === "Overloaded" || (Number(r.utilization_pct ?? 0) > 90))
    .sort((a, b) => Number(b.utilization_pct ?? 0) - Number(a.utilization_pct ?? 0))
    .slice(0, 6);

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg overflow-hidden shadow-sm flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold">Overloaded Resources Alert</h2>
        <TriangleAlert className="h-4 w-4 text-red-400 flex-shrink-0" />
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center min-h-[280px]">
          <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin" />
        </div>
      ) : overloaded.length === 0 ? (
        <div className="flex flex-1 items-center justify-center min-h-[280px]">
          <p className="text-xs text-muted-foreground text-center px-4">No overloaded resources.</p>
        </div>
      ) : (
        <div className="px-4 py-1 flex-1 min-h-[280px]">
          {overloaded.map((r, i) => {
            const util = Number(r.utilization_pct ?? 0).toFixed(0);
            const hrs = Number(r.allocated_effort_hrs ?? 0).toFixed(0);
            const overdue = r.overdue_task_count ?? 0;
            const activeTasks = r.active_task_count ?? 0;
            return (
              <div key={i} className="flex items-center gap-2.5 py-2 px-2 border-b border-border">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={r.profile_pic} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-bold">
                    {getInitials(r.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{r.full_name}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs border border-border rounded-md bg-white dark:bg-gray-800">
                      <span className="font-semibold">{activeTasks}</span> active tasks
                    </span>
                    {overdue > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs border border-border rounded-md bg-white dark:bg-gray-800">
                        <span className="font-semibold text-red-500">{overdue}</span> overdue
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs border border-border rounded-md bg-white dark:bg-gray-800">
                    <span className="font-semibold">{hrs}h</span> allocated
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs border border-border rounded-md bg-white dark:bg-gray-800">
                    <span className="font-semibold text-red-500">{util}%</span> utilized
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}