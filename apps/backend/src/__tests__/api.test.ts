import request from 'supertest';
import app from '../../src/index'; // Import the actual app

describe('API Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return 200 OK with status ok', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);

      // Updated to match new ApiResponse<HealthStatus> format
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');

      // Check health status data
      const healthData = response.body.data;
      expect(healthData).toHaveProperty('status', 'ok');
      expect(healthData).toHaveProperty('timestamp');
      expect(healthData).toHaveProperty('uptime');
      expect(healthData).toHaveProperty('checks');
      expect(typeof healthData.uptime).toBe('number');
      expect(Array.isArray(healthData.checks)).toBe(true);

      // Verify health checks are present
      const checkNames = healthData.checks.map((c: any) => c.name);
      expect(checkNames).toContain('uptime');
      expect(checkNames).toContain('memory');
    });
  });

  describe('GET /', () => {
    it('should return 200 OK with a welcome message', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);

      // Updated to match new ApiResponse format
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data.message).toBe('Hello from backend!');
    });
  });
});
