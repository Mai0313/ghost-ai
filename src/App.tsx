import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Settings } from './components/Settings';
import { IconX } from './components/Icons';
import { HUDBar } from './components/HUDBar';
import { AskPanel } from './components/AskPanel';
import { TranscriptBubble } from './components/TranscriptBubble';
import { useTranscription } from './hooks/useTranscription';
import { appRootStyle, settingsCard } from './styles/styles';

export function App() {
  const [visible, setVisible] = useState<boolean>(true);
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [webSearchStatus, setWebSearchStatus] = useState<
    'idle' | 'in_progress' | 'searching' | 'completed'
  >('idle');
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [tab, setTab] = useState<'ask' | 'settings' | null>(null);
  const tabRef = useRef<'ask' | 'settings' | null>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [barPos, setBarPos] = useState<{ x: number; y: number }>({ x: 0, y: 20 });
  const askInputRef = useRef<HTMLInputElement | null>(null);
  const activeUnsubRef = useRef<null | (() => void)>(null);
  const lastDeltaRef = useRef<string | null>(null);
  const lastReasoningDeltaRef = useRef<string | null>(null);
  const activeSessionIdForRequestRef = useRef<string | null>(null);

  const { timeLabel, transcriptModeRef, transcriptBufferRef } = useTranscription({
    recording,
    paused,
    sessionId,
    setPaused,
    onDelta: (delta) => delta && setResult((prev) => prev + delta),
    onDone: (content) => {
      setResult(content || '');
      setHistory((prev) => [...prev, { role: 'user', content }, { role: 'assistant', content }]);
      setHistoryIndex(null);
    },
    onError: (error) => console.error('Transcribe error', error),
    setVisible,
  });

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

  // Derived state
  const assistantAnswerIndices = useMemo(() => {
    const indices: number[] = [];

    for (let i = 0; i < history.length; i++) if (history[i]?.role === 'assistant') indices.push(i);

    return indices;
  }, [history]);

  const displayMarkdown = useMemo(() => {
    if (historyIndex !== null) {
      const histIdx = assistantAnswerIndices[historyIndex] ?? null;

      if (histIdx !== null && histIdx >= 0) return history[histIdx]?.content ?? '';
    }

    return result;
  }, [historyIndex, assistantAnswerIndices, history, result]);

  const hasPages = assistantAnswerIndices.length > 0;
  const lastPageIndex = Math.max(0, assistantAnswerIndices.length - 1);
  const currentPageLabel =
    historyIndex === null ? 'Live' : `${historyIndex + 1}/${assistantAnswerIndices.length}`;

  const gotoPrevPage = useCallback(() => {
    if (!hasPages) return;
    if (historyIndex === null) {
      setHistoryIndex(lastPageIndex);

      return;
    }
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
  }, [hasPages, historyIndex, lastPageIndex]);

  const gotoNextPage = useCallback(() => {
    if (!hasPages) return;
    if (historyIndex === null) return;
    if (historyIndex < lastPageIndex) {
      setHistoryIndex(historyIndex + 1);

      return;
    }
    setHistoryIndex(null);
  }, [hasPages, historyIndex, lastPageIndex]);

  const canRegenerate = useMemo(
    () => assistantAnswerIndices.length > 0 && !busy && !streaming,
    [assistantAnswerIndices.length, busy, streaming],
  );

  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  // Click-through toggle by hover
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

  // Main process events
  useEffect(() => {
    const api = (window as any).ghostAI;

    api?.onTextInputShow?.(() => {
      setVisible(true);
      setTab('ask');
      setBusy(false);
      setStreaming(false);
      setTimeout(() => askInputRef.current?.focus(), 0);
    });
    api?.onTextInputToggle?.(() => {
      setVisible(true);
      if (tabRef.current === 'ask') setTab(null);
      else {
        setTab('ask');
        setBusy(false);
        setStreaming(false);
        setTimeout(() => askInputRef.current?.focus(), 0);
      }
    });
    api?.onHUDShow?.(() => {
      setVisible(true);
      if (tabRef.current === 'ask') {
        setBusy(false);
        setStreaming(false);
        setTimeout(() => askInputRef.current?.focus(), 0);
      }
    });
  }, []);

  // Auto-focus behaviors
  useEffect(() => {
    if (visible && tab === 'ask') {
      setBusy(false);
      setStreaming(false);
      const id = window.setTimeout(() => askInputRef.current?.focus(), 0);

      return () => window.clearTimeout(id);
    }
  }, [visible, tab]);

  useEffect(() => {
    if (historyIndex !== null && visible) {
      if (tab !== 'ask') setTab('ask');
      const id = window.setTimeout(() => askInputRef.current?.focus(), 0);

      return () => window.clearTimeout(id);
    }
  }, [historyIndex, visible, tab]);

  useEffect(() => {
    if (visible && tab === 'ask' && !busy && !streaming) {
      const id = window.setTimeout(() => askInputRef.current?.focus(), 0);

      return () => window.clearTimeout(id);
    }
  }, [visible, tab, busy, streaming]);

  useEffect(() => {
    const api = (window as any).ghostAI;

    api?.onAudioToggle?.(() => setRecording((prev) => !prev));
    const offScroll = api?.onAskScroll?.(({ direction }: { direction: 'up' | 'down' }) => {
      try {
        setVisible(true);
        const containers = Array.from(
          document.querySelectorAll<HTMLDivElement>('.bn-markdown-viewer'),
        );
        const target = containers.find((el) => {
          const style = window.getComputedStyle(el);

          return style.display !== 'none' && el.offsetParent !== null;
        });
        const area = target ?? null;

        if (!area) return;
        const step = Math.max(80, Math.round(area.clientHeight * 0.25));
        const delta = direction === 'up' ? -step : step;

        area.scrollBy({ top: delta, behavior: 'smooth' });
      } catch {}
    });
    const offPaginate = api?.onAskPaginate?.(({ direction }: { direction: 'up' | 'down' }) => {
      try {
        setVisible(true);
        if (direction === 'up') gotoPrevPage();
        else gotoNextPage();
      } catch {}
    });

    try {
      api?.getSession?.()?.then((sid: string) => sid && setSessionId(sid));
    } catch {}
    const offSession = api?.onSessionChanged?.(({ sessionId: sid }: { sessionId: string }) => {
      if (sid) setSessionId(sid);
      try {
        if (activeUnsubRef.current) activeUnsubRef.current();
      } catch {}
      activeUnsubRef.current = null;
      setStreaming(false);
      setHistory([]);
      setResult('');
      setReasoning('');
      setWebSearchStatus('idle');
      setHistoryIndex(null);
      transcriptBufferRef.current = '';
      setRecording(false);
      setText('');
    });

    api?.onAskClear?.(() => {
      try {
        if (activeUnsubRef.current) activeUnsubRef.current();
      } catch {}
      activeUnsubRef.current = null;
      setStreaming(false);
      setHistory([]);
      setResult('');
      setReasoning('');
      setWebSearchStatus('idle');
      setHistoryIndex(null);
      setText('');
      if (recording) setRecording(false);
      transcriptBufferRef.current = '';
    });

    return () => {
      try {
        if (typeof offSession === 'function') offSession();
      } catch {}
      try {
        if (typeof offScroll === 'function') offScroll();
      } catch {}
      try {
        if (typeof offPaginate === 'function') offPaginate();
      } catch {}
    };
  }, []);

  const appendLive = useCallback((delta: string) => {
    if (!delta) return;
    setResult((prev) => prev + delta);
  }, []);

  const appendReasoning = useCallback((delta: string) => {
    if (!delta) return;
    setReasoning((prev) => prev + delta);
  }, []);

  const finalizeLive = useCallback((opts?: { content?: string; appendNewline?: boolean }) => {
    const contentProvided = typeof opts?.content === 'string';

    if (contentProvided) setResult(opts!.content || '');
    if (opts?.appendNewline) setResult((prev) => (prev.endsWith('\n') ? prev : prev + '\n'));
  }, []);

  const onSubmit = useCallback(async () => {
    if (busy || streaming) return;
    if (activeUnsubRef.current) {
      try {
        activeUnsubRef.current();
      } catch {}
      activeUnsubRef.current = null;
    }
    lastDeltaRef.current = null;
    lastReasoningDeltaRef.current = null;
    activeSessionIdForRequestRef.current = null;
    setBusy(true);
    setStreaming(true);
    // Require an active prompt selection; avoid relying on any default file
    try {
      const activePromptName = await (window as any).ghostAI?.getActivePromptName?.();
      if (!activePromptName) {
        setStreaming(false);
        setBusy(false);
        setResult('Error: No active prompt selected. Open Settings → Prompts to select one.');
        return;
      }
    } catch {}
    const transcript = transcriptBufferRef.current || '';
    const userMessage = transcript ? `${transcript}\n${text}`.trim() : text;
    const cfg = await (window as any).ghostAI?.getOpenAIConfig?.();
    const basePrompt = (cfg as any)?.customPrompt ?? '';
    const effectiveCustomPrompt = basePrompt;

    setResult('');
    setReasoning('');
    setWebSearchStatus('idle');
    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = (window as any).ghostAI?.analyzeCurrentScreenStream?.(
        userMessage,
        effectiveCustomPrompt,
        {
          onStart: ({ sessionId: sid }: { requestId: string; sessionId: string }) => {
            if (sid) {
              activeSessionIdForRequestRef.current = sid;
              setSessionId(sid);
            }
            setReasoning('');
          },
          onDelta: ({
            channel,
            eventType,
            delta,
            text: fullText,
            sessionId: sid,
          }: {
            requestId: string;
            sessionId: string;
            channel?: 'answer' | 'reasoning' | 'web_search';
            eventType?: string;
            delta?: string;
            text?: string;
          }) => {
            if (
              sid &&
              activeSessionIdForRequestRef.current &&
              sid !== activeSessionIdForRequestRef.current
            )
              return;
            // Web search indicator
            if ((channel ?? 'answer') === 'web_search') {
              const type = String(eventType || '');

              if (type.endsWith('in_progress')) setWebSearchStatus('in_progress');
              else if (type.endsWith('searching')) setWebSearchStatus('searching');
              else if (type.endsWith('completed')) setWebSearchStatus('completed');

              return;
            }
            // Reasoning channel
            if ((channel ?? 'answer') === 'reasoning') {
              const piece =
                (typeof fullText === 'string' && fullText) ||
                (typeof delta === 'string' && delta) ||
                '';

              if (!piece) return;
              if (eventType === 'response.reasoning_summary_text.done') {
                setReasoning(piece);
                lastReasoningDeltaRef.current = null;
              } else {
                if (lastReasoningDeltaRef.current === piece) return;
                lastReasoningDeltaRef.current = piece;
                appendReasoning(piece);
              }

              return;
            }
            const piece =
              (typeof fullText === 'string' && fullText) ||
              (typeof delta === 'string' && delta) ||
              '';

            if (!piece) return;
            if (lastDeltaRef.current === piece) return;
            lastDeltaRef.current = piece;
            appendLive(piece);
          },
          onDone: ({
            content,
            sessionId: sid,
          }: {
            requestId: string;
            content: string;
            sessionId: string;
          }) => {
            if (
              sid &&
              activeSessionIdForRequestRef.current &&
              sid !== activeSessionIdForRequestRef.current
            )
              return;
            finalizeLive({ content: content ?? '' });
            setStreaming(false);
            lastDeltaRef.current = null;
            lastReasoningDeltaRef.current = null;
            setWebSearchStatus('idle');
            activeSessionIdForRequestRef.current = null;
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
          onError: ({
            error,
            sessionId: sid,
          }: {
            requestId?: string;
            error: string;
            sessionId: string;
          }) => {
            if (
              sid &&
              activeSessionIdForRequestRef.current &&
              sid !== activeSessionIdForRequestRef.current
            )
              return;
            setStreaming(false);
            setResult(`Error: ${error || 'Unknown error'}`);
            lastDeltaRef.current = null;
            lastReasoningDeltaRef.current = null;
            setWebSearchStatus('idle');
            activeSessionIdForRequestRef.current = null;
            if (activeUnsubRef.current) {
              try {
                activeUnsubRef.current();
              } catch {}
              activeUnsubRef.current = null;
            }
          },
        },
        undefined,
      );
      if (typeof unsubscribe !== 'function') throw new Error('Streaming unavailable');
      activeUnsubRef.current = unsubscribe;
      setText('');
      transcriptBufferRef.current = '';
    } catch (e) {
      setStreaming(false);
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

  const makePlainHistoryText = useCallback(
    (hist: { role: 'user' | 'assistant'; content: string }[]) => {
      let out = '';

      for (let i = 0; i < hist.length - 1; i += 2) {
        const u = hist[i];
        const a = hist[i + 1];

        if (u?.role === 'user' && a?.role === 'assistant') {
          const q = (u.content || '').trim();
          const ans = (a.content || '').trim();

          if (q || ans) out += `Q: ${q}\nA: ${ans}\n\n`;
        }
      }

      return out;
    },
    [],
  );

  const onRegenerate = useCallback(async () => {
    if (!canRegenerate) return;
    const pageIdx = historyIndex === null ? lastPageIndex : historyIndex;
    const assistantIdx = assistantAnswerIndices[pageIdx] ?? -1;
    const userIdx = assistantIdx - 1;

    if (assistantIdx < 0 || userIdx < 0) return;
    const userMessage = history[userIdx]?.content || '';
    const priorPairs = history.slice(0, userIdx);
    const priorPlain = makePlainHistoryText(priorPairs);

    if (activeUnsubRef.current) {
      try {
        activeUnsubRef.current();
      } catch {}
      activeUnsubRef.current = null;
    }
    lastDeltaRef.current = null;
    activeSessionIdForRequestRef.current = null;
    setBusy(true);
    setStreaming(true);
    setHistoryIndex(null);
    setResult('');
    setReasoning('');
    setWebSearchStatus('idle');
    let unsubscribe: (() => void) | null = null;

    try {
      const cfg = await (window as any).ghostAI?.getOpenAIConfig?.();
      const basePrompt = (cfg as any)?.customPrompt ?? '';
      const effectiveCustomPrompt = basePrompt;

      unsubscribe = (window as any).ghostAI?.analyzeCurrentScreenStream?.(
        userMessage,
        effectiveCustomPrompt,
        {
          onStart: ({ sessionId: sid }: { requestId: string; sessionId: string }) => {
            if (sid) {
              activeSessionIdForRequestRef.current = sid;
              setSessionId(sid);
            }
          },
          onDelta: ({
            channel,
            eventType,
            delta,
            text: fullText,
            sessionId: sid,
          }: {
            requestId: string;
            sessionId: string;
            channel?: 'answer' | 'reasoning' | 'web_search';
            eventType?: string;
            delta?: string;
            text?: string;
          }) => {
            if (
              sid &&
              activeSessionIdForRequestRef.current &&
              sid !== activeSessionIdForRequestRef.current
            )
              return;
            if ((channel ?? 'answer') === 'web_search') {
              const type = String(eventType || '');

              if (type.endsWith('in_progress')) setWebSearchStatus('in_progress');
              else if (type.endsWith('searching')) setWebSearchStatus('searching');
              else if (type.endsWith('completed')) setWebSearchStatus('completed');

              return;
            }
            if ((channel ?? 'answer') === 'reasoning') {
              const piece =
                (typeof fullText === 'string' && fullText) ||
                (typeof delta === 'string' && delta) ||
                '';

              if (!piece) return;
              if (eventType === 'response.reasoning_summary_text.done') {
                setReasoning(piece);
                lastReasoningDeltaRef.current = null;
              } else {
                if (lastReasoningDeltaRef.current === piece) return;
                lastReasoningDeltaRef.current = piece;
                appendReasoning(piece);
              }

              return;
            }
            const piece =
              (typeof fullText === 'string' && fullText) ||
              (typeof delta === 'string' && delta) ||
              '';

            if (!piece) return;
            if (lastDeltaRef.current === piece) return;
            lastDeltaRef.current = piece;
            appendLive(piece);
          },
          onDone: ({
            content,
            sessionId: sid,
          }: {
            requestId: string;
            content: string;
            sessionId: string;
          }) => {
            if (
              sid &&
              activeSessionIdForRequestRef.current &&
              sid !== activeSessionIdForRequestRef.current
            )
              return;
            finalizeLive({ content: content ?? '' });
            setStreaming(false);
            lastDeltaRef.current = null;
            lastReasoningDeltaRef.current = null;
            setWebSearchStatus('idle');
            activeSessionIdForRequestRef.current = null;
            setHistory((prev) => {
              const copy = prev.slice();

              if (assistantIdx >= 0 && assistantIdx < copy.length)
                copy[assistantIdx] = { role: 'assistant', content: content ?? '' } as any;

              return copy;
            });
            if (activeUnsubRef.current) {
              try {
                activeUnsubRef.current();
              } catch {}
              activeUnsubRef.current = null;
            }
          },
          onError: ({
            error,
            sessionId: sid,
          }: {
            requestId?: string;
            error: string;
            sessionId: string;
          }) => {
            if (
              sid &&
              activeSessionIdForRequestRef.current &&
              sid !== activeSessionIdForRequestRef.current
            )
              return;
            setStreaming(false);
            setResult(`Error: ${error || 'Unknown error'}`);
            lastDeltaRef.current = null;
            activeSessionIdForRequestRef.current = null;
            if (activeUnsubRef.current) {
              try {
                activeUnsubRef.current();
              } catch {}
              activeUnsubRef.current = null;
            }
          },
        },
        priorPlain,
      );
      if (typeof unsubscribe !== 'function') throw new Error('Streaming unavailable');
      activeUnsubRef.current = unsubscribe;
    } catch (e) {
      setStreaming(false);
      setResult(`Error: ${String((e as any)?.message ?? e ?? 'regenerate failed')}`);
    } finally {
      setBusy(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [
    canRegenerate,
    historyIndex,
    lastPageIndex,
    assistantAnswerIndices,
    history,
    makePlainHistoryText,
  ]);

  // Positioning
  const bubbleWidth = 760;
  const barWidth = barRef.current?.offsetWidth ?? 320;
  const bubbleTop = barPos.y + ((barRef.current && barRef.current.offsetHeight) || 50) + 10;
  const barCenterX = barPos.x + barWidth / 2;
  const unclampedLeft = Math.round(barCenterX - bubbleWidth / 2);
  const bubbleLeft = Math.max(10, Math.min(unclampedLeft, window.innerWidth - bubbleWidth - 10));

  return (
    <div style={{ ...appRootStyle, display: visible ? 'block' : 'none' }}>
      <HUDBar
        askActive={tab === 'ask'}
        barPos={barPos}
        barRef={barRef as React.RefObject<HTMLDivElement>}
        paused={paused}
        recording={recording}
        setBarPos={setBarPos}
        setPaused={setPaused}
        setRecording={setRecording}
        timeLabel={timeLabel}
        onAskToggle={() => {
          transcriptModeRef.current = false;
          setTab((t) => (t === 'ask' ? null : 'ask'));
        }}
        onSettingsToggle={() => setTab((t) => (t === 'settings' ? null : 'settings'))}
      />

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
          <AskPanel
            busy={busy}
            canRegenerate={canRegenerate}
            currentPageLabel={currentPageLabel}
            displayMarkdown={displayMarkdown}
            gotoNextPage={gotoNextPage}
            gotoPrevPage={gotoPrevPage}
            hasPages={hasPages}
            historyIndex={historyIndex}
            inputRef={askInputRef as React.RefObject<HTMLInputElement>}
            reasoningMarkdown={reasoning}
            setText={setText}
            streaming={streaming}
            text={text}
            webSearchStatus={webSearchStatus}
            onRegenerate={() => void onRegenerate()}
            onSubmit={() => void onSubmit()}
          />
        )}

        {!tab && (recording || (displayMarkdown && transcriptModeRef.current)) && (
          <TranscriptBubble markdown={displayMarkdown} />
        )}
      </div>
    </div>
  );
}
