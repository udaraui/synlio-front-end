import { Company } from "./company";

interface Calendar {
  id: number;
  name: string;
  year: number;
  isActive: boolean;
  companyId: number;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
//   resources?: Resource[];
  company?: Company;
}

type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

interface CalendarDays {
  id: number;
  date: Date;
  year: number;
  yearStartDate: Date | null;
  weekNumber: number | null;
  daysOfWeek: DayOfWeek | null;
  weekStartDate: Date | null;
  weekEndDate: Date | null;
  isHoliday: boolean;
  isWeekend: boolean;
  isWorkingDay: boolean;
  dayType: string;
  calendarId: number;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  calendar?: Calendar;
}

export type { Calendar, CalendarDays, DayOfWeek };
