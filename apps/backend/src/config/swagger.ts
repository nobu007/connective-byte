import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

/**
 * Swagger/OpenAPI Configuration
 * Generates API documentation from JSDoc comments
 */

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ConnectiveByte API',
      version,
      description:
        'A modern web development framework API with comprehensive health monitoring, authentication, and extensibility features',
      contact: {
        name: 'API Support',
        url: 'https://github.com/nobu007/connective-byte',
        email: 'support@connectivebyte.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.connectivebyte.com',
        description: 'Production server',
      },
      {
        url: 'https://staging-api.connectivebyte.com',
        description: 'Staging server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key for service-to-service communication',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            message: {
              type: 'string',
              example: 'An error occurred',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                  },
                  message: {
                    type: 'string',
                  },
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ok', 'degraded', 'error'],
              example: 'ok',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds',
              example: 3600,
            },
            checks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    example: 'memory',
                  },
                  status: {
                    type: 'string',
                    enum: ['pass', 'warn', 'fail'],
                    example: 'pass',
                  },
                  message: {
                    type: 'string',
                    example: 'Memory usage: 45%',
                  },
                  duration: {
                    type: 'number',
                    description: 'Check execution time in milliseconds',
                    example: 5,
                  },
                },
              },
            },
            version: {
              type: 'string',
              example: '1.0.0',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'user123',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              example: 'user',
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              $ref: '#/components/schemas/User',
            },
            token: {
              type: 'string',
              description: 'JWT authentication token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Health',
        description: 'Health monitoring and system status endpoints',
      },
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
