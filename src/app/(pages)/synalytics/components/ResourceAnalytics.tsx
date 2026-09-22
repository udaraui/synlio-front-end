"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  getResourceDashboard,
  getResourceSkillGap,
} from "@/services/synalytics/resource-analytics.service";
import ResourceUtilizationChart from "./resource/ResourceUtilizationChart";
import WorkloadDistributionChart from "./resource/WorkloadDistributionChart";
import SkillUtilizationChart from "./resource/SkillUtilizationChart";
import SkillGapTable from "./resource/SkillGapTable";
import CapacityVsDemandChart from "./resource/CapacityVsDemandChart";
import OverloadedResourcesPanel from "./resource/OverloadedResourcesPanel";
import AvailableResourcesPanel from "./resource/AvailableResourcesPanel";
import CostByDivisionChart from "./resource/CostByDivisionChart";
import CostAnomaliesPanel from "./resource/CostAnomaliesPanel";
import KpiStatCard from "./KpiStatCard";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import type { CardDefault, CardWidth } from "@/hooks/use-dashboard-layout";
import { DashboardGrid } from "@/components/dashboards/DashboardGrid";

// ── Default layout ────────────────────────────────────────────────────────────
const DEFAULT_CARDS: CardDefault[] = [
  { id: "kpi-cost-mtd",          label: "Resource Cost (MTD)",       width: "1/4" },
  { id: "kpi-avg-cost",          label: "Avg Cost/Resource",         width: "1/4" },
  { id: "kpi-resource-overview", label: "Resource Overview",         width: "1/4" },
  { id: "kpi-avg-utilization",   label: "Avg Utilization",           width: "1/4" },
  { id: "resource-utilization",  label: "Resource Utilization",      width: "1/2" },
  { id: "workload-distribution", label: "Workload Distribution",     width: "1/2" },
  { id: "skill-utilization",     label: "Skill Utilization",         width: "1/2" },
  { id: "skill-gap",             label: "Skill Gap Table",           width: "1/2" },
  { id: "capacity-demand",       label: "Capacity vs. Demand",        width: "full" },
  { id: "overloaded-resources",  label: "Overloaded Resources",      width: "1/2" },
  { id: "available-resources",   label: "Available Resources",       width: "1/2" },
  { id: "cost-by-division",      label: "Cost by Division",          width: "1/2" },
  { id: "cost-anomalies",        label: "Cost Anomalies",            width: "1/2" },
];

/** Minimum allowed widths per card — confirmed by user. */
const MIN_WIDTHS: Partial<Record<string, CardWidth>> = {
  "capacity-demand": "full",
};

export default function ResourceAnalytics({
  isCustomizing,
  onCustomizingChange,
  onResetRegister,
  onSaveStatusChange,
}: {
  isCustomizing?: boolean;
  onCustomizingChange?: (v: boolean) => void;
  onResetRegister?: (fn: () => void) => void;
  onSaveStatusChange?: (s: string) => void;
} = {}) {
  // ── Layout hook ────────────────────────────────────────────────────────────
  const { cards, sortedVisible, loaded, saveStatus, toggleVisibility, reorder, reorderAll, updateWidth, resetToDefault } =
    useDashboardLayout("synalytics_resource", DEFAULT_CARDS);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onResetRegister?.(resetToDefault); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onSaveStatusChange?.(saveStatus); }, [saveStatus]);

  // ── Data ───────────────────────────────────────────────────────────────────
  const [dashboardRows, setDashboardRows] = useState<any[]>([]);
  const [skillGapRows, setSkillGapRows]   = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    const load = async () => {
      const activeCompany = JSON.parse(localStorage.getItem("active_company") || "null");
      const companyId = activeCompany?.companyId ?? activeCompany?.id;
      if (!companyId) return;
      setLoading(true);
      try {
        const [dashboard, skillGap] = await Promise.all([
          getResourceDashboard({ companyId: Number(companyId) }),
          getResourceSkillGap({ companyId: Number(companyId) }),
        ]);
        setDashboardRows(dashboard ?? []);
        setSkillGapRows(skillGap ?? []);
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    load();
  }, []);

  // ── Card renderer ──────────────────────────────────────────────────────────
  const renderCard = (id: string) => {
    const first = dashboardRows[0] ?? {};
    const currency = first.currency_code ?? "";
    const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "";
    const fmt = (n: any) => {
      if (n == null) return "—";
      const num = Number(n); if (isNaN(num)) return "—";
      if (num >= 1_000_000) return `${sym}${(num / 1_000_000).toFixed(1)}M`;
      if (num >= 1_000)     return `${sym}${(num / 1_000).toFixed(1)}K`;
      return `${sym}${num.toFixed(0)}`;
    };
    switch (id) {
      case "kpi-cost-mtd": return <KpiStatCard label="Resource Cost (MTD)" value={fmt(first.total_cost_mtd)}        color="text-blue-400"  loading={loading} />;
      case "kpi-avg-cost": return <KpiStatCard label="Avg Cost/Resource"   value={fmt(first.avg_cost_per_resource)} color="text-green-400" loading={loading} />;
      case "kpi-resource-overview":
        return (
          <div className="bg-white dark:bg-gray-800 border border-border rounded-lg p-4 h-full">
            <p className="text-sm font-semibold mb-1">Resources</p>
            {loading ? (
              <div className="flex items-center h-8 mt-1"><div className="w-6 h-6 rounded-full border-4 border-border border-t-primary animate-spin" /></div>
            ) : (
              <div className="grid grid-cols-4 divide-x divide-border mt-1">
                <div className="pr-2">
                  <p className="text-2xl font-bold text-blue-400 leading-tight">
                    {first.total_resources ?? "—"}<span className="text-xs text-muted-foreground font-semibold ml-0.5"> Total</span>
                  </p>
                </div>
                <div className="px-2">
                  <p className="text-2xl font-bold text-green-400 leading-tight">
                    {first.active_resources ?? "—"}<span className="text-xs text-muted-foreground font-semibold ml-0.5"> Active</span>
                  </p>
                </div>
                <div className="px-2">
                  <p className="text-2xl font-bold text-cyan-400 leading-tight">
                    {first.available_count ?? "—"}<span className="text-xs text-muted-foreground font-semibold ml-0.5"> Avail.</span>
                  </p>
                </div>
                <div className="pl-2">
                  <p className="text-2xl font-bold text-red-400 leading-tight">
                    {first.overloaded_count ?? "—"}<span className="text-xs text-muted-foreground font-semibold ml-0.5"> Overload</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      case "kpi-avg-utilization":  return <KpiStatCard label="Avg Utilization" value={first.avg_utilization_pct != null ? `${Number(first.avg_utilization_pct).toFixed(1)}%` : "—"} color="text-green-400" loading={loading} />;
      case "resource-utilization":  return <ResourceUtilizationChart rows={dashboardRows} loading={loading} />;
      case "workload-distribution": return <WorkloadDistributionChart rows={dashboardRows} loading={loading} />;
      case "skill-utilization":     return <SkillUtilizationChart skillGapRows={skillGapRows} loading={loading} />;
      case "skill-gap":             return <SkillGapTable skillGapRows={skillGapRows} loading={loading} />;
      case "capacity-demand":       return <CapacityVsDemandChart rows={dashboardRows} loading={loading} />;
      case "overloaded-resources":  return <OverloadedResourcesPanel rows={dashboardRows} loading={loading} />;
      case "available-resources":   return <AvailableResourcesPanel rows={dashboardRows} loading={loading} />;
      case "cost-by-division":      return <CostByDivisionChart rows={dashboardRows} loading={loading} />;
      case "cost-anomalies":        return <CostAnomaliesPanel rows={dashboardRows} loading={loading} />;
      default: return null;
    }
  };

  return (
    <div className="pt-3">
      <DashboardGrid
        cards={cards}
        sortedVisible={sortedVisible}
        loaded={loaded}
        saveStatus={saveStatus}
        onReorder={reorder}
        onReorderAll={reorderAll}
        onWidthChange={updateWidth}
        onToggle={toggleVisibility}
        renderCard={renderCard}
        minWidths={MIN_WIDTHS}
        skeletonCount={6}
        skeletonColClass="col-span-2"
        isCustomizing={isCustomizing}
      />
    </div>
  );
}
