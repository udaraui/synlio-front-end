import axiosInstance from '@/lib/interceptors/axiosInstance';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type MeetingProvider = 'teams' | 'zoom' | 'google_meet' | 'slack' | 'internal';
export type ConnectionStatus = 'connected' | 'error' | 'revoked';
export type MeetingStatus = 'scheduled' | 'ongoing' | 'ended' | 'cancelled';
export type MeetingActionState = 'none' | 'ignored' | 'linked_to_task';

export interface ProviderConnectionStatus {
  provider: MeetingProvider;
  status: ConnectionStatus;
  lastConnectedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
}

export interface MeetingAttendee {
  id: number;
  /** Linked Synlio user id. Set for internal meeting attendees, null otherwise. */
  userId?: number | null;
  email: string;
  name: string | null;
  responseStatus: string | null;
  joined: boolean | null;
}

export interface Meeting {
  id: number;
  provider: MeetingProvider;
  externalId: string;
  ownerUserId: number;
  title: string;
  /** @deprecated use scheduledStartTime / effectiveStartTime */
  startTime: string;
  /** @deprecated use scheduledEndTime / effectiveEndTime */
  endTime: string | null;
  /** Original provider-sourced start time (never modified by edits) */
  scheduledStartTime: string;
  /** Original provider-sourced end time (never modified by edits) */
  scheduledEndTime: string | null;
  /** User-edited actual start time, if set */
  actualStartTime: string | null;
  /** User-edited actual end time, if set */
  actualEndTime: string | null;
  /** Effective display time = actualStartTime ?? scheduledStartTime */
  effectiveStartTime: string;
  /** Effective display time = actualEndTime ?? scheduledEndTime */
  effectiveEndTime: string | null;
  durationMinutes: number | null;
  /** User-edited actual duration in minutes. Used for calculations when set. */
  actualDurationMinutes: number | null;
  /** effectiveDurationMinutes = actualDurationMinutes ?? durationMinutes */
  effectiveDurationMinutes: number | null;
  joinUrl: string | null;
  organizerEmail: string | null;
  status: MeetingStatus;
  /** Workflow state for this user */
  actionState: MeetingActionState;
  syncedAt: string | null;
  linkedTaskId?: number | null;
  linkedTaskCode?: string | null;
  /**
   * The user who created this meeting. Only set for manually created internal
   * meetings — null for anything synced from Teams / Google / Zoom / Slack.
   * Only the organizer may edit or delete the meeting.
   */
  organizerId?: number | null;
  attendees: MeetingAttendee[];
}

export interface MeetingsListResponse {
  data: Meeting[];
  total: number;
  page: number;
  limit: number;
}

export interface MeetingStats {
  totalMeetings: number;
  totalMinutes: number;
  totalHours: number;
  byProvider: {
    provider: MeetingProvider;
    count: number;
    minutes: number;
  }[];
}

export interface SyncResult {
  provider: string;
  synced: number;
}

/** Get OAuth URL to redirect user for connecting a provider */
export const getAuthUrl = async (provider: MeetingProvider): Promise<{ url: string }> => {
  const response = await axiosInstance.get(
    `${API_URL}/meetings-integration/auth-url/${provider}`,
  );
  return response.data;
};

/** Get connection status for all 4 providers */
export const getConnectionStatus = async (): Promise<ProviderConnectionStatus[]> => {
  const response = await axiosInstance.get(`${API_URL}/meetings-integration/status`);
  return response.data;
};

/** Disconnect a provider */
export const disconnectProvider = async (
  provider: MeetingProvider,
): Promise<{ success: boolean }> => {
  const response = await axiosInstance.delete(
    `${API_URL}/meetings-integration/disconnect/${provider}`,
  );
  return response.data;
};

/** Manually trigger a sync (all providers or a specific one) */
export const syncMeetings = async (params?: {
  provider?: MeetingProvider;
  startDate?: string;
  endDate?: string;
}): Promise<SyncResult[]> => {
  const response = await axiosInstance.post(
    `${API_URL}/meetings-integration/sync`,
    {},
    { params },
  );
  return response.data;
};

/** Get paginated meetings list */
export const getMeetings = async (params?: {
  startDate?: string;
  endDate?: string;
  provider?: MeetingProvider;
  page?: number;
  limit?: number;
  includeIgnored?: boolean;
}): Promise<MeetingsListResponse> => {
  const response = await axiosInstance.get(`${API_URL}/meetings-integration/meetings`, {
    params,
  });
  return response.data;
};

/** Get aggregated meeting stats for the Pulse page */
export const getMeetingStats = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<MeetingStats> => {
  const response = await axiosInstance.get(
    `${API_URL}/meetings-integration/meetings/stats`,
    { params },
  );
  return response.data;
};

/** Update actual times for a meeting (keeps scheduled times intact) */
export const updateMeetingActualTimes = async (
  meetingId: number,
  data: { actualStartTime: string; actualEndTime: string },
): Promise<Meeting> => {
  const response = await axiosInstance.patch(
    `${API_URL}/meetings-integration/meetings/${meetingId}/actual-times`,
    data,
  );
  return response.data;
};

/** Update actual duration for a meeting (0 = clear, reverts to scheduled) */
export const updateMeetingActualDuration = async (
  meetingId: number,
  data: { actualDurationMinutes: number },
): Promise<Meeting> => {
  const response = await axiosInstance.patch(
    `${API_URL}/meetings-integration/meetings/${meetingId}/actual-duration`,
    data,
  );
  return response.data;
};

/** Set the workflow action state for a meeting */
export const setMeetingActionState = async (
  meetingId: number,
  data: { state: MeetingActionState; taskId?: number; note?: string },
): Promise<void> => {
  const response = await axiosInstance.patch(
    `${API_URL}/meetings-integration/meetings/${meetingId}/action-state`,
    data,
  );
  return response.data;
};

/** Create a new internal meeting and fan it out to attendees */
export const createInternalMeeting = async (data: {
  title: string;
  startTime: string;
  endTime?: string;
  location?: string;
  description?: string;
  attendeeUserIds?: number[];
}): Promise<any> => {
  const response = await axiosInstance.post(
    `${API_URL}/meetings-integration/internal`,
    data,
  );
  return response.data;
};

/**
 * Update a manually created internal meeting.
 * Only the organizer may do this — provider-synced meetings are rejected.
 * `attendeeUserIds` fully replaces the existing attendee list.
 */
export const updateInternalMeeting = async (
  meetingId: number,
  data: {
    title: string;
    startTime: string;
    endTime?: string;
    location?: string;
    description?: string;
    attendeeUserIds?: number[];
  },
): Promise<any> => {
  const response = await axiosInstance.patch(
    `${API_URL}/meetings-integration/internal/${meetingId}`,
    data,
  );
  return response.data;
};

/**
 * Delete a manually created internal meeting for every participant.
 * Only the organizer may do this — provider-synced meetings are rejected.
 */
export const deleteInternalMeeting = async (
  meetingId: number,
): Promise<{ success: boolean; deleted: number }> => {
  const response = await axiosInstance.delete(
    `${API_URL}/meetings-integration/internal/${meetingId}`,
  );
  return response.data;
};
