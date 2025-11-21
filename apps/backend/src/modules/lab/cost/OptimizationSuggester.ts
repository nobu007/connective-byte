import { TokenAnalysisResult, TokenInsightCall } from './TokenAnalyzer';

export type OptimizationPriority = 'high' | 'medium' | 'low';

export interface OptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  strategy: string;
  priority: OptimizationPriority;
  estimatedTokenSavings: number;
  estimatedCostSavings: number;
  relatedCallIds: string[];
}

export interface OptimizationSuggesterOptions {
  costPerThousandTokens?: number;
  maxSuggestions?: number;
}

const DEFAULT_OPTIONS: Required<OptimizationSuggesterOptions> = {
  costPerThousandTokens: 0.5,
  maxSuggestions: 5,
};

export class OptimizationSuggester {
  private readonly options: Required<OptimizationSuggesterOptions>;

  constructor(options: OptimizationSuggesterOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  public suggest(analysis: TokenAnalysisResult): OptimizationSuggestion[] {
    if (analysis.callCount === 0) {
      return [];
    }

    const suggestions: OptimizationSuggestion[] = [];
    const referencedCalls = new Set<string>();

    if (analysis.flags.highAverageTokens) {
      suggestions.push(this.createPromptCompressionSuggestion(analysis));
    }

    if (analysis.flags.excessiveSystemTokens) {
      suggestions.push(this.createSystemPromptSuggestion(analysis));
    }

    for (const call of analysis.highCostCalls) {
      suggestions.push(this.createHighCostCallSuggestion(call, 'cost'));
      referencedCalls.add(call.id);
      if (suggestions.length >= this.options.maxSuggestions) {
        return suggestions.slice(0, this.options.maxSuggestions);
      }
    }

    for (const call of analysis.highTokenCalls) {
      if (referencedCalls.has(call.id)) {
        continue;
      }
      suggestions.push(this.createHighCostCallSuggestion(call, 'token'));
      referencedCalls.add(call.id);
      if (suggestions.length >= this.options.maxSuggestions) {
        break;
      }
    }

    return suggestions.slice(0, this.options.maxSuggestions);
  }

  private createPromptCompressionSuggestion(analysis: TokenAnalysisResult): OptimizationSuggestion {
    const estimatedTokenSavings = Math.max(Math.round(analysis.totals.totalTokens * 0.15), 1);
    return {
      id: 'prompt-compression',
      title: '圧縮可能なプロンプトを削減',
      description:
        '平均トークン数がKPI許容値を超えています。プロンプト要件を再構成し、情報を段階投入することでコストを15%以上削減できます。',
      strategy: 'prompt-compression',
      priority: 'high',
      estimatedTokenSavings,
      estimatedCostSavings: this.estimateCostSavings(estimatedTokenSavings),
      relatedCallIds: [],
    };
  }

  private createSystemPromptSuggestion(analysis: TokenAnalysisResult): OptimizationSuggestion {
    const estimatedTokenSavings = Math.max(Math.round(analysis.totals.systemTokens * 0.25), 1);
    return {
      id: 'system-trim',
      title: 'システムプロンプトのリファクタリング',
      description:
        'システムメッセージ比率が高いため、役割指示の分割・テンプレート化でKPIドリフトを抑制できます。',
      strategy: 'system-prompt-trim',
      priority: 'medium',
      estimatedTokenSavings,
      estimatedCostSavings: this.estimateCostSavings(estimatedTokenSavings),
      relatedCallIds: [],
    };
  }

  private createHighCostCallSuggestion(
    call: TokenInsightCall,
    reason: 'cost' | 'token'
  ): OptimizationSuggestion {
    const reductionRatio = reason === 'cost' ? 0.2 : 0.1;
    const estimatedTokenSavings = Math.max(Math.round(call.totalTokens * reductionRatio), 1);
    const priority: OptimizationPriority = reason === 'cost' ? 'high' : 'medium';
    const title =
      reason === 'cost'
        ? `高負荷API呼び出し (${call.provider}/${call.model})`
        : `トークン過多API呼び出し (${call.provider}/${call.model})`;
    const description =
      reason === 'cost'
        ? '特定リクエストがコストKPIを押し上げています。構造化データの活用やレスポンス上限設定でコスト20%削減を見込めます。'
        : '特定リクエストでトークン過多が検出されました。要約・段階応答を適用し10%削減を狙いましょう。';

    return {
      id: `${reason}-call-${call.id}`,
      title,
      description,
      strategy: reason === 'cost' ? 'prompt-budgeting' : 'response-scope-control',
      priority,
      estimatedTokenSavings,
      estimatedCostSavings: this.estimateCostSavings(estimatedTokenSavings),
      relatedCallIds: [call.id],
    };
  }

  private estimateCostSavings(tokenSavings: number): number {
    return Number(((tokenSavings / 1000) * this.options.costPerThousandTokens).toFixed(6));
  }
}
