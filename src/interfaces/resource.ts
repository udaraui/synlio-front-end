import { Company } from "./company";
import { Division } from "./division";
import { Calendar } from "./calendar";
import { Skill } from "./skill";
import { ResourceSkills } from "./resource_skills";

interface Resource {
  id: number;
  resourceId?: number; // Some endpoints return resourceId instead of id
  first_name: string;
  last_name: string;
  email: string;
  profile_pic?: string;
  working_hours: number;
  company?: Company;
  division?: Division;
  calendar?: Calendar;
  resourceSkills?: ResourceSkills[];
  active_status?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string;
  updatedAt?: Date;
}

export type { Resource };