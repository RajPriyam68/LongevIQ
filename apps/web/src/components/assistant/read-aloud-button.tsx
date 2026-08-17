'use client';

import * as React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { speak, stopSpeaking } from '@/lib/speech';

interface ReadAloudButtonProps {
  text: string;
  enabled?: boolean;
  rate?: number;
  pitch?: number;
  locale?: string | null;
  label?: string;
}

export function ReadAloudButton({
  text,
  enabled = true,
  rate = 1,
  pitch = 1,
  locale = null,
  label = 'Read the reply aloud',
}: ReadAloudButtonProps) {
  const [speaking, setSpeaking] = React.useState(false);

  if (!enabled) return null;

  const toggle = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const started = speak(text, {
      rate,
      pitch,
      locale,
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
    if (started) setSpeaking(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={speaking ? 'Stop reading' : label}
      title={speaking ? 'Stop reading' : label}
      aria-pressed={speaking}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {speaking ? <Volume2 className="size-3.5 animate-pulse" /> : <VolumeX className="size-3.5" />}
      {speaking ? 'Reading…' : 'Read aloud'}
    </button>
  );
}
