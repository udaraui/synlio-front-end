import { Company } from "./company";
import { Privilege } from "./privilege";

interface Role {
  id: number;
  role: string;
  company?: Company;
  privileges?: Privilege[];
  active_status?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string;
  updatedAt?: Date;
}

export type { Role };