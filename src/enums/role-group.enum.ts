export enum RoleGroup {
  PROJECT_MANAGEMENT = 'Project Management',
  TICKET_MANAGEMENT = 'Ticket Management',
  RESOURCE_MANAGEMENT = 'Resource Management',
}

// Helper function to get all role group values
export const getRoleGroups = (): string[] => {
  return Object.values(RoleGroup);
};

// Helper function to get role group display name
export const getRoleGroupLabel = (group: RoleGroup | string): string => {
  return group as string;
};

