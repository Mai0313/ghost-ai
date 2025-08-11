export type Role = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: Role;
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } }
      >;
}

export interface OpenAIConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  timeout: number;
  maxTokens: number;
  temperature: number;
}

export interface AnalysisResult {
  requestId: string;
  content: string;
  model: string;
  timestamp: string;
}

export interface TranscriptionResult {
  requestId: string;
  text: string;
  confidence?: number;
  language?: string;
  duration?: number;
  timestamp: string;
}

export interface HotkeyConfig {
  textInput: string;
  audioRecord: string;
  hideToggle: string;
}

export interface UserSettings {
  textInputHotkey: string;
  audioRecordHotkey: string;
  hideToggleHotkey: string;
  defaultPrompt: string;
  autoHide: boolean;
  privacyMode: boolean;
  audioDevice?: string;
  rememberHideState: boolean;
  openaiConfig: OpenAIConfig;
  isFirstRun: boolean;
}


