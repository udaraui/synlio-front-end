import { Base } from '@/interfaces/common/base.model';

export interface TicketChecklist extends Base {
  name: string;
  isChecked: boolean;
  attachmentLink?: string;
  ticketId: number;
  assigneeId?: number | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  assigneeProfilePicUrl?: string | null;
}

export interface CreateTicketChecklistDto {
  name: string;
  ticketId: number;
  isChecked?: boolean;
  assigneeId?: number | null;
}

export interface UpdateTicketChecklistDto {
  name?: string;
  isChecked?: boolean;
  assigneeId?: number | null;
}
