import type { WebContents } from "electron";

import WebSocket from "ws";

interface RealtimeSessionOptions {
  apiKey: string;
  baseURL?: string; // not used by WS
  model?: string; // default gpt-4o-mini-transcribe
  sessionId: string;
  language?: "en" | "zh";
}

export class RealtimeTranscribeManager {
  private sessions = new Map<
    number,
    {
      ws: WebSocket;
      webContents: WebContents;
      current: string[]; // collect current sentence parts
      sessionId: string;
    }
  >();

  // Helper to safely send IPC messages with error handling
  private safeSend(webContents: WebContents, channel: string, data: any): void {
    try {
      webContents.send(channel, data);
    } catch (err) {
      console.error(`[WS] Failed to send ${channel}:`, err);
    }
  }

  start(webContents: WebContents, opts: RealtimeSessionOptions) {
    const wcId = webContents.id;

    // Close existing session for this renderer if present
    this.stop(webContents);

    const url = "wss://api.openai.com/v1/realtime?intent=transcription";

    console.log("[WS] connecting", { url, wcId });
    const ws = new WebSocket(url, {
      headers: {
        "Authorization": `Bearer ${opts.apiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    const entry = {
      ws,
      webContents,
      current: [] as string[],
      sessionId: opts.sessionId,
    };

    this.sessions.set(wcId, entry);

    ws.on("open", () => {
      console.log("[WS] open", { wcId });
      // Configure session: pcm16 + server_vad + specific model
      const model = opts.model || "gpt-4o-realtime-preview-2025-06-03";
      const cfg: any = {
        type: "transcription_session.update",
        session: {
          input_audio_format: "pcm16",
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            silence_duration_ms: 350,
            prefix_padding_ms: 150,
          },
          input_audio_transcription: { model },
        },
      };
      // Language hint to reduce garbled text; default to en
      const lang = opts.language === "zh" ? "zh" : "en";

      try {
        // Some backends accept BCP-47; keep minimal 'en'/'zh' per requirement
        cfg.session.input_audio_transcription.language = lang;
      } catch {}

      ws.send(JSON.stringify(cfg));
      this.safeSend(webContents, "transcribe:start", {
        ok: true,
        sessionId: entry.sessionId,
      });
    });

    ws.on("message", (data) => {
      // Parse once and use for both logging and processing
      try {
        const ev = JSON.parse(data.toString());
        const typ = ev?.type as string | undefined;

        // Log compactly to avoid flooding
        if (typ) console.log("[WS] message", { wcId, type: typ });

        if (!typ) return;

        if (typ === "conversation.item.input_audio_transcription.delta") {
          const delta = ev?.delta as string | undefined;

          if (typeof delta === "string" && delta.length) {
            entry.current.push(delta);
            this.safeSend(webContents, "transcribe:delta", {
              delta,
              sessionId: entry.sessionId,
            });
          }
        } else if (
          typ === "conversation.item.input_audio_transcription.completed"
        ) {
          const full = entry.current.join("");

          entry.current.length = 0;
          this.safeSend(webContents, "transcribe:done", {
            content: full,
            sessionId: entry.sessionId,
          });
        }
      } catch (err) {
        this.safeSend(webContents, "transcribe:error", {
          error: String(err),
          sessionId: entry.sessionId,
        });
      }
    });

    ws.on("close", () => {
      console.log("[WS] close", { wcId });
      const full = entry.current.join("");

      entry.current.length = 0;
      if (full) {
        this.safeSend(webContents, "transcribe:done", {
          content: full,
          sessionId: entry.sessionId,
        });
      }
      this.safeSend(webContents, "transcribe:closed", {});
      this.sessions.delete(wcId);
    });

    ws.on("error", (err) => {
      console.error("[WS] error", { wcId, error: String(err?.message || err) });
      this.safeSend(webContents, "transcribe:error", {
        error: String(err?.message || err),
        sessionId: entry.sessionId,
      });
    });
  }

  append(webContents: WebContents, base64Pcm16: string) {
    const entry = this.sessions.get(webContents.id);

    if (!entry || entry.ws.readyState !== WebSocket.OPEN) return;
    // Log only meta info to avoid massive logs
    const payload = { type: "input_audio_buffer.append", audio: base64Pcm16 };

    entry.ws.send(JSON.stringify(payload));
  }

  end(webContents: WebContents) {
    const entry = this.sessions.get(webContents.id);

    if (!entry || entry.ws.readyState !== WebSocket.OPEN) return;
    console.log("[WS] input_audio_buffer.end", { wcId: webContents.id });
    entry.ws.send(JSON.stringify({ type: "input_audio_buffer.end" }));
  }

  stop(webContents: WebContents) {
    const entry = this.sessions.get(webContents.id);

    if (!entry) return;
    console.log("[WS] stop/close", { wcId: webContents.id });
    try {
      entry.ws.close(1000, "client stop");
    } catch {}
    this.sessions.delete(webContents.id);
  }
}

export const realtimeTranscribeManager = new RealtimeTranscribeManager();
