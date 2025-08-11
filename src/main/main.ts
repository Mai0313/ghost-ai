import type { OpenAIConfig } from '@shared/types';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { app, BrowserWindow, ipcMain, nativeImage, Tray, Menu } from 'electron';
import { openAIClient } from '@shared/openai-client';

import { registerHotkeys, unregisterAllHotkeys } from './modules/hotkey-manager';
import { captureScreen } from './modules/screenshot-manager';
import { toggleHidden, ensureHiddenOnCapture } from './modules/hide-manager';
import { loadOpenAIConfig, saveOpenAIConfig } from './modules/settings-manager';

// __dirname is not defined in ESM; compute it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 640,
    show: true,
    frame: isDev,
    transparent: !isDev,
    backgroundColor: isDev ? '#121212' : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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

  // In dev or first run, automatically show the overlay input so users see UI
  mainWindow.webContents.on('did-finish-load', () => {
    if (isDev) {
      mainWindow?.show();
      mainWindow?.webContents.send('text-input:show');
    }
  });
}

function createTray() {
  const icon = nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('Ghost AI');
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Overlay', click: () => mainWindow?.webContents.send('text-input:show') },
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
    model: 'gpt-4o-mini',
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
          accelerator: 'Ctrl+Shift+S',
          click: () => mainWindow?.webContents.send('text-input:show'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }],
    },
  ];
  const appMenu = Menu.buildFromTemplate(template);

  Menu.setApplicationMenu(appMenu);
  registerHotkeys({
    onTextInput: async () => {
      if (!mainWindow) return;
      mainWindow.show();
      mainWindow.webContents.send('text-input:show');
    },
    onAudioRecord: async () => {
      if (!mainWindow) return;
      mainWindow.show();
      mainWindow.webContents.send('audio:toggle');
    },
    onToggleHide: async () => {
      await toggleHidden(mainWindow);
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

ipcMain.handle(
  'capture:analyze',
  async (_, payload: { textPrompt: string; customPrompt: string }) => {
    ensureHiddenOnCapture();
    const image = await captureScreen();
    const result = await openAIClient.analyzeImageWithText(
      image,
      payload.textPrompt,
      payload.customPrompt,
    );

    return result;
  },
);

ipcMain.handle('openai:validate-config', async (_, cfg: OpenAIConfig) => {
  return openAIClient.validateConfig(cfg);
});
