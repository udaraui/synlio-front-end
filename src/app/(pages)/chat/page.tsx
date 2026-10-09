"use client";

import React, { useState, useRef, useEffect } from "react";
import { BotMessageSquare, ArrowRight } from "lucide-react";
import { chatService } from "@/services/chat/chat.service";
import { Button } from "@/components/ui/button";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ReactECharts from 'echarts-for-react';
import { CalendarDays, AlertTriangle } from "lucide-react";
import {
  InlineEditableStatus,
  InlineEditableSeverity,
  InlineEditableQueue,
  InlineEditableTicketType,
  InlineEditableAssignee,
} from "@/app/(pages)/ticket-management/ticket/components/InlineEditableTicketComponents";
import {
  InlineEditableTaskHierarchyLevel,
} from "@/app/(pages)/task-management/task/components/InlineEditableTaskComponents";

// Helper to extract plain text from React nodes
const extractText = (children: any): string => {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children?.props?.children) return extractText(children.props.children);
  return '';
};

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  isThinking?: boolean;
}

import { Plus, X } from "lucide-react";
import { useTheme } from "next-themes";

const CustomEChartsRenderer = ({ chartOptions }: { chartOptions: any }) => {
  const chartRef = useRef<any>(null);
  const { resolvedTheme } = useTheme();
  const [legendItems, setLegendItems] = useState<{ name: string, color: string, selected: boolean }[]>([]);

  // Hide the native ECharts legend since we are building a custom React one
  if (!chartOptions.legend) chartOptions.legend = {};
  chartOptions.legend.show = false;

  useEffect(() => {
    // Extract legend names and colors directly from the ECharts instance after it renders
    const timer = setTimeout(() => {
      if (chartRef.current) {
        const instance = chartRef.current.getEchartsInstance();
        if (!instance) return;

        const model = instance.getModel();
        if (!model) return; // Prevent "Cannot read properties of undefined (reading 'getSeries')" if not ready

        const series = model.getSeries();
        if (!series) return;

        const newLegend: { name: string, color: string, selected: boolean }[] = [];
        const defaultColors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];
        const chartColors = instance.getOption().color || chartOptions.color || defaultColors;

        if (series.length === 1 && (series[0].subType === 'pie' || series[0].subType === 'line')) {
          // Pie/Line charts assign colors to data items
          const data = series[0].getData();
          if (!data) return;
          for (let i = 0; i < data.count(); i++) {
            const name = data.getName(i);

            // 1. Prioritize explicit itemStyle color set by the AI (match by NAME to avoid sorting bugs)
            let color;
            if (chartOptions.series[0].data && Array.isArray(chartOptions.series[0].data)) {
              const rawData = chartOptions.series[0].data.find((d: any) => d.name === name);
              if (rawData && rawData.itemStyle && rawData.itemStyle.color) {
                color = rawData.itemStyle.color;
              }
            }

            // 2. Fallback to ECharts visual color
            if (!color) color = data.getItemVisual(i, 'color');
            // 3. Fallback to palette
            if (!color) color = chartColors[i % chartColors.length];

            if (name) newLegend.push({ name, color, selected: true });
          }
        } else {
          // Bar/Line charts assign colors to the series itself
          const allowedNames = Array.isArray(chartOptions.legend?.data) ? chartOptions.legend.data : null;

          series.forEach((s: any, i: number) => {
            const name = s.name;

            // Skip ECharts internal unassigned names like 'series\01'
            if (!name || String(name).includes('series\0')) return;

            // If the AI explicitly provided a legend array, only show those
            if (allowedNames && !allowedNames.includes(name)) return;

            // 1. Prioritize explicit itemStyle color (match by series name or fallback to index)
            let color;
            if (chartOptions.series && Array.isArray(chartOptions.series)) {
              const rawSeries = chartOptions.series.find((rs: any) => rs.name === name) || chartOptions.series[i];
              if (rawSeries && rawSeries.itemStyle && rawSeries.itemStyle.color) {
                color = rawSeries.itemStyle.color;
              }
            }

            // 2. Fallback to ECharts visual color
            if (!color) color = s.getData().getVisual('color');
            // 3. Fallback to palette
            if (!color) color = chartColors[i % chartColors.length];

            // Prevent duplicates
            if (!newLegend.find(l => l.name === name)) {
              newLegend.push({ name, color, selected: true });
            }
          });
        }

        // Hide legend if it's not a pie chart (Bar/Line charts will use X-axis labels instead)
        // if (series[0]?.subType !== 'pie') {
        newLegend.length = 0;
        // }

        // Only update if we found legends and it's different to prevent infinite loops
        if (newLegend.length > 0 && newLegend.length !== legendItems.length) {
          setLegendItems(newLegend);
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [chartOptions]);

  const toggleLegend = (name: string, currentIndex: number) => {
    if (chartRef.current) {
      chartRef.current.getEchartsInstance().dispatchAction({
        type: 'legendToggleSelect',
        name: name
      });
      setLegendItems(prev => prev.map((item, i) =>
        i === currentIndex ? { ...item, selected: !item.selected } : item
      ));
    }
  };

  return (
    <div className="w-full flex flex-col my-4 rounded-xl border border-border p-4 bg-background">
      <div className="h-[280px] w-full">
        <ReactECharts ref={chartRef} option={chartOptions} style={{ height: '100%', width: '100%' }} />
      </div>

      {legendItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1 justify-center">
          {legendItems.map((item, idx) => (
            <button
              key={item.name}
              onClick={() => toggleLegend(item.name, idx)}
              className={`inline-flex items-center gap-1.5 rounded-md border pl-2 pr-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${item.selected
                ? "border-border text-foreground"
                : "border-border border-dashed text-muted-foreground hover:bg-muted/50"
                }`}
            >
              {item.selected ? (
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              {item.name}
              {item.selected && <X className="h-3 w-3 ml-0.5 text-muted-foreground opacity-70" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const markdownComponents = {
  table: ({ node, ...props }: any) => <div className="overflow-x-auto my-4 rounded-xl border border-border overflow-hidden"><table className="w-full text-sm border-separate border-spacing-0" {...props} /></div>,
  thead: ({ node, ...props }: any) => <thead className="bg-muted/50 text-left" {...props} />,
  tr: ({ node, ...props }: any) => <tr className="last:[&>td]:border-b-0" {...props} />,
  th: ({ node, ...props }: any) => <th className="border-b border-r last:border-r-0 border-border px-4 py-3 font-medium text-foreground bg-muted/50" {...props} />,
  td: ({ node, children, ...props }: any) => {
    const text = extractText(children).trim();

    const match = text.match(/^\{\{([^:]+)::([^:]+)(?:::([^:]*))?(?:::([^:]*))?\}\}$/);

    if (text.startsWith('{{') && !match) {
      return (
        <td className="border-b border-r last:border-r-0 border-border px-4 py-3 align-middle" {...props}>
          <div className="w-20 h-6 rounded-md bg-muted animate-pulse"></div>
        </td>
      );
    }

    const baseProps = {
      readonly: true,
      ticketId: 0,
      taskId: 0,
    };

    let component = null;

    if (match) {
      const [_, type, name, colorRaw, icon] = match;
      let color = colorRaw && colorRaw !== 'None' && colorRaw !== 'null' ? colorRaw : undefined;
      
      if (type === 'Status') {
        if (!color) {
          if (['Completed', 'Finished', 'Closed'].includes(name)) color = "#22c55e";
          else if (['In Progress', 'Processing'].includes(name)) color = "#3b82f6";
          else color = "#9ca3af";
        }
        component = <InlineEditableStatus status={{ name, color, icon }} statuses={[]} {...baseProps} />;
      } else if (type === 'Severity' || type === 'Priority') {
        if (!color) {
          if (name === 'Medium' || name === '70' || name === '50') color = "#eab308";
          else if (['High', 'Critical', '100'].includes(name)) color = "#ef4444";
          else color = "#22c55e";
        }
        component = <InlineEditableSeverity severity={{ name, color, icon }} severities={[]} {...baseProps} />;
      } else if (type === 'Type') {
        component = <InlineEditableTicketType ticketType={{ name, color, icon }} types={[]} getIconComponent={() => null as any} {...baseProps} />;
      } else if (type === 'Queue') {
        component = <InlineEditableQueue queue={{ name, color, icon }} queues={[]} {...baseProps} />;
      } else if (type === 'Hierarchy') {
        component = <InlineEditableTaskHierarchyLevel hierarchyLevel={{ name, color, icon }} hierarchyLevels={[]} {...baseProps} />;
      }
    } else {
      const isStatus = ['To Do', 'Open', 'In Progress', 'Completed', 'Finished', 'Processing', 'Closed'].includes(text);
      if (isStatus) {
        let hexColor = "#9ca3af";
        if (['Completed', 'Finished', 'Closed'].includes(text)) hexColor = "#22c55e";
        else if (['In Progress', 'Processing'].includes(text)) hexColor = "#3b82f6";

        component = <InlineEditableStatus status={{ name: text, color: hexColor }} statuses={[]} {...baseProps} />;
      }

      const isSeverity = ['Low', 'Medium', 'High', 'Critical'].includes(text) || /^(100|70|50|30)$/.test(text);
      if (isSeverity && !component) {
        let hexColor = "#22c55e";
        if (text === 'Medium' || text === '70' || text === '50') hexColor = "#eab308";
        if (['High', 'Critical', '100'].includes(text)) hexColor = "#ef4444";

        component = <InlineEditableSeverity severity={{ name: text, color: hexColor }} severities={[]} {...baseProps} />;
      }

      const isQueue = ['Default', 'Pulse'].includes(text);
      if (isQueue && !component) {
        component = <InlineEditableQueue queue={{ name: text }} queues={[]} {...baseProps} />;
      }

      const isName = ['Kasun', 'Reshan', 'Prabash', 'Malith', 'KA', 'RE', 'PB', 'MJ'].includes(text);
      if (isName && !component) {
        const initials = /^[A-Z]{2}$/.test(text) ? text : text.substring(0, 2).toUpperCase();
        component = <InlineEditableAssignee assignee={{ first_name: initials, last_name: "" }} members={[]} {...baseProps} />;
      }

      const dateMatch = text.match(/^(\d{4}-\d{2}-\d{2})$/);
      if (dateMatch && !component) {
        const dateStr = dateMatch[1];
        const dateObj = new Date(dateStr + "T12:00:00Z");
        const isOverdue = dateObj < new Date();

        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

        return (
          <td className="border-b border-r last:border-r-0 border-border px-4 py-3 align-middle" {...props}>
            <div className="pointer-events-none flex items-center">
              <button
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${isOverdue ? 'border-red-500 text-gray-700 dark:text-gray-300' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
              >
                {isOverdue ? <AlertTriangle className="w-3 h-3 shrink-0 text-red-500" /> : <CalendarDays className="w-3 h-3 shrink-0" />}
                {formattedDate}
              </button>
            </div>
          </td>
        );
      }

      if (!component && (text === 'N/A' || text === '' || text === 'None' || text === 'null')) {
        return (
          <td className="border-b border-r last:border-r-0 border-border px-4 py-3 align-middle" {...props}>
            <div className="pointer-events-none flex items-center">
              <div className="inline-flex items-center justify-center px-2 py-0.5 bg-transparent border border-dashed rounded-md text-xs font-medium whitespace-nowrap border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                N/A
              </div>
            </div>
          </td>
        );
      }

      if (!component && /^[A-Z]+-[A-Z0-9]+(-[A-Z0-9]+)*$/.test(text) && text.length > 3) {
        return (
          <td className="border-b border-r last:border-r-0 border-border px-4 py-3 align-middle" {...props}>
            <span className="text-blue-500 font-medium text-xs">{text}</span>
          </td>
        );
      }
    }

    if (component) {
      return (
        <td className="border-b border-r last:border-r-0 border-border px-4 py-3 align-middle" {...props}>
          <div className="pointer-events-none flex items-center">{component}</div>
        </td>
      );
    }

    return <td className="border-b border-r last:border-r-0 border-border px-4 py-3 align-middle" {...props}>{children}</td>;
  },
  p: ({ node, children, ...props }: any) => {
    const text = extractText(children);
    if (text.trim().startsWith('### ') || /^(Pie Chart|Bar Chart|Line Chart|Table):/i.test(text.trim())) {
      const cleanText = text.replace(/^###\s*/, '').replace(/^(Pie Chart|Bar Chart|Line Chart|Table)?:\s*/i, '');
      return <h3 className="text-lg font-medium mt-5 mb-2 text-foreground" {...props}>{cleanText}</h3>;
    }
    return <p className="mb-4 last:mb-0 whitespace-pre-wrap" {...props}>{children}</p>;
  },
  strong: ({ node, ...props }: any) => <strong className="font-semibold text-foreground" {...props} />,
  h1: ({ node, ...props }: any) => <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-xl font-semibold mt-6 mb-3 text-foreground" {...props} />,
  h3: ({ node, children, ...props }: any) => {
    const text = extractText(children);
    const cleanText = text.replace(/^(Pie Chart|Bar Chart|Line Chart|Table)?:\s*/i, '');
    return <h3 className="text-lg font-medium mt-5 mb-2 text-foreground" {...props}>{cleanText}</h3>;
  },
  ul: ({ node, ...props }: any) => <ul className="list-disc list-outside mb-4 pl-5 space-y-2" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal list-outside mb-4 pl-5 space-y-2" {...props} />,
  li: ({ node, ...props }: any) => <li className="leading-relaxed" {...props} />,
  a: ({ node, ...props }: any) => <a className="text-primary hover:underline" {...props} />,
  code: ({ node, inline, className, children, ...props }: any) => {
    const { resolvedTheme } = useTheme();
    const match = /language-(\w+)/.exec(className || '');
    if (!inline && match && match[1] === 'echarts') {
      try {
        const chartOptions = JSON.parse(String(children).replace(/\n$/, ''));

        // ---- FRONTEND STYLING INJECTIONS ----
        // 0. Modify chart grid to minimize whitespace (reduce bottom gap)
        if (!chartOptions.grid) chartOptions.grid = {};
        chartOptions.grid.top = 20;
        chartOptions.grid.bottom = 10;
        chartOptions.grid.left = 20;
        chartOptions.grid.right = 20;
        chartOptions.grid.containLabel = true;

        // 2.5 Axis and Dynamic Theme Styling (Text, Lines, Grid)
        // Use explicit hex colors to guarantee perfect contrast in canvas
        const isDark = resolvedTheme === 'dark';
        const axisColor = isDark ? '#94a3b8' : '#64748b'; // Slate 400 (dark) vs Slate 500 (light)
        const splitLineColor = isDark ? '#334155' : '#e2e8f0'; // Slate 700 (dark) vs Slate 200 (light)
        const textColor = isDark ? '#f8fafc' : '#0f172a'; // Slate 50 (dark) vs Slate 900 (light)

        // 1. Force Tooltip styles (Mimic Shadcn UI Popover)
        if (!chartOptions.tooltip) chartOptions.tooltip = { trigger: 'item' };
        chartOptions.tooltip.backgroundColor = isDark ? '#020817' : '#ffffff';
        chartOptions.tooltip.borderColor = isDark ? '#1e293b' : '#e2e8f0';
        chartOptions.tooltip.textStyle = { color: textColor, fontWeight: 'normal', fontSize: 13 };
        chartOptions.tooltip.borderWidth = 1;
        chartOptions.tooltip.borderRadius = 6;
        chartOptions.tooltip.extraCssText = 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); font-weight: normal !important;';

        // 2. Hide ECharts native legend (React handles it now)
        if (!chartOptions.legend) chartOptions.legend = {};
        chartOptions.legend.show = false;

        if (chartOptions.xAxis) {
          const xAxes = Array.isArray(chartOptions.xAxis) ? chartOptions.xAxis : [chartOptions.xAxis];
          xAxes.forEach((x: any) => {
            if (!x.axisLabel) x.axisLabel = {};
            x.axisLabel.color = axisColor;
            if (!x.axisLine) x.axisLine = {};
            x.axisLine.lineStyle = { color: splitLineColor };
          });
        }

        if (chartOptions.yAxis) {
          const yAxes = Array.isArray(chartOptions.yAxis) ? chartOptions.yAxis : [chartOptions.yAxis];
          yAxes.forEach((y: any) => {
            delete y.name; // Hide redundant yAxis names (e.g. 'Count')
            if (!y.axisLabel) y.axisLabel = {};
            y.axisLabel.color = axisColor;
            if (!y.splitLine) y.splitLine = {};
            if (!y.splitLine.lineStyle) y.splitLine.lineStyle = {};
            y.splitLine.lineStyle.color = splitLineColor;
          });
        }

        // 3. Force Series styles (e.g. force Pie chart labels and add padding)
        if (chartOptions.series && Array.isArray(chartOptions.series)) {
          chartOptions.series.forEach((s: any) => {
            if (s.type === 'pie') {
              // Force labels to show (override any AI config that hid them)
              if (!s.label) s.label = {};
              s.label.show = true;
              s.label.color = textColor;
              s.label.textBorderColor = 'transparent';
              s.label.textBorderWidth = 0;

              if (!s.labelLine) s.labelLine = {};
              s.labelLine.show = true;
              if (!s.labelLine.lineStyle) s.labelLine.lineStyle = {};
              s.labelLine.lineStyle.color = axisColor;

              if (s.data && Array.isArray(s.data)) {
                s.data.forEach((d: any) => {
                  if (d.label) {
                    d.label.show = true;
                    // Delete any AI-hardcoded formatter on individual points
                    delete d.label.formatter;
                  }
                  if (d.labelLine) d.labelLine.show = true;
                });
              }

              // Force standard label formatter at the series level with bold count
              s.label.formatter = '{b} {c|{c}} ({d}%)';
              s.label.rich = {
                c: { fontWeight: 'bold', color: textColor }
              };

              // Remove rounded corners and borders (padding)
              if (!s.itemStyle) s.itemStyle = {};
              s.itemStyle.borderRadius = 0;
              delete s.itemStyle.borderColor;
              delete s.itemStyle.borderWidth;
            } else if (s.type === 'line') {
              // Enhance Line charts by making data points stand out and thickening the line
              if (!s.itemStyle) s.itemStyle = {};
              s.symbolSize = 8;
              if (!s.lineStyle) s.lineStyle = {};
              s.lineStyle.width = 3;
              s.lineStyle.color = splitLineColor;
            }
          });
        }

        // 4. Dynamic Data Transformation (Coloring and Pivoting)
        const parseCategoryString = (text: string) => {
          if (typeof text !== 'string') return { cleanName: text, dbColor: null };
          const match = text.match(/^\{\{(.*?)::(.*?)::(.*?)::(.*?)\}\}$/);
          if (match) {
            return { cleanName: match[2], dbColor: match[3] && match[3] !== 'null' ? match[3] : null };
          }
          return { cleanName: text, dbColor: null };
        };

        const getFallbackColor = (text: string): string | null => {
          const isStatus = ['To Do', 'Open', 'In Progress', 'Completed', 'Finished', 'Processing', 'Closed'].includes(text);
          if (isStatus) {
            if (['Completed', 'Finished', 'Closed'].includes(text)) return "#22c55e";
            if (['In Progress', 'Processing'].includes(text)) return "#3b82f6";
            return "#f97316";
          }
          const isSeverity = ['Low', 'Medium', 'High', 'Critical'].includes(text) || /^(100|70|50|30)$/.test(text);
          if (isSeverity) {
            if (['High', 'Critical', '100'].includes(text)) return "#ef4444";
            if (['Medium', '70', '50'].includes(text)) return "#eab308";
            return "#22c55e";
          }
          return null;
        };

        if (chartOptions.dataset && chartOptions.dataset.source && chartOptions.dataset.source.length > 1) {
          const rows = chartOptions.dataset.source;
          const dimNames = rows[0];
          const isPie = chartOptions.series?.length === 1 && chartOptions.series[0].type === 'pie';
          const isLine = chartOptions.series?.length === 1 && chartOptions.series[0].type === 'line';
          const isBar = chartOptions.series?.length >= 1 && chartOptions.series[0].type === 'bar';

          if (dimNames.length === 2) {
            if (isPie || isLine || isBar) {
              // Inject standard colors directly into data points for all chart types
              const newData = [];
              for (let i = 1; i < rows.length; i++) {
                const rawCatName = rows[i][0];
                const val = rows[i][1];
                const { cleanName, dbColor } = parseCategoryString(rawCatName);
                const color = dbColor || getFallbackColor(cleanName);

                newData.push({
                  name: cleanName,
                  value: val,
                  itemStyle: color ? { color, borderColor: color } : undefined
                });
              }
              delete chartOptions.dataset;
              if (isLine || isBar) {
                const xAxisObj = Array.isArray(chartOptions.xAxis) ? (chartOptions.xAxis[0] || {}) : (chartOptions.xAxis || {});
                const newXAxis = { ...xAxisObj, type: 'category', data: newData.map(d => d.name) };
                chartOptions.xAxis = Array.isArray(chartOptions.xAxis) ? [newXAxis, ...chartOptions.xAxis.slice(1)] : newXAxis;

                chartOptions.series[0].data = newData.map(d => ({ value: d.value, itemStyle: d.itemStyle }));
              } else {
                chartOptions.series[0].data = newData;
              }
              chartOptions.series.length = 1; // Cleanup redundant hallucinated series
            }
          } else if (isBar) {
            // Redundant series fix (fallback)
            const numValueCols = Math.max(1, dimNames.length - 1);
            if (chartOptions.series.length > numValueCols) {
              chartOptions.series = chartOptions.series.slice(0, numValueCols);
            }
          }
        }
        // -------------------------------------

        return <CustomEChartsRenderer chartOptions={chartOptions} />;
      } catch (e) {
        return (
          <div className="w-full h-[400px] my-4 rounded-xl border border-border p-4 bg-muted animate-pulse flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Building your chart...</span>
          </div>
        );
      }
    }
    return inline ? (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary" {...props}>{children}</code>
    ) : (
      <code className={`block bg-muted p-4 rounded-lg text-sm font-mono my-4 overflow-x-auto text-primary ${className}`} {...props}>{children}</code>
    );
  },
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { setBreadcrumbs } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbs([{ label: "Ask Synlio", href: "/chat", isCurrentPage: true }]);
  }, [setBreadcrumbs]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Connect to the NestJS proxy backend which pipes the FastAPI stream via chatService
      const response = await chatService.streamChat(userMessage.content);

      // Setup the initial AI message
      const aiMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: aiMessageId, role: "ai", content: "", isThinking: true },
      ]);

      setIsLoading(false);

      // Read the stream
      const reader = response.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done && reader) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === aiMessageId) {
                if (chunk.includes("__FINAL__")) {
                  return { ...msg, content: chunk.split("__FINAL__").pop() || "", isThinking: false };
                }
                if (chunk.includes("__REPLACE__")) {
                  return { ...msg, content: chunk.split("__REPLACE__").pop() || "", isThinking: true };
                }
                return { ...msg, content: msg.content + chunk };
              }
              return msg;
            })
          );
        }
      }
    } catch (error) {
      console.error("Error communicating with backend:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "Oops! Something went wrong communicating with the backend. Please ensure the server is running.",
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-1rem)] w-full bg-background pt-8">
      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto ${messages.length > 0 ? "p-8 space-y-6" : ""}`}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <BotMessageSquare className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">How can I help you today?</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex px-0 sm:px-4 md:px-8 lg:px-12 xl:px-16 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "user" ? (
                <div
                  className="flex max-w-[80%] items-start gap-3 rounded-2xl px-5 py-2 border bg-primary text-primary-foreground flex-row-reverse rounded-tr-xs"
                >
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div className="flex max-w-4xl items-start gap-3 w-full text-foreground py-1">
                  <div className="flex-1 overflow-hidden">
                    {msg.isThinking ? (
                      <div className="flex items-center gap-2 pt-1 pb-1">
                        <div className="relative flex h-2 w-2 ml-1 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </div>
                        <span className="text-sm text-muted-foreground">{msg.content}</span>
                      </div>
                    ) : (
                      <div className="text-sm leading-relaxed max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents as any}
                        >
                          {msg.content
                            .replace(/\n*###\s/g, '\n\n### ')
                            .replace(/###\s*(Pie Chart|Bar Chart|Line Chart|Table)?:\s*/gi, '### ')}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex px-0 sm:px-4 md:px-8 lg:px-12 xl:px-16 justify-start">
            <div className="flex max-w-4xl items-start gap-3 w-full text-foreground py-1">
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2 pt-1 pb-1">
                  <div className="relative flex h-2 w-2 ml-1 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </div>
                  <span className="text-sm text-muted-foreground">Synlio is thinking</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-background border-t">
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto relative flex items-end overflow-hidden rounded-[24px] border border-input bg-card focus-within:ring-1 focus-within:ring-primary"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            placeholder="Ask something..."
            className="w-full min-h-[56px] max-h-[200px] py-[18px] bg-transparent dark:bg-gray-900 px-5 pr-14 text-sm focus:outline-none resize-none overflow-y-auto"
            rows={1}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 h-10 w-10 p-0 rounded-full"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>
        <div className="text-center mt-2">
          <span className="text-xs text-muted-foreground">
            Synlio AI can make mistakes. Consider verifying important information.
          </span>
        </div>
      </div>
    </div>
  );
}
