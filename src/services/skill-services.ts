import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_ENDPOINTS } from "./API/api";

const API_URL = API_ENDPOINTS.SKILL;
const API_URL_LEVEL = API_ENDPOINTS.SKILL_LEVEL;
const API_URL_CATEGORY = API_ENDPOINTS.SKILL_CATEGORY;

export async function loadSkills(
  params: Record<string, any>
): Promise<{ total: number; data: any[] }> {
  const url = `${API_URL}/search`;

  try {
    const response = await axiosInstance.post(url, params, {
      responseType: "json",
    });
    return response.data;
  } catch (error) {
    console.error("Error loading skills:", error);
    throw error;
  }
}
export async function loadSkill_level(
  params: Record<string, any>
): Promise<{ total: number; data: any[] }> {
  const url = `${API_URL_LEVEL}/search`;

  try {
    const response = await axiosInstance.post(url, params, {
      responseType: "json",
    });
    return response.data;
  } catch (error) {
    console.error("Error loading skills:", error);
    throw error;
  }
}
export async function loadSkillCategories(
  params: Record<string, any>
): Promise<{ total: number; data: any[] }> {
  const url = `${API_URL_CATEGORY}/search`;

  try {
    const response = await axiosInstance.post(url, params, {
      responseType: "json",
    });
    return response.data;
  } catch (error) {
    console.error("Error loading skill categories:", error);
    throw error;
  }
}

export const getAllSkills = async (companyId: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${API_URL}/getAllSkills/${companyId}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error loading skills:", error);
    throw error;
  }
};

export const createSkillCategory = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(`${API_URL_CATEGORY}`, data, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error creating skill category:", error);
    throw error;
  }
};

export const updateSkillCategory = async (
  id: number,
  data: any
): Promise<any> => {
  try {
    const response = await axiosInstance.put(
      `${API_URL_CATEGORY}/${id}`,
      data
    );
    return response;
  } catch (error) {
    console.error("Error updating skill category:", error);
    throw error;
  }
};

export const disableSkillCategory = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.patch(`${API_URL_CATEGORY}/${id}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error deleting skill category:", error);
    throw error;
  }
};

export const deleteSkillCategory = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.delete(`${API_URL_CATEGORY}/${id}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error deleting skill category:", error);
    throw error;
  }
};

export const createSkill = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(`${API_URL}`, data, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error creating skill:", error);
    throw error;
  }
};

export const updateSkill = async (id: number, data: any): Promise<any> => {
  try {
    const response = await axiosInstance.put(`${API_URL}/${id}`, data, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error updating skill:", error);
    throw error;
  }
};

export const disableSkill = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.patch(`${API_URL}/${id}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error deleting skill:", error);
    throw error;
  }
};

export const deleteSkill = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.delete(`${API_URL}/${id}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error deleting skill:", error);
    throw error;
  }
};

export const createSkillLevel = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(`${API_URL_LEVEL}`, data, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error creating skill level:", error);
    throw error;
  }
};

export const updateSkillLevel = async (id: number, data: any): Promise<any> => {
  try {
    const response = await axiosInstance.put(`${API_URL_LEVEL}/${id}`, data, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error updating skill level:", error);
    throw error;
  }
};

export const disableSkillLevel = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.patch(`${API_URL_LEVEL}/${id}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error deleting skill level:", error);
    throw error;
  }
};

export const deleteSkillLevel = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.delete(`${API_URL_LEVEL}/${id}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error deleting skill level:", error);
    throw error;
  }
};