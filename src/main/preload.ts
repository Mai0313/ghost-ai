import type { AnalysisResult, OpenAIConfig } from '@shared/types';

import { contextBridge, ipcRenderer } from 'electron';

const api = {
  updateOpenAIConfig: (config: Partial<OpenAIConfig>) =>
    ipcRenderer.invoke('openai:update-config', config),
  getOpenAIConfig: (): Promise<OpenAIConfig | null> => ipcRenderer.invoke('openai:get-config'),
  validateOpenAIConfig: (cfg: OpenAIConfig): Promise<boolean> =>
    ipcRenderer.invoke('openai:validate-config', cfg),
  analyzeCurrentScreen: (textPrompt: string, customPrompt: string): Promise<AnalysisResult> =>
    ipcRenderer.invoke('capture:analyze', { textPrompt, customPrompt }),
  analyzeCurrentScreenStream: (
    textPrompt: string,
    customPrompt: string,
    handlers: {
      onStart?: (payload: { requestId: string }) => void;
      onDelta?: (payload: { requestId: string; delta: string }) => void;
      onDone?: (payload: AnalysisResult) => void;
      onError?: (payload: { requestId?: string; error: string }) => void;
    },
  ) => {
    // Register one-time listeners per call; return unsubscribe function
    const unsubscribe = () => {
      ipcRenderer.off('capture:analyze-stream:start', startHandler);
      ipcRenderer.off('capture:analyze-stream:delta', deltaHandler);
      ipcRenderer.off('capture:analyze-stream:done', doneHandler);
      ipcRenderer.off('capture:analyze-stream:error', errorHandler);
    };

    const startHandler = (_: any, data: { requestId: string }) => handlers.onStart?.(data);
    const deltaHandler = (_: any, data: { requestId: string; delta: string }) =>
      handlers.onDelta?.(data);
    const doneHandler = (_: any, data: AnalysisResult) => {
      try {
        handlers.onDone?.(data);
      } finally {
        unsubscribe();
      }
    };
    const errorHandler = (_: any, data: { requestId?: string; error: string }) => {
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

    ipcRenderer.send('capture:analyze-stream', { textPrompt, customPrompt });

    return unsubscribe;
  },
  listOpenAIModels: (): Promise<string[]> => ipcRenderer.invoke('openai:list-models'),
  transcribeAudio: (audioBuffer: ArrayBuffer): Promise<{ text: string }> =>
    ipcRenderer.invoke('audio:transcribe', Buffer.from(new Uint8Array(audioBuffer))),
  // Settings (user preferences)
  getUserSettings: (): Promise<any> => ipcRenderer.invoke('settings:get'),
  updateUserSettings: (partial: Partial<any>) => ipcRenderer.invoke('settings:update', partial),
  onTextInputShow: (handler: () => void) => ipcRenderer.on('text-input:show', () => handler()),
  onAudioToggle: (handler: () => void) => ipcRenderer.on('audio:toggle', () => handler()),
};

declare global {
  interface Window {
    ghostAI: typeof api;
  }
}

contextBridge.exposeInMainWorld('ghostAI', api);
