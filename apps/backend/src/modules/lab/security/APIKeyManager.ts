import { randomUUID, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { getLabConfig } from '../config';
import { APIKeyError } from '../errors';
import { APIKeyRecord, Provider } from '../types';

interface StoredKey {
  record: APIKeyRecord;
  encryptedKey: string;
  iv: string;
  authTag: string;
}

interface StoreKeyParams {
  userId: string;
  provider: Provider;
  key: string;
  alias?: string;
  isShared?: boolean;
}

export class APIKeyManager {
  private readonly encryptionKey: Buffer;
  private readonly storage = new Map<string, StoredKey>();

  constructor(private readonly config = getLabConfig()) {
    this.encryptionKey = Buffer.from(this.config.encryptionKey, 'hex');
    if (this.encryptionKey.length !== 32) {
      throw new Error('LAB_ENCRYPTION_KEY must be a 256-bit (64 hex chars) value');
    }

    if (this.config.sharedOpenAIKey) {
      this.storeKey({
        userId: 'shared',
        provider: 'openai',
        key: this.config.sharedOpenAIKey,
        alias: 'Educational Shared Key',
        isShared: true,
      });
    }
  }

  public storeKey(params: StoreKeyParams): APIKeyRecord {
    if (!params.key) {
      throw new APIKeyError('API key is required to store a record');
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(params.key, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const record: APIKeyRecord = {
      id: randomUUID(),
      userId: params.userId,
      alias: params.alias,
      provider: params.provider,
      isShared: Boolean(params.isShared),
      createdAt: new Date(),
      lastUsedAt: undefined,
    };

    this.storage.set(record.id, {
      record,
      encryptedKey: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    });

    return record;
  }

  public getKey(recordId: string, userId: string): string {
    const stored = this.storage.get(recordId);
    if (!stored) {
      throw new APIKeyError('API key record not found', { recordId });
    }

    if (!stored.record.isShared && stored.record.userId !== userId) {
      throw new APIKeyError('Access denied for API key', { recordId, userId });
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(stored.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(stored.authTag, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(stored.encryptedKey, 'base64')),
      decipher.final(),
    ]);

    stored.record.lastUsedAt = new Date();
    return decrypted.toString('utf8');
  }

  public listKeys(userId: string, includeShared = true): APIKeyRecord[] {
    return Array.from(this.storage.values())
      .filter(
        (stored) => stored.record.userId === userId || (includeShared && stored.record.isShared)
      )
      .map((stored) => stored.record);
  }

  public rotateKey(recordId: string, newKey: string, userId: string): APIKeyRecord {
    const stored = this.storage.get(recordId);
    if (!stored) {
      throw new APIKeyError('API key record not found', { recordId });
    }

    if (stored.record.userId !== userId) {
      throw new APIKeyError('Only the owner can rotate a key', { recordId, userId });
    }

    const updatedRecord = this.storeKey({
      userId,
      provider: stored.record.provider,
      key: newKey,
      alias: stored.record.alias,
      isShared: stored.record.isShared,
    });

    this.storage.delete(recordId);
    return updatedRecord;
  }
}
