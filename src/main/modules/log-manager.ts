import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

function resolveLogsDir(): string {
  const home = os.homedir();

  return path.join(home, '.ghost_ai', 'logs');
}

export async function writeConversationLog(sessionId: string, content: string): Promise<string> {
  const logsDir = resolveLogsDir();
  const safeSessionId = sessionId.replace(/[^a-zA-Z0-9-_]/g, '');
  const sessionDir = path.join(logsDir, safeSessionId);

  await fs.mkdir(sessionDir, { recursive: true });
  const filePath = path.join(sessionDir, `${safeSessionId}.log`);

  await fs.writeFile(filePath, content ?? '', { encoding: 'utf8' });

  return filePath;
}

export async function writeSessionJson(sessionId: string, payload: any): Promise<string> {
  const logsDir = resolveLogsDir();
  const safeSessionId = sessionId.replace(/[^a-zA-Z0-9-_]/g, '');
  const sessionDir = path.join(logsDir, safeSessionId);

  await fs.mkdir(sessionDir, { recursive: true });
  const filePath = path.join(sessionDir, `${safeSessionId}.json`);

  const body = JSON.stringify(payload ?? {}, null, 2);

  await fs.writeFile(filePath, body, { encoding: 'utf8' });

  return filePath;
}

export const logManager = {
  writeConversationLog,
  writeSessionJson,
};
