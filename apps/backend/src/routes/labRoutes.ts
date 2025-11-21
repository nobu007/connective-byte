/**
 * API Cost Optimization Lab Routes
 */

import { Router, Request, Response } from 'express';
import { SandboxManager } from '../modules/lab/sandbox/SandboxManager';
import { CostTracker } from '../modules/lab/cost/CostTracker';
import { BaselineManager } from '../modules/lab/cost/BaselineManager';
import { TokenAnalyzer } from '../modules/lab/cost/TokenAnalyzer';
import { OptimizationSuggester } from '../modules/lab/cost/OptimizationSuggester';
import { StrategyRegistry } from '../modules/lab/optimization/StrategyRegistry';
import { PromptCompressor } from '../modules/lab/optimization/PromptCompressor';
import { CachingStrategy } from '../modules/lab/optimization/CachingStrategy';
import { BatchProcessor } from '../modules/lab/optimization/BatchProcessor';
import { UsageSimulator } from '../modules/lab/simulation/UsageSimulator';
import { ScaleCalculator } from '../modules/lab/simulation/ScaleCalculator';
import { ChallengeManager } from '../modules/lab/challenges/ChallengeManager';
import { LeaderboardManager } from '../modules/lab/challenges/LeaderboardManager';
import { ProgressTracker } from '../modules/lab/progress/ProgressTracker';
import { ReportBuilder } from '../modules/lab/reports/ReportBuilder';
import { ExportManager } from '../modules/lab/reports/ExportManager';

const router = Router();

// Initialize services
const sandboxManager = new SandboxManager();
const costTracker = new CostTracker();
const baselineManager = new BaselineManager();
const tokenAnalyzer = new TokenAnalyzer();
const optimizationSuggester = new OptimizationSuggester();
const strategyRegistry = new StrategyRegistry();
const usageSimulator = new UsageSimulator();
const scaleCalculator = new ScaleCalculator();
const challengeManager = new ChallengeManager();
const leaderboardManager = new LeaderboardManager();
const progressTracker = new ProgressTracker();
const reportBuilder = new ReportBuilder();
const exportManager = new ExportManager();

// Register optimization strategies
strategyRegistry.register(new PromptCompressor());
strategyRegistry.register(new CachingStrategy());
strategyRegistry.register(new BatchProcessor());

/**
 * @route GET /api/lab/health
 * @desc Lab module health check
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    module: 'api-cost-optimization-lab',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route POST /api/lab/sessions
 * @desc Create a new sandbox session
 */
router.post('/sessions', (req: Request, res: Response) => {
  try {
    const { userId, experimentId, config } = req.body;
    const session = sandboxManager.createSession({ userId, experimentId, config });
    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create session',
    });
  }
});

/**
 * @route GET /api/lab/sessions/:sessionId
 * @desc Get session metrics
 */
router.get('/sessions/:sessionId', (req: Request, res: Response) => {
  try {
    const metrics = sandboxManager.getSessionMetrics(req.params.sessionId);
    res.json(metrics);
  } catch (error) {
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Session not found',
    });
  }
});

/**
 * @route DELETE /api/lab/sessions/:sessionId
 * @desc Terminate a session
 */
router.delete('/sessions/:sessionId', (req: Request, res: Response) => {
  try {
    sandboxManager.terminateSession(req.params.sessionId);
    res.status(204).send();
  } catch (error) {
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Session not found',
    });
  }
});

/**
 * @route GET /api/lab/experiments/:experimentId/summary
 * @desc Get experiment cost summary
 */
router.get('/experiments/:experimentId/summary', async (req: Request, res: Response) => {
  try {
    const summary = await costTracker.getExperimentSummary(req.params.experimentId);
    res.json(summary);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get summary',
    });
  }
});

/**
 * @route POST /api/lab/experiments/:experimentId/baseline
 * @desc Create baseline for experiment
 */
router.post('/experiments/:experimentId/baseline', async (req: Request, res: Response) => {
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
});

/**
 * @route POST /api/lab/analyze/tokens
 * @desc Analyze token usage
 */
router.post('/analyze/tokens', async (req: Request, res: Response) => {
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
});

/**
 * @route GET /api/lab/strategies
 * @desc List available optimization strategies
 */
router.get('/strategies', (_req: Request, res: Response) => {
  const strategies = strategyRegistry.getAll().map((s) => ({
    name: s.name,
    description: s.description,
    category: s.category,
  }));
  res.json(strategies);
});

/**
 * @route POST /api/lab/strategies/:strategyName/apply
 * @desc Apply optimization strategy
 */
router.post('/strategies/:strategyName/apply', async (req: Request, res: Response) => {
  try {
    const strategy = strategyRegistry.get(req.params.strategyName);
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    const result = await strategy.apply(req.body.context);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to apply strategy',
    });
  }
});

/**
 * @route POST /api/lab/simulations
 * @desc Run usage simulation
 */
router.post('/simulations', (req: Request, res: Response) => {
  try {
    const result = usageSimulator.simulate(req.body.config);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to run simulation',
    });
  }
});

/**
 * @route POST /api/lab/scale-analysis
 * @desc Calculate scale analysis
 */
router.post('/scale-analysis', (req: Request, res: Response) => {
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
});

/**
 * @route GET /api/lab/challenges
 * @desc List available challenges
 */
router.get('/challenges', (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const challenges = challengeManager.listChallenges(userId);
    res.json(challenges);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list challenges',
    });
  }
});

/**
 * @route POST /api/lab/challenges/:challengeId/start
 * @desc Start a challenge
 */
router.post('/challenges/:challengeId/start', (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const session = challengeManager.startChallenge(req.params.challengeId, userId);
    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to start challenge',
    });
  }
});

/**
 * @route POST /api/lab/challenges/sessions/:sessionId/submit
 * @desc Submit challenge solution
 */
router.post('/challenges/sessions/:sessionId/submit', (req: Request, res: Response) => {
  try {
    const { metrics } = req.body;
    const result = challengeManager.submitSolution(req.params.sessionId, metrics);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to submit solution',
    });
  }
});

/**
 * @route GET /api/lab/leaderboard
 * @desc Get leaderboard
 */
router.get('/leaderboard', (_req: Request, res: Response) => {
  try {
    const leaderboard = leaderboardManager.getLeaderboard();
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get leaderboard',
    });
  }
});

/**
 * @route GET /api/lab/progress/:userId
 * @desc Get user progress
 */
router.get('/progress/:userId', async (req: Request, res: Response) => {
  try {
    const progress = await progressTracker.getProgress(req.params.userId);
    const recommendations = await progressTracker.getRecommendations(req.params.userId);
    res.json({ progress, recommendations });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get progress',
    });
  }
});

/**
 * @route POST /api/lab/reports
 * @desc Generate experiment report
 */
router.post('/reports', (req: Request, res: Response) => {
  try {
    const report = reportBuilder.build(req.body.data);
    res.json(report);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to generate report',
    });
  }
});

/**
 * @route POST /api/lab/reports/:reportId/export
 * @desc Export report
 */
router.post('/reports/:reportId/export', async (req: Request, res: Response) => {
  try {
    const { report, options } = req.body;
    const exported = await exportManager.export(report, options);

    if (options.format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.send(exported);
    } else if (options.format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      res.send(exported);
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.send(exported);
    }
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to export report',
    });
  }
});

export default router;
