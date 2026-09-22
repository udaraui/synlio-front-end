"use client";

import React from "react";
import { DollarSign, TrendingUp, CircleAlert, Users, Zap } from "lucide-react";

interface Props {
  rows: any[];
  loading?: boolean;
}

function KpiCard({label, value, iconColor, loading,
}: {
  label: string; value: string;
  icon: React.ReactNode; iconBg: string; iconColor: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg p-4 shadow-sm">
      <p className="text-sm font-semibold mb-1">{label}</p>
      {loading ? (
        <div className="flex items-center h-8 mt-1">
          <div className="w-6 h-6 rounded-full border-4 border-border border-t-primary animate-spin" />
        </div>
      ) : (
        <h3 className={`text-2xl font-bold ${iconColor}`}>{value}</h3>
      )}
    </div>
  );
}

function fmt(n: any, currency?: string) {
  if (n == null) return "—";
  const num = Number(n);
  if (isNaN(num)) return "—";
  const symbol = currency ?? "";
  if (num >= 1_000_000) return `${symbol}${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${symbol}${(num / 1_000).toFixed(1)}K`;
  return `${symbol}${num.toFixed(0)}`;
}

export default function ResourceKpiCards({ rows, loading }: Props) {
  const first = rows[0] ?? {};
  const currency = first.currency_code ?? "";
  const currencySymbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "";

  const totalCostMtd = fmt(first.total_cost_mtd, currencySymbol);
  const avgCost = fmt(first.avg_cost_per_resource, currencySymbol);
  const highestCost = fmt(first.highest_cost, currencySymbol);
  const activeResources = first.active_resources != null ? String(first.active_resources) : "—";
  const totalResources = first.total_resources != null ? String(first.total_resources) : "—";
  const avgUtilization = first.avg_utilization_pct != null ? `${Number(first.avg_utilization_pct).toFixed(1)}%` : "—";
  const overloadedCount = first.overloaded_count != null ? String(first.overloaded_count) : "—";
  const availableCount = first.available_count != null ? String(first.available_count) : "—";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Resource Cost (MTD)" value={totalCostMtd} loading={loading}
          icon={<DollarSign className="h-5 w-5" />} iconBg="bg-blue-500/10" iconColor="text-blue-400" />
        <KpiCard label="Average Cost per Resource" value={avgCost} loading={loading}
          icon={<TrendingUp className="h-5 w-5" />} iconBg="bg-green-500/10" iconColor="text-green-400" />
        <KpiCard label="Highest Cost Resource" value={highestCost} loading={loading}
          icon={<CircleAlert className="h-5 w-5" />} iconBg="bg-orange-500/10" iconColor="text-orange-400" />
        <KpiCard label="Active Resources" value={activeResources} loading={loading}
          icon={<Users className="h-5 w-5" />} iconBg="bg-cyan-500/10" iconColor="text-cyan-400" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Resources" value={totalResources} loading={loading}
          icon={<Users className="h-5 w-5" />} iconBg="bg-blue-500/10" iconColor="text-blue-400" />
        <KpiCard label="Average Utilization" value={avgUtilization} loading={loading}
          icon={<TrendingUp className="h-5 w-5" />} iconBg="bg-green-500/10" iconColor="text-green-400" />
        <KpiCard label="Overloaded Count" value={overloadedCount} loading={loading}
          icon={<CircleAlert className="h-5 w-5" />} iconBg="bg-red-500/10" iconColor="text-red-400" />
        <KpiCard label="Available" value={availableCount} loading={loading}
          icon={<Zap className="h-5 w-5" />} iconBg="bg-cyan-500/10" iconColor="text-cyan-400" />
      </div>
    </div>
  );
}
