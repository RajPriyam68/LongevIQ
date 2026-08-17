'use client';

import * as React from 'react';
import { Mic, MicOff } from 'lucide-react';
import {
  createSpeechRecognizer,
  speechRecognitionSupported,
  type SpeechRecognizer,
} from '@/lib/speech';
import { Button } from '@/components/ui/button';

interface VoiceInputButtonProps {
  onTranscript: (transcript: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function VoiceInputButton({ onTranscript, onError, disabled }: VoiceInputButtonProps) {
  const [listening, setListening] = React.useState(false);
  const [supported, setSupported] = React.useState(false);
  const recognizerRef = React.useRef<SpeechRecognizer | null>(null);

  // Feature detection must run after mount so server rendering (no window) and
  // the first client render agree, avoiding a hydration mismatch.
  React.useEffect(() => {
    setSupported(speechRecognitionSupported());
  }, []);

  const stop = React.useCallback(() => {
    recognizerRef.current?.stop();
  }, []);

  const toggle = React.useCallback(() => {
    if (listening) {
      stop();
      return;
    }
    if (!supported) return;
    recognizerRef.current = createSpeechRecognizer({
      onResult: (transcript, isFinal) => {
        if (isFinal && transcript) onTranscript(transcript);
      },
      onEnd: () => {
        recognizerRef.current = null;
        setListening(false);
      },
      onError: (error) => {
        recognizerRef.current = null;
        setListening(false);
        onError?.(error);
      },
    });
    recognizerRef.current?.start();
    setListening(true);
  }, [listening, supported, stop, onTranscript, onError]);

  React.useEffect(() => stop, [stop]);

  if (!supported) return null;

  return (
    <Button
      type="button"
      variant={listening ? 'default' : 'outline'}
      size="icon"
      onClick={toggle}
      disabled={disabled}
      aria-label={listening ? 'Stop voice input' : 'Start voice input'}
      title={listening ? 'Stop listening' : 'Speak your question'}
      aria-pressed={listening}
      className={listening ? 'animate-pulse' : undefined}
    >
      {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
    </Button>
  );
}
