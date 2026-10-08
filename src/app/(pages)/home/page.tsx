"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBreadcrumbsEffect } from "@/hooks/useBreadcrumbsEffect";
import { safeParse } from "@/services/auth/auth-service";
import { useMenuAccess } from "@/hooks/use-menu-access";
import { useSidebar } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";
import HeroGreeting from "./components/HeroGreeting";
import MyMeetingsColumn from "./components/MyMeetingsColumn";
import WeekCalendar, { DayCountsMap } from "./components/WeekCalendar";
import NotesSection from "./components/notes/NotesSection";
import TasksAndTicketsColumn from "./components/TasksAndTicketsColumn";
import { DateRange } from "react-day-picker";
import { getCalendarCounts } from "@/services/home/home.service";
import { format } from "date-fns";
import { getMeetings, Meeting } from "@/services/common/meetings-integration.service";
import Image from "next/image";
import Logo from "../../../../public/logo.png";

export default function Page() {
  const router = useRouter();
  const { canAccess } = useMenuAccess();
  const { open: sidebarOpen, isMobile } = useSidebar();
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [dayCountsMap, setDayCountsMap] = useState<DayCountsMap>({});
  const [meetingsData, setMeetingsData] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [meetingsError, setMeetingsError] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const canTasks = canAccess(["44"]);
  const canTickets = canAccess(["100"]);
  const canMeetings = true;
  const sb = !isMobile && sidebarOpen;

  const fetchCounts = useCallback(async (signal?: AbortSignal) => {
    if (!dateRange?.from || !dateRange?.to) return;
    setLoading(true);

    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      const [countsData, meetingsResult] = await Promise.all([
        getCalendarCounts(fromDate, toDate, signal, canTasks, canTickets),
        canMeetings ? getMeetings({ startDate: fromDate, endDate: toDate, limit: 1000 }) : Promise.resolve({ data: [] })
      ]);

      const newDayCounts: DayCountsMap = { ...countsData };

      const ensureDate = (dateStr: string) => {
        if (!newDayCounts[dateStr]) {
          newDayCounts[dateStr] = { tasks: 0, tickets: 0, meetings: 0 };
        }
      };

      meetingsResult.data.forEach((meeting: Meeting) => {
        const startTime = meeting.effectiveStartTime;
        if (startTime) {
          const dateStr = startTime.split('T')[0];
          ensureDate(dateStr);
          newDayCounts[dateStr].meetings++;
        }
      });

      setDayCountsMap(newDayCounts);
      setMeetingsData(meetingsResult.data);
      setMeetingsError(false);
    } catch (err: any) {
      if (err.code !== 'ERR_CANCELED') {
        console.error("Failed to fetch counts:", err);
        setMeetingsError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [dateRange, canTasks, canTickets, canMeetings]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCounts(controller.signal);
    return () => controller.abort();
  }, [fetchCounts]);

  // ── Row 1 ─────────────────────────────────────────────────────────────
  const row1Class = sb
    ? "flex flex-col md:flex-row gap-4"
    : "flex flex-col sm:flex-row gap-4";

  // ── Main content area: [left 70fr | notes 30fr] ───────────────────────
  const outerGridClass = sb
    ? "grid gap-4 grid-cols-1 xl:grid-cols-[70fr_30fr] xl:h-full items-stretch"
    : "grid gap-4 grid-cols-1 lg:grid-cols-[70fr_30fr] lg:h-full items-stretch";

  // ── Calendar card ─────────────────────────────────────────────────────
  const calendarCardClass =
    "rounded-xl border border-border bg-card text-card-foreground pb-2.5 px-1 shrink-0";

  // ── Task columns card ─────────────────────────────────────────────────
  const columnsCardClass = sb
    ? "min-w-0 flex-1 min-h-[400px] xl:min-h-0 rounded-xl border border-border bg-card text-card-foreground flex flex-col overflow-hidden"
    : "min-w-0 flex-1 min-h-[400px] lg:min-h-0 rounded-xl border border-border bg-card text-card-foreground flex flex-col overflow-hidden";

  const innerGridClass = `grid grid-cols-3 flex-1 min-h-0 auto-rows-fr overflow-hidden`;

  const colClass = "min-w-0 flex flex-col overflow-hidden min-h-[280px]";

  const notesPanelClass = sb
    ? "min-w-0 rounded-xl bg-card text-card-foreground border border-border flex flex-col overflow-hidden min-h-[300px] xl:min-h-0"
    : "min-w-0 rounded-xl bg-card text-card-foreground border border-border flex flex-col overflow-hidden min-h-[300px] lg:min-h-0";

  const leftColClass = sb
    ? "flex flex-col gap-4 min-w-0 xl:h-full min-h-0"
    : "flex flex-col gap-4 min-w-0 lg:h-full min-h-0";

  const rightColClass = sb
    ? "flex flex-col gap-4 min-w-0 xl:h-full min-h-0 pb-4 xl:pb-0"
    : "flex flex-col gap-4 min-w-0 lg:h-full min-h-0 pb-4 lg:pb-0";

  useEffect(() => {
    const localCompanies = safeParse(localStorage.getItem("companies")) || [];
    if (localCompanies.length === 0) router.replace("/user-management");
  }, [router]);

  const handleCalendarRangeChange = useCallback(
    (from: string, to: string) => {
      setDateRange({ from: new Date(from), to: new Date(to) });
    },
    [],
  );

  useBreadcrumbsEffect([{ label: "Home", isCurrentPage: true }]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("welcome") === "true") {
        setShowWelcome(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  return (
    <main className="p-4 pt-12 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
      {/* ── Row 1: HeroGreeting ── */}
      <div className={row1Class}>
        <div className="w-full min-w-0">
          <HeroGreeting
            canTasks={canTasks}
            canTickets={canTickets}
            canMeetings={canMeetings}
          />
        </div>
      </div>

      {/* ── Row 2: [Calendar + Columns] | Notes ── */}
      <div className="flex-1 min-h-0">
        <div className={outerGridClass}>
          {/* Left column: calendar card + task columns card stacked */}
          <div className={leftColClass}>
            {/* ── 14-Day Calendar — its own card ── */}
            <div className={calendarCardClass}>
              <WeekCalendar
                selectedDates={selectedDates}
                onDatesSelect={setSelectedDates}
                onRangeChange={handleCalendarRangeChange}
                dayCountsMap={dayCountsMap}
                loading={loading}
                meetingsData={meetingsData}
              />
            </div>

            {/* ── Task / Ticket / Meeting columns — their own card ── */}
            <div className={columnsCardClass}>
              <div className={innerGridClass}>
                {(canTasks || canTickets) && (
                  <div className={`${colClass} col-span-2 border-r border-border`}>
                    <TasksAndTicketsColumn
                      dates={selectedDates}
                      canFetchTasks={canTasks}
                      canFetchTickets={canTickets}
                      dateRange={dateRange}
                    />
                  </div>
                )}
                {canMeetings && (
                  <div className={colClass}>
                    <MyMeetingsColumn dates={selectedDates} meetingData={meetingsData} loading={loading} error={meetingsError} onSyncSuccess={fetchCounts} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column: Notes only */}
          <div className={rightColClass}>
            {/*<AIInsightsCard />*/}
            <div className={`${notesPanelClass} flex-1`}>
              <NotesSection />
            </div>
          </div>
        </div>
      </div>

      {/* ── Welcome Popup ── */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="flex flex-col items-center gap-2 pt-4">
            <div className="w-12 h-12 flex items-center justify-center mb-2">
              <Image src={Logo} width={40} height={40} alt="Synlio" />
            </div>
            <DialogTitle className="text-xl font-semibold text-center">
              Welcome to Synlio
            </DialogTitle>
            <DialogDescription className="text-center text-gray-500">
              Your company and admin account have been successfully set up. You are ready.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 sm:justify-center w-full">
            <Button
              onClick={() => setShowWelcome(false)}
              className="w-full"
            >
              Get Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
