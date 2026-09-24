import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from "@/components/ui/table";
import { DateRangePickerItem } from "@/components/ui/date-range-picker-item";
import { DatePickerItem } from "@/components/ui/date-picker-item";
import { Button } from "@/components/ui/button";
import { Clock, Loader2, Save, X, Pencil, Trash, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { format } from "date-fns";
import axiosInstance from '@/lib/interceptors/axiosInstance';
import { API_ENDPOINTS } from '@/services/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface WorkLogTableProps {
  paginatedLogs: any[];
  canEditLogs: boolean;
  newLogEntry: { startTimeDate: Date | null, endTimeDate: Date | null, effort: string, note: string };
  setNewLogEntry: React.Dispatch<React.SetStateAction<{ startTimeDate: Date | null, endTimeDate: Date | null, effort: string, note: string }>>;
  handleSaveLog: () => void;
  isAddingLog: boolean;
  editingLogId: number | null;
  setEditingLogId: (id: number | null) => void;
  editingLogEntry: { startTimeDate: Date | null, endTimeDate: Date | null, effort: string, note: string } | null;
  setEditingLogEntry: React.Dispatch<React.SetStateAction<{ startTimeDate: Date | null, endTimeDate: Date | null, effort: string, note: string } | null>>;
  handleUpdateLog: () => void;
  handleDeleteLog: (id: number) => void;
  logPage: number;
  setLogPage: React.Dispatch<React.SetStateAction<number>>;
  totalLogPages: number;
  getNextWeekEndDay: (date: Date) => Date | null;
  hideNotice?: boolean;
  showTopBorder?: boolean;
  postType?: string;
  disableWeekSelection?: boolean;
  activeWeekStart?: string;
  activeWeekEnd?: string;
}

export function WorkLogTable({
  paginatedLogs,
  canEditLogs,
  newLogEntry,
  setNewLogEntry,
  handleSaveLog,
  isAddingLog,
  editingLogId,
  setEditingLogId,
  editingLogEntry,
  setEditingLogEntry,
  handleUpdateLog,
  handleDeleteLog,
  logPage,
  setLogPage,
  totalLogPages,
  getNextWeekEndDay,
  hideNotice = false,
  showTopBorder = true,
  postType,
  disableWeekSelection = false,
  activeWeekStart,
  activeWeekEnd
}: WorkLogTableProps) {
  const [weeks, setWeeks] = useState<{ weekNumber: number, weekStartDate: string, weekEndDate: string }[]>([]);

  useEffect(() => {
    console.log("WorkLogTable mounted! Checking active_company...");
    const activeCompanyStr = localStorage.getItem('active_company');
    console.log("activeCompanyStr:", activeCompanyStr);
    if (activeCompanyStr) {
      try {
        const activeCompany = JSON.parse(activeCompanyStr);
        console.log("activeCompany parsed:", activeCompany);
        const companyId = activeCompany?.id || activeCompany?.companyId;
        if (companyId) {
          console.log(`Firing API call to ${API_ENDPOINTS.CALENDAR}/active-weeks/${companyId}`);
          axiosInstance.get(`${API_ENDPOINTS.CALENDAR}/active-weeks/${companyId}`)
            .then(res => {
              console.log("Fetched active weeks on mount:", res.data);
              setWeeks(res.data);
            })
            .catch(console.error);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const getWeekForDate = (date: Date | null) => {
    if (!date || weeks.length === 0) return undefined;
    const dStr = format(date, 'yyyy-MM-dd');
    const week = weeks.find(w => {
      const wStartStr = w.weekStartDate.split('T')[0];
      const wEndStr = w.weekEndDate.split('T')[0];
      return dStr >= wStartStr && dStr <= wEndStr;
    });
    return week ? String(week.weekNumber) : undefined;
  };

  const isLogOutsideActiveWeek = (logStartDate: string | null | undefined, logEndDate: string | null | undefined) => {
    if (!activeWeekStart || !activeWeekEnd) return false;

    // Check if the log falls entirely outside the active week boundaries
    if (logStartDate && new Date(logStartDate) > new Date(activeWeekEnd)) return true;
    if (logEndDate && new Date(logEndDate) < new Date(activeWeekStart)) return true;

    return false;
  };

  const currentWeekStr = getWeekForDate(new Date());

  const currentWeekRef = React.useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setTimeout(() => {
        requestAnimationFrame(() => {
          node.scrollIntoView({ block: 'center' });
        });
      }, 300);
    }
  }, []);

  return (
    <>
      <Table className={`w-full table-fixed border-b ${showTopBorder ? 'border-t' : ''} [&_th]:border-r [&_th]:border-gray-200 dark:[&_th]:border-gray-800 [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-gray-200 dark:[&_td]:border-gray-800 [&_td:last-child]:border-r-0`}>
        <TableHeader>
          <TableRow className="text-xs font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 [&_th]:text-gray-900 [&_th]:dark:text-gray-100 [&_th]:font-semibold">
            <TableHead className="w-40">Week</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="w-28">Effort (hrs)</TableHead>
            {canEditLogs && <TableHead className="text-left w-16 pr-0">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {canEditLogs && (
            <TableRow className="text-xs font-medium text-muted-foreground bg-muted/30">
              <TableCell className="p-2">
                <Select
                  key={newLogEntry.startTimeDate ? 'has-date' : 'no-date'}
                  value={getWeekForDate(newLogEntry.startTimeDate)}
                  disabled={disableWeekSelection}
                  onValueChange={(val) => {
                    const week = weeks.find(w => String(w.weekNumber) === val);
                    if (week) {
                      setNewLogEntry(p => ({
                        ...p,
                        startTimeDate: new Date(week.weekStartDate),
                        endTimeDate: new Date(week.weekEndDate)
                      }));
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-[26px] py-1 px-2.5 text-xs bg-white dark:bg-gray-800 font-medium shadow-none">
                    <SelectValue placeholder="Select">
                      {getWeekForDate(newLogEntry.startTimeDate) ? `Week ${getWeekForDate(newLogEntry.startTimeDate)}` : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {weeks.map(w => {
                      const isCurrentWeek = String(w.weekNumber) === currentWeekStr;
                      return (
                        <SelectItem
                          key={w.weekNumber}
                          value={String(w.weekNumber)}
                          ref={isCurrentWeek ? currentWeekRef : undefined}
                          className={`cursor-pointer hover:bg-muted focus:bg-muted ${isCurrentWeek ? "text-primary font-medium" : ""}`}
                          onPointerUp={(e) => {
                            if (String(w.weekNumber) === getWeekForDate(newLogEntry.startTimeDate)) {
                              setTimeout(() => {
                                setNewLogEntry(p => ({ ...p, startTimeDate: null, endTimeDate: null }));
                              }, 10);
                            }
                          }}
                        >
                          Week {w.weekNumber} {isCurrentWeek && "(Current)"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="p-2">
                {(() => {
                  const weekStr = getWeekForDate(newLogEntry.startTimeDate);
                  const activeWeek = weeks.find(w => String(w.weekNumber) === weekStr);
                  const minBound = activeWeek ? new Date(activeWeek.weekStartDate) : undefined;
                  const maxBound = activeWeek ? new Date(activeWeek.weekEndDate) : undefined;
                  return (
                    <div className={cn(disableWeekSelection ? "[&_button]:border-primary" : "")}>
                      <DateRangePickerItem
                        startDate={newLogEntry.startTimeDate ? newLogEntry.startTimeDate.toISOString() : null}
                        endDate={newLogEntry.endTimeDate ? newLogEntry.endTimeDate.toISOString() : null}
                        minDate={disableWeekSelection && activeWeekStart ? new Date(activeWeekStart) : minBound}
                        maxDate={disableWeekSelection && activeWeekEnd ? new Date(activeWeekEnd) : maxBound}
                        onSelect={(range) => {
                          if (range && range.from) {
                            const newWeekStr = getWeekForDate(range.from);
                            const newWeek = weeks.find(w => String(w.weekNumber) === newWeekStr);
                            setNewLogEntry(p => ({
                              ...p,
                              startTimeDate: range.from || null,
                              endTimeDate: range.to || (newWeek ? new Date(newWeek.weekEndDate) : (getNextWeekEndDay(range.from!) || p.endTimeDate))
                            }));
                          } else {
                            setNewLogEntry(p => ({ ...p, startTimeDate: null, endTimeDate: null }));
                          }
                        }}
                        placeholder="Select Duration"
                        showOverdue={false}
                        className="w-full"
                      />
                    </div>
                  );
                })()}
              </TableCell>
              <TableCell className="p-2">
                <label className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 w-full bg-white dark:bg-gray-800 border rounded-md text-xs font-medium transition-colors cursor-text",
                  disableWeekSelection ? "border-primary hover:bg-gray-50 dark:hover:bg-gray-700" : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                )}>
                  <Clock className="w-3 h-3 shrink-0 text-muted-foreground" />
                  <input
                    type="number"
                    step="any"
                    min={0}
                    placeholder="Not set"
                    value={newLogEntry.effort}
                    onChange={(e) => setNewLogEntry(p => ({ ...p, effort: e.target.value }))}
                    className="bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full"
                  />
                </label>
              </TableCell>
              <TableCell className="text-right p-2">
                <div className="flex items-center justify-end gap-1 pr-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleSaveLog}
                    disabled={isAddingLog || !newLogEntry.startTimeDate || !newLogEntry.endTimeDate || !newLogEntry.effort}
                    title={!(isAddingLog || !newLogEntry.startTimeDate || !newLogEntry.endTimeDate || !newLogEntry.effort) ? "Log time" : undefined}
                  >
                    {isAddingLog ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 text-primary" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => setNewLogEntry({ startTimeDate: null, endTimeDate: null, effort: '', note: '' })}
                    disabled={!newLogEntry.startTimeDate && !newLogEntry.endTimeDate && !newLogEntry.effort}
                    title={(newLogEntry.startTimeDate || newLogEntry.endTimeDate || newLogEntry.effort) ? "Clear" : undefined}
                  >
                    <X className={`h-3 w-3 ${(newLogEntry.startTimeDate || newLogEntry.endTimeDate || newLogEntry.effort) ? "text-red-500" : "text-muted-foreground"}`} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
          {paginatedLogs.length > 0 ? (
            paginatedLogs.map((log) =>
              editingLogId === log.id && canEditLogs ? (
                <TableRow key={log.id} className="text-xs font-medium text-muted-foreground bg-muted/40">
                  <TableCell className="p-2">
                    <Select
                      key={editingLogEntry?.startTimeDate ? 'has-date' : 'no-date'}
                      value={getWeekForDate(editingLogEntry?.startTimeDate ?? null)}
                      disabled={disableWeekSelection}
                      onValueChange={(val) => {
                        const week = weeks.find(w => String(w.weekNumber) === val);
                        if (week) {
                          setEditingLogEntry(p => ({
                            ...p!,
                            startTimeDate: new Date(week.weekStartDate),
                            endTimeDate: new Date(week.weekEndDate)
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="w-full h-[26px] py-1 px-2.5 text-xs bg-white dark:bg-gray-800 font-medium">
                        <SelectValue placeholder="Week">
                          {getWeekForDate(editingLogEntry?.startTimeDate ?? null) ? getWeekForDate(editingLogEntry?.startTimeDate ?? null) : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {weeks.map(w => {
                          const isCurrentWeek = String(w.weekNumber) === currentWeekStr;
                          return (
                            <SelectItem
                              key={w.weekNumber}
                              value={String(w.weekNumber)}
                              ref={isCurrentWeek ? currentWeekRef : undefined}
                              className={`cursor-pointer hover:bg-muted focus:bg-muted ${isCurrentWeek ? "text-primary font-semibold" : ""}`}
                              onPointerUp={(e) => {
                                if (String(w.weekNumber) === getWeekForDate(editingLogEntry?.startTimeDate ?? null)) {
                                  setTimeout(() => {
                                    setEditingLogEntry(p => ({ ...p!, startTimeDate: null, endTimeDate: null }));
                                  }, 10);
                                }
                              }}
                            >
                              Week {w.weekNumber} {isCurrentWeek && "(Current)"}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-2">
                    {(() => {
                      const weekStr = getWeekForDate(editingLogEntry?.startTimeDate ?? null);
                      const activeWeek = weeks.find(w => String(w.weekNumber) === weekStr);
                      const minBound = activeWeek ? new Date(activeWeek.weekStartDate) : undefined;
                      const maxBound = activeWeek ? new Date(activeWeek.weekEndDate) : undefined;
                      return (
                        <DateRangePickerItem
                          startDate={editingLogEntry?.startTimeDate?.toISOString() ?? null}
                          endDate={editingLogEntry?.endTimeDate?.toISOString() ?? null}
                          minDate={disableWeekSelection && activeWeekStart ? new Date(activeWeekStart) : minBound}
                          maxDate={disableWeekSelection && activeWeekEnd ? new Date(activeWeekEnd) : maxBound}
                          onSelect={(range) => {
                            if (range && range.from) {
                              const newWeekStr = getWeekForDate(range.from);
                              const newWeek = weeks.find(w => String(w.weekNumber) === newWeekStr);
                              setEditingLogEntry(p => ({
                                ...p!,
                                startTimeDate: range.from || null,
                                endTimeDate: range.to || (newWeek ? new Date(newWeek.weekEndDate) : (getNextWeekEndDay(range.from!) || p!.endTimeDate))
                              }));
                            } else {
                              setEditingLogEntry(p => ({ ...p!, startTimeDate: null, endTimeDate: null }));
                            }
                          }}
                          placeholder="Duration"
                          showOverdue={false}
                          className="w-full"
                        />
                      );
                    })()}
                  </TableCell>
                  <TableCell className="p-2">
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium">
                      <Clock className="w-3 h-3 shrink-0" />
                      <input
                        type="number"
                        step="any"
                        min={0}
                        placeholder="Not set"
                        value={editingLogEntry?.effort ?? ''}
                        onChange={(e) => setEditingLogEntry(p => ({ ...p!, effort: e.target.value }))}
                        className="bg-transparent outline-none w-full"
                      />
                    </label>
                  </TableCell>
                  <TableCell className="text-right p-2">
                    <div className="flex items-center justify-end gap-1 pr-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleUpdateLog} disabled={isAddingLog} title={!isAddingLog ? "Save" : undefined}>
                        {isAddingLog ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 text-primary" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingLogId(null); setEditingLogEntry(null); }} title="Cancel">
                        <X className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (() => {
                const isOutside = isLogOutsideActiveWeek(log.startTimeDate, log.endTimeDate);
                const rowContent = (
                  <>
                    <TableCell className="p-3">
                      {getWeekForDate(log.startTimeDate ? new Date(log.startTimeDate) : null)
                        ? `Week ${getWeekForDate(log.startTimeDate ? new Date(log.startTimeDate) : null)}`
                        : 'Week #'}
                    </TableCell>
                    <TableCell className="p-3">
                      {log.startTimeDate ? (
                        log.endTimeDate ? (
                          `${format(new Date(log.startTimeDate), 'PP')} - ${format(new Date(log.endTimeDate), 'PP')}`
                        ) : (
                          format(new Date(log.startTimeDate), 'PP')
                        )
                      ) : (
                        'Not set'
                      )}
                    </TableCell>
                    <TableCell className="p-3">{log.effort}</TableCell>
                    {canEditLogs && (
                      <TableCell className="p-2 text-right">
                        <div className="flex items-center justify-end gap-1 h-full pr-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            title="Edit"
                            disabled={isOutside}
                            onClick={() => {
                              setEditingLogId(log.id);
                              setEditingLogEntry({
                                startTimeDate: log.startTimeDate ? new Date(log.startTimeDate) : null,
                                endTimeDate: log.endTimeDate ? new Date(log.endTimeDate) : null,
                                effort: log.effort,
                                note: log.note || '',
                              });
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive text-destructive"
                            title="Delete"
                            disabled={isOutside}
                            onClick={() => handleDeleteLog(log.id)}
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </>
                );

                const rowElement = (
                  <TableRow
                    key={log.id}
                    className={cn(
                      "text-xs font-medium text-muted-foreground",
                      isOutside ? "opacity-50 hover:bg-transparent cursor-not-allowed" : ""
                    )}
                  >
                    {rowContent}
                  </TableRow>
                );

                return isOutside ? (
                  <TooltipProvider key={log.id}>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        {rowElement}
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Cannot change another week's log info here.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  rowElement
                );
              })()
            )
          ) : (
            <TableRow>
              <TableCell colSpan={canEditLogs ? 4 : 3} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <Info className="h-6 w-6 mb-2 text-muted-foreground/50" />
                  <span className="text-sm font-medium">No logs found</span>
                  <span className="text-xs mt-0.5">Your logged time against this {postType ? postType.toLowerCase() : 'work'} will appear here.</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {totalLogPages > 1 && (
          <TableFooter className="bg-transparent">
            <TableRow>
              <TableCell colSpan={canEditLogs ? 4 : 3} className="p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Page {logPage} of {totalLogPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={logPage === 1}
                      onClick={() => setLogPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={logPage === totalLogPages}
                      onClick={() => setLogPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
      {!canEditLogs && !hideNotice && (
        <div className="px-3 py-2 text-xs text-primary flex items-center gap-1 mt-2">
          <Info className="w-3.5 h-3.5" />
          You cannot change your previous work log because you are not currently an assignee or co-assignee in this task.
        </div>
      )}
    </>
  );
}

