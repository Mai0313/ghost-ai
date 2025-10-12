import type { OpenAIConfig } from "@shared/types";

import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

import {
  app,
  BrowserWindow,
  ipcMain,
  nativeImage,
  Tray,
  Menu,
  screen,
} from "electron";
import { openAIClient } from "@shared/openai-client";

import {
  registerFixedHotkeys,
  unregisterAllHotkeys,
} from "./modules/hotkey-manager";
import { captureScreen } from "./modules/screenshot-manager";
import { toggleHidden, hideAllWindowsDuring } from "./modules/hide-manager";
import {
  loadOpenAIConfig,
  saveOpenAIConfig,
  loadUserSettings,
  saveUserSettings,
} from "./modules/settings-manager";
import {
  listPrompts,
  readPrompt,
  getActivePromptName,
  setActivePromptName,
} from "./modules/prompts-manager";
import { realtimeTranscribeManager } from "./modules/realtime-transcribe";
import { logManager } from "./modules/log-manager";
import { sessionStore } from "./modules/session-store";
import { sessionLifecycle } from "./modules/session-lifecycle";

// __dirname is not defined in ESM; compute it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
// Guard to prevent Ctrl/Cmd+Shift+Enter from also triggering Ctrl/Cmd+Enter handler
let lastAudioToggleAt = 0;

// Detect dev/prod based on Electron packaging state to avoid relying on NODE_ENV
const isDev = !app.isPackaged;

function resolveAssetPath(assetRelativePath: string) {
  // In production, assets placed via extraResources are under process.resourcesPath
  if (!isDev) {
    return path.join(process.resourcesPath, assetRelativePath);
  }

  // In dev, __dirname points to dist/, project root is one level up
  return path.join(__dirname, "..", assetRelativePath);
}

// Note: Session initialization now handled by sessionLifecycle module

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
    backgroundColor: "#00000000",
    icon: resolveAssetPath("ghost.ico"),
    titleBarStyle: "hidden",
    hasShadow: false,
    resizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      // Preload is bundled as CommonJS; use .cjs extension
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    const indexHtml = path.join(__dirname, "renderer", "index.html");

    mainWindow.loadFile(indexHtml);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Hide menu bar to keep the window minimal and overlay-like
  mainWindow.setMenuBarVisibility(false);
  // Prevent most screen-capture APIs from capturing this window
  mainWindow.setContentProtection(true);
  // Make overlay click-through by default; renderer will temporarily disable
  // passthrough when the cursor is over interactive UI.
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
}

function createTray() {
  const trayIconPath = resolveAssetPath("ghost.ico");
  const icon = nativeImage.createFromPath(trayIconPath);

  tray = new Tray(icon);
  tray.setToolTip("Ghost AI");
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Overlay",
      click: () => {
        if (!mainWindow) return;
        mainWindow.show();
        mainWindow.webContents.send("text-input:show");
      },
    },
    { label: "Toggle Hide", click: () => toggleHidden(mainWindow) },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
}

async function initializeOpenAI() {
  // Minimal default config; real values should be set through renderer via IPC
  const defaultConfig: OpenAIConfig = {
    apiKey: "",
    baseURL: "https://api.openai.com/v1",
    model: "",
    timeout: 60000,
    maxTokens: null,
    temperature: 0.7,
  };
  const persisted = loadOpenAIConfig();

  openAIClient.initialize(persisted ?? defaultConfig);
}

app.whenReady().then(async () => {
  await initializeOpenAI();
  createWindow();
  createTray();
  console.log(
    "[Global Session]",
    new Date().toISOString(),
    "sessionId created at app start:",
    sessionLifecycle.getCurrentSessionId(),
  );
  // Application menu
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        {
          label: "Show Overlay",
          accelerator: "CommandOrControl+Enter",
          click: () => {
            if (!mainWindow) return;
            mainWindow.show();
            mainWindow.webContents.send("text-input:show");
          },
        },
        {
          label: "Toggle Hide",
          accelerator: "CommandOrControl+\\",
          click: () => toggleHidden(mainWindow),
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        // Avoid conflicting with renderer Ctrl/Cmd+R (used to clear Ask history)
        { role: "reload", accelerator: "F5" },
        { role: "toggleDevTools" },
      ],
    },
  ];
  const appMenu = Menu.buildFromTemplate(template);

  Menu.setApplicationMenu(appMenu);
  // Helper: ensure window is visible and send IPC event
  const withWindow = (
    handler: (win: BrowserWindow) => void | Promise<void>,
  ) => {
    return async () => {
      if (!mainWindow) return;
      mainWindow.show();
      await handler(mainWindow);
    };
  };

  // Fixed hotkeys only: Ask and Hide
  registerFixedHotkeys({
    onTextInput: async () => {
      // Suppress Ask toggle if audio toggle fired very recently (key overlap)
      if (Date.now() - lastAudioToggleAt < 400) {
        console.log("[Hotkey] Suppress Ask toggle due to recent Audio toggle");

        return;
      }
      if (!mainWindow) return;
      mainWindow.show();
      mainWindow.webContents.send("text-input:toggle");
    },
    onToggleHide: async () => {
      await toggleHidden(mainWindow);
    },
    onClearAsk: async () => {
      if (!mainWindow) return;
      mainWindow.show();

      const wcId = mainWindow.webContents.id;

      // Send clear signal before resetting session
      mainWindow.webContents.send("ask:clear");

      // Reset session (aborts controllers, clears store, generates new ID, broadcasts)
      await sessionLifecycle.resetSession(mainWindow, wcId, "hotkey-clear");

      // Stop active transcription
      realtimeTranscribeManager.stop(mainWindow.webContents);
    },
    onAudioToggle: async () => {
      lastAudioToggleAt = Date.now();
      if (!mainWindow) return;
      mainWindow.show();
      mainWindow.webContents.send("audio:toggle");
    },
    onScrollUp: withWindow((win) => {
      win.webContents.send("ask:scroll", { direction: "up" });
    }),
    onScrollDown: withWindow((win) => {
      win.webContents.send("ask:scroll", { direction: "down" });
    }),
    onPagePrev: withWindow((win) => {
      win.webContents.send("ask:paginate", { direction: "up" });
    }),
    onPageNext: withWindow((win) => {
      win.webContents.send("ask:paginate", { direction: "down" });
    }),
  });

  // If no OpenAI config yet, guide user by showing the overlay
  const cfg = loadOpenAIConfig();

  if (!cfg) {
    mainWindow?.show();
    mainWindow?.webContents.send("text-input:show");
  }

  // Dynamic hotkey updates are disabled by design (fixed hotkeys)
  ipcMain.handle("settings:get", () => loadUserSettings());
  ipcMain.handle("settings:update", (_evt, partial: any) => {
    saveUserSettings(partial);

    return loadUserSettings();
  });

  // Prompts IPC
  ipcMain.handle("prompts:list", () => listPrompts());
  ipcMain.handle("prompts:read", (_evt, name?: string) => readPrompt(name));
  ipcMain.handle("prompts:set-default", (_evt, name: string) =>
    setActivePromptName(name),
  );
  ipcMain.handle("prompts:get-default", () => getActivePromptName());
  // Active prompt name persisted in settings
  ipcMain.handle("prompts:get-active", () => getActivePromptName());
  ipcMain.handle("prompts:set-active", (_evt, name: string) =>
    setActivePromptName(name),
  );

  // HUD IPC
  ipcMain.handle("hud:toggle-hide", async () => {
    await toggleHidden(mainWindow);

    return true;
  });

  // App lifecycle IPC
  ipcMain.handle("app:quit", () => {
    app.quit();

    return true;
  });

  // Allow renderer to toggle click-through dynamically
  ipcMain.handle("hud:set-mouse-ignore", (_evt, ignore: boolean) => {
    mainWindow?.setIgnoreMouseEvents(!!ignore, { forward: true });

    return true;
  });
  // Session IPC
  ipcMain.handle("session:get", () => ({
    sessionId: sessionLifecycle.getCurrentSessionId(),
  }));
  ipcMain.handle("session:new", async () => {
    const sessionId = await sessionLifecycle.resetSession(
      mainWindow,
      undefined,
      "ipc-manual",
    );

    return { sessionId };
  });
  ipcMain.handle("session:dump", () => sessionStore.getSessionsData());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  unregisterAllHotkeys();
  sessionLifecycle.cleanup();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Helper to notify all windows of config update
function notifyConfigUpdate(): void {
  for (const bw of BrowserWindow.getAllWindows()) {
    bw.webContents.send("openai:config-updated");
  }
}

/**
 * Batches delta updates to reduce IPC overhead
 */
class DeltaBatcher {
  private buffer: any[] = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly maxSize: number;
  private readonly flushInterval: number;
  private readonly sender: Electron.WebContents;
  private readonly requestId: string;
  private readonly sessionId: string;

  constructor(
    sender: Electron.WebContents,
    requestId: string,
    sessionId: string,
    maxSize = 20,
    flushInterval = 50,
  ) {
    this.sender = sender;
    this.requestId = requestId;
    this.sessionId = sessionId;
    this.maxSize = maxSize;
    this.flushInterval = flushInterval;
  }

  add(update: any, forceFlush = false): void {
    this.buffer.push(update);

    if (forceFlush || this.buffer.length >= this.maxSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.flushInterval);
    }
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.buffer.length === 0) return;

    // Send all buffered deltas in one IPC message
    this.sender.send("capture:analyze-stream:deltas", {
      requestId: this.requestId,
      sessionId: this.sessionId,
      updates: this.buffer,
    });

    this.buffer = [];
  }

  dispose(): void {
    this.flush();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

// IPC Handlers
ipcMain.handle(
  "openai:update-config",
  async (_, config: Partial<OpenAIConfig>) => {
    openAIClient.updateConfig(config);
    // persist merged config
    const merged = (openAIClient as any).config as OpenAIConfig;

    saveOpenAIConfig(merged);
    notifyConfigUpdate();

    return true;
  },
);

// Update config in-memory without persisting to disk (used to fetch models after user types API key)
ipcMain.handle(
  "openai:update-config-volatile",
  async (_evt, config: Partial<OpenAIConfig>) => {
    openAIClient.updateConfig(config);
    notifyConfigUpdate();

    return true;
  },
);

ipcMain.handle("openai:get-config", () => loadOpenAIConfig());

ipcMain.handle("openai:list-models", async () => openAIClient.listModels());

// Non-streaming analyze IPC removed; use 'capture:analyze-stream' instead

// Streaming analyze (sends start/delta/done/error events)
// Simplified: Renderer sends formatted history, Main Process doesn't maintain conversation state
ipcMain.on(
  "capture:analyze-stream",
  async (
    evt,
    payload: {
      textPrompt: string;
      customPrompt: string;
      formattedPrompt: string;
    },
  ) => {
    const requestSessionId = sessionLifecycle.getCurrentSessionId();
    const requestId = crypto.randomUUID();
    const wcId = evt.sender.id;

    try {
      // Check for active prompt
      const activeName = getActivePromptName();

      if (!activeName) {
        evt.sender.send("capture:analyze-stream:error", {
          error:
            "No active prompt selected. Open Settings → Prompts to select one.",
          sessionId: requestSessionId,
        });

        return;
      }

      // Capture screenshot if enabled
      const settings = loadUserSettings();
      const attach = (settings as any)?.attachScreenshot !== false;
      const image = attach
        ? await hideAllWindowsDuring(captureScreen)
        : undefined;

      evt.sender.send("capture:analyze-stream:start", {
        requestId,
        sessionId: requestSessionId,
      });

      // Get or create controller (aborts previous automatically)
      const controller = sessionLifecycle.getOrCreateController(wcId);

      const systemPrompt = readPrompt(activeName) || "";
      const combinedTextPrompt = payload.formattedPrompt.trim();

      // Batch delta messages using DeltaBatcher class
      const batcher = new DeltaBatcher(evt.sender, requestId, requestSessionId);

      const result = await openAIClient.responseStream(
        image,
        combinedTextPrompt,
        systemPrompt,
        requestId,
        (update) => {
          // Flush immediately for important events
          const forceFlush =
            update.eventType?.includes("done") ||
            update.eventType?.includes("completed");

          batcher.add(update, forceFlush);
        },
        requestSessionId,
        controller.signal,
      );

      // Dispose batcher (flushes remaining deltas and cleans up timer)
      batcher.dispose();

      evt.sender.send("capture:analyze-stream:done", {
        ...result,
        sessionId: requestSessionId,
      });

      // Clear controller on successful completion
      sessionLifecycle.removeController(wcId, controller);

      // Write logs if not aborted and session hasn't changed
      if (
        !controller.signal.aborted &&
        requestSessionId === sessionLifecycle.getCurrentSessionId()
      ) {
        sessionStore.appendEntry(requestSessionId, {
          requestId,
          text_input: payload.textPrompt.trim(),
          ai_output: result.content.trim(),
        });

        const json = sessionStore.toJSON();
        const logPath = await logManager.writeSessionJson(
          requestSessionId,
          json[requestSessionId] ?? {},
        );

        sessionStore.updateSessionLogPath(requestSessionId, logPath);
      }
    } catch (err) {
      sessionLifecycle.removeController(wcId);

      // Suppress abort errors (cleaned up via ask:clear)
      const isAbort =
        err &&
        typeof err === "object" &&
        (err as any).name?.toLowerCase().includes("abort");

      if (!isAbort) {
        evt.sender.send("capture:analyze-stream:error", {
          error: String(err || "analyze-stream failed"),
          sessionId: requestSessionId,
        });
      }
    }
  },
);

ipcMain.handle("openai:validate-config", async (_, cfg: OpenAIConfig) => {
  return openAIClient.validateConfig(cfg);
});

// Realtime transcription IPC (global handlers)
ipcMain.handle("transcribe:start", async (evt, options: { model?: string }) => {
  const cfg = loadOpenAIConfig();
  const user = loadUserSettings();

  if (!cfg?.apiKey) throw new Error("Missing OpenAI API key");
  realtimeTranscribeManager.start(evt.sender, {
    apiKey: cfg.apiKey,
    model: options?.model,
    sessionId: sessionLifecycle.getCurrentSessionId(),
    language: (user as any)?.transcribeLanguage === "zh" ? "zh" : "en",
  });

  return { ok: true };
});
ipcMain.on("transcribe:append", (evt, data: { audio: string }) => {
  if (!data?.audio) return;
  realtimeTranscribeManager.append(evt.sender, data.audio);
});
ipcMain.on("transcribe:end", (evt) => {
  realtimeTranscribeManager.end(evt.sender);
});
ipcMain.on("transcribe:stop", (evt) => {
  realtimeTranscribeManager.stop(evt.sender);
});
