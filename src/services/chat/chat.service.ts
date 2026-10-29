import { API_ENDPOINTS } from "../api";
import axiosInstance from "@/lib/interceptors/axiosInstance";

export const chatService = {
  /**
   * Sends a chat message and recent conversation history to the backend,
   * returning the raw stream so the caller can read the data chunk by chunk.
   */
  streamChat: async (
    message: string, 
    conversationId?: string,
    agent?: string,
    context?: Record<string, any>,
    history?: Array<{ role: string; content: string }>,
    pendingDraft?: any,
    chatMode?: string,
    attachments?: Array<{ filename: string; mimeType: string; content?: string; contentText?: string }>
  ): Promise<ReadableStream> => {
    // We use adapter: 'fetch' because standard XHR does not support 
    // raw ReadableStreams in the browser for chunk-by-chunk decoding.
    const response = await axiosInstance.post(
      API_ENDPOINTS.CHAT,
      { message, conversationId, agent, context, history, pendingDraft, chatMode, attachments },
      {
        responseType: 'stream',
        adapter: 'fetch',
        timeout: 0 // Disable timeout for long-running stream connections
      }
    );

    return response.data;
  }
};
