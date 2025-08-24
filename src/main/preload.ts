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
      onStart?: (payload: { requestId: string; sessionId: string }) => void;
      onDelta?: (payload: { requestId: string; delta: string; sessionId: string }) => void;
      onDone?: (payload: AnalysisResult & { sessionId: string }) => void;
      onError?: (payload: { requestId?: string; error: string; sessionId: string }) => void;
    },
    history?: string | null,
  ) => {
    // Register one-time listeners per call; return unsubscribe function
    let activeRequestId: string | null = null;
    const unsubscribe = () => {
      ipcRenderer.off('capture:analyze-stream:start', startHandler);
      ipcRenderer.off('capture:analyze-stream:delta', deltaHandler);
      ipcRenderer.off('capture:analyze-stream:done', doneHandler);
      ipcRenderer.off('capture:analyze-stream:error', errorHandler);
    };

    const startHandler = (_: any, data: { requestId: string; sessionId: string }) => {
      activeRequestId = data.requestId;
      handlers.onStart?.(data);
    };
    const deltaHandler = (
      _: any,
      data: { requestId: string; delta: string; sessionId: string },
    ) => {
      if (activeRequestId && data.requestId !== activeRequestId) return;
      handlers.onDelta?.(data);
    };
    const doneHandler = (_: any, data: AnalysisResult & { sessionId: string }) => {
      if (activeRequestId && (data as any)?.requestId !== activeRequestId) return;
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
  listPrompts: (): Promise<{ prompts: string[]; defaultPrompt: string | null }> =>
    ipcRenderer.invoke('prompts:list'),
  readPrompt: (name?: string): Promise<string> => ipcRenderer.invoke('prompts:read', name),
  setDefaultPrompt: (name: string): Promise<string> =>
    ipcRenderer.invoke('prompts:set-default', name),
  getDefaultPrompt: (): Promise<string | null> => ipcRenderer.invoke('prompts:get-default'),
  // Settings (user preferences)
  getUserSettings: (): Promise<any> => ipcRenderer.invoke('settings:get'),
  updateUserSettings: (partial: Partial<any>) => ipcRenderer.invoke('settings:update', partial),
  onTextInputShow: (handler: () => void) => ipcRenderer.on('text-input:show', () => handler()),
  onTextInputToggle: (handler: () => void) => ipcRenderer.on('text-input:toggle', () => handler()),
  onHUDShow: (handler: () => void) => ipcRenderer.on('hud:show', () => handler()),
  toggleHide: () => ipcRenderer.invoke('hud:toggle-hide'),
  quitApp: () => ipcRenderer.invoke('app:quit'),
  onAskClear: (handler: () => void) => ipcRenderer.on('ask:clear', () => handler()),

  onAudioToggle: (handler: () => void) => ipcRenderer.on('audio:toggle', () => handler()),
  // Scroll Ask result area
  onAskScroll: (handler: (data: { direction: 'up' | 'down' }) => void) => {
    const fn = (_e: any, data: { direction: 'up' | 'down' }) => handler(data);

    ipcRenderer.on('ask:scroll', fn);

    return () => ipcRenderer.off('ask:scroll', fn);
  },
  // Pagination for Ask answers
  onAskPaginate: (handler: (data: { direction: 'up' | 'down' }) => void) => {
    const fn = (_e: any, data: { direction: 'up' | 'down' }) => handler(data);

    ipcRenderer.on('ask:paginate', fn);

    return () => ipcRenderer.off('ask:paginate', fn);
  },
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
  onTranscribeStart: (handler: (data: { ok: boolean; sessionId: string }) => void) => {
    const fn = (_e: any, data: { ok: boolean; sessionId: string }) => handler(data);

    ipcRenderer.on('transcribe:start', fn);

    return () => ipcRenderer.off('transcribe:start', fn);
  },
  onTranscribeDelta: (handler: (data: { delta: string; sessionId: string }) => void) => {
    const fn = (_e: any, data: { delta: string; sessionId: string }) => handler(data);

    ipcRenderer.on('transcribe:delta', fn);

    return () => ipcRenderer.off('transcribe:delta', fn);
  },
  onTranscribeDone: (handler: (data: { content: string; sessionId: string }) => void) => {
    const fn = (_e: any, data: { content: string; sessionId: string }) => handler(data);

    ipcRenderer.on('transcribe:done', fn);

    return () => ipcRenderer.off('transcribe:done', fn);
  },
  onTranscribeError: (handler: (data: { error: string; sessionId: string }) => void) => {
    const fn = (_e: any, data: { error: string; sessionId: string }) => handler(data);

    ipcRenderer.on('transcribe:error', fn);

    return () => ipcRenderer.off('transcribe:error', fn);
  },
  onTranscribeClosed: (handler: () => void) => {
    const fn = () => handler();

    ipcRenderer.on('transcribe:closed', fn);

    return () => ipcRenderer.off('transcribe:closed', fn);
  },
  // Notify renderers when OpenAI config changes (persisted or volatile)
  onOpenAIConfigUpdated: (handler: () => void) => {
    const fn = () => handler();

    ipcRenderer.on('openai:config-updated', fn);

    return () => ipcRenderer.off('openai:config-updated', fn);
  },
  // Control whether the overlay window ignores mouse events (click-through)
  setMouseIgnore: (ignore: boolean) => ipcRenderer.invoke('hud:set-mouse-ignore', ignore),
  // Debug helper: dump current session data (list-dict)
  dumpSession: () => ipcRenderer.invoke('session:dump'),
};

contextBridge.exposeInMainWorld('ghostAI', api);
