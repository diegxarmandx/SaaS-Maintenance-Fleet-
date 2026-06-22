import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string | undefined;
};

type DataTableProps<T extends { id: string }> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  caption: string;
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  caption,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-border bg-surface-muted text-xs font-semibold uppercase tracking-normal text-slate-600">
          <tr>
            {columns.map((column) => (
              <th
                className={cn("px-4 py-3.5", column.className)}
                key={column.key}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr
              className="align-top transition-colors hover:bg-surface-muted/70"
              key={row.id}
            >
              {columns.map((column) => (
                <td className={cn("px-4 py-3.5", column.className)} key={column.key}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
