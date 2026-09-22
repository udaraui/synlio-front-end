import { Company } from '@/interfaces/company';
import { Base } from '@/interfaces/common/base.model';
import { Division } from '@/interfaces/division';
import { Resource } from '@/interfaces/resource';
import { User } from '@/interfaces/user';

interface ResourcePool extends Base {
  name: string;
  company: Company;
  division: Division;
  resources: Resource[];
  pool_owner: User;
}

export type { ResourcePool };