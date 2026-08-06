import { FileUp, ScanText, Sparkles, TrendingUp } from 'lucide-react';

const STEPS = [
  {
    icon: FileUp,
    step: '01',
    title: 'Upload reports',
    description:
      'Safely store your medical reports and health documents in your personal, encrypted library.',
  },
  {
    icon: ScanText,
    step: '02',
    title: 'AI understands them',
    description: 'OCR extracts the text and AI summarizes key points in clear, plain language.',
  },
  {
    icon: Sparkles,
    step: '03',
    title: 'Ask questions',
    description: 'Chat with your documents and get contextual answers grounded in your own data.',
  },
  {
    icon: TrendingUp,
    step: '04',
    title: 'Track and improve',
    description:
      'Monitor trends and receive educational nutrition, workout, and wellness guidance.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            From document to insight in four simple steps.
          </p>
        </div>

        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <li key={step.step} className="relative">
              <div className="flex flex-col gap-3">
                <span className="flex size-12 items-center justify-center rounded-xl border bg-card shadow-sm">
                  <step.icon className="size-6 text-primary" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Step {step.step}
                </span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-pretty text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
