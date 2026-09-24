import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_ENDPOINTS } from "../api";

const API_URL = API_ENDPOINTS.ROLE;

export async function loadRoles(
  params: Record<string, any>
): Promise<{ total: number; data: any[] }> {
  const url = `${API_URL}/search`;

  try {
    const response = await axiosInstance.post(url, params, {
      responseType: "json",
    });
    return response.data;
  } catch (error) {
    console.error("Error loading roles:", error);
    throw error;
  }
}


export const getRoleById = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${API_URL}/${id}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};
export const createRole = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(`${API_URL}`, data, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error creating role:", error);
    throw error;
  }
};

export const getAllRoles = async (): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${API_URL}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

export const getAllRoleByCompany = async (companyId: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/company/${companyId}`,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

export const deleteRole = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.delete(`${API_URL}/${id}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error deleting role:", error);
    throw error;
  }
};

export const disableRole = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.patch(`${API_URL}/${id}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error deleting role:", error);
    throw error;
  }
};

export const updateRole = async (id: number, data: any): Promise<any> => {
  try {
    const response = await axiosInstance.put(`${API_URL}/${id}`, data, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error updating role:", error);
    throw error;
  }
};

export const assignPrivilegeToRole = async (
  roleId: number,
  privilegeIds: number[]
): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}/assignPrivilegeToRole`,
      { roleId, privilegeIds },
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error assigning privilege to role:", error);
    throw error;
  }
};

