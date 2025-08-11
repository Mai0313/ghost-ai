import OpenAI from 'openai';
import crypto from 'node:crypto';
import type { AnalysisResult, ChatMessage, OpenAIConfig, TranscriptionResult } from './types';

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

  async analyzeImageWithText(imageBuffer: Buffer, textPrompt: string, customPrompt: string): Promise<AnalysisResult> {
    this.ensureClient();
    const requestId = crypto.randomUUID();
    const base64 = imageBuffer.toString('base64');
    const content: ChatMessage['content'] = [
      { type: 'text', text: `${customPrompt}\n\n${textPrompt}` },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}`, detail: 'auto' } },
    ];

    // @ts-ignore: SDK message types may differ by version
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [{ role: 'user', content }],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    });

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
      model: response.model ?? (model ?? this.config.model),
      timestamp: new Date().toISOString(),
    };
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<TranscriptionResult> {
    this.ensureClient();
    const requestId = crypto.randomUUID();
    // Whisper transcription (placeholder): SDKs often require FormData/file objects. Keep a stub for now.
    // Return a basic stub to integrate the flow; implement real upload later.
    return {
      requestId,
      text: '[Transcription pending implementation]',
      timestamp: new Date().toISOString(),
    };
  }
}

export const openAIClient = new OpenAIClient();


