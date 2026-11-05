'use client';

import { Settings, type LucideIcon } from 'lucide-react';
import { NavMain } from './nav-main';

export function NavMasters({
  masters,
  collapsible = true,
  defaultOpen = false,
  open,
  onOpenChange,
  icon = Settings,
  className,
}: {
  masters: {
    title: string;
    url: string;
    icon?: LucideIcon | React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    iconClassName?: string;
    iconColor?: string;
    privilege_codes: string[];
    activePaths?: string[];
    items?: any[];
  }[];
  collapsible?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  icon?: LucideIcon | React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  className?: string;
}) {
  return (
    <NavMain
      items={masters as any}
      label="System"
      collapsible={collapsible}
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      icon={icon}
      className={className}
    />
  );
}
