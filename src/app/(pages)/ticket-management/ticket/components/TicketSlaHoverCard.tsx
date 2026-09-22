'use client';

import React, { useState, useEffect } from 'react';
import { Clock, ClockAlert, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface TicketSlaHoverCardProps {
  ticket: any;
  status?: any;
  configData?: any;
}

export default function TicketSlaHoverCard({
  ticket,
  status,
  configData,
}: TicketSlaHoverCardProps) {
  const [slaCountdown, setSlaCountdown] = useState<{
    responseTimeLeft: string;
    resolutionTimeLeft: string;
    responseExpired: boolean;
    resolutionExpired: boolean;
    responseDeadline: Date | null;
    resolutionDeadline: Date | null;
  }>({
    responseTimeLeft: "",
    resolutionTimeLeft: "",
    responseExpired: false,
    resolutionExpired: false,
    responseDeadline: null,
    resolutionDeadline: null,
  });

  useEffect(() => {
    let responseDeadline: Date | null = ticket?.slaResponseDeadline
      ? new Date(ticket.slaResponseDeadline)
      : null;
    let resolutionDeadline: Date | null = ticket?.slaResolutionDeadline
      ? new Date(ticket.slaResolutionDeadline)
      : null;

    if (
      (!responseDeadline || !resolutionDeadline) &&
      ticket?.createdAt
    ) {
      const createdAt = new Date(ticket.createdAt);

      // 1. Check if responseTime / resolutionTime are directly on ticket or ticket.severity
      const respMinutes =
        ticket.slaResponseTime ??
        ticket.severity?.responseTimeInMinutes ??
        ticket.severity?.responseTime;
      const resMinutes =
        ticket.slaResolutionTime ??
        ticket.severity?.resolutionTimeInMinutes ??
        ticket.severity?.resolutionTime;

      if (!responseDeadline && respMinutes && Number(respMinutes) > 0) {
        responseDeadline = new Date(
          createdAt.getTime() + Number(respMinutes) * 60000,
        );
      }
      if (!resolutionDeadline && resMinutes && Number(resMinutes) > 0) {
        resolutionDeadline = new Date(
          createdAt.getTime() + Number(resMinutes) * 60000,
        );
      }

      // 2. If still missing, check configData.slas by ticketSlaId or severityId
      if (!responseDeadline || !resolutionDeadline) {
        const slas: any[] = configData?.slas || [];
        const ticketSla = slas.find(
          (sla: any) =>
            sla.id === ticket.ticketSlaId ||
            sla.severityId === (ticket.severityId ?? ticket.severity?.id) ||
            sla.id === (ticket.severityId ?? ticket.severity?.id),
        );
        if (ticketSla) {
          if (!responseDeadline && ticketSla.responseTime && Number(ticketSla.responseTime) > 0) {
            responseDeadline = new Date(
              createdAt.getTime() + Number(ticketSla.responseTime) * 60000,
            );
          }
          if (!resolutionDeadline && ticketSla.resolutionTime && Number(ticketSla.resolutionTime) > 0) {
            resolutionDeadline = new Date(
              createdAt.getTime() + Number(ticketSla.resolutionTime) * 60000,
            );
          }
        }
      }
    }

    if (!responseDeadline || !resolutionDeadline) {
      setSlaCountdown({
        responseTimeLeft: "",
        resolutionTimeLeft: "",
        responseExpired: false,
        resolutionExpired: false,
        responseDeadline,
        resolutionDeadline,
      });
      return;
    }

    const updateCountdown = () => {
      const statuses: any[] = configData?.statuses || [];
      const currentStatus =
        status ||
        statuses.find((s: any) => s.id === ticket?.statusId) ||
        null;
      const isResponded = currentStatus && (currentStatus as any).base !== "To Start";
      const isFinished = currentStatus && (currentStatus as any).base === "Finished";

      const now = new Date();
      const responseMs = responseDeadline!.getTime() - now.getTime();
      const resolutionMs = resolutionDeadline!.getTime() - now.getTime();

      const formatTimeLeft = (ms: number, isDone: boolean, doneText: string): string => {
        if (isDone) return doneText;

        const abMs = Math.abs(ms);
        const totalMinutes = Math.floor(abMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const seconds = Math.floor((abMs % 60000) / 1000);

        let duration: string;
        if (hours > 24) {
          const days = Math.floor(hours / 24);
          const remainingHours = hours % 24;
          duration = `${days}d ${remainingHours}h ${minutes}m`;
        } else if (hours > 0) {
          duration = `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
          duration = `${minutes}m ${seconds}s`;
        } else {
          duration = `${seconds}s`;
        }

        return ms <= 0 ? `Late by ${duration}` : duration;
      };

      setSlaCountdown({
        responseTimeLeft: formatTimeLeft(responseMs, !!isResponded, "Responded"),
        resolutionTimeLeft: formatTimeLeft(resolutionMs, !!isFinished, "Resolved"),
        responseExpired: !isResponded && responseMs <= 0,
        resolutionExpired: !isFinished && resolutionMs <= 0,
        responseDeadline,
        resolutionDeadline,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [ticket, status, configData]);

  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <ClockAlert
            className={`w-3.5 h-3.5 ${slaCountdown.responseExpired || slaCountdown.resolutionExpired
                ? "text-red-500 dark:text-red-400"
                : "text-gray-600 dark:text-gray-400"
              }`}
            strokeWidth={2.5}
          />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-80 p-3 z-50 shadow-lg text-left"
        side="left"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          {slaCountdown.responseDeadline && slaCountdown.resolutionDeadline ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <div
                  className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${slaCountdown.responseExpired || slaCountdown.resolutionExpired
                      ? "bg-red-400"
                      : "bg-gray-400"
                    }`}
                >
                  {slaCountdown.responseExpired || slaCountdown.resolutionExpired ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-white dark:text-gray-900" strokeWidth={2.5} />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-white dark:text-gray-900" strokeWidth={2.5} />
                  )}
                </div>
                <div className="min-w-0 flex flex-col gap-1 w-full">
                  {slaCountdown.responseExpired || slaCountdown.resolutionExpired ? (
                    <p className="text-sm font-semibold text-destructive">
                      SLA deadline breached
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      SLA on track
                    </p>
                  )}
                  
                  {/* Response row */}
                  <div className="flex flex-col gap-0.5">
                    <div
                      className={`flex items-center gap-1.5 text-xs font-medium rounded-md border px-2 py-1 w-fit text-gray-700 dark:text-gray-300`}
                    >
                      {slaCountdown.responseExpired ? (
                        <Clock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                      ) : (
                        <Clock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                      )}
                      <span className="font-bold tabular-nums">
                        {slaCountdown.responseTimeLeft}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Response {slaCountdown.responseExpired ? "was due" : "due"}{" "}
                      {slaCountdown.responseDeadline?.toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
                      })}
                    </p>
                  </div>

                  <div className="border-t border-dashed border-border my-0.5" />

                  {/* Resolution row */}
                  <div className="flex flex-col gap-0.5">
                    <div
                      className={`flex items-center gap-1.5 text-xs font-medium rounded-md border px-2 py-1 w-fit text-gray-700 dark:text-gray-300`}
                    >
                      {slaCountdown.resolutionExpired ? (
                        <Clock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                      ) : (
                        <Clock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                      )}
                      <span className="font-bold tabular-nums">
                        {slaCountdown.resolutionTimeLeft}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Resolution {slaCountdown.resolutionExpired ? "was due" : "due"}{" "}
                      {slaCountdown.resolutionDeadline?.toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {ticket?.createdAt && (
                <div className="-mx-3 mt-3 border-t border-gray-100 dark:border-gray-700 px-3 pt-2 text-xs text-muted-foreground">
                  Created on{" "}
                  {new Date(ticket.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                No SLA Configured
              </p>
              {ticket?.createdAt && (
                <div className="-mx-3 mt-3 border-t border-gray-100 dark:border-gray-700 px-3 pt-2 text-xs text-muted-foreground">
                  Created on{" "}
                  {new Date(ticket.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
