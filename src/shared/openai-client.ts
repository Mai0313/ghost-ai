import type { AnalysisResult, OpenAIConfig } from './types';
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import type {
  ResponseCreateParams,
  ResponseStreamEvent,
} from 'openai/resources/responses/responses';
import type { Stream } from 'openai/streaming';

import OpenAI from 'openai';
import { ChatCompletionCreateParamsStreaming } from 'openai/resources.js';
import { ResponseCreateParamsStreaming } from 'openai/resources/responses/responses.js';

export class OpenAIClient {
  private client: OpenAI | null = null;
  private config: OpenAIConfig | null = null;

  initialize(config: OpenAIConfig): void {
    this.config = config;
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  }

  updateConfig(config: Partial<OpenAIConfig>): void {
    if (!this.config) throw new Error('OpenAIClient not initialized');
    this.config = { ...this.config, ...config } as OpenAIConfig;
    this.client = new OpenAI({ apiKey: this.config.apiKey, baseURL: this.config.baseURL });
  }

  async validateConfig(config: OpenAIConfig): Promise<boolean> {
    try {
      const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
      const list = await client.models.list();

      return Array.isArray(list.data) && list.data.length >= 0;
    } catch {
      return false;
    }
  }

  private ensureClient(): void {
    if (!this.client || !this.config) throw new Error('OpenAIClient not initialized');
  }

  async listModels(): Promise<string[]> {
    this.ensureClient();
    const client = this.client!;

    try {
      const list = await client.models.list();
      const ids = (list?.data ?? []).map((m: any) => m.id as string);
      const allowedOrder = [
        'chatgpt-4o-latest',
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4.1',
        'o4-mini-2025-04-16',
        'gpt-5',
        'gpt-5-mini',
      ];
      const filtered = allowedOrder.filter((id) => ids.includes(id));

      return filtered.length ? filtered : allowedOrder;
    } catch {
      // Return a sensible default order so the UI doesn't get stuck in "Loading models…"
      const allowedOrder = [
        'chatgpt-4o-latest',
        'gpt-4o',
        'gpt-4.1',
        'o4-mini-2025-04-16',
        'gpt-5',
        'gpt-5-mini',
      ];

      return allowedOrder;
    }
  }

  async completionWithTextStream(
    imageBuffer: Buffer,
    textPrompt: string,
    customPrompt: string,
    requestId: string,
    onDelta: (textDelta: string) => void,
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<AnalysisResult> {
    this.ensureClient();
    const config = this.config!;
    const client = this.client!;
    const base64 = imageBuffer.toString('base64');
    const messages: ChatCompletionMessageParam[] = [];

    if (customPrompt?.trim()) {
      // Use system role for custom prompt/instructions to guide the model
      messages.push({ role: 'system', content: customPrompt.trim() });
    }
    const effectiveText =
      textPrompt?.trim() || 'Response to the question based on the info or image you have.';
    const content: Exclude<ChatCompletionMessageParam['content'], string | null> = [
      { type: 'text', text: effectiveText },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}`, detail: 'auto' } },
    ];

    messages.push({ role: 'user', content });

    const request: ChatCompletionCreateParams & { stream: true } = {
      model: config.model,
      messages,
      stream: true,
    } as ChatCompletionCreateParamsStreaming;

    if (config.model === 'gpt-5') {
      request.reasoning_effort = 'low';
    }
    // Pass AbortSignal so callers can cancel mid-stream
    const stream: Stream<ChatCompletionChunk> = await client.chat.completions.create(request, {
      signal,
    });

    let finalContent = '';

    for await (const chunk of stream) {
      try {
        const delta = chunk.choices[0].delta.content ?? '';

        if (delta) {
          finalContent += delta;
          onDelta(delta);
        }
      } catch {
        // ignore malformed chunks
      }
    }

    return {
      requestId,
      content: finalContent,
      model: config.model,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
    };
  }

  async responseImageWithTextStream(
    imageBuffer: Buffer,
    textPrompt: string,
    customPrompt: string,
    requestId: string,
    onDelta: (update: {
      channel: 'answer' | 'reasoning' | 'web_search';
      delta?: string;
      text?: string;
      eventType: string;
    }) => void,
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<AnalysisResult> {
    this.ensureClient();
    const config = this.config!;
    const client = this.client!;
    const base64 = imageBuffer.toString('base64');

    const effectiveText =
      textPrompt?.trim() || 'Response to the question based on the info or image you have.';

    const input: any[] = [];

    if (customPrompt?.trim()) {
      input.push({ role: 'system', content: customPrompt.trim() });
    }
    input.push({
      role: 'user',
      content: [
        { type: 'input_text', text: effectiveText },
        { type: 'input_image', image_url: `data:image/png;base64,${base64}` },
      ],
    });

    const request: ResponseCreateParams & { stream: true } = {
      model: config.model,
      input: input,
      tools: [{ type: 'web_search_preview' }],
      stream: true,
    } as ResponseCreateParamsStreaming;

    if (config.model === 'gpt-5') {
      // Responses API uses nested reasoning config
      request.reasoning = { effort: 'low', summary: 'auto' };
    }
    const stream: Stream<ResponseStreamEvent> = await client.responses.create(request, { signal });

    let finalContent = '';

    for await (const event of stream) {
      try {
        // Reasoning stream (models with reasoning support)
        if ((event as any)?.type === 'response.reasoning_summary_text.delta') {
          const d = (event as any).delta as string;
          if (d) onDelta({ channel: 'reasoning', delta: d, eventType: (event as any).type });
          continue;
        }
        if ((event as any)?.type === 'response.reasoning_summary_text.done') {
          const t = (event as any).text as string;
          onDelta({ channel: 'reasoning', text: t, eventType: (event as any).type });
          continue;
        }
        if (
          (event as any)?.type === 'response.reasoning_summary_part.added' ||
          (event as any)?.type === 'response.reasoning_summary_part.done'
        ) {
          onDelta({ channel: 'reasoning', eventType: (event as any).type });
          continue;
        }

        // Web search lifecycle events (no full content available)
        if (
          (event as any)?.type === 'response.web_search_call.in_progress' ||
          (event as any)?.type === 'response.web_search_call.searching' ||
          (event as any)?.type === 'response.web_search_call.completed'
        ) {
          onDelta({ channel: 'web_search', eventType: (event as any).type });
          continue;
        }

        // Prefer granular answer delta events
        if (event.type === 'response.output_text.delta') {
          const d = (event as any).delta as string;
          if (d) {
            finalContent += d;
            onDelta({ channel: 'answer', delta: d, eventType: event.type });
          }
          continue;
        }

        // Ensure we get the final answer text
        if (event.type === 'response.output_text.done') {
          const t = (event as any).text as string;
          if (typeof t === 'string') finalContent = t;
          onDelta({ channel: 'answer', text: t, eventType: event.type });
          continue;
        }
      } catch {
        // ignore malformed events
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
