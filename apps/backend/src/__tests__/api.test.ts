import request from 'supertest';
import app from '../../src/index'; // Import the actual app

describe('API Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return 200 OK with status ok', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /', () => {
    it('should return 200 OK with a welcome message', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello from backend!');
    });
  });
});
