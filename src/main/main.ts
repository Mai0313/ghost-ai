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

// __dirname is not defined in ESM; compute it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
// Simple in-memory Q/A history as plain text. Format:
// Q: <question>\nA: <answer>\n\n ...
let conversationHistoryText: string = '';

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
  createWindow();
  createTray();
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
      mainWindow.webContents.send('ask:clear');
      // Also clear main-process conversation history
      conversationHistoryText = '';
    },
    onPrevAnswer: async () => {
      if (!mainWindow) return;
      mainWindow.show();
      mainWindow.webContents.send('text-input:show');
      mainWindow.webContents.send('ask:prev');
    },
    onNextAnswer: async () => {
      if (!mainWindow) return;
      mainWindow.show();
      mainWindow.webContents.send('text-input:show');
      mainWindow.webContents.send('ask:next');
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

  // HUD IPC
  ipcMain.handle('hud:toggle-hide', async () => {
    await toggleHidden(mainWindow);

    return true;
  });

  // Allow renderer to toggle click-through dynamically
  ipcMain.handle('hud:set-mouse-ignore', (_evt, ignore: boolean) => {
    try {
      mainWindow?.setIgnoreMouseEvents(!!ignore, { forward: true });
    } catch {}

    return true;
  });
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
    try {
      ensureHiddenOnCapture();
      const image = await hideAllWindowsDuring(async () => captureScreen());
      const requestId = crypto.randomUUID();

      evt.sender.send('capture:analyze-stream:start', { requestId });

      // Inject prior plain-text history into the text prompt for simple continuity.
      // We keep renderer history for UI navigation only; model context is driven here.
      const combinedTextPrompt = conversationHistoryText
        ? `Previous conversation (plain text):\n${conversationHistoryText}\n\nNew question:\n${(payload.textPrompt ?? '').trim()}`
        : (payload.textPrompt ?? '').trim();

      const result = await openAIClient.analyzeImageWithTextStream(
        image,
        combinedTextPrompt,
        payload.customPrompt,
        requestId,
        (delta) => {
          evt.sender.send('capture:analyze-stream:delta', { requestId, delta });
        },
      );

      evt.sender.send('capture:analyze-stream:done', result);

      // Append to plain-text conversation history
      const question = (payload.textPrompt ?? '').trim();
      const answer = (result?.content ?? '').trim();

      if (question || answer) {
        conversationHistoryText += `Q: ${question}\nA: ${answer}\n\n`;
      }
    } catch (err) {
      const error = String(err ?? 'analyze-stream failed');

      // Best-effort request routing – if requestId isn't known yet, send without
      evt.sender.send('capture:analyze-stream:error', { error });
    }
  },
);

ipcMain.handle('openai:validate-config', async (_, cfg: OpenAIConfig) => {
  return openAIClient.validateConfig(cfg);
});

ipcMain.handle('audio:transcribe', async (_evt, audioBuffer: Buffer) => {
  try {
    return await openAIClient.transcribeAudio(audioBuffer);
  } catch (err) {
    return { text: '', error: String(err ?? 'transcribe failed') } as any;
  }
});
