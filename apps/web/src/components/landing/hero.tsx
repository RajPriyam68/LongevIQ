'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export function Hero({ statusSlot }: { statusSlot: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12),transparent_55%)]"
        aria-hidden="true"
      />
      <div className="container relative mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:pt-24">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={item} className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
              AI-powered health &amp; wellness copilot
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl"
          >
            Understand your health with the help of <span className="text-primary">AI</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground"
          >
            Upload medical reports, track health metrics, and receive educational nutrition and
            workout plans. Your personal copilot for a longer, healthier life.
          </motion.p>

          <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="gap-2">
              <Link href="#features">
                Explore Features
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#how-it-works">How It Works</Link>
            </Button>
          </motion.div>

          <motion.div variants={item} className="flex justify-center pt-2">
            {statusSlot}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
