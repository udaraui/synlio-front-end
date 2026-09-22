import { useMenuAccess } from "@/hooks/use-menu-access";
// import { usePrivilege } from "@/contexts/userPrivilege.context";
// import { useMemo } from "react";

export const usePrivilegeGuard = (requiredPrivilege: string): boolean => {
  // NEW ROBUST LOGIC: uses fallback JWT parsing
  const { canAccess } = useMenuAccess();
  return canAccess([requiredPrivilege]);

  /* OLD LOGIC (Prone to race conditions on first render before context hydrates)
  const { selectedPrivileges } = usePrivilege();

  const hasPrivilege = useMemo(() => {
    const normalizedRequired = requiredPrivilege.trim().toLowerCase();
    return selectedPrivileges.some(privilege => 
      privilege.trim().toLowerCase() === normalizedRequired
    );
  }, [selectedPrivileges, requiredPrivilege]);

  return hasPrivilege;
  */
};
