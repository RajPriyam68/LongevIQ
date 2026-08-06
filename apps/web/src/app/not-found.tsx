import Link from 'next/link';
import { Compass, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Compass className="size-7" aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Page not found</h2>
        <p className="max-w-md text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <Button asChild className="gap-2">
        <Link href="/">
          <Home className="size-4" aria-hidden="true" />
          Back to home
        </Link>
      </Button>
    </div>
  );
}
