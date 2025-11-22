/**
 * API Cost Optimization Lab Routes
 */

import { Router } from 'express';
import { LabController } from '../controllers/labController';

const router = Router();

/**
 * @route GET /api/lab/health
 * @desc Lab module health check
 */
router.get('/health', LabController.health);

/**
 * @route POST /api/lab/sessions
 * @desc Create a new sandbox session
 */
router.post('/sessions', LabController.createSession);

/**
 * @route GET /api/lab/sessions/:sessionId
 * @desc Get session metrics
 */
router.get('/sessions/:sessionId', LabController.getSessionMetrics);

/**
 * @route DELETE /api/lab/sessions/:sessionId
 * @desc Terminate a session
 */
router.delete('/sessions/:sessionId', LabController.terminateSession);

/**
 * @route POST /api/lab/sessions/:sessionId/execute
 * @desc Execute API call in sandbox
 */
router.post('/sessions/:sessionId/execute', LabController.executeAPICall);

/**
 * @route GET /api/lab/experiments/:experimentId/summary
 * @desc Get experiment cost summary
 */
router.get('/experiments/:experimentId/summary', LabController.getExperimentSummary);

/**
 * @route POST /api/lab/experiments/:experimentId/baseline
 * @desc Create baseline for experiment
 */
router.post('/experiments/:experimentId/baseline', LabController.createBaseline);

/**
 * @route POST /api/lab/analyze/tokens
 * @desc Analyze token usage
 */
router.post('/analyze/tokens', LabController.analyzeTokens);

/**
 * @route GET /api/lab/strategies
 * @desc List available optimization strategies
 */
router.get('/strategies', LabController.listStrategies);

/**
 * @route POST /api/lab/strategies/:strategyName/apply
 * @desc Apply optimization strategy
 */
router.post('/strategies/:strategyName/apply', LabController.applyStrategy);

/**
 * @route POST /api/lab/simulations
 * @desc Run usage simulation
 */
router.post('/simulations', LabController.runSimulation);

/**
 * @route POST /api/lab/simulations/project
 * @desc Project costs over time periods
 */
router.post('/simulations/project', LabController.projectCosts);

/**
 * @route POST /api/lab/scale-analysis
 * @desc Calculate scale analysis
 */
router.post('/scale-analysis', LabController.calculateScale);

/**
 * @route GET /api/lab/challenges
 * @desc List available challenges
 */
router.get('/challenges', LabController.listChallenges);

/**
 * @route POST /api/lab/challenges/:challengeId/start
 * @desc Start a challenge
 */
router.post('/challenges/:challengeId/start', LabController.startChallenge);

/**
 * @route POST /api/lab/challenges/sessions/:sessionId/submit
 * @desc Submit challenge solution
 */
router.post('/challenges/sessions/:sessionId/submit', LabController.submitChallenge);

/**
 * @route GET /api/lab/progress/:userId
 * @desc Get user progress
 */
router.get('/progress/:userId', LabController.getUserProgress);

/**
 * @route POST /api/lab/reports
 * @desc Generate experiment report
 */
router.post('/reports', LabController.generateReport);

/**
 * @route POST /api/lab/visualizations
 * @desc Generate visualizations
 */
router.post('/visualizations', LabController.generateVisualizations);

export default router;
