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
import { appRootStyle, askCard, askFooter, askInput, askResultArea, barStyle, ghostButton, iconButton, pillButton, settingsCard } from './styles/styles';
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);
  // Global hover detection to toggle native click-through dynamically
  useEffect(() => {
    const onMove = (ev: MouseEvent) => {
      if (!visible) return (window as any).ghostAI?.setMouseIgnore?.(true);
      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const overUI = !!el && ((barRef.current && barRef.current.contains(el)) || (bubbleRef.current && bubbleRef.current.contains(el)));
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
      setHistory([]);
      setResult('');
      setHistoryIndex(null);
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
    const basePrompt = (cfg as any)?.customPrompt || '';
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
          style={{ ...ghostButton, color: tab === 'ask' ? theme.color.text() : theme.color.muted() }}
          onClick={() => setTab((t) => (t === 'ask' ? null : 'ask'))}
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
        style={{
          position: 'absolute',
          top: bubbleTop,
          left: bubbleLeft,
          width: bubbleWidth,
          pointerEvents: 'auto',
        }}
        ref={bubbleRef}
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
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);

root.render(<App />);
