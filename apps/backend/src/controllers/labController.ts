/**
 * Lab Controller
 * Handles API Cost Optimization Lab endpoints
 */

import { Request, Response } from 'express';
import { SandboxManager } from '../modules/lab/sandbox/SandboxManager';
import { APIGateway } from '../modules/lab/gateway/APIGateway';
import { OpenAIAdapter } from '../modules/lab/gateway/adapters/OpenAIAdapter';
import { AnthropicAdapter } from '../modules/lab/gateway/adapters/AnthropicAdapter';
import { GoogleAIAdapter } from '../modules/lab/gateway/adapters/GoogleAIAdapter';
import { CostTracker } from '../modules/lab/cost/CostTracker';
import { BaselineManager } from '../modules/lab/cost/BaselineManager';
import { TokenAnalyzer } from '../modules/lab/cost/TokenAnalyzer';
import { OptimizationSuggester } from '../modules/lab/cost/OptimizationSuggester';
import { StrategyRegistry } from '../modules/lab/optimization/StrategyRegistry';
import { PromptCompressor } from '../modules/lab/optimization/PromptCompressor';
import { CachingStrategy } from '../modules/lab/optimization/CachingStrategy';
import { BatchProcessor } from '../modules/lab/optimization/BatchProcessor';
import { UsageSimulator } from '../modules/lab/simulation/UsageSimulator';
import { CostProjector } from '../modules/lab/simulation/CostProjector';
import { ScaleCalculator } from '../modules/lab/simulation/ScaleCalculator';
import { ChallengeManager } from '../modules/lab/challenges/ChallengeManager';
import { ProgressTracker } from '../modules/lab/progress/ProgressTracker';
import { ReportBuilder } from '../modules/lab/reports/ReportBuilder';
import { VisualizationGenerator } from '../modules/lab/reports/VisualizationGenerator';

// Initialize services
const sandboxManager = new SandboxManager();

const apiGateway = new APIGateway([
  new OpenAIAdapter(),
  new AnthropicAdapter(),
  new GoogleAIAdapter(),
]);

const costTracker = new CostTracker();
const baselineManager = new BaselineManager();
const tokenAnalyzer = new TokenAnalyzer();
const optimizationSuggester = new OptimizationSuggester();

const strategyRegistry = new StrategyRegistry();
strategyRegistry.register(new PromptCompressor());
strategyRegistry.register(new CachingStrategy());
strategyRegistry.register(new BatchProcessor());

const usageSimulator = new UsageSimulator();
const costProjector = new CostProjector();
const scaleCalculator = new ScaleCalculator();

const challengeManager = new ChallengeManager();
const progressTracker = new ProgressTracker();

const reportBuilder = new ReportBuilder();
const visualizationGenerator = new VisualizationGenerator();

export class LabController {
  /**
   * Health check
   */
  static health(_req: Request, res: Response): void {
    res.json({
      status: 'healthy',
      module: 'api-cost-optimization-lab',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Create sandbox session
   */
  static createSession(req: Request, res: Response): void {
    try {
      const { userId, experimentId, config } = req.body;
      const session = sandboxManager.createSession({ userId, experimentId, config });
      res.status(201).json(session);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create session',
      });
    }
  }

  /**
   * Get session metrics
   */
  static getSessionMetrics(req: Request, res: Response): void {
    try {
      const metrics = sandboxManager.getSessionMetrics(req.params.sessionId);
      res.json(metrics);
    } catch (error) {
      res.status(404).json({
        error: error instanceof Error ? error.message : 'Session not found',
      });
    }
  }

  /**
   * Terminate session
   */
  static terminateSession(req: Request, res: Response): void {
    try {
      sandboxManager.terminateSession(req.params.sessionId);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({
        error: error instanceof Error ? error.message : 'Session not found',
      });
    }
  }

  /**
   * Execute API call in sandbox
   */
  static async executeAPICall(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { request } = req.body;

      const session = sandboxManager.getSession(sessionId);
      session.ensureActive();

      const response = await apiGateway.execute(request);
      session.trackResponse(response);

      // Record in cost tracker if experiment is associated
      if (session.experimentId) {
        await costTracker.recordCall({
          experimentId: session.experimentId,
          sessionId: session.id,
          provider: response.provider,
          model: response.model,
          tokens: response.tokens,
          latencyMs: response.latencyMs,
          timestamp: response.timestamp,
        });
      }

      res.json(response);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to execute API call',
      });
    }
  }

  /**
   * Get experiment summary
   */
  static async getExperimentSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await costTracker.getExperimentSummary(req.params.experimentId);
      res.json(summary);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get summary',
      });
    }
  }

  /**
   * Create baseline
   */
  static async createBaseline(req: Request, res: Response): Promise<void> {
    try {
      const { scenario, calls } = req.body;
      const baseline = await baselineManager.createBaseline({
        experimentId: req.params.experimentId,
        scenario,
        calls,
      });
      res.status(201).json(baseline);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create baseline',
      });
    }
  }

  /**
   * Analyze tokens
   */
  static analyzeTokens(req: Request, res: Response): void {
    try {
      const { calls } = req.body;
      const analysis = tokenAnalyzer.analyze(calls);
      const suggestions = optimizationSuggester.suggest(analysis);
      res.json({ analysis, suggestions });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to analyze tokens',
      });
    }
  }

  /**
   * List optimization strategies
   */
  static listStrategies(_req: Request, res: Response): void {
    const strategies = strategyRegistry.getAll().map((s) => ({
      name: s.name,
      description: s.description,
      category: s.category,
    }));
    res.json(strategies);
  }

  /**
   * Apply optimization strategy
   */
  static async applyStrategy(req: Request, res: Response): Promise<void> {
    try {
      const strategy = strategyRegistry.get(req.params.strategyName);
      if (!strategy) {
        res.status(404).json({ error: 'Strategy not found' });
        return;
      }

      const result = await strategy.apply(req.body.context);
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to apply strategy',
      });
    }
  }

  /**
   * Run simulation
   */
  static runSimulation(req: Request, res: Response): void {
    try {
      const result = usageSimulator.simulate(req.body.config);
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to run simulation',
      });
    }
  }

  /**
   * Project costs
   */
  static projectCosts(req: Request, res: Response): void {
    try {
      const { simulationResult, periods, options } = req.body;
      const projections = costProjector.projectMultiple(simulationResult, periods, options);
      res.json(projections);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to project costs',
      });
    }
  }

  /**
   * Calculate scale analysis
   */
  static calculateScale(req: Request, res: Response): void {
    try {
      const { scales, requestsPerUserPerDay, costPerRequest } = req.body;
      const analysis = scaleCalculator.calculateMultipleScales(
        scales,
        requestsPerUserPerDay,
        costPerRequest
      );
      res.json(analysis);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to calculate scale',
      });
    }
  }

  /**
   * List challenges
   */
  static listChallenges(req: Request, res: Response): void {
    try {
      const userId = req.query.userId as string;
      const challenges = challengeManager.listChallenges(userId);
      res.json(challenges);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to list challenges',
      });
    }
  }

  /**
   * Start challenge
   */
  static startChallenge(req: Request, res: Response): void {
    try {
      const { userId } = req.body;
      const session = challengeManager.startChallenge(req.params.challengeId, userId);
      res.status(201).json(session);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to start challenge',
      });
    }
  }

  /**
   * Submit challenge solution
   */
  static submitChallenge(req: Request, res: Response): void {
    try {
      const { metrics } = req.body;
      const result = challengeManager.submitSolution(req.params.sessionId, metrics);
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to submit solution',
      });
    }
  }

  /**
   * Get user progress
   */
  static async getUserProgress(req: Request, res: Response): Promise<void> {
    try {
      const progress = await progressTracker.getProgress(req.params.userId);
      const recommendations = await progressTracker.getRecommendations(req.params.userId);
      res.json({ progress, recommendations });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get progress',
      });
    }
  }

  /**
   * Generate report
   */
  static generateReport(req: Request, res: Response): void {
    try {
      const report = reportBuilder.build(req.body.data);
      res.json(report);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to generate report',
      });
    }
  }

  /**
   * Generate visualizations
   */
  static generateVisualizations(req: Request, res: Response): void {
    try {
      const { type, data } = req.body;

      let visualization;
      switch (type) {
        case 'token-distribution':
          visualization = visualizationGenerator.generateTokenDistribution(data.tokens);
          break;
        case 'cost-comparison':
          visualization = visualizationGenerator.generateCostComparison(
            data.baseline,
            data.optimizedCalls
          );
          break;
        case 'cost-trend':
          visualization = visualizationGenerator.generateCostTrend(data.calls);
          break;
        case 'token-trend':
          visualization = visualizationGenerator.generateTokenTrend(data.calls);
          break;
        case 'provider-comparison':
          visualization = visualizationGenerator.generateProviderComparison(data.providers);
          break;
        default:
          res.status(400).json({ error: 'Unknown visualization type' });
          return;
      }

      res.json(visualization);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to generate visualization',
      });
    }
  }
}
