import {
  Activity,
  ClipboardList,
  FileText,
  HeartPulse,
  MessageSquareText,
  Mic,
  Salad,
  Timer,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const FEATURES = [
  {
    icon: FileText,
    title: 'Medical Report Upload',
    description:
      'Upload and manage your medical reports in one secure place, then let AI help you understand them.',
  },
  {
    icon: ClipboardList,
    title: 'AI Report Insights',
    description:
      'Get plain-language explanations of your reports using OCR and Retrieval-Augmented Generation.',
  },
  {
    icon: MessageSquareText,
    title: 'Chat with Your Documents',
    description:
      'Ask questions about your own health documents and receive contextual, educational answers.',
  },
  {
    icon: HeartPulse,
    title: 'Health Metric Tracking',
    description:
      'Track blood pressure, heart rate, weight, glucose, sleep and more with trend visualizations.',
  },
  {
    icon: Salad,
    title: 'Nutrition Planner',
    description:
      'Receive personalized, educational nutrition plans aligned with your health profile.',
  },
  {
    icon: Activity,
    title: 'Workout Planner',
    description: 'Get safe, adaptable workout plans designed around your activity level and goals.',
  },
  {
    icon: Timer,
    title: 'Medication Reminders',
    description:
      'Never miss a dose with smart reminders. Reminders only; never prescribing advice.',
  },
  {
    icon: Mic,
    title: 'Voice Assistant',
    description:
      'Interact hands-free with your health copilot using speech-to-text and text-to-speech.',
  },
];

export function Features() {
  return (
    <section id="features" className="border-t bg-muted/40 py-20">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Everything your health journey needs
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            A modular, secure platform that grows with you. Educational and wellness-focused, never
            diagnostic.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Card
              key={feature.title}
              className="transition-shadow hover:shadow-md motion-safe:hover:-translate-y-0.5"
            >
              <CardHeader>
                <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="size-5" aria-hidden="true" />
                </span>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-pretty">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
