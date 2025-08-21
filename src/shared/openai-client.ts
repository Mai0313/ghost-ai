import type { AnalysisResult, OpenAIConfig } from './types';

import OpenAI from 'openai';
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import type { Stream } from 'openai/streaming';

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
      const allowedOrder = ['chatgpt-4o-latest', 'gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'o4-mini-2025-04-16', 'gpt-5', 'gpt-5-mini'];
      const filtered = allowedOrder.filter((id) => ids.includes(id));

      return filtered.length ? filtered : allowedOrder;
    } catch {
      return [];
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
    const effectiveText = textPrompt?.trim() || 'Response to the question based on the info or image you have.';
    const content: Exclude<ChatCompletionMessageParam['content'], string | null> = [
      { type: 'text', text: effectiveText },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}`, detail: 'auto' } },
    ];

    messages.push({ role: 'user', content });

    const request: ChatCompletionCreateParams & { stream: true } = {
      model: config.model,
      messages,
      stream: true,
    };
    // Pass AbortSignal so callers can cancel mid-stream
    const stream: Stream<ChatCompletionChunk> = await client.chat.completions.create(request, { signal });

    let finalContent = '';

    for await (const chunk of stream) {
      try {
        const delta = chunk?.choices?.[0]?.delta?.content ?? '';

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
      sessionId,
    };
  }
}

export const openAIClient = new OpenAIClient();
