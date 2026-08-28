import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
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

// Conversation state management with useReducer
type Message = { role: "user" | "assistant"; content: string };

type ConversationState = {
  history: Message[];
  assistantAnswerIndices: number[];
  historyIndex: number | null;
};

type ConversationAction =
  | { type: "APPEND_MESSAGE"; userMessage: string; assistantContent: string }
  | { type: "UPDATE_ASSISTANT"; index: number; content: string }
  | { type: "SET_HISTORY_INDEX"; index: number | null }
  | { type: "CLEAR" };

const MAX_HISTORY_LENGTH = 100;

function conversationReducer(
  state: ConversationState,
  action: ConversationAction,
): ConversationState {
  switch (action.type) {
    case "APPEND_MESSAGE": {
      const newHistory: Message[] = [
        ...state.history,
        { role: "user", content: action.userMessage },
        { role: "assistant", content: action.assistantContent },
      ];
      const newIndices = [
        ...state.assistantAnswerIndices,
        newHistory.length - 1,
      ];

      // Trim if exceeds max length
      if (newHistory.length > MAX_HISTORY_LENGTH) {
        const trimmed = newHistory.slice(-MAX_HISTORY_LENGTH);
        const trimmedIndices: number[] = [];

        for (let i = 0; i < trimmed.length; i++) {
          if (trimmed[i]?.role === "assistant") trimmedIndices.push(i);
        }

        return {
          history: trimmed,
          assistantAnswerIndices: trimmedIndices,
          historyIndex: null,
        };
      }

      return {
        history: newHistory,
        assistantAnswerIndices: newIndices,
        historyIndex: null,
      };
    }
    case "UPDATE_ASSISTANT": {
      const copy = state.history.slice();

      if (action.index >= 0 && action.index < copy.length) {
        copy[action.index] = { role: "assistant", content: action.content };
      }

      // Trim if exceeds max length
      if (copy.length > MAX_HISTORY_LENGTH) {
        const trimmed = copy.slice(-MAX_HISTORY_LENGTH);
        const trimmedIndices: number[] = [];

        for (let i = 0; i < trimmed.length; i++) {
          if (trimmed[i]?.role === "assistant") trimmedIndices.push(i);
        }

        return {
          history: trimmed,
          assistantAnswerIndices: trimmedIndices,
          historyIndex: null,
        };
      }

      return { ...state, history: copy };
    }
    case "SET_HISTORY_INDEX":
      return { ...state, historyIndex: action.index };
    case "CLEAR":
      return {
        history: [],
        assistantAnswerIndices: [],
        historyIndex: null,
      };
    default:
      return state;
  }
}

export function App() {
  const [visible, setVisible] = useState<boolean>(true);
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [reasoning, setReasoning] = useState("");

  // Consolidated conversation state management with useReducer
  const [conversation, dispatchConversation] = useReducer(conversationReducer, {
    history: [],
    assistantAnswerIndices: [],
    historyIndex: null,
  });

  const [webSearchStatus, setWebSearchStatus] = useState<
    "idle" | "in_progress" | "searching" | "completed"
  >("idle");
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
      if (delta) setResult((prev) => prev + delta);
    }, []),
    onDeltaReasoning: useCallback((delta: string) => {
      if (delta) setReasoning((prev) => prev + delta);
    }, []),
    onWebSearchStatusChange: useCallback(setWebSearchStatus, []),
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
  useEffect(() => analyzeStream.cleanup, []);

  const { timeLabel, transcriptModeRef, transcriptBufferRef } =
    useTranscription({
      recording,
      paused,
      sessionId,
      setPaused,
      onDelta: (delta) => delta && setResult((prev) => prev + delta),
      onDone: (content) => {
        setResult(content || "");
        dispatchConversation({
          type: "APPEND_MESSAGE",
          userMessage: content,
          assistantContent: content,
        });
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

  // Compute formatted history text from conversation history
  const formattedHistoryText = useMemo(() => {
    let out = "";

    for (let i = 0; i < conversation.history.length - 1; i += 2) {
      const u = conversation.history[i];
      const a = conversation.history[i + 1];

      if (u?.role === "user" && a?.role === "assistant") {
        const q = u.content.trim();
        const ans = a.content.trim();

        if (q || ans) out += `Q: ${q}\nA: ${ans}\n\n`;
      }
    }

    return out;
  }, [conversation.history]);

  // Derived state
  const displayMarkdown = useMemo(() => {
    if (conversation.historyIndex !== null) {
      const histIdx =
        conversation.assistantAnswerIndices[conversation.historyIndex] ?? null;

      if (histIdx !== null && histIdx >= 0)
        return conversation.history[histIdx]?.content ?? "";
    }

    return result;
  }, [
    conversation.historyIndex,
    conversation.assistantAnswerIndices,
    conversation.history,
    result,
  ]);

  const hasPages = conversation.assistantAnswerIndices.length > 0;
  const lastPageIndex = Math.max(
    0,
    conversation.assistantAnswerIndices.length - 1,
  );
  const currentPageLabel =
    conversation.historyIndex === null
      ? "Live"
      : `${conversation.historyIndex + 1}/${conversation.assistantAnswerIndices.length}`;

  const gotoPrevPage = useCallback(() => {
    if (!hasPages) return;
    dispatchConversation({
      type: "SET_HISTORY_INDEX",
      index:
        conversation.historyIndex === null
          ? lastPageIndex
          : Math.max(0, conversation.historyIndex - 1),
    });
  }, [hasPages, lastPageIndex, conversation.historyIndex]);

  const gotoNextPage = useCallback(() => {
    if (!hasPages) return;
    if (conversation.historyIndex === null) return;
    dispatchConversation({
      type: "SET_HISTORY_INDEX",
      index:
        conversation.historyIndex < lastPageIndex
          ? conversation.historyIndex + 1
          : null,
    });
  }, [hasPages, lastPageIndex, conversation.historyIndex]);

  const canRegenerate = useMemo(
    () => conversation.assistantAnswerIndices.length > 0 && !busy && !streaming,
    [conversation.assistantAnswerIndices.length, busy, streaming],
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

  // Load user settings on mount
  useEffect(() => {
    const api = (window as any).ghostAI;

    if (!api) return;

    api
      .getUserSettings?.()
      .then((userSettings: any) => {
        if (userSettings) {
          const v = userSettings.attachScreenshot;

          setAttachScreenshot(typeof v === "boolean" ? v : true);
        }
      })
      .catch((error: any) =>
        console.warn("Failed to load user settings:", error),
      );
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
        }
        setBusy(false);
        setStreaming(false);
        setTimeout(() => askInputRef.current?.focus(), 0);

        return "ask";
      });
    });

    api?.onHUDShow?.(() => {
      setVisible(true);
      if (tab === "ask") {
        setBusy(false);
        setStreaming(false);
        setTimeout(() => askInputRef.current?.focus(), 0);
      }
    });
  }, [tab]);

  // Auto-focus logic
  useEffect(() => {
    if (!visible || tab !== "ask") return;
    if (conversation.historyIndex !== null) setTab("ask");
    if (busy || streaming) {
      setBusy(false);
      setStreaming(false);
    }
    const id = setTimeout(() => askInputRef.current?.focus(), 0);

    return () => clearTimeout(id);
  }, [visible, tab, conversation.historyIndex, busy, streaming]);

  useEffect(() => {
    const api = window.ghostAI;

    api?.onAudioToggle?.(() => setRecording((prev) => !prev));

    const offScroll = api?.onAskScroll?.(
      ({ direction }: { direction: "up" | "down" }) => {
        setVisible(true);
        const area = Array.from(
          document.querySelectorAll<HTMLDivElement>(".bn-markdown-viewer"),
        ).find(
          (el) =>
            window.getComputedStyle(el).display !== "none" &&
            el.offsetParent !== null,
        );

        if (area) {
          const step = Math.max(80, Math.round(area.clientHeight * 0.25));

          area.scrollBy({
            top: direction === "up" ? -step : step,
            behavior: "smooth",
          });
        }
      },
    );

    const offPaginate = api?.onAskPaginate?.(
      ({ direction }: { direction: "up" | "down" }) => {
        setVisible(true);
        if (direction === "up") gotoPrevPage();
        else gotoNextPage();
      },
    );

    api?.getSession?.().then((sid: string) => sid && setSessionId(sid));

    const clearState = () => {
      analyzeStream.cleanup();
      setStreaming(false);
      dispatchConversation({ type: "CLEAR" });
      setResult("");
      setReasoning("");
      setWebSearchStatus("idle");
      transcriptBufferRef.current = "";
      setText("");
    };

    const offSession = api?.onSessionChanged?.(
      ({ sessionId: sid }: { sessionId: string }) => {
        if (sid) setSessionId(sid);
        clearState();
        setRecording(false);
      },
    );

    api?.onAskClear?.(() => {
      clearState();
      if (recording) setRecording(false);
    });

    return () => {
      offSession?.();
      offScroll?.();
      offPaginate?.();
    };
  }, [
    analyzeStream,
    gotoPrevPage,
    gotoNextPage,
    recording,
    transcriptBufferRef,
  ]);

  const handleAttachScreenshotChange = async (value: boolean) => {
    setAttachScreenshot(value);
    window.ghostAI
      .updateUserSettings({ attachScreenshot: value })
      .catch((error: any) =>
        console.error(
          "[App] Failed to update attachScreenshot setting:",
          error,
        ),
      );
  };

  const onSubmit = async () => {
    if (busy || streaming) return;

    const activePromptName = await window.ghostAI.getActivePromptName();

    if (!activePromptName) {
      setResult(
        "Error: No active prompt selected. Open Settings → Prompts to select one.",
      );

      return;
    }

    const transcript = transcriptBufferRef.current || "";
    const userMessage = transcript ? `${transcript}\n${text}`.trim() : text;
    const cfg = await window.ghostAI.getOpenAIConfig();
    const customPrompt = cfg?.customPrompt ?? "";

    const formattedPrompt = formattedHistoryText
      ? `Previous conversation:\n${formattedHistoryText}\n\nNew question:\n${userMessage}`
      : userMessage;

    await analyzeStream.execute({
      userMessage,
      customPrompt,
      formattedPrompt,
      onSuccess: (content) => {
        setResult(content);
        dispatchConversation({
          type: "APPEND_MESSAGE",
          userMessage,
          assistantContent: content,
        });
        setText("");
        transcriptBufferRef.current = "";
      },
      onError: setResult,
    });
  };

  const onRegenerate = async () => {
    if (!canRegenerate) return;

    const pageIdx =
      conversation.historyIndex === null
        ? lastPageIndex
        : conversation.historyIndex;
    const assistantIdx = conversation.assistantAnswerIndices[pageIdx] ?? -1;
    const userIdx = assistantIdx - 1;

    if (assistantIdx < 0 || userIdx < 0) return;

    const userMessage = conversation.history[userIdx]?.content || "";
    const priorPairs = conversation.history.slice(0, userIdx);

    // Rebuild formatted history for prior pairs
    let priorPlain = "";

    for (let i = 0; i < priorPairs.length - 1; i += 2) {
      const u = priorPairs[i];
      const a = priorPairs[i + 1];

      if (u?.role === "user" && a?.role === "assistant") {
        const q = u.content.trim();
        const ans = a.content.trim();

        if (q || ans) priorPlain += `Q: ${q}\nA: ${ans}\n\n`;
      }
    }

    const cfg = await window.ghostAI.getOpenAIConfig();
    const customPrompt = cfg?.customPrompt ?? "";

    dispatchConversation({ type: "SET_HISTORY_INDEX", index: null });

    const formattedPrompt = priorPlain
      ? `Previous conversation:\n${priorPlain}\n\nNew question:\n${userMessage}`
      : userMessage;

    await analyzeStream.execute({
      userMessage,
      customPrompt,
      formattedPrompt,
      onSuccess: (content) => {
        setResult(content);
        dispatchConversation({
          type: "UPDATE_ASSISTANT",
          index: assistantIdx,
          content,
        });
      },
      onError: setResult,
    });
  };

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
            historyIndex={conversation.historyIndex}
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
