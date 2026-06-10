import type { HTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

type MobileCardListProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export function MobileCardList({ className, children, ...props }: MobileCardListProps) {
  return (
    <div className={cn("grid gap-3", className)} {...props}>
      {children}
    </div>
  );
}
