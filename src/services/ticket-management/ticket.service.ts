import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_ENDPOINTS } from "../API/api";

export const searchTickets = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET}/search`,
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error searching tickets:", error);
    throw error;
  }
};

export const searchDashboardTickets = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.DASHBOARD}/ticket/search`,
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error searching dashboard tickets:", error);
    throw error;
  }
};

export const searchTicketsByQueue = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET}/search-by-queue`,
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error searching tickets by queue:", error);
    throw error;
  }
};

export const getBulkTicketRelations = async (ticketIds: number[]): Promise<any> => {
  if (!ticketIds || ticketIds.length === 0) return {};
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET}/bulk-relations`,
      { ticketIds },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching bulk ticket relations:", error);
    throw error;
  }
};

export const getTicketStatusCounts = async (ticketSpaceId: number): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET}/status-counts`,
      { ticketSpaceId },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching ticket status counts:", error);
    throw error;
  }
};

/** Single request that returns status counts for ALL supplied ticket space IDs at once */
export const getBulkTicketStatusCounts = async (
  spaceIds: number[]
): Promise<Record<number, any[]>> => {
  if (!spaceIds.length) return {};
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET}/bulk-status-counts`,
      { spaceIds },
      { withCredentials: true }
    );
    return response.data || {};
  } catch {
    return {};
  }
};

export const getTicketById = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET}/${id}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching ticket:", error);
    throw error;
  }
};

/**
 * Phase-1 core load — ticket with ticketSpace, status, severity, ticketType,
 * department, queue, impact, ticketSla. Assignee and participants excluded.
 */
export const getTicketBaseById = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET}/${id}/core`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching ticket core:", error);
    throw error;
  }
};

/**
 * Phase-2 members load — returns { assignee, participants } for the ticket.
 */
export const getTicketAssignees = async (id: number): Promise<{ assignee: any; participants: any[] }> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET}/${id}/assignees`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching ticket assignees:", error);
    throw error;
  }
};

/**
 * Phase-3 events load — returns { ticketEvents: [] } for the ticket.
 */
export const getTicketEvents = async (id: number): Promise<{ ticketEvents: any[] }> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET}/${id}/events`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching ticket events:", error);
    throw error;
  }
};

export const getAllTickets = async (): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching tickets:", error);
    throw error;
  }
};

export const getNextTicketCode = async (ticketSpaceId: number): Promise<{ code: string }> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET}/next-code/${ticketSpaceId}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching next ticket code:", error);
    throw error;
  }
};

export const createTicket = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET}`,
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error creating ticket:", error);
    throw error;
  }
};

export const updateTicket = async (id: number, data: any): Promise<any> => {
  try {
    const response = await axiosInstance.put(
      `${API_ENDPOINTS.TICKET}/${id}`,
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating ticket:", error);
    throw error;
  }
};

export const patchTicket = async (id: number, data: Partial<any>): Promise<any> => {
  try {
    // Backend uses PUT but we can use it for partial updates
    const response = await axiosInstance.put(
      `${API_ENDPOINTS.TICKET}/${id}`,
      { id, ...data },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error patching ticket:", error);
    throw error;
  }
};

// Individual PATCH methods for specific fields
export const patchTicketName = async (
  id: number,
  name: string,
  oldName?: string | null,
): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TICKET}/${id}/name`,
      { name, oldName },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating ticket name:", error);
    throw error;
  }
};

export const patchTicketStatus = async (
  id: number,
  statusId: number,
  oldStatusId?: number | null,
): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TICKET}/${id}/status`,
      { statusId, oldStatusId },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating ticket status:", error);
    throw error;
  }
};

export const patchTicketSeverity = async (
  id: number,
  severityId: number,
  oldSeverityId?: number | null,
): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TICKET}/${id}/severity`,
      { severityId, oldSeverityId },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating ticket severity:", error);
    throw error;
  }
};

export const patchTicketQueue = async (
  id: number,
  queueId: number | null,
  oldQueueId?: number | null,
): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TICKET}/${id}/queue`,
      { queueId, oldQueueId },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating ticket queue:", error);
    throw error;
  }
};

export const patchTicketImpact = async (
  id: number,
  impactId: number | null,
  oldImpactId?: number | null,
): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TICKET}/${id}/impact`,
      { impactId, oldImpactId },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating ticket impact:", error);
    throw error;
  }
};

export const patchTicketType = async (id: number, ticketTypeId: number): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TICKET}/${id}/type`,
      { ticketTypeId },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating ticket type:", error);
    throw error;
  }
};

export const patchTicketAssignee = async (
  id: number,
  assigneeId: number | null,
  oldAssigneeId?: number | null,
): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TICKET}/${id}/assignee`,
      { assigneeId, oldAssigneeId },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating ticket assignee:", error);
    throw error;
  }
};

export const patchTicketParticipants = async (
  id: number,
  participantIds: number[] | any[],
  participants?: any[]
): Promise<any> => {
  try {
    // Determine if we're sending full objects or just IDs
    const isFull = participants && participants.length > 0;
    const responseData = isFull
      ? { participantIds, participants }
      : { participantIds };

    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TICKET}/${id}/participants`,
      responseData,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating ticket participants:", error);
    throw error;
  }
};

export const patchTicketDescription = async (id: number, description: string | null): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TICKET}/${id}/description`,
      { description },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating ticket description:", error);
    throw error;
  }
};

export const patchTicketEffort = async (
  id: number,
  plannedEffort: number | null,
  actualEffort: number | null,
): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TICKET}/${id}/effort`,
      { plannedEffort, actualEffort },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating ticket effort:", error);
    throw error;
  }
};

export const patchTicketCompletionDate = async (id: number, completionDate: string | null): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TICKET}/${id}/completion-date`,
      { completionDate },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating ticket completion date:", error);
    throw error;
  }
};

export const deleteTicket = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.delete(
      `${API_ENDPOINTS.TICKET}/${id}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting ticket:", error);
    throw error;
  }
};

