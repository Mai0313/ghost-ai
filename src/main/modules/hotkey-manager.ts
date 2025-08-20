import { globalShortcut } from 'electron';

export interface HotkeyHandlers {
  onTextInput: () => void | Promise<void>;
  onToggleHide: () => void | Promise<void>;
  onClearAsk: () => void | Promise<void>;
  onAudioToggle: () => void | Promise<void>;

}

// Fixed hotkeys (Cmd on macOS, Ctrl on others)
const ASK_HOTKEY = 'CommandOrControl+Enter';
const HIDE_HOTKEY = 'CommandOrControl+\\';
const CLEAR_HOTKEY = 'CommandOrControl+R';
const AUDIO_TOGGLE_HOTKEY = 'CommandOrControl+Shift+Enter';


export function registerFixedHotkeys(handlers: HotkeyHandlers): {
  ok: boolean;
  failed: string[];
} {
  const failures: string[] = [];

  try {
    globalShortcut.register(ASK_HOTKEY, () => void handlers.onTextInput());
  } catch {
    failures.push(ASK_HOTKEY);
  }

  try {
    globalShortcut.register(HIDE_HOTKEY, () => void handlers.onToggleHide());
  } catch {
    failures.push(HIDE_HOTKEY);
  }

  try {
    globalShortcut.register(CLEAR_HOTKEY, () => void handlers.onClearAsk());
  } catch {
    failures.push(CLEAR_HOTKEY);
  }

  try {
    globalShortcut.register(AUDIO_TOGGLE_HOTKEY, () => void handlers.onAudioToggle());
  } catch {
    failures.push(AUDIO_TOGGLE_HOTKEY);
  }



  return { ok: failures.length === 0, failed: failures };
}

export function unregisterAllHotkeys() {
  globalShortcut.unregisterAll();
}
