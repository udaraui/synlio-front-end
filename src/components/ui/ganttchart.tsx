"use client";

import { useMemo } from "react";
import { format, differenceInDays, eachDayOfInterval, parseISO } from "date-fns";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";

type Task = {
  id: string;
  description: string;
  start_date: Date;
  plan_end_date: Date;
  children?: Task[];
  level: number;
};

interface GanttProps {
  tasks: Task[];
}

export function GanttChart({ tasks }: GanttProps) {
   // 1. Flatten & normalize dates
  const flatTasks = useMemo<Task[]>(() => {
    const out: Task[] = [];
    function walk(ts: Task[]) {
      for (let t of ts) {
        // coerce strings → Date
        const start = typeof t.start_date === "string"
          ? parseISO(t.start_date)
          : t.start_date;
        const end = typeof t.plan_end_date === "string"
          ? parseISO(t.plan_end_date)
          : t.plan_end_date;

        // you may also want to guard null/undefined here
        if (!start || !end) continue;

        out.push({
          ...t,
          start_date: start,
          plan_end_date: end,
        });
        if (t.children) walk(t.children);
      }
    }
    walk(tasks);
    return out;
  }, [tasks]);

  // 2. Compute bounds safely
  const [minDate, maxDate] = useMemo<[Date, Date]>(() => {
    const times = flatTasks.flatMap(t => [
      t.start_date.getTime(),
      t.plan_end_date.getTime(),
    ]);
    const min = new Date(Math.min(...times));
    const max = new Date(Math.max(...times));
    return [min, max];
  }, [flatTasks]);

  // 3. Generate a column per day
  const days = useMemo(
    () => eachDayOfInterval({ start: minDate, end: maxDate }),
    [minDate, maxDate]
  );

  // cell width in px
  const CELL_W = 24;

  return (
    <div className="overflow-auto">
      <Table className="min-w-max">
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/4">Task</TableHead>
            <TableHead className="w-1/8">Start</TableHead>
            <TableHead className="w-1/8">End</TableHead>
            <TableHead>
              <div className="flex">
                {days.map((d) => (
                  <div
                    key={d.toISOString()}
                    style={{ width: CELL_W }}
                    className="text-xs text-center border-r"
                  >
                    {format(d, "MM/dd")}
                  </div>
                ))}
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flatTasks.map((t) => {
            const offset = differenceInDays(t.start_date, minDate);
            const span = differenceInDays(t.plan_end_date, t.start_date) + 1;
            return (
              <TableRow key={t.id} className="relative">
                <TableCell style={{ paddingLeft: `${t.level * 1.5}rem` }}>
                  {t.description}
                </TableCell>
                <TableCell>{format(t.start_date, "yyyy-MM-dd")}</TableCell>
                <TableCell>{format(t.plan_end_date, "yyyy-MM-dd")}</TableCell>
                <TableCell className="p-0">
                  <div
                    className="absolute h-4 bg-blue-400 rounded"
                    style={{
                      left: offset * CELL_W,
                      width: span * CELL_W,
                      top: 0,
                    }}
                  />
                  {/* an empty spacer row for the grid lines */}
                  <div
                    className="flex"
                    style={{ height: "1rem" }}
                  >
                    {days.map((d) => (
                      <div
                        key={d.toISOString()}
                        style={{ width: CELL_W }}
                        className="border-r opacity-20"
                      />
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
