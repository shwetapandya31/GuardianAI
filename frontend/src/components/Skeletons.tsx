import { Skeleton } from "@/components/ui/skeleton";

export function AlertSkeleton() {
  return (
    <div className="glass flex gap-3 rounded-2xl p-3">
      <Skeleton className="size-20 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="glass space-y-3 rounded-2xl p-4">
      <Skeleton className="size-9 rounded-xl" />
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function CameraSkeleton() {
  return (
    <div className="glass space-y-3 rounded-2xl p-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}
