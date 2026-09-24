import axiosInstance from '@/lib/interceptors/axiosInstance';
import { API_ENDPOINTS } from '../api';
import { safeParse } from '../auth/auth-service';

/** Reads the active company id from localStorage (same source used by the axios interceptor). */
const getActiveCompanyId = (): number | null => {
  if (typeof window === 'undefined') return null;
  const active = safeParse(localStorage.getItem('active_company'));
  return active?.companyId ?? null;
};

export const createTaskSpace = async (data: any): Promise<any> => {
  const response = await axiosInstance.post(`${API_ENDPOINTS.TASK_SPACE}`, data, { withCredentials: true });
  return response;
};

export const updateTaskSpace = async (id: number, data: any): Promise<any> => {
  const response = await axiosInstance.put(`${API_ENDPOINTS.TASK_SPACE}/${id}`, data, { withCredentials: true });
  return response;
};

export const getTaskSpaceById = async (id: number): Promise<any> => {
  const response = await axiosInstance.get(`${API_ENDPOINTS.TASK_SPACE}/${id}`, { withCredentials: true });
  return response;
};

export const searchTaskSpaces = async (data: any & { skipActiveFilter?: boolean }): Promise<any> => {
  const { skipActiveFilter = false, ...queryData } = data;
  const filters = [...(queryData.filters ?? [])];

  // Automatically scope results to the active company
  const companyId = getActiveCompanyId();
  if (companyId != null && !filters.some((f: any) => f.field === 'companyId')) {
    filters.push({ field: 'companyId', value: companyId, matchMode: 'equals' });
  }

  if (!skipActiveFilter && !filters.some((f: any) => f.field === 'isActive')) {
    filters.push({ field: 'isActive', value: true, matchMode: 'equals' });
  }

  const response = await axiosInstance.post(`${API_ENDPOINTS.TASK_SPACE}/search`, { ...queryData, filters }, { withCredentials: true });
  return response.data;
};

export const deleteTaskSpace = async (id: number): Promise<any> => {
  const response = await axiosInstance.delete(`${API_ENDPOINTS.TASK_SPACE}/${id}`, { withCredentials: true });
  return response;
};

export const toggleTaskSpaceStatus = async (id: number): Promise<any> => {
  const response = await axiosInstance.patch(`${API_ENDPOINTS.TASK_SPACE}/${id}/toggle-status`, {}, { withCredentials: true });
  return response.data;
};

export const checkTaskSpacePrefixExists = async (companyId: number, prefix: string): Promise<any> => {
  const response = await axiosInstance.get(
    `${API_ENDPOINTS.TASK_SPACE}/check-prefix/${companyId}/${prefix}`,
    { withCredentials: true }
  );
  return response;
};

export const getTaskSpaceConfiguration = async (id: number): Promise<any> => {
  const response = await axiosInstance.get(`${API_ENDPOINTS.TASK_SPACE}/${id}/configuration`, { withCredentials: true });
  return response.data;
};

// ── Hierarchy Level Config ──────────────────────────────────────────────────

export const getAllHierarchyLevels = async (): Promise<any> => {
  const response = await axiosInstance.get(`${API_ENDPOINTS.TASK_SPACE_HIERARCHY_LEVEL}`, { withCredentials: true });
  return response.data;
};

export const createHierarchyLevel = async (data: { name: string; icon?: string; color?: string; sequence?: number }): Promise<any> => {
  const response = await axiosInstance.post(`${API_ENDPOINTS.TASK_SPACE_HIERARCHY_LEVEL}`, data, { withCredentials: true });
  return response.data;
};

export const getHierarchyLevelConfig = async (taskSpaceId: number): Promise<any[]> => {
  const companyId = getActiveCompanyId();
  const response = await axiosInstance.get(
    `${API_ENDPOINTS.TASK_SPACE}/${taskSpaceId}/config/hierarchy-level`,
    {
      withCredentials: true,
      ...(companyId != null ? { params: { companyId } } : {}),
    },
  );
  return response.data;
};

/** Bulk-saves hierarchy level configs for a task space — replaces everything in one call. */
export const saveHierarchyLevelsBulk = async (
  taskSpaceId: number,
  levels: { name: string; icon?: string; color?: string }[],
): Promise<any> => {
  const response = await axiosInstance.post(
    `${API_ENDPOINTS.TASK_SPACE}/${taskSpaceId}/hierarchy-level/bulk`,
    { levels },
    { withCredentials: true },
  );
  return response.data;
};

/** Adds a single hierarchy level to a task space. */
export const addHierarchyLevelToSpaceSingle = async (
  taskSpaceId: number,
  data: { name: string; icon?: string; color?: string; sequence?: number },
): Promise<any> => {
  const response = await axiosInstance.post(
    `${API_ENDPOINTS.TASK_SPACE}/${taskSpaceId}/hierarchy-level`,
    data,
    { withCredentials: true },
  );
  return response.data;
};

/** PATCH a hierarchy level config (name / icon / color) and propagates to all tm_tasks. */
export const patchHierarchyLevelConfig = async (
  taskSpaceId: number,
  configId: number,
  data: { name?: string; icon?: string; color?: string },
): Promise<any> => {
  const response = await axiosInstance.patch(
    `${API_ENDPOINTS.TASK_SPACE}/${taskSpaceId}/hierarchy-level/${configId}`,
    data,
    { withCredentials: true },
  );
  return response.data;
};

/** Removes a hierarchy level config from a task space. */
export const removeHierarchyLevelFromSpace = async (
  taskSpaceId: number,
  configId: number,
): Promise<any> => {
  const response = await axiosInstance.delete(
    `${API_ENDPOINTS.TASK_SPACE}/${taskSpaceId}/hierarchy-level/${configId}`,
    { withCredentials: true },
  );
  return response.data;
};

/** Updates a specific hierarchy level config (name / icon / color / sequence). */
export const updateHierarchyLevelConfig = async (
  taskSpaceId: number,
  configId: number,
  data: { name?: string; icon?: string; color?: string; sequence?: number },
): Promise<any> => {
  const response = await axiosInstance.put(
    `${API_ENDPOINTS.TASK_SPACE}/${taskSpaceId}/hierarchy-level/${configId}`,
    data,
    { withCredentials: true },
  );
  return response.data;
};

export const getTaskStatusCounts = async (taskSpaceId: number): Promise<{ hierarchyLevelName: string | null; counts: any[] }> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TASK_SPACE}/${taskSpaceId}/task-status-counts`,
      { withCredentials: true }
    );
    return response.data || { hierarchyLevelName: null, counts: [] };
  } catch {
    return { hierarchyLevelName: null, counts: [] };
  }
};

/** Single request that returns status counts for ALL supplied space IDs at once */
export const getBulkTaskStatusCounts = async (
  spaceIds: number[]
): Promise<Record<number, { hierarchyLevelName: string | null; counts: any[] }>> => {
  if (!spaceIds.length) return {};
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TASK_SPACE}/bulk-status-counts`,
      { spaceIds },
      { withCredentials: true }
    );
    return response.data || {};
  } catch {
    return {};
  }
};

// ── Status ──────────────────────────────────────────────────────────────────

export const getTaskSpaceStatusConfig = async (id: number): Promise<any> => {
  const companyId = getActiveCompanyId();
  const response = await axiosInstance.get(
    `${API_ENDPOINTS.TASK_SPACE}/${id}/config/status`,
    {
      withCredentials: true,
      ...(companyId != null ? { params: { companyId } } : {}),
    },
  );
  return response.data;
};

export const addStatusToTaskSpace = async (id: number, name: string, color: string, base?: string | null): Promise<any> => {
  const response = await axiosInstance.post(`${API_ENDPOINTS.TASK_SPACE}/${id}/status`, { name, color, base: base ?? null }, { withCredentials: true });
  return response.data;
};

export const addExistingStatusToTaskSpace = async (id: number, statusId: number): Promise<any> => {
  const response = await axiosInstance.post(`${API_ENDPOINTS.TASK_SPACE}/${id}/status/existing`, { statusId }, { withCredentials: true });
  return response.data;
};

export const removeStatusFromTaskSpace = async (id: number, statusId: number): Promise<any> => {
  const response = await axiosInstance.delete(`${API_ENDPOINTS.TASK_SPACE}/${id}/status/${statusId}`, { withCredentials: true });
  return response.data;
};

export const updateTaskSpaceStatusSequence = async (
  id: number,
  statusSequences: { statusId: number; sequence: number }[],
): Promise<any> => {
  const response = await axiosInstance.put(`${API_ENDPOINTS.TASK_SPACE}/${id}/status/sequence`, { statusSequences }, { withCredentials: true });
  return response.data;
};

export const updateTaskSpaceStatus = async (
  taskSpaceId: number,
  statusId: number,
  data: { name?: string; color?: string },
): Promise<any> => {
  const response = await axiosInstance.patch(
    `${API_ENDPOINTS.TASK_SPACE}/${taskSpaceId}/status/${statusId}`,
    data,
    { withCredentials: true },
  );
  return response.data;
};

// ── Severity ─────────────────────────────────────────────────────────────────

export const getTaskSpaceSeverityConfig = async (id: number): Promise<any> => {
  const companyId = getActiveCompanyId();
  const response = await axiosInstance.get(
    `${API_ENDPOINTS.TASK_SPACE}/${id}/config/severity`,
    {
      withCredentials: true,
      ...(companyId != null ? { params: { companyId } } : {}),
    },
  );
  return response.data;
};

export const addSeverityToTaskSpace = async (id: number, name: string, color: string): Promise<any> => {
  const response = await axiosInstance.post(`${API_ENDPOINTS.TASK_SPACE}/${id}/severity`, { name, color }, { withCredentials: true });
  return response.data;
};

export const addExistingSeverityToTaskSpace = async (id: number, severityId: number): Promise<any> => {
  const response = await axiosInstance.post(`${API_ENDPOINTS.TASK_SPACE}/${id}/severity/existing`, { severityId }, { withCredentials: true });
  return response.data;
};

export const removeSeverityFromTaskSpace = async (id: number, severityId: number): Promise<any> => {
  const response = await axiosInstance.delete(`${API_ENDPOINTS.TASK_SPACE}/${id}/severity/${severityId}`, { withCredentials: true });
  return response.data;
};

export const updateTaskSpaceSeverity = async (
  taskSpaceId: number,
  severityId: number,
  data: { name?: string; color?: string },
): Promise<any> => {
  const response = await axiosInstance.patch(
    `${API_ENDPOINTS.TASK_SPACE}/${taskSpaceId}/severity/${severityId}`,
    data,
    { withCredentials: true },
  );
  return response.data;
};

// ── Owners ───────────────────────────────────────────────────────────────────

export const getTaskSpaceOwnersConfig = async (id: number): Promise<any> => {
  const response = await axiosInstance.get(`${API_ENDPOINTS.TASK_SPACE}/${id}/config/owners`, { withCredentials: true });
  return response.data;
};

export const addOwnerToTaskSpace = async (id: number, userId: number): Promise<any> => {
  const response = await axiosInstance.post(`${API_ENDPOINTS.TASK_SPACE}/${id}/owner`, { userId }, { withCredentials: true });
  return response.data;
};

export const removeOwnerFromTaskSpace = async (id: number, userId: number): Promise<any> => {
  const response = await axiosInstance.delete(`${API_ENDPOINTS.TASK_SPACE}/${id}/owner/${userId}`, { withCredentials: true });
  return response.data;
};

// ── Resources ────────────────────────────────────────────────────────────────

export const getTaskSpaceResourcesConfig = async (id: number): Promise<any> => {
  const companyId = getActiveCompanyId();
  const response = await axiosInstance.get(
    `${API_ENDPOINTS.TASK_SPACE}/${id}/config/resources`,
    {
      withCredentials: true,
      ...(companyId != null ? { params: { companyId } } : {}),
    },
  );
  return response.data;
};

export const addResourceToTaskSpace = async (id: number, resourceId: number): Promise<any> => {
  const response = await axiosInstance.post(`${API_ENDPOINTS.TASK_SPACE}/${id}/resource`, { resourceId }, { withCredentials: true });
  return response.data;
};

export const searchResourcesForTaskSpace = async (
  taskSpaceId: number,
  query?: string,
  rows = 5,
): Promise<any[]> => {
  const companyId = getActiveCompanyId();
  const response = await axiosInstance.post(
    `${API_ENDPOINTS.TASK_SPACE}/${taskSpaceId}/resource/search`,
    { query, rows, ...(companyId != null ? { companyId } : {}) },
    { withCredentials: true },
  );
  return response.data;
};

export const getResourcePoolsForTaskSpace = async (taskSpaceId: number): Promise<any[]> => {
  const companyId = getActiveCompanyId();
  const response = await axiosInstance.get(
    `${API_ENDPOINTS.TASK_SPACE}/${taskSpaceId}/resource-pools`,
    {
      withCredentials: true,
      ...(companyId != null ? { params: { companyId } } : {}),
    },
  );
  return response.data;
};

export const searchResourcePoolsForTaskSpace = async (
  taskSpaceId: number,
  query: string,
): Promise<any[]> => {
  const companyId = getActiveCompanyId();
  const response = await axiosInstance.post(
    `${API_ENDPOINTS.TASK_SPACE}/${taskSpaceId}/resource-pools/search`,
    { query, ...(companyId != null ? { companyId } : {}) },
    { withCredentials: true },
  );
  return response.data;
};

export const removeResourceFromTaskSpace = async (id: number, resourceId: number): Promise<any> => {
  const response = await axiosInstance.delete(`${API_ENDPOINTS.TASK_SPACE}/${id}/resource/${resourceId}`, { withCredentials: true });
  return response.data;
};

