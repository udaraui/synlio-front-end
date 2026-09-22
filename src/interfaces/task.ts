import { Base } from '@/interfaces/common/base.model';
import { Resource } from '@/interfaces/resource';

export interface TaskLabel {
  id: number;
  name: string;
  projectGroupId: number;
}

export interface Task extends Base {
  code: string;
  name: string;
  description: string;
  progressPercentage: number;
  actualEffort: number;
  estimateEffort: number;
  startDate?: Date;
  dueDate?: Date;
  completionDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  companyId?: number;
  divisionId?: number;
  projectGroupId: number;
  projectGroup?: { id: number; name: string; prefix: string; description?: string; projectGroupStructureDtls?: any[] };
  hierarchyLevel?: number; // Sequence from projectGroupStructureDtl
  hierarchyLevelName?: string; // Name of the hierarchy level from projectGroupStructureDtl (from bulk relations)
  hierarchyLevelIcon?: string; // Icon name - saved in task record and also from bulk relations
  hierarchyLevelIconColor?: string; // Icon color - saved in task record and also from bulk relations
  parentTaskId?: number;
  parentTask?: Task;
  childTasks?: Task[];
  childTaskCount?: number; // Number of child tasks - from backend
  assignee: Resource;
  coAssignees?: Resource[];
  members?: Resource[];
  linkedTasks?: Task[];
  commentCount?: number;
  attachmentCount?: number;
  canHaveChildren?: boolean; // Whether task is at last hierarchy level
  special?: boolean;
  labels?: TaskLabel[];
}

export interface CreateTaskDto {
  name: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
  completionDate?: string;
  projectGroupId: number;
  companyId?: number;
  divisionId?: number;
  parentTaskId?: number;
  assigneeId: number;
  coAssigneeIds?: number[];
  memberIds?: number[];
  linkedTaskIds?: number[];
}

export interface UpdateTaskDto {
  name?: string;
  description?: string;
  progressPercentage?: number;
  startDate?: string | null;
  dueDate?: string | null;
  completionDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  projectGroupId?: number;
  companyId?: number;
  divisionId?: number;
  parentTaskId?: number;
  assigneeId?: number;
  coAssigneeIds?: number[];
  memberIds?: number[];
  linkedTaskIds?: number[];
  special?: boolean;
}
