"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  CalendarDays,
  X,
  Save,
  Info,
  ChevronDown,
  ChevronRight,
  Lock,
  Sparkles,
  Flag,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth.context";
import { Button } from "@/components/ui/button";
import { createTask, updateTask, getTaskById } from "@/services/task-management/task.service";
import {
  getTaskSpaceStatusConfig,
  getTaskSpaceSeverityConfig,
  getTaskSpaceResourcesConfig,
  getHierarchyLevelConfig,
  getTaskSpaceById,
} from "@/services/task-management/task-space.service";
import { Calendar } from "@/components/ui/calendar";
import {
  InlineEditableTaskName,
  InlineEditableTaskStatus,
  InlineEditableTaskSeverity,
  InlineEditableTaskAssignee,
  InlineEditableTaskCoAssignees,
  UserAvatar,
} from "@/app/(pages)/task-management/task/components/InlineEditableTaskComponents";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getHierarchyLevelIcon } from "@/enums/space-configure-icon.enum";

export interface TaskDraftData {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  taskSpaceId?: number;
  taskSpaceName?: string;
  taskSpacePrefix?: string;
  parentTaskId?: number | null;
  parentTaskName?: string | null;
  parentTaskCode?: string | null;
  parentTaskStatusId?: number | null;
  parentTaskStatusName?: string | null;
  parentTaskStatusColor?: string | null;
  parentTaskSeverityId?: number | null;
  parentTaskSeverityName?: string | null;
  parentTaskSeverityColor?: string | null;
  parentTaskAssigneeId?: number | null;
  parentTaskAssigneeName?: string | null;
  parentTaskAssigneeProfilePicUrl?: string | null;
  parentTaskStartDate?: string | null;
  parentTaskDueDate?: string | null;
  hierarchyLevelConfigId?: number;
  hierarchyLevelName?: string;
  hierarchyLevelIcon?: string;
  hierarchyLevelColor?: string;
  hierarchyLevelSequence?: number;
  statusId?: number;
  statusName?: string;
  statusColor?: string;
  severityId?: number;
  severityName?: string;
  severityColor?: string;
  assigneeId?: number | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  assigneeProfilePicUrl?: string | null;
  coAssignees?: any[];
  startDate?: string | null;
  dueDate?: string | null;
  originalStatusId?: number | null;
  originalStatusName?: string | null;
  originalStartDate?: string | null;
  originalDueDate?: string | null;
  estimateEffort?: number | null;
  current?: Record<string, any>;
  changes?: Record<string, any>;
}

export interface TaskDraftCardProps {
  payload: {
    action: string;
    entityType?: string;
    status: "READY" | "NEEDS_INPUT" | "REFUSED";
    summary?: string;
    draft?: TaskDraftData | TaskDraftData[];
    drafts?: TaskDraftData[];
    tasks?: TaskDraftData[];
    warnings?: string[];
    options?: any[];
    candidateTasks?: any[];
    needs?: Array<{
      field: string;
      label: string;
      options: Array<{ id: number; name: string; label?: string; code?: string; isCreateNew?: boolean }>;
    }>;
  };
  onUpdateDraft?: (updated: TaskDraftData) => void;
  onSelectOption?: (field: string, option: { id: number; name: string }) => void;
  onCancel?: () => void;
}

interface TaskDraftTreeNode {
  id: string;
  originalIndex: number;
  draft: TaskDraftData;
  depth: number;
  isExistingParent?: boolean;
  parentDraftIndex?: number;
  parentExistingTaskId?: number;
  parentNode?: TaskDraftTreeNode;
  children: TaskDraftTreeNode[];
}

// Renders task description as formatted HTML if tags exist, or styled text otherwise
function FormattedDescription({ content }: { content?: string }) {
  if (!content || !content.trim()) {
    return <p className="text-muted-foreground italic text-xs">No description provided</p>;
  }

  const hasHtml = /<[a-z][\s\S]*>/i.test(content);
  if (!hasHtml) {
    return <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-xs">{content}</p>;
  }

  return (
    <div
      className="text-xs text-muted-foreground prose prose-sm max-w-none dark:prose-invert [&_p]:my-1 [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_a]:text-primary [&_a]:underline"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

// Computes multi-level rollup for parent nodes based on child tasks (Dates & Status)
function computeRollupForChildren(
  children: TaskDraftTreeNode[],
  statuses: any[],
  currentParent: Partial<TaskDraftData>,
  isExistingParent: boolean = false
): {
  startDate: string | null;
  dueDate: string | null;
  statusId?: number;
  statusName?: string;
  statusColor?: string;
} {
  const starts: number[] = [];
  const ends: number[] = [];

  children.forEach((c) => {
    const s = c.draft.startDate;
    const d = c.draft.dueDate;
    if (s) {
      const t = new Date(s).getTime();
      if (!isNaN(t)) starts.push(t);
    }
    if (d) {
      const t = new Date(d).getTime();
      if (!isNaN(t)) ends.push(t);
    }
  });

  const rolledStartDate =
    starts.length > 0 ? format(new Date(Math.min(...starts)), "yyyy-MM-dd") : (currentParent.startDate ?? null);
  const rolledDueDate =
    ends.length > 0 ? format(new Date(Math.max(...ends)), "yyyy-MM-dd") : (currentParent.dueDate ?? null);

  let rolledStatusId = currentParent.statusId;
  let rolledStatusName = currentParent.statusName;
  let rolledStatusColor = currentParent.statusColor;

  if (statuses && statuses.length > 0) {
    const currentParentStatus = statuses.find((s) => s.id === currentParent.statusId);
    const parentBase = currentParentStatus?.base;

    const childrenWithBase = children
      .map((c) => {
        const sid = c.draft.statusId;
        const sObj = statuses.find((s) => s.id === sid);
        return sObj;
      })
      .filter((sObj): sObj is any => !!sObj && !!sObj.base);

    if (childrenWithBase.length > 0) {
      const hasProcessing = childrenWithBase.some((s) => s.base === "Processing");
      const hasFinished = childrenWithBase.some((s) => s.base === "Finished");
      const allFinished = childrenWithBase.every((s) => s.base === "Finished");
      const hasToStart = childrenWithBase.some((s) => s.base === "To Start");

      let targetBase: string | null = null;
      if (hasProcessing || (hasFinished && !allFinished)) {
        targetBase = "Processing";
      } else if (allFinished) {
        targetBase = "Finished";
      } else if (hasToStart) {
        // If it's an existing parent in DB and was already in Processing, keep its DB Processing state
        if (isExistingParent && parentBase === "Processing") {
          targetBase = "Processing";
        } else {
          targetBase = "To Start";
        }
      }

      if (targetBase) {
        const matched =
          statuses.find((s) => s.base === targetBase && s.isPrimaryBase) ||
          statuses.find((s) => s.base === targetBase);
        if (matched) {
          rolledStatusId = matched.id;
          rolledStatusName = matched.name;
          rolledStatusColor = matched.color;
        }
      }
    }
  }

  return {
    startDate: rolledStartDate,
    dueDate: rolledDueDate,
    statusId: rolledStatusId,
    statusName: rolledStatusName,
    statusColor: rolledStatusColor,
  };
}

function computeNodeRollup(node: TaskDraftTreeNode, statuses: any[]) {
  if (!node.children || node.children.length === 0) return;

  // Bottom-up recursion: compute child subtrees first
  node.children.forEach((child) => computeNodeRollup(child, statuses));

  const rollup = computeRollupForChildren(node.children, statuses, node.draft, node.isExistingParent);
  node.draft.startDate = rollup.startDate;
  node.draft.dueDate = rollup.dueDate;
  if (rollup.statusId) {
    node.draft.statusId = rollup.statusId;
    node.draft.statusName = rollup.statusName;
    node.draft.statusColor = rollup.statusColor;
  }
}

// Recursively resolves display code for task nodes:
// - Saved tasks show their real backend code (e.g. PTS-P8, PTS-P8-T4)
// - Unsaved drafts inherit their parent's effective code + "-?" (e.g. PTS-P8-?, PTS-P8-T4-?)
// - Root unsaved drafts show `${prefix}-?` (e.g. PTS-?)
// - The word "DRAFT" is never displayed.
export function getEffectiveNodeCode(
  node: TaskDraftTreeNode,
  createdTasksMap: Record<number, any>,
  fallbackPrefix: string = "TSK"
): string {
  // 1. Saved in this session
  const savedTask = node.originalIndex >= 0 ? createdTasksMap[node.originalIndex] : null;
  const savedCode = savedTask?.code || savedTask?.data?.code;
  if (savedCode) {
    return savedCode;
  }

  // 2. Existing parent from database
  if (node.isExistingParent && node.draft.code && !node.draft.code.includes("DRAFT")) {
    return node.draft.code;
  }

  // 3. Pre-existing valid code (e.g. in UPDATE mode)
  if (node.draft.code && !node.draft.code.includes("DRAFT") && node.draft.code !== "NEW") {
    return node.draft.code;
  }

  // 4. Unsaved draft with a parent node in tree
  if (node.parentNode) {
    const parentCode = getEffectiveNodeCode(node.parentNode, createdTasksMap, fallbackPrefix);
    return `${parentCode}-?`;
  }

  // 5. Unsaved draft with existing parent task code reference
  if (node.draft.parentTaskCode && !node.draft.parentTaskCode.includes("DRAFT")) {
    return `${node.draft.parentTaskCode}-?`;
  }

  // 6. Unsaved root/standalone draft
  const prefix = node.draft.taskSpacePrefix || fallbackPrefix || "TSK";
  return `${prefix}-?`;
}

// Builds hierarchical tree of drafts, supporting both nested drafted items and existing parents
function buildDraftTree(
  visibleDrafts: Array<{ draft: TaskDraftData; index: number }>,
  parentTaskDetailsMap: Record<number, any>,
  statuses: any[] = []
): TaskDraftTreeNode[] {
  const draftIds = new Set<number>();
  const draftNames = new Set<string>();

  visibleDrafts.forEach(({ draft }) => {
    if (draft.id) draftIds.add(draft.id);
    if (draft.name) draftNames.add(draft.name.trim().toLowerCase());
  });

  const existingParentMap = new Map<string, TaskDraftTreeNode>();
  const nodesByOriginalIndex = new Map<number, TaskDraftTreeNode>();

  // Create tree nodes for all drafts
  visibleDrafts.forEach(({ draft, index }) => {
    const node: TaskDraftTreeNode = {
      id: `draft-${index}-${draft.id || index}`,
      originalIndex: index,
      draft: {
        ...draft,
        originalStatusId: draft.statusId,
        originalStatusName: draft.statusName,
        originalStartDate: draft.startDate ?? null,
        originalDueDate: draft.dueDate ?? null,
      },
      depth: 0,
      isExistingParent: false,
      children: [],
    };
    nodesByOriginalIndex.set(index, node);
  });

  const roots: TaskDraftTreeNode[] = [];

  // Link children to parents
  visibleDrafts.forEach(({ draft, index }) => {
    const node = nodesByOriginalIndex.get(index)!;

    // 1. Parent is another draft in this batch by ID
    if (draft.parentTaskId && draftIds.has(draft.parentTaskId)) {
      const parentEntry = visibleDrafts.find((v) => v.draft.id === draft.parentTaskId);
      if (parentEntry && parentEntry.index !== index) {
        const parentNode = nodesByOriginalIndex.get(parentEntry.index);
        if (parentNode) {
          node.parentDraftIndex = parentNode.originalIndex;
          parentNode.children.push(node);
          return;
        }
      }
    }

    // 2. Parent is another draft in this batch by Name
    if (draft.parentTaskName && draftNames.has(draft.parentTaskName.trim().toLowerCase())) {
      const parentEntry = visibleDrafts.find(
        (v) => v.draft.name?.trim().toLowerCase() === draft.parentTaskName?.trim().toLowerCase()
      );
      if (parentEntry && parentEntry.index !== index) {
        const parentNode = nodesByOriginalIndex.get(parentEntry.index);
        if (parentNode) {
          node.parentDraftIndex = parentNode.originalIndex;
          parentNode.children.push(node);
          return;
        }
      }
    }

    // 3. Parent is an existing parent from the space (not in current draft batch)
    if (draft.parentTaskId || draft.parentTaskName) {
      const parentKey = String(draft.parentTaskId || draft.parentTaskName);
      if (!existingParentMap.has(parentKey)) {
        const pDetails = draft.parentTaskId ? parentTaskDetailsMap[draft.parentTaskId] : null;

        const originalStatusId = pDetails?.statusId ?? draft.parentTaskStatusId ?? pDetails?.status?.id;
        const originalStatusName = pDetails?.statusName ?? draft.parentTaskStatusName ?? pDetails?.status?.name;
        const originalStartDate = pDetails?.startDate ?? draft.parentTaskStartDate ?? null;
        const originalDueDate = pDetails?.dueDate ?? draft.parentTaskDueDate ?? null;

        const pNode: TaskDraftTreeNode = {
          id: `parent-${parentKey}`,
          originalIndex: -1,
          draft: {
            id: draft.parentTaskId || pDetails?.id,
            code: draft.parentTaskCode || pDetails?.code || "PARENT",
            name: draft.parentTaskName || pDetails?.name || "Parent Project",
            hierarchyLevelName: pDetails?.hierarchyLevelConfig?.name || pDetails?.hierarchyLevelName || "Project",
            hierarchyLevelIcon: pDetails?.hierarchyLevelConfig?.icon || pDetails?.hierarchyLevelIcon || "Folder",
            hierarchyLevelColor: pDetails?.hierarchyLevelConfig?.color || pDetails?.hierarchyLevelColor || "#3B82F6",
            taskSpaceId: draft.taskSpaceId || pDetails?.taskSpaceId,
            statusId: originalStatusId,
            statusName: originalStatusName,
            statusColor: pDetails?.statusColor ?? draft.parentTaskStatusColor ?? pDetails?.status?.color,
            originalStatusId,
            originalStatusName,
            originalStartDate,
            originalDueDate,
            severityId: pDetails?.severityId ?? draft.parentTaskSeverityId ?? pDetails?.severity?.id,
            severityName: pDetails?.severityName ?? draft.parentTaskSeverityName ?? pDetails?.severity?.name,
            severityColor: pDetails?.severityColor ?? draft.parentTaskSeverityColor ?? pDetails?.severity?.color,
            assigneeId: pDetails?.assigneeId ?? draft.parentTaskAssigneeId ?? pDetails?.assignee?.id,
            assigneeName: pDetails?.assigneeName ?? draft.parentTaskAssigneeName ?? (pDetails?.assignee ? `${pDetails.assignee.first_name || ""} ${pDetails.assignee.last_name || ""}`.trim() : null),
            assigneeProfilePicUrl: pDetails?.assigneeProfilePicUrl ?? draft.parentTaskAssigneeProfilePicUrl ?? pDetails?.assignee?.profile_pic,
            coAssignees: pDetails?.coAssignees || [],
            startDate: originalStartDate,
            dueDate: originalDueDate,
          },
          depth: 0,
          isExistingParent: true,
          children: [],
        };
        existingParentMap.set(parentKey, pNode);
        roots.push(pNode);
      }
      const pNode = existingParentMap.get(parentKey)!;
      node.parentExistingTaskId = Number(draft.parentTaskId || pNode.draft.id);
      pNode.children.push(node);
      return;
    }

    // 4. Sequence hierarchy inference within batch (e.g. Level 1 followed by Level 2)
    if (
      draft.hierarchyLevelSequence &&
      draft.hierarchyLevelSequence > 1 &&
      index > 0
    ) {
      for (let prevIdx = index - 1; prevIdx >= 0; prevIdx--) {
        const prevEntry = visibleDrafts[prevIdx];
        const prevSeq = prevEntry?.draft.hierarchyLevelSequence || 1;
        if (prevSeq < draft.hierarchyLevelSequence) {
          const prevNode = nodesByOriginalIndex.get(prevEntry.index);
          if (prevNode) {
            node.parentDraftIndex = prevNode.originalIndex;
            prevNode.children.push(node);
            return;
          }
        }
      }
    }

    // Otherwise, standalone root task
    roots.push(node);
  });

  // Assign depth levels recursively and wire parentNode links
  const assignDepth = (
    nodes: TaskDraftTreeNode[],
    currentDepth: number,
    parent?: TaskDraftTreeNode
  ) => {
    nodes.forEach((n) => {
      n.depth = currentDepth;
      if (parent) {
        n.parentNode = parent;
      }
      if (n.children.length > 0) {
        assignDepth(n.children, currentDepth + 1, n);
      }
    });
  };
  assignDepth(roots, 0);

  // Bottom-up rollup for dates and statuses
  roots.forEach((root) => computeNodeRollup(root, statuses));

  return roots;
}

// Traverses hierarchical draft tree pre-order (parents before children)
function getAllNodesInTreeOrder(roots: TaskDraftTreeNode[]): TaskDraftTreeNode[] {
  const result: TaskDraftTreeNode[] = [];
  const traverse = (nodes: TaskDraftTreeNode[]) => {
    nodes.forEach((n) => {
      result.push(n);
      if (n.children && n.children.length > 0) {
        traverse(n.children);
      }
    });
  };
  traverse(roots);
  return result;
}

export function TaskDraftCard({
  payload,
  onUpdateDraft,
  onSelectOption,
  onCancel,
}: TaskDraftCardProps) {
  const { user } = useAuth();
  const isUpdateMode = payload.action === "UPDATE_TASK";

  // Extract list of drafts
  const rawDraftsList: TaskDraftData[] = useMemo(() => {
    if (payload.drafts && Array.isArray(payload.drafts) && payload.drafts.length > 0) {
      return payload.drafts;
    }
    if (payload.tasks && Array.isArray(payload.tasks) && payload.tasks.length > 0) {
      return payload.tasks;
    }
    if (Array.isArray(payload.draft)) {
      return payload.draft;
    }
    if (payload.draft && typeof payload.draft === "object") {
      return [payload.draft];
    }
    return [];
  }, [payload.draft, payload.drafts, payload.tasks]);

  const [drafts, setDrafts] = useState<TaskDraftData[]>(rawDraftsList);
  const [dismissedIndices, setDismissedIndices] = useState<Set<number>>(new Set());
  const [isDismissed, setIsDismissed] = useState(false);
  const [createdTasksMap, setCreatedTasksMap] = useState<Record<number, any>>({});
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [submittingIndex, setSubmittingIndex] = useState<number | null>(null);
  const [parentTaskDetailsMap, setParentTaskDetailsMap] = useState<Record<number, any>>({});
  const [selectedOptionId, setSelectedOptionId] = useState<number | string | null>(null);

  // Load configs for active task space
  const activeSpaceId = useMemo(() => {
    return (
      drafts.find((d) => d.taskSpaceId)?.taskSpaceId ||
      (!Array.isArray(payload.draft) ? payload.draft?.taskSpaceId : payload.draft?.[0]?.taskSpaceId) ||
      (payload.drafts && payload.drafts[0]?.taskSpaceId) ||
      (payload.tasks && payload.tasks[0]?.taskSpaceId) ||
      null
    );
  }, [drafts, payload]);

  const [statuses, setStatuses] = useState<any[]>([]);
  const [severities, setSeverities] = useState<any[]>([]);
  const [spaceResources, setSpaceResources] = useState<any[]>([]);
  const [hierarchyConfigs, setHierarchyConfigs] = useState<any[]>([]);
  const [loadedSpacePrefix, setLoadedSpacePrefix] = useState<string>("");

  const activeSpacePrefix = useMemo(() => {
    return (
      drafts.find((d) => d.taskSpacePrefix)?.taskSpacePrefix ||
      (!Array.isArray(payload.draft) ? payload.draft?.taskSpacePrefix : payload.draft?.[0]?.taskSpacePrefix) ||
      (payload.drafts && payload.drafts[0]?.taskSpacePrefix) ||
      (payload.tasks && payload.tasks[0]?.taskSpacePrefix) ||
      loadedSpacePrefix ||
      "TSK"
    );
  }, [drafts, payload, loadedSpacePrefix]);

  const sortedHierarchyConfigs = useMemo(() => {
    return [...hierarchyConfigs].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }, [hierarchyConfigs]);

  useEffect(() => {
    setDrafts(rawDraftsList);
  }, [rawDraftsList]);

  // Fetch full details of any referenced existing parent tasks
  useEffect(() => {
    const missingParentIds = new Set<number>();
    drafts.forEach((d) => {
      if (d.parentTaskId && d.parentTaskId > 0 && !parentTaskDetailsMap[d.parentTaskId]) {
        missingParentIds.add(d.parentTaskId);
      }
    });

    if (missingParentIds.size === 0) return;

    missingParentIds.forEach(async (pId) => {
      try {
        const pTask = await getTaskById(pId);
        if (pTask) {
          setParentTaskDetailsMap((prev) => ({ ...prev, [pId]: pTask }));
        }
      } catch (err) {
        console.warn("Could not fetch parent task details for", pId, err);
      }
    });
  }, [drafts, parentTaskDetailsMap]);

  useEffect(() => {
    if (!activeSpaceId) return;
    let isMounted = true;

    Promise.all([
      getTaskSpaceStatusConfig(activeSpaceId).catch((err) => {
        console.error("Failed to load task space statuses:", err);
        return null;
      }),
      getTaskSpaceSeverityConfig(activeSpaceId).catch((err) => {
        console.error("Failed to load task space severities:", err);
        return null;
      }),
      getTaskSpaceResourcesConfig(activeSpaceId).catch((err) => {
        console.error("Failed to load task space resources:", err);
        return null;
      }),
      getHierarchyLevelConfig(activeSpaceId).catch((err) => {
        console.error("Failed to load task space hierarchy configs:", err);
        return null;
      }),
      getTaskSpaceById(activeSpaceId).catch((err) => {
        console.error("Failed to load task space details:", err);
        return null;
      }),
    ]).then(([statusRes, sevRes, resRes, hRes, spaceRes]) => {
      if (!isMounted) return;

      const statusList =
        statusRes?.statuses ??
        statusRes?.data?.statuses ??
        (Array.isArray(statusRes?.data) ? statusRes.data : Array.isArray(statusRes) ? statusRes : []);

      const sevList =
        sevRes?.severities ??
        sevRes?.data?.severities ??
        (Array.isArray(sevRes?.data) ? sevRes.data : Array.isArray(sevRes) ? sevRes : []);

      const resList =
        resRes?.resources ??
        resRes?.data?.resources ??
        (Array.isArray(resRes?.data) ? resRes.data : Array.isArray(resRes) ? resRes : []);

      const hList = Array.isArray(hRes) ? hRes : ((hRes as any)?.data || []);

      setStatuses(statusList);
      setSeverities(sevList);
      setSpaceResources(resList);
      setHierarchyConfigs(hList);

      if (spaceRes) {
        const p = spaceRes?.prefix || spaceRes?.data?.prefix || "";
        if (p) setLoadedSpacePrefix(p);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeSpaceId]);

  const visibleDrafts = useMemo(() => {
    return drafts
      .map((draft, index) => ({ draft, index }))
      .filter(({ index }) => !dismissedIndices.has(index));
  }, [drafts, dismissedIndices]);

  const uncreatedCount = useMemo(() => {
    return visibleDrafts.filter(({ index }) => !createdTasksMap[index]).length;
  }, [visibleDrafts, createdTasksMap]);

  // Build tree for hierarchical expand/collapse and rollup calculations
  const treeRoots = useMemo(() => {
    return buildDraftTree(visibleDrafts, parentTaskDetailsMap, statuses);
  }, [visibleDrafts, parentTaskDetailsMap, statuses]);

  // Flatten all nodes in tree order (parents before children, pre-order)
  const allTreeNodes = useMemo(() => {
    return getAllNodesInTreeOrder(treeRoots);
  }, [treeRoots]);

  const nodeByDraftIndex = useMemo(() => {
    const map = new Map<number, TaskDraftTreeNode>();
    allTreeNodes.forEach((n) => {
      if (n.originalIndex >= 0) {
        map.set(n.originalIndex, n);
      }
    });
    return map;
  }, [allTreeNodes]);

  // Track if saving child tasks impacts any parent nodes (dates or status rolled up)
  const impactedParents = useMemo(() => {
    const list: Array<{
      id: string;
      code?: string;
      name: string;
      changes: string[];
    }> = [];

    const traverse = (nodes: TaskDraftTreeNode[]) => {
      nodes.forEach((n) => {
        if (n.children.length > 0 || n.isExistingParent) {
          const changes: string[] = [];
          if (
            n.draft.originalStatusName &&
            n.draft.statusName &&
            n.draft.statusName !== n.draft.originalStatusName
          ) {
            changes.push(`Status: ${n.draft.originalStatusName} → ${n.draft.statusName}`);
          }
          if (
            n.draft.startDate &&
            n.draft.startDate !== n.draft.originalStartDate
          ) {
            const oldStr = n.draft.originalStartDate && !isNaN(new Date(n.draft.originalStartDate).getTime())
              ? format(new Date(n.draft.originalStartDate), "LLL dd")
              : "None";
            changes.push(`Start date: ${oldStr} → ${format(new Date(n.draft.startDate), "LLL dd")}`);
          }
          if (
            n.draft.dueDate &&
            n.draft.dueDate !== n.draft.originalDueDate
          ) {
            const oldStr = n.draft.originalDueDate && !isNaN(new Date(n.draft.originalDueDate).getTime())
              ? format(new Date(n.draft.originalDueDate), "LLL dd")
              : "None";
            changes.push(`Due date: ${oldStr} → ${format(new Date(n.draft.dueDate), "LLL dd")}`);
          }

          if (changes.length > 0) {
            list.push({
              id: n.id,
              code: getEffectiveNodeCode(n, createdTasksMap, activeSpacePrefix),
              name: n.draft.name || "Parent",
              changes,
            });
          }
        }
        if (n.children.length > 0) {
          traverse(n.children);
        }
      });
    };
    traverse(treeRoots);
    return list;
  }, [treeRoots, createdTasksMap, activeSpacePrefix]);

  // Set of node IDs that are expanded (all nodes with children are expanded by default)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const parentNodeIds = new Set<string>();
    const collect = (nodes: TaskDraftTreeNode[]) => {
      nodes.forEach((n) => {
        if (n.children.length > 0) {
          parentNodeIds.add(n.id);
          collect(n.children);
        }
      });
    };
    collect(treeRoots);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      parentNodeIds.forEach((id) => next.add(id));
      return next;
    });
  }, [treeRoots]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Flattened visible rows based on expand state
  const flattenedRows = useMemo(() => {
    const rows: TaskDraftTreeNode[] = [];
    const traverse = (nodes: TaskDraftTreeNode[]) => {
      nodes.forEach((n) => {
        rows.push(n);
        if (n.children.length > 0 && expandedIds.has(n.id)) {
          traverse(n.children);
        }
      });
    };
    traverse(treeRoots);
    return rows;
  }, [treeRoots, expandedIds]);

  const handleFieldChange = (
    index: number,
    fieldOrUpdates: string | Record<string, any>,
    value?: any
  ) => {
    if (index < 0) return;
    setDrafts((prev) => {
      const updated = [...prev];
      const updates =
        typeof fieldOrUpdates === "string"
          ? { [fieldOrUpdates]: value }
          : fieldOrUpdates;

      if (isUpdateMode) {
        updated[index] = {
          ...updated[index],
          changes: {
            ...updated[index]?.changes,
            ...updates,
          },
        };
      } else {
        updated[index] = {
          ...updated[index],
          ...updates,
        };
      }

      // Propagate rollup to any drafted parent tasks if dates or status change
      const hasDateOrStatusChange = Object.keys(updates).some(
        (k) => k === "startDate" || k === "dueDate" || k === "statusId" || k === "statusName"
      );

      if (hasDateOrStatusChange) {
        let currIndex = index;
        while (currIndex >= 0) {
          const currentTarget = updated[currIndex];
          const currNode = nodeByDraftIndex.get(currIndex);

          // 1. Check if parent is another drafted task
          let parentIndex = currNode?.parentDraftIndex ?? -1;
          if (parentIndex < 0) {
            const parentId = currentTarget?.parentTaskId;
            const parentName = currentTarget?.parentTaskName?.trim().toLowerCase();
            if (parentId) {
              parentIndex = updated.findIndex((d, i) => i !== currIndex && d.id === parentId);
            }
            if (parentIndex < 0 && parentName) {
              parentIndex = updated.findIndex(
                (d, i) => i !== currIndex && (d.name || "").trim().toLowerCase() === parentName
              );
            }
            if (parentIndex < 0 && currentTarget.hierarchyLevelSequence && currentTarget.hierarchyLevelSequence > 1) {
              for (let p = currIndex - 1; p >= 0; p--) {
                if ((updated[p]?.hierarchyLevelSequence || 1) < currentTarget.hierarchyLevelSequence) {
                  parentIndex = p;
                  break;
                }
              }
            }
          }

          if (parentIndex >= 0) {
            const siblingNodes = allTreeNodes.filter((n) => n.parentDraftIndex === parentIndex);
            let siblingChildren = siblingNodes.map((n) => updated[n.originalIndex]).filter(Boolean);

            if (siblingChildren.length === 0) {
              const pSeq = updated[parentIndex]?.hierarchyLevelSequence || 1;
              const pId = updated[parentIndex]?.id;
              const pName = updated[parentIndex]?.name?.trim().toLowerCase();

              siblingChildren = updated.filter(
                (d, i) =>
                  i !== parentIndex &&
                  ((pId && d.parentTaskId === pId) ||
                    (pName && d.parentTaskName?.trim().toLowerCase() === pName))
              );

              if (siblingChildren.length === 0) {
                for (let i = parentIndex + 1; i < updated.length; i++) {
                  const seq = updated[i]?.hierarchyLevelSequence || 1;
                  if (seq <= pSeq) break;
                  if (seq === pSeq + 1) siblingChildren.push(updated[i]);
                }
              }
            }

            const childNodes: TaskDraftTreeNode[] = siblingChildren.map((sc, i) => ({
              id: `child-${i}`,
              originalIndex: i,
              draft: sc,
              depth: 1,
              children: [],
            }));

            const rollup = computeRollupForChildren(childNodes, statuses, updated[parentIndex], false);
            updated[parentIndex] = {
              ...updated[parentIndex],
              startDate: rollup.startDate,
              dueDate: rollup.dueDate,
              statusId: rollup.statusId ?? updated[parentIndex].statusId,
              statusName: rollup.statusName ?? updated[parentIndex].statusName,
              statusColor: rollup.statusColor ?? updated[parentIndex].statusColor,
            };

            currIndex = parentIndex; // walk one level higher
          } else {
            // 2. Also update parentTaskDetailsMap if parent is an existing task
            const existingPId = currNode?.parentExistingTaskId || currentTarget?.parentTaskId;
            if (existingPId && parentTaskDetailsMap[existingPId]) {
              const siblingNodes = allTreeNodes.filter(
                (n) => n.parentExistingTaskId === existingPId || n.draft.parentTaskId === existingPId
              );
              let siblingChildren = siblingNodes.map((n) => updated[n.originalIndex]).filter(Boolean);
              if (siblingChildren.length === 0) {
                siblingChildren = updated.filter((d) => d.parentTaskId === existingPId);
              }
              const childNodes: TaskDraftTreeNode[] = siblingChildren.map((sc, i) => ({
                id: `child-${i}`,
                originalIndex: i,
                draft: sc,
                depth: 1,
                children: [],
              }));
              const rollup = computeRollupForChildren(
                childNodes,
                statuses,
                parentTaskDetailsMap[existingPId],
                true
              );
              setParentTaskDetailsMap((pMap) => ({
                ...pMap,
                [existingPId]: {
                  ...pMap[existingPId],
                  startDate: rollup.startDate,
                  dueDate: rollup.dueDate,
                  statusId: rollup.statusId ?? pMap[existingPId].statusId,
                  statusName: rollup.statusName ?? pMap[existingPId].statusName,
                  statusColor: rollup.statusColor ?? pMap[existingPId].statusColor,
                },
              }));
            }
            break;
          }
        }
      }

      onUpdateDraft?.(updated[index]);
      return updated;
    });
  };

  const handleDismissOne = (index: number) => {
    setDismissedIndices((prev) => {
      const next = new Set(prev);
      next.add(index);
      // Also dismiss any child drafts that depend on this parent
      const findDescendants = (pIdx: number) => {
        allTreeNodes.forEach((n) => {
          if (n.parentDraftIndex === pIdx && n.originalIndex >= 0) {
            next.add(n.originalIndex);
            findDescendants(n.originalIndex);
          }
        });
      };
      findDescendants(index);

      // Check if all drafts are now dismissed or already saved
      const allDraftsDismissed = drafts.every((_, i) => next.has(i));
      const remainingUncreated = drafts.filter(
        (_, i) => !createdTasksMap[i] && !next.has(i)
      ).length;

      if (allDraftsDismissed || remainingUncreated === 0) {
        setIsDismissed(true);
        setTimeout(() => {
          onCancel?.();
        }, 0);
      }

      return next;
    });
  };

  const handleDismissAll = () => {
    setIsDismissed(true);
    const all = new Set<number>(drafts.map((_, i) => i));
    setDismissedIndices(all);
    setTimeout(() => {
      onCancel?.();
    }, 0);
  };

  const handleCreateOrUpdateOne = async (index: number) => {
    const d = drafts[index];
    if (!d || createdTasksMap[index]) return;

    const node = nodeByDraftIndex.get(index);

    // Guard: Child draft cannot be created if its parent draft is not created yet
    if (!isUpdateMode && node && node.parentDraftIndex !== undefined && node.parentDraftIndex >= 0) {
      const parentCreated = createdTasksMap[node.parentDraftIndex];
      if (!parentCreated) {
        const parentName = drafts[node.parentDraftIndex]?.name || "parent";
        toast.error(`Please save the parent task "${parentName}" first, or use "Create All".`);
        return;
      }
    }

    setSubmittingIndex(index);

    try {
      if (isUpdateMode) {
        const taskId = d.id;
        if (!taskId) return;
        const updateDto = { ...(d.changes || {}) };
        const res = await updateTask(taskId, updateDto);
        setCreatedTasksMap((prev) => ({ ...prev, [index]: res }));
        toast.success(`Task ${d.code || ""} updated successfully!`);
        window.dispatchEvent(
          new CustomEvent("synlio:task-updated", {
            detail: { taskId, updatedFields: updateDto },
          })
        );
      } else {
        // Resolve parentTaskId dynamically to maintain family hierarchy:
        let resolvedParentId: number | null = null;
        if (node && node.parentDraftIndex !== undefined && node.parentDraftIndex >= 0) {
          const parentCreated = createdTasksMap[node.parentDraftIndex];
          resolvedParentId = parentCreated?.id ?? parentCreated?.data?.id ?? null;
        } else if (node && node.parentExistingTaskId) {
          resolvedParentId = node.parentExistingTaskId;
        } else {
          resolvedParentId = d.parentTaskId || null;
        }

        const createDto: any = {
          name: d.name || "Untitled Task",
          description: d.description || "",
          taskSpaceId: d.taskSpaceId,
          parentTaskId: resolvedParentId,
          statusId: d.statusId || (statuses[0]?.id ?? null),
          severityId: d.severityId || (severities[0]?.id ?? null),
          assigneeId: d.assigneeId || null,
          coAssigneeIds: d.coAssignees?.map((c: any) => c.id) || [],
          startDate: d.startDate || null,
          dueDate: d.dueDate || null,
          estimateEffort: d.estimateEffort || null,
          hierarchyLevelConfigId: d.hierarchyLevelConfigId || null,
        };
        const res = await createTask(createDto);
        const created = Array.isArray(res) ? res[0] : (res?.data || res);
        const createdCode = created?.code || created?.data?.code || created?.task?.code;
        const createdId = created?.id || created?.data?.id || created?.task?.id;
        const normalizedCreated = { ...created, id: createdId, code: createdCode };
        setCreatedTasksMap((prev) => ({ ...prev, [index]: normalizedCreated }));
        if (createdCode) {
          setDrafts((prev) => {
            const updated = [...prev];
            if (updated[index]) {
              updated[index] = {
                ...updated[index],
                id: createdId,
                code: createdCode,
              };
            }
            return updated;
          });
        }
        toast.success(`Task "${d.name || "Untitled"}" created successfully!`);
        window.dispatchEvent(
          new CustomEvent("synlio:task-created", {
            detail: { task: created },
          })
        );
      }
    } catch (err: any) {
      console.error("Task submission error:", err);
      toast.error(err?.message || "Failed to save task");
    } finally {
      setSubmittingIndex(null);
    }
  };

  const handleCreateOrUpdateAll = async () => {
    setIsSubmittingAll(true);
    let successCount = 0;

    // Filter uncreated nodes in hierarchical top-down tree order (parents before children)
    const nodesToCreate = allTreeNodes.filter(
      (n) => !n.isExistingParent && n.originalIndex >= 0 && !createdTasksMap[n.originalIndex]
    );

    const localCreatedMap: Record<number, any> = { ...createdTasksMap };

    for (const node of nodesToCreate) {
      const index = node.originalIndex;
      const d = drafts[index] || node.draft;

      try {
        if (isUpdateMode) {
          const taskId = d.id;
          if (!taskId) continue;
          const updateDto = { ...(d.changes || {}) };
          const res = await updateTask(taskId, updateDto);
          localCreatedMap[index] = res;
          setCreatedTasksMap((prev) => ({ ...prev, [index]: res }));
          successCount++;
        } else {
          // Resolve parentTaskId dynamically to maintain the family hierarchy:
          let resolvedParentId: number | null = null;
          if (node.parentDraftIndex !== undefined && node.parentDraftIndex >= 0) {
            const parentCreated = localCreatedMap[node.parentDraftIndex];
            if (!parentCreated) {
              console.warn(`Skipping draft "${d.name}" because its parent was not created.`);
              continue;
            }
            resolvedParentId = parentCreated?.id ?? parentCreated?.data?.id ?? null;
          } else if (node.parentExistingTaskId) {
            resolvedParentId = node.parentExistingTaskId;
          } else {
            resolvedParentId = d.parentTaskId || null;
          }

          const createDto: any = {
            name: d.name || "Untitled Task",
            description: d.description || "",
            taskSpaceId: d.taskSpaceId,
            parentTaskId: resolvedParentId,
            statusId: d.statusId || (statuses[0]?.id ?? null),
            severityId: d.severityId || (severities[0]?.id ?? null),
            assigneeId: d.assigneeId || null,
            coAssigneeIds: d.coAssignees?.map((c: any) => c.id) || [],
            startDate: d.startDate || null,
            dueDate: d.dueDate || null,
            estimateEffort: d.estimateEffort || null,
            hierarchyLevelConfigId: d.hierarchyLevelConfigId || null,
          };

          const res = await createTask(createDto);
          const created = Array.isArray(res) ? res[0] : (res?.data || res);
          const createdCode = created?.code || created?.data?.code || created?.task?.code;
          const createdId = created?.id || created?.data?.id || created?.task?.id;
          const normalizedCreated = { ...created, id: createdId, code: createdCode };
          localCreatedMap[index] = normalizedCreated;
          setCreatedTasksMap((prev) => ({ ...prev, [index]: normalizedCreated }));
          successCount++;
        }
      } catch (err) {
        console.error("Batch save error on item", index, err);
      }
    }

    setIsSubmittingAll(false);
    if (Object.keys(localCreatedMap).length > 0) {
      setDrafts((prev) => {
        const updated = [...prev];
        Object.entries(localCreatedMap).forEach(([idxStr, task]) => {
          const idx = Number(idxStr);
          const cCode = task?.code || task?.data?.code;
          const cId = task?.id || task?.data?.id;
          if (updated[idx] && cCode) {
            updated[idx] = {
              ...updated[idx],
              id: cId,
              code: cCode,
            };
          }
        });
        return updated;
      });
    }
    if (successCount > 0) {
      const actionLabel = isUpdateMode ? "updated" : "created";
      toast.success(`Successfully ${actionLabel} ${successCount} task(s)!`);
      const eventName = isUpdateMode ? "synlio:task-updated" : "synlio:task-created";
      window.dispatchEvent(new CustomEvent(eventName, { detail: { count: successCount } }));
    }
  };

  if (isDismissed) {
    return null;
  }

  // Render Disambiguation Options (e.g. Needs Space or Parent Project)
  // Exactly matching Ticket Panel space selection and project selection
  if (payload.status === "NEEDS_INPUT" && payload.needs && payload.needs.length > 0) {
    const need = payload.needs[0];
    return (
      <div className="my-2.5 flex flex-wrap items-center gap-1.5 animate-in fade-in-50">
        {need.options.map((opt: any, idx: number) => {
          const optId = opt.id ?? idx;
          const isSelected = selectedOptionId === optId;
          const isCreateNew = opt.id === -1 || opt.isCreateNew || String(opt.name || "").toLowerCase().includes("create as new");
          const cleanLabel = String(opt.label || opt.name || "").replace(/^[✨\s]+/, "");

          return (
            <button
              key={optId}
              type="button"
              disabled={selectedOptionId !== null}
              onClick={() => {
                setIsDismissed(true);
                setSelectedOptionId(optId);
                onSelectOption?.(need.field, opt);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer select-none ${
                isCreateNew
                  ? "bg-transparent text-primary border border-dashed border-primary hover:border-primary hover:bg-primary/5 active:scale-95"
                  : "bg-primary text-white dark:text-black hover:opacity-90 active:scale-95 shadow-xs"
              } ${
                isSelected ? "opacity-85 ring-2 ring-primary ring-offset-1" : ""
              } ${
                selectedOptionId !== null && !isSelected
                  ? "opacity-30 cursor-not-allowed"
                  : ""
              }`}
            >
              {isSelected && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
              <span>{cleanLabel}</span>
            </button>
          );
        })}

        <button
          type="button"
          disabled={selectedOptionId !== null}
          onClick={handleDismissAll}
          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-transparent text-slate-700 dark:text-slate-300 border border-dashed border-slate-700 dark:border-slate-300 hover:text-slate-900 hover:dark:text-white hover:border-slate-900 hover:dark:border-white hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-all duration-150 cursor-pointer select-none ${
            selectedOptionId !== null ? "opacity-30 cursor-not-allowed" : ""
          }`}
        >
          <span>Dismiss</span>
        </button>
      </div>
    );
  }

  // Refusal View (Hierarchy Immutability Guard)
  if (payload.status === "REFUSED") {
    return (
      <div className="mt-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Action Refused</span>
        </div>
        <p className="mt-1 text-xs opacity-90">{payload.summary || "Hierarchy levels cannot be modified post-creation."}</p>
      </div>
    );
  }

  if (visibleDrafts.length === 0) return null;

  return (
    <div className="@container w-full my-3 space-y-2">
      {/* Task Table View (Exact Parity with TaskTableView - Labels removed, Icon-only Action) */}
      <div className="border border-border rounded-lg overflow-x-auto bg-card [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-500 [scrollbar-width:thin]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-border">
            <tr className="text-muted-foreground font-semibold">
              <th className="py-2.5 px-3 min-w-[320px] sticky left-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border shadow-[1px_0_0_0_hsl(var(--border))]">TITLE</th>
              <th className="py-2.5 px-3 min-w-[125px]">STATUS</th>
              <th className="py-2.5 px-3 min-w-[110px]">SEVERITY</th>
              <th className="py-2.5 px-3 min-w-[100px]">ASSIGNEE</th>
              <th className="py-2.5 px-3 min-w-[90px]">CO-ASSIGNEES</th>
              <th className="py-2.5 px-3 min-w-[110px]">START DATE</th>
              <th className="py-2.5 px-3 min-w-[110px]">END DATE</th>
              <th className="py-2.5 px-3 text-right min-w-[80px] sticky right-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-border shadow-[-1px_0_0_0_hsl(var(--border))]">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="">
            {flattenedRows.map((node, rowIndex) => {
              const isLastRow = rowIndex === flattenedRows.length - 1;
              const isSaved = node.originalIndex >= 0 && !!createdTasksMap[node.originalIndex];
              const effectiveCode = getEffectiveNodeCode(node, createdTasksMap, activeSpacePrefix);
              const isItemSubmitting = submittingIndex === node.originalIndex;
              const changes = node.draft.changes || {};

              const stickyBg = node.isExistingParent
                ? "bg-gray-100 dark:bg-zinc-800"
                : "bg-card group-hover:bg-gray-50 dark:group-hover:bg-zinc-900";

              const isParentDraftSaved =
                node.parentDraftIndex === undefined ||
                node.parentDraftIndex < 0 ||
                !!createdTasksMap[node.parentDraftIndex];

              const canSaveIndividual = !isUpdateMode ? isParentDraftSaved : true;

              const parentDraftName =
                node.parentDraftIndex !== undefined && node.parentDraftIndex >= 0
                  ? drafts[node.parentDraftIndex]?.name || "parent"
                  : "parent";

              // Hierarchy Level formatting: visual tree depth determines hierarchy level
              const matchingHl =
                (sortedHierarchyConfigs.length > node.depth ? sortedHierarchyConfigs[node.depth] : null) ||
                hierarchyConfigs.find((h) => h.id === node.draft.hierarchyLevelConfigId) ||
                hierarchyConfigs.find((h) => h.sequence === node.draft.hierarchyLevelSequence);

              const effectiveHlIcon = matchingHl?.icon || node.draft.hierarchyLevelIcon || "Folder";
              const effectiveHlColor = matchingHl?.color || node.draft.hierarchyLevelColor || "#3B82F6";
              const effectiveHlName = matchingHl?.name || node.draft.hierarchyLevelName || "Task";
              const HierarchyIcon = getHierarchyLevelIcon(effectiveHlIcon);
              const hlColor = effectiveHlColor;

              const hasChildren = node.children.length > 0;
              const isExpanded = expandedIds.has(node.id);

              // Check if saving child tasks impacts this node
              const isStatusImpacted =
                !!node.draft.originalStatusName &&
                !!node.draft.statusName &&
                node.draft.statusName !== node.draft.originalStatusName;

              const isStartDateImpacted =
                !!node.draft.startDate &&
                node.draft.startDate !== node.draft.originalStartDate;

              const isDueDateImpacted =
                !!node.draft.dueDate &&
                node.draft.dueDate !== node.draft.originalDueDate;

              const isParentImpacted = isStatusImpacted || isStartDateImpacted || isDueDateImpacted;

              const parentImpactChanges: string[] = [];
              if (isStatusImpacted) parentImpactChanges.push(`Status: ${node.draft.originalStatusName} → ${node.draft.statusName}`);
              if (isStartDateImpacted) parentImpactChanges.push(`Start date rolled up: ${node.draft.startDate ? format(new Date(node.draft.startDate), "LLL dd") : "None"}`);
              if (isDueDateImpacted) parentImpactChanges.push(`Due date rolled up: ${node.draft.dueDate ? format(new Date(node.draft.dueDate), "LLL dd") : "None"}`);

              // Status resolution
              const resolvedStatus =
                statuses.find((s) => s.id === (isUpdateMode ? changes.statusId ?? node.draft.statusId : node.draft.statusId)) ||
                (node.draft.statusName ? { id: node.draft.statusId, name: node.draft.statusName, color: node.draft.statusColor } : null);

              // Severity resolution
              const resolvedSeverity =
                severities.find((s) => s.id === (isUpdateMode ? changes.severityId ?? node.draft.severityId : node.draft.severityId)) ||
                (node.draft.severityName ? { id: node.draft.severityId, name: node.draft.severityName, color: node.draft.severityColor } : null);

              // Assignee resolution
              const resolvedAssignee =
                spaceResources.find((r) => r.id === (isUpdateMode ? changes.assigneeId ?? node.draft.assigneeId : node.draft.assigneeId)) ||
                (node.draft.assigneeId ? {
                  id: node.draft.assigneeId,
                  first_name: node.draft.assigneeName?.split(" ")[0] || "",
                  last_name: node.draft.assigneeName?.split(" ").slice(1).join(" ") || "",
                  profile_pic: node.draft.assigneeProfilePicUrl,
                } : null);

              return (
                <tr
                  key={node.id}
                  className={`transition-colors group min-h-[44px] ${
                    !isLastRow ? "border-b border-gray-200 dark:border-gray-700" : ""
                  } ${
                    node.isExistingParent
                      ? "bg-muted/30 opacity-75 cursor-not-allowed select-none"
                      : "hover:bg-gray-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  {/* 1. TITLE Column (with expand/collapse and hierarchy indentation) */}
                  <td className={`pl-1 pr-2 py-2 align-middle sticky left-0 z-10 ${stickyBg} transition-colors shadow-[1px_0_0_0_hsl(var(--border))]`}>
                    <div
                      className="flex items-center gap-1 min-w-0"
                      style={{ paddingLeft: `${node.depth * 20}px` }}
                    >
                      {/* Expand / Collapse Chevron */}
                      {hasChildren ? (
                        <button
                          type="button"
                          className="flex items-center justify-center h-5 w-5 flex-shrink-0 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(node.id);
                          }}
                          title={isExpanded ? "Collapse child tasks" : "Expand child tasks"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                          )}
                        </button>
                      ) : (
                        <span className="flex-shrink-0 w-5 h-5" />
                      )}

                      {/* Hierarchy Icon (STRICTLY READ-ONLY) */}
                      <TooltipProvider>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="flex items-center rounded px-0.5 py-0.5 flex-shrink-0 cursor-default"
                              title={effectiveHlName}
                            >
                              <HierarchyIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: hlColor }} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">
                              Level: <strong>{effectiveHlName}</strong> (Hierarchy is permanent)
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Code */}
                      <span
                        className={`text-xs font-semibold tracking-wide flex-shrink-0 cursor-default ${
                          node.isExistingParent ? "text-muted-foreground" : "text-blue-500 dark:text-blue-400"
                        }`}
                        title={`Task ${effectiveCode}`}
                      >
                        {effectiveCode}
                      </span>

                      {/* Title */}
                      <div className="flex-1 min-w-0 mx-1 ml-2">
                        {node.isExistingParent ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-semibold text-muted-foreground truncate block">
                              {node.draft.name}
                            </span>
                          </div>
                        ) : isSaved ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-semibold text-foreground truncate block select-none">
                              {node.draft.name}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <InlineEditableTaskName
                              name={node.draft.name || "Untitled Task"}
                              onUpdate={async (newName) => {
                                handleFieldChange(node.originalIndex, "name", newName);
                              }}
                              className="text-sm text-gray-900 dark:text-gray-100 truncate block w-full"
                            />
                          </div>
                        )}
                      </div>

                      {/* Description Info HoverCard */}
                      {node.draft.description && (
                        <HoverCard openDelay={150}>
                          <HoverCardTrigger asChild>
                            <button
                              type="button"
                              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5 cursor-pointer ml-1"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                          </HoverCardTrigger>
                          <HoverCardContent side="right" align="start" className="w-80 p-3 text-xs">
                            <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1 border-b pb-1">
                              {node.draft.name}
                            </div>
                            <FormattedDescription content={node.draft.description} />
                          </HoverCardContent>
                        </HoverCard>
                      )}
                    </div>
                  </td>

                  {/* 2. STATUS Column */}
                  <td className="px-4 py-2 align-middle">
                    <div className="flex flex-col gap-0.5 items-start w-fit">
                      {node.isExistingParent || isSaved ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 w-fit shrink-0 self-start bg-muted/40 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 max-w-[140px] min-w-0 cursor-default select-none opacity-85"
                          title={isSaved ? "Saved task" : "Locked parent project status"}
                        >
                          {resolvedStatus ? (
                            <>
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: resolvedStatus.color }} />
                              <span className="truncate whitespace-nowrap">{resolvedStatus.name}</span>
                            </>
                          ) : (
                            <span className="text-gray-400 italic whitespace-nowrap">No status</span>
                          )}
                        </span>
                      ) : (
                        <InlineEditableTaskStatus
                          status={resolvedStatus}
                          statuses={statuses}
                          taskId={node.draft.id || (node.originalIndex >= 0 ? node.originalIndex + 1 : 0)}
                          onUpdate={async (newStatusId) => {
                            const sObj = statuses.find((s) => s.id === newStatusId);
                            handleFieldChange(node.originalIndex, {
                              statusId: newStatusId,
                              statusName: sObj?.name,
                              statusColor: sObj?.color,
                            });
                          }}
                        />
                      )}
                    </div>
                  </td>

                  {/* 3. SEVERITY Column */}
                  <td className="px-4 py-2 align-middle">
                    {node.isExistingParent || isSaved ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 w-fit shrink-0 self-start bg-muted/40 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 cursor-default select-none opacity-85"
                        title={isSaved ? "Saved task" : "Existing parent project severity is locked"}
                      >
                        {resolvedSeverity ? (
                          <>
                            <Flag className="w-3 h-3 flex-shrink-0" fill={resolvedSeverity.color} color={resolvedSeverity.color} />
                            <span>{resolvedSeverity.name}</span>
                          </>
                        ) : (
                          <>
                            <Flag className="w-3 h-3 flex-shrink-0 text-gray-400" />
                            <span className="text-gray-400 italic">No severity</span>
                          </>
                        )}
                      </span>
                    ) : (
                      <InlineEditableTaskSeverity
                        severity={resolvedSeverity}
                        severities={severities}
                        taskId={node.draft.id || (node.originalIndex >= 0 ? node.originalIndex + 1 : 0)}
                        onUpdate={async (newSevId) => {
                          const sObj = severities.find((s) => s.id === newSevId);
                          handleFieldChange(node.originalIndex, {
                            severityId: newSevId,
                            severityName: sObj?.name,
                            severityColor: sObj?.color,
                          });
                        }}
                      />
                    )}
                  </td>

                  {/* 4. ASSIGNEE Column */}
                  <td className="px-4 py-2 align-middle">
                    <div className="flex items-center">
                      {node.isExistingParent || isSaved ? (
                        resolvedAssignee ? (
                          <div title={`${resolvedAssignee.first_name || ""} ${resolvedAssignee.last_name || ""}`} className="cursor-default opacity-85">
                            <UserAvatar
                              firstName={resolvedAssignee.first_name}
                              lastName={resolvedAssignee.last_name}
                              profilePic={resolvedAssignee.profile_pic}
                              size="sm"
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 italic text-xs select-none cursor-default">—</span>
                        )
                      ) : (
                        <InlineEditableTaskAssignee
                          assignee={resolvedAssignee}
                          resources={spaceResources}
                          taskMembers={spaceResources}
                          taskId={node.draft.id || (node.originalIndex >= 0 ? node.originalIndex + 1 : 0)}
                          onUpdate={async (newAssigneeId) => {
                            const rObj = spaceResources.find((r) => r.id === newAssigneeId);
                            handleFieldChange(node.originalIndex, "assigneeId", newAssigneeId);
                            handleFieldChange(node.originalIndex, "assigneeName", rObj ? `${rObj.first_name} ${rObj.last_name}` : null);
                          }}
                        />
                      )}
                    </div>
                  </td>

                  {/* 5. CO-ASSIGNEES Column */}
                  <td className="px-4 py-2 align-middle">
                    <div className="flex items-center">
                      {node.isExistingParent || isSaved ? (
                        node.draft.coAssignees && node.draft.coAssignees.length > 0 ? (
                          <div className="flex items-center -space-x-1.5 cursor-default opacity-85">
                            {node.draft.coAssignees.map((c: any) => (
                              <UserAvatar
                                key={c.id}
                                firstName={c.first_name || c.firstName}
                                lastName={c.last_name || c.lastName}
                                profilePic={c.profile_pic || c.profilePic}
                                size="xs"
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 italic text-xs select-none cursor-default">—</span>
                        )
                      ) : (
                        <InlineEditableTaskCoAssignees
                          coAssignees={node.draft.coAssignees || []}
                          resources={spaceResources}
                          taskMembers={spaceResources}
                          taskId={node.draft.id || (node.originalIndex >= 0 ? node.originalIndex + 1 : 0)}
                          onUpdate={async (coAssigneeIds) => {
                            const selected = spaceResources.filter((r) => coAssigneeIds.includes(r.id));
                            handleFieldChange(node.originalIndex, "coAssignees", selected);
                          }}
                        />
                      )}
                    </div>
                  </td>

                  {/* 6. START DATE Column */}
                  <td className="px-4 py-2 align-middle">
                    {node.isExistingParent || hasChildren ? (
                      <div className="flex flex-col gap-0.5 items-start w-fit">
                        {node.draft.startDate && !isNaN(new Date(node.draft.startDate).getTime()) ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-default select-none"
                            title={hasChildren ? "Rolled up from child tasks" : "Project schedule"}
                          >
                            <Lock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                            <span>{format(new Date(node.draft.startDate), "LLL dd")}</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-default select-none"
                            title="Dates roll up automatically when child tasks are scheduled"
                          >
                            <Lock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                            <span>Unscheduled</span>
                          </span>
                        )}
                      </div>
                    ) : isSaved ? (
                      node.draft.startDate && !isNaN(new Date(node.draft.startDate).getTime()) ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-default select-none">
                          <CalendarDays className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span>{format(new Date(node.draft.startDate), "LLL dd")}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 italic text-xs select-none cursor-default">—</span>
                      )
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border ${
                              !node.draft.startDate ? "border-dashed" : ""
                            } rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer text-gray-700 dark:text-gray-300 whitespace-nowrap border-gray-300 dark:border-gray-700`}
                          >
                            <CalendarDays className="w-3 h-3 shrink-0 text-muted-foreground" />
                            {node.draft.startDate && !isNaN(new Date(node.draft.startDate).getTime()) ? (
                              format(new Date(node.draft.startDate), "LLL dd")
                            ) : (
                              <span className="text-gray-400">Set date</span>
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-800" align="start">
                          <Calendar
                            mode="single"
                            selected={node.draft.startDate ? new Date(node.draft.startDate) : undefined}
                            onSelect={(d) => {
                              handleFieldChange(node.originalIndex, "startDate", d ? format(d, "yyyy-MM-dd") : null);
                            }}
                            initialFocus
                          />
                          {node.draft.startDate && (
                            <div className="border-t border-border px-3 py-1.5">
                              <button
                                type="button"
                                onClick={() => handleFieldChange(node.originalIndex, "startDate", null)}
                                className="w-full text-xs text-red-500 hover:text-red-700 transition-colors text-center py-0.5 cursor-pointer font-medium"
                              >
                                Clear date
                              </button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    )}
                  </td>

                  {/* 7. END DATE Column */}
                  <td className="px-4 py-2 align-middle">
                    {node.isExistingParent || hasChildren ? (
                      <div className="flex flex-col gap-0.5 items-start w-fit">
                        {node.draft.dueDate && !isNaN(new Date(node.draft.dueDate).getTime()) ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-default select-none"
                            title={hasChildren ? "Rolled up from child tasks" : "Project schedule"}
                          >
                            <Lock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                            <span>{format(new Date(node.draft.dueDate), "LLL dd")}</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-default select-none"
                            title="Dates roll up automatically when child tasks are scheduled"
                          >
                            <Lock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                            <span>Unscheduled</span>
                          </span>
                        )}
                      </div>
                    ) : isSaved ? (
                      node.draft.dueDate && !isNaN(new Date(node.draft.dueDate).getTime()) ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-default select-none">
                          <CalendarDays className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span>{format(new Date(node.draft.dueDate), "LLL dd")}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 italic text-xs select-none cursor-default">—</span>
                      )
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer whitespace-nowrap ${
                              node.draft.dueDate && new Date(node.draft.dueDate) < new Date()
                                ? "border-red-500 text-red-600 dark:text-red-400"
                                : !node.draft.dueDate
                                ? "border-dashed border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {node.draft.dueDate && new Date(node.draft.dueDate) < new Date() ? (
                              <AlertTriangle className="w-3 h-3 shrink-0 text-red-500" />
                            ) : (
                              <CalendarDays className="w-3 h-3 shrink-0 text-muted-foreground" />
                            )}
                            {node.draft.dueDate && !isNaN(new Date(node.draft.dueDate).getTime()) ? (
                              format(new Date(node.draft.dueDate), "LLL dd")
                            ) : (
                              <span className="text-gray-400">Set date</span>
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-800" align="start">
                          <Calendar
                            mode="single"
                            selected={node.draft.dueDate ? new Date(node.draft.dueDate) : undefined}
                            onSelect={(d) => {
                              handleFieldChange(node.originalIndex, "dueDate", d ? format(d, "yyyy-MM-dd") : null);
                            }}
                            initialFocus
                          />
                          {node.draft.dueDate && (
                            <div className="border-t border-border px-3 py-1.5">
                              <button
                                type="button"
                                onClick={() => handleFieldChange(node.originalIndex, "dueDate", null)}
                                className="w-full text-xs text-red-500 hover:text-red-700 transition-colors text-center py-0.5 cursor-pointer font-medium"
                              >
                                Clear date
                              </button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    )}
                  </td>

                  {/* 8. ACTIONS Column (Icon-only Save Button & Dismiss) */}
                  <td className={`px-3 py-2 align-middle text-right min-w-[80px] w-[80px] sticky right-0 z-10 ${stickyBg} transition-colors shadow-[-1px_0_0_0_hsl(var(--border))]`}>
                    <div className="flex items-center justify-end gap-1 h-7">
                      {node.isExistingParent ? (
                        <span className="text-xs text-muted-foreground/60 italic pr-2 select-none">—</span>
                      ) : isSaved ? (
                        <button
                          type="button"
                          onClick={() => {
                            const savedTask = createdTasksMap[node.originalIndex];
                            const taskId = savedTask?.id || node.draft.id;
                            if (taskId) {
                              window.open(`/task-management/task/form?id=${taskId}`, "_blank");
                            }
                          }}
                          className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded text-xs font-semibold text-primary hover:underline transition-colors cursor-pointer select-none h-7"
                          title="View task in new tab"
                        >
                          View
                          <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
                        </button>
                      ) : (
                        <>
                          <TooltipProvider>
                            <Tooltip delayDuration={150}>
                              <TooltipTrigger asChild>
                                <span className="inline-block">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleCreateOrUpdateOne(node.originalIndex)}
                                    disabled={isItemSubmitting || isSubmittingAll || !canSaveIndividual}
                                    className={`h-7 w-7 p-0 text-primary hover:text-primary/90 shrink-0 ${
                                      !canSaveIndividual
                                        ? "opacity-35 cursor-not-allowed hover:bg-transparent"
                                        : "cursor-pointer"
                                    }`}
                                    title={
                                      !canSaveIndividual
                                        ? `Parent "${parentDraftName}" must be created first`
                                        : isUpdateMode
                                        ? "Update Task"
                                        : "Save Task"
                                    }
                                  >
                                    {isItemSubmitting ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Save className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {!canSaveIndividual && (
                                <TooltipContent side="left" className="text-xs max-w-xs">
                                  <p>
                                    Save parent task <strong>"{parentDraftName}"</strong> first, or use{" "}
                                    <strong>Create All</strong>.
                                  </p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDismissOne(node.originalIndex)}
                            disabled={isItemSubmitting || isSubmittingAll}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                            title="Dismiss"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bulk Action Footer */}
      {visibleDrafts.length > 1 && (
        <div className="flex flex-col @[560px]:flex-row @[560px]:items-center justify-between gap-3 bg-muted/20 px-4 py-3 rounded-xl border border-border mt-3">
          <div className="text-sm flex items-center gap-1.5">
            {uncreatedCount === 0 ? (
              <span className="font-semibold flex items-center gap-1.5 text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> All {visibleDrafts.length} tasks {isUpdateMode ? "updated" : "created"} successfully
              </span>
            ) : visibleDrafts.length - uncreatedCount > 0 ? (
              <span>
                <strong>{visibleDrafts.length - uncreatedCount}</strong> saved. <strong>{uncreatedCount}</strong> ready. Would you like to {isUpdateMode ? "update" : "create"} {uncreatedCount === 1 ? "it" : "them all"}?
              </span>
            ) : (
              <span>
                There are <strong>{visibleDrafts.length}</strong> task {isUpdateMode ? "updates" : "drafts"} ready.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start @[560px]:self-auto">
            {uncreatedCount > 0 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmittingAll}
                  onClick={handleDismissAll}
                  className="h-8 gap-1.5 text-xs font-medium border-dashed border-border hover:border-border text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Dismiss All</span>
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={isSubmittingAll}
                  onClick={handleCreateOrUpdateAll}
                  className="h-8 gap-1.5 text-xs font-semibold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSubmittingAll ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isUpdateMode ? "Updating" : "Creating"} ({uncreatedCount})...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{isUpdateMode ? "Update All" : "Create All"} ({uncreatedCount})</span>
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
