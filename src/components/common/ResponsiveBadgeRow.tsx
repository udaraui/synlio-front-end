'use client';

/**
 * ResponsiveBadgeRow
 *
 * Renders status-count badges in a flex row and automatically hides overflowing
 * badges into a dashed "+N more" HoverCard button.  The number of visible badges
 * is recalculated whenever the container resizes, so it works correctly at every
 * card width produced by the responsive grid (1 / 2 / 3 / 4 columns).
 *
 * How it works
 * ─────────────
 * 1. A hidden "measurement" div (aria-hidden, visibility:hidden, position:absolute)
 *    renders ALL badges + the "+more" button so their natural widths can be read.
 * 2. A ResizeObserver watches the visible container.  On every size change it walks
 *    the measured badge widths left-to-right, accumulating width until the next
 *    badge + the "+more" button would overflow.  The count at that point is saved
 *    as `visibleCount`.
 * 3. The visible row renders only `statusCounts.slice(0, visibleCount)` and shows
 *    the "+more" HoverCard for the rest.
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Plus } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

export interface BadgeItem {
  statusId: number;
  name: string;
  color: string;
  count: number;
}

interface ResponsiveBadgeRowProps {
  items: BadgeItem[];
  emptyText?: string;
  /** Accent colour used for hover ring on the "+more" button.  Defaults to gray. */
  accentClass?: string;
  hideColorCircle?: boolean;
}

const GAP = 6; // px – matches gap-1.5 (6px)

const ResponsiveBadgeRow: React.FC<ResponsiveBadgeRowProps> = ({
  items,
  emptyText = 'None yet',
  accentClass = '',
  hideColorCircle = false,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null); // full-width reference for RO
  const measureRef = useRef<HTMLDivElement>(null); // hidden sibling for widths
  const [visibleCount, setVisibleCount] = useState(items.length);

  const recalculate = useCallback(() => {
    const wrapper = wrapperRef.current;
    const measure = measureRef.current;
    if (!wrapper || !measure) return;

    const available = wrapper.clientWidth;
    if (available === 0) return;

    const badgeEls = Array.from(
      measure.querySelectorAll<HTMLElement>('[data-badge-measure]'),
    );
    const moreEl = measure.querySelector<HTMLElement>('[data-more-measure]');
    const moreWidth = moreEl ? moreEl.offsetWidth + GAP : 0;

    let accumulated = 0;
    let count = 0;

    for (let i = 0; i < badgeEls.length; i++) {
      const bw = badgeEls[i].offsetWidth + GAP;
      const isLast = i === badgeEls.length - 1;
      // If this is the last badge we don't need room for "+more"
      const needed = accumulated + bw + (isLast ? 0 : moreWidth);

      if (needed <= available) {
        accumulated += bw;
        count++;
      } else {
        break;
      }
    }

    setVisibleCount(Math.max(1, count));
  }, []);

  // Re-measure when items change (new data arrives)
  useLayoutEffect(() => {
    recalculate();
  }, [items, recalculate]);

  // Re-measure whenever the card width changes
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver(recalculate);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [recalculate]);

  if (items.length === 0) {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500 italic">
        {emptyText}
      </span>
    );
  }

  const visibleBadges = items.slice(0, visibleCount);
  const hiddenBadges = items.slice(visibleCount);

  return (
    // Wrapper: full width, position:relative so the measurement div can sit
    // absolutely here WITHOUT being clipped by the overflow:hidden row below.
    <div ref={wrapperRef} className="relative w-full">
      {/* ── Hidden measurement layer (NOT inside the overflow-hidden row) ── */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          top: 0,
          left: 0,
          display: 'flex',
          alignItems: 'center',
          zIndex: -1,
        }}
      >
        {items.map((item) => (
          <div
            key={item.statusId}
            data-badge-measure
            className="flex items-center gap-1 px-2 py-0.5 border rounded-md text-xs whitespace-nowrap"
            style={{ marginRight: GAP }}
          >
            {!hideColorCircle && <div className="w-2 h-2 rounded-full flex-shrink-0" />}
            <span>{item.name}</span>
            <span>{item.count}</span>
          </div>
        ))}
        {/* "+more" button measurement */}
        <div
          data-more-measure
          className="flex items-center gap-1 px-2 py-0.5 border rounded-md text-xs whitespace-nowrap"
        >
          <Plus className="h-3 w-3" />
          <span>{items.length}</span>
        </div>
      </div>

      {/* ── Visible row ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center overflow-hidden"
        style={{ gap: GAP }}
      >
        {visibleBadges.map((item) => (
          <div
            key={item.statusId}
            className="flex items-center gap-1 px-2 py-0.5 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md text-xs whitespace-nowrap flex-shrink-0"
            title={`${item.name}: ${item.count} item${item.count !== 1 ? 's' : ''}`}
          >
            {!hideColorCircle && (
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {item.count}
            </span>
          </div>
        ))}

        {hiddenBadges.length > 0 && (
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <div
                className={`flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-gray-800 border border-dashed border-gray-400 dark:border-gray-500 rounded-md text-xs whitespace-nowrap cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex-shrink-0 ${accentClass}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Plus className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400 font-semibold">
                  {hiddenBadges.length}
                </span>
              </div>
            </HoverCardTrigger>
            <HoverCardContent
              className="p-2 w-fit"
              side="top"
              align="start"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-1">
                {hiddenBadges.map((item) => (
                  <div
                    key={item.statusId}
                    className="inline-flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-xs whitespace-nowrap w-fit"
                  >
                    {!hideColorCircle && (
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                    <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </HoverCardContent>
          </HoverCard>
        )}
      </div>
    </div>
  );
};

export default ResponsiveBadgeRow;

