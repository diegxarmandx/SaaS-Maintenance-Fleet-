import { Skeleton } from "@/components/ui/skeleton";

export default function InboxLoading() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-20" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  );
}
