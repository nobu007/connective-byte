/**
 * Application Setup
 * Configures and exports the Express application
 * Separated from server startup for better testability
 */

import express, { Application } from 'express';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

/**
 * Create and configure Express application
 * @returns Configured Express application
 */
export function createApp(): Application {
  const app = express();

  // Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use(routes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp();
