import axiosInstance from '@/lib/interceptors/axiosInstance';
import { API_ENDPOINTS } from "@/services/API/api";

const API_URL = API_ENDPOINTS.COMMENT;

export interface CreateCommentDto {
  comment: string;
  postId: number;
  postType: 'Task' | 'Ticket';
  parentId?: number;
  attachmentLinks?: string[];
}

export interface UpdateCommentDto {
  comment?: string;
  postId?: number;
  postType?: 'Task' | 'Ticket';
  parentId?: number;
}

export interface Comment {
  id: number;
  comment: string;
  postId: number;
  postType: 'Task' | 'Ticket';
  parentId?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  createdByUser?: {
    username: string;
    first_name?: string;
    last_name?: string;
    profile_picture?: string;
  };
  parentComment?: Comment;
  childComments?: Comment[];
  commentAttachments?: CommentAttachment[];
}

export interface CommentAttachment {
  id: number;
  link: string;
  commentId: number;
  createdAt: string;
  createdBy: string;
}

export interface TaskAttachment {
  id: number;
  link: string;
  taskId: number;
  createdAt: string;
  createdBy: string;
}

// Comment APIs
export const createComment = async (data: CreateCommentDto): Promise<Comment> => {
  try {
    const response = await axiosInstance.post(`${API_URL}`, data, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error('Error creating comment:', error);
    throw error;
  }
};

export const updateComment = async (
  id: number,
  data: UpdateCommentDto
): Promise<Comment> => {
  try {
    const response = await axiosInstance.put(`${API_URL}/${id}`, data, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating comment:', error);
    throw error;
  }
};

export const deleteComment = async (id: number): Promise<void> => {
  try {
    await axiosInstance.delete(`${API_URL}/${id}`, {
      withCredentials: true,
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

export const getCommentsByPost = async (
  postId: number,
  postType: 'Task' | 'Ticket'
): Promise<Comment[]> => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/post/${postId}?postType=${postType}`,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
};

export const getCommentById = async (id: number): Promise<Comment> => {
  try {
    const response = await axiosInstance.get(`${API_URL}/${id}`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching comment:', error);
    throw error;
  }
};

// Comment Attachment APIs
export const createCommentAttachment = async (
  commentId: number,
  link: string
): Promise<CommentAttachment> => {
  try {
    const response = await axiosInstance.post(
      `${process.env.NEXT_PUBLIC_API_URL}/comment-attachment`,
      { commentId, link },
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating comment attachment:', error);
    throw error;
  }
};

export const deleteCommentAttachment = async (id: number): Promise<void> => {
  try {
    await axiosInstance.delete(`${process.env.NEXT_PUBLIC_API_URL}/comment-attachment/${id}`, {
      withCredentials: true,
    });
  } catch (error) {
    console.error('Error deleting comment attachment:', error);
    throw error;
  }
};

export const getCommentAttachmentsByComment = async (
  commentId: number
): Promise<CommentAttachment[]> => {
  try {
    const response = await axiosInstance.get(
      `${process.env.NEXT_PUBLIC_API_URL}/comment-attachment/comment/${commentId}`,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching comment attachments:', error);
    throw error;
  }
};

export const createTaskAttachment = async (
  taskId: number,
  link: string,
  fileName?: string
): Promise<TaskAttachment> => {
  try {
    const response = await axiosInstance.post(
      `${process.env.NEXT_PUBLIC_API_URL}/task-management/task/task-attachments`,
      { taskId, link, fileName },
      {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating task attachment:', error);
    throw error;
  }
};

export const deleteTaskAttachment = async (id: number): Promise<void> => {
  try {
    await axiosInstance.delete(
      `${process.env.NEXT_PUBLIC_API_URL}/task-management/task/task-attachments/${id}`,
      { withCredentials: true }
    );
  } catch (error) {
    console.error('Error deleting task attachment:', error);
    throw error;
  }
};

export const getTaskAttachmentsByTask = async (
  taskId: number
): Promise<TaskAttachment[]> => {
  try {
    const response = await axiosInstance.get(
      `${process.env.NEXT_PUBLIC_API_URL}/task-management/task/${taskId}/task-attachments`,
      {
        withCredentials: true,
      }
    );
    return response.data.taskAttachments || [];
  } catch (error) {
    console.error('Error fetching task attachments:', error);
    throw error;
  }
};

// Upload file to Azure Blob Storage
export const uploadFile = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post(
      `${process.env.NEXT_PUBLIC_API_URL}/comment/upload-attachment`,
      formData,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.url;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export const uploadTaskAttachment = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post(
      `${process.env.NEXT_PUBLIC_API_URL}/task-management/task/upload-attachment`,
      formData,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.url;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

