'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/auth.context';
import {
  getUserConfig,
  createOrUpdateUserConfig,
  invalidateUserConfigCache,
} from '@/services/user-config-service';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CardWidth = 'full' | '3/4' | '1/2' | '1/4';

export interface CardConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
  width: CardWidth;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Shape used for DEFAULT_CARDS in each analytics page */
export type CardDefault = { id: string; label: string; width: CardWidth; visible?: boolean };

// Tailwind col-span mapping — referenced by both the renderer and the customizer preview
export const WIDTH_TO_COLSPAN: Record<CardWidth, string> = {
  'full': 'col-span-4',
  '3/4':  'col-span-3',
  '1/2':  'col-span-2',
  '1/4':  'col-span-1',
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 600;

/**
 * useDashboardLayout
 *
 * Per-user, per-tab card layout stored in `user_config.viewPreference.dashboardLayout[pageKey]`.
 * Supports visibility toggle, drag-to-reorder, and width selection.
 * Auto-saves with a 600 ms debounce.
 */
export function useDashboardLayout(pageKey: string, defaultCards: CardDefault[]) {
  const { user } = useAuth();

  const [cards, setCards] = useState<CardConfig[]>(() =>
    defaultCards.map((c, i) => ({ ...c, visible: c.visible ?? true, order: i })),
  );
  const [loaded, setLoaded] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const buildDefaults = useCallback(
    (): CardConfig[] =>
      defaultCards.map((c, i) => ({ ...c, visible: c.visible ?? true, order: i })),
    [defaultCards],
  );

  const mergeWithDefaults = useCallback(
    (saved: CardConfig[] | undefined | null): CardConfig[] => {
      const defaults = buildDefaults();
      if (!saved || saved.length === 0) return defaults;

      const savedMap = new Map(saved.map((c) => [c.id, c]));
      const merged: CardConfig[] = [];

      // Restore saved cards that still exist in defaults (preserves order, visibility, width)
      saved.forEach((sc) => {
        const def = defaults.find((d) => d.id === sc.id);
        if (def) {
          merged.push({
            id: sc.id,
            label: def.label,
            visible: sc.visible,
            order: sc.order,
            width: sc.width ?? def.width,  // fall back to default width for old saves
          });
        }
      });

      // Append brand-new cards (added to the app after user last saved)
      defaults.forEach((d) => {
        if (!savedMap.has(d.id)) merged.push({ ...d, order: merged.length });
      });

      return merged.sort((a, b) => a.order - b.order);
    },
    [buildDefaults],
  );

  // ── Load on mount ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const load = async () => {
      try {
        const config = await getUserConfig(user.id);
        if (cancelled) return;
        const savedLayout = config?.viewPreference?.dashboardLayout?.[pageKey];
        setCards(mergeWithDefaults(savedLayout));
      } catch {
        if (!cancelled) setCards(buildDefaults());
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user?.id, pageKey, mergeWithDefaults, buildDefaults]);

  // ── Debounced save ─────────────────────────────────────────────────────────

  const scheduleSave = useCallback(
    (newCards: CardConfig[]) => {
      if (!user?.id) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus('saving');

      saveTimerRef.current = setTimeout(async () => {
        try {
          const latestConfig = await getUserConfig(user.id).catch(() => null);
          const currentViewPref = latestConfig?.viewPreference || {};
          const newViewPref = {
            ...currentViewPref,
            dashboardLayout: {
              ...(currentViewPref.dashboardLayout || {}),
              [pageKey]: newCards,
            },
          };
          invalidateUserConfigCache(user.id);
          await createOrUpdateUserConfig(user.id, { viewPreference: newViewPref });
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch {
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('idle'), 3000);
        }
      }, DEBOUNCE_MS);
    },
    [user?.id, pageKey],
  );

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Toggle card visibility (prevents hiding the last visible card) */
  const toggleVisibility = useCallback(
    (id: string) => {
      setCards((prev) => {
        const visibleCount = prev.filter((c) => c.visible).length;
        const card = prev.find((c) => c.id === id);
        if (!card || (card.visible && visibleCount <= 1)) return prev;
        const updated = prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c));
        scheduleSave(updated);
        return updated;
      });
    },
    [scheduleSave],
  );

  /** Move a card by drag-and-drop (activeId → position of overId) */
  const reorder = useCallback(
    (activeId: string, overId: string) => {
      setCards((prev) => {
        const oldIdx = prev.findIndex((c) => c.id === activeId);
        const newIdx = prev.findIndex((c) => c.id === overId);
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev;
        const arr = [...prev];
        const [moved] = arr.splice(oldIdx, 1);
        arr.splice(newIdx, 0, moved);
        const normalized = arr.map((c, i) => ({ ...c, order: i }));
        scheduleSave(normalized);
        return normalized;
      });
    },
    [scheduleSave],
  );

  /**
   * Commit a full reorder — accepts the final ordered array of visible card IDs.
   * Used by DashboardGrid after live drag-over sorting is complete.
   */
  const reorderAll = useCallback(
    (visibleIds: string[]) => {
      setCards((prev) => {
        const idMap = new Map(prev.map((c) => [c.id, c]));
        // Reorder visible cards to match the supplied id array
        const reordered: CardConfig[] = visibleIds
          .map((id) => idMap.get(id))
          .filter((c): c is CardConfig => !!c)
          .map((c, i) => ({ ...c, order: i, visible: true }));
        // Append hidden cards after the visible ones
        const hiddenCards = prev
          .filter((c) => !c.visible)
          .map((c, i) => ({ ...c, order: reordered.length + i }));
        const result = [...reordered, ...hiddenCards];
        scheduleSave(result);
        return result;
      });
    },
    [scheduleSave],
  );

  /** Change the width of a specific card */
  const updateWidth = useCallback(
    (id: string, width: CardWidth) => {
      setCards((prev) => {
        const updated = prev.map((c) => (c.id === id ? { ...c, width } : c));
        scheduleSave(updated);
        return updated;
      });
    },
    [scheduleSave],
  );

  /** Restore all cards to default order, visibility and width */
  const resetToDefault = useCallback(() => {
    const defaults = buildDefaults();
    setCards(defaults);
    scheduleSave(defaults);
  }, [buildDefaults, scheduleSave]);

  /** Visible cards sorted by order — used for page rendering */
  const sortedVisible = cards.filter((c) => c.visible).sort((a, b) => a.order - b.order);

  return {
    cards,
    sortedVisible,
    loaded,
    saveStatus,
    toggleVisibility,
    reorder,
    reorderAll,
    updateWidth,
    resetToDefault,
  };
}


