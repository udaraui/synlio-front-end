"use client";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { getAllRepeatedHoliday } from "@/services/calendar-services";
import { Pencil, Plus, RefreshCw, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { SkeletonLoadinWithoutImage } from "@/components/loading/GeneralSkeletons";
import { Badge } from "@/components/ui/badge";
import DeleteModal from "@/components/DeleteModal";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import { Calendar } from "@/interfaces/calendar";
import RepeatedHolidayDrawer from "../formDrawers/repeatedHolidayDrawer";

interface RepeatedHolidaysProps {
  calendar: Calendar;
  isSystemUser?: boolean;
  selectedYear?: number;
}

// function Skill_categories_list() {
const RepeatedHolidays: React.FC<RepeatedHolidaysProps> = ({ calendar, isSystemUser, selectedYear }) => {
  const { setBreadcrumbs } = useBreadcrumb();

  const [repeatedHolidays, setRepeatedHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<any | null>(null);
  const [isCreatingHoliday, setIsCreatingHoliday] = useState(false);
  const [isDeletingHoliday, setIsDeletingHoliday] = useState(false);
  const [deletingHoliday, setDeletingHoliday] = useState<number | null>(null);
  const canCreateHoliday = usePrivilegeGuard("35") as boolean;
  const canViewHoliday = usePrivilegeGuard("29") as boolean;
  const canDeleteHoliday = usePrivilegeGuard(
    "delete:repeatedHoliday",
  ) as boolean;

  const fetchHolidays = async () => {
    setIsLoading(true);
    try {
      if (!calendar.id) {
        return;
      }
      const response = await getAllRepeatedHoliday(
        calendar.id,
        selectedYear,
      );
      if (response.status == 200) {
        setRepeatedHolidays(response.data);
        setIsLoading(false);
      }
    } catch (error) {
      toast.error("Failed to fetch repeated holidays");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [calendar.id, selectedYear]);

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <h2 className="text-lg font-semibold text-gray-900">
            Repeated Holidays
          </h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchHolidays}>
            <RefreshCw />
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              if (canCreateHoliday) {
                setIsCreatingHoliday(true);
              } else {
                toast.error("Not authorized to create a holiday");
              }
            }}
          >
            <span>Add</span> <Plus />
          </Button>
        </div>
      </div>
      {/* Results Info */}
      <div className="text-xs text-gray-600">
        {selectedYear ? `${selectedYear}: ` : ''}
        {repeatedHolidays.length} repeated holidays
      </div>

      {/* Repeated Holidays Display */}
      {isLoading ? (
        <div className="space-y-2">
          <SkeletonLoadinWithoutImage />
        </div>
      ) : repeatedHolidays.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">
            No Repeated Holidays found
          </h3>
          <p className="text-muted-foreground">
            No repeated holidays have been set up for this calendar yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {repeatedHolidays.map((holiday, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-gray-900">
                      Repeated Holiday
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const dayNames = [
                        "Monday", // 0
                        "Tuesday", // 1
                        "Wednesday", // 2
                        "Thursday", // 3
                        "Friday", // 4
                        "Saturday", // 5
                        "Sunday", // 6
                      ];
                      const dayName =
                        dayNames[holiday.day] || `Day ${holiday.day}`;
                      return (
                        <Badge
                          variant={
                            holiday.type === "FULL" ? "default" : "outline"
                          }
                          className="text-xs"
                        >
                          {dayName} ({holiday.type})
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedHoliday(holiday);
                      // TODO: Implement edit functionality
                      toast.info("Edit functionality not yet implemented");
                    }}
                    className="text-xs"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {canDeleteHoliday && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDeletingHoliday(holiday.id);
                        setIsDeletingHoliday(true);
                      }}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      <ShieldOff className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isCreatingHoliday && (
        <RepeatedHolidayDrawer
          open={isCreatingHoliday}
          onOpenChange={setIsCreatingHoliday}
          type="create"
          calendarId={calendar.id}
          selectedYear={selectedYear}
          repeatedHoliday={null}
          isSystemUser={isSystemUser}
          onRepeatedHolidayUpdate={() => {
            setIsCreatingHoliday(false);
            fetchHolidays();
          }}
        />
      )}
      {isDeletingHoliday && (
        <DeleteModal
          isOpen={isDeletingHoliday}
          onClose={() => {
            setIsDeletingHoliday(false);
            setDeletingHoliday(null);
            fetchHolidays();
          }}
          onDelete={async () => {
            // TODO: Add delete holiday functionality
            toast.info("Delete holiday functionality not yet implemented");
          }}
          id={deletingHoliday || 0}
          title="Delete Holiday"
          description="Are you sure you want to delete this holiday"
          buttonText="Delete"
          buttonVariant="destructive"
          buttonIcon={<ShieldOff />}
          buttonClassName="w-full"
        />
      )}
    </div>
  );
};

export default RepeatedHolidays;
