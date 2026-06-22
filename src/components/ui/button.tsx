import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

type ButtonClassNameOptions = {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  className?: string | undefined;
};

const baseButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55";

const variantClassNames: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-[var(--shadow-card)] hover:bg-[var(--primary-hover)] focus-visible:outline-ring",
  secondary:
    "border border-border bg-surface text-foreground shadow-[var(--shadow-card)] hover:border-slate-300 hover:bg-surface-muted focus-visible:outline-ring",
  ghost: "text-foreground hover:bg-surface-muted focus-visible:outline-ring",
  danger:
    "bg-danger text-white shadow-[var(--shadow-card)] hover:bg-[var(--danger-hover)] focus-visible:outline-danger",
};

const sizeClassNames: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: ButtonClassNameOptions = {}) {
  return cn(
    baseButtonClassName,
    variantClassNames[variant],
    sizeClassNames[size],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClassName({ variant, size, className })}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
