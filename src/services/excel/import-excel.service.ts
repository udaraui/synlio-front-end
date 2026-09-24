import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_ENDPOINTS } from "../api";

// ─── Phase 1: Upload Excel → Staging ─────────────────────────────────────────

export const importUsersData = async (
  file: File,
  companyId?: string,
): Promise<any> => {
  const formData = new FormData();
  formData.append("file", file);
  const url = companyId
    ? `${API_ENDPOINTS.IMPORT_EXCEL}/user?companyId=${companyId}`
    : `${API_ENDPOINTS.IMPORT_EXCEL}/user`;
  const response = await axiosInstance.post(url, formData, {
    withCredentials: true,
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const importResourcesData = async (
  file: File,
  companyId?: string,
): Promise<any> => {
  const formData = new FormData();
  formData.append("file", file);
  const url = companyId
    ? `${API_ENDPOINTS.IMPORT_EXCEL}/resource?companyId=${companyId}`
    : `${API_ENDPOINTS.IMPORT_EXCEL}/resource`;
  const response = await axiosInstance.post(url, formData, {
    withCredentials: true,
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

// ─── Staging: Fetch all records for a session ─────────────────────────────────

export const getStagingRecords = async (
  type: "user" | "resource",
  sessionToken: string,
  companyId?: string,
): Promise<any> => {
  const url = companyId
    ? `${API_ENDPOINTS.IMPORT_EXCEL}/${type}/staging/${sessionToken}?companyId=${companyId}`
    : `${API_ENDPOINTS.IMPORT_EXCEL}/${type}/staging/${sessionToken}`;
  const response = await axiosInstance.get(url, { withCredentials: true });
  return response.data;
};

// ─── Staging: Update a single record ─────────────────────────────────────────

export const updateStagingRecord = async (
  type: "user" | "resource",
  id: number,
  updates: Record<string, any>,
  companyId?: string,
): Promise<any> => {
  const url = companyId
    ? `${API_ENDPOINTS.IMPORT_EXCEL}/${type}/staging/${id}?companyId=${companyId}`
    : `${API_ENDPOINTS.IMPORT_EXCEL}/${type}/staging/${id}`;
  const response = await axiosInstance.patch(url, updates, { withCredentials: true });
  return response.data;
};

// ─── Staging: Delete entire session ──────────────────────────────────────────

export const deleteStagingSession = async (
  type: "user" | "resource",
  sessionToken: string,
  companyId?: string,
): Promise<any> => {
  const url = companyId
    ? `${API_ENDPOINTS.IMPORT_EXCEL}/${type}/staging/${sessionToken}?companyId=${companyId}`
    : `${API_ENDPOINTS.IMPORT_EXCEL}/${type}/staging/${sessionToken}`;
  const response = await axiosInstance.delete(url, { withCredentials: true });
  return response.data;
};

// ─── Phase 2: Promote staging → production ───────────────────────────────────

export const promoteStagingRecords = async (
  type: "user" | "resource",
  sessionToken: string,
  companyId?: string,
  stagingIds?: number[],
): Promise<any> => {
  const url = companyId
    ? `${API_ENDPOINTS.IMPORT_EXCEL}/${type}/staging/promote?companyId=${companyId}`
    : `${API_ENDPOINTS.IMPORT_EXCEL}/${type}/staging/promote`;
  const response = await axiosInstance.post(
    url,
    { sessionToken, ...(stagingIds ? { stagingIds } : {}) },
    { withCredentials: true },
  );
  return response.data;
};

