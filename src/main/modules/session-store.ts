export interface SessionEntry {
  index: number;
  requestId: string;
  log_path: string | null;
  text_input: string;
  voice_input: string; // snapshot from accumulated live transcript at send time
  ai_output: string; // model's final answer content
}

interface SessionState {
  entries: SessionEntry[];
  nextIndex: number;
  voiceBuffer: string; // accumulated from realtime transcribe deltas
}

class SessionStore {
  private sessions = new Map<string, SessionState>();

  clearAll(): void {
    this.sessions.clear();
  }

  private ensure(sessionId: string): SessionState {
    let st = this.sessions.get(sessionId);

    if (!st) {
      st = { entries: [], nextIndex: 0, voiceBuffer: '' };
      this.sessions.set(sessionId, st);
    }

    return st;
  }

  appendEntry(
    sessionId: string,
    data: { requestId: string; text_input: string; voice_input: string; ai_output: string },
  ): SessionEntry {
    const st = this.ensure(sessionId);
    const entry: SessionEntry = {
      index: st.nextIndex++,
      requestId: data.requestId,
      log_path: null,
      text_input: data.text_input,
      voice_input: data.voice_input,
      ai_output: data.ai_output,
    };

    st.entries.push(entry);

    return entry;
  }

  updateEntryLogPath(sessionId: string, requestId: string, logPath: string): void {
    const st = this.sessions.get(sessionId);

    if (!st) return;
    const entry = st.entries.find((e) => e.requestId === requestId);

    if (entry) entry.log_path = logPath;
  }

  appendVoiceDelta(sessionId: string, delta: string): void {
    if (!delta) return;
    const st = this.ensure(sessionId);

    st.voiceBuffer += delta;
  }

  markVoiceSentenceEnd(sessionId: string): void {
    const st = this.ensure(sessionId);

    if (!st.voiceBuffer.endsWith('\n')) st.voiceBuffer += '\n';
  }

  snapshotAndClearVoiceBuffer(sessionId: string): string {
    const st = this.ensure(sessionId);
    const out = st.voiceBuffer;

    st.voiceBuffer = '';

    return out;
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
  toJSON(): Record<string, { entries: SessionEntry[]; nextIndex: number }> {
    const out: Record<string, { entries: SessionEntry[]; nextIndex: number }> = {};

    for (const [sid, st] of this.sessions) {
      out[sid] = { entries: [...st.entries], nextIndex: st.nextIndex };
    }

    return out;
  }
}

export const sessionStore = new SessionStore();


