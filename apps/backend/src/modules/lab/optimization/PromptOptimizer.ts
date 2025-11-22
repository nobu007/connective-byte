/**
 * AI-Powered Prompt Optimizer
 * Uses AI to suggest token-efficient prompt alternatives
 */

import { APIGateway } from '../gateway/APIGateway';
import { Provider } from '../types';

export interface OptimizationSuggestion {
  original: string;
  optimized: string;
  estimatedTokenSavings: number;
  reasoning: string;
  preservesIntent: boolean;
}

export interface PromptOptimizerOptions {
  provider?: Provider;
  model?: string;
  apiKey: string;
}

export class PromptOptimizer {
  private readonly gateway: APIGateway;
  private readonly provider: Provider;
  private readonly model: string;
  private readonly apiKey: string;

  constructor(gateway: APIGateway, options: PromptOptimizerOptions) {
    this.gateway = gateway;
    this.provider = options.provider ?? 'openai';
    this.model = options.model ?? 'gpt-4o-mini';
    this.apiKey = options.apiKey;
  }

  public async optimize(prompt: string): Promise<OptimizationSuggestion> {
    const systemPrompt = `You are an expert at optimizing prompts for token efficiency while preserving intent and quality.
Analyze the given prompt and provide a more token-efficient version.
Respond in JSON format with these fields:
- optimized: the optimized prompt
- estimatedTokenSavings: estimated number of tokens saved (integer)
- reasoning: brief explanation of changes made
- preservesIntent: boolean indicating if original intent is preserved`;

    const userPrompt = `Optimize this prompt for token efficiency:\n\n${prompt}`;

    const response = await this.gateway.execute({
      provider: this.provider,
      model: this.model,
      apiKey: this.apiKey,
      prompt: userPrompt,
      metadata: { systemPrompt },
      parameters: {
        temperature: 0.3,
        response_format: { type: 'json_object' },
      },
    });

    try {
      const parsed = JSON.parse(response.content);
      return {
        original: prompt,
        optimized: parsed.optimized ?? prompt,
        estimatedTokenSavings: parsed.estimatedTokenSavings ?? 0,
        reasoning: parsed.reasoning ?? 'No reasoning provided',
        preservesIntent: parsed.preservesIntent ?? true,
      };
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        original: prompt,
        optimized: response.content,
        estimatedTokenSavings: Math.floor(prompt.length * 0.1),
        reasoning: 'AI-generated optimization',
        preservesIntent: true,
      };
    }
  }

  public async batchOptimize(prompts: string[]): Promise<OptimizationSuggestion[]> {
    const results: OptimizationSuggestion[] = [];

    for (const prompt of prompts) {
      try {
        const suggestion = await this.optimize(prompt);
        results.push(suggestion);
      } catch (error) {
        // Continue with other prompts if one fails
        results.push({
          original: prompt,
          optimized: prompt,
          estimatedTokenSavings: 0,
          reasoning: `Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          preservesIntent: true,
        });
      }
    }

    return results;
  }
}
