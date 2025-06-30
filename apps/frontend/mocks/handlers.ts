import { rest } from 'msw';

// Default handlers for successful API calls
export const handlers = [
  rest.get('**/api/health', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ status: 'ok' }));
  }),
];

// Handlers for simulating API errors
export const errorHandlers = [
  rest.get('**/api/health', (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ message: 'Internal Server Error' }));
  }),
];
