"use client";

import React, { useMemo } from "react";

interface Props {
  statusKpiRows: any[];
  dashboardRows: any[];
  recentListRows: any[];
  loading?: boolean;
}

function avg(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function KpiCard({ label, value, color, sub, loading }: {
  label: string; value: string; color: string; sub?: string; loading?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg p-4 shadow-sm">
      <p className="text-sm font-semibold mb-1">{label}</p>
      {loading ? (
        <div className="flex items-center h-8 mt-1">
          <div className="w-6 h-6 rounded-full border-4 border-border border-t-primary animate-spin" />
        </div>
      ) : (
        <div className="flex items-baseline gap-1.5">
          <h3 className={`text-2xl font-bold ${color}`}>{value}</h3>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      )}
    </div>
  );
}

export default function KeyInsightsPanel({ statusKpiRows, dashboardRows, recentListRows, loading }: Props) {
  const kpi = useMemo(() => {
    const resolution   = statusKpiRows.map((r) => Number(r.avg_resolution_hrs)).filter((v) => v > 0);
    const response     = statusKpiRows.map((r) => Number(r.avg_response_hrs)).filter((v) => v > 0);
    const rate         = statusKpiRows.map((r) => Number(r.resolution_rate_pct)).filter((v) => v > 0);
    
    // Use recentListRows for breach counts
    const slaBreachResponse   = recentListRows.filter(r => r.sla_response_status === 'breached').length;
    const slaBreachResolution = recentListRows.filter(r => r.sla_resolution_status === 'breached').length;
    const totalTickets = recentListRows.length;

    return {
      avgResolution: avg(resolution).toFixed(1),
      avgResponse:   avg(response).toFixed(1),
      resolutionRate: avg(rate).toFixed(1),
      slaBreachResponse,
      slaBreachResolution,
      totalTickets,
    };
  }, [statusKpiRows, dashboardRows, recentListRows]);

  const pct = (val: number) =>
    kpi.totalTickets > 0 ? `(${((val / kpi.totalTickets) * 100).toFixed(1)}%)` : "";

  return (
    <div className="grid grid-cols-4 gap-3">
      <KpiCard label="Avg Resolution"    color="text-blue-400"  value={`${kpi.avgResolution}h`}  loading={loading} />
      <KpiCard label="Avg Response Time" color="text-blue-400"  value={`${kpi.avgResponse}h`}    loading={loading} />
      <KpiCard label="Resolution Rate"   color="text-green-400" value={`${kpi.resolutionRate}%`} loading={loading} />

      {/* SLA Breach — split card */}
      <div className="bg-white dark:bg-gray-800 border border-border rounded-lg p-4 shadow-sm">
        <p className="text-sm font-semibold mb-1">SLA Breach</p>
        {loading ? (
          <div className="flex items-center h-8 mt-1">
            <div className="w-6 h-6 rounded-full border-4 border-border border-t-primary animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-border mt-1">
            <div className="pr-3">
              <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Response</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-red-400 leading-tight">{kpi.slaBreachResponse}</span>
                {pct(kpi.slaBreachResponse) && <span className="text-xs text-muted-foreground">{pct(kpi.slaBreachResponse)}</span>}
              </div>
            </div>
            <div className="pl-3">
              <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Resolution</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-red-400 leading-tight">{kpi.slaBreachResolution}</span>
                {pct(kpi.slaBreachResolution) && <span className="text-xs text-muted-foreground">{pct(kpi.slaBreachResolution)}</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}