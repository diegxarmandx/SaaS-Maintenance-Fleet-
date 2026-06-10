import { CheckCircle2, Info } from "lucide-react";

type ToastRegionProps = {
  message?: string | undefined;
  tone?: "success" | "info" | undefined;
};

export function ToastRegion({ message, tone = "info" }: ToastRegionProps) {
  if (!message) {
    return null;
  }

  const Icon = tone === "success" ? CheckCircle2 : Info;

  return (
    <div aria-live="polite" className="fixed bottom-4 right-4 z-40 max-w-sm">
      <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 text-sm text-foreground shadow-lg">
        <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="leading-6">{message}</p>
      </div>
    </div>
  );
}
