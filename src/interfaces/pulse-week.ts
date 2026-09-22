import {PulseType} from "@/enums/pulse-type.enum";
import {PostType} from "@/enums/post-type.enum";
import {AssigneeType} from "@/enums/assignee-type.enum";
import {PulseSnapshotStatus} from "@/enums/pulse-snapshot-status.enum";

export interface PulseWeek {
  id: number;
  companyId: number;
  weekStartDate: Date;
  weekEndDate: Date;
  status: PulseSnapshotStatus;
  submittedAt: Date | null;
  userId: number;
  userEmail: string;
  userFullName: string;
}

export interface Pulse {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  companyId: number;
  pulseType: PulseType;
  postType: PostType;
  postId: number;
  postCode: string;
  postName: string;
  postSpaceId: number;
  postSpaceName: string;
  resourceType: AssigneeType;
  pulseSummary: string;
  attentionConditions: string;
  meetingType: string;
  allocatedHours: number;
  pulseWeek: PulseWeek;
  pulseWeekId: number;
}
