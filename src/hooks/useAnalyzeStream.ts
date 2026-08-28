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
  formattedPrompt: string; // Complete prompt with history, formatted by caller
  onSuccess: (content: string) => void;
  onError: (error: string) => void;
}

export function useAnalyzeStream(options: UseAnalyzeStreamOptions) {
  const {
    onDeltaText,
    onDeltaReasoning,
    onWebSearchStatusChange,
    onStreamStart,
    onStreamEnd,
  } = options;

  const activeUnsubRef = useRef<(() => void) | null>(null);
  const lastDeltaRef = useRef<string | null>(null);
  const lastReasoningDeltaRef = useRef<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    activeUnsubRef.current?.();
    activeUnsubRef.current = null;
    lastDeltaRef.current = null;
    lastReasoningDeltaRef.current = null;
    activeSessionIdRef.current = null;
  }, []);

  const execute = useCallback(
    async (request: AnalyzeStreamRequest): Promise<void> => {
      const { userMessage, customPrompt, formattedPrompt, onSuccess, onError } =
        request;

      cleanup();
      onStreamStart?.();

      try {
        const unsubscribe = window.ghostAI.analyzeCurrentScreenStream(
          userMessage,
          customPrompt,
          formattedPrompt,
          {
            onStart: ({
              sessionId,
            }: {
              requestId: string;
              sessionId: string;
            }) => {
              if (sessionId) activeSessionIdRef.current = sessionId;
            },
            onDelta: ({
              channel = "answer",
              eventType,
              delta,
              text,
              sessionId,
            }: {
              requestId: string;
              sessionId: string;
              channel?: "answer" | "reasoning" | "web_search";
              eventType?: string;
              delta?: string;
              text?: string;
            }) => {
              // Ignore stale session events
              if (sessionId && activeSessionIdRef.current !== sessionId) return;

              // Web search status
              if (channel === "web_search" && eventType) {
                if (eventType.endsWith("in_progress"))
                  onWebSearchStatusChange("in_progress");
                else if (eventType.endsWith("searching"))
                  onWebSearchStatusChange("searching");
                else if (eventType.endsWith("completed"))
                  onWebSearchStatusChange("completed");

                return;
              }

              // Reasoning channel
              if (channel === "reasoning") {
                const piece = text || delta || "";

                if (!piece) return;
                if (eventType === "response.reasoning_summary_text.done") {
                  onDeltaReasoning(piece);
                  lastReasoningDeltaRef.current = null;
                } else if (lastReasoningDeltaRef.current !== piece) {
                  lastReasoningDeltaRef.current = piece;
                  onDeltaReasoning(piece);
                }

                return;
              }

              // Answer channel
              const piece = text || delta || "";

              if (!piece || lastDeltaRef.current === piece) return;
              lastDeltaRef.current = piece;
              onDeltaText(piece);
            },
            onDone: ({
              content,
              sessionId,
            }: {
              requestId: string;
              content: string;
              sessionId: string;
            }) => {
              if (sessionId && activeSessionIdRef.current !== sessionId) return;
              lastDeltaRef.current = null;
              lastReasoningDeltaRef.current = null;
              onWebSearchStatusChange("idle");
              activeSessionIdRef.current = null;
              try {
                onSuccess(content || "");
              } finally {
                cleanup();
                onStreamEnd?.();
              }
            },
            onError: ({
              error,
              sessionId,
            }: {
              requestId?: string;
              error: string;
              sessionId: string;
            }) => {
              if (sessionId && activeSessionIdRef.current !== sessionId) return;
              lastDeltaRef.current = null;
              lastReasoningDeltaRef.current = null;
              onWebSearchStatusChange("idle");
              activeSessionIdRef.current = null;
              try {
                onError(error || "Unknown error");
              } finally {
                cleanup();
                onStreamEnd?.();
              }
            },
          },
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
