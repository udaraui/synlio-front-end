'use client';

import React from 'react';
import {AlertTriangle} from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

export interface NoMembersWarningAvatarProps {
  rootTaskCode?: string | null;
  size?: 'sm' | 'md';
  stopPropagation?: boolean;
  disableHover?: boolean;
}

/**
 * A single yellow "?" avatar with a hover-card explaining that the root task
 * has no members, so assignees / co-assignees cannot be set.
 *
 * Render it once per field (assignee / co-assignee).
 */
export function NoMembersWarningAvatar({
  rootTaskCode,
  size = 'sm',
  stopPropagation = true,
  disableHover = false,
}: NoMembersWarningAvatarProps) {
  const dim = size === 'md' ? 'w-8 h-8' : 'w-6 h-6';
  const iconSize = size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3';

  const handleClick = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
  };

  const avatar = (
    <div
      className={`${dim} rounded-full border border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center flex-shrink-0 cursor-default`}
      onClick={handleClick}
    >
      <span className={`${iconSize} font-bold leading-none text-gray-400 dark:text-gray-500 flex items-center justify-center`}>?</span>
    </div>
  );

  if (disableHover) return avatar;

  const warningContent = (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-yellow-100 dark:bg-yellow-900/30">
        <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-400" />
      </div>
      <div className="space-y-1.5 min-w-0">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
          Members not defined in root task
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Assignee and co-assignees cannot be set because{' '}
            {rootTaskCode
              ? <><span className="font-mono font-medium text-gray-700 dark:text-gray-300">{rootTaskCode}</span> has no members defined.</>
              : 'the root task has no members defined.'
            }
        </p>
      </div>
    </div>
  );

  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild>
        {avatar}
      </HoverCardTrigger>
      <HoverCardContent
        className="w-72 p-3"
        side="right"
        align="start"
        onClick={handleClick}
      >
        {warningContent}
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Renders two `NoMembersWarningAvatar`s (assignee + co-assignee) separated by
 * a divider — the standard pattern used in card / inline-create views.
 */
export function NoMembersWarningAvatarPair({
  rootTaskCode,
  size = 'sm',
  stopPropagation = true,
}: NoMembersWarningAvatarProps) {
  return (
    <>
      <NoMembersWarningAvatar
        rootTaskCode={rootTaskCode}
        size={size}
        stopPropagation={stopPropagation}
      />
      <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 shrink-0" />
      <NoMembersWarningAvatar
        rootTaskCode={rootTaskCode}
        size={size}
        stopPropagation={stopPropagation}
      />
    </>
  );
}
