import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const homeDir = os.homedir();
const baseDir = path.join(homeDir, '.ghost_ai');

export const promptsDir = path.join(baseDir, 'prompts');
const activeFile = path.join(promptsDir, 'active.txt');

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

export function listPrompts(): { prompts: string[]; active: string | null } {
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
  const active = getActivePromptName();

  return { prompts: files, active };
}

export function getActivePromptName(): string | null {
  ensureDirs();
  try {
    const name = fs.readFileSync(activeFile, 'utf8').trim();

    return name || null;
  } catch {
    return null;
  }
}

export function setActivePromptName(name: string): string {
  ensureDirs();
  const fileName = normalizeName(name);

  try {
    fs.writeFileSync(activeFile, fileName, 'utf8');
  } catch {}

  return fileName;
}

export function readPrompt(name?: string): string {
  ensureDirs();
  let fileName = name ? normalizeName(name) : getActivePromptName();

  if (!fileName) return '';
  const full = path.join(promptsDir, fileName);

  try {
    return fs.readFileSync(full, 'utf8');
  } catch {
    return '';
  }
}

export function writePrompt(name: string, content: string): string {
  ensureDirs();
  const fileName = normalizeName(name);
  const full = path.join(promptsDir, fileName);

  try {
    fs.writeFileSync(full, content ?? '', 'utf8');
  } catch {}

  return fileName;
}

export function deletePrompt(name: string): boolean {
  ensureDirs();
  const fileName = normalizeName(name);
  const full = path.join(promptsDir, fileName);

  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
    // If we deleted the active prompt, clear active
    const active = getActivePromptName();

    if (active && active === fileName) {
      try {
        fs.unlinkSync(activeFile);
      } catch {}
    }

    return true;
  } catch {
    return false;
  }
}

export function ensureDefaultPrompt(defaultContent?: string): { created: boolean; active: string } {
  ensureDirs();
  const current = getActivePromptName();

  if (current) return { created: false, active: current };

  const fileName = 'default.txt';
  const full = path.join(promptsDir, fileName);

  try {
    if (!fs.existsSync(full)) {
      fs.writeFileSync(
        full,
        defaultContent ??
          'You are a helpful assistant. Analyze the screenshot and answer the question clearly and concisely.',
        'utf8',
      );
    }
  } catch {}
  setActivePromptName(fileName);

  return { created: true, active: fileName };
}
