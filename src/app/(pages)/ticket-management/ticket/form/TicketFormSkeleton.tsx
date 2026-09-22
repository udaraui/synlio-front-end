'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function TicketFormSkeleton() {
  return (
    <div className="flex flex-col h-full pt-8">
      <div className="flex-1 overflow-hidden flex">
        {/* ── Left panel (66%) ─────────────────────────────────────────── */}
        <div className="flex flex-col"
             style={{ width: '60%' }}>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Ticket Code */}
            <div className="space-y-1">
              <Skeleton className="h-4 w-10" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-5 rounded" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-36 w-full rounded-md" />
            </div>

            {/* Attachments collapsible */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-16 w-full rounded-md" />
            </div>

            {/* Comments collapsible */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-20 w-full rounded-md" />
            </div>
          </div>

          {/* Action footer */}
          <div className="border-t p-4">
            <div className="flex justify-end gap-3">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </div>
        </div>

        {/* ── Right sidebar (33%) ───────────────────────────────────────── */}
        <div className="border-l overflow-y-auto flex flex-col"
             style={{ width: '40%' }}>
          {/* Status / Type / Severity / Queue / Impact */}
          <div className="px-4 py-4 border-b border-border flex flex-col gap-1">
            {/* Status */}
            <div className="grid grid-cols-[125px_1fr] items-center min-h-8">
              <Skeleton className="h-3.5 w-12" />
              <div className="px-2">
                <Skeleton className="h-6 w-24 rounded-md" />
              </div>
            </div>

            {/* Type */}
            <div className="grid grid-cols-[125px_1fr] items-center min-h-8">
              <Skeleton className="h-3.5 w-10" />
              <div className="px-2">
                <Skeleton className="h-6 w-20 rounded-md" />
              </div>
            </div>

            {/* Severity */}
            <div className="grid grid-cols-[125px_1fr] items-center min-h-8">
              <Skeleton className="h-3.5 w-16" />
              <div className="px-2">
                <Skeleton className="h-6 w-20 rounded-md" />
              </div>
            </div>

            {/* Queue */}
            <div className="grid grid-cols-[125px_1fr] items-center min-h-8">
              <Skeleton className="h-3.5 w-12" />
              <div className="px-2">
                <Skeleton className="h-6 w-24 rounded-md" />
              </div>
            </div>

            {/* Impact */}
            <div className="grid grid-cols-[125px_1fr] items-center min-h-8">
              <Skeleton className="h-3.5 w-12" />
              <div className="px-2">
                <Skeleton className="h-6 w-16 rounded-md" />
              </div>
            </div>
          </div>

          {/* SLA block */}
          <div className="px-4 pt-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-px w-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>

          {/* Effort & Date */}
          <div className="px-4 pb-4 pt-3 border-b border-border flex flex-col gap-1">
            {/* Completion Date */}
            <div className="grid grid-cols-[125px_1fr] items-center min-h-8">
              <Skeleton className="h-3.5 w-20" />
              <div className="px-2">
                <Skeleton className="h-6 w-28 rounded-md" />
              </div>
            </div>

            {/* Effort (hrs) */}
            <div className="grid grid-cols-[125px_1fr] items-start min-h-8">
              <Skeleton className="h-3.5 w-20 mt-2" />
              <div className="flex flex-col gap-2 px-2 py-1">
                <div className="flex flex-col gap-0.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-full rounded-md" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-7 w-full rounded-md" />
                </div>
              </div>
            </div>
          </div>

          {/* Team — Assignee & Participants */}
          <div className="px-4 py-4">
            <div className="flex gap-4">
              {/* Assignee */}
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-3.5 w-16" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1 min-w-0">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              </div>

              {/* Participants */}
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-3.5 w-20" />
                <div className="flex items-center gap-1">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-6 w-6 rounded-full ml-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
