// Shared types for the task card components

export interface TaskCardConfigData {
  taskSpace?: any;
  statuses: any[];
  severities: any[];
  hierarchyLevels: any[];
  resources: any[];
  labels?: any[];
  /**
   * Members of the root task in the current drill-down/inline-expand context.
   * null      → root-level view — no restriction, use space resources
   * []        → root task has NO members defined → block child-task assignee pickers
   * [...]     → restrict child-task assignee pickers to this member list only
   */
  rootTaskMembers?: any[] | null;
}

export type TaskUpdateHandler = (taskId: number, updates: any, _updatedData?: any) => Promise<void>;

