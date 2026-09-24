import { API_ENDPOINTS } from "../api";
import axiosInstance from "@/lib/interceptors/axiosInstance";

export const chatService = {
  /**
   * Sends a chat message to the backend and returns the raw stream 
   * so the caller can read the data chunk by chunk.
   */
  streamChat: async (message: string): Promise<ReadableStream> => {
    // We use adapter: 'fetch' because standard XHR does not support 
    // raw ReadableStreams in the browser for chunk-by-chunk decoding.
    const response = await axiosInstance.post(
      API_ENDPOINTS.CHAT,
      { message },
      {
        responseType: 'stream',
        adapter: 'fetch'
      }
    );

    return response.data;
  }
};

