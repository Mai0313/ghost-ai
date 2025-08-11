import type { BrowserWindow } from 'electron';

let isHidden = false;

export async function toggleHidden(win: BrowserWindow | null) {
  if (!win) return;
  if (isHidden) {
    win.showInactive();
    isHidden = false;
  } else {
    win.hide();
    isHidden = true;
  }
}

export function ensureHiddenOnCapture() {
  // In a fuller implementation, ensure all windows are hidden before capture
}

export function getHiddenState() {
  return isHidden;
}
