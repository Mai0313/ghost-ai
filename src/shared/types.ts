export interface OpenAIConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  timeout: number;
  maxTokens?: number | null;
  temperature?: number;
}

export interface AnalysisResult {
  requestId: string;
  content: string;
  model: string;
  timestamp: string;
  sessionId: string;
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
  // Preferred language for realtime transcription (UI: en or zh)
  transcribeLanguage?: "en" | "zh";
  // Whether to attach a screenshot with each Ask request
  attachScreenshot?: boolean;
}
