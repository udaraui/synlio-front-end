import { User } from "./user";
import { Division } from "./division";
import { ActiveStatus } from './common/status.enum';

interface Company {
  id: number;
  companyId?: number; // Added to match view result
  is_default?: boolean; // Added to match view result
  company: string;
  company_code: string;
  logo: string;
  address?: string;
  suspend_on: Date;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  active_status: ActiveStatus;
  isActive?: string; // Added to match backend entity isActive
  users?: User[];
  divisions?: Division[];
  // Notification email config
  notificationEmail?: string;
  emailProvider?: 'gmail' | 'outlook' | 'mail_service';
  weekEndDay?: number;
  is_self_registered_company?: boolean;
  is_self_created_company?: boolean;
  creatorEmail?: string | null;
  creator?: {
    email?: string;
  } | null;
}

export type { Company };