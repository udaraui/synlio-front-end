import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export interface DetailsTableRow {
  label: React.ReactNode;
  planned: React.ReactNode;
  actual: React.ReactNode;
}

export interface DetailsTableProps {
  rows: DetailsTableRow[];
}

export function DetailsTable({ rows }: DetailsTableProps) {
  return (
    <Table className="w-full table-fixed border-y [&_th]:border-r [&_th]:border-gray-200 dark:[&_th]:border-gray-800 [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-gray-200 dark:[&_td]:border-gray-800 [&_td:last-child]:border-r-0">
      <TableHeader>
        <TableRow className="text-xs font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 [&_th]:text-gray-900 [&_th]:dark:text-gray-100 [&_th]:font-semibold">
          <TableHead className="w-[80px]"></TableHead>
          {rows.map((row, index) => (
            <TableHead key={index} className="p-3">{row.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="text-xs font-medium text-gray-900 dark:text-gray-100">
          <TableCell className="p-3 bg-muted/10 font-semibold w-[80px]">Planned</TableCell>
          {rows.map((row, index) => (
            <TableCell key={index} className="p-2">{row.planned}</TableCell>
          ))}
        </TableRow>
        <TableRow className="text-xs font-medium text-gray-900 dark:text-gray-100">
          <TableCell className="p-3 bg-muted/10 font-semibold w-[80px]">Actual</TableCell>
          {rows.map((row, index) => (
            <TableCell key={index} className="p-2">{row.actual}</TableCell>
          ))}
        </TableRow>
      </TableBody>
    </Table>
  );
}
