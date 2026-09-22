export interface TicketTemplate {
  id: number;
  name: string;
  isShared: boolean;
  ticketSpaceId: number;
  createdBy?: string;
  templateData: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTicketTemplateDto {
  name: string;
  isShared?: boolean;
  ticketSpaceId: number;
  templateData: Record<string, any>;
}

export interface UpdateTicketTemplateDto {
  name?: string;
  isShared?: boolean;
  templateData?: Record<string, any>;
}
