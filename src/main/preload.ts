import type { AnalysisResult, OpenAIConfig } from '@shared/types';

import { contextBridge, ipcRenderer } from 'electron';

const api = {
  updateOpenAIConfig: (config: Partial<OpenAIConfig>) =>
    ipcRenderer.invoke('openai:update-config', config),
  getOpenAIConfig: (): Promise<OpenAIConfig | null> => ipcRenderer.invoke('openai:get-config'),
  validateOpenAIConfig: (cfg: OpenAIConfig): Promise<boolean> =>
    ipcRenderer.invoke('openai:validate-config', cfg),
  // Non-streaming analyze endpoint removed; use analyzeCurrentScreenStream instead
  analyzeCurrentScreenStream: (
    textPrompt: string,
    customPrompt: string,
    handlers: {
      onStart?: (payload: { requestId: string }) => void;
      onDelta?: (payload: { requestId: string; delta: string }) => void;
      onDone?: (payload: AnalysisResult) => void;
      onError?: (payload: { requestId?: string; error: string }) => void;
    },
    history?: any[],
  ) => {
    // Register one-time listeners per call; return unsubscribe function
    let activeRequestId: string | null = null;
    const unsubscribe = () => {
      ipcRenderer.off('capture:analyze-stream:start', startHandler);
      ipcRenderer.off('capture:analyze-stream:delta', deltaHandler);
      ipcRenderer.off('capture:analyze-stream:done', doneHandler);
      ipcRenderer.off('capture:analyze-stream:error', errorHandler);
    };

    const startHandler = (_: any, data: { requestId: string; sessionId?: string }) => {
      activeRequestId = data.requestId;
      handlers.onStart?.(data);
    };
    const deltaHandler = (_: any, data: { requestId: string; delta: string; sessionId?: string }) => {
      if (activeRequestId && data.requestId !== activeRequestId) return;
      handlers.onDelta?.(data);
    };
    const doneHandler = (_: any, data: AnalysisResult) => {
      if (activeRequestId && (data as any)?.requestId !== activeRequestId) return;
      try {
        handlers.onDone?.(data);
      } finally {
        unsubscribe();
      }
    };
    const errorHandler = (_: any, data: { requestId?: string; error: string; sessionId?: string }) => {
      if (activeRequestId && data.requestId && data.requestId !== activeRequestId) return;
      try {
        handlers.onError?.(data);
      } finally {
        unsubscribe();
      }
    };

    ipcRenderer.on('capture:analyze-stream:start', startHandler);
    ipcRenderer.on('capture:analyze-stream:delta', deltaHandler);
    ipcRenderer.on('capture:analyze-stream:done', doneHandler);
    ipcRenderer.on('capture:analyze-stream:error', errorHandler);

    ipcRenderer.send('capture:analyze-stream', { textPrompt, customPrompt, history });

    return unsubscribe;
  },
  listOpenAIModels: (): Promise<string[]> => ipcRenderer.invoke('openai:list-models'),
  updateOpenAIConfigVolatile: (config: Partial<OpenAIConfig>) =>
    ipcRenderer.invoke('openai:update-config-volatile', config),
  // Prompts management
  listPrompts: (): Promise<{ prompts: string[]; active: string | null }> =>
    ipcRenderer.invoke('prompts:list'),
  readPrompt: (name?: string): Promise<string> => ipcRenderer.invoke('prompts:read', name),
  writePrompt: (name: string, content: string): Promise<string> =>
    ipcRenderer.invoke('prompts:write', name, content),
  setActivePrompt: (name: string): Promise<string> =>
    ipcRenderer.invoke('prompts:set-active', name),
  getActivePrompt: (): Promise<string | null> => ipcRenderer.invoke('prompts:get-active'),
  deletePrompt: (name: string): Promise<boolean> => ipcRenderer.invoke('prompts:delete', name),
  // Settings (user preferences)
  getUserSettings: (): Promise<any> => ipcRenderer.invoke('settings:get'),
  updateUserSettings: (partial: Partial<any>) => ipcRenderer.invoke('settings:update', partial),
  onTextInputShow: (handler: () => void) => ipcRenderer.on('text-input:show', () => handler()),
  onTextInputToggle: (handler: () => void) => ipcRenderer.on('text-input:toggle', () => handler()),
  onHUDShow: (handler: () => void) => ipcRenderer.on('hud:show', () => handler()),
  toggleHide: () => ipcRenderer.invoke('hud:toggle-hide'),
  onAskClear: (handler: () => void) => ipcRenderer.on('ask:clear', () => handler()),
  onAskPrev: (handler: () => void) => ipcRenderer.on('ask:prev', () => handler()),
  onAskNext: (handler: () => void) => ipcRenderer.on('ask:next', () => handler()),
  onAudioToggle: (handler: () => void) => ipcRenderer.on('audio:toggle', () => handler()),
  // Session APIs
  getSession: async (): Promise<string> => {
    const res = await ipcRenderer.invoke('session:get');

    return (res && res.sessionId) || '';
  },
  newSession: async (): Promise<string> => {
    const res = await ipcRenderer.invoke('session:new');

    return (res && res.sessionId) || '';
  },
  onSessionChanged: (handler: (data: { sessionId: string }) => void) => {
    const fn = (_e: any, data: { sessionId: string }) => handler(data);

    ipcRenderer.on('session:changed', fn);

    return () => ipcRenderer.off('session:changed', fn);
  },
  // Realtime transcription IPC wrappers
  startTranscription: (options: { model?: string }) =>
    ipcRenderer.invoke('transcribe:start', options),
  appendTranscriptionAudio: (base64Pcm16: string) =>
    ipcRenderer.send('transcribe:append', { audio: base64Pcm16 }),
  endTranscription: () => ipcRenderer.send('transcribe:end'),
  stopTranscription: () => ipcRenderer.send('transcribe:stop'),
  onTranscribeStart: (handler: (data: { ok: boolean }) => void) => {
    const fn = (_e: any, data: { ok: boolean }) => handler(data);

    ipcRenderer.on('transcribe:start', fn);

    return () => ipcRenderer.off('transcribe:start', fn);
  },
  onTranscribeDelta: (handler: (data: { delta: string }) => void) => {
    const fn = (_e: any, data: { delta: string }) => handler(data);

    ipcRenderer.on('transcribe:delta', fn);

    return () => ipcRenderer.off('transcribe:delta', fn);
  },
  onTranscribeDone: (handler: (data: { content: string }) => void) => {
    const fn = (_e: any, data: { content: string }) => handler(data);

    ipcRenderer.on('transcribe:done', fn);

    return () => ipcRenderer.off('transcribe:done', fn);
  },
  onTranscribeError: (handler: (data: { error: string }) => void) => {
    const fn = (_e: any, data: { error: string }) => handler(data);

    ipcRenderer.on('transcribe:error', fn);

    return () => ipcRenderer.off('transcribe:error', fn);
  },
  onTranscribeClosed: (handler: () => void) => {
    const fn = () => handler();

    ipcRenderer.on('transcribe:closed', fn);

    return () => ipcRenderer.off('transcribe:closed', fn);
  },
  // Control whether the overlay window ignores mouse events (click-through)
  setMouseIgnore: (ignore: boolean) => ipcRenderer.invoke('hud:set-mouse-ignore', ignore),
  // Debug helper: dump current session data (list-dict)
  dumpSession: () => ipcRenderer.invoke('session:dump'),
};

declare global {
  interface Window {
    ghostAI: typeof api;
  }
}

contextBridge.exposeInMainWorld('ghostAI', api);
