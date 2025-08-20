import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const homeDir = os.homedir();
const baseDir = path.join(homeDir, '.ghost_ai');

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
  // Default prompt is always 'default.txt' if it exists
  const def = fs.existsSync(path.join(promptsDir, 'default.txt')) ? 'default.txt' : null;

  return { prompts: files, defaultPrompt: def };
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
  // Selection sets the content of 'default.txt' to the content of the chosen file.
  ensureDirs();
  const sourceName = normalizeName(name);
  const sourceFull = path.join(promptsDir, sourceName);
  const targetFull = path.join(promptsDir, 'default.txt');

  try {
    const content = fs.existsSync(sourceFull) ? fs.readFileSync(sourceFull, 'utf8') : '';

    fs.writeFileSync(targetFull, content ?? '', 'utf8');
  } catch {}

  return 'default.txt';
}

export function readPrompt(name?: string): string {
  ensureDirs();
  const fileName = name ? normalizeName(name) : 'default.txt';
  const full = path.join(promptsDir, fileName);

  try {
    return fs.readFileSync(full, 'utf8');
  } catch {
    return '';
  }
}

export function ensureDefaultPrompt(defaultContent?: string): {
  created: boolean;
  defaultPrompt: string;
} {
  ensureDirs();
  const full = path.join(promptsDir, 'default.txt');
  let created = false;

  try {
    if (!fs.existsSync(full)) {
      fs.writeFileSync(full, defaultContent ?? '', 'utf8');
      created = true;
    }
  } catch {}

  return { created, defaultPrompt: 'default.txt' };
}
