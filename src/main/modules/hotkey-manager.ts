import { globalShortcut } from 'electron';
import type { HotkeyConfig } from '@shared/types';

export interface HotkeyHandlers {
  onTextInput: () => void | Promise<void>;
  onAudioRecord: () => void | Promise<void>;
  onToggleHide: () => void | Promise<void>;
}

const DEFAULT_TEXT_HOTKEY = process.platform === 'darwin' ? 'Command+Shift+S' : 'Control+Shift+S';
const DEFAULT_AUDIO_HOTKEY = process.platform === 'darwin' ? 'Command+Shift+V' : 'Control+Shift+V';
const DEFAULT_HIDE_HOTKEY = process.platform === 'darwin' ? 'Command+Shift+H' : 'Control+Shift+H';

export function registerHotkeys(
  handlers: HotkeyHandlers,
  custom?: Partial<HotkeyConfig>,
): { ok: boolean; failed: string[] } {
  const failures: string[] = [];
  const text = custom?.textInput ?? DEFAULT_TEXT_HOTKEY;
  const audio = custom?.audioRecord ?? DEFAULT_AUDIO_HOTKEY;
  const hide = custom?.hideToggle ?? DEFAULT_HIDE_HOTKEY;

  try {
    globalShortcut.register(text, () => void handlers.onTextInput());
  } catch {
    failures.push(text);
  }
  try {
    globalShortcut.register(audio, () => void handlers.onAudioRecord());
  } catch {
    failures.push(audio);
  }
  try {
    globalShortcut.register(hide, () => void handlers.onToggleHide());
  } catch {
    failures.push(hide);
  }

  return { ok: failures.length === 0, failed: failures };
}

export function unregisterAllHotkeys() {
  globalShortcut.unregisterAll();
}
