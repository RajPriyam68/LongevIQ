import { AlertCircle } from 'lucide-react';
import { MEDICAL_DISCLAIMER } from '@longeviq/shared';

export function MedicalDisclaimer({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100 ${className ?? ''}`}
      role="note"
      aria-label="Medical disclaimer"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{MEDICAL_DISCLAIMER}</p>
    </div>
  );
}
