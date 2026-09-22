"use client";

import React from "react";
import { Video, Clock, Smile } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatRowProps {
  label: string;
  labelSingular?: string;
  value: number | null;
  color: string;
}

function StatRow({ label, labelSingular, value, color }: StatRowProps) {
  const displayLabel = labelSingular && value === 1 ? labelSingular : label;
  return (
    <div className="flex items-baseline gap-1.5">
      {value === null ? (
        <Skeleton className="h-9 w-12 rounded shrink-0" />
      ) : (
        <span style={{ fontSize: "2.3rem", lineHeight: 1 }} className={cn("font-bold tabular-nums shrink-0", color)}>
          {value}
        </span>
      )}
      {value === null ? (
        <Skeleton className="h-3.5 w-10 rounded" />
      ) : (
        <span className="text-sm text-muted-foreground">{displayLabel}</span>
      )}
    </div>
  );
}

interface CardProps {
  title: string;
  description?: string | null;
  descriptionTitle?: string;
  descriptionCount?: number;
  subtitle?: string;
  warning?: boolean;
  titleIcon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  childrenClassName?: string;
  style?: React.CSSProperties;
}

function InfoCard({ title, description, descriptionTitle, descriptionCount, subtitle, warning, titleIcon, children, className, childrenClassName, style }: CardProps) {
  const spaceWord = (descriptionCount ?? 2) === 1 ? "space has" : "spaces have";
  return (
    <div style={style} className={cn(
      "flex-1 min-w-0 rounded-xl bg-card text-card-foreground border border-border shadow-sm px-4 py-3 flex flex-col gap-2",
      className,
    )}>
      <div className="flex items-center justify-start gap-2 shrink-0">
        {/*{titleIcon ?? (warning !== undefined && (warning*/}
        {/*  ? <Clock className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0" />*/}
        {/*  : <Smile className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />*/}
        {/*))}*/}
        <span className="text-xl font-semibold tracking-wide">{title}</span>
      </div>
      <div className="flex-1">
        {subtitle !== undefined ? (
          <span className="text-sm text-muted-foreground leading-snug line-clamp-2 break-words">{subtitle}</span>
        ) : description === null ? (
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-full rounded" />
            <Skeleton className="h-3.5 w-2/3 rounded" />
          </div>
        ) : description ? (
          <span
            className="text-sm text-muted-foreground leading-snug line-clamp-2 break-words"
            title={descriptionTitle ?? description ?? undefined}
          >
            {description} {spaceWord} <span className="font-medium text-red-500 dark:text-red-400">overdue</span> work.
          </span>
        ) : (
          <span className="text-sm text-muted-foreground leading-snug line-clamp-2 break-words">
            All your works are <span className="font-medium text-green-600 dark:text-green-500">on track</span>, nothing overdue.
          </span>
        )}
      </div>
      <div className={cn("grid grid-cols-2 gap-3 mt-auto pt-2", childrenClassName)}>
        {children}
      </div>
    </div>
  );
}

interface StatsCardsProps {
  myCounts: {
    dueTasks: number;
    dueTickets: number;
    dueTaskSpaces: string[];
    dueTicketSpaces: string[];
  } | null;
  loading?: boolean;
  canTasks?: boolean;
  canTickets?: boolean;
}

export default function StatsCards({ myCounts, loading = false, canTasks = true, canTickets = true }: StatsCardsProps) {
  const v = (n: number | undefined) => (loading || myCounts === null ? null : (n ?? 0));

  // Combined description for "Open Work" card
  const openWorkDesc = loading || !myCounts
    ? null
    : (() => {
        const all = [...new Set([
          ...(myCounts.dueTaskSpaces   ?? []),
          ...(myCounts.dueTicketSpaces ?? []),
        ])];
        if (all.length === 0) return undefined;
        const shown = all.slice(0, 1).join(", ");
        return all.length > 1 ? `${shown} and ${all.length - 1} more` : shown;
      })();

  const openWorkDescTitle = !myCounts ? undefined : (() => {
    const all = [...new Set([
      ...(myCounts.dueTaskSpaces   ?? []),
      ...(myCounts.dueTicketSpaces ?? []),
    ])];
    return all.length > 1 ? all.join(", ") : undefined;
  })();

  // Due Today counts (placeholder — 0 until real query is added)
  const dueTodayTasks   = loading || !myCounts ? null : 0;
  const dueTodayTickets = loading || !myCounts ? null : 0;
  const hasDueToday = (dueTodayTasks !== null && dueTodayTickets !== null)
    ? (dueTodayTasks > 0 || dueTodayTickets > 0)
    : null;

  const dueTodayIcon = hasDueToday === true
    ? <Clock className="w-5 h-5 text-yellow-500 shrink-0" />
    : hasDueToday === false
      ? <Smile className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      : <Clock className="w-5 h-5 text-yellow-500/40 shrink-0" />; // loading state

  return (
    <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-3 h-full">

      {/* Card 1 — Open Work */}
      {(canTasks || canTickets) && (
        <InfoCard
          title="Open Work"
          description={openWorkDesc}
          descriptionTitle={openWorkDescTitle}
          descriptionCount={openWorkDesc ? [...new Set([...(myCounts?.dueTaskSpaces ?? []), ...(myCounts?.dueTicketSpaces ?? [])])].length : undefined}
          warning={openWorkDesc !== null && openWorkDesc !== undefined ? !!openWorkDesc : undefined}
        >
          {canTasks && (
            <StatRow
              label="Tasks"
              value={v(myCounts?.dueTasks)}
              color="text-emerald-600 dark:text-emerald-400"
            />
          )}
          {canTickets && (
            <StatRow
              label="Tickets"
              value={v(myCounts?.dueTickets)}
              color="text-blue-600 dark:text-blue-400"
            />
          )}
        </InfoCard>
      )}

      {/* Card 2 — Due Today (placeholder — no today query) */}
      {(canTasks || canTickets) && (
        <InfoCard title="Due Today" titleIcon={dueTodayIcon} description={loading || !myCounts ? null : undefined}>
          {canTasks && (
            <StatRow
              label="Tasks"
              value={v(0)}
              color="text-emerald-600 dark:text-emerald-400"
            />
          )}
          {canTickets && (
            <StatRow label="Tickets" labelSingular="Ticket" value={v(0)} color="text-blue-600 dark:text-blue-400" />
          )}
        </InfoCard>
      )}

      {/* Card 3 — Next Meeting (placeholder) */}
      <InfoCard
        title="Next Meeting"
        subtitle="Your next meeting feature coming soon"
        className="cursor-not-allowed opacity-50"
        titleIcon={''}
        childrenClassName="flex flex-1 items-center justify-center mt-0 pt-0 pb-5"
      >
        <Video className="w-7 h-7 text-muted-foreground shrink-0" />
      </InfoCard>

    </div>
  );
}
