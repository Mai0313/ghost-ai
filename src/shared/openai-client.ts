import type { AnalysisResult, ChatMessage, OpenAIConfig } from './types';

import OpenAI from 'openai';

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
      // Minimal call: list models
      // @ts-ignore: types may vary across SDK versions
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
      // @ts-ignore
      const list = await client.models.list();
      // @ts-ignore
      const ids = (list?.data ?? []).map((m: any) => m.id as string);
      // Temporary filter: only expose a curated subset in the dropdown
      const allowedOrder = ['gpt-4o', 'gpt-5-mini', 'gpt-4o-mini'];
      const filtered = allowedOrder.filter((id) => ids.includes(id));

      return filtered.length ? filtered : allowedOrder;
    } catch {
      return [];
    }
  }

  // Non-streaming image analysis has been removed in favor of streaming-only flow

  async analyzeImageWithTextStream(
    imageBuffer: Buffer,
    textPrompt: string,
    customPrompt: string,
    requestId: string,
    onDelta: (textDelta: string) => void,
    sessionId: string,
  ): Promise<AnalysisResult> {
    this.ensureClient();
    const config = this.config!;
    const client = this.client!;
    const base64 = imageBuffer.toString('base64');
    const messages: ChatMessage[] = [];

    if (customPrompt?.trim()) {
      // Use system role for custom prompt/instructions to guide the model
      messages.push({ role: 'system', content: customPrompt.trim() } as any);
    }
    const effectiveText = textPrompt?.trim() || 'Please analyze this screenshot.';
    const content: ChatMessage['content'] = [
      { type: 'text', text: effectiveText },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}`, detail: 'auto' } },
    ];

    messages.push({ role: 'user', content } as ChatMessage);

    // @ts-ignore: SDK message types may differ by version
    const stream = await client.chat.completions.create({
      model: config.model,
      // @ts-ignore allow system role
      messages: messages as any,
      stream: true,
    });

    let finalContent = '';

    // @ts-ignore: streaming iterator typings vary across SDK versions
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
