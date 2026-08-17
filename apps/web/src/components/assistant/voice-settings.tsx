'use client';

import * as React from 'react';
import { Settings2, X } from 'lucide-react';
import {
  VOICE_PREFERENCES_DEFAULTS,
  VOICE_SPEECH_PITCH_MAX,
  VOICE_SPEECH_PITCH_MIN,
  VOICE_SPEECH_RATE_MAX,
  VOICE_SPEECH_RATE_MIN,
} from '@longeviq/shared';
import { Button } from '@/components/ui/button';
import {
  useUpdateVoicePreferences,
  useVoiceCapabilities,
  useVoicePreferences,
} from '@/lib/voice-hooks';
import { getBrowserVoiceLocales } from '@/lib/speech';

function ToggleRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 accent-primary"
      />
      <span className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}

export function VoiceSettings() {
  const [open, setOpen] = React.useState(false);
  const prefsQuery = useVoicePreferences();
  const capabilitiesQuery = useVoiceCapabilities();
  const update = useUpdateVoicePreferences();

  const prefs = prefsQuery.data?.preferences ?? VOICE_PREFERENCES_DEFAULTS;
  const rateBounds = capabilitiesQuery.data?.capabilities.speechRate ?? {
    min: VOICE_SPEECH_RATE_MIN,
    max: VOICE_SPEECH_RATE_MAX,
  };
  const pitchBounds = capabilitiesQuery.data?.capabilities.speechPitch ?? {
    min: VOICE_SPEECH_PITCH_MIN,
    max: VOICE_SPEECH_PITCH_MAX,
  };
  const voices = React.useMemo(() => (open ? getBrowserVoiceLocales() : []), [open]);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen((value) => !value)}
        aria-label="Voice settings"
        title="Voice settings"
        aria-expanded={open}
      >
        <Settings2 className="size-4" />
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border bg-card p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Voice settings</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close voice settings"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <ToggleRow
                checked={prefs.readAloud}
                onChange={(readAloud) => update.mutate({ readAloud })}
                label="Read replies aloud"
                hint="Show a read-aloud button on assistant replies."
              />
              <ToggleRow
                checked={prefs.autoListen}
                onChange={(autoListen) => update.mutate({ autoListen })}
                label="Automatically read new replies"
                hint="Speak the assistant's answer as soon as it arrives."
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="speech-rate" className="font-medium">
                  Speed
                </label>
                <span className="tabular-nums text-muted-foreground">
                  {prefs.speechRate.toFixed(1)}×
                </span>
              </div>
              <input
                id="speech-rate"
                type="range"
                min={rateBounds.min}
                max={rateBounds.max}
                step={0.1}
                value={prefs.speechRate}
                onChange={(event) => update.mutate({ speechRate: Number(event.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="speech-pitch" className="font-medium">
                  Pitch
                </label>
                <span className="tabular-nums text-muted-foreground">
                  {prefs.speechPitch.toFixed(1)}
                </span>
              </div>
              <input
                id="speech-pitch"
                type="range"
                min={pitchBounds.min}
                max={pitchBounds.max}
                step={0.1}
                value={prefs.speechPitch}
                onChange={(event) => update.mutate({ speechPitch: Number(event.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="speech-voice" className="block text-xs font-medium">
                Voice
              </label>
              <select
                id="speech-voice"
                value={prefs.voiceLocale ?? ''}
                onChange={(event) =>
                  update.mutate({
                    voiceLocale: event.target.value === '' ? null : event.target.value,
                  })
                }
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Browser default</option>
                {voices.map((voice) => (
                  <option key={voice.lang} value={voice.lang}>
                    {voice.label}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Speech runs in your browser with the Web Speech API. Audio never leaves your device.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
