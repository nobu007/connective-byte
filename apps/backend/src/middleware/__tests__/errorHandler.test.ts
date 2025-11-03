import request from 'supertest';
import express from 'express';
import { errorHandler } from '../errorHandler';

describe('errorHandler', () => {
  it('should handle errors and send a 500 response', async () => {
    const app = express();
    app.get('/error', (req, res, next) => {
      next(new Error('Test Error'));
    });
    app.use(errorHandler); // Error handler after the route

    const res = await request(app).get('/error');
    expect(res.statusCode).toEqual(500);
    expect(res.body).toEqual({
      status: 'error',
      message: 'Test Error',
    });
  });

  it('should use the status code already set on the response', async () => {
    const app = express();
    app.get('/custom-error', (req, res, next) => {
      res.status(404);
      next(new Error('Not Found'));
    });
    app.use(errorHandler); // Error handler after the route

    const res = await request(app).get('/custom-error');
    expect(res.statusCode).toEqual(404);
    expect(res.body).toEqual({
      status: 'error',
      message: 'Not Found',
    });
  });
});
