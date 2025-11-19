import { rateLimit, resetRateLimit } from '../rate-limit';

describe('Rate Limiting', () => {
  const testIp = '192.168.1.1';
  const limit = 3;
  const windowSeconds = 3600; // 1 hour

  beforeEach(() => {
    resetRateLimit(testIp);
  });

  it('should allow first request', async () => {
    const result = await rateLimit(testIp, limit, windowSeconds);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('should allow up to 3 requests', async () => {
    const result1 = await rateLimit(testIp, limit, windowSeconds);
    const result2 = await rateLimit(testIp, limit, windowSeconds);
    const result3 = await rateLimit(testIp, limit, windowSeconds);

    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(2);

    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(1);

    expect(result3.success).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it('should block 4th request within time window', async () => {
    await rateLimit(testIp, limit, windowSeconds);
    await rateLimit(testIp, limit, windowSeconds);
    await rateLimit(testIp, limit, windowSeconds);

    const result = await rateLimit(testIp, limit, windowSeconds);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should track different IPs independently', async () => {
    const ip1 = '192.168.1.1';
    const ip2 = '192.168.1.2';

    const result1 = await rateLimit(ip1, limit, windowSeconds);
    const result2 = await rateLimit(ip2, limit, windowSeconds);

    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(2);

    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(2);
  });
});
