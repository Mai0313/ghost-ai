import type { AnalysisResult, OpenAIConfig } from "./types";
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
} from "openai/resources/chat/completions";
import type {
  ResponseCreateParams,
  ResponseStreamEvent,
  ResponseInput,
  ResponseInputMessageContentList,
} from "openai/resources/responses/responses";
import type { Stream } from "openai/streaming";

import OpenAI from "openai";
import { ChatCompletionCreateParamsStreaming } from "openai/resources.js";
import { ResponseCreateParamsStreaming } from "openai/resources/responses/responses.js";

export class OpenAIClient {
  private client: OpenAI | null = null;
  private config: OpenAIConfig | null = null;
  private allowedModels: string[] = [
    "chatgpt-4o-latest",
    "gpt-4o",
    "gpt-4.1",
    "o4-mini-2025-04-16",
    "gpt-5",
    "gpt-5-mini",
  ];

  initialize(config: OpenAIConfig): void {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  updateConfig(config: Partial<OpenAIConfig>): void {
    if (!this.config) throw new Error("OpenAIClient not initialized");
    this.config = { ...this.config, ...config } as OpenAIConfig;
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
    });
  }

  async validateConfig(config: OpenAIConfig): Promise<boolean> {
    try {
      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
      const list = await client.models.list();

      return Array.isArray(list.data) && list.data.length >= 0;
    } catch {
      return false;
    }
  }

  private ensureClient(): void {
    if (!this.client || !this.config)
      throw new Error("OpenAIClient not initialized");
  }

  async listModels(): Promise<string[]> {
    this.ensureClient();
    const client = this.client!;

    try {
      const model_list = await client.models.list();
      const model_ids = (model_list.data ?? []).map((m: any) => m.id as string);
      const filtered = this.allowedModels.filter((id) =>
        model_ids.includes(id),
      );

      return filtered.length ? filtered : this.allowedModels;
    } catch {
      return this.allowedModels;
    }
  }

  async completionStream(
    imageBuffer: Buffer | undefined,
    textPrompt: string,
    customPrompt: string,
    requestId: string,
    onDelta: (update: {
      channel: "answer";
      delta?: string;
      text?: string;
      eventType: string;
    }) => void,
    sessionId: string,
    signal: AbortSignal,
  ): Promise<AnalysisResult> {
    this.ensureClient();
    const config = this.config!;
    const client = this.client!;
    const base64 = imageBuffer?.toString("base64");
    const messages: ChatCompletionMessageParam[] = [];

    messages.push({
      name: "message",
      role: "system",
      content: [{ type: "text", text: customPrompt.trim() }],
    });
    const effectiveText = `${textPrompt.trim()}\nResponse to the question based on the info or image you have.`;

    const userContent: ChatCompletionUserMessageParam["content"] = [
      { type: "text", text: effectiveText },
    ];

    if (imageBuffer && base64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/png;base64,${base64}`, detail: "auto" },
      });
    }
    messages.push({
      name: "message",
      role: "user",
      content: userContent,
    });

    const request: ChatCompletionCreateParams & { stream: true } = {
      model: config.model,
      messages: messages,
      stream: true,
    } as ChatCompletionCreateParamsStreaming;

    if (config.model === "gpt-5") {
      request.reasoning_effort = "low";
      request.service_tier = "priority";
    }
    const stream: Stream<ChatCompletionChunk> =
      await client.chat.completions.create(request, {
        signal,
      });

    let finalContent = "";

    for await (const chunk of stream) {
      const delta = chunk.choices[0].delta.content ?? "";

      if (delta) {
        finalContent += delta;
        onDelta({
          channel: "answer",
          delta,
          eventType: "chat.output_text.delta",
        });
      }
    }
    // Emit a final done event for completeness (not required by current UI)
    onDelta({
      channel: "answer",
      text: finalContent,
      eventType: "chat.output_text.done",
    });

    return {
      requestId,
      content: finalContent,
      model: config.model,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
    };
  }

  async responseStream(
    imageBuffer: Buffer | undefined,
    textPrompt: string,
    customPrompt: string,
    requestId: string,
    onDelta: (update: {
      channel: "answer" | "reasoning" | "web_search";
      eventType: string;
      delta?: string;
      text?: string;
    }) => void,
    sessionId: string,
    signal: AbortSignal,
  ): Promise<AnalysisResult> {
    this.ensureClient();
    const config = this.config!;
    const client = this.client!;
    const base64 = imageBuffer?.toString("base64");
    const input: ResponseInput = [];

    input.push({
      type: "message",
      role: "system",
      content: [{ type: "input_text", text: customPrompt.trim() }],
    });
    const effectiveText = `${textPrompt.trim()}\nResponse to the question based on the info or image you have.`;

    const userContent: ResponseInputMessageContentList = [
      { type: "input_text", text: effectiveText },
    ];

    if (imageBuffer && base64) {
      userContent.push({
        type: "input_image",
        image_url: `data:image/png;base64,${base64}`,
        detail: "auto",
      });
    }
    input.push({
      type: "message",
      role: "user",
      content: userContent,
    });

    const request: ResponseCreateParams & { stream: true } = {
      model: config.model,
      input: input,
      tools: [{ type: "web_search_preview" }],
      stream: true,
    } as ResponseCreateParamsStreaming;

    if (config.model === "gpt-5") {
      request.reasoning = { effort: "high", summary: "auto" };
      request.service_tier = "priority";
    }
    const stream: Stream<ResponseStreamEvent> = await client.responses.create(
      request,
      { signal },
    );

    let finalContent = "";

    for await (const event of stream) {
      // Reasoning stream (models with reasoning support)
      if (event.type === "response.reasoning_summary_text.delta") {
        onDelta({
          channel: "reasoning",
          delta: event.delta,
          eventType: event.type,
        });
        continue;
      }

      // Final reasoning text (models with reasoning support)
      if (event.type === "response.reasoning_summary_text.done") {
        onDelta({
          channel: "reasoning",
          text: event.text,
          eventType: event.type,
        });
        continue;
      }

      // Reasoning lifecycle events (no full content available)
      if (
        event.type === "response.reasoning_summary_part.added" ||
        event.type === "response.reasoning_summary_part.done"
      ) {
        onDelta({ channel: "reasoning", eventType: event.type });
        continue;
      }

      // Web search lifecycle events (no full content available)
      if (
        event.type === "response.web_search_call.in_progress" ||
        event.type === "response.web_search_call.searching" ||
        event.type === "response.web_search_call.completed"
      ) {
        onDelta({ channel: "web_search", eventType: event.type });
        continue;
      }

      // Prefer granular answer delta events
      if (event.type === "response.output_text.delta") {
        onDelta({
          channel: "answer",
          delta: event.delta,
          eventType: event.type,
        });
        finalContent += event.delta;
        continue;
      }

      // Ensure we get the final answer text
      if (event.type === "response.output_text.done") {
        onDelta({ channel: "answer", text: event.text, eventType: event.type });
        finalContent = event.text;
        continue;
      }
    }

    return {
      requestId,
      content: finalContent,
      model: config.model,
      timestamp: new Date().toISOString(),
      sessionId,
    };
  }
}

export const openAIClient = new OpenAIClient();
