"use client";

import React from "react";
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

export default function AvailableResourcesPanel({ rows, loading }: Props) {
  const available = rows
    .filter((r) => r.workload_status === "Available" || Number(r.free_hours_this_week ?? 0) > 0)
    .sort((a, b) => Number(b.free_hours_this_week ?? 0) - Number(a.free_hours_this_week ?? 0))
    .slice(0, 6);

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg overflow-hidden shadow-sm flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <h2 className="text-sm font-semibold">Available Resources</h2>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center min-h-[280px]">
          <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin" />
        </div>
      ) : available.length === 0 ? (
        <div className="flex flex-1 items-center justify-center min-h-[280px]">
          <p className="text-xs text-muted-foreground text-center px-4">No available resources found.</p>
        </div>
      ) : (
        <div className="px-4 py-1 flex-1 min-h-[280px]">
          {available.map((r, i) => {
            const skills = r.skill_list
              ? String(r.skill_list).split(",").map((s: string) => s.trim()).filter(Boolean).slice(0, 3)
              : [];
            const freeHrs = Number(r.free_hours_this_week ?? 0).toFixed(0);
            const util = Number(r.utilization_pct ?? 0).toFixed(0);
            return (
              <div key={i} className="flex items-center gap-2.5 py-2 border-b border-border last:border-0">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={r.profile_pic} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-bold">
                    {getInitials(r.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{r.full_name}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {skills.map((sk: string, si: number) => (
                      <span key={si} className="inline-flex items-center px-2 py-0.5 text-[11px] border border-border rounded-md text-muted-foreground">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs border rounded-md">
                        <span className="font-semibold">{util}%</span> utilized
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs border rounded-md">
                        <span className="font-semibold text-green-600">{freeHrs}h</span> free
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