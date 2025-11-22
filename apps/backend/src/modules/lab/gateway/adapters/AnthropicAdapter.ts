import { fetch } from 'undici';
import { ProviderAdapter, GatewayRequest, GatewayResponse, TokenBreakdown } from '../../types';
import { ProviderExecutionError, ProviderUnavailableError } from '../../errors';
import { calculateCost } from '../../cost/pricing';

const ANTHROPIC_MESSAGES_PATH = '/v1/messages';
const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
const DEFAULT_MAX_TOKENS = 4096;

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponseContent {
  type: string;
  text?: string;
}

interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
}

interface AnthropicResponseBody {
  id: string;
  type: string;
  role: string;
  content: AnthropicResponseContent[];
  model: string;
  usage: AnthropicUsage;
}

export interface AnthropicAdapterOptions {
  baseUrl?: string;
  defaultModel?: string;
  defaultMaxTokens?: number;
}

export class AnthropicAdapter implements ProviderAdapter {
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly defaultMaxTokens: number;

  constructor(options: AnthropicAdapterOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'https://api.anthropic.com';
    this.defaultModel = options.defaultModel ?? DEFAULT_MODEL;
    this.defaultMaxTokens = options.defaultMaxTokens ?? DEFAULT_MAX_TOKENS;
  }

  public supports(provider: 'openai' | 'anthropic' | 'google'): boolean {
    return provider === 'anthropic';
  }

  public async execute(request: GatewayRequest): Promise<GatewayResponse> {
    if (!request.apiKey) {
      throw new ProviderUnavailableError('Anthropic API key is required for execution', {
        provider: request.provider,
      });
    }

    const startedAt = Date.now();
    const model = request.model ?? this.defaultModel;
    const body = this.buildRequestPayload(request, model);

    const response = await fetch(`${this.baseUrl}${ANTHROPIC_MESSAGES_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': request.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ProviderExecutionError('Anthropic API request failed', {
        provider: request.provider,
        status: response.status,
        response: safeTruncate(errorText, 500),
      });
    }

    const payload = (await response.json()) as AnthropicResponseBody;
    const tokens = this.extractTokenBreakdown(payload.usage);
    const cost = calculateCost('anthropic', model, tokens).cost;
    const content = payload.content.find((c) => c.type === 'text')?.text ?? '';
    const latencyMs = Date.now() - startedAt;

    return {
      provider: 'anthropic',
      model,
      content,
      tokens,
      cost,
      latencyMs,
      timestamp: new Date(),
    };
  }

  private buildRequestPayload(request: GatewayRequest, model: string): Record<string, unknown> {
    const parameters = request.parameters ?? {};
    const messages = this.determineMessages(request, parameters);
    const systemPrompt = (request.metadata as { systemPrompt?: string } | undefined)?.systemPrompt;

    const payload: Record<string, unknown> = {
      model,
      messages,
      max_tokens: parameters.max_tokens ?? this.defaultMaxTokens,
    };

    if (systemPrompt && systemPrompt.trim().length > 0) {
      payload.system = systemPrompt;
    }

    // Add optional parameters
    const allowedParams = ['temperature', 'top_p', 'top_k', 'stop_sequences'];
    for (const key of allowedParams) {
      if (key in parameters) {
        payload[key] = parameters[key];
      }
    }

    return payload;
  }

  private determineMessages(
    request: GatewayRequest,
    parameters: Record<string, unknown>
  ): AnthropicMessage[] {
    const provided = parameters.messages;
    if (Array.isArray(provided) && provided.length > 0) {
      return provided as AnthropicMessage[];
    }

    return [
      {
        role: 'user',
        content: request.prompt,
      },
    ];
  }

  private extractTokenBreakdown(usage: AnthropicUsage): TokenBreakdown {
    return {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
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
