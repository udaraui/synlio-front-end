'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ColumnDef, flexRender, getCoreRowModel, getSortedRowModel,
  getPaginationRowModel, useReactTable, SortingState,
} from '@tanstack/react-table';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Pencil, Trash, Settings, Plus, Lock, LockOpen, Loader2 } from 'lucide-react';

interface StatusCount { statusId: number; name: string; color: string; count: number; }

interface TaskSpaceTableViewProps {
  dataArr: any[];
  onEditData: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleStatus?: (id: number) => void;
  onConfigure?: (id: number) => void;
  onCreate?: (id: number) => void;
  statusCountsBySpace?: Record<number, StatusCount[]>;
  levelNamesBySpace?: Record<number, string>;
  isCountsLoading?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canViewTask?: boolean;
  hideActionButtons?: boolean;
}

const TaskSpaceTableView: React.FC<TaskSpaceTableViewProps> = ({
  dataArr, onEditData, onDelete, onToggleStatus, onConfigure, onCreate,
  statusCountsBySpace = {}, levelNamesBySpace = {}, isCountsLoading = false, canCreate = true, canEdit = true, canDelete = true, canViewTask = true, hideActionButtons = false,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = searchParams.get("meetingId");
  const activityId = searchParams.get("activityId");
  const activityTitle = searchParams.get("activityTitle");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [localData, setLocalData] = useState(dataArr);

  useEffect(() => setLocalData(dataArr), [dataArr]);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'TITLE',
      size: 400,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-[200px]">
          {row.original.prefix && (
            <Badge variant="outline" className="font-mono text-xs whitespace-nowrap rounded-md">
              {row.original.prefix}
            </Badge>
          )}
          <span className="text-sm font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'DESCRIPTION',
      size: 400,
      cell: ({ row }) => (
        <div className="flex flex-col min-w-[200px] max-w-[400px]">
          <span className="text-sm text-gray-500 truncate" title={row.original.description}>{row.original.description || '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'tasks',
      header: 'TASKS',
      cell: ({ row }) => {
        const statusCounts = [...(statusCountsBySpace[row.original.id] || [])].sort((a, b) => a.name.localeCompare(b.name));
        return (
          <div className="min-h-[1.75rem] flex items-center">
            {isCountsLoading ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Syncing tasks...</span>
              </div>
            ) : !statusCounts.length ? (
              <span className="text-xs text-gray-400 italic">No tasks yet</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {statusCounts.map((sc) => (
                  <div key={sc.statusId} className="flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-md text-xs font-medium">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sc.color }} />
                    <span className="text-gray-700 dark:text-gray-300">{sc.name}</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{sc.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      },
    },
    ...(!hideActionButtons ? [{
      id: 'actions',
      header: () => <div className="text-right">ACTIONS</div>,
      size: 160,
      cell: ({ row }: any) => {
        const item = row.original;
        const statusCounts: any = statusCountsBySpace[item.id] || [];
        const rootLevelName = levelNamesBySpace?.[item.id] ?? statusCounts[0]?.hierarchyLevelName ?? 'Task';
        return (
          <div className="flex justify-end gap-1">
            <TooltipProvider delayDuration={0}>
              {canCreate && onCreate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-primary hover:border-primary transition-colors" disabled={!item.isActive} onClick={(e) => { e.stopPropagation(); onCreate(item.id); }}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">Create New {rootLevelName}</TooltipContent>
                </Tooltip>
              )}
              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-primary hover:border-primary transition-colors" disabled={!item.isActive} onClick={(e) => { e.stopPropagation(); onEditData(item.id); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">Edit Project Space</TooltipContent>
                </Tooltip>
              )}
              {onConfigure && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-primary hover:border-primary transition-colors" disabled={!item.isActive} onClick={(e) => { e.stopPropagation(); onConfigure(item.id); }}>
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">Configure Project Space</TooltipContent>
                </Tooltip>
              )}
              {canEdit && onToggleStatus && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost"
                      className={`h-7 w-7 p-0 hover:text-primary dark:hover:text-primary hover:border-primary transition-colors ${!item.isActive
                        ? 'text-green-600 dark:text-green-400'
                        : ''
                        }`}
                      onClick={(e) => { e.stopPropagation(); onToggleStatus(item.id); }}>
                      {item.isActive ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{item.isActive ? 'Inactivate Project Space' : 'Activate Project Space'}</TooltipContent>
                </Tooltip>
              )}
              {canDelete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:border-destructive transition-colors" disabled={!item.isActive} onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">Delete Project Space</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        );
      },
    }] : []),
  ];

  const table = useReactTable({ data: localData, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel() });

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col rounded-xl border overflow-hidden bg-white dark:bg-zinc-950">
        <div className="relative flex-1 min-h-0 overflow-auto scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 dark:hover:scrollbar-thumb-gray-600 [&_[data-slot=table-container]]:overflow-visible">
          <Table>
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-gray-50 dark:[&_th]:bg-gray-900">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="hover:bg-transparent border-b">
                  {hg.headers.map((header) => (
                    <TableHead key={header.id} className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider" style={{ width: header.column.getSize() !== 150 ? header.column.getSize() : undefined }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={`transition-colors ${row.original.isActive
                        ? canViewTask
                          ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50'
                          : 'cursor-not-allowed'
                        : 'cursor-not-allowed bg-gray-50 dark:bg-gray-900/50'
                      }`}
                    onClick={() => {
                      if (row.original.isActive && canViewTask) {
                        const meetingName = searchParams.get('meetingName');
                        router.push(`/task-management/task?taskSpaceId=${row.original.id}&fromSpace=1${meetingId ? `&meetingId=${meetingId}` : ''}${meetingName ? `&meetingName=${encodeURIComponent(meetingName)}` : ''}${activityId ? `&activityId=${activityId}` : ''}${activityTitle ? `&activityTitle=${encodeURIComponent(activityTitle)}` : ''}`);
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2 px-4 relative" style={{ width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined }}>
                        {/* Apply grayscale+opacity to every cell EXCEPT the actions column */}
                        {!row.original.isActive && cell.column.id !== 'actions' ? (
                          <div className="opacity-60 grayscale">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    No Project Spaces found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default TaskSpaceTableView;

