import { globalShortcut } from 'electron';

export interface HotkeyHandlers {
  onTextInput: () => void | Promise<void>;
  onToggleHide: () => void | Promise<void>;
}

// Fixed hotkeys (Cmd on macOS, Ctrl on others)
const ASK_HOTKEY = 'CommandOrControl+Enter';
const HIDE_HOTKEY = 'CommandOrControl+\\';

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

  return { ok: failures.length === 0, failed: failures };
}

export function unregisterAllHotkeys() {
  globalShortcut.unregisterAll();
}
