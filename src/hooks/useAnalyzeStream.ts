import { useCallback, useRef } from "react";

export interface UseAnalyzeStreamOptions {
  sessionId: string;
  onDeltaText: (delta: string) => void;
  onDeltaReasoning: (delta: string) => void;
  onWebSearchStatusChange: (
    status: "idle" | "in_progress" | "searching" | "completed",
  ) => void;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
}

export interface AnalyzeStreamRequest {
  userMessage: string;
  customPrompt: string;
  history?: string | null;
  onSuccess: (content: string) => void;
  onError: (error: string) => void;
}

export function useAnalyzeStream(options: UseAnalyzeStreamOptions) {
  const {
    sessionId: _sessionId,
    onDeltaText,
    onDeltaReasoning,
    onWebSearchStatusChange,
    onStreamStart,
    onStreamEnd,
  } = options;

  const activeUnsubRef = useRef<(() => void) | null>(null);
  const lastDeltaRef = useRef<string | null>(null);
  const lastReasoningDeltaRef = useRef<string | null>(null);
  const activeSessionIdForRequestRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (activeUnsubRef.current) {
      try {
        activeUnsubRef.current();
      } catch (err) {
        console.error("[AnalyzeStream] Cleanup error:", err);
      }
      activeUnsubRef.current = null;
    }
    lastDeltaRef.current = null;
    lastReasoningDeltaRef.current = null;
    activeSessionIdForRequestRef.current = null;
  }, []);

  const execute = useCallback(
    async (request: AnalyzeStreamRequest): Promise<void> => {
      const { userMessage, customPrompt, history, onSuccess, onError } =
        request;

      // Cleanup any previous stream
      cleanup();

      onStreamStart?.();

      let unsubscribe: (() => void) | null = null;

      try {
        unsubscribe = window.ghostAI.analyzeCurrentScreenStream(
          userMessage,
          customPrompt,
          {
            onStart: ({
              sessionId: sid,
            }: {
              requestId: string;
              sessionId: string;
            }) => {
              if (sid) {
                activeSessionIdForRequestRef.current = sid;
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
              channel?: "answer" | "reasoning" | "web_search";
              eventType?: string;
              delta?: string;
              text?: string;
            }) => {
              // Ignore deltas from different sessions
              if (
                sid &&
                activeSessionIdForRequestRef.current &&
                sid !== activeSessionIdForRequestRef.current
              ) {
                return;
              }

              // Web search indicator
              if ((channel ?? "answer") === "web_search") {
                const type = String(eventType || "");

                if (type.endsWith("in_progress")) {
                  onWebSearchStatusChange("in_progress");
                } else if (type.endsWith("searching")) {
                  onWebSearchStatusChange("searching");
                } else if (type.endsWith("completed")) {
                  onWebSearchStatusChange("completed");
                }

                return;
              }

              // Reasoning channel
              if ((channel ?? "answer") === "reasoning") {
                const piece =
                  (typeof fullText === "string" && fullText) ||
                  (typeof delta === "string" && delta) ||
                  "";

                if (!piece) return;

                if (eventType === "response.reasoning_summary_text.done") {
                  // Full reasoning text available
                  onDeltaReasoning(piece);
                  lastReasoningDeltaRef.current = null;
                } else {
                  // Incremental reasoning delta
                  if (lastReasoningDeltaRef.current === piece) return;
                  lastReasoningDeltaRef.current = piece;
                  onDeltaReasoning(piece);
                }

                return;
              }

              // Answer channel (default)
              const piece =
                (typeof fullText === "string" && fullText) ||
                (typeof delta === "string" && delta) ||
                "";

              if (!piece) return;
              if (lastDeltaRef.current === piece) return;
              lastDeltaRef.current = piece;
              onDeltaText(piece);
            },
            onDone: ({
              content,
              sessionId: sid,
            }: {
              requestId: string;
              content: string;
              sessionId: string;
            }) => {
              // Ignore completion from different sessions
              if (
                sid &&
                activeSessionIdForRequestRef.current &&
                sid !== activeSessionIdForRequestRef.current
              ) {
                return;
              }

              lastDeltaRef.current = null;
              lastReasoningDeltaRef.current = null;
              onWebSearchStatusChange("idle");
              activeSessionIdForRequestRef.current = null;

              try {
                onSuccess(content ?? "");
              } finally {
                cleanup();
                onStreamEnd?.();
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
              // Ignore errors from different sessions
              if (
                sid &&
                activeSessionIdForRequestRef.current &&
                sid !== activeSessionIdForRequestRef.current
              ) {
                return;
              }

              lastDeltaRef.current = null;
              lastReasoningDeltaRef.current = null;
              onWebSearchStatusChange("idle");
              activeSessionIdForRequestRef.current = null;

              try {
                onError(error || "Unknown error");
              } finally {
                cleanup();
                onStreamEnd?.();
              }
            },
          },
          history ?? undefined,
        );

        if (typeof unsubscribe !== "function") {
          throw new Error("Streaming unavailable");
        }

        activeUnsubRef.current = unsubscribe;
      } catch (e) {
        onError(
          `Error: ${String((e as any)?.message ?? e ?? "analyze failed")}`,
        );
        onStreamEnd?.();
      }
    },
    [
      onDeltaText,
      onDeltaReasoning,
      onWebSearchStatusChange,
      onStreamStart,
      onStreamEnd,
      cleanup,
    ],
  );

  return {
    execute,
    cleanup,
  };
}
