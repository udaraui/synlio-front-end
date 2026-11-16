import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { differenceInCalendarDays, differenceInMinutes, differenceInHours, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const calendarDaysDiff = differenceInCalendarDays(now, date);
  const minsDiff = differenceInMinutes(now, date);
  const hoursDiff = differenceInHours(now, date);

  if (calendarDaysDiff === 1) {
    return `Yesterday at ${format(date, 'h:mm a')}`;
  }

  if (calendarDaysDiff === 0) {
    if (minsDiff < 1) return 'Just now';
    if (minsDiff < 60) return `${minsDiff} min ago`;
    return `${hoursDiff} ${hoursDiff === 1 ? 'hour' : 'hours'} ago`;
  }

  if (calendarDaysDiff < 7) {
    return `${calendarDaysDiff} ${calendarDaysDiff === 1 ? 'day' : 'days'} ago`;
  }

  const weeksDiff = Math.floor(calendarDaysDiff / 7);
  if (weeksDiff <= 2) {
    return `${weeksDiff} ${weeksDiff === 1 ? 'week' : 'weeks'} ago`;
  }

  return format(date, 'MMM d, yyyy');
};

export const getInitials = (name?: string | null) => {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .map(n => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();
};

export const getFirstLastInitials = (
  firstName?: string | null,
  lastName?: string | null,
  fallback: string = '?'
) => {
  const f = (firstName || '').trim();
  const l = (lastName || '').trim();
  const initials = `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
  return initials || fallback;
};

export interface ActiveStatusLike {
  active_status?: boolean | null;
  activeStatus?: boolean | null;
  active?: boolean | null;
  isActive?: boolean | null;
  is_active?: boolean | null;
  user?: {
    isActive?: boolean | null;
    active_status?: boolean | null;
    is_active?: boolean | null;
  } | null;
}

/**
 * Determines whether a resource, space member, or user record is active.
 * Defaults to `true` when no explicit status flag is present on the object.
 */
export const isResourceActive = (
  resource?: ActiveStatusLike | object | null,
): boolean => {
  if (!resource || typeof resource !== 'object') return false;
  const r = resource as ActiveStatusLike;
  if (typeof r.active_status === 'boolean') return r.active_status;
  if (typeof r.activeStatus === 'boolean') return r.activeStatus;
  if (typeof r.active === 'boolean') return r.active;
  if (typeof r.isActive === 'boolean') return r.isActive;
  if (typeof r.is_active === 'boolean') return r.is_active;
  if (r.user) {
    if (typeof r.user.isActive === 'boolean') return r.user.isActive;
    if (typeof r.user.active_status === 'boolean') return r.user.active_status;
    if (typeof r.user.is_active === 'boolean') return r.user.is_active;
  }
  return true;
};


