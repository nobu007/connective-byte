/**
 * Server Entry Point
 * Starts the Express server
 * Following clean architecture - separates app setup from server startup
 */

import app from './app';
import { config } from './config';

// Start server only if not in test environment
if (!config.isTest) {
  const server = app.listen(config.port, () => {
    console.log(`Server is running on http://localhost:${config.port}`);
    console.log(`Environment: ${config.environment}`);
    console.log(`Server listening: ${server.listening}`);
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
  });

  server.on('request', (req) => {
    console.log(`Received request: ${req.method} ${req.url}`);
  });
}

// Export the app for testing purposes
export default app;
