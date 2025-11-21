/**
 * Prompt Compression Strategy
 * Reduces token usage while preserving intent
 */

import { BaseOptimizationStrategy } from './BaseStrategy';
import { OptimizationContext, OptimizationResult } from './types';

export class PromptCompressor extends BaseOptimizationStrategy {
  readonly name = 'prompt-compression';
  readonly description = 'プロンプトを圧縮してトークン使用量を削減';
  readonly category = 'prompt' as const;

  async apply(context: OptimizationContext): Promise<OptimizationResult> {
    const { prompt } = context;

    if (!prompt || prompt.length < 100) {
      return this.createFailureResult('プロンプトが短すぎるため圧縮不要');
    }

    const techniques: string[] = [];
    let optimized = prompt;

    // Remove excessive whitespace
    if (/\s{2,}/.test(optimized)) {
      optimized = optimized.replace(/\s+/g, ' ').trim();
      techniques.push('余分な空白を削除');
    }

    // Remove redundant phrases
    const redundantPhrases = [
      /please\s+/gi,
      /kindly\s+/gi,
      /I would like you to\s+/gi,
      /Could you\s+/gi,
      /Can you\s+/gi,
    ];

    for (const pattern of redundantPhrases) {
      if (pattern.test(optimized)) {
        optimized = optimized.replace(pattern, '');
        techniques.push('冗長な表現を削除');
        break;
      }
    }

    // Simplify verbose instructions
    const simplifications: Array<[RegExp, string]> = [
      [/in order to/gi, 'to'],
      [/due to the fact that/gi, 'because'],
      [/at this point in time/gi, 'now'],
      [/for the purpose of/gi, 'for'],
    ];

    for (const [pattern, replacement] of simplifications) {
      if (pattern.test(optimized)) {
        optimized = optimized.replace(pattern, replacement);
        techniques.push('冗長な表現を簡潔化');
        break;
      }
    }

    // Remove examples if prompt is very long
    if (optimized.length > 1000 && /example:|for example/i.test(optimized)) {
      const lines = optimized.split('\n');
      const filtered = lines.filter((line) => !/example:|for example/i.test(line));
      if (filtered.length < lines.length) {
        optimized = filtered.join('\n');
        techniques.push('例示を削除（必要に応じて別途提供）');
      }
    }

    if (techniques.length === 0) {
      return this.createFailureResult('圧縮可能な要素が見つかりませんでした');
    }

    return this.createSuccessResult(
      optimized,
      prompt,
      `${techniques.length}種類の圧縮技術を適用しました`,
      techniques
    );
  }
}
