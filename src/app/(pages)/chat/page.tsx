"use client";

import React, { useState, useRef, useEffect } from "react";
import { BotMessageSquare, ArrowRight } from "lucide-react";
import { chatService } from "@/services/chat/chat.service";
import { Button } from "@/components/ui/button";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import { useAuth } from "@/contexts/auth.context";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { useRouter } from "next/navigation";
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
  isStreaming?: boolean;
}

import { Plus, X, FolderOpen, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { Atom, Eclipse } from "loading-dev";


// Helper to extract primary RGB values from CSS variable --primary
const getPrimaryRgb = (): [number, number, number] => {
  if (typeof window === 'undefined') return [99, 102, 241];
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    if (!raw) return [99, 102, 241];

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = raw;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      if (a > 0) return [r, g, b];
    }
  } catch (e) { }
  return [99, 102, 241];
};

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
};

// Generates strictly monochromatic primary color variants (shades/tints of the same hue)
const getPrimaryVariant = (index: number, total: number, [r, g, b]: [number, number, number]): string => {
  if (total <= 1 || index === 0) return `rgb(${r}, ${g}, ${b})`;
  const [h, s, l] = rgbToHsl(r, g, b);

  // Keep hue STRICTLY identical to primary (0 hue drift) so all variants belong to the primary family
  const lightnessDeltas = [0, -18, 16, -30, 28, -10, 22, -24, 34, -36, 10, -15];
  const delta = lightnessDeltas[index % lightnessDeltas.length];
  const adjustedL = Math.max(22, Math.min(86, l + delta));
  const adjustedS = adjustedL > 75 ? Math.max(35, s - 15) : Math.max(45, s);

  return `hsl(${h}, ${adjustedS}%, ${adjustedL}%)`;
};

const getPrimaryColorString = (): string => {
  const [r, g, b] = getPrimaryRgb();
  return `rgb(${r}, ${g}, ${b})`;
};

const getPrimaryPalette = (size: number = 12): string[] => {
  const rgb = getPrimaryRgb();
  return Array.from({ length: size }, (_, idx) => getPrimaryVariant(idx, size, rgb));
};

const TableContext = React.createContext<{ headers: string[] }>({ headers: [] });

// Hook to observe live CSS variable changes on <html> (e.g. when changing primary color in theme picker)
function useLivePrimaryColor() {
  const [primaryColor, setPrimaryColor] = useState<string>('');

  useEffect(() => {
    const update = () => {
      if (typeof window !== 'undefined') {
        const val = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
        setPrimaryColor(val);
      }
    };
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });

    window.addEventListener('storage', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', update);
    };
  }, []);

  return primaryColor;
}

const CustomEChartsRenderer = ({ chartOptions }: { chartOptions: any }) => {
  const chartRef = useRef<any>(null);
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
        const chartColors = instance.getOption().color || chartOptions.color || getPrimaryPalette(12);

        if (series.length === 1 && (series[0].subType === 'pie' || series[0].subType === 'line' || series[0].subType === 'treemap' || series[0].subType === 'funnel')) {
          // Pie/Line/Treemap/Funnel charts assign colors to data items
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

  const onChartEvents = {
    mouseover: (params: any) => {
      if (params.componentType === 'xAxis' && chartRef.current) {
        const echartsInstance = chartRef.current.getEchartsInstance();
        let targetIndex = params.dataIndex ?? params.tickIndex;
        if ((targetIndex === undefined || targetIndex < 0) && chartOptions?.xAxis) {
          const firstX = Array.isArray(chartOptions.xAxis) ? chartOptions.xAxis[0] : chartOptions.xAxis;
          if (Array.isArray(firstX?.data)) {
            targetIndex = firstX.data.indexOf(params.value);
          }
        }
        if (targetIndex !== undefined && targetIndex >= 0) {
          echartsInstance.dispatchAction({
            type: 'showTip',
            seriesIndex: 0,
            dataIndex: targetIndex,
          });
        } else {
          echartsInstance.dispatchAction({
            type: 'showTip',
            x: params.event?.offsetX,
            y: params.event?.offsetY,
          });
        }
      }
    },
    mouseout: (params: any) => {
      if (params.componentType === 'xAxis' && chartRef.current) {
        chartRef.current.getEchartsInstance().dispatchAction({
          type: 'hideTip'
        });
      }
    }
  };

  return (
    <div className="w-full flex flex-col my-4 rounded-xl border border-border p-4 bg-background">
      <div className="h-[280px] w-full">
        <ReactECharts
          ref={chartRef}
          option={chartOptions}
          notMerge={true}
          onEvents={onChartEvents}
          style={{ height: '100%', width: '100%' }}
        />
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

const renderTemplateBadge = (rawText: string, primaryFallback: string, key?: any): React.ReactNode => {
  const text = rawText.trim();
  const match = text.match(/^\{\{([^:]+)::([^:]+)(?:::([^:]*))?(?:::([^:]*))?\}\}$/);
  if (!match) return null;
  const [_, type, name, colorRaw, icon] = match;
  const color = colorRaw && colorRaw !== 'None' && colorRaw !== 'null' && colorRaw !== '' ? colorRaw : primaryFallback;
  const baseProps = {
    readonly: true,
    ticketId: 0,
    taskId: 0,
  };

  if (type === 'Status') {
    return <InlineEditableStatus key={key} status={{ name, color, icon }} statuses={[]} {...baseProps} />;
  } else if (type === 'Severity' || type === 'Priority') {
    return <InlineEditableSeverity key={key} severity={{ name, color, icon }} severities={[]} {...baseProps} />;
  } else if (type === 'Type') {
    return <InlineEditableTicketType key={key} ticketType={{ name, color, icon }} types={[]} getIconComponent={() => null as any} {...baseProps} />;
  } else if (type === 'Queue') {
    return <InlineEditableQueue key={key} queue={{ name, color, icon }} queues={[]} {...baseProps} />;
  } else if (type === 'Hierarchy') {
    return <InlineEditableTaskHierarchyLevel key={key} hierarchyLevel={{ name, color, icon }} hierarchyLevels={[]} {...baseProps} />;
  }
  return null;
};

const renderWithTemplateBadges = (children: React.ReactNode, primaryFallback: string): React.ReactNode => {
  if (typeof children === 'string') {
    if (!children.includes('{{')) return children;
    const parts = children.split(/(\{\{[^}]+:[^}]+\}\})/g);
    if (parts.length === 1) return children;

    return parts.map((part, idx) => {
      const badge = renderTemplateBadge(part, primaryFallback, idx);
      if (badge) {
        return (
          <span key={idx} className="inline-flex mx-1 align-middle">
            {badge}
          </span>
        );
      }
      return part;
    });
  }

  if (Array.isArray(children)) {
    return React.Children.map(children, child => renderWithTemplateBadges(child, primaryFallback));
  }

  if (React.isValidElement(children)) {
    const props: any = children.props;
    if (props && props.children) {
      return React.cloneElement(children as React.ReactElement<any>, undefined, renderWithTemplateBadges(props.children, primaryFallback));
    }
  }

  return children;
};

const markdownComponents = {
  table: ({ node, children, ...props }: any) => {
    let headers: string[] = [];
    if (node?.children?.[0]?.children) {
      headers = node.children[0].children.map((cell: any) => extractText(cell).trim().toLowerCase());
    }
    return (
      <TableContext.Provider value={{ headers }}>
        <div className="overflow-x-auto my-4 rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm border-separate border-spacing-0" {...props}>
            {children}
          </table>
        </div>
      </TableContext.Provider>
    );
  },
  thead: ({ node, ...props }: any) => <thead className="bg-muted/50 text-left" {...props} />,
  tr: ({ node, children, ...props }: any) => {
    return (
      <tr className="last:[&>td]:border-b-0" {...props}>
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, { colIndex: index });
          }
          return child;
        })}
      </tr>
    );
  },
  th: ({ node, colIndex, ...props }: any) => <th className="border-b border-r last:border-r-0 border-border px-4 py-3 font-medium text-foreground bg-muted/50" {...props} />,
  td: ({ node, children, colIndex, ...props }: any) => {
    const text = extractText(children).trim();
    const primaryFallback = getPrimaryColorString();

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
      component = renderTemplateBadge(text, primaryFallback);
    } else {
      // Guess column content by column header label (value labels)
      const { headers } = React.useContext(TableContext);
      const colHeader = (typeof colIndex === 'number' && headers[colIndex]) ? headers[colIndex] : '';

      if (colHeader.includes('status')) {
        component = <InlineEditableStatus status={{ name: text, color: primaryFallback }} statuses={[]} {...baseProps} />;
      } else if (colHeader.includes('severity') || colHeader.includes('priority')) {
        component = <InlineEditableSeverity severity={{ name: text, color: primaryFallback }} severities={[]} {...baseProps} />;
      } else if (colHeader.includes('type')) {
        component = <InlineEditableTicketType ticketType={{ name: text, color: primaryFallback }} types={[]} getIconComponent={() => null as any} {...baseProps} />;
      } else if (colHeader.includes('queue')) {
        component = <InlineEditableQueue queue={{ name: text, color: primaryFallback }} queues={[]} {...baseProps} />;
      } else if (colHeader.includes('hierarchy') || colHeader.includes('level')) {
        component = <InlineEditableTaskHierarchyLevel hierarchyLevel={{ name: text, color: primaryFallback }} hierarchyLevels={[]} {...baseProps} />;
      } else if (colHeader.includes('assignee') || colHeader.includes('owner') || colHeader.includes('member')) {
        const initials = text.includes(' ')
          ? text.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase()
          : text.substring(0, 2).toUpperCase();
        component = <InlineEditableAssignee assignee={{ first_name: initials, last_name: "" }} members={[]} {...baseProps} />;
      } else if (colHeader.includes('date') || /^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const dateMatch = text.match(/^(\d{4}-\d{2}-\d{2})$/);
        if (dateMatch) {
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
            <span className="text-primary font-medium text-xs">{text}</span>
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
      const cleanText = text
        .replace(/^###\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/^(Pie Chart|Bar Chart|Line Chart|Table)?:\s*/i, '');
      return <h3 className="text-lg font-medium mt-5 mb-2 text-foreground" {...props}>{cleanText}</h3>;
    }
    const primaryFallback = getPrimaryColorString();
    return <p className="mb-4 last:mb-0 whitespace-pre-wrap" {...props}>{renderWithTemplateBadges(children, primaryFallback)}</p>;
  },
  strong: ({ node, ...props }: any) => <strong className="font-semibold text-foreground" {...props} />,
  h1: ({ node, ...props }: any) => <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-xl font-semibold mt-6 mb-3 text-foreground" {...props} />,
  h3: ({ node, children, ...props }: any) => {
    const text = extractText(children);
    const cleanText = text
      .replace(/^\d+\.\s*/, '')
      .replace(/^(Pie Chart|Bar Chart|Line Chart|Table)?:\s*/i, '');
    return <h3 className="text-lg font-medium mt-5 mb-2 text-foreground" {...props}>{cleanText}</h3>;
  },
  ul: ({ node, ...props }: any) => <ul className="list-disc list-outside mb-4 pl-5 space-y-2" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal list-outside mb-4 pl-5 space-y-2" {...props} />,
  li: ({ node, children, ...props }: any) => {
    const primaryFallback = getPrimaryColorString();
    return <li className="leading-relaxed" {...props}>{renderWithTemplateBadges(children, primaryFallback)}</li>;
  },
  a: ({ node, ...props }: any) => <a className="text-primary hover:underline" {...props} />,
  code: ({ node, inline, className, children, ...props }: any) => {
    const { resolvedTheme } = useTheme();
    const livePrimaryColor = useLivePrimaryColor();
    const match = /language-(\w+)/.exec(className || '');
    if (!inline && match && match[1] === 'echarts') {
      try {
        let chartOptions = JSON.parse(String(children).replace(/\n$/, ''));

        // Sanitize any {{Type::Name::Color::Icon}} template tags in chartOptions down to clean Name
        const cleanTemplateTags = (obj: any): any => {
          if (typeof obj === 'string') {
            const tagMatch = obj.match(/^\{\{\w+::([^:]+)(?:::.*)?\}\}$/);
            return tagMatch ? tagMatch[1] : obj;
          }
          if (Array.isArray(obj)) return obj.map(cleanTemplateTags);
          if (obj && typeof obj === 'object') {
            const cleaned: any = {};
            for (const [k, v] of Object.entries(obj)) {
              cleaned[k] = cleanTemplateTags(v);
            }
            return cleaned;
          }
          return obj;
        };
        chartOptions = cleanTemplateTags(chartOptions);

        // ---- FRONTEND STYLING INJECTIONS ----
        // Remove any in-chart titles or graphic watermarks (headings are rendered outside the canvas in Markdown)
        delete chartOptions.title;
        delete chartOptions.graphic;

        // 0. Modify chart grid to minimize whitespace (reduce bottom gap)
        if (!chartOptions.grid) chartOptions.grid = {};
        chartOptions.grid.top = 20;
        chartOptions.grid.bottom = 15;
        chartOptions.grid.left = 20;
        chartOptions.grid.right = 20;
        chartOptions.grid.containLabel = true;

        // 2.5 Axis and Dynamic Theme Styling (Text, Lines, Grid)
        // Use explicit hex colors to guarantee perfect contrast in canvas
        const isDark = resolvedTheme === 'dark';
        const axisColor = isDark ? '#94a3b8' : '#64748b'; // Slate 400 (dark) vs Slate 500 (light)
        const splitLineColor = isDark ? '#334155' : '#e2e8f0'; // Slate 700 (dark) vs Slate 200 (light)
        const textColor = isDark ? '#f8fafc' : '#0f172a'; // Slate 50 (dark) vs Slate 900 (light)
        const primaryRgb = getPrimaryRgb();
        const primaryColor = getPrimaryColorString();
        const primaryPalette = getPrimaryPalette(12);

        // 1. Force Tooltip styles (Mimic Shadcn UI Popover)
        const firstType = chartOptions.series?.[0]?.type;
        const isLine = firstType === 'line';
        const isBar = firstType === 'bar';
        if (!chartOptions.tooltip) chartOptions.tooltip = {};
        chartOptions.tooltip.trigger = (isLine || isBar) ? 'axis' : 'item';
        chartOptions.tooltip.backgroundColor = isDark ? '#020817' : '#ffffff';
        chartOptions.tooltip.borderColor = isDark ? '#1e293b' : '#e2e8f0';
        chartOptions.tooltip.textStyle = { color: textColor, fontWeight: 'normal', fontSize: 13 };
        chartOptions.tooltip.borderWidth = 1;
        chartOptions.tooltip.borderRadius = 8;
        chartOptions.tooltip.extraCssText = 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); font-weight: normal !important; border-radius: 8px !important;';

        if (isLine || isBar) {
          chartOptions.tooltip.axisPointer = {
            type: 'shadow',
            shadowStyle: {
              color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'
            }
          };
        }

        // Custom Tooltip Formatter to display Full Name and Value prominently
        chartOptions.tooltip.formatter = (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          if (!items || items.length === 0) return '';

          const first = items[0];
          let title = '';
          if (typeof first.name === 'string' && first.name.trim() !== '') {
            title = first.name;
          } else if (typeof first.axisValue === 'string' && first.axisValue.trim() !== '') {
            title = first.axisValue;
          } else if (first.axisValueLabel) {
            title = first.axisValueLabel;
          }

          if (typeof title === 'string') {
            const tagMatch = title.match(/^\{\{\w+::([^:]+)(?:::.*)?\}\}$/);
            if (tagMatch) title = tagMatch[1];
          }

          let html = `<div style="padding: 2px 4px; font-family: inherit;">`;
          if (title) {
            html += `<div style="font-weight: 600; font-size: 13px; margin-bottom: 6px; color: ${textColor};">${title}</div>`;
          }

          items.forEach((item: any) => {
            const color = item.color || (item.itemStyle && item.itemStyle.color) || primaryColor;
            const seriesName = item.seriesName && !item.seriesName.startsWith('series') ? item.seriesName : '';
            let val = item.value;
            if (typeof val === 'object' && val !== null) {
              val = val.value ?? JSON.stringify(val);
            }
            const percentStr = item.percent !== undefined ? ` (${item.percent}%)` : '';

            html += `<div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 12px; line-height: 1.5; color: ${axisColor};">`;
            html += `<span style="display: inline-flex; align-items: center; gap: 6px;">`;
            html += `<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; flex-shrink: 0;"></span>`;
            html += `<span>${seriesName || 'Total'}</span>`;
            html += `</span>`;
            html += `<span style="font-weight: 600; font-family: monospace; color: ${textColor};">${val}${percentStr}</span>`;
            html += `</div>`;
          });

          html += `</div>`;
          return html;
        };

        // 2. Hide ECharts native legend (React handles it now)
        if (!chartOptions.legend) chartOptions.legend = {};
        chartOptions.legend.show = false;

        // Delete Cartesian axes for non-cartesian charts (pie, treemap, funnel, radar, gauge)
        const isNonCartesian = ['pie', 'treemap', 'funnel', 'gauge', 'radar'].includes(firstType);
        if (isNonCartesian) {
          delete chartOptions.xAxis;
          delete chartOptions.yAxis;
        }

        // Count number of bars/data points to adaptively format category labels
        let barCount = 0;
        if (chartOptions.dataset?.source && Array.isArray(chartOptions.dataset.source) && chartOptions.dataset.source.length > 1) {
          barCount = chartOptions.dataset.source.length - 1;
        } else if (chartOptions.xAxis) {
          const firstX = Array.isArray(chartOptions.xAxis) ? chartOptions.xAxis[0] : chartOptions.xAxis;
          if (Array.isArray(firstX?.data)) barCount = firstX.data.length;
        }
        if (!barCount && chartOptions.series?.[0]?.data && Array.isArray(chartOptions.series[0].data)) {
          barCount = chartOptions.series[0].data.length;
        }

        const formatCategoryLabel = (rawVal: string, count: number): string => {
          if (typeof rawVal !== 'string') return String(rawVal ?? '');

          let val = rawVal;
          const tagMatch = val.match(/^\{\{\w+::([^:]+)(?:::.*)?\}\}$/);
          if (tagMatch) val = tagMatch[1];

          // Format ISO dates: YYYY-MM-DD -> MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            const parts = val.split('-');
            return `${parts[1]}-${parts[2]}`;
          }

          // If very few bars (<= 3) and label is short, display full name
          if (count <= 3 && val.length <= 12) {
            return val;
          }

          const words = val.trim().split(/\s+/).filter(Boolean);

          // For any multi-word category (e.g. "Project Planning" -> "PP", "Frontend Development" -> "FD", "Ruchira Perera" -> "RP"):
          // Return clean uppercase initials so labels never collide or truncate awkwardly
          if (words.length >= 2) {
            if (count <= 4 && val.length <= 8) {
              return val;
            }
            return words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
          }

          // Single word: if too long (> 6 chars) and more than 4 bars, shorten it with a dot (e.g. "Archit." -> "Arch.")
          if (count > 4 && val.length > 6) {
            return `${val.slice(0, 5)}.`;
          }

          return val;
        };

        if (chartOptions.xAxis && !isNonCartesian) {
          const xAxes = Array.isArray(chartOptions.xAxis) ? chartOptions.xAxis : [chartOptions.xAxis];
          xAxes.forEach((x: any) => {
            delete x.name;
            if (!x.axisLabel) x.axisLabel = {};
            x.axisLabel.color = axisColor;
            x.axisLabel.rotate = 0; // Force horizontal labels, eliminate any ugly 45-degree angle
            x.axisLabel.hideOverlap = false; // Never drop or skip bar labels
            x.axisLabel.interval = isLine ? 'auto' : 0; // Show all categories on bar charts
            x.axisLabel.overflow = 'truncate';
            x.axisLabel.width = barCount > 6 ? 40 : 80;
            x.axisLabel.align = 'center';
            x.axisLabel.fontSize = barCount > 10 ? 11 : 12;
            x.axisLabel.margin = 10;
            x.triggerEvent = true; // Enable hover event on axis labels for tooltip
            if (!x.axisLine) x.axisLine = {};
            x.axisLine.lineStyle = { color: splitLineColor };

            x.axisLabel.formatter = (val: string) => formatCategoryLabel(val, barCount);
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

        if (!chartOptions.color || !Array.isArray(chartOptions.color) || chartOptions.color.length === 0) {
          chartOptions.color = primaryPalette;
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
              s.lineStyle.color = primaryColor;
            }
          });
        }

        // 4. Dynamic Data Transformation (Coloring and Pivoting)
        const parseCategoryString = (text: string) => {
          if (typeof text !== 'string') return { cleanName: text, dbColor: null };
          const match = text.match(/^\{\{(.*?)::(.*?)::(.*?)::(.*?)\}\}$/);
          if (match) {
            const rawColor = match[3]?.trim();
            const dbColor = rawColor && rawColor !== 'null' && rawColor !== 'None' && rawColor !== '' ? rawColor : null;
            return { cleanName: match[2], dbColor };
          }
          return { cleanName: text, dbColor: null };
        };

        if (chartOptions.dataset && chartOptions.dataset.source && chartOptions.dataset.source.length > 1) {
          const rows = chartOptions.dataset.source;
          const dimNames = rows[0];
          const firstSeriesType = chartOptions.series?.[0]?.type;
          const isItemBased = ['pie', 'treemap', 'funnel'].includes(firstSeriesType);
          const isLine = chartOptions.series?.length === 1 && firstSeriesType === 'line';
          const isBar = chartOptions.series?.length >= 1 && firstSeriesType === 'bar';

          if (dimNames.length === 2) {
            if (isItemBased || isLine || isBar) {
              // Inject standard colors directly into data points for all chart types
              const totalItems = rows.length - 1;
              const newData = [];
              for (let i = 1; i < rows.length; i++) {
                const rawCatName = rows[i][0];
                const val = Number(rows[i][1]) || rows[i][1];
                const { cleanName, dbColor } = parseCategoryString(rawCatName);
                const color = dbColor || (isLine ? primaryColor : getPrimaryVariant(i - 1, totalItems, primaryRgb));

                newData.push({
                  name: cleanName,
                  value: val,
                  itemStyle: { color, borderColor: color }
                });
              }
              delete chartOptions.dataset;
              if (isLine || isBar) {
                const xAxisObj = Array.isArray(chartOptions.xAxis) ? (chartOptions.xAxis[0] || {}) : (chartOptions.xAxis || {});
                const newXAxis = { ...xAxisObj, type: 'category', data: newData.map(d => d.name) };
                chartOptions.xAxis = Array.isArray(chartOptions.xAxis) ? [newXAxis, ...chartOptions.xAxis.slice(1)] : newXAxis;

                chartOptions.series[0].data = newData.map(d => ({ name: d.name, value: d.value, itemStyle: d.itemStyle }));
              } else {
                chartOptions.series[0].data = newData;
                if (firstSeriesType === 'treemap') {
                  if (!chartOptions.series[0].breadcrumb) chartOptions.series[0].breadcrumb = {};
                  chartOptions.series[0].breadcrumb.show = false;
                  chartOptions.series[0].roam = false;
                  chartOptions.series[0].nodeClick = false;
                  chartOptions.series[0].label = {
                    show: true,
                    formatter: '{b}\n{c}',
                    fontSize: 13,
                    color: '#ffffff'
                  };
                }
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

        return <CustomEChartsRenderer key={`${livePrimaryColor}-${resolvedTheme}`} chartOptions={chartOptions} />;
      } catch (e) {
        return (
          <div className="w-full h-[300px] my-4 rounded-xl border border-border p-4 bg-background flex items-center justify-center">
            <Atom size={32} className="text-primary" />
          </div>
        );
      }
    }
    const codeText = extractText(children).trim();
    const primaryFallback = getPrimaryColorString();
    const badge = renderTemplateBadge(codeText, primaryFallback);
    if (badge) {
      return <span className="inline-flex mx-1 align-middle">{badge}</span>;
    }

    return inline ? (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary" {...props}>{children}</code>
    ) : (
      <code className={`block bg-muted p-4 rounded-lg text-sm font-mono my-4 overflow-x-auto text-primary ${className}`} {...props}>{children}</code>
    );
  },
};

interface ChatMessageItemProps {
  msg: Message;
  onSelectAction?: (actionText: string, msgId?: string) => void;
  onDismissAction?: (msgId: string) => void;
  actionState?: 'dismissed' | 'full_list' | null;
  isLoading?: boolean;
}

const ChatMessageItem = React.memo(function ChatMessageItem({
  msg,
  onSelectAction,
  onDismissAction,
  actionState = null,
  isLoading = false,
}: ChatMessageItemProps) {
  // Only show preview options AFTER the entire response and Key Findings have finished streaming
  const isFinished = !msg.isStreaming && !msg.isThinking;
  const previewMatch = msg.role === "ai" && isFinished
    ? msg.content.match(/<!--preview_count:(\d+)-->/) ||
    msg.content.match(/(?:out of|total of)\s+(\d+)\s+records/i) ||
    msg.content.match(/Found\s+(\d+)\s+records/i) ||
    msg.content.match(/There are\s+(\d+)\s+records/i)
    : null;
  const previewCount = previewMatch ? parseInt(previewMatch[1], 10) : null;
  const hasPreview = Boolean(
    isFinished &&
    previewCount &&
    previewCount > 0 &&
    (
      msg.content.includes("preview of") ||
      msg.content.includes("sample records") ||
      msg.content.includes("example records") ||
      msg.content.includes("<!--preview_count:")
    )
  );

  return (
    <div
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
                <Eclipse size={18} className="text-primary shrink-0" />
                <span className="text-sm text-muted-foreground">{msg.content}</span>
              </div>
            ) : (
              <div className="text-sm leading-relaxed max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents as any}
                >
                  {msg.content
                    .replace(/<!--preview_count:\d+-->/g, '')
                    .replace(/\n\s+(\{\{[^}]+:[^}]+\}\})/g, ' $1 ')
                    .replace(/\n*###\s/g, '\n\n### ')
                    .replace(/###\s*(Pie Chart|Bar Chart|Line Chart|Table)?:\s*/gi, '### ')
                    .replace(/###\s*\d+\.\s*/g, '### ')}
                </ReactMarkdown>

                {/* Interactive Preview Options (Bring all data vs No thanks) */}
                {hasPreview && (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 px-4 py-3 rounded-xl border border-border">
                    <div className="text-sm flex items-center gap-1.5">
                      <span>There are <strong>{previewCount}</strong> records in total. Would you like to view the full list?</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {actionState ? (
                        <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                          <Check size={13} /> {actionState === 'dismissed' ? 'Kept preview' : 'Showed full list'}
                        </span>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            disabled={isLoading}
                            onClick={() => onSelectAction?.(`View complete list of all ${previewCount} records`, msg.id)}
                            className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
                          >
                            <FolderOpen size={13} />
                            {/* Bring all data ({previewCount}) */}
                            View full list ({previewCount})
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                            onClick={() => onDismissAction?.(msg.id)}
                            className="h-8 gap-1.5 text-xs font-medium border-dashed text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <X size={13} />
                            No thanks
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.msg.content === nextProps.msg.content &&
    prevProps.msg.isThinking === nextProps.msg.isThinking &&
    prevProps.msg.isStreaming === nextProps.msg.isStreaming &&
    prevProps.actionState === nextProps.actionState &&
    prevProps.isLoading === nextProps.isLoading
  );
});

export default function ChatPage() {
  const router = useRouter();
  const canAccessChat = usePrivilegeGuard("120");
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const [localUser, setLocalUser] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("user");
        if (stored) {
          setLocalUser(JSON.parse(stored));
        }
      } catch (e) { }
    }
  }, []);

  const currentUser = user || localUser;
  const displayName = (currentUser?.first_name || currentUser?.name || currentUser?.email?.split('@')[0] || "").trim();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [actionStates, setActionStates] = useState<Record<string, 'dismissed' | 'full_list'>>({});
  const [conversationId] = useState<string>(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { setBreadcrumbs } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbs([{ label: "Ask Synlio", href: "/chat", isCurrentPage: true }]);
  }, [setBreadcrumbs]);

  const handleSelectAction = (actionText: string, msgId?: string) => {
    if (msgId) {
      setActionStates((prev) => ({ ...prev, [msgId]: 'full_list' }));
    }
    sendMessage(actionText);
  };

  const handleDismissAction = (msgId: string) => {
    setActionStates((prev) => ({ ...prev, [msgId]: 'dismissed' }));
  };

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

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Connect to the NestJS proxy backend which pipes the FastAPI stream via chatService
      const response = await chatService.streamChat(userMessage.content, conversationId);

      // Setup the initial AI message
      const aiMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: aiMessageId, role: "ai", content: "", isThinking: true, isStreaming: true },
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
                  return { ...msg, content: chunk.split("__FINAL__").pop() || "", isThinking: false, isStreaming: false };
                }
                if (chunk.includes("__REPLACE__")) {
                  return { ...msg, content: chunk.split("__REPLACE__").pop() || "", isThinking: true, isStreaming: true };
                }
                return { ...msg, content: msg.content + chunk, isThinking: false, isStreaming: true };
              }
              return msg;
            })
          );
        }
      }

      // Mark streaming as fully completed once reader is done
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId ? { ...msg, isThinking: false, isStreaming: false } : msg
        )
      );
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
  };

  if (mounted && !canAccessChat) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] w-full text-muted-foreground p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
          <BotMessageSquare className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          You are not authorized to use Ask Synlio. Please contact your organization administrator if you need access.
        </p>
        <Button variant="outline" onClick={() => router.push("/home")} className="cursor-pointer">
          Return to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-1rem)] w-full bg-background pt-8">
      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto ${messages.length > 0 ? "p-8 space-y-6" : ""}`}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <BotMessageSquare className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">
              {displayName ? `How can I help you today, ${displayName}?` : "How can I help you today?"}
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const hasFollowingFullList =
              index < messages.length - 1 &&
              messages[index + 1]?.role === "user" &&
              messages[index + 1]?.content.toLowerCase().includes("view complete list");

            const actionState =
              actionStates[msg.id] ||
              (hasFollowingFullList ? "full_list" : null);

            return (
              <ChatMessageItem
                key={msg.id}
                msg={msg}
                onSelectAction={handleSelectAction}
                onDismissAction={handleDismissAction}
                actionState={actionState}
                isLoading={isLoading}
              />
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex px-0 sm:px-4 md:px-8 lg:px-12 xl:px-16 justify-start">
            <div className="flex max-w-4xl items-start gap-3 w-full text-foreground py-1">
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2 pt-1 pb-1">
                  <Eclipse size={18} className="text-primary shrink-0" />
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
