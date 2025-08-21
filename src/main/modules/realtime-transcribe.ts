import type { WebContents } from 'electron';

import WebSocket from 'ws';

interface RealtimeSessionOptions {
  apiKey: string;
  baseURL?: string; // not used by WS
  model?: string; // default gpt-4o-mini-transcribe
  sessionId?: string;
}

export class RealtimeTranscribeManager {
  private sessions = new Map<
    number,
    {
      ws: WebSocket;
      webContents: WebContents;
      current: string[]; // collect current sentence parts
      sessionId?: string;
    }
  >();

  start(webContents: WebContents, opts: RealtimeSessionOptions) {
    const wcId = webContents.id;

    // Close existing session for this renderer if present
    this.stop(webContents);

    const url = 'wss://api.openai.com/v1/realtime?intent=transcription';

    console.log('[WS] connecting', { url, wcId });
    const ws = new WebSocket(url, {
      headers: {
        'Authorization': `Bearer ${opts.apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    const entry = { ws, webContents, current: [] as string[], sessionId: opts.sessionId };

    this.sessions.set(wcId, entry);

    ws.on('open', () => {
      console.log('[WS] open', { wcId });
      // Configure session: pcm16 + server_vad + specific model
      const model = opts.model || 'gpt-4o-realtime-preview-2025-06-03';
      const cfg = {
        type: 'transcription_session.update',
        session: {
          input_audio_format: 'pcm16',
          turn_detection: { type: 'server_vad', threshold: 0.5 },
          input_audio_transcription: { model },
        },
      };

      ws.send(JSON.stringify(cfg));
      try {
        webContents.send('transcribe:start', { ok: true, sessionId: entry.sessionId });
      } catch {}
    });

    ws.on('message', (data) => {
      // Log compactly to avoid flooding
      try {
        const txt = data.toString();
        const typeHint = (() => {
          try {
            return JSON.parse(txt)?.type;
          } catch {
            return undefined;
          }
        })();

        if (typeHint) console.log('[WS] message', { wcId, type: typeHint });
      } catch {}
      try {
        const ev = JSON.parse(data.toString());
        const typ = ev?.type as string | undefined;

        if (!typ) return;

        if (typ === 'conversation.item.input_audio_transcription.delta') {
          const delta = ev?.delta as string | undefined;

          if (typeof delta === 'string' && delta.length) {
            entry.current.push(delta);
            try {
              webContents.send('transcribe:delta', { delta, sessionId: entry.sessionId });
            } catch {}
          }
        } else if (typ === 'conversation.item.input_audio_transcription.completed') {
          const full = entry.current.join('');

          entry.current.length = 0;
          try {
            webContents.send('transcribe:done', { content: full, sessionId: entry.sessionId });
          } catch {}
        }
      } catch (err) {
        try {
          webContents.send('transcribe:error', { error: String(err), sessionId: entry.sessionId });
        } catch {}
      }
    });

    ws.on('close', () => {
      console.log('[WS] close', { wcId });
      const full = entry.current.join('');

      entry.current.length = 0;
      try {
        if (full)
          webContents.send('transcribe:done', { content: full, sessionId: entry.sessionId });
        webContents.send('transcribe:closed');
      } catch {}
      this.sessions.delete(wcId);
    });

    ws.on('error', (err) => {
      console.error('[WS] error', { wcId, error: String(err?.message || err) });
      try {
        webContents.send('transcribe:error', {
          error: String(err?.message || err),
          sessionId: entry.sessionId,
        });
      } catch {}
    });
  }

  append(webContents: WebContents, base64Pcm16: string) {
    const entry = this.sessions.get(webContents.id);

    if (!entry || entry.ws.readyState !== WebSocket.OPEN) return;
    // Log only meta info to avoid massive logs
    const payload = { type: 'input_audio_buffer.append', audio: base64Pcm16 };

    entry.ws.send(JSON.stringify(payload));
  }

  end(webContents: WebContents) {
    const entry = this.sessions.get(webContents.id);

    if (!entry || entry.ws.readyState !== WebSocket.OPEN) return;
    console.log('[WS] input_audio_buffer.end', { wcId: webContents.id });
    entry.ws.send(JSON.stringify({ type: 'input_audio_buffer.end' }));
  }

  stop(webContents: WebContents) {
    const entry = this.sessions.get(webContents.id);

    if (!entry) return;
    console.log('[WS] stop/close', { wcId: webContents.id });
    try {
      entry.ws.close(1000, 'client stop');
    } catch {}
    this.sessions.delete(webContents.id);
  }
}

export const realtimeTranscribeManager = new RealtimeTranscribeManager();
