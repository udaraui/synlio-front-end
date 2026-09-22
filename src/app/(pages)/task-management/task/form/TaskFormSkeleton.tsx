'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function TaskFormSkeleton() {
  return (
    <div className="flex flex-col h-full pt-8">
      <div className="flex-1 overflow-hidden flex">

        {/* ── Left panel (66%) ─────────────────────────────────────────── */}
        <div className="flex flex-col"
             style={{ width: '60%' }}>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Code */}
            <div className="space-y-1">
              <Skeleton className="h-4 w-10" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-24" />
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

            {/* Child Tasks collapsible */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-8 ml-1 rounded-full" />
              </div>
              <div className="rounded-md border border-border overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 border-b border-border">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-6" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-10" />
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-16 rounded-md" />
                    <Skeleton className="h-5 w-20 rounded-md" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <div className="flex items-center gap-1 ml-auto">
                      <Skeleton className="h-1.5 w-8 rounded-full" />
                      <Skeleton className="h-3 w-5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Linked Tasks collapsible */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="rounded-md border border-border overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 border-b border-border">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-6" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-10" />
                </div>
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-16 rounded-md" />
                    <Skeleton className="h-5 w-20 rounded-md" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <div className="flex items-center gap-1 ml-auto">
                      <Skeleton className="h-1.5 w-8 rounded-full" />
                      <Skeleton className="h-3 w-5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist collapsible */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-1.5 w-20 rounded-full ml-2" />
                <Skeleton className="h-3 w-8 ml-1" />
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2 px-1">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
                <div className="flex items-center gap-2 px-1 mt-1">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
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

          {/* Details section */}
          <div className="px-4 py-4 border-b border-border">
            <div className="flex flex-col gap-1">

              {/* Parent */}
              <div className="grid grid-cols-[125px_1fr] items-center min-h-8">
                <Skeleton className="h-3.5 w-12" />
                <div className="flex items-center gap-2 px-2">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
              </div>

              {/* Status */}
              <div className="grid grid-cols-[125px_1fr] items-center min-h-8">
                <Skeleton className="h-3.5 w-12" />
                <div className="px-2">
                  <Skeleton className="h-6 w-24 rounded-md" />
                </div>
              </div>

              {/* Severity */}
              <div className="grid grid-cols-[125px_1fr] items-center min-h-8">
                <Skeleton className="h-3.5 w-16" />
                <div className="px-2">
                  <Skeleton className="h-6 w-20 rounded-md" />
                </div>
              </div>

              {/* Hierarchy Level */}
              <div className="grid grid-cols-[125px_1fr] items-center min-h-8">
                <Skeleton className="h-3.5 w-24" />
                <div className="px-2">
                  <Skeleton className="h-6 w-20 rounded-md" />
                </div>
              </div>

              {/* Assignee */}
              <div className="grid grid-cols-[125px_1fr] items-center min-h-8">
                <Skeleton className="h-3.5 w-16" />
                <div className="flex items-center gap-2 px-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
              </div>

              {/* Co-Assignees */}
              <div className="grid grid-cols-[125px_1fr] items-center min-h-8">
                <Skeleton className="h-3.5 w-24" />
                <div className="flex items-center gap-1 px-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-5 w-5 rounded-md ml-1" />
                </div>
              </div>

              {/* Labels */}
              <div className="grid grid-cols-[125px_1fr] items-start min-h-8">
                <Skeleton className="h-3.5 w-12 mt-2" />
                <div className="flex flex-wrap gap-1.5 px-2 py-1">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-5 w-14 rounded-md" />
                </div>
              </div>

            </div>
          </div>

          {/* Dates & Effort section */}
          <div className="px-4 py-4 border-b border-border">
            <div className="flex flex-col gap-1">

              {/* Date Range */}
              <div className="grid grid-cols-[125px_1fr] items-center min-h-8">
                <Skeleton className="h-3.5 w-20" />
                <div className="px-2">
                  <Skeleton className="h-6 w-36 rounded-md" />
                </div>
              </div>

              {/* Estimated Effort */}
              <div className="grid grid-cols-[125px_1fr] items-center min-h-8">
                <Skeleton className="h-3.5 w-24" />
                <div className="flex items-center gap-2 px-2">
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <Skeleton className="h-3.5 w-8" />
                </div>
              </div>

              {/* Actual Effort */}
              <div className="grid grid-cols-[125px_1fr] items-center min-h-8">
                <Skeleton className="h-3.5 w-20" />
                <div className="flex items-center gap-2 px-2">
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <Skeleton className="h-3.5 w-8" />
                </div>
              </div>

              {/* Progress */}
              <div className="grid grid-cols-[125px_1fr] items-center min-h-8">
                <Skeleton className="h-3.5 w-16" />
                <div className="flex items-center gap-2 px-2">
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <Skeleton className="h-3.5 w-8" />
                </div>
              </div>

            </div>
          </div>

          {/* Resources section */}
          <div className="px-4 py-4 border-b border-border">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-3.5 w-28" />
                    </div>
                    <Skeleton className="h-3.5 w-12" />
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
