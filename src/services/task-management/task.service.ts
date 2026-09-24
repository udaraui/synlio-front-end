import axiosInstance from '@/lib/interceptors/axiosInstance';
import { API_ENDPOINTS } from '../api';

export const createTask = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(`${API_ENDPOINTS.TASK_MANAGEMENT_TASK}`, data, { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

export const updateTask = async (id: number, data: any): Promise<any> => {
  try {
    const response = await axiosInstance.put(`${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}`, data, { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

export const getTaskById = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}`, { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error fetching task:', error);
    throw error;
  }
};

/** Lightweight fetch — only base display fields (no assignee/coAssignees/members/childTasks/linkedTasks/attachments/checklist/events). Use for Phase 1 fast render. */
export const getTaskBaseById = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/core`, { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error fetching task core:', error);
    throw error;
  }
};

/** Fetch assignee, coAssignees and members for a task (Phase 2a). */
export const getTaskAssignees = async (id: number): Promise<{ assignee: any; coAssignees: any[]; members: any[] }> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/assignees`, { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error fetching task assignees:', error);
    throw error;
  }
};

/** Fetch child tasks for a task (individual section request). */
export const getTaskChildTasks = async (id: number): Promise<{ childTasks: any[] }> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/child-tasks`, { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error fetching task child tasks:', error);
    throw error;
  }
};

/** Fetch checklist items for a task (individual section request). */
export const getTaskChecklists = async (id: number): Promise<{ taskChecklists: any[] }> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/checklist`, { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error fetching task checklist:', error);
    throw error;
  }
};

/** Fetch task events/log history for a task (individual section request). */
export const getTaskEvents = async (id: number): Promise<{ taskEvents: any[] }> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/events`, { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error fetching task events:', error);
    throw error;
  }
};

export const searchTasks = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(`${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/search`, data, { withCredentials: true });

    // Custom alphanumeric sorting for 'code' column on the frontend
    const multiSorts = data?.multiSorts || [];
    const codeSort = multiSorts.find((s: any) => s.field === 'code');

    if (codeSort && response.data?.data && Array.isArray(response.data.data)) {
      const isAsc = codeSort.order === '1' || codeSort.order === 1;
      response.data.data.sort((a: any, b: any) => {
        const codeA = String(a.code || '');
        const codeB = String(b.code || '');
        const comparison = codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
        return isAsc ? comparison : -comparison;
      });
    }

    return response.data;
  } catch (error) {
    console.error('Error searching tasks:', error);
    throw error;
  }
};

export const searchDashboardTasks = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(`${API_ENDPOINTS.DASHBOARD}/task/search`, data, { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error searching dashboard tasks:', error);
    throw error;
  }
};

export const deleteTask = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.delete(`${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}`, { withCredentials: true });
    return response;
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

// ── Individual PATCH methods for inline card editing ──────────────────────────

export const patchTaskName = async (
  id: number,
  name: string,
  oldName?: string | null,
  updatedBy?: string,
): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/name`,
      { name, oldName, updatedBy },
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating task name:', error);
    throw error;
  }
};


export const patchTaskStatus = async (
  id: number,
  statusId: number | null,
  oldStatusId?: number | null,
  parentTaskId?: number | null,
  updatedBy?: string,
): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/status`,
      { statusId, oldStatusId, parentTaskId, updatedBy },
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
};

export const patchTaskSeverity = async (
  id: number,
  severityId: number | null,
  oldSeverityId?: number | null,
  updatedBy?: string,
): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/severity`,
      { severityId, oldSeverityId, updatedBy },
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating task severity:', error);
    throw error;
  }
};

export const patchTaskAssignee = async (
  id: number,
  assigneeId: number | null,
  oldAssigneeId?: number | null,
  updatedBy?: string,
  assigneeSkill?: string | null,
): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/assignee`,
      { assigneeId, oldAssigneeId, updatedBy, assigneeSkill: assigneeSkill ?? null },
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating task assignee:', error);
    throw error;
  }
};

export const patchTaskCoAssignees = async (id: number, coAssigneeIds: number[], updatedBy?: string): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/co-assignees`,
      { coAssigneeIds, updatedBy },
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating task co-assignees:', error);
    throw error;
  }
};

export const patchTaskHierarchyLevel = async (id: number, hierarchyLevelConfigId: number | null): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/hierarchy-level`,
      { hierarchyLevelConfigId },
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating task hierarchy level:', error);
    throw error;
  }
};

export const patchTaskDates = async (
  id: number,
  startDate: string | null,
  dueDate: string | null,
  oldStartDate?: string | null,
  oldDueDate?: string | null,
  parentTaskId?: number | null,
  updatedBy?: string,
): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/dates`,
      { startDate, dueDate, oldStartDate, oldDueDate, parentTaskId, updatedBy },
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating task dates:', error);
    throw error;
  }
};

export const patchTaskProgress = async (
  id: number,
  progressPercentage: number,
  oldProgressPercentage?: number | null,
  updatedBy?: string,
): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/progress`,
      { progressPercentage, oldProgressPercentage, updatedBy },
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating task progress:', error);
    throw error;
  }
};

export const patchTaskSpecial = async (id: number, special: boolean, updatedBy?: string): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/special`,
      { special, updatedBy },
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating task special:', error);
    throw error;
  }
};

/**
 * Reads the code that WOULD be assigned next WITHOUT incrementing the counter.
 * Use this for form previews. The actual code is generated (and the counter
 * incremented) only when the task is saved via createTask.
 */
export const peekNextTaskCode = async (
  taskSpaceId: number,
  hierarchyLevelConfigId: number,
  parentTaskId?: number | null,
): Promise<{ code: string }> => {
  try {
    const params = new URLSearchParams({ hierarchyLevelConfigId: String(hierarchyLevelConfigId) });
    if (parentTaskId != null) params.append('parentTaskId', String(parentTaskId));
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/peek-next-code/${taskSpaceId}?${params.toString()}`,
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error peeking next task code:', error);
    throw error;
  }
};

export const getNextTaskCode = async (
  taskSpaceId: number,
  hierarchyLevelConfigId: number,
  parentTaskId?: number | null,
): Promise<{ code: string }> => {
  try {
    const params = new URLSearchParams({ hierarchyLevelConfigId: String(hierarchyLevelConfigId) });
    if (parentTaskId != null) params.append('parentTaskId', String(parentTaskId));
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/next-code/${taskSpaceId}?${params.toString()}`,
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching next task code:', error);
    throw error;
  }
};

export const getBulkTaskRelations = async (taskIds: number[]): Promise<Record<number, any>> => {
  if (!taskIds || taskIds.length === 0) return {};
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/bulk-relations`,
      { taskIds },
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching bulk task relations:', error);
    throw error;
  }
};

export const patchTaskLabels = async (id: number, labelIds: number[], updatedBy?: string): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/labels`,
      { labelIds, updatedBy },
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating task labels:', error);
    throw error;
  }
};

export const patchTaskDescription = async (id: number, description: string | null, updatedBy?: string): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/description`,
      { description, updatedBy },
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating task description:', error);
    throw error;
  }
};

export const patchTaskActualDates = async (
  id: number,
  actualStartDate: string | null,
  actualEndDate: string | null,
  updatedBy?: string,
): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/actual-dates`,
      { actualStartDate, actualEndDate, updatedBy },
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating task actual dates:', error);
    throw error;
  }
};

export const patchTaskEffort = async (
  id: number,
  estimateEffort: number | null,
  actualEffort: number | null,
  updatedBy?: string,
): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/effort`,
      {
        estimateEffort: estimateEffort ?? null,
        actualEffort: actualEffort ?? null,
        updatedBy,
      },
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating task effort:', error);
    throw error;
  }
};

export const patchTaskMembers = async (id: number, memberIds: number[], updatedBy?: string): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TASK_MANAGEMENT_TASK}/${id}/members`,
      { memberIds, updatedBy },
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating task members:', error);
    throw error;
  }
};


