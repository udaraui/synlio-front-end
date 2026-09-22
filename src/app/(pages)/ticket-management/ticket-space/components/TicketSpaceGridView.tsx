'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash, Settings, Loader2, Lock, LockOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ResponsiveBadgeRow from '@/components/common/ResponsiveBadgeRow';
import { useSidebar } from '@/components/ui/sidebar';

const DescriptionCell = ({ description }: { description?: string }) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      // h-10 constrains to 2 lines; scrollHeight > clientHeight means overflow
      setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
    }
  }, [description]);

  return (
    <div className="mb-3 min-h-[2.5rem]">
      {description ? (
        <div className="relative h-10">
          {/* leading-5 = 20px/line × 2 lines = h-10 (40px) exactly */}
          <p
            ref={textRef}
            className="text-sm leading-5 text-gray-600 dark:text-gray-400 h-10 overflow-hidden"
          >
            {description}
          </p>

          {isOverflowing && (
            <>
              {/* Gradient fade covering the end of line 2 */}
              <div className="absolute bottom-0 right-7 w-14 h-5 bg-gradient-to-l from-white dark:from-gray-800 to-transparent pointer-events-none" />

              {/* "..." hover trigger — h-5 aligns it to line 2 exactly */}
              <HoverCard openDelay={150} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <button
                    className="absolute bottom-0 right-0 h-5 flex items-center text-sm font-medium text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 bg-white dark:bg-gray-800 px-0.5 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ...
                  </button>
                </HoverCardTrigger>
                <HoverCardContent
                  className="max-w-xs w-72"
                  side="bottom"
                  align="start"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {description}
                  </p>
                </HoverCardContent>
              </HoverCard>
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">
          No description
        </p>
      )}
    </div>
  );
};

interface StatusCount {
  statusId: number;
  name: string;
  color: string;
  count: number;
}

interface TicketSpace {
  id: number;
  name: string;
  prefix: string;
  description?: string;
  isActive?: boolean;
}

interface TicketSpaceGridViewProps {
  dataArr: TicketSpace[];
  onEditData: (id: number) => void;
  onDelete: (id: number) => void;
  onConfigure?: (id: number) => void;
  onCreate?: (id: number) => void;
  statusCountsBySpace?: Record<number, StatusCount[]>;
  isCountsLoading?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canCreate?: boolean;
  canViewTicket?: boolean;
  onToggleStatus?: (id: number) => void;
}

const TicketSpaceGridView: React.FC<TicketSpaceGridViewProps> = ({
  dataArr,
  onEditData,
  onDelete,
  onConfigure,
  onCreate,
  statusCountsBySpace = {},
  isCountsLoading = false,
  canEdit = true,
  canDelete = true,
  canCreate = true,
  canViewTicket = true,
  onToggleStatus,
}) => {
  const router = useRouter();
  const { open: sidebarOpen } = useSidebar();

  return (
    <div className={`grid gap-3 ${sidebarOpen ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'}`}>
      {dataArr.map((ticketSpace) => {
        const statusCounts = statusCountsBySpace[ticketSpace.id] || [];

        return (
          <div
            key={ticketSpace.id}
            className={`group relative rounded-xl border-y border-r border-l-2 shadow-sm transition-all duration-300 overflow-hidden
              ${ticketSpace.isActive
                ? `border-t-gray-200/60 border-b-gray-200/60 border-r-gray-200/60 border-l-primary bg-white dark:bg-gray-800 dark:border-t-gray-700/60 dark:border-b-gray-700/60 dark:border-r-gray-700/60 hover:shadow-xl hover:border-primary dark:hover:border-primary ${canViewTicket ? 'cursor-pointer' : 'cursor-not-allowed'}`
                : 'border-t-gray-200/40 border-b-gray-200/40 border-r-gray-200/40 border-l-gray-300 dark:border-l-gray-600 bg-gray-50 dark:bg-gray-900 dark:border-t-gray-800 dark:border-b-gray-800 dark:border-r-gray-800 cursor-not-allowed'
              }`}
            onClick={() => {
              if (ticketSpace.isActive && canViewTicket) {
                router.push(`/ticket-management/ticket?ticketSpaceId=${ticketSpace.id}&fromSpace=1`);
              }
            }}
          >
            <div className={!ticketSpace.isActive ? 'opacity-60 grayscale' : ''}>
              <div className="px-4 pt-4">
              {/* Header: Name with Prefix Badge on right */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4
                  className="text-base font-semibold text-gray-900 dark:text-gray-50 group-hover:text-primary dark:group-hover:text-primary transition-colors line-clamp-1"
                  title={ticketSpace.name}
                >
                  {ticketSpace.name}
                </h4>
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex-shrink-0"
                  title="Prefix"
                >
                  {ticketSpace.prefix}
                </span>
              </div>

              {/* Description */}
              <DescriptionCell description={ticketSpace.description} />

              {/* Divider */}
              <div className="border-t border-border mb-3" />

              {/* Tickets Count by Status */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Tickets
                  </span>
                </div>
                <div className="relative min-h-[1.75rem] flex items-center">
                  {isCountsLoading ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Syncing tickets...</span>
                    </div>
                  ) : (
                    <ResponsiveBadgeRow
                      items={[...statusCounts].sort((a, b) => a.name.localeCompare(b.name))}
                      emptyText="No tickets yet"
                      accentClass="hover:border-blue-400 dark:hover:border-blue-500"
                    />
                  )}
                </div>
              </div>

              </div>
            </div>

            {/* Action Buttons - Single Row */}
            <div className="px-4 pb-4">
              <TooltipProvider>
                <div className="flex gap-1.5">
                  {canCreate && onCreate && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs font-medium hover:text-primary hover:border-primary transition-colors"
                      disabled={!ticketSpace.isActive}
                      onClick={(e) => { e.stopPropagation(); onCreate?.(ticketSpace.id); }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      New Ticket
                    </Button>
                  )}
                  {canEdit && (
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 hover:text-primary hover:border-primary transition-colors"
                          disabled={!ticketSpace.isActive}
                          onClick={(e) => { e.stopPropagation(); onEditData(ticketSpace.id); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Edit Ticket Space</TooltipContent>
                    </Tooltip>
                  )}
                  {onConfigure && (
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 hover:text-primary hover:border-primary transition-colors"
                          disabled={!ticketSpace.isActive}
                          onClick={(e) => { e.stopPropagation(); onConfigure(ticketSpace.id); }}
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Configure Ticket Space</TooltipContent>
                    </Tooltip>
                  )}
                  {onToggleStatus && (
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-7 w-7 p-0 hover:text-primary dark:hover:text-primary hover:border-primary transition-colors ${!ticketSpace.isActive
                            ? 'text-green-600 dark:text-green-400'
                            : ''
                            }`}
                          onClick={(e) => { e.stopPropagation(); onToggleStatus(ticketSpace.id); }}
                        >
                          {ticketSpace.isActive ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">{ticketSpace.isActive ? 'Inactivate Ticket Space' : 'Activate Ticket Space'}</TooltipContent>
                    </Tooltip>
                  )}
                  {canDelete && (
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:border-destructive transition-colors"
                          disabled={!ticketSpace.isActive}
                          onClick={(e) => { e.stopPropagation(); onDelete(ticketSpace.id); }}
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Delete Ticket Space</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TicketSpaceGridView;

