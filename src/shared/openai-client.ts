import type { AnalysisResult, ChatMessage, OpenAIConfig, TranscriptionResult } from './types';

import crypto from 'node:crypto';

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

      return ids;
    } catch {
      return [];
    }
  }

  async analyzeImageWithText(
    imageBuffer: Buffer,
    textPrompt: string,
    customPrompt: string,
  ): Promise<AnalysisResult> {
    this.ensureClient();
    const config = this.config!;
    const client = this.client!;
    const requestId = crypto.randomUUID();
    const base64 = imageBuffer.toString('base64');
    const content: ChatMessage['content'] = [
      { type: 'text', text: `${customPrompt}\n\n${textPrompt}` },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}`, detail: 'auto' } },
    ];

    // Basic retry with backoff
    const attempt = async (_tryIndex: number) => {
      // @ts-ignore: SDK message types may differ by version
      return client.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content }],
      });
    };

    let response: any;
    let lastError: unknown;

    for (let i = 0; i < 3; i += 1) {
      try {
        response = await attempt(i);
        break;
      } catch (err) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 300 * Math.pow(2, i)));
      }
    }
    if (!response) throw lastError ?? new Error('OpenAI analyzeImageWithText failed');

    const contentText = response.choices?.[0]?.message?.content ?? '';

    return {
      requestId,
      content: contentText,
      model: response.model ?? config.model,
      timestamp: new Date().toISOString(),
    };
  }

  async analyzeImageWithTextStream(
    imageBuffer: Buffer,
    textPrompt: string,
    customPrompt: string,
    requestId: string,
    onDelta: (textDelta: string) => void,
  ): Promise<AnalysisResult> {
    this.ensureClient();
    const config = this.config!;
    const client = this.client!;
    const base64 = imageBuffer.toString('base64');
    const content: ChatMessage['content'] = [
      { type: 'text', text: `${customPrompt}\n\n${textPrompt}`.trim() },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}`, detail: 'auto' } },
    ];

    // @ts-ignore: SDK message types may differ by version
    const stream = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content }],
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
    };
  }

  async analyzeWithHistoryStream(
    imageBuffer: Buffer,
    history: ChatMessage[] | undefined,
    textPrompt: string,
    customPrompt: string,
    requestId: string,
    onDelta: (textDelta: string) => void,
  ): Promise<AnalysisResult> {
    this.ensureClient();
    const config = this.config!;
    const client = this.client!;
    const base64 = imageBuffer.toString('base64');

    // Build messages: include prior messages (as-is), then current user with text + image
    const messages: ChatMessage[] = [];
    if (Array.isArray(history) && history.length) messages.push(...history);
    const userCombinedContent: ChatMessage['content'] = [
      { type: 'text', text: `${customPrompt}\n\n${textPrompt}`.trim() },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}`, detail: 'auto' } },
    ];
    messages.push({ role: 'user', content: userCombinedContent } as ChatMessage);

    // @ts-ignore Streaming create; SDK signatures vary
    const stream = await client.chat.completions.create({
      model: config.model,
      // @ts-ignore - pass through our message type
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
    };
  }

  async chatCompletion(messages: ChatMessage[], model?: string): Promise<AnalysisResult> {
    this.ensureClient();
    const config = this.config!;
    const client = this.client!;
    const requestId = crypto.randomUUID();
    // @ts-ignore
    const response = await client.chat.completions.create({
      model: model ?? config.model,
      // @ts-ignore - map app-level message type to SDK param
      messages: messages as any,
    });
    const contentText = response.choices?.[0]?.message?.content ?? '';

    return {
      requestId,
      content: contentText,
      model: response.model ?? model ?? config.model,
      timestamp: new Date().toISOString(),
    };
  }

  async transcribeAudio(_audioBuffer: Buffer): Promise<TranscriptionResult> {
    this.ensureClient();
    const requestId = crypto.randomUUID();

    // Placeholder implementation: integrate real transcription API when available.
    return {
      requestId,
      text: '[Transcription pending implementation]'.trim(),
      timestamp: new Date().toISOString(),
    };
  }
}

export const openAIClient = new OpenAIClient();
