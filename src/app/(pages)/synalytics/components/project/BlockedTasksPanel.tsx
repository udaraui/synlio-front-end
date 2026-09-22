"use client";

import React, { useMemo } from "react";
import { Link } from "lucide-react";
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

export default function BlockedTasksPanel({ rows, loading }: Props) {
  const blockedTasks = useMemo(
    () => rows.filter((r) => String(r.status_base).toLowerCase() === "blocked"),
    [rows],
  );

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg overflow-hidden shadow-sm flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
        <h2 className="text-sm font-semibold">Blocked Tasks &amp; Dependencies</h2>
        <div className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded-md">
          <span className="text-red-500">{blockedTasks.length}</span>
          Blocked
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center min-h-[280px]">
          <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin" />
        </div>
      ) : blockedTasks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center min-h-[280px]">
          <p className="text-xs text-muted-foreground">No blocked tasks</p>
        </div>
      ) : (
        <div className="px-4 py-1 flex-1 min-h-[280px]">
          <div className="max-h-56 overflow-y-auto">
            {blockedTasks.map((r, i) => (
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

                {r.status_name && (
                  <span className="inline-flex items-center px-2 py-0.5 text-[11px] border border-border rounded-md text-muted-foreground flex-shrink-0">
                    {r.status_name}
                  </span>
                )}

                {r.linked_task_count > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] border border-border rounded-md text-muted-foreground flex-shrink-0">
                    <Link className="w-2.5 h-2.5 flex-shrink-0" />
                    {r.linked_task_count}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}