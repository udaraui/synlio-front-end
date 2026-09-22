"use client";

import React, { useMemo, useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Bug, FileText, Zap, AlertTriangle, CheckCircle, Circle, Settings, HelpCircle, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MULTI_SERIES_PALETTE } from "../chartColors";

function useBgStroke() {
  const [stroke, setStroke] = useState("#ffffff");
  useEffect(() => {
    const update = () =>
      setStroke(document.documentElement.classList.contains("dark") ? "#1f2937" : "#ffffff");
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return stroke;
}

type Tab = "priority" | "type" | "queue";

interface DonutEntry { name: string; value: number; color: string; icon?: string; }
interface Props { rows: any[]; loading?: boolean; }

const ICON_MAP: Record<string, React.ElementType> = {
  bug: Bug, filetext: FileText, "file-text": FileText, task: FileText, zap: Zap, improvement: Zap,
  alerttriangle: AlertTriangle, "alert-triangle": AlertTriangle, warning: AlertTriangle,
  checkcircle: CheckCircle, "check-circle": CheckCircle, done: CheckCircle,
  circle: Circle, settings: Settings, config: Settings,
  helpcircle: HelpCircle, "help-circle": HelpCircle, question: HelpCircle,
  listtodo: ListTodo, "list-todo": ListTodo,
};

function TypeIcon({ iconName, color }: { iconName?: string; color: string }) {
  const key = (iconName ?? "").toLowerCase().replace(/\s/g, "");
  const Icon = ICON_MAP[key];
  if (Icon) return <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />;
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />;
}

function CustomTooltip({ active, payload, showIcon }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs min-w-[120px]">
      <div className="flex items-center gap-2 mb-1">
        {showIcon
          ? <TypeIcon iconName={item.payload.icon} color={item.payload.color} />
          : <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.payload.color }} />}
        <span className="font-semibold">{item.name}</span>
      </div>
      <div className="text-muted-foreground">
        Count: <span className="font-semibold text-foreground">{item.value}</span>
      </div>
    </div>
  );
}

const TABS: { key: Tab; label: string; activeLabel: string }[] = [
  { key: "priority", label: "Priority", activeLabel: "Tickets by Priority" },
  { key: "type",     label: "Type",     activeLabel: "Tickets by Type"     },
  { key: "queue",    label: "Queue",    activeLabel: "Tickets by Queue"    },
];

export default function TicketsDistributionCard({ rows, loading }: Props) {
  const bgStroke = useBgStroke();
  const [activeTab, setActiveTab] = useState<Tab>("priority");

  const priorityData: DonutEntry[] = useMemo(() => {
    const map: Record<string, DonutEntry> = {};
    rows.forEach((r) => {
      const key = r.priority_name ?? "Unknown";
      if (!map[key]) map[key] = { name: key, value: 0, color: r.priority_color || MULTI_SERIES_PALETTE[Object.keys(map).length % MULTI_SERIES_PALETTE.length] };
      map[key].value += Number(r.ticket_count) || 0;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [rows]);

  const typeData: DonutEntry[] = useMemo(() => {
    const map: Record<string, DonutEntry> = {};
    rows.forEach((r) => {
      const key = r.ticket_type_name ?? "Unknown";
      if (!map[key]) map[key] = { name: key, value: 0, color: r.ticket_type_color || MULTI_SERIES_PALETTE[Object.keys(map).length % MULTI_SERIES_PALETTE.length], icon: r.ticket_type_icon };
      map[key].value += Number(r.ticket_count) || 0;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [rows]);

  const queueData: DonutEntry[] = useMemo(() => {
    const map: Record<string, DonutEntry> = {};
    rows.forEach((r) => {
      const key = r.queue_name ?? "Unknown";
      if (!map[key]) map[key] = { name: key, value: 0, color: MULTI_SERIES_PALETTE[Object.keys(map).length % MULTI_SERIES_PALETTE.length] };
      map[key].value += Number(r.ticket_count) || 0;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [rows]);

  const dataMap: Record<Tab, DonutEntry[]> = { priority: priorityData, type: typeData, queue: queueData };
  const data = dataMap[activeTab];
  const total = data.reduce((s, d) => s + d.value, 0);
  const showTypeIcon = activeTab === "type";
  const legendCols = 2;
  const legendRows = Math.ceil(data.length / legendCols);

  return (
    <div className="bg-white dark:bg-gray-800 border border-border rounded-lg overflow-hidden shadow-sm flex flex-col h-full">

      {/* Header */}
      <div className="px-2 py-2 border-b border-border flex items-center justify-between gap-2 flex-shrink-0">
        {/*<h2 className="text-sm font-semibold">Tickets Distribution</h2>*/}
        <div className="flex gap-1 bg-muted/40 border border-border rounded-lg p-0.5 flex-shrink-0">
          {TABS.map((tab) => (
            <Button key={tab.key} size="sm" className="h-6 text-xs px-2.5"
              variant={activeTab === tab.key ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.key)}>
              {activeTab === tab.key ? tab.activeLabel : tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart — flex-1 so it fills all space above the legend */}
      <div className="px-2 pt-1 flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-border border-t-primary animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-muted-foreground">No tickets</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius="45%" outerRadius="80%"
                dataKey="value" nameKey="name" strokeWidth={2} stroke={bgStroke}>
                {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip showIcon={showTypeIcon} />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend — always at bottom, bordered grid */}
      {data.length > 0 && !loading && (
        <div className="flex-shrink-0 border-t border-b-none overflow-hidden">
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${legendCols}, minmax(0, 1fr))` }}
          >
            {data.map((d, i) => {
              const col = i % legendCols;
              const row = Math.floor(i / legendCols);
              const isLastCol = col === legendCols - 1;
              const isLastRow = row === legendRows - 1;
              return (
                <div
                  key={d.name}
                  className={`flex items-center gap-1.5 min-w-0 px-2.5 py-2
                    ${!isLastCol ? "border-r border-border" : ""}
                    ${!isLastRow ? "border-b border-border" : ""}`}
                >
                  {showTypeIcon
                    ? <TypeIcon iconName={d.icon} color={d.color} />
                    : <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />}
                  <span className="text-xs font-medium truncate flex-1 text-foreground/80">{d.name}</span>
                  <span className="text-xs font-semibold text-foreground flex-shrink-0">{d.value}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-0.5">
                    ({total > 0 ? `${((d.value / total) * 100).toFixed(1)}%` : "0%"})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
