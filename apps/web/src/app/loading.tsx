import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto max-w-6xl space-y-8 px-4 py-16" aria-busy="true">
      <div className="space-y-4 text-center">
        <Skeleton className="mx-auto h-6 w-56" />
        <Skeleton className="mx-auto h-12 w-full max-w-2xl" />
        <Skeleton className="mx-auto h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-48" />
        ))}
      </div>
    </div>
  );
}
