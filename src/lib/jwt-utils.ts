export interface JwtPrivilegeEntry {
  companyId: number | null;
  privilegeIds: number[];
}

export interface JwtPayload {
  userId: number;
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  privileges: JwtPrivilegeEntry[];
  iat: number;
  exp: number;
}


export function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64Payload = token.split('.')[1];
    if (!base64Payload) return null;
    const base64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

export function getPrivilegesForCompany(
  payload: JwtPayload | null,
  companyId: number | null,
): string[] {
  if (!payload?.privileges) return [];

  // Normalize companyId: treat 0, null, and undefined as the same (system-wide)
  const targetId = (companyId === 0 || companyId === null || companyId === undefined) ? null : companyId;

  const entry = payload.privileges.find((p) => {
    const entryId = (p.companyId === 0 || p.companyId === null || p.companyId === undefined) ? null : p.companyId;
    return entryId === targetId;
  });
  
  return entry ? entry.privilegeIds.map(String) : [];
}
