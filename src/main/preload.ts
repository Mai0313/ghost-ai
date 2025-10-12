import type { AnalysisResult, OpenAIConfig } from "@shared/types";

import { contextBridge, ipcRenderer } from "electron";

// Helper to create IPC event listeners with auto cleanup
function createIPCListener<T>(
  channel: string,
  handler: (data: T) => void,
): () => void {
  const fn = (_: any, data: T) => handler(data);

  ipcRenderer.on(channel, fn);

  return () => ipcRenderer.off(channel, fn);
}

// Helper to create simple IPC event listeners without data
function createSimpleIPCListener(channel: string, handler: () => void): void {
  ipcRenderer.on(channel, () => handler());
}

const api = {
  updateOpenAIConfig: (config: Partial<OpenAIConfig>) =>
    ipcRenderer.invoke("openai:update-config", config),
  getOpenAIConfig: (): Promise<OpenAIConfig | null> =>
    ipcRenderer.invoke("openai:get-config"),
  validateOpenAIConfig: (cfg: OpenAIConfig): Promise<boolean> =>
    ipcRenderer.invoke("openai:validate-config", cfg),
  // Simplified: Renderer provides formatted prompt with history
  analyzeCurrentScreenStream: (
    textPrompt: string,
    customPrompt: string,
    formattedPrompt: string,
    handlers: {
      onStart?: (payload: { requestId: string; sessionId: string }) => void;
      onDelta?: (payload: {
        requestId: string;
        delta: string;
        sessionId: string;
      }) => void;
      onDone?: (payload: AnalysisResult & { sessionId: string }) => void;
      onError?: (payload: {
        requestId?: string;
        error: string;
        sessionId: string;
      }) => void;
    },
  ) => {
    // Register one-time listeners per call; return unsubscribe function
    let activeRequestId: string | null = null;
    const unsubscribe = () => {
      ipcRenderer.off("capture:analyze-stream:start", startHandler);
      ipcRenderer.off("capture:analyze-stream:delta", deltaHandler);
      ipcRenderer.off("capture:analyze-stream:deltas", deltasHandler);
      ipcRenderer.off("capture:analyze-stream:done", doneHandler);
      ipcRenderer.off("capture:analyze-stream:error", errorHandler);
    };

    const startHandler = (
      _: any,
      data: { requestId: string; sessionId: string },
    ) => {
      activeRequestId = data.requestId;
      handlers.onStart?.(data);
    };
    const deltaHandler = (
      _: any,
      data: {
        requestId: string;
        sessionId: string;
        channel?: "answer" | "reasoning" | "web_search";
        eventType?: string;
        delta?: string;
        text?: string;
      },
    ) => {
      if (activeRequestId && data.requestId !== activeRequestId) return;
      const payload: any = {
        requestId: data.requestId,
        sessionId: data.sessionId,
        channel: data.channel ?? "answer",
        eventType: data.eventType ?? "response.output_text.delta",
        delta: data.delta,
        text: data.text,
      };

      handlers.onDelta?.(payload);
    };

    // Batch delta handler (optimized IPC)
    const deltasHandler = (
      _: any,
      data: {
        requestId: string;
        sessionId: string;
        updates: Array<{
          channel?: "answer" | "reasoning" | "web_search";
          eventType?: string;
          delta?: string;
          text?: string;
        }>;
      },
    ) => {
      if (activeRequestId && data.requestId !== activeRequestId) return;

      // Process all updates in the batch
      for (const update of data.updates) {
        const payload: any = {
          requestId: data.requestId,
          sessionId: data.sessionId,
          channel: update.channel ?? "answer",
          eventType: update.eventType ?? "response.output_text.delta",
          delta: update.delta,
          text: update.text,
        };

        handlers.onDelta?.(payload);
      }
    };
    const doneHandler = (
      _: any,
      data: AnalysisResult & { sessionId: string },
    ) => {
      if (activeRequestId && (data as any)?.requestId !== activeRequestId)
        return;
      try {
        handlers.onDone?.(data);
      } finally {
        unsubscribe();
      }
    };
    const errorHandler = (
      _: any,
      data: { requestId?: string; error: string; sessionId: string },
    ) => {
      if (
        activeRequestId &&
        data.requestId &&
        data.requestId !== activeRequestId
      )
        return;
      try {
        handlers.onError?.(data);
      } finally {
        unsubscribe();
      }
    };

    ipcRenderer.on("capture:analyze-stream:start", startHandler);
    ipcRenderer.on("capture:analyze-stream:delta", deltaHandler);
    ipcRenderer.on("capture:analyze-stream:deltas", deltasHandler);
    ipcRenderer.on("capture:analyze-stream:done", doneHandler);
    ipcRenderer.on("capture:analyze-stream:error", errorHandler);

    ipcRenderer.send("capture:analyze-stream", {
      textPrompt,
      customPrompt,
      formattedPrompt,
    });

    return unsubscribe;
  },
  listOpenAIModels: (): Promise<string[]> =>
    ipcRenderer.invoke("openai:list-models"),
  updateOpenAIConfigVolatile: (config: Partial<OpenAIConfig>) =>
    ipcRenderer.invoke("openai:update-config-volatile", config),
  // Prompts management
  listPrompts: (): Promise<{
    prompts: string[];
    defaultPrompt: string | null;
  }> => ipcRenderer.invoke("prompts:list"),
  readPrompt: (name?: string): Promise<string> =>
    ipcRenderer.invoke("prompts:read", name),
  setDefaultPrompt: (name: string): Promise<string> =>
    ipcRenderer.invoke("prompts:set-default", name),
  getDefaultPrompt: (): Promise<string | null> =>
    ipcRenderer.invoke("prompts:get-default"),
  // Active prompt name persisted in settings
  getActivePromptName: (): Promise<string | null> =>
    ipcRenderer.invoke("prompts:get-active"),
  setActivePromptName: (name: string): Promise<string> =>
    ipcRenderer.invoke("prompts:set-active", name),
  // Settings (user preferences)
  getUserSettings: (): Promise<any> => ipcRenderer.invoke("settings:get"),
  updateUserSettings: (partial: Partial<any>) =>
    ipcRenderer.invoke("settings:update", partial),
  onTextInputShow: (handler: () => void) =>
    createSimpleIPCListener("text-input:show", handler),
  onTextInputToggle: (handler: () => void) =>
    createSimpleIPCListener("text-input:toggle", handler),
  onHUDShow: (handler: () => void) =>
    createSimpleIPCListener("hud:show", handler),
  toggleHide: () => ipcRenderer.invoke("hud:toggle-hide"),
  quitApp: () => ipcRenderer.invoke("app:quit"),
  onAskClear: (handler: () => void) =>
    createSimpleIPCListener("ask:clear", handler),
  onAudioToggle: (handler: () => void) =>
    createSimpleIPCListener("audio:toggle", handler),
  // Scroll Ask result area
  onAskScroll: (handler: (data: { direction: "up" | "down" }) => void) =>
    createIPCListener("ask:scroll", handler),
  // Pagination for Ask answers
  onAskPaginate: (handler: (data: { direction: "up" | "down" }) => void) =>
    createIPCListener("ask:paginate", handler),
  // Session APIs
  getSession: async (): Promise<string> => {
    const res = await ipcRenderer.invoke("session:get");

    return (res && res.sessionId) || "";
  },
  newSession: async (): Promise<string> => {
    const res = await ipcRenderer.invoke("session:new");

    return (res && res.sessionId) || "";
  },
  onSessionChanged: (handler: (data: { sessionId: string }) => void) =>
    createIPCListener("session:changed", handler),
  // Realtime transcription IPC wrappers
  startTranscription: (options: { model?: string }) =>
    ipcRenderer.invoke("transcribe:start", options),
  appendTranscriptionAudio: (base64Pcm16: string) =>
    ipcRenderer.send("transcribe:append", { audio: base64Pcm16 }),
  endTranscription: () => ipcRenderer.send("transcribe:end"),
  stopTranscription: () => ipcRenderer.send("transcribe:stop"),
  onTranscribeStart: (
    handler: (data: { ok: boolean; sessionId: string }) => void,
  ) => createIPCListener("transcribe:start", handler),
  onTranscribeDelta: (
    handler: (data: { delta: string; sessionId: string }) => void,
  ) => createIPCListener("transcribe:delta", handler),
  onTranscribeDone: (
    handler: (data: { content: string; sessionId: string }) => void,
  ) => createIPCListener("transcribe:done", handler),
  onTranscribeError: (
    handler: (data: { error: string; sessionId: string }) => void,
  ) => createIPCListener("transcribe:error", handler),
  onTranscribeClosed: (handler: () => void) =>
    createIPCListener("transcribe:closed", handler),
  // Notify renderers when OpenAI config changes (persisted or volatile)
  onOpenAIConfigUpdated: (handler: () => void) =>
    createIPCListener("openai:config-updated", handler),
  // Control whether the overlay window ignores mouse events (click-through)
  setMouseIgnore: (ignore: boolean) =>
    ipcRenderer.invoke("hud:set-mouse-ignore", ignore),
  // Debug helper: dump current session data (list-dict)
  dumpSession: () => ipcRenderer.invoke("session:dump"),
};

contextBridge.exposeInMainWorld("ghostAI", api);
