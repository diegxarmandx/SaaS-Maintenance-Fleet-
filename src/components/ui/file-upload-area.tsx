import type { InputHTMLAttributes } from "react";
import { UploadCloud } from "lucide-react";

import { cn } from "@/lib/utils";

type FileUploadAreaProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helperText: string;
};

export function FileUploadArea({
  className,
  label,
  helperText,
  ...props
}: FileUploadAreaProps) {
  return (
    <label className="grid cursor-pointer gap-2 rounded-lg border border-dashed border-border bg-surface px-4 py-5 text-sm transition hover:border-primary">
      <span className="flex items-center gap-3 text-foreground">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-primary">
          <UploadCloud aria-hidden="true" className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-medium">{label}</span>
          <span className="block text-muted">{helperText}</span>
        </span>
      </span>
      <input
        className={cn(
          "block w-full text-sm text-muted file:mr-3 file:min-h-10 file:rounded-md file:border-0 file:bg-primary file:px-3 file:text-sm file:font-medium file:text-primary-foreground",
          className,
        )}
        type="file"
        {...props}
      />
    </label>
  );
}
