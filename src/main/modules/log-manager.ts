import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

function resolveLogsDir(): string {
  const home = os.homedir();

  return path.join(home, '.ghost_ai', 'logs');
}

export async function writeConversationLog(requestId: string, content: string): Promise<string> {
  const logsDir = resolveLogsDir();

  await fs.mkdir(logsDir, { recursive: true });
  const safeRequestId = requestId.replace(/[^a-zA-Z0-9-_]/g, '');
  const filePath = path.join(logsDir, `${safeRequestId}.log`);

  await fs.writeFile(filePath, content ?? '', { encoding: 'utf8' });

  return filePath;
}

export const logManager = {
  writeConversationLog,
};


