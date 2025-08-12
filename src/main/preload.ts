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
