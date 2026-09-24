"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Mail,
  Building,
  Code,
  Star,
  Clock,
  Users,
  DollarSign,
  Info as InfoIcon,
  Phone,
  Banknote,
  Globe,
  Calendar as CalendarIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { getAllCalendarDays } from "@/services/resource-management/calendar-services";
import { Button } from "@/components/ui/button";
import { findOneResource } from "@/services/resource-management/resource-service";
import { toast } from "sonner";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { Skeleton } from "@/components/ui/skeleton";
import Info_button from "@/components/Info_button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- Type Definitions ---
type ResourceModalProps = {
  open: boolean;
  onClose: () => void;
  resourceId: any;
};

interface Resource {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  mobile?: string;
  profile_pic?: string;
  active_status: boolean;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  division?: { id: number; division: string };
  calendar?: { id: number; name: string };
  reportingPerson?: { id: number; first_name: string; last_name: string; profile_pic?: string }; // Added for manager visibility
  skills?: {
    skill: { id: number; name: string };
    skillLevel: { id: number; name: string; star_count: number };
    skillCategory: { id: number; name: string };
  }[];
  resourceCost?: {
    cost: number;
    currency?: { id: number; code: string; symbol: string };
    rate_type: string;
  };
}

// ---------------------------------------------------

const ViewResourceModal: React.FC<ResourceModalProps> = ({
  open,
  onClose,
  resourceId,
}) => {
  if (!open || !resourceId) return null;

  const canViewResource = usePrivilegeGuard("38") as boolean;

  const [resource, setResource] = useState<Resource | null>(null);
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // --- Data Fetching ---

  useEffect(() => {
    const fetchResource = async () => {
      setLoading(true);
      try {
        const result = await findOneResource(resourceId);
        if (result.status === 200) {
          setResource(result.data as Resource);
        } else {
          toast.error(result.message);
          setResource(null);
        }
      } catch (error) {
        toast.error("Failed to fetch resource data");
      } finally {
        setLoading(false);
      }
    };
    if (resourceId) {
      fetchResource();
    }
  }, [resourceId]);

  useEffect(() => {
    if (resource?.calendar?.id) {
      getAllCalendarDays(resource.calendar.id)
        .then((res) => {
          const parsed = res.data.map((d: any) => ({
            ...d,
            date: new Date(d.date),
          }));
          setCalendarDays(parsed);
        })
        .catch(() => {
          toast.error("Failed to load calendar days");
        });
    }
  }, [resource?.calendar?.id, currentMonth]);

  // --- Date & Calendar Logic ---

  const getDaysInMonth = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };

  const formatDate = (date: Date, formatStr: string) => {
    try {
      if (formatStr === "MMMM yyyy") {
        return date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      }
      return date.toLocaleDateString();
    } catch (e) {
      return date.toDateString();
    }
  };

  const workingDates = calendarDays
    .filter((day) => day.isWorkingDay)
    .map((day) => day.date);

  const workingDateStrings = new Set(workingDates.map((d) => d.toDateString()));

  const filteredHolidayDates = calendarDays
    .filter(
      (day) =>
        day.isHoliday && !workingDateStrings.has(day.date.toDateString()),
    )
    .map((day) => day.date);

  const filteredWeekendDates = calendarDays
    .filter(
      (day) =>
        day.isWeekend && !workingDateStrings.has(day.date.toDateString()),
    )
    .map((day) => day.date);

  const monthDays = getDaysInMonth(currentMonth);

  const monthStats = {
    totalDays: monthDays.length,
    workingDays: monthDays.filter((date) =>
      workingDates.some((wd) => wd.toDateString() === date.toDateString()),
    ).length,
    holidays: monthDays.filter((date) =>
      filteredHolidayDates.some(
        (hd) => hd.toDateString() === date.toDateString(),
      ),
    ).length,
    weekends: monthDays.filter((date) =>
      filteredWeekendDates.some(
        (wd) => wd.toDateString() === date.toDateString(),
      ),
    ).length,
  };

  const formatRateType = (rate: string | undefined) => {
    if (!rate) return "N/A";
    return rate === "per_day"
      ? "Per Day"
      : rate === "per_hour"
        ? "Per Hour"
        : rate;
  };

  // --- Rendering ---

  if (!canViewResource) {
    return (
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-background p-6 rounded-lg border text-center relative w-full max-w-sm shadow-lg">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="absolute right-2 top-2"
              >
                <X className="w-5 h-5" />
              </Button>
              <InfoIcon className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
              <p className="text-sm text-muted-foreground">
                You are not authorized to view resources.
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="relative bg-background border shadow-xl rounded-xl w-full max-w-4xl h-[80vh] min-h-[650px] max-h-[900px] flex flex-col overflow-hidden"
          >
            {/* Header / Personal Details Section */}
            <div className="relative shrink-0 border-b bg-white dark:bg-gray-800 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {loading ? (
                <Skeleton className="w-20 h-20 rounded-full" />
              ) : (
                <Avatar className="w-20 h-20 border shadow-sm shrink-0">
                  <AvatarImage
                    src={resource?.profile_pic || ""}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-2xl font-semibold bg-muted text-muted-foreground">
                    {resource?.first_name?.charAt(0)}
                    {resource?.last_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}

              <div className="flex-1 space-y-2 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
                  {loading ? (
                    <Skeleton className="h-7 w-48" />
                  ) : (
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                      {resource?.first_name} {resource?.last_name}
                    </h1>
                  )}

                  {!loading && (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          resource?.active_status ? "default" : "secondary"
                        }
                      >
                        {resource?.active_status ? "Active" : "Inactive"}
                      </Badge>
                      {resource && (
                        <Info_button
                          id={resource.id}
                          createdBy={resource.createdBy}
                          createdAt={resource.createdAt}
                          updatedBy={resource.updatedBy}
                          updatedAt={resource.updatedAt}
                        />
                      )}
                    </div>
                  )}
                </div>

                {!loading && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-4 h-4" /> {resource?.email}
                    </span>
                    {resource?.mobile && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4" /> {resource?.mobile}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Building className="w-4 h-4" />{" "}
                      {resource?.division?.division || "No Division"}
                    </span>
                    {/* Reporting Person Entry */}
                    {resource?.reportingPerson && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-muted-foreground">Reporting person:</span>
                        <strong className="text-foreground font-medium">
                          {resource.reportingPerson.first_name} {resource.reportingPerson.last_name}
                        </strong>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden p-6 bg-muted/30">
              {loading ? (
                <div className="space-y-6 animate-pulse">
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-24 rounded-md" />
                    <Skeleton className="h-10 w-24 rounded-md" />
                    <Skeleton className="h-10 w-24 rounded-md" />
                    <Skeleton className="h-10 w-24 rounded-md" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-[200px] rounded-xl" />
                    <Skeleton className="h-[200px] rounded-xl" />
                  </div>
                </div>
              ) : (
                <Tabs
                  defaultValue="skills"
                  className="flex flex-col h-full w-full"
                >
                  <TabsList className="grid w-full sm:w-auto grid-cols-2 md:grid-cols-3 h-auto md:h-10 shrink-0">
                    <TabsTrigger
                      value="skills"
                      className="flex items-center justify-center gap-2 py-2"
                    >
                      <Code className="w-4 h-4" /> Skills
                    </TabsTrigger>
                    <TabsTrigger
                      value="calendar"
                      className="flex items-center justify-center gap-2 py-2"
                    >
                      <CalendarIcon className="w-4 h-4" /> Calendar
                    </TabsTrigger>
                    <TabsTrigger
                      value="cost"
                      className="flex items-center justify-center gap-2 py-2"
                    >
                      <Banknote className="w-4 h-4" /> Cost Info
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex-1 overflow-hidden mt-6">
                    {/* SKILLS TAB */}
                    <TabsContent
                      value="skills"
                      className="h-full overflow-y-auto m-0 pr-2 pb-6 focus-visible:outline-none"
                    >
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Technical Expertise
                          </CardTitle>
                          <CardDescription>
                            Certified skills and proficiency levels.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {Array.isArray(resource?.skills) &&
                            resource.skills.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {resource.skills.map((s: any, i: number) => (
                                <div
                                  key={i}
                                  className="flex items-center p-4 border rounded-lg bg-white dark:bg-gray-800"
                                >
                                  <div className="mr-4 p-2 rounded-md bg-muted text-muted-foreground">
                                    <Code className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm truncate">
                                      {s.skill?.name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {s.skillCategory?.name}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end pl-2">
                                    <div className="flex items-center gap-0.5 mb-1">
                                      {Array.from({ length: 5 }, (_, index) => (
                                        <Star
                                          key={index}
                                          className={`w-3 h-3 ${index < (s.level?.star_count || 0)
                                            ? "fill-primary text-primary"
                                            : "fill-muted text-muted-foreground/30"
                                            }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-[10px] uppercase text-muted-foreground font-medium">
                                      {s.level?.name || "Level"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-10">
                              <Code className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                              <h3 className="text-base font-medium">
                                No skills registered
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                This resource has not been assigned any
                                technical expertise yet.
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* CALENDAR TAB */}
                    <TabsContent
                      value="calendar"
                      className="h-full overflow-y-auto m-0 pr-2 pb-6 focus-visible:outline-none"
                    >
                      <div className="flex justify-center">
                        <Card className="w-full max-w-lg">
                          <CardHeader className="pb-2 border-b">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base font-medium flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                                Schedule & Availability
                              </CardTitle>
                              <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                {formatDate(currentMonth, "MMMM yyyy")}
                              </span>
                            </div>
                          </CardHeader>

                          <div className="bg-muted/30 p-4 border-b grid grid-cols-3 gap-2 text-center text-sm">
                            <div>
                              <p className="font-semibold text-lg text-foreground">
                                {monthStats.workingDays}
                              </p>
                              <p className="text-muted-foreground text-xs uppercase tracking-wider">
                                Working
                              </p>
                            </div>
                            <div>
                              <p className="font-semibold text-lg text-foreground">
                                {monthStats.holidays}
                              </p>
                              <p className="text-muted-foreground text-xs uppercase tracking-wider">
                                Holidays
                              </p>
                            </div>
                            <div>
                              <p className="font-semibold text-lg text-foreground">
                                {monthStats.weekends}
                              </p>
                              <p className="text-muted-foreground text-xs uppercase tracking-wider">
                                Weekends
                              </p>
                            </div>
                          </div>

                          <CardContent className="p-6 flex justify-center bg-white dark:bg-gray-800">
                            <Calendar
                              mode="single"
                              onMonthChange={setCurrentMonth}
                              showOutsideDays={false}
                              modifiers={{
                                working: workingDates,
                                holiday: filteredHolidayDates,
                                weekend: filteredWeekendDates,
                              }}
                              modifiersClassNames={{
                                working:
                                  "bg-emerald-100 text-emerald-900 font-medium dark:bg-emerald-900/40 dark:text-emerald-300 rounded-md",
                                holiday:
                                  "bg-rose-100 text-rose-900 font-medium dark:bg-rose-900/40 dark:text-rose-300 rounded-md",
                                weekend:
                                  "bg-orange-100 text-orange-900 font-medium dark:bg-orange-900/40 dark:text-orange-300 rounded-md",
                              }}
                              className="pointer-events-auto p-0"
                            />
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* COST INFO TAB */}
                    <TabsContent
                      value="cost"
                      className="h-full overflow-y-auto m-0 pr-2 pb-6 focus-visible:outline-none"
                    >
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Financial Configuration
                          </CardTitle>
                          <CardDescription>
                            Current billing rates and cost metrics.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {resource?.resourceCost &&
                            resource.resourceCost.cost ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="p-6 border rounded-lg bg-white dark:bg-gray-800 flex flex-col">
                                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                                  <DollarSign className="w-4 h-4" />
                                  <span className="text-xs uppercase font-medium">
                                    Base Cost Rate
                                  </span>
                                </div>
                                <span className="text-3xl font-semibold">
                                  {Number(resource.resourceCost.cost).toFixed(
                                    2,
                                  )}
                                </span>
                              </div>

                              <div className="p-6 border rounded-lg bg-white dark:bg-gray-800 flex flex-col">
                                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                                  <Globe className="w-4 h-4" />
                                  <span className="text-xs uppercase font-medium">
                                    Currency
                                  </span>
                                </div>
                                <span className="text-xl font-medium">
                                  {resource.resourceCost.currency?.symbol || ""}{" "}
                                  {resource.resourceCost.currency?.code ||
                                    "N/A"}
                                </span>
                              </div>

                              <div className="p-6 border rounded-lg bg-white dark:bg-gray-800 flex flex-col">
                                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                                  <Clock className="w-4 h-4" />
                                  <span className="text-xs uppercase font-medium">
                                    Billing Cycle
                                  </span>
                                </div>
                                <span className="text-xl font-medium capitalize">
                                  {formatRateType(
                                    resource.resourceCost.rate_type,
                                  )}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-10 border rounded-lg bg-muted/30 mt-2">
                              <Banknote className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                              <h3 className="text-base font-medium">
                                Cost Data Unavailable
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                                This resource does not have financial metrics
                                configured yet.
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </div>
                </Tabs>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ViewResourceModal;