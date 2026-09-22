'use client';

import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  Layers,
  Package,
  Box,
  Archive,
  Briefcase,
  Calendar,
  CheckSquare,
  Clipboard,
  FileText,
  Flag,
  GitBranch,
  Grid,
  Hash,
  Inbox,
  Layout,
  List,
  Map,
  Package2,
  PenTool,
  Rocket,
  Target,
  Kanban,
  Zap,
  Circle,
  Square,
  Triangle,
  Diamond,
  Star,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const ICON_OPTIONS = [
  { name: 'Folder', component: Folder, description: 'Projects/Folders' },
  { name: 'Package', component: Package, description: 'Packages/Deliverables' },
  { name: 'Target', component: Target, description: 'Goals/Objectives' },
  { name: 'CheckSquare', component: CheckSquare, description: 'Tasks/Action Items' },
  { name: 'Flag', component: Flag, description: 'Milestones' },
  { name: 'Rocket', component: Rocket, description: 'Initiatives/Launches' },
  { name: 'Layers', component: Layers, description: 'Phases/Stages' },
  { name: 'GitBranch', component: GitBranch, description: 'Branches/Workstreams' },
  { name: 'Trello', component: Kanban, description: 'Boards/Sprints' },
  { name: 'Briefcase', component: Briefcase, description: 'Portfolios/Programs' },
];

const COLOR_OPTIONS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#22c55e', // Green
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#0ea5e9', // Sky
  '#3b82f6', // Blue
  '#a855f7', // Violet (different from Purple)
  '#64748b', // Slate
];

interface IconPickerProps {
  value?: string;
  color?: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
}

export function IconPicker({ value = 'Folder', color = '#6366f1', onIconChange, onColorChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);

  const SelectedIcon = ICON_OPTIONS.find(opt => opt.name === value)?.component || Folder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-12 h-12 p-0"
          type="button"
        >
          <SelectedIcon className="w-5 h-5" style={{ color }} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          {/* Icon Selection */}
          <div>
            <h4 className="text-sm font-medium mb-2">Select Icon</h4>
            <div className="grid grid-cols-5 gap-2">
              {ICON_OPTIONS.map((icon) => {
                const IconComponent = icon.component;
                const isSelected = value === icon.name;
                return (
                  <button
                    key={icon.name}
                    type="button"
                    onClick={() => {
                      onIconChange(icon.name);
                    }}
                    className={`p-2 rounded hover:bg-accent transition-colors ${
                      isSelected ? 'bg-primary/10 ring-2 ring-primary' : ''
                    }`}
                    title={icon.description}
                  >
                    <IconComponent
                      className="w-5 h-5 mx-auto"
                      style={{ color: isSelected ? color : 'currentColor' }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <h4 className="text-sm font-medium mb-2">Select Color</h4>
            <div className="grid grid-cols-8 gap-2">
              {COLOR_OPTIONS.map((colorOption) => {
                const isSelected = color === colorOption;
                return (
                  <button
                    key={colorOption}
                    type="button"
                    onClick={() => {
                      onColorChange(colorOption);
                    }}
                    className={`w-8 h-8 rounded-full transition-all ${
                      isSelected ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: colorOption }}
                    title={colorOption}
                  />
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div className="pt-2 border-t">
            <h4 className="text-sm font-medium mb-2">Preview</h4>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <SelectedIcon className="w-6 h-6" style={{ color }} />
              <div className="text-sm">
                <div className="font-medium">{value}</div>
                <div className="text-xs text-muted-foreground">{color}</div>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
