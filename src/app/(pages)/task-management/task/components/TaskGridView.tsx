'use client';

import React from 'react';
import TaskCard from './TaskCard';
import { TaskCardConfigData, TaskUpdateHandler } from './task-card.types';
import { useSidebar } from '@/components/ui/sidebar';

interface TaskGridViewProps {
  tasks: any[];
  configData?: TaskCardConfigData;
  onTaskClick?: (task: any) => void;
  onEdit?: (task: any) => void;
  onDelete?: (task: any) => void;
  onUpdateTask?: TaskUpdateHandler;
  onShowChildTasks?: (task: any) => void;
  inlineCreateCard?: React.ReactNode;
  isRelationsLoading?: boolean;
}

const TaskGridView: React.FC<TaskGridViewProps> = ({
  tasks,
  configData,
  onTaskClick,
  onEdit,
  onDelete,
  onUpdateTask,
  onShowChildTasks,
  inlineCreateCard,
  isRelationsLoading,
}) => {
  const { open: sidebarOpen } = useSidebar();
  return (
    <div className={`grid gap-3 ${sidebarOpen ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'}`}>
      {inlineCreateCard && inlineCreateCard}
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          configData={configData}
          onCardClick={onTaskClick}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdateTask={onUpdateTask}
          onShowChildTasks={onShowChildTasks}
          isRelationsLoading={isRelationsLoading}
        />
      ))}
    </div>
  );
};

export default TaskGridView;
