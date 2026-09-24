import { useState, useEffect, useRef } from 'react';
import { createOrUpdateUserConfig, getUserConfig } from '@/services/user-management/user-config-service';

export function useViewPreference<T extends string>(
  pageKey: string,
  availableViews: T[],
  defaultView: T,
  userId?: number | null
): [T, (view: T) => void] {
  const STORAGE_KEY = 'user_view_preferences';
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const availableViewsRef = useRef<T[]>(availableViews);

  // Update ref when availableViews changes
  useEffect(() => {
    availableViewsRef.current = availableViews;
  }, [availableViews]);

  // Initialize state with value from localStorage or default
  const [viewMode, setViewModeState] = useState<T>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedPreferences = localStorage.getItem(STORAGE_KEY);
        if (savedPreferences) {
          const preferences = JSON.parse(savedPreferences);

          // Use page-specific preference if available
          if (preferences[pageKey] && availableViews.includes(preferences[pageKey] as T)) {
            return preferences[pageKey] as T;
          }
        }
      } catch (error) {
        console.error('Error reading view preference from localStorage:', error);
      }
    }
    return defaultView;
  });

  // Load user preferences from backend on mount (only once)
  useEffect(() => {
    const loadUserPreferences = async () => {
      // Prevent duplicate loads
      if (isLoadingRef.current || hasLoadedRef.current) return;

      if (userId && typeof window !== 'undefined') {
        isLoadingRef.current = true;
        try {
          const userConfig = await getUserConfig(userId);
          if (userConfig?.viewPreference) {
            // Update localStorage with backend preferences
            localStorage.setItem(STORAGE_KEY, JSON.stringify(userConfig.viewPreference));

            // Update current page view if available
            const pagePreference = userConfig.viewPreference[pageKey];
            if (pagePreference && availableViewsRef.current.includes(pagePreference as T)) {
              setViewModeState(pagePreference as T);
            }
          }
          hasLoadedRef.current = true;
        } catch (error) {
          console.error('Error loading user preferences from backend:', error);
        } finally {
          isLoadingRef.current = false;
        }
      }
    };

    loadUserPreferences();
  }, [userId, pageKey]); // Removed availableViews dependency

  // Listen for view changes from other components/pages
  useEffect(() => {
    // Listen for storage changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const preferences = JSON.parse(e.newValue);
          const pagePreference = preferences[pageKey];

          // Update view if the page preference is available and different
          if (pagePreference && availableViewsRef.current.includes(pagePreference as T) && pagePreference !== viewMode) {
            setViewModeState(pagePreference as T);
          }
        } catch (error) {
          console.error('Error parsing storage change:', error);
        }
      }
    };

    // Listen for custom event for same-page updates
    // This is only for updating OTHER instances, not the one that triggered the change
    const handleViewChange = ((e: CustomEvent) => {
      if (e.detail.pageKey === pageKey && e.detail.view !== viewMode) {
        const newView = e.detail.view;
        if (newView && availableViewsRef.current.includes(newView as T)) {
          setViewModeState(newView as T);
        }
      }
    }) as EventListener;

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('viewPreferenceChanged', handleViewChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('viewPreferenceChanged', handleViewChange);
    };
  }, [pageKey, viewMode]); // Removed availableViews dependency

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  // Custom setter that updates both state and localStorage (and optionally backend with debouncing)
  const setViewMode = async (newView: T) => {
    // Don't do anything if the view is already set
    if (newView === viewMode) return;

    setViewModeState(newView);

    if (typeof window !== 'undefined') {
      try {
        const savedPreferences = localStorage.getItem(STORAGE_KEY);
        const preferences = savedPreferences ? JSON.parse(savedPreferences) : {};

        // Save page-specific preference
        preferences[pageKey] = newView;

        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

        // Debounce backend sync to avoid unnecessary API calls (wait 1 second)
        if (userId) {
          // Clear existing timer
          if (syncTimerRef.current) {
            clearTimeout(syncTimerRef.current);
          }

          // Set new timer to sync after 1 second of inactivity
          syncTimerRef.current = setTimeout(async () => {
            try {
              await createOrUpdateUserConfig(userId, { viewPreference: preferences });
            } catch (error) {
              console.error('Error syncing view preference to backend:', error);
              // Continue anyway - localStorage is already updated
            }
          }, 1000); // 1 second debounce
        }

        // Dispatch custom event to notify other components on the same page
        // Other instances will update their state without triggering their own API call
        const event = new CustomEvent('viewPreferenceChanged', {
          detail: { pageKey, view: newView }
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Error saving view preference to localStorage:', error);
      }
    }
  };

  return [viewMode, setViewMode];
}


