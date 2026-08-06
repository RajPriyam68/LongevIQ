import Link from 'next/link';
import { Activity } from 'lucide-react';
import { APP_NAME } from '@longeviq/shared';
import { MedicalDisclaimer } from '@/components/layout/medical-disclaimer';

export function SiteFooter() {
  return (
    <footer id="disclaimer" className="border-t bg-background">
      <div className="container mx-auto max-w-6xl space-y-8 px-4 py-10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <Link href="/" className="flex items-center gap-2" aria-label={`${APP_NAME} home`}>
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="size-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-bold">{APP_NAME}</span>
          </Link>
          <nav className="flex gap-6" aria-label="Footer">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              How It Works
            </Link>
            <Link
              href="#disclaimer"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Disclaimer
            </Link>
          </nav>
        </div>

        <MedicalDisclaimer />

        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {APP_NAME}. Educational &amp; wellness-focused. Not a
          medical device.
        </p>
      </div>
    </footer>
  );
}
