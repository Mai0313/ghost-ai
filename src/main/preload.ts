import { contextBridge, ipcRenderer } from 'electron';
import type { AnalysisResult, OpenAIConfig } from '@shared/types';

const api = {
  updateOpenAIConfig: (config: Partial<OpenAIConfig>) => ipcRenderer.invoke('openai:update-config', config),
  getOpenAIConfig: (): Promise<OpenAIConfig | null> => ipcRenderer.invoke('openai:get-config'),
  analyzeCurrentScreen: (textPrompt: string, customPrompt: string): Promise<AnalysisResult> =>
    ipcRenderer.invoke('capture:analyze', { textPrompt, customPrompt }),
  onTextInputShow: (handler: () => void) => ipcRenderer.on('text-input:show', handler),
  onAudioToggle: (handler: () => void) => ipcRenderer.on('audio:toggle', handler),
};

declare global {
  interface Window {
    ghostAI: typeof api;
  }
}

contextBridge.exposeInMainWorld('ghostAI', api);


