import { AlertTriangle } from "lucide-react";

type ErrorMessageProps = {
  title?: string | undefined;
  message: string;
};

export function ErrorMessage({
  title = "Something needs attention",
  message,
}: ErrorMessageProps) {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-danger/25 bg-danger/10 p-4 text-sm text-danger"
      role="alert"
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 leading-6">{message}</p>
      </div>
    </div>
  );
}
