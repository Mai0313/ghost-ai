import type { OpenAIConfig, UserSettings } from "@shared/types";

export {};

declare global {
  interface Window {
    ghostAI: {
      // OpenAI Configuration
      updateOpenAIConfig: (cfg: Partial<OpenAIConfig>) => Promise<boolean>;
      getOpenAIConfig: () => Promise<OpenAIConfig | null>;
      validateOpenAIConfig: (cfg: OpenAIConfig) => Promise<boolean>;
      listOpenAIModels: () => Promise<string[]>;
      updateOpenAIConfigVolatile: (
        cfg: Partial<OpenAIConfig>,
      ) => Promise<boolean>;
      onOpenAIConfigUpdated: (handler: () => void) => () => void;

      // Analyze Stream (Simplified: Renderer provides formatted prompt)
      analyzeCurrentScreenStream: (
        textPrompt: string,
        customPrompt: string,
        formattedPrompt: string,
        handlers: {
          onStart?: (payload: { requestId: string; sessionId: string }) => void;
          onDelta?: (payload: {
            requestId: string;
            sessionId: string;
            channel?: "answer" | "reasoning" | "web_search";
            eventType?: string;
            delta?: string;
            text?: string;
          }) => void;
          onDone?: (payload: {
            requestId: string;
            content: string;
            sessionId: string;
          }) => void;
          onError?: (payload: {
            requestId?: string;
            error: string;
            sessionId: string;
          }) => void;
        },
      ) => () => void;

      // Prompts Management
      listPrompts: () => Promise<{
        prompts: string[];
        defaultPrompt: string | null;
      }>;
      readPrompt: (name?: string) => Promise<string>;
      setDefaultPrompt: (name: string) => Promise<string>;
      getDefaultPrompt: () => Promise<string | null>;
      getActivePromptName: () => Promise<string | null>;
      setActivePromptName: (name: string) => Promise<string>;

      // User Settings
      getUserSettings: () => Promise<Partial<UserSettings>>;
      updateUserSettings: (
        partial: Partial<UserSettings>,
      ) => Promise<Partial<UserSettings>>;

      // UI Events
      onTextInputShow: (handler: () => void) => void;
      onTextInputToggle: (handler: () => void) => void;
      onHUDShow: (handler: () => void) => void;
      onAskClear: (handler: () => void) => void;
      onAudioToggle: (handler: () => void) => void;
      onAskScroll: (
        handler: (data: { direction: "up" | "down" }) => void,
      ) => () => void;
      onAskPaginate: (
        handler: (data: { direction: "up" | "down" }) => void,
      ) => () => void;

      // Window Controls
      toggleHide: () => Promise<boolean>;
      quitApp: () => Promise<boolean>;
      setMouseIgnore: (ignore: boolean) => Promise<boolean>;

      // Session Controls
      getSession: () => Promise<string>;
      newSession: () => Promise<string>;
      onSessionChanged: (
        handler: (data: { sessionId: string }) => void,
      ) => () => void;
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

      // Realtime Transcription
      startTranscription: (options: {
        model?: string;
      }) => Promise<{ ok: boolean }>;
      appendTranscriptionAudio: (base64Pcm16: string) => void;
      endTranscription: () => void;
      stopTranscription: () => void;
      onTranscribeStart: (
        handler: (data: { ok: boolean; sessionId: string }) => void,
      ) => () => void;
      onTranscribeDelta: (
        handler: (data: { delta: string; sessionId: string }) => void,
      ) => () => void;
      onTranscribeDone: (
        handler: (data: { content: string; sessionId: string }) => void,
      ) => () => void;
      onTranscribeError: (
        handler: (data: { error: string; sessionId: string }) => void,
      ) => () => void;
      onTranscribeClosed: (handler: () => void) => () => void;
    };
  }
}
