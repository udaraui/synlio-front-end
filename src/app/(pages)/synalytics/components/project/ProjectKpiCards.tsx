"use client";

import React from "react";
import { TrendingUp, CircleAlert, CircleCheck, Clock } from "lucide-react";

interface Props {
  dashboardRow: any | null;
  loading?: boolean;
}

function KpiCard({
  label, value, iconColor, loading,
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

export default function ProjectKpiCards({ dashboardRow, loading }: Props) {
  const row = dashboardRow ?? {};
  const progress = row.project_progress_pct != null ? `${Number(row.project_progress_pct).toFixed(1)}%` : "—";
  const health = row.space_health_score != null ? `${Number(row.space_health_score).toFixed(0)}/100` : "—";
  const overdue = row.overdue_tasks != null ? String(row.overdue_tasks) : "—";
  const total = row.total_tasks != null ? String(row.total_tasks) : "—";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard label="Project Progress" value={progress} loading={loading}
        icon={<TrendingUp className="h-5 w-5" />} iconBg="bg-green-500/10" iconColor="text-green-400" />
      <KpiCard label="Overdue Tasks" value={overdue} loading={loading}
        icon={<CircleAlert className="h-5 w-5" />} iconBg="bg-red-500/10" iconColor="text-red-400" />
      <KpiCard label="Health Score" value={health} loading={loading}
        icon={<CircleCheck className="h-5 w-5" />} iconBg="bg-blue-500/10" iconColor="text-blue-400" />
      <KpiCard label="Total Tasks" value={total} loading={loading}
        icon={<Clock className="h-5 w-5" />} iconBg="bg-cyan-500/10" iconColor="text-cyan-400" />
    </div>
  );
}
