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

export const getInitials = (name: string) => {
  if (!name) return '';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};
