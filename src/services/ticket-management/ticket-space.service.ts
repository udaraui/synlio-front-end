import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_ENDPOINTS } from "../api";
import { safeParse } from "../auth/auth-service";

/** Reads the active company id from localStorage (same source used by the axios interceptor). */
const getActiveCompanyId = (): number | null => {
  if (typeof window === "undefined") return null;
  const active = safeParse(localStorage.getItem("active_company"));
  return active?.companyId ?? null;
};

export const createTicketSpace = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET_SPACE}`,
      data,
      { withCredentials: true }
    );
    return response;
  } catch (error) {
    throw error;
  }
};

export const updateTicketSpace = async (id: number, data: any): Promise<any> => {
  try {
    const response = await axiosInstance.put(
      `${API_ENDPOINTS.TICKET_SPACE}/${id}`,
      data,
      { withCredentials: true }
    );
    return response;
  } catch (error) {
    throw error;
  }
};

export const getTicketSpaceById = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET_SPACE}/${id}`,
      { withCredentials: true }
    );
    return response;
  } catch (error) {
    throw error;
  }
};

export const checkPrefixExists = async (
  companyId: number,
  prefix: string
): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET_SPACE}/check-prefix/${companyId}/${prefix}`,
      { withCredentials: true }
    );
    return response;
  } catch (error) {
    throw error;
  }
};

export const searchTicketSpaces = async (data: any): Promise<any> => {
  try {
    const filters = [...(data.filters ?? [])];

    // Automatically scope results to the active company
    const companyId = getActiveCompanyId();
    if (companyId != null && !filters.some((f: any) => f.field === 'companyId')) {
      filters.push({ field: 'companyId', value: companyId, matchMode: 'equals' });
    }

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET_SPACE}/search`,
      { ...data, filters },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteTicketSpace = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.delete(
      `${API_ENDPOINTS.TICKET_SPACE}/${id}`,
      { withCredentials: true }
    );
    return response;
  } catch (error) {
    throw error;
  }
};

export const toggleTicketSpaceStatus = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TICKET_SPACE}/${id}/toggle-status`,
      {},
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getTicketSpaceConfiguration = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET_SPACE}/${id}/configuration`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getTicketSpaceCreateConfig = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET_SPACE}/${id}/config/create-ticket`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addStatusToTicketSpace = async (
  ticketSpaceId: number,
  name: string,
  color: string,
  base?: string | null
): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/status`,
      { name, color, base: base ?? null },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addExistingStatusToTicketSpace = async (
  ticketSpaceId: number,
  statusId: number
): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/status/existing`,
      { statusId },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const removeStatusFromTicketSpace = async (
  ticketSpaceId: number,
  statusId: number
): Promise<any> => {
  try {
    const response = await axiosInstance.delete(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/status/${statusId}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateStatusSequence = async (
  ticketSpaceId: number,
  statusSequences: { statusId: number; sequence: number }[]
): Promise<any> => {
  try {
    const response = await axiosInstance.put(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/status/sequence`,
      { statusSequences },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Tab-specific configuration fetchers
export const getTicketSpaceStatusConfig = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET_SPACE}/${id}/config/status`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getTicketSpaceSeverityConfig = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET_SPACE}/${id}/config/severity`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getTicketSpaceTypesConfig = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET_SPACE}/${id}/config/types`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getTicketSpaceSlaConfig = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET_SPACE}/${id}/config/sla`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getTicketSpaceImpactConfig = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET_SPACE}/${id}/config/impact`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getTicketSpaceQueueConfig = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET_SPACE}/${id}/config/queue`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getTicketSpaceMembersConfig = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET_SPACE}/${id}/config/members`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Severity management functions
export const addSeverityToTicketSpace = async (
  ticketSpaceId: number,
  name: string,
  color: string
): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/severity`,
      { name, color },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addExistingSeverityToTicketSpace = async (
  ticketSpaceId: number,
  severityId: number
): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/severity/existing`,
      { severityId },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const removeSeverityFromTicketSpace = async (
  ticketSpaceId: number,
  severityId: number
): Promise<any> => {
  try {
    const response = await axiosInstance.delete(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/severity/${severityId}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};


// Type management functions
export const addTypeToTicketSpace = async (
  ticketSpaceId: number,
  name: string,
  icon: string
): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/type`,
      { name, icon },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addExistingTypeToTicketSpace = async (
  ticketSpaceId: number,
  typeId: number
): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/type/existing`,
      { typeId },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const removeTypeFromTicketSpace = async (
  ticketSpaceId: number,
  typeId: number
): Promise<any> => {
  try {
    const response = await axiosInstance.delete(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/type/${typeId}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateTypeSequence = async (
  ticketSpaceId: number,
  typeSequences: { typeId: number; order: number }[]
): Promise<any> => {
  try {
    const response = await axiosInstance.put(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/type/sequence`,
      { typeSequences },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// SLA management functions
export const addSlaToTicketSpace = async (
  ticketSpaceId: number,
  severityId: number,
  responseTime: number,
  resolutionTime: number
): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/sla`,
      { severityId, responseTime, resolutionTime },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const removeSlaFromTicketSpace = async (
  ticketSpaceId: number,
  slaId: number
): Promise<any> => {
  try {
    const response = await axiosInstance.delete(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/sla/${slaId}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Impact management functions
export const addImpactToTicketSpace = async (
  ticketSpaceId: number,
  name: string,
  description: string
): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/impact`,
      { name, description },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateImpactInTicketSpace = async (
  ticketSpaceId: number,
  impactId: number,
  name: string,
  description: string
): Promise<any> => {
  try {
    const response = await axiosInstance.put(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/impact/${impactId}`,
      { name, description },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const removeImpactFromTicketSpace = async (
  ticketSpaceId: number,
  impactId: number
): Promise<any> => {
  try {
    const response = await axiosInstance.delete(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/impact/${impactId}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Queue management functions
export const addQueueToTicketSpace = async (
  ticketSpaceId: number,
  name: string
): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/queue`,
      { name },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const removeQueueFromTicketSpace = async (
  ticketSpaceId: number,
  queueId: number
): Promise<any> => {
  try {
    const response = await axiosInstance.delete(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/queue/${queueId}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ==================== Ticket Permission APIs ====================

export const getTicketSpacePermissions = async (ticketSpaceId: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/permissions`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addPermissionToTicketSpace = async (
  ticketSpaceId: number,
  data: {
    userId: number;

    queueIds?: number[];
  }
): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/permissions`,
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addBulkPermissionsToTicketSpace = async (
  ticketSpaceId: number,
  permissions: Array<{
    userId: number;

    queueIds?: number[];
    profilePicture?: string | null;
  }>
): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/permissions/bulk`,
      permissions,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateTicketSpacePermission = async (
  ticketSpaceId: number,
  permissionId: number,
  data: {
    roleIds?: number[]; // Changed from roleId to roleIds array
    queueIds?: number[];
  }
): Promise<any> => {
  try {
    const response = await axiosInstance.put(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/permissions/${permissionId}`,
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const removePermissionFromTicketSpace = async (
  ticketSpaceId: number,
  permissionId: number
): Promise<any> => {
  try {
    const response = await axiosInstance.delete(
      `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/permissions/${permissionId}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const searchTicketPermissions = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET_SPACE}/permissions/search`,
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/** Single request that returns status counts for ALL supplied ticket space IDs at once */
export const getBulkTicketSpaceStatusCounts = async (
  spaceIds: number[]
): Promise<Record<number, any[]>> => {
  if (!spaceIds.length) return {};
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET_SPACE}/bulk-status-counts`,
      { spaceIds },
      { withCredentials: true }
    );
    return response.data || {};
  } catch {
    return {};
  }
};

export const updateTicketSpaceStatus = async (
  ticketSpaceId: number,
  statusId: number,
  data: { name?: string; color?: string }
): Promise<any> => {
  const response = await axiosInstance.patch(
    `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/status/${statusId}`,
    data,
    { withCredentials: true }
  );
  return response.data;
};

export const updateTicketSpaceSeverity = async (
  ticketSpaceId: number,
  severityId: number,
  data: { name?: string; color?: string }
): Promise<any> => {
  const response = await axiosInstance.patch(
    `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/severity/${severityId}`,
    data,
    { withCredentials: true }
  );
  return response.data;
};

export const updateTicketSpaceType = async (
  ticketSpaceId: number,
  typeId: number,
  data: { name?: string; icon?: string }
): Promise<any> => {
  const response = await axiosInstance.patch(
    `${API_ENDPOINTS.TICKET_SPACE}/${ticketSpaceId}/type/${typeId}`,
    data,
    { withCredentials: true }
  );
  return response.data;
};

