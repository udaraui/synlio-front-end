"use client"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light")
    } else {
      setTheme("dark")
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="cursor-pointer"
            onPointerDown={(e) => e.currentTarget.blur()}
            onClick={(e) => {
              e.currentTarget.blur();
              toggleTheme();
            }}
          >
            <Sun className="h-4 w-4 hidden dark:block" />
            <Moon className="h-4 w-4 block dark:hidden" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="block dark:hidden">Switch to Dark Mode</p>
          <p className="hidden dark:block">Switch to Light Mode</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}