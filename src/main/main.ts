import type { OpenAIConfig } from '@shared/types';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

import { app, BrowserWindow, ipcMain, nativeImage, Tray, Menu, screen } from 'electron';
import { openAIClient } from '@shared/openai-client';

import { registerFixedHotkeys, unregisterAllHotkeys } from './modules/hotkey-manager';
import { captureScreen } from './modules/screenshot-manager';
import { toggleHidden, ensureHiddenOnCapture, hideAllWindowsDuring } from './modules/hide-manager';
import {
  loadOpenAIConfig,
  saveOpenAIConfig,
  loadUserSettings,
  saveUserSettings,
} from './modules/settings-manager';
import {
  ensureDefaultPrompt,
  listPrompts,
  readPrompt,
  setDefaultPromptFrom,
  getDefaultPromptName,
} from './modules/prompts-manager';
import { realtimeTranscribeManager } from './modules/realtime-transcribe';
import { logManager } from './modules/log-manager';
import { sessionStore } from './modules/session-store';

// __dirname is not defined in ESM; compute it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
// Simple in-memory Q/A history per session as plain text. Format:
// Q: <question>\nA: <answer>\n\n ...
const conversationHistoryBySession = new Map<string, string>();
// Store the initial (default) prompt actually used for the session's first turn
const initialPromptBySession = new Map<string, string>();
// Guard to prevent Ctrl/Cmd+Shift+Enter from also triggering Ctrl/Cmd+Enter handler
let lastAudioToggleAt = 0;
// Top-level session identifier (resets on app start and when user clears)
let currentSessionId: string = crypto.randomUUID();
// Track active analyze stream AbortControllers per renderer
const activeAnalyzeControllers = new Map<number, AbortController>();

// Detect dev/prod based on Electron packaging state to avoid relying on NODE_ENV
const isDev = !app.isPackaged;

function resolveAssetPath(assetRelativePath: string) {
  // In production, assets placed via extraResources are under process.resourcesPath
  if (!isDev) {
    return path.join(process.resourcesPath, assetRelativePath);
  }

  // In dev, __dirname points to dist/, project root is one level up
  return path.join(__dirname, '..', assetRelativePath);
}

function createWindow() {
  const primary = screen.getPrimaryDisplay();
  const bounds = primary.bounds;

  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    show: true, // start hidden; we only show when user invokes overlay
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    icon: resolveAssetPath('ghost.ico'),
    titleBarStyle: 'hidden',
    hasShadow: false,
    resizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      // Preload is bundled as CommonJS; use .cjs extension
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    const indexHtml = path.join(__dirname, 'renderer', 'index.html');

    mainWindow.loadFile(indexHtml);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Hide menu bar to keep the window minimal and overlay-like
  mainWindow.setMenuBarVisibility(false);
  // Prevent most screen-capture APIs from capturing this window
  try {
    mainWindow.setContentProtection(true);
  } catch {}

  // Make overlay click-through by default; renderer will temporarily disable
  // passthrough when the cursor is over interactive UI.
  try {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  } catch {}
}

function createTray() {
  const trayIconPath = resolveAssetPath('ghost.ico');
  const icon = nativeImage.createFromPath(trayIconPath);

  tray = new Tray(icon);
  tray.setToolTip('Ghost AI');
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Overlay',
      click: () => {
        if (!mainWindow) return;
        mainWindow.show();
        mainWindow.webContents.send('text-input:show');
      },
    },
    { label: 'Toggle Hide', click: () => toggleHidden(mainWindow) },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
}

async function initializeOpenAI() {
  // Minimal default config; real values should be set through renderer via IPC
  const defaultConfig: OpenAIConfig = {
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    model: '',
    timeout: 60000,
    maxTokens: null,
    temperature: 0.7,
  };
  const persisted = loadOpenAIConfig();

  openAIClient.initialize(persisted ?? defaultConfig);
}

app.whenReady().then(async () => {
  await initializeOpenAI();
  // Ensure prompts directory and a default active prompt exist
  try {
    ensureDefaultPrompt();
  } catch {}
  createWindow();
  createTray();
  try {
    console.log(
      '[Global Session]',
      new Date().toISOString(),
      'sessionId created at app start:',
      currentSessionId,
    );
  } catch {}
  // Application menu
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Show Overlay',
          accelerator: 'CommandOrControl+Enter',
          click: () => {
            if (!mainWindow) return;
            mainWindow.show();
            mainWindow.webContents.send('text-input:show');
          },
        },
        {
          label: 'Toggle Hide',
          accelerator: 'CommandOrControl+\\',
          click: () => toggleHidden(mainWindow),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        // Avoid conflicting with renderer Ctrl/Cmd+R (used to clear Ask history)
        { role: 'reload', accelerator: 'F5' },
        { role: 'toggleDevTools' },
      ],
    },
  ];
  const appMenu = Menu.buildFromTemplate(template);

  Menu.setApplicationMenu(appMenu);
  // Fixed hotkeys only: Ask and Hide
  registerFixedHotkeys({
    onTextInput: async () => {
      // Suppress Ask toggle if audio toggle fired very recently (key overlap)
      if (Date.now() - lastAudioToggleAt < 400) {
        console.log('[Hotkey] Suppress Ask toggle due to recent Audio toggle');

        return;
      }
      if (!mainWindow) return;
      mainWindow.show();
      mainWindow.webContents.send('text-input:toggle');
    },
    onToggleHide: async () => {
      await toggleHidden(mainWindow);
    },
    onClearAsk: async () => {
      if (!mainWindow) return;
      // Ensure window is visible so user sees the clear effect
      mainWindow.show();
      // Abort any active analyze stream for this renderer
      try {
        const wcId = mainWindow.webContents.id;
        const ctrl = activeAnalyzeControllers.get(wcId);

        if (ctrl) {
          try {
            ctrl.abort();
          } catch {}
          activeAnalyzeControllers.delete(wcId);
        }
      } catch {}
      mainWindow.webContents.send('ask:clear');
      // Also clear main-process conversation history for all sessions
      conversationHistoryBySession.clear();
      initialPromptBySession.clear();
      // Clear global session entries
      try {
        sessionStore.clearAll();
      } catch {}
      // Generate a new top-level session ID and broadcast
      currentSessionId = crypto.randomUUID();
      try {
        console.log(
          '[Session]',
          new Date().toISOString(),
          'sessionId reset (clear):',
          currentSessionId,
        );
      } catch {}
      // Initialize new session with empty log file to ensure correct path structure
      try {
        await logManager.writeConversationLog(currentSessionId, '');
        const json = sessionStore.toJSON();

        await logManager.writeSessionJson(currentSessionId, json[currentSessionId] ?? {});
      } catch {}
      try {
        mainWindow.webContents.send('session:changed', { sessionId: currentSessionId });
      } catch {}
      // Best-effort: stop any active transcription session for this window
      try {
        realtimeTranscribeManager.stop(mainWindow.webContents);
      } catch {}
    },
    onAudioToggle: async () => {
      lastAudioToggleAt = Date.now();
      if (!mainWindow) return;
      mainWindow.show();
      mainWindow.webContents.send('audio:toggle');
    },
    onScrollUp: async () => {
      if (!mainWindow) return;
      mainWindow.show();
      mainWindow.webContents.send('ask:scroll', { direction: 'up' });
    },
    onScrollDown: async () => {
      if (!mainWindow) return;
      mainWindow.show();
      mainWindow.webContents.send('ask:scroll', { direction: 'down' });
    },
    onPagePrev: async () => {
      if (!mainWindow) return;
      mainWindow.show();
      mainWindow.webContents.send('ask:paginate', { direction: 'up' });
    },
    onPageNext: async () => {
      if (!mainWindow) return;
      mainWindow.show();
      mainWindow.webContents.send('ask:paginate', { direction: 'down' });
    },
  });

  // If no OpenAI config yet, guide user by showing the overlay
  try {
    const cfg = loadOpenAIConfig();

    if (!cfg) {
      mainWindow?.show();
      mainWindow?.webContents.send('text-input:show');
    }
  } catch {}

  // Dynamic hotkey updates are disabled by design (fixed hotkeys)
  ipcMain.handle('settings:get', () => loadUserSettings());
  ipcMain.handle('settings:update', (_evt, partial: any) => {
    saveUserSettings(partial);

    return loadUserSettings();
  });

  // Prompts IPC
  ipcMain.handle('prompts:list', () => listPrompts());
  ipcMain.handle('prompts:read', (_evt, name?: string) => readPrompt(name));
  ipcMain.handle('prompts:set-default', (_evt, name: string) => setDefaultPromptFrom(name));
  ipcMain.handle('prompts:get-default', () => getDefaultPromptName());

  // HUD IPC
  ipcMain.handle('hud:toggle-hide', async () => {
    await toggleHidden(mainWindow);

    return true;
  });

  // App lifecycle IPC
  ipcMain.handle('app:quit', () => {
    try {
      app.quit();
    } catch {}

    return true;
  });

  // Allow renderer to toggle click-through dynamically
  ipcMain.handle('hud:set-mouse-ignore', (_evt, ignore: boolean) => {
    try {
      mainWindow?.setIgnoreMouseEvents(!!ignore, { forward: true });
    } catch {}

    return true;
  });
  // Session IPC
  ipcMain.handle('session:get', () => ({ sessionId: currentSessionId }));
  ipcMain.handle('session:new', async () => {
    // Clear any in-memory conversation history and initial prompt cache
    conversationHistoryBySession.clear();
    initialPromptBySession.clear();
    try {
      sessionStore.clearAll();
    } catch {}
    currentSessionId = crypto.randomUUID();
    try {
      console.log(
        '[Global Session]',
        new Date().toISOString(),
        'sessionId reset (manual):',
        currentSessionId,
      );
    } catch {}
    try {
      mainWindow?.webContents.send('session:changed', { sessionId: currentSessionId });
    } catch {}
    // Initialize new session with empty log file and session JSON to ensure correct path structure
    try {
      await logManager.writeConversationLog(currentSessionId, '');
      const json = sessionStore.toJSON();

      await logManager.writeSessionJson(currentSessionId, json[currentSessionId] ?? {});
    } catch {}

    return { sessionId: currentSessionId };
  });
  ipcMain.handle('session:dump', () => sessionStore.getSessionsData());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  unregisterAllHotkeys();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC Handlers
ipcMain.handle('openai:update-config', async (_, config: Partial<OpenAIConfig>) => {
  openAIClient.updateConfig(config);
  // persist merged config
  const merged = (openAIClient as any).config as OpenAIConfig; // access internal for persistence

  saveOpenAIConfig(merged);

  try {
    // Notify renderers that OpenAI config has changed so they can refresh models
    for (const bw of BrowserWindow.getAllWindows()) {
      try {
        bw.webContents.send('openai:config-updated');
      } catch {}
    }
  } catch {}

  return true;
});

// Update config in-memory without persisting to disk (used to fetch models after user types API key)
ipcMain.handle('openai:update-config-volatile', async (_evt, config: Partial<OpenAIConfig>) => {
  try {
    openAIClient.updateConfig(config);
    try {
      // Notify renderers that OpenAI config has changed in-memory
      for (const bw of BrowserWindow.getAllWindows()) {
        try {
          bw.webContents.send('openai:config-updated');
        } catch {}
      }
    } catch {}

    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('openai:get-config', () => loadOpenAIConfig());

ipcMain.handle('openai:list-models', async () => {
  try {
    return await openAIClient.listModels();
  } catch {
    return [];
  }
});

// Non-streaming analyze IPC removed; use 'capture:analyze-stream' instead

// Streaming analyze (sends start/delta/done/error events)
ipcMain.on(
  'capture:analyze-stream',
  async (evt, payload: { textPrompt: string; customPrompt: string; history?: string | null }) => {
    // Snapshot the sessionId at the start of this request to prevent races with Ctrl+R
    const requestSessionId = currentSessionId;

    try {
      const settings = loadUserSettings();
      const attach =
        typeof (settings as any)?.attachScreenshot === 'boolean'
          ? !!(settings as any).attachScreenshot
          : true;
      let image: Buffer | undefined = undefined;

      if (attach) {
        ensureHiddenOnCapture();
        image = await hideAllWindowsDuring(async () => captureScreen());
      }
      const requestId = crypto.randomUUID();

      evt.sender.send('capture:analyze-stream:start', { requestId, sessionId: requestSessionId });

      // Inject prior plain-text history into the text prompt for simple continuity.
      // If payload.history is provided (regeneration), use it as the prior history override;
      // otherwise use the current session's accumulated history.
      const priorPlain =
        (typeof payload.history === 'string' ? payload.history : null) ??
        conversationHistoryBySession.get(requestSessionId) ??
        '';
      // Ensure the initial prompt (first-turn-only) is preserved in prior context when overriding history
      const initialPromptPrefix = initialPromptBySession.get(requestSessionId) ?? '';
      const priorWithInitial =
        typeof payload.history === 'string'
          ? `${initialPromptPrefix}${priorPlain || ''}`
          : priorPlain;
      const combinedTextPrompt = priorWithInitial
        ? `Previous conversation (plain text):\n${priorWithInitial}\n\nNew question:\n${(payload.textPrompt ?? '').trim()}`
        : (payload.textPrompt ?? '').trim();

      // Load active prompt content only for the first turn of the current session
      const defaultPrompt = (() => {
        try {
          const isFirstTurn = !sessionStore.hasEntries(requestSessionId);

          if (!isFirstTurn) return '';

          return readPrompt() || '';
        } catch {
          return '';
        }
      })();

      if (defaultPrompt) {
        // Cache the initial prompt used for this session so we can reuse it during regen
        initialPromptBySession.set(requestSessionId, defaultPrompt);
      }

      // Create AbortController for this renderer and abort any prior one
      const wcId = evt.sender.id;

      try {
        const prev = activeAnalyzeControllers.get(wcId);

        if (prev) {
          try {
            prev.abort();
          } catch {}
        }
      } catch {}
      const controller = new AbortController();

      activeAnalyzeControllers.set(wcId, controller);

      const result = await openAIClient.responseStream(
        image,
        combinedTextPrompt,
        defaultPrompt,
        requestId,
        (update) => {
          try {
            evt.sender.send('capture:analyze-stream:delta', {
              requestId,
              sessionId: requestSessionId,
              channel: update.channel,
              eventType: update.eventType,
              delta: update.delta,
              text: update.text,
            });
          } catch {}
        },
        requestSessionId,
        controller.signal,
      );

      evt.sender.send('capture:analyze-stream:done', {
        ...result,
        sessionId: requestSessionId,
      });

      // Clear controller on successful completion
      try {
        const cur = activeAnalyzeControllers.get(wcId);

        if (cur === controller) activeAnalyzeControllers.delete(wcId);
      } catch {}

      // Check if this request was aborted (e.g., by Ctrl+R). If so, don't write to log
      // to prevent interrupted conversations from being written to the wrong session
      if (!controller.signal.aborted && requestSessionId === currentSessionId) {
        // Only write to log if not aborted AND the session hasn't changed during analysis
        // Append to plain-text conversation history.
        // If this was a regeneration (payload.history provided), rebuild from that base
        // to avoid duplicating the previous answer.
        const question = (payload.textPrompt ?? '').trim();
        const answer = (result?.content ?? '').trim();

        if (typeof payload.history === 'string') {
          // payload.history already excludes the current page's Q/A
          const base = payload.history || '';
          const rebuilt = `${initialPromptPrefix}${base}`;
          const appended = question || answer ? `Q: ${question}\nA: ${answer}\n\n` : '';
          const updated = rebuilt + appended;

          conversationHistoryBySession.set(requestSessionId, updated);
        } else {
          if (question || answer) {
            const existing = conversationHistoryBySession.get(requestSessionId) ?? '';
            const prefix = existing ? '' : defaultPrompt ? `${defaultPrompt}\n` : '';
            const updated = existing + `${prefix}Q: ${question}\nA: ${answer}\n\n`;

            conversationHistoryBySession.set(requestSessionId, updated);
          }
        }
        // Persist current conversation history for this request for debugging/inspection
        try {
          const logPath = await logManager.writeConversationLog(
            requestSessionId,
            conversationHistoryBySession.get(requestSessionId) ?? '',
          );

          // Track session entry
          sessionStore.appendEntry(requestSessionId, {
            requestId,
            text_input: (payload.textPrompt ?? '').trim(),
            ai_output: answer,
          });
          sessionStore.updateSessionLogPath(requestSessionId, logPath);
          // Persist session store to JSON for debugging/inspection
          try {
            const json = sessionStore.toJSON();

            await logManager.writeSessionJson(requestSessionId, json[requestSessionId] ?? {});
          } catch {}
        } catch {}
      }
    } catch (err) {
      const error = String(err ?? 'analyze-stream failed');
      // If aborted, suppress noisy error; listeners will be cleaned up via ask:clear
      const isAbort =
        typeof err === 'object' &&
        err !== null &&
        String((err as any).name || '')
          .toLowerCase()
          .includes('abort');

      try {
        const wcId = evt.sender.id;

        activeAnalyzeControllers.delete(wcId);
      } catch {}
      if (!isAbort) {
        // Best-effort request routing – if requestId isn't known yet, send without
        // Use the original analysis sessionId, not the current one (which might have changed due to Ctrl+R)
        evt.sender.send('capture:analyze-stream:error', { error, sessionId: requestSessionId });
      }
    }
  },
);

ipcMain.handle('openai:validate-config', async (_, cfg: OpenAIConfig) => {
  return openAIClient.validateConfig(cfg);
});

// Realtime transcription IPC (global handlers)
ipcMain.handle('transcribe:start', async (evt, options: { model?: string }) => {
  const cfg = loadOpenAIConfig();
  const user = loadUserSettings();

  if (!cfg?.apiKey) throw new Error('Missing OpenAI API key');
  realtimeTranscribeManager.start(evt.sender, {
    apiKey: cfg.apiKey,
    model: options?.model,
    sessionId: currentSessionId,
    language: (user as any)?.transcribeLanguage === 'zh' ? 'zh' : 'en',
  });

  return { ok: true };
});
ipcMain.on('transcribe:append', (evt, data: { audio: string }) => {
  if (!data?.audio) return;
  realtimeTranscribeManager.append(evt.sender, data.audio);
});
ipcMain.on('transcribe:end', (evt) => {
  realtimeTranscribeManager.end(evt.sender);
});
ipcMain.on('transcribe:stop', (evt) => {
  realtimeTranscribeManager.stop(evt.sender);
});
