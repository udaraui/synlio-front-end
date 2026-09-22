import { Company } from "./company";

export interface Division {
  id: number;
  division: string;
  division_code: string;
  isActive: boolean;
  companyId: number;
  company: Company;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}