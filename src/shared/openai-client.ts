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

  private ensureClient(): asserts this is { client: OpenAI; config: OpenAIConfig } {
    if (!this.client || !this.config) throw new Error('OpenAIClient not initialized');
  }

  async listModels(): Promise<string[]> {
    this.ensureClient();
    try {
      // @ts-ignore
      const list = await this.client.models.list();
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
    const requestId = crypto.randomUUID();
    const base64 = imageBuffer.toString('base64');
    const content: ChatMessage['content'] = [
      { type: 'text', text: `${customPrompt}\n\n${textPrompt}` },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}`, detail: 'auto' } },
    ];

    // Basic retry with backoff
    const attempt = async (tryIndex: number) => {
      // @ts-ignore: SDK message types may differ by version
      return this.client!.chat.completions.create({
        model: this.config!.model,
        messages: [{ role: 'user', content }],
        temperature: this.config!.temperature,
        max_tokens: this.config!.maxTokens,
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
      model: response.model ?? this.config.model,
      timestamp: new Date().toISOString(),
    };
  }

  async chatCompletion(messages: ChatMessage[], model?: string): Promise<AnalysisResult> {
    this.ensureClient();
    const requestId = crypto.randomUUID();
    // @ts-ignore
    const response = await this.client.chat.completions.create({
      model: model ?? this.config.model,
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    });
    const contentText = response.choices?.[0]?.message?.content ?? '';

    return {
      requestId,
      content: contentText,
      model: response.model ?? model ?? this.config.model,
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
