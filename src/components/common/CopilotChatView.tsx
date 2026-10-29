"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ArrowRight, CalendarDays, AlertTriangle, X, Check, RotateCcw, Plus, Users, LayoutDashboard, Ticket, Folder, CheckSquare, ChevronDown, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { chatService } from "@/services/chat/chat.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchTaskSpaces } from "@/services/task-management/task-space.service";
import { searchTicketSpaces } from "@/services/ticket-management/ticket-space.service";
import { loadResourcePools } from "@/services/resource-management/resource-pool-service";
import { cn } from "@/lib/utils";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import { useAuth } from "@/contexts/auth.context";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ReactECharts from 'echarts-for-react';
import { Atom, Eclipse } from "loading-dev";
import { type IconHandle } from "@animateicons/react";
import {
  SparklesIcon,
  UsersIcon,
  LayoutDashboardIcon,
  TicketIcon as AnimatedTicketIcon,
} from "@animateicons/react/lucide";
import { InlineCopilotBadge } from "@/components/common/CopilotToolbarButton";

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

// Continuously looping animated icon for analysts using @animateicons/react
function ContinuousAnimatedAnalystIcon({
  agent,
  mode,
}: {
  agent?: "resource_analytics" | "project_analytics" | "ticket_analytics";
  mode?: "full" | "panel";
}) {
  const iconRef = useRef<IconHandle>(null);

  const IconComponent = useMemo(() => {
    if (mode === "panel") {
      if (agent === "project_analytics") return LayoutDashboardIcon;
      if (agent === "ticket_analytics") return AnimatedTicketIcon;
      return UsersIcon;
    }
    return SparklesIcon;
  }, [agent, mode]);

  const isSparkles = IconComponent === SparklesIcon;

  const animationDuration = useMemo(() => {
    if (IconComponent === UsersIcon) return 1.5; // 50% slower, smoother motion for Users
    if (IconComponent === SparklesIcon) return 1.3; // Tuned for a slightly faster, energetic cadence
    return 1;
  }, [IconComponent]);

  useEffect(() => {
    let isMounted = true;

    const runLoop = async () => {
      // Small initial delay on mount / component change
      await new Promise((r) => setTimeout(r, 380));

      while (isMounted) {
        if (!iconRef.current) break;

        // Run animation and await full natural completion
        const animResult = iconRef.current.startAnimation() as unknown;
        if (animResult && typeof (animResult as Promise<void>).then === "function") {
          await animResult;
        } else {
          await new Promise((r) => setTimeout(r, Math.round(900 * animationDuration)));
        }

        if (!isMounted) break;

        // Reset to normal state cleanly
        iconRef.current?.stopAnimation();

        // Breathing pause before next iteration (850ms for sparkles, 250ms for others)
        await new Promise((r) => setTimeout(r, isSparkles ? 850 : 250));
      }
    };

    runLoop();

    return () => {
      isMounted = false;
    };
  }, [IconComponent, animationDuration, isSparkles]);

  return (
    <div
      className={cn(
        "flex items-center justify-center mb-4 cursor-pointer",
        isSparkles ? "copilot-chat-sparkles-icon" : "text-primary"
      )}
      onClick={() => iconRef.current?.startAnimation()}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      title="Synlio Co-Pilot"
    >
      {isSparkles && (
        <svg
          width="0"
          height="0"
          className="absolute pointer-events-none"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient
              id="synlio-chat-logo-gradient"
              gradientUnits="userSpaceOnUse"
              x1="6"
              y1="2"
              x2="18"
              y2="22"
            >
              <stop offset="0%" stopColor="#2DD4BF" />
              <stop offset="25%" stopColor="#06B6D4" />
              <stop offset="55%" stopColor="#2563EB" />
              <stop offset="80%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
          </defs>
        </svg>
      )}

      <IconComponent
        ref={iconRef}
        size={40}
        duration={animationDuration}
        className={isSparkles ? "" : "text-primary"}
        isAnimated={false}
      />

      {isSparkles && (
        <style>{`
          .copilot-chat-sparkles-icon svg {
            overflow: visible !important;
          }
          .copilot-chat-sparkles-icon svg,
          .copilot-chat-sparkles-icon path,
          .copilot-chat-sparkles-icon circle,
          .copilot-chat-sparkles-icon g {
            stroke: url(#synlio-chat-logo-gradient) !important;
          }
          .copilot-chat-sparkles-icon path:first-child {
            fill: url(#synlio-chat-logo-gradient);
            fill-opacity: 0.22;
          }
          .copilot-chat-sparkles-icon circle {
            fill: url(#synlio-chat-logo-gradient);
            fill-opacity: 0.9;
          }
        `}</style>
      )}
    </div>
  );
}

import { TicketDraftCard } from "@/components/copilot/TicketDraftCard";

export interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  isThinking?: boolean;
  isStreaming?: boolean;
  draftPayload?: any;
  attachments?: Array<{ name: string; size?: number; type?: string }>;
}

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

// Hook to observe live CSS variable changes on <html>
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

const renderCleanProseText = (children: React.ReactNode): React.ReactNode => {
  if (typeof children === 'string') {
    let text = children;
    if (text.includes('{{')) {
      text = text.replace(/\{\{[^:]+::([^:}]+)(?:::.*?)?\}\}/g, '$1');
    }

    if (/co-pilot/i.test(text)) {
      const parts = text.split(/(co-pilot)/i);
      return parts.map((part, idx) => {
        if (/^co-pilot$/i.test(part)) {
          return <InlineCopilotBadge key={`inline-copilot-${idx}`} />;
        }
        return part;
      });
    }

    return text;
  }

  if (Array.isArray(children)) {
    return React.Children.map(children, child => renderCleanProseText(child));
  }

  if (React.isValidElement(children)) {
    const props: any = children.props;
    if (props && props.children) {
      return React.cloneElement(children as React.ReactElement<any>, undefined, renderCleanProseText(props.children));
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
    return <div className="mb-4 last:mb-0 whitespace-pre-wrap" {...props}>{renderCleanProseText(children)}</div>;
  },
  strong: ({ node, children, ...props }: any) => <strong className="font-semibold text-foreground" {...props}>{renderCleanProseText(children)}</strong>,
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
    return <li className="leading-relaxed" {...props}>{renderCleanProseText(children)}</li>;
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

            // Extract the scalar value for this specific series from dataset row
            let val = item.value;
            if (typeof val === 'object' && val !== null) {
              if (Array.isArray(val)) {
                if (item.encode?.y && item.encode.y.length > 0 && val[item.encode.y[0]] !== undefined) {
                  val = val[item.encode.y[0]];
                } else if (item.encode?.x && item.encode.x.length > 0 && typeof val[item.encode.x[0]] === 'number') {
                  val = val[item.encode.x[0]];
                } else if (item.encode?.value && item.encode.value.length > 0 && val[item.encode.value[0]] !== undefined) {
                  val = val[item.encode.value[0]];
                } else if (Array.isArray(item.dimensionNames) && seriesName) {
                  const dimIdx = item.dimensionNames.indexOf(seriesName);
                  if (dimIdx >= 0 && val[dimIdx] !== undefined) {
                    val = val[dimIdx];
                  } else if (typeof item.seriesIndex === 'number' && val[item.seriesIndex + 1] !== undefined) {
                    val = val[item.seriesIndex + 1];
                  } else {
                    val = val[val.length - 1];
                  }
                } else if (typeof item.seriesIndex === 'number' && val[item.seriesIndex + 1] !== undefined) {
                  val = val[item.seriesIndex + 1];
                } else if (val.length === 2 && (typeof val[1] === 'number' || typeof val[1] === 'string')) {
                  val = val[1];
                } else {
                  const num = val.find((v: any, idx: number) => idx > 0 && typeof v === 'number');
                  val = num !== undefined ? num : val[val.length - 1];
                }
              } else {
                val = val.value ?? JSON.stringify(val);
              }
            }

            if (typeof val === 'string') {
              const tagMatch = val.match(/^\{\{\w+::([^:]+)(?:::.*)?\}\}$/);
              if (tagMatch) val = tagMatch[1];
            }

            const percentStr = item.percent !== undefined ? ` (${item.percent}%)` : '';

            html += `<div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 12px; line-height: 1.5; color: ${axisColor};">`;
            html += `<span style="display: inline-flex; align-items: center; gap: 6px;">`;
            html += `<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; flex-shrink: 0;"></span>`;
            html += `<span>${seriesName || 'Total'}</span>`;
            html += `</span>`;
            html += `<span style="font-weight: 600; font-family: monospace; color: ${textColor};">${val !== undefined && val !== null ? val : 0}${percentStr}</span>`;
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
    const tagMatch = codeText.match(/^\{\{[^:]+::([^:}]+)(?:::.*)?\}\}$/);
    if (tagMatch) {
      return <strong className="font-semibold text-foreground">{tagMatch[1]}</strong>;
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
  isLatest?: boolean;
  onSelectAction?: (actionText: string, msgId?: string) => void;
  onDismissAction?: (msgId: string) => void;
  actionState?: 'dismissed' | 'full_list' | null;
  isLoading?: boolean;
  mode?: "full" | "panel";
  onSelectOption?: (optionName: string, msgId?: string) => void;
  onCancelDraft?: (msgId: string) => void;
}

const ChatMessageItem = React.memo(function ChatMessageItem({
  msg,
  isLatest = true,
  onSelectAction,
  onDismissAction,
  actionState = null,
  isLoading = false,
  mode = "full",
  onSelectOption,
  onCancelDraft,
}: ChatMessageItemProps) {
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
    previewCount > 1 &&
    (
      msg.content.includes("preview of") ||
      msg.content.includes("sample records") ||
      msg.content.includes("example records") ||
      msg.content.includes("<!--preview_count:")
    )
  );

  return (
    <div
      className={`flex w-full ${mode === "panel" ? "px-2" : "px-0 sm:px-4 md:px-8 lg:px-12 xl:px-16"} ${msg.role === "user" ? "justify-end" : "justify-start"}`}
    >
      {msg.role === "user" ? (
        <div className={`flex flex-col items-end ${mode === "panel" ? "max-w-[85%]" : "max-w-[80%]"} gap-1.5`}>
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-1.5 mb-0.5">
              {msg.attachments.map((att, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="py-0.5 px-2 text-xs gap-1.5 select-none shadow-none font-normal hover:bg-muted/70 hover:border-foreground/30 transition-all text-foreground cursor-default"
                >
                  <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="font-semibold text-foreground truncate max-w-[200px]">{att.name}</span>
                  {att.size ? (
                    <span className="text-xs text-muted-foreground shrink-0">
                      ({Math.round(att.size / 1024) || 1} KB)
                    </span>
                  ) : null}
                </Badge>
              ))}
            </div>
          )}
          {msg.content && (
            <div className="rounded-2xl px-4 py-2 border bg-primary text-primary-foreground rounded-tr-xs shadow-xs">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          )}
        </div>
      ) : (
        <div className={`flex items-start gap-3 w-full text-foreground py-1 ${mode === "panel" ? "max-w-none" : "max-w-4xl"}`}>
          <div className="flex-1 w-full overflow-hidden">
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
                    .replace(/(I've prepared [^\n]+)\n+(Please review the details before proceeding\.)/gi, '$1 $2')
                    .replace(/<!--preview_count:\d+-->/g, '')
                    .replace(/(###\s*(?:Key Findings|Overview)[\s\S]*?)(?=\n###|$)/gi, (section) => {
                      return section
                        .replace(/\n\s*\*{0,2}\{\{[^:]+::([^:}]+)(?:::.*?)?\}\}\*{0,2}\s*(?:\n\s*)?\./g, ' **$1**.')
                        .replace(/\*{0,2}\{\{[^:]+::([^:}]+)(?:::.*?)?\}\}\*{0,2}/g, '**$1**');
                    })
                    .replace(/\n\s+(\{\{[^}]+::[^}]+\}\})/g, ' $1 ')
                    .replace(/\n*###\s/g, '\n\n### ')
                    .replace(/###\s*(Pie Chart|Bar Chart|Line Chart|Table)?:\s*/gi, '### ')
                    .replace(/###\s*\d+\.\s*/g, '### ')}
                </ReactMarkdown>

                {msg.draftPayload && mode === "panel" && (msg.draftPayload.status !== "NEEDS_INPUT" || isLatest) && (
                  <TicketDraftCard
                    payload={msg.draftPayload}
                    onSelectOption={(_field, opt) => {
                      onSelectOption?.(opt.name, msg.id);
                    }}
                    onCancel={() => {
                      onCancelDraft?.(msg.id);
                    }}
                  />
                )}

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
                            onClick={() => onSelectAction?.("bring all data", msg.id)}
                            className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
                          >
                            Bring all data
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
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.mode === nextProps.mode
  );
});

export interface SampleQuestion {
  text: string;
  domain: "Resource" | "Project" | "Ticket";
  isClickable: boolean;
}

export interface CopilotChatViewProps {
  mode?: "full" | "panel";
  agent?: "resource_analytics" | "project_analytics" | "ticket_analytics";
  context?: Record<string, any>;
  pageTitle?: string;
  suggestedPrompts?: string[];
  conversationId?: string;
  onResetThread?: () => void;
  onClose?: () => void;
}

export function CopilotChatView({
  mode = "full",
  agent,
  context,
  pageTitle,
  suggestedPrompts: customPrompts,
  conversationId: externalConvId,
  onResetThread,
  onClose,
}: CopilotChatViewProps) {
  const pathname = usePathname() || "";

  const { user } = useAuth();
  const [localUser, setLocalUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [actionStates, setActionStates] = useState<Record<string, 'dismissed' | 'full_list'>>({});
  const [pendingDraft, setPendingDraft] = useState<any>(null);

  const [internalConvId, setInternalConvId] = useState<string>(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  });
  const conversationId = externalConvId || internalConvId;

  // Reset chat messages and input when external conversationId changes
  const prevConvIdRef = useRef(externalConvId);
  useEffect(() => {
    if (prevConvIdRef.current && externalConvId && prevConvIdRef.current !== externalConvId) {
      setMessages([]);
      setInput("");
      setActionStates({});
      setIsLoading(false);
    }
    prevConvIdRef.current = externalConvId;
  }, [externalConvId]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { setBreadcrumbs } = useBreadcrumb();

  useEffect(() => {
    if (mode === "full") {
      setBreadcrumbs([{ label: "Co-Pilot", href: "/chat", isCurrentPage: true }]);
    }
  }, [mode, setBreadcrumbs]);

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

  // Dynamic context state: allows switching spaces or unchecking them
  const [activeContext, setActiveContext] = useState<Record<string, any>>(() => context || {});
  const [openPopoverBadgeId, setOpenPopoverBadgeId] = useState<string | null>(null);
  const [availableSpaces, setAvailableSpaces] = useState<Record<string, { id: string | number; name: string }[]>>({});
  const [loadingSpaces, setLoadingSpaces] = useState<Record<string, boolean>>({});

  // Document attachment state for Co-Pilot
  interface CopilotAttachment {
    name: string;
    size: number;
    type: string;
    base64?: string;
    contentText?: string;
  }
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<CopilotAttachment[]>([]);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const processFiles = async (files: File[]) => {
    setIsReadingFile(true);
    const newAttachments: CopilotAttachment[] = [];

    for (const file of files) {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      try {
        if ([".txt", ".csv", ".md", ".json", ".log"].includes(ext)) {
          const text = await file.text();
          newAttachments.push({
            name: file.name,
            size: file.size,
            type: file.type || "text/plain",
            contentText: text,
          });
        } else {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          newAttachments.push({
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            base64,
          });
        }
      } catch (err) {
        console.error(`Failed to read file ${file.name}:`, err);
        toast.error(`Could not read ${file.name}`);
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    setIsReadingFile(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    setActiveContext(context || {});
  }, [context]);

  // Compute dynamic placeholder based on active context / space selections
  const inputPlaceholder = useMemo(() => {
    // 1. Task Management Domain
    const subtaskName = !activeContext?._unselected_parent_task
      ? (activeContext?.parentTaskName || activeContext?.subtaskName)
      : undefined;

    const taskSpaceName = !activeContext?._unselected_task_space
      ? (
        activeContext?.taskSpaceName ||
        ((agent === "project_analytics" || pathname.includes("/task")) ? activeContext?.spaceName : undefined) ||
        (pageTitle?.startsWith("Space: ") ? pageTitle.replace("Space: ", "").trim() : undefined)
      )
      : undefined;

    const isTaskDomain =
      agent === "project_analytics" ||
      Boolean(pathname.includes("/task-management") || pathname.includes("/task")) ||
      Boolean(subtaskName || taskSpaceName || activeContext?.taskSpaceId || activeContext?.parentTaskId);

    if (isTaskDomain) {
      if (subtaskName) {
        return `Ask about ${subtaskName} subtasks or progress...`;
      }
      if (taskSpaceName) {
        return `Ask about tasks or status in ${taskSpaceName}...`;
      }
      return "Ask about tasks, deadlines, or project progress...";
    }

    // 2. Ticket Management Domain
    const ticketSpaceName = !activeContext?._unselected_ticket_space
      ? (
        activeContext?.ticketSpaceName ||
        ((agent === "ticket_analytics" || pathname.includes("/ticket")) ? activeContext?.spaceName : undefined) ||
        (pageTitle?.startsWith("Space: ") ? pageTitle.replace("Space: ", "").trim() : undefined)
      )
      : undefined;

    const isTicketDomain =
      agent === "ticket_analytics" ||
      Boolean(pathname.includes("/ticket-management") || pathname.includes("/ticket")) ||
      Boolean(ticketSpaceName || activeContext?.ticketSpaceId);

    if (isTicketDomain) {
      if (ticketSpaceName) {
        return `Ask about ${ticketSpaceName} tickets or SLAs...`;
      }
      return "Ask about tickets, queues, or SLA deadlines...";
    }

    // 3. Resource Management Domain
    const poolName = !activeContext?._unselected_resource_group
      ? (
        activeContext?.resourceGroupName ||
        activeContext?.resourcePoolName ||
        activeContext?.poolName ||
        (pageTitle?.startsWith("Group: ") && pageTitle !== "Group: Resource Group"
          ? pageTitle.replace("Group: ", "").trim()
          : undefined)
      )
      : undefined;

    const isResourceDomain =
      agent === "resource_analytics" ||
      Boolean(pathname.includes("/resource")) ||
      Boolean(poolName || activeContext?.resourceGroupId || activeContext?.resourcePoolId || activeContext?.poolId);

    if (isResourceDomain) {
      if (poolName && String(poolName).trim() && String(poolName).trim() !== "none") {
        return `Ask about ${poolName}'s capacity or workload...`;
      }
      return "Ask about team capacity, workloads, or allocation...";
    }

    // 4. General Co-Pilot Chat (/chat) & Fallback
    return "Ask anything about tasks, tickets, or resources...";
  }, [activeContext, agent, pathname, pageTitle]);

  const fetchSpacesForType = async (type: "resource_group" | "task_space" | "ticket_space") => {
    if (availableSpaces[type] && availableSpaces[type].length > 0) return;
    setLoadingSpaces((prev) => ({ ...prev, [type]: true }));
    try {
      if (type === "resource_group") {
        const res = await loadResourcePools({ first: 0, rows: 100 });
        const items = (res?.data || []).map((p: any) => ({
          id: p.resource_pool_id ?? p.id,
          name: p.resource_pool_name ?? p.name,
        })).filter((x: any) => Boolean(x.name));
        setAvailableSpaces((prev) => ({ ...prev, [type]: items }));
      } else if (type === "task_space") {
        const res = await searchTaskSpaces({ rows: 100 });
        const items = (res?.data || []).map((s: any) => ({
          id: s.task_space_id ?? s.taskSpaceId ?? s.id,
          name: s.task_space_name ?? s.taskSpaceName ?? s.space_name ?? s.name,
        })).filter((x: any) => Boolean(x.name));
        setAvailableSpaces((prev) => ({ ...prev, [type]: items }));
      } else if (type === "ticket_space") {
        const res = await searchTicketSpaces({ rows: 100 });
        const items = (res?.data || []).map((s: any) => ({
          id: s.ticket_space_id ?? s.ticketSpaceId ?? s.id,
          name: s.ticket_space_name ?? s.ticketSpaceName ?? s.name,
        })).filter((x: any) => Boolean(x.name));
        setAvailableSpaces((prev) => ({ ...prev, [type]: items }));
      }
    } catch (err) {
      console.error(`Error loading spaces for ${type}:`, err);
    } finally {
      setLoadingSpaces((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleSelectSpace = (badgeType: string, space: { id: string | number; name: string }, currentId?: string | number) => {
    const isAlreadySelected = currentId !== undefined && String(currentId) === String(space.id);
    setActiveContext((prev) => {
      const next = { ...prev };
      if (isAlreadySelected) {
        // User clicked the currently selected item again -> uncheck it (set to All)
        if (badgeType === "resource_group") {
          delete next.resourceGroupId;
          delete next.resourceGroupName;
          delete next.resourcePoolId;
          delete next.resourcePoolName;
          delete next.poolId;
          delete next.poolName;
          next._unselected_resource_group = true;
        } else if (badgeType === "task_space") {
          delete next.taskSpaceId;
          delete next.taskSpaceName;
          delete next.spaceId;
          delete next.spaceName;
          next._unselected_task_space = true;
        } else if (badgeType === "ticket_space") {
          delete next.ticketSpaceId;
          delete next.ticketSpaceName;
          next._unselected_ticket_space = true;
        }
      } else {
        // Select the clicked space
        if (badgeType === "resource_group") {
          delete next._unselected_resource_group;
          next.resourceGroupId = space.id;
          next.resourceGroupName = space.name;
          next.resourcePoolId = space.id;
          next.resourcePoolName = space.name;
          next.poolId = space.id;
          next.poolName = space.name;
        } else if (badgeType === "task_space") {
          delete next._unselected_task_space;
          next.taskSpaceId = space.id;
          next.taskSpaceName = space.name;
          next.spaceId = space.id;
          next.spaceName = space.name;
        } else if (badgeType === "ticket_space") {
          delete next._unselected_ticket_space;
          next.ticketSpaceId = space.id;
          next.ticketSpaceName = space.name;
        }
      }
      return next;
    });
  };

  // Extract scoped parameters to display as dashed badges inside the input area
  const contextBadges = useMemo(() => {
    if (!activeContext) return [];
    const items: {
      id: string;
      type: "resource_group" | "task_space" | "ticket_space" | "parent_task" | "ticket" | "task";
      label: string;
      value: string;
      currentId?: string | number;
      isUnselected?: boolean;
      icon?: React.ReactNode;
    }[] = [];

    // 1. Resource Group / Pool
    const isResourceDomain =
      agent === "resource_analytics" ||
      Boolean(pathname.includes("/resource")) ||
      Boolean(activeContext.resourceGroupName || activeContext.resourceGroupId);

    const rgName = activeContext.resourceGroupName || activeContext.resourcePoolName || activeContext.poolName;
    const rgId = activeContext.resourceGroupId || activeContext.resourcePoolId || activeContext.poolId;

    if (isResourceDomain && mode === "panel") {
      const isSelected = Boolean(rgName || (rgId && rgId !== "none")) && !activeContext._unselected_resource_group;
      items.push({
        id: "resource_group",
        type: "resource_group",
        label: "Resource Group",
        value: isSelected ? String(rgName || `ID: ${rgId}`) : "All Resource Groups Selected",
        currentId: isSelected ? rgId : undefined,
        isUnselected: !isSelected,
      });
    } else if (rgName || (rgId && rgId !== "none")) {
      items.push({
        id: "resource_group",
        type: "resource_group",
        label: "Resource Group",
        value: String(rgName || `ID: ${rgId}`),
        currentId: rgId,
        isUnselected: false,
      });
    }

    // 2. Task Space
    const isTaskDomain =
      agent === "project_analytics" ||
      Boolean(pathname.includes("/task")) ||
      Boolean(activeContext.taskSpaceName || activeContext.taskSpaceId);

    const tsName = activeContext.taskSpaceName || activeContext.spaceName;
    const tsId = activeContext.taskSpaceId || activeContext.spaceId;

    if (isTaskDomain && mode === "panel") {
      const isSelected = Boolean(tsName || (tsId && tsId !== "none")) && !activeContext._unselected_task_space;
      items.push({
        id: "task_space",
        type: "task_space",
        label: "Task Space",
        value: isSelected ? String(tsName || `ID: ${tsId}`) : "All Task Spaces Selected",
        currentId: isSelected ? tsId : undefined,
        isUnselected: !isSelected,
        icon: <Folder className="w-3 h-3 text-primary shrink-0" />,
      });
    } else if (tsName || (tsId && tsId !== "none")) {
      items.push({
        id: "task_space",
        type: "task_space",
        label: "Task Space",
        value: String(tsName || `ID: ${tsId}`),
        currentId: tsId,
        isUnselected: false,
        icon: <Folder className="w-3 h-3 text-primary shrink-0" />,
      });
    }

    // 3. Parent Task
    const ptName = activeContext.parentTaskName;
    const ptId = activeContext.parentTaskId;
    if (ptName || (ptId && ptId !== "none")) {
      items.push({
        id: "parent_task",
        type: "parent_task",
        label: "Parent Task",
        value: String(ptName || `ID: ${ptId}`),
        currentId: ptId,
        icon: <CheckSquare className="w-3 h-3 text-primary shrink-0" />,
      });
    }

    // 4. Ticket Space
    const isTicketDomain =
      agent === "ticket_analytics" ||
      Boolean(pathname.includes("/ticket")) ||
      Boolean(activeContext.ticketSpaceName || activeContext.ticketSpaceId);

    const tksName = activeContext.ticketSpaceName;
    const tksId = activeContext.ticketSpaceId;

    if (isTicketDomain && mode === "panel") {
      const isSelected = Boolean(tksName || (tksId && tksId !== "none")) && !activeContext._unselected_ticket_space;
      items.push({
        id: "ticket_space",
        type: "ticket_space",
        label: "Ticket Space",
        value: isSelected ? String(tksName || `ID: ${tksId}`) : "No space selected",
        currentId: isSelected ? tksId : undefined,
        isUnselected: !isSelected,
        icon: <Ticket className="w-3 h-3 text-primary shrink-0" />,
      });
    } else if (tksName || (tksId && tksId !== "none")) {
      items.push({
        id: "ticket_space",
        type: "ticket_space",
        label: "Ticket Space",
        value: String(tksName || `ID: ${tksId}`),
        currentId: tksId,
        isUnselected: false,
        icon: <Ticket className="w-3 h-3 text-primary shrink-0" />,
      });
    }

    // 5. Specific Ticket
    const ticketTitle = activeContext.ticketName || activeContext.ticketTitle;
    const ticketId = activeContext.ticketId;
    if (ticketTitle || (ticketId && ticketId !== "none")) {
      items.push({
        id: "ticket",
        type: "ticket",
        label: "Ticket",
        value: String(ticketTitle || `ID: ${ticketId}`),
        currentId: ticketId,
        icon: <Ticket className="w-3 h-3 text-primary shrink-0" />,
      });
    }

    // 6. Specific Task
    const taskName = activeContext.taskName || activeContext.taskTitle;
    const taskId = activeContext.taskId;
    if (taskName || (taskId && taskId !== "none")) {
      items.push({
        id: "task",
        type: "task",
        label: "Task",
        value: String(taskName || `ID: ${taskId}`),
        currentId: taskId,
        icon: <Check className="w-3 h-3 text-primary shrink-0" />,
      });
    }

    return items;
  }, [activeContext]);

  // Screen-specific vs full-chat sample questions (dynamically tailored to selected context parameters)
  const sampleQuestions: SampleQuestion[] = React.useMemo(() => {
    if (customPrompts && customPrompts.length > 0) {
      return customPrompts.map((p) => ({
        text: p,
        domain: (agent === "project_analytics" ? "Project" : agent === "ticket_analytics" ? "Ticket" : "Resource") as any,
        isClickable: agent === "resource_analytics",
      }));
    }

    const group = !activeContext?._unselected_resource_group
      ? (activeContext?.resourceGroupName || activeContext?.resourcePoolName || activeContext?.poolName)
      : undefined;
    const space = !activeContext?._unselected_task_space
      ? (activeContext?.taskSpaceName || activeContext?.spaceName)
      : undefined;
    const parentTask = !activeContext?._unselected_parent_task
      ? (activeContext?.parentTaskName)
      : undefined;
    const ticketSpace = !activeContext?._unselected_ticket_space
      ? (activeContext?.ticketSpaceName)
      : undefined;

    if (agent === "resource_analytics" || (!agent && group)) {
      if (group) {
        return [
          { text: `Who is currently overloaded in ${group} this week?`, domain: "Resource", isClickable: true },
          { text: `Show ${group} workload distribution in a chart`, domain: "Resource", isClickable: true },
          { text: `Who has available capacity in ${group}?`, domain: "Resource", isClickable: true },
          { text: `What is total planned vs capacity hours for ${group}?`, domain: "Resource", isClickable: true },
        ];
      }
      return [
        { text: "Who is currently overloaded this week?", domain: "Resource", isClickable: true },
        { text: "Show team workload distribution in a chart", domain: "Resource", isClickable: true },
        { text: "Who has available capacity?", domain: "Resource", isClickable: true },
        { text: "What is our total planned vs capacity hours?", domain: "Resource", isClickable: true },
      ];
    }

    if (agent === "project_analytics" || (!agent && (space || parentTask))) {
      if (parentTask) {
        return [
          { text: `Show subtasks and progress for "${parentTask}"`, domain: "Project", isClickable: false },
          { text: `Which subtasks under "${parentTask}" are overdue?`, domain: "Project", isClickable: false },
          { text: `Show tasks grouped by priority for "${parentTask}"`, domain: "Project", isClickable: false },
          { text: `What are active tasks for "${parentTask}" this week?`, domain: "Project", isClickable: false },
        ];
      }
      if (space) {
        return [
          { text: `Show task status distribution in ${space}`, domain: "Project", isClickable: false },
          { text: `Which tasks are currently overdue in ${space}?`, domain: "Project", isClickable: false },
          { text: `Show tasks grouped by priority in ${space}`, domain: "Project", isClickable: false },
          { text: `What are active tasks in ${space} this week?`, domain: "Project", isClickable: false },
        ];
      }
      return [
        { text: "Show task status distribution in a chart", domain: "Project", isClickable: false },
        { text: "Which tasks are currently overdue?", domain: "Project", isClickable: false },
        { text: "Show tasks grouped by priority", domain: "Project", isClickable: false },
        { text: "What are our active tasks for this week?", domain: "Project", isClickable: false },
      ];
    }

    if (agent === "ticket_analytics" || (!agent && ticketSpace)) {
      if (ticketSpace) {
        return [
          { text: `Show open tickets in ${ticketSpace} by priority`, domain: "Ticket", isClickable: false },
          { text: `Ticket breakdown by queue in ${ticketSpace}`, domain: "Ticket", isClickable: false },
          { text: `Which tickets are currently high severity in ${ticketSpace}?`, domain: "Ticket", isClickable: false },
          { text: `Show ticket status distribution for ${ticketSpace}`, domain: "Ticket", isClickable: false },
        ];
      }
      return [
        { text: "Show open tickets by priority", domain: "Ticket", isClickable: false },
        { text: "Ticket breakdown by queue in a chart", domain: "Ticket", isClickable: false },
        { text: "Which tickets are currently high severity?", domain: "Ticket", isClickable: false },
        { text: "Show ticket status distribution", domain: "Ticket", isClickable: false },
      ];
    }

    // In full chat page or general mode: give questions for resource, project, and ticket
    return [
      { text: "Who is currently overloaded this week?", domain: "Resource", isClickable: true },
      { text: "Show team workload distribution in a chart", domain: "Resource", isClickable: true },
      { text: "Which tasks are currently overdue?", domain: "Project", isClickable: false },
      { text: "Show task status distribution in a chart", domain: "Project", isClickable: false },
      { text: "Show open tickets by priority", domain: "Ticket", isClickable: false },
      { text: "Which tickets are currently high severity?", domain: "Ticket", isClickable: false },
    ];
  }, [agent, customPrompts, activeContext]);

  const handleQuestionClick = (q: SampleQuestion) => {
    if (q.isClickable) {
      sendMessage(q.text);
    } else {
      toast.info(
        `${q.domain === "Project" ? "Project Analasist" : "Ticket Analasist"} will be available soon!`
      );
    }
  };

  const handleResetConversation = () => {
    setMessages([]);
    setInput("");
    setActionStates({});
    const newId = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setInternalConvId(newId);
    if (onResetThread) onResetThread();
  };

  const handleSelectAction = (actionText: string, msgId?: string) => {
    if (msgId) {
      setActionStates((prev) => ({ ...prev, [msgId]: 'full_list' }));
    }
    sendMessage(actionText);
  };

  const handleDismissAction = (msgId: string) => {
    setActionStates((prev) => ({ ...prev, [msgId]: 'dismissed' }));
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
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

  const sendMessage = async (text: string, attachedDocs?: CopilotAttachment[]) => {
    const hasAttachments = attachedDocs && attachedDocs.length > 0;
    if (!text.trim() && !hasAttachments) return;
    if (isLoading) return;

    const displayContent = text.trim();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: displayContent,
      attachments: hasAttachments ? attachedDocs.map((a) => ({ name: a.name, size: a.size, type: a.type })) : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let aiMessageId: string | null = null;

    try {
      // Extract recent completed conversation history (last 6 messages: ~3 turns)
      const recentHistory = messages
        .filter((m) => (m.role === "user" || m.role === "ai") && !m.isThinking && !m.isStreaming && m.content?.trim())
        .slice(-6)
        .map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.content,
        }));

      // Normalize context to include both camelCase and snake_case so backend/AI receives exact filters
      const effectiveContext: Record<string, any> = { ...activeContext };
      Object.keys(effectiveContext).forEach((k) => {
        if (k.startsWith("_unselected_")) {
          delete effectiveContext[k];
        }
      });

      const hasAnyContext = Object.keys(effectiveContext).length > 0;
      const normalizedContext = hasAnyContext ? {
        ...effectiveContext,
        chatMode: mode,
        mode: mode,
        resource_group_id: effectiveContext.resource_group_id || effectiveContext.resourceGroupId || effectiveContext.resourcePoolId,
        resource_group_name: effectiveContext.resource_group_name || effectiveContext.resourceGroupName || effectiveContext.resourcePoolName || effectiveContext.poolName,
        task_space_id: effectiveContext.task_space_id || effectiveContext.taskSpaceId,
        task_space_name: effectiveContext.task_space_name || effectiveContext.taskSpaceName || effectiveContext.spaceName,
        parent_task_id: effectiveContext.parent_task_id || effectiveContext.parentTaskId,
        parent_task_name: effectiveContext.parent_task_name || effectiveContext.parentTaskName,
        ticket_space_id: effectiveContext.ticket_space_id || effectiveContext.ticketSpaceId,
        ticket_space_name: effectiveContext.ticket_space_name || effectiveContext.ticketSpaceName,
      } : { chatMode: mode, mode: mode };

      const attachmentsPayload = (attachedDocs || []).map((a) => ({
        filename: a.name,
        mimeType: a.type,
        content: a.base64,
        contentText: a.contentText,
      }));

      const queryText = text.trim() || (hasAttachments ? "Please review the attached document and create ticket drafts for all identified tasks, issues, or action items." : "");

      const response = await chatService.streamChat(
        queryText,
        conversationId,
        agent,
        normalizedContext,
        recentHistory,
        pendingDraft,
        mode,
        attachmentsPayload.length > 0 ? attachmentsPayload : undefined
      );

      aiMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: aiMessageId!, role: "ai", content: "", isThinking: true, isStreaming: true },
      ]);

      setIsLoading(false);

      const reader = response.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = "";
      let capturedPayload: any = null;

      while (!done && reader) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const rawChunk = decoder.decode(value, { stream: true });
          accumulatedText += rawChunk;

          let displayChunk = rawChunk;

          // Check if stream emitted a structured draft payload
          if (accumulatedText.includes("__DRAFT_PAYLOAD__")) {
            const parts = accumulatedText.split("__DRAFT_PAYLOAD__");
            try {
              capturedPayload = JSON.parse(parts[1].trim());
              const draftsToSave =
                capturedPayload?.drafts && Array.isArray(capturedPayload.drafts) && capturedPayload.drafts.length > 0
                  ? capturedPayload.drafts
                  : capturedPayload?.draft;
              if (draftsToSave) {
                setPendingDraft(draftsToSave);
              }
            } catch {
              // Wait for full JSON chunk
            }
          }

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === aiMessageId) {
                const nextMsg = { ...msg };
                if (capturedPayload) {
                  nextMsg.draftPayload = capturedPayload;
                }

                if (displayChunk.includes("__FINAL__")) {
                  const finalContent = displayChunk.split("__FINAL__").pop() || "";
                  const cleanContent = finalContent.split("__DRAFT_PAYLOAD__")[0];
                  return { ...nextMsg, content: cleanContent, isThinking: false, isStreaming: false };
                }
                if (displayChunk.includes("__REPLACE__")) {
                  return { ...nextMsg, content: displayChunk.split("__REPLACE__").pop() || "", isThinking: true, isStreaming: true };
                }
                const cleanChunk = displayChunk.split("__DRAFT_PAYLOAD__")[0];
                return { ...nextMsg, content: nextMsg.content + cleanChunk, isThinking: false, isStreaming: true };
              }
              return msg;
            })
          );
        }
      }

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === aiMessageId) {
            const finalContent = msg.content.split("__DRAFT_PAYLOAD__")[0];
            return {
              ...msg,
              content: finalContent || (capturedPayload?.summary || ""),
              draftPayload: capturedPayload || msg.draftPayload,
              isThinking: false,
              isStreaming: false,
            };
          }
          return msg;
        })
      );
    } catch (error) {
      console.error("Error communicating with backend:", error);
      const errorText = "Oops! Something went wrong communicating with the backend. Please ensure the server is running.";
      setMessages((prev) => {
        if (aiMessageId && prev.some((m) => m.id === aiMessageId)) {
          return prev.map((m) =>
            m.id === aiMessageId
              ? {
                  ...m,
                  content: errorText,
                  isThinking: false,
                  isStreaming: false,
                }
              : m
          );
        }
        return [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "ai",
            content: errorText,
            isThinking: false,
            isStreaming: false,
          },
        ];
      });
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading || isReadingFile) return;
    const currentAttachments = [...attachments];
    setAttachments([]);
    sendMessage(input, currentAttachments);
  };

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current += 1;
        if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
          setIsDragging(true);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current -= 1;
        if (dragCounterRef.current <= 0) {
          dragCounterRef.current = 0;
          setIsDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFiles(Array.from(e.dataTransfer.files));
        }
      }}
      className="flex flex-col h-full w-full bg-background relative overflow-hidden"
    >
      {/* Full-panel Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-background/85 backdrop-blur-xs flex flex-col items-center justify-center border-2 border-dashed border-primary m-3 rounded-2xl pointer-events-none animate-in fade-in-50 duration-150 select-none">
          <Paperclip className="w-7 h-7 mb-2" />
          <p className="text-sm font-semibold text-foreground">Drop document anywhere to attach</p>
          <p className="text-xs text-muted-foreground mt-0.5">PDF, DOCX, CSV, TXT, JSON, Markdown</p>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className={`flex-1 overflow-y-auto ${messages.length > 0 ? (mode === "panel" ? "p-4 space-y-4" : "p-6 mt-5 sm:p-8 space-y-6") : ""}`}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center px-4">
            {/* <Image
              src={Logo}
              alt="Synlio"
              width={44}
              height={44}
              className="w-12 h-12 mb-4 object-contain"
              priority
              unoptimized
            /> */}
            <ContinuousAnimatedAnalystIcon agent={agent} mode={mode} />
            <p className="text-lg font-semibold text-foreground tracking-tight">
              {mode === "panel" ? (
                agent === "project_analytics"
                  ? "Project Analyst is ready to help"
                  : agent === "ticket_analytics"
                    ? "Ticket Analyst is ready to help"
                    : "Resource Analyst is ready to help"
              ) : displayName ? (
                `How can I help you today, ${displayName}?`
              ) : (
                "How can I help you today?"
              )}
            </p>
            <p className={`text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed ${mode === "panel" ? "max-w-md" : "max-w-xl"}`}>
              {mode === "panel" ? (
                agent === "project_analytics" ? (
                  "Pick a prompt below or type what you need to create tasks, track milestones, or check project health."
                ) : agent === "ticket_analytics" ? (
                  "Pick a prompt below or type what you need to create tickets, monitor queues, or resolve issues."
                ) : (
                  "Pick a prompt below or type what you need to review allocations, manage capacity, or plan work."
                )
              ) : (
                <>
                  Pick a prompt below or type what you need to create tickets, manage tasks,
                  <br />
                  or explore insights across Resources, Projects, and Tickets.
                </>
              )}
            </p>

            {/* Suggested Question Chips */}
            <div className={`grid gap-2.5 mt-6 w-full ${mode === "panel" ? "grid-cols-1 max-w-md" : "grid-cols-1 sm:grid-cols-2 max-w-3xl"}`}>
              {sampleQuestions.map((question, i) => {
                const DomainIcon =
                  question.domain === "Resource"
                    ? Users
                    : question.domain === "Project"
                      ? LayoutDashboard
                      : Ticket;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleQuestionClick(question)}
                    className="flex items-center justify-between p-3.5 rounded-lg border border-input/60 bg-card hover:border-primary/40 text-left text-xs transition-all cursor-pointer group hover:shadow-xs"
                  >
                    <div className="flex flex-col gap-1.5 pr-2 min-w-0">
                      {/* <div className="flex items-center">
                        <Badge
                          variant="outline"
                        >
                          <DomainIcon className="h-3 w-3" />
                          <span>{question.domain}</span>
                        </Badge>
                      </div> */}
                      <span className="text-sm font-medium text-foreground line-clamp-2 leading-relaxed">
                        {question.text}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-primary transition-all duration-200 shrink-0 ml-2" />
                  </button>
                );
              })}
            </div>
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
                isLatest={index === messages.length - 1}
                onSelectAction={handleSelectAction}
                onDismissAction={handleDismissAction}
                actionState={actionState}
                isLoading={isLoading}
                mode={mode}
                onSelectOption={(optionName, msgId) => {
                  if (msgId) {
                    setMessages((prev) =>
                      prev.map((m) => (m.id === msgId ? { ...m, draftPayload: null } : m))
                    );
                  }
                  sendMessage(optionName);
                }}
                onCancelDraft={(msgId) => {
                  setPendingDraft(null);
                  setIsLoading(false);
                  const userDismissId = Date.now().toString();
                  const aiResponseId = (Date.now() + 1).toString();

                  setMessages((prev) => {
                    if (
                      prev.length > 0 &&
                      prev[prev.length - 1]?.content === "Process has been dismissed. Let me know if you need help with anything else!"
                    ) {
                      return prev;
                    }

                    const cleaned = prev.map((m) =>
                      !msgId || m.id === msgId ? { ...m, draftPayload: null } : m
                    );
                    return [
                      ...cleaned,
                      {
                        id: userDismissId,
                        role: "user",
                        content: "Dismiss the process",
                      },
                      {
                        id: aiResponseId,
                        role: "ai",
                        content: "Process has been dismissed. Let me know if you need help with anything else!",
                      },
                    ];
                  });
                }}
              />
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className={`flex ${mode === "panel" ? "px-2" : "px-0 sm:px-4 md:px-8 lg:px-12 xl:px-16"} justify-start`}>
            <div className="flex max-w-4xl items-start gap-3 w-full text-foreground py-1">
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2 pt-1 pb-1">
                  <Eclipse size={18} className="text-primary shrink-0" />
                  <span className="text-sm text-muted-foreground">Checking what you need...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-background">
        <form
          onSubmit={handleSubmit}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              processFiles(Array.from(e.dataTransfer.files));
            }
          }}
          className={cn(
            mode === "panel" ? "w-full max-w-none" : "max-w-4xl mx-auto",
            "relative flex flex-col overflow-hidden rounded-3xl border bg-card focus-within:ring-1 focus-within:ring-primary/40 transition-all shadow-none",
            isDragging ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-input"
          )}
        >
          {/* Selected Parameters Badges & Attached Documents (in the same row) */}
          {((mode === "panel" && contextBadges.length > 0) || attachments.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 px-3 pt-3 pb-0.5">
              {mode === "panel" && contextBadges.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground font-medium select-none">
                    Context:
                  </span>
                  {contextBadges.map((badge) => {
                    const isSpaceType = badge.type === "resource_group" || badge.type === "task_space" || badge.type === "ticket_space";
                    const spacesList = availableSpaces[badge.type] || [];
                    const isLoadingSpaces = Boolean(loadingSpaces[badge.type]);

                    return (
                      <Popover
                        key={badge.id}
                        open={openPopoverBadgeId === badge.id}
                        onOpenChange={(open) => {
                          setOpenPopoverBadgeId(open ? badge.id : null);
                          if (open && isSpaceType) {
                            fetchSpacesForType(badge.type as any);
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Badge
                            variant="outline"
                            className={cn(
                              "py-0.5 px-2 text-xs gap-1.5 select-none shadow-none cursor-pointer transition-all",
                              badge.isUnselected
                                ? "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                : "hover:bg-muted/70 hover:border-foreground/30"
                            )}
                            title={
                              badge.isUnselected
                                ? `${badge.label}: ${badge.value}. Click to select a specific space.`
                                : `${badge.label}: ${badge.value}. Click to switch or uncheck.`
                            }
                          >
                            {!badge.isUnselected && (
                              <span className="text-muted-foreground font-normal">{badge.label}:</span>
                            )}
                            <span className="font-semibold text-foreground truncate max-w-[200px]">
                              {badge.value}
                            </span>
                            <ChevronDown className="w-2.5 h-2.5 text-muted-foreground/70 shrink-0 ml-0.5" />
                          </Badge>
                        </PopoverTrigger>

                        <PopoverContent className="w-64 p-0 shadow-lg" align="start" side="bottom" sideOffset={6}>
                          <Command>
                            <CommandInput
                              placeholder={`Search ${badge.label.toLowerCase()}s...`}
                              className="h-8 text-xs"
                            />
                            <CommandList className="max-h-[220px]">
                              <CommandEmpty className="py-2.5 text-center text-xs text-muted-foreground">
                                {isLoadingSpaces ? "Loading spaces..." : "No items found."}
                              </CommandEmpty>

                              {/* List of accessible spaces */}
                              {isSpaceType && (
                                <CommandGroup>
                                  {spacesList.map((space) => {
                                    const isCurrent = !badge.isUnselected && String(space.id) === String(badge.currentId);
                                    return (
                                      <CommandItem
                                        key={space.id}
                                        value={space.name}
                                        onSelect={() => {
                                          handleSelectSpace(badge.type, space, badge.currentId);
                                          setOpenPopoverBadgeId(null);
                                        }}
                                        className="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer"
                                      >
                                        {/* {badge.icon && badge.icon} */}
                                        <span className="truncate flex-1">{space.name}</span>
                                        {isCurrent && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                </>
              )}

              {/* Document Attachment Badges (same row & same size as space badge) */}
              {attachments.map((att, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="py-0.5 pl-2 pr-1 text-xs gap-1.5 select-none shadow-none bg-muted/30 hover:bg-muted/50 transition-all font-normal text-foreground border-border cursor-default"
                >
                  <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="font-semibold text-foreground truncate max-w-[170px]">{att.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    ({Math.round(att.size / 1024) || 1} KB)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttachments((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    className="text-muted-foreground hover:text-destructive p-0.5 rounded hover:bg-muted cursor-pointer transition-colors ml-0.5 flex items-center justify-center"
                    title="Remove attachment"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="relative flex items-end w-full shadow-none">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.txt,.csv,.md,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
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
              placeholder={isReadingFile ? "Reading document..." : (attachments.length > 0 ? "Add instructions or press Enter to analyze document..." : inputPlaceholder)}
              className="w-full min-h-[56px] max-h-[200px] py-[18px] bg-transparent pl-4 pr-24 text-sm focus:outline-none resize-none overflow-y-auto shadow-none"
              rows={1}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isReadingFile}
                className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-full cursor-pointer"
                title="Attach document (PDF, DOCX, TXT, CSV)"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                type="submit"
                disabled={(!input.trim() && attachments.length === 0) || isLoading || isReadingFile}
                className="h-10 w-10 p-0 rounded-full shadow-none cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </form>
        <div className="mt-2 text-xs text-muted-foreground flex items-center justify-center gap-2">
          <span>Co-Pilot is AI and can make mistakes.</span>
          {mode === "full" && (
            <button
              type="button"
              onClick={handleResetConversation}
              className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Start new chat</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
