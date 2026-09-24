"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import { loadCalendars } from "@/services/resource-management/calendar-services";
import { Calendar } from "@/interfaces/calendar";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CalendarDetailsPanel from "../components/calendar_details_panel";
import CalendarViewPanel from "../components/calendar_view_panel";

export default function CalendarDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { setBreadcrumbs } = useBreadcrumb();

  const [calendar, setCalendar] = useState<Calendar | null>(null);
  const [loading, setLoading] = useState(true);

  const [legendStats, setLegendStats] = useState<{ working: number; holidays: number; weekends: number; canView: boolean; loading: boolean } | null>(null);
  const [navPortalNode, setNavPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setNavPortalNode(document.getElementById("calendar-navbar-portal"));
  }, []);

  const id = params.id as string;

  useEffect(() => {
    if (!id) return;

    const fetchCalendar = async () => {
      setLoading(true);
      try {
        const response = await loadCalendars({
          first: 0,
          rows: 1,
          filters: [{ field: "id", value: Number(id), matchMode: "equals" }],
        });

        if (response.data && response.data.length > 0) {
          const calData = response.data[0];
          const mappedCal: Calendar = {
            id: calData.id,
            name: calData.name || "",
            year: calData.year || 0,
            isActive: calData.isActive,
            companyId: calData.companyId,
            createdBy: calData.created_by || "",
            createdAt: calData.created_at || new Date().toISOString(),
            updatedBy: calData.updated_by || "",
            updatedAt: calData.updated_at || new Date().toISOString(),
          };
          setCalendar(mappedCal);

          setBreadcrumbs([
            { label: "Calendar", href: "/resource/calendar" },
            { label: mappedCal.name, href: `/resource/calendar/${id}`, isCurrentPage: true },
          ]);
        } else {
          toast.error("Calendar not found");
          router.push("/resource/calendar");
        }
      } catch (error) {
        toast.error("Failed to load calendar details");
      } finally {
        setLoading(false);
      }
    };

    fetchCalendar();
  }, [id, router, setBreadcrumbs]);

  const handleClose = () => {
    router.push("/resource/calendar");
  };


  if (!calendar) return null;

  return (
    <div className="flex flex-col h-full bg-[#F8F9FA] dark:bg-zinc-950 pt-8">
      {/* Header Navigation Portaled to Global Navbar */}
      {navPortalNode && createPortal(
        <>
          <button
            onClick={handleClose}
            title="Go back"
            className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center flex-shrink-0"
          >
            <ArrowLeft className="size-3.5" />
          </button>
          <h1
            className="text-sm font-semibold"
            title={calendar.name.length > 22 ? calendar.name : undefined}
          >
            {calendar.name.length > 22 ? calendar.name.slice(0, 22) + '…' : calendar.name}
          </h1>
        </>,
        navPortalNode
      )}

      {/* Main Layout Area */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left Side (Main Content) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-background">
          <div className="flex-1 py-4 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
            <CalendarViewPanel calendar={calendar} setLegendStats={setLegendStats} />
          </div>

          {/* Left Pane Footer */}
          <div className="h-14 flex-none border-t bg-white dark:bg-background flex items-center justify-end px-4 gap-3">
            <Button variant="outline" onClick={handleClose}>
              Go Back
            </Button>
          </div>
        </div>

        {/* Right Side Panel */}
        <div className="w-[480px] flex-shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-background h-full flex-col hidden lg:flex">
          <CalendarDetailsPanel calendar={calendar} />
        </div>
      </div>
    </div>
  );
}
