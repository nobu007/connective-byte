/**
 * Lab configuration utilities
 */

export interface LabEnvironmentConfig {
  databaseUrl: string;
  encryptionKey: string;
  sharedOpenAIKey?: string;
  redisUrl?: string;
}

export function getLabConfig(): LabEnvironmentConfig {
  const databaseUrl = process.env.LAB_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('LAB_DATABASE_URL or DATABASE_URL must be configured');
  }

  const encryptionKey = process.env.LAB_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('LAB_ENCRYPTION_KEY must be configured for API key encryption');
  }

  return {
    databaseUrl,
    encryptionKey,
    sharedOpenAIKey: process.env.LAB_SHARED_OPENAI_KEY,
    redisUrl: process.env.LAB_REDIS_URL,
  };
}
