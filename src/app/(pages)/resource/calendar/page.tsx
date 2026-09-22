"use client";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import { useEffect } from "react";
import CalendarList from "./components/calendar_list";

function Page() {
  const { setBreadcrumbs } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbs([{ label: "Calendar", href: "/resource/calendar", isCurrentPage: true }]);
  }, [setBreadcrumbs]);

  return (
    <div className="flex flex-col h-full overflow-hidden pt-8">
      <CalendarList />
    </div>
  );
}

export default Page;
