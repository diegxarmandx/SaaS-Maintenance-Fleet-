import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonClassName } from "@/components/ui/button";

type PaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  getHref: (page: number) => string;
};

export function Pagination({ page, pageSize, totalCount, getHref }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between"
    >
      <p>
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {hasPrevious ? (
          <Link
            className={buttonClassName({ variant: "secondary", size: "sm" })}
            href={getHref(page - 1)}
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            Previous
          </Link>
        ) : null}
        {hasNext ? (
          <Link
            className={buttonClassName({ variant: "secondary", size: "sm" })}
            href={getHref(page + 1)}
          >
            Next
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
