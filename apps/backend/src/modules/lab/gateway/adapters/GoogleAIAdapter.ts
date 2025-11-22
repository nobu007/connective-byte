import { fetch } from 'undici';
import { ProviderAdapter, GatewayRequest, GatewayResponse, TokenBreakdown } from '../../types';
import { ProviderExecutionError, ProviderUnavailableError } from '../../errors';
import { calculateCost } from '../../cost/pricing';

const DEFAULT_MODEL = 'gemini-1.5-flash';

interface GoogleAIContent {
  role?: string;
  parts: Array<{ text: string }>;
}

interface GoogleAICandidate {
  content: GoogleAIContent;
  finishReason?: string;
}

interface GoogleAIUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

interface GoogleAIResponseBody {
  candidates: GoogleAICandidate[];
  usageMetadata: GoogleAIUsageMetadata;
}

export interface GoogleAIAdapterOptions {
  baseUrl?: string;
  defaultModel?: string;
}

export class GoogleAIAdapter implements ProviderAdapter {
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(options: GoogleAIAdapterOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'https://generativelanguage.googleapis.com';
    this.defaultModel = options.defaultModel ?? DEFAULT_MODEL;
  }

  public supports(provider: 'openai' | 'anthropic' | 'google'): boolean {
    return provider === 'google';
  }

  public async execute(request: GatewayRequest): Promise<GatewayResponse> {
    if (!request.apiKey) {
      throw new ProviderUnavailableError('Google AI API key is required for execution', {
        provider: request.provider,
      });
    }

    const startedAt = Date.now();
    const model = request.model ?? this.defaultModel;
    const body = this.buildRequestPayload(request);

    const url = `${this.baseUrl}/v1beta/models/${model}:generateContent?key=${request.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ProviderExecutionError('Google AI API request failed', {
        provider: request.provider,
        status: response.status,
        response: safeTruncate(errorText, 500),
      });
    }

    const payload = (await response.json()) as GoogleAIResponseBody;
    const tokens = this.extractTokenBreakdown(payload.usageMetadata);
    const cost = calculateCost('google', model, tokens).cost;
    const content = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const latencyMs = Date.now() - startedAt;

    return {
      provider: 'google',
      model,
      content,
      tokens,
      cost,
      latencyMs,
      timestamp: new Date(),
    };
  }

  private buildRequestPayload(request: GatewayRequest): Record<string, unknown> {
    const parameters = request.parameters ?? {};
    const systemPrompt = (request.metadata as { systemPrompt?: string } | undefined)?.systemPrompt;

    const contents: GoogleAIContent[] = [];

    if (systemPrompt && systemPrompt.trim().length > 0) {
      contents.push({
        role: 'user',
        parts: [{ text: systemPrompt }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will follow these instructions.' }],
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: request.prompt }],
    });

    const payload: Record<string, unknown> = {
      contents,
    };

    // Add generation config if parameters provided
    const generationConfig: Record<string, unknown> = {};
    const allowedParams = ['temperature', 'topP', 'topK', 'maxOutputTokens', 'stopSequences'];

    for (const key of allowedParams) {
      if (key in parameters) {
        generationConfig[key] = parameters[key];
      }
    }

    if (Object.keys(generationConfig).length > 0) {
      payload.generationConfig = generationConfig;
    }

    return payload;
  }

  private extractTokenBreakdown(usage: GoogleAIUsageMetadata): TokenBreakdown {
    return {
      inputTokens: usage.promptTokenCount,
      outputTokens: usage.candidatesTokenCount,
      systemTokens: 0,
    };
  }
}

function safeTruncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}…`;
}
