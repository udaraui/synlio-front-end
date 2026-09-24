import axiosInstance from '@/lib/interceptors/axiosInstance';
import type {
  CreateTicketTemplateDto,
  TicketTemplate,
  UpdateTicketTemplateDto,
} from '@/interfaces/ticket-template';

import { API_ENDPOINTS } from '../api';

const BASE = API_ENDPOINTS.TICKET_TEMPLATE;

export const fetchTemplates = async (
  spaceId: number,
  userEmail?: string,
  nameFilter?: string
): Promise<TicketTemplate[]> => {
  const filters: any[] = [
    { field: 'ticketSpaceId', matchMode: 'equals', value: spaceId },
  ];

  if (nameFilter) {
    filters.push({ field: 'name', matchMode: 'contains', value: nameFilter });
  }

  const payload = {
    first: 0,
    rows: 100,
    filters,
  };

  const response = await axiosInstance.post(`${BASE}/search`, payload, { withCredentials: true });
  return response.data.data;
};

export const createTicketTemplate = async (
  data: CreateTicketTemplateDto,
): Promise<TicketTemplate> => {
  const response = await axiosInstance.post(BASE, data, { withCredentials: true });
  return response.data;
};

export const updateTicketTemplate = async (
  id: number,
  data: UpdateTicketTemplateDto,
): Promise<TicketTemplate> => {
  const response = await axiosInstance.put(`${BASE}/${id}`, data, { withCredentials: true });
  return response.data;
};

export const deleteTicketTemplate = async (
  id: number,
): Promise<void> => {
  await axiosInstance.delete(`${BASE}/${id}`, { withCredentials: true });
};

