'use client';
import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import Cookies from 'js-cookie'; // NEW: Import js-cookie
import {
  setAuthToken,
  setTokenUpdater,
} from '@/lib/interceptors/axiosInstance';
import { getUserConfig, createOrUpdateUserConfig, UserConfig } from '@/services/user-management/user-config-service';
import { clearResourceCache } from '@/lib/resource-cache';

// Define cookie/storage keys as constants
const TOKEN_COOKIE_KEY = 'accessToken';
const USER_STORAGE_KEY = 'user';

interface User {
  id: number;
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
}

interface AuthContextType {
  accessToken: string | null;
  user: User | null;
  userConfig: UserConfig | null;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: (redirectUrl?: string) => void;
  updateTheme: (theme: string) => Promise<void>;
  updateViewPreference: (viewPreference: any) => Promise<void>;
  updatePrimaryColor: (primaryColor: string) => Promise<void>;
  updateSidebarColor: (sidebarColor: string) => Promise<void>;
  loadUserConfig: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user config from backend
  const loadUserConfig = useCallback(async () => {
    if (!user?.id) return;

    if (typeof window !== 'undefined') {
      const companiesStr = localStorage.getItem("companies");
      if (companiesStr) {
        try {
          const companies = JSON.parse(companiesStr);
          if (Array.isArray(companies) && companies.length === 0) {
            return; // Don't fetch user config for system users
          }
        } catch (e) { }
      }
    }

    try {
      const config = await getUserConfig(user.id);
      // Config might be null if it doesn't exist yet (first time user)
      if (config) {
        setUserConfig(config);

        // Apply theme to localStorage and document
        if (config.theme) {
          localStorage.setItem('theme', config.theme);
          // Dispatch storage event to notify theme provider
          window.dispatchEvent(new Event('storage'));
        }

        // Apply view preference to localStorage
        if (config.viewPreference) {
          localStorage.setItem('user_view_preferences', JSON.stringify(config.viewPreference));
        }

        // Apply primary color to localStorage and CSS
        if (config.primaryColor) {
          localStorage.setItem('primary-color', config.primaryColor);
          // Apply to CSS variables if needed
          if (config.primaryColor !== 'default' && typeof window !== 'undefined') {
            const root = document.documentElement;
            root.style.setProperty('--primary', config.primaryColor);
          }
        }

        // Apply sidebar color to localStorage and CSS
        if (config.sidebarColor) {
          localStorage.setItem('sidebar-color', config.sidebarColor);
          // Apply to CSS variables if needed
          if (config.sidebarColor !== 'default' && typeof window !== 'undefined') {
            const root = document.documentElement;
            root.style.setProperty('--sidebar', config.sidebarColor);
          }
        }

        const userFilters = config.filterPreference ? config.filterPreference : {};



        if (userFilters.ticket) {
          sessionStorage.setItem('TICKET_FILTERS_SESSION_KEY', JSON.stringify(userFilters.ticket));
        }
      } else {
        // No config exists yet - will be created on first update
        setUserConfig(null);
      }
    } catch (error: any) {
      // Handle any unexpected errors
      console.error('Error loading user config:', error);
    }
  }, [user?.id]);

  // Update theme and sync to backend
  const updateTheme = useCallback(async (theme: string) => {
    if (!user?.id) return;

    try {
      // Update localStorage immediately for responsive UI
      localStorage.setItem('theme', theme);

      // Sync to backend
      const updatedConfig = await createOrUpdateUserConfig(user.id, { theme });
      setUserConfig(updatedConfig);
    } catch (error) {
      console.error('Error updating theme:', error);
      throw error;
    }
  }, [user?.id]);

  // Update view preference and sync to backend
  const updateViewPreference = useCallback(async (viewPreference: any) => {
    if (!user?.id) return;

    try {
      // Update localStorage immediately for responsive UI
      localStorage.setItem('user_view_preferences', JSON.stringify(viewPreference));

      // Sync to backend
      const updatedConfig = await createOrUpdateUserConfig(user.id, { viewPreference });
      setUserConfig(updatedConfig);
    } catch (error) {
      console.error('Error updating view preference:', error);
      throw error;
    }
  }, [user?.id]);

  // Update primary color and sync to backend
  const updatePrimaryColor = useCallback(async (primaryColor: string) => {
    if (!user?.id) return;

    try {
      // Update localStorage immediately for responsive UI
      localStorage.setItem('primary-color', primaryColor);

      // Apply to CSS variables
      if (typeof window !== 'undefined') {
        const root = document.documentElement;
        if (primaryColor === 'default') {
          root.style.removeProperty('--primary');
        } else {
          root.style.setProperty('--primary', primaryColor);
        }
      }

      // Sync to backend
      const updatedConfig = await createOrUpdateUserConfig(user.id, { primaryColor });
      setUserConfig(updatedConfig);
    } catch (error) {
      console.error('Error updating primary color:', error);
      throw error;
    }
  }, [user?.id]);

  // Update sidebar color and sync to backend
  const updateSidebarColor = useCallback(async (sidebarColor: string) => {
    if (!user?.id) return;

    try {
      // Update localStorage immediately for responsive UI
      localStorage.setItem('sidebar-color', sidebarColor);

      // Apply to CSS variables
      if (typeof window !== 'undefined') {
        const root = document.documentElement;
        if (sidebarColor === 'default') {
          root.style.removeProperty('--sidebar');
          root.style.removeProperty('--sidebar-foreground');
        } else {
          root.style.setProperty('--sidebar', sidebarColor);
        }
      }

      // Sync to backend
      const updatedConfig = await createOrUpdateUserConfig(user.id, { sidebarColor });
      setUserConfig(updatedConfig);
    } catch (error) {
      console.error('Error updating sidebar color:', error);
      throw error;
    }
  }, [user?.id]);

  // MODIFIED: This function now also sets the cookie
  const login = useCallback((token: string, userData: User) => {
    setAccessToken(token);
    setUser(userData);
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      Cookies.set(TOKEN_COOKIE_KEY, token, {
        expires: 1, // Expires in 1 day
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
    }
  }, []);

  // MODIFIED: This function now calls backend and clears all cookies and localStorage
  const logout = useCallback(async (redirectUrl?: string) => {
    try {
      // Call backend logout endpoint to clear httpOnly cookies and invalidate refresh token
      const { logout: logoutAPI } = await import('@/services/auth/auth-service');
      await logoutAPI();
    } catch (error) {
      console.error('Backend logout failed, but continuing with client-side cleanup:', error);
    }

    // Preserve theme and user_view_preferences only
    const theme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const viewPreferences = typeof window !== 'undefined' ? localStorage.getItem('user_view_preferences') : null;
    const ticketFilterPreferences = typeof window !== 'undefined' ? sessionStorage.getItem('TICKET_FILTERS_SESSION_KEY') : null;

    // Clear state first
    setAccessToken(null);
    setUser(null);
    clearResourceCache();

    if (typeof window !== 'undefined') {
      // Clear all localStorage data
      localStorage.clear();

      // Restore preserved data
      if (theme) {
        localStorage.setItem('theme', theme);
      }
      if (viewPreferences) {
        localStorage.setItem('user_view_preferences', viewPreferences);
      }

      if (ticketFilterPreferences) {
        sessionStorage.setItem('TICKET_FILTERS_SESSION_KEY', ticketFilterPreferences);
      }

      // Clear all cookies (not just accessToken)
      const allCookies = Cookies.get();
      Object.keys(allCookies).forEach(cookieName => {
        Cookies.remove(cookieName);
        // Try removing with different path options to ensure cleanup
        Cookies.remove(cookieName, { path: '/' });
        Cookies.remove(cookieName, { path: '', domain: window.location.hostname });
      });

      // Clear all sessionStorage data
      sessionStorage.clear();

      // Set logout flag in sessionStorage to show toast on login page (after clearing)
      sessionStorage.setItem('logout_message', 'You have been logged out');

      // Redirect to login page
      setTimeout(() => {
        window.location.href = redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login';
      }, 100);
    }
  }, []);

  // NEW: A function to handle token updates from the interceptor
  const handleTokenUpdate = useCallback((token: string | null) => {
    if (token) {
      // This is a token refresh scenario
      setAccessToken(token);
      Cookies.set(TOKEN_COOKIE_KEY, token, {
        expires: 1,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
    } else {
      // This is a token refresh failure scenario, so log out
      logout();
    }
  }, [logout]);

  // MODIFIED: Rehydration effect now loads token from the cookie
  useEffect(() => {
    try {
      const storedToken = Cookies.get(TOKEN_COOKIE_KEY);
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (storedToken) {
        setAccessToken(storedToken);
      }
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Could not rehydrate auth state:', error);
      // If rehydration fails, ensure clean state
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  // MODIFIED: useEffect to set up the interceptor bridge
  // This now uses the new handleTokenUpdate function
  useEffect(() => {
    // Pass the current token to the axios instance
    setAuthToken(accessToken);
    // Pass the updater function to the axios instance
    setTokenUpdater(handleTokenUpdate);
  }, [accessToken, handleTokenUpdate]);

  // NEW: Load user config when user is set
  useEffect(() => {
    if (user?.id && accessToken) {
      loadUserConfig();
    }
  }, [user?.id, accessToken, loadUserConfig]);

  return (
    <AuthContext.Provider value={{
      accessToken,
      user,
      userConfig,
      isLoading,
      login,
      logout,
      updateTheme,
      updateViewPreference,
      updatePrimaryColor,
      updateSidebarColor,
      loadUserConfig,
    }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};