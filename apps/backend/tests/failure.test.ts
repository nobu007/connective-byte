import request from 'supertest';
import app from '../src/index';

describe('Failure Tests', () => {
  it('should return 404 for a non-existent route', async () => {
    const response = await request(app).get('/api/non-existent-route');
    expect(response.status).toBe(404);
  });
});
