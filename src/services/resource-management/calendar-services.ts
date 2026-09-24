
import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_ENDPOINTS } from "../api";

const API_URL = API_ENDPOINTS.CALENDAR;

export async function loadCalendars(
  params: Record<string, any>
): Promise<{ total: number; data: any[] }> {
  const url = `${API_URL}/search`;

  try {
    const response = await axiosInstance.post(url, params, {
      responseType: "json",
    });
    return response.data;
  } catch (error) {
    console.error("Error loading companies:", error);
    throw error;
  }
}
export async function loadCalendardates(
  params: Record<string, any>
): Promise<{ total: number; data: any[] }> {
  const url = `${API_URL}/search/calendar-dates`;

  try {
    const response = await axiosInstance.post(url, params, {
      responseType: "json",
    });
    return response.data;
  } catch (error) {
    console.error("Error loading calendar dates:", error);
    throw error;
  }
}
export const createCalendar = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}`,
      data,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error creating calendar:", error);
    throw error;
  }
};
export const updateCalendar = async (id: number, data: any): Promise<any> => {
  try {
    const response = await axiosInstance.put(
      `${API_URL}/${id}`,
      data,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error updating calendar:", error);
    throw error;
  }
};

export const extendCalendar = async (id: number, year: number): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}/extend/${id}`,
      { year },
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error extending calendar:", error);
    throw error;
  }
};

export const disableCalendar = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_URL}/${id}`,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error disabling calendar:", error);
    throw error;
  }
};
export const deleteCalendar = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.delete(
      `${API_URL}/${id}`,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error deleting calendar:", error);
    throw error;
  }
};
export interface CalendarWeekConfig {
  yearStartDate: string | null;
  /** First date of every year the calendar covers, oldest first. */
  yearStarts: string[];
  /** First date of the year running today. */
  currentYearStartDate: string | null;
  yearCount: number;
  isEditable: boolean;
  blockers: string[];
  /** Last generated day of the calendar. */
  lastDate: string | null;
  /** What an extension would add next. */
  nextYear: number | null;
  nextYearStartDate: string | null;
  nextYearEndDate: string | null;
  nextYearWeeks: number | null;
  /** Weekdays covered by the repeated holiday pattern the new year inherits. */
  repeatedHolidayCount: number;
}

export const getCalendarWeekConfig = async (
  calendarId: number
): Promise<CalendarWeekConfig> => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/week-config/${calendarId}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching calendar week config:", error);
    throw error;
  }
};

export const getAllCalendarDays = async (calendarId: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/getAllCalendarDays/${calendarId}`,
      { withCredentials: true }
    );
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

export const createSpecialHoliday = async (
  id: number,
  data: any
): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}/special-holiday/${id}`,
      data,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error creating special holiday:", error);
    throw error;
  }
};
// export const createLeaveAllocation = async (
//   id: string,
//   data: any
// ): Promise<any> => {
//   try {
//     const response = await axiosInstance.post(
//       `${API_URL}/calendar/createLeaveAllocation/${id}`,
//       data,
//       {
//         withCredentials: true,
//       }
//     );
//     return response;
//   } catch (error) {
//     console.error("Error creating Leave Allocation:", error);
//     throw error;
//   }
// };

export const createRepeatedHoliday = async (
  id: number,
  data: any
): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}/repeated-holiday/${id}`,
      data,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error creating Repeated Holiday:", error);
    throw error;
  }
};

export const createSpecialWorkingDay = async (
  id: number,
  data: any
): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}/special-working-day/${id}`,
      data,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error creating Repeated Holiday:", error);
    throw error;
  }
};

// export const getAllSpecialHoliday = async (
//   calendarId: number
// ): Promise<any> => {
//   try {
//     const response = await axiosInstance.get(
//       `${API_URL}/calendar/getAllSpecialHoliday/${calendarId}`,
//       { withCredentials: true }
//     );
//     return response;
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     throw error;
//   }
// };

// export const getAllLeaveAllocations = async (
//   resourceId: number
// ): Promise<any> => {
//   try {
//     const response = await axiosInstance.get(
//       `${API_URL}/calendar/getAllLeaveAllocations/${resourceId}`,
//       { withCredentials: true }
//     );
//     return response;
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     throw error;
//   }
// };

export const getAllRepeatedHoliday = async (
  calendarId: number,
  year?: number,
): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/getAllRepeatedHoliday/${calendarId}`,
      {
        params: {
          ...(year ? { year } : {}),
        },
        withCredentials: true,
      },
    );
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

export const deleteHolidaysAndWorkingDays = async (
  calendarId: number,
  id: number,
  type: string
): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_URL}/deleteHolidaysAndWorkingDays/${calendarId}`,
      { id, type },
      { withCredentials: true }
    );
    return response;
  } catch (error) {
    console.error("Error deleting holidays and working days:", error);
    throw error;
  }
};

export const deleteRepeatedHoliday = async (
  calendarId: number,
  day: number
): Promise<any> => {
  try {
    const response = await axiosInstance.delete(
      `${API_URL}/repeated-holiday/${calendarId}/${day}`,
      { withCredentials: true }
    );
    return response;
  } catch (error) {
    console.error("Error deleting repeated holiday:", error);
    throw error;
  }
};

// export const getAllSpecialWorkingDays = async (
//   calendarId: number
// ): Promise<any> => {
//   try {
//     const response = await axiosInstance.get(
//       `${API_URL}/calendar/getAllSpecialWorkingDays/${calendarId}`,
//       { withCredentials: true }
//     );
//     return response;
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     throw error;
//   }
// };

export const getAllCalendar = async (companyId: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/getAllCalendar/${companyId}`,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

