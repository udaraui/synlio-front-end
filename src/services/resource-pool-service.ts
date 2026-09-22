import axiosInstance from '@/lib/interceptors/axiosInstance';
import { API_ENDPOINTS } from './API/api';

const API_URL = API_ENDPOINTS.RESOURCE_POOL;

export async function loadResourcePools(
  params: Record<string, any>,
): Promise<{ total: number; data: any[] }> {
  const url = `${API_ENDPOINTS.RESOURCE_POOL}/search`;

  try {
    const response = await axiosInstance.post(url, params, {
      responseType: 'json',
    });
    return response.data;
  } catch (error) {
    console.error('Error loading resource groups:', error);
    throw error;
  }
}

export const createResourcePool = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.RESOURCE_POOL}`,
      data,
      {
        withCredentials: true,
      },
    );
    return response;
  } catch (error) {
    console.error('Error creating resource:', error);
    throw error;
  }
};

export const getById = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.RESOURCE_POOL}/${id}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error('Error deleting pool:', error);
    throw error;
  }
};

export const editResourcePool = async (id: number, data: any): Promise<any> => {
  try {
    const response = await axiosInstance.put(`${API_ENDPOINTS.RESOURCE_POOL}/${id}`,
      data,
      {
        withCredentials: true,
      });
    return response;
  } catch (error) {
    console.error('Error updating pool:', error);
    throw error;
  }
};

export const disable = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.patch(`${API_ENDPOINTS.RESOURCE_POOL}/${id}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error('Error deleting pool:', error);
    throw error;
  }
};

export const deletePool = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.delete(`${API_ENDPOINTS.RESOURCE_POOL}/${id}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error('Error deleting pool:', error);
    throw error;
  }
};

export const getResourcePoolsByCompanyAndDivision = async (
  companyId: number,
  divisionId: number,
): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.RESOURCE_POOL}/company/${companyId}/division/${divisionId}`,
      { withCredentials: true },
    );
    return response;
  } catch (error) {
    console.error('Error fetching resource groups by company and division:', error);
    throw error;
  }
};
