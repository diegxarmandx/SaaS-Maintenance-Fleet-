import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = {
  id: string;
  label: string;
  error?: string | undefined;
  helperText?: string | undefined;
  required?: boolean | undefined;
  className?: string | undefined;
  children: ReactNode;
};

export function Field({
  id,
  label,
  error,
  helperText,
  required = false,
  className,
  children,
}: FieldProps) {
  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {children}
      {helperText ? (
        <p className="text-sm leading-5 text-muted" id={helperId}>
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm leading-5 text-danger" id={errorId} role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
