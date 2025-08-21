import type { OpenAIConfig } from '@shared/types';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

import { app, BrowserWindow, ipcMain, nativeImage, Tray, Menu, screen } from 'electron';
import { openAIClient } from '@shared/openai-client';

import { registerFixedHotkeys, unregisterAllHotkeys } from './modules/hotkey-manager';
import { captureScreen } from './modules/screenshot-manager';
import { toggleHidden, ensureHiddenOnCapture, hideAllWindowsDuring } from './modules/hide-manager';
import { loadOpenAIConfig, saveOpenAIConfig, loadUserSettings } from './modules/settings-manager';
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
// Simple in-memory Q/A history as plain text. Format:
// Q: <question>\nA: <answer>\n\n ...
let conversationHistoryText: string = '';
// Guard to prevent Ctrl/Cmd+Shift+Enter from also triggering Ctrl/Cmd+Enter handler
let lastAudioToggleAt = 0;
// Top-level session identifier (resets on app start and when user clears)
let currentSessionId: string = crypto.randomUUID();
// Track active analyze stream AbortControllers per renderer
const activeAnalyzeControllers = new Map<number, AbortController>();

const isDev = process.env.NODE_ENV !== 'production';

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
    maxTokens: 1000,
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
      // Also clear main-process conversation history
      conversationHistoryText = '';
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
    // No-op persistence (we do not store arbitrary userSettings anymore)
    return { ...loadUserSettings(), ...partial };
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
    conversationHistoryText = '';
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

  return true;
});

// Update config in-memory without persisting to disk (used to fetch models after user types API key)
ipcMain.handle('openai:update-config-volatile', async (_evt, config: Partial<OpenAIConfig>) => {
  try {
    openAIClient.updateConfig(config);

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
  async (evt, payload: { textPrompt: string; customPrompt: string; history?: any[] }) => {
    // Record the sessionId at the start of this analysis to prevent race conditions with Ctrl+R
    const analysisSessionId = currentSessionId;
    try {
      ensureHiddenOnCapture();
      const image = await hideAllWindowsDuring(async () => captureScreen());
      const requestId = crypto.randomUUID();

      evt.sender.send('capture:analyze-stream:start', { requestId, sessionId: analysisSessionId });

      // Inject prior plain-text history into the text prompt for simple continuity.
      // We keep renderer history for UI navigation only; model context is driven here.
      const combinedTextPrompt = conversationHistoryText
        ? `Previous conversation (plain text):\n${conversationHistoryText}\n\nNew question:\n${(payload.textPrompt ?? '').trim()}`
        : (payload.textPrompt ?? '').trim();

      // Load active prompt content only for the first turn of the current session
      const defaultPrompt = (() => {
        try {
          const isFirstTurn = !sessionStore.hasEntries(analysisSessionId);

          if (!isFirstTurn) return '';

          return readPrompt() || '';
        } catch {
          return '';
        }
      })();

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

      const result = await openAIClient.completionWithTextStream(
        image,
        combinedTextPrompt,
        defaultPrompt,
        requestId,
        (delta) => {
          evt.sender.send('capture:analyze-stream:delta', {
            requestId,
            delta,
            sessionId: analysisSessionId,
          });
        },
        analysisSessionId,
        controller.signal,
      );

      evt.sender.send('capture:analyze-stream:done', {
        ...result,
        sessionId: analysisSessionId,
      });

      // Clear controller on successful completion
      try {
        const cur = activeAnalyzeControllers.get(wcId);

        if (cur === controller) activeAnalyzeControllers.delete(wcId);
      } catch {}

      // Check if this request was aborted (e.g., by Ctrl+R). If so, don't write to log
      // to prevent interrupted conversations from being written to the wrong session
      if (!controller.signal.aborted && analysisSessionId === currentSessionId) {
        // Only write to log if not aborted AND the session hasn't changed during analysis
        
        // Append to plain-text conversation history
        const question = (payload.textPrompt ?? '').trim();
        const answer = (result?.content ?? '').trim();

        if (question || answer) {
          conversationHistoryText += `${defaultPrompt}\nQ: ${question}\nA: ${answer}\n\n`;
        }
        // Persist current conversation history for this request for debugging/inspection
        try {
          const logPath = await logManager.writeConversationLog(
            analysisSessionId,
            conversationHistoryText,
          );

          // Track session entry
          sessionStore.appendEntry(analysisSessionId, {
            requestId,
            text_input: (payload.textPrompt ?? '').trim(),
            ai_output: answer,
          });
          sessionStore.updateSessionLogPath(analysisSessionId, logPath);
          // Persist session store to JSON for debugging/inspection
          try {
            const json = sessionStore.toJSON();

            await logManager.writeSessionJson(analysisSessionId, json[analysisSessionId] ?? {});
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
        evt.sender.send('capture:analyze-stream:error', { error, sessionId: analysisSessionId });
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

  if (!cfg?.apiKey) throw new Error('Missing OpenAI API key');
  realtimeTranscribeManager.start(evt.sender, {
    apiKey: cfg.apiKey,
    model: options?.model,
    sessionId: currentSessionId,
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
