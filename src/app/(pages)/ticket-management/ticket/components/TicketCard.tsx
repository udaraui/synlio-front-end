'use client';

import { useState } from 'react';
import {
  Edit,
  Eye,
  Trash,
  MoreVertical,
  Info,
  ExternalLink,
  Share2,
  Copy,
  MessageSquare,
  X,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { CommentSection } from '@/components/common/CommentSection';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ParentHierarchyView } from '@/components/common/ParentLevelsHoverCard';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  InlineEditableTicketType,
  InlineEditableTicketName,
  InlineEditableStatus,
  InlineEditableSeverity,
  InlineEditableQueue,
  InlineEditableAssignee,
  InlineEditableParticipants,
} from './InlineEditableTicketComponents';
import TicketSlaHoverCard from './TicketSlaHoverCard';

interface TicketCardProps {
  ticket: any;
  ticketRelations: any;
  getIconComponent: (iconName: string | undefined) => LucideIcon | null;
  onEdit: (ticket: any) => void;
  onDelete: (ticket: any) => void;
  onUpdateTicket: (ticketId: number, updates: any, updatedData?: any) => Promise<void>;
  isKanbanView?: boolean;
  onCardClick?: (ticket: any) => void;
  // configData shape: { statuses, severities, types, queues, members }
  configData?: any;
  dragHandleProps?: any;
  isRelationsLoading?: boolean;
}

export default function TicketCard({
  ticket,
  ticketRelations,
  getIconComponent,
  onEdit,
  onDelete,
  onUpdateTicket,
  isKanbanView = false,
  onCardClick,
  configData,
  dragHandleProps,
  isRelationsLoading,
}: TicketCardProps) {
  const member = configData?.members?.find((m: any) => m.id === ticket.assigneeId);
  const validAssigneePic = ticket.assigneeProfilePicUrl && ticket.assigneeProfilePicUrl !== 'null' ? ticket.assigneeProfilePicUrl : null;
  const finalPic = validAssigneePic || member?.userProfilePicture || member?.profilePicture;

  const fallbackAssignee = ticket.assigneeId ? {
    id: member?.userId || ticket.assigneeId,
    first_name: ticket.assigneeName?.split(' ')[0] || member?.userFirstName || '',
    last_name: ticket.assigneeName?.split(' ').slice(1).join(' ') || member?.userLastName || '',
    profile_pic: finalPic,
    profile_picture: finalPic,
    userProfilePicture: finalPic,
    email: ticket.assigneeEmail || member?.userEmail || member?.email,
  } : null;

  const assignee = ticket.assigneeName ? fallbackAssignee : ticketRelations.assignee;
  const participants = ticketRelations.participants || [];

  const status = ticket.statusName ? {
    id: ticket.statusId,
    name: ticket.statusName,
    color: ticket.statusColor,
    base: ticket.statusBase,
  } : ticketRelations.status;

  const severity = ticket.severityName ? {
    id: ticket.severityId,
    name: ticket.severityName,
    color: ticket.severityColor,
  } : ticketRelations.severity;

  const queue = ticket.queueName ? {
    id: ticket.queueId,
    name: ticket.queueName,
  } : ticketRelations.queue;

  const ticketType = ticket.ticketTypeName ? {
    id: ticket.ticketTypeId,
    name: ticket.ticketTypeName,
    icon: ticket.ticketTypeIcon,
    color: configData?.types?.find((t: any) => t.id === ticket.ticketTypeId)?.color || ticket.ticketTypeColor,
  } : ticketRelations.ticketType;
  const ticketId = ticket.id;
  const ticketSpaceId = ticket.ticketSpaceId; // still needed for the external link URL
  const commentCount: number = ticketRelations.commentCount ?? 0;

  // Extract config arrays from configData (all fall back to empty array gracefully)
  const statuses: any[] = configData?.statuses || [];
  const severities: any[] = configData?.severities || [];
  const queues: any[] = configData?.queues || [];
  const types: any[] = configData?.types || [];
  const members: any[] = configData?.members || [];

  const [commentOpen, setCommentOpen] = useState(false);
  const [liveCommentCount, setLiveCommentCount] = useState<number | null>(null);

  const { ref: dragHandleRef, ...dragHandleAttributes } = dragHandleProps || {};

  return (
    <div
      className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      {/* Section 1: Type Icon, Code and Status Tag */}
      <div
        ref={isKanbanView && dragHandleRef ? dragHandleRef : undefined}
        {...(isKanbanView && dragHandleAttributes ? dragHandleAttributes : {})}
        className={`flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-dashed border-border ${isKanbanView ? 'cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors' : ''
          }`}
        title={isKanbanView ? "Drag to move ticket" : undefined}
      >
        <div className="flex items-center gap-2 group/code" title={ticketType?.name}>
          <InlineEditableTicketType
            ticketType={ticketType}
            ticketId={ticketId}
            types={types}
            getIconComponent={getIconComponent}
            iconOnly
            onUpdate={async (typeId) => {
              const { patchTicketType } = await import('@/services/ticket-management/ticket.service');
              const updatedTicket = await patchTicketType(ticketId, typeId);
              onUpdateTicket(ticketId, { ticketTypeId: typeId }, updatedTicket);
            }}
          />
          <span className="text-xs font-semibold tracking-wide cursor-pointer hover:underline text-blue-500 dark:text-blue-400" title="View details" onClick={(e) => { e.stopPropagation(); onCardClick?.(ticket); }}>
            {ticket.code}
          </span>
          <a
            href={`/ticket-management/ticket/form?ticketSpaceId=${ticketSpaceId}&edit=true&ticketId=${ticketId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover/code:opacity-100 transition-opacity text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            title="Open in new tab"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const link = `${window.location.origin}/ticket-management/ticket/form?ticketSpaceId=${ticketSpaceId}&edit=true&ticketId=${ticket.id}`;
              const subject = encodeURIComponent(`Ticket: ${ticket.name}${ticket.code ? ` [${ticket.code}]` : ''}`);
              window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(link)}`;
            }}
            className="flex-shrink-0 opacity-0 group-hover/code:opacity-100 cursor-pointer transition-opacity hover:opacity-75 ml-1"
            style={{ color: '#3B82F6' }}
            title="Share via email"
          >
            <Share2 className="w-3 h-3" />
          </button>
        </div>

        {/* Status Tag */}
        <InlineEditableStatus
          status={status}
          statuses={statuses}
          ticketId={ticketId}
          externalLoading={isRelationsLoading && !status}
          onUpdate={async (statusId) => {
            const { patchTicketStatus } = await import('@/services/ticket-management/ticket.service');
            const updatedTicket = await patchTicketStatus(ticketId, statusId, ticket.status?.id ?? null);
            onUpdateTicket(ticketId, { statusId }, updatedTicket);
          }}
        />
      </div>

      {/* Section 2: Name, Assignee Avatar, and Participants */}
      <div className="px-3 py-2.5 space-y-2">
        <h3 className="text-sm leading-tight">
          <span className="inline-flex items-center gap-1 w-full">
            <InlineEditableTicketName
              name={ticket.name}
              onUpdate={async (name) => {
                const { patchTicketName } = await import('@/services/ticket-management/ticket.service');
                const updatedTicket = await patchTicketName(ticketId, name, ticket.name);
                onUpdateTicket(ticketId, { name }, updatedTicket);
              }}
              className="font-semibold text-gray-900 dark:text-gray-100 truncate"
            />
            {(ticket.description || ticket.name?.length > 50) && (
              <HoverCard openDelay={150}>
                <HoverCardTrigger asChild>
                  <button
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="View details"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="w-96 max-h-96 overflow-y-auto" side="right" align="start" onClick={(e) => e.stopPropagation()}>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">Title</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300">{ticket.name}</p>
                    </div>
                    {ticket.description && (
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">Description</p>
                        <div className="text-xs text-gray-600 dark:text-gray-400 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: ticket.description }} />
                      </div>
                    )}

                    <hr className="border-border" />

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">Created By</p>
                        <p className="text-xs text-primary font-medium">{ticket.createdBy || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">Created At</p>
                        <p className="text-xs text-primary font-medium">
                          {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                        </p>
                      </div>
                    </div>

                    <hr className="border-border" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">Hierarchy</p>
                      <ParentHierarchyView id={ticket.id} postType="Ticket" code={ticket.code || `Ticket-${ticket.id}`} size="xs" />
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
          </span>
        </h3>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center">
            <InlineEditableAssignee
              assignee={assignee}
              members={members}
              ticketId={ticketId}
              onUpdate={async (assigneeId) => {
                const { patchTicketAssignee } = await import('@/services/ticket-management/ticket.service');
                const updatedTicket = await patchTicketAssignee(ticketId, assigneeId, ticket.assigneeId ?? null);
                onUpdateTicket(ticketId, { assigneeId, participants: updatedTicket.participants }, updatedTicket);
              }}
            />
          </div>
          <div className="flex items-center gap-1">
            <InlineEditableParticipants
              participants={participants}
              members={members}
              ticketId={ticketId}
              onUpdate={async (participantIds) => {
                const { patchTicketParticipants } = await import('@/services/ticket-management/ticket.service');
                const updatedTicket = await patchTicketParticipants(ticketId, participantIds);
                onUpdateTicket(ticketId, { participantIds }, updatedTicket);
              }}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Severity Tag and Action Menu */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-dashed border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <InlineEditableSeverity
            severity={severity}
            severities={severities}
            ticketId={ticketId}
            externalLoading={isRelationsLoading && !severity}
            onUpdate={async (severityId) => {
              const { patchTicketSeverity } = await import('@/services/ticket-management/ticket.service');
              const updatedTicket = await patchTicketSeverity(ticketId, severityId, ticket.severity?.id ?? null);
              onUpdateTicket(ticketId, { severityId }, updatedTicket);
            }}
          />
          <InlineEditableQueue
            queue={queue}
            queues={queues}
            ticketId={ticketId}
            externalLoading={isRelationsLoading && !queue}
            onUpdate={async (queueId) => {
              const { patchTicketQueue } = await import('@/services/ticket-management/ticket.service');
              const updatedTicket = await patchTicketQueue(ticketId, queueId, ticket.queue?.id ?? null);
              onUpdateTicket(ticketId, { queueId }, updatedTicket);
            }}
          />
        </div>

        <div className="flex items-center gap-1">
          <Popover open={commentOpen} onOpenChange={setCommentOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 gap-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Add Comment"
                onClick={(e) => e.stopPropagation()}
              >
                {isRelationsLoading && liveCommentCount === null ? (
                  <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                ) : (liveCommentCount ?? commentCount) > 0 ? (
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-none">
                    {liveCommentCount ?? commentCount}
                  </span>
                ) : null}
                <MessageSquare className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] p-3 max-h-[320px] overflow-y-auto" align="end" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Comment</p>
                <button onClick={() => setCommentOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <CommentSection postId={ticketId} postType="Ticket" onCommentCountChange={setLiveCommentCount} />
            </PopoverContent>
          </Popover>
          <TicketSlaHoverCard ticket={ticket} status={status} configData={configData} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 -ml-1" title="Actions" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(ticket); }} className="cursor-pointer">
                <Eye className="w-3.5 h-3.5 mr-2" /><span className="text-xs">View</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(ticket); }} className="cursor-pointer">
                <Edit className="w-3.5 h-3.5 mr-2" /><span className="text-xs">Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async (e) => {
                  e.stopPropagation();
                  const link = `${window.location.origin}/ticket-management/ticket/form?ticketSpaceId=${ticketSpaceId}&edit=true&ticketId=${ticket.id}`;
                  const text = `[${ticket.code || "TKT"}] ${ticket.name || "Ticket"}`;
                  const html = `<a href="${link}">${text}</a>`;
                  try {
                    const clipboardItem = new ClipboardItem({
                      "text/html": new Blob([html], { type: "text/html" }),
                      "text/plain": new Blob([link], { type: "text/plain" }),
                    });
                    await navigator.clipboard.write([clipboardItem]);
                    toast.success("Rich text link copied to clipboard");
                  } catch (error) {
                    navigator.clipboard.writeText(link);
                    toast.success("Link copied to clipboard");
                  }
                }}
                className="cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 mr-2" /><span className="text-xs">Copy Link</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(ticket); }} className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20">
                <Trash className="w-3.5 h-3.5 mr-2 text-destructive" /><span className="text-xs">Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
