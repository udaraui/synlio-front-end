'use client';

import React from 'react';
import {
  Mail, Phone, RefreshCw, Pencil, Lock, Unlock, Trash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Export the type so other pages can use it to avoid "Type mismatch" errors
export interface Resource {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_pic: string | null;
  active_status: boolean;
  skills?: {
    skill: { id: number; name: string };
    skillLevel: { id: number; name: string; star_count: number };
  }[];
}

interface ResourceCardProps {
  resource: Resource;
  index: number;
  showActions?: boolean; // New prop to toggle buttons
  canEdit?: boolean;
  canDelete?: boolean;
  onClick?: (id: number) => void;
  onRefresh?: (id: number) => void;
  onEdit?: (id: number) => void;
  onStatusToggle?: (id: number) => void;
  onDelete?: (id: number) => void;
}

const typeColors: Record<string, { bg: string, text: string, border: string }> = {
  Projects: { bg: 'bg-blue-50/50 dark:bg-blue-950/30', text: 'text-gray-700 dark:text-blue-300', border: 'border-blue-100 dark:border-blue-800' },
  Tasks: { bg: 'bg-amber-50/50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-100 dark:border-amber-800' },
  Tickets: { bg: 'bg-rose-50/50 dark:bg-rose-950/30', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-100 dark:border-rose-800' },
};

const ResourceCard: React.FC<ResourceCardProps> = ({
                                                     resource,
                                                     index,
                                                     showActions = true, // Defaults to true
                                                     canEdit = false,
                                                     canDelete = false,
                                                     onClick,
                                                     onRefresh,
                                                     onEdit,
                                                     onStatusToggle,
                                                     onDelete,
                                                   }) => {
  const hardcodedUtilizations = [80, 25, 55, 95, 40, 75, 10, 60, 35, 90];
  const utilizationPercent = hardcodedUtilizations[index % hardcodedUtilizations.length];

  const avatarUrl = resource.profile_pic && resource.profile_pic.length > 0
    ? resource.profile_pic
    : `https://ui-avatars.com/api/?name=${resource.first_name}+${resource.last_name}&background=random&color=fff&size=48`;

  // Progress Circle Logic
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (utilizationPercent / 100) * circumference;
  const gradientClass = utilizationPercent <= 40 ? 'from-slate-500 to-slate-400' : utilizationPercent <= 70 ? 'from-amber-300 to-amber-200' : 'from-red-300 to-red-200';

  return (
    <div
      onClick={() => onClick?.(resource.id)}
      className="group relative rounded-xl border border-gray-200/60 bg-white shadow-sm transition-all duration-300 dark:bg-gray-800 dark:border-gray-700/60 overflow-hidden cursor-pointer hover:shadow-xl hover:border-blue-400/60"
    >
      {/* Header */}
      <div className="bg-primary/15 dark:bg-slate-900/40 p-2 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <div className="relative flex-shrink-0 w-12 h-12 flex items-center justify-center">
                  <svg className="absolute -rotate-90 w-14 h-14">
                    <circle cx="28" cy="28" r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-200 dark:text-gray-700" />
                    <circle cx="28" cy="28" r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray={circumference} style={{ strokeDashoffset: offset }} strokeLinecap="round" className={`transition-all duration-500 ${gradientClass}`} />
                  </svg>
                  <div className="w-8 h-8 rounded-full overflow-hidden relative z-10 bg-white dark:bg-gray-800 flex items-center justify-center">
                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover group-hover:opacity-0 transition-opacity" />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">{utilizationPercent}%</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="text-xs">{resource.email}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold truncate">{resource.first_name} {resource.last_name}</h4>
            <span className={`h-2 w-2 rounded-full inline-block ${resource.active_status ? 'bg-green-500' : 'bg-gray-400'}`} />
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Stats */}
        <div className="mb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {['Projects', 'Tasks', 'Tickets'].map((type) => (
            <span key={type} className={`px-2 py-1 rounded-md text-[11px] border ${typeColors[type].bg} ${typeColors[type].text} ${typeColors[type].border}`}>
              {type}
            </span>
          ))}
        </div>

        {/* Action Buttons: Conditional Rendering */}
        {showActions && (
          <>
            <div className="border-t border-dashed my-3 border-gray-200 dark:border-gray-700" />
            <div className="flex items-center gap-1 justify-end">
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs flex-1" onClick={(e) => e.stopPropagation()}>Assignments</Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); onRefresh?.(resource.id); }}><RefreshCw className="w-3 h-3" /></Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); onEdit?.(resource.id); }}><Pencil className="w-3 h-3" /></Button>
              <Button variant="outline" size="icon" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); onStatusToggle?.(resource.id); }}>
                {resource.active_status ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7 p-0 hover:bg-destructive/10 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete?.(resource.id); }}><Trash className="w-3 h-3" /></Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResourceCard;