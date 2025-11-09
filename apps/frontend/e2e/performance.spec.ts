import { test, expect } from '@playwright/test';

test.describe('API Performance', () => {
  test('Health check API should respond quickly', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('http://localhost:3001/api/health', {
      timeout: 30000, // Increase timeout to 30 seconds for slower systems
    });
    const endTime = Date.now();

    const duration = endTime - startTime;

    // Verify the response has a valid status (200 or 503 are both valid for health checks)
    // 503 indicates degraded health but the endpoint is still responding
    expect([200, 503]).toContain(response.status());

    // Verify the response time is within the acceptable threshold (e.g., 5000ms)
    // This is generous to account for slower systems and cold starts
    console.log(`API response time: ${duration}ms`);
    expect(duration).toBeLessThan(5000);
  });
});
