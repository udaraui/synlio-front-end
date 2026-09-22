/**
 * Single source of truth for reading a calendar day's flags on the client.
 *
 * The backend writes one canonical tuple per scenario:
 *
 *   normal working day        F / F / T / F / FULL
 *   repeated holiday full     F / T / F / F / FULL
 *   repeated holiday half     F / T / T / F / HALF
 *   special holiday full      T / F / F / F / FULL   (T / T / F / F on a weekend)
 *   special holiday half      T / F / T / F / HALF
 *   special working day       F / T / F / T / FULL|HALF
 *                       (isHoliday / isWeekend / isWorkingDay / isSpecialWorkingDay / dayType)
 *
 * so the flags can be trusted directly — no guessing from the weekday.
 */

export type CalendarDayStateKey =
  | "NORMAL"
  | "WEEKEND"
  | "HOLIDAY"
  | "SPECIAL_WORKING";

export interface CalendarDayFlags {
  date?: Date | string;
  isHoliday?: boolean;
  isWeekend?: boolean;
  isWorkingDay?: boolean;
  isSpecialWorkingDay?: boolean;
  dayType?: string | null;
}

export interface CalendarDayState {
  key: CalendarDayStateKey;
  /** "Special Holiday (Half)" */
  label: string;
  /** "Special Holiday" — without the Full/Half suffix. */
  baseLabel: string;
  isHalf: boolean;
  /** True when the day is a repeated holiday, whatever overrides it. */
  isWeekend: boolean;
  badgeVariant: "default" | "destructive" | "secondary" | "outline";
  /**
   * Tinted badge classes, matching the day lists in the details view. Softer
   * than the solid variants, which read as alarming on a dense calendar.
   */
  badgeClass: string;
}

export const startOfDay = (date: Date | string) => {
  const parsed = new Date(date);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

/** Past days are frozen — they can neither be created on nor edited. */
export const isPastDate = (date: Date | string) =>
  startOfDay(date).getTime() < startOfDay(new Date()).getTime();

export function resolveDayState(day: CalendarDayFlags): CalendarDayState {
  const isHalf = (day.dayType ?? "").toUpperCase() === "HALF";
  const isWeekend = !!day.isWeekend;
  const suffix = isHalf ? " (Half)" : " (Full)";

  // A special working day and a special holiday are mutually exclusive, and
  // both sit on top of the repeated holiday pattern.
  if (day.isSpecialWorkingDay) {
    return {
      key: "SPECIAL_WORKING",
      baseLabel: "Special working day",
      label: `Special working day${suffix}`,
      isHalf,
      isWeekend,
      badgeVariant: "default",
      badgeClass:
        "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    };
  }

  if (day.isHoliday) {
    return {
      key: "HOLIDAY",
      baseLabel: "Special holiday",
      label: `Special holiday${suffix}`,
      isHalf,
      isWeekend,
      badgeVariant: "destructive",
      badgeClass:
        "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    };
  }

  if (isWeekend) {
    return {
      key: "WEEKEND",
      baseLabel: "Repeated holiday",
      label: `Repeated holiday${suffix}`,
      isHalf,
      isWeekend,
      badgeVariant: "secondary",
      badgeClass:
        "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-300/90 dark:border-red-900",
    };
  }

  return {
    key: "NORMAL",
    baseLabel: "Working Day",
    label: "Working Day (Full)",
    isHalf: false,
    isWeekend: false,
    badgeVariant: "outline",
    badgeClass: "bg-muted text-muted-foreground border-border",
  };
}

export type DayTypeValue = "FULL" | "HALF";

/**
 * The repeated-holiday type each weekday carries, read from days that no
 * override sits on. Keyed by `Date.getDay()`.
 *
 * A day that already carries an override reports the override's `dayType`, so
 * the underlying pattern can only be read from the clean days.
 */
export function buildWeekendBaseTypes(
  days: CalendarDayFlags[],
): Map<number, DayTypeValue> {
  const base = new Map<number, DayTypeValue>();

  days.forEach((day) => {
    if (!day.isWeekend || day.isHoliday || day.isSpecialWorkingDay) return;
    if (!day.date) return;

    const weekday = new Date(day.date).getDay();
    if (base.has(weekday)) return;

    base.set(weekday, (day.dayType ?? "").toUpperCase() === "HALF" ? "HALF" : "FULL");
  });

  return base;
}

/** The repeated-holiday type underneath a day, if it sits on one. */
export const weekendBaseTypeOf = (
  day: CalendarDayFlags,
  baseTypes: Map<number, DayTypeValue>,
): DayTypeValue | undefined => {
  if (!day.isWeekend || !day.date) return undefined;

  const fromPattern = baseTypes.get(new Date(day.date).getDay());
  if (fromPattern) return fromPattern;

  // No clean day left for that weekday — fall back to this day's own type.
  return day.isHoliday || day.isSpecialWorkingDay
    ? "FULL"
    : (day.dayType ?? "").toUpperCase() === "HALF"
      ? "HALF"
      : "FULL";
};

/**
 * A special holiday can be placed on a normal day, or on a *half* repeated
 * holiday. A full repeated holiday is already a full day off, and a special
 * working day has to be removed before its date can become a holiday.
 */
export const canBeSpecialHoliday = (
  day: CalendarDayFlags,
  baseTypes: Map<number, DayTypeValue>,
) => {
  if (day.isSpecialWorkingDay) return false;
  if (!day.isWeekend) return true;
  return weekendBaseTypeOf(day, baseTypes) === "HALF";
};

/**
 * A special working day only ever overrides a repeated holiday (weekend), and
 * never a day already carrying a special holiday.
 */
export const canBeSpecialWorkingDay = (day: CalendarDayFlags) =>
  !!day.isWeekend && !day.isHoliday;

/**
 * Which day types the target state may take:
 *
 *   normal day            -> special holiday full or half
 *   half repeated holiday -> special holiday full, or special working day full
 *   full repeated holiday -> special working day full or half
 */
export function allowedDayTypes(
  day: CalendarDayFlags,
  mode: "holiday" | "workingDay",
  baseTypes: Map<number, DayTypeValue>,
): DayTypeValue[] {
  const baseType = weekendBaseTypeOf(day, baseTypes);

  if (mode === "holiday") {
    // On a half repeated holiday only a full holiday is meaningful.
    return baseType ? ["FULL"] : ["FULL", "HALF"];
  }

  return baseType === "HALF" ? ["FULL"] : ["FULL", "HALF"];
}
