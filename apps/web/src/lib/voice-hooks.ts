'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateVoicePreferencesInput } from '@longeviq/shared';
import { onSpeakingChange, isSpeaking } from '@/lib/speech';
import {
  apiGetVoiceCapabilities,
  apiGetVoicePreferences,
  apiUpdateVoicePreferences,
} from '@/lib/voice-api';

const PREFERENCES_KEY = ['voice-preferences'];
const CAPABILITIES_KEY = ['voice-capabilities'];

export function useVoicePreferences() {
  return useQuery({
    queryKey: PREFERENCES_KEY,
    queryFn: apiGetVoicePreferences,
  });
}

export function useVoiceCapabilities() {
  return useQuery({
    queryKey: CAPABILITIES_KEY,
    queryFn: apiGetVoiceCapabilities,
    staleTime: Infinity,
  });
}

export function useUpdateVoicePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateVoicePreferencesInput) => apiUpdateVoicePreferences(input),
    onSuccess: (result) => {
      queryClient.setQueryData(PREFERENCES_KEY, result);
    },
  });
}

// Subscribes the component to the module-level speech engine state so read-aloud
// buttons stay in sync even when speech is started or cancelled elsewhere.
export function useSpeakingState(): boolean {
  const subscribe = React.useCallback((listener: () => void) => onSpeakingChange(listener), []);
  return React.useSyncExternalStore(subscribe, isSpeaking, () => false);
}
