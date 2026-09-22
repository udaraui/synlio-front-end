import axiosInstance from '@/lib/interceptors/axiosInstance';
import { API_ENDPOINTS } from '../API/api';
import type { QueryParam } from '@/interfaces/query';

/**
 * Export tickets to Excel file
 * Sends the filter and sort parameters to the backend and downloads the Excel file
 */
export const exportTicketsToExcel = async (queryParam: QueryParam): Promise<void> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.EXPORT_EXCEL_TICKET}`,
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
    link.setAttribute('download', `tickets-export-${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();

    // Cleanup
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting tickets:', error);
    throw error;
  }
};
