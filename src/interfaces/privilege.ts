interface Privilege {
  id: number;
  privilege: string;
  group: string;
  description: string;
  access_key: string;
}

export type { Privilege };