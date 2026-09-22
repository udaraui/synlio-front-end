"use client";

import React from "react";

interface Props {
  label: string;
  value: string;
  color?: string;
  sub?: string;
  loading?: boolean;
}

export default function KpiStatCard({ label, value, color = "text-foreground", sub, loading }: Props) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg p-4 h-full shadow-sm">
      <p className="text-sm font-semibold mb-1">{label}</p>
      {loading ? (
        <div className="flex items-center h-8 mt-1">
          <div className="w-6 h-6 rounded-full border-4 border-border border-t-primary animate-spin" />
        </div>
      ) : (
        <div className="flex items-baseline gap-1.5 mt-1">
          <h3 className={`text-2xl font-bold ${color}`}>{value}</h3>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      )}
    </div>
  );
}

