import { number } from "zod";
import { Role } from "./role";
import { Company } from "./company";
import { User } from "./user";

export interface UserCompanyRole{
    id: number;
    company_id: number;
    role_id: number;
    user_id: number;
    role?: Role;
    company?: Company;
    user?: User;
}