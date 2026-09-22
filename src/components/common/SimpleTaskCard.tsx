'use client';

import { Flag, Circle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import * as LucideIcons from 'lucide-react';
import { getPriorityColor } from '@/lib/utils/priorityColors';

interface SimpleTaskCardProps {
  task: {
    id: number;
    code: string;
    name: string;
    status: string;
    priority?: string;
  };
  onClick?: () => void;
}

export default function SimpleTaskCard({ task, onClick }: SimpleTaskCardProps) {

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo':
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700';
      case 'inProgress':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700';
      case 'onHold':
        return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-700';
      case 'complete':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:border-emerald-700';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'todo':
        return 'To Do';
      case 'inProgress':
        return 'In Progress';
      case 'onHold':
        return 'On Hold';
      case 'complete':
        return 'Complete';
      default:
        return status;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-all hover:shadow-sm p-3 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Task Code */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
              {task.code}
            </span>
          </div>

          {/* Task Name */}
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {task.name}
          </span>
        </div>

        {/* Status and Priority Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {task.priority && (
            <Badge
              variant="outline"
              className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-50 dark:bg-gray-700/50"
            >
              <Flag className={`w-3 h-3 ${getPriorityColor(task.priority)}`} />
            </Badge>
          )}
          <Badge
            variant="outline"
            className={`${getStatusColor(task.status)} text-xs font-medium px-2 py-1 border`}
          >
            {task.status === 'complete' ? (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : (
              <Circle className="h-3 w-3 mr-1" />
            )}
            {getStatusLabel(task.status)}
          </Badge>
        </div>
      </div>
    </div>
  );
}

