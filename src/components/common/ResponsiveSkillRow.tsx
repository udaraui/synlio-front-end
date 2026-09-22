'use client';

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ResponsiveSkillRowProps {
  skills: any[];
}

const GAP = 6; // px – matches gap-1.5 (6px)

const ResponsiveSkillRow: React.FC<ResponsiveSkillRowProps> = ({ skills = [] }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(skills.length);

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
      const needed = accumulated + bw + (isLast ? 0 : moreWidth);

      if (needed <= available) {
        accumulated += bw;
        count++;
      } else {
        break;
      }
    }

    setVisibleCount(Math.max(0, count));
  }, []);

  useLayoutEffect(() => {
    recalculate();
  }, [skills, recalculate]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver(recalculate);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [recalculate]);

  if (skills.length === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-dashed border-gray-400 dark:border-gray-700 bg-transparent dark:bg-transparent text-[11px] font-medium text-gray-400 italic">
        No skills
      </span>
    );
  }

  const visibleSkills = skills.slice(0, visibleCount);
  const hiddenSkills = skills.slice(visibleCount);

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Hidden measurement layer */}
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
        {skills.map((skill, i) => (
          <div
            key={i}
            data-badge-measure
            className="inline-flex items-center px-2.5 py-0.5 border rounded-md text-xs whitespace-nowrap"
            style={{ marginRight: GAP }}
          >
            <span>{skill.skillName}</span>
          </div>
        ))}
        {/* "+more" button measurement */}
        <div
          data-more-measure
          className="inline-flex items-center px-2.5 py-0.5 border rounded-md text-xs whitespace-nowrap"
        >
          <span>+{skills.length}</span>
        </div>
      </div>

      {/* Visible row */}
      <div
        className="flex items-center overflow-hidden"
        style={{ gap: GAP }}
      >
        {visibleSkills.map((skill: any, i: number) => (
          <TooltipProvider key={i}>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md border border-primary bg-primary text-xs font-medium text-white dark:text-black whitespace-nowrap flex-shrink-0">
                  {skill.skillName}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="p-2 min-w-[120px] bg-white dark:bg-gray-800 border border-border shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {skill?.skillLevelName || "Level"}
                  </span>
                  <div className="flex text-yellow-500">
                    {[...Array(5)].map((_, index) => (
                      <span
                        key={index}
                        className={index < (skill?.starCount || 0) ? "opacity-100" : "opacity-20"}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}

        {hiddenSkills.length > 0 && (
          <HoverCard openDelay={100} closeDelay={100}>
            <HoverCardTrigger asChild>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md border border-primary text-primary border-dashed bg-transparent text-xs dark:bg-transparent dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors whitespace-nowrap select-none flex-shrink-0">
                +{hiddenSkills.length}
              </span>
            </HoverCardTrigger>
            <HoverCardContent
              side="top"
              align="start"
              className="w-max min-w-[224px] p-2 z-50 bg-white dark:bg-gray-800 border-border shadow-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col max-h-52 overflow-y-auto">
                {hiddenSkills.map((skill: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 py-1.5 px-1 border-b border-border last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-none transition-colors"
                  >
                    <span className="text-xs text-gray-800 dark:text-gray-200 font-medium">
                      {skill.skillName}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-gray-500 capitalize">
                        {skill?.skillLevelName || "Level"}
                      </span>
                      <div className="flex text-yellow-500">
                        {[...Array(5)].map((_, index) => (
                          <span
                            key={index}
                            className={`text-[10px] ${index < (skill?.starCount || 0) ? "opacity-100" : "opacity-20"}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
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

export default ResponsiveSkillRow;
