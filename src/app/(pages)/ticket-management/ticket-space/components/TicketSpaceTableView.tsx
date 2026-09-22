'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Pencil,
  Trash,
  Settings,
  Plus,
  Loader2,
  Lock,
  LockOpen
} from 'lucide-react';

interface TicketSpace {
  id: number;
  name: string;
  prefix: string;
  description?: string;
  status?: string;
  isActive?: boolean;
}

interface StatusCount {
  statusId: number;
  name: string;
  color: string;
  count: number;
}

interface TicketSpaceTableViewProps {
  dataArr: TicketSpace[];
  onEditData: (id: number) => void;
  onDelete: (id: number) => void;
  onConfigure?: (id: number) => void;
  onCreate?: (id: number) => void;
  statusCountsBySpace?: Record<number, StatusCount[]>;
  isCountsLoading?: boolean;
  canCreate?: boolean;
  canViewTicket?: boolean;
  onToggleStatus?: (id: number) => void;
}

const TicketSpaceTableView: React.FC<TicketSpaceTableViewProps> = ({
  dataArr,
  onEditData,
  onDelete,
  onConfigure,
  onCreate,
  statusCountsBySpace = {},
  isCountsLoading = false,
  canCreate = true,
  canViewTicket = true,
  onToggleStatus,
}) => {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [localData, setLocalData] = useState<TicketSpace[]>(dataArr);

  useEffect(() => {
    setLocalData(dataArr);
  }, [dataArr]);

  const columns: ColumnDef<TicketSpace>[] = [
    {
      accessorKey: 'name',
      header: 'TITLE',
      size: 400,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-2 min-w-[200px]">
            {item.prefix && (
              <Badge variant="outline" className="cursor-pointer hover:bg-muted font-mono text-xs whitespace-nowrap rounded-md">
                {item.prefix}
              </Badge>
            )}
            <span className="text-sm font-medium cursor-pointer hover:text-blue-600 transition-colors">
              {item.name}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'description',
      header: 'DESCRIPTION',
      size: 400,
      cell: ({ row }) => (
        <div className="flex flex-col min-w-[200px] max-w-[400px]">
          <span className="text-sm text-gray-500 dark:text-gray-400 truncate" title={row.original.description}>{row.original.description || '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'tickets',
      header: 'TICKETS',
      cell: ({ row }) => {
        const item = row.original;
        const statusCounts = [...(statusCountsBySpace[item.id] || [])].sort((a, b) => a.name.localeCompare(b.name));

        return (
          <div className="min-h-[1.75rem] flex items-center">
            {isCountsLoading ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Syncing tickets...</span>
              </div>
            ) : statusCounts.length === 0 ? (
              <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                No tickets yet
              </span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {statusCounts.map((statusCount) => (
                  <div
                    key={statusCount.statusId}
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-md text-xs font-medium"
                    title={`${statusCount.name}: ${statusCount.count} ticket${statusCount.count !== 1 ? 's' : ''}`}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: statusCount.color }}
                    />
                    <span className="text-gray-700 dark:text-gray-300">{statusCount.name}</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{statusCount.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">ACTIONS</div>,
      size: 160,
      cell: ({ row }) => {
        const item = row.original;

        return (
          <div className="flex justify-end gap-1">
            <TooltipProvider delayDuration={0}>
              {/* Create New Ticket Button */}
              {canCreate && onCreate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 hover:text-primary hover:border-primary transition-colors"
                      disabled={!item.isActive}
                      onClick={(e) => { e.stopPropagation(); onCreate?.(item.id); }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Create New Ticket</TooltipContent>
                </Tooltip>
              )}

              {/* Edit Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:text-primary hover:border-primary transition-colors"
                    disabled={!item.isActive}
                    onClick={(e) => { e.stopPropagation(); onEditData(item.id); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Edit Ticket Space</TooltipContent>
              </Tooltip>

              {/* Configure Button */}
              {onConfigure && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 hover:text-primary hover:border-primary transition-colors"
                      disabled={!item.isActive}
                      onClick={(e) => { e.stopPropagation(); onConfigure?.(item.id); }}
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Configure Ticket Space</TooltipContent>
                </Tooltip>
              )}

              {/* Toggle Status Button */}
              {onToggleStatus && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-7 w-7 p-0 hover:text-primary dark:hover:text-primary hover:border-primary transition-colors ${!item.isActive
                        ? 'text-green-600 dark:text-green-400'
                        : ''
                        }`}
                      onClick={(e) => { e.stopPropagation(); onToggleStatus(item.id); }}
                    >
                      {item.isActive ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{item.isActive ? 'Inactivate Ticket Space' : 'Activate Ticket Space'}</TooltipContent>
                </Tooltip>
              )}

              {/* Delete Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:border-destructive transition-colors"
                    disabled={!item.isActive}
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Delete Ticket Space</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: localData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col rounded-xl border overflow-hidden bg-white dark:bg-zinc-950">
        <div className="relative flex-1 min-h-0 overflow-auto scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 dark:hover:scrollbar-thumb-gray-600 [&_[data-slot=table-container]]:overflow-visible">
          <Table>
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-gray-50 dark:[&_th]:bg-gray-900">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-b">
                  {headerGroup.headers.map((header) => (
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
                        ? canViewTicket
                          ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50'
                          : 'cursor-not-allowed'
                        : 'cursor-not-allowed bg-gray-50 dark:bg-gray-900/50'
                      }`}
                    onClick={() => {
                      if (row.original.isActive && canViewTicket) {
                        router.push(`/ticket-management/ticket?ticketSpaceId=${row.original.id}&fromSpace=1`);
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2 px-4 relative" style={{ width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined }}>
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
                    No Ticket Spaces found.
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

export default TicketSpaceTableView;

