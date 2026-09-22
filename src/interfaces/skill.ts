import { Company } from "./company";

interface Skill {
  id: number;
  name: string;
  categoryId: number;
  isActive?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string;
  updatedAt?: Date;
}

interface SkillCategory {
  id: number;
  name: string;
  description: string;
  companyId: number;
  isActive?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string;
  updatedAt?: Date;
}

interface Skill_level {
  id: number;
  name: string;
  star_count: number;
  categoryId: number;
  isActive?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string;
  updatedAt?: Date;
}
export type { Skill, SkillCategory, Skill_level };