import { Company } from "./company";
import { Privilege } from "./privilege";

interface Role {
  id: number;
  role: string;
  company?: Company;
  companyId?: number | string;
  group?: string;
  privileges?: Privilege[];
  active_status?: boolean;
  createdBy?: string;
  createdAt?: Date | string;
  updatedBy?: string;
  updatedAt?: Date | string;
}

export type { Role };
