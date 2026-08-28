import { globalShortcut } from "electron";

export interface HotkeyHandlers {
  onTextInput: () => void | Promise<void>;
  onToggleHide: () => void | Promise<void>;
  onClearAsk: () => void | Promise<void>;
  onAudioToggle: () => void | Promise<void>;
  onScrollUp: () => void | Promise<void>;
  onScrollDown: () => void | Promise<void>;
  onPagePrev: () => void | Promise<void>;
  onPageNext: () => void | Promise<void>;
}

// Fixed hotkeys (Cmd on macOS, Ctrl on others)
const ASK_HOTKEY = "CommandOrControl+Enter";
const HIDE_HOTKEY = "CommandOrControl+\\";
const CLEAR_HOTKEY = "CommandOrControl+R";
const AUDIO_TOGGLE_HOTKEY = "CommandOrControl+Shift+Enter";
const SCROLL_UP_HOTKEY = "CommandOrControl+Up";
const SCROLL_DOWN_HOTKEY = "CommandOrControl+Down";
const PAGE_PREV_HOTKEY = "CommandOrControl+Shift+Up";
const PAGE_NEXT_HOTKEY = "CommandOrControl+Shift+Down";

/**
 * Helper to register a single hotkey with error handling
 */
function registerHotkey(
  key: string,
  handler: () => void,
  failures: string[],
): void {
  try {
    globalShortcut.register(key, handler);
  } catch {
    failures.push(key);
  }
}

export function registerFixedHotkeys(handlers: HotkeyHandlers): {
  ok: boolean;
  failed: string[];
} {
  const failures: string[] = [];

  const hotkeys: Array<{ key: string; handler: () => void }> = [
    { key: ASK_HOTKEY, handler: () => void handlers.onTextInput() },
    { key: HIDE_HOTKEY, handler: () => void handlers.onToggleHide() },
    { key: CLEAR_HOTKEY, handler: () => void handlers.onClearAsk() },
    { key: AUDIO_TOGGLE_HOTKEY, handler: () => void handlers.onAudioToggle() },
    { key: SCROLL_UP_HOTKEY, handler: () => void handlers.onScrollUp() },
    { key: SCROLL_DOWN_HOTKEY, handler: () => void handlers.onScrollDown() },
    { key: PAGE_PREV_HOTKEY, handler: () => void handlers.onPagePrev() },
    { key: PAGE_NEXT_HOTKEY, handler: () => void handlers.onPageNext() },
  ];

  for (const { key, handler } of hotkeys) {
    registerHotkey(key, handler, failures);
  }

  return { ok: failures.length === 0, failed: failures };
}

export function unregisterAllHotkeys() {
  globalShortcut.unregisterAll();
}
