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
    <label className="grid cursor-pointer gap-3 rounded-lg border border-dashed border-slate-300 bg-surface-subtle px-4 py-6 text-sm transition-colors hover:border-primary hover:bg-primary/5">
      <span className="flex items-center gap-3 text-foreground">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
