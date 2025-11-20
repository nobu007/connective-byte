import { APICallRecord } from '../entities';

export interface TokenAnalyzerOptions {
  highCostThreshold?: number;
  highTokenThreshold?: number;
  systemTokenRatioWarning?: number;
}

export interface TokenInsightCall {
  id: string;
  experimentId: string;
  sessionId: string;
  provider: string;
  model: string;
  timestamp: Date;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  tokenBreakdown: {
    input: number;
    output: number;
    system: number;
  };
}

export interface TokenAnalysisFlags {
  excessiveSystemTokens: boolean;
  highAverageTokens: boolean;
}

export interface TokenAnalysisDistribution {
  inputPercentage: number;
  outputPercentage: number;
  systemPercentage: number;
}

export interface TokenAnalysisTotals {
  inputTokens: number;
  outputTokens: number;
  systemTokens: number;
  totalTokens: number;
  totalCost: number;
  averageCostPerCall: number;
  averageLatencyMs: number;
}

export interface TokenAnalysisResult {
  callCount: number;
  totals: TokenAnalysisTotals;
  distribution: TokenAnalysisDistribution;
  highCostCalls: TokenInsightCall[];
  highTokenCalls: TokenInsightCall[];
  flags: TokenAnalysisFlags;
}

const DEFAULT_OPTIONS: Required<TokenAnalyzerOptions> = {
  highCostThreshold: 0.75,
  highTokenThreshold: 2000,
  systemTokenRatioWarning: 0.2,
};

const EMPTY_RESULT: TokenAnalysisResult = {
  callCount: 0,
  totals: {
    inputTokens: 0,
    outputTokens: 0,
    systemTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    averageCostPerCall: 0,
    averageLatencyMs: 0,
  },
  distribution: {
    inputPercentage: 0,
    outputPercentage: 0,
    systemPercentage: 0,
  },
  highCostCalls: [],
  highTokenCalls: [],
  flags: {
    excessiveSystemTokens: false,
    highAverageTokens: false,
  },
};

export class TokenAnalyzer {
  private readonly options: Required<TokenAnalyzerOptions>;

  constructor(options: TokenAnalyzerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  public analyze(calls: ReadonlyArray<APICallRecord>): TokenAnalysisResult {
    if (calls.length === 0) {
      return EMPTY_RESULT;
    }

    let totalInput = 0;
    let totalOutput = 0;
    let totalSystem = 0;
    let totalCost = 0;
    let totalLatency = 0;

    for (const call of calls) {
      totalInput += call.inputTokens;
      totalOutput += call.outputTokens;
      totalSystem += call.systemTokens;
      totalCost += call.cost;
      totalLatency += call.latencyMs;
    }

    const totalTokens = totalInput + totalOutput + totalSystem;
    const callCount = calls.length;
    const averageCostPerCall = Number((totalCost / callCount).toFixed(6));
    const averageLatencyMs = Math.round(totalLatency / callCount);

    const distribution = this.calculateDistribution(totalInput, totalOutput, totalSystem);
    const highCostCalls = this.collectHighCostCalls(calls, this.options.highCostThreshold);
    const highTokenCalls = this.collectHighTokenCalls(calls, this.options.highTokenThreshold);
    const flags = this.generateFlags({
      totalTokens,
      callCount,
      totalSystem,
    });

    return {
      callCount,
      totals: {
        inputTokens: totalInput,
        outputTokens: totalOutput,
        systemTokens: totalSystem,
        totalTokens,
        totalCost: Number(totalCost.toFixed(6)),
        averageCostPerCall,
        averageLatencyMs,
      },
      distribution,
      highCostCalls,
      highTokenCalls,
      flags,
    };
  }

  private calculateDistribution(
    input: number,
    output: number,
    system: number
  ): TokenAnalysisDistribution {
    const total = input + output + system;
    if (total === 0) {
      return {
        inputPercentage: 0,
        outputPercentage: 0,
        systemPercentage: 0,
      };
    }

    const toPercentage = (value: number) => Number((value / total).toFixed(4));
    return {
      inputPercentage: toPercentage(input),
      outputPercentage: toPercentage(output),
      systemPercentage: toPercentage(system),
    };
  }

  private collectHighCostCalls(
    calls: ReadonlyArray<APICallRecord>,
    threshold: number
  ): TokenInsightCall[] {
    return calls.filter((call) => call.cost >= threshold).map((call) => this.mapCall(call));
  }

  private collectHighTokenCalls(
    calls: ReadonlyArray<APICallRecord>,
    threshold: number
  ): TokenInsightCall[] {
    return calls
      .filter((call) => call.inputTokens + call.outputTokens + call.systemTokens >= threshold)
      .map((call) => this.mapCall(call));
  }

  private mapCall(call: APICallRecord): TokenInsightCall {
    return {
      id: call.id,
      experimentId: call.experimentId,
      sessionId: call.sessionId,
      provider: call.provider,
      model: call.model,
      timestamp: call.timestamp,
      totalTokens: call.inputTokens + call.outputTokens + call.systemTokens,
      cost: Number(call.cost.toFixed(6)),
      latencyMs: call.latencyMs,
      tokenBreakdown: {
        input: call.inputTokens,
        output: call.outputTokens,
        system: call.systemTokens,
      },
    };
  }

  private generateFlags(params: {
    totalTokens: number;
    callCount: number;
    totalSystem: number;
  }): TokenAnalysisFlags {
    const averageTokens = params.callCount === 0 ? 0 : params.totalTokens / params.callCount;
    const excessiveSystemTokens =
      params.totalTokens === 0
        ? false
        : params.totalSystem / params.totalTokens >= this.options.systemTokenRatioWarning;

    return {
      excessiveSystemTokens,
      highAverageTokens: averageTokens >= this.options.highTokenThreshold,
    };
  }
}
