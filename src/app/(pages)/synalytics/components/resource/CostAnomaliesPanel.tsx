"use client";

import React from "react";
import { TriangleAlert } from "lucide-react";
import { CHART_COLORS } from "../chartColors";
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

const SEVERITY_CONFIG: Record<string, { dot: string; text: string; border: string }> = {
  High: { dot: CHART_COLORS.RED, text: "text-red-400", border: "border-red-400/50" },
  Medium: { dot: CHART_COLORS.ORANGE, text: "text-orange-400", border: "border-orange-400/50" },
  Low: { dot: CHART_COLORS.AMBER, text: "text-amber-400", border: "border-amber-400/50" },
};

export default function CostAnomaliesPanel({ rows, loading }: Props) {
  const anomalies = rows.filter((r) => r.anomaly_type && r.anomaly_type !== "None" && r.anomaly_type !== null);

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg overflow-hidden shadow-sm flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold">Cost Anomalies &amp; Alerts</h2>
        <TriangleAlert className="h-4 w-4 text-red-400 flex-shrink-0" />
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center min-h-[280px]">
          <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin" />
        </div>
      ) : anomalies.length === 0 ? (
        <div className="flex flex-1 items-center justify-center min-h-[280px]">
          <p className="text-xs text-muted-foreground text-center px-4">No anomalies detected.</p>
        </div>
      ) : (
        <div className="px-4 py-1 flex-1 min-h-[280px]">
          {anomalies.slice(0, 6).map((r, i) => {
            const sev = r.anomaly_severity ?? "Low";
            const cfg = SEVERITY_CONFIG[sev] ?? SEVERITY_CONFIG.Low;
            return (
              <div key={i} className="flex items-center gap-2.5 py-2 px-1 border-b border-border">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={r.profile_pic} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-bold">
                    {getInitials(r.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{r.full_name}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {r.division_name && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs border border-border rounded-md">
                        <span className="font-semibold text-primary">{r.division_name}</span> division
                      </span>
                    )}
                    {r.monthly_cost != null && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs border rounded-md">
                        <span className="font-semibold">{Number(r.monthly_cost).toLocaleString()}</span> monthly cost
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs border font-semibold rounded-md`}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
                    {r.anomaly_type}
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