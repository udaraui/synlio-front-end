"use client";

import React, { useMemo } from "react";

interface Props {
  rows: any[];
  loading?: boolean;
}

export default function TotalTicketsCard({ rows, loading }: Props) {
  const totals = useMemo(() => {
    const t = {
      ticket_count: 0,
      unallocated_count: 0,
      overdue_count: 0,
      allocated_count: 0,
    };
    rows.forEach((r) => {
      t.ticket_count += Number(r.ticket_count) || 0;
      t.unallocated_count += Number(r.unallocated_count) || 0;
      t.overdue_count += Number(r.overdue_count) || 0;
      t.allocated_count += Number(r.allocated_count) || 0;
    });
    return t;
  }, [rows]);

  const pct = (val: number) =>
    totals.ticket_count > 0
      ? ((val / totals.ticket_count) * 100).toFixed(1)
      : "0";

  const bars = [
    {
      label: "Unallocated",
      value: totals.unallocated_count,
      dotClass: "bg-orange-500",
      textClass: "text-orange-400",
      barClass: "bg-gradient-to-r from-orange-500 to-orange-400",
    },
    {
      label: "Overdue",
      value: totals.overdue_count,
      dotClass: "bg-red-500",
      textClass: "text-red-400",
      barClass: "bg-gradient-to-r from-red-500 to-red-400",
    },
    {
      label: "Allocated",
      value: totals.allocated_count,
      dotClass: "bg-blue-500",
      textClass: "text-blue-400",
      barClass: "bg-gradient-to-r from-blue-500 to-blue-400",
        forcePct: "100",
    },
    // {
    //   label: "All Tickets",
    //   value: totals.ticket_count,
    //   dotClass: "bg-blue-500",
    //   textClass: "text-blue-400",
    //   barClass: "bg-gradient-to-r from-blue-500 to-blue-400",
    //   forcePct: "100",
    // },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg p-4 h-full flex flex-col shadow-sm">
      <h3 className="text-sm font-semibold mb-3 text-foreground">Total Tickets</h3>
      {loading ? (
        <div className="h-[150px] flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border-4 border-border border-t-primary animate-spin" />
        </div>
      ) : totals.ticket_count === 0 ? (
        <div className="h-[150px] flex items-center justify-center">
          <p className="text-xs text-muted-foreground">No tickets</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bars.map((b) => (
            <div key={b.label} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium text-foreground/80">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${b.dotClass}`} />
                  {b.label}
                </span>
                <div className="flex items-center gap-1">
                  <span className={`text-lg font-bold ${b.textClass}`}>{b.value}</span>
                  <span className="text-xs text-muted-foreground">
                    ({b.forcePct ?? pct(b.value)}%)
                  </span>
                </div>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full ${b.barClass}`}
                  style={{ width: `${b.forcePct ?? pct(b.value)}%` }}
                />
              </div>
            </div>
          ))}
          <div className="pt-3 border-t border-border">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center">
                <p className="font-semibold text-foreground/80 mb-1">Exceeded Due</p>
                <p className="text-lg font-bold text-red-400">{totals.overdue_count}</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground/80 mb-1">All Tickets</p>
                <p className="text-lg font-bold text-green-400">{totals.ticket_count}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

