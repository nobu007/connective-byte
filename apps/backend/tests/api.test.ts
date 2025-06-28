import request from 'supertest';
import express from 'express';

// 仮のExpressアプリケーションを作成
const app = express();
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

describe('GET /api/health', () => {
  it('should return 200 OK with status ok', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
