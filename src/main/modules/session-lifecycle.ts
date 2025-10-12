import type { BrowserWindow } from "electron";

import crypto from "node:crypto";

import { sessionStore } from "./session-store";
import { logManager } from "./log-manager";

/**
 * Centralized session lifecycle management
 * Consolidates session creation, clearing, and initialization logic
 */
export class SessionLifecycleManager {
  private currentSessionId: string;
  private activeControllers = new Map<number, AbortController>();

  constructor(initialSessionId?: string) {
    this.currentSessionId = initialSessionId || crypto.randomUUID();
  }

  getCurrentSessionId(): string {
    return this.currentSessionId;
  }

  /**
   * Get or create AbortController for a specific webContents
   * Aborts previous controller if exists
   */
  getOrCreateController(webContentsId: number): AbortController {
    const prev = this.activeControllers.get(webContentsId);

    if (prev) {
      try {
        prev.abort();
      } catch {}
    }

    const controller = new AbortController();

    this.activeControllers.set(webContentsId, controller);

    return controller;
  }

  /**
   * Remove controller for specific webContents
   */
  removeController(webContentsId: number, controller?: AbortController): void {
    if (controller) {
      const cur = this.activeControllers.get(webContentsId);

      if (cur === controller) {
        this.activeControllers.delete(webContentsId);
      }
    } else {
      this.activeControllers.delete(webContentsId);
    }
  }

  /**
   * Abort and remove controller for specific webContents
   */
  abortController(webContentsId: number): void {
    const ctrl = this.activeControllers.get(webContentsId);

    if (ctrl) {
      try {
        ctrl.abort();
      } catch (err) {
        console.error("[SessionLifecycle] Failed to abort controller:", err);
      }
      this.activeControllers.delete(webContentsId);
    }
  }

  /**
   * Initialize empty session logs
   */
  private async initializeSessionLogs(sessionId: string): Promise<void> {
    try {
      const json = sessionStore.toJSON();

      await logManager.writeSessionJson(sessionId, json[sessionId] ?? {});
    } catch (err) {
      console.error(
        "[SessionLifecycle] Failed to initialize session logs:",
        err,
      );
    }
  }

  /**
   * Reset current session - unified logic for all session clearing scenarios
   * @param webContentsId - Optional webContents ID to abort its controller
   * @param reason - Reason for reset (for logging)
   */
  async resetSession(
    window: BrowserWindow | null,
    webContentsId?: number,
    reason: string = "manual",
  ): Promise<string> {
    // Abort specific or all active controllers
    if (webContentsId !== undefined) {
      this.abortController(webContentsId);
    }

    // Clear session store
    sessionStore.clearAll();

    // Generate new session ID
    this.currentSessionId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    console.log(
      `[SessionLifecycle] ${timestamp} sessionId reset (${reason}):`,
      this.currentSessionId,
    );

    // Initialize new session logs
    await this.initializeSessionLogs(this.currentSessionId);

    // Broadcast session change to renderer
    if (window && !window.isDestroyed()) {
      window.webContents.send("session:changed", {
        sessionId: this.currentSessionId,
      });
    }

    return this.currentSessionId;
  }

  /**
   * Cleanup all controllers (for app shutdown)
   */
  cleanup(): void {
    for (const controller of this.activeControllers.values()) {
      try {
        controller.abort();
      } catch {}
    }
    this.activeControllers.clear();
  }
}

// Singleton instance
export const sessionLifecycle = new SessionLifecycleManager();
