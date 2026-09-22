"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { getAllRepeatedHoliday, deleteRepeatedHoliday } from "@/services/calendar-services";
import { Calendar } from "@/interfaces/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SkeletonLoadinWithoutImage } from "@/components/loading/GeneralSkeletons";
import { Skeleton } from "@/components/ui/skeleton";
import Info_button from "@/components/Info_button";
import DeleteModal from "@/components/DeleteModal";
import {
  Plus,
  RefreshCw,
  Repeat,
  Search,
  ShieldOff,
  Trash,
  Circle,
  CircleDashed,
} from "lucide-react";
import RepeatedHolidayDrawer from "../formDrawers/repeatedHolidayDrawer";

interface RepeatedHolidaysCompactProps {
  calendar: Calendar;
  selectedYear?: number;
  isSystemUser?: boolean;
  onCountChange?: (count: number) => void;
}

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const RepeatedHolidaysCompact: React.FC<RepeatedHolidaysCompactProps> = ({
  calendar,
  selectedYear,
  isSystemUser,
  onCountChange,
}) => {
  const [repeatedHolidays, setRepeatedHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const canCreate = usePrivilegeGuard("35") as boolean;
  const canView = usePrivilegeGuard("29") as boolean;
  const canDelete = usePrivilegeGuard("36") as boolean;

  const fetchHolidays = async () => {
    if (!calendar.id) return;
    setIsLoading(true);
    try {
      const response = await getAllRepeatedHoliday(calendar.id, selectedYear);
      if (response.status === 200) {
        const data = response.data || [];
        setRepeatedHolidays(data);
        onCountChange?.(data.length);
      }
    } catch {
      toast.error("Failed to fetch repeated holidays");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [calendar.id, selectedYear]);

  const filtered = repeatedHolidays.filter((h) => {
    if (!searchTerm) return true;
    const dayName = dayNames[h.day] || "";
    const q = searchTerm.toLowerCase();
    return (
      dayName.toLowerCase().includes(q) ||
      (h.type || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {/* Toolbar */}
        <div className="flex-none flex flex-wrap gap-2 items-center py-2 px-3">
          <div className="flex gap-2 flex-shrink-0">
            {canCreate && (
              <Button size="sm" className="h-7 text-xs px-2.5 shadow-none" onClick={() => setIsCreating(true)}>
                <Plus className="h-3 w-3" />
                Add New
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 w-7 p-0 shadow-none bg-transparent cursor-pointer hover:text-foreground" onClick={fetchHolidays} disabled={isLoading}>
              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search day or type"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-7 text-xs placeholder:text-xs shadow-none"
            />
          </div>
        </div>

      {/* List */}
      <div className="flex-1 px-3 pt-2 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
      {!canView ? (
        <div className="text-center py-10 text-muted-foreground">
          <p className="text-sm">You are not authorized to view repeated holidays</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 border border-border/60 rounded-lg px-2.5 py-2.5 bg-white dark:bg-slate-900/40">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="min-w-0 flex-1 flex flex-col gap-2 justify-center py-1">
                  <Skeleton className="h-4 w-1/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-md" />
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Repeat className="h-8 w-8 opacity-30 mx-auto mb-2" />
          <p className="text-sm">No repeated holidays found</p>
          {/* <p className="text-xs mt-1">
            {searchTerm ? "Try adjusting your search" : "No entries available"}
          </p> */}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((h, idx) => {
            const dayName = dayNames[h.day] || `Day ${h.day}`;
            return (
              <div
                key={h.id ?? idx}
                className="flex items-center justify-between gap-3 border border-border/60 rounded-lg px-2.5 py-2.5 bg-white dark:bg-slate-900/40 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                    <p className="text-sm font-medium truncate leading-none mt-1">{dayName}</p>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs font-medium text-foreground">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "rgba(248, 113, 113, 0.8)" }} />
                        Holiday
                      </span>
                      {h.type && (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs font-medium text-foreground">
                          {h.type.toUpperCase() === "HALF" ? (
                            <CircleDashed className="h-3 w-3" color="rgba(248, 113, 113, 0.8)" />
                          ) : (
                            <Circle className="h-3 w-3" color="rgba(248, 113, 113, 0.8)" />
                          )}
                          {h.type.charAt(0).toUpperCase() + h.type.slice(1).toLowerCase()} Day
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Info_button
                    id={h.id || 0}
                    createdBy={h.createdBy || ""}
                    createdAt={h.createdAt || ""}
                    updatedBy={h.updatedBy || ""}
                    updatedAt={h.updatedAt || ""}
                  />
                  {canDelete && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setDeletingId(h.day);
                        setIsDeleting(true);
                      }}
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
      </div>

      <div className="h-11 px-4 flex-none flex items-center justify-between border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-background">
        <span className="text-xs font-medium text-muted-foreground">
          {filtered.length} of {repeatedHolidays.length} repeated holidays
        </span>
      </div>

      {isCreating && (
        <RepeatedHolidayDrawer
          open={isCreating}
          onOpenChange={setIsCreating}
          type="create"
          calendarId={calendar.id}
          selectedYear={selectedYear}
          repeatedHoliday={null}
          isSystemUser={isSystemUser}
          onRepeatedHolidayUpdate={() => {
            setIsCreating(false);
            fetchHolidays();
          }}
        />
      )}
      {isDeleting && (
        <DeleteModal
          isOpen={isDeleting}
          onClose={() => {
            setIsDeleting(false);
            setDeletingId(null);
            fetchHolidays();
          }}
          onDelete={async () => {
            await deleteRepeatedHoliday(calendar.id, deletingId ?? 0);
          }}
          id={deletingId || 0}
          title="Delete Repeated Holiday"
          description="Are you sure you want to delete this repeated holiday?"
          buttonText="Delete"
          buttonVariant="destructive"
          buttonIcon={<ShieldOff />}
          buttonClassName="w-full"
        />
      )}
    </div>
  );
};

export default RepeatedHolidaysCompact;
