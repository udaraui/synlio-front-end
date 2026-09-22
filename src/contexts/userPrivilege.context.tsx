'use client';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import Cookies from 'js-cookie';
import { decodeJwt, getPrivilegesForCompany } from '@/lib/jwt-utils';

interface PrivilegeContextProps {
  selectedPrivileges: string[];
  /** Call this when the active company changes — re-derives privileges from the JWT */
  setActiveCompany: (companyId: number) => void;
  /** Kept for backward compatibility; no longer writes to localStorage */
  setPrivilegesAndPersist: (privileges: string[]) => void;
  loadFromStorage: () => void;
}

const PrivilegeContext = createContext<PrivilegeContextProps | undefined>(undefined);

function getActiveCompanyId(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('active_company');
    const company = raw ? JSON.parse(raw) : null;
    return company?.companyId ?? (company === 0 ? 0 : null);
  } catch {
    return null;
  }
}

function derivePrivilegesFromJwt(companyId: number | null): string[] {
  const token = Cookies.get('accessToken');
  if (!token) return [];
  const payload = decodeJwt(token);
  
  // Treat null/undefined/0 as the same (system-wide identifier)
  const targetCompanyId = (companyId === 0 || companyId === null || companyId === undefined) ? null : companyId;
  
  return getPrivilegesForCompany(payload, targetCompanyId);
}

export const PrivilegeProvider = ({ children }: { children: ReactNode }) => {
  const [selectedPrivileges, setSelectedPrivileges] = useState<string[]>([]);

  // Bootstrap: read active company → decode JWT → derive privileges
  const loadFromStorage = useCallback(() => {
    const companyId = getActiveCompanyId();
    setSelectedPrivileges(derivePrivilegesFromJwt(companyId));
  }, []);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  /** When the user switches company, re-derive privileges from the same JWT */
  const setActiveCompany = useCallback((companyId: number) => {
    setSelectedPrivileges(derivePrivilegesFromJwt(companyId));
  }, []);

  /** Backward-compatible shim — now just updates state, no localStorage writes */
  const setPrivilegesAndPersist = useCallback((privs: string[]) => {
    setSelectedPrivileges(privs);
  }, []);

  return (
    <PrivilegeContext.Provider
      value={{
        selectedPrivileges,
        setActiveCompany,
        setPrivilegesAndPersist,
        loadFromStorage,
      }}
    >
      {children}
    </PrivilegeContext.Provider>
  );
};

export const usePrivilege = (): PrivilegeContextProps => {
  const ctx = useContext(PrivilegeContext);
  if (!ctx) throw new Error('usePrivilege must be used within a PrivilegeProvider');
  return ctx;
};
