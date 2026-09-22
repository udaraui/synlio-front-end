export interface UserConfig {
  id: number;
  userId: number;
  theme: string;
  viewPreference: any;
  primaryColor: string;
  sidebarColor: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}
