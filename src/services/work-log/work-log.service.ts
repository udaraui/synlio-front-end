import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_ENDPOINTS } from "@/services/api";

export const getResourceTaskLogHistory = async (id: number): Promise<any> => {
    try {
        const response = await axiosInstance.get(`${API_ENDPOINTS.WORK_LOG}/resource-task-log-history/${id}`, { withCredentials: true });
        return response.data;
    } catch (error) {
        console.error('Error fetching work log history:', error);
        throw error;
    }
};

export const getResourceTicketLogHistory = async (id: number): Promise<any> => {
    try {
        const response = await axiosInstance.get(`${API_ENDPOINTS.WORK_LOG}/resource-ticket-log-history/${id}`, { withCredentials: true });
        return response.data;
    } catch (error) {
        console.error('Error fetching work log history:', error);
        throw error;
    }
};

export const createResourceLog = async (payload: any): Promise<any> => {
    try {
        const response = await axiosInstance.post(API_ENDPOINTS.WORK_LOG, payload, { withCredentials: true });
        return response.data;
    } catch (error) {
        console.error('Error creating work log:', error);
        throw error;
    }
};

export const updateResourceLog = async (id: number, payload: any): Promise<any> => {
    try {
        const response = await axiosInstance.patch(`${API_ENDPOINTS.WORK_LOG}/${id}`, payload, { withCredentials: true });
        return response.data;
    } catch (error) {
        console.error('Error updating work log:', error);
        throw error;
    }
};

export const deleteResourceLog = async (id: number): Promise<any> => {
    try {
        const response = await axiosInstance.delete(`${API_ENDPOINTS.WORK_LOG}/${id}`, { withCredentials: true });
        return response.data;
    } catch (error) {
        console.error('Error deleting work log:', error);
        throw error;
    }
};

