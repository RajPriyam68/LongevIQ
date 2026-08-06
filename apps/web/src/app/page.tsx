import { Suspense } from 'react';
import { Hero } from '@/components/landing/hero';
import { Features } from '@/components/landing/features';
import { HowItWorks } from '@/components/landing/how-it-works';
import { CtaSection } from '@/components/landing/cta-section';
import { ApiStatus } from '@/components/api-status';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <>
      <Hero
        statusSlot={
          <Suspense fallback={<Skeleton className="h-6 w-32 rounded-full" />}>
            <ApiStatus />
          </Suspense>
        }
      />
      <Features />
      <HowItWorks />
      <CtaSection />
    </>
  );
}
