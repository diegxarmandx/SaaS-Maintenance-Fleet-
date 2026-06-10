"use client";

import type { FormHTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";

type ConfirmationSubmitProps = FormHTMLAttributes<HTMLFormElement> & {
  message: string;
  confirmLabel: string;
  children?: ReactNode;
};

export function ConfirmationSubmit({
  message,
  confirmLabel,
  children,
  onSubmit,
  ...props
}: ConfirmationSubmitProps) {
  return (
    <form
      onSubmit={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
          return;
        }

        onSubmit?.(event);
      }}
      {...props}
    >
      {children ?? (
        <Button type="submit" variant="danger">
          {confirmLabel}
        </Button>
      )}
    </form>
  );
}
