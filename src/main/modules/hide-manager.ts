import type { BrowserWindow as BrowserWindowType } from "electron";

import { BrowserWindow } from "electron";

import { loadHiddenState, saveHiddenState } from "./settings-manager";

let isHidden = loadHiddenState();

export async function toggleHidden(win: BrowserWindowType | null) {
  if (!win) return;
  if (isHidden) {
    win.showInactive();
    try {
      win.webContents.send("hud:show");
    } catch {}
    isHidden = false;
    saveHiddenState(false);
  } else {
    win.hide();
    isHidden = true;
    saveHiddenState(true);
  }
}

export function ensureHiddenOnCapture() {
  // Kept for backward compatibility; use hideAllWindowsDuring in new code
}

export async function hideAllWindowsDuring<T>(
  fn: () => Promise<T> | T,
): Promise<T> {
  const windows = BrowserWindow.getAllWindows();
  const wasVisible = windows.map((w) => ({ w, visible: w.isVisible() }));

  try {
    windows.forEach((w) => {
      if (w.isVisible()) w.hide();
    });

    return await fn();
  } finally {
    for (const { w, visible } of wasVisible) {
      if (visible) w.showInactive();
    }
  }
}

export function getHiddenState() {
  return isHidden;
}
