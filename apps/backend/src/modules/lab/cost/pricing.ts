import { Provider, TokenBreakdown } from '../types';
import { ProviderExecutionError } from '../errors';

interface PricingTier {
  promptCostPer1K: number;
  completionCostPer1K: number;
  systemCostPer1K?: number;
}

type ProviderPricingTable = Record<string, PricingTier>;

const OPENAI_PRICING: ProviderPricingTable = {
  'gpt-4o-mini': {
    promptCostPer1K: 0.15,
    completionCostPer1K: 0.6,
  },
  'gpt-4o': {
    promptCostPer1K: 5,
    completionCostPer1K: 15,
  },
  'gpt-4.1-mini': {
    promptCostPer1K: 0.2,
    completionCostPer1K: 0.6,
  },
  'gpt-4.1': {
    promptCostPer1K: 5,
    completionCostPer1K: 15,
  },
  default: {
    promptCostPer1K: 0.5,
    completionCostPer1K: 1.5,
  },
};

const ANTHROPIC_PRICING: ProviderPricingTable = {
  'claude-3-5-sonnet': {
    promptCostPer1K: 3,
    completionCostPer1K: 15,
  },
  'claude-3-opus': {
    promptCostPer1K: 15,
    completionCostPer1K: 75,
  },
  default: {
    promptCostPer1K: 3,
    completionCostPer1K: 15,
  },
};

const GOOGLE_PRICING: ProviderPricingTable = {
  'gemini-1.5-pro': {
    promptCostPer1K: 3.5,
    completionCostPer1K: 10.5,
  },
  'gemini-1.5-flash': {
    promptCostPer1K: 0.35,
    completionCostPer1K: 1.05,
  },
  default: {
    promptCostPer1K: 0.25,
    completionCostPer1K: 0.75,
  },
};

const PROVIDER_PRICING: Record<Provider, ProviderPricingTable> = {
  openai: OPENAI_PRICING,
  anthropic: ANTHROPIC_PRICING,
  google: GOOGLE_PRICING,
};

const TOKENS_PER_BLOCK = 1000;

export interface CostBreakdownResult {
  cost: number;
  breakdown: {
    prompt: number;
    completion: number;
    system: number;
  };
}

function resolvePricing(provider: Provider, model: string): PricingTier {
  const table = PROVIDER_PRICING[provider];
  const normalizedModel = model.toLowerCase();
  return table[normalizedModel] ?? table.default;
}

export function calculateCost(
  provider: Provider,
  model: string,
  tokens: TokenBreakdown
): CostBreakdownResult {
  if (!model) {
    throw new ProviderExecutionError('Model is required for cost calculation', { provider });
  }

  const pricing = resolvePricing(provider, model);
  const promptCost = (tokens.inputTokens / TOKENS_PER_BLOCK) * pricing.promptCostPer1K;
  const completionCost = (tokens.outputTokens / TOKENS_PER_BLOCK) * pricing.completionCostPer1K;
  const systemRate = pricing.systemCostPer1K ?? pricing.promptCostPer1K;
  const systemCost = (tokens.systemTokens / TOKENS_PER_BLOCK) * systemRate;
  const cost = Number((promptCost + completionCost + systemCost).toFixed(6));

  return {
    cost,
    breakdown: {
      prompt: Number(promptCost.toFixed(6)),
      completion: Number(completionCost.toFixed(6)),
      system: Number(systemCost.toFixed(6)),
    },
  };
}
