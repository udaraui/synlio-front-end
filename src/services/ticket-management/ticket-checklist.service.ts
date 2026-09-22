import axiosInstance from '@/lib/interceptors/axiosInstance';
import type {
  CreateTicketChecklistDto,
  TicketChecklist,
  UpdateTicketChecklistDto,
} from '@/interfaces/ticket-checklist';

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/ticket-management/ticket-checklist`;

export const getTicketChecklistByTicket = async (
  ticketId: number,
): Promise<TicketChecklist[]> => {
  const response = await axiosInstance.get(`${BASE}/ticket/${ticketId}`, { withCredentials: true });
  return response.data;
};

export const createTicketChecklist = async (
  data: CreateTicketChecklistDto,
): Promise<TicketChecklist> => {
  const response = await axiosInstance.post(BASE, data, { withCredentials: true });
  return response.data;
};

export const updateTicketChecklist = async (
  id: number,
  data: UpdateTicketChecklistDto,
): Promise<TicketChecklist> => {
  const response = await axiosInstance.put(`${BASE}/${id}`, data, { withCredentials: true });
  return response.data;
};

export const deleteTicketChecklist = async (id: number): Promise<{ message: string }> => {
  const response = await axiosInstance.delete(`${BASE}/${id}`, { withCredentials: true });
  return response.data;
};
