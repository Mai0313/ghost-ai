export {};

declare global {
  interface Window {
    ghostAI: {
      updateOpenAIConfig: (cfg: Partial<any>) => Promise<boolean>;
      getOpenAIConfig: () => Promise<any>;
      validateOpenAIConfig?: (cfg: any) => Promise<boolean>;
      analyzeCurrentScreen: (
        textPrompt: string,
        customPrompt: string,
      ) => Promise<{ content: string }>;
      listOpenAIModels: () => Promise<string[]>;
      transcribeAudio: (audioBuffer: ArrayBuffer) => Promise<{ text: string }>;
      getUserSettings: () => Promise<any>;
      updateUserSettings: (partial: Partial<any>) => Promise<any>;
      onTextInputShow: (handler: () => void) => void;
      onAudioToggle: (handler: () => void) => void;
    };
  }
}
