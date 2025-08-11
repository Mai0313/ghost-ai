export {};

declare global {
  interface Window {
    ghostAI: {
      updateOpenAIConfig: (cfg: Partial<any>) => Promise<boolean>;
      getOpenAIConfig: () => Promise<any>;
      validateOpenAIConfig?: (cfg: any) => Promise<boolean>;
      analyzeCurrentScreen: (textPrompt: string, customPrompt: string) => Promise<{ content: string }>;
      onTextInputShow: (handler: () => void) => void;
      onAudioToggle: (handler: () => void) => void;
    };
  }
}


