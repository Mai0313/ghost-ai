import type { AnalysisResult, OpenAIConfig } from "./types";
import type {
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
} from "openai/resources/chat/completions";
import type {
  ResponseCreateParams,
  ResponseInput,
  ResponseInputMessageContentList,
} from "openai/resources/responses/responses";

import OpenAI from "openai";
import { ChatCompletionCreateParamsStreaming } from "openai/resources.js";
import { ResponseCreateParamsStreaming } from "openai/resources/responses/responses.js";

export class OpenAIClient {
  private client: OpenAI | null = null;
  private config: OpenAIConfig | null = null;
  private readonly allowedModels: readonly string[] = [
    "chatgpt-4o-latest",
    "gpt-4o",
    "gpt-4.1",
    "o4-mini-2025-04-16",
    "gpt-5",
    "gpt-5-mini",
  ];

  initialize(config: OpenAIConfig): void {
    this.config = config;
    this.recreateClient();
  }

  /**
   * Build effective text prompt with standard suffix
   */
  private buildEffectiveText(textPrompt: string): string {
    return `${textPrompt.trim()}\nResponse to the question based on the info or image you have.`;
  }

  /**
   * Encode image buffer to base64 data URL
   */
  private encodeImage(imageBuffer: Buffer): string {
    const base64 = imageBuffer.toString("base64");

    return `data:image/png;base64,${base64}`;
  }

  /**
   * Build analysis result object
   */
  private buildResult(
    requestId: string,
    content: string,
    sessionId: string,
  ): AnalysisResult {
    return {
      requestId,
      content,
      model: this.config!.model,
      timestamp: new Date().toISOString(),
      sessionId,
    };
  }

  updateConfig(config: Partial<OpenAIConfig>): void {
    if (!this.config) throw new Error("OpenAIClient not initialized");

    const needsRecreate =
      (config.apiKey !== undefined && config.apiKey !== this.config.apiKey) ||
      (config.baseURL !== undefined && config.baseURL !== this.config.baseURL);

    this.config = { ...this.config, ...config } as OpenAIConfig;

    if (needsRecreate) {
      this.recreateClient();
    }
  }

  private recreateClient(): void {
    if (!this.config) return;
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

      return Array.isArray(list.data);
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
    try {
      const modelList = await this.client!.models.list();
      const modelIds = modelList.data.map((m) => m.id);
      const filtered = this.allowedModels.filter((id) => modelIds.includes(id));

      return filtered.length ? filtered : [...this.allowedModels];
    } catch {
      return [...this.allowedModels];
    }
  }

  /**
   * Build user content with text and optional image (shared logic)
   */
  private buildUserContentBase(
    textPrompt: string,
    imageBuffer?: Buffer,
  ): { effectiveText: string; imageUrl?: string } {
    const effectiveText = this.buildEffectiveText(textPrompt);
    const imageUrl = imageBuffer ? this.encodeImage(imageBuffer) : undefined;

    return { effectiveText, imageUrl };
  }

  /**
   * Build messages for Chat Completions API
   */
  private buildChatMessages(
    textPrompt: string,
    customPrompt: string,
    imageBuffer?: Buffer,
  ): ChatCompletionMessageParam[] {
    const { effectiveText, imageUrl } = this.buildUserContentBase(
      textPrompt,
      imageBuffer,
    );

    const userContent: ChatCompletionUserMessageParam["content"] = [
      { type: "text", text: effectiveText },
    ];

    if (imageUrl) {
      userContent.push({
        type: "image_url",
        image_url: { url: imageUrl, detail: "auto" },
      });
    }

    return [
      {
        name: "message",
        role: "system",
        content: [{ type: "text", text: customPrompt.trim() }],
      },
      {
        name: "message",
        role: "user",
        content: userContent,
      },
    ];
  }

  /**
   * Build input for Responses API
   */
  private buildResponseInput(
    textPrompt: string,
    customPrompt: string,
    imageBuffer?: Buffer,
  ): ResponseInput {
    const { effectiveText, imageUrl } = this.buildUserContentBase(
      textPrompt,
      imageBuffer,
    );

    const userContent: ResponseInputMessageContentList = [
      { type: "input_text", text: effectiveText },
    ];

    if (imageUrl) {
      userContent.push({
        type: "input_image",
        image_url: imageUrl,
        detail: "auto",
      });
    }

    return [
      {
        type: "message",
        role: "system",
        content: [{ type: "input_text", text: customPrompt.trim() }],
      },
      {
        type: "message",
        role: "user",
        content: userContent,
      },
    ];
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

    const messages = this.buildChatMessages(
      textPrompt,
      customPrompt,
      imageBuffer,
    );

    const request: ChatCompletionCreateParams & { stream: true } = {
      model: config.model,
      messages,
      stream: true,
    } as ChatCompletionCreateParamsStreaming;

    if (config.model === "gpt-5") {
      request.reasoning_effort = "high";
      request.service_tier = "priority";
    }

    const stream = await this.client!.chat.completions.create(request, {
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

    onDelta({
      channel: "answer",
      text: finalContent,
      eventType: "chat.output_text.done",
    });

    return this.buildResult(requestId, finalContent, sessionId);
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

    const input = this.buildResponseInput(
      textPrompt,
      customPrompt,
      imageBuffer,
    );

    const request: ResponseCreateParams & { stream: true } = {
      model: config.model,
      input,
      tools: [{ type: "web_search_preview" }],
      stream: true,
    } as ResponseCreateParamsStreaming;

    if (config.model === "gpt-5") {
      request.reasoning = { effort: "high", summary: "auto" };
      request.service_tier = "priority";
    }

    const stream = await this.client!.responses.create(request, { signal });
    let finalContent = "";

    for await (const event of stream) {
      switch (event.type) {
        case "response.reasoning_summary_text.delta":
          onDelta({
            channel: "reasoning",
            delta: event.delta,
            eventType: event.type,
          });
          break;
        case "response.reasoning_summary_text.done":
          onDelta({
            channel: "reasoning",
            text: event.text,
            eventType: event.type,
          });
          break;
        case "response.reasoning_summary_part.added":
        case "response.reasoning_summary_part.done":
          onDelta({ channel: "reasoning", eventType: event.type });
          break;
        case "response.web_search_call.in_progress":
        case "response.web_search_call.searching":
        case "response.web_search_call.completed":
          onDelta({ channel: "web_search", eventType: event.type });
          break;
        case "response.output_text.delta":
          finalContent += event.delta;
          onDelta({
            channel: "answer",
            delta: event.delta,
            eventType: event.type,
          });
          break;
        case "response.output_text.done":
          finalContent = event.text;
          onDelta({
            channel: "answer",
            text: event.text,
            eventType: event.type,
          });
          break;
      }
    }

    return this.buildResult(requestId, finalContent, sessionId);
  }
}

export const openAIClient = new OpenAIClient();
