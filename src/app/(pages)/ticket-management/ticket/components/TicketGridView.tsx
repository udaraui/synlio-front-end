'use client';

import React from 'react';
import { type LucideIcon } from 'lucide-react';
import TicketCard from './TicketCard';
import { useSidebar } from '@/components/ui/sidebar';

interface TicketGridViewProps {
  data: any[];
  getIconComponent: (iconName: string | undefined) => LucideIcon | null;
  onEdit: (ticket: any) => void;
  onDelete: (ticket: any) => void;
  onUpdateTicket: (ticketId: number, updates: any, updatedData?: any) => Promise<void>;
  onCardClick?: (ticket: any) => void;
  configData?: any; // { statuses, severities, types, queues, members }
  isRelationsLoading?: boolean;
}

export default function TicketGridView({
  data,
  getIconComponent,
  onEdit,
  onDelete,
  onUpdateTicket,
  onCardClick,
  configData,
  isRelationsLoading,
}: TicketGridViewProps) {
  const { open: sidebarOpen } = useSidebar();
  return (
    <div className={`grid gap-3 ${sidebarOpen ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'}`}>
      {data.map((ticket: any) => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          ticketRelations={ticket}
          getIconComponent={getIconComponent}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdateTicket={onUpdateTicket}
          onCardClick={onCardClick}
          configData={configData}
          isRelationsLoading={isRelationsLoading}
        />
      ))}
    </div>
  );
}
