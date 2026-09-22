export interface Ticket {
  id: number;
  name: string;
  code: string;
  description?: string;
  ticketSpaceId: number;
  ticketSpaceName?: string;
  statusId?: number;
  severityId?: number;
  ticketTypeId?: number;
  departmentId?: number;
  queueId?: number;
  impactId?: number;
  ticketSlaId?: number;
  assigneeId?: number;
  plannedEffort?: number;
  actualEffort?: number;
  completionDate?: string;
  participantIds?: number[];
  participants?: any[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: any;
  updatedBy?: any;
}

export interface CreateTicketDto {
  name: string;
  code: string;
  description?: string;
  ticketSpaceId: number;
  ticketSpaceName?: string;
  statusId?: number;
  severityId?: number;
  ticketTypeId?: number;
  departmentId?: number;
  queueId?: number;
  impactId?: number;
  ticketSlaId?: number;
  assigneeId?: number;
  plannedEffort?: number;
  actualEffort?: number;
  completionDate?: string;
  participantIds?: number[];
}

export interface TicketSpace {
  id: number;
  name: string;
  prefix: string;
  description?: string;
  companyId: number;
  divisionId: number;
  ticketQueueId?: number;
  ticketQueueName?: string;
}

export interface TicketStatus {
  id: number;
  name: string;
  color: string;
  sequence?: number;
  companyId: number;
}

export interface TicketSeverity {
  id: number;
  name: string;
  color: string;
  level?: number;
  companyId: number;
}

export interface TicketType {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface TicketSla {
  id: number;
  name: string;
  description?: string;
  responseTime?: number;
  resolutionTime?: number;
  severityId?: number;
  severityName?: string;
}

export interface TicketImpact {
  id: number;
  name: string;
  description?: string;
  level?: number;
}

export interface TicketQueue {
  id: number;
  name: string;
  description?: string;
  companyId: number;
}

export interface TicketPermission {
  id: number;
  ticketSpaceId: number;
  userId: number;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  profile_picture?: string;
  userProfilePicture?: string;
  roles?: any[];
}

export interface TicketSpaceCreateConfig {
  ticketSpace: {
    id: number;
    name: string;
    prefix: string;
    companyId: number;
    divisionId: number;
  };
  statuses: TicketStatus[];
  severities: TicketSeverity[];
  types: TicketType[];
  slas: TicketSla[];
  impacts: TicketImpact[];
  queues: TicketQueue[];
  departments: { id: number; name: string }[];
  members: TicketPermission[];
}

