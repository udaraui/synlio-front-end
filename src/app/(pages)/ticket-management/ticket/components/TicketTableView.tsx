'use client';

import { useState, useEffect } from 'react';
import {
  Edit,
  Eye,
  MoreVertical,
  Info,
  ExternalLink,
  Share2,
  Copy,
  MessageSquare,
  X,
  type LucideIcon,
  Trash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

interface TicketTableViewProps {
  data: any[];
  getIconComponent: (iconName: string | undefined) => LucideIcon | null;
  onEdit: (ticket: any) => void;
  onDelete: (ticket: any) => void;
  onUpdateTicket: (ticketId: number, updates: any, updatedData?: any) => Promise<void>;
  onRowClick?: (ticket: any) => void;
  configData?: any; // { statuses, severities, types, queues, members }
  isRelationsLoading?: boolean;
}

export default function TicketTableView({
  data,
  getIconComponent,
  onEdit,
  onDelete,
  onUpdateTicket,
  onRowClick,
  configData,
  isRelationsLoading,
}: TicketTableViewProps) {
  // Get ticketSpaceId from first ticket (still needed for the external link URL)
  const ticketSpaceId = data[0]?.ticketSpaceId;

  // Extract config arrays — fall back to empty arrays gracefully
  const statuses: any[] = configData?.statuses || [];
  const severities: any[] = configData?.severities || [];
  const queues: any[] = configData?.queues || [];
  const types: any[] = configData?.types || [];
  const members: any[] = configData?.members || [];

  const [openCommentTicketId, setOpenCommentTicketId] = useState<number | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>(
    () => Object.fromEntries(data.map((t) => [t.id, t.commentCount ?? 0]))
  );

  useEffect(() => {
    setCommentCounts(
      Object.fromEntries(data.map((t) => [t.id, t.commentCount ?? 0]))
    );
  }, [data]);

  return (
    <div className="rounded-lg border bg-background overflow-hidden flex-1 flex flex-col min-h-0">
      <div className="relative flex-1 overflow-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-border">
            <tr>
              <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-80 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">
                Title
              </th>
              <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-38 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">
                Status
              </th>
              <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">
                Severity
              </th>
              <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">
                Queue/Dept.
              </th>
              <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">
                Assignee
              </th>
              <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-40 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">
                Participants
              </th>
              <th className="h-10 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-20 sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border">
              </th>
            </tr>
          </thead>
          <tbody className="">
            {data.map((ticket: any) => {
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

              const assignee = ticket.assigneeName ? fallbackAssignee : ticket.assignee;
              const participants = ticket.participants || [];

              const status = ticket.statusName ? {
                id: ticket.statusId,
                name: ticket.statusName,
                color: ticket.statusColor,
                base: ticket.statusBase,
              } : ticket.status;

              const severity = ticket.severityName ? {
                id: ticket.severityId,
                name: ticket.severityName,
                color: ticket.severityColor,
              } : ticket.severity;

              const queue = ticket.queueName ? {
                id: ticket.queueId,
                name: ticket.queueName,
              } : ticket.queue;

              const ticketType = ticket.ticketTypeName ? {
                id: ticket.ticketTypeId,
                name: ticket.ticketTypeName,
                icon: ticket.ticketTypeIcon,
                color: types?.find((t: any) => t.id === ticket.ticketTypeId)?.color || ticket.ticketTypeColor,
              } : ticket.ticketType;

              return (
                <tr
                  key={ticket.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group border-b border-gray-200 dark:border-gray-700"
                >
                  <td className="px-4 py-2 w-80">
                    <div className="flex items-center gap-1.5">
                      <InlineEditableTicketType
                        ticketType={ticketType}
                        ticketId={ticket.id}
                        types={types}
                        getIconComponent={getIconComponent}
                        iconOnly
                        onUpdate={async (typeId) => {
                          const { patchTicketType } = await import('@/services/ticket-management/ticket.service');
                          const updatedTicket = await patchTicketType(ticket.id, typeId);
                          onUpdateTicket(ticket.id, { ticketTypeId: typeId }, updatedTicket);
                        }}
                      />
                      <span className="font-mono text-xs font-semibold tracking-wide flex-shrink-0 cursor-pointer hover:underline text-blue-500 dark:text-blue-400"
                        title={'View details'}
                        onClick={(e) => { e.stopPropagation(); onRowClick?.(ticket); }}>
                        {ticket.code}
                      </span>

                      <div className="flex-1 min-w-0 mx-1">
                        <InlineEditableTicketName
                          name={ticket.name}
                          onUpdate={async (name) => {
                            const { patchTicketName } = await import('@/services/ticket-management/ticket.service');
                            const updatedTicket = await patchTicketName(ticket.id, name, ticket.name);
                            await onUpdateTicket(ticket.id, { name }, updatedTicket);
                          }}
                          className=" text-sm text-gray-900 dark:text-gray-100 truncate block w-full"
                        />
                      </div>

                      {/* Open in new tab — collapsed by default so the title gets the space; expands on row hover */}
                      <a
                        href={`/ticket-management/ticket/form?ticketSpaceId=${ticketSpaceId}&edit=true&ticketId=${ticket.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0 hover:opacity-75 transition-all opacity-0 w-0 overflow-hidden group-hover:opacity-100 group-hover:w-3"
                        style={{ color: '#3B82F6' }}
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      {/* Share via email — collapsed by default; expands on row hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const link = `${window.location.origin}/ticket-management/ticket/form?ticketSpaceId=${ticketSpaceId}&edit=true&ticketId=${ticket.id}`;
                          const subject = encodeURIComponent(`Ticket: ${ticket.name}${ticket.code ? ` [${ticket.code}]` : ''}`);
                          const body = encodeURIComponent(`Hi,\n\nPlease find the ticket details at the link below:\n\n${link}\n\nRegards`);
                          window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                        }}
                        className="flex-shrink-0 hover:opacity-75 transition-all opacity-0 w-0 cursor-pointer overflow-hidden group-hover:opacity-100 group-hover:w-3 group-hover:ml-1"
                        style={{ color: '#3B82F6' }}
                        title="Share via email"
                      >
                        <Share2 className="w-3 h-3" />
                      </button>

                      {/* Info icon — always visible so the full title is always accessible */}
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
                        <HoverCardContent
                          className="w-96 max-h-96 overflow-y-auto"
                          side="right"
                          align="start"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-3">
                            {/* Full title */}
                            <div>
                              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">Title</p>
                              <p className="text-xs text-gray-700 dark:text-gray-300">{ticket.name}</p>
                            </div>

                            {ticket.description && (
                              <div>
                                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">Description</p>
                                <div
                                  className="text-xs text-gray-600 dark:text-gray-400 prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: ticket.description }}
                                />
                              </div>
                            )}

                            <hr className="border-border" />

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">Created By</p>
                                <p className="text-xs text-primary">{ticket.createdBy || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">Created At</p>
                                <p className="text-xs text-primary">
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
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <InlineEditableStatus
                      status={status}
                      statuses={statuses}
                      ticketId={ticket.id}
                      externalLoading={isRelationsLoading && !status}
                      onUpdate={async (statusId) => {
                        const { patchTicketStatus } = await import('@/services/ticket-management/ticket.service');
                        const updatedTicket = await patchTicketStatus(ticket.id, statusId, ticket.status?.id ?? null);
                        onUpdateTicket(ticket.id, { statusId }, updatedTicket);
                      }}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <InlineEditableSeverity
                      severity={severity}
                      severities={severities}
                      ticketId={ticket.id}
                      externalLoading={isRelationsLoading && !severity}
                      onUpdate={async (severityId) => {
                        const { patchTicketSeverity } = await import('@/services/ticket-management/ticket.service');
                        const updatedTicket = await patchTicketSeverity(ticket.id, severityId, ticket.severity?.id ?? null);
                        onUpdateTicket(ticket.id, { severityId }, updatedTicket);
                      }}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <InlineEditableQueue
                      queue={queue}
                      queues={queues}
                      ticketId={ticket.id}
                      externalLoading={isRelationsLoading && !queue}
                      onUpdate={async (queueId) => {
                        const { patchTicketQueue } = await import('@/services/ticket-management/ticket.service');
                        const updatedTicket = await patchTicketQueue(ticket.id, queueId, ticket.queue?.id ?? null);
                        onUpdateTicket(ticket.id, { queueId }, updatedTicket);
                      }}
                    />
                  </td>
                  <td className="px-4 py-2 align-middle">
                    <div className="flex items-center">
                      <InlineEditableAssignee
                        assignee={assignee}
                        members={members}
                        ticketId={ticket.id}
                        onUpdate={async (assigneeId) => {
                          const { patchTicketAssignee } = await import('@/services/ticket-management/ticket.service');
                          const updatedTicket = await patchTicketAssignee(ticket.id, assigneeId, ticket.assigneeId ?? null);
                          // Make sure to pass the updated participants returned from the API up to the table state
                          onUpdateTicket(ticket.id, { assigneeId, participants: updatedTicket.participants }, updatedTicket);
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2 align-middle">
                    <div className="flex items-center">
                      <InlineEditableParticipants
                        participants={participants}
                        members={members}
                        ticketId={ticket.id}
                        onUpdate={async (participantIds) => {
                          const { patchTicketParticipants } = await import('@/services/ticket-management/ticket.service');
                          const updatedTicket = await patchTicketParticipants(ticket.id, participantIds);
                          onUpdateTicket(ticket.id, { participantIds }, updatedTicket);
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <TooltipProvider delayDuration={0}>
                        {/* Comment Popover Button */}
                        <Popover
                          open={openCommentTicketId === ticket.id}
                          onOpenChange={(open) => setOpenCommentTicketId(open ? ticket.id : null)}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-1.5 gap-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {isRelationsLoading && !(commentCounts[ticket.id] > 0) ? (
                                    <span className="w-4 text-center inline-block text-xs font-medium text-gray-400 dark:text-gray-500 leading-none tracking-widest animate-pulse">...</span>
                                  ) : (commentCounts[ticket.id] ?? 0) > 0 ? (
                                    <span className="w-4 text-center inline-block text-xs font-medium text-gray-500 dark:text-gray-400 leading-none">{commentCounts[ticket.id]}</span>
                                  ) : (
                                    <span className="w-4 inline-block" />
                                  )}
                                  <MessageSquare className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                                </Button>
                              </PopoverTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="top">Comments</TooltipContent>
                          </Tooltip>
                          <PopoverContent
                            className="w-[420px] p-3 max-h-[320px] overflow-y-auto"
                            align="end"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Comment</p>
                              <button
                                onClick={() => setOpenCommentTicketId(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <CommentSection
                              postId={ticket.id}
                              postType="Ticket"
                              onCommentCountChange={(count) =>
                                setCommentCounts((prev) => ({ ...prev, [ticket.id]: count }))
                              }
                            />
                          </PopoverContent>
                        </Popover>
                        <TicketSlaHoverCard ticket={ticket} status={status} configData={configData} />

                        {/* Three-dot Actions Menu */}
                        <DropdownMenu>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 -ml-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                                </Button>
                              </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="top">Ticket Actions</TooltipContent>
                          </Tooltip>
                          <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(ticket);
                            }}
                            className="cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 mr-2" />
                            <span className="text-xs">View</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(ticket);
                            }}
                            className="cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 mr-2" />
                            <span className="text-xs">Edit</span>
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
                            <Copy className="w-3.5 h-3.5 mr-2" />
                            <span className="text-xs">Copy Link</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(ticket);
                            }}
                            className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20"
                          >
                            <Trash className="w-3.5 h-3.5 mr-2 text-destructive" />
                            <span className="text-xs">Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                      </TooltipProvider>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}