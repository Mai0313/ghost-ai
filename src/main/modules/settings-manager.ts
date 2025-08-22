import type { OpenAIConfig, UserSettings } from '@shared/types';

import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

import { safeStorage } from 'electron';
import Store from 'electron-store';

// Persist to ~/.ghost-ai/config.json across platforms
const homeDir = os.homedir();
const configDir = path.join(homeDir, '.ghost-ai');

try {
  fs.mkdirSync(configDir, { recursive: true });
} catch {}

const store = new Store<{ encryptedOpenAI?: string; baseURL?: string; model?: string; userSettings?: Partial<UserSettings> }>({
  cwd: configDir,
  name: 'config',
  fileExtension: 'json',
});

// Keep config minimal but explicit: store encrypted full config and also plain baseURL/model

export function saveOpenAIConfig(cfg: OpenAIConfig) {
  const json = JSON.stringify(cfg);
  const encrypted = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(json).toString('base64')
    : Buffer.from(json).toString('base64');

  store.set('encryptedOpenAI', encrypted);
  try {
    // Persist baseURL and model in plain text for transparency/usability
    if (cfg?.baseURL) store.set('baseURL', cfg.baseURL);
    if (typeof cfg?.model === 'string') store.set('model', cfg.model);
  } catch {}
}

export function loadOpenAIConfig(): OpenAIConfig | null {
  const encrypted = store.get('encryptedOpenAI');

  if (!encrypted) return null;
  try {
    const buf = Buffer.from(encrypted, 'base64');
    const json = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(buf)
      : buf.toString('utf8');
    const parsed = JSON.parse(json) as OpenAIConfig;
    // Override with explicit plain entries if present
    const plainBaseURL = store.get('baseURL');
    const plainModel = store.get('model');

    if (typeof plainBaseURL === 'string' && plainBaseURL) parsed.baseURL = plainBaseURL;
    if (typeof plainModel === 'string') parsed.model = plainModel;

    return parsed;
  } catch {
    return null;
  }
}

export function saveUserSettings(partial: Partial<UserSettings>) {
  try {
    const current = (store.get('userSettings') || {}) as Partial<UserSettings>;
    const merged = { ...current, ...partial } as Partial<UserSettings>;
    store.set('userSettings', merged);
  } catch {}
}

export function loadUserSettings(): Partial<UserSettings> {
  try {
    const ret = (store.get('userSettings') || {}) as Partial<UserSettings>;
    // Provide sensible defaults without forcing a full schema
    if (typeof (ret as any).transcribeLanguage !== 'string') {
      (ret as any).transcribeLanguage = 'en';
    }
    return ret;
  } catch {
    return { transcribeLanguage: 'en' } as any;
  }
}

export function saveHiddenState(hidden: boolean) {
  // No-op: hidden state is not persisted
}

export function loadHiddenState(): boolean {
  // Not persisted; default to false each run
  return false;
}
