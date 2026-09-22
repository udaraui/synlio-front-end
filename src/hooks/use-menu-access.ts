import { useMemo, useCallback } from "react";
import { usePrivilege } from "@/contexts/userPrivilege.context";
import Cookies from "js-cookie";
import { decodeJwt, getPrivilegesForCompany } from "@/lib/jwt-utils";

export const useMenuAccess = () => {
  const { selectedPrivileges = [] } = usePrivilege();

  const normSet = useMemo(() => {
    const s = new Set<string>();

    // 1. Priority: Use Context if available (source of truth)
    if (selectedPrivileges && selectedPrivileges.length > 0) {
      selectedPrivileges.forEach((p) => s.add(p.trim().toLowerCase()));
      return s;
    }

    // 2. Fallback: Decode JWT directly (handles page refresh before context hydrates)
    if (typeof window !== "undefined") {
      try {
        const token = Cookies.get("accessToken");
        const payload = token ? decodeJwt(token) : null;
        const activeCompanyRaw = localStorage.getItem("active_company");
        let companyId: number | null = null;
        if (activeCompanyRaw && activeCompanyRaw !== "undefined") {
          const parsed = JSON.parse(activeCompanyRaw);
          companyId = typeof parsed === 'object' ? parsed?.companyId : (parsed === 0 ? null : parsed);
        }
        const privs = getPrivilegesForCompany(payload, companyId);
        privs.forEach((p) => s.add(p.trim().toLowerCase()));
      } catch (e) {
        console.error("Failed to decode JWT privileges", e);
      }
    }

    return s;
  }, [selectedPrivileges]);

  const canAccess = useCallback(
    (codes?: string[]) => {
      // If no codes defined, it's public (allowed)
      if (!codes || codes.length === 0) return true;

      // Check if ANY of the required codes exist in user's privileges
      return codes.some((c) => normSet.has(c.trim().toLowerCase()));
    },
    [normSet]
  );

  return { canAccess };
};