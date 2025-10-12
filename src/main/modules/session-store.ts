export interface SessionEntry {
  index: number;
  requestId: string;
  text_input: string;
  ai_output: string; // model's final answer content
}

interface SessionState {
  entries: SessionEntry[];
  nextIndex: number;
  logPath: string | null;
}

class SessionStore {
  private sessions = new Map<string, SessionState>();
  private readonly maxSessions = 50; // LRU limit to prevent memory leak

  clearAll(): void {
    this.sessions.clear();
  }

  /**
   * Evict oldest session if map exceeds max size (simple FIFO)
   */
  private evictOldestIfNeeded(): void {
    if (this.sessions.size >= this.maxSessions) {
      const oldestKey = this.sessions.keys().next().value;

      if (oldestKey !== undefined) {
        this.sessions.delete(oldestKey);
        console.log(`[SessionStore] Evicted oldest session: ${oldestKey}`);
      }
    }
  }

  private ensure(sessionId: string): SessionState {
    let st = this.sessions.get(sessionId);

    if (!st) {
      // Evict oldest session before adding new one if at capacity
      this.evictOldestIfNeeded();
      st = { entries: [], nextIndex: 0, logPath: null } as SessionState;
      this.sessions.set(sessionId, st);
    }
    // No need to refresh access order - simpler FIFO approach

    return st;
  }

  appendEntry(
    sessionId: string,
    data: { requestId: string; text_input: string; ai_output: string },
  ): SessionEntry {
    const st = this.ensure(sessionId);
    const entry: SessionEntry = {
      index: st.nextIndex++,
      requestId: data.requestId,
      text_input: data.text_input,
      ai_output: data.ai_output,
    };

    st.entries.push(entry);

    return entry;
  }

  updateSessionLogPath(sessionId: string, logPath: string): void {
    const st = this.sessions.get(sessionId);

    if (!st) return;
    st.logPath = logPath;
  }

  hasEntries(sessionId: string): boolean {
    const st = this.sessions.get(sessionId);

    return !!st && st.entries.length > 0;
  }

  // For debugging/inspection
  getSessionsData(): Array<Record<string, SessionEntry[]>> {
    return Array.from(this.sessions, ([sid, st]) => ({ [sid]: st.entries }));
  }

  // Return a plain object { sessionId: { entries, nextIndex } } for persistence
  toJSON(): Record<
    string,
    { entries: SessionEntry[]; nextIndex: number; log_path: string | null }
  > {
    const out: Record<
      string,
      { entries: SessionEntry[]; nextIndex: number; log_path: string | null }
    > = {};

    for (const [sid, st] of this.sessions) {
      out[sid] = {
        entries: st.entries,
        nextIndex: st.nextIndex,
        log_path: st.logPath,
      };
    }

    return out;
  }
}

export const sessionStore = new SessionStore();
