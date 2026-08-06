import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MedicalDisclaimer } from '@/components/layout/medical-disclaimer';

export function CtaSection() {
  return (
    <section className="border-t bg-primary py-20 text-primary-foreground">
      <div className="container mx-auto max-w-4xl px-4 text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Start your journey toward a healthier life
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-primary-foreground/80">
          Sign up for early access and be the first to experience your AI health copilot.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" variant="secondary" className="gap-2">
            <Link href="#features">
              Explore Features
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <div className="mx-auto mt-10 max-w-3xl">
          <MedicalDisclaimer className="border-primary-foreground/20 bg-transparent text-primary-foreground/90" />
        </div>
      </div>
    </section>
  );
}
