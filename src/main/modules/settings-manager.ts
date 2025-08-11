import type { OpenAIConfig, UserSettings } from '@shared/types';

import Store from 'electron-store';
import { safeStorage } from 'electron';

const store = new Store<{
  encryptedOpenAI?: string;
  userSettings?: Omit<UserSettings, 'openaiConfig'>;
}>();

export function saveOpenAIConfig(cfg: OpenAIConfig) {
  const json = JSON.stringify(cfg);
  const encrypted = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(json).toString('base64')
    : Buffer.from(json).toString('base64');

  store.set('encryptedOpenAI', encrypted);
}

export function loadOpenAIConfig(): OpenAIConfig | null {
  const encrypted = store.get('encryptedOpenAI');

  if (!encrypted) return null;
  try {
    const buf = Buffer.from(encrypted, 'base64');
    const json = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(buf)
      : buf.toString('utf8');

    return JSON.parse(json) as OpenAIConfig;
  } catch {
    return null;
  }
}

export function saveUserSettings(partial: Partial<UserSettings>) {
  const current = store.get('userSettings') ?? {};

  store.set('userSettings', { ...current, ...partial });
}

export function loadUserSettings(): Partial<UserSettings> {
  return store.get('userSettings') ?? {};
}
