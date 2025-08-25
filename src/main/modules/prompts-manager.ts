import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

import { loadUserSettings, saveUserSettings } from './settings-manager';

const homeDir = os.homedir();
const baseDir = path.join(homeDir, '.ghost-ai');

export const promptsDir = path.join(baseDir, 'prompts');

function ensureDirs() {
  try {
    fs.mkdirSync(promptsDir, { recursive: true });
  } catch {}
}

function normalizeName(name: string): string {
  const trimmed = (name || '').trim();

  if (!trimmed) return 'default.txt';
  const withExt = /\.[a-zA-Z0-9]+$/.test(trimmed) ? trimmed : `${trimmed}.txt`;

  // Prevent path traversal
  return withExt.replace(/[\\/]+/g, '_');
}

export function listPrompts(): { prompts: string[]; defaultPrompt: string | null } {
  ensureDirs();
  const files = (() => {
    try {
      return fs
        .readdirSync(promptsDir, { withFileTypes: true })
        .filter((ent) => ent.isFile())
        .map((ent) => ent.name)
        .filter((f) => /\.(txt|md|prompt)$/i.test(f));
    } catch {
      return [] as string[];
    }
  })();
  // Try to read active prompt name from user settings if available
  let active: string | null = null;

  try {
    const s = loadUserSettings() as any;
    const name = typeof s?.defaultPrompt === 'string' ? normalizeName(s.defaultPrompt) : null;

    if (name && files.includes(name)) active = name;
  } catch {}

  // Return active selection (or null) as `defaultPrompt` for UI display
  return { prompts: files, defaultPrompt: active } as any;
}

export function getDefaultPromptName(): string | null {
  ensureDirs();
  try {
    return fs.existsSync(path.join(promptsDir, 'default.txt')) ? 'default.txt' : null;
  } catch {
    return null;
  }
}

export function setDefaultPromptFrom(name: string): string {
  // Persist selection by name only (do not write any prompt files)
  ensureDirs();
  const sourceName = normalizeName(name);

  try {
    saveUserSettings({ defaultPrompt: sourceName } as any);
  } catch {}

  return sourceName;
}

export function readPrompt(name?: string): string {
  ensureDirs();
  let fileName: string | null = null;

  if (name) fileName = normalizeName(name);
  else {
    try {
      const s = loadUserSettings() as any;
      const n = typeof s?.defaultPrompt === 'string' ? normalizeName(s.defaultPrompt) : null;

      fileName = n || null;
    } catch {
      fileName = null;
    }
  }
  if (!fileName) return '';
  const full = path.join(promptsDir, fileName);

  try {
    return fs.readFileSync(full, 'utf8');
  } catch {
    return '';
  }
}

export function ensureDefaultPrompt(_defaultContent?: string): {
  created: boolean;
  defaultPrompt: string;
} {
  // No-op: do not create or write any prompt files.
  ensureDirs();

  return { created: false, defaultPrompt: 'default.txt' };
}

// New helpers for active prompt persistence and retrieval
export function getActivePromptName(): string | null {
  try {
    const s = loadUserSettings() as any;
    const name = typeof s?.defaultPrompt === 'string' ? normalizeName(s.defaultPrompt) : null;

    if (!name) return null;
    const full = path.join(promptsDir, name);

    return fs.existsSync(full) ? name : null;
  } catch {
    return null;
  }
}

export function setActivePromptName(name: string): string {
  ensureDirs();
  const norm = normalizeName(name);

  try {
    saveUserSettings({ defaultPrompt: norm } as any);
  } catch {}

  return norm;
}
