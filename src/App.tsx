import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Settings } from "./components/Settings";
import { IconX } from "./components/Icons";
import { HUDBar } from "./components/HUDBar";
import { AskPanel } from "./components/AskPanel";
import { TranscriptBubble } from "./components/TranscriptBubble";
import { useTranscription } from "./hooks/useTranscription";
import { useAnalyzeStream } from "./hooks/useAnalyzeStream";
import { appRootStyle, settingsCard } from "./styles/styles";

export function App() {
  const [visible, setVisible] = useState<boolean>(true);
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [history, setHistory] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [webSearchStatus, setWebSearchStatus] = useState<
    "idle" | "in_progress" | "searching" | "completed"
  >("idle");
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [tab, setTab] = useState<"ask" | "settings" | null>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [attachScreenshot, setAttachScreenshot] = useState<boolean>(true);
  const barRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [barPos, setBarPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 20,
  });
  const askInputRef = useRef<HTMLInputElement | null>(null);

  const analyzeStream = useAnalyzeStream({
    sessionId,
    onDeltaText: useCallback((delta: string) => {
      if (!delta) return;
      setResult((prev) => prev + delta);
    }, []),
    onDeltaReasoning: useCallback((delta: string) => {
      if (!delta) return;
      setReasoning((prev) => prev + delta);
    }, []),
    onWebSearchStatusChange: useCallback((status) => {
      setWebSearchStatus(status);
    }, []),
    onStreamStart: useCallback(() => {
      setBusy(true);
      setStreaming(true);
      setResult("");
      setReasoning("");
      setWebSearchStatus("idle");
    }, []),
    onStreamEnd: useCallback(() => {
      setStreaming(false);
      setBusy(false);
    }, []),
  });

  // Cleanup analyze stream on unmount
  useEffect(() => {
    return () => {
      analyzeStream.cleanup();
    };
  }, [analyzeStream]);

  const { timeLabel, transcriptModeRef, transcriptBufferRef } =
    useTranscription({
      recording,
      paused,
      sessionId,
      setPaused,
      onDelta: (delta) => delta && setResult((prev) => prev + delta),
      onDone: (content) => {
        setResult(content || "");
        setHistory((prev) => [
          ...prev,
          { role: "user", content },
          { role: "assistant", content },
        ]);
        setHistoryIndex(null);
      },
      onError: (error) => console.error("Transcribe error", error),
      setVisible,
    });

  useLayoutEffect(() => {
    const el = barRef.current;

    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();

      setBarPos({
        x: Math.max(10, Math.round((window.innerWidth - rect.width) / 2)),
        y: 20,
      });
    };

    update();
    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, []);

  // Derived state
  const assistantAnswerIndices = useMemo(() => {
    const indices: number[] = [];

    for (let i = 0; i < history.length; i++)
      if (history[i]?.role === "assistant") indices.push(i);

    return indices;
  }, [history]);

  const displayMarkdown = useMemo(() => {
    if (historyIndex !== null) {
      const histIdx = assistantAnswerIndices[historyIndex] ?? null;

      if (histIdx !== null && histIdx >= 0)
        return history[histIdx]?.content ?? "";
    }

    return result;
  }, [historyIndex, assistantAnswerIndices, history, result]);

  const hasPages = assistantAnswerIndices.length > 0;
  const lastPageIndex = Math.max(0, assistantAnswerIndices.length - 1);
  const currentPageLabel =
    historyIndex === null
      ? "Live"
      : `${historyIndex + 1}/${assistantAnswerIndices.length}`;

  const gotoPrevPage = useCallback(() => {
    if (!hasPages) return;
    const targetIndex =
      historyIndex === null ? lastPageIndex : Math.max(0, historyIndex - 1);

    setHistoryIndex(targetIndex);
  }, [hasPages, historyIndex, lastPageIndex]);

  const gotoNextPage = useCallback(() => {
    if (!hasPages || historyIndex === null) return;
    setHistoryIndex(historyIndex < lastPageIndex ? historyIndex + 1 : null);
  }, [hasPages, historyIndex, lastPageIndex]);

  const canRegenerate = useMemo(
    () => assistantAnswerIndices.length > 0 && !busy && !streaming,
    [assistantAnswerIndices.length, busy, streaming],
  );

  // Click-through toggle by hover
  useEffect(() => {
    const onMove = (ev: MouseEvent) => {
      if (!visible) return (window as any).ghostAI?.setMouseIgnore?.(true);
      const el = document.elementFromPoint(
        ev.clientX,
        ev.clientY,
      ) as HTMLElement | null;
      const overUI =
        !!el &&
        ((barRef.current && barRef.current.contains(el)) ||
          (bubbleRef.current && bubbleRef.current.contains(el)));

      (window as any).ghostAI?.setMouseIgnore?.(!overUI);
    };

    window.addEventListener("mousemove", onMove, true);

    return () => window.removeEventListener("mousemove", onMove, true);
  }, [visible]);

  // Main process events
  // Load user settings on mount
  useEffect(() => {
    const api: any = (window as any).ghostAI;

    if (!api) return;

    const loadUserSettings = async () => {
      try {
        const userSettings = await api.getUserSettings?.();

        if (userSettings) {
          const v = (userSettings as any).attachScreenshot;

          setAttachScreenshot(typeof v === "boolean" ? v : true);
        }
      } catch (error) {
        console.warn("Failed to load user settings:", error);
      }
    };

    void loadUserSettings();
  }, []);

  useEffect(() => {
    const api = (window as any).ghostAI;

    api?.onTextInputShow?.(() => {
      setVisible(true);
      setTab("ask");
      setBusy(false);
      setStreaming(false);
      setTimeout(() => askInputRef.current?.focus(), 0);
    });
    api?.onTextInputToggle?.(() => {
      setVisible(true);
      setTab((currentTab) => {
        if (currentTab === "ask") {
          return null;
        } else {
          setBusy(false);
          setStreaming(false);
          setTimeout(() => askInputRef.current?.focus(), 0);
          return "ask";
        }
      });
    });
    api?.onHUDShow?.(() => {
      setVisible(true);
      setTab((currentTab) => {
        if (currentTab === "ask") {
          setBusy(false);
          setStreaming(false);
          setTimeout(() => askInputRef.current?.focus(), 0);
        }
        return currentTab;
      });
    });
  }, []);

  // Unified auto-focus logic
  useEffect(() => {
    // Only focus when ask panel is visible and active
    if (!visible || tab !== "ask") return;

    // Special case: if viewing history, ensure ask tab is active
    if (historyIndex !== null && tab !== "ask") {
      setTab("ask");
    }

    // Reset busy state when ask panel becomes visible
    if (busy || streaming) {
      setBusy(false);
      setStreaming(false);
    }

    // Focus input after state updates
    const id = window.setTimeout(() => askInputRef.current?.focus(), 0);

    return () => window.clearTimeout(id);
  }, [visible, tab, historyIndex, busy, streaming]);

  useEffect(() => {
    const api = window.ghostAI;

    api?.onAudioToggle?.(() => setRecording((prev) => !prev));
    const offScroll = api?.onAskScroll?.(
      ({ direction }: { direction: "up" | "down" }) => {
        try {
          setVisible(true);
          const containers = Array.from(
            document.querySelectorAll<HTMLDivElement>(".bn-markdown-viewer"),
          );
          const target = containers.find((el) => {
            const style = window.getComputedStyle(el);

            return style.display !== "none" && el.offsetParent !== null;
          });
          const area = target ?? null;

          if (!area) return;
          const step = Math.max(80, Math.round(area.clientHeight * 0.25));
          const delta = direction === "up" ? -step : step;

          area.scrollBy({ top: delta, behavior: "smooth" });
        } catch (err) {
          console.error("[App] Scroll failed:", err);
        }
      },
    );
    const offPaginate = api?.onAskPaginate?.(
      ({ direction }: { direction: "up" | "down" }) => {
        try {
          setVisible(true);
          if (direction === "up") gotoPrevPage();
          else gotoNextPage();
        } catch (err) {
          console.error("[App] Paginate failed:", err);
        }
      },
    );

    try {
      api?.getSession?.()?.then((sid: string) => sid && setSessionId(sid));
    } catch (err) {
      console.error("[App] Failed to get session:", err);
    }

    const offSession = api?.onSessionChanged?.(
      ({ sessionId: sid }: { sessionId: string }) => {
        if (sid) setSessionId(sid);
        // Cleanup active stream
        analyzeStream.cleanup();
        setStreaming(false);
        setHistory([]);
        setResult("");
        setReasoning("");
        setWebSearchStatus("idle");
        setHistoryIndex(null);
        transcriptBufferRef.current = "";
        setRecording(false);
        setText("");
      },
    );

    api?.onAskClear?.(() => {
      // Cleanup active stream
      analyzeStream.cleanup();
      setStreaming(false);
      setHistory([]);
      setResult("");
      setReasoning("");
      setWebSearchStatus("idle");
      setHistoryIndex(null);
      setText("");
      if (recording) setRecording(false);
      transcriptBufferRef.current = "";
    });

    return () => {
      try {
        if (typeof offSession === "function") offSession();
      } catch {}
      try {
        if (typeof offScroll === "function") offScroll();
      } catch {}
      try {
        if (typeof offPaginate === "function") offPaginate();
      } catch {}
    };
  }, [
    analyzeStream,
    gotoPrevPage,
    gotoNextPage,
    recording,
    transcriptBufferRef,
  ]);

  const handleAttachScreenshotChange = useCallback(async (value: boolean) => {
    setAttachScreenshot(value);
    try {
      await window.ghostAI.updateUserSettings({ attachScreenshot: value });
    } catch (error) {
      console.error("[App] Failed to update attachScreenshot setting:", error);
    }
  }, []);

  const onSubmit = useCallback(async () => {
    if (busy || streaming) return;

    // Require an active prompt selection
    try {
      const activePromptName = await window.ghostAI.getActivePromptName();

      if (!activePromptName) {
        setResult(
          "Error: No active prompt selected. Open Settings → Prompts to select one.",
        );

        return;
      }
    } catch (err) {
      console.error("[App] Failed to check active prompt:", err);
    }

    const transcript = transcriptBufferRef.current || "";
    const userMessage = transcript ? `${transcript}\n${text}`.trim() : text;
    const cfg = await window.ghostAI.getOpenAIConfig();
    const customPrompt = (cfg as any)?.customPrompt ?? "";

    await analyzeStream.execute({
      userMessage,
      customPrompt,
      history: null,
      onSuccess: (content) => {
        setResult(content);
        setHistory((prev) => [
          ...prev,
          { role: "user", content: userMessage },
          { role: "assistant", content },
        ]);
        setHistoryIndex(null);
        setText("");
        transcriptBufferRef.current = "";
      },
      onError: (error) => {
        setResult(error);
      },
    });
  }, [text, busy, streaming, analyzeStream, transcriptBufferRef]);

  const makePlainHistoryText = useCallback(
    (hist: { role: "user" | "assistant"; content: string }[]) => {
      let out = "";

      for (let i = 0; i < hist.length - 1; i += 2) {
        const u = hist[i];
        const a = hist[i + 1];

        if (u?.role === "user" && a?.role === "assistant") {
          const q = (u.content || "").trim();
          const ans = (a.content || "").trim();

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

    const userMessage = history[userIdx]?.content || "";
    const priorPairs = history.slice(0, userIdx);
    const priorPlain = makePlainHistoryText(priorPairs);

    const cfg = await window.ghostAI.getOpenAIConfig();
    const customPrompt = (cfg as any)?.customPrompt ?? "";

    setHistoryIndex(null);

    await analyzeStream.execute({
      userMessage,
      customPrompt,
      history: priorPlain,
      onSuccess: (content) => {
        setResult(content);
        setHistory((prev) => {
          const copy = prev.slice();

          if (assistantIdx >= 0 && assistantIdx < copy.length) {
            copy[assistantIdx] = {
              role: "assistant",
              content,
            };
          }

          return copy;
        });
      },
      onError: (error) => {
        setResult(error);
      },
    });
  }, [
    canRegenerate,
    historyIndex,
    lastPageIndex,
    assistantAnswerIndices,
    history,
    makePlainHistoryText,
    analyzeStream,
  ]);

  // Positioning (memoized to avoid recalculating on every render)
  const bubblePosition = useMemo(() => {
    const bubbleWidth = 760;
    const barWidth = barRef.current?.offsetWidth ?? 320;
    const bubbleTop =
      barPos.y + ((barRef.current && barRef.current.offsetHeight) || 50) + 10;
    const barCenterX = barPos.x + barWidth / 2;
    const unclampedLeft = Math.round(barCenterX - bubbleWidth / 2);
    const bubbleLeft = Math.max(
      10,
      Math.min(unclampedLeft, window.innerWidth - bubbleWidth - 10),
    );

    return { bubbleWidth, bubbleTop, bubbleLeft };
  }, [barPos]);

  return (
    <div style={{ ...appRootStyle, display: visible ? "block" : "none" }}>
      <HUDBar
        askActive={tab === "ask"}
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
          setTab((t) => (t === "ask" ? null : "ask"));
        }}
        onSettingsToggle={() =>
          setTab((t) => (t === "settings" ? null : "settings"))
        }
      />

      <div
        ref={bubbleRef}
        style={{
          position: "absolute",
          top: bubblePosition.bubbleTop,
          left: bubblePosition.bubbleLeft,
          width: bubblePosition.bubbleWidth,
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            ...settingsCard,
            display: tab === "settings" ? "block" : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 700 }}>Settings</div>
            <button
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
              title="Close"
              onClick={() => setTab(null)}
            >
              <IconX />
            </button>
          </div>
          <div style={{ marginTop: 8 }}>
            <Settings
              attachScreenshot={attachScreenshot}
              onAttachScreenshotChange={handleAttachScreenshotChange}
            />
          </div>
        </div>

        <div style={{ display: tab === "ask" ? "block" : "none" }}>
          <AskPanel
            attachScreenshot={attachScreenshot}
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
            onAttachScreenshotChange={handleAttachScreenshotChange}
            onRegenerate={() => void onRegenerate()}
            onSubmit={() => void onSubmit()}
          />
        </div>

        {!tab &&
          (recording || (displayMarkdown && transcriptModeRef.current)) && (
            <TranscriptBubble markdown={displayMarkdown} />
          )}
      </div>
    </div>
  );
}
