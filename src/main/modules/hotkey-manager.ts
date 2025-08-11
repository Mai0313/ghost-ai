import { globalShortcut } from 'electron';

export interface HotkeyHandlers {
  onTextInput: () => void | Promise<void>;
  onAudioRecord: () => void | Promise<void>;
  onToggleHide: () => void | Promise<void>;
}

const DEFAULT_TEXT_HOTKEY = process.platform === 'darwin' ? 'Command+Shift+S' : 'Control+Shift+S';
const DEFAULT_AUDIO_HOTKEY = process.platform === 'darwin' ? 'Command+Shift+V' : 'Control+Shift+V';
const DEFAULT_HIDE_HOTKEY = process.platform === 'darwin' ? 'Command+Shift+H' : 'Control+Shift+H';

export function registerHotkeys(handlers: HotkeyHandlers) {
  try {
    globalShortcut.register(DEFAULT_TEXT_HOTKEY, () => void handlers.onTextInput());
  } catch {}
  try {
    globalShortcut.register(DEFAULT_AUDIO_HOTKEY, () => void handlers.onAudioRecord());
  } catch {}
  try {
    globalShortcut.register(DEFAULT_HIDE_HOTKEY, () => void handlers.onToggleHide());
  } catch {}
}

export function unregisterAllHotkeys() {
  globalShortcut.unregisterAll();
}


