/**
 * Application Setup
 * Configures and exports the Express application
 * Separated from server startup for better testability
 */

import express, { Application } from 'express';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import {
  securityHeaders,
  corsConfig,
  sanitizeInput,
  validateRequest,
  securityLogger,
} from './middleware/security';
import { apiLimiter } from './middleware/rateLimiter';

/**
 * Create and configure Express application
 * @returns Configured Express application
 */
export function createApp(): Application {
  const app = express();

  // Security middleware (applied first)
  app.use(securityHeaders);
  app.use(corsConfig);
  app.use(securityLogger);
  app.use(validateRequest);

  // Rate limiting (applied before parsing body)
  app.use('/api', apiLimiter);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Input sanitization (applied after parsing)
  app.use(sanitizeInput);

  // Routes
  app.use(routes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp();
