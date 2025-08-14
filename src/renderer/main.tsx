import React, { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';

import { Settings } from './components/Settings';
import {
  IconEyeOff,
  IconGear,
  IconMicOff,
  IconText,
  IconWaveBars,
  IconX,
} from './components/Icons';
import {
  appRootStyle,
  askCard,
  askFooter,
  askInput,
  askResultArea,
  barStyle,
  ghostButton,
  iconButton,
  pillButton,
  settingsCard,
} from './styles/styles';
import { theme } from './styles/theme';

// Window.ghostAI types are declared in src/renderer/global.d.ts

function App() {
  // Show minimal HUD by default so the user can see/operate it
  const [visible, setVisible] = useState<boolean>(true);
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null); // null = latest
  const [streaming, setStreaming] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [tab, setTab] = useState<'ask' | 'settings' | null>(null);
  const tabRef = useRef<'ask' | 'settings' | null>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<number | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [barPos, setBarPos] = useState<{ x: number; y: number }>({ x: 0, y: 20 });
  const dragStateRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const askInputRef = useRef<HTMLInputElement | null>(null);
  const [composing, setComposing] = useState(false);
  const activeUnsubRef = useRef<null | (() => void)>(null);
  const lastDeltaRef = useRef<string | null>(null);

  // Center the bar horizontally on first mount
  useLayoutEffect(() => {
    const el = barRef.current;

    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();

      setBarPos({ x: Math.max(10, Math.round((window.innerWidth - rect.width) / 2)), y: 20 });
    };

    update();
    window.addEventListener('resize', update);

    return () => window.removeEventListener('resize', update);
  }, []);
  // Realtime transcription audio pipeline
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

  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);
  // Global hover detection to toggle native click-through dynamically
  useEffect(() => {
    const onMove = (ev: MouseEvent) => {
      if (!visible) return (window as any).ghostAI?.setMouseIgnore?.(true);
      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const overUI =
        !!el &&
        ((barRef.current && barRef.current.contains(el)) ||
          (bubbleRef.current && bubbleRef.current.contains(el)));

      (window as any).ghostAI?.setMouseIgnore?.(!overUI);
    };

    window.addEventListener('mousemove', onMove, true);

    return () => window.removeEventListener('mousemove', onMove, true);
  }, [visible]);

  useEffect(() => {
    // Guard in case preload failed; avoid crashing when window.ghostAI is undefined
    const api = (window as any).ghostAI;

    api?.onTextInputShow?.(() => {
      setVisible(true);
      // Only open Ask panel on explicit TextInput action; transcriptMode stays unchanged
      setTab('ask');
      // Reset transient flags to allow new input
      setBusy(false);
      setStreaming(false);
      // Always focus when invoked via hotkey/menu
      setTimeout(() => askInputRef.current?.focus(), 0);
    });
    api?.onTextInputToggle?.(() => {
      setVisible(true);
      if (tabRef.current === 'ask') {
        // Collapse Ask panel
        setTab(null);
      } else {
        // Expand Ask panel and focus input
        setTab('ask');
        setBusy(false);
        setStreaming(false);
        setTimeout(() => askInputRef.current?.focus(), 0);
      }
    });
    api?.onHUDShow?.(() => {
      setVisible(true);
      // Ensure Ask input is ready if Ask tab is active
      if (tabRef.current === 'ask') {
        setBusy(false);
        setStreaming(false);
        setTimeout(() => askInputRef.current?.focus(), 0);
      }
    });
  }, []);

  // Auto-focus whenever Ask is shown and ensure input is enabled
  useEffect(() => {
    if (visible && tab === 'ask') {
      setBusy(false);
      setStreaming(false);
      const id = window.setTimeout(() => askInputRef.current?.focus(), 0);

      return () => window.clearTimeout(id);
    }
  }, [visible, tab]);

  // When navigating answers, keep Ask tab visible and focused
  useEffect(() => {
    if (historyIndex !== null && visible) {
      if (tab !== 'ask') setTab('ask');
      const id = window.setTimeout(() => askInputRef.current?.focus(), 0);

      return () => window.clearTimeout(id);
    }
  }, [historyIndex, visible, tab]);

  // After completing a response (not busy/streaming), keep the caret ready for the next question
  useEffect(() => {
    if (visible && tab === 'ask' && !busy && !streaming) {
      const id = window.setTimeout(() => askInputRef.current?.focus(), 0);

      return () => window.clearTimeout(id);
    }
  }, [visible, tab, busy, streaming]);

  useEffect(() => {
    const api = (window as any).ghostAI;

    api?.onAudioToggle?.(() => setRecording((prev) => !prev));
    api?.onAskClear?.(() => {
      // Reset conversation UI state
      setHistory([]);
      setResult('');
      setHistoryIndex(null);
      // Reset audio state: stop recording
      if (recording) setRecording(false);
      setElapsedMs(0);
    });
    api?.onAskPrev?.(() => {
      const answers = history.filter((m) => m.role === 'assistant');

      if (!answers.length) return;
      setHistoryIndex((idx) => {
        const current = idx === null ? answers.length - 1 : Math.max(0, idx - 1);

        setResult(answers[current]?.content ?? '');

        return current;
      });
    });
    api?.onAskNext?.(() => {
      const answers = history.filter((m) => m.role === 'assistant');

      if (!answers.length) return;
      setHistoryIndex((idx) => {
        if (idx === null) return null;
        const next = idx + 1;

        if (next >= answers.length) {
          return answers.length - 1;
        }
        setResult(answers[next]?.content ?? '');

        return next;
      });
    });
  }, []);

  useEffect(() => {
    const TARGET_SR = 24000;
    const CHUNK_SAMPLES = 3072; // ~128ms at 24kHz

    function floatTo16BitPCM(float32Array: Float32Array): Int16Array {
      const out = new Int16Array(float32Array.length);
      for (let i = 0; i < float32Array.length; i++) {
        let s = Math.max(-1, Math.min(1, float32Array[i] as number));
        out[i] = (s < 0 ? s * 0x8000 : s * 0x7fff) | 0;
      }
      return out;
    }

    function base64EncodePCM(int16: Int16Array): string {
      const bytes = new Uint8Array(int16.buffer);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i] as number);
      return btoa(binary);
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
        setElapsedMs((ms) => ms + 1000);
      }, 1000) as unknown as number;

      // Show overlay, but do NOT open Ask panel; use transcript-only bubble
      setVisible(true);
      transcriptModeRef.current = true;
      setResult('');

      try {
        await (window as any).ghostAI?.startTranscription?.({ model: 'gpt-4o-mini-transcribe' });
      } catch (e) {
        console.error('Failed to start transcription session', e);
        alert('Failed to start transcription session. Check API key in Settings.');
        setRecording(false);
        return;
      }

      // Bind transcript events (store unsubs to clean on stop)
      try {
        const u1 = (window as any).ghostAI?.onTranscribeDelta?.(({ delta }: { delta: string }) => {
          if (!delta) return;
          setResult((prev) => prev + delta);
        });
        if (typeof u1 === 'function') transcribeUnsubsRef.current.push(u1);

        const u2 = (window as any).ghostAI?.onTranscribeDone?.(({ content }: { content: string }) => {
          if (!content) return;
          setResult((prev) => (prev.endsWith('\n') ? prev : prev + '\n'));
        });
        if (typeof u2 === 'function') transcribeUnsubsRef.current.push(u2);

        const u3 = (window as any).ghostAI?.onTranscribeError?.(({ error }: { error: string }) => {
          console.error('Transcribe error', error);
        });
        if (typeof u3 === 'function') transcribeUnsubsRef.current.push(u3);
      } catch {}

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const mix = audioCtx.createGain();
      mix.gain.value = 1.0;
      mixGainRef.current = mix;

      // Mute path to avoid audible feedback
      const mute = audioCtx.createGain();
      mute.gain.value = 0.0;
      muteGainRef.current = mute;

      // Try capture mic
      try {
        console.log('[Audio] requesting microphone');
        const mic = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          } as any,
          video: false as any,
        });
        console.log('[Audio] microphone granted', mic.getAudioTracks().map((t) => t.label));
        micStreamRef.current = mic;
        const micSrc = audioCtx.createMediaStreamSource(mic);
        micSrc.connect(mix);
      } catch (e) {
        console.warn('[Audio] microphone capture failed', e);
      }

      // Try capture system audio via display media
      try {
        console.log('[Audio] requesting system audio via getDisplayMedia');
        const sys = await navigator.mediaDevices.getDisplayMedia({
          audio: true as any,
          video: { frameRate: 1, width: 1, height: 1 } as any,
        } as any);
        // Remove video tracks to reduce overhead
        sys.getVideoTracks().forEach((t) => t.stop());
        console.log('[Audio] system audio granted', sys.getAudioTracks().map((t) => t.label));
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

      processor.onaudioprocess = (ev: AudioProcessingEvent) => {
        try {
          const input = ev.inputBuffer;
          const channels = input.numberOfChannels;
          const len = input.length;
          // Mix down to mono
          const mono = new Float32Array(len);
          for (let c = 0; c < channels; c++) {
            const data = input.getChannelData(c);
            for (let i = 0; i < len; i++) mono[i] += data[i]! / channels;
          }
          const inRate = input.sampleRate || audioCtx.sampleRate;
          const resampled = resample(mono, inRate, TARGET_SR);

          // Append to chunk buffer
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
              // Shift remaining
              const remain = used - CHUNK_SAMPLES;
              if (remain > 0) buf.copyWithin(0, CHUNK_SAMPLES, used);
              used = remain;

              const pcm16 = floatTo16BitPCM(toSend);
              const b64 = base64EncodePCM(pcm16);
              (window as any).ghostAI?.appendTranscriptionAudio?.(b64);
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
          try { fn(); } catch {}
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
      // Keep transcriptModeRef true so last transcript remains visible; caller clears if needed
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
  // No-op cleanup useEffect removed; handled in stopPipeline

  const onSubmit = useCallback(async () => {
    if (busy || streaming) return;
    // Ensure previous stream listeners are removed before starting a new one
    if (activeUnsubRef.current) {
      try {
        activeUnsubRef.current();
      } catch {}
      activeUnsubRef.current = null;
    }
    lastDeltaRef.current = null;
    setBusy(true);
    setStreaming(true);
    const userMessage = text; // may be empty; we'll rely on customPrompt
    const cfg = await (window as any).ghostAI?.getOpenAIConfig?.();
    const basePrompt = (cfg as any)?.customPrompt ?? '';
    const effectiveCustomPrompt = basePrompt; // send as system once; textPrompt carries the actual question

    setResult('');
    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = (window as any).ghostAI?.analyzeCurrentScreenStream?.(
        userMessage,
        effectiveCustomPrompt,
        {
          onStart: ({ requestId: rid }: { requestId: string }) => setRequestId(rid),
          onDelta: ({ delta }: { requestId: string; delta: string }) => {
            if (!delta) return;
            if (lastDeltaRef.current === delta) return; // de-dup identical consecutive chunks
            lastDeltaRef.current = delta;
            setResult((prev) => prev + delta);
          },
          onDone: ({ content }: { requestId: string; content: string }) => {
            setResult(content ?? '');
            setStreaming(false);
            setRequestId(null);
            lastDeltaRef.current = null;
            setHistory((prev) => [
              ...prev,
              { role: 'user', content: userMessage },
              { role: 'assistant', content: content ?? '' },
            ]);
            setHistoryIndex(null);
            if (activeUnsubRef.current) {
              try {
                activeUnsubRef.current();
              } catch {}
              activeUnsubRef.current = null;
            }
          },
          onError: ({ error }: { requestId?: string; error: string }) => {
            setStreaming(false);
            setRequestId(null);
            setResult(`Error: ${error || 'Unknown error'}`);
            lastDeltaRef.current = null;
            if (activeUnsubRef.current) {
              try {
                activeUnsubRef.current();
              } catch {}
              activeUnsubRef.current = null;
            }
          },
        },
        history,
      );
      // Streaming is mandatory now; if wrapper didn't return a function, treat as error
      if (typeof unsubscribe !== 'function') throw new Error('Streaming unavailable');
      activeUnsubRef.current = unsubscribe;
      // Clear input after sending
      setText('');
    } catch (e) {
      // If streaming setup failed synchronously, stop streaming state before fallback
      setStreaming(false);
      setRequestId(null);
      setResult(`Error: ${String((e as any)?.message ?? e ?? 'analyze failed')}`);
    } finally {
      setBusy(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [text, busy, streaming]);

  useEffect(() => {
    return () => {
      if (activeUnsubRef.current) {
        try {
          activeUnsubRef.current();
        } catch {}
        activeUnsubRef.current = null;
      }
    };
  }, []);

  const timeLabel = useMemo(() => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');

    return `${minutes}:${seconds}`;
  }, [elapsedMs]);

  // Removed renderer-level Ctrl/Cmd+R handler. Clear is handled by global hotkey in main.

  // Position for the response/input panel: centered under the bar
  const bubbleWidth = 760;
  const barWidth = barRef.current?.offsetWidth ?? 320;
  const bubbleTop = barPos.y + ((barRef.current && barRef.current.offsetHeight) || 50) + 10;
  const barCenterX = barPos.x + barWidth / 2;
  const unclampedLeft = Math.round(barCenterX - bubbleWidth / 2);
  const bubbleLeft = Math.max(10, Math.min(unclampedLeft, window.innerWidth - bubbleWidth - 10));

  return (
    <div style={{ ...appRootStyle, display: visible ? 'block' : 'none' }}>
      {/* Draggable control bar (no extra container to avoid blocking clicks) */}
      <div
        ref={barRef}
        style={{
          position: 'absolute',
          top: barPos.y,
          left: barPos.x,
          ...barStyle,
        }}
        onPointerEnter={() => (window as any).ghostAI?.setMouseIgnore?.(false)}
        onPointerLeave={() => (window as any).ghostAI?.setMouseIgnore?.(true)}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 12,
            cursor: 'move',
            alignSelf: 'stretch',
            marginRight: 4,
          }}
          title="Drag"
          onPointerDown={(e) => {
            const rect = barRef.current?.getBoundingClientRect();

            if (!rect) return;
            // Ensure the window captures mouse during drag
            (window as any).ghostAI?.setMouseIgnore?.(false);
            dragStateRef.current = {
              offsetX: e.clientX - rect.left,
              offsetY: e.clientY - rect.top,
            };
            const onMove = (ev: PointerEvent) => {
              const dx = ev.clientX - (dragStateRef.current?.offsetX ?? 0);
              const dy = ev.clientY - (dragStateRef.current?.offsetY ?? 0);
              const width = barRef.current?.offsetWidth ?? 320;
              const height = barRef.current?.offsetHeight ?? 40;
              const clampedX = Math.min(Math.max(0, dx), window.innerWidth - width);
              const clampedY = Math.min(Math.max(0, dy), window.innerHeight - height);

              setBarPos({ x: clampedX, y: clampedY });
            };
            const onUp = () => {
              window.removeEventListener('pointermove', onMove);
              window.removeEventListener('pointerup', onUp);
              dragStateRef.current = null;
              // Return to click-through after drag ends unless pointer stays over UI
              const el = barRef.current;
              const leaveToIgnore = () => (window as any).ghostAI?.setMouseIgnore?.(true);

              // If element is still hovered, keep interactive
              if (el && el.matches(':hover')) {
                (window as any).ghostAI?.setMouseIgnore?.(false);
              } else {
                leaveToIgnore();
              }
            };

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp, { once: true });
          }}
        />
        {/* Left primary pill */}
        <button
          style={pillButton({ primary: !recording, danger: recording })}
          title={recording ? 'Stop recording' : 'Start recording'}
          onClick={() => setRecording((r) => !r)}
        >
          {recording ? <IconMicOff color={theme.color.text()} /> : <IconWaveBars />}
          {recording ? timeLabel : 'Listen'}
        </button>

        {/* Ask (toggle ask panel) */}
        <button
          style={{
            ...ghostButton,
            color: tab === 'ask' ? theme.color.text() : theme.color.muted(),
          }}
          onClick={() => {
            transcriptModeRef.current = false;
            setTab((t) => (t === 'ask' ? null : 'ask'));
          }}
        >
          <IconText color={tab === 'ask' ? theme.color.text() : theme.color.muted()} />
          Ask
        </button>

        {/* Hide */}
        <button
          style={ghostButton}
          onClick={() => {
            (window as any).ghostAI?.toggleHide?.();
          }}
        >
          <IconEyeOff />
          Hide
        </button>

        {/* Settings (toggle) */}
        <button
          style={iconButton}
          title="Settings"
          onClick={() => setTab((t) => (t === 'settings' ? null : 'settings'))}
        >
          <IconGear />
        </button>
      </div>

      {/* Bubble panel beneath (position follows bar horizontally) */}
      <div
        ref={bubbleRef}
        style={{
          position: 'absolute',
          top: bubbleTop,
          left: bubbleLeft,
          width: bubbleWidth,
          pointerEvents: 'auto',
        }}
      >
        {tab === 'settings' && (
          <div style={settingsCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700 }}>Settings</div>
              <button
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                title="Close"
                onClick={() => setTab(null)}
              >
                <IconX />
              </button>
            </div>
            <div style={{ marginTop: 8 }}>
              <Settings />
            </div>
          </div>
        )}

        {tab === 'ask' && (
          <div style={askCard}>
            <div style={{ ...askResultArea, display: result ? 'block' : 'none' }}>{result}</div>
            <div style={askFooter}>
              <input
                ref={askInputRef}
                disabled={busy || streaming}
                id="ask-input"
                placeholder={
                  busy || streaming ? 'Thinking…' : 'Press Enter to ask with default prompt…'
                }
                style={askInput}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onCompositionEnd={() => setComposing(false)}
                onCompositionStart={() => setComposing(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !composing) {
                    e.preventDefault();
                    if (!busy) void onSubmit();
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Transcript-only bubble (no input). Visible when not in Ask/Settings and recording, or when last content came from transcript mode. */}
        {!tab && (recording || (result && transcriptModeRef.current)) && (
          <div style={askCard}>
            <div style={{ ...askResultArea, display: result ? 'block' : 'none' }}>{result}</div>
          </div>
        )}
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);

root.render(<App />);
