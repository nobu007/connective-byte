import { test, expect } from '@playwright/test';

test.describe('API Performance', () => {
  test('Health check API should respond quickly', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('http://localhost:3001/api/health');
    const endTime = Date.now();

    const duration = endTime - startTime;

    // Verify the response is successful
    expect(response.ok()).toBeTruthy();

    // Verify the response time is within the acceptable threshold (e.g., 500ms)
    console.log(`API response time: ${duration}ms`);
    expect(duration).toBeLessThan(500);
  });
});
