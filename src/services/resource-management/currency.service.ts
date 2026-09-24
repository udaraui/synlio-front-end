import axiosInstance from '@/lib/interceptors/axiosInstance';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const getAllCurrencies = async (): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${API_URL}/currency`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error('Error fetching currencies:', error);
    throw error;
  }
};
