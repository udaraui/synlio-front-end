"use client";

import React, { useRef, useEffect } from "react";
import { SparklesIcon } from "@animateicons/react/lucide";
import { type IconHandle } from "@animateicons/react";
import { Button } from "@/components/ui/button";
import { useMenuAccess } from "@/hooks/use-menu-access";
import { toast } from "sonner";

export interface CopilotToolbarButtonProps {
  onClick: () => void;
  title?: string;
  label?: string;
  className?: string;
  iconClassName?: string;
  containerClassName?: string;
  privilegeCode?: string | string[];
  unauthorizedMessage?: string;
  showDivider?: boolean;
  dividerClassName?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function CopilotToolbarButton({
  onClick,
  privilegeCode = ["120"],
  unauthorizedMessage = "You are not authorized to use Synlio Co-Pilot",
  showDivider = true,
  variant = "outline",
}: CopilotToolbarButtonProps) {
  const { canAccess } = useMenuAccess();
  const iconRef = useRef<IconHandle>(null);

  // Smooth, calm animation loop
  useEffect(() => {
    let isMounted = true;
    const animDuration = 1.2; // Slower, smoother, more elegant motion

    const runLoop = async () => {
      // Initial gentle delay on mount
      await new Promise((r) => setTimeout(r, 400));

      while (isMounted) {
        if (!iconRef.current) break;

        // Run animation and await natural completion (~960ms at duration 1.2)
        const animResult = iconRef.current.startAnimation() as unknown;
        if (animResult && typeof (animResult as Promise<void>).then === "function") {
          await animResult;
        } else {
          await new Promise((r) => setTimeout(r, Math.round(900 * animDuration)));
        }

        if (!isMounted) break;

        // Reset to normal state cleanly
        iconRef.current?.stopAnimation();

        // Calm breathing pause before the next iteration
        await new Promise((r) => setTimeout(r, 800));
      }
    };

    runLoop();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const codes = Array.isArray(privilegeCode) ? privilegeCode : [privilegeCode];
    if (!canAccess(codes)) {
      toast.error(unauthorizedMessage);
      return;
    }
    iconRef.current?.startAnimation();
    onClick();
  };

  const handleMouseEnter = () => {
    iconRef.current?.startAnimation();
  };

  return (
    <div className="ml-auto flex items-center gap-1.5 shrink-0">
      {showDivider && <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1 shrink-0" />}

      {/* Synlio Logo Gradient: Mint/Teal -> Cyan -> Royal Blue -> Violet -> Purple */}
      <svg
        width="0"
        height="0"
        className="absolute pointer-events-none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient
            id="synlio-logo-gradient"
            gradientUnits="userSpaceOnUse"
            x1="6"
            y1="2"
            x2="18"
            y2="22"
          >
            <stop offset="0%" stopColor="#2DD4BF" />
            <stop offset="25%" stopColor="#06B6D4" />
            <stop offset="55%" stopColor="#2563EB" />
            <stop offset="80%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
      </svg>

      <Button
        size="sm"
        variant={variant}
        className="h-7 px-2.5 gap-2 text-xs border-border shadow-none shrink-0 cursor-pointer hover:bg-accent"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        aria-label="Co-Pilot"
      >
        <div className="copilot-animated-icon flex items-center justify-center shrink-0">
          <SparklesIcon
            ref={iconRef}
            size={15}
            duration={1.2}
            isAnimated={false}
          />
        </div>
        Co-Pilot
      </Button>

      <style>{`
        .copilot-animated-icon svg {
          overflow: visible !important;
        }
        .copilot-animated-icon svg,
        .copilot-animated-icon path,
        .copilot-animated-icon circle,
        .copilot-animated-icon g {
          stroke: url(#synlio-logo-gradient) !important;
        }
        .copilot-animated-icon path:first-child {
          fill: url(#synlio-logo-gradient);
          fill-opacity: 0.22;
        }
        .copilot-animated-icon circle {
          fill: url(#synlio-logo-gradient);
          fill-opacity: 0.9;
        }
      `}</style>
    </div>
  );
}
