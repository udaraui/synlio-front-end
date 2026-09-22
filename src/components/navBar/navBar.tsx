"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { useSidebar } from "../ui/sidebar";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import { NAVBAR_HEIGHT, SIDEBAR_WIDTH } from "@/lib/constants";
import SettingItem from "./setting-item";
import { User } from "@/interfaces/user";
import { EnhancedBreadcrumb } from '@/components/common/EnhancedBreadcrumb';
import { safeParse } from "@/services/auth-service";
import { ArrowLeft } from "lucide-react";

function NavBar() {
  const [offset, setOffset] = useState(0);
  const { open: sidebarOpen, isMobile } = useSidebar();
  const { breadcrumbs } = useBreadcrumb();
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const isTaskDetailPage = !!pathname?.match(/\/project-management\/task\/\d+$/);
  const isCalendarDetailsPage = !!pathname?.match(/\/resource\/calendar\/[a-zA-Z0-9_-]+$/);
  useEffect(() => {
    const user = safeParse(localStorage.getItem("user"));
    setUser(user);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setOffset(document.body.scrollTop || document.documentElement.scrollTop);
    };

    // Add scroll listener to the body
    document.addEventListener("scroll", onScroll, { passive: true });

    // Clean up the event listener on unmount
    return () => document.removeEventListener("scroll", onScroll);
  }, []);

  // Calculate navbar positioning based on sidebar state
  const getNavbarStyle = () => {
    if (isMobile) {
      // On mobile, sidebar is a sheet overlay, so navbar takes full width
      return {
        height: NAVBAR_HEIGHT,
        left: 0,
        width: "100%",
      };
    }

    if (sidebarOpen) {
      // Desktop with sidebar open - shift navbar to the right
      return {
        height: NAVBAR_HEIGHT,
        left: SIDEBAR_WIDTH,
        width: `calc(100% - ${SIDEBAR_WIDTH}px)`,
      };
    } else {
      // Desktop with sidebar collapsed - minimal left offset for icon
      const collapsedWidth = 48; // 3rem = 48px (SIDEBAR_WIDTH_ICON)
      return {
        height: NAVBAR_HEIGHT,
        left: collapsedWidth,
        width: `calc(100% - ${collapsedWidth}px)`,
      };
    }
  };

  return (
    <header
      className={cn(
        "z-50 fixed top-0 transition-all duration-200 ease-linear",
        "backdrop-blur-lg"
      )}
      style={getNavbarStyle()}
    >
      <div
        className={cn(
          "relative w-full items-center gap-3 sm:gap-4 px-1 h-fit bg-background border-b",
          offset > 10 &&
          "after:bg-background/20 after:absolute after:inset-0 after:-z-10 after:backdrop-blur-lg"
        )}
      >
        <div className="flex items-center justify-between p-3">
          <div className="flex gap-3 items-center flex-1 min-w-0 overflow-hidden">
            {isTaskDetailPage ? (
              <button
                onClick={() => router.back()}
                title="Go back"
                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center flex-shrink-0"
              >
                <ArrowLeft className="size-3.5" />
              </button>
            ) : isCalendarDetailsPage ? (
              <div id="calendar-navbar-portal" className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1" />
            ) : (
              <>
                {breadcrumbs.length > 0 && (
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <EnhancedBreadcrumb items={breadcrumbs} />
                  </div>
                )}
              </>
            )}
          </div>
          <div className="shrink-0">
          <SettingItem />
          </div>
        </div>
      </div>
    </header>
  );
}

export default NavBar;
