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
  ensureDefaultPrompt,
  listPrompts,
  readPrompt,
  setDefaultPromptFrom,
  getDefaultPromptName,
  getActivePromptName,
  setActivePromptName,
} from "./modules/prompts-manager";
import { realtimeTranscribeManager } from "./modules/realtime-transcribe";
import { logManager } from "./modules/log-manager";
import { sessionStore } from "./modules/session-store";

// __dirname is not defined in ESM; compute it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
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
  return path.join(__dirname, "..", assetRelativePath);
}

// Helper to initialize session logs (creates empty session JSON)
async function initializeSessionLogs(sessionId: string): Promise<void> {
  try {
    const json = sessionStore.toJSON();

    await logManager.writeSessionJson(sessionId, json[sessionId] ?? {});
  } catch (err) {
    console.error("[Session] Failed to initialize session logs:", err);
  }
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
  // Ensure prompts directory and a default active prompt exist
  try {
    ensureDefaultPrompt();
  } catch (err) {
    console.error("[Init] Failed to ensure default prompt:", err);
  }
  createWindow();
  createTray();
  try {
    console.log(
      "[Global Session]",
      new Date().toISOString(),
      "sessionId created at app start:",
      currentSessionId,
    );
  } catch (err) {
    console.error("[Init] Failed to log session ID:", err);
  }
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

      // Abort any active analyze stream for this renderer
      const wcId = mainWindow.webContents.id;
      const ctrl = activeAnalyzeControllers.get(wcId);

      if (ctrl) {
        try {
          ctrl.abort();
        } catch (err) {
          console.error("[Hotkey] Failed to abort controller:", err);
        }
        activeAnalyzeControllers.delete(wcId);
      }

      mainWindow.webContents.send("ask:clear");

      // Clear session store
      sessionStore.clearAll();

      // Generate new session ID
      currentSessionId = crypto.randomUUID();
      console.log(
        "[Session]",
        new Date().toISOString(),
        "sessionId reset (clear):",
        currentSessionId,
      );

      // Initialize new session logs
      await initializeSessionLogs(currentSessionId);

      // Broadcast session change
      mainWindow.webContents.send("session:changed", {
        sessionId: currentSessionId,
      });

      // Stop active transcription
      try {
        realtimeTranscribeManager.stop(mainWindow.webContents);
      } catch (err) {
        console.error("[Hotkey] Failed to stop transcription:", err);
      }
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
  try {
    const cfg = loadOpenAIConfig();

    if (!cfg) {
      mainWindow?.show();
      mainWindow?.webContents.send("text-input:show");
    }
  } catch (err) {
    console.error("[Init] Failed to check OpenAI config:", err);
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
    setDefaultPromptFrom(name),
  );
  ipcMain.handle("prompts:get-default", () => getDefaultPromptName());
  // New: active prompt name persisted in settings
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
    try {
      app.quit();
    } catch {}

    return true;
  });

  // Allow renderer to toggle click-through dynamically
  ipcMain.handle("hud:set-mouse-ignore", (_evt, ignore: boolean) => {
    try {
      mainWindow?.setIgnoreMouseEvents(!!ignore, { forward: true });
    } catch {}

    return true;
  });
  // Session IPC
  ipcMain.handle("session:get", () => ({ sessionId: currentSessionId }));
  ipcMain.handle("session:new", async () => {
    // Clear session store
    try {
      sessionStore.clearAll();
    } catch (err) {
      console.error("[Session] Failed to clear session store:", err);
    }
    currentSessionId = crypto.randomUUID();
    try {
      console.log(
        "[Global Session]",
        new Date().toISOString(),
        "sessionId reset (manual):",
        currentSessionId,
      );
    } catch {}
    try {
      mainWindow?.webContents.send("session:changed", {
        sessionId: currentSessionId,
      });
    } catch (err) {
      console.error(
        "[Session] Failed to notify renderer of session change:",
        err,
      );
    }

    // Initialize new session with empty log file and session JSON
    await initializeSessionLogs(currentSessionId);

    return { sessionId: currentSessionId };
  });
  ipcMain.handle("session:dump", () => sessionStore.getSessionsData());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  unregisterAllHotkeys();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC Handlers
ipcMain.handle(
  "openai:update-config",
  async (_, config: Partial<OpenAIConfig>) => {
    openAIClient.updateConfig(config);
    // persist merged config
    const merged = (openAIClient as any).config as OpenAIConfig; // access internal for persistence

    saveOpenAIConfig(merged);

    try {
      // Notify renderers that OpenAI config has changed so they can refresh models
      for (const bw of BrowserWindow.getAllWindows()) {
        try {
          bw.webContents.send("openai:config-updated");
        } catch (err) {
          console.error("[IPC] Failed to send config update to renderer:", err);
        }
      }
    } catch (err) {
      console.error("[IPC] Failed to notify renderers of config change:", err);
    }

    return true;
  },
);

// Update config in-memory without persisting to disk (used to fetch models after user types API key)
ipcMain.handle(
  "openai:update-config-volatile",
  async (_evt, config: Partial<OpenAIConfig>) => {
    try {
      openAIClient.updateConfig(config);
      try {
        // Notify renderers that OpenAI config has changed in-memory
        for (const bw of BrowserWindow.getAllWindows()) {
          try {
            bw.webContents.send("openai:config-updated");
          } catch (err) {
            console.error("[IPC] Failed to send volatile config update:", err);
          }
        }
      } catch (err) {
        console.error(
          "[IPC] Failed to notify renderers of volatile config:",
          err,
        );
      }

      return true;
    } catch {
      return false;
    }
  },
);

ipcMain.handle("openai:get-config", () => loadOpenAIConfig());

ipcMain.handle("openai:list-models", async () => {
  try {
    return await openAIClient.listModels();
  } catch {
    return [];
  }
});

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
      formattedPrompt: string; // Complete prompt with history, formatted by Renderer
    },
  ) => {
    // Snapshot the sessionId at the start of this request to prevent races with Ctrl+R
    const requestSessionId = currentSessionId;

    try {
      const settings = loadUserSettings();
      const attach =
        typeof (settings as any)?.attachScreenshot === "boolean"
          ? !!(settings as any).attachScreenshot
          : true;
      let image: Buffer | undefined = undefined;

      if (attach) {
        image = await hideAllWindowsDuring(async () => captureScreen());
      }
      const requestId = crypto.randomUUID();

      evt.sender.send("capture:analyze-stream:start", {
        requestId,
        sessionId: requestSessionId,
      });

      // Use the formatted prompt provided by Renderer (includes history if any)
      const combinedTextPrompt = (payload.formattedPrompt ?? "").trim();

      // Load active prompt for system context (always required)
      let systemPrompt = "";
      try {
        const activeName = getActivePromptName();

        if (!activeName) {
          evt.sender.send("capture:analyze-stream:error", {
            error:
              "No active prompt selected. Open Settings → Prompts to select one.",
            sessionId: requestSessionId,
          });

          return;
        }
        systemPrompt = readPrompt(activeName) || "";
      } catch (err) {
        console.error("[Analyze] Failed to load active prompt:", err);
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
        systemPrompt,
        requestId,
        (update) => {
          try {
            evt.sender.send("capture:analyze-stream:delta", {
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

      evt.sender.send("capture:analyze-stream:done", {
        ...result,
        sessionId: requestSessionId,
      });

      // Clear controller on successful completion
      try {
        const cur = activeAnalyzeControllers.get(wcId);

        if (cur === controller) activeAnalyzeControllers.delete(wcId);
      } catch {}

      // Write logs if not aborted and session hasn't changed
      if (!controller.signal.aborted && requestSessionId === currentSessionId) {
        const question = (payload.textPrompt ?? "").trim();
        const answer = (result?.content ?? "").trim();

        try {
          // Track session entry
          sessionStore.appendEntry(requestSessionId, {
            requestId,
            text_input: question,
            ai_output: answer,
          });

          // Write session JSON (simplified: single log format)
          const json = sessionStore.toJSON();
          const logPath = await logManager.writeSessionJson(
            requestSessionId,
            json[requestSessionId] ?? {},
          );
          sessionStore.updateSessionLogPath(requestSessionId, logPath);
        } catch (err) {
          console.error("[Analyze] Failed to write session log:", err);
        }
      }
    } catch (err) {
      const error = String(err ?? "analyze-stream failed");
      // If aborted, suppress noisy error; listeners will be cleaned up via ask:clear
      const isAbort =
        typeof err === "object" &&
        err !== null &&
        String((err as any).name || "")
          .toLowerCase()
          .includes("abort");

      try {
        const wcId = evt.sender.id;

        activeAnalyzeControllers.delete(wcId);
      } catch {}
      if (!isAbort) {
        evt.sender.send("capture:analyze-stream:error", {
          error,
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
    sessionId: currentSessionId,
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
