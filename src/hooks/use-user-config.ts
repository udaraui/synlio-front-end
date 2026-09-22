import { useState, useEffect, useCallback } from 'react';
import { getUserConfig, createOrUpdateUserConfig, UserConfig } from '@/services/user-config-service';

/**
 * Custom hook to manage user configuration with backend sync
 * @param userId - The user ID
 * @returns User config state and update functions
 */
export function useUserConfig(userId: number | null) {
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user config from backend
  const loadUserConfig = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const config = await getUserConfig(userId);
      setUserConfig(config);

      // Sync to localStorage for offline access
      if (config) {
        if (config.theme) {
          localStorage.setItem('theme', config.theme);
        }
        if (config.viewPreference) {
          localStorage.setItem('user_view_preferences', JSON.stringify(config.viewPreference));
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load user config');
      console.error('Error loading user config:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Update user config in backend and localStorage
  const updateUserConfig = useCallback(async (updates: {
    theme?: string;
    viewPreference?: any;
    primaryColor?: string;
    sidebarColor?: string;
  }) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const updatedConfig = await createOrUpdateUserConfig(userId, updates);
      setUserConfig(updatedConfig);

      // Sync to localStorage
      if (updatedConfig.theme) {
        localStorage.setItem('theme', updatedConfig.theme);
      }
      if (updatedConfig.viewPreference) {
        localStorage.setItem('user_view_preferences', JSON.stringify(updatedConfig.viewPreference));
      }
      if (updatedConfig.primaryColor) {
        localStorage.setItem('primary-color', updatedConfig.primaryColor);
      }
      if (updatedConfig.sidebarColor) {
        localStorage.setItem('sidebar-color', updatedConfig.sidebarColor);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update user config');
      console.error('Error updating user config:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Update theme
  const updateTheme = useCallback(async (theme: string) => {
    await updateUserConfig({ theme });
  }, [updateUserConfig]);

  // Update view preference
  const updateViewPreference = useCallback(async (viewPreference: any) => {
    await updateUserConfig({ viewPreference });
  }, [updateUserConfig]);

  // Update primary color
  const updatePrimaryColor = useCallback(async (primaryColor: string) => {
    await updateUserConfig({ primaryColor });
  }, [updateUserConfig]);

  // Update sidebar color
  const updateSidebarColor = useCallback(async (sidebarColor: string) => {
    await updateUserConfig({ sidebarColor });
  }, [updateUserConfig]);

  // Load config on mount
  useEffect(() => {
    if (userId) {
      loadUserConfig();
    }
  }, [userId, loadUserConfig]);

  return {
    userConfig,
    loading,
    error,
    updateUserConfig,
    updateTheme,
    updateViewPreference,
    updatePrimaryColor,
    updateSidebarColor,
    reload: loadUserConfig,
  };
}
