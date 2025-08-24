import { useEffect, useMemo, useRef, useState } from 'react';

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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const systemStreamRef = useRef<MediaStream | null>(null);
  const mixGainRef = useRef<GainNode | null>(null);
  const muteGainRef = useRef<GainNode | null>(null);
  const chunkFloatRef = useRef<Float32Array | null>(null);
  const chunkFloatLenRef = useRef<number>(0);
  const transcribeUnsubsRef = useRef<(() => void)[]>([]);
  const transcriptModeRef = useRef<boolean>(false);
  const transcriptBufferRef = useRef<string>('');
  const pausedRef = useRef<boolean>(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const TARGET_SR = 24000;
    const CHUNK_SAMPLES = 3072;
    const BATCH_FLUSH_MS = 220;
    const BATCH_MAX_BYTES = 32 * 1024;

    function floatTo16BitPCM(float32Array: Float32Array): Int16Array {
      const out = new Int16Array(float32Array.length);

      for (let i = 0; i < float32Array.length; i++) {
        let s = Math.max(-1, Math.min(1, float32Array[i] as number));

        out[i] = (s < 0 ? s * 0x8000 : s * 0x7fff) | 0;
      }

      return out;
    }

    function resample(buffer: Float32Array, inRate: number, outRate: number): Float32Array {
      if (inRate === outRate) return buffer;
      const ratio = inRate / outRate;
      const newLen = Math.floor(buffer.length / ratio);
      const out = new Float32Array(newLen);
      let pos = 0;

      for (let i = 0; i < newLen; i++) {
        const index = i * ratio;
        const i0 = Math.floor(index);
        const i1 = Math.min(buffer.length - 1, i0 + 1);
        const frac = index - i0;

        out[i] = buffer[i0]! * (1 - frac) + buffer[i1]! * frac;
        pos += ratio;
      }

      return out;
    }

    async function startPipeline() {
      setElapsedMs(0);
      timerRef.current = window.setInterval(() => {
        if (!pausedRef.current) setElapsedMs((ms) => ms + 1000);
      }, 1000) as unknown as number;

      setVisible(true);
      transcriptModeRef.current = true;
      transcriptBufferRef.current = '';
      setPaused(false);

      try {
        await (window as any).ghostAI?.startTranscription?.({ model: 'gpt-4o-mini-transcribe' });
      } catch (e) {
        console.error('Failed to start transcription session', e);
        alert('Failed to start transcription session. Check API key in Settings.');

        return;
      }

      try {
        const u1 = (window as any).ghostAI?.onTranscribeDelta?.(
          ({ delta, sessionId: sid }: { delta: string; sessionId: string }) => {
            if (sid && sessionId && sid !== sessionId) return;
            if (!delta) return;
            if (pausedRef.current) return;
            onDelta(delta);
            transcriptBufferRef.current += delta;
          },
        );

        if (typeof u1 === 'function') transcribeUnsubsRef.current.push(u1);

        const u2 = (window as any).ghostAI?.onTranscribeDone?.(
          ({ content, sessionId: sid }: { content: string; sessionId: string }) => {
            if (sid && sessionId && sid !== sessionId) return;
            if (!content) return;
            onDone(content);
            try {
              transcriptBufferRef.current = content.endsWith('\n') ? content : content + '\n';
            } catch {}
          },
        );

        if (typeof u2 === 'function') transcribeUnsubsRef.current.push(u2);

        const u3 = (window as any).ghostAI?.onTranscribeError?.(
          ({ error, sessionId: sid }: { error: string; sessionId: string }) => {
            if (sid && sessionId && sid !== sessionId) return;
            console.error('Transcribe error', error);
            onError?.(error);
          },
        );

        if (typeof u3 === 'function') transcribeUnsubsRef.current.push(u3);
      } catch {}

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

      audioCtxRef.current = audioCtx;
      const mix = audioCtx.createGain();

      mix.gain.value = 1.0;
      mixGainRef.current = mix;

      const mute = audioCtx.createGain();

      mute.gain.value = 0.0;
      muteGainRef.current = mute;

      try {
        const mic = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          } as any,
          video: false as any,
        });

        micStreamRef.current = mic;
        const micSrc = audioCtx.createMediaStreamSource(mic);

        micSrc.connect(mix);
      } catch (e) {
        console.warn('[Audio] microphone capture failed', e);
      }

      try {
        const sys = await navigator.mediaDevices.getDisplayMedia({
          audio: true as any,
          video: { frameRate: 1, width: 1, height: 1 } as any,
        } as any);

        sys.getVideoTracks().forEach((t) => t.stop());
        systemStreamRef.current = sys;
        const sysSrc = audioCtx.createMediaStreamSource(sys);

        sysSrc.connect(mix);
      } catch (e) {
        console.warn('[Audio] system audio capture failed', e);
      }

      const bufferSize = 4096;
      const processor = audioCtx.createScriptProcessor(bufferSize, 2, 2);

      processorRef.current = processor as any;
      mix.connect(processor);
      processor.connect(mute).connect(audioCtx.destination);

      chunkFloatRef.current = new Float32Array(CHUNK_SAMPLES * 4);
      chunkFloatLenRef.current = 0;

      let batchChunks: Uint8Array[] = [];
      let batchBytes = 0;
      let batchTimer: number | null = null;

      const flushBatch = () => {
        if (!batchBytes) return;
        if (batchTimer) {
          window.clearTimeout(batchTimer);
          batchTimer = null;
        }
        const merged = new Uint8Array(batchBytes);
        let offset = 0;

        for (const c of batchChunks) {
          merged.set(c, offset);
          offset += c.byteLength;
        }
        batchChunks = [];
        batchBytes = 0;
        const b64 = btoa(String.fromCharCode(...merged));

        try {
          (window as any).ghostAI?.appendTranscriptionAudio?.(b64);
        } catch (e) {
          console.warn('[Audio] appendTranscriptionAudio failed', e);
        }
      };

      const scheduleFlush = () => {
        if (batchTimer) return;
        batchTimer = window.setTimeout(() => {
          batchTimer = null;
          flushBatch();
        }, BATCH_FLUSH_MS) as unknown as number;
      };

      (processor as any).onaudioprocess = (ev: AudioProcessingEvent) => {
        try {
          if (pausedRef.current) return;
          const input = ev.inputBuffer;
          const channels = input.numberOfChannels;
          const len = input.length;
          const mono = new Float32Array(len);

          for (let c = 0; c < channels; c++) {
            const data = input.getChannelData(c);

            for (let i = 0; i < len; i++) mono[i] += data[i]! / channels;
          }
          const inRate = input.sampleRate || audioCtx.sampleRate;
          const resampled = resample(mono, inRate, TARGET_SR);

          const buf = chunkFloatRef.current!;
          let used = chunkFloatLenRef.current;
          let offset = 0;

          while (offset < resampled.length) {
            const space = buf.length - used;
            const copy = Math.min(space, resampled.length - offset);

            buf.set(resampled.subarray(offset, offset + copy), used);
            used += copy;
            offset += copy;

            if (used >= CHUNK_SAMPLES) {
              const toSend = buf.subarray(0, CHUNK_SAMPLES);
              const remain = used - CHUNK_SAMPLES;

              if (remain > 0) buf.copyWithin(0, CHUNK_SAMPLES, used);
              used = remain;

              const pcm16 = floatTo16BitPCM(toSend);
              const bytes = new Uint8Array(pcm16.buffer);

              batchChunks.push(bytes);
              batchBytes += bytes.byteLength;

              if (batchBytes >= BATCH_MAX_BYTES) {
                flushBatch();
              } else {
                scheduleFlush();
              }
            }
          }
          chunkFloatLenRef.current = used;
        } catch (err) {
          console.error('[Audio] process error', err);
        }
      };
    }

    function stopPipeline() {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      try {
        (window as any).ghostAI?.endTranscription?.();
      } catch {}
      try {
        (window as any).ghostAI?.stopTranscription?.();
      } catch {}
      try {
        const unsubs = transcribeUnsubsRef.current.splice(0);

        unsubs.forEach((fn) => {
          try {
            fn();
          } catch {}
        });
      } catch {}
      try {
        processorRef.current && (processorRef.current as any).disconnect();
      } catch {}
      try {
        mixGainRef.current && mixGainRef.current.disconnect();
      } catch {}
      try {
        muteGainRef.current && muteGainRef.current.disconnect();
      } catch {}
      try {
        audioCtxRef.current && audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
      processorRef.current = null as any;
      mixGainRef.current = null;
      muteGainRef.current = null;
      chunkFloatRef.current = null;
      chunkFloatLenRef.current = 0;
      try {
        micStreamRef.current?.getTracks().forEach((t) => t.stop());
        systemStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      micStreamRef.current = null;
      systemStreamRef.current = null;
    }

    if (recording) {
      startPipeline();
    } else {
      stopPipeline();
    }

    return () => {
      if (!recording) return;
      stopPipeline();
    };
  }, [recording]);

  const timeLabel = useMemo(() => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');

    return `${minutes}:${seconds}`;
  }, [elapsedMs]);

  return {
    elapsedMs,
    timeLabel,
    transcriptModeRef,
    transcriptBufferRef,
  } as const;
}
