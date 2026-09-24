import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_ENDPOINTS } from "../api";

export interface FilterTemplate {
  id: string;
  name: string;
  filters: any;
  createdAt: string;
  companyId?: number;
}

export interface UserConfig {
  id: number;
  userId: number;
  theme: string;
  viewPreference: any;
  filterPreference: any;
  filterTemplates?: {
    ticket?: FilterTemplate[];
    task?: FilterTemplate[];
  };
  quickActionConfig?: any;
  primaryColor: string;
  sidebarColor: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserConfigDto {
  theme?: string;
  viewPreference?: any;
  filterPreference?: any;
  filterTemplates?: {
    ticket?: FilterTemplate[];
    task?: FilterTemplate[];
  };
  quickActionConfig?: any;
  primaryColor?: string;
  sidebarColor?: string;
}

// ── Module-level cache ────────────────────────────────────────────────────────
// Stores the last fetched config per userId so repeated calls within the TTL
// window (e.g. multiple components mounting at once) share a single result.
const CACHE_TTL_MS = 60_000; // 1 minute

interface CacheEntry {
  data: UserConfig;
  timestamp: number;
}

const configCache = new Map<number, CacheEntry>();

// In-flight deduplication: if a request is already in progress for a userId,
// return the same promise instead of firing a duplicate HTTP call.
const inflightRequests = new Map<number, Promise<UserConfig | null>>();

/**
 * Invalidate the cache for a specific user (call after writes).
 */
export const invalidateUserConfigCache = (userId: number): void => {
  configCache.delete(userId);
};

/**
 * Get user configuration by user ID
 * @param userId - The user ID
 * @returns User configuration or null if not found
 */
export const getUserConfig = async (userId: number): Promise<UserConfig | null> => {
  // 1. Return from cache if still fresh
  const cached = configCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. Return the existing in-flight promise if one is already running
  const existing = inflightRequests.get(userId);
  if (existing) return existing;

  // 3. Fire the real HTTP request
  const request = axiosInstance
    .get(`${API_ENDPOINTS.USER_CONFIG}/${userId}`, { withCredentials: true })
    .then((response) => {
      const data: UserConfig = response.data;
      configCache.set(userId, { data, timestamp: Date.now() });
      return data;
    })
    .catch((error: any) => {
      if (error?.response?.status === 404) return null;
      console.error("Error getting user config:", error);
      throw error;
    })
    .finally(() => {
      inflightRequests.delete(userId);
    });

  inflightRequests.set(userId, request);
  return request;
};

/**
 * Create or update user configuration
 * @param userId - The user ID
 * @param data - The configuration data to update
 * @returns Updated user configuration
 */
export const createOrUpdateUserConfig = async (
  userId: number,
  data: UpdateUserConfigDto
): Promise<UserConfig> => {
  try {
    const response = await axiosInstance.put(
      `${API_ENDPOINTS.USER_CONFIG}/${userId}`,
      data,
      {
        withCredentials: true,
      }
    );
    const updatedConfig: UserConfig = response.data;
    // Keep cache in sync so subsequent reads don't re-fetch
    configCache.set(userId, { data: updatedConfig, timestamp: Date.now() });
    return updatedConfig;
  } catch (error) {
    console.error("Error updating user config:", error);
    throw error;
  }
};

/**
 * Delete user configuration
 * @param userId - The user ID
 */
export const deleteUserConfig = async (userId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`${API_ENDPOINTS.USER_CONFIG}/${userId}`, {
      withCredentials: true,
    });
    configCache.delete(userId);
  } catch (error) {
    console.error("Error deleting user config:", error);
    throw error;
  }
};

