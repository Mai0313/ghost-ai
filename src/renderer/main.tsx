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

// Window.ghostAI types are declared in src/renderer/global.d.ts

function App() {
  // Show minimal HUD by default so the user can see/operate it
  const [visible, setVisible] = useState<boolean>(true);
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [tab, setTab] = useState<'ask' | 'settings' | null>(null);
  const tabRef = useRef<'ask' | 'settings' | null>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<number | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  useEffect(() => {
    // Guard in case preload failed; avoid crashing when window.ghostAI is undefined
    const api = (window as any).ghostAI;
    api?.onTextInputShow?.(() => {
      setVisible(true);
      setTab('ask');
      // Reset transient flags to allow new input
      setBusy(false);
      setStreaming(false);
      // Always focus when invoked via hotkey/menu
      setTimeout(() => askInputRef.current?.focus(), 0);
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

  // After completing a response (not busy/streaming), keep the caret ready for the next question
  useEffect(() => {
    if (visible && tab === 'ask' && !busy && !streaming) {
      const id = window.setTimeout(() => askInputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [visible, tab, busy, streaming]);

  useEffect(() => {
    (window as any).ghostAI?.onAudioToggle?.(() => setRecording((prev) => !prev));
  }, []);

  useEffect(() => {
    if (recording) {
      setElapsedMs(0);
      timerRef.current = window.setInterval(() => {
        setElapsedMs((ms) => ms + 1000);
      }, 1000) as unknown as number;
      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

          mediaStreamRef.current = stream;
          recordedChunksRef.current = [];
          const mr = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
              ? 'audio/webm;codecs=opus'
              : 'audio/webm',
          });

          mediaRecorderRef.current = mr;
          mr.ondataavailable = (ev) => {
            if (ev.data && ev.data.size > 0) recordedChunksRef.current.push(ev.data);
          };
          mr.start();
        } catch (err) {
          console.error('Mic permission / recording error', err);
          setRecording(false);
          alert('Microphone permission denied or unavailable.');
        }
      })();
    } else if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [recording]);

  useEffect(() => {
    if (!recording) {
      const mr = mediaRecorderRef.current;

      if (mr && mr.state !== 'inactive') {
        mr.onstop = async () => {
          try {
            const blob = new Blob(recordedChunksRef.current, { type: mr.mimeType || 'audio/webm' });
            const arrayBuffer = await blob.arrayBuffer();

            setBusy(true);
            const tr = await (window as any).ghostAI?.transcribeAudio?.(arrayBuffer);

            if (tr?.text) {
              // Place transcription into prompt for convenience
              setText((prev) => (prev ? prev + '\n' + tr.text : tr.text));
            }
          } catch (e) {
            console.error('Transcription failed', e);
          } finally {
            setBusy(false);
          }
        };
        mr.stop();
      }
      if (mediaStreamRef.current) {
        for (const track of mediaStreamRef.current.getTracks()) track.stop();
        mediaStreamRef.current = null;
      }
      mediaRecorderRef.current = null;
      recordedChunksRef.current = [];
    }
  }, [recording]);

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
    const basePrompt = (cfg as any)?.customPrompt || 'Describe what you see.';
    const effectiveCustomPrompt = userMessage?.trim()
      ? `${basePrompt}\n\nUser question: ${userMessage.trim()}`
      : basePrompt;

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
            if (activeUnsubRef.current) {
              try { activeUnsubRef.current(); } catch {}
              activeUnsubRef.current = null;
            }
          },
          onError: ({ error }: { requestId?: string; error: string }) => {
            setStreaming(false);
            setRequestId(null);
            setResult(`Error: ${error || 'Unknown error'}`);
            lastDeltaRef.current = null;
            if (activeUnsubRef.current) {
              try { activeUnsubRef.current(); } catch {}
              activeUnsubRef.current = null;
            }
          },
        },
        history,
      );
      // If streaming API is unavailable (optional chained call didn't execute), fallback
      if (typeof unsubscribe !== 'function') {
        setStreaming(false);
        setRequestId(null);
        const res = await (window as any).ghostAI?.analyzeCurrentScreen?.(userMessage, effectiveCustomPrompt);
        setResult(res?.content ?? '');
        setHistory((prev) => [
          ...prev,
          { role: 'user', content: userMessage },
          { role: 'assistant', content: res?.content ?? '' },
        ]);
      } else {
        activeUnsubRef.current = unsubscribe;
      }
      // Clear input after sending
      setText('');
    } catch (e) {
      // If streaming setup failed synchronously, stop streaming state before fallback
      setStreaming(false);
      setRequestId(null);
      // fallback to non-streaming
      try {
        const res = await (window as any).ghostAI?.analyzeCurrentScreen?.(userMessage, effectiveCustomPrompt);

        setResult(res?.content ?? '');
        setHistory((prev) => [
          ...prev,
          { role: 'user', content: userMessage },
          { role: 'assistant', content: res?.content ?? '' },
        ]);
        setText('');
      } catch (e) {
        setResult(`Error: ${String((e as any)?.message ?? e ?? 'analyze failed')}`);
      }
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
        try { activeUnsubRef.current(); } catch {}
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

  // Global hotkey: Ctrl + R to clear conversation history (renderer level)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        setHistory([]);
        setResult('');
      }
    };

    window.addEventListener('keydown', handler, { capture: true });

    return () => window.removeEventListener('keydown', handler, { capture: true } as any);
  }, []);

  // Position for the response/input panel: centered under the bar
  const bubbleWidth = 760;
  const barWidth = barRef.current?.offsetWidth ?? 320;
  const bubbleTop = barPos.y + ((barRef.current && barRef.current.offsetHeight) || 50) + 10;
  const barCenterX = barPos.x + barWidth / 2;
  const unclampedLeft = Math.round(barCenterX - bubbleWidth / 2);
  const bubbleLeft = Math.max(10, Math.min(unclampedLeft, window.innerWidth - bubbleWidth - 10));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: visible ? 'block' : 'none',
        pointerEvents: 'none',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      }}
    >
      {/* Draggable control bar (no extra container to avoid blocking clicks) */}
      <div
        ref={barRef}
        style={{
          position: 'absolute',
          top: barPos.y,
          left: barPos.x,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(30,30,30,0.92)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12,
          padding: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          pointerEvents: 'auto',
        }}
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
            };

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp, { once: true });
          }}
        />
        {/* Left primary pill */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: 'none',
            borderRadius: 999,
            padding: '9px 12px',
            background: recording ? 'rgba(255,40,40,0.9)' : '#2B66F6',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title={recording ? 'Stop recording' : 'Start recording'}
          onClick={() => setRecording((r) => !r)}
        >
          {recording ? <IconMicOff color="white" /> : <IconWaveBars />}
          {recording ? timeLabel : 'Listen'}
        </button>

        {/* Ask (toggle ask panel) */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            color: tab === 'ask' ? 'white' : '#BDBDBD',
            border: 'none',
            padding: '9px 12px',
            borderRadius: 999,
            cursor: 'pointer',
          }}
          onClick={() => setTab((t) => (t === 'ask' ? null : 'ask'))}
        >
          <IconText color={tab === 'ask' ? 'white' : '#BDBDBD'} />
          Ask
        </button>

        {/* Hide */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            color: '#BDBDBD',
            border: 'none',
            padding: '9px 10px',
            borderRadius: 999,
            cursor: 'pointer',
          }}
          onClick={() => {
            (window as any).ghostAI?.toggleHide?.();
          }}
        >
          <IconEyeOff />
          Hide
        </button>

        {/* Settings (toggle) */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            color: '#BDBDBD',
            border: 'none',
            padding: '8px 8px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
          title="Settings"
          onClick={() => setTab((t) => (t === 'settings' ? null : 'settings'))}
        >
          <IconGear />
        </button>
      </div>

      {/* Bubble panel beneath (position follows bar horizontally) */}
      <div
        style={{
          position: 'absolute',
          top: bubbleTop,
          left: bubbleLeft,
          width: bubbleWidth,
          pointerEvents: 'auto',
        }}
      >
        {tab === 'settings' && (
          <div
            style={{
              background: 'rgba(20,20,20,0.92)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: 16,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            }}
          >
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
          <div style={{ width: 760, display: 'grid', gap: 8 }}>
            {result && (
              <div
                style={{
                  background: 'rgba(20,20,20,0.92)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  padding: 12,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.4,
                }}
              >
                {result}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(28,28,28,0.94)',
                color: 'white',
                borderRadius: 12,
                padding: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
              }}
            >
              <input
                ref={askInputRef}
                disabled={busy || streaming}
                id="ask-input"
                placeholder={busy || streaming ? 'Thinking…' : 'Press Enter to ask with default prompt…'}
                style={{
                  flex: 1,
                  background: '#141414',
                  color: 'white',
                  borderRadius: 10,
                  padding: '10px 12px',
                  border: '1px solid #2a2a2a',
                  outline: 'none',
                }}
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
              {/* Removed close button; Ask panel toggles via Ctrl/Cmd+Enter or the Ask pill */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);

root.render(<App />);
