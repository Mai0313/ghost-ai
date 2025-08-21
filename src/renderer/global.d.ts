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
          onStart?: (payload: { requestId: string; sessionId?: string }) => void;
          onDelta?: (payload: { requestId: string; delta: string; sessionId?: string }) => void;
          onDone?: (payload: { requestId: string; content: string; sessionId?: string }) => void;
          onError?: (payload: { requestId?: string; error: string; sessionId?: string }) => void;
        },
        history?: any[],
      ) => () => void; // returns unsubscribe
      listOpenAIModels: () => Promise<string[]>;
      updateOpenAIConfigVolatile: (cfg: Partial<any>) => Promise<boolean>;
      // Prompts management
      listPrompts: () => Promise<{ prompts: string[]; defaultPrompt: string | null }>;
      readPrompt: (name?: string) => Promise<string>;
      setDefaultPrompt: (name: string) => Promise<string>;
      getDefaultPrompt: () => Promise<string | null>;
      getUserSettings: () => Promise<any>;
      updateUserSettings: (partial: Partial<any>) => Promise<any>;
      onTextInputShow: (handler: () => void) => void;
      onTextInputToggle: (handler: () => void) => void;
      onHUDShow: (handler: () => void) => void;
      toggleHide: () => Promise<any>;
      quitApp: () => Promise<any>;
      onAskClear: (handler: () => void) => void;

      onAudioToggle: (handler: () => void) => void;
      onAskScroll: (handler: (data: { direction: 'up' | 'down' }) => void) => () => void;
      onAskPaginate: (handler: (data: { direction: 'up' | 'down' }) => void) => () => void;
      // Session controls
      getSession: () => Promise<string>;
      newSession: () => Promise<string>;
      onSessionChanged: (handler: (data: { sessionId: string }) => void) => () => void;
      dumpSession: () => Promise<
        Array<
          Record<
            string,
            {
              index: number;
              requestId: string;
              log_path: string | null;
              text_input: string;
              voice_input: string;
            }[]
          >
        >
      >;
      // Control whether the overlay window ignores mouse events
      setMouseIgnore: (ignore: boolean) => Promise<true>;
      // Realtime transcription bridge
      startTranscription: (options: { model?: string }) => Promise<any>;
      appendTranscriptionAudio: (base64Pcm16: string) => void;
      endTranscription: () => void;
      stopTranscription: () => void;
      onTranscribeStart: (
        handler: (data: { ok: boolean; sessionId?: string }) => void,
      ) => () => void;
      onTranscribeDelta: (
        handler: (data: { delta: string; sessionId?: string }) => void,
      ) => () => void;
      onTranscribeDone: (
        handler: (data: { content: string; sessionId?: string }) => void,
      ) => () => void;
      onTranscribeError: (
        handler: (data: { error: string; sessionId?: string }) => void,
      ) => () => void;
      onTranscribeClosed: (handler: () => void) => () => void;
    };
  }
}
