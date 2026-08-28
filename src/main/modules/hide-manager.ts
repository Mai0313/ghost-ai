import type { BrowserWindow as BrowserWindowType } from "electron";

import { BrowserWindow } from "electron";

// Track hidden state in memory only (not persisted)
let isHidden = false;

export async function toggleHidden(win: BrowserWindowType | null) {
  if (!win) return;
  if (isHidden) {
    win.showInactive();
    try {
      win.webContents.send("hud:show");
    } catch (err) {
      console.error("[Hide] Failed to send hud:show event:", err);
    }
    isHidden = false;
  } else {
    win.hide();
    isHidden = true;
  }
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
