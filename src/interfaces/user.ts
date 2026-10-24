import { Division } from "./division";
import { UserCompanyRole } from "./user-company-role";
import { Company } from '@/interfaces/company';
import { Role } from './role';

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  mobile_number?: string;
  isActive: boolean;
  profile_picture?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  divisions?: Division[];
  companies?: Company[];
  roles?: Role[];
  userCompanyRoles?: UserCompanyRole[];
}
