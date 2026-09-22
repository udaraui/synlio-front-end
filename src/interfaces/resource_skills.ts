import { Resource } from "./resource";
import { Skill, Skill_level, SkillCategory } from "./skill";

export interface ResourceSkills {
  id: number;
  resource_id?: number;
  resource?: Resource;
  skill_id?: number;
  skill?: Skill;
  skill_category_id?: number;
  skillCategory?: SkillCategory;
  skill_level_id?: number;
  skillLevel?: Skill_level;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string | null;
}
