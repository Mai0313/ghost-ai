import type { OpenAIConfig, UserSettings } from '@shared/types';

import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

import { safeStorage } from 'electron';
import Store from 'electron-store';

// Persist to ~/.ghost_ai/config.json across platforms
const homeDir = os.homedir();
const configDir = path.join(homeDir, '.ghost_ai');

try {
  fs.mkdirSync(configDir, { recursive: true });
} catch {}

const store = new Store<{ encryptedOpenAI?: string }>({
  cwd: configDir,
  name: 'config',
  fileExtension: 'json',
});

// Cleanup: ensure we do NOT persist any keys other than 'encryptedOpenAI'
try {
  // @ts-ignore accessing unknown keys tolerated for cleanup
  if ((store as any).has && (store as any).has('userSettings')) {
    // @ts-ignore
    (store as any).delete('userSettings');
  }
  // @ts-ignore
  if ((store as any).has && (store as any).has('hiddenState')) {
    // @ts-ignore
    (store as any).delete('hiddenState');
  }
  // @ts-ignore
  if ((store as any).has && (store as any).has('migratedFromLegacy')) {
    // @ts-ignore
    (store as any).delete('migratedFromLegacy');
  }
} catch {}

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
  // No-op: userSettings are not persisted anymore
}

export function loadUserSettings(): Partial<UserSettings> {
  // No-op: return empty; nothing persisted
  return {};
}

export function saveHiddenState(hidden: boolean) {
  // No-op: hidden state is not persisted
}

export function loadHiddenState(): boolean {
  // Not persisted; default to false each run
  return false;
}
