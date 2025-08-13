export {};

declare global {
  interface Window {
    ghostAI: {
      updateOpenAIConfig: (cfg: Partial<any>) => Promise<boolean>;
      getOpenAIConfig: () => Promise<any>;
      validateOpenAIConfig?: (cfg: any) => Promise<boolean>;
      analyzeCurrentScreenStream: (
        textPrompt: string,
        customPrompt: string,
        handlers: {
          onStart?: (payload: { requestId: string }) => void;
          onDelta?: (payload: { requestId: string; delta: string }) => void;
          onDone?: (payload: { requestId: string; content: string }) => void;
          onError?: (payload: { requestId?: string; error: string }) => void;
        },
        history?: any[],
      ) => () => void; // returns unsubscribe
      listOpenAIModels: () => Promise<string[]>;
      transcribeAudio: (audioBuffer: ArrayBuffer) => Promise<{ text: string }>;
      getUserSettings: () => Promise<any>;
      updateUserSettings: (partial: Partial<any>) => Promise<any>;
      onTextInputShow: (handler: () => void) => void;
      onHUDShow: (handler: () => void) => void;
      toggleHide: () => Promise<any>;
      onAskClear: (handler: () => void) => void;
      onAskPrev: (handler: () => void) => void;
      onAskNext: (handler: () => void) => void;
      onAudioToggle: (handler: () => void) => void;
      // Control whether the overlay window ignores mouse events
      setMouseIgnore: (ignore: boolean) => Promise<true>;
    };
  }
}
