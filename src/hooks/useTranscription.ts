import { useEffect, useMemo, useRef, useState } from "react";

export type UseTranscriptionOptions = {
  recording: boolean;
  paused: boolean;
  sessionId: string;
  setPaused: (v: boolean | ((p: boolean) => boolean)) => void;
  onDelta: (delta: string) => void;
  onDone: (content: string) => void;
  onError?: (error: string) => void;
  setVisible: (visible: boolean) => void;
};

export function useTranscription({
  recording,
  paused,
  sessionId,
  setPaused,
  onDelta,
  onDone,
  onError,
  setVisible,
}: UseTranscriptionOptions) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Audio system refs (grouped for clarity)
  const audioRefs = useRef({
    ctx: null as AudioContext | null,
    workletNode: null as AudioWorkletNode | null,
    micStream: null as MediaStream | null,
    systemStream: null as MediaStream | null,
    mixGain: null as GainNode | null,
    muteGain: null as GainNode | null,
  });

  // Batch processing refs (grouped for clarity)
  const batchRefs = useRef({
    chunks: [] as Uint8Array[],
    bytes: 0,
    timer: null as number | null,
  });

  // Transcription state refs
  const transcribeUnsubsRef = useRef<(() => void)[]>([]);
  const transcriptModeRef = useRef<boolean>(false);
  const transcriptBufferRef = useRef<string>("");
  const pausedRef = useRef<boolean>(false);

  // Store callback refs to avoid stale closures
  const onDeltaRef = useRef(onDelta);
  const onDoneRef = useRef(onDone);
  const onErrorRef = useRef(onError);
  const setVisibleRef = useRef(setVisible);
  const setPausedRef = useRef(setPaused);
  const sessionIdRef = useRef(sessionId);

  // Update refs when callbacks change
  useEffect(() => {
    onDeltaRef.current = onDelta;
    onDoneRef.current = onDone;
    onErrorRef.current = onError;
    setVisibleRef.current = setVisible;
    setPausedRef.current = setPaused;
    sessionIdRef.current = sessionId;
  });

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const BATCH_FLUSH_MS = 220;
    const BATCH_MAX_BYTES = 32 * 1024;

    async function startPipeline() {
      setElapsedMs(0);
      timerRef.current = window.setInterval(() => {
        if (!pausedRef.current) setElapsedMs((ms) => ms + 1000);
      }, 1000) as unknown as number;

      setVisibleRef.current(true);
      transcriptModeRef.current = true;
      transcriptBufferRef.current = "";
      setPausedRef.current(false);

      try {
        await (window as any).ghostAI?.startTranscription?.({
          model: "gpt-4o-mini-transcribe",
        });
      } catch (e) {
        console.error("Failed to start transcription session", e);
        alert(
          "Failed to start transcription session. Check API key in Settings.",
        );

        return;
      }

      try {
        const u1 = (window as any).ghostAI?.onTranscribeDelta?.(
          ({ delta, sessionId: sid }: { delta: string; sessionId: string }) => {
            if (sid && sessionIdRef.current && sid !== sessionIdRef.current)
              return;
            if (!delta) return;
            if (pausedRef.current) return;
            onDeltaRef.current(delta);
            transcriptBufferRef.current += delta;
          },
        );

        if (typeof u1 === "function") transcribeUnsubsRef.current.push(u1);

        const u2 = (window as any).ghostAI?.onTranscribeDone?.(
          ({
            content,
            sessionId: sid,
          }: {
            content: string;
            sessionId: string;
          }) => {
            if (sid && sessionIdRef.current && sid !== sessionIdRef.current)
              return;
            if (!content) return;
            onDoneRef.current(content);
            try {
              transcriptBufferRef.current = content.endsWith("\n")
                ? content
                : content + "\n";
            } catch {}
          },
        );

        if (typeof u2 === "function") transcribeUnsubsRef.current.push(u2);

        const u3 = (window as any).ghostAI?.onTranscribeError?.(
          ({ error, sessionId: sid }: { error: string; sessionId: string }) => {
            if (sid && sessionIdRef.current && sid !== sessionIdRef.current)
              return;
            console.error("Transcribe error", error);
            onErrorRef.current?.(error);
          },
        );

        if (typeof u3 === "function") transcribeUnsubsRef.current.push(u3);
      } catch {}

      const audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      audioRefs.current.ctx = audioCtx;

      // Load AudioWorklet module (modern replacement for ScriptProcessorNode)
      try {
        await audioCtx.audioWorklet.addModule(
          "/worklets/audio-processor.worklet.js",
        );
      } catch (err) {
        console.error("[Audio] Failed to load AudioWorklet module:", err);
        alert(
          "Failed to initialize audio processor. Check console for details.",
        );

        return;
      }

      const mix = audioCtx.createGain();

      mix.gain.value = 1.0;
      audioRefs.current.mixGain = mix;

      const mute = audioCtx.createGain();

      mute.gain.value = 0.0;
      audioRefs.current.muteGain = mute;

      try {
        const mic = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          } as any,
          video: false as any,
        });

        audioRefs.current.micStream = mic;
        const micSrc = audioCtx.createMediaStreamSource(mic);

        micSrc.connect(mix);
      } catch (e) {
        console.warn("[Audio] microphone capture failed", e);
      }

      try {
        const sys = await navigator.mediaDevices.getDisplayMedia({
          audio: true as any,
          video: { frameRate: 1, width: 1, height: 1 } as any,
        } as any);

        sys.getVideoTracks().forEach((t) => t.stop());
        audioRefs.current.systemStream = sys;
        const sysSrc = audioCtx.createMediaStreamSource(sys);

        sysSrc.connect(mix);
      } catch (e) {
        console.warn("[Audio] system audio capture failed", e);
      }

      // Create AudioWorklet node (runs on audio thread, not main thread!)
      const workletNode = new AudioWorkletNode(
        audioCtx,
        "audio-recorder-processor",
      );

      audioRefs.current.workletNode = workletNode;
      mix.connect(workletNode);
      workletNode.connect(mute).connect(audioCtx.destination);

      const flushBatch = () => {
        const batch = batchRefs.current;

        if (!batch.bytes) return;

        if (batch.timer) {
          window.clearTimeout(batch.timer);
          batch.timer = null;
        }

        const merged = new Uint8Array(batch.bytes);
        let offset = 0;

        for (const c of batch.chunks) {
          merged.set(c, offset);
          offset += c.byteLength;
        }

        batch.chunks = [];
        batch.bytes = 0;

        // More efficient base64 encoding using FileReader (non-blocking)
        // Fallback to chunked encoding for older browsers
        if (typeof FileReader !== "undefined") {
          const blob = new Blob([merged]);
          const reader = new FileReader();

          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];

            (window as any).ghostAI?.appendTranscriptionAudio?.(base64);
          };
          reader.readAsDataURL(blob);
        } else {
          // Fallback: chunked encoding to avoid stack overflow
          const chunkSize = 8192;
          let binary = "";

          for (let i = 0; i < merged.length; i += chunkSize) {
            const end = Math.min(i + chunkSize, merged.length);
            const chunk = merged.subarray(i, end);

            // Use reduce to avoid stack overflow with apply
            binary += chunk.reduce(
              (str, byte) => str + String.fromCharCode(byte),
              "",
            );
          }
          const b64Encoded = btoa(binary);

          (window as any).ghostAI?.appendTranscriptionAudio?.(b64Encoded);
        }
      };

      const scheduleFlush = () => {
        const batch = batchRefs.current;

        if (batch.timer) return;
        batch.timer = window.setTimeout(() => {
          batch.timer = null;
          flushBatch();
        }, BATCH_FLUSH_MS) as unknown as number;
      };

      // Handle audio data from AudioWorklet (runs on audio thread)
      workletNode.port.onmessage = (event) => {
        try {
          if (pausedRef.current) return;

          if (event.data.type === "audioData") {
            const pcm16Buffer = event.data.data as ArrayBuffer;
            const bytes = new Uint8Array(pcm16Buffer);
            const batch = batchRefs.current;

            batch.chunks.push(bytes);
            batch.bytes += bytes.byteLength;

            if (batch.bytes >= BATCH_MAX_BYTES) {
              flushBatch();
            } else {
              scheduleFlush();
            }
          }
        } catch (err) {
          console.error("[Audio] worklet message error", err);
        }
      };
    }

    const stopPipeline = () => {
      // Clear timer
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Clear batch timer
      const batch = batchRefs.current;

      if (batch.timer) {
        window.clearTimeout(batch.timer);
        batch.timer = null;
      }

      // End transcription session
      window.ghostAI?.endTranscription?.();
      window.ghostAI?.stopTranscription?.();

      // Unsubscribe from all IPC listeners
      const unsubs = transcribeUnsubsRef.current.splice(0);

      unsubs.forEach((fn) => fn());

      // Disconnect audio nodes
      const audio = audioRefs.current;

      audio.workletNode?.disconnect();
      audio.workletNode = null;
      audio.mixGain?.disconnect();
      audio.mixGain = null;
      audio.muteGain?.disconnect();
      audio.muteGain = null;

      // Close audio context
      audio.ctx?.close();
      audio.ctx = null;

      // Stop all media tracks
      audio.micStream?.getTracks().forEach((t) => t.stop());
      audio.micStream = null;
      audio.systemStream?.getTracks().forEach((t) => t.stop());
      audio.systemStream = null;

      // Clear batch buffers
      batch.chunks = [];
      batch.bytes = 0;
    };

    if (recording) {
      startPipeline();
    } else {
      stopPipeline();
    }

    return () => {
      if (!recording) return;
      stopPipeline();
    };
  }, [recording]); // All other dependencies handled via refs to avoid stale closures

  const timeLabel = useMemo(() => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");

    return `${minutes}:${seconds}`;
  }, [elapsedMs]);

  return {
    elapsedMs,
    timeLabel,
    transcriptModeRef,
    transcriptBufferRef,
  } as const;
}
