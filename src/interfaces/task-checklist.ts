import { Base } from '@/interfaces/common/base.model';

export interface TaskChecklist extends Base {
  name: string;
  isChecked: boolean;
  attachmentLink?: string;
  taskId: number;
  assigneeId?: number | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  assigneeProfilePicUrl?: string | null;
}

export interface CreateTaskChecklistDto {
  name: string;
  taskId: number;
  isChecked?: boolean;
  assigneeId?: number | null;
}

export interface UpdateTaskChecklistDto {
  name?: string;
  isChecked?: boolean;
  assigneeId?: number | null;
}
