"use client";

import React from "react";
import { CHART_COLORS } from "../chartColors";

interface Props {
  skillGapRows: any[];
  loading?: boolean;
}

const GAP_STATUS_CONFIG: Record<string, { text: string; border: string; dot: string }> = {
  Critical: { text: "text-red-400",    border: "border-red-400/50",    dot: CHART_COLORS.RED    },
  Warning:  { text: "text-amber-400",  border: "border-amber-400/50",  dot: CHART_COLORS.AMBER  },
  Balanced: { text: "text-green-500",  border: "border-green-500/50",  dot: CHART_COLORS.GREEN  },
  Surplus:  { text: "text-purple-400", border: "border-purple-400/50", dot: CHART_COLORS.PURPLE },
};

export default function SkillGapTable({ skillGapRows, loading }: Props) {
  const seen = new Set<string>();
  const rows = skillGapRows
    .filter((r) => {
      if (seen.has(r.skill_name)) return false;
      seen.add(r.skill_name);
      return true;
    })
    .slice(0, 50);

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg overflow-hidden shadow-sm flex flex-col h-[420px]">
      {/* Card header */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <h2 className="text-sm font-semibold">Skill Coverage Gap Analysis</h2>
      </div>

      {/* Table area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">No skill gap data available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto h-full">
            <div className="overflow-y-auto" style={{ maxHeight: "calc(9 * 36px + 36px)" }}>
              <table className="w-full text-xs table-fixed border-collapse">
                <colgroup>
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "24%" }} />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-white dark:bg-gray-800">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-semibold">Skill</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-semibold">Category</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-semibold">Req.</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-semibold">Avail.</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-semibold">Gap</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-semibold">Util %</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const gap = Number(r.gap_count ?? 0);
                    const gapDisplay = gap > 0 ? `-${gap}` : gap < 0 ? `+${Math.abs(gap)}` : "0";
                    const gapColor = gap > 0 ? "text-red-400" : gap < 0 ? "text-cyan-400" : "text-muted-foreground";
                    const statusCfg = GAP_STATUS_CONFIG[r.gap_status ?? ""] ?? { text: "text-muted-foreground", border: "border-border", dot: "#94a3b8" };
                    return (
                      <tr key={i} className="border-b border-border hover:bg-muted/30" style={{ height: 36 }}>
                        <td className="py-2 px-2 text-foreground font-medium truncate">{r.skill_name}</td>
                        <td className="py-2 px-2 text-muted-foreground truncate">{r.skill_category_name}</td>
                        <td className="text-right py-2 px-2 text-blue-400 font-bold">{r.required_count ?? "—"}</td>
                        <td className="text-right py-2 px-2 text-green-400 font-bold">{r.resources_with_skill ?? "—"}</td>
                        <td className="text-right py-2 px-2">
                          <span className={`font-bold ${gapColor}`}>{gapDisplay}</span>
                        </td>
                        <td className="text-right py-2 px-2">
                          {r.skill_utilization_pct != null ? `${Number(r.skill_utilization_pct).toFixed(1)}` : "—"}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs border font-semibold rounded-md`}>
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusCfg.dot }} />
                            {r.gap_status ?? "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
