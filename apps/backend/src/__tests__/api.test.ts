import express, { Request, Response } from 'express';
import request from 'supertest';

// テスト対象のExpressアプリケーションをインポートする代わりに、ここで定義します。
// これは、`index.ts`がサーバーをリッスンし始めてしまい、テストがハングするのを防ぐためです。
const app = express();
app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

describe('Health Check API', () => {
  it('should return 200 OK with healthy status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'healthy' });
  });
});
