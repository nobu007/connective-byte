import { fetch } from 'undici';
import { ProviderAdapter, GatewayRequest, GatewayResponse, TokenBreakdown } from '../../types';
import { ProviderExecutionError, ProviderUnavailableError } from '../../errors';
import { calculateCost } from '../../cost/pricing';

const OPENAI_CHAT_COMPLETIONS_PATH = '/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_SYSTEM_PROMPT =
  'You are an API cost optimization lab assistant. Provide concise, actionable insights.';

type ChatCompletionRole = 'system' | 'user' | 'assistant' | 'tool';

interface ChatCompletionMessage {
  role: ChatCompletionRole;
  content: string;
  name?: string;
}

interface ChatCompletionResponseChoice {
  message?: ChatCompletionMessage;
  finish_reason?: string;
}

interface ChatCompletionUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  system_tokens?: number;
}

interface ChatCompletionResponseBody {
  id: string;
  created: number;
  model: string;
  choices: ChatCompletionResponseChoice[];
  usage?: ChatCompletionUsage;
}

export interface OpenAIAdapterOptions {
  baseUrl?: string;
  defaultModel?: string;
  defaultSystemPrompt?: string;
}

export class OpenAIAdapter implements ProviderAdapter {
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly defaultSystemPrompt: string;

  constructor(options: OpenAIAdapterOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'https://api.openai.com';
    this.defaultModel = options.defaultModel ?? DEFAULT_MODEL;
    this.defaultSystemPrompt = options.defaultSystemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  }

  public supports(provider: 'openai' | 'anthropic' | 'google'): boolean {
    return provider === 'openai';
  }

  public async execute(request: GatewayRequest): Promise<GatewayResponse> {
    if (!request.apiKey) {
      throw new ProviderUnavailableError('OpenAI API key is required for execution', {
        provider: request.provider,
      });
    }

    const startedAt = Date.now();
    const model = request.model ?? this.defaultModel;
    const body = this.buildRequestPayload(request, model);

    const response = await fetch(`${this.baseUrl}${OPENAI_CHAT_COMPLETIONS_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ProviderExecutionError('OpenAI API request failed', {
        provider: request.provider,
        status: response.status,
        response: safeTruncate(errorText, 500),
      });
    }

    const payload = (await response.json()) as ChatCompletionResponseBody;
    const tokens = this.extractTokenBreakdown(payload.usage);
    const cost = calculateCost('openai', model, tokens).cost;
    const content = payload.choices?.[0]?.message?.content ?? '';
    const latencyMs = Date.now() - startedAt;

    return {
      provider: 'openai',
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
    const allowedParams = this.extractAllowedParams(parameters);

    return {
      model,
      messages,
      ...allowedParams,
    };
  }

  private determineMessages(
    request: GatewayRequest,
    parameters: Record<string, unknown>
  ): ChatCompletionMessage[] {
    const provided = parameters.messages;
    if (Array.isArray(provided) && provided.length > 0) {
      return provided as ChatCompletionMessage[];
    }

    const systemPrompt = (request.metadata as { systemPrompt?: string } | undefined)?.systemPrompt;
    return [
      {
        role: 'system',
        content:
          typeof systemPrompt === 'string' && systemPrompt.trim().length > 0
            ? systemPrompt
            : this.defaultSystemPrompt,
      },
      {
        role: 'user',
        content: request.prompt,
      },
    ];
  }

  private extractAllowedParams(parameters: Record<string, unknown>): Record<string, unknown> {
    const allowedKeys = [
      'temperature',
      'top_p',
      'n',
      'stream',
      'presence_penalty',
      'frequency_penalty',
      'logit_bias',
      'max_tokens',
      'response_format',
      'seed',
      'tools',
      'tool_choice',
      'user',
    ];

    return allowedKeys.reduce<Record<string, unknown>>((acc, key) => {
      if (key in parameters) {
        acc[key] = parameters[key];
      }
      return acc;
    }, {});
  }

  private extractTokenBreakdown(usage?: ChatCompletionUsage): TokenBreakdown {
    return {
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
      systemTokens: usage?.system_tokens ?? 0,
    };
  }
}

function safeTruncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}…`;
}
