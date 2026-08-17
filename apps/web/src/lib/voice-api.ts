import type {
  UpdateVoicePreferencesInput,
  VoiceCapabilities,
  VoicePreferences,
} from '@longeviq/shared';
import { apiGet, apiPut } from '@/lib/api-client';

export function apiGetVoicePreferences(): Promise<{ preferences: VoicePreferences }> {
  return apiGet<{ preferences: VoicePreferences }>('/voice/preferences');
}

export function apiUpdateVoicePreferences(
  input: UpdateVoicePreferencesInput,
): Promise<{ preferences: VoicePreferences }> {
  return apiPut<{ preferences: VoicePreferences }>('/voice/preferences', input);
}

export function apiGetVoiceCapabilities(): Promise<{ capabilities: VoiceCapabilities }> {
  return apiGet<{ capabilities: VoiceCapabilities }>('/voice/config');
}
