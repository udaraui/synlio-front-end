import React from 'react';
import {
  Folder,
  FolderOpen,
  Layers,
  GitBranch,
  Box,
  Package,
  Shapes,
  ListTree,
  Network,
  Workflow,
  LayoutDashboard,
  FileText,
  Tag,
  Star,
  Flag,
  Bookmark,
  Milestone,
  Target,
  // Ticket type icons
  Bug,
  Zap,
  MessageSquare,
  Settings,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  Wrench,
  Ticket
} from 'lucide-react';

// Hierarchy Level Icon Registry
export const HIERARCHY_LEVEL_ICONS: { name: string; component: React.FC<any> }[] = [
  { name: 'Folder', component: Folder },
  { name: 'FolderOpen', component: FolderOpen },
  { name: 'Layers', component: Layers },
  { name: 'GitBranch', component: GitBranch },
  { name: 'Box', component: Box },
  { name: 'Package', component: Package },
  { name: 'Shapes', component: Shapes },
  { name: 'ListTree', component: ListTree },
  { name: 'Network', component: Network },
  { name: 'Workflow', component: Workflow },
  { name: 'LayoutDashboard', component: LayoutDashboard },
  { name: 'FileText', component: FileText },
  { name: 'Tag', component: Tag },
  { name: 'Star', component: Star },
  { name: 'Flag', component: Flag },
  { name: 'Bookmark', component: Bookmark },
  { name: 'Milestone', component: Milestone },
  { name: 'Target', component: Target },
];

export const DEFAULT_HIERARCHY_LEVEL_ICON = HIERARCHY_LEVEL_ICONS[0].name;

export const getHierarchyLevelIcon = (iconName: string): React.FC<any> =>
  HIERARCHY_LEVEL_ICONS.find(({ name }) => name === iconName)?.component ?? Folder;

// Ticket Type Icon Registry
export const TICKET_TYPE_ICONS: { name: string; component: React.FC<any> }[] = [
  { name: 'Ticket', component: Ticket },
  { name: 'Bug', component: Bug },
  { name: 'Zap', component: Zap },
  { name: 'MessageSquare', component: MessageSquare },
  { name: 'Settings', component: Settings },
  { name: 'HelpCircle', component: HelpCircle },
  { name: 'Lightbulb', component: Lightbulb },
  { name: 'AlertTriangle', component: AlertTriangle },
  { name: 'FileText', component: FileText },
  { name: 'Wrench', component: Wrench },
  { name: 'Star', component: Star },
];

export const DEFAULT_TICKET_TYPE_ICON = TICKET_TYPE_ICONS[0].name;

export const getTicketTypeIcon = (iconName: string): React.FC<any> =>
  TICKET_TYPE_ICONS.find(({ name }) => name === iconName)?.component ?? Bug;
