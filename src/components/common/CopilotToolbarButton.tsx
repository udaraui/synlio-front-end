"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMenuAccess } from "@/hooks/use-menu-access";
import { toast } from "sonner";

export interface CopilotToolbarButtonProps {
  onClick: () => void;
  title?: string;
  className?: string;
  iconClassName?: string;
  containerClassName?: string;
  privilegeCode?: string | string[];
  unauthorizedMessage?: string;
  showDivider?: boolean;
  dividerClassName?: string;
}

export function CopilotToolbarButton({
  onClick,
  title = "Open Co-Pilot",
  className = "h-7 w-7 p-0 shrink-0 cursor-pointer",
  iconClassName = "w-3.5 h-3.5 text-white dark:text-black",
  containerClassName = "ml-auto flex items-center gap-1.5 shrink-0",
  privilegeCode = ["120"],
  unauthorizedMessage = "You are not authorized to use Synlio Co-Pilot",
  showDivider = true,
  dividerClassName = "h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1 shrink-0",
}: CopilotToolbarButtonProps) {
  const { canAccess } = useMenuAccess();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const codes = Array.isArray(privilegeCode) ? privilegeCode : [privilegeCode];
    if (!canAccess(codes)) {
      toast.error(unauthorizedMessage);
      return;
    }
    onClick();
  };

  return (
    <div className={containerClassName}>
      {showDivider && <div className={dividerClassName} />}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="default"
              className={className}
              onClick={handleClick}
              aria-label={title}
            >
              <Sparkles className={iconClassName} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>{title}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
