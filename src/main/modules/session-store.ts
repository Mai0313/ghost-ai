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

  clearAll(): void {
    this.sessions.clear();
  }

  private ensure(sessionId: string): SessionState {
    let st = this.sessions.get(sessionId);

    if (!st) {
      st = { entries: [], nextIndex: 0, logPath: null } as SessionState;
      this.sessions.set(sessionId, st);
    }

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

  // For debugging/inspection
  getSessionsData(): Array<Record<string, SessionEntry[]>> {
    const list: Array<Record<string, SessionEntry[]>> = [];

    for (const [sid, st] of this.sessions) {
      list.push({ [sid]: [...st.entries] });
    }

    return list;
  }

  // Return a plain object { sessionId: { entries, nextIndex } } for persistence
  toJSON(): Record<string, { entries: SessionEntry[]; nextIndex: number; log_path: string | null }> {
    const out: Record<string, { entries: SessionEntry[]; nextIndex: number; log_path: string | null }> = {};

    for (const [sid, st] of this.sessions) {
      out[sid] = { entries: [...st.entries], nextIndex: st.nextIndex, log_path: st.logPath ?? null };
    }

    return out;
  }
}

export const sessionStore = new SessionStore();


