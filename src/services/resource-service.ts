import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_ENDPOINTS } from "./API/api";

const API_URL = API_ENDPOINTS.RESOURCE;

export async function checkResourceEmail(email: string): Promise<{ exists: boolean; resource?: { id: number; first_name: string; last_name: string; email: string } }> {
  try {
    const response = await axiosInstance.get(`${API_URL}/check-email/${encodeURIComponent(email)}`, {
      withCredentials: true,
    });
    return response.data;
  } catch {
    return { exists: false };
  }
}


export async function loadResource(
  params: Record<string, any>
): Promise<{ total: number; data: any[] }> {
  const url = `${API_URL}/search`;

  try {
    const response = await axiosInstance.post(url, params, {
      responseType: "json",
    });
    return response.data;
  } catch (error) {
    console.error("Error loading resources:", error);
    throw error;
  }
}

export async function searchResourcesWithSkills(
  query?: string,
  rows: number = 10,
): Promise<any[]> {
  const url = `${API_URL}/search-with-skills`;

  try {
    const response = await axiosInstance.post(url, { query, rows }, {
      responseType: "json",
      withCredentials: true,
    });
    return response.data || [];
  } catch (error) {
    console.error("Error searching resources with skills:", error);
    throw error;
  }
}

// export const createResourcePool = async (data: any): Promise<any> => {
//   try {
//     const response = await axiosInstance.post(
//       `${API_URL}/resource/createResourcePool`,
//       data,
//       {
//         withCredentials: true,
//       }
//     );
//     return response;
//   } catch (error) {
//     console.error("Error creating user:", error);
//     throw error;
//   }
// };

export const createResource = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}`,
      data,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response;
  } catch (error) {
    console.error("Error creating resource:", error);
    throw error;
  }
};

export const updateResource = async (id: number, data: any): Promise<any> => {
  try {
    const response = await axiosInstance.put(
      `${API_URL}/` + id,
      data,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const quickUpdateResource = async (id: number, field: string, value: any): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_URL}/quickEdit/${id}`,
      {
        field,
        value
      },
      {
        withCredentials: true,
        // Using JSON here as quick edit doesn't typically involve file uploads
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error performing quick edit on field ${field}:`, error);
    throw error;
  }
};

export const getAllResource = async (): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/resource/getAllResources`,
      { withCredentials: true }
    );
    return response;
  } catch (error) {
    console.error("Error fetching resources:", error);
    throw error;
  }
};

export const getAllResourceByCompany = async (
  companyId: number,
  divisionId: number
): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/getAllResourcesByCompany/` + companyId + "/" + divisionId,
      { withCredentials: true }
    );
    return response;
  } catch (error) {
    console.error("Error fetching resources:", error);
    throw error;
  }
};

export const getAllResourcesByCompanyOnly = async (
  companyId: number
): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/company/${companyId}`,
      { withCredentials: true }
    );
    return response;
  } catch (error) {
    console.error("Error fetching resources by company:", error);
    throw error;
  }
};

export const fetchResourceSkills = async (id: number): Promise<string[]> => {
  try {
    const response = await axiosInstance.get(`${API_URL}/${id}`);
    const data = response.data ?? response;
    const raw: any[] = data?.skills ?? data?.data?.skills ?? [];
    return [...new Set<string>(raw.map((s: any) => {
      if (typeof s === 'string') return s;
      const skill = s?.skill ?? s?.name ?? s?.skillName;
      if (typeof skill === 'string') return skill;
      if (skill && typeof skill === 'object') return skill?.name ?? skill?.skill ?? JSON.stringify(skill);
      return JSON.stringify(s);
    }))];
  } catch {
    return [];
  }
};

export const findOneResource = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${API_URL}/` + id, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error fetching resources:", error);
    throw error;
  }
};

export const disableResource = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.patch(`${API_URL}/` + id, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error disable resources:", error);
    throw error;
  }
};

export const deleteResource = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.delete(`${API_URL}/` + id, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error disable resources:", error);
    throw error;
  }
};

export const getResourceSkills = async (id: number, count: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${API_URL}/` + id + `/skills`, {
      withCredentials: true,
      params: { count },
    });
    return response;
  } catch (error) {
    console.error("Error fetching resources:", error);
    throw error;
  }
};

export const getPendingTransfers = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/resource/getPendingTransfersForUsers/pending/` + id,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error fetching resources:", error);
    throw error;
  }
};

export const getPendingTransferForResource = async (
  id: number
): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/resource/getPendingTransfersForResource/pending/` + id,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error fetching resources:", error);
    throw error;
  }
};

export const requestResourceTransfer = async (
  resourceId: number,
  newPoolId: number,
  data: any
): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}/resource/` + resourceId + `/transfer/` + newPoolId,
      data,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error fetching resources:", error);
    throw error;
  }
};

export const respondToRequest = async (
  requestId: number,
  status: string
): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}/resource/resourceTransfer/` + requestId,
      { status },
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error fetching resources:", error);
    throw error;
  }
};

export const findAllResourcePools = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/resource/findAllResourcePools`,
      {
        params: data,
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error fetching resource groups:", error);
    throw error;
  }
};

// export const updateResourcePool = async (id: number, data: any): Promise<any> => {
//   try {
//     const response = await axiosInstance.put(
//       `${API_URL}/resource/updateResourcePool/${id}`,
//       data,
//       {
//         withCredentials: true,
//       }
//     );
//     return response;
//   } catch (error) {
//     console.error("Error updating resource groups:", error);
//     throw error;
//   }
// };

export const deleteResourcePool = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.delete(
      `${API_URL}/resource/deleteResourcePool/${id}`,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error deleting resource groups:", error);
    throw error;
  }
};

export const deleteTask = async (taskid: number) => {
  try {
    const response = await axiosInstance.delete(
      `${API_URL}/project-proposal/deleteTask/` + taskid
    );
    return response;
  } catch (error) {
    throw error;
  }
};

export const getResourceActiveCounts = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${API_URL}/${id}/active-counts`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching resource active counts:", error);
    throw error;
  }
};

/** Syncs a resource's first_name, last_name, mobile, and profile_pic
 *  from the matching active user account (same email).
 *  Does NOT touch skills, division, calendar, or any other relations. */
export const syncResourceWithUser = async (resourceId: number): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_URL}/${resourceId}/sync-user`,
      {},
      { withCredentials: true },
    );
    return response;
  } catch (error) {
    console.error("Error syncing resource with user:", error);
    throw error;
  }
};

export const getMyDirectReports = async (): Promise<any[]> => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/my-direct-reports`,
      { withCredentials: true },
    );
    return response.data ?? [];
  } catch (error) {
    console.error("Error fetching direct reports:", error);
    throw error;
  }
};

