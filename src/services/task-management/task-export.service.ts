import axiosInstance from '@/lib/interceptors/axiosInstance';
import { API_ENDPOINTS } from '../API/api';
import type { QueryParam } from '@/interfaces/query';

/**
 * Export tasks to Excel file
 * Sends the filter and sort parameters to the backend and downloads the Excel file
 */
export const exportTasksToExcel = async (queryParam: QueryParam): Promise<void> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.EXPORT_EXCEL_TASK}`,
      queryParam,
      {
        responseType: 'blob',
        withCredentials: true,
      }
    );

    // Create a blob from the response
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // Create a temporary URL and trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tasks-export-${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();

    // Cleanup
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting tasks:', error);
    throw error;
  }
};
